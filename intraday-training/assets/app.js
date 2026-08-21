// assets/app.js — 导航 + 实战案例库
(function() {
  // ============ 导航切换 ============
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

      // 切换到训练模块时resize图表
      if (target === 'training') {
        setTimeout(function() {
          var chartEl = document.getElementById('train-chart');
          if (chartEl && chartEl._echart_instance_) {
            chartEl._echart_instance_.resize();
          }
        }, 200);
      }
    });
  });

  // ============ 实战案例库 ============
  function buildExamples() {
    var list = document.getElementById('examples-list');
    if (!list) return;

    // 真实案例数据
    var examples = [
      {
        date: '2026-08-17', stock: '大金重工 (002487)', action: '清仓',
        price: 41.34, shares: 600, pnl: '+437',
        pattern: '单边振荡下跌', patternIcon: '📉',
        evaluation: '卖点偏早，但逻辑正确',
        analysis: '大金当天走弱明显（阴线跌破支撑），你在10:29清仓逻辑正确。但卖在41.34，午间反弹至41.8+，属于"变弱预期提前离场"而非"放量滞涨确认信号"。',
        improvement: '下次等反弹至均价线再卖，或等放量确认走弱后再出手。提前离场虽然安全，但往往卖在最低点附近。',
        grade: 6
      },
      {
        date: '2026-08-17', stock: '申菱环境 (301018)', action: '建仓',
        price: 97.91, shares: 100, pnl: '+217',
        pattern: '单边上涨（强势突破）', patternIcon: '↗️',
        evaluation: 'FOMO追高，但运气好选中强势票',
        analysis: '卖完大金后立刻买入申菱（10:46），仅凭MACD走强+突破形态，介入偏晚（接近当日高点）。买入后短暂冲高至99+随即回落。好在建仓量小（100股），收盘100.18在成本之上。',
        improvement: '入场理由太单薄——仅靠MACD一个指标是不够的。应结合量价关系（是否放量突破）、均价线支撑、板块联动三重验证。好在突破了100整数关口，结构确认。',
        grade: 3
      },
      {
        date: '2026-08-14', stock: '大金重工 (002487)', action: '加仓',
        price: 41.92, shares: 100,
        pattern: '单边振荡下跌', patternIcon: '📉',
        evaluation: '补仓偏左侧，时机不佳',
        analysis: '大金继续走弱，在41.92加仓100股。补仓时股价仍在下跌趋势中，属于"抄底抄在半山腰"。',
        improvement: '补仓应等缩量止跌、出现W底或放量反转信号后再出手。左侧交易需要极强的耐心和仓位管理。',
        grade: 4
      },
      {
        date: '2026-08-13', stock: '亨通光电 (600487)', action: '减仓',
        price: 60.39, shares: 200, pnl: '+2,293',
        pattern: '冲高回落', patternIcon: '🔻',
        evaluation: '执行止盈计划，操作优秀',
        analysis: '10:26在60.39高抛200股，落袋+2,293。亨通当天冲高后回落，收盘57.25，你在高位兑现了利润。',
        improvement: '这是你最好的操作之一。提前制定止盈计划并严格执行，在冲高回落前精准离场。继续保持这种"计划交易"的习惯。',
        grade: 9
      },
      {
        date: '2026-08-13', stock: '大金重工 (002487)', action: '加仓',
        price: 42.81, shares: 100,
        pattern: '冲高回落', patternIcon: '🔻',
        evaluation: '冲动抄底，被套',
        analysis: '14:42大金尾盘回落至42.81，急于回补。买入后收盘42.55，短线被套。属于下午抄底抄在半山腰。',
        improvement: '尾盘抄底是大忌。尾盘30分钟流动性差，价格容易被操纵。下午的"抄底"往往抄在下跌中继。',
        grade: 3
      },
      {
        date: '2026-08-13', stock: '亨通光电 (600487)', action: '加仓',
        price: 57.83, shares: 200,
        pattern: '冲高回落', patternIcon: '🔻',
        evaluation: '上午高抛后下午急于接回',
        analysis: '上午60.39高抛后，下午57.83急于接回并加回400股。收盘57.25低于买价，抄底在半山腰。',
        improvement: '高抛后的回补节奏太快。应等企稳信号（缩量止跌、W底形态）再出手，而不是"跌了就买"。',
        grade: 5
      },
      {
        date: '2026-08-14', stock: '亨通光电 (600487)', action: '减仓',
        price: 59.54, shares: 100, pnl: '+163',
        pattern: '振荡上涨', patternIcon: '📈',
        evaluation: '做T兑现，弥补昨日被动',
        analysis: '将昨日抄底的100股在59.54卖出，落袋+163。虽然卖得早少赚，但弥补了昨日57.83抄底在半山腰的被动。',
        improvement: '做T的纪律很好——昨日抄底仓今日兑现，不贪。但卖点可以更耐心一些，等量价背离信号再出手。',
        grade: 7
      },
      {
        date: '2026-08-12', stock: '大金重工 (002487)', action: '减仓',
        price: 43.78, shares: 300, pnl: '+1,221',
        pattern: '单边上涨', patternIcon: '↗️',
        evaluation: '执行止盈计划，落袋为安',
        analysis: '10:30减仓大金300股@43.78，执行"浮盈>10%减仓"的止盈计划。降低仓位集中度，落袋部分利润。',
        improvement: '纪律性止盈是正确的。但大金当天冲高至43.86后回落，你在43.78卖出接近当日高点，卖点不错。',
        grade: 8
      }
    ];

    var html = '';
    examples.forEach(function(ex, i) {
      var gradeColor = ex.grade >= 7 ? 'var(--green)' : ex.grade >= 5 ? 'var(--accent2)' : 'var(--red)';
      html += '<div class="card" style="margin-bottom:14px">';
      html += '<div class="card-header">';
      html += '<h3>' + ex.patternIcon + ' ' + ex.stock + ' · ' + ex.action + '</h3>';
      html += '<div class="badge" style="color:' + gradeColor + ';border-color:' + gradeColor + '">评分 ' + ex.grade + '/10</div>';
      html += '</div>';
      html += '<div style="display:flex;gap:20px;margin-bottom:12px;flex-wrap:wrap">';
      html += '<span style="color:var(--muted);font-size:13px">日期: ' + ex.date + '</span>';
      html += '<span style="color:var(--muted);font-size:13px">价格: ' + ex.price + '</span>';
      html += '<span style="color:var(--muted);font-size:13px">数量: ' + ex.shares + '股</span>';
      if (ex.pnl) html += '<span style="color:var(--green);font-size:13px;font-weight:600">盈亏: ' + ex.pnl + '</span>';
      html += '<span style="color:var(--accent);font-size:13px">形态: ' + ex.pattern + '</span>';
      html += '</div>';
      html += '<div style="background:var(--bg);border-radius:8px;padding:14px;margin-bottom:10px">';
      html += '<div style="font-weight:600;color:var(--accent);margin-bottom:6px">📊 盘面分析</div>';
      html += '<div style="color:var(--muted);font-size:14px;line-height:1.7">' + ex.analysis + '</div>';
      html += '</div>';
      html += '<div style="background:var(--bg);border-radius:8px;padding:14px;border-left:3px solid var(--accent2)">';
      html += '<div style="font-weight:600;color:var(--accent2);margin-bottom:6px">💡 改进建议</div>';
      html += '<div style="color:var(--muted);font-size:14px;line-height:1.7">' + ex.improvement + '</div>';
      html += '</div>';
      html += '<div style="margin-top:10px;font-size:13px;color:var(--accent);font-weight:600">评价: ' + ex.evaluation + '</div>';
      html += '</div>';
    });

    list.innerHTML = html;
  }

  buildExamples();

  // 全局暴露 nextQuestion
  window.nextQuestion = window.nextQuestion || function() {};
})();