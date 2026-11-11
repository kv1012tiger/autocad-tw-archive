/* 金幣錢包：每日登島、連續登島、在線、爬文送金幣；下載附件扣金幣；暱稱、下載紀錄、排行榜。
   首頁與文章頁共用（同網域 localStorage）。API 是蘋果爸 Google 試算表的 Apps Script 網址，留空時只存在本機。 */
(function () {
  var API = 'https://script.google.com/macros/s/AKfycbyvv3G6pw8MywtKOpG4pSCu79lsYvDbxDlsMSrUOYsPVCOirw5v1m1rLeyfm_4Dbm84/exec';
  var KEY = 'aikb-wallet';
  var TOP = window.top === window;
  var DAY_LOGIN = 3, ONLINE_MS = 5 * 60 * 1000, ONLINE_MAX = 3, READ_EVERY = 3, READ_MAX = 3;

  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return today(d); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  var W = null, started = false;
  function load() {
    try { W = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { W = null; }
    if (!W || typeof W.bal !== 'number') {
      W = { id: uid(), nick: '', bal: 0, earned: 0, streak: 0, last: '', onl: { d: '', ms: 0, n: 0 }, rd: { d: '', seen: [], n: 0 }, dl: [] };
      // 舊進度：已拿到的問答島金幣轉進錢包
      try {
        var old = JSON.parse(localStorage.getItem('aikb-progress-v1') || 'null');
        var n = old && old.c ? Object.keys(old.c).length : 0;
        W.bal = W.earned = n;
      } catch (e) {}
      save();
    }
    return W;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) {} }

  var listeners = [];
  function emit(ev) { listeners.forEach(function (f) { try { f(ev, W); } catch (e) {} }); }

  /* ---------- 與試算表同步 ---------- */
  function post(o) {
    if (!API) return;
    var body = JSON.stringify(o);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(API, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return;
    } catch (e) {}
    try { fetch(API, { method: 'POST', body: body, keepalive: true }); } catch (e) {}
  }
  var syncT;
  function sync(now) {
    if (!API || !W.nick) return;
    clearTimeout(syncT);
    var go = function () { post({ a: 'sync', id: W.id, nick: W.nick, bal: W.bal, earned: W.earned, streak: W.streak }); };
    if (now) go(); else syncT = setTimeout(go, 4000);
  }

  /* ---------- 金幣增減 ---------- */
  function add(n, why) {
    W.bal += n; W.earned += n; save(); sync();
    emit({ t: 'add', n: n, why: why });
    toast('🪙 +' + n + '　' + why);
  }
  function spend(n) { W.bal = Math.max(0, W.bal - n); save(); sync(); emit({ t: 'spend', n: n }); }

  /* ---------- 每日登島（連續天數多送） ---------- */
  function dailyLogin() {
    var t = today();
    if (W.last === t) return;
    W.streak = W.last === yesterday() ? (W.streak || 0) + 1 : 1;
    W.last = t; save();
    var n = DAY_LOGIN + (W.streak - 1);
    add(n, W.streak > 1 ? '每日登島（連續 ' + W.streak + ' 天）' : '每日登島');
  }

  /* ---------- 在線 5 分鐘 ---------- */
  var tick = 15000;
  function online() {
    setInterval(function () {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      var t = today();
      if (W.onl.d !== t) W.onl = { d: t, ms: 0, n: 0 };
      if (W.onl.n >= ONLINE_MAX) return;
      W.onl.ms += tick;
      if (W.onl.ms >= ONLINE_MS * (W.onl.n + 1)) { W.onl.n++; save(); add(1, '在島上待滿 ' + (5 * W.onl.n) + ' 分鐘'); }
      else save();
    }, tick);
  }

  /* ---------- 爬文：每看 3 篇不同文章，一半機率得 1 枚 ---------- */
  function read(href) {
    if (!href) return;
    var m = String(href).match(/([^\/]+\/t\d+)\//);
    href = m ? m[1] : String(href);
    var t = today();
    if (W.rd.d !== t) W.rd = { d: t, seen: [], n: 0 };
    if (W.rd.seen.indexOf(href) >= 0) return;
    W.rd.seen.push(href); save();
    if (W.rd.seen.length % READ_EVERY === 0 && W.rd.n < READ_MAX) {
      if (Math.random() < 0.5) { W.rd.n++; save(); add(1, '爬文好運（今天第 ' + W.rd.seen.length + ' 篇）'); }
      else toast('🍀 看了 ' + W.rd.seen.length + ' 篇，這次沒抽中金幣，再看 3 篇再抽一次');
    }
  }

  /* ---------- 介面：提示、對話框 ---------- */
  var CSS =
    '.cw-toast{position:fixed;left:50%;top:calc(70px + env(safe-area-inset-top));transform:translate(-50%,-20px);z-index:9999;padding:10px 18px;border-radius:999px;background:rgba(3,42,60,.95);border:2px solid #ffd166;color:#fff8e7;font:700 16px/1.4 "Noto Sans TC",sans-serif;opacity:0;transition:.3s;pointer-events:none;max-width:92vw;text-align:center}' +
    '.cw-toast.on{opacity:1;transform:translate(-50%,0)}' +
    '.cw-ov{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,20,32,.72)}' +
    '.cw-box{width:100%;max-width:420px;max-height:86vh;overflow:auto;padding:22px 20px 18px;border-radius:22px;background:#0b4660;border:2px solid #ffd166;color:#fff8e7;font:16px/1.6 "Noto Sans TC",sans-serif;text-align:center;box-shadow:0 18px 40px rgba(0,0,0,.5)}' +
    '.cw-box h3{margin:4px 0 8px;font-size:22px;font-weight:900}.cw-box p{margin:6px 0}.cw-ic{font-size:46px;line-height:1.1}' +
    '.cw-box small{display:block;color:#b9d8e4;font-size:13.5px;line-height:1.5;margin-top:8px}' +
    '.cw-in{width:100%;box-sizing:border-box;margin:10px 0 4px;padding:12px 14px;border-radius:14px;border:2px solid #ffd166;background:#06344a;color:#fff;font:700 18px "Noto Sans TC",sans-serif;text-align:center}' +
    '.cw-err{color:#ffb4b4;font-size:14px;min-height:20px}' +
    '.cw-row{display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap}' +
    '.cw-b{min-width:110px;padding:11px 18px;border-radius:999px;border:2px solid #ffd166;background:transparent;color:#fff8e7;font:900 16px "Noto Sans TC",sans-serif;cursor:pointer}' +
    '.cw-b.p{border-color:transparent;background:linear-gradient(135deg,#ffb347,#ff5e62);color:#fff}' +
    '.cw-lb{list-style:none;margin:12px 0 0;padding:0;text-align:left}' +
    '.cw-lb li{display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:6px;border-radius:12px;background:rgba(255,255,255,.06)}' +
    '.cw-lb li.me{background:rgba(255,209,102,.2);outline:1.5px solid #ffd166}' +
    '.cw-lb .r{flex:none;width:30px;font-weight:900;text-align:center}.cw-lb .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cw-lb .c{flex:none;font-weight:900;color:#ffd166}' +
    '.cw-me{margin-top:10px;font-size:15px;color:#ffe2a8}.cw-link{background:none;border:0;color:#7fd8ff;text-decoration:underline;cursor:pointer;font:inherit;padding:0}';
  function injectCSS() {
    var st = document.createElement('style'); st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  var toastEl, toastT;
  function toast(msg) {
    if (!TOP) { try { window.top.postMessage({ cw: 'toast', msg: msg }, location.origin); return; } catch (e) {} }
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'cw-toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 3200);
  }
  function modal(html, onReady) {
    var ov = document.createElement('div'); ov.className = 'cw-ov';
    ov.innerHTML = '<div class="cw-box" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(ov);
    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.addEventListener('click', function (e) { if (e.target === ov && ov.dataset.lock !== '1') close(); });
    if (onReady) onReady(ov, close);
    return close;
  }

  /* ---------- 暱稱 ---------- */
  function askNick(cb, first) {
    modal('<div class="cw-ic">🏝️</div><h3>' + (first ? '歡迎登島！先取個暱稱' : '修改暱稱') + '</h3>' +
      '<p>暱稱會顯示在金幣排行榜，下載資源時也會記錄是誰下載。</p>' +
      '<input class="cw-in" maxlength="12" placeholder="例如：圖塊小達人" value="' + esc(W.nick || '') + '">' +
      '<div class="cw-err"></div><div class="cw-row"><button class="cw-b p" type="button" data-ok>確定</button>' +
      (first ? '' : '<button class="cw-b" type="button" data-x>取消</button>') + '</div>' +
      '<small>請不要填真實姓名、電話或 Email。暱稱與金幣、下載紀錄會存到蘋果爸的統計表。</small>',
      function (ov, close) {
        if (first) ov.dataset.lock = '1';
        var inp = ov.querySelector('.cw-in'), err = ov.querySelector('.cw-err');
        inp.addEventListener('input', function () { err.textContent = ''; });
        function ok() {
          var v = inp.value.replace(/\s+/g, ' ').trim();
          if (v.length < 2) { err.textContent = '暱稱至少要 2 個字'; inp.focus(); return; }
          if (/[<>]/.test(v)) { err.textContent = '暱稱不能有 < 或 > 符號'; inp.focus(); return; }
          W.nick = v.slice(0, 12); save(); sync(true); emit({ t: 'nick' }); close();
          toast('👋 ' + W.nick + '，歡迎登島！'); if (cb) cb();
        }
        ov.querySelector('[data-ok]').addEventListener('click', ok);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
        var x = ov.querySelector('[data-x]'); if (x) x.addEventListener('click', close);
        setTimeout(function () { inp.focus(); }, 60);
      });
  }

  /* ---------- 下載扣 1 枚 ---------- */
  var HOST = /(drive\.google\.com\/(file|uc|open)|docs\.google\.com\/uc|(^|\.)box\.com\/s\/|dropbox\.com|db\.tt|mediafire\.com|mega\.nz|1drv\.ms|onedrive\.live\.com|wetransfer\.com|we\.tl)/i;
  var EXT = /\.(zip|rar|7z|dwg|dxf|dwt|pdf|lsp|vlx|fas|arx|dvb|exe|msi|ctb|stb|pat|shx|ttf)(\?|#|$)/i;
  function isDownload(a) {
    if (!a || !a.getAttribute('href')) return false;
    if (a.classList.contains('dl-item') || a.classList.contains('dl-btn') || a.hasAttribute('download')) return true;
    if (!a.closest('.content')) return false;
    var h = a.href;
    return HOST.test(h) || EXT.test(h.split('?')[0]);
  }
  function fileName(a) {
    var n = a.getAttribute('download') || (a.querySelector('.dl-n') && a.querySelector('.dl-n').textContent) ||
      [].map.call(a.children.length ? a.children : [a], function (c) { return c.textContent.trim(); }).filter(Boolean).join(' · ') || a.href;
    return String(n).replace(/^⬇️?\s*下載\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }
  function go(a) {
    a.dataset.cwPaid = '1';
    if (a.hasAttribute('download')) a.click();
    else window.open(a.href, '_blank', 'noopener');
    setTimeout(function () { delete a.dataset.cwPaid; }, 500);
  }
  function confirmDownload(a) {
    if (!W.nick) { askNick(function () { confirmDownload(a); }, true); return; }
    var name = fileName(a);
    if (W.bal < 1) {
      modal('<div class="cw-ic">🪙</div><h3>金幣不足</h3><p>下載一個資源需要 <b>1 枚金幣</b>，你目前有 <b>0</b> 枚。</p>' +
        '<p style="text-align:left;margin-top:12px">賺金幣的方法：<br>📅 每天登島送 3 枚（連續登島每天多 1 枚）<br>📖 爬文：每看 3 篇有一半機率送 1 枚<br>⏱️ 在島上每待 5 分鐘送 1 枚（每天最多 3 枚）<br>💬 翻開一座問答島的 3 張問答卡送 1 枚</p>' +
        '<div class="cw-row"><button class="cw-b p" type="button" data-x>知道了</button></div>',
        function (ov, close) { ov.querySelector('[data-x]').addEventListener('click', close); });
      return;
    }
    modal('<div class="cw-ic">📦</div><h3>下載資源</h3><p style="word-break:break-all">' + esc(name) + '</p>' +
      '<p>下載會扣 <b>1 枚金幣</b>（目前 <b>' + W.bal + '</b> 枚）</p>' +
      '<div class="cw-row"><button class="cw-b p" type="button" data-ok>🪙 扣 1 枚並下載</button><button class="cw-b" type="button" data-x>取消</button></div>',
      function (ov, close) {
        ov.querySelector('[data-x]').addEventListener('click', close);
        ov.querySelector('[data-ok]').addEventListener('click', function () {
          close(); spend(1);
          var rec = { h: location.pathname.replace(/^.*?\/([^/]+\/t\d+\/)/, '$1'), t: (document.title || '').split(' | ')[0], f: name, at: Date.now() };
          W.dl.unshift(rec); W.dl = W.dl.slice(0, 100); save();
          post({ a: 'dl', id: W.id, nick: W.nick, bal: W.bal, page: rec.h, title: rec.t, file: name });
          toast('📦 已扣 1 枚金幣，開始下載（剩 ' + W.bal + ' 枚）');
          go(a);
        });
      });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a || a.dataset.cwPaid === '1' || !isDownload(a)) return;
    e.preventDefault(); e.stopPropagation();
    load(); confirmDownload(a);
  }, true);

  /* ---------- 排行榜 ---------- */
  function board() {
    var close = modal('<div class="cw-ic">🏆</div><h3>金幣排行榜</h3><div class="cw-body"><p>載入中…</p></div>' +
      '<div class="cw-me">你是 <b>' + esc(W.nick || '（還沒取暱稱）') + '</b>，目前 🪙 <b>' + W.bal + '</b> 枚・連續登島 ' + (W.streak || 0) + ' 天　<button class="cw-link" type="button" data-nick>改暱稱</button></div>' +
      '<div class="cw-row"><button class="cw-b p" type="button" data-x>關閉</button></div>',
      function (ov, close) {
        ov.querySelector('[data-x]').addEventListener('click', close);
        ov.querySelector('[data-nick]').addEventListener('click', function () { close(); askNick(null, false); });
        var body = ov.querySelector('.cw-body');
        if (!API) { body.innerHTML = '<p>排行榜即將開通，先努力收集金幣吧！</p>'; return; }
        sync(true);
        fetch(API + '?a=top&me=' + encodeURIComponent(W.id)).then(function (r) { return r.json(); }).then(function (j) {
          var rows = (j && j.top) || [];
          if (!rows.length) { body.innerHTML = '<p>還沒有人上榜，你來當第一名！</p>'; return; }
          body.innerHTML = '<ol class="cw-lb">' + rows.map(function (r, i) {
            var medal = ['🥇', '🥈', '🥉'][i] || (i + 1);
            return '<li class="' + (r.me ? 'me' : '') + '"><span class="r">' + medal + '</span><span class="n">' + esc(r.nick) + '</span><span class="c">🪙 ' + (+r.bal || 0) + '</span></li>';
          }).join('') + '</ol>';
        }).catch(function () { body.innerHTML = '<p>排行榜暫時連不上，稍後再試。</p>'; });
      });
    return close;
  }

  /* ---------- 啟動 ---------- */
  load();
  injectCSS();
  if (TOP) {
    window.addEventListener('message', function (e) {
      if (e.origin === location.origin && e.data && e.data.cw === 'toast') toast(e.data.msg);
    });
    window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); emit({ t: 'ext' }); } });
    window.addEventListener('pagehide', function () { sync(true); });
  }

  window.COINS = {
    get: function () { return W; },
    on: function (f) { listeners.push(f); },
    add: add,
    read: read,
    board: board,
    askNick: askNick,
    toast: toast,
    // 首頁或直接開啟的文章頁才發登島、在線獎勵；閱讀器 iframe 內不重複計算
    start: function (opt) {
      if (!TOP) return;
      opt = opt || {};
      if (started) return; started = true;
      var begin = function () { dailyLogin(); online(); sync(true); if (opt.done) opt.done(); };
      if (!W.nick && opt.askNick !== false) askNick(begin, true); else begin();
    }
  };
})();
