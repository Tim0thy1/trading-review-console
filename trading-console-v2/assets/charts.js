// assets/charts.js — 模拟盘控制台 v2 试行版 · 渲染与交互
// 数据来源：data.js（东财组合+实际表现）+ data-eval.js / data-realm.js（我的输入）
(function() {
  var D = window.__DATA;
  if (!D) return;

  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var bg3 = style.getPropertyValue('--bg3').trim();
  var green = style.getPropertyValue('--green').trim();
  var red = style.getPropertyValue('--red').trim();
  var warn = style.getPropertyValue('--warn').trim();

  // ============ 工具函数 ============
  function fmt(n) { return Number(n).toLocaleString('zh-CN'); }
  function cls(v) { return v > 0 ? 'up' : (v < 0 ? 'dn' : 'flat'); }
  function sign(v) { return v > 0 ? '+' : ''; }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function initChart(el, h) {
    var dom = $(el);
    if (!dom) return null;
    return echarts.init(dom, null, { renderer: 'svg' });
  }

  // ============ 顶部 Tab 切换（横向导航） ============
  var navItems = document.querySelectorAll('.nav-item');
  var panels = document.querySelectorAll('.tab-panel');
  navItems.forEach(function(item) {
    item.addEventListener('click', function() {
      var target = item.getAttribute('data-tab');
      navItems.forEach(function(n) { n.classList.toggle('active', n === item); });
      panels.forEach(function(p) { p.classList.toggle('active', p.id === 'tab-' + target); });
      // 切换后延迟重绘图表（容器可见后才可正确取尺寸）
      setTimeout(function() {
        Object.keys(__charts).forEach(function(k) { if (__charts[k]) __charts[k].resize(); });
      }, 60);
    });
  });

  // ============ 账户总览 ============
  var A = D.account || {};
  if (A.total_assets != null) $('a-total').textContent = fmt(A.total_assets);
  if (A.daily_pnl != null) {
    var dEl = $('a-day');
    dEl.textContent = sign(A.daily_pnl) + fmt(A.daily_pnl);
    dEl.className = 'val mono ' + cls(A.daily_pnl);
  }
  if (A.total_return_pct != null) {
    var rEl = $('a-ret');
    rEl.textContent = sign(A.total_return_pct) + A.total_return_pct + '%';
    rEl.className = 'val mono ' + cls(A.total_return_pct);
  }
  if (A.market_value != null) $('a-mv').textContent = fmt(A.market_value);
  if (A.cash != null) $('a-cash').textContent = fmt(A.cash);
  if (A.position_pct != null) $('a-pos').textContent = A.position_pct + '%';
  if (A.synced_at) $('top-sync').textContent = '同步 ' + A.synced_at;

  // ============ 图表注册表 ============
  var __charts = {};

  // ---- 资产分布（环形图） ----
  (function() {
    var c = initChart('chart-assetmix', 170);
    if (!c) return;
    __charts['chart-assetmix'] = c;
    var mv = A.market_value || 0, cash = A.cash || 0;
    c.setOption({
      animation: true,
      tooltip: { trigger: 'item', appendToBody: true, formatter: function(p) {
        return p.name + '<br>¥' + fmt(p.value) + ' · ' + p.percent + '%';
      }},
      legend: { bottom: 0, textStyle: { color: muted, fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
      series: [{
        type: 'pie', radius: ['58%', '78%'], center: ['50%', '44%'],
        avoidLabelOverlap: false,
        itemStyle: { borderColor: bg2, borderWidth: 2, borderRadius: 4 },
        label: { show: true, position: 'center', formatter: '{b}\n{d}%', color: ink, fontSize: 12, lineHeight: 18 },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 700 } },
        data: [
          { name: '持仓市值', value: mv, itemStyle: { color: accent } },
          { name: '可用资金', value: cash, itemStyle: { color: accent2 } }
        ]
      }]
    });
    window.addEventListener('resize', function() { c.resize(); });
  })();

  // ---- 账户净值走势 ----
  (function() {
    var c = initChart('chart-equity', 210);
    if (!c) return;
    __charts['chart-equity'] = c;
    var eq = D.equity || [];
    if (!eq.length) return;
    var dates = eq.map(function(p) { return p[0]; });
    var vals = eq.map(function(p) { return p[1]; });
    var lastV = vals[vals.length - 1];
    var base = 50000;
    var cumPct = (lastV - base) / base * 100;
    c.setOption({
      animation: true,
      tooltip: { trigger: 'axis', appendToBody: true, valueFormatter: function(v) { return '¥' + fmt(v); } },
      grid: { left: 56, right: 16, top: 30, bottom: 24 },
      xAxis: {
        type: 'category', data: dates, boundaryGap: false,
        axisLine: { lineStyle: { color: rule } }, axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 10, interval: Math.ceil(dates.length / 6) }
      },
      yAxis: {
        type: 'value', min: 49000, scale: true,
        axisLabel: { color: muted, fontSize: 10, formatter: function(v) { return '¥' + (v / 1000).toFixed(0) + 'k'; } },
        splitLine: { lineStyle: { color: rule, type: 'dashed' } }
      },
      series: [{
        type: 'line', data: vals, smooth: true, symbol: 'none',
        lineStyle: { color: accent, width: 2.5 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: accent + '44' }, { offset: 1, color: accent + '05' }
        ] } },
        markPoint: {
          data: [{ coord: [dates.length - 1, lastV], symbol: 'circle', symbolSize: 10, itemStyle: { color: accent2 } }],
          label: { show: true, formatter: '¥' + fmt(Math.round(lastV)), position: 'top', color: accent2, fontFamily: 'JetBrainsMono', fontSize: 10 }
        }
      }]
    });
    window.addEventListener('resize', function() { c.resize(); });
  })();

  // ============ 当前持仓（表格行） ============
  (function() {
    var tbody = $('pos-list');
    var pos = D.positions || [];
    $('pos-count').textContent = pos.length;
    if (!pos.length) {
      tbody.innerHTML = '<tr><td style="text-align:center;color:var(--muted);padding:24px">当前空仓</td></tr>';
      return;
    }
    var h = '';
    pos.forEach(function(p) {
      var pnl = (p.price - p.cost) * p.shares;
      h += '<tr>';
      h += '<td><div class="cell-main">' + esc(p.name) + '</div><div class="cell-sub">' + esc(p.code) + ' · 持有 ' + p.days + ' 天</div></td>';
      h += '<td class="cur mono">' + p.price + '</td>';
      h += '<td class="cur mono">' + p.cost + '</td>';
      h += '<td class="cur mono">' + p.shares + '</td>';
      h += '<td class="cur mono">¥' + fmt(Math.round(p.price * p.shares)) + '</td>';
      h += '<td class="cur mono ' + cls(p.pct) + '">' + sign(p.pct) + p.pct + '%</td>';
      h += '<td class="cur mono ' + cls(p.return_pct) + '">' + sign(p.return_pct) + p.return_pct + '%</td>';
      h += '<td class="cur mono ' + cls(pnl) + '">' + sign(pnl) + '¥' + fmt(Math.round(pnl)) + '</td>';
      h += '</tr>';
    });
    tbody.innerHTML = h;
  })();

  // ============ 今日操作（表格行） ============
  (function() {
    var tbody = $('today-trades');
    var tt = D.todayTrades || [];
    $('today-sub').textContent = tt.length ? '9/4 · ' + tt.length + ' 笔' : '9/4 · 无操作';
    if (!tt.length) {
      tbody.innerHTML = '<tr><td style="text-align:center;color:var(--muted);padding:20px;font-size:13px">今日暂无调仓</td></tr>';
      return;
    }
    var h = '';
    tt.forEach(function(t) {
      var isBuy = t.dir === '买';
      h += '<tr>';
      h += '<td class="mono" style="color:var(--muted)">' + esc(t.time) + '</td>';
      h += '<td class="cell-main">' + esc(t.name) + '</td>';
      h += '<td class="cur"><span class="tag-dir ' + (isBuy ? 'buy' : 'sell') + '">' + esc(t.dir) + '</span></td>';
      h += '<td class="cur mono">' + esc(t.price) + '</td>';
      h += '</tr>';
    });
    tbody.innerHTML = h;
  })();

  // ============ 历史盈亏 KPI ============
  var CS = D.closedSummary || {};
  if (CS.total_pnl != null) {
    var pEl = $('h-pnl');
    pEl.textContent = sign(CS.total_pnl) + '¥' + fmt(CS.total_pnl);
    pEl.className = 'kpi-v ' + cls(CS.total_pnl);
  }
  if (CS.win_rate != null) $('h-winrate').textContent = CS.win_rate + '%';
  if (CS.round_count != null) $('h-rounds').textContent = CS.round_count + ' 轮';

  // ============ 已了结持仓盈亏（可展开） ============
  (function() {
    var list = $('closed-list');
    var cp = D.closedPositions || [];
    if (!cp.length) {
      list.innerHTML = '<div style="padding:12px;text-align:center;color:var(--muted);font-size:12.5px">暂无已了结持仓</div>';
      return;
    }
    var h = '';
    cp.forEach(function(st, si) {
      var stPnl = st.rounds.reduce(function(s, r) { return s + (r.pnl || 0); }, 0);
      h += '<div class="closed-item" data-i="' + si + '">';
      h += '<div class="closed-head">';
      h += '<div class="nm">' + esc(st.name) + '<small>' + esc(st.code) + '</small></div>';
      h += '<div><span class="pnl ' + cls(stPnl) + '">' + sign(stPnl) + '¥' + fmt(stPnl) + '</span><span class="arrow">▾</span></div>';
      h += '</div>';
      h += '<div class="closed-body">';
      st.rounds.forEach(function(r) {
        h += '<div style="font-size:12px;font-weight:700;color:var(--accent2);margin:8px 0 4px">' + esc(r.round) + ' · ' + esc(r.from) + ' → ' + esc(r.to) + '（' + r.days + ' 天）· 盈亏 <span class="mono ' + cls(r.pnl) + '">' + sign(r.pnl) + '¥' + fmt(r.pnl) + '</span></div>';
        r.trades.forEach(function(t) {
          var isBuy = /建仓|加仓|回补/.test(t.action);
          h += '<div class="trade-row">';
          h += '<div class="t-time">' + esc(t.date) + '</div>';
          h += '<div class="act ' + (isBuy ? 'buy' : 'sell') + '">' + esc(t.action) + '</div>';
          h += '<div class="mono">' + esc(t.shares) + '</div>';
          h += '<div class="mono">' + esc(t.price) + '</div>';
          h += '<div class="pnl mono ' + cls(parseFloat(String(t.pnl).replace(/[^\d.-]/g, '')) || 0) + '">' + esc(t.pnl) + '</div>';
          h += '</div>';
        });
      });
      if (CS.note) h += '<div style="font-size:11.5px;color:var(--muted);margin-top:8px;line-height:1.6">' + esc(CS.note) + '</div>';
      h += '</div></div>';
    });
    list.innerHTML = h;
    list.querySelectorAll('.closed-head').forEach(function(head) {
      head.addEventListener('click', function() {
        head.parentElement.classList.toggle('open');
      });
    });
  })();

  // ============ 调仓记录（表格行 · 折叠） ============
  (function() {
    var tbody = $('trade-list');
    var moreEl = $('trade-more');
    var tr = D.trades || [];
    var SHOW = 10;
    $('trade-count').textContent = tr.length;
    if (!tr.length) {
      tbody.innerHTML = '<tr><td style="text-align:center;color:var(--muted);padding:20px;font-size:13px">暂无调仓记录</td></tr>';
      if (moreEl) moreEl.innerHTML = '';
      return;
    }
    function row(t) {
      var isBuy = t.dir === '买';
      return '<tr>' +
        '<td class="mono" style="color:var(--muted)">' + esc(t.time) + '</td>' +
        '<td class="cell-main">' + esc(t.name) + '</td>' +
        '<td class="cur"><span class="tag-dir ' + (isBuy ? 'buy' : 'sell') + '">' + esc(t.dir) + '</span></td>' +
        '<td class="cur mono">' + esc(t.px) + '</td>' +
        '</tr>';
    }
    var base = tr.slice(0, SHOW);
    var extra = tr.slice(SHOW);
    tbody.innerHTML = base.map(row).join('');
    if (moreEl && extra.length) {
      var open = false;
      var btn = document.createElement('div');
      btn.className = 'more';
      btn.textContent = '展开全部调仓记录（还有 ' + extra.length + ' 条）▾';
      btn.addEventListener('click', function() {
        open = !open;
        if (open) {
          tbody.insertAdjacentHTML('beforeend', extra.map(row).join(''));
          btn.textContent = '收起，只显示最近 ' + SHOW + ' 条 ▴';
        } else {
          tbody.innerHTML = base.map(row).join('');
          btn.textContent = '展开全部调仓记录（还有 ' + extra.length + ' 条）▾';
        }
      });
      moreEl.appendChild(btn);
    }
  })();

  // ============ 盘前预测 ============
  (function() {
    var list = $('fc-list');
    var fc = D.forecast || [];
    if (!fc.length) {
      list.innerHTML = '<div style="padding:12px;text-align:center;color:var(--muted);font-size:12.5px">暂无盘前预测记录</div>';
      return;
    }
    var h = '';
    fc.forEach(function(f) {
      h += '<div class="fc-card">';
      h += '<div class="fc-head"><div class="fc-date">' + esc(f.date) + ' · 周' + esc(f.weekday || '') + '</div>';
      h += '<div class="fc-dir">' + esc(f.mkt_dir || '未提交') + '</div></div>';
      h += '<div class="fc-meta">' + (f.submitted_at ? '提交 ' + esc(f.submitted_at) : '未提交') + (f.mood ? ' · 情绪：' + esc(f.mood) : '') + '</div>';
      if (f.mkt_reason) h += '<div class="fc-row"><div class="k">方向理由</div><div class="v">' + nl2br(f.mkt_reason) + '</div></div>';
      if (f.hold_view) h += '<div class="fc-row"><div class="k">持仓观点</div><div class="v">' + nl2br(f.hold_view) + '</div></div>';
      if (f.plan) h += '<div class="fc-row"><div class="k">操作计划</div><div class="v">' + nl2br(f.plan) + '</div></div>';
      if (f.review_reflection) h += '<div class="fc-row"><div class="k">盘后反思</div><div class="v">' + nl2br(f.review_reflection) + '</div></div>';
      if (f.note) h += '<div class="fc-row"><div class="k">客观结果</div><div class="v">' + nl2br(f.note) + '</div></div>';
      if (f.review) {
        var rv = f.review;
        h += '<div class="callout" style="margin-top:10px;border-left:3px solid var(--accent2)">';
        h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">';
        h += '<span class="pill a">综合 ' + rv.score + '/100</span>';
        h += '<span class="pill ' + (rv.dir_hit ? 'g' : 'r') + '">方向 ' + (rv.dir_hit ? '命中' : '未中') + ' ' + rv.dir_score + '/35</span>';
        h += '<span class="pill a">个股 ' + rv.stock_score + '/30</span>';
        h += '<span class="pill a">预案 ' + rv.plan_score + '/25</span>';
        h += '<span class="pill ' + (rv.discipline >= 10 ? 'g' : 'r') + '">纪律 ' + rv.discipline + '/15</span>';
        h += '</div>';
        if (rv.comment) h += '<div style="font-size:12.5px;line-height:1.7">' + esc(rv.comment) + '</div>';
        h += '</div>';
      }
      h += '</div>';
    });
    list.innerHTML = h;
  })();

  // ============ 修炼手记 ============
  (function() {
    var wrap = $('journal-wrap');
    var jr = D.journal || [];
    if (!jr.length) {
      wrap.innerHTML = '<div style="padding:12px;text-align:center;color:var(--muted);font-size:12.5px">暂无手记</div>';
      return;
    }
    var latest = jr[0];
    var h = '<div class="journal-latest"><div class="jd">' + esc(latest.date) + ' · 最新手记</div><div>' + latest.content + '</div></div>';
    if (jr.length > 1) {
      h += '<div class="more" id="journal-more" style="text-align:center;padding:10px;margin-top:8px;border:1px dashed var(--rule);border-radius:10px;color:var(--accent);font-size:12.5px;cursor:pointer">展开全部手记（' + jr.length + ' 条）▾</div>';
      h += '<div id="journal-all" style="display:none">';
      jr.slice(1).forEach(function(j) {
        h += '<div class="journal-latest" style="border-left-color:var(--rule)"><div class="jd">' + esc(j.date) + '</div><div>' + j.content + '</div></div>';
      });
      h += '</div>';
    }
    wrap.innerHTML = h;
    var more = $('journal-more');
    if (more) {
      more.addEventListener('click', function() {
        var all = $('journal-all');
        var open = all.style.display !== 'none';
        all.style.display = open ? 'none' : 'block';
        more.textContent = open ? '展开全部手记（' + jr.length + ' 条）▾' : '收起手记 ▴';
      });
    }
  })();

  // ============ 交易者全面评测（可展开） ============
  (function() {
    var list = $('eval-list');
    var ev = D.evalSections || [];
    if (!ev.length) {
      list.innerHTML = '<div style="padding:12px;text-align:center;color:var(--muted);font-size:12.5px">暂无评测数据</div>';
      return;
    }
    var h = '';
    ev.forEach(function(s, i) {
      h += '<div class="fold-item" data-i="' + i + '">';
      h += '<div class="fold-head"><div><div class="ft">' + esc(s.title) + '</div><div class="fs">' + esc(s.summary) + '</div></div><span class="arrow">▾</span></div>';
      h += '<div class="fold-body"><div class="inner">' + s.html + '</div></div>';
      h += '</div>';
    });
    list.innerHTML = h;
    list.querySelectorAll('.fold-head').forEach(function(head) {
      head.addEventListener('click', function() {
        head.parentElement.classList.toggle('open');
      });
    });
  })();

  // ============ 修炼境界 ============
  (function() {
    var wrap = $('realm-wrap');
    var R = D.realm;
    if (!R) {
      wrap.innerHTML = '<div style="padding:12px;text-align:center;color:var(--muted);font-size:12.5px">暂无境界数据</div>';
      return;
    }
    var cur = R.current || {};
    var progNum = parseInt(String(cur.progress || '').replace(/[^\d]/g, ''), 10);
    if (isNaN(progNum)) progNum = 50;
    var h = '<div class="realm-hero">';
    h += '<div class="r-name">' + esc(cur.realm) + '</div>';
    h += '<div class="r-prog">' + esc(cur.progress_label) + ' · ' + esc(cur.progress) + ' · 下一关：' + esc(cur.next) + '（' + esc(cur.next_gap) + '）</div>';
    h += '<div class="realm-bar"><i style="width:' + Math.min(100, Math.max(0, progNum)) + '%"></i></div>';
    h += '<div class="r-desc">' + esc(cur.desc) + '</div>';
    if (cur.detail) h += '<div class="r-desc" style="margin-top:8px;opacity:.95">' + cur.detail + '</div>';
    h += '</div>';
    (R.sections || []).forEach(function(s, i) {
      h += '<div class="fold-item" data-i="' + i + '">';
      h += '<div class="fold-head"><div><div class="ft">' + esc(s.title) + '</div><div class="fs">' + esc(s.summary) + '</div></div><span class="arrow">▾</span></div>';
      h += '<div class="fold-body"><div class="inner">' + s.html + '</div></div>';
      h += '</div>';
    });
    wrap.innerHTML = h;
    wrap.querySelectorAll('.fold-head').forEach(function(head) {
      head.addEventListener('click', function() {
        head.parentElement.classList.toggle('open');
      });
    });
  })();
})();
