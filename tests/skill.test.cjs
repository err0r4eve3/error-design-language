// Repository-specific packaging checks; these do NOT evaluate model behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const skill = read('SKILL.md');
const header = skill.match(/^---\n([\s\S]*?)\n---\n/);
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

test('entry has portable name and nonempty description', () => {
  assert.ok(header, 'YAML frontmatter is missing');
  const name = header[1].match(/^name: (.+)$/m)?.[1];
  assert.ok(name && name.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name));
  assert.equal(name, path.basename(root), 'Install with the directory name in the frontmatter');
  // This repository deliberately uses one-line, JSON-compatible YAML strings.
  const raw = header[1].match(/^description: (.+)$/m)?.[1];
  assert.ok(raw, 'description is missing');
  const description = JSON.parse(raw);
  assert.equal(typeof description, 'string');
  assert.ok(description.trim() && [...description].length <= 1024);
});
test('entry respects the local size budget', () => {
  assert.ok(skill.split('\n').length < 500);
  assert.ok(Buffer.byteLength(skill) <= 8000, 'Keep detail in on-demand references (local budget, not a token count)');
});
test('all local Markdown resource links resolve within the skill', () => {
  let checked = 0;
  for (const file of walk(root).filter(f => f.endsWith('.md'))) {
    const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const link = match[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('#')) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(link.split(/[?#]/)[0]));
      assert.ok(target.startsWith(root + path.sep), `${file}: link escapes skill: ${link}`);
      assert.ok(fs.existsSync(target), `${file}: broken link: ${link}`);
      checked++;
    }
  }
  assert.ok(checked > 0);
});
test('host adapter invokes the stable skill identifier', () => {
  const text = read('agents/openai.yaml');
  const prompt = JSON.parse(text.match(/^\s+default_prompt: (.+)$/m)?.[1] || 'null');
  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.includes('$error-design-language'));
  for (const key of ['display_name', 'short_description']) {
    const value = JSON.parse(text.match(new RegExp('^\\s+' + key + ': (.+)$', 'm'))?.[1] || 'null');
    assert.equal(typeof value, 'string'); assert.ok(value.trim());
  }
});
test('CSS references defined variables', () => {
  const css = walk(path.join(root, 'assets')).filter(f => f.endsWith('.css'))
    .map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const defined = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m => m[1]));
  for (const [, name] of css.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
    assert.ok(defined.has(name), `Undefined CSS token: ${name}`);
  }
});
test('sample has local stylesheets and syntactically valid inline scripts', () => {
  const samples = fs.readdirSync(path.join(root, 'assets')).filter(name => name.endsWith('.html')).sort();
  assert.ok(samples.length > 0, 'No HTML samples discovered');
  for (const name of samples) {
  const html = read('assets/' + name);
  for (const [, href] of html.matchAll(/<link\b[^>]*href="([^"]+)"/g)) {
    assert.ok(!/^(?:\w+:|\/)/.test(href), `Nonlocal stylesheet: ${href}`);
    assert.ok(fs.existsSync(path.join(root, 'assets', href)));
  }
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0);
  scripts.forEach(([, source]) => new vm.Script(source));
  }
});
test('behavior cases have unique IDs, modes, assertions, and evidence requirements', () => {
  const suite = JSON.parse(read('evals/cases.json'));
  assert.equal(suite.schema_version, 1); assert.ok(Array.isArray(suite.cases));
  const ids = new Set();
  for (const c of suite.cases) {
    assert.ok(c.id && !ids.has(c.id), `Duplicate or absent ID: ${c.id}`); ids.add(c.id);
    for (const key of ['prompt', 'context', 'evidence']) assert.ok(typeof c[key] === 'string' && c[key].trim(), `${c.id}: ${key}`);
    assert.equal(typeof c.should_trigger, 'boolean');
    assert.ok(['review', 'fix', 'polish', 'build', 'none'].includes(c.mode));
    assert.equal(c.mode === 'none', !c.should_trigger);
    for (const key of ['must', 'must_not']) assert.ok(Array.isArray(c[key]) && c[key].length && c[key].every(x => typeof x === 'string' && x.trim()));
  }
  assert.ok(suite.cases.some(c => c.should_trigger));
  assert.ok(suite.cases.some(c => !c.should_trigger));
});
