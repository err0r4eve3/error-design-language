'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {inlineFixture,claimOutput}=require('./submit-feedback.cjs');
const root=path.resolve(__dirname,'..');
test('delivered fixture includes associated help and native validation',()=>{
 const html=inlineFixture(path.join(root,'assets'));
 assert.match(html,/aria-describedby="email-help draft-note"/);assert.match(html,/type="email" required/);
 assert.match(html,/id="feedback"[^>]*aria-atomic="true"/);assert.ok(!html.includes('<link'));
});
test('source output is rejected before creation',()=>{
 const dest=path.join(root,'should-not-be-created');assert.throws(()=>claimOutput(dest),/outside source/);assert.ok(!fs.existsSync(dest));
});
test('existing output is not overwritten and new external output is claimed once',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'edl-form-'));
 try{const dest=path.join(parent,'run');assert.equal(claimOutput(dest),dest);fs.writeFileSync(path.join(dest,'sentinel'),'keep');
 assert.throws(()=>claimOutput(dest),/already exist/);assert.equal(fs.readFileSync(path.join(dest,'sentinel'),'utf8'),'keep');}finally{fs.rmSync(parent,{recursive:true,force:true});}
});
