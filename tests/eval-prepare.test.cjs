'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {prepare,validateSuite,sourceManifest}=require('../evals/prepare.cjs');
const repo=path.resolve(__dirname,'..');
const sample={id:'sample-case',prompt:'Improve the target only.',context:'An existing screen is available.',should_trigger:true,mode:'polish',must:['RUBRIC_ONLY_MUST'],must_not:['RUBRIC_ONLY_PROHIBITION'],evidence:'RUBRIC_ONLY_EVIDENCE'};
function setup(t) {
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'edl-eval-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const source=path.join(base,'skill');fs.mkdirSync(path.join(source,'evals'),{recursive:true});
 fs.writeFileSync(path.join(source,'SKILL.md'),'# Example skill\n');
 fs.writeFileSync(path.join(source,'evals','cases.json'),JSON.stringify({schema_version:1,cases:[sample]}));
 return {base,source,out:path.join(base,'run')};
}
const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));

test('prepares only prompt/context inputs, with separate unexecuted review records', t=>{
 const f=setup(t); const result=prepare({sourceRoot:f.source,outDir:f.out,ids:['sample-case']});
 const input=readJSON(path.join(f.out,'inputs/sample-case.json'));
 assert.deepEqual(input,{prompt:sample.prompt,context:sample.context});
 assert.doesNotMatch(JSON.stringify(input),/RUBRIC_ONLY/);
 const review=readJSON(path.join(f.out,'review/sample-case.json'));
 assert.equal(review.status,'not_run');assert.equal(review.fixture_status,'not_prepared');
 assert.equal(review.model,null);assert.deepEqual(review.artifacts,[]);
 assert.ok(review.assertions.length===2 && review.assertions.every(a=>a.status==='not_run' && a.evidence.length===0));
 assert.equal(result.status,'not_run');assert.equal(result.cases,1);
 const manifest=readJSON(path.join(f.out,'manifest.json'));
 assert.equal(manifest.source_commit,null);assert.equal(manifest.source.tree_sha256,sourceManifest(f.source).tree_sha256);
});
test('real suite validates and selected negative routing input does not expose expected trigger',t=>{
 const suite=validateSuite(readJSON(path.join(repo,'evals/cases.json')));
 assert.ok(suite.cases.some(c=>c.id==='backend-negative' && !c.should_trigger));
 const f=setup(t);prepare({sourceRoot:repo,outDir:f.out,ids:['backend-negative']});
 const input=readJSON(path.join(f.out,'inputs/backend-negative.json'));
 assert.deepEqual(Object.keys(input).sort(),['context','prompt']);
 assert.equal(readJSON(path.join(f.out,'review/backend-negative.json')).expected.should_trigger,false);
});
test('default selection prepares all source cases without changing source bytes',t=>{
 const f=setup(t); const before=sourceManifest(f.source);prepare({sourceRoot:f.source,outDir:f.out});
 assert.deepEqual(sourceManifest(f.source),before);
 assert.deepEqual(readJSON(path.join(f.out,'manifest.json')).case_ids,['sample-case']);
});
test('schema rejects unsafe IDs, duplicate IDs, missing criteria and inconsistent trigger',()=>{
 for(const cases of [[{...sample,id:'../escape'}],[sample,sample],[{...sample,must:[]}],[{...sample,should_trigger:false}]])
   assert.throws(()=>validateSuite({schema_version:1,cases}));
 assert.throws(()=>validateSuite({schema_version:2,cases:[sample]}));
});
test('unknown and duplicated selected IDs fail before any output is created',t=>{
 const f=setup(t);
 for(const ids of [['missing'],['sample-case','sample-case'],['']]){
   assert.throws(()=>prepare({sourceRoot:f.source,outDir:f.out,ids}));assert.equal(fs.existsSync(f.out),false);
 }
});
test('never overwrites an existing run or writes a run inside source',t=>{
 const f=setup(t);fs.mkdirSync(f.out);fs.writeFileSync(path.join(f.out,'keep'),'unchanged');
 assert.throws(()=>prepare({sourceRoot:f.source,outDir:f.out}),/already exists/);
 assert.equal(fs.readFileSync(path.join(f.out,'keep'),'utf8'),'unchanged');
 assert.throws(()=>prepare({sourceRoot:f.source,outDir:path.join(f.source,'new-run')}),/outside/);
 assert.equal(fs.existsSync(path.join(f.source,'new-run')),false);
});
test('resolves output parent symlinks before enforcing source boundary',t=>{
 const f=setup(t);const alias=path.join(f.base,'alias');fs.symlinkSync(f.source,alias,'dir');
 assert.throws(()=>prepare({sourceRoot:f.source,outDir:path.join(alias,'new-run')}),/outside/);
 assert.equal(fs.existsSync(path.join(f.source,'new-run')),false);
});
test('refuses source symlinks instead of following files outside the selected source',t=>{
 const f=setup(t);fs.writeFileSync(path.join(f.base,'outside'),'outside');fs.symlinkSync(path.join(f.base,'outside'),path.join(f.source,'link'));
 assert.throws(()=>prepare({sourceRoot:f.source,outDir:f.out}),/symlinks/);
 assert.equal(fs.existsSync(f.out),false);
});
test('source hashes represent actual bytes, change after edits, and exclude dot entries',t=>{
 const f=setup(t);fs.mkdirSync(path.join(f.source,'.git'));fs.writeFileSync(path.join(f.source,'.git','private'),'excluded');
 const before=sourceManifest(f.source);assert.ok(before.files.every(f=>!f.path.startsWith('.')));
 const skill=before.files.find(f=>f.path==='SKILL.md');
 assert.equal(skill.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.source,'SKILL.md'))).digest('hex'));
 fs.appendFileSync(path.join(f.source,'SKILL.md'),'Changed\n');
 assert.notEqual(sourceManifest(f.source).tree_sha256,before.tree_sha256);
});
test('CLI rejects malformed flags and supports an explicit help command',()=>{
 const cli=path.join(repo,'evals/prepare.cjs');
 assert.equal(spawnSync(process.execPath,[cli,'--help'],{encoding:'utf8'}).status,0);
 for(const args of [[],['--unknown','a'],['--out'],['--cases',''],['--out','a','--out','b']])
   assert.equal(spawnSync(process.execPath,[cli,...args],{encoding:'utf8'}).status,1);
});

test('complete current suite prepares every ID, including newly registered cases',t=>{
 const suite=validateSuite(readJSON(path.join(repo,'evals/cases.json')));
 const f=setup(t);const result=prepare({sourceRoot:repo,outDir:f.out});
 const ids=suite.cases.map(c=>c.id);
 assert.equal(result.cases,ids.length);
 assert.deepEqual(readJSON(path.join(f.out,'manifest.json')).case_ids,ids);
 for(const id of ids){
  assert.deepEqual(Object.keys(readJSON(path.join(f.out,`inputs/${id}.json`))).sort(),['context','prompt']);
  assert.equal(readJSON(path.join(f.out,`review/${id}.json`)).status,'not_run');
 }
 assert.equal(fs.readdirSync(path.join(f.out,'inputs')).length,ids.length);
 assert.equal(fs.readdirSync(path.join(f.out,'review')).length,ids.length);
});
