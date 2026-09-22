// assets/editor.js — 可编辑理由：本地持久化
(function() {
  var STORE_KEY = 'trading-console-notes-v1';
  var notes = load();

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) { return {}; }
  }

  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(notes)); } catch (e) {}
  }

  // --- 文本域（持仓持续持有理由）: 保存按钮 ---
  var textareas = document.querySelectorAll('textarea[data-key]');
  textareas.forEach(function(t) {
    var key = t.getAttribute('data-key');
    var btn = document.querySelector('.note-save[data-key="' + key + '"]');
    var status = document.querySelector('[data-status="' + key + '"]');
    if (notes[key]) t.value = notes[key];

    var flash = function(msg, saved) {
      if (!status) return;
      status.textContent = msg;
      status.classList.toggle('saved', saved);
      if (btn) btn.classList.toggle('saved', saved);
      clearTimeout(flash._t);
      flash._t = setTimeout(function() {
        status.textContent = '';
        status.classList.remove('saved');
        if (btn) btn.classList.remove('saved');
      }, 2200);
    };

    if (btn) {
      btn.addEventListener('click', function() {
        var v = t.value.trim();
        if (v) { notes[key] = v; saveStore(); flash('已保存 ✓', true); }
        else { delete notes[key]; saveStore(); flash('已清空', false); }
      });
    }
    // 失焦自动保存（更顺手）
    t.addEventListener('blur', function() {
      var v = t.value.trim();
      if (v) { notes[key] = v; saveStore(); flash('已自动保存 ✓', true); }
    });
  });

  // --- 输入框（调仓记录表格）: 回车/失焦保存 ---
  var inputs = document.querySelectorAll('input[data-key]');
  inputs.forEach(function(inp) {
    var key = inp.getAttribute('data-key');
    var status = document.querySelector('[data-status="' + key + '"]');
    if (notes[key]) inp.value = notes[key];

    var flash = function(msg, saved) {
      if (!status) return;
      status.textContent = msg;
      status.classList.toggle('saved', saved);
      clearTimeout(flash._t);
      flash._t = setTimeout(function() {
        status.textContent = '';
        status.classList.remove('saved');
      }, 1800);
    };

    var save = function() {
      var v = inp.value.trim();
      if (v) { notes[key] = v; saveStore(); flash('✓', true); }
      else { delete notes[key]; saveStore(); }
    };
    inp.addEventListener('blur', save);
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { inp.blur(); }
    });
  });
})();