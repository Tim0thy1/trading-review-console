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
    var msg = 'forecast: 更新盘前预测记录 ('+todayStr()+')';
    var content = JSON.stringify(list, null, 2);
    var headers = { 'Authorization':'token '+t, 'Accept':'application/vnd.github+json', 'Content-Type':'application/json' };
    var base = 'https://api.github.com/repos/' + REPO;
    try{
      /* 读当前 main 头部提交：若它正好是同一天的上一条预测，就"改写(amend)"而非再堆一条 */
      var refRes = await fetch(base + '/git/ref/heads/main', { headers: headers, cache:'no-store' });
      if(!refRes.ok) throw new Error('ref '+refRes.status);
      var headSha = (await refRes.json()).object.sha;
      var headCommit = await (await fetch(base + '/git/commits/' + headSha, { headers: headers })).json();
      var isSameDayTip = (headCommit.message || '').indexOf(msg) === 0;

      if(isSameDayTip){
        /* 新建 blob + tree（仅替换 forecast.json），构造以旧提交父节点为父的新提交，覆写 ref */
        var blobRes = await fetch(base + '/git/blobs', { method:'POST', headers: headers, body: JSON.stringify({ content: content, encoding: 'utf-8' }) });
        var blobSha = (await blobRes.json()).sha;
        var treeRes = await fetch(base + '/git/trees', { method:'POST', headers: headers, body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: [{ path: FILE, mode: '100644', type: 'blob', sha: blobSha }] }) });
        var treeSha = (await treeRes.json()).sha;
        var parentSha = (headCommit.parents && headCommit.parents.length) ? headCommit.parents[0].sha : null;
        var comRes = await fetch(base + '/git/commits', { method:'POST', headers: headers, body: JSON.stringify({ message: msg, tree: treeSha, parents: parentSha ? [parentSha] : [] }) });
        var newCommitSha = (await comRes.json()).sha;
        /* 防竞态：覆写前再确认 ref 未被别处推进；被推进就走普通追加，宁可多一条也不丢别人的 */
        var curRes = await fetch(base + '/git/ref/heads/main', { headers: headers, cache:'no-store' });
        var curSha = (await curRes.json()).object.sha;
        if(curSha === headSha){
          var upd = await fetch(base + '/git/refs/heads/main', { method:'PATCH', headers: headers, body: JSON.stringify({ sha: newCommitSha, force: true }) });
          return upd.ok;
        }
        /* ref 已前进：落入下方普通追加路径 */
      }

      /* 普通追加：contents API 更新文件（头部非当天预测提交时走此路径） */
      var sha = null;
      var r0 = await fetch(base + '/contents/' + FILE, { headers: headers });
      if(r0.ok){ sha = (await r0.json()).sha; }
      var body = { message: msg, content: btoa(unescape(encodeURIComponent(content))), branch:'main' };
      if(sha) body.sha = sha;
      var res = await fetch(base + '/contents/' + FILE, {
        method:'PUT',
        headers: headers,
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
  function renderPanoDiscipline(){
    /* 全景评估 · 历史预测纪律面板（预测表单已移除，仅保留历史淡入淡出口径） */
    var pDays = document.getElementById('pano-fc-days');
    if(!pDays) return;
    var scored = forecasts.filter(function(f){ return f.review; });
    var hits = scored.filter(function(f){ return f.review.dir_hit === true || f.review.dir_hit === 'part'; }).length;
    pDays.textContent = forecasts.length;
    document.getElementById('pano-fc-avg').textContent = scored.length ? Math.round(scored.reduce(function(s,f){ return s+f.review.score; },0)/scored.length) : '—';
    document.getElementById('pano-fc-hit').textContent = scored.length ? Math.round(hits/scored.length*100)+'%' : '—';
    var withDisc = scored.filter(function(f){ return typeof f.review.discipline === 'number'; });
    document.getElementById('pano-fc-disc').textContent = withDisc.length ? (withDisc.reduce(function(s,f){return s+f.review.discipline;},0)/withDisc.length).toFixed(1) : '—';
    var v = document.getElementById('pano-fc-verdict');
    if(!forecasts.length){
      v.innerHTML = '<span style="color:var(--muted)">暂无历史预测纪律数据。当前以每笔持仓档案为准绳，清仓结算后看止盈止损是否守住开仓约定。</span>';
    } else {
      var avg = Math.round(scored.reduce(function(s,f){ return s+f.review.score; },0)/scored.length);
      var lvl = avg>=75?['中','var(--green)','历史方向判断稳定、预案可执行']:avg>=55?['中','var(--accent2)','方向感尚可，重点改为守住持仓档案的止盈止损']:avg>0?['弱','var(--red)','历史预测偏差大']:['待观察','var(--muted)','已开始记录，收盘对账后生成评估'];
      v.innerHTML = '历史评估：<b style="color:'+lvl[1]+'">'+lvl[0]+'</b>（均分 '+avg+'/100，样本 '+scored.length+' 天）。'+lvl[2];
    }
  }

  function renderAll(){
    var today = todayStr();
    var rec = forecasts.find(function(f){ return f.date === today; });
    var formPanel = document.getElementById('fc-form-panel');
    /* 预测表单模块已被移除（改为每笔持仓档案）。fy: 存在该模块才渲染表单，缺失时仅服务全景评估的历史纪律面板 */
    if(!formPanel){ renderPanoDiscipline(); return; }
    var statusBar = document.getElementById('fc-status-bar');
    var lockedPanel = document.getElementById('fc-locked-panel');
    document.getElementById('fc-form-date').textContent = '('+today+' · 现在 '+nowTime()+')';

    /* 今日盘中思路 / 盘后反思回显（存在则填入，供用户随时修改） */
    document.getElementById('fc-intraday-date').textContent = '('+today+')';
    document.getElementById('fc-reflect-date').textContent = '('+today+')';
    document.getElementById('fc-intraday').value = rec && rec.intraday ? rec.intraday : '';
    document.getElementById('fc-reflect').value = rec && rec.reflect ? rec.reflect : '';
    var iTip = document.getElementById('fc-intraday-tip');
    var rTip = document.getElementById('fc-reflect-tip');
    if(iTip) iTip.textContent = rec && rec.intraday ? '✅ 已保存（'+ (rec.intraday_at||'') +'）' : '';
    if(rTip) rTip.textContent = rec && rec.reflect ? '✅ 已保存（'+ (rec.reflect_at||'') +'）' : '';

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

    renderPanoDiscipline();

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
      var intraCell = f.intraday
        ? '<div style="color:var(--ink)">'+nlbr(f.intraday)+'</div>'
        : '<span style="color:var(--muted);font-size:12px">待记录</span>';
      var reflectCell = f.reflect
        ? '<div style="color:var(--ink)">'+nlbr(f.reflect)+'</div>'
        : '<span style="color:var(--muted);font-size:12px">待记录</span>';
      var reviewCell = f.review ? renderJudgeCell(f.review) : '<span style="color:var(--muted)">待收盘后生成</span>';
      return '<tr>'+
        '<td style="padding:8px 10px;border-bottom:1px solid var(--rule);white-space:nowrap;vertical-align:top" class="mono">'+f.date+(f.weekend?' ☀️':'')+'</td>'+
        '<td style="padding:8px 10px;border-bottom:1px solid var(--rule);max-width:240px;vertical-align:top;white-space:normal;word-break:break-word">'+
          '<div style="margin-bottom:4px"><span style="color:var(--muted);font-size:11px">大盘：</span>'+dirCell+'</div>'+
          (f.hold_view?'<div style="margin-bottom:4px"><span style="color:var(--muted);font-size:11px">持仓：</span>'+nlbr(f.hold_view)+'</div>':'')+
          (f.plan?'<div><span style="color:var(--muted);font-size:11px">预案：</span>'+nlbr(f.plan)+'</div>':'')+
        '</td>'+
        '<td style="padding:8px 10px;border-bottom:1px solid var(--rule);max-width:240px;vertical-align:top;white-space:normal;word-break:break-word">'+intraCell+'</td>'+
        '<td style="padding:8px 10px;border-bottom:1px solid var(--rule);max-width:240px;vertical-align:top;white-space:normal;word-break:break-word">'+reflectCell+'</td>'+
        '<td style="text-align:center;padding:8px 10px;border-bottom:1px solid var(--rule);vertical-align:top">'+scoreCell+'</td>'+
        '<td style="padding:8px 10px;border-bottom:1px solid var(--rule);font-size:12px;vertical-align:top;white-space:normal;word-break:break-word;max-width:340px">'+reviewCell+'</td>'+
      '</tr>';
    }).join('');
    if (typeof window.__applyForecastLimit === 'function') { try { window.__applyForecastLimit(); } catch(e){} }
  }
  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function firstLine(s){ s=(s||'').trim(); var i=s.indexOf('\n'); return i>0?s.slice(0,i):s; }
  function nlbr(s){ return esc(s||'').replace(/\n/g,'<br>'); }

  /* ---------- 对账点评：盘面实际 + AI判断(七维) ---------- */
  // 兼容三种结构：新(v2: actual + judge + overall) / 旧(comment)
  var __JUDGE_DEFS = [
    ['emotion','情绪纪律','冲动情绪'],
    ['plan_exec','计划执行','没有纪律'],
    ['chase','追涨杀跌','追涨杀跌'],
    ['position','仓位管理','容易满仓'],
    ['analysis','分析质量','—'],
    ['stop','止损止盈','没有纪律'],
    ['reflect','反思质量','—']
  ];
  var __JUDGE_LABEL = { emotion:'情绪纪律', plan_exec:'计划执行', chase:'追涨杀跌', position:'仓位管理', analysis:'分析质量', stop:'止损止盈', reflect:'反思质量' };
  function renderJudgeCell(rv){
    var out = [];
    /* 盘面实际 */
    if(rv.actual){
      out.push('<div style="margin-bottom:6px"><span style="display:inline-block;background:rgba(16,185,129,.12);color:#10b981;border-radius:4px;padding:0 6px;font-size:11px;font-weight:700">盘面实际</span>'
        + '<div style="margin-top:4px;color:var(--ink);line-height:1.6">'+nlbr(rv.actual)+'</div></div>');
    }
    /* AI判断 七维 */
    var hasJudge = rv.judge && typeof rv.judge === 'object' && Object.keys(rv.judge).length;
    if(hasJudge){
      var bad = __JUDGE_DEFS.filter(function(d){ var v=rv.judge[d[0]]; return v && v.pass===false; });
      out.push('<div style="margin-bottom:6px"><span style="display:inline-block;background:rgba(217,119,6,.12);color:#d97706;border-radius:4px;padding:0 6px;font-size:11px;font-weight:700">AI判断</span>'
        + '<div style="margin-top:6px;display:grid;grid-template-columns:repeat(2,1fr);gap:5px">'
        + __JUDGE_DEFS.map(function(d){
            var v = rv.judge[d[0]]; if(!v) return '';
            var on = v.pass === true;
             var col = on ? 'var(--green)' : 'var(--red)';
             var bg = on ? 'rgba(16,185,129,.10)' : 'rgba(239,68,68,.10)';
             var note = v.note || '';
             return '<div style="background:'+bg+';border:1px solid '+(on?'rgba(16,185,129,.25)':'rgba(239,68,68,.25)')+';border-radius:8px;padding:5px 7px;text-align:center">'
               + '<div style="font-size:11px;color:var(--muted)">'+d[1]+'</div>'
               + '<div style="font-size:13px;font-weight:700;color:'+col+';margin-top:1px">'+(on?'✓':'✗')+' <span style="font-size:10.5px">'+Math.round((v.score/v.total||0)*100)+'%</span></div>'
               + (note?'<div style="font-size:10px;color:var(--muted);line-height:1.45;margin-top:2px;text-align:left">'+nlbr(note)+'</div>':'')
               + '</div>';
          }).join('')
        + '</div></div>');
      if(bad.length){
        out.push('<div style="margin:6px 0 6px"><b style="color:var(--red)">待强化</b>：'+bad.map(function(d){ return d[1]; }).join('、')+'</div>');
      }
    }
    /* 综合点评 */
    var overall = rv.overall || rv.comment || '';
    if(overall){
      out.push('<div style="background:var(--bg3);border-left:3px solid var(--accent);border-radius:0 6px 6px 0;padding:6px 8px;color:var(--ink);line-height:1.6">'+nlbr(String(overall))+'</div>');
    }
    return out.join('');
  }

  /* ---------- 提交（预测表单模块已移除；此处仅兼容旧版页保留） ---------- */
  var sb = document.getElementById('fc-submit');
  if(sb){
  var submitting = false;
  sb.addEventListener('click', async function(){
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
  }

  loadForecasts().then(function(list){ forecasts = list; renderAll(); });

  /* ---------- 盘中思路 保存 ---------- */
  function bindDailySave(btnId, tipId, key, atKey){
    var btn = document.getElementById(btnId);
    if(!btn) return;
    btn.addEventListener('click', async function(){
      var tip = document.getElementById(tipId);
      var token = getToken();
      if(!token){ tip.textContent='⚠️ 未配置 GitHub Token：请先在交易工作台侧边栏设置并保存 token 后再保存。'; tip.className='token-status err'; return; }
      var val = document.querySelector('#'+(key==='intraday'?'fc-intraday':'fc-reflect')).value.trim();
      if(!val){ tip.textContent='先写下内容再保存吧'; tip.className='token-status err'; return; }
      var today = todayStr();
      var rec = forecasts.find(function(x){ return x.date===today; });
      if(!rec){
        rec = { date:today, weekday:['日','一','二','三','四','五','六'][new Date().getDay()] };
        forecasts.push(rec);
      }
      rec[key] = val;
      rec[atKey] = nowTime();
      var ok = await saveForecasts(forecasts);
      if(ok){ tip.textContent='✅ 已保存'; tip.className='token-status'; renderAll(); }
      else { tip.textContent='❌ 保存失败（检查网络/token 权限），请重试'; tip.className='token-status err'; forecasts = forecasts.slice(); }
    });
  }
  bindDailySave('fc-intraday-save','fc-intraday-tip','intraday','intraday_at');
  bindDailySave('fc-reflect-save','fc-reflect-tip','reflect','reflect_at');
})();