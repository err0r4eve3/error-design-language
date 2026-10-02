'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const reporter = require('./support/unit-reporter.cjs');
const {unitReportPassed, classify} = require('./run.cjs');
const counts = {tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0, suites: 0, topLevel: 1};
async function render(events) {
  async function* source() {yield* events;}
  let output = '';
  for await (const chunk of reporter(source())) output += chunk;
  return JSON.parse(output);
}
test('only the unique aggregate summary is used, not the last file summary', async () => {
  const record = await render([
    {type:'test:summary',data:{file:'a.cjs',success:false,counts:{...counts,passed:0,failed:1}}},
    {type:'test:summary',data:{success:true,counts}},
    {type:'test:diagnostic',data:{message:'diagnostic text is not a report'}}
  ]);
  assert.equal(unitReportPassed(record),true);
  assert.deepEqual(record.counts,counts);
});
test('no final summary, repeated finals and malformed counters cannot pass', async () => {
  for (const events of [[],
    [{type:'test:summary',data:{file:'a.cjs',success:true,counts}}],
    [{type:'test:summary',data:{success:true,counts}},{type:'test:summary',data:{success:true,counts}}],
    [{type:'test:summary',data:{success:true,counts:{...counts,passed:'1'}}}],
    [{type:'test:summary',data:{success:false,counts}}]]) {
    assert.equal(unitReportPassed(await render(events)),false);
  }
});
test('unit zero exit without structured evidence fails',()=>{
  assert.equal(classify({status:0},null,true).status,'fail');
  assert.equal(classify({status:0},{status:'pass'},true).status,'fail');
});
for (const [name,source,expected] of [
  ['actual-pass',"require('node:test')('example',()=>require('node:assert/strict').equal(1+1,2));",'pass'],
  ['actual-fail',"require('node:test')('example',()=>require('node:assert/strict').equal(1,2));",'fail'],
  ['actual-skip',"require('node:test')('example',{skip:true},()=>{});",'fail'],
  ['actual-todo',"require('node:test').todo('example');",'fail']
]) test(`structured reporter on Node ${name}`,t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'edl-unit-report-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'example.test.cjs');fs.writeFileSync(file,source);
  const env={...process.env};
  // These are independent Node test runs, not children of the parent test IPC.
  delete env.NODE_TEST_CONTEXT;
  const child=spawnSync(process.execPath,['--test',`--test-reporter=${path.join(__dirname,'support/unit-reporter.cjs')}`,file],
    {encoding:'utf8',timeout:5000,env});
  assert.equal(child.error,undefined);
  const record=JSON.parse(child.stdout);
  assert.equal(classify(child,record,true).status,expected);
  if(name==='actual-skip'||name==='actual-todo')assert.equal(child.status,0,'Skip/todo alone exits zero but must not count as exercised checks');
});
