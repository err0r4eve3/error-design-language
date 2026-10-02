/* Optional regression of the delivered native dialog. Not a framework or screen-reader test. */
'use strict';
const {claimEvidence, writeReport, launchForEvidence, failureStatus, exitCode, inlineStyles} = require('./support/qa-runtime.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function inlineFixture(assets) {
  return inlineStyles(assets, 'preview.html', ['tokens.css', 'components.css', 'preview.css']);
}
function claimOutput(value) {
  return claimEvidence(value, {roots: [root, path.resolve(process.env.DESIGN_PREVIEW_DIR || path.join(root, 'assets'))]});
}
// Wait for layout/input delivery, not an artificial network delay.
const frames = (page, n = 12) => page.evaluate(count => new Promise(resolve => {
  function next() { if (--count <= 0) resolve(); else requestAnimationFrame(next); }
  requestAnimationFrame(next);
}), n);
async function geometry(page) {
  return page.evaluate(() => {
    const d = document.querySelector('#dialog');
    const body = d.querySelector('.dialog-body') || d;
    const rect = e => { const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
    const close = document.querySelector('#close');
    const cr = close.getBoundingClientRect();
    return {dialog:rect(d), body:rect(body), title:rect(document.querySelector('#detail-title')),
      close:rect(close), meta:rect(document.querySelector('#detail-meta')),
      bodyTop:body.scrollTop, bodyHeight:body.scrollHeight, bodyClient:body.clientHeight,
      bodyWidth:body.scrollWidth, bodyClientWidth:body.clientWidth,
      closeHit:close.contains(document.elementFromPoint(cr.x+cr.width/2,cr.y+cr.height/2)),
      windowX:scrollX, windowY:scrollY, width:innerWidth, height:innerHeight, active:document.activeElement.id};
  });
}
function exitVisible(s) {
  assert.ok(s.closeHit && s.close.y >= 0 && s.close.bottom <= s.height, 'exit must remain visible and hit-testable');
}
function readingStart(s) {
  assert.equal(s.active, 'detail-title', 'reading focus must start at title');
  assert.ok(s.title.y >= s.dialog.y && s.title.bottom <= s.dialog.bottom, 'reading start must be visible');
  assert.equal(s.bodyTop, 0, 'reading start must not open at the end');
  exitVisible(s);
}
async function main() {
  const out = claimOutput(process.env.DESIGN_QA_DIR);
  const html = inlineFixture(path.resolve(process.env.DESIGN_PREVIEW_DIR || path.join(root, 'assets')));
  assert.ok(!(process.env.CHROME_CHANNEL && process.env.CHROME_EXECUTABLE_PATH), 'choose channel OR executable');
  const browser = await launchForEvidence(out, 'dialog-reading.json');
  const result = {mode:'inline',browser:browser.version(),checks:[],layouts:[],errors:[],requests:[],
    limitations:['Actual preview markup and script with explicitly injected long reading content.',
      'No real URL loading, server, native IME, software keyboard, zoom, Safari/Firefox, or screen-reader speech.',
      'Native dialog containment checked against page controls; browser chrome is outside this test.']};
  const save = () => { if (out) writeReport(out, 'dialog-reading.json', result); };
  const shot = (p,name) => out ? p.screenshot({path:path.join(out,name+'.png')}) : undefined;
  async function pageFor(width=1000,height=700,source=html) {
    const p = await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    p.on('pageerror', e=>result.errors.push(String(e)));
    p.on('console', m=>{ if(m.type()==='error') result.errors.push(m.text()); });
    p.on('request', r=>{if(/^https?:/.test(r.url()))result.requests.push(r.url());});
    await p.setContent(source);
    assert.equal(await p.title(),'设计语言','wrong fixture');
    assert.ok(await p.locator('#main').isVisible(),'blank fixture');
    return p;
  }
  async function content(p) {
    // Preserve the delivered open/close handlers. Inject authorable content before opening.
    await p.evaluate(() => {
      const before = document.querySelector('#detail-meta');
      for (let i=0;i<15;i++) {
        const para = document.createElement('p'); para.className = 'reading-fixture';
        para.textContent = `第${i+1}项记录：核对当前服务的状态、费用与有效期。读取失败只说明本次请求未完成，不表示服务已经停止。`;
        before.before(para);
      }
    });
  }
  async function open(p) { await p.locator('#detail').focus(); await p.keyboard.press('Enter'); await frames(p,2); }
  async function check(name,run) { await run(); result.checks.push(name); }
  try {
    await check('closed-native-dialog-and-short-content',async()=>{
      const p=await pageFor();
      assert.equal(await p.locator('#dialog').isVisible(),false,'closed native dialog must stay hidden');
      await open(p);const s=await geometry(p);readingStart(s);
      assert.ok(s.dialog.height<400,'short content must not be stretched to a full-height panel');
      assert.ok(s.bodyHeight<=s.bodyClient+1,'short content should not need scrolling');
      await p.locator('#close').click();assert.equal(await p.locator('#dialog').isVisible(),false);
      assert.equal(await p.evaluate(()=>document.activeElement.id),'detail');await p.close();
    });
    await check('long-content-two-themes-eight-viewports',async()=>{
      for(const theme of ['neutral','dark']) for(const [width,height] of [[320,240],[390,420],[768,320],[1440,500]]) {
        const p=await pageFor(width,height);await p.locator('#theme').selectOption(theme);await content(p);await open(p);
        const initial=await geometry(p);readingStart(initial);
        assert.ok(initial.dialog.y>=0 && initial.dialog.bottom<=height,'dialog must fit viewport');
        assert.ok(initial.bodyHeight>initial.bodyClient,'long content must have a scroll path');
        assert.ok(initial.bodyWidth<=initial.bodyClientWidth+1,'prose must not force horizontal scrolling');
        for(const fraction of [0.5,1]) {
          await p.locator('.dialog-body').evaluate((e,f)=>{e.scrollTop=f*e.scrollHeight;},fraction);
          const s=await geometry(p);exitVisible(s);
          assert.ok(Math.abs(s.close.y-initial.close.y)<1,'reading scroll must not move exit control');
          assert.equal(s.windowY,initial.windowY,'reading scroll must not move background');
          if(fraction===1) assert.ok(s.meta.bottom<=s.body.bottom+1 && s.meta.bottom<=s.close.y,'reading end must not be covered');
        }
        await p.locator('.dialog-body').evaluate(e=>{e.scrollTop=0;});
        if((theme==='neutral'&&width===390)||(theme==='dark'&&width===1440))await shot(p,`${theme}-${width}-reading`);
        result.layouts.push({theme,width,height,initial});await p.close();
      }
    });
    await check('keyboard-local-scroll-and-escape-return',async()=>{
      const p=await pageFor(390,420);await content(p);await open(p);const before=await geometry(p);
      await p.keyboard.press('PageDown');await frames(p);const after=await geometry(p);
      assert.ok(after.bodyTop>before.bodyTop,'keyboard must scroll reading content');
      assert.equal(after.windowY,before.windowY,'keyboard reading must not move background');exitVisible(after);
      await p.keyboard.press('Escape');assert.equal(await p.locator('#dialog').isVisible(),false);
      assert.equal(await p.evaluate(()=>document.activeElement.id),'detail');await p.close();
    });
    await check('native-background-inertness-and-tab-order',async()=>{
      const p=await pageFor();await open(p);
      await p.locator('#email').evaluate(e=>e.focus());
      assert.notEqual(await p.evaluate(()=>document.activeElement.id),'email','background must not receive focus');
      await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'close');
      for(let i=0;i<4;i++) {
        await p.keyboard.press(i%2?'Shift+Tab':'Tab');
        assert.ok(await p.locator('#dialog').evaluate(d=>d.contains(document.activeElement)||document.activeElement===document.body), 'Tab must not reach page controls');
      }
      await p.locator('#close').click();assert.equal(await p.evaluate(()=>document.activeElement.id),'detail');await p.close();
    });
    await check('reopen-and-short-landscape-resize',async()=>{
      const p=await pageFor(390,800);await content(p);await open(p);
      await p.locator('.dialog-body').evaluate(e=>{e.scrollTop=e.scrollHeight;});
      await p.locator('#close').click();await open(p);readingStart(await geometry(p));
      await p.setViewportSize({width:640,height:240});await frames(p,2);const s=await geometry(p);
      exitVisible(s);assert.ok(s.bodyClient>60,'short viewport must retain usable reading space');
      await p.keyboard.press('Escape');await p.close();
    });
    await check('long-token-large-text-and-forced-colors',async()=>{
      const p=await pageFor(320,360);await content(p);
      await p.addStyleTag({content:'#detail-title{font-size:32px} .dialog-body p{font-size:24px;letter-spacing:.12em}'});
      await p.locator('#detail-meta').evaluate(e=>{e.textContent='resource-'+ 'longidentifier'.repeat(30);});
      await open(p);const s=await geometry(p);exitVisible(s);
      assert.ok(s.bodyWidth<=s.bodyClientWidth+1,'long token must remain readable without horizontal clipping');
      await p.emulateMedia({forcedColors:'active'});exitVisible(await geometry(p));
      await p.locator('#close').focus();
      assert.ok(await p.locator('#close').evaluate(e=>parseFloat(getComputedStyle(e).outlineWidth)>=2),'close focus must stay visible');
      await p.close();
    });
    // Mutation passes only for the designated assertion, not browser errors/timeouts.
    async function rejects(name,mutate,probe,message) {
      const p=await pageFor(390,420,mutate(html));await content(p);
      try { await assert.rejects(()=>probe(p),e=>e.code==='ERR_ASSERTION'&&message.test(e.message)); }
      finally { await p.close(); }
      result.checks.push(name);
    }
    await rejects('negative-autofocus-removal',s=>s.replace('tabindex="-1" autofocus','tabindex="-1"'),async p=>{await open(p);readingStart(await geometry(p));},/reading focus must start/);
    await rejects('negative-exit-inside-reading-scroll',s=>s.replace('  </div>\n  <div class="dialog-footer">','  <div class="dialog-footer">').replace('</button></div>\n</dialog>','</button></div>\n  </div>\n</dialog>'),async p=>{await open(p);exitVisible(await geometry(p));},/exit must remain/);
    await rejects('negative-scroll-path-removal',s=>s.replace('</head>','<style>dialog .dialog-body{overflow:hidden!important}</style></head>'),async p=>{await open(p);const a=await geometry(p);await p.keyboard.press('PageDown');await frames(p);const b=await geometry(p);assert.ok(b.bodyTop>a.bodyTop,'keyboard must scroll reading content');},/keyboard must scroll/);
    await rejects('negative-closed-display-override',s=>s.replace('</head>','<style>dialog{display:flex!important}</style></head>'),async p=>{assert.equal(await p.locator('#dialog').isVisible(),false,'closed native dialog must stay hidden');},/closed native dialog must stay hidden/);
    assert.deepEqual(result.errors,[],'page errors');assert.deepEqual(result.requests,[],'unexpected external requests');
    result.passed=true;save();console.log(JSON.stringify(result,null,2));
  } catch(e) {result.passed=false;result.failure=String(e);save();throw e;}
  finally {await browser.close();}
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=exitCode(e);});
module.exports={inlineFixture,claimOutput};
