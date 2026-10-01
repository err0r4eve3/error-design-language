'use strict';
// Real choice markup in nested direction/width fixtures; no application locale migration.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function readSources(dir) {
  const read = file => fs.readFileSync(path.join(dir, file), 'utf8');
  const html = read('regions.html');
  const match = html.match(/<div class="dl-choices">([\s\S]*?)<\/div>/);
  assert.ok(match, 'Missing real choice group');
  assert.equal((match[1].match(/type="radio"/g) || []).length, 3, 'Unexpected choice fixture');
  return {css: ['tokens.css', 'components.css', 'regions.css'].map(read).join('\n'), fragment: match[1]};
}
function fixture(source, {theme = 'neutral', outer = 'ltr', inner = null, width = 260} = {}) {
  assert.ok(['neutral', 'dark'].includes(theme));
  assert.ok(['ltr', 'rtl'].includes(outer) && [null, 'ltr', 'rtl'].includes(inner));
  assert.ok(Number.isFinite(width) && width >= 180 && width <= 1000);
  return `<!doctype html><html lang="zh-CN" dir="${outer}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>选择卡 · 方向与容器</title><style>${source.css}
body{margin:0;padding:20px;background:var(--dl-canvas);color:var(--dl-text);font:16px/1.65 var(--dl-font)}
main{max-width:100%;width:${width}px}h1{margin:0 0 16px;font-size:20px;line-height:1.4}
fieldset{border:0;padding:0;margin:0;min-inline-size:0}legend{padding:0;margin-block-end:12px;font-size:14px}
</style></head><body data-design="error" data-theme="${theme}"><main><h1>资源配置</h1><fieldset${inner ? ` dir="${inner}"` : ''}><legend>本地组件参考 · 不创建实例</legend><div class="dl-choices">${source.fragment}</div></fieldset></main></body></html>`;
}
// Returns painted text rectangles, not just CSS property names or empty element boxes.
async function measure(page) {
  return page.evaluate(() => {
    const box = el => {const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const rangeBox = el => {const r=document.createRange();r.selectNodeContents(el);return box(r);};
    function glyphs(el) {
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const chars=[];
      while(walker.nextNode()) {
        const node=walker.currentNode;
        for(let i=0;i<node.length;i++) {
          const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+1);
          if(node.data[i].trim()) chars.push({char:node.data[i],...box(r)});
        }
      }
      return chars;
    }
    return {overflow:document.documentElement.scrollWidth>innerWidth+1, cards:[...document.querySelectorAll('.dl-choice')].map(el=>{
      const input=el.querySelector('input'),title=el.querySelector('.dl-choice-title'),note=el.querySelector('.dl-choice-note');
      const a=box(input),b=rangeBox(title),d=getComputedStyle(el).direction;
      return {direction:d,value:input.value,checked:input.checked,disabled:input.disabled,card:box(el),input:a,title:b,
        titleText:title.textContent,noteText:note.textContent,glyphs:glyphs(title),noteGlyphs:glyphs(note),
        gap:d==='rtl'?a.x-b.right:b.x-a.right};
    })};
  });
}
function assertLayout(m) {
  assert.equal(m.overflow,false,'Choice fixture overflow');
  assert.equal(m.cards.length,3);
  for(const c of m.cards) {
    assert.ok(c.gap>=8,`Choice text overlaps control: ${c.direction}/${c.value} gap=${c.gap}`);
    for(const r of [c.input,...c.glyphs,...c.noteGlyphs]) {
      assert.ok(r.x>=c.card.x-1 && r.right<=c.card.right+1 && r.y>=c.card.y-1 && r.bottom<=c.card.bottom+1,
        `Choice content escapes card: ${c.value}`);
    }
  }
}
function assertUnitOrder(m) {
  for(const c of m.cards) {
    const n=c.glyphs.find(g=>/\d/.test(g.char)),unit=c.glyphs.find(g=>g.char==='v');
    assert.ok(n && unit && n.x<unit.x,`Technical phrase reordered: ${c.value}`);
    if(!c.disabled) {
      const n2=c.noteGlyphs.find(g=>/\d/.test(g.char)),unit2=c.noteGlyphs.find(g=>g.char==='G');
      assert.ok(n2 && unit2 && n2.x<unit2.x,`Memory phrase reordered: ${c.value}`);
    }
  }
}
function prepareOutput(requested, assets) {
  if(!requested) return null;
  const resolved=path.resolve(requested);
  const dest=path.join(fs.realpathSync(path.dirname(resolved)),path.basename(resolved));
  for(const source of [fs.realpathSync(root),fs.realpathSync(assets)])
    assert.ok(dest!==source&&!dest.startsWith(source+path.sep),'Evidence must be outside source');
  assert.ok(!fs.existsSync(dest),'Use a fresh evidence directory');
  fs.mkdirSync(dest,{mode:0o700}); return dest;
}
async function run() {
  let browser,out;
  const report={status:'running',mode:'inline-choice-layout',checks:[],conditions:[]};
  try {
    const assets=path.resolve(process.env.DESIGN_PREVIEW_DIR || path.join(root,'assets'));
    assert.ok(!(process.env.CHROME_CHANNEL && process.env.CHROME_EXECUTABLE_PATH),'Choose channel or executable, not both');
    out=prepareOutput(process.env.DESIGN_QA_DIR,assets);
    const source=readSources(assets);
    const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    browser=await chromium.launch({headless:true,
      ...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{}),
      ...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})});
    report.node=process.version;report.browser=browser.version();
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.setDefaultTimeout(5000);
    const errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',e=>{if(['error','warning'].includes(e.type()))errors.push(e.text());});
    await page.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort();});
    const load=options=>page.setContent(fixture(source,options));
    const check=async(name,fn)=>{await fn();report.checks.push(name);};
    await check('identity and real fixture semantics',async()=>{
      await load({});assert.equal(await page.title(),'选择卡 · 方向与容器');
      assert.equal(await page.getByRole('radio').count(),3);
      assert.equal(await page.getByRole('radio',{name:'2 vCPU 4 GB 内存',exact:true}).count(),1);
      assert.equal(await page.getByRole('radio',{name:'8 vCPU 当前不可选 · 容量不足',exact:true}).isDisabled(),true);
    });
    await check('inherited and local directions at component widths, not only viewport breakpoints',async()=>{
      for(const theme of ['neutral','dark']) for(const [outer,inner] of [['ltr',null],['rtl',null],['ltr','rtl'],['rtl','ltr']]) {
        for(const [viewport,width] of [[1440,220],[1440,320],[1440,520],[390,320]]) {
          await page.setViewportSize({width:viewport,height:1000});
          await load({theme,outer,inner,width});const m=await measure(page);assertLayout(m);assertUnitOrder(m);
          assert.ok(m.cards.every(c=>c.direction===(inner||outer)),'Wrong effective direction');
          report.conditions.push({theme,outer,inner,viewport,width,gaps:m.cards.map(c=>c.gap)});
        }
      }
    });
    await check('live parent direction and explicit local override preserve native selection',async()=>{
      await load({outer:'ltr'});await page.locator('[value=medium]').check();
      await page.locator('html').evaluate(e=>e.dir='rtl');assertLayout(await measure(page));assertUnitOrder(await measure(page));
      await page.locator('fieldset').evaluate(e=>e.dir='ltr');
      assert.ok((await measure(page)).cards.every(c=>c.direction==='ltr'));
      await page.locator('html').evaluate(e=>e.dir='ltr');
      assert.equal(await page.locator('input:checked').getAttribute('value'),'medium');
    });
    await check('native keyboard selection, disabled skipping and visible focus in both directions',async()=>{
      for(const inner of ['ltr','rtl']) {
        await load({inner});await page.locator('[value=small]').focus();await page.keyboard.press('ArrowDown');
        assert.equal(await page.locator('input:checked').getAttribute('value'),'medium');
        await page.keyboard.press('ArrowDown');assert.equal(await page.locator('input:checked').getAttribute('value'),'small');
        const focus=await page.locator('[value=small] + .dl-choice-body').evaluate(e=>{const s=getComputedStyle(e);return [s.outlineStyle,parseFloat(s.outlineWidth)];});
        assert.notEqual(focus[0],'none');assert.ok(focus[1]>=2);
      }
    });
    await check('long text and doubled title size in a narrow embedded container',async()=>{
      await page.setViewportSize({width:1440,height:1100});
      for(const inner of ['ltr','rtl']) {
        await load({inner,width:220});
        await page.locator('.dl-choice-title').evaluateAll(es=>es.forEach(e=>e.append(' · 课程资料与协作工作区内容压力检查')));
        await page.addStyleTag({content:'.dl-choice-title{font-size:34px;line-height:1.5;letter-spacing:.12em}.dl-choice-note{line-height:1.5;letter-spacing:.12em;word-spacing:.16em}'});
        assertLayout(await measure(page));assertUnitOrder(await measure(page));
      }
    });
    await check('forced colors and reduced motion retain geometry and native controls',async()=>{
      await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await load({inner:'rtl',width:220});
      assertLayout(await measure(page));assertUnitOrder(await measure(page));
      await page.locator('[value=medium]').check();assert.equal(await page.locator('[value=medium]').isChecked(),true);
      await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});
    });
    if(process.env.DESIGN_BASELINE_DIR) await check('same-condition LTR geometry and content match the baseline',async()=>{
      const baseline=readSources(path.resolve(process.env.DESIGN_BASELINE_DIR));
      await page.setViewportSize({width:1440,height:1000});
      for(const theme of ['neutral','dark']) {
        await page.setContent(fixture(baseline,{theme}));const old=await measure(page);
        await load({theme});const now=await measure(page);
        assert.deepEqual(now,old,'LTR geometry or content changed');
      }
    });
    await check('negative control: physical start padding is detected by geometric assertion',async()=>{
      await load({inner:'rtl'});
      await page.addStyleTag({content:'.dl-choice-body{padding:18px 18px 18px 48px!important}'});
      const m=await measure(page);
      assert.throws(()=>assertLayout(m),e=>e.code==='ERR_ASSERTION'&&/overlaps control/.test(e.message));
    });
    async function negativeOrder() {
      await load({inner:'rtl'});
      await page.addStyleTag({content:'.dl-choice bdi{direction:inherit;unicode-bidi:normal}'});
      const m=await measure(page);assertLayout(m);
      assert.throws(()=>assertUnitOrder(m),e=>e.code==='ERR_ASSERTION'&&/phrase reordered/.test(e.message));
    }
    await check('negative control: loss of directional isolation is detected by glyph positions',negativeOrder);
    await check('console and external requests',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);});
    if(out) {
      await page.setViewportSize({width:390,height:1000});await load({inner:'rtl',width:320});
      fs.writeFileSync(path.join(out,'choice-preview.html'),fixture(source,{inner:'rtl',width:320}));
      await page.screenshot({path:path.join(out,'choice-mobile.png'),fullPage:true});
    }
    report.status='passed';
  } catch(e) {report.status='failed';report.error=e.stack;process.exitCode=1;}
  finally {
    if(browser)await browser.close();
    if(out)fs.writeFileSync(path.join(out,'choice-layout.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  }
}
module.exports={readSources,fixture,assertLayout,assertUnitOrder,prepareOutput};
if(require.main===module)run();
