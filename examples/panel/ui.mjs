export const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 server:'M4 4h16v6H4z M4 14h16v6H4z M7 7h.01 M7 17h.01 M11 7h6 M11 17h6',
 pulse:'M3 12h4l3-7 4 14 3-7h4',bill:'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
 clock:'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
 arrow:'M5 12h14 M13 6l6 6-6 6',up:'M7 17 17 7 M7 7h10v10',down:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',
 refresh:'M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 13 3 M18 18A8 8 0 0 1 5 15',
 plus:'M12 5v14 M5 12h14',search:'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 close:'M6 6l12 12 M18 6 6 18',sun:'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 moon:'M20.5 13a8.5 8.5 0 1 1-9.5-9.5A7 7 0 0 0 20.5 13z',help:'M9 9a3 3 0 1 1 4.5 2.6c-1 .5-1.5 1-1.5 2.4 M12 17h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
 wrench:'M14 5a5 5 0 0 0-6 6L3 16a3 3 0 0 0 4 4l5-5a5 5 0 0 0 7-6l-4 3-3-3z',
 check:'M5 12l4 4L19 6',pause:'M8 5v14 M16 5v14',chevron:'M9 5l7 7-7 7',mail:'M3 5h18v14H3z M3 5l9 7 9-7',
 globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
 copy:'M9 8h11v13H9z M15 8V3H4v13h5',menu:'M4 6h16 M4 12h16 M4 18h16'};
export function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.server}"/></svg>`;}
export function patch(node,html){if(node.innerHTML!==html)node.innerHTML=html;}
export function restoreFocus(root,key) {if(!key)return;const node=[...root.querySelectorAll('[data-focus]')].find(el=>el.dataset.focus===key);node?.focus({preventScroll:true});}
