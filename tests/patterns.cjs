/* Local collection fixture QA. Not a model evaluation or a production test. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {parseSRGB, composite, contrastRatio} = require('./color.cjs');
const root = path.resolve(__dirname, '..');
const assets = path.join(root,'assets');
const mode = process.env.DESIGN_QA_MODE || 'file';
let out;
const result = {mode, checks:[], layouts:[], contrast:[], limitations:[
  'Local fixture only; no real service, backend, model, or screen-reader evaluation.',
  'Composition events and media preferences are synthetic; no physical-device or real browser zoom test.',
  'Geometry and copy guards protect this fixture, not general visual quality.'
]};
function inline() {
  return fs.readFileSync(path.join(assets,'patterns.html'),'utf8').replace(/<link\b[^>]*>/g, tag => {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    assert.ok(['tokens.css','components.css','patterns.css'].includes(href));
    return `<style>${fs.readFileSync(path.join(assets,href),'utf8')}</style>`;
  });
}
const save = () => { if(out) fs.writeFileSync(path.join(out,'patterns-validation.json'),JSON.stringify(result,null,2)); };
async function noOverflow(page) {
  const s = await page.evaluate(() => ({width:innerWidth,root:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert.ok(s.root <= s.width && s.body <= s.width,JSON.stringify(s));
}
async function reach(page, selector) {
  await page.locator('#theme').focus();
  for (let i=0;i<60;i++) {
    await page.keyboard.press('Tab');
    if (await page.locator(selector).evaluate(el => el === document.activeElement)) {
      assert.ok(await page.locator(selector).evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineStyle !== 'none'));
      return;
    }
  }
  throw Error('Not keyboard reachable: '+selector);
}
async function sampleContrast(page, selector, theme) {
  const sample = await page.locator(selector).first().evaluate(el => {
    const colors=[];
    for(let p=el;p;p=p.parentElement) {
      const s=getComputedStyle(p);
      if(s.backgroundImage!=='none' || Number(s.opacity)!==1) throw Error('Unsupported background/opacity');
      colors.push(s.backgroundColor);
    }
    return {fg:getComputedStyle(el).color,colors};
  });
  let bg=[0,0,0,0];
  for(const color of sample.colors.reverse()) bg=composite(parseSRGB(color),bg);
  assert.equal(bg[3],1);
  const ratio=contrastRatio(composite(parseSRGB(sample.fg),bg),bg);
  assert.ok(ratio>=4.5,`${theme} ${selector}: ${ratio}`);
  result.contrast.push({theme,selector,ratio});
}
async function peerLayout(page) {
  const s=await page.evaluate(() => {
    const a=document.querySelector('.dl-panel').getBoundingClientRect();
    const b=document.querySelector('#inspector').getBoundingClientRect();
    return {desktop:innerWidth>=1180,gap:b.left-a.right,dy:b.top-a.top,below:b.top-a.bottom};
  });
  if(s.desktop) { assert.ok(s.gap>=20 && s.gap<=32,JSON.stringify(s));assert.ok(Math.abs(s.dy)<2); }
  else assert.ok(s.below>=20,JSON.stringify(s));
}
(async()=>{
  assert.ok(['file','inline'].includes(mode));
  assert.ok(!(process.env.CHROME_CHANNEL && process.env.CHROME_EXECUTABLE_PATH));
  if(process.env.DESIGN_QA_DIR) {
    const requested=path.resolve(process.env.DESIGN_QA_DIR);
    const target=path.join(fs.realpathSync(path.dirname(requested)),path.basename(requested));
    const source=fs.realpathSync(root);
    assert.ok(target!==source && !target.startsWith(source+path.sep),'Evidence must be outside source');
    assert.ok(!fs.existsSync(target),'Use a fresh evidence directory');
    fs.mkdirSync(target,{mode:0o700});
    out=target; // Failed validation must never write an error report into a rejected path.
  }
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({headless:true,
    ...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{}),
    ...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})});
  result.browser=browser.version();
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  page.setDefaultTimeout(5000);
  const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(['warning','error'].includes(e.type())) errors.push(e.text());});
  page.on('request',r=>{if(/^https?:/.test(r.url())) external.push(r.url());});
  const load=async()=>{
    if(mode==='inline') await page.setContent(inline());
    else await page.goto(pathToFileURL(path.join(assets,'patterns.html')).href);
  };
  const reset=async()=>{await page.locator('#query').fill('');await page.selectOption('#status','all');};
  const ids=()=>page.locator('#records tr').evaluateAll(rows=>rows.map(r=>r.dataset.id));
  const row=(id)=>page.locator(`[data-id="${id}"]`);
  const check=async(name,fn)=>{await fn();result.checks.push(name);};
  try {
    await load();
    if(mode==='inline') result.limitations.push('setContent: URL navigation and actual stylesheet loading unverified.');
    await check('identity-native-table-and-clean-copy',async()=>{
      assert.equal(page.url(),mode==='inline'?'about:blank':pathToFileURL(path.join(assets,'patterns.html')).href);
      assert.equal(await page.title(),'服务清单');
      assert.equal(await page.locator('h1').textContent(),'服务清单');
      assert.equal(await page.locator('thead th[scope="col"]').count(),5);
      assert.equal(await page.locator('tbody th[scope="row"]').count(),4);
      assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);
      assert.ok(await page.locator('#inspector').isHidden());
      assert.ok(await page.locator('#selection-bar').isHidden());
      const copy=await page.locator('main').innerText();
      assert.ok(!/按原始数值排序|窄屏可横向滚动比较|筛选决定出现哪些|状态用文字表达|功能验收|响应式控制台/.test(copy));
    });
    for(const theme of ['neutral','dark']) {
      await page.selectOption('#theme',theme);
      for(const width of [320,390,768,1024,1440]) {
        await page.setViewportSize({width,height:1000});await noOverflow(page);
        await row('demo-02').locator('[data-detail]').click();await noOverflow(page);await peerLayout(page);
        result.layouts.push({theme,width,inspector:'open'});
        await page.locator('#close-detail').click();await noOverflow(page);
        result.layouts.push({theme,width,inspector:'closed'});
      }
    }
    await check('numeric-sort-selection-and-inspection-are-independent',async()=>{
      assert.deepEqual(await ids(),['demo-01','demo-02','demo-03','demo-04']);
      await row('demo-01').locator('input').check();
      assert.ok(await page.locator('#select-visible').evaluate(el=>el.indeterminate));
      await row('demo-02').locator('[data-detail]').click();
      assert.equal(await page.locator('#record-id').textContent(),'demo-02');
      assert.ok(await row('demo-01').locator('input').isChecked());
      assert.ok(!(await row('demo-02').locator('input').isChecked()));
      assert.equal(await page.locator('dialog[open],[aria-modal="true"],main[inert]').count(),0);
      await page.locator('#sort-price').click();
      assert.deepEqual(await ids(),['demo-03','demo-02','demo-01','demo-04']);
      assert.equal(await page.locator('#price-heading').getAttribute('aria-sort'),'descending');
      assert.equal(await page.locator('#record-id').textContent(),'demo-02');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'sort-price');
      await page.locator('#next-record').click();assert.equal(await page.locator('#record-id').textContent(),'demo-01');
      assert.ok(await row('demo-01').locator('input').isChecked());
      await page.keyboard.press('Escape');
      assert.ok(await row('demo-01').locator('[data-detail]').evaluate(el=>el===document.activeElement));
      await page.locator('#sort-price').click();
      assert.deepEqual(await ids(),['demo-01','demo-02','demo-03','demo-04']);
    });
    await check('scope-selection-summary-includes-coverage',async()=>{
      await row('demo-04').locator('input').check();
      assert.equal(await page.locator('#selection-total').textContent(),'已知月费合计 2.00 USD · 1/2 项有价格');
      await page.locator('#select-visible').check();
      assert.equal(await page.locator('#selection-total').textContent(),'已知月费合计 134.50 USD · 3/4 项有价格');
      await page.selectOption('#status','running');
      assert.equal(await page.locator('#records input:checked').count(),0);
      assert.ok(await page.locator('#selection-bar').isHidden());
      await page.locator('#select-visible').check();
      assert.equal(await page.locator('#selection-count').textContent(),'已选择 2 项');
      assert.equal(await page.locator('#selection-total').textContent(),'已知月费合计 122.00 USD · 2/2 项有价格');
      await page.locator('#clear-selection').click();
      assert.equal(await page.evaluate(()=>document.activeElement.id),'select-visible');
    });
    await check('filter-chips-remove-one-condition-not-all',async()=>{
      await page.locator('#query').fill('demo-01');
      assert.ok(await page.locator('#clear-query').isVisible());assert.ok(await page.locator('#clear-status').isVisible());
      await page.locator('#clear-query').click();assert.equal(await page.locator('#status').inputValue(),'running');
      assert.equal(await page.locator('#records tr:visible').count(),2);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'query');
      await page.locator('#query').fill('demo-01');await page.locator('#clear-status').click();
      assert.equal(await page.locator('#query').inputValue(),'demo-01');
      assert.equal(await page.locator('#records tr:visible').count(),1);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'status');
      await page.locator('#reset').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'query');
    });
    await check('inspector-tracks-filtered-identity-not-previous-object',async()=>{
      await row('demo-04').locator('[data-detail]').click();
      assert.equal(await page.locator('#record-price').textContent(),'未读取');
      assert.ok(await page.locator('#next-record').isDisabled());
      await page.locator('#query').fill('文档');
      assert.ok(await page.locator('#inspector').isHidden());
      assert.equal(await page.locator('#record-id').textContent(),'');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'query');
      await reset();
      assert.ok(await page.locator('#inspector').isHidden());
    });
    await check('composition-flag-lifecycle-and-cross-filter-guard',async()=>{
      await page.locator('#query').evaluate(el=>{el.value='not-a-record';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));});
      assert.equal(await page.locator('#records tr:visible').count(),4);
      await page.selectOption('#status','running');
      assert.equal(await page.locator('#records tr:visible').count(),2,'Status changes must not commit IME draft');
      await page.locator('#query').evaluate(el=>{el.value='文档';el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));});
      assert.equal(await page.locator('#records tr:visible').getAttribute('data-id'),'demo-01');
      await page.locator('#query').evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.value='计算';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:false}));});
      assert.equal(await page.locator('#records tr:visible').getAttribute('data-id'),'demo-01');
      await page.locator('#query').evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));
      assert.equal(await page.locator('#records tr:visible').getAttribute('data-id'),'demo-03');
      await page.locator('#select-visible').check();await page.locator('#query').dispatchEvent('input');
      assert.ok(await row('demo-03').locator('input').isChecked());await reset();
    });
    await check('filtered-empty-recovery-and-action-scope',async()=>{
      await page.locator('#query').fill('没有此服务');
      assert.ok(await page.locator('#empty').isVisible());assert.ok(await page.locator('#table-scroll').isHidden());
      assert.ok(await page.locator('#selection-bar').isHidden());
      assert.equal(await page.locator('#result-count').textContent(),'显示 0 / 4 项服务');
      await page.locator('#empty-reset').click();
      assert.equal(await page.locator('#records tr:visible').count(),4);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'query');
    });
    await check('real-csv-download-only-selected-and-unknown-not-zero',async()=>{
      await row('demo-01').locator('input').check();await row('demo-04').locator('input').check();
      const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-selected').click()]);
      assert.equal(await download.failure(),null);
      const chunks=[];for await (const chunk of await download.createReadStream()) chunks.push(chunk);
      const csv=Buffer.concat(chunks).toString('utf8');
      assert.ok(csv.includes('"demo-01"') && csv.includes('"demo-04"'));
      assert.ok(!csv.includes('"demo-02"') && !csv.includes('"demo-03"'));
      assert.ok(csv.includes('"demo-04","待核验记录","","状态待确认"'));
      if(out) fs.writeFileSync(path.join(out,'selected-services.csv'),csv);
      await page.evaluate(()=>{window.savedCreateObjectURL=URL.createObjectURL;URL.createObjectURL=()=>{throw Error('test denial');};});
      await page.locator('#export-selected').click();
      assert.ok((await page.locator('#action-feedback').textContent()).includes('导出未完成'));
      assert.equal(await page.locator('#records input:checked').count(),2);
      await page.evaluate(()=>{URL.createObjectURL=window.savedCreateObjectURL;delete window.savedCreateObjectURL;});
      await page.locator('#clear-selection').click();
    });
    await check('keyboard-inspector-and-local-scroll',async()=>{
      await reach(page,'[data-id="demo-01"] [data-detail]');await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'record-title');
      await page.keyboard.press('Escape');
      assert.ok(await row('demo-01').locator('[data-detail]').evaluate(el=>el===document.activeElement));
      await page.setViewportSize({width:320,height:844});await reach(page,'#table-scroll');
      const before=await page.locator('#table-scroll').evaluate(el=>el.scrollLeft);
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(before=>document.querySelector('#table-scroll').scrollLeft>before,before);
    });
    await check('text-spacing-and-long-content-at-320',async()=>{
      await row('demo-02').locator('[data-detail]').click();
      const css=await page.addStyleTag({content:'.dl-pattern-page :is(h1,h2,p,small,label,button,th,td,input,select,dt,dd){line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.dl-pattern-page p{margin-block-end:2em!important}'});
      await noOverflow(page);
      for(const s of ['#record-title','#record-price','#query','#close-detail']) assert.ok(await page.locator(s).evaluate(el=>el.scrollHeight<=el.clientHeight+1),s);
      await css.evaluate(el=>el.remove());
      await page.locator('#query').fill('超长搜索条件'.repeat(30));await noOverflow(page);
      await page.locator('#empty-reset').click();
    });
    await check('actual-foreground-background-pairs',async()=>{
      await page.setViewportSize({width:1440,height:1000});
      await row('demo-01').locator('input').check();await row('demo-04').locator('[data-detail]').click();
      for(const theme of ['neutral','dark']) {
        await page.selectOption('#theme',theme);
        for(const s of ['h1','#services-title','.dl-page-context','.dl-environment','#query','#status','.dl-collection-meta','#result-count','#selection-count','#selection-total','#export-selected','#sort-price','[data-id="demo-01"] th','[data-id="demo-02"] th','[data-id="demo-02"] small','[data-id="demo-04"] [data-detail]','#record-title','#record-state','#record-price','#record-note','#record-position']) await sampleContrast(page,s,theme);
      }
    });
    await check('inspected-row-hover-keeps-its-own-color-pair',async()=>{
      const button=row('demo-04').locator('[data-detail]');
      await button.hover();
      assert.equal(await button.getAttribute('aria-expanded'),'true');
      const pair=await button.evaluate(el=>{
        const actual=getComputedStyle(el);
        const probe=document.createElement('span');
        probe.style.background='var(--dl-primary-hover)';probe.style.color='var(--dl-on-primary)';
        el.append(probe);const expected=getComputedStyle(probe);
        const ok=actual.backgroundColor===expected.backgroundColor && actual.color===expected.color;
        probe.remove();return ok;
      });
      assert.ok(pair,'Generic hover must not erase inspected state');
      await sampleContrast(page,'[data-id="demo-04"] [data-detail]','dark-hover');
    });
    await check('forced-colors-and-reduced-motion-remain-usable',async()=>{
      await page.emulateMedia({forcedColors:'active'});await reach(page,'#sort-price');
      assert.ok(await page.locator('#sort-price').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=2));
      await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
      await page.locator('#sort-price').click();assert.equal(await page.locator('#price-heading').getAttribute('aria-sort'),'descending');
    });
    await check('negative-layout-and-focus-guards',async()=>{
      const flattened=await page.addStyleTag({content:'.dl-pattern-layout{gap:0!important}'});
      await assert.rejects(()=>peerLayout(page));await flattened.evaluate(el=>el.remove());
      const focus=await page.addStyleTag({content:'.dl-pattern-page :focus-visible{outline:none!important}'});
      await assert.rejects(()=>reach(page,'#sort-price'));await focus.evaluate(el=>el.remove());
    });
    await check('repeat-fixture-load-no-global-redeclarations',async()=>{
      await load();await page.locator('#sort-price').click();assert.equal(await page.locator('#price-heading').getAttribute('aria-sort'),'descending');
      await page.locator('#sort-price').click();
    });
    if(out) for(const theme of ['neutral','dark']) {
      await page.selectOption('#theme',theme);
      await row('demo-02').locator('[data-detail]').click();
      for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
        await page.setViewportSize({width,height});
        await page.evaluate(()=>{document.querySelector('#table-scroll').scrollLeft=0;document.activeElement.blur();scrollTo(0,0);});
        await page.screenshot({path:path.join(out,`patterns-${theme}-${name}.png`),fullPage:true});
      }
    }
    if(out) {
      await page.selectOption('#theme','neutral');await page.setViewportSize({width:1440,height:1000});
      await row('demo-01').locator('input').check();await row('demo-04').locator('input').check();await row('demo-04').locator('[data-detail]').click();
      await page.evaluate(()=>{document.activeElement.blur();scrollTo(0,0);});
      await page.screenshot({path:path.join(out,'patterns-selection-unknown.png'),fullPage:true});
    }
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    result.consoleErrors=errors;result.externalRequests=external;result.status='pass';save();
    console.log(JSON.stringify({status:result.status,browser:result.browser,mode,checks:result.checks.length,layouts:result.layouts.length,contrast:result.contrast.length},null,2));
  } catch(error) {
    result.status='fail';result.error=error.stack;save();
    if(out) await page.screenshot({path:path.join(out,'patterns-failure.png'),fullPage:true}).catch(()=>{});
    throw error;
  } finally { await browser.close(); }
})().catch(error=>{result.status='fail';result.error=error.stack;save();console.error(error);process.exitCode=1;});
