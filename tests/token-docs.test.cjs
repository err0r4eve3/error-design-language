'use strict';
// Declared default values must match shipped tokens. Local overrides remain legitimate.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'assets/tokens.css'), 'utf8');
const doc = fs.readFileSync(path.join(root, 'references/visual-system.md'), 'utf8');
const typeDoc = fs.readFileSync(path.join(root, 'references/token-contracts.md'), 'utf8');
function defaults(text, dark = false) {
  const blocks = [...text.matchAll(/^\[data-design="error"\](\[data-theme="dark"\])?\s*\{([^}]+)\}/gm)];
  assert.equal(blocks.length, 2);
  return Object.fromEntries(blocks.filter(m => !m[1] || dark).flatMap(m => [...m[2].matchAll(/(--dl-[\w-]+)\s*:\s*([^;]+);/g)].map(x => [x[1], x[2].trim()])));
}
function value(tokens, name, seen = new Set()) {
  assert.ok(!seen.has(name), 'Cyclic alias ' + name); seen.add(name);
  assert.ok(Object.hasOwn(tokens, name), 'Missing token ' + name);
  const alias = tokens[name].match(/^var\((--dl-[\w-]+)\)$/);
  return alias ? value(tokens, alias[1], seen) : tokens[name].toLowerCase();
}
function checkPairs(text, source = css) {
  const rows = [...text.matchAll(/^\|[^|]*`([\w-]+)`[^|]*\|\s*`(#[\da-f]{6})`\s*\|\s*`(#[\da-f]{6})`\s*\|/gim)];
  assert.equal(rows.length, 18, 'Every declared default color row is checked');
  const light = defaults(source), dark = defaults(source, true);
  for (const [, role, l, d] of rows) {
    assert.equal(value(light, '--dl-' + role), l.toLowerCase(), 'light ' + role);
    assert.equal(value(dark, '--dl-' + role), d.toLowerCase(), 'dark ' + role);
  }
}
test('documented light and dark defaults resolve to the shipped token values', () => checkPairs(doc));
test('a stale document or changed token is detected rather than silently accepted', () => {
  assert.throws(() => checkPairs(doc.replace(/(#606060|#666666)/i, '#010101')), /light muted/);
  assert.throws(() => checkPairs(doc, css.replace('--dl-selected: #dddddd;', '--dl-selected: #abcdef;')));
});
test('semantic type default table matches the same source of truth', () => {
  const rows = [...typeDoc.matchAll(/^\|[^|]+\|\s*`(--dl-type-[\w-]+)`\s*\|\s*([.\d]+rem)\s*\|/gm)];
  assert.equal(rows.length, 7);
  for (const [, name, size] of rows) assert.equal(value(defaults(css), name), size);
});
