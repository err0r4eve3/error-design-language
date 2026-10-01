'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createReadList}=require('./fixtures/async-list.cjs');
const {caseIds,runCase,harness}=require('./contracts/async-list.cjs');
for (const id of caseIds) test(`read-list contract: ${id}`,()=>runCase(createReadList,id));

test('independent list instances do not cancel each other',async()=>{
  const left=harness(createReadList),right=harness(createReadList);
  const ctx={scope:'one',query:'same',sort:'id'};
  try {
    const a=left.model.load(ctx),b=right.model.load(ctx);
    right.requests[0].resolve({items:[{id:'right'}]}); await b;
    assert.equal(left.requests[0].signal.aborted,false); assert.equal(left.model.read().busy,true);
    left.requests[0].resolve({items:[{id:'left'}]}); await a;
    assert.equal(left.model.read().items[0].id,'left'); assert.equal(right.model.read().items[0].id,'right');
  } finally {left.model.dispose();right.model.dispose();}
});
test('synchronous transport errors also release busy state',async()=>{
  const model=createReadList(()=>{throw new Error('sync failure');});
  try {
    await model.load({scope:'one',query:'q',sort:'id'});
    assert.equal(model.read().error?.message,'sync failure'); assert.equal(model.read().busy,false);
  } finally {model.dispose();}
});

// Source mutations exist ONLY in this isolated VM. They never edit the reference file.
const source=fs.readFileSync(require.resolve('./fixtures/async-list.cjs'),'utf8');
function mutated(needle,replacement) {
  assert.equal(source.split(needle).length,2,'Mutation must target exactly one known statement.');
  const module={exports:{}};
  vm.runInNewContext(source.replace(needle,replacement),{module,structuredClone,AbortController,Error,TypeError},
    {filename:'mutated-async-list.cjs',timeout:1000});
  return module.exports.createReadList;
}
test('unmodified fixture also passes in the mutation VM',async()=>{
  const module={exports:{}};
  vm.runInNewContext(source,{module,structuredClone,AbortController,Error,TypeError},
    {filename:'unmodified-async-list.cjs',timeout:1000});
  for (const id of caseIds) await runCase(module.exports.createReadList,id);
});
const mutations=[
  ['unguarded-success','stale-success',"if (!owns(ticket)) return 'ignored'; // success ownership",'// missing success check'],
  ['unguarded-error','stale-error',"if (!owns(ticket)) return 'ignored'; // error ownership",'// missing error check'],
  ['unguarded-finalizer','stale-finalizer','if (owns(ticket)) { // finalizer ownership','if (true) { // broken finalizer'],
  ['key-only-aba','aba-identity','const owns = ticket => !disposed && active === ticket;',
    'const owns = ticket => !disposed && keyOf(ticket.context) === keyOf(state.context);'],
  ['scope-omitted','same-query-new-scope','JSON.stringify([c.scope, c.query, c.sort])','JSON.stringify([c.query, c.sort])'],
  ['sort-omitted','sort-invalidates-cursor','JSON.stringify([c.scope, c.query, c.sort])','JSON.stringify([c.scope, c.query])'],
  ['abort-name-swallowed','current-abort-name-is-not-cancellation',"if (!owns(ticket)) return 'ignored'; // error ownership",
    "if (!owns(ticket) || error.name === 'AbortError') return 'ignored'; // broken name check"],
  ['truthy-cursor','page-dedup-and-empty-cursor','state.cursor === null','!state.cursor'],
];
for (const [name,id,needle,replacement] of mutations) test(`negative control: ${name}`,async()=>{
  const factory=mutated(needle,replacement);
  await assert.rejects(runCase(factory,id),error=>error.code==='ERR_ASSERTION');
});
