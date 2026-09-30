/* Optional browser regression check. Requires an existing Playwright installation. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const target=pathToFileURL(path.resolve(__dirname,'../assets/preview.html')).href;
const evidence=process.env.DESIGN_QA_DIR;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1080}});
  const errors=[],requests=[],checks=[],layouts=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(['error','warning'].includes(e.type()))errors.push(e.text())});
  page.on('request',r=>{if(!r.url().startsWith('file:'))requests.push(r.url())});
  await page.goto(target);
  assert.equal(await page.title(),'设计语言');assert.equal(page.url(),target);
  assert.ok(await page.getByRole('heading',{name:'检查记录',exact:true}).isVisible());
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);
  async function contrast(locator,label,pseudo){
   const result=await locator.evaluate((el,pseudo)=>{
    const parse=s=>{const m=s.match(/[\d.]+/g).map(Number);return [...m.slice(0,3),m[3]??1]};
    const over=(a,b)=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1];
    let chain=[];for(let p=el;p;p=p.parentElement)chain.push(p);
    let bg=[255,255,255,1];for(const p of chain.reverse())bg=over(parse(getComputedStyle(p).backgroundColor),bg);
    const cs=getComputedStyle(el,pseudo);const fg=over(parse(cs.color),bg);
    const lum=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const a=lum(fg),b=lum(bg);return {ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),color:cs.color,background:cs.backgroundColor,filter:cs.filter,opacity:cs.opacity};
   },pseudo);
   assert.ok(result.ratio>=4.5,JSON.stringify({label,...result}));
   assert.equal(result.filter,'none');assert.equal(result.opacity,'1');checks.push({label,...result});return result;
  }
  for(const theme of ['neutral','dark']){
   await page.selectOption('#theme',theme);
   for(const material of ['liquid','frosted','solid']){
    await page.selectOption('#material',material);
    for(const width of [320,390,768,1440]){
     await page.setViewportSize({width,height:1080});
     const size=await page.evaluate(()=>({root:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
     assert.ok(size.root<=width&&size.body<=width,JSON.stringify({theme,material,width,size}));layouts.push({theme,material,width});
    }
   }
   await page.selectOption('#material','solid');
   for(const variant of ['主操作','次操作','轻操作']){
    const b=page.locator('[data-demo="'+variant+'"]');
    for(const state of ['normal','hover','focus','pressed']){
     await page.mouse.move(1,1);await page.locator('#email').focus();
     if(state==='hover'||state==='pressed')await b.hover();
     if(state==='focus')await b.focus();
     if(state==='pressed')await page.mouse.down();
     await page.waitForTimeout(170);
     await contrast(b,theme+'/'+variant+'/'+state);
     if(state==='pressed')await page.mouse.up();
    }
   }
   const primary=await page.locator('[data-demo="主操作"]').evaluate(e=>getComputedStyle(e).backgroundColor);
   const disabled=await contrast(page.getByRole('button',{name:'不可用',exact:true}),theme+'/disabled');
   assert.notEqual(primary,disabled.background);
   for(const [selector,name,pseudo] of [['.task:has(input:checked) strong','selected title'],['.task:has(input:checked) small','selected helper'],['#email','input'],['#search','placeholder','::placeholder']])await contrast(page.locator(selector),theme+'/'+name,pseudo);
   const submit=page.locator('#submit');await submit.click();assert.ok(await submit.isDisabled());assert.equal(await submit.getAttribute('aria-busy'),'true');
   await contrast(submit,theme+'/busy');
   await page.getByRole('button',{name:'重试',exact:true}).waitFor();
   assert.equal(await page.locator('#email').inputValue(),'preview@example.com');
   await submit.click();await page.getByRole('button',{name:'重新演示',exact:true}).waitFor();
   assert.equal(await submit.getAttribute('aria-busy'),null);
  }
  for(const theme of ['neutral','dark','neutral']){
   await page.selectOption('#theme',theme);
   await contrast(page.locator('[data-demo="主操作"]'),theme+'/immediate-theme-switch');
  }
  await page.getByRole('radio',{name:'选中状态 同一组选项只保留一个选中项 待检查'}).check();
  assert.equal(await page.locator('input[name=record]:checked').count(),1);
  await page.locator('#detail').click();assert.ok(await page.locator('dialog').isVisible());await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'detail');
  await page.locator('#search').fill('失败');assert.equal(await page.locator('.task:visible').count(),1);assert.ok(await page.locator('#detail').isDisabled());
  await page.locator('#search').fill('不存在');assert.ok(await page.locator('.empty').isVisible());
  await page.locator('#clear').click();assert.equal(await page.locator('.task:visible').count(),3);
  await page.locator('#empty-toggle').click();assert.ok(await page.locator('.empty').isVisible());await page.locator('#empty-toggle').click();
  await page.locator('[data-demo="次操作"]').click();assert.ok((await page.locator('#control-state').textContent()).includes('次操作'));
  if(evidence){
   fs.mkdirSync(evidence,{recursive:true});
   for(const theme of ['neutral','dark']){
    await page.selectOption('#theme',theme);await page.selectOption('#material','liquid');await page.mouse.move(1,1);await page.locator('#email').blur();
    await page.setViewportSize({width:1440,height:1080});await page.evaluate(()=>new Promise(resolve=>{scrollTo(0,0);requestAnimationFrame(()=>requestAnimationFrame(resolve))}));await page.screenshot({path:path.join(evidence,theme+'-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>{scrollTo(0,0);requestAnimationFrame(()=>requestAnimationFrame(resolve))}));await page.screenshot({path:path.join(evidence,theme+'-mobile.png'),fullPage:true});
   }
  }
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#detail').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
  assert.equal(await page.locator('.aside').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  const summary={layouts:layouts.length,computedTextContrasts:checks.length,minTextContrast:Math.min(...checks.map(x=>x.ratio)),pageIdentity:'pass',contentAndOverlay:'pass',selectionAndEmptyStates:'pass',submissionAndRecovery:'pass',dialogFocus:'pass',reducedPreferences:'pass',consoleErrors:errors,networkRequests:requests};
  if(evidence)fs.writeFileSync(path.join(evidence,'validation.json'),JSON.stringify({summary,layouts,checks},null,2));
  console.log(JSON.stringify(summary,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
