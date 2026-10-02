'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {claimEvidence,writeReport,launchForEvidence,exitCode}=require('./support/qa-runtime.cjs');
const {build}=require('../examples/panel/build.cjs');
const {parseSRGB,composite,contrastRatio}=require('./color.cjs');
const root=path.resolve(__dirname,'..');
async function main(){
 const out=claimEvidence(process.env.DESIGN_QA_DIR,{roots:[root]});
 const report={status:'running',mode:'inline-native-modules',checks:[],layouts:[],contrast:[],limitations:['Actual panel app modules with local injected service, not a server or model benchmark.','Chromium inline HTML/import map; no real URL routing, external resources, Safari/Firefox or screen-reader verification.']};
 const b=await launchForEvidence(out,'panel.json');report.browser=b.version();
 const errors=[],network=[];let p;
 const createPage=async()=>{const p=await b.newPage({viewport:{width:1440,height:1080},acceptDownloads:true});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push(m.text())});p.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});await p.setContent(build().html.replace('<script type="importmap">','<script>globalThis.__EDL_TEST__=true</script><script type="importmap">'));await p.waitForSelector('[data-row="hk-01"]');return p;};
 const check=async(name,fn)=>{await fn();report.checks.push(name);};
 const shot=async(name,fullPage=true)=>{if(out)await p.screenshot({path:path.join(out,name+'.png'),fullPage});};
 try{
 p=await createPage();
 await check('identity and shared-data aggregates',async()=>{assert.equal(await p.title(),'Relay · 项目总览');assert.equal(p.url(),'about:blank');assert.equal(await p.locator('#instance-rows tr').count(),6);assert.match(await p.locator('.metric-cost').innerText(),/79\.00/);await p.click('[data-days="2"]');assert.match(await p.locator('.chart-number').innerText(),/1\.86 TiB/);await p.click('[data-days="7"]');});
 await check('ten responsive theme conditions, bounded comparison table',async()=>{
 for(const dark of [false,true]){if((await p.locator('#relay-panel').getAttribute('data-theme')==='dark')!==dark)await p.click('#theme-toggle');for(const width of [320,390,768,1024,1440]){await p.setViewportSize({width,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow');const boxes=await p.locator('.metric').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom}}));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,'metric groups overlap');}report.layouts.push({dark,width});}}
 });
 await p.setViewportSize({width:1440,height:1080});await p.click('#theme-toggle');
 await check('search draft, composition and filters do not change project summary',async()=>{await p.fill('#query','hk-');assert.equal(await p.locator('#instance-rows tr').count(),2);assert.match(await p.locator('.metric-cost').innerText(),/79\.00/);await p.locator('#query').evaluate(e=>{e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.value='no-match';e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));});await p.selectOption('#status-filter','running');assert.equal(await p.locator('#instance-rows tr').count(),2);await p.locator('#query').evaluate(e=>{e.value='tokyo';e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));});assert.equal(await p.locator('#instance-rows tr').count(),1);await p.fill('#query','');await p.selectOption('#status-filter','all');});
 await check('selection, sort and inspected object stay independent',async()=>{await p.check('[data-select="hk-01"]');await p.check('[data-select="sg-02"]');await p.click('[data-action="sort"]');assert.equal(await p.locator('#instance-rows tr').last().getAttribute('data-row'),'sg-02');await p.click('[data-row="tyo-02"] .record-name');assert.equal(await p.locator('[data-select]:checked').count(),2);assert.match(await p.locator('#inspector').innerText(),/维护中/);await p.click('[data-action="close-detail"]');assert.equal(await p.evaluate(()=>document.activeElement.dataset.focus),'inspect-tyo-02');});
 await check('CSV download and failed export retain selected objects',async()=>{await p.evaluate(()=>{window.savedURL=URL.createObjectURL;URL.createObjectURL=()=>{throw new Error('denied')}});await p.click('[data-action="export"]');assert.equal(await p.locator('[data-select]:checked').count(),2);assert.match(await p.locator('#notice').innerText(),/导出未完成/);await p.evaluate(()=>{URL.createObjectURL=window.savedURL});const[download]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="export"]')]);const chunks=[];for await(const x of await download.createReadStream())chunks.push(x);const csv=Buffer.concat(chunks).toString('utf8');assert.ok(csv.includes('sg-backup-01'));assert.ok(!csv.includes('hk-api-02'));assert.ok(csv.includes('"待确认","",""'));await p.click('[data-action="clear-selection"]');});
 await check('refresh error is persistent, retry preserves confirmed data',async()=>{await p.click('[data-action="settings"]');await p.click('[data-action="fail-read"]');await p.click('#reload');await p.waitForFunction(()=>!document.querySelector('#reload').disabled);assert.ok(await p.locator('#load-error').isVisible());assert.equal(await p.locator('#instance-rows tr').count(),6);await p.click('#reload');await p.waitForFunction(()=>!document.querySelector('#reload').disabled);assert.ok(await p.locator('#load-error').isHidden());});
 await check('new instance validation, failure and retry update all relevant views',async()=>{await p.click('[data-action="settings"]');await p.click('[data-action="fail-create"]');await p.click('#new-instance');await p.click('#create-submit');assert.ok(await p.locator('#create-dialog').isVisible());await p.fill('#instance-name','hk-new-worker');await p.click('#create-submit');await p.waitForFunction(()=>!document.querySelector('#create-submit').disabled);assert.ok(await p.locator('#create-error').isVisible());assert.equal(await p.inputValue('#instance-name'),'hk-new-worker');await p.click('#create-submit');await p.waitForFunction(()=>!document.querySelector('#create-dialog').open);assert.equal(await p.locator('#instance-rows tr').count(),7);await p.click('[data-view="overview"]');assert.match(await p.locator('.metric-cost').innerText(),/91\.00/);});
 await check('dismissed local create cannot commit into reopened form',async()=>{await p.click('#new-instance');await p.fill('#instance-name','cancelled-worker');await p.click('#create-submit');await p.click('#create-dialog [data-action="close-create"]');await p.click('#new-instance');assert.equal(await p.inputValue('#instance-name'),'');await p.waitForTimeout(500);assert.equal(await p.locator('#instance-rows tr').count(),7);await p.keyboard.press('Escape');});
 await check('status result cannot invent missing prices or traffic',async()=>{await p.click('[data-row="sg-02"] .record-name');await p.click('#inspector [data-read]');await p.waitForFunction(()=>document.querySelector('#inspector .state').textContent.includes('运行中'));assert.equal(await p.locator('#inspector dd').filter({hasText:'未读取'}).count(),2);});
 await check('project switching discards stale display and keeps project-local records',async()=>{await p.selectOption('#scope','sandbox');assert.equal(await p.locator('#instance-rows tr').count(),0);await p.waitForSelector('[data-row="lab-01"]');assert.equal(await p.locator('#instance-rows tr').count(),1);await p.selectOption('#scope','northstar');await p.selectOption('#scope','sandbox');await p.waitForSelector('[data-row="lab-01"]');assert.equal(await p.locator('#instance-rows tr').count(),1);await p.selectOption('#scope','northstar');await p.waitForSelector('[data-row="hk-01"]');assert.equal(await p.locator('#instance-rows tr').count(),7);});
 await check('billing and activity are real views, not dead navigation',async()=>{await p.click('.main-nav [data-view="billing"]');assert.ok(await p.locator('#billing').isVisible());assert.match(await p.locator('.bill-total').innerText(),/91\.00/);await p.click('.main-nav [data-view="activity"]');assert.ok(await p.locator('#activity').isVisible());await p.click('.main-nav [data-view="overview"]');});
 await check('keyboard modal containment and short viewport recovery',async()=>{await p.setViewportSize({width:390,height:420});await p.click('#new-instance');await p.fill('#instance-name','keyboard-worker');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.activeElement.id),'new-instance');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));});
 await check('mount and dispose do not duplicate icon or event handlers',async()=>{await p.evaluate(async()=>{const{mount}=await import('#relay/app');const{createDemoService}=await import('#relay/service');window.__relay=mount(document.querySelector('#relay-panel'),{service:createDemoService({delay:0})});});await p.waitForSelector('[data-row="hk-01"]');assert.equal(await p.locator('#new-instance > svg').count(),1);await p.click('#new-instance');await p.fill('#instance-name','one-click');await p.click('#create-submit');await p.waitForFunction(()=>!document.querySelector('#create-dialog').open);assert.equal(await p.locator('#instance-rows tr').count(),7);});
 await p.close();p=await createPage();
 await check('mobile summary keeps price and state visible while preserving comparison columns',async()=>{
   report.mobile=[];
   for(const dark of [false,true])for(const width of [320,390]){
     await p.setViewportSize({width,height:844});
     await p.locator('#relay-panel').evaluate((e,d)=>e.dataset.theme=d?'dark':'neutral',dark);
     await p.locator('.table-scroll').evaluate(e=>e.scrollLeft=0);
     await p.waitForFunction(()=>!document.querySelector('#table-scroll-help').hidden);
     const observations=await p.locator('#instance-rows tr').evaluateAll(rows=>rows.map(row=>{
       const summary=row.querySelector('.mobile-record-summary'),box=summary.getBoundingClientRect(),region=row.closest('.table-scroll').getBoundingClientRect();
       return {id:row.dataset.row,summary:summary.innerText,status:row.querySelector('td:nth-child(4)').innerText,price:row.querySelector('td:nth-child(7)').innerText,
         hiddenFromAT:summary.getAttribute('aria-hidden'),focusables:summary.querySelectorAll('button,input,a,[tabindex]').length,
         left:box.left,right:box.right,regionLeft:region.left,regionRight:region.right};
     }));
     assert.equal(observations.length,6);
     for(const row of observations){assert.ok(row.summary.includes(row.status),row.id);assert.ok(row.summary.includes(row.price),row.id);assert.equal(row.hiddenFromAT,'true');assert.equal(row.focusables,0);assert.ok(row.left>=row.regionLeft&&row.right<=row.regionRight,row.id+' summary outside initial table viewport');}
     const fonts=await p.locator('.cost-foot>span,.metric-foot,.record-meta,.table-scroll-help,.attention-content>span').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>({selector:e.className,size:parseFloat(getComputedStyle(e).fontSize),primary:!!e.closest('.metric-primary')})));
     for(const f of fonts)assert.ok(f.size>=(f.primary?11:12),JSON.stringify(f));
     for(const sel of ['#new-instance','#reload','#theme-toggle','.record-name','.sort-button','.segmented button','#status-filter','#scope']){
       const r=await p.locator(sel).first().boundingBox();assert.ok(r&&r.height>=44&&r.width>=44,sel+' comfortable mobile target');
     }
     assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow');
     for(const sel of ['.record-price','.table-scroll-help','#instance-rows .value-unknown']){
       const c=await p.locator(sel).first().evaluate(e=>({fg:getComputedStyle(e).color,bgs:[...function*(p){while(p){yield p;p=p.parentElement}}(e)].map(p=>getComputedStyle(p).backgroundColor).reverse()}));
       const bg=c.bgs.reduce((a,v)=>composite(parseSRGB(v),a),[255,255,255,1]);const ratio=contrastRatio(parseSRGB(c.fg),bg);
       assert.ok(ratio>=4.5,sel+' mobile text '+ratio);report.contrast.push({phase:'mobile',dark,width,sel,ratio});
     }
     report.mobile.push({dark,width,rows:observations,fonts});
   }
   await p.click('[data-row="sg-02"] .record-name');await p.click('#inspector [data-read]');
   await p.waitForFunction(()=>document.querySelector('[data-row="sg-02"] .mobile-record-summary').textContent.includes('运行中'));
   assert.match(await p.locator('[data-row="sg-02"] .record-price').innerText(),/未读取/);
   await p.click('[data-action="close-detail"]');
 });
 await check('scroll hint tracks real overflow, empty results, container resize and view visibility',async()=>{
   await p.setViewportSize({width:390,height:844});await p.fill('#query','absent-instance');
   assert.ok(await p.locator('#table-scroll-help').isHidden());assert.equal(await p.locator('.table-scroll').getAttribute('tabindex'),'-1');
   await p.fill('#query','');await p.waitForFunction(()=>!document.querySelector('#table-scroll-help').hidden);
   assert.equal(await p.locator('.table-scroll').getAttribute('aria-describedby'),'table-scroll-help');
   await p.locator('.table-scroll').focus();await p.keyboard.press('ArrowRight');
   await p.waitForFunction(()=>document.querySelector('.table-scroll').scrollLeft>0);
   await p.locator('.table-scroll').evaluate(e=>e.scrollLeft=0);
   await p.click('.main-nav [data-view="billing"]');assert.ok(await p.locator('#table-scroll-help').isHidden());
   await p.click('.main-nav [data-view="instances"]');await p.waitForFunction(()=>!document.querySelector('#table-scroll-help').hidden);
   await p.setViewportSize({width:1440,height:1080});await p.waitForFunction(()=>document.querySelector('#table-scroll-help').hidden);
   assert.equal(await p.locator('.table-scroll').getAttribute('aria-describedby'),null);
   await p.locator('#collection').evaluate(e=>e.style.width='550px');await p.waitForFunction(()=>!document.querySelector('#table-scroll-help').hidden);
   await p.locator('#collection').evaluate(e=>e.style.removeProperty('width'));await p.waitForFunction(()=>document.querySelector('#table-scroll-help').hidden);
 });
 await check('rendered data counterexamples preserve unknown, zero, partial, empty and supplied notes',async()=>{
   report.presentation=[];await p.locator('#relay-panel').evaluate(e=>e.dataset.theme='neutral');
   for(const scenario of ['unknown','zero','partial','empty','stopped','maintenance']){
     await p.evaluate(async scenario=>{
       const {mount}=await import('#relay/app'),{seedSnapshot}=await import('#relay/service');const snapshot=seedSnapshot();
       if(scenario==='unknown')snapshot.items.forEach(r=>r.cents=null);
       if(scenario==='zero')snapshot.items.forEach(r=>r.cents=0);
       if(scenario==='partial')snapshot.items.forEach((r,i)=>r.cents=i===0?1600:null);
       if(scenario==='empty')snapshot.items=[];
       if(scenario==='stopped'){snapshot.items[0].status='stopped';snapshot.items[0].note=' \t ';}
       if(scenario==='maintenance'){snapshot.items[0].status='maintenance';snapshot.items[0].note='网络设备维护，恢复时间未提供。';}
       globalThis.__relay=mount(document.querySelector('#relay-panel'),{service:{list:async()=>structuredClone(snapshot)}});
     },scenario);
     await p.waitForFunction(()=>!!globalThis.__relay.store.get().snapshot);
     if(['unknown','zero','partial','empty'].includes(scenario)){
       await p.click('.main-nav [data-view="billing"]');
       const expected={unknown:'未读取',zero:'$0.00',partial:'$16.00',empty:'暂无实例'}[scenario];
       assert.equal(await p.locator('.bill-total').innerText(),expected);
       const metric=await p.locator('.metric-cost').innerText();assert.ok(metric.includes(expected.replace('$','')),metric);
       report.presentation.push({scenario,total:expected,metric});
       if(scenario==='unknown')await shot('panel-unknown-cost');
     }else{
       if(scenario==='maintenance')assert.match(await p.locator('#attention').innerText(),/网络设备维护，恢复时间未提供。/);
       await p.click('[data-row="hk-01"] .record-name');
       const actual=await p.locator('.detail-note').innerText();
       assert.equal(actual,scenario==='stopped'?'未提供状态说明。':'网络设备维护，恢复时间未提供。');
       report.presentation.push({scenario,note:actual});
     }
   }
 });
 await check('overflow observers disconnect on remount and disposal, resize fallback still works',async()=>{
   await p.evaluate(async()=>{
     const Native=globalThis.ResizeObserver,live=new Set();
     const {mount}=await import('#relay/app'),{createDemoService}=await import('#relay/service');
     globalThis.ResizeObserver=class extends Native{constructor(fn){super(fn);live.add(this);}disconnect(){live.delete(this);super.disconnect();}};
     try{
       const root=document.querySelector('#relay-panel');
       mount(root,{service:createDemoService({delay:0})});
       const current=mount(root,{service:createDemoService({delay:0})});
       if(live.size!==1)throw new Error('Old observer retained');current.destroy();
       if(live.size!==0)throw new Error('Disposed observer retained');
     }finally{globalThis.ResizeObserver=Native;}
     globalThis.__savedObserver=Native;globalThis.ResizeObserver=undefined;
     globalThis.__relay=mount(document.querySelector('#relay-panel'),{service:createDemoService({delay:0})});
   });
   await p.waitForSelector('[data-row="hk-01"]');await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>!document.querySelector('#table-scroll-help').hidden);
   await p.setViewportSize({width:1440,height:1080});await p.waitForFunction(()=>document.querySelector('#table-scroll-help').hidden);
   await p.evaluate(()=>{globalThis.__relay.destroy();globalThis.ResizeObserver=globalThis.__savedObserver;delete globalThis.__savedObserver;});
 });
 await p.close();p=await createPage();
 await check('controlled text contrast on both themes',async()=>{for(const dark of [false,true]){if(dark)await p.click('#theme-toggle');for(const sel of ['h1','.record-name','.record-meta','.metric-label','.metric-foot','.metric-value','.state-maintenance','.state-unknown','.attention-content>span']){const c=await p.locator(sel).first().evaluate(e=>({fg:getComputedStyle(e).color,bgs:[...function*(p){while(p){yield p;p=p.parentElement}}(e)].map(p=>getComputedStyle(p).backgroundColor).reverse()}));const bg=c.bgs.reduce((a,v)=>composite(parseSRGB(v),a),[255,255,255,1]);const ratio=contrastRatio(parseSRGB(c.fg),bg);assert.ok(ratio>=4.5,sel+' '+ratio);report.contrast.push({dark,sel,ratio});}}});
 await check('reduced motion and forced colors preserve semantic controls',async()=>{await p.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await p.click('#new-instance');assert.ok(await p.locator('#create-dialog').isVisible());await p.keyboard.press('Escape');await p.emulateMedia({reducedMotion:'no-preference',forcedColors:'none'});});
 await p.click('#theme-toggle');await p.setViewportSize({width:1440,height:1080});await shot('panel-desktop');await shot('panel-first-screen',false);await p.click('#new-instance');await shot('panel-create',false);await p.keyboard.press('Escape');await p.click('#theme-toggle');await shot('panel-dark');await p.click('#theme-toggle');await p.setViewportSize({width:390,height:844});await shot('panel-mobile');await p.locator('#collection').evaluate(e=>e.scrollIntoView({block:'start'}));await shot('panel-mobile-collection',false);await p.setViewportSize({width:320,height:844});await p.locator('#collection').evaluate(e=>e.scrollIntoView({block:'start'}));await shot('panel-320-collection',false);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);report.errors=errors;report.externalRequests=network;report.status='pass';
 }catch(e){report.status='fail';report.error=e.stack;if(out&&p)await p.screenshot({path:path.join(out,'panel-failure.png'),fullPage:true}).catch(()=>{});throw e;}
 finally{if(out)writeReport(out,'panel.json',report);console.log(JSON.stringify({status:report.status,checks:report.checks.length,layouts:report.layouts.length,contrast:report.contrast.length,error:report.error},null,2));await b.close();}
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=exitCode(e)});
