// sRGB-only helpers for the controlled sample, not a general CSS contrast engine.
'use strict';

function parseSRGB(value) {
  if (typeof value !== 'string') throw new TypeError('Expected an sRGB color string');
  if (value === 'transparent') return [0, 0, 0, 0];
  const match = value.trim().match(/^rgba?\(([^()]+)\)$/i);
  if (!match) throw new Error(`Unsupported color syntax: ${value}`);
  const parts = match[1].trim().split(/[\s,/]+/);
  if (parts.length < 3 || parts.length > 4) throw new Error(`Invalid sRGB color: ${value}`);
  const result = parts.map((part, i) => {
    if (!/^\d*\.?\d+%?$/.test(part)) throw new Error(`Invalid color channel: ${part}`);
    const limit = i === 3 ? 1 : 255;
    const n = Number.parseFloat(part) * (part.endsWith('%') ? limit / 100 : 1);
    if (!Number.isFinite(n) || n < 0 || n > limit) throw new Error(`Out-of-range channel: ${part}`);
    return n;
  });
  return [...result.slice(0, 3), result[3] ?? 1];
}

function validate(color) {
  if (!Array.isArray(color) || color.length !== 4 || color.some((v, i) =>
    !Number.isFinite(v) || v < 0 || v > (i === 3 ? 1 : 255))) {
    throw new TypeError('Expected [r, g, b, alpha] in sRGB ranges');
  }
}

function composite(foreground, background) {
  validate(foreground); validate(background);
  const alpha = foreground[3] + background[3] * (1 - foreground[3]);
  if (alpha === 0) return [0, 0, 0, 0];
  return [...foreground.slice(0, 3).map((v, i) =>
    (v * foreground[3] + background[i] * background[3] * (1 - foreground[3])) / alpha), alpha];
}

function luminance(color) {
  validate(color);
  if (color[3] !== 1) throw new Error('Composite onto an opaque background before measuring');
  return color.slice(0, 3).map(v => v / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrastRatio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

module.exports = {parseSRGB, composite, luminance, contrastRatio};
