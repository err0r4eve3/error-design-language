'use strict';
// Structural guards only. These do not evaluate routing success or design quality.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const tokens=read('assets/tokens.css'),entry=read('SKILL.md');
test('portable metadata includes both task languages without changing the identifier',()=>{
 const meta=entry.match(/^---\n([\s\S]*?)\n---/)[1];
 assert.match(meta,/name: error-design-language/);
 const description=JSON.parse(meta.match(/^description: (.*)$/m)[1]);
 assert.ok([...description].length<=1024);
 for(const term of ['dashboard','component','CSS','dark mode','hover states','前端'])assert.ok(description.includes(term));
 assert.ok(Buffer.byteLength(entry)<=8000);
});
test('positive entry offers distinct task skeletons rather than only a universal dashboard',()=>{
 for(const text of ['集合管理','单对象检查','阅读／研究','展示／比较','额度轨','估计'])assert.ok(entry.includes(text));
 assert.match(entry,/确认稿优先/);
});
test('type, numeric, elevation and role tokens are defined and used by existing samples',()=>{
 for(const name of ['type-page','type-section','type-title','type-body','type-ui','type-meta','type-metric','leading-heading','leading-body','numerals','font-mono','elevation-dialog','layer-skip','surface-rail','surface-inset'])assert.ok(tokens.includes(`--dl-${name}:`),name);
 assert.match(read('assets/preview.css'),/font-size:var\(--dl-type-page\)/);
 assert.match(read('assets/patterns.css'),/font-variant-numeric:var\(--dl-numerals\)/);
 assert.match(tokens,/--dl-workspace:\s*var\(--dl-surface-rail\)/);
 assert.match(tokens,/--dl-success:\s*var\(--dl-status-foreground\)/);
 assert.match(tokens,/--dl-danger:\s*var\(--dl-status-foreground\)/);
});
test('reference purpose is explicit without retaining self-promotional sample copy',()=>{
 for(const name of ['preview','regions'])assert.match(read(`assets/${name}.html`),/data-example-kind="component-reference"/);
 assert.match(read('assets/patterns.html'),/data-example-kind="product-demo"/);
 assert.doesNotMatch(read('assets/preview.html'),/统一视觉，按任务调整布局与密度|统一黑白灰与玻璃材质/);
 assert.match(read('references/product-copy.md'),/不是让任意页面绕过文案审查/);
});
test('mobile facts are derived from existing cells and do not replace comparison columns',()=>{
 const html=read('assets/patterns.html');
 assert.ok(html.indexOf('id="scroll-help"')<html.indexOf('id="table-scroll"'));
 assert.match(html,/row\.querySelector\('td\.dl-number'\)/);
 assert.match(html,/facts\.setAttribute\('aria-hidden', 'true'\)/);
 assert.match(html,/id="select-results"/);
 assert.match(html,/row\.dataset\.price === ''/);
});
test('root readme is navigation, with a single historical index',()=>{
 assert.ok(Buffer.byteLength(read('README.md'))<6000);
 assert.ok(read('README.md').includes('history/README.md'));
 assert.ok(read('history/README.md').includes('尚未迁移'));
});
