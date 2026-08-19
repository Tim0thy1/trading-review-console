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

  function init(el, h) {
    return echarts.init(document.getElementById(el), null, { renderer: 'svg' });
  }

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
  var c1 = init('chart-equity', 340);
  var eqDates = ['07-14','07-15','07-16','07-17','07-20','07-21','07-22','07-23','07-24','07-27','07-28','07-29','07-30','07-31','08-03','08-04','08-05','08-06','08-07','08-10','08-11','08-12','08-13','08-14','08-17','08-18','08-19'];
  var eqVals = [49899.85,51001.5,50100.15,49499.25,51602.4,51802.7,53305.0,53104.7,50400.6,51602.4,51101.7,51602.4,51402.1,51101.7,50701.1,51402.1,53805.7,53905.9,55508.3,55508.3,54406.6,56100.0,55825.0,56650.0,57300.0,57207.62,52959.63];
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
          { coord: [eqDates.length - 1, eqVals[eqVals.length - 1]], symbol: 'circle', symbolSize: 10, itemStyle: { color: accent2 } }
        ],
        label: { show: true, formatter: '¥52,960', position: 'top', color: accent2, fontFamily: 'JetBrainsMono', fontSize: 11 }
      }
    }]
  });
  window.addEventListener('resize', function() { c1.resize(); });

  // ============ CHART 2: 盈亏构成 (diverging bar) ============
  var c2 = init('chart-pnl', 300);
  var pnlData = [
    { name: '亨通光电浮盈', v: 4532, c: green },
    { name: '申菱环境浮亏', v: -2101, c: red },
    { name: '星源材质浮亏', v: -655, c: red },
    { name: '已实现落袋', v: 1183, c: green }
  ];
  c2.setOption({
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true, formatter: function(p){ return p[0].name + '<br>¥' + Number(p[0].value).toLocaleString(); } },
    grid: { left: 10, right: 40, top: 10, bottom: 10, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: muted, formatter: function(v){ return '¥'+(v/1000)+'k'; } }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    yAxis: { type: 'category', data: pnlData.map(function(d){ return d.name; }), axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: ink } },
    series: [{
      type: 'bar', data: pnlData.map(function(d){ return { value: d.v, itemStyle: { color: d.c, borderRadius: d.v >= 0 ? [0,4,4,0] : [4,0,0,4] } }; }),
      barWidth: 18,
      label: { show: true, position: 'right', color: ink, fontFamily: 'JetBrainsMono', fontSize: 11, formatter: function(p){ return (p.value>=0?'+':'') + '¥' + p.value.toLocaleString(); } }
    }]
  });
  window.addEventListener('resize', function() { c2.resize(); });

  // ============ CHART 3: 仓位配置 donut ============
  var c3 = init('chart-alloc', 300);
  c3.setOption({
    animation: false,
    tooltip: { trigger: 'item', formatter: function(p){ return p.name + ': ' + p.value + '%'; }, appendToBody: true },
    series: [{
      type: 'pie', radius: ['42%', '70%'], center: ['50%', '50%'], avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: bg2, borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%', color: ink, fontSize: 11 },
      labelLine: { lineStyle: { color: rule } },
      data: [
        { value: 32.8, name: '申菱环境', itemStyle: { color: accent } },
        { value: 33.4, name: '亨通光电', itemStyle: { color: accent2 } },
        { value: 27.2, name: '星源材质', itemStyle: { color: warn } },
        { value: 6.6, name: '现金', itemStyle: { color: muted } }
      ]
    }]
  });
  window.addEventListener('resize', function() { c3.resize(); });

  // ============ CHART 4: 兖矿盈亏构成 ============
  var c4 = init('chart-yk-break', 280);
  var yk = [
    { name: '价差亏损', v: -715, c: red },
    { name: '现金分红', v: 352, c: green },
    { name: '交易费用', v: -52, c: muted }
  ];
  c4.setOption({
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true, formatter: function(p){ return p[0].name + '<br>¥' + Number(p[0].value).toLocaleString(); } },
    grid: { left: 10, right: 40, top: 10, bottom: 10, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: muted, formatter: function(v){ return '¥'+(v/1000)+'k'; } }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    yAxis: { type: 'category', data: yk.map(function(d){ return d.name; }), axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: ink } },
    series: [{
      type: 'bar', data: yk.map(function(d){ return { value: d.v, itemStyle: { color: d.c, borderRadius: d.v >= 0 ? [0,4,4,0] : [4,0,0,4] } }; }),
      barWidth: 20,
      label: { show: true, position: 'right', color: ink, fontFamily: 'JetBrainsMono', fontSize: 12, formatter: function(p){ return (p.value>=0?'+':'') + '¥' + p.value; } }
    }]
  });
  window.addEventListener('resize', function() { c4.resize(); });

  // ============ CHART 5: 已实现 vs 浮动 (按标的) ============
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
        { value: -2101, itemStyle: { color: red, borderRadius: [4,4,0,0] } },
        { value: 4532, itemStyle: { color: accent2, borderRadius: [4,4,0,0] } },
        { value: -655, itemStyle: { color: warn, borderRadius: [4,4,0,0] } }
      ],
      label: { show: true, position: 'top', color: ink, fontFamily: 'JetBrainsMono', fontSize: 12, formatter: function(p){ return (p.value>=0?'+':'') + '¥' + p.value.toLocaleString(); } }
    }]
  });
  window.addEventListener('resize', function() { c5.resize(); });

  // ============ CHART 6: 六维纪律雷达 ============
  var c6 = init('chart-radar', 400);
  c6.setOption({
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
          value: [6, 3, 6, 2, 3, 2], name: '当前纪律',
          areaStyle: { color: accent2 + '44' }, lineStyle: { color: accent2, width: 2 }, itemStyle: { color: accent2 }
        },
        {
          value: [8, 8, 8, 8, 8, 8], name: '合格线',
          areaStyle: { color: accent + '22' }, lineStyle: { color: accent, width: 2, type: 'dashed' }, itemStyle: { color: accent }
        }
      ]
    }]
  });
  window.addEventListener('resize', function() { c6.resize(); });

  // ============ CHART 7: 逐笔操作评分 ============
  var c7 = init('chart-tradescore', 320);
  c7.setOption({
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
  window.addEventListener('resize', function() { c7.resize(); });

  // ============ CHART 8: 交易者画像雷达 ============
  var c8 = init('chart-avatar', 360);
  c8.setOption({
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
  window.addEventListener('resize', function() { c8.resize(); });

  // ============ CHART 9: 收益日历（年视图 → 月视图下钻） ============
  var calEl = document.getElementById('chart-monthly');
  if (calEl) {
    // 由净值序列推算每日收益率，7/14首日以5万本金为基准
    var dailyData = {};   // { '2026-07-15': {pct: +2.21, val: 51001.5} }
    var monthlyData = {}; // { '2026-07': +2.20 }
    var monthStart = {};  // { '2026-07': 50000, '2026-08': 51101.7 }
    var prevV = 50000;
    var curMonth = '';
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
    var lastVal = {};
    for (var i2 = eqDates.length - 1; i2 >= 0; i2--) {
      var ym2 = '2026-' + eqDates[i2].slice(0, 2);
      if (!lastVal[ym2]) lastVal[ym2] = eqVals[i2];
    }
    for (var ym3 in monthStart) {
      if (lastVal[ym3]) monthlyData[ym3] = +((lastVal[ym3] - monthStart[ym3]) / monthStart[ym3] * 100).toFixed(2);
    }

    var monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    var weekDays = ['日','一','二','三','四','五','六'];

    // ---- 年视图 ----
    function renderYear() {
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
      h += '<div class="cal-summary">本金 ¥50,000 → 当前 ¥' + eqVals[eqVals.length-1].toLocaleString(undefined,{maximumFractionDigits:0}) + ' · 累计 <strong style="color:var(--green)">+5.92%</strong></div>';
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

    renderYear();
  }

  // ============ CHART 10: 决策质量评分（执行 vs 结果 分离） ============
  var c10 = init('chart-decision', 360);
  c10.setOption({
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
  window.addEventListener('resize', function() { c10.resize(); });

  // ============ CHART 11: 持仓时长（首笔建仓至今）============
  var c11El = document.getElementById('chart-elapsed');
  if (c11El) {
    var c11 = echarts.init(c11El, null, { renderer: 'svg' });
    // 日期点位映射（交易日序号）
    var evMap = { '7/14': 0, '7/23': 1.2, '8/4': 2.6, '8/12': 3.8, '8/13': 4.6, '8/14': 5.4, '8/17': 6.6, '8/19': 8.0 };
    var stocks = [
      { name: '兖矿能源', from: '7/14', to: '8/4', color: red },
      { name: '大金重工', from: '7/23', to: '8/17', color: green },
      { name: '亨通光电', from: '8/4', to: '8/19', color: accent },
      { name: '申菱环境', from: '8/17', to: '8/19', color: accent2 },
      { name: '星源材质', from: '8/17', to: '8/19', color: warn }
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
      data: [[evMap['8/19'], -0.6], [evMap['8/19'], 5.6]],
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
        type: 'value', min: -0.3, max: 8.4, interval: 1.4,
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
    var WR = { names: ['兖矿能源','大金重工','亨通光电','申菱环境','星源材质'], pnl: [-415, 1658, 4532, -2101, -655], pct: [-1.95, 4.6, 34.49, -10.79, -4.35] };
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
})();