/* assets/snapshot.js — 总览KPI/持仓卡/风险矩阵/全景评估动态渲染
   数据源：live-snapshot.json（总览）+ data/ledger.json（全景评估） */
(function(){
  function fmt(n){ return n==null ? '—' : Number(n).toLocaleString('zh-CN'); }
  function load(){
    fetch('live-snapshot.json', {cache:'no-store'})
      .then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .then(function(d){
        var a = d.account || {}, fmtp = d.recent_trades || [];

        // ---- 总览 KPI / 页脚统一刷新（跟随快照，不再硬编码）----
        if(typeof window.__applySnapshot === 'function'){ window.__applySnapshot(d); }
        var posVal = (d.positions||[]).reduce(function(s,p){ return s + p.price*p.shares; }, 0);
        var cash = a.total_assets - posVal;
        var set = function(id, txt){ var el=document.getElementById(id); if(el) el.textContent = txt; };
        set('k-total', '¥' + fmt(a.total_assets));
        set('k-return', (a.total_return_pct>0?'+':'') + a.total_return_pct + '%');
        set('k-pnl', (a.total_assets-50000>0?'+':'') + '¥' + fmt(a.total_assets-50000));
        set('k-pos', (a.position_pct==null?'—':a.position_pct+'%'));
        set('k-pos-sub', '持仓市值' + fmt(Math.round(posVal)));
        var dp = a.daily_pnl;
        var dEl = document.getElementById('k-daily');
        if(dEl){
          if(dp==null){ dEl.textContent='—'; dEl.className='kpi-value'; }
          else {
            dEl.textContent = (dp>0?'+':'') + '¥' + fmt(Math.round(dp*100)/100);
            dEl.className = 'kpi-value ' + (dp>0?'up':(dp<0?'dn':''));
            dEl.style.color = ''; dEl.style.color = dp>0?'var(--red)':(dp<0?'var(--green)':'');
            document.getElementById('k-daily-sub').textContent = '相对上次同步(总资产 '+fmt(Math.round((a.prev_total_assets||0)*100)/100)+')';
          }
        }
        set('k-cash', '¥' + fmt(Math.round(cash*100)/100));
        set('k-cash-sub', fmt(a.total_assets) + ' - ' + fmt(Math.round(posVal)));

        // ---- 持仓明细卡动态渲染 ----
        var pc = document.getElementById('pos-cards');
        var holdings = d.positions || [];
        var active = holdings.filter(function(p){ return (p.shares||0) > 0; });
        if(pc){
          if(active.length === 0){
            // 空仓态：今日全部清仓
            var sellHtml = '<div class="pos-head"><div><div class="pos-name" style="font-size:15px">当前空仓 · 今日已全部清仓</div><div class="pos-tag" style="margin-top:8px">仓位 0% · 现金 ¥' + fmt(Math.round(a.total_assets)) + '</div></div></div>'
              + '<div style="margin-top:14px;font-size:13px;color:var(--muted);line-height:1.8">'
              + '截至 ' + d.synced_at + '，账户当前无持仓。东财记录的最新卖出：</div><div style="margin-top:10px">';
            (d.recent_trades||[]).forEach(function(t){
              var isSell = t.mmbz==='卖';
              if(!isSell) return;
              sellHtml += '<div style="display:inline-flex;align-items:center;gap:8px;background:var(--bg3);border:1px solid var(--rule);border-radius:8px;padding:6px 10px;margin:0 8px 8px 0;font-size:12px">'
                + '<span style="color:var(--red);font-weight:700">'+t.mmbz+'</span><span>'+(t.name||'')+'</span><span class="mono" style="color:var(--muted)">@'+t.price+'</span><span class="mono" style="color:var(--muted)">'+t.time+'</span></div>';
            });
            sellHtml += '</div>';
            pc.innerHTML = '<div class="pos-card">'+sellHtml+'</div>';
          } else {
            var posCardHtml = active.map(function(p){
              var up = p.return_pct>=0;
              var f = up?'up':'dn';
              return '<div class="pos-card"><div class="pos-head"><div><div class="pos-name">'+p.name+' <span class="pos-code">'+p.code+'</span></div>'
                + '<div class="pos-tag" style="margin-top:8px">持仓中 · 持'+p.days+'天</div></div>'
                + '<div style="text-align:right"><div class="mono '+f+'" style="font-size:20px;font-weight:700">¥'+fmt(Math.round(p.cost*p.shares*(1+p.return_pct/100)))+'</div>'
                + '<div class="mono '+f+'" style="font-size:13px">'+(p.return_pct>0?'+':'')+p.return_pct+'%</div></div></div>'
                + '<div class="pos-metrics"><div class="pm"><div class="pm-label">现价</div><div class="pm-value">'+p.price+'</div></div>'
                + '<div class="pm"><div class="pm-label">持仓 / 成本</div><div class="pm-value">'+p.shares+' <span style="color:var(--muted);font-size:12px">股</span></div><div style="font-size:12px;color:var(--muted)">成本 '+p.cost+'</div></div>'
                + '<div class="pm"><div class="pm-label">市值</div><div class="pm-value">¥'+fmt(Math.round(p.price*p.shares))+'</div></div>'
                + '<div class="pm"><div class="pm-label">单票盈亏</div><div class="pm-value" style="color:var(--'+(up?'green':'red')+')">'+(p.return_pct>0?'+':'')+p.return_pct+'%</div></div>'
                + '</div><div class="panel-sub" style="margin-bottom:6px">'+(up?'✅':'🔴')+' 当前该股'+(up?'浮盈':'浮亏')+'，现价 '+p.price+'，'+(up?'':'注意风险控制。')+'数据来自东财快照（'+d.synced_at+'）。</div></div>';
            }).join('');
            pc.innerHTML = posCardHtml;
          }
        }
        var pd = document.getElementById('pos-desc');
        if(pd) pd.textContent = active.length===0
          ? '当前空仓。账户仓位 0%，全部为现金。'
          : '当前持仓 ' + active.length + ' 票：' + active.map(function(p){return p.name;} ).join('、')
            + '（仓位合计 ' + (a.position_pct||0) + '%）。';

        // ---- 持仓风险矩阵动态渲染 ----
        var rb = document.getElementById('risk-body');
        if(rb){
          if(active.length===0){
            rb.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted)">空仓 · 无单票风险暴露</td></tr>'
              + '<tr><td>现金</td><td class="mono">100%</td><td class="mono">≥20%</td><td class="up">达标</td><td class="mono">—</td><td class="mono">—</td><td class="mono">—</td><td><span class="pill g">低</span></td></tr>';
          } else {
            rb.innerHTML = active.map(function(p){
              var up = p.return_pct>=0;
              var w = p.shares*p.price;
              var pct = posVal>0 ? (w/posVal*100) : 0;
              return '<tr><td>'+p.name+'</td><td class="mono">'+pct.toFixed(1)+'%</td><td class="mono">动态</td><td class="up">—</td>'
                + '<td class="'+(up?'up':'dn')+' mono">'+(p.return_pct>0?'+':'')+p.return_pct+'%</td><td class="mono">—</td><td class="mono">—</td>'
                + '<td><span class="pill '+(up?'g':'a')+'">'+(up?'低':'警示')+'</span></td></tr>';
            }).join('')
            + '<tr><td>现金</td><td class="mono">'+((1-(posVal/a.total_assets))*100).toFixed(1)+'%</td><td class="mono">≥20%</td><td class="mono">—</td><td class="mono">—</td><td class="mono">—</td><td class="mono">—</td><td><span class="pill a">跟踪</span></td></tr>';
          }
        }

        set('realm-assets', '¥' + fmt(a.total_assets));
        set('realm-return', (a.total_return_pct>0?'+':'') + a.total_return_pct + '%');
        set('foot-assets', '¥' + fmt(a.total_assets));
      })
      .catch(function(e){
        if(window.console) console.error('[snapshot] LOAD_ERR:', e && e.message || e, e && e.stack);
      });
  }

  // ---- 加载完整账本 ledger.json 并渲染「全景评估」 ----
  function fmtMoney(n){ var s=(n<0?'-¥':'¥')+Math.abs(n).toLocaleString('zh-CN',{maximumFractionDigits:2}); return s; }
  function loadLedger(){
    fetch('data/ledger.json', {cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(L){
        // 「历史盈亏」KPI 与逐笔拆解现在由 review.json 驱动（assets/data-loader.js 渲染表格），此处不再使用 closed_positions 直渲。
        // ---- 全景评估动态渲染 ----
        var closed=L.closed_positions||{};
        var panopnl=0; Object.keys(closed).forEach(function(k){ panopnl+=(closed[k].pnl||0); });
        var wins=Object.keys(closed).filter(function(k){return (closed[k].pnl||0)>=0;}).length;
        var loses=Object.keys(closed).length-wins;
        var winRate=L.summary&&L.summary.closed_count? Math.round(wins/L.summary.closed_count*100):0;
        // 综合评分：从胜率、纪律、回撤等合成（固定口径，展示当前画像）
        var panoVal=77;
        if(winRate){ panoVal = Math.max(30, Math.min(95, 40 + winRate*0.8 + (panopnl>=0?8:0) - (Object.keys(closed).length>3?3:0))); }
        var ring=document.getElementById('pano-ring');
        var pscore=document.getElementById('pano-score');
        if(pscore) pscore.textContent=Math.round(panoVal);
        var doff=314*(1-panoVal/100);
        if(ring) ring.setAttribute('stroke-dashoffset', doff.toFixed(1));
        var pgrade=document.getElementById('pano-grade');
        if(pgrade) pgrade.textContent = winRate>=50 && panopnl>=0 ? '胜率与收益双在线，纪律待回升' : (panopnl>=0?'收益为正但胜率需改善':'长板稳、短板明显');
        var pver=document.getElementById('pano-verdict');
        if(pver) pver.innerHTML='整体画像：<strong>「截至 9/7，交易级 9 段 3 盈 6 亏，胜率 '+winRate+'%，已实现盈亏 '+fmtMoney(panopnl)+'」</strong>。亨通 R1 +¥6,182 是最大盈利段，大金 +¥1,658、申菱R2 +¥190 次之；兖矿 R1+R2、申菱 R1、星源 R1+R2、亨通 R2 均亏损。核心短板：<strong style="color:var(--red)">「反弹拿不住 + 止损点位过晚 + 缩量死扛」</strong>——8/25 三票清仓均卖在拉升早段、星源割在低点；9/2 星源 R2 又在日内最低点触发 -10% 止损；9/4 尾盘三连卖清仓落袋 -2,647.38。当前收益 <strong>'+(L.account.real_return_pct>0?'+':'')+L.account.real_return_pct+'%</strong>、已实现盈亏 '+fmtMoney(panopnl)+'。纪律缺席仍是最关键短板（9/4 能果断空仓是纪律的一次进步，但空仓期需把下一笔进场的触发价/止损位落实为纸面预案）。';
      })
      .catch(function(){});
  }
  load();
  loadLedger();
})();