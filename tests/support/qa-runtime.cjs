'use strict';
// Shared QA infrastructure. Private output directories are not a hostile-process sandbox.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const claims = new Map();
const inside = (root, file) => file === root || file.startsWith(root + path.sep);
const identity = stat => `${stat.dev}:${stat.ino}`;
function exists(file) { try { return fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }

function claimEvidence(requested, {roots, temporaryPrefix} = {}) {
  if (!Array.isArray(roots) || !roots.length) throw new Error('Evidence requires explicit source roots');
  const sources = roots.filter(Boolean).map(p => fs.realpathSync(p));
  if (!requested && !temporaryPrefix) return null;
  const candidate = requested ? path.resolve(requested) : path.join(os.tmpdir(), `${temporaryPrefix}${crypto.randomUUID()}`);
  // Resolve the existing parent, including symlinks, before testing containment.
  const dest = path.join(fs.realpathSync(path.dirname(candidate)), path.basename(candidate));
  if (sources.some(source => inside(source, dest))) throw new Error('Evidence must be outside source (output must be outside source)');
  if (exists(dest)) throw new Error('Use a fresh evidence directory (output must not already exist)');
  fs.mkdirSync(dest, {mode: 0o700}); // Exclusive; never create missing parents or adopt an existing run.
  claims.set(dest, {identity: identity(fs.lstatSync(dest)), files: new Map()});
  return dest;
}
function ownedDirectory(dir) {
  const claim = claims.get(dir);
  const stat = dir && exists(dir);
  if (!claim || !stat || stat.isSymbolicLink() || !stat.isDirectory() || identity(stat) !== claim.identity)
    throw new Error('Evidence directory is not owned by this run');
  return claim;
}
function writeArtifact(dir, name, value) {
  if (!dir) return;
  if (!name || path.basename(name) !== name || name === '.' || name === '..' || /[\\/]/.test(name))
    throw new Error('Evidence filename must be a single path component');
  const claim = ownedDirectory(dir);
  const file = path.join(dir, name);
  const previous = exists(file);
  const expected = claim.files.get(name);
  if (previous && (!expected || previous.isSymbolicLink() || identity(previous) !== expected))
    throw new Error('Refusing to replace an unowned evidence file');
  if (!previous && expected) throw new Error('Owned evidence file was removed');
  const temporary = path.join(dir, `.qa-${crypto.randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, value, {flag: 'wx', mode: 0o600});
    ownedDirectory(dir);
    // The 0700 output directory is owned by this process. No filesystem security claim.
    fs.renameSync(temporary, file);
    claim.files.set(name, identity(fs.lstatSync(file)));
  } finally { if (exists(temporary)) fs.unlinkSync(temporary); }
}
const writeReport = (dir, name, value) => writeArtifact(dir, name, JSON.stringify(value, null, 2) + '\n');
function browserOptions(env = process.env) {
  if (env.CHROME_CHANNEL && env.CHROME_EXECUTABLE_PATH) throw new Error('Choose channel or executable, not both');
  return {headless: true, ...(env.CHROME_CHANNEL ? {channel: env.CHROME_CHANNEL} : {}),
    ...(env.CHROME_EXECUTABLE_PATH ? {executablePath: env.CHROME_EXECUTABLE_PATH} : {})};
}
class EnvironmentBlocked extends Error {
  constructor(message, cause) { super(message, {cause}); this.code = 'QA_ENVIRONMENT_BLOCKED'; }
}
async function launchBrowser(env = process.env) {
  const options = browserOptions(env);
  let playwright;
  try { playwright = require(env.PLAYWRIGHT_MODULE || 'playwright'); }
  catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
    throw new EnvironmentBlocked('Playwright could not be loaded; browser checks did not run', e);
  }
  if (typeof playwright.chromium?.launch !== 'function') throw new Error('Invalid Playwright module: chromium.launch is required');
  try { return await playwright.chromium.launch(options); }
  catch (e) { throw new EnvironmentBlocked('Chromium could not start; browser checks did not run', e); }
}
const failureStatus = error => error?.code === 'QA_ENVIRONMENT_BLOCKED' ? 'blocked' : 'fail';
const exitCode = error => failureStatus(error) === 'blocked' ? 2 : 1;
function inlineStyles(assets, filename, stylesheets) {
  const expected = new Set(stylesheets);
  if (expected.size !== stylesheets.length) throw new Error('Duplicate stylesheet declaration');
  const html = fs.readFileSync(path.join(assets, filename), 'utf8').replace(/<link\b[^>]*>/g, tag => {
    const name = tag.match(/href="([^"]+)"/)?.[1];
    if (!expected.delete(name) || path.basename(name) !== name) throw new Error('Unexpected or repeated stylesheet');
    return `<style>${fs.readFileSync(path.join(assets, name), 'utf8')}</style>`;
  });
  if (expected.size) throw new Error('Missing stylesheet');
  return html;
}

async function launchForEvidence(evidence, reportName, env = process.env) {
  try { return await launchBrowser(env); }
  catch (error) {
    writeReport(evidence, reportName, {status: failureStatus(error), stage: 'browser-startup', checks: [],
      node: process.version, error: error.message, limitations: ['Browser checks did not run.']});
    throw error;
  }
}
module.exports = {claimEvidence, writeArtifact, writeReport, browserOptions, launchBrowser, launchForEvidence, failureStatus, exitCode, inlineStyles};
