'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assets = path.resolve(__dirname, '../assets');
const html = fs.readFileSync(path.join(assets, 'regions.html'), 'utf8');
const css = fs.readFileSync(path.join(assets, 'regions.css'), 'utf8');

test('regions fixture has resolvable local styles and parsable inline JavaScript', () => {
  const links = [...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(links, ['tokens.css','components.css','regions.css']);
  for (const name of links) assert.ok(fs.statSync(path.join(assets,name)).isFile());
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  new vm.Script(scripts[0][1]);
});
test('fixture IDs are unique and local label references resolve', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const m of html.matchAll(/\b(?:for|aria-labelledby|aria-describedby)="([^"]+)"/g)) {
    for (const id of m[1].split(/\s+/)) assert.ok(ids.includes(id), `Missing #${id}`);
  }
});
test('the fixture contains a named native single-choice group, not scripted fake radios', () => {
  assert.match(html, /<fieldset[^>]+id="plans"/);
  assert.equal([...html.matchAll(/type="radio" name="plan"/g)].length, 3);
  assert.equal([...html.matchAll(/type="radio"[^>]*\bchecked/g)].length, 1);
  assert.match(html, /value="large" disabled aria-describedby="large-note"/);
  assert.doesNotMatch(html, /role="radio"/);
});
test('static lifecycle and dynamic request status have separate nodes', () => {
  assert.match(html, /id="entity-state"[^>]+data-state="unknown"/);
  assert.match(html, /id="request" data-phase="idle"/);
  assert.match(html, /id="request-message"[^>]+role="status"[^>]+aria-atomic="true"/);
  assert.doesNotMatch(html, /class="dl-state"[^>]+role="(?:alert|status)"/);
});
test('optional regions CSS does not add page-level resets or universal animations', () => {
  assert.doesNotMatch(css, /(?:^|\n)\s*(?:\*|html|body)\s*\{/);
  assert.doesNotMatch(css, /@import|url\(|animation\s*:|transition\s*:\s*all/);
  assert.match(css, /input:checked \+ \.dl-choice-body/);
  assert.match(css, /input:focus-visible \+ \.dl-choice-body/);
  assert.match(css, /@media \(forced-colors:active\)/);
});
test('sample documents its simulation and contains no persistence or network calls', () => {
  assert.match(html, /首次读取固定模拟失败/);
  assert.match(html, /不连接真实资源/);
  assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
});

const os = require('node:os');
const {spawnSync} = require('node:child_process');
const runner = path.join(__dirname,'regions.cjs');
function rejectedRun(env) {
  const p=spawnSync(process.execPath,[runner],{encoding:'utf8',env:{...process.env,...env},timeout:5000});
  assert.equal(p.status,1,p.stderr || p.stdout);
  return p;
}
test('invalid mode refuses before creating evidence',()=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'edl-output-test-'));
  const out=path.join(parent,'absent');
  try { rejectedRun({DESIGN_QA_MODE:'invalid',DESIGN_QA_DIR:out}); assert.equal(fs.existsSync(out),false); }
  finally {fs.rmSync(parent,{recursive:true,force:true});}
});
test('existing evidence is not overwritten on a refused run',()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'edl-output-test-'));
  const sentinel=path.join(out,'regions-results.json');fs.writeFileSync(sentinel,'preserve me');
  try {rejectedRun({DESIGN_QA_MODE:'inline',DESIGN_QA_DIR:out});assert.equal(fs.readFileSync(sentinel,'utf8'),'preserve me');}
  finally {fs.rmSync(out,{recursive:true,force:true});}
});
test('repository-internal evidence path is rejected without creating a directory',()=>{
  const out=path.join(__dirname,`rejected-output-${process.pid}`);
  try {rejectedRun({DESIGN_QA_MODE:'inline',DESIGN_QA_DIR:out});assert.equal(fs.existsSync(out),false);}
  finally {if(fs.existsSync(out))fs.rmSync(out,{recursive:true,force:true});}
});
