// Fixture packaging and CSV helper checks, not model-behavior evaluation.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assets=path.resolve(__dirname,'../assets');
const html=fs.readFileSync(path.join(assets,'patterns.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const csvCell=vm.runInNewContext('('+script.match(/function csvCell\(value\) \{[\s\S]*?\n\}/)[0]+')');
test('collection loads local resources and has a scoped valid script',()=>{
  for(const [,href] of html.matchAll(/<link[^>]*href="([^"]+)"/g)) {assert.ok(!/[/:]/.test(href));assert.ok(fs.existsSync(path.join(assets,href)));}
  assert.ok(script.startsWith('\n(() => {'));new vm.Script(script);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
test('copy is product-specific and inspection is not a modal',()=>{
  assert.ok(html.includes('<title>服务清单</title>'));
  assert.ok(!html.includes('<dialog'));assert.ok(!html.includes('aria-modal="true"'));
  assert.ok(!html.includes('按原始数值排序'));assert.ok(!html.includes('状态用文字表达'));
  assert.ok(html.includes('演示数据 · 不连接真实服务'));
});
test('CSV escapes delimiters, quotation marks and line breaks',()=>{
  assert.equal(csvCell('文档, "预览"\n分行'),'"文档, ""预览""\n分行"');
  assert.equal(csvCell(''),'""');assert.equal(csvCell('12.5'),'"12.5"');
});
test('CSV neutralizes spreadsheet formulas in untrusted text',()=>{
  for(const input of ['=1+1','+CMD','-2+3','@SUM(A1)','  =1','\tvalue','\rvalue']) assert.ok(csvCell(input).startsWith('"\''));
});
test('every CSS variable has a local definition',()=>{
  const css=['tokens.css','components.css','patterns.css'].map(f=>fs.readFileSync(path.join(assets,f),'utf8')).join('\n');
  const defined=new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m=>m[1]));
  for(const [,name] of css.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) assert.ok(defined.has(name),name);
});

for (const destination of ['source', 'existing']) test(`QA rejects ${destination} output without writing an error report`,()=>{
  const os=require('node:os');
  const {spawnSync}=require('node:child_process');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'edl-output-'));
  const target=destination==='source'?path.resolve(__dirname,'..'):temp;
  const report=path.join(target,'patterns-validation.json');
  const sentinel='must remain unchanged';
  if(destination==='existing') fs.writeFileSync(report,sentinel);
  const before=fs.existsSync(report)?fs.readFileSync(report):null;
  try {
    const processResult=spawnSync(process.execPath,[path.join(__dirname,'patterns.cjs')],{
      env:{...process.env,DESIGN_QA_MODE:'inline',DESIGN_QA_DIR:target,
        PLAYWRIGHT_MODULE:'must-not-load-browser-for-invalid-output',CHROME_CHANNEL:'',CHROME_EXECUTABLE_PATH:''},
      encoding:'utf8',timeout:10000
    });
    assert.equal(processResult.status,1);
    assert.match(processResult.stderr,destination==='source'?/Evidence must be outside source/:/Use a fresh evidence directory/);
    assert.doesNotMatch(processResult.stderr,/Cannot find module/);
    if(before===null) assert.ok(!fs.existsSync(report));
    else assert.deepEqual(fs.readFileSync(report),before);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});

const keyGuardSource=script.match(/function inputOwnsKey\(event\) \{[\s\S]*?\n\}/)[0];
const keyGuard=vm.runInNewContext('let composing=false, detailComposing=false;('+keyGuardSource+')');
const keyEvent=overrides=>({defaultPrevented:false,isComposing:false,keyCode:27,ctrlKey:false,metaKey:false,shiftKey:false,target:{closest:()=>null},...overrides});
test('detail key guard yields to IME, editors, modifiers and consumed events',()=>{
  for(const override of [{isComposing:true},{keyCode:229},{defaultPrevented:true},{ctrlKey:true},{metaKey:true},{shiftKey:true},{target:{closest:()=>({})}}])
    assert.equal(keyGuard(keyEvent(override)),true);
  assert.equal(keyGuard(keyEvent({})),false);
});
test('composition lifecycle also blocks navigation when event flag is absent',()=>{
  for(const state of ['composing','detailComposing']) {
    const guard=vm.runInNewContext(`let composing=false,detailComposing=false;${state}=true;(${keyGuardSource})`);
    assert.equal(guard(keyEvent({})),true);
  }
});

const totalSource=script.match(/function knownTotal\(items\) \{[\s\S]*?\n\}/)[0];
const total=vm.runInNewContext('('+totalSource+')');
const pricedRows=prices=>prices.map(price=>({dataset:{price}}));
test('scope totals distinguish unknown, zero and empty without mixing coverage',()=>{
  assert.equal(total(pricedRows(['2','12.5','120',''])),'已知月费合计 134.50 USD · 3/4 项有价格');
  assert.equal(total(pricedRows(['0',''])),'已知月费合计 0.00 USD · 1/2 项有价格');
  assert.equal(total(pricedRows([''])),'月费尚未读取');
  assert.equal(total([]),'当前结果没有服务');
});
test('inactive selection controls are inaccessible before initialization',()=>{
  for(const id of ['selection-summary','selection-bar']) {
    const tag=html.match(new RegExp('<div[^>]*id="'+id+'"[^>]*>'))[0];
    assert.ok(tag.includes('aria-hidden="true"'));assert.ok(/\binert(?:\s|>)/.test(tag));
  }
  assert.ok(!html.includes('role="toolbar"'),'No toolbar keyboard contract is implemented');
});
