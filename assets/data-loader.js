// assets/data-loader.js — 数据文件化渲染器
// 从 data/*.json 加载四块动态内容，HTML 保持只读摘要 + 点开展开：
//   review.json  → #review-cards  已了结持仓盈亏（只显示股票名+盈亏，点击展开逐笔买卖）
//   eval.json    → #eval-sections 交易者全面评测（只显示标题+摘要，点击展开全文）
//   realm.json   → #realm-current + #realm-sections 修仙境界（当前定位 + 各块摘要，点击展开）
//   journal.json → #realmJournal  修炼手记（默认折叠只显示最新一条）
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

  /* ============ 1. 已了结持仓盈亏（review.json → #review-cards） ============ */
  function renderReview(data) {
    var el = document.getElementById('review-cards');
    if (!el || !data || !data.positions) return;
    var cards = data.positions.map(function(pos) {
      var total = pos.rounds.reduce(function(s, r) { return s + (r.pnl || 0); }, 0);
      var up = total >= 0;
      var roundsHtml = pos.rounds.map(function(r) {
        var rup = (r.pnl || 0) >= 0;
        var tradesHtml = (r.trades || []).map(function(t) {
          var tp = String(t.pnl || '—');
          var tup = tp.indexOf('-') === 0;
          return '<tr>'
            + '<td class="mono" style="padding:6px 8px;border-bottom:1px solid var(--rule);white-space:nowrap">' + esc(t.date) + '</td>'
            + '<td style="padding:6px 8px;border-bottom:1px solid var(--rule)">' + esc(t.action) + '</td>'
            + '<td class="mono" style="padding:6px 8px;border-bottom:1px solid var(--rule);text-align:right">' + esc(t.shares) + '</td>'
            + '<td class="mono" style="padding:6px 8px;border-bottom:1px solid var(--rule);text-align:right">' + esc(t.price) + '</td>'
            + '<td class="mono" style="padding:6px 8px;border-bottom:1px solid var(--rule);text-align:right;color:' + (tup ? 'var(--green)' : 'var(--red)') + '">' + esc(tp) + '</td>'
            + '</tr>';
        }).join('');
        return '<div style="margin-top:10px">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--muted)">'
          + '<span>' + esc(pos.name) + ' ' + esc(r.round) + ' · ' + esc(r.from) + ' → ' + esc(r.to) + ' · ' + esc(r.days) + '天'
          + (r.t_count ? ' · 做T ' + esc(r.t_count) + '笔' : '') + '</span>'
          + '<span class="mono" style="font-weight:700;color:' + (rup ? 'var(--red)' : 'var(--green)') + '">' + (r.pnl >= 0 ? '+' : '') + fmtMoney(r.pnl) + '</span>'
          + '</div>'
          + '<table style="width:100%;font-size:12.5px;border-collapse:collapse;margin-top:6px">'
          + '<thead><tr>'
          + '<th style="text-align:left;padding:6px 8px;color:var(--muted);border-bottom:1px solid var(--rule)">日期</th>'
          + '<th style="text-align:left;padding:6px 8px;color:var(--muted);border-bottom:1px solid var(--rule)">动作</th>'
          + '<th style="text-align:right;padding:6px 8px;color:var(--muted);border-bottom:1px solid var(--rule)">股数</th>'
          + '<th style="text-align:right;padding:6px 8px;color:var(--muted);border-bottom:1px solid var(--rule)">价格</th>'
          + '<th style="text-align:right;padding:6px 8px;color:var(--muted);border-bottom:1px solid var(--rule)">盈亏</th>'
          + '</tr></thead><tbody>' + tradesHtml + '</tbody></table></div>';
      }).join('');
      return '<div class="review-card" style="background:var(--bg3);border:1px solid var(--rule);border-radius:12px;padding:14px;cursor:pointer">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">'
        + '<div style="min-width:0"><div style="font-weight:700;font-size:14.5px">' + esc(pos.name)
        + ' <span style="color:var(--muted);font-weight:400;font-size:12px">' + esc(pos.code) + '</span></div>'
        + '<div style="font-size:12px;color:var(--muted);margin-top:3px">' + pos.rounds.length + ' 段 · 点击展开逐笔买卖</div></div>'
        + '<div style="text-align:right;flex:0 0 auto"><div class="mono" style="font-weight:700;font-size:17px;color:' + (up ? 'var(--red)' : 'var(--green)') + '">' + (total >= 0 ? '+' : '') + fmtMoney(total) + '</div>'
        + '<span class="pill ' + (up ? 'g' : 'r') + '" style="font-size:11px">' + (up ? '盈利' : '亏损') + '</span></div>'
        + '</div>'
        + '<div class="review-detail" style="display:none;margin-top:10px;border-top:1px dashed var(--rule);padding-top:6px">' + roundsHtml + '</div>'
        + '</div>';
    }).join('');
    el.innerHTML = cards;
    el.addEventListener('click', function(e) {
      var card = e.target.closest('.review-card');
      if (!card) return;
      var d = card.querySelector('.review-detail');
      if (d) d.style.display = (d.style.display === 'none') ? 'block' : 'none';
    });
  }

  /* ============ 2. 交易者全面评测（eval.json → #eval-sections） ============ */
  function renderEval(data) {
    expandableBlocks(document.getElementById('eval-sections'), data && data.sections);
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

  // 供 forecast 模块在渲染完历史表后调用，限制只显示前 10 条
  window.__applyForecastLimit = applyForecastLimit;
})();
