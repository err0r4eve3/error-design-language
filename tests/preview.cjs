/* Optional controlled-fixture regression. Does not certify real sites or WCAG compliance. */
'use strict';
const {claimEvidence, writeReport, launchForEvidence, failureStatus, exitCode, inlineStyles} = require('./support/qa-runtime.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {parseSRGB, composite, contrastRatio} = require('./color.cjs');
const root = path.resolve(__dirname, '..');
const mode = process.env.DESIGN_QA_MODE || 'file';
let evidence = null;
const assets = path.resolve(process.env.DESIGN_PREVIEW_DIR || path.join(root, 'assets'));
const target = pathToFileURL(path.join(assets, 'preview.html')).href;
const results = {mode, layouts: [], text: [], focus: [], boundaries: [], checks: [], limitations: [
  'Controlled local sample; no live API, payment, real-device, or model-behavior evaluation.',
  'sRGB contrast checks cover solid surfaces only, not blur, imagery, overlapping layers, or full accessibility conformance.'
]};
if (mode === 'inline') results.limitations.push('In-memory HTML/CSS fixture: URL navigation and actual stylesheet/resource loading are not verified.');

function save() {
  if (!evidence) return;
  writeReport(evidence, 'validation.json', results);
}
function inlinedFixture() {
  return inlineStyles(assets, 'preview.html', ['tokens.css', 'components.css', 'preview.css']);
}

// Read actual computed styles, but deliberately refuse unsupported compositing cases.
async function sample(locator, pseudo) {
  return locator.evaluate((el, pseudo) => {
    const style = node => {
      const s = getComputedStyle(node);
      for (const [key, expected] of [['backgroundImage', 'none'], ['filter', 'none'], ['opacity', '1'], ['mixBlendMode', 'normal']]) {
        if (s[key] !== expected) throw new Error(`Unsupported contrast context: ${key}=${s[key]}`);
      }
      if (s.backdropFilter && s.backdropFilter !== 'none') throw new Error('Glass contrast requires a different, backdrop-aware measurement');
      return s.backgroundColor;
    };
    const backgrounds = [];
    for (let node = el; node; node = node.parentElement) backgrounds.push(style(node));
    const s = getComputedStyle(el, pseudo);
    if (s.opacity !== '1' || s.filter !== 'none') throw new Error('Unsupported text opacity/filter');
    return {backgrounds: backgrounds.reverse(), color: s.color,
      outline: s.outlineColor, outlineStyle: s.outlineStyle, outlineWidth: parseFloat(s.outlineWidth),
      border: s.borderTopColor, borderWidth: parseFloat(s.borderTopWidth), borderStyle: s.borderTopStyle};
  }, pseudo);
}
function background(colors) {
  return colors.reduce((bg, color) => composite(parseSRGB(color), bg), [255, 255, 255, 1]);
}
async function textContrast(locator, label, pseudo) {
  const value = await sample(locator, pseudo);
  const bg = background(value.backgrounds);
  const ratio = contrastRatio(composite(parseSRGB(value.color), bg), bg);
  assert.ok(ratio >= 4.5, `${label}: text contrast ${ratio}`);
  results.text.push({label, ratio, color: value.color, background: bg});
}
async function focusRing(locator, label) {
  assert.ok(await locator.evaluate(el => el.matches(':focus-visible')), `${label}: keyboard focus not visible`);
  const value = await sample(locator);
  assert.ok(!['none', 'hidden'].includes(value.outlineStyle) && value.outlineWidth >= 2, `${label}: missing focus outline`);
  // Sample uses a positive outline-offset on a flat surrounding surface.
  const adjacent = background(value.backgrounds.slice(0, -1));
  const ratio = contrastRatio(composite(parseSRGB(value.outline), adjacent), adjacent);
  assert.ok(ratio >= 3, `${label}: focus outline contrast ${ratio}`);
  return {label, ratio, width: value.outlineWidth};
}
async function keyboardFocus(page, locator) {
  await page.locator('#email').focus();
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    if (await locator.evaluate(el => el === document.activeElement)) return;
  }
  throw new Error('Target is not reachable in the sample keyboard sequence');
}
async function inputBoundary(locator, label) {
  const value = await sample(locator);
  assert.ok(value.borderWidth > 0 && !['none', 'hidden'].includes(value.borderStyle));
  const outside = background(value.backgrounds.slice(0, -1));
  const inside = background(value.backgrounds);
  const ratios = [inside, outside].map(bg => contrastRatio(composite(parseSRGB(value.border), bg), bg));
  assert.ok(Math.min(...ratios) >= 3, `${label}: input boundary contrast ${ratios}`);
  results.boundaries.push({label, inside: ratios[0], outside: ratios[1]});
}
async function noOverflow(page, width, label) {
  const size = await page.evaluate(() => ({root: document.documentElement.scrollWidth, body: document.body.scrollWidth}));
  assert.ok(size.root <= width && size.body <= width, `${label}: ${JSON.stringify(size)}`);
}
async function reusableControls(browser) {
  // No preview.css or global border-box reset: this catches accidental sample dependencies.
  const page = await browser.newPage({viewport: {width: 320, height: 640}});
  try {
    const css = ['tokens.css', 'components.css'].map(f => fs.readFileSync(path.join(assets, f), 'utf8')).join('\n');
    await page.setContent(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>${css}</style></head>
      <body data-design="error"><main style="width:160px"><button class="dl-button primary">确认这个包含很长中文说明与UnbrokenReference012345678901234567890123456789的操作</button>
      <input class="dl-input" aria-label="长输入" style="width:100%" value="very-long-address@example.test"></main></body></html>`);
    for (const selector of ['button', 'input']) {
      const size = await page.locator(selector).evaluate(el => ({box: getComputedStyle(el).boxSizing,
        width: el.getBoundingClientRect().width, parent: el.parentElement.getBoundingClientRect().width,
        scroll: el.scrollWidth, client: el.clientWidth}));
      assert.equal(size.box, 'border-box');
      assert.ok(size.width <= size.parent, `${selector}: exceeds container`);
      if (selector === 'button') assert.ok(size.scroll <= size.client, 'Long button label overflows');
    }
    await noOverflow(page, 320, 'isolated controls');
    results.checks.push('isolated-component-box-model-and-long-label');
  } finally { await page.close(); }
}

(async () => {
  assert.ok(['file', 'inline'].includes(mode), 'DESIGN_QA_MODE must be file or inline');
  evidence = claimEvidence(process.env.DESIGN_QA_DIR, {roots: [root, assets]});
  assert.ok(!(process.env.CHROME_CHANNEL && process.env.CHROME_EXECUTABLE_PATH), 'Choose a channel OR an executable, not both');
  const browser = await launchForEvidence(evidence, 'validation.json');
  results.browser = browser.version();
  let page;
  try {
    page = await browser.newPage({viewport: {width: 1440, height: 1080}});
    page.setDefaultTimeout(5000);
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (['error', 'warning'].includes(e.type())) errors.push(e.text()); });
    page.on('request', r => { if (!r.url().startsWith('file:')) requests.push(r.url()); });
    if (mode === 'inline') await page.setContent(inlinedFixture());
    else await page.goto(target);
    assert.equal(await page.title(), '设计语言');
    assert.equal(page.url(), mode === 'inline' ? 'about:blank' : target);
    assert.ok(await page.getByRole('heading', {name: '检查记录', exact: true}).isVisible());
    assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(), 0);
    results.checks.push('sample-content-and-identity');

    for (const theme of ['neutral', 'dark']) {
      await page.selectOption('#theme', theme);
      for (const material of ['liquid', 'frosted', 'solid']) {
        await page.selectOption('#material', material);
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({width, height: 1080});
          await noOverflow(page, width, `${theme}/${material}/${width}`);
          results.layouts.push({theme, material, width});
        }
      }
      await page.selectOption('#material', 'solid');
      for (const variant of ['主操作', '次操作', '轻操作']) {
        const button = page.locator(`[data-demo="${variant}"]`);
        for (const state of ['normal', 'hover', 'focus', 'pressed']) {
          await page.mouse.move(1, 1); await page.locator('#email').focus();
          if (state === 'hover' || state === 'pressed') await button.hover();
          if (state === 'focus') {
            await keyboardFocus(page, button);
            results.focus.push(await focusRing(button, `${theme}/${variant}`));
          }
          if (state === 'pressed') await page.mouse.down();
          try { await textContrast(button, `${theme}/${variant}/${state}`); }
          finally { if (state === 'pressed') await page.mouse.up(); }
        }
      }
      const disabled = page.getByRole('button', {name: '不可用', exact: true});
      await textContrast(disabled, `${theme}/disabled-internal-goal`);
      assert.notEqual(await disabled.evaluate(el => getComputedStyle(el).backgroundColor),
        await page.locator('[data-demo="主操作"]').evaluate(el => getComputedStyle(el).backgroundColor));
      for (const [selector, label, pseudo] of [['.task:has(input:checked) strong', 'selected-title'],
        ['.task:has(input:checked) small', 'selected-helper'], ['#email', 'input'], ['#search', 'placeholder', '::placeholder']]) {
        await textContrast(page.locator(selector), `${theme}/${label}`, pseudo);
      }
      for (const selector of ['#email', '#search']) await inputBoundary(page.locator(selector), `${theme}/${selector}`);
      const submit = page.locator('#submit');
      await submit.click();
      assert.ok(await submit.isDisabled()); assert.equal(await submit.getAttribute('aria-busy'), 'true');
      await page.locator('#demo-form').evaluate(form => {
        for (let i = 0; i < 3; i++) form.dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
      });
      await textContrast(submit, `${theme}/busy`);
      await page.waitForFunction(() => document.querySelector('#submit').textContent === '重试');
      // A bounded extra turn catches duplicate local completions, not backend idempotency.
      await page.waitForTimeout(80);
      assert.equal(await submit.textContent(), '重试');
      assert.equal(await page.locator('#email').inputValue(), 'preview@example.com');
      await submit.click();
      await page.waitForFunction(() => document.querySelector('#submit').textContent === '重新演示');
      assert.equal(await submit.getAttribute('aria-busy'), null);
    }
    results.checks.push('pending-duplicate-guard-and-failure-retry');
    for (const theme of ['neutral', 'dark', 'neutral']) {
      await page.selectOption('#theme', theme);
      await textContrast(page.locator('[data-demo="主操作"]'), `${theme}/immediate-theme-switch`);
    }
    await page.locator('input[name=record]').first().focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('input[name=record]:checked').count(), 1);
    assert.equal(await page.locator('input[name=record]:checked').inputValue(), '选中状态');
    await page.locator('#detail').click();
    assert.ok(await page.locator('dialog').isVisible());
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      // Native dialog may let Tab reach browser chrome; it must not reach background controls.
      assert.ok(await page.locator('dialog').evaluate(el => el.contains(document.activeElement) ||
        (document.activeElement === document.body && !document.hasFocus())), 'Focus reached background content');
    }
    if (!await page.evaluate(() => document.hasFocus())) await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'detail');
    await page.locator('#detail').click(); await page.locator('#close').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'detail');
    await page.locator('#search').fill('失败');
    assert.equal(await page.locator('.task:visible').count(), 1); assert.ok(await page.locator('#detail').isDisabled());
    await page.locator('#search').fill('不存在'); assert.ok(await page.locator('.empty').isVisible());
    await page.locator('#clear').click(); assert.equal(await page.locator('.task:visible').count(), 3);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'search');
    await page.locator('#empty-toggle').click(); assert.ok(await page.locator('.empty').isVisible());
    await page.locator('#empty-toggle').click();
    await page.locator('[data-demo="次操作"]').click();
    assert.ok((await page.locator('#control-state').textContent()).includes('次操作'));
    results.checks.push('keyboard-radio', 'dialog-containment-and-return', 'search-empty-clear-return', 'control-feedback');

    // Synthetic IME events validate guards, not real operating-system input methods.
    await page.locator('#search').evaluate(el => {
      el.dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true}));
      el.value = 'not-final'; el.dispatchEvent(new InputEvent('input', {bubbles: true, isComposing: true}));
    });
    assert.equal(await page.locator('.task:visible').count(), 3, 'Do not filter incomplete IME composition');
    await page.locator('#search').evaluate(el => {
      el.value = '页面'; el.dispatchEvent(new CompositionEvent('compositionend', {bubbles: true}));
    });
    assert.equal(await page.locator('.task:visible').count(), 1);
    await page.locator('#search').fill('');
    results.checks.push('synthetic-ime-composition-guard');
    results.limitations.push('IME tests use synthetic events, not real OS composition or mobile keyboards.');

    // Negative controls: prove focus and compositing checks can fail instead of silently passing.
    const button = page.locator('[data-demo="主操作"]');
    await keyboardFocus(page, button);
    const suppress = await page.addStyleTag({content: '[data-demo="主操作"]:focus-visible {outline:none!important}'});
    await assert.rejects(() => focusRing(button, 'negative-focus'), /missing focus outline/);
    await suppress.evaluate(el => el.remove());
    const gradient = await page.addStyleTag({content: '[data-demo="主操作"] {background-image:linear-gradient(white,black)}'});
    await assert.rejects(() => sample(button), /Unsupported contrast context/);
    await gradient.evaluate(el => el.remove());
    results.checks.push('focus-and-compositing-negative-controls');

    if (evidence) {
      for (const theme of ['neutral', 'dark']) {
        await page.selectOption('#theme', theme); await page.selectOption('#material', 'liquid');
        await page.mouse.move(1, 1); await page.evaluate(() => document.activeElement.blur());
        for (const [name, width, height] of [['desktop', 1440, 1080], ['mobile', 390, 844]]) {
          await page.setViewportSize({width, height});
          await page.evaluate(() => { scrollTo(0, 0); });
          await page.screenshot({path: path.join(evidence, `${theme}-${name}.png`), fullPage: true});
        }
      }
    }
    await page.emulateMedia({reducedMotion: 'reduce'});
    assert.equal(await page.locator('#detail').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-transparency', value: 'reduce'}]});
    assert.equal(await page.locator('.aside').evaluate(el => getComputedStyle(el).backdropFilter), 'none');
    await cdp.send('Emulation.setEmulatedMedia', {features: []});
    await page.emulateMedia({forcedColors: 'active'});
    assert.equal(await page.locator('.aside').evaluate(el => getComputedStyle(el).backdropFilter), 'none');
    await keyboardFocus(page, button);
    assert.ok(await button.evaluate(el => el.matches(':focus-visible') && parseFloat(getComputedStyle(el).outlineWidth) >= 2));
    results.checks.push('reduced-preferences-and-forced-colors-smoke');
    await reusableControls(browser);
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    results.consoleErrors = errors; results.externalRequests = requests;
    results.status = 'pass';
    results.summary = {layouts: results.layouts.length, textContrasts: results.text.length,
      minTextContrast: Math.min(...results.text.map(x => x.ratio)), keyboardFocusRings: results.focus.length,
      inputBoundaries: results.boundaries.length, minInputBoundary: Math.min(...results.boundaries.flatMap(x => [x.inside, x.outside])),
      checks: results.checks.length};
    save(); console.log(JSON.stringify({status: results.status, mode, browser: results.browser, ...results.summary, limitations: results.limitations}, null, 2));
  } catch (error) {
    results.status = failureStatus(error); results.error = error.stack || String(error); save();
    if (page && evidence) await page.screenshot({path: path.join(evidence, 'failure.png'), fullPage: true}).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => {
  results.status = failureStatus(error); results.error = error.stack || String(error); save();
  console.error(error); process.exitCode = exitCode(error);
});
