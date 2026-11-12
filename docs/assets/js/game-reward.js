/* 打遊戲送金幣：給 AutoCAD 指令快打、指令跑酷（autocad-game）用。
   遊戲結束時呼叫  AIKB_GAME_DONE('quick' 或 'runner', 分數)
   → 用這台瀏覽器裡的登島碼（和論壇資源島同一個網站，localStorage 共用）回報給金幣小島，依分數送 1～3 枚金幣。
   沒登島就只跳一個小提示，不會影響遊戲本身。 */
(function () {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbyvv3G6pw8MywtKOpG4pSCu79lsYvDbxDlsMSrUOYsPVCOirw5v1m1rLeyfm_4Dbm84/exec';
  var KEY = 'aikb-player';
  var ISLAND = 'https://kv1012tiger.github.io/autocad-tw-island/';
  var T = [150, 500, 1000];
  var box = null, timer = 0;

  function toast(html) {
    try {
      if (!box) {
        box = document.createElement('div');
        box.setAttribute('role', 'status');
        box.style.cssText = 'position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;max-width:92vw;padding:10px 18px;border-radius:999px;background:rgba(3,42,60,.96);border:2px solid #ffd166;color:#fff8e7;font:700 15px/1.5 "Noto Sans TC",system-ui,sans-serif;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.45);transition:opacity .3s;opacity:0';
        document.body.appendChild(box);
      }
      box.innerHTML = html;
      box.style.opacity = '1';
      clearTimeout(timer);
      timer = setTimeout(function () { box.style.opacity = '0'; }, 6500);
    } catch (e) {}
  }

  function player() {
    try { var P = JSON.parse(localStorage.getItem(KEY) || 'null'); return P && P.code ? P : null; } catch (e) { return null; }
  }

  window.AIKB_GAME_DONE = function (game, score) {
    score = Math.floor(Number(score) || 0);
    var P = player();
    if (!P) {
      if (score >= T[0]) toast('🪙 打到 ' + score + ' 分！到 <a href="' + ISLAND + '" style="color:#7fd8ff">論壇資源島</a> 登島，打遊戲就能賺金幣');
      return;
    }
    var q = { a: 'gameplay', code: P.code, game: game, score: score };
    fetch(API + '?q=' + encodeURIComponent(JSON.stringify(q)), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok || !j.game) return;
        try { // 把最新的金幣數字存回去，回到論壇資源島時就是對的
          if (j.p) { var cur = JSON.parse(localStorage.getItem(KEY) || 'null'); if (cur && cur.code === j.p.code) { cur.bal = j.p.bal; cur.earned = j.p.earned; localStorage.setItem(KEY, JSON.stringify(cur)); } }
        } catch (e) {}
        var g = j.game;
        if (g.got > 0) toast('🪙 +' + g.got + ' 枚金幣！' + (g.left > 0 ? '這款遊戲今天還能再拿 ' + g.left + ' 枚' : '這款遊戲今天的金幣領完了'));
        else if (g.left <= 0) toast('🪙 這款遊戲今天的金幣已經領完了，明天再來');
        else if (score < T[0]) toast('🪙 打到 ' + T[0] + ' 分以上就有金幣（500 分 2 枚、1000 分 3 枚）');
      })
      .catch(function () {});
  };
})();
