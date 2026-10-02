#!/usr/bin/env node
'use strict';
// Suite orchestration only. Does not infer model quality or sum heterogeneous assertions.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {claimEvidence, writeArtifact, writeReport} = require('./support/qa-runtime.cjs');
const root = path.resolve(__dirname, '..');
const registry = require('./suites.json');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
function validateRegistry(data = registry) {
  if (data.schema_version !== 1 || !Array.isArray(data.suites)) throw new Error('Invalid suite registry');
  const ids = new Set(['unit']);
  for (const s of data.suites) {
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(s.id) || ids.has(s.id)) throw new Error('Duplicate or invalid suite ID');
    ids.add(s.id);
    if (s.script !== `tests/${s.id}.cjs` || !/^[\w-]+\.json$/.test(s.report)) throw new Error('Unsafe suite path');
    if (!s.modes?.length || s.modes.some(m => !['inline', 'file'].includes(m))) throw new Error('Invalid suite modes');
    for (const name of [s.script, ...s.assets]) {
      if (path.isAbsolute(name) || name.split(/[\\/]/).includes('..')) throw new Error('Unsafe resource path');
      const file = path.join(root, name);
      if (!fs.statSync(file).isFile()) throw new Error(`Missing suite resource: ${name}`);
    }
  }
  // A new browser entry must be registered, or explicitly identified as a non-browser helper.
  const helpers = new Set(['run.cjs', 'color.cjs', 'known-conflicts.cjs']);
  for (const name of fs.readdirSync(__dirname).filter(n => n.endsWith('.cjs') && !n.endsWith('.test.cjs'))) {
    if (!helpers.has(name) && !data.suites.some(s => s.script === `tests/${name}`)) throw new Error(`Unregistered entry: ${name}`);
  }
  return data;
}
function parseArgs(argv) {
  const options = {suites: ['unit'], mode: null, out: null, timeout: 180000, list: false};
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (seen.has(flag)) throw new Error(`Repeated argument: ${flag}`);
    seen.add(flag);
    if (flag === '--list') { options.list = true; continue; }
    if (!['--suite', '--mode', '--out', '--timeout-ms'].includes(flag) || !argv[i+1] || argv[i+1].startsWith('--')) throw new Error(`Invalid argument: ${flag}`);
    const value = argv[++i];
    if (flag === '--suite') options.suites = value.split(',');
    if (flag === '--mode') options.mode = value;
    if (flag === '--out') options.out = value;
    if (flag === '--timeout-ms') options.timeout = Number(value);
  }
  const valid = new Set(['unit', ...registry.suites.map(s => s.id)]);
  if (options.suites.join(',') === 'all') options.suites = [...valid];
  if (!options.suites.length || new Set(options.suites).size !== options.suites.length || options.suites.some(id => !valid.has(id))) throw new Error('Unknown or duplicate suite');
  if (options.mode && !['inline', 'file'].includes(options.mode)) throw new Error('Mode must be inline or file');
  if (!Number.isSafeInteger(options.timeout) || options.timeout < 1 || options.timeout > 900000) throw new Error('Invalid suite timeout');
  if (options.mode) for (const id of options.suites.filter(id => id !== 'unit')) {
    if (!registry.suites.find(s => s.id === id).modes.includes(options.mode)) throw new Error(`${id} does not support ${options.mode}; no silent mode fallback`);
  }
  return options;
}
function reportPassed(report) {
  return report && !['fail', 'failed', 'blocked'].includes(report.status) &&
    (['pass', 'passed'].includes(report.status) || (report.status === undefined && report.passed === true));
}
function classify(child, report, unit = false) {
  if (child.error || child.signal) return {status: 'blocked', reason: child.error?.message || `signal:${child.signal}`};
  if (child.status === 2) return {status: 'blocked', reason: report?.error || 'Browser environment unavailable'};
  if (child.status !== 0) return {status: 'fail', reason: report?.error || `exit:${child.status}`};
  if (!unit && !reportPassed(report)) return {status: 'fail', reason: 'Child exited zero without an explicit passing report'};
  return {status: 'pass'};
}
function fingerprints(names) {
  return Object.fromEntries([...new Set(names)].sort().map(name => [name, hash(fs.readFileSync(path.join(root, name)))]));
}
function run(options, env = process.env) {
  validateRegistry();
  if (options.list) return {schema_version: 1, suites: ['unit', ...registry.suites]};
  if (env.CHROME_CHANNEL && env.CHROME_EXECUTABLE_PATH) throw new Error('Choose channel or executable, not both');
  if (env.DESIGN_QA_DIR && options.out) throw new Error('Specify --out OR DESIGN_QA_DIR, not both');
  const assets = path.resolve(env.DESIGN_PREVIEW_DIR || path.join(root, 'assets'));
  const out = claimEvidence(options.out || env.DESIGN_QA_DIR, {roots: [root, assets], temporaryPrefix: 'edl-qa-'});
  const results = {schema_version: 1, source_commit: null, node: process.version, started_at: new Date().toISOString(), out,
    environment: {playwright_module: env.PLAYWRIGHT_MODULE || 'playwright', chromium_executable: env.CHROME_EXECUTABLE_PATH || null, channel: env.CHROME_CHANNEL || null},
    suites: Object.fromEntries(['unit', ...registry.suites.map(s => s.id)].map(id => [id, {status: 'not_run'}])),
    limitations: ['Suite counts are not assertion counts. Unselected suites remain not_run.', 'No model execution, host routing, production API, or independent quality comparison.', 'source_commit is not inferred; source hashes identify actual local bytes.']};
  const summary = () => {
    results.counts = Object.fromEntries(['pass', 'fail', 'blocked', 'not_run'].map(status => [status, Object.values(results.suites).filter(s => s.status === status).length]));
    writeReport(out, 'run.json', results);
  };
  summary();
  for (const id of options.suites) {
    const s = registry.suites.find(s => s.id === id);
    const units = id === 'unit' ? fs.readdirSync(__dirname).filter(n => n.endsWith('.test.cjs')).sort().map(n => `tests/${n}`) : [];
    if (id === 'unit' && !units.length) throw new Error('No unit tests discovered');
    const mode = id === 'unit' ? 'node' : options.mode || s.modes[0];
    const childOut = path.join(out, id);
    const args = id === 'unit' ? ['--test', ...units] : [s.script];
    const started = Date.now();
    results.suites[id] = {status: 'running', mode, started_at: new Date(started).toISOString()}; summary();
    const child = spawnSync(process.execPath, args, {cwd: root, encoding: 'utf8', timeout: options.timeout, maxBuffer: 32 * 1024 * 1024,
      env: {...env, DESIGN_QA_DIR: id === 'unit' ? '' : childOut, DESIGN_QA_MODE: id === 'unit' ? '' : mode}});
    writeArtifact(out, `${id}.stdout.log`, child.stdout || '');
    writeArtifact(out, `${id}.stderr.log`, child.stderr || '');
    let report;
    if (s && fs.existsSync(path.join(childOut, s.report))) {
      try { report = JSON.parse(fs.readFileSync(path.join(childOut, s.report), 'utf8')); } catch { /* invalid report fails below */ }
    }
    results.suites[id] = {...classify(child, report, id === 'unit'), mode, duration_ms: Date.now() - started,
      exit_code: child.status, report: s && report ? `${id}/${s.report}` : null, browser: report?.browser || null,
      sources: fingerprints(id === 'unit' ? units : [s.script, 'tests/support/qa-runtime.cjs', 'tests/suites.json']),
      assets_sha256: id === 'unit' ? null : Object.fromEntries(s.assets.map(n => [n, hash(fs.readFileSync(path.join(assets, path.basename(n))))]))};
    summary();
  }
  results.finished_at = new Date().toISOString(); summary();
  return results;
}
if (require.main === module) {
  try {
    const result = run(parseArgs(process.argv.slice(2))); console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.counts?.fail ? 1 : result.counts?.blocked ? 2 : 0;
  } catch (e) { console.error(e); process.exitCode = 1; }
}
module.exports = {parseArgs, validateRegistry, reportPassed, classify, run};
