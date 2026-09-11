// assets/charts.js
(function() {
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

  var axisStyle = { lineStyle: { color: rule }, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } };

  // 空值保护：元素不存在时返回 no-op，避免单个图表缺失拖垮整页脚本
  var __noop = { setOption: function(){}, resize: function(){} };
  function init(el, h) {
    var dom = document.getElementById(el);
    if (!dom) { if (window.console) console.warn('[charts] 元素缺失，图表跳过:', el); return __noop; }
    return echarts.init(dom, null, { renderer: 'svg' });
  }

  // ============ 懒渲染：交易者全面评测的四张图（雷达/逐笔/决策/画像） ============
  // 容器位于 eval.json 的展开块内（由 data-loader.js 动态渲染），页面加载时 charts.js
  // 先于 data-loader.js 执行，容器尚不存在；故注册为懒初始化，由 data-loader.js 在展开后
  // 调用 window.__renderEvalCharts() 触发。已初始化过的图表只 resize，不重复 init。
  var __evalCharts = {};
  var __evalDefs = [];
  function __regEvalChart(el, h, setup) { __evalDefs.push([el, h, setup]); }
  window.__renderEvalCharts = function() {
    __evalDefs.forEach(function(def) {
      var el = def[0];
      var dom = document.getElementById(el);
      if (!dom) return;
      if (__evalCharts[el]) { __evalCharts[el].resize(); return; }
      var chart = echarts.init(dom, null, { renderer: 'svg' });
      def[2](chart);
      __evalCharts[el] = chart;
      window.addEventListener('resize', function() { chart.resize(); });
    });
  };

  // ============ NAV SWITCHING ============
  var navItems = document.querySelectorAll('.nav-item');
  var modules = document.querySelectorAll('.module');
  navItems.forEach(function(item) {
    item.addEventListener('click', function() {
      var target = item.getAttribute('data-target');
      navItems.forEach(function(n) { n.classList.remove('active'); });
      item.classList.add('active');
      modules.forEach(function(m) {
        m.classList.toggle('active', m.id === 'module-' + target);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // ============ CHART 1: 账户净值曲线 ============
  // 数据源：data/ledger.json → equity_points（逐日净值序列，由 gen_ledger.py 幂等重建）
  var c1 = init('chart-equity', 340);
  var eqDates = [];
  var eqVals = [];
  function renderEquityChart() {
    if (!eqDates.length) return;
    var lastD = eqDates[eqDates.length - 1];
    var lastV = eqVals[eqVals.length - 1];
    c1.setOption({
      animation: false,
      tooltip: { trigger: 'axis', appendToBody: true, valueFormatter: function(v){ return '¥' + Number(v).toLocaleString(); } },
      grid: { left: 60, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'category', data: eqDates, boundaryGap: false, axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: muted } },
      yAxis: { type: 'value', min: 49000, scale: true, axisLabel: { color: muted, formatter: function(v){ return '¥' + v.toLocaleString(); } }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [{
        type: 'line', data: eqVals, smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: accent, width: 2.5 },
        itemStyle: { color: accent },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent + '44' }, { offset: 1, color: accent + '05' }] } },
        markPoint: {
          data: [
            { coord: [eqDates.length - 1, lastV], symbol: 'circle', symbolSize: 10, itemStyle: { color: accent2 } }
          ],
          label: { show: true, formatter: '¥' + Number(lastV).toLocaleString(undefined,{maximumFractionDigits:0}), position: 'top', color: accent2, fontFamily: 'JetBrainsMono', fontSize: 11 }
        }
      }]
    });
  }
  window.addEventListener('resize', function() { c1.resize(); });

  // ============ CHART 4(原5): 已实现 vs 浮动 (按标的) ============
  var c5 = init('chart-pnlstock', 320);
  c5.setOption({
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true, formatter: function(p){ return p[0].name + '<br>' + (p[0].value>=0?'+':'') + '¥' + Number(p[0].value).toLocaleString(); } },
    grid: { left: 10, right: 50, top: 20, bottom: 10, containLabel: true },
    xAxis: { type: 'category', data: ['兖矿能源\n(已实现)', '大金重工\n(已实现)', '申菱环境\n(浮动)', '亨通光电\n(浮动)', '星源材质\n(浮动)'], axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 12 } },
    yAxis: { type: 'value', axisLabel: { color: muted, formatter: function(v){ return '¥'+(v/1000)+'k'; } }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    series: [{
      type: 'bar', barWidth: 26,
      data: [
        { value: -415, itemStyle: { color: red, borderRadius: [4,4,0,0] } },
        { value: 1658, itemStyle: { color: green, borderRadius: [4,4,0,0], opacity: 0.7 } },
        { value: -1541, itemStyle: { color: red, borderRadius: [4,4,0,0] } },
        { value: 5513, itemStyle: { color: accent2, borderRadius: [4,4,0,0] } },
        { value: -585, itemStyle: { color: warn, borderRadius: [4,4,0,0] } }
      ],
      label: { show: true, position: 'top', color: ink, fontFamily: 'JetBrainsMono', fontSize: 12, formatter: function(p){ return (p.value>=0?'+':'') + '¥' + p.value.toLocaleString(); } }
    }]
  });
  window.addEventListener('resize', function() { c5.resize(); });

  // ============ CHART 6: 六维纪律雷达（懒渲染） ============
  __regEvalChart('chart-radar', 400, function(chart) {
    chart.setOption({
      animation: false,
      tooltip: { trigger: 'item', appendToBody: true },
      legend: { bottom: 0, textStyle: { color: muted }, itemWidth: 14, itemHeight: 8 },
      radar: {
        indicator: [
          { name: '仓位纪律', max: 10 }, { name: '止损纪律', max: 10 },
          { name: '止盈落袋', max: 10 }, { name: '加仓纪律', max: 10 },
          { name: '情绪控制', max: 10 }, { name: '计划执行', max: 10 }
        ],
        radius: '62%', center: ['50%', '48%'],
        splitArea: { areaStyle: { color: [bg2, bg3] } },
        axisName: { color: ink, fontSize: 12 },
        splitLine: { lineStyle: { color: rule } },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'radar',
        data: [
          {
            value: [6, 4, 7, 3, 6, 7], name: '当前纪律',
            areaStyle: { color: accent2 + '44' }, lineStyle: { color: accent2, width: 2 }, itemStyle: { color: accent2 }
          },
          {
            value: [8, 8, 8, 8, 8, 8], name: '合格线',
            areaStyle: { color: accent + '22' }, lineStyle: { color: accent, width: 2, type: 'dashed' }, itemStyle: { color: accent }
          }
        ]
      }]
    });
  });

  // ============ CHART 7: 逐笔操作评分（懒渲染） ============
  __regEvalChart('chart-tradescore', 320, function(chart) {
    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true, formatter: function(p){ return p[0].name + ': ' + p[0].value + '/10'; } },
      grid: { left: 10, right: 50, top: 20, bottom: 10, containLabel: true },
      xAxis: { type: 'category', data: ['兖矿能源', '大金重工', '亨通光电', '申菱环境'], axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 12 } },
      yAxis: { type: 'value', max: 10, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [{
        type: 'bar', barWidth: 40,
        data: [
          { value: 3, itemStyle: { color: red, borderRadius: [4,4,0,0] } },
          { value: 6, itemStyle: { color: accent, borderRadius: [4,4,0,0] } },
          { value: 6, itemStyle: { color: accent2, borderRadius: [4,4,0,0] } },
          { value: 3, itemStyle: { color: red, borderRadius: [4,4,0,0] } }
        ],
        label: { show: true, position: 'top', color: ink, fontFamily: 'JetBrainsMono', fontSize: 13, formatter: function(p){ return p.value + '/10'; } },
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: 8, label: { formatter: '合格线 8', color: green, position: 'insideEndTop' }, lineStyle: { color: green, type: 'dashed' } }] }
      }]
    });
  });

  // ============ CHART 8: 交易者画像雷达（懒渲染） ============
  __regEvalChart('chart-avatar', 360, function(chart) {
    chart.setOption({
      animation: false,
      tooltip: { trigger: 'item', appendToBody: true },
      radar: {
        indicator: [
          { name: '板块选股', max: 10 }, { name: '入场时机', max: 10 },
          { name: '做T/短线判断', max: 10 }, { name: '止盈落袋', max: 10 },
          { name: '仓位管理', max: 10 }, { name: '止损执行', max: 10 },
          { name: '情绪控制', max: 10 }
        ],
        radius: '62%', center: ['50%', '50%'],
        splitArea: { areaStyle: { color: [bg2, bg3] } },
        axisName: { color: ink, fontSize: 12 },
        splitLine: { lineStyle: { color: rule } },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'radar',
        data: [{
          value: [9, 8, 6, 7, 7, 5, 4], name: '能力画像',
          areaStyle: { color: accent + '44' }, lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent }
        }]
      }]
    });
  });

  // ============ CHART 9: 收益日历（年视图 → 月视图下钻） ============
  var calEl = document.getElementById('chart-monthly');
  if (calEl) {
    // 由净值序列推算每日收益率，7/14首日以5万本金为基准。包成函数，便于快照刷新净值点后重算重绘。
    var dailyData = {};   // { '2026-07-15': {pct: +2.21, val: 51001.5} }
    var monthlyData = {}; // { '2026-07': +2.20 }
    var monthStart = {};  // { '2026-07': 50000, '2026-08': 51101.7 }
    var lastVal = {};
    function computeCal() {
      dailyData = {}; monthlyData = {}; monthStart = {}; lastVal = {};
      var prevV = 50000, curMonth = '';
      for (var i = 0; i < eqDates.length; i++) {
        var v = eqVals[i];
        var pct = (v - prevV) / prevV * 100;
        var mm = eqDates[i].slice(0, 2), dd = eqDates[i].slice(3, 5);
        var dk = '2026-' + mm + '-' + dd;
        var ym = '2026-' + mm;
        dailyData[dk] = { pct: +pct.toFixed(2), val: v };
        if (ym !== curMonth) { monthStart[ym] = prevV; curMonth = ym; }
        prevV = v;
      }
      // 计算每月累计收益
      for (var i2 = eqDates.length - 1; i2 >= 0; i2--) {
        var ym2 = '2026-' + eqDates[i2].slice(0, 2);
        if (!lastVal[ym2]) lastVal[ym2] = eqVals[i2];
      }
      for (var ym3 in monthStart) {
        if (lastVal[ym3]) monthlyData[ym3] = +((lastVal[ym3] - monthStart[ym3]) / monthStart[ym3] * 100).toFixed(2);
      }
    }

    var monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    var weekDays = ['日','一','二','三','四','五','六'];

    // ---- 年视图 ----
    function renderYear() {
      // 空数据保护：净值序列尚未加载完成时（loadEquity 异步），先显示占位，避免 eqVals[-1] 抛错中断脚本
      if (!eqVals.length) {
        calEl.innerHTML = '<div class="cal-summary" style="padding:36px;text-align:center;color:var(--muted)">收益日历加载中…</div>';
        return;
      }
      var h = '<div class="cal-year">';
      for (var m = 1; m <= 12; m++) {
        var ym = '2026-' + (m < 10 ? '0' + m : m);
        var has = monthlyData[ym] !== undefined;
        var ret = has ? monthlyData[ym] : null;
        var cls = 'cal-mc';
        if (has) cls += ''; else cls += ' empty';
        if (m === 8) cls += ' now';
        var retColor = has ? (ret >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--muted)';
        var retText = has ? (ret >= 0 ? '+' : '') + ret.toFixed(2) + '%' : '—';
        var sub = has ? '¥' + lastVal[ym].toLocaleString(undefined,{maximumFractionDigits:0}) : (m < 7 ? '未开始' : '待交易');
        h += '<div class="' + cls + '"' + (has ? ' data-ym="' + ym + '"' : '') + '>';
        h += '<div class="mc-name">' + monthNames[m-1] + '</div>';
        h += '<div class="mc-ret" style="color:' + retColor + '">' + retText + '</div>';
        h += '<div class="mc-sub">' + sub + '</div>';
        h += '</div>';
      }
      h += '</div>';
      var cumPct = (eqVals[eqVals.length - 1] - 50000) / 50000 * 100;
      h += '<div class="cal-summary">本金 ¥50,000 → 当前 ¥' + eqVals[eqVals.length-1].toLocaleString(undefined,{maximumFractionDigits:0}) + ' · 累计 <strong style="color:' + (cumPct>=0?'var(--green)':'var(--red)') + '">' + (cumPct>=0?'+':'') + cumPct.toFixed(2) + '%</strong></div>';
      calEl.innerHTML = h;
      calEl.querySelectorAll('.cal-mc[data-ym]').forEach(function(c) {
        c.addEventListener('click', function() { renderMonth(this.getAttribute('data-ym')); });
      });
    }

    // ---- 月视图 ----
    function renderMonth(ym) {
      var yr = parseInt(ym.slice(0,4)), mo = parseInt(ym.slice(5,7));
      var ret = monthlyData[ym] || 0;
      var retColor = ret >= 0 ? 'var(--green)' : 'var(--red)';
      var retText = (ret >= 0 ? '+' : '') + ret.toFixed(2) + '%';
      var firstDow = new Date(yr, mo - 1, 1).getDay();
      var daysInM = new Date(yr, mo, 0).getDate();

      var h = '<div class="cal-month-view">';
      h += '<div class="cal-header">';
      h += '<button class="cal-back">← 返回</button>';
      h += '<div class="cal-title">' + yr + '年 ' + monthNames[mo-1] + '</div>';
      h += '<div class="cal-total" style="color:' + retColor + '">' + retText + '</div>';
      h += '</div>';
      h += '<div class="cal-grid">';
      weekDays.forEach(function(d) { h += '<div class="cal-dow">' + d + '</div>'; });
      for (var b = 0; b < firstDow; b++) { h += '<div class="cal-cell blank"></div>'; }
      for (var day = 1; day <= daysInM; day++) {
        var dk = ym + '-' + (day < 10 ? '0' + day : day);
        var dd2 = dailyData[dk];
        if (dd2) {
          var dc = dd2.pct >= 0 ? 'up' : 'dn';
          var pc = dd2.pct >= 0 ? 'var(--green)' : 'var(--red)';
          h += '<div class="cal-cell ' + dc + '">';
          h += '<div class="dc-num">' + day + '</div>';
          h += '<div class="dc-pct" style="color:' + pc + '">' + (dd2.pct>=0?'+':'') + dd2.pct.toFixed(2) + '%</div>';
          h += '</div>';
        } else {
          h += '<div class="cal-cell non"><div class="dc-num">' + day + '</div></div>';
        }
      }
      h += '</div></div>';
      calEl.innerHTML = h;
      calEl.querySelector('.cal-back').addEventListener('click', renderYear);
    }

    computeCal();
    renderYear();
    // 由 loadEquity() 在拉取 ledger.json 后调用：填充序列 → 重算日历 → 重绘净值曲线
    window.__refreshCalendar = function() { computeCal(); renderYear(); };
  }

  // ============ 加载每日净值序列（ledger.json → equity_points） ============
  function loadEquity() {
    fetch('data/ledger.json', { cache: 'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(L){
        var pts = (L && L.equity_points) || [];
        if (!pts.length) return;
        eqDates = pts.map(function(p){ return p.date.slice(5); });   // 'MM-DD'
        eqVals = pts.map(function(p){ return p.close; });
        renderEquityChart();
        if (typeof window.__refreshCalendar === 'function') window.__refreshCalendar();
      })
      .catch(function(e){ if (window.console) console.warn('[charts] ledger.json 加载失败，净值曲线/收益日历为空:', e && e.message || e); });
  }
  loadEquity();

  // ============ CHART 10: 决策质量评分（执行 vs 结果 分离，懒渲染） ============
  __regEvalChart('chart-decision', 360, function(chart) {
    chart.setOption({
      animation: true,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true, formatter: function(p){
        var name = p[0].name;
        var exec = p[0].value, res = p[1].value;
        return name + '<br>执行正确度: ' + exec + '/10<br>结果如意度: ' + res + '/10';
      }},
      legend: { bottom: 0, textStyle: { color: muted }, itemWidth: 14, itemHeight: 8 },
      grid: { left: 50, right: 30, top: 30, bottom: 40 },
      xAxis: { type: 'category', data: ['8/13 高抛\n(止盈+2293)', '8/13 低吸\n(抄底57.83)', '8/14 T走\n(卖出59.54)', '8/14 大金补仓\n(41.92)'], axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 12 } },
      yAxis: { type: 'value', max: 10, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      series: [
        { name: '执行正确度', type: 'bar', barWidth: 16, data: [
          { value: 9, itemStyle: { color: accent, borderRadius: [4,4,0,0] } },
          { value: 7, itemStyle: { color: accent, borderRadius: [4,4,0,0] } },
          { value: 9, itemStyle: { color: accent, borderRadius: [4,4,0,0] } },
          { value: 4, itemStyle: { color: accent, borderRadius: [4,4,0,0], opacity: 0.6 } }
        ]},
        { name: '结果如意度', type: 'bar', barWidth: 16, data: [
          { value: 8, itemStyle: { color: accent2, borderRadius: [4,4,0,0] } },
          { value: 6, itemStyle: { color: accent2, borderRadius: [4,4,0,0] } },
          { value: 3, itemStyle: { color: accent2, borderRadius: [4,4,0,0] } },
          { value: 5, itemStyle: { color: accent2, borderRadius: [4,4,0,0] } }
        ]},
      ]
    });
  });

  // ============ CHART 11: 持仓时长（首笔建仓至今）============
  var c11El = document.getElementById('chart-elapsed');
  if (c11El) {
    var c11 = echarts.init(c11El, null, { renderer: 'svg' });
    // 日期点位映射（交易日序号）
    var evMap = { '7/14': 0, '7/23': 1.2, '8/4': 2.6, '8/12': 3.8, '8/13': 4.6, '8/14': 5.4, '8/17': 6.6, '8/19': 8.0, '8/20': 8.8, '8/21': 9.6 };
    var stocks = [
      { name: '兖矿能源', from: '7/14', to: '8/4', color: red },
      { name: '大金重工', from: '7/23', to: '8/17', color: green },
      { name: '亨通光电', from: '8/4', to: '8/21', color: accent },
      { name: '申菱环境', from: '8/17', to: '8/21', color: accent2 },
      { name: '星源材质', from: '8/17', to: '8/21', color: warn }
    ];
    var custom = stocks.map(function(s, i) {
      var row = 5 - i;
      return {
        type: 'custom', name: s.name,
        renderItem: function(params, api) {
          var sx = api.coord([evMap[s.from], row])[0];
          var ex = api.coord([evMap[s.to] + 0.3, row])[0];
          var y0 = api.coord([0, row])[1];
          var h = api.size([0, 0.62])[1];
          return {
            type: 'rect',
            shape: { x: sx, y: y0, width: Math.max(ex - sx, 6), height: h, r: 3 },
            style: { fill: s.color, opacity: 0.42 }
          };
        },
        data: [[0, row], [0, row]]
      };
    });
    var today = {
      type: 'line',
      data: [[evMap['8/21'], -0.6], [evMap['8/21'], 5.6]],
      symbol: 'none', lineStyle: { color: accent2, width: 2, type: 'dashed' }, z: 3
    };
    c11.setOption({
      animation: false,
      tooltip: {
        trigger: 'item', appendToBody: true,
        formatter: function(p) { return p.seriesType === 'line' ? '' : p.seriesName; }
      },
      grid: { left: 8, right: 24, top: 22, bottom: 12, containLabel: true },
      xAxis: {
        type: 'value', min: -0.3, max: 9.2, interval: 1.4,
        axisLabel: {
          color: muted, fontSize: 10.5, fontFamily: 'JetBrainsMono',
          formatter: function(v) {
            var best = null, bd = 99;
            for (var k in evMap) { var dd = Math.abs(evMap[k] - v); if (dd < bd) { bd = dd; best = k; } }
            return bd < 0.7 ? best : '';
          }
        },
        axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, boundaryGap: false
      },
      yAxis: {
        type: 'value', min: -0.6, max: 5.6, interval: 1,
        axisLabel: {
          color: muted, fontSize: 11,
          formatter: function(v) { var n = ['兖矿能源','大金重工','亨通光电','申菱环境','星源材质']; return n[5 - v] || ''; }
        },
        axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: rule, type: 'dashed' } }
      },
      series: custom.concat([today])
    });
    window.addEventListener('resize', function() { c11.resize(); });
  }

  // ============ CHART 12: 股票级净收益 ============
  var c12El = document.getElementById('chart-winrate-pnl');
  if (c12El) {
    var c12 = echarts.init(c12El, null, { renderer: 'svg' });
    var WR = { names: ['兖矿能源','大金重工','亨通光电','申菱环境','星源材质'], pnl: [-415, 1658, 5513, -1541, -585], pct: [-1.95, 4.6, 41.96, -7.92, -3.88] };
    var allPos = WR.pnl.every(function(v) { return v >= 0; });
    c12.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis', appendToBody: true, axisPointer: { type: 'shadow' },
        formatter: function(p) {
          var i = p[0].dataIndex;
          return p[0].name + '<br>净收益: <b>' + (p[0].value >= 0 ? '+' : '') + p[0].value.toLocaleString() + ' 元</b><br>盈亏率: ' + WR.pct[i] + '%';
        }
      },
      grid: { left: 44, right: 30, top: 20, bottom: 10, containLabel: true },
      xAxis: { type: 'category', data: WR.names, axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 12 } },
      yAxis: allPos ? {
        type: 'value', min: 0, name: '元', nameTextStyle: { color: muted },
        axisLabel: { color: muted, fontSize: 10, fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: rule, type: 'dashed' } }
      } : {
        type: 'value', name: '元', nameTextStyle: { color: muted },
        axisLabel: { color: muted, fontSize: 10, fontFamily: 'JetBrainsMono' }, splitLine: { lineStyle: { color: rule, type: 'dashed' } }
      },
      series: [{
        type: 'bar', data: WR.pnl, barWidth: '48%',
        label: {
          show: true, position: 'top', fontFamily: 'JetBrainsMono',
          formatter: function(p) { return (p.value > 0 ? '+' : '') + p.value.toLocaleString(); },
          color: function(p) { return p.value >= 0 ? green : red; }
        },
        itemStyle: {
          borderRadius: [6,6,0,0],
          color: function(p) { return p.value >= 0 ? green : red; }
        }
      }]
    });
    window.addEventListener('resize', function() { c12.resize(); });
  }

  // ============ LIVE: 由 live-snapshot.json 统一刷新所有持仓相关图表与KPI ============
  // 触发时机：页面 load() 成功拉取快照后调用 window.__applySnapshot(d)
  window.__applySnapshot = function(d) {
    if (!d || !d.positions || !d.account) return;
    var a = d.account;
    var pos = d.positions || [];
    var fmt = function(n) { return Number(n).toLocaleString('zh-CN'); };

    // 1) 净值曲线/收益日历：由 data/ledger.json → equity_points 驱动（gen_ledger.py 幂等重建），
    //    快照不再单点追加，避免收益日历把相隔多天合并成一格。
    if (typeof window.__refreshCalendar === 'function') window.__refreshCalendar();

    // 2) 逐持仓浮盈亏 = (price-cost) * shares，驱动盈亏构成/逐标的/股票级净收益
    var perPos = pos.map(function(p) {
      var pnl = Math.round((p.price - p.cost) * p.shares);
      var pct = p.return_pct;
      var mv = Math.round(p.price * p.shares);
      return { name: p.name, pnl: pnl, pct: pct, mv: mv, cost: Math.round(p.cost * p.shares) };
    });

    // 3) 浮盈亏合计（盈亏构成图已按需求移除，此处仅保留 realized 供逐标的/净收益图使用）
    var floatPnl = perPos.reduce(function(s, x) { return s + x.pnl; }, 0);
    var realized = Math.round(a.total_assets - 50000 - floatPnl);

    // 5) 逐标的盈亏图（c5）：保持已实现标的用近似，浮动标的按快照
    var c5Data = [];
    [['兖矿能源', null], ['大金重工', null]].forEach(function(st) { c5Data.push({ value: realized, name: st[0] }); });
    perPos.forEach(function(x) {
      c5Data.push({ value: x.pnl, name: x.name, return_pct: x.pct });
    });
    c5.setOption({
      xAxis: { data: c5Data.map(function(x) { return x.name + (x.return_pct === undefined ? '\n(已实现)' : '\n(浮动)'); }) },
      series: [{
        data: c5Data.map(function(x) {
          return { value: x.value,
                   itemStyle: { color: x.value >= 0 ? green : (x.name === '星源材质' ? warn : red), borderRadius: [4,4,0,0] } };
        })
      }]
    });

    // 6) 股票级净收益图（c12）：已实现合并 + 浮动按快照
    if (c12El) {
      var c12names = ['已实现2票', '亨通光电', '申菱环境', '星源材质'];
      var c12pnl = [realized];
      perPos.forEach(function(x) { c12pnl.push(x.pnl); });
      var c12pct = [null].concat(perPos.map(function(x) { return x.pct; }));
      WR.names = c12names; WR.pnl = c12pnl; WR.pct = c12pct;
      var allP = WR.pnl.every(function(v) { return v >= 0; });
      c12.setOption({
        xAxis: { data: WR.names },
        yAxis: allP ? { min: 0, name: '元', nameTextStyle: { color: muted }, axisLabel: { color: muted, fontSize: 10, fontFamily: 'JetBrainsMono' } }
                    : { name: '元', nameTextStyle: { color: muted }, axisLabel: { color: muted, fontSize: 10, fontFamily: 'JetBrainsMono' } },
        series: [{ data: WR.pnl.map(function(v, i) { return { value: v, itemStyle: { color: v >= 0 ? green : red, borderRadius: [6,6,0,0] } }; }) }]
      });
    }
  };

  // 初始尝试一次懒渲染：若容器已存在于静态 HTML 则直接出图；否则等 data-loader.js
  // 渲染 eval.json 展开块后由 window.__renderEvalCharts() 再次触发。
  if (typeof window.__renderEvalCharts === 'function') window.__renderEvalCharts();
})();