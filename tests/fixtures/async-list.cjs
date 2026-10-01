'use strict';
// Test reference model, NOT a production data client. No UI, cache, retries or writes.
// Reuse the application's existing query/router layer instead of importing this file.

/** @typedef {{scope:string, query:string, sort:string}} Context */
/** @typedef {{items:Array<{id:string}>, nextCursor?:string|null}} Page */
const keyOf = c => JSON.stringify([c.scope, c.query, c.sort]);
function copyContext(value) {
  if (!value || ['scope', 'query', 'sort'].some(k => typeof value[k] !== 'string'))
    throw new TypeError('Context requires scope, query and sort strings.');
  return Object.freeze({scope:value.scope, query:value.query, sort:value.sort});
}
function copyPage(value) {
  if (!value || !Array.isArray(value.items) || value.items.some(x => !x || typeof x.id !== 'string') ||
      (value.nextCursor != null && typeof value.nextCursor !== 'string'))
    throw new TypeError('Expected items with string IDs and a string/null cursor.');
  return structuredClone({items:value.items, nextCursor:value.nextCursor ?? null});
}

/**
 * @param {(request:{context:Context,cursor:string|null,signal:AbortSignal})=>Promise<Page>|Page} loadPage
 * @returns {{load:(context:Context)=>Promise<string>,loadMore:()=>Promise<string>,read:()=>object,dispose:()=>void}}
 * State contract: items are authoritative for context, not presentation placeholders.
 * Same-context refresh preserves data; changing context clears this model's snapshot.
 */
function createReadList(loadPage) {
  if (typeof loadPage !== 'function') throw new TypeError('loadPage must be a function.');
  let active = null;
  let disposed = false;
  const blank = () => ({context:null, dataContext:null, items:[], hasData:false,
    cursor:null, busy:false, phase:'idle', error:null});
  let state = blank();
  // Ticket identity distinguishes A -> B -> A and repeated refreshes of the same key.
  const owns = ticket => !disposed && active === ticket;

  function begin(context, append) {
    if (disposed) throw new Error('List is disposed.');
    const previous = active;
    const keep = state.hasData && keyOf(context) === keyOf(state.context);
    const ticket = {context, cursor:append ? state.cursor : null,
      controller:new AbortController(), done:null};
    active = ticket;
    state = {...(keep ? state : blank()), context, busy:true, error:null,
      phase:append ? 'loadingMore' : keep ? 'refreshing' : 'loading'};
    // Invalidate before abort: even a transport which ignores the signal cannot commit.
    previous?.controller.abort();
    ticket.done = (async () => {
      try {
        if (!owns(ticket)) return 'ignored';
        const result = await loadPage({context, cursor:ticket.cursor, signal:ticket.controller.signal});
        if (!owns(ticket)) return 'ignored'; // success ownership
        const page = copyPage(result);
        // Stable IDs merge overlap for this reference; real pagination follows its server contract.
        const items = append
          ? [...new Map([...state.items, ...page.items].map(item => [item.id,item])).values()]
          : page.items;
        state = {...state, items, hasData:true, dataContext:context,
          cursor:page.nextCursor, error:null};
        return 'committed';
      } catch (error) {
        if (!owns(ticket)) return 'ignored'; // error ownership
        // A current error is not suppressed merely because its name is AbortError.
        state = {...state, error:{kind:append ? 'page' : keep ? 'refresh' : 'initial',
          message:error instanceof Error ? error.message : String(error)}};
        return 'failed';
      } finally {
        if (owns(ticket)) { // finalizer ownership
          state = {...state, busy:false, phase:'idle'};
          active = null;
        }
      }
    })();
    return ticket.done;
  }

  return {
    load(context) { return begin(copyContext(context), false); },
    loadMore() {
      if (disposed) throw new Error('List is disposed.');
      if (active) return state.phase === 'loadingMore' ? active.done : Promise.resolve('skipped');
      if (!state.hasData || state.cursor === null) return Promise.resolve('skipped');
      return begin(state.context, true);
    },
    read() { return structuredClone({...state, disposed}); },
    dispose() {
      if (disposed) return;
      disposed = true;
      const previous = active;
      active = null;
      state = blank();
      previous?.controller.abort();
    },
  };
}
module.exports = {createReadList};
