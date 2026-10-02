import {STATES,REGIONS,SCOPES,summarize,chartData,money,transfer,visibleItems} from '#relay/domain';
import {esc,icon} from '#relay/ui';
export function stateBadge(status){const symbol={running:'check',maintenance:'wrench',unknown:'help',stopped:'pause'}[status];return `<span class="state state-${status}">${icon(symbol)}${STATES[status]}</span>`;}
export function metrics(s){
  if(!s.snapshot)return Array.from({length:3},()=>'<div class="metric loading-card"><span>等待项目数据</span><strong>—</strong></div>').join('');
  const x=summarize(s.snapshot.items);
  return `<article class="metric metric-primary"><div class="metric-label">运行中的实例 ${icon('server')}</div><div class="metric-value">${x.running}<span>/ ${x.total}</span></div><div class="instance-track" aria-hidden="true">${s.snapshot.items.map(r=>`<i class="segment-${r.status}"></i>`).join('')}</div><div class="metric-foot">${s.snapshot.items.filter(r=>r.status==='maintenance').length} 台维护中<span>${s.snapshot.items.filter(r=>r.status==='unknown').length} 台待确认</span></div></article>
  <article class="metric"><div class="metric-label">本月出站流量 ${icon('up')}</div><div class="metric-value">${x.transfer.known?esc(transfer(x.transfer.value).split(' ')[0]):'—'}<span>${x.transfer.known?esc(transfer(x.transfer.value).split(' ')[1]):''}</span></div><div class="usage-track" aria-hidden="true"><i style="width:${x.quota.value?Math.min(100,x.transfer.value/x.quota.value*100):0}%"></i></div><div class="metric-foot">已知配额 ${x.quota.known?esc(transfer(x.quota.value)):'未读取'}<span>${x.transfer.known}/${x.total} 台上报</span></div></article>
  <article class="metric metric-cost"><div class="metric-label">已知月费 ${icon('bill')}</div><div class="metric-value"><small>$</small>${x.cost.known?money(x.cost.value):'—'}<span>USD</span></div><div class="cost-foot"><span>${x.cost.known}/${x.total} 台有价格 · 按月计费</span><button class="text-button" data-view="billing">费用明细 ${icon('arrow')}</button></div></article>`;
}
export function chart(s){
  const c=chartData(s.snapshot?.items||[],s.days),pts=c.points,max=Math.max(1,...pts.map(p=>p.value)),ceil=Math.ceil(max/200)*200;
  const coords=pts.map((p,i)=>[48+i*(650/(pts.length-1)),184-p.value/ceil*152]);
  const line=coords.map(([x,y])=>`${x},${y}`).join(' '),area=`48,184 ${line} 698,184`;
  return `<div class="section-heading"><div><h2>流量趋势</h2><p>${c.known}/${c.total} 台有日用量 · 每日累计</p></div><div class="segmented" role="group" aria-label="流量时间范围">${[7,2].map(n=>`<button data-days="${n}" aria-pressed="${s.days===n}">${n===7?'近7天':'本月'}</button>`).join('')}</div></div>
  <div class="chart-number">${c.known?esc(transfer(pts.reduce((n,p)=>n+p.value,0))):'—'}<span>${s.days===7?'近7天':'本月'}已知合计</span></div>
  <div class="chart-unit">GiB</div><div class="plot" role="img" aria-label="${s.days}天出站流量，单位GiB；可展开下方数据表查看数值"><svg viewBox="0 0 730 228" preserveAspectRatio="xMidYMid meet">
  <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".14"/><stop offset="1" stop-color="currentColor" stop-opacity=".015"/></linearGradient></defs>
  ${[0,1,2,3].map(i=>`<line x1="48" x2="698" y1="${184-i*50.666}" y2="${184-i*50.666}" class="grid-line"/><text x="0" y="${188-i*50.666}">${Math.round(ceil*i/3)}</text>`).join('')}
  ${c.known?`<polygon points="${area}" fill="url(#chart-fill)"/><polyline points="${line}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`:''}
  ${coords.map(([x,y],i)=>`${c.known?`<circle cx="${x}" cy="${y}" r="${i===pts.length-1?4.2:2.5}" fill="currentColor"/>`:''}<text x="${x}" y="218" text-anchor="middle">${pts[i].day}</text>`).join('')}</svg></div>
  <details class="chart-data"><summary>查看每日数据</summary><table><caption>已知实例的出站 GiB</caption><thead><tr>${pts.map(p=>`<th scope="col">${p.day}</th>`).join('')}</tr></thead><tbody><tr>${pts.map(p=>`<td>${c.known?p.value:'未读取'}</td>`).join('')}</tr></tbody></table></details>`;
}
export function attention(s){
  if(!s.snapshot)return '<div class="section-heading"><h2>需要关注</h2></div><p class="quiet-state">等待项目数据</p>';
  const items=s.snapshot?.items||[],pending=items.filter(r=>['maintenance','unknown'].includes(r.status));
  return `<div class="section-heading"><h2>需要关注</h2><span class="count-label">${pending.length} 项</span></div>${pending.length?pending.map(r=>`<article class="attention-item attention-${r.status}"><div class="attention-icon">${icon(r.status==='maintenance'?'wrench':'help')}</div><div class="attention-content"><h3>${r.status==='maintenance'?'计划维护':'状态待确认'}</h3><p>${esc(r.name)}</p><span>${r.status==='maintenance'?'宿主机升级，等待恢复':'未取得有效采样，不代表故障'}</span><button class="text-button" data-${r.status==='maintenance'?'inspect':'read'}="${r.id}" ${s.reading.includes(r.id)?'disabled':''}>${s.reading.includes(r.id)?'读取中…':r.status==='maintenance'?'查看维护':'重新读取'} ${icon('arrow')}</button>${s.readErrors?.[r.id]?`<p class="inline-error">${esc(s.readErrors[r.id])}</p>`:''}</div></article>`).join(''):'<div class="quiet-state">没有待处理的维护或未知状态。</div>'}`;
}
export function rows(s){return visibleItems(s).map(r=>`<tr data-row="${r.id}" ${s.detailId===r.id?'class="inspected"':''}>
<td class="select-cell"><input type="checkbox" data-select="${r.id}" data-focus="select-${r.id}" aria-label="选择 ${esc(r.name)}" ${s.selected.includes(r.id)?'checked':''}></td>
<th scope="row"><button class="record-name" data-inspect="${r.id}" data-focus="inspect-${r.id}" aria-expanded="${s.detailId===r.id}">${esc(r.name)}</button><span class="record-meta">${r.cpu} vCPU · ${r.memory} GiB</span></th>
<td><span>${REGIONS[r.region]}</span><span class="record-meta">${r.region.toUpperCase()} · KVM</span></td><td>${stateBadge(r.status)}</td>
<td class="cpu-cell">${r.cpuLoad===null?'<span class="muted">未读取</span>':`<span class="cpu-meter"><i style="width:${r.cpuLoad}%"></i></span><span class="tabular">${r.cpuLoad}%</span>`}</td>
<td class="numeric">${esc(transfer(r.transferGiB))}</td><td class="numeric">${r.cents===null?'<span class="muted">未读取</span>':`$${money(r.cents)}`}</td>
<td><button class="icon-button" data-inspect="${r.id}" data-focus="detail-${r.id}" aria-label="查看 ${esc(r.name)}">${icon('chevron')}</button></td></tr>`).join('');}
export function selection(s){const items=visibleItems(s),picked=items.filter(r=>s.selected.includes(r.id));const x=summarize(picked);
  return picked.length?`<strong>已选 ${picked.length} 项</strong><span class="selection-cost">已知月费 ${x.cost.known?'$'+money(x.cost.value):'未读取'} · ${x.cost.known}/${picked.length} 项有价格</span><div class="selection-actions"><button class="text-button" data-action="clear-selection">取消选择</button><button class="button small" data-action="export">${icon('down')}导出已选</button></div>`:
  `<span>显示 ${items.length} / ${s.snapshot?.items.length||0} 台实例</span><span class="muted selection-hint">${s.query||s.filter!=='all'?'筛选仅影响清单，不改变项目概览':'项目内全部实例'}</span>`;
}
export function detail(s){const r=s.snapshot?.items.find(x=>x.id===s.detailId);if(!r)return '';
  return `<div class="section-heading"><div><span class="muted">实例详情</span><h2 id="detail-heading" tabindex="-1">${esc(r.name)}</h2></div><button class="icon-button" data-action="close-detail" aria-label="关闭实例详情">${icon('close')}</button></div>
  <div class="detail-body">${stateBadge(r.status)}${!visibleItems(s).some(i=>i.id===r.id)?'<p class="field-help">当前实例不在筛选结果中。</p>':''}${s.readErrors?.[r.id]?`<p class="inline-error">${esc(s.readErrors[r.id])}</p>`:''}<p class="detail-note">${esc(r.note||'实例运行中。资源用量采用当前项目的已知快照。')}</p>
  <dl class="detail-grid"><div><dt>实例编号</dt><dd><bdi>${esc(r.id)}</bdi></dd></div><div><dt>地域</dt><dd>${REGIONS[r.region]}</dd></div><div><dt>计算规格</dt><dd>${r.cpu} vCPU / ${r.memory} GiB</dd></div><div><dt>系统</dt><dd>${esc(r.os)}</dd></div><div><dt>本月出站</dt><dd>${esc(transfer(r.transferGiB))}</dd></div><div><dt>月费 · USD</dt><dd>${r.cents===null?'未读取':`$${money(r.cents)}`}</dd></div></dl></div>
  <div class="detail-actions"><button class="button" data-read="${r.id}" ${s.reading.includes(r.id)?'disabled':''}>${icon('refresh')}${s.reading.includes(r.id)?'读取中…':'刷新状态'}</button><button class="button" data-copy="${r.id}">${icon('copy')}复制编号</button></div>`;
}
export function billing(s){if(!s.snapshot)return '<h2>月费明细</h2><p class="quiet-state">等待项目数据</p>';const items=s.snapshot?.items||[],x=summarize(items);return `<div class="section-heading"><div><h2>月费明细</h2><p>当前配置 · USD / 月，不含未读取项目</p></div><strong class="bill-total">$${money(x.cost.value)}</strong></div><div class="billing-rows">${items.map(r=>`<div><span>${esc(r.name)}</span><span>${r.cents===null?'未读取':`$${money(r.cents)}`}</span></div>`).join('')}</div><p class="muted">${x.cost.known}/${x.total} 台有价格。本页为演示项目，不是应付账单。</p>`;}
export function events(s){return `<div class="section-heading"><h2>操作记录</h2><span class="count-label">当前会话</span></div>${s.events.length?`<ol class="events-list">${s.events.map(e=>`<li>${icon('check')}<span>${esc(e.text)}</span></li>`).join('')}</ol>`:'<p class="quiet-state">本次会话尚无创建或状态读取操作。</p>'}`;}
