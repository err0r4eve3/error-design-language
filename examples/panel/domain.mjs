/** Pure domain rules. Monetary values are integer USD cents; transfer uses GiB. */
export const STATES = Object.freeze({running:'运行中', maintenance:'维护中', unknown:'待确认', stopped:'已停止'});
export const REGIONS = Object.freeze({hk:'香港', tyo:'东京', sg:'新加坡'});
export const PLANS = Object.freeze({nano:{cpu:1,memory:2,cents:800},standard:{cpu:2,memory:4,cents:1200},compute:{cpu:4,memory:8,cents:2400}});
export const SCOPES = Object.freeze({northstar:'Northstar', sandbox:'Sandbox'});
export const DAYS = Object.freeze(['09/26','09/27','09/28','09/29','09/30','10/01','10/02']);
export class ContractError extends Error { constructor(message) { super(message); this.name='ContractError'; } }
const assert = (ok, text) => {if (!ok) throw new ContractError(text);};
const numberOrNull = (v, integer=false) => v === null || (Number.isFinite(v) && v >= 0 && (!integer || Number.isSafeInteger(v)));
export function validateSnapshot(raw, expectedScope) {
  assert(raw && raw.scope === expectedScope && Object.hasOwn(SCOPES,raw.scope),'项目标识不一致');
  assert(typeof raw.asOf==='string' && Number.isFinite(Date.parse(raw.asOf)),'缺少数据时间');
  assert(Array.isArray(raw.items) && raw.items.length<=10000,'无效实例列表');
  const ids=new Set();
  for(const r of raw.items) {
    assert(r && typeof r.id==='string' && /^[a-z0-9-]{1,64}$/.test(r.id) && !ids.has(r.id),'实例标识无效或重复');ids.add(r.id);
    assert(typeof r.name==='string' && r.name.trim() && r.name.length<=80,'实例名称无效');
    assert(Object.hasOwn(STATES,r.status) && Object.hasOwn(REGIONS,r.region),'未知状态或地域');
    assert(r.currency==='USD' && numberOrNull(r.cents,true),'费用必须是USD整数分或null');
    for(const k of ['transferGiB','quotaGiB','cpuLoad']) assert(numberOrNull(r[k]),`无效字段 ${k}`);
    assert(r.cpuLoad===null || r.cpuLoad<=100,'CPU超出范围');
    assert(Number.isSafeInteger(r.cpu) && r.cpu>0 && Number.isSafeInteger(r.memory) && r.memory>0,'规格无效');
    assert(r.daily===null || (Array.isArray(r.daily) && r.daily.length===DAYS.length && r.daily.every(n=>numberOrNull(n)&&n!==null)), '日用量缺失或无效');
    assert(typeof r.os==='string' && r.os.length<=60,'系统名称无效');
    assert(typeof r.note==='string' && r.note.length<=500,'状态说明无效');
  }
  return structuredClone(raw);
}
export function summarize(items) {
  const sum = key => {const known=items.filter(r=>r[key]!==null);return {value:known.reduce((n,r)=>n+r[key],0),known:known.length,total:items.length};};
  return {running:items.filter(r=>r.status==='running').length, total:items.length, cost:sum('cents'),transfer:sum('transferGiB'),quota:sum('quotaGiB')};
}
export function chartData(items, days=7) {
  const known=items.filter(r=>r.daily!==null);
  return {known:known.length,total:items.length,points:DAYS.map((day,i)=>({day,value:known.reduce((n,r)=>n+r.daily[i],0)})).slice(-days)};
}
export function visibleItems(state) {
  const q=state.query.trim().toLocaleLowerCase();
  return [...(state.snapshot?.items||[])].filter(r=>(state.filter==='all'||r.status===state.filter) && (!q||`${r.name} ${r.id} ${REGIONS[r.region]}`.toLocaleLowerCase().includes(q)))
    .sort((a,b)=>{if(state.sort==='name')return a.name.localeCompare(b.name,'en');if(a.cents===null)return b.cents===null?a.id.localeCompare(b.id):1;if(b.cents===null)return -1;return (state.sort==='cost-desc'?-1:1)*(a.cents-b.cents)||a.id.localeCompare(b.id);});
}
export function validateDraft(draft) {
  const name=String(draft.name||'').trim();
  if(!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,39}$/.test(name))throw new ContractError('名称须为2–40位字母、数字或连字符');
  if(!Object.hasOwn(REGIONS,draft.region)||!Object.hasOwn(PLANS,draft.plan))throw new ContractError('请选择有效地域与规格');
  return {name,region:draft.region,plan:draft.plan};
}
export const money = cents => cents===null?'未读取':(cents/100).toFixed(2);
export const transfer = gib => gib===null?'未读取':gib>=1024?`${(gib/1024).toFixed(2)} TiB`:`${gib.toFixed(gib%1?1:0)} GiB`;
export function csv(items) {
  const cell=v=>`"${String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')}"`;
  return '\uFEFF'+[['ID','名称','地域','状态','月费 USD','出站 GiB'],...items.map(r=>[r.id,r.name,REGIONS[r.region],STATES[r.status],r.cents===null?'':money(r.cents),r.transferGiB])].map(r=>r.map(cell).join(',')).join('\r\n');
}
