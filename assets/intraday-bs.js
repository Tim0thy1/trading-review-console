// assets/intraday-bs.js — 5日分时拼接图 + B/S买卖点标注（券商式）
(function() {
  var data = window.INTRADAY_BS;
  var noTrade = document.getElementById('intraday-no-trade');
  var chartsEl = document.getElementById('intraday-charts');
  var moduleEl = document.getElementById('module-intraday');

  if (!data || !data.stocks || data.stocks.length === 0) {
    if (noTrade && data) {
      noTrade.style.display = '';
      if (data.window) document.getElementById('intraday-window').textContent = data.window.join(' ~ ');
    }
    return;
  }

  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var green = style.getPropertyValue('--green').trim();
  var red = style.getPropertyValue('--red').trim();

  var charts = [];

  // 每只股票一个5日分时卡片
  data.stocks.forEach(function(st) {
    var card = document.createElement('div');
    card.className = 'intraday-card';
    var head = document.createElement('div');
    head.className = 'intraday-head';
    var title = document.createElement('div');
    title.className = 'intraday-title';
    title.textContent = st.name + ' · 5日分时';
    var sub = document.createElement('div');
    sub.className = 'intraday-sub';
    sub.textContent = (st.days[0].day_label) + ' ~ ' + (st.days[st.days.length - 1].day_label) + ' · ' + st.code;
    head.appendChild(title);
    head.appendChild(sub);
    card.appendChild(head);

    var box = document.createElement('div');
    box.className = 'chart-box';
    box.style.minHeight = '320px';
    card.appendChild(box);

    var legend = document.createElement('div');
    legend.className = 'mark-legend';
    legend.innerHTML =
      '<span class="mark-chip"><span class="bs-dot" style="background:' + green + '"></span> B 买入</span>' +
      '<span class="mark-chip"><span class="bs-dot" style="background:' + red + '"></span> S 卖出</span>' +
      '<span class="mark-chip"><span style="color:' + muted + '">竖线分隔交易日</span></span>';
    card.appendChild(legend);
    chartsEl.appendChild(card);

    charts.push(drawStockChart(box, st));
  });

  // 模块从隐藏切换为显示时，resize 图表（解决 display:none 下宽度为0的问题）
  function resizeAll() {
    charts.forEach(function(c) { if (c && c.resize) c.resize(); });
  }
  if (moduleEl && 'MutationObserver' in window) {
    var obs = new MutationObserver(function() {
      if (moduleEl.classList.contains('active')) {
        setTimeout(resizeAll, 60);
      }
    });
    obs.observe(moduleEl, { attributes: true, attributeFilter: ['class'] });
  }
  // 初次加载若模块active则延迟resize
  if (moduleEl && moduleEl.classList.contains('active')) {
    setTimeout(resizeAll, 60);
  }

  function drawStockChart(box, st) {
    var chart = echarts.init(box, null, { renderer: 'svg' });

    // 拼接5天价格 & 交易日分界
    var prices = [];
    var dayBorders = [];   // 交易日分界线（下一天起点索引）
    var xLabels = [];      // 每个交易日 09:30 的标签
    var dayStarts = [];
    st.days.forEach(function(d, di) {
      var start = prices.length;
      prices = prices.concat(d.prices);
      xLabels.push(start);
      dayStarts.push(start);
      // 分界线画在下一天起点（即本日最后已有点之后）
      if (di < st.days.length - 1) dayBorders.push(prices.length);
    });

    var markLines = dayBorders.map(function(g) {
      return { xAxis: g, label: { show: false }, lineStyle: { color: rule, type: 'dashed', width: 1 } };
    });

    var buyMark = st.marks.filter(function(m) { return m.type === 'B'; }).map(function(m) {
      return { coord: [m.gidx, m.price], symbol: 'circle', symbolSize: 13,
        itemStyle: { color: green, borderColor: '#0b0f15', borderWidth: 1 },
        label: { show: true, position: 'top', formatter: 'B ' + m.price.toFixed(2), color: green, fontWeight: 700, fontSize: 11 } };
    });
    var sellMark = st.marks.filter(function(m) { return m.type === 'S'; }).map(function(m) {
      return { coord: [m.gidx, m.price], symbol: 'circle', symbolSize: 13,
        itemStyle: { color: red, borderColor: '#0b0f15', borderWidth: 1 },
        label: { show: true, position: 'bottom', formatter: 'S ' + m.price.toFixed(2), color: red, fontWeight: 700, fontSize: 11 } };
    });

    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis', appendToBody: true,
        formatter: function(params) {
          var p = params[0];
          var g = p.dataIndex;
          // 定位所属交易日
          var found = null, offset = 0;
          for (var i = 0; i < st.days.length; i++) {
            var d = st.days[i], n = d.prices.length;
            if (g >= offset && g < offset + n) {
              found = { date: d.day_label, time: d.labels[g - offset] };
              break;
            }
            offset += n;
          }
          var html = '<b>' + st.name + '</b> ' + (found ? found.date + ' ' + found.time : '') + '<br/>分时价 ¥' + p.value.toFixed(2);
          st.marks.forEach(function(m) {
            if (m.gidx === g) {
              html += '<br/><span style="color:' + (m.type === 'B' ? green : red) + '"><b>' + m.type + '</b> ' + m.shares + '股 @' + m.price.toFixed(2) + '</span><br/><span style="color:#999;font-size:11px">' + m.reason + '</span>';
            }
          });
          return html;
        }
      },
      grid: { left: 62, right: 24, top: 34, bottom: 30 },
      xAxis: {
        type: 'category', data: prices.map(function(_, i) { return i; }), boundaryGap: false,
        axisLine: { lineStyle: { color: rule } }, axisTick: { show: false },
        axisLabel: { color: muted, interval: 0, fontSize: 10, formatter: function(v) {
          var idx = xLabels.indexOf(v);
          return idx >= 0 ? st.days[idx].day_label : '';
        } }
      },
      yAxis: {
        type: 'value', scale: true,
        axisLabel: { color: muted, formatter: function(v) { return v.toFixed(2); } },
        splitLine: { lineStyle: { color: rule, type: 'dashed' } }
      },
      series: [{
        name: '5日分时', type: 'line', data: prices, showSymbol: false,
        lineStyle: { color: accent, width: 1.6 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent + '2e' }, { offset: 1, color: accent + '02' }] } },
        markLine: { symbol: 'none', silent: true, data: markLines },
        markPoint: { symbolSize: 15, label: { show: true }, data: buyMark.concat(sellMark) }
      }]
    });
    return chart;
  }
})();