// assets/patterns.js — 12种分时形态数据 + 渲染
window.PATTERNS = [
  {
    id: "up-trend", icon: "↗️", name: "单边上涨", eng: "Unilateral Rise",
    category: "trend", tags: ["看多", "趋势型", "主力推动"],
    desc: "价格几乎无回调地持续攀升，白线持续在黄线上方运行，均价线稳步上行。",
    cause: "重大利好刺激，资金抢筹，一致看多预期，卖压极轻。",
    volume: "上涨过程持续放量，价升量增，资金推动真实可靠。",
    decision: "持股待涨，不急于止盈；追涨需等回踩均价线确认。",
    action: "hold",
    actionLabel: "持有/观望"
  },
  {
    id: "osc-up", icon: "📈", name: "单边振荡上涨", eng: "Oscillating Rise",
    category: "trend", tags: ["看多", "趋势型", "N字型"],
    desc: "价格重心不断上移，途中伴有N字型回落调整，波峰波谷逐级抬高。",
    cause: "趋势看多，但存在获利盘兑现与犹豫资金，多方在分歧中占优。",
    volume: "拉升段放量，回调段缩量——健康量价结构。",
    decision: "回踩均价线不破=低吸加仓点；缩量回调=洗盘，不必恐慌。",
    action: "buy",
    actionLabel: "回踩加仓"
  },
  {
    id: "down-trend", icon: "↘️", name: "单边下跌", eng: "Unilateral Decline",
    category: "trend", tags: ["看空", "趋势型", "恐慌"],
    desc: "价格几乎无反弹地持续下滑，白线始终在黄线下方。",
    cause: "重大利空打击，一致悲观预期，承接盘稀少。",
    volume: "下跌放量=恐慌出逃；下跌缩量=阴跌无量，均不可抄底。",
    decision: "绝对不抄底、不补仓，反抽均价线是离场窗口。",
    action: "sell",
    actionLabel: "止损/离场"
  },
  {
    id: "osc-down", icon: "📉", name: "单边振荡下跌", eng: "Oscillating Decline",
    category: "trend", tags: ["看空", "趋势型", "倒N型"],
    desc: "价格重心不断下移，途中有短暂反弹，波峰波谷逐级走低（倒N型）。",
    cause: "趋势看空，反弹均遭卖压，空方在拉锯中占优。",
    volume: "反弹缩量=无力反转；下跌放量=空头延续。",
    decision: "反弹至均价线受阻=卖出信号，不抄底。",
    action: "sell",
    actionLabel: "反弹卖出"
  },
  {
    id: "surge-drop", icon: "🔻", name: "冲高回落", eng: "Rush & Retreat / A-Kill",
    category: "reversal", tags: ["看空", "反转型", "诱多", "出货"],
    desc: '盘中快速拉升后逐步或快速跌回起点甚至翻绿。若瞬间拉升后即刻跳水即为\u201c倒V\u201d或\u201cA杀\u201d。',
    cause: "早盘试探性拉升后量能不足，或主力拉高出货（诱多）。",
    volume: "拉升时无量或缩量=虚涨诱多；冲高后放量砸盘=主力出货确认。",
    decision: '无量急拉绝不追；冲高后量能跟不上且跌破均价线=立即减仓/清仓。此为\u201c钓鱼线\u201d形态，是典型诱多出货手法。',
    action: "sell",
    actionLabel: "立即减仓"
  },
  {
    id: "dip-rally", icon: "🔺", name: "探底回升", eng: "Dip & Rally / V-Reversal",
    category: "reversal", tags: ["看多", "反转型", "V型反转", "洗盘"],
    desc: "盘中快速下挫后，逐步或快速收复失地，形成长下影线。急跌后急拉即为V型反转。",
    cause: '恐慌盘瞬间出逃形成\u201c黄金坑\u201d，场外资金迅速入场扫货。',
    volume: "急跌段可能放量（恐慌抛售），但随后快速缩量止跌，拉升段放量=洗盘结束资金反攻。",
    decision: "V型反转放量收回均价线=洗盘结束信号，可低吸；反弹不放量=假反转，不参与。",
    action: "buy",
    actionLabel: "低吸进场"
  },
  {
    id: "surge-plunge", icon: "⛔", name: "急涨急跌", eng: "Inverted-V / Spike Crash",
    category: "reversal", tags: ["看空", "反转型", "诱多陷阱", "极端"],
    desc: "价格瞬间直线拉升后即刻直线跳水，形成尖顶。",
    cause: "诱多陷阱或极端情绪反转，主力先拉高吸引跟风盘，再反手出货。",
    volume: "拉升缩量，跳水放量=典型出货。",
    decision: "见此形态立即减仓或清仓，绝不追高。",
    action: "sell",
    actionLabel: "立即清仓"
  },
  {
    id: "plunge-surge", icon: "✅", name: "急跌急涨", eng: "V-Shape / Spike Recovery",
    category: "reversal", tags: ["看多", "反转型", "V型反转", "暴力洗盘"],
    desc: "价格瞬间直线下挫后即刻直线回升，形成尖底。",
    cause: "恐慌盘集中出逃后被抄底资金迅速接回，筹码快速交换。",
    volume: "下跌段可能放量（恐慌），拉升段必须放量（反转确认）。",
    decision: "放量V型收回=主力暴力洗盘，可低吸；不放量=假反转。",
    action: "buy",
    actionLabel: "抄底进场"
  },
  {
    id: "sideways", icon: "➡️", name: "横盘振荡", eng: "Sideways / Loom",
    category: "consolidation", tags: ["中性", "整理型", "织布机"],
    desc: "价格在极窄区间（±1%以内）上下波动，无明确方向，白线紧贴黄线。",
    cause: "多空暂时平衡，双方力量胶着，等待新信息打破僵局。",
    volume: "成交量持续萎缩=交投清淡，观望；放量突破方向=方向选择。",
    decision: "放量向上突破横盘平台=买入信号；放量向下破位=卖出信号；缩量横盘=观望。",
    action: "hold",
    actionLabel: "等待方向"
  },
  {
    id: "triangle", icon: "🔽", name: "收敛三角形", eng: "Converging Triangle",
    category: "consolidation", tags: ["中性", "整理型", "突破"],
    desc: "股价波动幅度持续收窄，高点逐步降低、低点逐步抬高，形成三角形。",
    cause: "多空博弈趋于平衡，筹码充分交换。",
    volume: "整理末期成交量极度萎缩，放量突破上轨=拉升信号。",
    decision: "放量突破三角形上轨、回踩不破=最佳买入点。",
    action: "hold",
    actionLabel: "等待突破"
  },
  {
    id: "tail-lift", icon: "⚠️", name: "尾盘急拉", eng: "Late Surge / Trap",
    category: "special", tags: ["看空", "特殊型", "诱多", "尾盘"],
    desc: "全天走势平稳，尾盘30分钟突然拉升。",
    cause: "主力利用尾盘流动性差的特点拉高，制造强势假象。",
    volume: "尾盘无量拉升=典型诱多出货，次日普遍低开。",
    decision: "尾盘急拉不追，次日大概率低开。持有者可考虑减仓。",
    action: "sell",
    actionLabel: "不追/减仓"
  },
  {
    id: "tail-dump", icon: "🚨", name: "尾盘跳水", eng: "Late Dump / Panic",
    category: "special", tags: ["看空", "特殊型", "恐慌", "尾盘"],
    desc: "全天平稳，尾盘突然放量下跌。",
    cause: "利空消息突袭或主力尾盘集中出货。",
    volume: "放量跳水=恐慌出货；缩量跳水=可能是洗盘。",
    decision: "放量跳水=离场；缩量跳水=次日观察是否低开高走。",
    action: "sell",
    actionLabel: "放量则离场"
  },
];

// 真实案例渲染函数（含分时、成交量、均价线）
function renderRealChart(el, labels, prices, avgs, vols, title) {
  if (!el || !labels || !prices || prices.length < 2) return;
  var chart = echarts.init(el, null, { renderer: 'svg' });
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var green = style.getPropertyValue('--green').trim();
  var red = style.getPropertyValue('--red').trim();

  // 价格轴颜色随收盘涨跌
  var up = prices[prices.length - 1] >= prices[0];
  var lineColor = up ? green : red;

  var n_am = 0;
  for (var i = 0; i < labels.length; i++) { if (labels[i] === '11:30') { n_am = i + 1; break; } }
  var markLines = [];
  if (n_am > 0) markLines.push({ xAxis: n_am - 0.5, label: { show: false }, lineStyle: { color: muted, type: 'dashed', width: 1 } });

  chart.setOption({
    animation: false,
    title: {
      text: title, textStyle: { color: '#e8edf3', fontSize: 13, fontFamily: 'BricolageGrotesque' },
      left: 8, top: 6
    },
    tooltip: {
      trigger: 'axis', appendToBody: true,
      formatter: function(params) {
        var s = params[0].axisValue;
        for (var j = 0; j < params.length; j++) {
          var q = params[j];
          if (q.seriesType === 'line') s += '<br/>' + q.seriesName + ': ' + q.value;
          else if (q.seriesName === '成交量') s += '<br/>成交量: ' + q.value + ' 手';
        }
        return s;
      }
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }], label: { backgroundColor: '#223040' } },
    grid: [
      { left: 8, right: 12, top: 40, height: '58%' },
      { left: 8, right: 12, top: '76%', height: '16%' }
    ],
    xAxis: [
      { type: 'category', data: labels, boundaryGap: false, axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { color: muted, fontSize: 9, interval: Math.floor(labels.length / 6) } },
      { type: 'category', gridIndex: 1, data: labels, boundaryGap: false, axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { show: false } }
    ],
    yAxis: [
      { type: 'value', scale: true, axisLabel: { color: muted, fontSize: 9 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
      { type: 'value', gridIndex: 1, axisLabel: { show: false }, splitLine: { show: false } }
    ],
    series: [
      {
        name: '价格', type: 'line', data: prices, smooth: false, symbol: 'none',
        lineStyle: { color: lineColor, width: 1.6 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: lineColor + '20' }, { offset: 1, color: 'transparent' }] } },
        markLine: { silent: true, symbol: 'none', data: markLines },
        z: 3
      },
      {
        name: '均价线', type: 'line', data: avgs, smooth: false, symbol: 'none',
        lineStyle: { color: accent2, width: 1, type: 'dashed' }, z: 2
      },
      {
        name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: vols,
        itemStyle: {
          color: function(p) {
            var ref = prices[p.dataIndex] || 0;
            var prev = p.dataIndex > 0 ? prices[p.dataIndex - 1] : ref;
            return ref >= prev ? green : red;
          }
        }, barWidth: '80%'
      }
    ]
  });
  return chart;
}

// 显示形态详情
function showPatternDetail(idx) {
  var p = window.PATTERNS[idx];
  var detail = document.getElementById('pattern-detail');
  var allCards = document.querySelectorAll('.pattern-card');
  allCards.forEach(function(c) { c.classList.remove('selected'); });
  allCards[idx].classList.add('selected');

  var actionClass = '';
  if (p.action === 'sell') actionClass = 'sell';
  else if (p.action === 'buy') actionClass = 'buy';
  else actionClass = 'hold';

  var catLabel = '';
  if (p.category === 'trend') catLabel = '趋势型';
  else if (p.category === 'reversal') catLabel = '反转型';
  else if (p.category === 'consolidation') catLabel = '整理型';
  else catLabel = '特殊博弈型';

  // 找该形态的真实案例
  var reals = [];
  if (window.REAL_EXAMPLES && REAL_EXAMPLES.examples) {
    reals = REAL_EXAMPLES.examples.filter(function(e) { return e.pattern === p.id; });
  }

  var realHtml = '';
  if (reals.length > 0) {
    realHtml += '<div class="pd-section"><h4>🎯 今日真实案例</h4><p style="margin-bottom:10px;color:var(--muted);font-size:13px">以下为' + new Date().toLocaleDateString('zh-CN') + '其他个股的真实分时走势，白线=价格、黄虚线=均价、柱=成交量（绿涨红跌）。</p>';
    reals.forEach(function(r, ri) {
      var st = r.stats;
      var dirClass = st.change >= 0 ? 'var(--green)' : 'var(--red)';
      realHtml += '<div class="rb-item" style="margin-bottom:14px">';
      realHtml += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
      realHtml += '<span style="font-weight:700;font-size:14px">' + (r.name || '') + ' <span style="color:var(--muted);font-weight:400;font-size:12px">' + (r.code||'') + '</span></span>';
      realHtml += '<span style="font-size:12px;color:' + dirClass + ';font-weight:600">涨跌 ' + (st ? st.change + '%' : '') + ' · 振幅 ' + (st ? st.range + '%' : '') + '</span>';
      realHtml += '</div>';
      realHtml += '<div class="rb-chart" id="re-chart-' + p.id + '-' + ri + '" style="height:190px;border:1px solid var(--rule);border-radius:8px;background:var(--bg)"></div>';
      realHtml += '</div>';
    });
    realHtml += '</div>';
  } else {
    realHtml = '<div class="pd-section"><h4>🎯 真实案例</h4><p style="color:var(--muted)">今日盘面暂未出现该形态的典型实例，可参考上方特征描述学习。</p></div>';
  }

  detail.innerHTML =
    '<div class="pd-section">' +
      '<h4>形态特征</h4>' +
      '<p>' + p.desc + '</p>' +
    '</div>' +
    '<div class="pd-section">' +
      '<h4>形成原因</h4>' +
      '<p>' + p.cause + '</p>' +
    '</div>' +
    '<div class="pd-section">' +
      '<h4>量价关系</h4>' +
      '<p>' + p.volume + '</p>' +
    '</div>' +
    '<div class="pd-section">' +
      '<h4>操作建议</h4>' +
      '<p style="font-weight:600;color:var(--ink)">' + p.decision + '</p>' +
    '</div>' +
    '<div class="pd-grid">' +
      '<div class="pd-item"><div class="pd-label">分类</div><div class="pd-value">' + catLabel + '</div></div>' +
      '<div class="pd-item"><div class="pd-label">操作方向</div><div class="pd-value ' + actionClass + '">' + p.actionLabel + '</div></div>' +
      '<div class="pd-item"><div class="pd-label">多空属性</div><div class="pd-value ' + (p.action === 'buy' ? 'buy' : p.action === 'sell' ? 'sell' : 'warn') + '">' + (p.action === 'buy' ? '看多' : p.action === 'sell' ? '看空' : '中性') + '</div></div>' +
    '</div>' +
    realHtml;

  detail.classList.add('active');
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // 渲染真实案例图表
  reals.forEach(function(r, ri) {
    var el = document.getElementById('re-chart-' + p.id + '-' + ri);
    if (el && r.labels) {
      var title = (r.name || '') + ' · ' + r.day_label;
      try { renderRealChart(el, r.labels, r.prices, r.avgs, r.vols, title); }
      catch(e) { }
    }
  });
}