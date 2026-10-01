'use strict';
// Reusable, deterministic behavior probes. Assertions only use the public adapter.
// No timers, network, browser, upstream library, or model invocation.
const assert = require('node:assert/strict');
const A = Object.freeze({scope:'account-a/session-1', query:'alpha', sort:'price-asc'});
const B = Object.freeze({...A, query:'beta'});
const ids = model => model.read().items.map(x => x.id);
const page = (id, nextCursor = null) => ({items:[{id}], nextCursor});

function harness(factory) {
  const requests = [];
  const loader = request => new Promise((resolve,reject) => {
    // Deliberately ignore abort: cancellation alone must not make the test pass.
    requests.push({...request, resolve, reject});
  });
  return {model:factory(loader), requests};
}
const cases = [
  ['initial-empty', async ({model,requests}) => {
    const done = model.load(A);
    assert.equal(model.read().hasData,false); assert.equal(model.read().phase,'loading');
    requests[0].resolve({items:[]}); await done;
    assert.equal(model.read().hasData,true); assert.equal(model.read().busy,false);
    assert.deepEqual(ids(model),[]); assert.equal(model.read().error,null);
  }],
  ['stale-success', async ({model,requests:r}) => {
    const a=model.load(A), b=model.load(B);
    assert.equal(r[0].signal.aborted,true);
    r[1].resolve(page('B')); await b;
    const before=model.read(); r[0].resolve(page('A')); await a;
    assert.deepEqual(model.read(),before);
  }],
  ['stale-error', async ({model,requests:r}) => {
    const a=model.load(A), b=model.load(B);
    r[1].resolve(page('B')); await b;
    const before=model.read(); r[0].reject(new Error('late A failure')); await a;
    assert.deepEqual(model.read(),before);
  }],
  ['stale-finalizer', async ({model,requests:r}) => {
    const a=model.load(A), b=model.load(B);
    r[0].resolve(page('A')); await a;
    assert.equal(model.read().busy,true); assert.equal(model.read().phase,'loading');
    assert.equal(model.read().hasData,false);
    r[1].resolve(page('B')); await b; assert.deepEqual(ids(model),['B']);
  }],
  ['aba-identity', async ({model,requests:r}) => {
    const first=model.load(A), middle=model.load(B), last=model.load(A);
    r[0].resolve(page('A-old')); await first;
    assert.equal(model.read().hasData,false); assert.equal(model.read().busy,true);
    r[2].resolve(page('A-new')); await last;
    r[1].reject(new Error('late B failure')); await middle;
    assert.deepEqual(ids(model),['A-new']); assert.equal(model.read().error,null);
  }],
  ['same-query-new-scope', async ({model,requests:r}) => {
    const initial=model.load(A); r[0].resolve(page('private-A','cursor')); await initial;
    const old=model.load(A), next=model.load({...A,scope:'account-b/session-1'});
    assert.equal(model.read().hasData,false); assert.deepEqual(ids(model),[]);
    assert.equal(model.read().cursor,null); assert.equal(model.read().dataContext,null);
    r[1].resolve(page('private-A-late')); await old;
    assert.deepEqual(ids(model),[]);
    r[2].resolve(page('private-B')); await next; assert.deepEqual(ids(model),['private-B']);
  }],
  ['same-account-new-session', async ({model,requests:r}) => {
    const a=model.load(A); r[0].resolve(page('before-permission-change')); await a;
    const b=model.load({...A,scope:'account-a/session-2'});
    assert.deepEqual(ids(model),[]); assert.equal(model.read().hasData,false);
    r[1].resolve(page('new-authorized-data')); await b;
  }],
  ['sort-invalidates-cursor', async ({model,requests:r}) => {
    const a=model.load(A); r[0].resolve(page('ascending','asc-cursor')); await a;
    const b=model.load({...A,sort:'price-desc'});
    assert.equal(model.read().cursor,null); assert.deepEqual(ids(model),[]);
    assert.equal(await model.loadMore(),'skipped'); assert.equal(r.length,2);
    r[1].resolve(page('descending')); await b;
  }],
  ['refresh-error-retains-snapshot', async ({model,requests:r}) => {
    const a=model.load(A); r[0].resolve(page('known','cursor')); await a;
    const refresh=model.load(A);
    assert.deepEqual(ids(model),['known']); assert.equal(model.read().phase,'refreshing');
    assert.deepEqual(model.read().dataContext,A);
    r[1].reject(new Error('refresh failed')); await refresh;
    assert.deepEqual(ids(model),['known']); assert.equal(model.read().error?.kind,'refresh');
    const retry=model.load(A); r[2].resolve(page('new')); await retry;
    assert.deepEqual(ids(model),['new']); assert.equal(model.read().error,null);
  }],
  ['page-dedup-and-empty-cursor', async ({model,requests:r}) => {
    const a=model.load(A); r[0].resolve(page('first','')); await a;
    const p=model.loadMore(), duplicate=model.loadMore();
    assert.equal(r.length,2); assert.equal(r[1].cursor,'');
    assert.equal(model.read().phase,'loadingMore');
    r[1].resolve(page('second')); await Promise.all([p,duplicate]);
    assert.deepEqual(ids(model),['first','second']);
    assert.equal(await model.loadMore(),'skipped'); assert.equal(r.length,2);
  }],
  ['page-error-retries-same-cursor', async ({model,requests:r}) => {
    const a=model.load(A); r[0].resolve(page('first','p2')); await a;
    const more=model.loadMore(); r[1].reject(new Error('page unavailable')); await more;
    assert.deepEqual(ids(model),['first']); assert.equal(model.read().error?.kind,'page');
    assert.equal(model.read().cursor,'p2'); assert.equal(model.read().busy,false);
    const retry=model.loadMore(); assert.equal(r[2].cursor,'p2');
    r[2].resolve(page('second')); await retry;
    assert.deepEqual(ids(model),['first','second']); assert.equal(model.read().error,null);
  }],
  ['stale-page-same-cursor-new-query', async ({model,requests:r}) => {
    const a=model.load(A); r[0].resolve(page('A','shared-cursor')); await a;
    const ap=model.loadMore(), b=model.load(B);
    r[2].resolve(page('B','shared-cursor')); await b;
    const bp=model.loadMore();
    r[1].resolve(page('A-page')); await ap;
    assert.deepEqual(ids(model),['B']); assert.equal(model.read().busy,true);
    r[3].resolve(page('B-page')); await bp;
    assert.deepEqual(ids(model),['B','B-page']);
  }],
  ['dispose-invalidates-completion', async ({model,requests:r}) => {
    const a=model.load(A); model.dispose(); const before=model.read();
    assert.equal(r[0].signal.aborted,true);
    r[0].resolve(page('must-not-return')); await a;
    assert.deepEqual(model.read(),before);
    assert.throws(()=>model.load(B),/disposed/);
  }],
  ['current-abort-name-is-not-cancellation', async ({model,requests:r}) => {
    const done=model.load(A); const error=new Error('transport rejected current request');
    error.name='AbortError'; r[0].reject(error); await done;
    assert.equal(r[0].signal.aborted,false);
    assert.equal(model.read().error?.kind,'initial'); assert.equal(model.read().busy,false);
  }],
  ['snapshot-isolation', async ({model,requests:r}) => {
    const context={...A}, done=model.load(context); context.query='external-change';
    assert.equal(r[0].context.query,'alpha');
    const data=page('original'); r[0].resolve(data); await done;
    data.items[0].id='changed-payload'; const copy=model.read(); copy.items[0].id='changed-reader';
    assert.deepEqual(ids(model),['original']); assert.deepEqual(model.read().context,A);
  }],
  ['invalid-current-payload', async ({model,requests:r}) => {
    const done=model.load(A); r[0].resolve({items:null}); await done;
    assert.equal(model.read().error?.kind,'initial'); assert.equal(model.read().hasData,false);
    assert.equal(model.read().busy,false);
  }],
];

async function runCase(factory, id) {
  const found=cases.find(([name])=>name===id);
  if (!found) throw new Error(`Unknown contract case: ${id}`);
  const h=harness(factory);
  try { await found[1](h); }
  finally { h.model.dispose(); }
}
module.exports={caseIds:cases.map(([id])=>id),runCase,harness};
