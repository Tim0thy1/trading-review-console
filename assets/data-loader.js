// assets/data-loader.js — 数据文件化渲染器
// 从 data/*.json 加载动态内容：
//   review.json → #review-cards      已了结持仓盈亏（点击展开逐笔买卖）
//   eval.json   → #review-calendar   当日复盘日历（点击日期显示该日复盘全文）
//   ledger.json → #stage-assessment  阶段性评估（画像/三率/阶段/总结/雷达，实时重算）
//   realm.json  → #realm-current + #realm-sections 修仙境界
//   journal.json→ （修炼手记已下线，与当日复盘重复；数据文件保留）
// 更新时只需改 JSON，HTML 不再改动，从而显著降低每次更新模拟盘的 token 消耗。
(function() {
  function esc(s) {
    return (s == null ? '' : String(s))
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function fmtMoney(n) {
    var s = (n < 0 ? '-¥' : '¥') + Math.abs(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
    return s;
  }
  function loadJSON(url) {
    return fetch(url, { cache: 'no-store' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  /* ============ 通用：可展开区块（标题 + 摘要 + 全文） ============ */
  function expandableBlocks(container, sections, opts) {
    if (!container || !sections || !sections.length) return;
    opts = opts || {};
    var html = sections.map(function(sec) {
      return '<div class="dl-block" style="margin-top:18px;border:1px solid var(--rule);border-radius:14px;overflow:hidden;background:var(--bg2)">'
        + '<div class="dl-head" style="padding:15px 18px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px">'
        + '<div style="min-width:0"><div style="font-weight:700;font-size:15px">' + esc(sec.title) + '</div>'
        + '<div style="font-size:12.5px;color:var(--muted);margin-top:4px;line-height:1.65">' + esc(sec.summary || '') + '</div></div>'
        + '<span class="dl-arrow" style="flex:0 0 auto;color:var(--muted);font-size:12.5px;white-space:nowrap">展开 ▾</span>'
        + '</div>'
        + '<div class="dl-body" style="display:none;padding:0 18px 18px;border-top:1px solid var(--rule)">' + (sec.html || '') + '</div>'
        + '</div>';
    }).join('');
    container.innerHTML = html;
    container.addEventListener('click', function(e) {
      var head = e.target.closest('.dl-head');
      if (!head) return;
      var block = head.parentElement;
      var body = block.querySelector('.dl-body');
      var arrow = head.querySelector('.dl-arrow');
      var open = body.style.display === 'block';
      body.style.display = open ? 'none' : 'block';
      if (arrow) arrow.textContent = open ? '展开 ▾' : '收起 ▴';
      // 展开后触发内部图表懒渲染（评测区块的 ECharts）
      if (!open && typeof window.__renderEvalCharts === 'function') {
        setTimeout(function() { window.__renderEvalCharts(); }, 30);
      }
    });
  }

  /* ============ 1. 已了结持仓盈亏（review.json → #review-cards）
     表格形式：每只票一行（股票/状态/净收益/盈亏%），点击行展开该票各段逐笔明细 ============ */
  // 实际交易日：统计 review.json 各轮次 from→to 覆盖区间内的周一至周五天数（年份按 data_date 推断）
  function calcTradeDays(data) {
    var y = (data._meta && data._meta.data_date) ? parseInt(data._meta.data_date.slice(0, 4), 10) : (new Date().getFullYear());
    if (isNaN(y)) y = new Date().getFullYear();
    var min = null, max = null;
    data.positions.forEach(function(pos) {
      (pos.rounds || []).forEach(function(r) {
        ['from', 'to'].forEach(function(k) {
          var v = r[k];
          if (!v || !/^\d{2}-\d{2}$/.test(v)) return;
          var dt = new Date(y, parseInt(v.slice(0, 2), 10) - 1, parseInt(v.slice(3, 5), 10));
          var t = dt.getTime();
          if (min === null || t < min) min = t;
          if (max === null || t > max) max = t;
        });
      });
    });
    if (min === null || max === null) return null;
    var wd = 0;
    for (var t = min; t <= max; t += 86400000) {
      var dow = new Date(t).getDay();
      if (dow >= 1 && dow <= 5) wd++;
    }
    return wd;
  }

  function renderReview(data) {
    var el = document.getElementById('review-cards');
    if (!el || !data || !data.positions) return;

    // ---- 动态填充「历史盈亏」模块的描述与 4 个 KPI（跟随 review.json，不再写死）----
    var sum = data.summary || {};
    var dDate = (data._meta && data._meta.data_date) || '';
    var totalPnl = (typeof sum.total_pnl === 'number') ? sum.total_pnl : null;
    var roundCount = (typeof sum.round_count === 'number') ? sum.round_count : null;
    var winCount = (typeof sum.win_count === 'number') ? sum.win_count : null;
    var loseCount = (typeof sum.lose_count === 'number') ? sum.lose_count : null;
    // 股票级胜率：按「票」合并（同股多轮）统计盈亏
    var stockUp = 0, stockCount = 0;
    data.positions.forEach(function(pos) {
      var t = pos.rounds.reduce(function(s, r) { return s + (r.pnl || 0); }, 0);
      stockCount++; if (t >= 0) stockUp++;
    });
    var stockWin = stockCount ? Math.round(stockUp / stockCount * 100) : null;
    var tradeWin = roundCount ? Math.round((winCount || 0) / roundCount * 100) : null;

    var hd = document.getElementById('history-desc');
    if (hd) {
      // 计算最后清仓日（所有轮次里最大的 to 日期），避免「数据截至」措辞让人误以为没同步
      var lastSell = null;
      data.positions.forEach(function(pos) {
        (pos.rounds || []).forEach(function(r) {
          if (r.to && /^\d{2}-\d{2}$/.test(r.to) && (lastSell === null || r.to > lastSell)) lastSell = r.to;
        });
      });
      hd.innerHTML = (lastSell ? '最后清仓日 ' + lastSell + '，' : '')
        + (roundCount ? roundCount + ' 段已全部清仓了结' : '暂无了结持仓')
        + (tradeWin != null ? '：<strong>交易级 ' + winCount + ' 盈 ' + loseCount + ' 亏，胜率 ' + tradeWin + '%</strong>' : '')
        + (totalPnl != null ? '，已实现净盈亏 <strong>' + fmtMoney(totalPnl) + '</strong>' : '')
        + '。当前仍持有未了结的票见「持仓明细」，本表只列已完整清仓的段。';
    }
    var set = function(id, txt) { var e = document.getElementById(id); if (e) e.innerHTML = txt; };
    if (totalPnl != null) set('k-closed-pnl', (totalPnl >= 0 ? '+' : '') + fmtMoney(totalPnl).replace('¥', '¥'));
    if (roundCount != null) set('k-closed-pnl-sub', '累计 ' + roundCount + ' 段');
    if (tradeWin != null) {
      set('k-trade-win', tradeWin + '%');
      set('k-trade-win-sub', winCount + '盈 / ' + roundCount + '单元（同股多轮拆段）');
    }
    if (stockWin != null) {
      set('k-stock-win', stockWin + '%');
    }
    // 实际交易日：从持仓轮次的最早日期到最新日期估算（跨天后按日历日折算交易日，粗略口径）
    var days = (dDate && data.positions.length) ? calcTradeDays(data) : null;
    if (days != null) set('k-trade-days', days + ' 天');

    var rows = data.positions.map(function(pos) {
      var total = pos.rounds.reduce(function(s, r) { return s + (r.pnl || 0); }, 0);
      var rounds = pos.rounds.length;
      var up = total >= 0;
      var pct = pos.pct || '';
      // 各段明细
      var roundsHtml = pos.rounds.map(function(r) {
        var rup = (r.pnl || 0) >= 0;
        var tradesHtml = (r.trades || []).map(function(t) {
          return '<tr>'
            + '<td class="mono" style="padding:6px 8px;border-bottom:1px solid var(--rule);white-space:nowrap">' + esc(t.date) + '</td>'
            + '<td style="padding:6px 8px;border-bottom:1px solid var(--rule)">' + esc(t.action) + '</td>'
            + '<td class="mono" style="padding:6px 8px;border-bottom:1px solid var(--rule);text-align:right">' + esc(t.shares) + '</td>'
            + '<td class="mono" style="padding:6px 8px;border-bottom:1px solid var(--rule);text-align:right">' + esc(t.price) + '</td>'
            + '<td class="mono" style="padding:6px 8px;border-bottom:1px solid var(--rule);text-align:right;color:' + (String(t.pnl).indexOf('-') === 0 ? 'var(--red)' : 'var(--green)') + '">' + esc(t.pnl || '—') + '</td>'
            + '</tr>';
        }).join('');
        return '<div style="margin-top:12px;background:var(--bg2);border:1px solid var(--rule);border-radius:10px;overflow:hidden">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 14px;background:var(--bg3)">'
          + '<span style="font-size:12.5px;font-weight:700">' + esc(r.round) + ' 段 · ' + esc(r.from) + ' → ' + esc(r.to) + ' · ' + esc(r.days) + '天'
          + (r.t_count ? ' · 做T ' + esc(r.t_count) + '笔' : '') + '</span>'
          + '<span class="mono" style="font-weight:700;color:' + (rup ? 'var(--red)' : 'var(--green)') + '">' + (r.pnl >= 0 ? '+' : '') + fmtMoney(r.pnl) + '</span>'
          + '</div>'
          + '<div style="padding:2px 14px 14px">'
          + '<table style="width:100%;font-size:12.5px;border-collapse:collapse;margin-top:6px">'
          + '<thead><tr>'
          + '<th style="text-align:left;padding:6px 8px;color:var(--muted);border-bottom:1px solid var(--rule)">日期</th>'
          + '<th style="text-align:left;padding:6px 8px;color:var(--muted);border-bottom:1px solid var(--rule)">动作</th>'
          + '<th style="text-align:right;padding:6px 8px;color:var(--muted);border-bottom:1px solid var(--rule)">股数</th>'
          + '<th style="text-align:right;padding:6px 8px;color:var(--muted);border-bottom:1px solid var(--rule)">价格</th>'
          + '<th style="text-align:right;padding:6px 8px;color:var(--muted);border-bottom:1px solid var(--rule)">盈亏</th>'
          + '</tr></thead><tbody>' + tradesHtml + '</tbody></table></div></div>';
      }).join('');
      return '<tr class="review-row" data-name="' + esc(pos.name) + '" style="cursor:pointer">'
        + '<td style="padding:10px 12px;border-bottom:1px solid var(--rule)"><strong>' + esc(pos.name) + '</strong>'
        + ' <span style="color:var(--muted);font-weight:400;font-size:12px">' + esc(pos.code) + ' · ' + rounds + '段</span></td>'
        + '<td style="padding:10px 12px;border-bottom:1px solid var(--rule)"><span class="pill ' + (up ? 'g' : 'r') + '">' + (up ? '盈利' : '亏损') + '</span></td>'
        + '<td class="mono" style="padding:10px 12px;border-bottom:1px solid var(--rule);text-align:right;color:' + (up ? 'var(--red)' : 'var(--green)') + '">' + (total >= 0 ? '+' : '') + fmtMoney(total) + '</td>'
        + '<td class="mono" style="padding:10px 12px;border-bottom:1px solid var(--rule);text-align:right">' + esc(pct) + '</td>'
        + '</tr>'
        + '<tr class="review-detail" data-name="' + esc(pos.name) + '" style="display:none;background:var(--bg2)"><td colspan="4" style="padding:4px 14px 14px">' + roundsHtml + '</td></tr>';
    }).join('');
    el.innerHTML = '<table style="width:100%;font-size:13px;border-collapse:collapse">'
      + '<thead><tr>'
      + '<th style="text-align:left;padding:10px 12px;color:var(--muted);border-bottom:1px solid var(--rule)">股票</th>'
      + '<th style="text-align:left;padding:10px 12px;color:var(--muted);border-bottom:1px solid var(--rule)">状态</th>'
      + '<th style="text-align:right;padding:10px 12px;color:var(--muted);border-bottom:1px solid var(--rule)">净收益</th>'
      + '<th style="text-align:right;padding:10px 12px;color:var(--muted);border-bottom:1px solid var(--rule)">盈亏%</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table>';
    el.addEventListener('click', function(e) {
      var row = e.target.closest('.review-row');
      if (!row) return;
      var name = row.getAttribute('data-name');
      var details = el.querySelectorAll('tr.review-detail');
      for (var i = 0; i < details.length; i++) {
        if (details[i].getAttribute('data-name') === name) {
          details[i].style.display = (details[i].style.display === 'none') ? '' : 'none';
          break;
        }
      }
    });
  }

  /* ============ 2. 当日复盘日历（eval.json 带 date 的 section → 复盘日历） ============ */
  function renderEval(data) {
    var secs = (data && data.sections) || [];
    renderReviewCalendar(secs.filter(function(s) { return s.date; }));
  }

  /* ============ 2b. 当日复盘日历：点日期卡片显示该日复盘全文 ============ */
  function renderReviewCalendar(reviews) {
    var wrap = document.getElementById('review-calendar');
    var detail = document.getElementById('review-detail');
    if (!wrap) return;
    if (!reviews || !reviews.length) {
      wrap.innerHTML = '<div class="panel-sub" style="color:var(--muted)">暂无当日复盘记录。</div>';
      return;
    }
    var byDate = {};
    reviews.forEach(function(r) { if (r.date) byDate[r.date] = r; });
    var months = [];
    reviews.forEach(function(r) { if (r.date) { var mk = r.date.slice(0, 7); if (months.indexOf(mk) < 0) months.push(mk); } });
    months = months.sort();
    var cur = months[months.length - 1];   // 默认打开“最近复盘所在月”
    var selected = null;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tag(dm) { var m = parseInt(dm.slice(5, 7), 10), d = parseInt(dm.slice(8, 10), 10); return m + '/' + d; }
    function render() {
      var y = parseInt(cur.slice(0, 4), 10), m = parseInt(cur.slice(5, 7), 10);
      var firstDow = new Date(y, m - 1, 1).getDay();
      var nDays = new Date(y, m, 0).getDate();
      var now = new Date();
      var today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
      var head = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
        + '<button type="button" class="rc-nav" data-dir="-1" title="上月">‹</button>'
        + '<div style="font-weight:800;font-size:15px;color:var(--ink)">' + y + ' 年 ' + m + ' 月</div>'
        + '<button type="button" class="rc-nav" data-dir="1" title="下月">›</button></div>';
      var header = '<div class="rc-week">' + ['日', '一', '二', '三', '四', '五', '六'].map(function(w) {
        return '<div class="rc-cell rc-dow">' + w + '</div>';
      }).join('') + '</div>';
      var cells = '';
      for (var b = 0; b < firstDow; b++) cells += '<div class="rc-cell rc-void"></div>';
      for (var d = 1; d <= nDays; d++) {
        var dm = cur + '-' + pad(d);
        var has = !!byDate[dm];
        var cls = 'rc-cell' + (has ? ' has' : ' none') + (dm === selected ? ' sel' : '') + (dm === today ? ' today' : '');
        cells += '<div class="' + cls + '"' + (has ? ' data-dm="' + dm + '" title="' + esc(byDate[dm].title) + '"' : '') + '>'
          + '<span class="rc-num">' + d + '</span>'
          + (has ? '<span class="rc-tag">' + tag(dm) + '</span>' : '')
          + '</div>';
      }
      wrap.innerHTML = head + header + '<div class="rc-grid">' + cells + '</div>';
      wrap.querySelectorAll('button.rc-nav').forEach(function(b) {
        b.addEventListener('click', function() {
          var mi = months.indexOf(cur) + parseInt(b.getAttribute('data-dir'), 10);
          if (mi < 0 || mi >= months.length) return;
          cur = months[mi]; render();
        });
      });
      wrap.querySelectorAll('div[data-dm]').forEach(function(c) {
        c.addEventListener('click', function() { selected = c.getAttribute('data-dm'); render(); showDetail(selected); });
      });
    }
    function showDetail(dm) {
      var r = byDate[dm];
      if (detail) {
        if (!r) { detail.innerHTML = ''; return; }
        detail.innerHTML = '<div class="dl-block" style="margin-top:14px;border:1px solid var(--rule);border-radius:14px;overflow:hidden;background:var(--bg2)">'
          + '<div class="dl-head" style="padding:15px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px">'
          + '<div style="min-width:0"><div style="font-weight:800;font-size:15px">' + esc(r.title) + '</div>'
          + (r.summary ? '<div style="font-size:12.5px;color:var(--muted);margin-top:4px;line-height:1.65">' + esc(r.summary) + '</div>' : '')
          + '</div></div>'
          + '<div class="dl-body" style="padding:0 18px 18px;border-top:1px solid var(--rule)">' + (r.html || '') + '</div>'
          + '</div>';
        if (typeof window.__renderEvalCharts === 'function') setTimeout(function() { window.__renderEvalCharts(); }, 30);
      }
    }
    selected = reviews[0].date;   // 默认展示最新一条复盘（若无 review-* 顺序依赖，选取日期最大的一条）
    var latest = null;
    for (var i = 0; i < reviews.length; i++) { if (!latest || reviews[i].date > latest.date) { latest = reviews[i]; } }
    if (latest) selected = latest.date;
    render();
    showDetail(selected);
  }

  /* ============ 2c. 阶段性评估（整合：画像 / 三率 / 阶段定位 / 总结 / 雷达，实时重算自 ledger + forecast） ============ */
  function renderStageAssessment(ledger) {
    var cont = document.getElementById('stage-assessment');
    if (!cont || !ledger) return;
    var mentorPromise = loadJSON('data/eval.json').catch(function(){ return { mentor: null }; });
    Promise.all([loadJSON('data/forecast.json'), mentorPromise]).then(function(_a) {
      var fc = _a[0], ev = _a[1] || { mentor: null };
      var mentor = ev.mentor || null;
      var acct = ledger.account || {};
      var sm = ledger.summary || {};
      var win = +sm.win_count || 0, lose = +sm.lose_count || 0, closed = +sm.closed_count || 0;
      var total = win + lose;
      var winRate = total ? Math.round(win / total * 100) : 0;
      var ret = (typeof acct.real_return_pct === 'number') ? acct.real_return_pct : null;
      var realized = (typeof ledger.realized_pnl_total === 'number') ? ledger.realized_pnl_total : null;
      var pos = (typeof acct.position_pct === 'number') ? acct.position_pct : null;
      var dateSrc = (ledger._meta && ledger._meta.data_date) || '今日';

      var fList = Array.isArray(fc) ? fc : [];
      var scored = fList.filter(function(f) { return f && f.review; });
      var avgScore = scored.length ? Math.round(scored.reduce(function(s, f) { return s + f.review.score; }, 0) / scored.length) : null;
      var hits = scored.filter(function(f) { return f.review.dir_hit === true || f.review.dir_hit === 'part'; }).length;
      var hitRate = scored.length ? Math.round(hits / scored.length * 100) : null;
      var withDisc = scored.filter(function(f) { return typeof f.review.discipline === 'number'; });
      var disc = withDisc.length ? (withDisc.reduce(function(s, f) { return s + f.review.discipline; }, 0) / withDisc.length).toFixed(1) : null;

      var rateOnline = winRate >= 50;
      var retOnline = ret !== null && ret >= 0;
      var discOnline = avgScore !== null && avgScore >= 70;
      var onlineCount = (rateOnline ? 1 : 0) + (retOnline ? 1 : 0) + (discOnline ? 1 : 0);

      /* 修炼关卡：进度 = 三率在线数 折算；空仓克制/决策可说清作为两个附加考核维 */
      var progress = onlineCount / 3;
      var stageName, stageHint;
      if (onlineCount === 3) { stageName = '炼气·毕业验收'; stageHint = '三率全部在线，可进入实盘前验收。真正的考验是：放得下本金之外的胜负心。'; }
      else if (onlineCount === 2) { stageName = '炼气·「能不能不乱交易」'; stageHint = '已过半。纪律是筑基的地基——把止损止盈写死、计划外交易清零，向第三关迈进。'; }
      else { stageName = '炼气·「能不能做对判断」'; stageHint = '方向判断正在长，但常在「判断对、执行差」之间反复。先把预案落到触发价，再谈仓位。'; }
      /* 空仓克制 & 决策可说清：本次接近全勤判断为合格，长期以复盘记录为依据 */
      var emptyLock = true;       /* 9/11 落袋后未手痒加仓，9/14 低吸符合预案 */
      var decideOk = false;       /* 待强化：铭普「高开再炮一点」语义含糊，止盈锚未明确 */
      function guardRow(t, ok, tip){
        var col = ok ? 'var(--green)' : 'var(--red)';
        return '<div style="background:'+(ok?'rgba(16,185,129,.08)':'rgba(239,68,68,.08)')+';border:1px solid '+(ok?'rgba(16,185,129,.25)':'rgba(239,68,68,.25)')+';border-radius:8px;padding:6px 8px">'
          + '<div style="font-size:11.5px;color:'+col+';font-weight:700">'+(ok?'✓':'✗')+' '+esc(t)+'</div>'
          + '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+esc(tip)+'</div></div>';
      }

      var portrait = (rateOnline && retOnline)
        ? '胜率与收益双在线，纪律待回升'
        : (retOnline ? '收益为正但交易级胜率不足——净赚靠亨通等少数大赢覆盖多数小亏' : '长板 / 短板仍明显，核心短板在纪律与仓位');

      cont.innerHTML = '<div class="dl-block" style="border:1px solid var(--rule);border-radius:14px;overflow:hidden;background:var(--bg2)">'
        + '<div class="dl-head" style="padding:16px 18px;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">'
        + '<div style="font-weight:800;font-size:15px">🧭 导师评估 · 阶段性诊断（统一评估入口）</div>'
        + '<div style="font-size:12px;color:var(--muted)">数据实时取自 <span class="mono">ledger.json</span>（' + esc(dateSrc) + '） · 修炼境界处不再重复评估</div></div>'

        + '<div style="padding:18px 16px 0">'
        + '<div class="callout" style="margin:0 0 14px;font-size:12.5px;line-height:1.7"><strong style="color:var(--accent2)">评分口径 · 怎么算的</strong>：综合评分 = 每日盘前预测的对账评分（方向 35 分 + 个股 45 分 + 预案 25 分 + 纪律 10 分累出 <span class="mono">/100</span>）取均值，再按"三率（胜率/收益/纪律）是否同时在线"给出进阶结论。要涨分，核心在<b>盘前预案留白更少、触发价写死、计划外交易归零</b>。</div></div>'

        + '<div class="dl-body" style="padding:0 18px 18px">'

        + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px">'
        + kpiCard('交易级胜率', (total ? winRate + '%' : '—'), win + ' 胜 / ' + lose + ' 负')
        + kpiCard('累计收益率', (ret !== null ? (ret >= 0 ? '+' : '') + ret.toFixed(2) + '%' : '—'), '5万口径 · 东财权威')
        + kpiCard('已实现净盈亏', (realized !== null ? (realized >= 0 ? '+' : '') + '¥' + Number(realized).toLocaleString() : '—'), '已了结 ' + closed + ' 段')
        + kpiCard('当前仓位', (pos !== null ? pos.toFixed(2) + '%' : '—'), acct.real_assets ? '资产 ¥' + Number(acct.real_assets).toLocaleString() : '')
        + '</div>'

        + '<div style="margin-top:15px"><div style="font-size:12px;letter-spacing:.08em;color:var(--muted);margin-bottom:8px">三率检验（毕业验收：三率同时在线）</div>'
        + rateRow('① 胜率', (total ? winRate + '%' : '—'), rateOnline, '胜率≥50% 才过关')
        + rateRow('② 收益率', (ret !== null ? (ret >= 0 ? '+' : '') + ret.toFixed(2) + '%' : '—'), retOnline, '累计为正')
        + rateRow('③ 纪律·盘前均分', (avgScore !== null ? avgScore + ' / 100' : '—'), discOnline, '预测均分≥70 · 命中 ' + (hitRate !== null ? hitRate + '%' : '—') + ' · 纪律分 ' + (disc !== null ? disc + '/10' : '—'))
        + '</div>'

        + '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">'
        + '<div style="flex:1;min-width:230px;background:var(--bg3);border:1px solid var(--rule);border-radius:12px;padding:14px"><div style="font-size:11px;color:var(--muted)">交易者画像</div><div style="font-weight:700;font-size:14px;margin-top:6px;line-height:1.6">' + esc(portrait) + '</div></div>'
        + '<div style="flex:1;min-width:230px;background:var(--bg3);border:1px solid var(--rule);border-radius:12px;padding:14px"><div style="font-size:11px;color:var(--muted)">当前阶段</div><div style="font-weight:700;font-size:14px;margin-top:6px">练气期 · 第二阶段「能不能不乱交易」</div>'
        + (onlineCount === 3
          ? '<div style="font-size:12px;color:var(--green);margin-top:6px">✅ 三率全部在线，可进入实盘前验收</div>'
          : '<div style="font-size:12px;color:var(--red);margin-top:6px">⚠️ 尚差 ' + (3 - onlineCount) + ' 个维度未在线，暂不可毕业</div>') + '</div>'
        + '</div>'

        + '<div style="margin-top:15px"><div style="font-size:12px;letter-spacing:.08em;color:var(--muted);margin-bottom:6px">六维纪律（今日文字版 · 基于当日批改）</div>'
        + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">'
        + sixCell('仓位纪律', '未满仓 · 9/14 仓位59.6%', true)
        + sixCell('止损纪律', '待练 · 9/14 无止损操作，铭普-3%未离场', false)
        + sixCell('止盈落袋', '不足 · 9/14 低开走弱未兑现止盈', false)
        + sixCell('加仓纪律', '合格 · 9/14 低吸沃尔@当日低位，无计划外加仓', true)
        + sixCell('情绪控制', '合格 · CRO动心但克制，未追高', true)
        + sixCell('计划执行', '一般 · 方向命中但预案无具体触发价', false)
        + '</div></div>'

        + '<div style="margin-top:16px"><div style="font-size:12px;letter-spacing:.08em;color:var(--muted);margin-bottom:8px">导师诊断 · 更新至 ' + esc(mentor && mentor.updated_at ? mentor.updated_at : dateSrc) + '</div>'
        + (mentor && mentor.analysis_basis ? '<div style="font-size:11.5px;color:var(--muted);margin-bottom:12px;line-height:1.6">评证依据：' + esc(mentor.analysis_basis) + '</div>' : '')

        + '<div style="margin-bottom:12px"><div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:8px">✅ 已确认的进步</div>'
        + (mentor && mentor.progress && mentor.progress.length
          ? mentor.progress.map(function(t, i) { return '<div style="font-size:13px;line-height:1.7;color:var(--ink)">' + (i + 1) + '. <strong>' + esc(t.split('：')[0]) + '</strong>' + (t.indexOf('：') >= 0 ? '：' + esc(t.slice(t.indexOf('：') + 1)) : '') + '</div>'; }).join('<div style="height:6px"></div>')
          : '<div style="font-size:13px;color:var(--muted)">暂无进步记录。</div>') + '</div>'

        + '<div style="margin-bottom:12px"><div style="font-size:13px;font-weight:700;color:var(--warn);margin-bottom:8px">⚠️ 反复出现的问题（当前关卡）</div>'
        + (mentor && mentor.problems && mentor.problems.length
          ? mentor.problems.map(function(t, i) { return '<div style="font-size:13px;line-height:1.7;color:var(--ink)">' + (i + 1) + '. ' + esc(t) + '</div>'; }).join('<div style="height:6px"></div>')
          : '<div style="font-size:13px;color:var(--muted)">暂无问题记录。</div>') + '</div>'

        + '<div style="margin-bottom:12px"><div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px">🔍 深层诊断</div>'
        + '<div class="callout" style="margin:0"><span style="margin-right:3px">' + esc(mentor && mentor.deep_diagnosis || '暂无深层诊断。') + '</span></div></div>'

        + '<div><div style="font-size:13px;font-weight:700;color:var(--accent2);margin-bottom:8px">📌 下一步修炼方向</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">'
        + '<div style="background:var(--bg3);border-radius:8px;padding:12px"><div style="color:var(--accent);font-weight:700;margin-bottom:4px">近期目标（1-2周）</div>'
        + '<ul style="padding-left:16px;margin:0;color:var(--muted);font-size:12.5px">' + (mentor && mentor.next_short && mentor.next_short.length ? mentor.next_short.map(function(t) { return '<li style="margin-bottom:4px">' + esc(t) + '</li>'; }).join('') : '<li style="margin-bottom:4px">暂无。</li>') + '</ul></div>'
        + '<div style="background:var(--bg3);border-radius:8px;padding:12px"><div style="color:var(--accent2);font-weight:700;margin-bottom:4px">中期目标（1个月）</div>'
        + '<ul style="padding-left:16px;margin:0;color:var(--muted);font-size:12.5px">' + (mentor && mentor.next_mid && mentor.next_mid.length ? mentor.next_mid.map(function(t) { return '<li style="margin-bottom:4px">' + esc(t) + '</li>'; }).join('') : '<li style="margin-bottom:4px">暂无。</li>') + '</ul></div>'
        + '</div></div>'

        + '<div style="margin-top:16px;background:var(--bg2);border:1px solid var(--rule);border-radius:12px;padding:14px 16px">'
        + '<div style="font-size:12px;letter-spacing:.08em;color:var(--muted);margin-bottom:10px">🧗 修炼关卡 · 本关考核（资金体量 × 操作成熟度）</div>'
        + '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
        + '<div style="position:relative;width:92px;height:92px;flex:none"><svg viewBox="0 0 92 92" width="92" height="92"><circle cx="46" cy="46" r="38" fill="none" stroke="var(--rule)" stroke-width="9"/><circle cx="46" cy="46" r="38" fill="none" stroke="var(--accent2)" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (2*Math.PI*38) + '" stroke-dashoffset="' + (2*Math.PI*38*(1-progress)) + '" transform="rotate(-90 46 46)"/><text x="46" y="52" text-anchor="middle" font-size="20" font-weight="800" fill="var(--accent2)">' + Math.round(progress*100) + '</text><text x="46" y="64" text-anchor="middle" font-size="8" fill="var(--muted)">%过关</text></svg></div>'
        + '<div style="flex:1;min-width:230px"><div style="font-weight:800;font-size:15px">当前关卡：' + stageName + '</div>'
        + '<div style="font-size:12.5px;color:var(--muted);line-height:1.7;margin-top:4px">' + stageHint + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:10px">'
        + guardRow('空仓克制', emptyLock, '止盈/止损后能否忍住空仓等待，说明「手痒」关口的实控力')
        + guardRow('决策可说清', decideOk, '每笔操作能否一句话说清「为什么买/卖」，说不清=大脑空转')
        + '</div></div></div></div>'

        + '</div></div></div></div>';
      if (typeof window.__renderEvalCharts === 'function') { try { window.__renderEvalCharts(); } catch (e) {} }
    });

    function kpiCard(t, v, s) {
      return '<div style="background:var(--bg3);border:1px solid var(--rule);border-radius:12px;padding:13px 14px"><div style="font-size:11px;color:var(--muted)">' + esc(t) + '</div>'
        + '<div class="mono up" style="font-weight:800;font-size:18px;margin-top:5px">' + v + '</div>'
        + '<div style="font-size:11.5px;color:var(--muted);margin-top:4px">' + esc(s) + '</div></div>';
    }
    function sixCell(t, d, ok) {
      return '<div style="background:var(--bg3);border:1px solid ' + (ok ? 'rgba(16,185,129,.28)' : 'rgba(239,68,68,.24)') + ';border-radius:10px;padding:9px 12px">'
        + '<div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--ink)">'
        + '<span style="flex:none;width:8px;height:8px;border-radius:50%;background:' + (ok ? 'var(--green)' : 'var(--red)') + '"></span>' + esc(t) + '</div>'
        + '<div style="font-size:11.5px;color:var(--muted);line-height:1.5;margin-top:4px">' + esc(d) + '</div></div>';
    }
    function rateRow(t, v, ok, rest) {
      return '<div style="display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--rule);border-radius:10px;padding:9px 12px;margin-bottom:6px">'
        + '<span style="width:150px;flex:none;font-size:13px;color:var(--ink)">' + esc(t) + '</span>'
        + '<span class="mono" style="font-weight:700;font-size:14px;color:' + (ok ? 'var(--green)' : 'var(--red)') + '">' + v + '</span>'
        + '<span style="margin-left:auto;font-size:11.5px;color:' + (ok ? 'var(--green)' : 'var(--red)') + '">' + (ok ? '✓ 在线' : '✗ 未过') + '</span>'
        + '<span style="font-size:11.5px;color:var(--muted)">' + esc(rest) + '</span></div>';
    }
  }

  /* ============ 3. 修仙境界（realm.json → #realm-current + #realm-sections） ============ */
  function renderRealm(data) {
    var cur = data && data.current;
    var curEl = document.getElementById('realm-current');
    if (curEl && cur) {
      curEl.innerHTML = '<div style="display:flex;gap:20px;align-items:stretch;background:linear-gradient(135deg,rgba(217,119,6,.14),rgba(13,148,136,.08));border:1px solid rgba(217,119,6,.4);border-radius:14px;padding:22px;margin-bottom:22px;flex-wrap:wrap">'
        + '<div style="flex:1;min-width:240px">'
        + '<div style="font-size:12px;letter-spacing:.12em;color:var(--accent2);text-transform:uppercase;margin-bottom:8px">当前境界 · 修炼定位</div>'
        + '<div style="font-family:\'BricolageGrotesque\';font-weight:700;font-size:30px;color:var(--accent2)">' + esc(cur.realm) + '</div>'
        + (cur.desc ? '<div style="font-size:13px;color:var(--muted);margin-top:6px">' + esc(cur.desc) + '</div>' : '')
        + (cur.detail ? '<div style="margin-top:12px;font-size:13px;line-height:1.7;color:var(--ink)">' + esc(cur.detail) + '</div>' : '')
        + '<a href="#module-profile" style="display:inline-block;margin-top:12px;font-size:12.5px;color:var(--accent2);text-decoration:none;border-bottom:1px dashed rgba(13,148,136,.5)">🧭 详细的行为诊断与改进建议 → 见「交易者全面评测」</a>'
        + '</div>'
        + '<div style="flex:0 0 200px;display:flex;flex-direction:column;justify-content:center;gap:10px">'
        + '<div style="background:var(--bg3);border-radius:10px;padding:12px 16px">'
        + '<div style="font-size:11px;color:var(--muted)">' + esc(cur.progress_label || '修炼进度') + '</div>'
        + '<div style="font-family:\'JetBrainsMono\';font-weight:700;font-size:20px;color:var(--accent2)">' + esc(cur.progress) + '</div>'
        + '</div>'
        + '<div style="background:var(--bg3);border-radius:10px;padding:12px 16px">'
        + '<div style="font-size:11px;color:var(--muted)">距下一关</div>'
        + '<div style="font-family:\'JetBrainsMono\';font-weight:700;font-size:15px">' + esc(cur.next) + '</div>'
        + '<div style="font-size:11px;color:var(--muted)">' + esc(cur.next_gap || '') + '</div>'
        + '</div></div></div>';
    }
    expandableBlocks(document.getElementById('realm-sections'), data && data.sections);
  }

  /* ============ 4. 修炼手记（journal.json → #realmJournal） ============ */
  function renderJournal(data) {
    var el = document.getElementById('realmJournal');
    var btn = document.getElementById('journalToggle');
    if (!el || !data || !data.entries) return;
    el.innerHTML = data.entries.map(function(en) {
      return '<div class="rs-dim' + (en.latest ? ' j-latest' : '') + '">'
        + '<span class="rs-dim-name">' + esc(en.date) + '</span><span>' + (en.content || '') + '</span></div>';
    }).join('');
    if (btn) btn.textContent = '展开全部 (' + data.entries.length + '条) ▼';
  }

  /* ============ 5. 盘前预测历史：默认只显示前 10 条 ============ */
  function applyForecastLimit() {
    var tbody = document.getElementById('fc-history-body');
    if (!tbody) return;
    // 由 forecast 模块渲染后调用：给超过 10 条的历史表加「展开全部」按钮
    var rows = tbody.querySelectorAll('tr');
    if (rows.length <= 10) return;
    var hidden = [];
    for (var i = 10; i < rows.length; i++) { hidden.push(rows[i]); }
    hidden.forEach(function(r) { r.style.display = 'none'; });
    var wrap = document.getElementById('fc-history-wrap');
    if (!wrap) return;
    if (document.getElementById('fc-more-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'fc-more-btn';
    btn.textContent = '展开全部历史 (' + rows.length + '条) ▼';
    btn.style.cssText = 'margin-top:10px;background:var(--bg3);border:1px solid var(--rule);color:var(--accent);border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer';
    btn.addEventListener('click', function() {
      hidden.forEach(function(r) { r.style.display = ''; });
      btn.textContent = '已展开全部 (' + rows.length + '条)';
      btn.disabled = true;
      btn.style.opacity = '.6';
    });
    wrap.appendChild(btn);
  }

  /* ============ 初始化 ============ */
  loadJSON('data/review.json').then(renderReview).catch(function(e) { if (window.console) console.warn('[data-loader] review.json 加载失败:', e && e.message); });
  loadJSON('data/eval.json').then(renderEval).catch(function(e) { if (window.console) console.warn('[data-loader] eval.json 加载失败:', e && e.message); });
  loadJSON('data/realm.json').then(renderRealm).catch(function(e) { if (window.console) console.warn('[data-loader] realm.json 加载失败:', e && e.message); });
  loadJSON('data/journal.json').then(renderJournal).catch(function(e) { if (window.console) console.warn('[data-loader] journal.json 加载失败:', e && e.message); });
  loadJSON('data/ledger.json').then(renderStageAssessment).catch(function(e) { if (window.console) console.warn('[data-loader] ledger.json 加载失败:', e && e.message); });

  // 供 forecast 模块在渲染完历史表后调用，限制只显示前 10 条
  window.__applyForecastLimit = applyForecastLimit;
})();
