import {SCOPES,STATES,validateSnapshot,validateDraft,visibleItems} from '#relay/domain';
/** Application state, shared by DOM integration and Node tests. No DOM or global singleton. */
export function createStore(service,{scope='northstar'}={}) {
  if(!Object.hasOwn(SCOPES,scope))throw new Error('Unknown scope');
  let state={scope,snapshot:null,loading:false,loadError:null,query:'',filter:'all',sort:'name',selected:[],detailId:null,days:7,
    create:{pending:false,error:null},reading:[],readErrors:{},notice:'',events:[]};
  let disposed=false,epoch=0,listSequence=0,writeRevision=0,createSequence=0;
  const eventLog=new Map();
  const listeners=new Set(),controllers=new Set(),reads=new Map();let listController=null,createController=null;
  const controller=()=>{const c=new AbortController();controllers.add(c);return c;};
  function emit(patch) {if(disposed)return;state={...state,...patch};for(const fn of [...listeners])fn();}
  function record(text){const events=[{id:`event-${++eventId}`,text},...state.events].slice(0,20);eventLog.set(state.scope,events);return events;}let eventId=0;
  function guard(){if(disposed)throw new Error('Store disposed');}
  const snapshot=()=>structuredClone(state);
  function mergeItem(item,expectedId) {
    if(item?.id!==expectedId)throw new Error('响应对象不一致');
    const items=state.snapshot.items.map(r=>r.id===item.id?item:r);
    return validateSnapshot({...state.snapshot,items},state.scope);
  }
  const api={
    get:snapshot,
    subscribe(fn){guard();listeners.add(fn);return ()=>listeners.delete(fn);},
    async refresh() {
      guard();listController?.abort();const c=controller();listController=c;
      const ticket=++listSequence,at=epoch,scope=state.scope,revision=writeRevision;
      emit({loading:true,loadError:null});
      try {
        const raw=await service.list(scope,{signal:c.signal});
        if(disposed||at!==epoch||ticket!==listSequence)return false;
        // A response captured before a local mutation must not delete the newer item.
        if(revision!==writeRevision){emit({notice:'刷新结果早于最新变更，已保留当前内容。'});return false;}
        const data=validateSnapshot(raw,scope),ids=new Set(data.items.map(r=>r.id));
        emit({snapshot:data,selected:state.selected.filter(id=>ids.has(id)),detailId:ids.has(state.detailId)?state.detailId:null,notice:`已读取 ${SCOPES[scope]}`});return true;
      } catch(e) {if(!disposed&&at===epoch&&ticket===listSequence&&!c.signal.aborted)emit({loadError:e.name==='ContractError'?'返回数据格式无效；未覆盖原有内容。':e.message});return false;}
      finally {controllers.delete(c);if(!disposed&&at===epoch&&ticket===listSequence)emit({loading:false});}
    },
    switchScope(next) {
      guard();if(!Object.hasOwn(SCOPES,next))throw new Error('Unknown scope');if(next===state.scope)return Promise.resolve(false);
      epoch++;listSequence++;createSequence++;for(const c of controllers)c.abort();controllers.clear();reads.clear();
      emit({scope:next,snapshot:null,loading:false,loadError:null,selected:[],detailId:null,query:'',filter:'all',reading:[],readErrors:{},events:eventLog.get(next)||[],notice:'',create:{pending:false,error:null}});
      return api.refresh();
    },
    setView(patch) {
      guard();const next={};
      if(patch.query!==undefined)next.query=String(patch.query).slice(0,120);
      if(patch.filter!==undefined){if(patch.filter!=='all'&&!Object.hasOwn(STATES,patch.filter))throw new Error('Unknown filter');next.filter=patch.filter;}
      if(patch.sort!==undefined){if(!['name','cost-asc','cost-desc'].includes(patch.sort))throw new Error('Unknown sort');next.sort=patch.sort;}
      if(patch.days!==undefined){if(![2,7].includes(patch.days))throw new Error('Unknown window');next.days=patch.days;}
      if(next.query!==undefined&&next.query!==state.query||next.filter!==undefined&&next.filter!==state.filter)next.selected=[];
      emit(next);
    },
    select(id,checked){guard();if(!visibleItems(state).some(r=>r.id===id))return;emit({selected:checked?[...new Set([...state.selected,id])]:state.selected.filter(x=>x!==id)});},
    selectVisible(checked){guard();emit({selected:checked?visibleItems(state).map(r=>r.id):[]});},
    inspect(id){guard();if(id!==null&&!state.snapshot?.items.some(r=>r.id===id))return;emit({detailId:id});},
    cancelCreate(){createController?.abort();createSequence++;emit({create:{pending:false,error:null}});},
    async create(draft) {
      guard();if(state.create.pending||!state.snapshot)return false;
      let submitted;try{submitted=validateDraft(draft);}catch(e){emit({create:{pending:false,error:e.message}});return false;}
      const c=controller();createController=c;const ticket=++createSequence,at=epoch,scope=state.scope;
      emit({create:{pending:true,error:null}});
      try {
        const item=await service.create(scope,submitted,{signal:c.signal});
        if(disposed||at!==epoch||ticket!==createSequence)return false;
        const data=validateSnapshot({...state.snapshot,items:[...state.snapshot.items,item]},scope);
        writeRevision++;emit({snapshot:data,notice:`${submitted.name} 已添加到 ${SCOPES[scope]}`,events:record(`创建 ${submitted.name}`)});return true;
      }catch(e){if(!disposed&&at===epoch&&ticket===createSequence&&!c.signal.aborted)emit({create:{pending:true,error:e.message}});return false;}
      finally{controllers.delete(c);if(!disposed&&at===epoch&&ticket===createSequence)emit({create:{...state.create,pending:false}});}
    },
    async readStatus(id) {
      guard();if(reads.has(id)||!state.snapshot?.items.some(r=>r.id===id))return false;
      const c=controller();reads.set(id,c);const at=epoch,scope=state.scope;
      emit({reading:[...reads.keys()],readErrors:{...state.readErrors,[id]:null}});
      try {
        const item=await service.inspect(scope,id,{signal:c.signal});
        if(disposed||at!==epoch||reads.get(id)!==c)return false;
        const data=mergeItem(item,id);writeRevision++;
        emit({snapshot:data,notice:`${item.name}：${STATES[item.status]}`,events:record(`读取 ${item.name} 的状态`)});return true;
      }catch(e){if(!disposed&&at===epoch&&!c.signal.aborted)emit({notice:`读取未完成：${e.message}`,readErrors:{...state.readErrors,[id]:e.message}});return false;}
      finally{controllers.delete(c);if(reads.get(id)===c){reads.delete(id);if(at===epoch)emit({reading:[...reads.keys()]});}}
    },
    dispose(){disposed=true;epoch++;for(const c of controllers)c.abort();controllers.clear();reads.clear();listeners.clear();}
  };return api;
}
