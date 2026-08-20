// assets/charts.js — US Market Review 2026-08-19
(function() {
  var s = getComputedStyle(document.documentElement);
  var accent = s.getPropertyValue('--accent').trim();
  var accent2 = s.getPropertyValue('--accent2').trim();
  var ink = s.getPropertyValue('--ink').trim();
  var muted = s.getPropertyValue('--muted').trim();
  var rule = s.getPropertyValue('--rule').trim();
  var bg2 = s.getPropertyValue('--bg2').trim();
  var green = s.getPropertyValue('--green').trim();
  var red = s.getPropertyValue('--red').trim();
  var warn = s.getPropertyValue('--warn').trim();

  var aStyle = { lineStyle: { color: rule }, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } };

  function init(el, h) {
    return echarts.init(document.getElementById(el), null, { renderer: 'svg' });
  }

  // ============ CHART 1: 三大指数近期走势 ============
  var c1 = init('chart-indices', 380);
  c1.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: { data: ['S&P 500','纳斯达克','道琼斯'], textStyle: { color: muted }, top: 0 },
    grid: { left: 55, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: ['08-13','08-14','08-17','08-18','08-19'], axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted } },
    yAxis: [
      { type: 'value', name: 'S&P / Nasdaq', nameTextStyle: { color: muted, fontSize: 10 }, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      { type: 'value', name: 'Dow', nameTextStyle: { color: muted, fontSize: 10 }, axisLabel: { color: muted }, splitLine: { show: false } }
    ],
    series: [
      { name: 'S&P 500', type: 'line', data: [7620, 7650, 7630, 7692, 7708], smooth: true, lineStyle: { color: accent, width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: accent } },
      { name: '纳斯达克', type: 'line', data: [26080, 26200, 26150, 26290, 26331], smooth: true, lineStyle: { color: accent2, width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: accent2 } },
      { name: '道琼斯', type: 'line', yAxisIndex: 1, data: [52850, 53100, 52980, 53343, 53463], smooth: true, lineStyle: { color: warn, width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: warn } }
    ]
  });
  window.addEventListener('resize', function() { c1.resize(); });

  // ============ CHART 2: 七巨头涨跌幅 ============
  var c2 = init('chart-mag7', 320);
  var mag7Names = ['TSLA','AMZN','AAPL','MSFT','META','GOOGL','NVDA'];
  var mag7Vals = [4.23, 2.46, 2.12, 0.55, 0.46, 0.11, -1.08];
  c2.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true, formatter: function(p) { return p[0].name + ': ' + p[0].value + '%'; } },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: mag7Names, axisLabel: { color: muted, fontWeight: 'bold' }, axisLine: { lineStyle: { color: rule } } },
    yAxis: { type: 'value', axisLabel: { color: muted, formatter: '{value}%' }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    series: [{
      type: 'bar', data: mag7Vals,
      itemStyle: { color: function(p) { return p.value >= 0 ? accent2 : red; }, borderRadius: [4,4,0,0] },
      label: { show: true, position: 'top', formatter: function(p) { return (p.value > 0 ? '+' : '') + p.value + '%'; }, color: muted, fontSize: 11 }
    }]
  });
  window.addEventListener('resize', function() { c2.resize(); });

  // ============ CHART 3: 行业ETF涨跌幅 ============
  var c3 = init('chart-sectors', 350);
  var secNames = ['医疗','非必需消费','能源','金融','必需消费','公用事业','房地产','材料','科技','工业'];
  var secVals = [3.52, 2.14, 1.80, 0.65, 0.42, 0.35, 0.28, -0.15, -0.73, -0.89];
  c3.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true, formatter: function(p) { return p[0].name + ': ' + p[0].value + '%'; } },
    grid: { left: 90, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: secNames, axisLabel: { color: muted, rotate: 35, fontSize: 10 }, axisLine: { lineStyle: { color: rule } } },
    yAxis: { type: 'value', axisLabel: { color: muted, formatter: '{value}%' }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    series: [{
      type: 'bar', data: secVals,
      itemStyle: { color: function(p) { return p.value >= 0 ? accent2 : red; }, borderRadius: [3,3,0,0] },
      label: { show: true, position: 'top', formatter: function(p) { return (p.value > 0 ? '+' : '') + p.value + '%'; }, color: muted, fontSize: 10 }
    }]
  });
  window.addEventListener('resize', function() { c3.resize(); });

  // ============ CHART 4: 宏观资产共振 ============
  var c4 = init('chart-macro', 320);
  c4.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: { data: ['10Y收益率','DXY美元指数','黄金期货','WTI原油'], textStyle: { color: muted }, top: 0 },
    grid: { left: 55, right: 20, top: 35, bottom: 25 },
    xAxis: { type: 'category', data: ['08-13','08-14','08-15','08-18','08-19'], axisLabel: { color: muted }, axisLine: { lineStyle: { color: rule } } },
    yAxis: [
      { type: 'value', name: '收益率%', nameTextStyle: { color: muted, fontSize: 10 }, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      { type: 'value', name: '价格', nameTextStyle: { color: muted, fontSize: 10 }, axisLabel: { color: muted }, splitLine: { show: false } }
    ],
    series: [
      { name: '10Y收益率', type: 'line', data: [4.68, 4.63, 4.68, 4.71, 4.64], smooth: true, lineStyle: { color: warn, width: 2 }, symbol: 'diamond', symbolSize: 6, itemStyle: { color: warn } },
      { name: 'DXY美元指数', type: 'line', yAxisIndex: 1, data: [100.2, 100.0, 99.8, 99.8, 99.65], smooth: true, lineStyle: { color: accent, width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: accent } },
      { name: '黄金期货', type: 'line', yAxisIndex: 1, data: [4380, 4400, 4360, 4420, 4545], smooth: true, lineStyle: { color: warn, width: 2 }, symbol: 'triangle', symbolSize: 6, itemStyle: { color: warn } },
      { name: 'WTI原油', type: 'line', yAxisIndex: 1, data: [83.5, 84.2, 83.8, 85.0, 85.83], smooth: true, lineStyle: { color: accent2, width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: accent2 } }
    ]
  });
  window.addEventListener('resize', function() { c4.resize(); });

  // ============ CHART 5: 半导体个股涨跌幅 ============
  var c5 = init('chart-semicon', 340);
  var semiNames = ['MRK','MRNA','BNTX','COIN','CSGP','NVDA','AMD','INTC','MU','ASML','ARM'];
  var semiVals = [12.0, 137.0, 45.0, 9.55, 7.48, -1.08, -4.33, -4.68, -7.68, -4.14, -4.4];
  c5.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true, formatter: function(p) { return p[0].name + ': ' + p[0].value + '%'; } },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: semiNames, axisLabel: { color: muted, rotate: 35, fontSize: 10 }, axisLine: { lineStyle: { color: rule } } },
    yAxis: { type: 'value', axisLabel: { color: muted, formatter: '{value}%' }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    series: [{
      type: 'bar', data: semiVals,
      itemStyle: { color: function(p) { return p.value >= 0 ? accent2 : red; }, borderRadius: [3,3,0,0] },
      label: { show: true, position: 'top', formatter: function(p) { return (p.value > 0 ? '+' : '') + p.value + '%'; }, color: muted, fontSize: 9 }
    }]
  });
  window.addEventListener('resize', function() { c5.resize(); });

  // ============ CHART 6: VIX走势 ============
  var c6 = init('chart-vix', 260);
  c6.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    grid: { left: 50, right: 20, top: 15, bottom: 25 },
    xAxis: { type: 'category', data: ['08-13','08-14','08-15','08-18','08-19'], axisLabel: { color: muted }, axisLine: { lineStyle: { color: rule } } },
    yAxis: { type: 'value', min: 12, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    series: [{
      type: 'line', data: [16.5, 15.8, 17.2, 15.84, 14.89], smooth: true,
      lineStyle: { color: warn, width: 2.5 },
      itemStyle: { color: warn },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: warn + '44' }, { offset: 1, color: warn + '05' }] } },
      markLine: { data: [{ yAxis: 15, label: { formatter: '恐慌线15', color: muted, fontSize: 10 } }], lineStyle: { color: muted, type: 'dashed' } }
    }]
  });
  window.addEventListener('resize', function() { c6.resize(); });

  // ============ CHART 7: 多空情绪雷达 ============
  var c7 = init('chart-sentiment', 300);
  c7.setOption({
    animation: false,
    tooltip: { appendToBody: true },
    radar: {
      indicator: [
        { name: 'VIX偏低', max: 100 },
        { name: '涨跌比', max: 100 },
        { name: '成交量活跃', max: 100 },
        { name: '行业宽度', max: 100 },
        { name: '避险情绪', max: 100 }
      ],
      shape: 'circle',
      splitArea: { areaStyle: { color: [bg2 + '33', bg2 + '66'] } },
      axisLine: { lineStyle: { color: rule } },
      name: { textStyle: { color: muted } }
    },
    series: [{
      type: 'radar', data: [{ value: [65, 55, 45, 64, 40], name: '8/19情绪', areaStyle: { color: accent + '33' }, lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent } }]
    }]
  });
  window.addEventListener('resize', function() { c7.resize(); });

  // ============ CHART 8: 时间线 ============
  var c8 = init('chart-timeline', 280);
  var events = [
    { value: 9.5, name: '美财政部宣布扩大回购' },
    { value: 10.5, name: 'Moderna/Merck疫苗数据' },
    { value: 11.5, name: '特朗普推迟加拿大关税' },
    { value: 14.0, name: 'FOMC会议纪要公布' },
    { value: 15.5, name: '医疗板块创历史新高' }
  ];
  c8.setOption({
    animation: false,
    tooltip: { trigger: 'item', appendToBody: true, formatter: function(p) { return p.name; } },
    grid: { left: 10, right: 10, top: 10, bottom: 10 },
    xAxis: { type: 'value', min: 8, max: 16, axisLabel: { color: muted, formatter: '{value}:00' }, splitLine: { show: false }, axisLine: { lineStyle: { color: rule } } },
    yAxis: { type: 'category', data: [''], axisLabel: { show: false }, splitLine: { show: false } },
    series: [{
      type: 'scatter', symbolSize: function(v) { return Math.max(12, v * 3); },
      data: events.map(function(e) { return { value: [e.value, 0, e.name], name: e.name }; }),
      itemStyle: { color: accent },
      label: { show: true, position: 'right', formatter: function(p) { return p.name; }, color: muted, fontSize: 11 }
    }]
  });
  window.addEventListener('resize', function() { c8.resize(); });

})();