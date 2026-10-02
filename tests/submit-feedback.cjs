/* Optional real-sample regression. Inline DOM and controlled time, not a backend test. */
'use strict';
const {claimEvidence, writeReport, launchForEvidence, failureStatus, exitCode, inlineStyles} = require('./support/qa-runtime.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseSRGB, composite, contrastRatio} = require('./color.cjs');
const root = path.resolve(__dirname, '..');
function inlineFixture(assets) {
  return inlineStyles(assets, 'preview.html', ['tokens.css', 'components.css', 'preview.css']);
}
function claimOutput(value) {
  return claimEvidence(value, {roots: [root, path.resolve(process.env.DESIGN_PREVIEW_DIR || path.join(root, 'assets'))]});
}
async function main() {
  const out = claimOutput(process.env.DESIGN_QA_DIR); // Before loading a browser or writing reports.
  const html = inlineFixture(path.resolve(process.env.DESIGN_PREVIEW_DIR || path.join(root, 'assets')));
  assert.ok(!(process.env.CHROME_CHANNEL && process.env.CHROME_EXECUTABLE_PATH), 'choose channel OR executable');
  const browser = await launchForEvidence(out, 'submit-feedback.json');
  const result = {mode:'inline',browser:browser.version(),checks:[],layouts:[],contrasts:[],errors:[],requests:[],
    limitations:['Real sample, simulated completion clock. No server or network request.',
      'No native IME, Safari/Firefox, physical device, screen-reader speech, or model-behavior evaluation.']};
  const save = () => { if (out) writeReport(out, 'submit-feedback.json', result); };
  async function pageFor(source=html, width=1000) {
    const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    page.on('pageerror', e=>result.errors.push(String(e)));
    page.on('console', m=>{if(m.type()==='error')result.errors.push(m.text());});
    page.on('request', req=>{if(/^https?:/.test(req.url()))result.requests.push(req.url());});
    await page.clock.install({time:new Date('2026-10-02T00:00:00Z')});
    await page.clock.pauseAt(new Date('2026-10-02T00:00:01Z'));
    await page.setContent(source);
    return page;
  }
  const value = page=>page.locator('#email').inputValue();
  const target = page=>page.locator('#submitted-email').textContent();
  const finish = page=>page.clock.runFor(500);
  async function start(page, email='submitted@example.test') {
    await page.locator('#email').fill(email); await page.locator('#submit').click();
  }
  async function changedDuring(page) {
    await start(page); await page.locator('#email').fill('new-draft@example.test'); await finish(page);
    assert.equal(await value(page),'new-draft@example.test','new draft must survive completion');
    assert.equal(await target(page),'submitted@example.test','result must retain submitted identity');
    assert.match(await page.locator('#draft-note').textContent(),/尚未提交/,'changed draft must be disclosed');
    assert.equal(await page.locator('#submit').textContent(),'提交当前输入','new draft is not a retry');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'email','completion must not steal focus');
  }
  async function duplicate(page) {
    await start(page);
    await page.locator('#demo-form').evaluate(form=>{for(let i=0;i<3;i++)form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
    await finish(page);
    assert.equal(await page.locator('#submit').textContent(),'重试','duplicate submit must not advance attempt');
  }
  async function check(name, run) {
    const page=await pageFor();try{await run(page);result.checks.push(name);}finally{await page.close();}
  }
  try {
    await check('identity-native-validation',async page=>{
      assert.equal(await page.title(),'设计语言');assert.equal(await page.url(),'about:blank');
      assert.equal(await page.locator('#form-title').textContent(),'错误恢复');
      for(const email of ['', 'not-an-email']) {
        await page.locator('#email').fill(email);await page.locator('#submit').click();await finish(page);
        assert.equal(await page.locator('#feedback').textContent(),'');assert.ok(await page.locator('#submit').isEnabled());
        assert.equal(await page.evaluate(()=>document.activeElement.id),'email');
      }
      await start(page);await finish(page);assert.equal(await page.locator('#submit').textContent(),'重试');
    });
    await check('failure-and-same-value-retry',async page=>{
      await start(page);assert.ok(await page.locator('#submit').isDisabled());assert.equal(await target(page),'submitted@example.test');
      assert.ok(await page.locator('#email').isEditable());await finish(page);
      assert.equal(await page.locator('#submit').textContent(),'重试');
      assert.equal(await page.locator('#email').getAttribute('aria-invalid'),null);
      assert.ok(await page.locator('#email').evaluate(el=>el.validity.valid));
      await page.locator('#submit').click();await finish(page);
      assert.match(await page.locator('#feedback').textContent(),/模拟处理成功/);assert.equal(await page.locator('#submit').textContent(),'重新演示');
      assert.equal(await page.locator('#submit').getAttribute('aria-busy'),null);
    });
    await check('failure-retains-submitted-identity-and-new-draft',changedDuring);
    await check('success-retains-submitted-identity-and-new-draft',async page=>{
      await start(page);await finish(page);await changedDuring(page);
      assert.match(await page.locator('#feedback').textContent(),/模拟处理成功/);
      await page.locator('#submit').click();assert.equal(await target(page),'new-draft@example.test');await finish(page);
      assert.equal(await page.locator('#submit').textContent(),'重试');
    });
    await check('edit-after-completion-and-return-to-identical-value',async page=>{
      await start(page);await finish(page);const feedback=await page.locator('#feedback').innerHTML();
      await page.locator('#email').fill('different@example.test');assert.equal(await page.locator('#submit').textContent(),'提交当前输入');
      await page.locator('#email').fill('submitted@example.test');assert.equal(await page.locator('#submit').textContent(),'重试');
      assert.equal(await page.locator('#draft-note').textContent(),'');assert.equal(await page.locator('#feedback').innerHTML(),feedback);
    });
    await check('duplicate-activation',duplicate);
    await check('feedback-not-rewritten-per-keystroke',async page=>{
      await start(page);await page.evaluate(()=>{
        window.feedbackMutations=0;window.feedbackObserver=new MutationObserver(m=>window.feedbackMutations+=m.length);
        window.feedbackObserver.observe(document.querySelector('#feedback'),{childList:true,subtree:true,characterData:true});
      });
      await page.locator('#email').fill('a@example.test');await page.locator('#email').fill('b@example.test');
      assert.equal(await page.evaluate(()=>window.feedbackMutations),0);await finish(page);
      assert.equal(await page.locator('#feedback').getAttribute('aria-atomic'),'true');
      assert.equal(await page.locator('#email').getAttribute('aria-describedby'),'email-help draft-note');
    });
    await check('unrelated-controls-remain-usable',async page=>{
      await start(page);await page.selectOption('#theme','dark');await page.selectOption('#material','solid');
      await page.locator('input[name=record]').nth(1).check();await finish(page);
      assert.equal(await page.locator('input[name=record]:checked').inputValue(),'选中状态');
      assert.equal(await page.evaluate(()=>document.body.dataset.theme),'dark');
    });
    for (const theme of ['neutral','dark']) for(const width of [320,390,768,1440]) {
      const page=await pageFor(html,width);
      try {
        await page.selectOption('#theme',theme);await page.selectOption('#material','solid');
        const long="o'hara&"+'a'.repeat(40)+'@'+'b'.repeat(52)+'.example.test';
        await start(page,long);await page.locator('#email').fill('new-draft@example.test');await finish(page);
        assert.equal(await target(page),long);assert.equal(await page.locator('#submitted-email *').count(),0);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page must not overflow');
        const size=await page.locator('#feedback').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(size.scroll<=size.client+1,'feedback must wrap');
        for(const selector of ['#feedback','#submitted-email','#draft-note']) {
          const colors=await page.locator(selector).evaluate(el=>({fg:getComputedStyle(el).color,bgs:[el,...function*(p){while(p){yield p;p=p.parentElement;}}(el.parentElement)].map(n=>getComputedStyle(n).backgroundColor).reverse()}));
          const bg=colors.bgs.reduce((b,c)=>composite(parseSRGB(c),b),[255,255,255,1]);
          const ratio=contrastRatio(composite(parseSRGB(colors.fg),bg),bg);assert.ok(ratio>=4.5,selector+' contrast');result.contrasts.push({theme,width,selector,ratio});
        }
        if(out && [390,1440].includes(width))await page.locator('.form-section').screenshot({path:path.join(out,`${theme}-${width}-form.png`)});
        result.layouts.push({theme,width});
      } finally {await page.close();}
    }
    result.checks.push('long-input-safe-text-and-eight-responsive-states');
    const mutations = [
      ['wrong-completion-identity', html.replace('snapshot, submissionPhase);','email.value, submissionPhase);'),changedDuring,/result must retain submitted identity/],
      ['overwrite-new-draft',html.replace('// New edits survive both outcomes;', 'email.value = snapshot; // New edits survive both outcomes;'),changedDuring,/new draft must survive completion/],
      ['hide-draft-difference',html.replace('const changed = submittedEmail !== null && email.value !== submittedEmail;', 'const changed = false;'),changedDuring,/changed draft must be disclosed/],
      ['remove-duplicate-guard',html.replace('if (pending || !form.reportValidity()) return;', 'if (!form.reportValidity()) return;'),duplicate,/duplicate submit must not advance attempt/]
    ];
    for(const [name,source,probe,message] of mutations) {
      assert.notEqual(source,html,'mutation must change source');const page=await pageFor(source);
      try {await assert.rejects(()=>probe(page),error=>error.code==='ERR_ASSERTION' && message.test(error.message));result.checks.push('negative/'+name);}finally{await page.close();}
    }
    assert.deepEqual(result.errors,[]);assert.deepEqual(result.requests,[]);result.status='pass';save();
    console.log(JSON.stringify({status:result.status,browser:result.browser,checks:result.checks.length,layouts:result.layouts.length,contrasts:result.contrasts.length},null,2));
  } catch(e) {result.status='fail';result.error=e.stack;save();throw e;} finally {await browser.close();}
}
module.exports={inlineFixture,claimOutput};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=exitCode(e);});
