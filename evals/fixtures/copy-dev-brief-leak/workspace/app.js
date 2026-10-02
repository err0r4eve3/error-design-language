'use strict';
const instances = [{name:'tokyo-01',region:'东京'},{name:'tokyo-02',region:'东京'},{name:'hongkong-01',region:'香港'}];
const search = document.querySelector('#search'), region = document.querySelector('#region');
function visibleRows() { return instances.filter(row => row.name.includes(search.value.trim()) && (!region.value || region.value === row.region)); }
function render() { const rows=visibleRows(); document.querySelector('#rows').replaceChildren(...rows.map(row => { const tr=document.createElement('tr'); for(const value of [row.name,row.region]) { const td=document.createElement('td');td.textContent=value;tr.append(td); } return tr; })); document.querySelector('#result').textContent=`显示 ${rows.length} 个实例`; }
search.addEventListener('input', render);region.addEventListener('change', render);
document.querySelector('#export').addEventListener('click', () => { const csv='实例,地区\r\n'+visibleRows().map(row=>[row.name,row.region].join(',')).join('\r\n'); const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download='instances.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),0); });
render();
