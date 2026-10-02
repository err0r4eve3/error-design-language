'use strict';
// Exercise the real presentation modules with valid DTOs, not replacement page text.
const test = require('node:test');
const assert = require('node:assert/strict');
const modules = Promise.all(['domain', 'service', 'views'].map(name => import('../examples/panel/' + name + '.mjs')));
async function state(change = () => {}) {
  const [domain, service, views] = await modules;
  const raw = service.seedSnapshot();
  change(raw);
  return {views, s: {snapshot: domain.validateSnapshot(raw, 'northstar'), query: '', filter: 'all', sort: 'name', selected: raw.items.map(r => r.id), detailId: raw.items[0]?.id ?? null, reading: [], readErrors: {}}};
}
const total = html => html.match(/class="bill-total"[^>]*>(.*?)<\/strong>/s)?.[1];
const note = html => html.match(/class="detail-note"[^>]*>(.*?)<\/p>/s)?.[1];

test('all unknown prices remain unknown across metric, bill, selection, row and detail', async () => {
  const {s, views: v} = await state(raw => raw.items.forEach(r => {r.cents = null;}));
  assert.equal(total(v.billing(s)), '未读取');
  for (const html of [v.metrics(s), v.billing(s), v.selection(s), v.rows(s), v.detail(s)]) assert.doesNotMatch(html, /\$0\.00/);
  assert.match(v.metrics(s), /0\/6 台有价格/);
  assert.match(v.billing(s), /0\/6 台有价格/);
  assert.match(v.selection(s), /已知月费 未读取/);
});

test('confirmed zero is a real amount in all price views, including selection and detail', async () => {
  const {s, views: v} = await state(raw => raw.items.forEach(r => {r.cents = 0;}));
  assert.equal(total(v.billing(s)), '$0.00');
  assert.match(v.metrics(s), /0\.00/);
  for (const html of [v.billing(s), v.selection(s), v.rows(s), v.detail(s)]) assert.match(html, /\$0\.00/);
  assert.match(v.billing(s), /6\/6 台有价格/);
});

test('partial price coverage shows known subtotal without treating unknown as zero', async () => {
  const {s, views: v} = await state(raw => raw.items.forEach((r, i) => {r.cents = i === 0 ? 1600 : null;}));
  assert.equal(total(v.billing(s)), '$16.00');
  for (const html of [v.metrics(s), v.billing(s)]) assert.match(html, /1\/6 台有价格/);
  assert.match(v.billing(s), /已知合计/);
  assert.match(v.selection(s), /已知月费 \$16\.00/);
  assert.match(v.selection(s), /1\/6 项有价格/);
});

test('empty project is distinct from unknown prices and confirmed zero', async () => {
  const {s, views: v} = await state(raw => {raw.items = [];});
  assert.equal(total(v.billing(s)), '暂无实例');
  assert.match(v.metrics(s), /暂无实例/);
  assert.doesNotMatch(v.billing(s), /\$0\.00|未读取<\/strong>/);
});

test('no snapshot stays a loading state rather than an empty or zero-valued project', async () => {
  const {s, views: v} = await state(); s.snapshot = null;
  for (const html of [v.metrics(s), v.billing(s)]) {
    assert.match(html, /等待项目数据/);
    assert.doesNotMatch(html, /暂无实例|\$0\.00/);
  }
});

test('blank or whitespace-only notes never manufacture operational status', async () => {
  for (const status of ['running', 'stopped', 'unknown', 'maintenance']) {
    for (const blank of ['', ' \n\t ']) {
      const {s, views: v} = await state(raw => {raw.items[0].status = status; raw.items[0].note = blank;});
      assert.equal(note(v.detail(s)), '未提供状态说明。');
      assert.match(v.detail(s), new RegExp('class="state state-' + status + '"'));
      if (['maintenance', 'unknown'].includes(status)) assert.match(v.attention(s), /未提供状态说明。/);
    }
  }
});

test('attention and detail share supplied explanations, escaping markup without adding causes', async () => {
  for (const status of ['maintenance', 'unknown']) {
    const supplied = '网络设备维护，恢复时间未提供。<img src=x onerror=alert(1)>';
    const {s, views: v} = await state(raw => {raw.items = [raw.items[0]]; raw.items[0].status = status; raw.items[0].note = supplied;});
    for (const html of [v.attention(s), v.detail(s)]) {
      assert.match(html, /网络设备维护，恢复时间未提供。&lt;img/);
      assert.doesNotMatch(html, /<img|宿主机升级|等待恢复|计划维护/);
    }
  }
});

test('mobile summary is a noninteractive visual duplicate derived from the same row facts', async () => {
  const {s, views: v} = await state(raw => {raw.items[0].cents = 0;});
  for (const r of s.snapshot.items) {
    const single = {...s, snapshot: {...s.snapshot, items: [r]}};
    const html = v.rows(single);
    const duplicate = html.match(/<span class="mobile-record-summary" aria-hidden="true">(.*?)<\/span>\s*<\/th>/s)?.[1];
    assert.ok(duplicate, r.id);
    assert.match(duplicate, new RegExp('state-' + r.status));
    assert.ok(duplicate.includes(r.cents === null ? '未读取' : '$' + (r.cents / 100).toFixed(2)));
    assert.doesNotMatch(duplicate, /<(button|input|a)\b/);
    assert.match(html, /<td class="numeric">/); // Complete accessible comparison columns remain.
  }
});
