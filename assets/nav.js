/* assets/nav.js — 修炼手记折叠 + 导航抽屉 */
/* 修炼手记折叠：默认只显示最新一条，展开后限高带滚动条 */
function toggleJournal(){
  var j = document.getElementById('realmJournal');
  var b = document.getElementById('journalToggle');
  if(!j || !b) return;
  var collapsed = j.classList.contains('collapsed');
  j.classList.toggle('collapsed', collapsed);   /* 展开时移除 collapsed */
  j.classList.toggle('expanded', collapsed);    /* 展开时加 expanded → 限高滚动 */
  var n = j.querySelectorAll('.rs-dim').length;
  b.textContent = collapsed ? ('收起 (' + n + '条 ↕)') : ('展开全部 (' + n + '条 ▼)');
}

/* 导航抽屉：默认收起，点击汉堡按钮拉出；点击遮罩/关闭按钮/选中菜单后收起 */
(function(){
  var burger = document.getElementById('nav-burger');
  var sidebar = document.getElementById('sidebar');
  var mask = document.getElementById('nav-mask');
  var closeBtn = document.getElementById('side-close');
  function setOpen(open){
    sidebar.classList.toggle('open', open);
    mask.classList.toggle('show', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  burger.addEventListener('click', function(){ setOpen(!sidebar.classList.contains('open')); });
  closeBtn.addEventListener('click', function(){ setOpen(false); });
  mask.addEventListener('click', function(){ setOpen(false); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') setOpen(false); });
  /* 点击菜单项后自动收起（移动端体验） */
  document.querySelectorAll('.nav-item').forEach(function(item){
    item.addEventListener('click', function(){ setOpen(false); });
  });
})();