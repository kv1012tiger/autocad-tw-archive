/* 文章圖片：點一下全螢幕放大，雙指縮放、拖曳移動、雙擊放大／還原（手機最需要） */
(function () {
  'use strict';
  var imgs = document.querySelectorAll('article.content img');
  if (!imgs.length) return;
  var ov, im, st, base = 1, ptrs = {}, pinch = null, drag = null, moved = false, lastTap = 0, opened = false, pinched = false;

  var style = document.createElement('style');
  style.textContent =
    'article.content img.lb-z{cursor:zoom-in}' +
    '.lb-ov{position:fixed;inset:0;z-index:99999;background:rgba(2,12,20,.94);overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}' +
    '.lb-ov img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none;max-height:none;will-change:transform;-webkit-user-drag:none}' +
    '.lb-x{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top));width:46px;height:46px;border-radius:50%;border:2px solid rgba(255,255,255,.7);background:rgba(0,0,0,.55);color:#fff;font-size:26px;line-height:1;cursor:pointer;z-index:2}' +
    '.lb-bar{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:10px;z-index:2}' +
    '.lb-bar button{width:48px;height:48px;border-radius:50%;border:2px solid rgba(255,255,255,.6);background:rgba(0,0,0,.55);color:#fff;font-size:24px;line-height:1;cursor:pointer}' +
    '.lb-tip{position:absolute;left:0;right:0;bottom:calc(72px + env(safe-area-inset-bottom));text-align:center;color:#fff;font:14px/1.4 sans-serif;opacity:.85;pointer-events:none;transition:opacity .6s}';
  document.head.appendChild(style);

  imgs.forEach(function (el) {
    if (el.closest('a')) return; // 圖片本身是連結的就不攔截
    el.classList.add('lb-z');
    el.addEventListener('click', function () { open(el.currentSrc || el.src); });
  });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function apply() { im.style.transform = 'translate(' + st.x.toFixed(1) + 'px,' + st.y.toFixed(1) + 'px) scale(' + st.s.toFixed(4) + ')'; }
  function bounds() {
    var vw = innerWidth, vh = innerHeight, w = im.naturalWidth * base * st.s, h = im.naturalHeight * base * st.s;
    st.x = w <= vw ? (vw - w) / 2 : clamp(st.x, vw - w - 40, 40);
    st.y = h <= vh ? (vh - h) / 2 : clamp(st.y, vh - h - 40, 40);
  }
  function fit() {
    var nw = im.naturalWidth || 1, nh = im.naturalHeight || 1;
    base = Math.min(innerWidth * 0.98 / nw, innerHeight * 0.86 / nh, 2);
    im.style.width = (nw * base) + 'px'; im.style.height = (nh * base) + 'px';
    st = { s: 1, x: 0, y: 0 }; bounds(); apply();
  }
  function zoomAt(ns, cx, cy) {
    ns = clamp(ns, 1, 8);
    var f = ns / st.s;
    st.x = cx - (cx - st.x) * f; st.y = cy - (cy - st.y) * f; st.s = ns; bounds(); apply();
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function open(src) {
    if (opened) return;
    opened = true;
    ov = document.createElement('div'); ov.className = 'lb-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    im = document.createElement('img'); im.alt = ''; im.draggable = false;
    var x = document.createElement('button'); x.className = 'lb-x'; x.type = 'button'; x.setAttribute('aria-label', '關閉'); x.textContent = '×';
    var bar = document.createElement('div'); bar.className = 'lb-bar';
    [['－', function () { zoomAt(st.s / 1.5, innerWidth / 2, innerHeight / 2); }], ['還原', function () { zoomAt(1, innerWidth / 2, innerHeight / 2); }], ['＋', function () { zoomAt(st.s * 1.5, innerWidth / 2, innerHeight / 2); }]].forEach(function (b) {
      var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = b[0]; if (b[0] === '還原') bt.style.fontSize = '15px';
      bt.addEventListener('click', function (e) { e.stopPropagation(); b[1](); }); bt.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      bar.appendChild(bt);
    });
    var tip = document.createElement('div'); tip.className = 'lb-tip'; tip.textContent = '雙指放大・拖曳移動・點兩下放大／還原・點空白處關閉';
    setTimeout(function () { tip.style.opacity = '0'; }, 3500);
    ov.appendChild(im); ov.appendChild(tip); ov.appendChild(bar); ov.appendChild(x);
    document.body.appendChild(ov);
    st = { s: 1, x: 0, y: 0 };
    im.onload = fit; im.src = src; if (im.complete && im.naturalWidth) fit();
    try { history.pushState({ lb: 1 }, ''); } catch (e) {}
    x.addEventListener('click', function (e) { e.stopPropagation(); closeUI(); });
    x.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    ov.addEventListener('pointerdown', down); ov.addEventListener('pointermove', move);
    ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', up);
    ov.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(st.s * Math.exp(-e.deltaY * 0.0018), e.clientX, e.clientY); }, { passive: false });
    document.documentElement.style.overflow = 'hidden';
  }
  function doClose() {
    if (!opened) return;
    opened = false; ptrs = {}; pinch = null; drag = null;
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    document.documentElement.style.overflow = '';
  }
  function closeUI() { if (history.state && history.state.lb) history.back(); else doClose(); }
  window.addEventListener('popstate', doClose);
  document.addEventListener('keydown', function (e) { if (opened && e.key === 'Escape') closeUI(); });

  function down(e) {
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { ov.setPointerCapture(e.pointerId); } catch (x) {}
    var ids = Object.keys(ptrs);
    if (ids.length === 1) { moved = false; pinched = false; drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, t: e.target }; }
    else if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d0: dist(a, b) || 1, s0: st.s, x0: st.x, y0: st.y, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      drag = null; pinched = true;
    }
  }
  function move(e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptrs);
    if (pinch && ids.length >= 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]], ns = clamp(pinch.s0 * dist(a, b) / pinch.d0, 1, 8), f = ns / pinch.s0;
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      st.s = ns; st.x = mx - (pinch.mx - pinch.x0) * f; st.y = my - (pinch.my - pinch.y0) * f; bounds(); apply(); moved = true;
    } else if (drag && ids.length === 1) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      if (st.s > 1) { st.x = drag.sx + dx; st.y = drag.sy + dy; bounds(); apply(); }
    }
  }
  function up(e) {
    var had = ptrs[e.pointerId]; delete ptrs[e.pointerId];
    var left = Object.keys(ptrs).length;
    if (left < 2) pinch = null;
    if (left === 1) { var id = Object.keys(ptrs)[0]; drag = { x: ptrs[id].x, y: ptrs[id].y, sx: st.x, sy: st.y, t: null }; }
    if (left === 0 && had && !moved && !pinched && drag) {
      var now = Date.now();
      if (now - lastTap < 320) { lastTap = 0; zoomAt(st.s > 1.2 ? 1 : 2.5, e.clientX, e.clientY); }
      else {
        lastTap = now;
        if (e.target === ov) setTimeout(function () { if (lastTap && Date.now() - lastTap >= 300) closeUI(); }, 330);
      }
    }
    if (left === 0) drag = null;
  }
})();
