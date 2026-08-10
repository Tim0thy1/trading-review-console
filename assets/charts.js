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
  var eqDates = ['07-04','07-08','07-14','07-20','07-23','07-27','07-31','08-04','08-07','08-10'];
  var eqVals = [50000, 50500, 52100, 52800, 53300, 54000, 53800, 53500, 55510.74, 55536.74];
  c1.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true, valueFormatter: function(v){ return '¥' + Number(v).toLocaleString(); } },
    grid: { left: 60, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: eqDates, boundaryGap: false, axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: muted } },
    yAxis: { type: 'value', min: 48000, scale: true, axisLabel: { color: muted, formatter: function(v){ return (v/1000)+'k'; } }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    series: [{
      type: 'line', data: eqVals, smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { color: accent, width: 2.5 },
      itemStyle: { color: accent },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent + '44' }, { offset: 1, color: accent + '05' }] } },
      markPoint: {
        data: [
          { coord: [eqDates.length - 1, eqVals[eqVals.length - 1]], symbol: 'circle', symbolSize: 10, itemStyle: { color: accent2 } }
        ],
        label: { show: true, formatter: '¥55,537', position: 'top', color: accent2, fontFamily: 'JetBrainsMono', fontSize: 11 }
      }
    }]
  });
  window.addEventListener('resize', function() { c1.resize(); });

  // ============ CHART 2: 盈亏构成 (diverging bar) ============
  var c2 = init('chart-pnl', 300);
  var pnlData = [
    { name: '大金浮盈', v: 1700, c: green },
    { name: '亨通浮盈', v: 4300, c: green },
    { name: '兖矿分红', v: 352, c: green },
    { name: '兖矿亏损', v: -415, c: red },
    { name: '交易费用', v: -52, c: muted }
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
        { value: 53.1, name: '大金重工', itemStyle: { color: accent } },
        { value: 42.9, name: '亨通光电', itemStyle: { color: accent2 } },
        { value: 4.0, name: '现金', itemStyle: { color: muted } }
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
    xAxis: { type: 'category', data: ['兖矿能源\n(已实现)', '大金重工\n(浮动)', '亨通光电\n(浮动)'], axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 12 } },
    yAxis: { type: 'value', axisLabel: { color: muted, formatter: function(v){ return '¥'+(v/1000)+'k'; } }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    series: [{
      type: 'bar', barWidth: 46,
      data: [
        { value: -415, itemStyle: { color: red, borderRadius: [4,4,0,0] } },
        { value: 1700, itemStyle: { color: accent, borderRadius: [4,4,0,0] } },
        { value: 4300, itemStyle: { color: accent2, borderRadius: [4,4,0,0] } }
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
          value: [3, 4, 2, 6, 4, 3], name: '当前纪律',
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
    xAxis: { type: 'category', data: ['兖矿能源', '大金重工', '亨通光电'], axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 12 } },
    yAxis: { type: 'value', max: 10, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    series: [{
      type: 'bar', barWidth: 46,
      data: [
        { value: 3, itemStyle: { color: red, borderRadius: [4,4,0,0] } },
        { value: 6, itemStyle: { color: accent, borderRadius: [4,4,0,0] } },
        { value: 5, itemStyle: { color: accent2, borderRadius: [4,4,0,0] } }
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
        { name: '止盈落袋', max: 10 }, { name: '仓位管理', max: 10 },
        { name: '止损执行', max: 10 }, { name: '情绪控制', max: 10 }
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
        value: [9, 8, 2, 2, 5, 4], name: '能力画像',
        areaStyle: { color: accent + '44' }, lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent }
      }]
    }]
  });
  window.addEventListener('resize', function() { c8.resize(); });
})();