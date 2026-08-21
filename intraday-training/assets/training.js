// assets/training.js — 模拟训练模块（隐藏答案版）
(function() {
  var questions = [];
  var stats = { correct: 0, wrong: 0, total: 0 };
  var currentQ = null;
  var chart = null;
  var selectedPattern = null;
  var selectedAction = null;
  var submitted = false;

  function buildQuestions() {
    questions = [];

    // 来源一：真实股票池（今日约147只各板块个股，覆盖多种形态）
    if (window.QUIZ_POOL && QUIZ_POOL.stocks && QUIZ_POOL.stocks.length) {
      QUIZ_POOL.stocks.forEach(function(s) {
        if (!s.prices || s.prices.length < 60) return;
        questions.push({
          stock: s.name, code: s.code,
          date: '', dayLabel: '今日',
          prices: s.prices, avgs: s.avgs, vols: s.vols, labels: s.labels,
          analysis: analysisFromPool(s)
        });
      });
    }

    // 来源二：你的持仓历史分时（保留复习价值）
    if (window.INTRADAY_BS && INTRADAY_BS.stocks) {
      INTRADAY_BS.stocks.forEach(function(st) {
        st.days.forEach(function(day) {
          if (!day.prices || day.prices.length < 60) return;
          questions.push({
            stock: st.name, code: st.code, date: day.date, dayLabel: day.day_label,
            prices: day.prices, avgs: day.avgs, vols: day.vols, labels: day.labels,
            analysis: analyzeDay(day)
          });
        });
      });
    }

    shuffle(questions);
    console.log('Training questions loaded: ' + questions.length);
  }

  function analyzeDay(day) {
    var prices = day.prices;
    if (prices.length < 60) return { pattern: 'unknown', patternName: '未知', action: 'hold', explanation: '' };
    var n = prices.length, n_am = 0;
    for (var i = 0; i < n; i++) { if (day.labels[i] === '11:30') { n_am = i + 1; break; } }
    if (n_am === 0) n_am = Math.floor(n * 0.5);

    var openP = prices[0], closeP = prices[n - 1], midP = prices[n_am - 1];
    var highP = Math.max.apply(null, prices), lowP = Math.min.apply(null, prices);
    var range = (highP - lowP) / openP * 100;
    var change = (closeP - openP) / openP * 100;
    var amChange = (midP - openP) / openP * 100;
    var pmChange = (closeP - midP) / midP * 100;

    var amTrend = 0, pmTrend = 0;
    for (var i = 1; i < n_am; i++) { amTrend += (prices[i] - prices[i-1]); }
    for (var i = n_am + 1; i < n; i++) { pmTrend += (prices[i] - prices[i-1]); }

    var volatility = 0, prev = prices[0];
    for (var i = 1; i < n; i++) { volatility += Math.abs(prices[i] - prev); prev = prices[i]; }
    volatility = volatility / n / openP * 100;

    var pattern, action, patternName, explanation;

    if (range < 1.5 && Math.abs(change) < 0.5) {
      pattern = 'sideways'; patternName = '横盘振荡'; action = 'hold';
      explanation = '全天振幅极小（' + range.toFixed(1) + '%），多空暂时平衡，无明确方向，应等待放量突破。';
    } else if (range > 5 && change < -3 && amChange < 0 && pmChange < 0) {
      pattern = 'down-trend'; patternName = '单边下跌'; action = 'sell';
      explanation = '全天持续下跌（' + change.toFixed(1) + '%），无有效反弹，白线始终在均价线下方，应止损离场。';
    } else if (range > 4 && change > 3 && amChange > 0 && pmChange > 0) {
      pattern = 'up-trend'; patternName = '单边上涨'; action = 'hold';
      explanation = '全天持续上涨（+' + change.toFixed(1) + '%），白线在黄线上方运行，资金推动真实，应持有待涨。';
    } else if (amChange > 2 && pmChange < -1) {
      pattern = 'surge-drop'; patternName = '冲高回落'; action = 'sell';
      explanation = '上午冲高+' + amChange.toFixed(1) + '%，下午回落' + pmChange.toFixed(1) + '%，典型诱多出货形态，应立即减仓。';
    } else if (amChange < -1.5 && pmChange > 1.5) {
      pattern = 'dip-rally'; patternName = '探底回升'; action = 'buy';
      explanation = '上午下探' + amChange.toFixed(1) + '%，下午强势回升+' + pmChange.toFixed(1) + '%，V型反转洗盘结束，可低吸。';
    } else if (change > 0 && amTrend > 0 && pmTrend > 0 && volatility > 0.15) {
      pattern = 'osc-up'; patternName = '单边振荡上涨'; action = 'buy';
      explanation = '价格重心不断上移（+' + change.toFixed(1) + '%），N字型上涨，回调缩量可低吸加仓。';
    } else if (change < 0 && amTrend < 0 && pmTrend < 0 && volatility > 0.15) {
      pattern = 'osc-down'; patternName = '单边振荡下跌'; action = 'sell';
      explanation = '价格重心不断下移（' + change.toFixed(1) + '%），反弹无力，应在反弹至均价线时卖出。';
    } else if (Math.abs(amChange) > 3 && Math.abs(pmChange) < 0.3) {
      if (amChange > 0) {
        pattern = 'surge-drop'; patternName = '冲高回落（尾盘横盘）'; action = 'sell';
        explanation = '上午冲高后下午横盘无力继续上攻，动能衰竭，应减仓。';
      } else {
        pattern = 'dip-rally'; patternName = '探底回升（尾盘横盘）'; action = 'buy';
        explanation = '上午下探后下午企稳，空方力量衰竭，可考虑低吸。';
      }
    } else {
      pattern = 'osc-up'; patternName = '振荡走势'; action = 'hold';
      explanation = '日内波动较大但方向不明确，需结合均价线和量价关系进一步判断。';
    }

    return {
      pattern: pattern, patternName: patternName, action: action,
      explanation: explanation,
      stats: { open: openP.toFixed(2), high: highP.toFixed(2), low: lowP.toFixed(2), close: closeP.toFixed(2), change: change.toFixed(2), range: range.toFixed(2) }
    };
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  // 用股票池的权威形态标注构造分析结果
  function analysisFromPool(s) {
    var p = s.prices, n = p.length;
    var op = p[0], cl = p[n - 1];
    var hi = Math.max.apply(null, p), lo = Math.min.apply(null, p);
    var st = s.stats || {};
    var pat = s.pattern || 'osc-up';
    var pname = s.pattern_name || '振荡走势';
    var act = s.action || 'hold';
    var pmap = {};
    if (window.PATTERNS) window.PATTERNS.forEach(function(x) { pmap[x.id] = x; });
    var pdef = pmap[pat];
    var explanation = '';
    if (pdef) {
      explanation = pdef.volume + ' 建议：' + pdef.decision;
    } else {
      explanation = st.change >= 0 ? '个股今日偏强，注意量价配合' : '个股今日偏弱，注意反弹缩量';
    }
    return {
      pattern: pat, patternName: pname, action: act,
      explanation: explanation,
      stats: {
        open: (st.open || op).toFixed ? (st.open||op).toFixed(2) : st.open || op,
        high: (st.high || hi).toFixed ? (st.high||hi).toFixed(2) : st.high || hi,
        low: (st.low || lo).toFixed ? (st.low||lo).toFixed(2) : st.low || lo,
        close: (st.close || cl).toFixed ? (st.close||cl).toFixed(2) : st.close || cl,
        change: st.change !== undefined ? st.change.toFixed ? st.change.toFixed(2) : st.change : ((cl - op) / op * 100).toFixed(2),
        range: st.range !== undefined ? st.range.toFixed ? st.range.toFixed(2) : st.range : ((hi - lo) / op * 100).toFixed(2)
      }
    };
  }

  function updateStats() {
    document.getElementById('train-correct').textContent = stats.correct;
    document.getElementById('train-wrong').textContent = stats.wrong;
    document.getElementById('train-total').textContent = stats.total;
    var rate = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(0) + '%' : '—';
    document.getElementById('train-rate').textContent = rate;
  }

  // ============ 渲染图表：纯「审题」模式，不显示任何答案 ============
  function renderChart(question) {
    var el = document.getElementById('train-chart');
    if (chart) chart.dispose();
    chart = echarts.init(el, null, { renderer: 'svg' });

    var style = getComputedStyle(document.documentElement);
    var accent = style.getPropertyValue('--accent').trim();
    var accent2 = style.getPropertyValue('--accent2').trim();
    var muted = style.getPropertyValue('--muted').trim();
    var rule = style.getPropertyValue('--rule').trim();
    var green = style.getPropertyValue('--green').trim();
    var red = style.getPropertyValue('--red').trim();

    var labels = question.labels, prices = question.prices;
    var vols = question.vols || [];
    var hasVol = vols && vols.length === prices.length;

    // 均价线
    var avgPrices = [], sum = 0;
    for (var i = 0; i < prices.length; i++) { sum += prices[i]; avgPrices.push(+(sum / (i + 1)).toFixed(2)); }

    // 上午/下午分界
    var markLines = [];
    var n_am = 0;
    for (var i = 0; i < labels.length; i++) { if (labels[i] === '11:30') { n_am = i + 1; break; } }
    if (n_am > 0) {
      markLines.push({ xAxis: n_am - 0.5, label: { show: false }, lineStyle: { color: muted, type: 'dashed', width: 1 } });
    }

    // 隐藏价格数值，只显示Y轴刻度
    chart.setOption({
      animation: false,
      title: {
        text: question.stock + ' (' + question.code.toUpperCase() + ')',
        subtext: question.dayLabel + ' —— 请根据走势形态判断',
        textStyle: { color: '#e8edf3', fontSize: 15, fontFamily: 'BricolageGrotesque' },
        subtextStyle: { color: muted, fontSize: 12 },
        left: 10, top: 8
      },
      tooltip: {
        trigger: 'axis', appendToBody: true,
        formatter: function(params) {
          var s = params[0].axisValue;
          for (var j = 0; j < params.length; j++) {
            var q = params[j];
            if (q.seriesName === '成交量') {
              s += '<br/>成交量: ' + q.value + ' 手';
            } else if (q.seriesType === 'line') {
              s += '<br/>' + q.seriesName + ': ' + q.value;
            }
          }
          return s;
        }
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }], label: { backgroundColor: '#223040' } },
      grid: hasVol
        ? [{ left: 60, right: 30, top: 58, height: '52%' }, { left: 60, right: 30, top: '80%', height: '13%' }]
        : [{ left: 60, right: 30, top: 60, bottom: 30 }],
      xAxis: [
        {
          type: 'category', data: labels,
          axisLine: { lineStyle: { color: rule } }, axisTick: { show: false },
          axisLabel: { color: muted, fontSize: 10, interval: Math.floor(labels.length / 8), fontFamily: 'JetBrainsMono' }
        },
        hasVol ? { type: 'category', gridIndex: 1, data: labels, axisLine: { lineStyle: { color: rule } }, axisTick: { show: false }, axisLabel: { show: false } } : null
      ].filter(Boolean),
      yAxis: [
        {
          type: 'value', scale: true,
          axisLabel: { color: muted, fontSize: 10, fontFamily: 'JetBrainsMono' },
          splitLine: { lineStyle: { color: rule, type: 'dashed' } }
        },
        hasVol ? { type: 'value', gridIndex: 1, axisLabel: { show: false }, splitLine: { show: false } } : null
      ].filter(Boolean),
      series: [
        {
          name: '价格', type: 'line', data: prices, smooth: false, symbol: 'none',
          lineStyle: { color: accent, width: 1.8 },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: green + '15' }, { offset: 1, color: 'transparent' }] }
          },
          markLine: { silent: true, symbol: 'none', data: markLines }
        },
        {
          name: '均价线', type: 'line', data: avgPrices, smooth: false, symbol: 'none',
          lineStyle: { color: accent2, width: 1, type: 'dashed' }, itemStyle: { color: accent2 }
        }
      ].concat(hasVol ? [{
        name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: vols,
        itemStyle: { color: function(pp) { var ref = prices[pp.dataIndex] || 0; var prev = pp.dataIndex > 0 ? prices[pp.dataIndex - 1] : ref; return ref >= prev ? green : red; } },
        barWidth: '80%'
      }] : [])
    });

    ensureResize();
  }

  var resizeBound = false;
  function ensureResize() {
    if (resizeBound) return;
    resizeBound = true;
    window.addEventListener('resize', function() { if (chart) chart.resize(); });
    var trainingModule = document.getElementById('module-training');
    if (trainingModule && 'MutationObserver' in window) {
      var obs = new MutationObserver(function() {
        if (trainingModule.classList.contains('active') && chart) { setTimeout(function() { chart.resize(); }, 100); }
      });
      obs.observe(trainingModule, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // ============ 渲染选项 ============
  function renderOptions() {
    var patternOpts = document.getElementById('train-options');
    var actionOpts = document.getElementById('train-actions');
    var correctPattern = currentQ.analysis.pattern;
    var allPatterns = ['up-trend','osc-up','down-trend','osc-down','surge-drop','dip-rally','surge-plunge','plunge-surge','sideways','triangle','tail-lift','tail-dump'];
    var distractors = allPatterns.filter(function(p) { return p !== correctPattern; });
    shuffle(distractors);
    var options = [correctPattern].concat(distractors.slice(0, 3));
    shuffle(options);

    var patternMap = {};
    window.PATTERNS.forEach(function(p) { patternMap[p.id] = p; });

    patternOpts.innerHTML = '';
    options.forEach(function(opt) {
      var p = patternMap[opt] || { name: opt, icon: '❓' };
      var div = document.createElement('div');
      div.className = 'training-option';
      div.setAttribute('data-pattern', opt);
      div.innerHTML = '<div class="to-name">' + p.icon + ' ' + p.name + '</div><div class="to-desc">' + (p.eng || '') + '</div>';
      div.onclick = function() { selectPattern(opt, div); };
      patternOpts.appendChild(div);
    });

    actionOpts.innerHTML = '';
    var actions = [
      { id: 'buy', name: '加仓/买入', desc: '低吸加仓' },
      { id: 'sell', name: '止盈/减仓', desc: '落袋为安' },
      { id: 'hold', name: '持有观望', desc: '按兵不动' },
      { id: 'stop', name: '止损离场', desc: '果断离场' }
    ];
    actions.forEach(function(a) {
      var div = document.createElement('div');
      div.className = 'training-option';
      div.setAttribute('data-action', a.id);
      div.innerHTML = '<div class="to-name">' + a.name + '</div><div class="to-desc">' + a.desc + '</div>';
      div.onclick = function() { selectAction(a.id, div); };
      actionOpts.appendChild(div);
    });
  }

  function selectPattern(opt, el) {
    if (submitted) return;
    var allOpts = document.querySelectorAll('#train-options .training-option');
    allOpts.forEach(function(o) { o.classList.remove('selected'); });
    el.classList.add('selected');
    selectedPattern = opt;
  }

  function selectAction(opt, el) {
    if (submitted) return;
    var allOpts = document.querySelectorAll('#train-actions .training-option');
    allOpts.forEach(function(o) { o.classList.remove('selected'); });
    el.classList.add('selected');
    selectedAction = opt;
  }

  // ============ 提交答案 ============
  window.submitAnswer = function() {
    if (submitted || !currentQ) return;

    if (!selectedPattern) { alert('请先选择日内形态！'); return; }
    if (!selectedAction) { alert('请先选择操作方向！'); return; }

    submitted = true;

    var patternCorrect = selectedPattern === currentQ.analysis.pattern;
    var actionCorrect = (selectedAction === currentQ.analysis.action) ||
      (selectedAction === 'stop' && currentQ.analysis.action === 'sell') ||
      (selectedAction === 'sell' && currentQ.analysis.action === 'stop');

    if (patternCorrect) stats.correct++; else stats.wrong++;
    stats.total++;
    updateStats();

    // 高亮正确/错误
    var patternOpts = document.querySelectorAll('#train-options .training-option');
    patternOpts.forEach(function(o) {
      o.style.pointerEvents = 'none';
      if (o.getAttribute('data-pattern') === currentQ.analysis.pattern) o.classList.add('correct');
      if (o.getAttribute('data-pattern') === selectedPattern && !patternCorrect) o.classList.add('wrong');
    });

    var actionOpts = document.querySelectorAll('#train-actions .training-option');
    actionOpts.forEach(function(o) {
      o.style.pointerEvents = 'none';
      var act = o.getAttribute('data-action');
      var correctAct = currentQ.analysis.action === 'stop' ? 'sell' : currentQ.analysis.action;
      if (act === correctAct) o.classList.add('correct');
      if (act === selectedAction && !actionCorrect) o.classList.add('wrong');
    });

    // 显示反馈
    var fb = document.getElementById('train-feedback');
    var a = currentQ.analysis;
    var allCorrect = patternCorrect && actionCorrect;

    fb.className = 'training-feedback show ' + (allCorrect ? 'correct' : 'wrong');
    document.getElementById('fb-title').textContent = allCorrect ? '✅ 回答正确！' : '❌ 回答有误';
    document.getElementById('fb-content').innerHTML =
      '<strong>实际形态：</strong>' + a.patternName + '<br><br>' +
      '<strong>分析：</strong>' + a.explanation + '<br><br>' +
      '<strong>当日数据：</strong>开盘 ¥' + a.stats.open + ' / 最高 ¥' + a.stats.high + ' / 最低 ¥' + a.stats.low + ' / 收盘 ¥' + a.stats.close + ' / 涨跌 ' + a.stats.change + '% / 振幅 ' + a.stats.range + '%';

    var actionLabel = '';
    if (a.action === 'buy') actionLabel = '加仓/买入';
    else if (a.action === 'sell') actionLabel = '止盈/减仓';
    else actionLabel = '持有观望';

    document.getElementById('fb-verdict').innerHTML = '<strong>建议操作：</strong>' + actionLabel;

    // 显示下一题按钮
    document.getElementById('train-next').style.display = '';
    document.getElementById('train-submit').style.display = 'none';
  };

  // ============ 下一题 ============
  window.nextQuestion = function() {
    if (questions.length === 0) {
      buildQuestions();
      if (questions.length === 0) { alert('题库加载中，请稍候...'); return; }
    }

    submitted = false;
    selectedPattern = null;
    selectedAction = null;

    var idx = Math.floor(Math.random() * questions.length);
    currentQ = questions[idx];

    document.getElementById('train-feedback').className = 'training-feedback';
    document.getElementById('train-next').style.display = 'none';
    document.getElementById('train-submit').style.display = '';

    renderChart(currentQ);
    renderOptions();
  };

  // 初始化
  buildQuestions();
  updateStats();
  setTimeout(function() { nextQuestion(); }, 300);
})();