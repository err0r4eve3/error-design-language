'use strict';
// Optional rendered fixture regression; not a visual-quality scorer or a model eval.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {parseSRGB, composite, contrastRatio} = require('./color.cjs');
const repo = path.resolve(__dirname, '..');
const assetDir = process.env.DESIGN_PREVIEW_DIR ? path.resolve(process.env.DESIGN_PREVIEW_DIR) : path.join(repo,'assets');
const mode = process.env.DESIGN_QA_MODE || 'file';
let evidence = null; // Set only after an exclusive, validated output directory is created.
const result = {status:'running', mode, layouts:0, checks:[], contrast:[], screenshots:[], limitations:[
  'Fixture checks are not model evaluations or production business tests.',
  'Emulated viewport, media preferences and keyboard input do not prove physical-device or screen-reader behavior.'
]};
const inside = (parent,child) => child===parent || child.startsWith(parent+path.sep);
async function check(name, fn) { await fn(); result.checks.push(name); }
function opaqueBackground(colors) {
  let surface=[0,0,0,0];
  for (const c of colors) {
    surface=composite(surface,parseSRGB(c));
    if(surface[3]===1) return surface;
  }
  throw new Error('Background not established; refusing contrast calculation.');
}
async function main() {
  assert.ok(['file','inline'].includes(mode),'DESIGN_QA_MODE must be file or inline');
  assert.ok(!(process.env.CHROME_CHANNEL && process.env.CHROME_EXECUTABLE_PATH),'Choose channel or executable, not both');
  if(process.env.DESIGN_QA_DIR) {
    const requested=path.resolve(process.env.DESIGN_QA_DIR);
    const target=path.join(fs.realpathSync(path.dirname(requested)),path.basename(requested));
    assert.ok(!inside(fs.realpathSync(repo),target),'Evidence must be outside the repository');
    fs.mkdirSync(target); // Exclusive: never overwrite another run. Parent must exist.
    evidence=target;
  } else evidence=fs.mkdtempSync(path.join(os.tmpdir(),'edl-regions-'));
  const source=fs.readFileSync(path.join(assetDir,'regions.html'),'utf8');
  const styles=['tokens.css','components.css','regions.css'];
  result.sources=Object.fromEntries(['regions.html',...styles].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(assetDir,name))).digest('hex')]));
  if(mode==='inline') result.limitations.push('Inline setContent: URL navigation and external resource loading not tested.');
  const playwright=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const launch={headless:true};
  if(process.env.CHROME_EXECUTABLE_PATH) launch.executablePath=process.env.CHROME_EXECUTABLE_PATH;
  if(process.env.CHROME_CHANNEL) launch.channel=process.env.CHROME_CHANNEL;
  const browser=await playwright.chromium.launch(launch);
  result.browser=browser.version(); result.node=process.version;
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(); const errors=[], external=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',msg=>{if(msg.type()==='error') errors.push(msg.text());});
  await context.route(/^https?:/,route=>{external.push(route.request().url()); return route.abort();});
  const load=async()=> {
    if(mode==='file') await page.goto(pathToFileURL(path.join(assetDir,'regions.html')).href);
    else {
      const inline=source.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,name)=>{
        assert.ok(styles.includes(name),`Unlisted stylesheet ${name}`);
        return `<style>${fs.readFileSync(path.join(assetDir,name),'utf8')}</style>`;
      });
      await page.setContent(inline);
    }
  };
  const shot=async name=>{
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(evidence,name),fullPage:true});
    result.screenshots.push(name);
  };
  const layout=async()=>page.evaluate(()=>{
    const boxes=[...document.querySelectorAll('.dl-metric')].map(e=>{
      const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};
    });
    const gap=Math.max(boxes[1].x-boxes[0].right,boxes[1].y-boxes[0].bottom);
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,gap,
      peers:[...document.querySelectorAll('.dl-metric')].map(e=>getComputedStyle(e).backgroundColor),
      innerOverflow:[...document.querySelectorAll('.dl-metric,.dl-choice-body,.service')].some(e=>e.scrollWidth>e.clientWidth+1)};
  });
  const assertGroups=m=>{assert.equal(m.overflow,false);assert.equal(m.innerOverflow,false);assert.ok(m.gap>=8,'Fixture peer groups merged');};
  const readRadioFocus=async()=>page.locator('input[name=plan]:focus + span').evaluate(e=>{
    const s=getComputedStyle(e);return {style:s.outlineStyle,width:parseFloat(s.outlineWidth),fg:s.outlineColor,bg:getComputedStyle(document.body).backgroundColor};
  });
  const assertRadioFocus=s=>{
    assert.notEqual(s.style,'none','Focus outline missing');assert.ok(s.width>=2,'Focus outline too thin');
    const ratio=contrastRatio(parseSRGB(s.fg),parseSRGB(s.bg));assert.ok(ratio>=3,'Focus contrast');return ratio;
  };

  try {
    await load();
    await check('page identity and static object semantics',async()=>{
      assert.equal(await page.title(),'分组与状态 · 组件参考');
      assert.equal(await page.locator('h1').textContent(),'分组与状态');
      assert.equal(await page.locator('.dl-metric button,.dl-metric a,.dl-metric input').count(),0);
      assert.deepEqual(await page.locator('.dl-metric').evaluateAll(es=>es.map(e=>e.tabIndex)),[-1,-1]);
    });
    for(const theme of ['neutral','dark']) for(const color of ['semantic','mono']) for(const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000});
      await page.selectOption('#theme',theme);await page.selectOption('#color',color);
      await check(`layout ${theme}/${color}/${width}`,async()=>{
        const m=await layout();assertGroups(m);assert.equal(m.peers[0],m.peers[1],'Same-role fixture peers intentionally share a surface');
      }); result.layouts++;
    }
    for(const theme of ['neutral','dark']) for(const color of ['semantic','mono']) {
      await page.selectOption('#theme',theme);await page.selectOption('#color',color);
      await check(`controlled contrast ${theme}/${color}`,async()=>{
        const samples=await page.locator('.dl-metric dt,.dl-metric-value,.dl-metric-unit,.dl-metric-note,.dl-choice-title,.dl-choice-note,.dl-state,.dl-state-mark,.service-note,#request-message').evaluateAll(es=>es.map(e=>{
          const bg=[];
          for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.backgroundImage!=='none')throw new Error('Unmeasured image background');bg.push(s.backgroundColor);}
          return {selector:e.id||e.className,fg:getComputedStyle(e).color,bg};
        }));
        for(const s of samples){const bg=opaqueBackground(s.bg);const fg=composite(parseSRGB(s.fg),bg);const ratio=contrastRatio(fg,bg);
          assert.ok(ratio>=4.5,`${s.selector}: ${ratio}`);result.contrast.push({theme,color,selector:s.selector,ratio});}
      });
    }
    await page.setViewportSize({width:1440,height:1000});await page.selectOption('#theme','neutral');await page.selectOption('#color','semantic');
    await check('native keyboard selection, disabled option and visible focus',async()=>{
      await page.focus('#color');await page.keyboard.press('Tab');
      assert.equal(await page.locator(':focus').getAttribute('value'),'small');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('input[name=plan]:checked').getAttribute('value'),'medium');
      assert.equal(await page.locator('input[value=large]').isDisabled(),true);
      result.focusContrast=assertRadioFocus(await readRadioFocus());
      await page.keyboard.press('ArrowRight');assert.equal(await page.locator('input:checked').getAttribute('value'),'small');
      await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('id'),'refresh');
    });
    await check('missing focus ring is rejected by the same focus guard',async()=>{
      await page.keyboard.press('Shift+Tab');assertRadioFocus(await readRadioFocus());
      const style=await page.addStyleTag({content:'.dl-choice input:focus-visible + span{outline:none!important}'});
      const focus=await readRadioFocus();assert.throws(()=>assertRadioFocus(focus),/missing/);
      await style.evaluate(e=>e.remove());assertRadioFocus(await readRadioFocus());await page.keyboard.press('Tab');
    });
    const metricBefore=await page.locator('.dl-metric-grid').innerText();
    await check('read failure stays separate from lifecycle; repeated activation guarded',async()=>{
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#refresh').getAttribute('aria-busy'),'true');
      assert.equal(await page.locator('#entity-state').getAttribute('data-state'),'unknown');
      // Synthetic duplicate activation tests the event guard, not physical double-tap behavior.
      await page.locator('#refresh').evaluate(e=>{e.click();e.click();});
      await page.waitForFunction(()=>document.querySelector('#request').dataset.phase==='error');
      assert.equal(await page.locator('#entity-state').getAttribute('data-state'),'unknown');
      assert.equal(await page.locator('#entity-label').textContent(),'状态待确认');
      assert.equal(await page.locator(':focus').getAttribute('id'),'refresh');
      assert.equal(await page.locator('#request-message').getAttribute('role'),'status');
      assert.equal(await page.locator('#request-message').getAttribute('aria-atomic'),'true');
      assert.equal(await page.locator('#refresh').textContent(),'重试读取');
      assert.match(await page.locator('#request-message').textContent(),/relay-b.*读取失败/);
      assert.equal(await page.locator('.dl-metric-grid').innerText(),metricBefore);
    });
    await shot('regions-read-failure.png');
    await check('retry updates lifecycle and symbol consistently, not unrelated metrics',async()=>{
      await page.click('#refresh');await page.waitForFunction(()=>document.querySelector('#request').dataset.phase==='success');
      assert.equal(await page.locator('#entity-state').getAttribute('data-state'),'maintenance');
      const marks=await page.locator('.dl-state svg').evaluateAll(es=>es.map(e=>e.outerHTML));assert.equal(marks[0],marks[1]);
      assert.equal(await page.locator('.dl-metric-grid').innerText(),metricBefore);
    });
    await check('reset invalidates late response without overwriting another control',async()=>{
      await page.selectOption('#theme','dark');await page.click('#refresh');await page.locator('summary').click();await page.click('#reset-request');
      await page.waitForTimeout(450);
      assert.equal(await page.locator('#request').getAttribute('data-phase'),'idle');
      assert.equal(await page.locator('#entity-state').getAttribute('data-state'),'unknown');
      assert.equal(await page.locator('body').getAttribute('data-theme'),'dark');
    });
    await load();
    await check('strict grayscale retains symbols, names and distinct outlines',async()=>{
      await page.selectOption('#color','mono');
      const snapshot=await page.locator('.dl-state').evaluateAll(es=>es.map(e=>{const mark=e.querySelector('.dl-state-mark'),s=getComputedStyle(mark);return {text:e.textContent,fg:getComputedStyle(e).color,shape:s.borderRadius,line:s.borderTopStyle,path:e.querySelector('path').getAttribute('d')};}));
      assert.notEqual(snapshot[0].shape,snapshot[1].shape);assert.notEqual(snapshot[0].line,snapshot[1].line);assert.notEqual(snapshot[0].path,snapshot[1].path);
      for(const s of snapshot){const c=parseSRGB(s.fg);assert.equal(c[0],c[1]);assert.equal(c[1],c[2]);}
      assert.match(snapshot[0].text,/维护中/);assert.match(snapshot[1].text,/状态待确认/);
    });
    await check('negative group flattening is detected by the same fixture guard',async()=>{
      const style=await page.addStyleTag({content:'.dl-metric-grid{gap:0!important}.dl-metric{padding:0!important;border:0!important;background:transparent!important}'});
      const m=await layout();assert.throws(()=>assertGroups(m),/merged/);
      await style.evaluate(e=>e.remove());
    });
    await check('long content and text spacing do not overflow at 320px',async()=>{
      await page.setViewportSize({width:320,height:1000});
      await page.locator('.dl-metric-value').first().evaluate(e=>e.textContent='123456789012345678901234');
      await page.locator('#entity-label').evaluate(e=>e.textContent='状态仍然待确认，正在等待完整的有效信息'.repeat(4));
      const style=await page.addStyleTag({content:'main *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}'});
      assertGroups(await layout());await style.evaluate(e=>e.remove());
    });
    await load();
    await check('isolated metric reuse without document reset',async()=>{
      const fragment=await page.locator('.dl-metric-grid').evaluate(e=>e.outerHTML);
      await page.setContent(`<body data-design="error" data-theme="neutral"><style>${fs.readFileSync(path.join(assetDir,'tokens.css'),'utf8')}\n${fs.readFileSync(path.join(assetDir,'regions.css'),'utf8')}</style><div style="max-width:280px">${fragment}</div></body>`);
      assertGroups(await layout());
    });
    await load();
    await check('forced colors and reduced motion preserve controls and status shapes',async()=>{
      await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
      const shapes=await page.locator('.dl-state-mark').evaluateAll(es=>es.map(e=>getComputedStyle(e).borderTopStyle));assert.deepEqual(shapes,['solid','dashed']);
      await page.locator('input[value=small]').focus();await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('input:checked').getAttribute('value'),'medium');
      assertGroups(await layout());await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});
    });
    await load();
    for(const [theme,color,width,name] of [['neutral','semantic',1440,'regions-light.png'],['dark','semantic',1440,'regions-dark.png'],['neutral','mono',390,'regions-mobile-mono.png']]){
      await page.setViewportSize({width,height:1000});await page.selectOption('#theme',theme);await page.selectOption('#color',color);await shot(name);
    }
    await check('console and external requests',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
    result.status='passed';
  } finally { await browser.close(); }
}
main().catch(err=>{result.status='failed';result.error=err.stack;process.exitCode=1;}).finally(()=>{
  if(evidence) fs.writeFileSync(path.join(evidence,'regions-results.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({status:result.status,layouts:result.layouts,checks:result.checks.length,contrast:result.contrast.length,evidence,error:result.error},null,2));
});
