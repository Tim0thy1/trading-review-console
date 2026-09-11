/* assets/trades.js — 调仓记录：动态渲染（数据源 data/ledger.json → trades）
   默认近 7 天；可切「显示全部」或按起始日期筛选；带滚动条。 */
(function(){
  var NOTE_STORE_KEY = 'trading-console-notes-v1';
  function notesLoad(){
    try{ return JSON.parse(localStorage.getItem(NOTE_STORE_KEY)) || {}; }catch(e){ return {}; }
  }
  function notesSave(notes){ try{ localStorage.setItem(NOTE_STORE_KEY, JSON.stringify(notes)); }catch(e){} }

  var MODE_7D = '7d', MODE_ALL = 'all';
  var mode = MODE_7D;
  var allTrades = [];

  function dateKey(timeStr){ /* '2026-09-08 09:39' → '2026-09-08' */ return String(timeStr||'').slice(0,10); }
  function dayOffset(offset){
    var d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-offset);
    var pad=function(n){return String(n).padStart(2,'0');};
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }

  function render(filterFrom){
    var body = document.getElementById('trade-body');
    if(!body) return;
    var tbody = allTrades.slice();
    var filtered, countLabel;
    // 归一：确定一个 from（YYYY-MM-DD，>=from 的保留）
    var from = null;
    if(filterFrom) from = filterFrom;
    else if(mode === MODE_7D) from = dayOffset(7);
    if(from){ filtered = tbody.filter(function(t){ return dateKey(t.time) >= from; }); }
    else { filtered = tbody; }
    countLabel = (mode === MODE_ALL && !filterFrom) ? ('全部 '+filtered.length+' 笔') : ('显示 '+filtered.length+' 笔');

    var html = '';
    filtered.forEach(function(t){
      var isBuy = (t.dir === '买');
      var key = 'note-tr-' + String(t.time).replace(/[^0-9]/g,'') + '-' + String(t.name||'');
      var noteVal = (notesLoad()[key]) || '';
      html += '<tr>'
        + '<td class="mono">'+t.time+'</td>'
        + '<td><span class="pill '+(isBuy?'g':'r')+'">'+(isBuy?'买入':'卖出')+'</span></td>'
        + '<td>'+t.name+'</td>'
        + '<td class="mono">'+t.px+'</td>'
        + '<td class="mono">'+(t.pos_bef||'—')+'% → '+(t.pos_aft||'—')+'%</td>'
        + '<td class="note-inline"><input data-key="'+key+'" placeholder="填写理由..."'
        + (noteVal?' value="'+noteVal.replace(/"/g,'&quot;')+'"':'') + '><span class="note-status" data-status="'+key+'"></span></td>'
        + '</tr>';
    });
    if(!html) html = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:18px">该范围内暂无调仓记录</td></tr>';
    body.innerHTML = html;
    var cnt = document.getElementById('tr-count');
    if(cnt) cnt.textContent = countLabel;
    bindEditors();
  }

  function bindEditors(){
    var notes = notesLoad();
    document.querySelectorAll('#trade-body input[data-key]').forEach(function(inp){
      if(inp.__bound) return; inp.__bound = true;
      var key = inp.getAttribute('data-key');
      var status = document.querySelector('[data-status="'+key+'"]');
      var flash = function(msg){
        if(!status) return;
        status.textContent = msg;
        clearTimeout(flash._t);
        flash._t = setTimeout(function(){ status.textContent=''; }, 1600);
      };
      inp.addEventListener('blur', function(){
        var v = inp.value.trim();
        var notes = notesLoad();
        if(v){ notes[key]=v; notesSave(notes); flash('已保存 ✓'); }
        else { delete notes[key]; notesSave(notes); }
      });
      inp.addEventListener('keydown', function(e){ if(e.key==='Enter') inp.blur(); });
    });
  }

  function refresh(filterFrom){
    var from = filterFrom || null;
    if(from){ mode=null; } 
    render(from);
    // 按钮高亮
    var b7=document.getElementById('tr-btn-7d'), ba=document.getElementById('tr-btn-all');
    if(b7 && ba){ b7.classList.toggle('on', !from && mode===MODE_7D); ba.classList.toggle('on', !from && mode===MODE_ALL); }
  }

  // 双源兜底：账本 trades ∪ 当日快照 recent_trades（东财直拉，字段映射对齐）。
  // 即便 gen_ledger 重建滞后，页面调仓流水也能显示到最新交易日。
  fetch('data/ledger.json', { cache:'no-store' })
    .then(function(r){ return r.json(); })
    .then(function(L){
      allTrades = (L && L.trades) || [];
      return fetch('live-snapshot.json', { cache:'no-store' }).then(function(r){ return r.json(); }).catch(function(){ return {}; });
    })
    .then(function(snap){
      var extra = (snap && snap.recent_trades) || [];
      var seen = {};
      allTrades.forEach(function(t){ seen[String(t.time)+'|'+String(t.name)+'|'+String(t.dir)] = true; });
      extra.forEach(function(t){
        var dir = (t.mmbz === '买') ? '买' : (t.mmbz === '卖') ? '卖' : t.mmbz;
        var key = String(t.time)+'|'+String(t.name)+'|'+dir;
        if(seen[key]) return;
        seen[key] = true;
        allTrades.push({ time:t.time, name:t.name, dir:dir, px:t.price, pos_bef:t.pos_bef||'—', pos_aft:t.pos_aft||'—' });
      });
      allTrades.sort(function(a,b){ return String(a.time) < String(b.time) ? 1 : (String(a.time) > String(b.time) ? -1 : 0); });
      document.getElementById('tr-btn-7d').addEventListener('click', function(){ mode=MODE_7D; refresh(null); });
      document.getElementById('tr-btn-all').addEventListener('click', function(){ mode=MODE_ALL; refresh(null); });
      var fi = document.getElementById('tr-from');
      fi.addEventListener('change', function(){ refresh(fi.value || null); });
      fi.value = dayOffset(7);
      refresh(null);
    })
    .catch(function(e){ if(window.console) console.warn('[trades] ledger 加载失败', e && e.message); });
})();