#!/usr/bin/env node
'use strict';
// Offline preparation only: this tool never invokes a model or scores a response.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {readFixture, copyFixture} = require('./fixtures.cjs');
const root = path.resolve(__dirname, '..');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);
const validText = value => typeof value === 'string' && value.trim().length > 0;

function validateSuite(suite) {
  if (suite?.schema_version !== 1 || !Array.isArray(suite.cases) || !suite.cases.length)
    throw new Error('Expected schema_version 1 and a nonempty cases array.');
  const ids = new Set();
  for (const c of suite.cases) {
    if (!c || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id || '') || ids.has(c.id))
      throw new Error(`Unsafe or duplicate case id: ${c?.id}`);
    ids.add(c.id);
    if (!['review', 'fix', 'polish', 'build', 'none'].includes(c.mode) ||
        typeof c.should_trigger !== 'boolean' || (c.mode === 'none') !== !c.should_trigger)
      throw new Error(`Invalid mode or trigger for ${c.id}`);
    for (const field of ['prompt', 'context', 'evidence'])
      if (!validText(c[field])) throw new Error(`${c.id}: missing ${field}`);
    for (const field of ['must', 'must_not'])
      if (!Array.isArray(c[field]) || !c[field].length || !c[field].every(validText))
        throw new Error(`${c.id}: invalid ${field}`);
  }
  return suite;
}

function sourceManifest(sourceRoot) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true}).sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      // VCS, dependencies, secrets and local evidence are not evaluation sources.
      if (entry.name.startsWith('.') || ['node_modules','test-results','playwright-report'].includes(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Source symlinks are not supported: ${file}`);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(file);
        files.push({path:path.relative(sourceRoot,file).split(path.sep).join('/'),bytes:bytes.length,sha256:digest(bytes)});
      } else throw new Error(`Unsupported source entry: ${file}`);
    }
  }
  walk(sourceRoot);
  return {algorithm:'sha256', excluded:'dot entries, node_modules, test-results, playwright-report',
    tree_sha256:digest(JSON.stringify(files)), files};
}

function prepare({sourceRoot = root, outDir, ids = []} = {}) {
  if (!validText(outDir)) throw new Error('An output directory is required.');
  sourceRoot = fs.realpathSync(sourceRoot);
  if (!fs.statSync(sourceRoot).isDirectory()) throw new Error('Source must be a directory.');
  if (!Array.isArray(ids) || ids.some(x => !validText(x)) || new Set(ids).size !== ids.length)
    throw new Error('Case selection must contain unique IDs.');
  const suiteFile = path.join(sourceRoot,'evals','cases.json');
  const manifest = sourceManifest(sourceRoot); // Refuse symlinks before writing anything.
  const suite = validateSuite(JSON.parse(fs.readFileSync(suiteFile,'utf8')));
  for (const id of ids) if (!suite.cases.some(c => c.id === id)) throw new Error(`Unknown case: ${id}`);
  const selected = ids.length ? ids.map(id => suite.cases.find(c => c.id === id)) : suite.cases;
  // Validate and snapshot selected fixtures before creating any output.
  const fixtures = new Map(selected.map(c => [c.id, readFixture(sourceRoot, c.id)]));
  const requested = path.resolve(outDir);
  // Resolve existing parent to catch a symlink into the source tree. Parent must exist.
  const target = path.join(fs.realpathSync(path.dirname(requested)), path.basename(requested));
  if (inside(sourceRoot, target)) throw new Error('Output must be outside the Skill source.');
  if (fs.existsSync(target)) throw new Error('Output already exists; use a fresh directory.');
  const entry = manifest.files.find(f => f.path === 'SKILL.md');
  if (!entry) throw new Error('SKILL.md is missing.');
  // mkdir is exclusive; do not overwrite an existing directory even in a concurrent invocation.
  fs.mkdirSync(target, {mode:0o700});
  try {
    for (const dir of ['inputs','workspaces','review']) fs.mkdirSync(path.join(target,dir));
    const write = (file,value) => fs.writeFileSync(path.join(target,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
    for (const c of selected) {
      // JSON inputs retain exactly prompt/context. Workspaces never contain review metadata.
      const fixture = fixtures.get(c.id);
      if (fixture) copyFixture(fixture, path.join(target, 'workspaces', c.id));
      write(`inputs/${c.id}.json`, {prompt:c.prompt, context:c.context});
      write(`review/${c.id}.json`, {case_id:c.id, expected:{should_trigger:c.should_trigger,mode:c.mode,evidence:c.evidence},
        status:'not_run', model:null, host:null, fixture_status:fixture ? 'prepared' : 'not_prepared',
        fixture:fixture ? {workspace:`workspaces/${c.id}`,runtime:fixture.metadata.runtime,
          entrypoints:fixture.metadata.entrypoints,tree_sha256:fixture.tree_sha256,files:fixture.files,
          checklist:fixture.metadata.checklist} : null,
        assertions:[...c.must.map(text => ({kind:'must',text,status:'not_run',evidence:[]})),
                    ...c.must_not.map(text => ({kind:'must_not',text,status:'not_run',evidence:[]}))],
        artifacts:[], limitations:[]});
    }
    write('manifest.json', {schema_version:1,purpose:'offline-evaluation-preparation',
      status:'not_run',created_at:new Date().toISOString(),source_commit:null,
      case_ids:selected.map(c=>c.id),source:manifest,
      fixtures:Object.fromEntries(selected.map(c => { const fixture=fixtures.get(c.id);
        return [c.id,fixture ? {status:'prepared',workspace:`workspaces/${c.id}`,tree_sha256:fixture.tree_sha256,files:fixture.files} : {status:'not_prepared'}]; }))});
    fs.writeFileSync(path.join(target,'README.txt'),
      'Prepared inputs and available fixture copies only. No model, fixture code, browser or product test has run.\n'+
      'Give the executor only the selected inputs file AND matching workspaces/<case-id> directory; do not expose review, manifest, the original case rubric or result templates.\n'+
      'This separation is not a sandbox or host access control. Set those boundaries yourself.\n'+
      'Cases without bundled fixtures remain not_prepared. Isolate the selected workspace, freeze bytes, and record the actual model/host/tools/budget.\n'+
      'Negative routing cases require real host routing, not a forced Skill load.\n'+
      'source_commit is intentionally null; file hashes identify the bytes, not an inferred Git revision.\n', {flag:'wx'});
  } catch (err) {
    // The directory was exclusively created by this call and is outside the source.
    fs.rmSync(target,{recursive:true,force:true});
    throw err;
  }
  return {outDir:target,cases:selected.length,tree_sha256:manifest.tree_sha256,status:'not_run'};
}

function main(argv) {
  const options = {ids:[]}; const seen = new Set();
  for (let i=0; i<argv.length; i++) {
    const flag=argv[i];
    if (flag === '--help') { console.log('node evals/prepare.cjs --out <new-directory> [--cases id,id]'); return; }
    if (!['--out','--cases'].includes(flag) || seen.has(flag) || !argv[i+1] || argv[i+1].startsWith('--'))
      throw new Error(`Invalid argument: ${flag}. Use --help.`);
    seen.add(flag); const value=argv[++i];
    if (flag==='--out') options.outDir=value;
    else options.ids=value.split(',').map(x=>x.trim());
  }
  console.log(JSON.stringify(prepare(options),null,2));
}
if (require.main===module) {
  try {main(process.argv.slice(2));}
  catch(err) {console.error(`Evaluation preparation failed: ${err.message}`);process.exitCode=1;}
}
module.exports={prepare,validateSuite,sourceManifest};
