'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {parseArgs,validateRegistry,classify,run}=require('./run.cjs');
test('runner validates registered resources and default is unit only',()=>{
 assert.ok(validateRegistry().suites.some(s=>s.id==='panel'));assert.deepEqual(parseArgs([]).suites,['unit']);
});
test('runner rejects unknown, duplicate and silently downgraded modes',()=>{
 for(const args of [['--suite','bad'],['--suite','preview,preview'],['--out','x','--out','y'],['--suite','dialog-reading','--mode','file'],['--timeout-ms','-1']])assert.throws(()=>parseArgs(args));
 assert.equal(parseArgs(['--suite','all','--mode','inline']).suites.length,validateRegistry().suites.length+1);
});
test('zero exit without a passing report cannot masquerade as success',()=>{
 assert.equal(classify({status:0},null).status,'fail');
 assert.equal(classify({status:0},{passed:true}).status,'pass');
 assert.equal(classify({status:0},{status:'blocked',passed:true}).status,'fail');
 assert.equal(classify({status:2},{status:'blocked'}).status,'blocked');
 assert.equal(classify({status:1},{status:'pass'}).status,'fail');
 assert.equal(classify({status:null,signal:'SIGTERM'},null).status,'blocked');
});
test('runner records selected blocked suites and leaves the rest not_run',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'edl-runner-'));
 try{
  const result=run(parseArgs(['--suite','preview,submit-feedback','--mode','inline','--out',path.join(dir,'run')]),{
   ...process.env,DESIGN_QA_DIR:'',DESIGN_PREVIEW_DIR:'',CHROME_CHANNEL:'',CHROME_EXECUTABLE_PATH:'',PLAYWRIGHT_MODULE:'qa-deliberately-missing-playwright'});
  assert.deepEqual(result.counts,{pass:0,fail:0,blocked:2,not_run:validateRegistry().suites.length-1});
  assert.ok(result.suites.preview.sources['tests/preview.cjs']);
  const file=path.join(result.out,'run.json');const before=fs.readFileSync(file);
  assert.throws(()=>run(parseArgs(['--out',result.out]),{...process.env,DESIGN_QA_DIR:'',CHROME_CHANNEL:'',CHROME_EXECUTABLE_PATH:''}),/already exist/);
  assert.deepEqual(fs.readFileSync(file),before);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('contradictory or error-bearing browser reports fail closed',()=>{
 for(const report of [
  {status:'pass',passed:false},{status:'passed',passed:'true'},
  {status:'pass',error:'partial failure'},{passed:true,failure:'incomplete'},
  {status:'running',passed:true},{status:'unknown',passed:true}
 ])assert.equal(classify({status:0},report).status,'fail');
 for(const report of [{status:'pass'},{status:'passed'},{passed:true},{status:'pass',passed:true}])
  assert.equal(classify({status:0},report).status,'pass');
});
