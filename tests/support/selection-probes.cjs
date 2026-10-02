'use strict';
const assert = require('node:assert/strict');
const {parseSRGB, contrastRatio} = require('../color.cjs');
const {MIN_SELECTION_SEPARATION} = require('./state-roles.cjs');

async function selectionAppearance(page, sampleContrast) {
  const row = id => page.locator(`[data-id="${id}"]`);
  await page.setViewportSize({width:1440, height:1000});
  for (const theme of ['neutral', 'dark']) {
    await page.selectOption('#theme', theme);
    await row('demo-01').locator('input').check();
    await row('demo-02').locator('[data-detail]').click();
    const colors = await page.locator('#records').evaluate(el => {
      const css = id => getComputedStyle(el.querySelector(`[data-id="${id}"]`));
      const effective = id => {
        for (let p = el.querySelector(`[data-id="${id}"]`); p; p = p.parentElement) {
          const color = getComputedStyle(p).backgroundColor;
          if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
        }
        throw Error('No opaque row background');
      };
      const cell = el.querySelector('[data-id="demo-01"] td');
      const selected = getComputedStyle(cell);
      return {selected:css('demo-01').backgroundColor, even:effective('demo-02'), odd:effective('demo-03'),
        line:selected.borderTopColor, lineWidth:parseFloat(selected.borderTopWidth), lineStyle:selected.borderTopStyle};
    });
    assert.equal(colors.even, colors.odd, 'Static rows must not borrow the hover fill as stripes');
    assert.ok(contrastRatio(parseSRGB(colors.selected), parseSRGB(colors.even)) >= MIN_SELECTION_SEPARATION);
    assert.ok(colors.lineWidth >= 1 && colors.lineStyle !== 'none');
    assert.ok(contrastRatio(parseSRGB(colors.line), parseSRGB(colors.selected)) >= 3);
    assert.ok(await row('demo-01').locator('input').isChecked());
    assert.equal(await row('demo-02').getAttribute('data-selected'), 'false');
    assert.equal(await row('demo-02').getAttribute('data-inspected'), 'true');
    await row('demo-01').locator('[data-detail]').hover();
    assert.equal(await row('demo-01').evaluate(el => getComputedStyle(el).backgroundColor), colors.selected);
    for (const selector of ['[data-id="demo-01"] th', '[data-id="demo-01"] small', '[data-id="demo-01"] td .dl-collection-state'])
      await sampleContrast(page, selector, theme + '-selected');
    await page.emulateMedia({forcedColors:'active'});
    const border = await row('demo-01').locator('td').first().evaluate(el => {
      const s = getComputedStyle(el); return {width:parseFloat(s.borderTopWidth), style:s.borderTopStyle, color:s.borderTopColor};
    });
    assert.ok(border.width >= 1 && border.style !== 'none' && border.color !== 'rgba(0, 0, 0, 0)');
    await page.emulateMedia({forcedColors:'none'});
    await page.locator('#close-detail').click();
    await page.locator('#clear-selection').click();
  }
}

async function toolbarExpansionProbe(page) {
  const first = page.locator('[data-id="demo-01"] input');
  assert.equal(await page.locator('#context-toolbar').getAttribute('data-selection-active'), 'false');
  assert.equal(await first.isChecked(), false);
  const geometry = () => first.evaluate(el => {
    const style = getComputedStyle(document.querySelector('#context-toolbar'));
    return {documentTop:el.getBoundingClientRect().top + scrollY, viewportTop:el.getBoundingClientRect().top,
      scrollY, paddingStart:style.paddingBlockStart, paddingEnd:style.paddingBlockEnd};
  });
  const before = await geometry();
  const style = await page.addStyleTag({content:'.dl-context-toolbar[data-selection-active="true"]{padding-block:40px!important}'});
  try {
    await first.check();
    // The precondition is an observed CSS effect, not elapsed wall-clock time.
    await page.waitForFunction(() => {
      const el = document.querySelector('#context-toolbar'), s = getComputedStyle(el);
      return el.dataset.selectionActive === 'true' && s.paddingBlockStart === '40px' && s.paddingBlockEnd === '40px';
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const after = await geometry();
    // check() may scroll the viewport. Document coordinates cannot hide expansion that way.
    assert.ok(after.documentTop - before.documentTop > 20,
      `Negative probe must detect toolbar expansion: ${JSON.stringify({before,after})}`);
    return {before, after};
  } finally {
    await style.evaluate(el => el.remove());
  }
}
module.exports = {selectionAppearance, toolbarExpansionProbe};
