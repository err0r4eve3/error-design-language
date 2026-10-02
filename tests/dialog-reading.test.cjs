'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {inlineFixture,claimOutput}=require('./dialog-reading.cjs');
const root=path.resolve(__dirname,'..');
test('real native dialog keeps its title, reading container and separate exit',()=>{
  const html=inlineFixture(path.join(root,'assets'));
  assert.match(html,/<dialog id="dialog" aria-labelledby="detail-title">/);
  assert.match(html,/<h2 id="detail-title" tabindex="-1" autofocus>/);
  assert.match(html,/class="dialog-body"[\s\S]*?<\/div>\s*<div class="dialog-footer">/);
  assert.doesNotMatch(html,/<link\b/);
  assert.match(html,/\.showModal\(\)/);
});
test('existing output is rejected and untouched',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'edl-dialog-'));
  try{const file=path.join(temp,'keep.txt');fs.writeFileSync(file,'keep');assert.throws(()=>claimOutput(temp),/must not already exist/);assert.equal(fs.readFileSync(file,'utf8'),'keep');}
  finally{fs.rmSync(temp,{recursive:true});}
});
test('source output is rejected before browser startup',()=>{
  const target=path.join(root,'dialog-test-output');
  assert.throws(()=>claimOutput(target),/outside source/);
  assert.equal(fs.existsSync(target),false);
});
