'use strict';
document.querySelector('#theme').onclick = () => { const root = document.documentElement; root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; };
document.querySelector('#selection').onclick = event => { const button = event.currentTarget; button.setAttribute('aria-pressed', button.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); };
document.querySelector('#create').onclick = () => { document.querySelector('#message').textContent = '已新建本地演示实例，刷新会恢复。'; };
