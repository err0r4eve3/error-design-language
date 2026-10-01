'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {retired,findKnownConflicts}=require('./known-conflicts.cjs');
const root=path.resolve(__dirname,'..');

test('active guidance does not restore the five known retired conflicting prescriptions',()=>{
 assert.deepEqual(findKnownConflicts(file=>fs.readFileSync(path.join(root,file),'utf8')),[]);
});
test('known-conflict guard actually rejects each retired instruction when injected',()=>{
 for(const rule of retired){
   const result=findKnownConflicts(file=>file===rule.file ? `Before\n${rule.text}\nAfter`:'');
   assert.ok(result.some(r=>r.text===rule.text));
 }
});
test('known-conflict guard does not treat unrelated correct guidance as a failure',()=>{
 assert.deepEqual(findKnownConflicts(()=> '严格灰阶优先；同类同样式；动作符合实际结果；不必添加效果。'),[]);
});
