import {PLANS,validateDraft,validateSnapshot} from '#relay/domain';
const row=(id,name,region,status,cents,transferGiB,cpu,memory,cpuLoad,daily,note='')=>({id,name,region,status,cents,os:'Debian 13',currency:'USD',transferGiB,quotaGiB:transferGiB===null?null:2048,cpu,memory,cpuLoad,daily,note});
export function seedSnapshot(scope='northstar') {
  const items=scope==='sandbox'?[row('lab-01','dev-playground','hk','running',800,28,1,2,7,[10,8,11,9,12,10,18])]:[
    row('hk-01','hk-gateway-01','hk','running',1600,384,2,4,23,[144,178,120,230,144,174,210]),
    row('hk-02','hk-api-02','hk','running',1600,256,2,4,41,[88,72,90,128,77,111,145]),
    row('tyo-01','tokyo-worker-01','tyo','running',2400,712,4,8,67,[230,290,270,345,288,305,407]),
    row('tyo-02','tokyo-edge-02','tyo','maintenance',1500,552,2,4,0,[110,128,154,120,181,296,256],'计划维护：宿主机升级。维护期间不应将读取成功理解为服务恢复。'),
    row('sg-01','sg-cache-01','sg','running',800,0,1,2,12,[0,0,0,0,0,0,0]),
    row('sg-02','sg-backup-01','sg','unknown',null,null,2,4,null,null,'尚未取得有效状态。此标记不代表故障；费用和流量也尚未读取。')];
  return {scope,asOf:'2026-10-02T05:00:00.000Z',items};
}
/** Local-only service: never fetches, persists, provisions, or charges. */
export function createDemoService({delay=420}={}) {
  const db=new Map();let sequence=0;
  const fail=new Set();
  const get=scope=>{if(!db.has(scope))db.set(scope,seedSnapshot(scope));return db.get(scope);};
  async function wait(signal) {
    signal?.throwIfAborted();
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(done,delay);
      function done(){signal?.removeEventListener('abort',abort);resolve();}
      function abort(){clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(signal.reason||new DOMException('Aborted','AbortError'));}
      signal?.addEventListener('abort',abort,{once:true});
    });
    signal?.throwIfAborted();
  }
  const maybeFail=kind=>{if(fail.delete(kind))throw new Error('模拟连接中断；原有内容已保留');};
  return {
    failNext(kind){if(!['read','create'].includes(kind))throw new Error('Unknown failure mode');fail.add(kind);},
    async list(scope,{signal}={}){await wait(signal);maybeFail('read');return validateSnapshot(get(scope),scope);},
    async create(scope,draft,{signal}={}) {
      const submitted=validateDraft(draft);await wait(signal);maybeFail('create');
      const data=get(scope);if(data.items.some(r=>r.name===submitted.name))throw new Error('此项目中已存在同名实例');
      const p=PLANS[submitted.plan];const item=row(`local-${++sequence}`,submitted.name,submitted.region,'running',p.cents,0,p.cpu,p.memory,0,Array(7).fill(0));
      data.items.push(item);return structuredClone(item);
    },
    async inspect(scope,id,{signal}={}){await wait(signal);maybeFail('read');const item=get(scope).items.find(r=>r.id===id);if(!item)throw new Error('实例不存在');if(item.status==='unknown'){item.status='running';item.note='本次状态已确认。未返回的费用与流量仍保持未知。';}return structuredClone(item);}
  };
}
