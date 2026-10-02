'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {readSources,fixture}=require('./choice-layout.cjs');
const root=path.resolve(__dirname,'..');

test('choice fixture is built from the shipped markup, not copied test-only controls',()=>{
  const source=readSources(path.join(root,'assets'));
  const html=fixture(source,{outer:'ltr',inner:'rtl',width:220});
  assert.ok(html.includes(source.fragment));
  assert.equal((html.match(/type="radio"/g)||[]).length,3);
  assert.equal((html.match(/<bdi dir="ltr">/g)||[]).length,5);
  assert.doesNotMatch(html,/<script[\s>]/);
  assert.throws(()=>fixture(source,{inner:'invalid'}),{code:'ERR_ASSERTION'});
});

test('fixture ID references resolve, and known unit strings stay unchanged',()=>{
  const html=fixture(readSources(path.join(root,'assets')));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  for(const [,refs] of html.matchAll(/aria-describedby="([^"]+)"/g))
    for(const ref of refs.split(/\s+/))assert.ok(ids.includes(ref));
  for(const unit of ['2 vCPU','4 vCPU','8 vCPU','4 GB','8 GB'])assert.ok(html.includes(`>${unit}</bdi>`));
});

for(const kind of ['source','existing'])test(`choice QA refuses ${kind} output without writing`,()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'edl-choice-test-'));
  const target=kind==='source'?root:temp;
  const report=path.join(target,'choice-layout.json');
  if(kind==='existing')fs.writeFileSync(report,'preserve');
  const before=fs.existsSync(report)?fs.readFileSync(report):null;
  try {
    const p=spawnSync(process.execPath,[path.join(__dirname,'choice-layout.cjs')],{encoding:'utf8',timeout:5000,
      env:{...process.env,DESIGN_QA_DIR:target,DESIGN_PREVIEW_DIR:'',CHROME_CHANNEL:'',CHROME_EXECUTABLE_PATH:'',PLAYWRIGHT_MODULE:'do-not-load'}});
    assert.equal(p.status,1);
    assert.match(p.stdout,kind==='source'?/Evidence must be outside source/:/Use a fresh evidence directory/);
    assert.doesNotMatch(p.stdout,/Cannot find module/);
    if(before)assert.deepEqual(fs.readFileSync(report),before);else assert.equal(fs.existsSync(report),false);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
