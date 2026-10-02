'use strict';
// Fixture integrity/reproduction tests, NOT a model quality or host-routing evaluation.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {readFixture, copyFixture} = require('../evals/fixtures.cjs');
const {prepare, sourceManifest} = require('../evals/prepare.cjs');
const {createPaymentService} = require('../evals/fixtures/payment-unknown/workspace/service.js');
const root = path.resolve(__dirname, '..');
const ids = ['fix-hover-only','peer-same-style','copy-dev-brief-leak','payment-unknown','build-dense-console','backend-negative'];
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function temp(t) { const dir=fs.mkdtempSync(path.join(os.tmpdir(),'edl-pilot-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir; }
function synthetic(t) {
  const dir=temp(t), source=path.join(dir,'source'), base=path.join(source,'evals/fixtures/probe');
  fs.mkdirSync(path.join(base,'workspace'),{recursive:true});
  fs.writeFileSync(path.join(source,'SKILL.md'),'# Fixture test\n');
  fs.writeFileSync(path.join(source,'evals/cases.json'),JSON.stringify({schema_version:1,cases:[{id:'probe',prompt:'Work on the source.',context:'Local files.',mode:'fix',should_trigger:true,must:['REVIEW_ONLY_SENTINEL'],must_not:['Do not contact external services.'],evidence:'Review only.'}]}));
  fs.writeFileSync(path.join(base,'workspace/index.html'),'<h1>Local source</h1>');
  fs.writeFileSync(path.join(base,'review.json'),JSON.stringify({schema_version:1,case_id:'probe',runtime:'browser',entrypoints:['index.html'],checklist:['REVIEW_ONLY_SENTINEL']}));
  return {dir,source,base,out:path.join(dir,'output')};
}
for (const id of ids) test(`pilot fixture ${id} has nonempty frozen entrypoints and reviewer-only metadata`,()=>{
  const f=readFixture(root,id);
  assert.equal(f.id,id);assert.match(f.tree_sha256,/^[a-f0-9]{64}$/);
  assert.ok(f.files.length>0);assert.ok(f.metadata.checklist.length>0);
  assert.ok(f.files.every(file=>!file.path.includes('review') && file.bytes>0));
  assert.deepEqual(f.files,readFixture(root,id).files);
});
test('all six pilot workspaces copy byte-identically while execution and model records stay not_run',t=>{
  const out=path.join(temp(t),'run'),before=sourceManifest(root);
  prepare({sourceRoot:root,outDir:out,ids});
  assert.deepEqual(sourceManifest(root),before);
  const manifest=json(path.join(out,'manifest.json'));
  assert.equal(manifest.status,'not_run');assert.equal(manifest.source_commit,null);
  assert.equal(fs.readdirSync(path.join(out,'inputs')).length,6);
  for(const id of ids) {
    const f=readFixture(root,id), r=json(path.join(out,`review/${id}.json`));
    assert.equal(r.fixture_status,'prepared');assert.equal(r.status,'not_run');assert.equal(r.model,null);
    assert.ok(r.assertions.every(a=>a.status==='not_run'));
    assert.equal(r.fixture.tree_sha256,f.tree_sha256);
    assert.equal(manifest.fixtures[id].tree_sha256,f.tree_sha256);
    assert.deepEqual(Object.keys(json(path.join(out,`inputs/${id}.json`))).sort(),['context','prompt']);
    for(const file of f.snapshots) assert.deepEqual(fs.readFileSync(path.join(out,'workspaces',id,file.path)),file.content);
    assert.equal(fs.existsSync(path.join(out,'workspaces',id,'review.json')),false);
  }
});
test('review sentinel cannot enter executor inputs or workspace',t=>{
  const f=synthetic(t);prepare({sourceRoot:f.source,outDir:f.out});
  assert.doesNotMatch(fs.readFileSync(path.join(f.out,'inputs/probe.json'),'utf8'),/REVIEW_ONLY_SENTINEL/);
  assert.doesNotMatch(fs.readFileSync(path.join(f.out,'workspaces/probe/index.html'),'utf8'),/REVIEW_ONLY_SENTINEL/);
  assert.match(fs.readFileSync(path.join(f.out,'review/probe.json'),'utf8'),/REVIEW_ONLY_SENTINEL/);
});
test('unbundled cases remain not_prepared, not silently marked ready',t=>{
  const out=path.join(temp(t),'run');prepare({sourceRoot:root,outDir:out,ids:['review-readonly']});
  assert.equal(json(path.join(out,'review/review-readonly.json')).fixture_status,'not_prepared');
  assert.deepEqual(fs.readdirSync(path.join(out,'workspaces')),[]);
});
test('malformed or escaping fixture metadata fails before output creation',t=>{
  const f=synthetic(t),file=path.join(f.base,'review.json'),valid=json(file);
  for(const mutation of [{case_id:'other'},{runtime:'shell'},{entrypoints:['../review.json']},{entrypoints:['/tmp/x']},{entrypoints:['missing']},{entrypoints:[]},{checklist:[]}]) {
    fs.writeFileSync(file,JSON.stringify({...valid,...mutation}));
    assert.throws(()=>prepare({sourceRoot:f.source,outDir:f.out}));assert.equal(fs.existsSync(f.out),false);
  }
});
test('empty workspaces and symbolic links are rejected instead of copied',t=>{
  const f=synthetic(t),entry=path.join(f.base,'workspace/index.html');fs.unlinkSync(entry);
  assert.throws(()=>readFixture(f.source,'probe'),/Empty or missing/);
  fs.symlinkSync(path.join(f.base,'review.json'),entry);
  assert.throws(()=>prepare({sourceRoot:f.source,outDir:f.out}),/symlinks/);assert.equal(fs.existsSync(f.out),false);
});
test('hidden workspace entries are refused rather than accidentally copying secrets',t=>{
  const f=synthetic(t);fs.writeFileSync(path.join(f.base,'workspace/.env'),'NOT_A_REAL_SECRET');
  assert.throws(()=>prepare({sourceRoot:f.source,outDir:f.out}),/Unsafe fixture entry/);
  assert.equal(fs.existsSync(f.out),false);
});
test('fixture digest changes with source bytes and copy uses exactly the hashed snapshot',t=>{
  const f=synthetic(t),before=readFixture(f.source,'probe');
  fs.appendFileSync(path.join(f.base,'workspace/index.html'),'changed');
  assert.notEqual(readFixture(f.source,'probe').tree_sha256,before.tree_sha256);
  const target=path.join(f.dir,'copy');copyFixture(before,target);
  assert.equal(fs.readFileSync(path.join(target,'index.html'),'utf8'),'<h1>Local source</h1>');
  assert.throws(()=>copyFixture(before,target),/EEXIST/);
  assert.throws(()=>readFixture(f.source,'../probe'),/Unsafe fixture ID/);
});
test('dense console starts from fixed demo data rather than a pre-solved UI',()=>{
  const f=readFixture(root,'build-dense-console');
  assert.ok(f.files.every(file=>!file.path.endsWith('.html')));
  const data=JSON.parse(f.snapshots.find(file=>file.path==='instances.json').content);
  assert.equal(data.kind,'local-demo');assert.equal(data.instances.length,12);
  assert.equal(new Set(data.instances.map(row=>row.id)).size,12);
  assert.ok(data.instances.some(row=>row.status===null));assert.ok(data.instances.some(row=>row.expires_at===null));
  for(const row of data.instances) assert.deepEqual(Object.keys(row).sort(),['expires_at','id','name','region','status']);
});
test('backend negative contains SQL and explicitly synthetic plan, no frontend files',()=>{
  const f=readFixture(root,'backend-negative');assert.equal(f.metadata.runtime,'sql');
  assert.ok(f.files.every(file=>/\.(md|sql|txt)$/.test(file.path)));
  assert.match(f.snapshots.find(file=>file.path==='explain.txt').content.toString(),/Synthetic plan/);
  assert.equal(require('../evals/cases.json').cases.find(c=>c.id==='backend-negative').should_trigger,false);
});
test('seed payment timeout is ambiguous: one committed payment and an erroneous retry creates a second',async()=>{
  const api=createPaymentService({delay:0});
  await assert.rejects(api.submit('ORD-DEMO-001'),{code:'TIMEOUT'});
  assert.equal(api.inspect().payments.length,1);
  assert.equal((await api.query('ORD-DEMO-001')).status,'paid');
  assert.equal(api.inspect().payments.length,1);
  await assert.rejects(api.submit('ORD-DEMO-001'),{code:'TIMEOUT'});
  assert.equal(api.inspect().payments.length,2);
});
test('query preserves the original order and never submits or mutates payment state',async()=>{
  const api=createPaymentService({scenario:'success',delay:0});await api.submit('ORD-DEMO-001');
  const before=api.inspect().payments;
  for(let i=0;i<3;i++)assert.equal((await api.query('ORD-DEMO-001')).orderId,'ORD-DEMO-001');
  assert.equal((await api.query('ORD-DEMO-002')).status,'pending');
  assert.deepEqual(api.inspect().payments,before);
  assert.equal(api.inspect().events.filter(e=>e.type==='submit').length,1);
});
test('payment pending, confirmed failure, success and query-unavailable remain distinct',async()=>{
  for(const [scenario,status,count] of [['timeout-before-commit','pending',0],['declined','failed',0],['success','paid',1],['query-unavailable','paid',1]]) {
    const api=createPaymentService({scenario,delay:0});
    if(scenario.startsWith('timeout')||scenario==='query-unavailable') await assert.rejects(api.submit('ORD-DEMO-001'),{code:'TIMEOUT'});
    else assert.equal((await api.submit('ORD-DEMO-001')).status,status);
    if(scenario==='query-unavailable') await assert.rejects(api.query('ORD-DEMO-001'),{code:'QUERY_UNAVAILABLE'});
    else assert.equal((await api.query('ORD-DEMO-001')).status,status);
    assert.equal(api.inspect().payments.length,count);
  }
});
test('simulated idempotency is scoped to order plus key, including concurrent calls',async()=>{
  const api=createPaymentService({delay:0});
  const results=await Promise.allSettled([api.submit('ORD-DEMO-001',{idempotencyKey:'same'}),api.submit('ORD-DEMO-001',{idempotencyKey:'same'})]);
  assert.equal(results[0].status,'rejected');assert.equal(results[1].status,'fulfilled');
  assert.equal(api.inspect().payments.length,1);
  await assert.rejects(api.submit('ORD-DEMO-002',{idempotencyKey:'same'}),{code:'TIMEOUT'});
  assert.equal(api.inspect().payments.length,2);
});
test('invalid orders and mutable diagnostic snapshots cannot alter the service ledger',async()=>{
  const api=createPaymentService({delay:0}),snapshot=api.inspect();snapshot.orders[0].status='paid';
  await assert.rejects(api.submit('not-an-order'),/Unknown demo order/);
  await assert.rejects(api.query('not-an-order'),/Unknown demo order/);
  assert.equal((await api.query('ORD-DEMO-001')).status,'pending');
  assert.equal(api.inspect().payments.length,0);
  assert.throws(()=>createPaymentService({scenario:'not-a-scenario'}),/Invalid demo configuration/);
});
