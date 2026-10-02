import {createStore} from '#relay/store';
import {SCOPES,visibleItems,csv} from '#relay/domain';
import {icon,patch,restoreFocus} from '#relay/ui';
import * as view from '#relay/views';
const mounted=new WeakMap();
/** App shell owns DOM events and lifecycle only. Services are injected. */
export function mount(root,{service}={}) {
  if(!root||!service)throw new TypeError('A root and service are required');
  mounted.get(root)?.destroy();
  const store=createStore(service),lifetime=new AbortController(),urls=new Set();
  const find=s=>root.querySelector(s),on=(target,event,fn)=>target.addEventListener(event,fn,{signal:lifetime.signal});
  let activeView='overview',composing=false,noticeTimer=null,dead=false,lastNotice='',priorScope='northstar',firstSnapshot=true;
  for(const el of root.querySelectorAll('[data-icon]')){if(!el.querySelector(':scope > svg'))el.insertAdjacentHTML('afterbegin',icon(el.dataset.icon));}
  const createDialog=find('#create-dialog'),settingsDialog=find('#settings-dialog');
  const tableScroll=find('.table-scroll'),tableHelp=find('#table-scroll-help');
  function updateTableOverflow(){
    if(dead)return;
    const overflow=!tableScroll.hidden&&tableScroll.clientWidth>0&&tableScroll.scrollWidth>tableScroll.clientWidth+1;
    tableHelp.hidden=!overflow;
    tableScroll.tabIndex=overflow?0:-1;
    if(overflow)tableScroll.setAttribute('aria-describedby','table-scroll-help');
    else tableScroll.removeAttribute('aria-describedby');
  }
  // Observe the actual container AND table; sidebar/content changes need not resize the window.
  const tableObserver=typeof ResizeObserver==='function'?new ResizeObserver(updateTableOverflow):null;
  tableObserver?.observe(tableScroll);tableObserver?.observe(find('.instance-table'));
  if(!tableObserver)on(window,'resize',updateTableOverflow);
  function notify(text){if(!text)return;find('#notice').textContent=text;find('#notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{find('#notice').hidden=true;},4500);}
  function visibleSections(){find('#metrics').hidden=!['overview','billing'].includes(activeView);find('#overview-panels').hidden=activeView!=='overview';find('#collection').hidden=!['overview','instances'].includes(activeView);find('#billing').hidden=activeView!=='billing';find('#activity').hidden=activeView!=='activity';find('#inspector').hidden=!store.get().detailId||!['overview','instances'].includes(activeView);updateTableOverflow();}
  function setView(name){if(!['overview','instances','billing','activity'].includes(name))return;activeView=name;find('#page-title').textContent={overview:'项目总览',instances:'计算实例',billing:'用量与账单',activity:'操作记录'}[name];for(const n of root.querySelectorAll('.nav-item[data-view]')){n.classList.toggle('active',n.dataset.view===name);if(n.dataset.view===name)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');}visibleSections();}
  function render(){
    if(dead)return;const s=store.get(),focused=root.contains(document.activeElement)?document.activeElement.dataset.focus:null;
    patch(find('#metrics'),view.metrics(s));patch(find('#traffic'),view.chart(s));patch(find('#attention'),view.attention(s));patch(find('#instance-rows'),view.rows(s));patch(find('#selection-bar'),view.selection(s));patch(find('#inspector'),view.detail(s));patch(find('#billing'),view.billing(s));patch(find('#activity'),view.events(s));
    const items=visibleItems(s),selected=items.filter(r=>s.selected.includes(r.id));
    find('#select-all').checked=items.length>0&&items.length===selected.length;find('#select-all').indeterminate=selected.length>0&&selected.length<items.length;find('#select-all').disabled=!items.length;
    const stamp=s.snapshot?'快照 · '+new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s.snapshot.asOf)):'等待项目快照';find('.snapshot-label').textContent=stamp;find('.mobile-snapshot').textContent=stamp;
    find('#instance-count').textContent=s.snapshot?.items.length??'—';find('#nav-count').textContent=s.snapshot?.items.length??'—';
    find('#empty').hidden=s.loading||!s.snapshot||items.length>0;find('.table-scroll').hidden=!items.length;
    find('#reload').disabled=s.loading;find('#reload').setAttribute('aria-busy',String(s.loading));find('#new-instance').disabled=!s.snapshot;
    find('#load-error').textContent=s.loadError||'';find('#load-error').hidden=!s.loadError;
    find('#create-error').textContent=s.create.error||'';find('#create-error').hidden=!s.create.error;find('#create-submit').disabled=s.create.pending;find('#create-submit').setAttribute('aria-busy',String(s.create.pending));find('#create-submit').textContent=s.create.pending?'正在添加…':'添加实例';
    // Lock this form's submitted fields while pending; failure restores editing without reset.
    for(const input of find('#create-form').querySelectorAll('input,select'))input.disabled=s.create.pending;
    find('#sort-label').textContent=s.sort==='name'?'↕':s.sort==='cost-asc'?'↑':'↓';find('#cost-header').setAttribute('aria-sort',s.sort==='name'?'none':s.sort==='cost-asc'?'ascending':'descending');
    if(priorScope!==s.scope){priorScope=s.scope;find('#query').value='';find('#status-filter').value='all';if(createDialog.open)createDialog.close();}
    find('.workspace strong').textContent=SCOPES[s.scope];find('.workspace-avatar').textContent=SCOPES[s.scope][0];find('#create-form .dialog-heading .muted').textContent=`${SCOPES[s.scope]} / 计算`;
    if(s.notice!==lastNotice){lastNotice=s.notice;if(firstSnapshot&&s.snapshot)firstSnapshot=false;else notify(s.notice);}visibleSections();restoreFocus(root,focused);
  }
  const unsubscribe=store.subscribe(render);
  on(root,'click',async e=>{
    const button=e.target.closest('button');if(!button||!root.contains(button)||button.disabled)return;
    const d=button.dataset;
    if(d.view){setView(d.view);return;}
    if(d.days){store.setView({days:Number(d.days)});return;}
    if(d.inspect){setView('instances');store.inspect(d.inspect);find('#detail-heading')?.focus();find('#inspector').scrollIntoView({block:'nearest',behavior:'instant'});return;}
    if(d.read){await store.readStatus(d.read);return;}
    if(d.copy){try{await navigator.clipboard.writeText(d.copy);if(!dead)notify('实例编号已复制');}catch{if(!dead){notify(`复制受限，请手动选择编号：${d.copy}`);const el=find('#inspector dd bdi');if(el){const range=document.createRange();range.selectNodeContents(el);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}}}return;}
    switch(d.action){
      case 'theme':{const dark=root.dataset.theme!=='dark';root.dataset.theme=dark?'dark':'neutral';button.innerHTML=icon(dark?'sun':'moon');button.setAttribute('aria-label',`切换为${dark?'浅':'深'}色主题`);break;}
      case 'reload':await store.refresh();break;
      case 'new':store.cancelCreate();find('#create-form').reset();createDialog.showModal();find('#instance-name').focus();break;
      case 'close-create':store.cancelCreate();createDialog.close();find('#new-instance').focus();break;
      case 'settings':settingsDialog.showModal();break;
      case 'close-settings':settingsDialog.close();break;
      case 'fail-read':service.failNext('read');settingsDialog.close();notify('下一次读取将模拟失败。');break;
      case 'fail-create':service.failNext('create');settingsDialog.close();notify('下一次创建将模拟失败。');break;
      case 'close-detail':{const id=store.get().detailId;store.inspect(null);restoreFocus(root,`inspect-${id}`);break;}
      case 'sort':store.setView({sort:store.get().sort==='cost-asc'?'cost-desc':'cost-asc'});break;
      case 'clear-selection':store.selectVisible(false);find('#select-all').focus();break;
      case 'reset-filters':find('#query').value='';find('#status-filter').value='all';store.setView({query:'',filter:'all'});find('#query').focus();break;
      case 'export':{const s=store.get(),items=visibleItems(s).filter(r=>s.selected.includes(r.id));if(!items.length)return;try{const url=URL.createObjectURL(new Blob([csv(items)],{type:'text/csv;charset=utf-8'}));urls.add(url);const a=document.createElement('a');a.href=url;a.download=`relay-${s.scope}.csv`;a.click();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},0);notify(`已生成 ${items.length} 项实例的 CSV`);}catch{notify('导出未完成；选择已保留，请重试。');}break;}
    }
  });
  on(root,'change',e=>{const el=e.target;if(el.dataset.select)store.select(el.dataset.select,el.checked);if(el.id==='select-all')store.selectVisible(el.checked);if(el.id==='status-filter')store.setView({filter:el.value});if(el.id==='scope')void store.switchScope(el.value);});
  on(find('#query'),'compositionstart',()=>{composing=true;});on(find('#query'),'compositionend',()=>{composing=false;store.setView({query:find('#query').value});});on(find('#query'),'input',e=>{if(!composing&&!e.isComposing)store.setView({query:e.target.value});});
  on(createDialog,'cancel',()=>store.cancelCreate());
  on(find('#create-form'),'submit',async e=>{e.preventDefault();const form=e.currentTarget;if(store.get().create.pending||!form.reportValidity())return;const draft=Object.fromEntries(new FormData(form));const ok=await store.create(draft);if(ok&&!dead){createDialog.close();form.reset();find('#new-instance').focus();}});
  on(root,'keydown',e=>{if(e.defaultPrevented||e.isComposing||composing||e.key!=='Escape'||root.querySelector('dialog[open]')||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;const id=store.get().detailId;if(id){store.inspect(null);restoreFocus(root,`inspect-${id}`);e.preventDefault();}});
  find('#scope').value='northstar';find('#query').value='';find('#status-filter').value='all';setView('overview');render();void store.refresh();
  const instance={store,destroy(){if(dead)return;dead=true;tableObserver?.disconnect();clearTimeout(noticeTimer);lifetime.abort();unsubscribe();store.dispose();for(const url of urls)URL.revokeObjectURL(url);urls.clear();if(createDialog.open)createDialog.close();if(settingsDialog.open)settingsDialog.close();mounted.delete(root);}};
  mounted.set(root,instance);return instance;
}
