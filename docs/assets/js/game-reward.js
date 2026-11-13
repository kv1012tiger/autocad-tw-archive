/* 遊戲結束後由玩家按鈕領獎；同一局的識別碼可安全重試。 */
(function () {
  'use strict';
  var API='https://script.google.com/macros/s/AKfycbyvv3G6pw8MywtKOpG4pSCu79lsYvDbxDlsMSrUOYsPVCOirw5v1m1rLeyfm_4Dbm84/exec';
  var KEY='aikb-player',ISLAND='https://kv1012tiger.github.io/autocad-tw-island/';
  function player(){try{var p=JSON.parse(localStorage.getItem(KEY)||'null');return p&&p.code?p:null}catch(e){return null}}
  function id(){var a=new Uint32Array(4);if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(a);else for(var i=0;i<a.length;i++)a[i]=Math.floor(Math.random()*4294967296);return Array.from(a).map(function(n){return n.toString(36)}).join('-')+'-'+Date.now().toString(36)}
  window.AIKB_GAME_DONE=function(game,score){
    score=Math.floor(Number(score)||0);var ticket=id(),bound=player();bound=bound&&bound.code;
    setTimeout(function(){
      var again=document.getElementById(game==='quick'?'acm-game-again':'acr-game-again');if(!again||!again.parentNode)return;
      var old=document.getElementById('aikb-reward-box');if(old)old.remove();
      var wrap=document.createElement('div');wrap.id='aikb-reward-box';wrap.style.cssText='margin:8px auto 12px;max-width:440px;text-align:center';
      var btn=document.createElement('button');btn.type='button';btn.style.cssText='width:100%;padding:11px;border:0;border-radius:12px;background:#ffbd3f;color:#351900;font:800 16px system-ui;cursor:pointer';btn.textContent='🪙 領取金幣獎勵';
      var status=document.createElement('p');status.setAttribute('role','status');status.style.cssText='margin:6px 0;color:#fff;font:600 14px/1.5 system-ui';
      wrap.appendChild(btn);wrap.appendChild(status);again.parentNode.insertBefore(wrap,again);
      if(score<150){btn.disabled=true;btn.style.opacity='.55';status.textContent='達到 150 分即可領取金幣。';return}
      status.textContent='本場達標，點按鈕領取金幣。';
      btn.addEventListener('click',function(){
        var p=player();if(!p){status.textContent='請先到論壇資源島登島，再回來按領取。';var link=document.createElement('a');link.href=ISLAND;link.target='_blank';link.rel='noopener';link.style.color='#8ae4ff';link.textContent=' 前往登島';status.appendChild(link);return}
        if(bound&&bound!==p.code){status.textContent='請切回本局原本的登島帳號，再領取獎勵。';return}bound=p.code;
        btn.disabled=true;status.textContent='正在確認獎勵…';
        var q={a:'gameplay',code:p.code,game:game,score:score,id:ticket};
        fetch(API+'?q='+encodeURIComponent(JSON.stringify(q)),{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('http');return r.json()}).then(function(j){
          if(!j||!j.ok||!j.game){btn.disabled=!!(j&&j.err==='expired');status.textContent=j&&j.err==='gamecool'?'領獎間隔尚未結束，請稍後再按一次。':j&&j.err==='expired'?'本場領獎已逾時，請再玩一場。':'暫時無法領獎，請再試一次。';return}
          try{if(j.p){var cur=JSON.parse(localStorage.getItem(KEY)||'null');if(cur&&cur.code===j.p.code){cur.bal=j.p.bal;cur.earned=j.p.earned;localStorage.setItem(KEY,JSON.stringify(cur))}}}catch(e){}
          btn.textContent=j.game.got?'✅ 已領取 '+j.game.got+' 枚金幣':'今日金幣獎勵已領完';btn.disabled=true;
          status.textContent=j.game.got?'已加入錢包，這款遊戲今天還能領 '+j.game.left+' 枚。':'每款遊戲每日最多 8 枚，明天再來。';
        }).catch(function(){btn.disabled=false;status.textContent='網路不穩，請再次按領取確認結果；不會重複領獎。'});
      });
    },0);
  };
})();
