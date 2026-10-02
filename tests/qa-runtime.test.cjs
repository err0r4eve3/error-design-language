'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const {claimEvidence, writeReport, browserOptions, inlineStyles} = require('./support/qa-runtime.cjs');
const {suites} = require('./suites.json');
const root = path.resolve(__dirname, '..');
function temporary(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edl-runtime-'));
  try { return fn(dir); } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}
const environment = out => ({...process.env, DESIGN_QA_DIR: out, DESIGN_PREVIEW_DIR: '', DESIGN_QA_MODE: 'inline',
  CHROME_EXECUTABLE_PATH: '', CHROME_CHANNEL: '', PLAYWRIGHT_MODULE: 'qa-deliberately-missing-playwright'});
for (const suite of suites) {
  for (const kind of ['existing', 'source', 'symlink-source', 'missing-browser']) test(`${suite.id}: ${kind}`, () => temporary(dir => {
    let out = path.join(dir, 'run');
    if (kind === 'existing') {fs.mkdirSync(out);fs.writeFileSync(path.join(out, suite.report), 'keep');}
    if (kind === 'source') out = path.join(root, `qa-rejected-${process.pid}-${suite.id}`);
    if (kind === 'symlink-source') {fs.symlinkSync(root, path.join(dir, 'source'));out = path.join(dir, 'source', `qa-rejected-${process.pid}-${suite.id}`);}
    const child = spawnSync(process.execPath, [path.join(root, suite.script)], {env: environment(out), encoding: 'utf8', timeout: 5000});
    assert.equal(child.error, undefined);
    assert.equal(child.status, kind === 'missing-browser' ? 2 : 1, child.stderr || child.stdout);
    if (kind === 'missing-browser') {
      const report = JSON.parse(fs.readFileSync(path.join(out, suite.report), 'utf8'));
      assert.equal(report.status, 'blocked');
      assert.ok(!report.checks?.length);
    } else if (kind === 'existing') assert.equal(fs.readFileSync(path.join(out, suite.report), 'utf8'), 'keep');
    else assert.equal(fs.existsSync(out), false, 'source must not receive an output directory');
  }));
}
test('only a claimed directory and owned report may be updated', () => temporary(dir => {
  assert.throws(() => writeReport(dir, 'report.json', {}), /not owned/);
  const out = claimEvidence(path.join(dir, 'run'), {roots: [root]});
  writeReport(out, 'report.json', {status:'running'});writeReport(out, 'report.json', {status:'pass'});
  assert.equal(JSON.parse(fs.readFileSync(path.join(out,'report.json'))).status,'pass');
  fs.writeFileSync(path.join(out, 'foreign.json'), 'keep');
  assert.throws(() => writeReport(out, 'foreign.json', {}), /unowned/);
  assert.equal(fs.readFileSync(path.join(out,'foreign.json'),'utf8'), 'keep');
  assert.throws(() => writeReport(out, '../escape.json', {}), /single path component/);
}));
test('dangling symlink and missing parent cannot become output', () => temporary(dir => {
  fs.symlinkSync(path.join(dir, 'absent'), path.join(dir,'link'));
  assert.throws(() => claimEvidence(path.join(dir,'link'),{roots:[root]}), /already exist/);
  assert.throws(() => claimEvidence(path.join(dir,'absent','run'),{roots:[root]}), {code:'ENOENT'});
  assert.equal(fs.existsSync(path.join(dir,'absent')),false);
}));
test('claim is exclusive and cannot be reacquired', () => temporary(dir => {
  const out=path.join(dir,'run');claimEvidence(out,{roots:[root]});
  assert.throws(()=>claimEvidence(out,{roots:[root]}),/already exist/);
}));
test('a removed and substituted directory is not accepted', () => temporary(dir => {
  const out=claimEvidence(path.join(dir,'run'),{roots:[root]});fs.renameSync(out,path.join(dir,'old'));
  fs.symlinkSync(path.join(dir,'old'),out);
  assert.throws(()=>writeReport(out,'report.json',{}),/not owned/);
}));
test('browser configuration cannot choose two executables', () => {
  assert.throws(()=>browserOptions({CHROME_CHANNEL:'chrome',CHROME_EXECUTABLE_PATH:'/somewhere'}),/Choose/);
  assert.deepEqual(browserOptions({}),{headless:true});
});
test('inline loader rejects missing, duplicate and nonlocal styles', () => temporary(dir => {
  fs.writeFileSync(path.join(dir,'a.css'),'body{}');
  for(const source of ['<link href="a.css"><link href="a.css">','<link href="https://invalid.test/x.css">','<p>none</p>']) {
    fs.writeFileSync(path.join(dir,'a.html'),source);
    assert.throws(()=>inlineStyles(dir,'a.html',['a.css']),/stylesheet/);
  }
}));
