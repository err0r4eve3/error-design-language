/* Optional browser tests for the local table sample. No model/API/device claims. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const assets = path.resolve(__dirname, '../assets');
const mode = process.env.DESIGN_QA_MODE || 'file';
const out = process.env.DESIGN_QA_DIR;
const result = {mode, checks: [], layouts: [], limitations: [
  'Local fixture only; no real service, backend, URL-history, model, or screen-reader evaluation.',
  'Composition events are synthetic; native IME and real mobile keyboards remain unverified.',
  'Narrow viewport and text-spacing overrides are not a real browser zoom test.',
  'Tables intentionally scroll horizontally; no full WCAG conformance claim.'
]};
const save = () => { if (out) { fs.mkdirSync(out, {recursive: true}); fs.writeFileSync(path.join(out, 'patterns-validation.json'), JSON.stringify(result, null, 2)); } };
function inline() {
  return fs.readFileSync(path.join(assets, 'patterns.html'), 'utf8').replace(/<link\b[^>]*>/g, tag => {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    assert.ok(['tokens.css', 'components.css', 'patterns.css'].includes(href), `Unexpected link: ${tag}`);
    return `<style>${fs.readFileSync(path.join(assets, href), 'utf8')}</style>`;
  });
}
async function noPageOverflow(page) {
  const size = await page.evaluate(() => ({width: innerWidth, root: document.documentElement.scrollWidth, body: document.body.scrollWidth}));
  assert.ok(size.root <= size.width && size.body <= size.width, JSON.stringify(size));
}
async function keyboardReach(page, selector) {
  await page.locator('#theme').focus();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    if (await page.locator(selector).evaluate(el => el === document.activeElement)) {
      assert.ok(await page.locator(selector).evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineStyle !== 'none'));
      return;
    }
  }
  throw new Error(`Not keyboard reachable: ${selector}`);
}
(async () => {
  assert.ok(['file', 'inline'].includes(mode), 'DESIGN_QA_MODE must be file or inline');
  assert.ok(!(process.env.CHROME_CHANNEL && process.env.CHROME_EXECUTABLE_PATH), 'Use channel OR executable');
  let chromium;
  try { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); }
  catch (error) { throw new Error('Use an existing Playwright installation via PLAYWRIGHT_MODULE for optional browser QA.', {cause: error}); }
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROME_CHANNEL ? {channel: process.env.CHROME_CHANNEL} : {}),
    ...(process.env.CHROME_EXECUTABLE_PATH ? {executablePath: process.env.CHROME_EXECUTABLE_PATH} : {})});
  result.browser = browser.version();
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  page.setDefaultTimeout(5000);
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (['warning', 'error'].includes(e.type())) errors.push(e.text()); });
  page.on('request', r => { if (!r.url().startsWith('file:')) external.push(r.url()); });
  try {
    if (mode === 'inline') { await page.setContent(inline()); result.limitations.push('setContent fixture: navigation and resource loading unverified.'); }
    else await page.goto(pathToFileURL(path.join(assets, 'patterns.html')).href);
    assert.equal(page.url(), mode === 'inline' ? 'about:blank' : pathToFileURL(path.join(assets, 'patterns.html')).href);
    assert.equal(await page.title(), '服务清单 · 界面模式样张');
    assert.ok(await page.getByRole('heading', {name: '服务清单', exact: true}).isVisible());
    assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(), 0);
    assert.equal(await page.getByRole('table').count(), 1);
    assert.equal(await page.locator('thead th[scope="col"]').count(), 5);
    assert.equal(await page.locator('tbody th[scope="row"]').count(), 4);
    result.checks.push('page-identity-and-native-table');
    const asideGap = await page.locator('aside').evaluate(el => {
      const title = el.querySelector('h2').getBoundingClientRect();
      return el.querySelector('p').getBoundingClientRect().top - title.bottom;
    });
    assert.ok(asideGap >= 12 && asideGap <= 20, `Sidebar content stretched apart: ${asideGap}px`);
    result.checks.push('sidebar-content-rhythm');
    for (const theme of ['neutral', 'dark']) {
      await page.selectOption('#theme', theme);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({width, height: 1000});
        await noPageOverflow(page);
        assert.ok(await page.locator('#query').isVisible());
        assert.ok(await page.locator('#status').isVisible());
        result.layouts.push({theme, width});
      }
    }
    const ids = () => page.locator('#records tr').evaluateAll(rows => rows.map(r => r.dataset.id));
    assert.deepEqual(await ids(), ['demo-01', 'demo-02', 'demo-03', 'demo-04']);
    await page.locator('[data-id="demo-01"] input').check();
    assert.ok(await page.locator('#select-visible').evaluate(el => el.indeterminate));
    await page.locator('#sort-price').click();
    assert.deepEqual(await ids(), ['demo-03', 'demo-02', 'demo-01', 'demo-04']);
    assert.equal(await page.locator('#price-heading').getAttribute('aria-sort'), 'descending');
    assert.ok(await page.locator('[data-id="demo-01"] input').isChecked());
    await page.locator('#sort-price').click();
    assert.deepEqual(await ids(), ['demo-01', 'demo-02', 'demo-03', 'demo-04']);
    assert.equal(await page.locator('#price-heading').getAttribute('aria-sort'), 'ascending');
    result.checks.push('numeric-sort-unknown-last-both-directions', 'stable-row-selection', 'mixed-checkbox');
    await page.selectOption('#status', 'running');
    assert.equal(await page.locator('#records tr:visible').count(), 2);
    assert.equal(await page.locator('#records input:checked').count(), 0);
    await page.locator('#select-visible').check();
    assert.equal(await page.locator('#records input:checked').count(), 2);
    assert.equal(await page.locator('#select-visible').evaluate(el => el.indeterminate), false);
    assert.equal(await page.locator('#selection-count').textContent(), '本次筛选已选择 2 条');
    await page.locator('#reset').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'query');
    assert.equal(await page.locator('#records input:checked').count(), 0);
    result.checks.push('visible-selection-scope', 'filter-clears-selection', 'clear-restores-focus');
    // Test both InputEvent.isComposing and the explicit composition lifecycle guard.
    await page.locator('#query').evaluate(el => {
      el.value = 'not-a-record';
      el.dispatchEvent(new InputEvent('input', {bubbles: true, isComposing: true}));
    });
    assert.equal(await page.locator('#records tr:visible').count(), 4);
    await page.locator('#query').evaluate(el => {
      el.value = '文档'; el.dispatchEvent(new CompositionEvent('compositionend', {bubbles: true}));
    });
    assert.equal(await page.locator('#records tr:visible').getAttribute('data-id'), 'demo-01');
    await page.locator('#query').evaluate(el => {
      el.dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true}));
      el.value = '计算'; el.dispatchEvent(new InputEvent('input', {bubbles: true, isComposing: false}));
    });
    assert.equal(await page.locator('#records tr:visible').getAttribute('data-id'), 'demo-01');
    await page.locator('#query').evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', {bubbles: true})));
    assert.equal(await page.locator('#records tr:visible').getAttribute('data-id'), 'demo-03');
    await page.locator('#select-visible').check();
    await page.locator('#query').dispatchEvent('input');
    assert.ok(await page.locator('[data-id="demo-03"] input').isChecked(), 'Duplicate final input must not clear selection');
    result.checks.push('composition-flag-and-lifecycle', 'duplicate-final-input-is-idempotent');
    await page.locator('#query').fill('没有此服务');
    assert.ok(await page.locator('#empty').isVisible());
    assert.ok(await page.locator('#table-scroll').isHidden());
    assert.equal(await page.locator('#result-count').textContent(), '当前筛选 0 条');
    await page.locator('#empty-reset').click();
    assert.equal(await page.locator('#records tr:visible').count(), 4);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'query');
    result.checks.push('filtered-empty-and-recovery');
    const detail = page.locator('[data-id="demo-04"] [data-detail]');
    await detail.click();
    assert.ok(await page.getByRole('dialog', {name: '待核验记录'}).isVisible());
    assert.ok((await page.locator('#record-description').textContent()).includes('月费：未读取'));
    await page.keyboard.press('Escape');
    assert.ok(await detail.evaluate(el => el === document.activeElement));
    result.checks.push('unknown-is-not-zero', 'dialog-and-focus-return');
    await page.setViewportSize({width: 320, height: 844});
    await keyboardReach(page, '#table-scroll');
    const before = await page.locator('#table-scroll').evaluate(el => el.scrollLeft);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(before => document.querySelector('#table-scroll').scrollLeft > before, before);
    result.checks.push('keyboard-local-table-scroll');
    const spacing = await page.addStyleTag({content: `.dl-pattern-page :is(h1,h2,p,small,label,button,th,td,input,select) {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} .dl-pattern-page p {margin-block-end:2em!important}`});
    await noPageOverflow(page);
    for (const selector of ['#reset', '#sort-price', '#empty-reset', '#query']) {
      const control = page.locator(selector);
      if (await control.isVisible()) assert.ok(await control.evaluate(el => el.scrollHeight <= el.clientHeight + 1), `${selector}: clipped after text-spacing override`);
    }
    await spacing.evaluate(el => el.remove());
    result.checks.push('text-spacing-override-at-320');
    await page.emulateMedia({forcedColors: 'active'});
    await keyboardReach(page, '#sort-price');
    assert.ok(await page.locator('#sort-price').evaluate(el => parseFloat(getComputedStyle(el).outlineWidth) >= 2));
    await page.emulateMedia({forcedColors: 'none', reducedMotion: 'reduce'});
    await page.locator('#sort-price').click();
    assert.equal(await page.locator('#price-heading').getAttribute('aria-sort'), 'descending');
    result.checks.push('forced-colors-keyboard-smoke', 'reduced-motion-still-operable');
    if (out) {
      fs.mkdirSync(out, {recursive: true});
      for (const theme of ['neutral', 'dark']) {
        await page.selectOption('#theme', theme);
        for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
          await page.setViewportSize({width, height});
          await page.evaluate(() => { document.querySelector('#table-scroll').scrollLeft = 0; document.activeElement.blur(); scrollTo(0, 0); });
          await page.screenshot({path: path.join(out, `patterns-${theme}-${name}.png`), fullPage: true});
        }
      }
    }
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    result.consoleErrors = errors; result.externalRequests = external;
    result.status = 'pass';
    save(); console.log(JSON.stringify({status: result.status, browser: result.browser, mode, layouts: result.layouts.length, checks: result.checks.length, limitations: result.limitations}, null, 2));
  } catch (error) {
    result.status = 'fail'; result.error = error.stack; save();
    if (out) await page.screenshot({path: path.join(out, 'patterns-failure.png'), fullPage: true}).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { result.status = 'fail'; result.error = error.stack; save(); console.error(error); process.exitCode = 1; });
