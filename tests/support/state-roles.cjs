'use strict';
// Controlled sample tokens only, not a general CSS parser or WCAG audit.
const assert = require('node:assert/strict');
const {contrastRatio} = require('../color.cjs');
const MIN_SELECTION_SEPARATION = 1.15; // Internal regression floor, NOT WCAG.
function themeColors(css, theme) {
  if (!['neutral', 'dark'].includes(theme)) throw Error(`Unknown theme: ${theme}`);
  const base = css.match(/\[data-design="error"\]\s*\{([^}]+)\}/);
  const dark = css.match(/\[data-design="error"\]\[data-theme="dark"\]\s*\{([^}]+)\}/);
  if (!base || !dark) throw Error('Expected controlled neutral and dark token blocks');
  const values = {};
  for (const block of theme === 'dark' ? [base[1], dark[1]] : [base[1]]) {
    for (const [, name, hex] of block.matchAll(/--dl-([\w-]+):\s*#([\da-f]{6})\s*;/gi))
      values[name] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).concat(1);
  }
  return values;
}
function assertSelectionRoles(colors) {
  const measurements = [];
  function pair(a, b, minimum, purpose) {
    assert.ok(colors[a] && colors[b], `Missing controlled color: ${a}/${b}`);
    const ratio = contrastRatio(colors[a], colors[b]);
    assert.ok(ratio >= minimum, `${purpose}: ${a}/${b} ${ratio.toFixed(3)} < ${minimum}`);
    measurements.push({a, b, minimum, ratio, purpose});
  }
  // These surfaces compete inside this collection, unlike arbitrary semantic roles.
  for (const bg of ['surface', 'hover']) pair('selected', bg, MIN_SELECTION_SEPARATION, 'selection separation');
  for (const fg of ['selected-text', 'text', 'muted']) pair(fg, 'selected', 4.5, 'selected text');
  for (const bg of ['surface', 'selected']) pair('selected-indicator', bg, 3, 'selection boundary');
  return measurements;
}
module.exports = {MIN_SELECTION_SEPARATION, themeColors, assertSelectionRoles};
