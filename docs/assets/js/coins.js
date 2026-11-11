/* 金幣與登島碼：暱稱註冊、登島碼跨裝置、每日登島、在線、爬文送金幣；下載扣金幣；排行榜。
   金幣以蘋果爸的 Google 試算表（Apps Script）為準，瀏覽器只暫存一份顯示用。首頁與文章頁共用。 */
(function () {
  var API = 'https://script.google.com/macros/s/AKfycbyvv3G6pw8MywtKOpG4pSCu79lsYvDbxDlsMSrUOYsPVCOirw5v1m1rLeyfm_4Dbm84/exec';
  var LINE = 'https://lin.ee/4xw8yKI';
  var KEY = 'aikb-player';
  var TOP = window.top === window;
  var ONLINE_MS = 5 * 60 * 1000, ONLINE_MAX = 3, READ_EVERY = 3, READ_MAX = 3;

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- 本機暫存 ---------- */
  var P = null, started = false, listeners = [];
  function blank() { return { code: '', nick: '', bal: 0, earned: 0, streak: 0, admin: false, onl: { d: '', ms: 0, n: 0 }, rd: { d: '', seen: [], n: 0 } }; }
  function load() {
    try { P = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { P = null; }
    if (!P || typeof P.bal !== 'number') P = blank();
    if (!P.onl) P.onl = { d: '', ms: 0, n: 0 };
    if (!P.rd) P.rd = { d: '', seen: [], n: 0 };
    return P;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  function emit(ev) { listeners.forEach(function (f) { try { f(ev, P); } catch (e) {} }); }
  function apply(p) {
    if (!p) return;
    P.code = p.code; P.nick = p.nick; P.bal = p.bal; P.earned = p.earned; P.streak = p.streak; P.admin = !!p.admin; P.qa = p.qa || [];
    save(); emit({ t: 'sync' });
  }

  /* ---------- 呼叫試算表 ---------- */
  function call(o) {
    return fetch(API + '?q=' + encodeURIComponent(JSON.stringify(o)), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); });
  }
  var ERR = {
    short: '暱稱至少要 2 個字', taken: '這個暱稱已經有人用了，換一個吧', reserved: '這個暱稱保留給站長，換一個吧',
    nocode: '找不到這組登島碼，請再確認一次', bad: '資料有誤，請重新整理後再試'
  };
  function netFail() { toast('⚠️ 暫時連不上金幣小島，請稍後再試'); }

  /* ---------- 送金幣 ---------- */
  function earn(kind, msg, key) {
    if (!P.code) return Promise.resolve(0);
    return call({ a: 'earn', k: kind, code: P.code, key: key }).then(function (j) {
      if (!j.ok) { if (j.err === 'nocode') logout(); return 0; }
      apply(j.p);
      if (j.add) { emit({ t: 'add', n: j.add }); toast('🪙 +' + j.add + '　' + msg); }
      return j.add;
    }).catch(function () { return 0; });
  }
  function daily() {
    if (!P.code) return Promise.resolve();
    return call({ a: 'daily', code: P.code }).then(function (j) {
      if (!j.ok) { if (j.err === 'nocode') logout(); return; }
      apply(j.p);
      if (j.add) { emit({ t: 'add', n: j.add }); toast('🪙 +' + j.add + '　' + (j.p.streak > 1 ? '每日登島（連續 ' + j.p.streak + ' 天）' : '每日登島')); }
    }).catch(function () {});
  }
  function online() {
    var tick = 15000;
    setInterval(function () {
      if (!P.code || (document.visibilityState && document.visibilityState !== 'visible')) return;
      var t = today();
      if (P.onl.d !== t) P.onl = { d: t, ms: 0, n: 0 };
      if (P.onl.n >= ONLINE_MAX) return;
      P.onl.ms += tick;
      if (P.onl.ms >= ONLINE_MS * (P.onl.n + 1)) { P.onl.n++; save(); earn('online', '在島上待滿 ' + (5 * P.onl.n) + ' 分鐘'); }
      else save();
    }, tick);
  }
  function read(href) {
    if (!href || !P.code) return;
    var m = String(href).match(/([^\/]+\/t\d+)\//);
    href = m ? m[1] : String(href);
    var t = today();
    if (P.rd.d !== t) P.rd = { d: t, seen: [], n: 0 };
    if (P.rd.seen.indexOf(href) >= 0) return;
    P.rd.seen.push(href); save();
    if (P.rd.seen.length % READ_EVERY === 0 && P.rd.n < READ_MAX) {
      if (Math.random() < 0.5) { P.rd.n++; save(); earn('read', '爬文好運（今天第 ' + P.rd.seen.length + ' 篇）'); }
      else toast('🍀 看了 ' + P.rd.seen.length + ' 篇，這次沒抽中金幣，再看 3 篇再抽一次');
    }
  }
  function logout() { P = blank(); save(); emit({ t: 'logout' }); }

  /* ---------- 介面 ---------- */
  var CSS =
    '.cw-toast{position:fixed;left:50%;top:calc(70px + env(safe-area-inset-top));transform:translate(-50%,-20px);z-index:9999;padding:10px 18px;border-radius:999px;background:rgba(3,42,60,.95);border:2px solid #ffd166;color:#fff8e7;font:700 16px/1.4 "Noto Sans TC",sans-serif;opacity:0;transition:.3s;pointer-events:none;max-width:92vw;text-align:center}' +
    '.cw-toast.on{opacity:1;transform:translate(-50%,0)}' +
    '.cw-ov{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,20,32,.72)}' +
    '.cw-box{width:100%;max-width:420px;max-height:86vh;overflow:auto;padding:22px 20px 18px;border-radius:22px;background:#0b4660;border:2px solid #ffd166;color:#fff8e7;font:16px/1.6 "Noto Sans TC",sans-serif;text-align:center;box-shadow:0 18px 40px rgba(0,0,0,.5)}' +
    '.cw-box h3{margin:4px 0 8px;font-size:22px;font-weight:900}.cw-box p{margin:6px 0}.cw-ic{font-size:46px;line-height:1.1}' +
    '.cw-box small{display:block;color:#b9d8e4;font-size:13.5px;line-height:1.5;margin-top:10px}.cw-box small a,.cw-box p a{color:#7fd8ff}' +
    '.cw-in{width:100%;box-sizing:border-box;margin:10px 0 4px;padding:12px 14px;border-radius:14px;border:2px solid #ffd166;background:#06344a;color:#fff;font:700 18px "Noto Sans TC",sans-serif;text-align:center}' +
    '.cw-in.code{letter-spacing:.3em;text-transform:uppercase;font-size:22px}' +
    '.cw-err{color:#ffb4b4;font-size:14px;min-height:20px}' +
    '.cw-row{display:flex;gap:10px;justify-content:center;margin-top:12px;flex-wrap:wrap}' +
    '.cw-b{min-width:110px;padding:11px 18px;border-radius:999px;border:2px solid #ffd166;background:transparent;color:#fff8e7;font:900 16px "Noto Sans TC",sans-serif;cursor:pointer}' +
    '.cw-b.p{border-color:transparent;background:linear-gradient(135deg,#ffb347,#ff5e62);color:#fff}.cw-b[disabled]{opacity:.6}' +
    '.cw-code{display:inline-block;margin:8px 0;padding:8px 18px;border-radius:14px;background:#06344a;border:2px dashed #ffd166;font:900 30px/1.3 Consolas,monospace;letter-spacing:.25em;color:#ffd166}' +
    '.cw-lb{list-style:none;margin:12px 0 0;padding:0;text-align:left}' +
    '.cw-lb li{display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:6px;border-radius:12px;background:rgba(255,255,255,.06)}' +
    '.cw-lb li.me{background:rgba(255,209,102,.2);outline:1.5px solid #ffd166}' +
    '.cw-lb .r{flex:none;width:30px;font-weight:900;text-align:center}.cw-lb .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cw-lb .c{flex:none;font-weight:900;color:#ffd166}' +
    '.cw-me{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.15);font-size:15px;color:#ffe2a8}' +
    '.cw-vis{margin:8px 0 12px;padding:9px 12px;border-radius:14px;background:rgba(3,42,60,.55);border:1px solid rgba(255,209,102,.35);color:#fff8e7;font:15px/1.6 "Noto Sans TC",sans-serif}' +
    '.cw-vis b{color:#ffd166}.cw-vis i{display:inline-block;font-style:normal;margin:3px 4px 0 0;padding:1px 9px;border-radius:999px;background:rgba(255,255,255,.1);font-size:14px}.cw-vis i small{opacity:.7;margin-left:4px;font-size:12px}' +
    '.cw-link{background:none;border:0;color:#7fd8ff;text-decoration:underline;cursor:pointer;font:inherit;padding:0 4px}';
  function injectCSS() { var st = document.createElement('style'); st.textContent = CSS; (document.head || document.documentElement).appendChild(st); }
  var toastEl, toastT;
  function toast(msg) {
    if (!TOP) { try { window.top.postMessage({ cw: 'toast', msg: msg }, location.origin); return; } catch (e) {} }
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'cw-toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 3400);
  }
  function modal(html, onReady, lock) {
    var ov = document.createElement('div'); ov.className = 'cw-ov';
    ov.innerHTML = '<div class="cw-box" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(ov);
    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.addEventListener('click', function (e) { if (e.target === ov && !lock) close(); });
    if (onReady) onReady(ov, close);
    return close;
  }
  var HELP = '<small>忘記登島碼？把你的暱稱傳到 <a href="' + LINE + '" target="_blank" rel="noopener">蘋果爸 LINE 官方帳號</a>，幫你查。</small>';

  /* ---------- 登島：取暱稱 / 輸入登島碼 ---------- */
  function welcome(done, mode) {
    var initQa = 0;
    try { var old = JSON.parse(localStorage.getItem('aikb-progress-v1') || 'null'); initQa = old && old.c ? Object.keys(old.c).length : 0; } catch (e) {}
    function regHTML() {
      return '<div class="cw-ic">🏝️</div><h3>歡迎登島！取個暱稱</h3>' +
        '<p>有暱稱才能收集金幣、上排行榜、下載資源。</p>' +
        '<input class="cw-in" maxlength="12" placeholder="例如：圖塊小達人"><div class="cw-err"></div>' +
        '<div class="cw-row"><button class="cw-b p" type="button" data-ok>確定</button></div>' +
        '<p style="margin-top:10px">已經有登島碼？<button class="cw-link" type="button" data-sw>輸入登島碼</button></p>' +
        '<p><button class="cw-link" type="button" data-x>先逛逛，之後再取</button></p>' +
        '<small>請不要填真實姓名、電話或 Email。暱稱、金幣與下載紀錄會存到蘋果爸的統計表。</small>';
    }
    function loginHTML() {
      return '<div class="cw-ic">🔑</div><h3>輸入登島碼</h3>' +
        '<p>換手機或電腦時，輸入登島碼就能接回你的暱稱和金幣。</p>' +
        '<input class="cw-in code" maxlength="6" placeholder="6 碼" autocapitalize="characters"><div class="cw-err"></div>' +
        '<div class="cw-row"><button class="cw-b p" type="button" data-ok>登島</button></div>' +
        '<p style="margin-top:10px">還沒有暱稱？<button class="cw-link" type="button" data-sw>取個新暱稱</button></p>' +
        '<p><button class="cw-link" type="button" data-x>先逛逛</button></p>' + HELP;
    }
    modal(mode === 'login' ? loginHTML() : regHTML(), function (ov, close) {
      var inp = ov.querySelector('.cw-in'), err = ov.querySelector('.cw-err'), ok = ov.querySelector('[data-ok]');
      inp.addEventListener('input', function () { err.textContent = ''; });
      ov.querySelector('[data-sw]').addEventListener('click', function () { close(); welcome(done, mode === 'login' ? 'reg' : 'login'); });
      ov.querySelector('[data-x]').addEventListener('click', function () { close(); if (done) done(false); });
      function submit() {
        var v = inp.value.replace(/\s+/g, mode === 'login' ? '' : ' ').trim();
        if (mode === 'login') { v = v.toUpperCase(); if (v.length !== 6) { err.textContent = '登島碼是 6 個字'; return; } }
        else if (v.length < 2) { err.textContent = ERR.short; return; }
        ok.disabled = true; ok.textContent = '連線中…';
        call(mode === 'login' ? { a: 'login', code: v } : { a: 'reg', nick: v, init: initQa }).then(function (j) {
          ok.disabled = false; ok.textContent = mode === 'login' ? '登島' : '確定';
          if (!j.ok) { err.textContent = ERR[j.err] || ERR.bad; return; }
          P = blank(); apply(j.p); close();
          if (mode === 'login') { toast('👋 歡迎回來，' + P.nick + '！'); if (done) done(true); }
          else showCode(true, function () { if (done) done(true); });
        }).catch(function () { ok.disabled = false; ok.textContent = '再試一次'; err.textContent = '連不上金幣小島，請稍後再試'; });
      }
      ok.addEventListener('click', submit);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
      setTimeout(function () { inp.focus(); }, 60);
    }, true);
  }
  function showCode(isNew, done) {
    modal('<div class="cw-ic">🗝️</div><h3>' + (isNew ? '登島成功，' + esc(P.nick) + '！' : '我的登島碼') + '</h3>' +
      '<p>這是你的登島碼，請<b>截圖或抄下來</b>：</p><div class="cw-code">' + esc(P.code) + '</div>' +
      '<p>換手機或電腦時輸入它，就能接回暱稱和金幣。登島碼不要給別人。</p>' +
      '<div class="cw-row"><button class="cw-b p" type="button" data-x>我記下來了</button></div>' + HELP,
      function (ov, close) { ov.querySelector('[data-x]').addEventListener('click', function () { close(); if (done) done(); }); }, isNew);
  }
  function rename() {
    modal('<div class="cw-ic">✏️</div><h3>修改暱稱</h3><input class="cw-in" maxlength="12" value="' + esc(P.nick) + '"><div class="cw-err"></div>' +
      '<div class="cw-row"><button class="cw-b p" type="button" data-ok>確定</button><button class="cw-b" type="button" data-x>取消</button></div>',
      function (ov, close) {
        var inp = ov.querySelector('.cw-in'), err = ov.querySelector('.cw-err'), ok = ov.querySelector('[data-ok]');
        ov.querySelector('[data-x]').addEventListener('click', close);
        ok.addEventListener('click', function () {
          var v = inp.value.replace(/\s+/g, ' ').trim();
          if (v.length < 2) { err.textContent = ERR.short; return; }
          ok.disabled = true;
          call({ a: 'nick', code: P.code, nick: v }).then(function (j) {
            ok.disabled = false;
            if (!j.ok) { err.textContent = ERR[j.err] || ERR.bad; return; }
            apply(j.p); close(); toast('✏️ 暱稱改成「' + P.nick + '」');
          }).catch(function () { ok.disabled = false; err.textContent = '連不上金幣小島，請稍後再試'; });
        });
      });
  }

  /* ---------- 下載扣 1 枚 ---------- */
  var HOST = /(drive\.google\.com\/(file|uc|open)|docs\.google\.com\/uc|(^|\.)box\.com\/s\/|dropbox\.com|db\.tt|mediafire\.com|mega\.nz|1drv\.ms|onedrive\.live\.com|wetransfer\.com|we\.tl)/i;
  var EXT = /\.(zip|rar|7z|dwg|dxf|dwt|pdf|lsp|vlx|fas|arx|dvb|exe|msi|ctb|stb|pat|shx|ttf)(\?|#|$)/i;
  function isDownload(a) {
    if (!a || !a.getAttribute('href')) return false;
    if (/\/courses\/t\d+\//.test(location.pathname)) return false; // 光碟課程島：課程資源下載不扣金幣
    if (a.hasAttribute('data-free')) return false; // 站長指定免扣金幣的下載
    if (a.classList.contains('dl-item') || a.classList.contains('dl-btn') || a.hasAttribute('download')) return true;
    if (!a.closest('.content')) return false;
    return HOST.test(a.href) || EXT.test(a.href.split('?')[0]);
  }
  function fileName(a) {
    var n = a.getAttribute('download') || (a.querySelector('.dl-n') && a.querySelector('.dl-n').textContent) ||
      [].map.call(a.children.length ? a.children : [a], function (c) { return c.textContent.trim(); }).filter(Boolean).join(' · ') || a.href;
    return String(n).replace(/^⬇️?\s*下載\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }
  var EARN_HTML = '<p style="text-align:left;margin-top:12px">賺金幣的方法：<br>📅 每天登島送 3 枚（連續第 2 天 4 枚，第 3 天起每天 5 枚）<br>📖 爬文：每看 3 篇有一半機率送 1 枚<br>⏱️ 在島上每待 5 分鐘送 1 枚（每天最多 3 枚）<br>💬 翻開一座問答島的 3 張問答卡送 1 枚</p>';
  function noCoin() {
    modal('<div class="cw-ic">🪙</div><h3>金幣不足</h3><p>下載一個資源需要 <b>1 枚金幣</b>，你目前有 <b>' + P.bal + '</b> 枚。</p>' + EARN_HTML +
      '<div class="cw-row"><button class="cw-b p" type="button" data-x>知道了</button></div>',
      function (ov, close) { ov.querySelector('[data-x]').addEventListener('click', close); });
  }
  function confirmDownload(a) {
    if (!P.code) { welcome(function (ok) { if (ok) confirmDownload(a); }); return; }
    if (!P.admin && P.bal < 1) { noCoin(); return; }
    var name = fileName(a);
    modal('<div class="cw-ic">📦</div><h3>下載資源</h3><p style="word-break:break-all">' + esc(name) + '</p>' +
      (P.admin ? '<p>管理員帳號下載不扣金幣</p>' : '<p>下載會扣 <b>1 枚金幣</b>（目前 <b>' + P.bal + '</b> 枚）</p>') +
      '<div class="cw-row"><button class="cw-b p" type="button" data-ok>' + (P.admin ? '⬇️ 下載' : '🪙 扣 1 枚並下載') + '</button><button class="cw-b" type="button" data-x>取消</button></div>',
      function (ov, close) {
        ov.querySelector('[data-x]').addEventListener('click', close);
        ov.querySelector('[data-ok]').addEventListener('click', function () {
          var external = !a.hasAttribute('download');
          var win = external ? window.open('about:blank', '_blank') : null; // 先在點擊當下開分頁，避免被擋
          close();
          var page = location.pathname.replace(/^.*?\/([^\/]+\/t\d+\/)/, '$1');
          call({ a: 'dl', code: P.code, page: page, title: (document.title || '').split(' | ')[0], file: name }).then(function (j) {
            if (!j.ok) {
              if (win) win.close();
              if (j.p) apply(j.p);
              if (j.err === 'nocoin') noCoin(); else if (j.err === 'nocode') { logout(); toast('請重新登島'); } else toast(ERR.bad);
              return;
            }
            apply(j.p);
            toast(P.admin ? '📦 開始下載' : '📦 已扣 1 枚金幣，開始下載（剩 ' + P.bal + ' 枚）');
            if (win) { try { win.opener = null; } catch (e) {} win.location.href = a.href; }
            else { a.dataset.cwPaid = '1'; a.click(); setTimeout(function () { delete a.dataset.cwPaid; }, 500); }
          }).catch(function () { if (win) win.close(); netFail(); });
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
    if (!P.code) { welcome(function (ok) { if (ok) board(); }); return; }
    modal('<div class="cw-ic">🏆</div><h3>金幣排行榜</h3><div class="cw-body"><p>載入中…</p></div>' +
      '<div class="cw-me">你是 <b>' + esc(P.nick) + '</b>' + (P.admin ? '（管理員，不列入排行）' : '') + '，目前 🪙 <b>' + P.bal + '</b> 枚・連續登島 ' + (P.streak || 0) + ' 天<br>' +
      '<button class="cw-link" type="button" data-code>看我的登島碼</button>・<button class="cw-link" type="button" data-nick>改暱稱</button>・<button class="cw-link" type="button" data-sw>換帳號</button></div>' +
      '<div class="cw-row"><button class="cw-b p" type="button" data-x>關閉</button></div>',
      function (ov, close) {
        ov.querySelector('[data-x]').addEventListener('click', close);
        ov.querySelector('[data-code]').addEventListener('click', function () { close(); showCode(false); });
        ov.querySelector('[data-nick]').addEventListener('click', function () { close(); rename(); });
        ov.querySelector('[data-sw]').addEventListener('click', function () { close(); welcome(function (ok) { if (ok) daily(); }, 'login'); });
        var body = ov.querySelector('.cw-body');
        call({ a: 'top', code: P.code }).then(function (j) {
          var rows = (j && j.top) || [];
          if (!rows.length) { body.innerHTML = '<p>還沒有人上榜，你來當第一名！</p>'; return; }
          body.innerHTML = '<ol class="cw-lb">' + rows.map(function (r, i) {
            return '<li class="' + (r.me ? 'me' : '') + '"><span class="r">' + (['🥇', '🥈', '🥉'][i] || (i + 1)) + '</span><span class="n">' + esc(r.nick) + '</span><span class="c">🪙 ' + (+r.bal || 0) + '</span></li>';
          }).join('') + '</ol>';
        }).catch(function () { body.innerHTML = '<p>排行榜暫時連不上，稍後再試。</p>'; });
      });
  }

  /* ---------- 小島造訪紀錄 ---------- */
  function visit(isle, name, el) {
    if (!el) return;
    el.className = 'cw-vis'; el.innerHTML = '👣 載入造訪紀錄…';
    var req = P.code ? { a: 'visit', code: P.code, isle: isle, name: name } : { a: 'visitors', isle: isle };
    call(req).then(function (j) {
      if (j.p) apply(j.p);
      var v = (j && j.v) || { list: [], total: 0 };
      if (!v.total) { el.innerHTML = '👣 還沒有人留下足跡，' + (P.code ? '你是第一位登島的旅人！' : '取個暱稱，當第一位登島的旅人！'); return; }
      el.innerHTML = '👣 <b>' + v.total + '</b> 位旅人造訪過・最近登島：<br>' +
        v.list.map(function (x) { return '<i>' + esc(x.nick) + '<small>' + esc(x.d) + '</small></i>'; }).join('');
    }).catch(function () { el.innerHTML = '👣 造訪紀錄暫時連不上'; });
  }

  /* ---------- 啟動 ---------- */
  load();
  injectCSS();
  if (TOP) {
    window.addEventListener('message', function (e) { if (e.origin === location.origin && e.data && e.data.cw === 'toast') toast(e.data.msg); });
    window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); emit({ t: 'ext' }); } });
  }

  window.COINS = {
    get: function () { return P; },
    on: function (f) { listeners.push(f); },
    earn: earn,
    read: read,
    board: board,
    visit: visit,
    toast: toast,
    // 首頁或直接開啟的文章頁才發登島、在線獎勵；閱讀器 iframe 內不重複計算
    start: function (opt) {
      opt = opt || {};
      if (!TOP || started) { if (opt.done) opt.done(); return; }
      started = true;
      var begin = function () { daily(); online(); if (opt.done) opt.done(); };
      var asked = false; try { asked = sessionStorage.getItem('cw-asked') === '1'; sessionStorage.setItem('cw-asked', '1'); } catch (e) {}
      if (!P.code && opt.ask !== false && !asked) welcome(begin); else begin();
    }
  };
})();
