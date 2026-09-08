/* assets/theme.js — 主题跟随：读取工作台 localStorage 的 wb_theme_v1，同 origin 共享 */
(function(){
  try{
    var t = localStorage.getItem('wb_theme_v1') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    window.addEventListener('storage', function(e){
      if(e.key === 'wb_theme_v1') document.documentElement.setAttribute('data-theme', e.newValue || 'light');
    });
  }catch(e){}
})();