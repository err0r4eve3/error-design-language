'use strict';
// Packaging and fail-closed output checks; rendered composition is a separate runner.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('compact collection and marked region statuses have distinct style owners', () => {
  const html = read('assets/patterns.html');
  assert.equal((html.match(/class="dl-collection-state"/g) || []).length, 5);
  assert.doesNotMatch(html, /class="dl-state"/);
  assert.doesNotMatch(read('assets/patterns.css'), /\.dl-state(?:\s|[.:[{])/);
  assert.match(read('assets/regions.css'), /\.dl-state\s*\{/);
  new vm.Script(read('tests/style-composition.cjs'));
});

test('region variables, including theme-boundary aliases, resolve locally', () => {
  const css = read('assets/tokens.css') + read('assets/regions.css');
  const defined = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m => m[1]));
  for (const [, name] of css.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) assert.ok(defined.has(name), name);
});

for (const destination of ['source', 'existing']) test(`composition output rejects ${destination} before browser startup`, () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'edl-composition-'));
  const target = destination === 'source' ? root : temp;
  const output = path.join(target, 'style-composition.json');
  if (destination === 'existing') fs.writeFileSync(output, 'preserve');
  const before = fs.existsSync(output) ? fs.readFileSync(output) : null;
  try {
    const p = spawnSync(process.execPath, [path.join(__dirname, 'style-composition.cjs')], {
      encoding: 'utf8', timeout: 5000,
      env: {...process.env, DESIGN_QA_DIR: target, DESIGN_PREVIEW_DIR: '', CHROME_CHANNEL: '',
        CHROME_EXECUTABLE_PATH: '', PLAYWRIGHT_MODULE: 'must-not-load-for-rejected-output'}
    });
    assert.equal(p.status, 1);
    assert.match(p.stderr, destination === 'source' ? /Evidence must be outside source/ : /Use a fresh evidence directory/);
    assert.doesNotMatch(p.stderr, /Cannot find module/);
    if (before) assert.deepEqual(fs.readFileSync(output), before);
    else assert.equal(fs.existsSync(output), false);
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
});
