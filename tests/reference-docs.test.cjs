'use strict';
// Structural checks only. These tests do not grade visual quality or model behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const entry = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
const references = ['references/reference-transfer.md', 'references/motion-and-effects.md'];
const documents = [...references, 'history/research-2026-10-02-reference-transfer.md'];

// Checks this repository's simple inline Markdown file links, not arbitrary Markdown.
function localTargets(file, text) {
  return [...text.matchAll(/\[[^\]\n]*\]\(([^\s)]+)\)/g)]
    .map(match => match[1])
    .filter(href => !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href))
    .map(href => {
      const clean = decodeURIComponent(href.split(/[?#]/, 1)[0]);
      const target = path.resolve(root, path.dirname(file), clean);
      assert.ok(target.startsWith(root + path.sep), `Escaping file link: ${file}: ${href}`);
      return target;
    });
}

test('reference routing retains the 8 KB entry budget', () => {
  assert.ok(Buffer.byteLength(entry, 'utf8') <= 8000);
});

test('both focused references are reachable from the Skill entry', () => {
  const targets = new Set(localTargets('SKILL.md', entry));
  for (const file of references) {
    assert.ok(targets.has(path.join(root, file)), `Unreachable reference: ${file}`);
    assert.ok(fs.statSync(path.join(root, file)).isFile());
  }
});

test('new reference and research documents have resolvable local file links', () => {
  for (const file of documents) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const targets = localTargets(file, text);
    assert.ok(targets.length > 0, `No local links checked in ${file}`);
    for (const target of targets) assert.ok(fs.statSync(target).isFile(), target);
  }
});

test('new rule owners are linked from maintenance and user-facing README', () => {
  for (const file of ['references/maintenance.md', 'README.md']) {
    const targets = new Set(localTargets(file, fs.readFileSync(path.join(root, file), 'utf8')));
    for (const reference of references) assert.ok(targets.has(path.join(root, reference)), `${file}: ${reference}`);
  }
});

test('local link scanner handles anchors and rejects source escapes', () => {
  assert.deepEqual(localTargets('references/probe.md', '[a](../SKILL.md#scope) [b](https://example.com) [c](#local)'), [path.join(root, 'SKILL.md')]);
  assert.throws(() => localTargets('references/probe.md', '[bad](../../outside.md)'), /Escaping file link/);
  assert.throws(() => localTargets('references/probe.md', '[bad](..%2F..%2Foutside.md)'), /Escaping file link/);
});
