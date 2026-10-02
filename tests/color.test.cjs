const test = require('node:test');
const assert = require('node:assert/strict');
const {parseSRGB, composite, luminance, contrastRatio} = require('./color.cjs');
const white = [255, 255, 255, 1], black = [0, 0, 0, 1];

test('parses computed and modern sRGB, alpha, and transparent', () => {
  assert.deepEqual(parseSRGB('rgb(38, 38, 38)'), [38, 38, 38, 1]);
  assert.deepEqual(parseSRGB('rgba(10, 20, 30, 0.5)'), [10, 20, 30, 0.5]);
  const percentage = parseSRGB('rgb(100% 0% 0% / 50%)');
  assert.ok(Math.abs(percentage[0] - 255) < 1e-10);
  assert.deepEqual(percentage.slice(1), [0, 0, 0.5]);
  assert.deepEqual(parseSRGB('transparent'), [0, 0, 0, 0]);
});
test('rejects unknown syntax and malformed channels instead of inventing RGB', () => {
  for (const value of ['color(srgb 1 0 0)', 'oklch(60% .2 20)', 'rgb(256 0 0)',
    'rgba(0,0,0,2)', 'rgb(0 0)', 'rgb(0 0 0 garbage)', 'rgb(0 0 0 / NaN)']) {
    assert.throws(() => parseSRGB(value), undefined, value);
  }
});
test('composites transparency over opaque and transparent backgrounds', () => {
  assert.deepEqual(composite([0, 0, 0, 0.5], white), [127.5, 127.5, 127.5, 1]);
  const result = composite([255, 0, 0, 0.5], [0, 0, 255, 0.5]);
  assert.deepEqual(result, [170, 0, 85, 0.75]);
  assert.deepEqual(composite([1, 2, 3, 0], [4, 5, 6, 0]), [0, 0, 0, 0]);
});
test('uses correct luminance endpoints and symmetric contrast', () => {
  assert.equal(luminance(black), 0); assert.equal(luminance(white), 1);
  assert.equal(contrastRatio(black, white), 21);
  assert.equal(contrastRatio(white, black), 21);
  assert.equal(contrastRatio(white, white), 1);
});
test('requires opaque colors for contrast', () => {
  assert.throws(() => contrastRatio([0, 0, 0, 0.5], white), /opaque/);
  assert.throws(() => composite([256, 0, 0, 1], white), /ranges/);
});
test('distinguishes the original input boundary from the corrected workspace pair', () => {
  const canvas = [244, 244, 244, 1], workspace = [237, 237, 237, 1];
  assert.ok(contrastRatio([144, 144, 144, 1], canvas) < 3);
  assert.ok(contrastRatio([136, 136, 136, 1], workspace) >= 3);
});
