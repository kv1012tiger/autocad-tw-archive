/* 蘋果爸小島的三貓三狗：手繪側面全身 SVG，四隻腳走路、尾巴會搖。 */
(function () {
  var O = '#3b2414';
  var CSS =
    '.pq{overflow:visible}' +
    '.ppA{animation:ppSw .7s ease-in-out infinite alternate}' +
    '.ppB{animation:ppSw .7s ease-in-out infinite alternate-reverse}' +
    '.ppT{animation:ppWag .5s ease-in-out infinite alternate}' +
    '.old .ppA,.old .ppB{animation-duration:1s}' +
    '.still .ppA,.still .ppB,.still .ppT{animation:none}' +
    '@keyframes ppSw{from{transform:rotate(-26deg)}to{transform:rotate(26deg)}}' +
    '@keyframes ppWag{from{transform:rotate(-14deg)}to{transform:rotate(16deg)}}' +
    '@keyframes ppFlip{0%{transform:scaleX(1)}50%{transform:scaleX(-1)}}' +
    '@media (prefers-reduced-motion:reduce){.ppA,.ppB,.ppT{animation:none}}';

  // 毛孩：側面全身，四隻腳走路、尾巴會搖。p 用首頁 PETS 的欄位。
  var petId = 0;
  function pet(p, still) {
    var c = p.base, cat = p.kind === 'cat', id = 'pq' + (++petId);
    function leg(x, cls) {
      return '<g class="' + cls + '" style="transform-origin:' + x + 'px 32px"><rect x="' + (x - 3) + '" y="30" width="6" height="' + (cat ? 16 : 17) + '" rx="3" fill="' + c + '" stroke="' + O + '" stroke-width="1.4"/><ellipse cx="' + (x + 1) + '" cy="' + (cat ? 46 : 47) + '" rx="4" ry="2.4" fill="' + c + '" stroke="' + O + '" stroke-width="1.2"/></g>';
    }
    var s = '<svg class="pq' + (still ? ' still' : '') + (p.old ? ' old' : '') + '" viewBox="0 0 70 56" aria-hidden="true">';
    s += '<g opacity=".78">' + leg(22, 'ppB') + leg(46, 'ppA') + '</g>';
    var tc = p.tail || c;
    s += cat
      ? '<g class="ppT" style="transform-origin:14px 26px"><path d="M14 26C4 22 2 10 8 4" stroke="' + O + '" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M14 26C4 22 2 10 8 4" stroke="' + tc + '" stroke-width="4.4" fill="none" stroke-linecap="round"/></g>'
      : '<g class="ppT" style="transform-origin:14px 24px"><path d="M14 24C8 20 6 14 9 9" stroke="' + O + '" stroke-width="7.5" fill="none" stroke-linecap="round"/><path d="M14 24C8 20 6 14 9 9" stroke="' + tc + '" stroke-width="5" fill="none" stroke-linecap="round"/></g>';
    s += '<defs><clipPath id="' + id + '"><ellipse cx="34" cy="27" rx="21" ry="11"/></clipPath></defs><ellipse cx="34" cy="27" rx="21" ry="11" fill="' + c + '"/><g clip-path="url(#' + id + ')">';
    (p.bp || []).forEach(function (q) { s += '<circle cx="' + q[1] + '" cy="' + q[2] + '" r="' + q[3] + '" fill="' + q[0] + '"/>'; });
    if (p.stripe) [24, 32, 40].forEach(function (x) { s += '<path d="M' + x + ' 16q2 6 0 10" stroke="' + p.stripe + '" stroke-width="3" fill="none" stroke-linecap="round"/>'; });
    s += '</g><ellipse cx="34" cy="27" rx="21" ry="11" fill="none" stroke="' + O + '" stroke-width="1.5"/>';
    s += leg(26, 'ppA') + leg(50, 'ppB');
    var hx = 56, hy = cat ? 16 : 15;
    if (cat) {
      var hp = p.hp || c;
      s += '<path d="M' + (hx - 9) + ' ' + (hy - 4) + 'l2-10 7 6zM' + (hx + 9) + ' ' + (hy - 4) + 'l-2-10-7 6z" fill="' + hp + '" stroke="' + O + '" stroke-width="1.4" stroke-linejoin="round"/>';
      s += '<circle cx="' + hx + '" cy="' + hy + '" r="10" fill="' + c + '" stroke="' + O + '" stroke-width="1.5"/>';
      if (p.hp) s += '<path d="M' + (hx - 9) + ' ' + (hy - 3) + 'a10 10 0 0 1 9-7v7z" fill="' + p.hp + '"/>';
      if (p.stripe) s += '<path d="M' + (hx - 3) + ' ' + (hy - 9) + 'v4M' + hx + ' ' + (hy - 10) + 'v4M' + (hx + 3) + ' ' + (hy - 9) + 'v4" stroke="' + p.stripe + '" stroke-width="1.8" stroke-linecap="round"/>';
      s += '<circle cx="' + (hx + 4) + '" cy="' + (hy - 1) + '" r="1.7" fill="' + O + '"/><path d="M' + (hx + 8) + ' ' + (hy + 2) + 'l1.5 1.2-1.5 1.2" fill="#f28aa0"/><path d="M' + (hx + 9) + ' ' + (hy + 3) + 'h7M' + (hx + 9) + ' ' + (hy + 5) + 'l6 2" stroke="' + O + '" stroke-width=".8"/>';
    } else {
      var dark = c < '#8';
      s += '<circle cx="' + hx + '" cy="' + hy + '" r="10" fill="' + c + '" stroke="' + O + '" stroke-width="1.5"/>';
      s += '<path d="M' + (hx + 4) + ' ' + (hy + 1) + 'h8a4 4 0 0 1 0 8h-8z" fill="' + p.snout + '" stroke="' + O + '" stroke-width="1.3"/><circle cx="' + (hx + 12) + '" cy="' + (hy + 3) + '" r="2" fill="' + O + '"/>';
      s += '<path d="M' + (hx - 6) + ' ' + (hy - 8) + 'c-6 2-7 12-3 16 3-2 5-8 5-14z" fill="' + p.ear + '" stroke="' + O + '" stroke-width="1.3"/>';
      s += '<circle cx="' + (hx + 3) + '" cy="' + (hy - 3) + '" r="1.8" fill="' + (dark ? '#fff' : O) + '"/>';
      if (p.old) s += '<path d="M' + (hx + 1) + ' ' + (hy - 6) + 'q3-2 5 0" stroke="#bbb" stroke-width="1.3" fill="none"/><path d="M' + (hx - 7) + ' ' + (hy + 7) + 'q7 5 14 1l-1 3q-6 3-12-1z" fill="#e2453c"/>';
      s += '<path d="M' + (hx + 7) + ' ' + (hy + 9) + 'q2 4 4 0" fill="#f28aa0" stroke="' + O + '" stroke-width=".8"/>';
    }
    return s + '</svg>';
  }

  var st = document.createElement('style');
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);

  window.PPL = { pet: pet };
})();
