'use strict';
const {claimEvidence, writeReport, launchForEvidence, failureStatus, exitCode, inlineStyles} = require('./support/qa-runtime.cjs');
// Inline composition regression using markup extracted from the real sample pages.
// Does not evaluate models, external pages, React portals, or a production application.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseSRGB, contrastRatio} = require('./color.cjs');
const root = path.resolve(__dirname, '..');
const assets = process.env.DESIGN_PREVIEW_DIR ? path.resolve(process.env.DESIGN_PREVIEW_DIR) : path.join(root, 'assets');
const result = {status: 'running', mode: 'inline-composition', checks: [], orders: [], scopes: [], contrast: [], limitations: [
  'Actual local sample markup and CSS; not a production integration or a model evaluation.',
  'Inline fixture: no URL navigation, stylesheet network delivery, Shadow DOM, iframe, or framework portal test.',
  'Only status-component composition is asserted, not arbitrary CSS-order independence for the whole design system.'
]};
let out, browser;
const read = name => fs.readFileSync(path.join(assets, name), 'utf8');
const themes = ['neutral', 'dark'];
const modes = ['semantic', 'mono', ''];
function prepareOutput() {
  out = claimEvidence(process.env.DESIGN_QA_DIR, {roots: [root, assets]});
}
function save() {
  if (out) writeReport(out, 'style-composition.json', result);
}
const shell = `body{margin:0;padding:28px;background:var(--dl-canvas);color:var(--dl-text);font:16px/1.6 var(--dl-font)}
main{max-width:860px;margin:auto}h1{font-size:26px;line-height:1.3;margin:0 0 8px;color:var(--dl-strong)}
h2{font-size:17px;margin:0 0 16px}p{margin:0 0 18px}.sample{padding:22px;background:var(--dl-surface);border:1px solid var(--dl-line);border-radius:8px;margin-block:18px;color:var(--dl-text)}
.status-row{display:flex;align-items:center;flex-wrap:wrap;gap:24px}.nested{padding:22px;margin-block-start:20px;border-radius:8px;background:var(--dl-surface);color:var(--dl-text)}
.note{font-size:13px;color:var(--dl-muted)}@media(max-width:540px){body{padding:20px 16px}.sample,.nested{padding:16px}.status-row{gap:16px}}`;
const modeAttr = mode => mode ? ` data-status-color="${mode}"` : '';
async function main() {
  assert.ok(!(process.env.CHROME_CHANNEL && process.env.CHROME_EXECUTABLE_PATH), 'Choose channel or executable, not both');
  prepareOutput();
  browser = await launchForEvidence(out, 'style-composition.json');
  result.browser = browser.version(); result.node = process.version;
  const errors = [], network = [];
  async function freshPage() {
    const next = await browser.newPage({viewport: {width: 1440, height: 1000}});
    next.setDefaultTimeout(5000);
    next.on('pageerror', e => errors.push(e.message));
    next.on('console', e => { if (['error', 'warning'].includes(e.type())) errors.push(e.text()); });
    await next.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
    return next;
  }
  let page = await freshPage();
  const fragments = await page.evaluate(({patterns, regions}) => {
    const p = new DOMParser().parseFromString(patterns, 'text/html');
    const r = new DOMParser().parseFromString(regions, 'text/html');
    function clone(node, id) {
      if (!node) throw Error('Missing source status');
      const el = node.cloneNode(true);
      el.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
      el.id = id;
      return el.outerHTML;
    }
    const compact = ['running', 'stopped', 'unknown'].map(state => clone(p.querySelector(`#records [data-state="${state}"]`), 'compact-' + state));
    const marked = ['maintenance', 'unknown'].map(state => clone(r.querySelector(`.dl-state[data-state="${state}"]`), 'marked-' + state));
    return {compact, marked};
  }, {patterns: read('patterns.html'), regions: read('regions.html')});
  const fixture = (order, theme = 'neutral', mode = 'semantic', childTheme = 'dark', childMode = 'mono') => {
    const inner = fragments.marked.join('').replaceAll('id="marked-', 'id="inner-');
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>状态与主题 · 组件组合参考</title><style>${read('tokens.css')}\n${read('components.css')}\n${order.map(read).join('\n')}\n${shell}</style></head>
<body data-design="error" data-theme="${theme}"${modeAttr(mode)}><main><h1>状态与主题</h1><p class="note">组件组合参考 · 本地样例，不连接真实服务。</p>
<section class="sample"><h2>清单中的状态</h2><div class="status-row">${fragments.compact.join('')}</div></section>
<section class="sample"><h2>独立状态标记</h2><div class="status-row">${fragments.marked.join('')}</div></section>
<section class="sample"><h2>局部主题</h2><p class="note">以下区域独立设置为${childTheme === 'dark' ? '深色' : '浅色'}、${childMode === 'semantic' ? '语义色' : '灰阶'}。</p>
<div id="inner-scope" class="nested" data-design="error" data-theme="${childTheme}"${modeAttr(childMode)}><div class="status-row">${inner}</div></div></section></main></body></html>`;
  };
  async function snapshot(prefix) {
    return page.locator(`[data-state][id^="${prefix}"]`).evaluateAll(elements => elements.map(el => {
      const s = getComputedStyle(el), before = getComputedStyle(el, '::before');
      const mark = el.querySelector('.dl-state-mark'), ms = mark && getComputedStyle(mark);
      return {id: el.id, text: el.textContent, color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight,
        whiteSpace: s.whiteSpace, lineHeight: s.lineHeight, gap: s.gap,
        before: before.content, beforeWidth: before.width,
        mark: ms ? {color: ms.color, background: ms.backgroundColor, border: ms.borderStyle, width: ms.width} : null};
    }));
  }
  async function check(name, run) { await run(); result.checks.push(name); }
  // Screenshot fixtures are documentation, not new product UI or proof of visual preference.
  await page.setViewportSize({width: 1000, height: 920});
  const preview = fixture(['patterns.css', 'regions.css']);
  await page.setContent(preview);
  assert.equal(await page.title(), '状态与主题 · 组件组合参考');
  assert.equal(await page.locator('h1').textContent(), '状态与主题');
  if (out) {
    fs.writeFileSync(path.join(out, 'composition-preview.html'), preview);
    await page.screenshot({path: path.join(out, 'composition-desktop.png'), fullPage: true});
    await page.setViewportSize({width: 390, height: 920});
    await page.screenshot({path: path.join(out, 'composition-mobile.png'), fullPage: true});
  }
  await page.setViewportSize({width: 1440, height: 1000});
  const owned = {};
  for (const theme of themes) {
    await page.setContent(fixture(['patterns.css'], theme));
    const compact = await snapshot('compact-');
    await page.setContent(fixture(['regions.css'], theme));
    owned[theme] = {compact, marked: await snapshot('marked-')};
  }
  await check('owning stylesheet and mixed-order status signatures agree', async () => {
    for (const theme of themes) for (const order of [['patterns.css', 'regions.css'], ['regions.css', 'patterns.css'], ['patterns.css', 'regions.css', 'patterns.css']]) {
      await page.setContent(fixture(order, theme));
      assert.deepEqual(await snapshot('compact-'), owned[theme].compact, 'Compact state changed with an unrelated stylesheet');
      assert.deepEqual(await snapshot('marked-'), owned[theme].marked, 'Marked state changed with an unrelated stylesheet');
      result.orders.push({theme, order});
    }
  });
  const standalones = {};
  for (const theme of themes) for (const mode of modes) {
    await page.setContent(fixture(['regions.css'], theme, mode));
    standalones[theme + '/' + mode] = (await snapshot('marked-')).map(({id, ...s}) => s);
  }
  await check('nested themes use their own boundary, including omitted opt-in', async () => {
    for (const parentTheme of themes) for (const parentMode of ['semantic', 'mono']) for (const childTheme of themes) for (const childMode of modes) {
      await page.setContent(fixture(['patterns.css', 'regions.css'], parentTheme, parentMode, childTheme, childMode));
      const inner = (await snapshot('inner-')).map(({id, ...s}) => s);
      assert.deepEqual(inner, standalones[childTheme + '/' + childMode], 'Outer scope leaked into nested status');
      result.scopes.push({parentTheme, parentMode, childTheme, childMode: childMode || 'omitted'});
      const bg = await page.locator('#inner-scope').evaluate(el => getComputedStyle(el).backgroundColor);
      for (const state of inner) {
        const ratio = contrastRatio(parseSRGB(state.color), parseSRGB(bg));
        assert.ok(ratio >= 4.5, `Nested status text contrast: ${ratio}`);
        result.contrast.push(ratio);
      }
    }
  });
  await check('live parent toggles do not alter explicit child configuration', async () => {
    await page.setContent(fixture(['patterns.css', 'regions.css']));
    const before = await snapshot('inner-');
    await page.evaluate(() => { document.body.dataset.theme = 'dark'; document.body.dataset.statusColor = 'mono'; });
    assert.deepEqual(await snapshot('inner-'), before);
    await page.locator('#inner-scope').evaluate(el => { el.dataset.statusColor = 'semantic'; });
    assert.deepEqual((await snapshot('inner-')).map(({id, ...s}) => s), standalones['dark/semantic']);
    await page.locator('#inner-scope').evaluate(el => { el.removeAttribute('data-status-color'); });
    assert.deepEqual(await snapshot('inner-'), before);
  });
  await check('combined 320px content wraps without a second status symbol', async () => {
    await page.setViewportSize({width: 320, height: 920});
    for (const order of [['patterns.css', 'regions.css'], ['regions.css', 'patterns.css']]) {
      await page.setContent(fixture(order));
      await page.locator('#inner-maintenance > span:last-child').evaluate(el => { el.textContent = '维护中 · 等待上游确认恢复时间与当前维护进度'; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('#inner-maintenance').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
      assert.equal((await snapshot('inner-'))[0].before, 'none');
    }
  });
  await check('forced colors keep one non-color marked symbol', async () => {
    await page.emulateMedia({forcedColors: 'active'});
    await page.setContent(fixture(['regions.css', 'patterns.css']));
    const s = await snapshot('inner-');
    assert.equal(s[0].before, 'none'); assert.notEqual(s[0].mark.border, 'none');
    assert.equal(await page.locator('#inner-maintenance svg').count(), 1);
    await page.emulateMedia({forcedColors: 'none'});
  });
  await check('same assertions reject reintroduced style and ancestor leaks', async () => {
    await page.setContent(fixture(['patterns.css', 'regions.css']));
    await page.addStyleTag({content: '.dl-state{font-size:12px!important;white-space:nowrap!important}.dl-state::before{content:"";display:inline-block;width:9px}'});
    const corrupted = await snapshot('marked-');
    assert.throws(() => assert.deepEqual(corrupted, owned.neutral.marked), {code: 'ERR_ASSERTION'});
    await page.setContent(fixture(['patterns.css', 'regions.css']));
    await page.addStyleTag({content: '[data-status-color="semantic"] .dl-state[data-state="maintenance"]{color:#805100!important}'});
    const leaked = (await snapshot('inner-')).map(({id, ...s}) => s);
    assert.throws(() => assert.deepEqual(leaked, standalones['dark/mono']), {code: 'ERR_ASSERTION'});
  });
  async function loadWholePage(name, extra, first) {
    // setContent does not dispose another document's global listeners. Each whole
    // sample gets its own Window, while both CSS bundles still load together.
    await page.close(); page = await freshPage();
    let html = read(name).replace(/<link[^>]+href="([^"/]+\.css)"[^>]*>/g, (_, file) => `<style>${read(file)}</style>`);
    html = first ? html.replace('<head>', `<head><style>${read(extra)}</style>`) : html.replace('</head>', `<style>${read(extra)}</style></head>`);
    await page.setContent(html);
  }
  await check('whole collection keeps selection and details with regions CSS loaded', async () => {
    await page.setViewportSize({width: 1440, height: 1000});
    for (const first of [true, false]) {
      await loadWholePage('patterns.html', 'regions.css', first);
      assert.equal(await page.title(), '服务清单');
      await page.locator('#records tr[data-id="demo-01"] input').check();
      await page.locator('#records tr[data-id="demo-04"] [data-detail]').click();
      assert.match(await page.locator('#selection-count').textContent(), /1/);
      assert.equal(await page.locator('#record-state').textContent(), '状态待确认');
      await page.selectOption('#theme', 'dark');
      assert.equal(await page.locator('#record-state').evaluate(el => getComputedStyle(el).fontSize), '12px');
      await page.locator('#close-detail').click();
      assert.equal(await page.locator('#records tr[data-id="demo-01"] input').isChecked(), true);
      await page.selectOption('#theme', 'neutral');
    }
  });
  await check('whole regions page keeps request outcomes and single glyph with collection CSS loaded', async () => {
    for (const first of [true, false]) {
      await loadWholePage('regions.html', 'patterns.css', first);
      assert.equal(await page.title(), '分组与状态 · 组件参考');
      await page.locator('#refresh').click();
      await page.waitForFunction(() => document.getElementById('request').dataset.phase === 'error');
      assert.equal(await page.locator('#entity-label').textContent(), '状态待确认');
      await page.locator('#refresh').click();
      await page.waitForFunction(() => document.getElementById('request').dataset.phase === 'success');
      assert.equal(await page.locator('#entity-label').textContent(), '维护中');
      assert.equal(await page.locator('#entity-state').evaluate(el => getComputedStyle(el, '::before').content), 'none');
      await page.selectOption('#theme', 'dark'); await page.selectOption('#color', 'mono');
      assert.equal(await page.locator('#entity-state').evaluate(el => getComputedStyle(el).color), 'rgb(222, 222, 222)');
      assert.equal(await page.locator('#cost-metric .dl-metric-value').textContent(), '24.50');
    }
  });
  assert.deepEqual(errors, []); assert.deepEqual(network, []);
  result.status = 'passed'; save();
  console.log(JSON.stringify({status: result.status, checks: result.checks.length, orders: result.orders.length, scopes: result.scopes.length, contrast: result.contrast.length}));
}
main().catch(error => { result.status = failureStatus(error); result.error = String(error); save(); console.error(error); process.exitCode = exitCode(error); }).finally(async () => { await browser?.close(); });
