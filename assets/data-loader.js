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
  function renderReview(data) {
    var el = document.getElementById('review-cards');
    if (!el || !data || !data.positions) return;
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
    selected = reviews[0].date;   // 默认展示最新一条复盘
    render();
    showDetail(selected);
  }

  /* ============ 2c. 阶段性评估（整合：画像 / 三率 / 阶段定位 / 总结 / 雷达，实时重算自 ledger + forecast） ============ */
  function renderStageAssessment(ledger) {
    var cont = document.getElementById('stage-assessment');
    if (!cont || !ledger) return;
    loadJSON('data/forecast.json').then(function(fc) {
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

      var portrait = (rateOnline && retOnline)
        ? '胜率与收益双在线，纪律待回升'
        : (retOnline ? '收益为正但交易级胜率不足——净赚靠亨通等少数大赢覆盖多数小亏' : '长板 / 短板仍明显，核心短板在纪律与仓位');

      cont.innerHTML = '<div class="dl-block" style="border:1px solid var(--rule);border-radius:14px;overflow:hidden;background:var(--bg2)">'
        + '<div class="dl-head" style="padding:16px 18px;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">'
        + '<div style="font-weight:800;font-size:15px">🧭 阶段性评估 · 画像 / 三率 / 阶段定位</div>'
        + '<div style="font-size:12px;color:var(--muted)">数据实时取自 <span class="mono">ledger.json</span>（' + esc(dateSrc) + '）</div></div>'
        + '<div class="dl-body" style="padding:16px 18px">'

        + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">'
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

        + '<div style="margin-top:15px"><div style="font-size:12px;letter-spacing:.08em;color:var(--muted);margin-bottom:6px">六维纪律雷达（当前 vs 合格线）</div>'
        + '<div id="chart-radar" style="width:100%;height:400px"></div></div>'

        + '<div style="margin-top:16px"><div style="font-size:12px;letter-spacing:.08em;color:var(--muted);margin-bottom:6px">阶段总结 · 更新至 ' + esc(dateSrc) + '</div>'
        + '<div style="font-size:13.5px;line-height:1.85;color:var(--ink)">自 07-14 建仓（初始 5 万）实操至今，累计收益 <strong class="mono up">+10.62%</strong>，已了结 9 段（3 胜 6 负）、已实现净盈亏 +¥1,505。9/11 弱势普跌中守住光通信主线并按预案分批落袋，AI 批卷 70/100，纪律与心态较 8 月底明显转好。当前核心短板仍是 <strong>交易级胜率偏低（净赚靠亨通等少数大赢弥补）</strong>与「拿不住 / 做T 买卖点」的执行，正对应修炼的第二阶段——能不能不乱交易。</div></div>'

        + '<div style="margin-top:14px;background:var(--bg3);border:1px solid var(--rule);border-radius:12px;padding:14px"><div style="font-size:12px;letter-spacing:.08em;color:var(--muted);margin-bottom:8px">下一步（写给明天的自己）</div>'
        + '<div style="font-size:13px;line-height:2;color:var(--ink)">・给剩余持仓补写死止盈 / 止损锚点（铭普 500 股、沃尔中线仓），把「奔跑」变成有锚的奔跑；<br>・坚持每日盘前预案 + 收盘自评，把计划外交易降为零；<br>・连续三周「胜率≥50% + 收益率在线 + 纪律在线」后再评估是否进入小资金实盘。</div></div>'

        + '</div></div>';
      if (typeof window.__renderEvalCharts === 'function') { try { window.__renderEvalCharts(); } catch (e) {} }
    });

    function kpiCard(t, v, s) {
      return '<div style="background:var(--bg3);border:1px solid var(--rule);border-radius:12px;padding:13px 14px"><div style="font-size:11px;color:var(--muted)">' + esc(t) + '</div>'
        + '<div class="mono up" style="font-weight:800;font-size:18px;margin-top:5px">' + v + '</div>'
        + '<div style="font-size:11.5px;color:var(--muted);margin-top:4px">' + esc(s) + '</div></div>';
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
        + '<div style="font-size:13px;color:var(--muted);margin-top:6px">' + esc(cur.desc) + '</div>'
        + '<div style="margin-top:14px;font-size:13.5px;line-height:1.7">' + (cur.detail || '') + '</div>'
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
