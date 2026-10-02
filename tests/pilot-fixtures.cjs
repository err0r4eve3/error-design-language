'use strict';
// Proves seeded defects and calibration sensitivity. Does not evaluate model outputs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {prepare} = require('../evals/prepare.cjs');
const {claimEvidence, writeArtifact, writeReport, launchForEvidence, failureStatus, exitCode} = require('./support/qa-runtime.cjs');
const {parseSRGB, contrastRatio} = require('./color.cjs');
const root = path.resolve(__dirname, '..');
const ids = ['fix-hover-only','peer-same-style','copy-dev-brief-leak','payment-unknown','build-dense-console','backend-negative'];
function inlineWorkspace(workspace) {
  const read = name => {
    assert.equal(path.basename(name),name,'External or nested fixture resource');
    return fs.readFileSync(path.join(workspace,name),'utf8');
  };
  return read('index.html')
    .replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,name)=>`<style>${read(name)}</style>`)
    .replace(/<script src="([^"]+)"><\/script>/g,(_,name)=>`<script>${read(name)}</script>`);
}
async function peerMetrics(page) {
  return page.locator('.plan').evaluateAll(plans => plans.map(plan => {
    const title=plan.querySelector('h2').getBoundingClientRect(),price=plan.querySelector('.price').getBoundingClientRect(),style=getComputedStyle(plan);
    return {gap:price.top-title.bottom,background:style.backgroundColor,borderRadius:style.borderRadius,
      title:plan.querySelector('h2').textContent,price:plan.querySelector('.price').textContent,
      period:plan.querySelector('.period').textContent,limits:[...plan.querySelectorAll('.limits li')].map(el=>el.textContent)};
  }));
}
function assertSeedPeer(metrics) {
  assert.equal(metrics.length,3);
  assert.ok(metrics.every(item=>Math.abs(item.gap)<=1),'Seed title/price crowding is no longer present');
  assert.equal(new Set(metrics.map(item=>item.background)).size,1);
  assert.equal(new Set(metrics.map(item=>item.borderRadius)).size,1);
  assert.ok(metrics.every(item=>item.period.includes('CNY')&&item.limits.length===3));
}
async function buttonContrast(page) {
  const colors=await page.locator('#create').evaluate(el=>{const s=getComputedStyle(el);return [s.color,s.backgroundColor];});
  return contrastRatio(...colors.map(parseSRGB));
}
async function run() {
  let browser,out,temp;
  const report={status:'running',kind:'fixture-reproduction',model_status:'not_run',checks:[],conditions:[],
    limitations:['Seeded defects are intentionally retained in executor workspaces.','Calibration controls are not model outputs or accepted final designs.','No independent paired model evaluation or real-host negative routing was run.','All payment operations are in-memory simulations; external requests are blocked.']};
  const errors=[],unexpectedRequests=[];
  try {
    out=claimEvidence(process.env.DESIGN_QA_DIR,{roots:[root],temporaryPrefix:'edl-pilot-evidence-'});
    temp=fs.mkdtempSync(path.join(os.tmpdir(),'edl-pilot-browser-'));
    const bundle=path.join(temp,'bundle');prepare({sourceRoot:root,outDir:bundle,ids});
    browser=await launchForEvidence(out,'pilot-fixtures.json');report.node=process.version;report.browser=browser.version();
    async function open(id,{width=1440,theme='light',scenario='timeout-after-commit'}={}) {
      const page=await browser.newPage({viewport:{width,height:960},acceptDownloads:true});page.setDefaultTimeout(5000);
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',e=>{if(['error','warning'].includes(e.type()))errors.push(e.text());});
      const url=`about:blank?case=${id}&scenario=${encodeURIComponent(scenario)}`;
      const html=inlineWorkspace(path.join(bundle,'workspaces',id));
      await page.route(/^https?:/,route=>{unexpectedRequests.push(route.request().url());return route.abort();});
      await page.goto(url);await page.setContent(html);await page.locator('html').evaluate((el,value)=>el.dataset.theme=value,theme);
      assert.equal(page.url(),url);assert.ok((await page.title()).length>0);
      assert.equal(await page.locator('h1').count(),1);assert.ok((await page.locator('main').innerText()).length>20);
      assert.equal(await page.locator('nextjs-portal, vite-error-overlay, #webpack-dev-server-client-overlay').count(),0);
      return page;
    }
    const check=async(name,fn)=>{await fn();report.checks.push(name);};
    const screenshot=async(page,name)=>writeArtifact(out,name,await page.screenshot({fullPage:true}));
    await check('prepared fixtures and reviewer records retain separate execution status',async()=>{
      for(const id of ids) { const r=JSON.parse(fs.readFileSync(path.join(bundle,`review/${id}.json`),'utf8'));assert.equal(r.fixture_status,'prepared');assert.equal(r.status,'not_run'); }
    });
    await check('peer seed crowding reproduces at 1440/390/320px in both themes',async()=>{
      for(const theme of ['light','dark']) for(const width of [1440,390,320]) {
        const page=await open('peer-same-style',{width,theme}),metrics=await peerMetrics(page);assertSeedPeer(metrics);
        report.conditions.push({case_id:'peer-same-style',theme,width,metrics});
        await screenshot(page,`peer-seed-${theme}-${width}.png`);await page.close();
      }
    });
    await check('peer calibration changes spacing without requiring different surfaces or fabricated rankings',async()=>{
      const page=await open('peer-same-style'),before=await peerMetrics(page);
      await page.addStyleTag({content:'.plans{gap:24px}.plan{padding:20px}.plan h2{margin-bottom:16px}'});
      const after=await peerMetrics(page);assert.throws(()=>assertSeedPeer(after),/crowding/);
      assert.ok(after.every(item=>item.gap>=16));assert.deepEqual(after.map(({gap,...rest})=>rest),before.map(({gap,...rest})=>rest));
      await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
      await screenshot(page,'peer-spacing-calibration.png');await page.close();
    });
    await check('hover seed fails only on dark primary hover; corrected selector restores contrast and neighboring actions',async()=>{
      for(const theme of ['light','dark']) {
        const page=await open('fix-hover-only',{theme});await page.mouse.move(0,0);assert.ok(await buttonContrast(page)>=4.5);
        await page.locator('#create').hover();const seeded=await buttonContrast(page);
        if(theme==='dark')assert.ok(seeded<1.2);else assert.ok(seeded>=4.5);
        await screenshot(page,`hover-seed-${theme}.png`);
        await page.addStyleTag({content:'.button--primary:hover{color:var(--on-primary)}'});
        assert.ok(await buttonContrast(page)>=4.5);
        await page.locator('#selection').click();assert.equal(await page.locator('#selection').getAttribute('aria-pressed'),'true');
        await page.locator('#create').focus();await page.keyboard.press('Enter');assert.match(await page.locator('#message').innerText(),/已新建/);
        const focus=await page.locator('#create').evaluate(el=>getComputedStyle(el).outlineStyle);assert.notEqual(focus,'none');
        report.conditions.push({case_id:'fix-hover-only',theme,seed_hover_contrast:seeded});await page.close();
      }
    });
    await check('payment timeout displays false failure while committed ledger has one charge; retry duplicates it',async()=>{
      const page=await open('payment-unknown',{width:390});await page.locator('#pay').click();
      await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('付款失败'));
      const first=await page.evaluate(()=>paymentService.inspect());assert.equal(first.payments.length,1);assert.equal(first.orders[0].status,'paid');
      assert.equal(await page.locator('#pay').innerText(),'重新付款');await screenshot(page,'payment-timeout-seed.png');
      await page.locator('#pay').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('付款失败'));
      const second=await page.evaluate(()=>paymentService.inspect());assert.equal(second.payments.length,2);
      assert.ok(second.payments.every(p=>p.orderId==='ORD-DEMO-001'&&p.amountMinor===5900&&p.currency==='CNY'));
      report.conditions.push({case_id:'payment-unknown',first,after_retry:second});await page.close();
    });
    await check('payment recovery calibration queries original order without submitting a second payment',async()=>{
      const page=await open('payment-unknown',{width:390});await page.locator('#pay').click();
      await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('付款失败'));
      await page.evaluate(()=>{
        const old=document.querySelector('#pay'),button=old.cloneNode(true);old.replaceWith(button);button.textContent='查询原订单';
        document.querySelector('#status').textContent='付款结果尚未确认。';
        button.addEventListener('click',async()=>{
          const result=await paymentService.query(document.querySelector('#order-id').textContent);
          document.querySelector('#status').textContent=result.status==='paid'?'已确认付款成功。':'付款结果尚未确认。';
        });
      });
      await page.locator('#pay').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='已确认付款成功。');
      const state=await page.evaluate(()=>paymentService.inspect());assert.equal(state.payments.length,1);
      assert.deepEqual(state.events.map(e=>e.type),['submit','query']);assert.equal(state.events[1].orderId,'ORD-DEMO-001');
      await screenshot(page,'payment-query-calibration.png');await page.close();
    });
    await check('payment pending and unavailable queries remain distinct from confirmed failure in the service',async()=>{
      for(const scenario of ['timeout-before-commit','query-unavailable','declined','success']) {
        const page=await open('payment-unknown',{scenario});await page.locator('#pay').click();
        await page.waitForFunction(()=>!document.querySelector('#status').textContent.includes('正在'));
        const before=await page.evaluate(()=>paymentService.inspect());
        const queried=await page.evaluate(async()=>{try{return await paymentService.query('ORD-DEMO-001');}catch(e){return {error:e.code};}});
        assert.equal((await page.evaluate(()=>paymentService.inspect())).payments.length,before.payments.length);
        assert.equal(queried.status||queried.error,({'timeout-before-commit':'pending','query-unavailable':'QUERY_UNAVAILABLE',declined:'failed',success:'paid'})[scenario]);
        report.conditions.push({case_id:'payment-unknown',scenario,query:queried,payment_count:before.payments.length});await page.close();
      }
    });
    await check('copy leak exists beyond subtitle while search, filtering and CSV are functional',async()=>{
      const page=await open('copy-dev-brief-leak',{width:390});
      for(const selector of ['#intro','footer'])assert.match(await page.locator(selector).innerText(),/搜索.*筛选.*导出/);
      assert.match(await page.locator('#export').getAttribute('title'),/搜索.*筛选/);
      assert.match(await page.locator('#export').getAttribute('aria-label'),/搜索筛选/);
      await page.locator('#search').fill('tokyo-02');assert.equal(await page.locator('#rows tr').count(),1);
      await page.locator('#search').fill('');await page.locator('#region').selectOption('东京');assert.equal(await page.locator('#rows tr').count(),2);
      const downloaded=page.waitForEvent('download');await page.locator('#export').click();const download=await downloaded;
      const csv=fs.readFileSync(await download.path(),'utf8');assert.match(csv,/tokyo-01/);assert.match(csv,/tokyo-02/);assert.doesNotMatch(csv,/hongkong/);
      writeArtifact(out,'copy-filtered.csv',csv);await screenshot(page,'copy-leak-seed.png');await page.close();
    });
    await check('all rendered documents have healthy console and zero external requests',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(unexpectedRequests,[]);});
    report.status='passed';
  } catch(error) {report.status=failureStatus(error);report.error=error.stack;process.exitCode=exitCode(error);}
  finally {
    if(browser)await browser.close();if(temp)fs.rmSync(temp,{recursive:true,force:true});
    if(out)writeReport(out,'pilot-fixtures.json',report);console.log(JSON.stringify(report,null,2));
  }
}
module.exports={inlineWorkspace,peerMetrics,assertSeedPeer};
if(require.main===module)run();
