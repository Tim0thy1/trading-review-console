/* assets/forecast.js — 盘前预测模块：GitHub 同步 + 锁定 + 历史渲染 */
(function(){
  var REPO = 'Tim0thy1/trading-review-console';
  var FILE = 'data/forecast.json';
  var TOKEN_KEY = 'wb_token_v1';   /* 与交易工作台共用同一 token 存储 */

  function getToken(){ try{ return localStorage.getItem(TOKEN_KEY) || ''; }catch(e){ return ''; } }
  function todayStr(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function nowTime(){
    var d = new Date();
    return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }

  var forecasts = [];   /* [{date, mkt_dir, mkt_reason, hold_view, plan, mood, submitted_at, review:{...}}] */

  /* ---------- 数据加载 ---------- */
  async function loadLocalForecasts(){
    try{
      var r = await fetch('data/forecast.json', { cache:'no-store' });
      if(!r.ok) return null;
      var list = await r.json();
      return Array.isArray(list) ? list : null;
    }catch(e){ return null; }
  }
  async function loadForecasts(){
    var t = getToken();
    if(t){
      try{
        var res = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + FILE, {
          headers:{ 'Authorization':'token '+t, 'Accept':'application/vnd.github+json' },
          cache:'no-store'
        });
        if(res.status === 404){ await saveForecasts([]); return []; }
        if(!res.ok) throw new Error('HTTP '+res.status);
        var j = await res.json();
        return JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g,'')))));
      }catch(e){
        console.warn('forecast 从 GitHub 加载失败，回退本地:', e.message);
      }
    }
    /* 无 token 或 GitHub 拉取失败时，回退到本地 data/forecast.json，保证历史记录始终可见 */
    var local = await loadLocalForecasts();
    if(local) return local;
    if(window.console) console.warn('forecast 本地也无数据，返回空');
    return [];
  }

  async function saveForecasts(list){
    var t = getToken();
    if(!t) return false;
    try{
      /* 先拿 sha（更新已有文件必须带） */
      var sha = null;
      var r0 = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + FILE, {
        headers:{ 'Authorization':'token '+t, 'Accept':'application/vnd.github+json' }});
      if(r0.ok){ sha = (await r0.json()).sha; }
      var body = { message:'forecast: 更新盘前预测记录 ('+todayStr()+')', content: btoa(unescape(encodeURIComponent(JSON.stringify(list, null, 2)))), branch:'main' };
      if(sha) body.sha = sha;
      var res = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + FILE, {
        method:'PUT',
        headers:{ 'Authorization':'token '+t, 'Accept':'application/vnd.github+json', 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      });
      return res.ok;
    }catch(e){
      console.warn('forecast 保存失败:', e.message);
      return false;
    }
  }

  /* ---------- 表单交互 ---------- */
  document.querySelectorAll('.fc-seg').forEach(function(seg){
    seg.addEventListener('click', function(e){
      var btn = e.target.closest('button');
      if(!btn || seg.classList.contains('locked')) return;
      seg.querySelectorAll('button').forEach(function(b){ b.classList.remove('on'); });
      btn.classList.add('on');
    });
  });
  function segValue(id){
    var on = document.querySelector('#'+id+' button.on');
    return on ? on.getAttribute('data-v') : '';
  }

  /* ---------- 渲染 ---------- */
  function renderAll(){
    var today = todayStr();
    var rec = forecasts.find(function(f){ return f.date === today; });
    var statusBar = document.getElementById('fc-status-bar');
    var formPanel = document.getElementById('fc-form-panel');
    var lockedPanel = document.getElementById('fc-locked-panel');
    document.getElementById('fc-form-date').textContent = '('+today+' · 现在 '+nowTime()+')';

    /* 今日状态条 */
    var wd = new Date().getDay();
    if(wd === 0 || wd === 6){
      statusBar.innerHTML = '<strong>☀️ 今天是周末</strong>——休市日无需提交预测，好好休息。复盘和预案可以留给周一开盘前。';
    } else if(rec && !rec.review){
      statusBar.innerHTML = '<strong>✅ 已提交今日预测（'+rec.submitted_at+' 锁定）</strong>：大盘「'+rec.mkt_dir+'」· 情绪「'+(rec.mood||'未填')+'」。收盘后拉数据时自动对账评分。';
      formPanel.style.display = 'none';
      lockedPanel.style.display = 'block';
    } else if(rec && rec.review){
      statusBar.innerHTML = '<strong>📊 今日预测已对账：</strong>得分 <b>'+rec.review.score+'</b>/100 · 大盘「'+rec.mkt_dir+'」vs 实际「'+rec.review.actual_dir+'」。详见下方历史档案。';
      formPanel.style.display = 'none';
      lockedPanel.style.display = 'block';
    } else {
      var h = new Date().getHours();
      var tip = h >= 9 && h < 15 ? '<strong style="color:var(--red)">⚠️ 已开盘且尚未提交预测——今日将按缺卡计 0 分。</strong>' : '<strong>📝 今日尚未提交预测</strong>';
      statusBar.innerHTML = tip + '——预测的意义不在准不准，而在<b>逼自己盘前想清楚、盘中按计划执行</b>。';
      formPanel.style.display = 'block';
      lockedPanel.style.display = 'none';
    }

    /* KPI */
    var scored = forecasts.filter(function(f){ return f.review; });
    document.getElementById('fc-kpi-days').textContent = forecasts.length;
    document.getElementById('fc-kpi-avg').textContent = scored.length
      ? Math.round(scored.reduce(function(s,f){ return s+f.review.score; },0)/scored.length)
      : '—';
    var hits = scored.filter(function(f){ return f.review.dir_hit === true || f.review.dir_hit === 'part'; }).length;
    document.getElementById('fc-kpi-hit').textContent = scored.length ? Math.round(hits/scored.length*100)+'%' : '—';

    var streak = 0;
    for(var i=forecasts.length-1;i>=0;i--){
      var dPrev = i===0 ? null : forecasts[i-1].date;
      streak++;
      if(i>0){
        var a=new Date(forecasts[i].date), b=new Date(forecasts[i-1].date);
        var gapDays=(a-b)/86400000;
        var gapWorkdays=0;
        var cur=new Date(b);
        while(cur<a){ cur.setDate(cur.getDate()+1); var w=cur.getDay(); if(w!==0&&w!==6) gapWorkdays++; }
        if(gapWorkdays>1){ break; }
      }
    }
    document.getElementById('fc-kpi-streak').textContent = streak;

    /* 全景评估 · 盘前预测纪律面板 */
    var pDays = document.getElementById('pano-fc-days');
    if(pDays){
      pDays.textContent = forecasts.length;
      document.getElementById('pano-fc-avg').textContent = scored.length ? Math.round(scored.reduce(function(s,f){ return s+f.review.score; },0)/scored.length) : '—';
      document.getElementById('pano-fc-hit').textContent = scored.length ? Math.round(hits/scored.length*100)+'%' : '—';
      var withDisc = scored.filter(function(f){ return typeof f.review.discipline === 'number'; });
      document.getElementById('pano-fc-disc').textContent = withDisc.length ? (withDisc.reduce(function(s,f){return s+f.review.discipline;},0)/withDisc.length).toFixed(1) : '—';
      var v = document.getElementById('pano-fc-verdict');
      if(!forecasts.length){
        v.innerHTML = '<span style="color:var(--red)">尚未建立预测记录。</span>盘前预测是全景评估的"事前思考"维度——从下个交易日开始，每天开盘前花3分钟填写预测与预案，收盘自动对账。';
      } else {
        var avg = Math.round(scored.reduce(function(s,f){ return s+f.review.score; },0)/scored.length);
        var lvl = avg>=75?['强','var(--green)','预测质量高、预案可执行，继续保持']:avg>=55?['中','var(--accent2)','方向感尚可，重点提升关键价位的预判精度']:avg>0?['弱','var(--red)','预测与实际偏差大——先不求准，先把"有预案"这件事做到']:['待观察','var(--muted)','已开始记录，收盘对账后生成评估'];
        v.innerHTML = '当前评估：<b style="color:'+lvl[1]+'">'+lvl[0]+'</b>（均分 '+avg+'/100，样本 '+scored.length+' 天）。'+lvl[2]+
          (scored.some(function(f){return typeof f.review.discipline==='number'&&f.review.discipline<15;})?'<br><span style="color:var(--red)">⚠️ 存在计划外交易记录——盘中操作脱离了盘前预案，这是当前最大失分点。</span>':'');
      }
    }

    /* 历史表 */
    var tbody = document.getElementById('fc-history-body');
    if(!forecasts.length){
      tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--muted)">暂无记录——明早 9:15 前写下第一条盘前预测吧</td></tr>';
      return;
    }
    tbody.innerHTML = forecasts.slice().reverse().map(function(f){
      var dirCell = f.review
        ? esc(f.mkt_dir)+' → <b>'+esc(f.review.actual_dir)+'</b> '+(f.review.dir_hit===true?'<span class="fc-badge hit">命中</span>':f.review.dir_hit==='part'?'<span class="fc-badge part">相邻</span>':'<span class="fc-badge miss">反向</span>')
        : esc(f.mkt_dir)+' → <span style="color:var(--muted)">待收盘</span>';
      var scoreCell = f.review
        ? '<b class="mono" style="font-size:15px;color:'+(f.review.score>=70?'var(--green)':f.review.score>=40?'var(--accent2)':'var(--red)')+'">'+f.review.score+'</b>'
        : '<span style="color:var(--muted)">—</span>';
      return '<tr>'+
        '<td style="padding:8px;border-bottom:1px solid var(--rule);white-space:nowrap" class="mono">'+f.date+(f.weekend?' ☀️':'')+'</td>'+
        '<td style="padding:8px;border-bottom:1px solid var(--rule)">'+dirCell+'</td>'+
        '<td style="padding:8px;border-bottom:1px solid var(--rule);max-width:220px">'+esc(firstLine(f.hold_view))+(f.hold_view&&f.hold_view.indexOf('\\n')>=0?' …':'')+'</td>'+
        '<td style="padding:8px;border-bottom:1px solid var(--rule);max-width:220px;color:var(--muted)">'+esc(firstLine(f.plan))+(f.plan&&f.plan.indexOf('\\n')>=0?' …':'')+'</td>'+
        '<td style="text-align:center;padding:8px;border-bottom:1px solid var(--rule)">'+scoreCell+'</td>'+
        '<td style="padding:8px;border-bottom:1px solid var(--rule);font-size:12px;color:var(--muted);max-width:260px">'+(f.review?esc(f.review.comment):'<span style="color:var(--muted)">待收盘后生成</span>')+'</td>'+
      '</tr>';
    }).join('');
    if (typeof window.__applyForecastLimit === 'function') { try { window.__applyForecastLimit(); } catch(e){} }
  }
  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function firstLine(s){ s=(s||'').trim(); var i=s.indexOf('\\n'); return i>0?s.slice(0,i):s; }

  /* ---------- 提交 ---------- */
  var submitting = false;
  document.getElementById('fc-submit').addEventListener('click', async function(){
    if(submitting) return;
    var st = document.getElementById('fc-token-tip');
    var token = getToken();
    if(!token){
      st.textContent = '⚠️ 尚未配置 GitHub Token：请先在交易工作台侧边栏设置并保存 token（两处共用），保存后回到这里提交。';
      st.className = 'token-status err';
      return;
    }
    if(!segValue('fc-mkt-dir')){ st.textContent='请先选择①大盘预判'; st.className='token-status err'; return; }
    if(!document.getElementById('fc-hold-view').value.trim()){ st.textContent='请填写③持仓预判（哪怕写"持仓不动"）'; st.className='token-status err'; return; }
    if(!document.getElementById('fc-plan').value.trim()){ st.textContent='请填写④应对预案——这是本功能的核心'; st.className='token-status err'; return; }

    var wd = new Date().getDay();
    if(wd===0 || wd===6){ st.textContent='周末休市，无需提交'; st.className='token-status err'; return; }

    submitting = true;
    this.textContent = '⏳ 提交中…';
    var rec = {
      date: todayStr(),
      weekday: ['日','一','二','三','四','五','六'][wd],
      mkt_dir: segValue('fc-mkt-dir'),
      mkt_reason: document.getElementById('fc-mkt-reason').value.trim(),
      hold_view: document.getElementById('fc-hold-view').value.trim(),
      plan: document.getElementById('fc-plan').value.trim(),
      mood: segValue('fc-mood') || null,
      submitted_at: nowTime()
    };
    forecasts.push(rec);
    var ok = await saveForecasts(forecasts);
    submitting = false;
    this.textContent = '🔒 锁定并提交预测';
    if(ok){
      st.textContent=''; renderAll();
    }else{
      forecasts.pop();
      st.textContent = '❌ 保存失败（检查网络/token 权限），请重试';
      st.className = 'token-status err';
    }
  });

  loadForecasts().then(function(list){ forecasts = list; renderAll(); });
})();