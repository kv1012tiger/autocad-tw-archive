/* 島上人物與毛孩：手繪 SVG，手腳會擺動走路。首頁與文章頁共用。 */
(function () {
  var O = '#3b2414';
  // s 膚色 h 髮色 hat 帽子 sh 上衣 st 條紋 pn 褲子 dr 洋裝 cl 長袍 g 眼鏡 lh 長髮 bd 鬍子 tie 領帶 k 小孩
  var ROLES = {
    eng:      {s:'#f6c9a0', h:'#3b2414', hat:'hard',     sh:'#f97316', pn:'#1e3a8a'},
    draft:    {s:'#f3cfa8', h:'#2b1a10', sh:'#38bdf8', pn:'#334155', g:1},
    artist:   {s:'#f6c9a0', h:'#6b3a1c', hat:'beret',    sh:'#facc15', st:'#ef4444', pn:'#1f2937'},
    student:  {s:'#f3d1b0', h:'#1f1f1f', sh:'#60a5fa', pn:'#1e3a8a', g:1},
    teacher:  {s:'#eec39a', h:'#4a2c18', sh:'#ffffff', pn:'#374151', g:1, tie:'#dc2626'},
    kid:      {s:'#f3d1b0', h:'#3b2414', hat:'cap',      sh:'#22c55e', pn:'#2563eb', k:1},
    girl:     {s:'#f7d3b5', h:'#5a3418', lh:1, dr:'#f472b6', pn:'#f7d3b5', k:1},
    lady:     {s:'#f3cfa8', h:'#2b1a10', lh:1, sh:'#a855f7', pn:'#312e81'},
    boss:     {s:'#eec39a', h:'#2b1a10', sh:'#1f2937', pn:'#1f2937', tie:'#ef4444'},
    worker:   {s:'#e8b48a', h:'#3b2414', hat:'hard',     sh:'#0ea5e9', pn:'#1e3a8a'},
    scientist:{s:'#f6c9a0', h:'#9ca3af', cl:'#f8fafc', pn:'#475569', g:1},
    wizard:   {s:'#f6c9a0', h:'#e5e7eb', hat:'wizard',   cl:'#7c3aed', pn:'#4c1d95', bd:'#e5e7eb'},
    seer:     {s:'#e8b48a', h:'#1f1f1f', hat:'scarf',    dr:'#9333ea', pn:'#e8b48a', lh:1},
    pirate:   {s:'#e8b48a', h:'#1f1f1f', hat:'bandana',  sh:'#ffffff', st:'#ef4444', pn:'#374151', bd:'#3b2414'},
    captain:  {s:'#eec39a', h:'#3b2414', hat:'tricorn',  sh:'#1e40af', pn:'#f5f5f4'},
    sailor:   {s:'#f6c9a0', h:'#6b3a1c', hat:'sailor',   sh:'#ffffff', st:'#1e3a8a', pn:'#1e3a8a'},
    chef:     {s:'#f6c9a0', h:'#3b2414', hat:'toque',    sh:'#ffffff', pn:'#1f2937'},
    farmer:   {s:'#e8b48a', h:'#6b3a1c', hat:'straw',    sh:'#ef4444', pn:'#2563eb'},
    explorer: {s:'#eec39a', h:'#3b2414', hat:'safari',   sh:'#c8a46a', pn:'#6b5a3a'},
    reporter: {s:'#f6c9a0', h:'#3b2414', hat:'newsboy',  sh:'#f59e0b', pn:'#374151'},
    runner:   {s:'#e8b48a', h:'#1f1f1f', hat:'headband', sh:'#14b8a6', pn:'#0f172a'},
    granny:   {s:'#f3cfa8', h:'#d1d5db', hat:'bun',      dr:'#a78bfa', pn:'#f3cfa8', g:1},
    grandpa:  {s:'#eec39a', h:'#d1d5db', sh:'#a16207', pn:'#57534e', g:1, bd:'#e5e7eb'},
    king:     {s:'#f6c9a0', h:'#6b3a1c', hat:'crown',    cl:'#b91c1c', pn:'#7f1d1d', bd:'#6b3a1c'},
    queen:    {s:'#f7d3b5', h:'#c2410c', hat:'crown',    dr:'#ec4899', pn:'#f7d3b5', lh:1},
    guard:    {s:'#f6c9a0', h:'#3b2414', hat:'busby',    sh:'#dc2626', pn:'#111827'},
    robot:    {robot:1}
  };

  var CSS =
    '.pp,.pq{overflow:visible}' +
    '.pp .ppL{transform-origin:24px 46px}.pp .ppR{transform-origin:24px 30px}' +
    '.ppA{animation:ppSw .7s ease-in-out infinite alternate}' +
    '.ppB{animation:ppSw .7s ease-in-out infinite alternate-reverse}' +
    '.ppT{animation:ppWag .5s ease-in-out infinite alternate}' +
    '.old .ppA,.old .ppB{animation-duration:1s}' +
    '.still .ppA,.still .ppB,.still .ppT{animation:none}' +
    '@keyframes ppSw{from{transform:rotate(-26deg)}to{transform:rotate(26deg)}}' +
    '@keyframes ppWag{from{transform:rotate(-14deg)}to{transform:rotate(16deg)}}' +
    '@keyframes ppBob{from{transform:translateY(0)}to{transform:translateY(-5%)}}' +
    '@keyframes ppFlip{0%{transform:scaleX(1)}50%{transform:scaleX(-1)}}' +
    '.rs.p svg{display:block;width:.95em;height:1.5em}' +
    '.rs.p.kid svg{width:.8em;height:1.25em}' +
    '.rs.p i{animation-name:ppFlip}' +
    '.rs.p b{animation:ppBob .35s ease-in-out infinite alternate}' +
    '@media (prefers-reduced-motion:reduce){.ppA,.ppB,.ppT,.rs.p b{animation:none}}';

  function hat(t) {
    switch (t) {
      case 'hard': return '<path d="M13 15a11 10 0 0 1 22 0z" fill="#facc15" stroke="#7a4b00" stroke-width="1.5"/><rect x="11" y="14" width="27" height="3" rx="1.5" fill="#facc15" stroke="#7a4b00" stroke-width="1.2"/>';
      case 'bandana': return '<path d="M14 14a10 9 0 0 1 20 0z" fill="#dc2626"/><path d="M14.5 12l-6 4 7 .5z" fill="#dc2626"/><circle cx="20" cy="10" r="1.3" fill="#fff"/><circle cx="27" cy="9" r="1.3" fill="#fff"/>';
      case 'wizard': return '<path d="M12 15h24l-9-18z" fill="#6d28d9" stroke="#2e1065" stroke-width="1.2"/><circle cx="25" cy="5" r="1.4" fill="#fde047"/><circle cx="21" cy="10" r="1" fill="#fde047"/><rect x="10" y="13" width="28" height="3" rx="1.5" fill="#5b21b6"/>';
      case 'cap': return '<path d="M14 14a10 9 0 0 1 20 0z" fill="#ef4444"/><rect x="28" y="12" width="10" height="3" rx="1.5" fill="#ef4444"/>';
      case 'beret': return '<ellipse cx="23" cy="10" rx="12" ry="5" fill="#be123c" transform="rotate(-10 23 10)"/><circle cx="22" cy="5" r="1.4" fill="#be123c"/>';
      case 'tricorn': return '<path d="M9 13q15-14 30 0q-15 5-30 0z" fill="#1f2937" stroke="#d4a017" stroke-width="1.3"/><circle cx="24" cy="9" r="1.6" fill="#f5f5f4"/>';
      case 'crown': return '<path d="M15 11l2-8 4 5 3-7 3 7 4-5 2 8z" fill="#fbbf24" stroke="#92400e" stroke-width="1.2" stroke-linejoin="round"/><circle cx="24" cy="8" r="1.3" fill="#ef4444"/>';
      case 'toque': return '<rect x="16" y="6" width="16" height="9" fill="#fff" stroke="#9ca3af" stroke-width="1"/><circle cx="19" cy="5" r="4.5" fill="#fff" stroke="#9ca3af" stroke-width="1"/><circle cx="25" cy="3.5" r="5" fill="#fff" stroke="#9ca3af" stroke-width="1"/><circle cx="30" cy="5.5" r="4" fill="#fff" stroke="#9ca3af" stroke-width="1"/>';
      case 'straw': return '<ellipse cx="24" cy="12" rx="16" ry="3.5" fill="#e9c46a" stroke="#a16207" stroke-width="1.2"/><path d="M16 12a8 7 0 0 1 16 0z" fill="#f4d58d" stroke="#a16207" stroke-width="1.2"/><rect x="16" y="9.5" width="16" height="2.4" fill="#dc2626"/>';
      case 'safari': return '<ellipse cx="24" cy="13" rx="14" ry="3" fill="#a3875a" stroke="#5b4425" stroke-width="1.1"/><path d="M15 13a9 9 0 0 1 18 0z" fill="#c8a46a" stroke="#5b4425" stroke-width="1.1"/>';
      case 'sailor': return '<path d="M15 13a9 6 0 0 1 18 0z" fill="#fff" stroke="#94a3b8" stroke-width="1"/><rect x="14.5" y="11.5" width="19" height="3" rx="1" fill="#1e3a8a"/>';
      case 'busby': return '<rect x="15" y="-6" width="18" height="20" rx="7" fill="#111827"/><path d="M15 12h18" stroke="#fbbf24" stroke-width="1.5"/>';
      case 'headband': return '<rect x="14" y="10" width="20" height="3.2" rx="1.5" fill="#ef4444"/>';
      case 'newsboy': return '<path d="M14 14a10 8 0 0 1 20-1z" fill="#6b7280"/><path d="M28 12.5h9a1.6 1.6 0 0 1 0 3h-9z" fill="#4b5563"/><circle cx="23" cy="7" r="1.2" fill="#4b5563"/>';
      case 'scarf': return '<path d="M13 19a11 12 0 0 1 22-3q-11-6-22 3z" fill="#c026d3"/><path d="M14 18q-4 4-2 8l4-6z" fill="#c026d3"/><circle cx="20" cy="11" r="1" fill="#fde047"/><circle cx="27" cy="10" r="1" fill="#fde047"/>';
      case 'bun': return '<circle cx="21" cy="6" r="4.5" fill="#d1d5db" stroke="' + O + '" stroke-width="1"/>';
    }
    return '';
  }

  function robot() {
    var c = '#cbd5e1', d = '#64748b';
    function leg(cls) { return '<g class="ppL ' + cls + '"><rect x="21" y="44" width="6" height="20" rx="2" fill="' + d + '" stroke="' + O + '" stroke-width="1.3"/><rect x="19" y="62" width="11" height="5" rx="2" fill="#334155"/></g>'; }
    function arm(cls) { return '<g class="ppR ' + cls + '"><rect x="21.5" y="29" width="5" height="16" rx="2" fill="' + d + '" stroke="' + O + '" stroke-width="1.2"/><circle cx="24" cy="46" r="3" fill="#f59e0b" stroke="' + O + '" stroke-width="1"/></g>'; }
    return leg('ppB') + '<g opacity=".8">' + arm('ppA') + '</g>' + leg('ppA') +
      '<rect x="14" y="27" width="20" height="20" rx="4" fill="' + c + '" stroke="' + O + '" stroke-width="1.5"/><circle cx="24" cy="37" r="3.5" fill="#38bdf8" stroke="' + O + '" stroke-width="1"/>' +
      '<rect x="14" y="8" width="20" height="17" rx="5" fill="' + c + '" stroke="' + O + '" stroke-width="1.5"/><path d="M24 8V3" stroke="' + O + '" stroke-width="1.5"/><circle cx="24" cy="2.5" r="2" fill="#ef4444"/>' +
      '<rect x="24" y="12" width="9" height="7" rx="3" fill="#0f172a"/><circle cx="29.5" cy="15.5" r="1.8" fill="#22d3ee"/>' + arm('ppB');
  }

  function person(role) {
    var R = ROLES[role] || ROLES.student, body;
    if (R.robot) return '<svg class="pp" viewBox="0 0 48 76" aria-hidden="true">' + robot() + '</svg>';
    var top = R.cl || R.dr || R.sh, sk = R.s;
    function leg(cls) { return '<g class="ppL ' + cls + '"><rect x="20.5" y="44" width="7" height="21" rx="3.5" fill="' + R.pn + '" stroke="' + O + '" stroke-width="1.5"/><path d="M20 62h10a3 3 0 0 1 0 5.5H20z" fill="' + O + '"/></g>'; }
    function arm(cls) { return '<g class="ppR ' + cls + '"><rect x="21" y="29" width="6" height="16" rx="3" fill="' + top + '" stroke="' + O + '" stroke-width="1.5"/><circle cx="24" cy="46" r="3.1" fill="' + sk + '" stroke="' + O + '" stroke-width="1.2"/></g>'; }
    if (R.dr) body = '<path d="M18 28h12l6 22H12z" fill="' + R.dr + '" stroke="' + O + '" stroke-width="1.5" stroke-linejoin="round"/>';
    else if (R.cl) body = '<path d="M16 32a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5l2 21H14z" fill="' + R.cl + '" stroke="' + O + '" stroke-width="1.5" stroke-linejoin="round"/>';
    else body = '<rect x="16" y="27" width="16" height="21" rx="5" fill="' + R.sh + '" stroke="' + O + '" stroke-width="1.5"/>' +
      (R.st ? '<path d="M16.8 33h14.4M16.8 39h14.4M16.8 45h14.4" stroke="' + R.st + '" stroke-width="2.4"/>' : '');
    if (R.tie) body += '<path d="M24 28l-2 3 2 9 2-9z" fill="' + R.tie + '"/>';
    var s = '<svg class="pp" viewBox="0 0 48 76" aria-hidden="true">';
    s += leg('ppB') + '<g opacity=".8">' + arm('ppA') + '</g>';
    if (R.lh) s += '<path d="M15 15q-5 10-2 19h9l-1-18z" fill="' + R.h + '" stroke="' + O + '" stroke-width="1.2"/>';
    s += leg('ppA') + body;
    s += '<circle cx="24" cy="18" r="10" fill="' + sk + '" stroke="' + O + '" stroke-width="1.5"/>';
    if (R.hat !== 'scarf' && R.hat !== 'bandana') s += '<path d="M14.3 17.5A10 10 0 0 1 33.6 15.5Q29 12.5 24 14Q19 15 17 21z" fill="' + R.h + '"/>';
    s += '<circle cx="29" cy="17" r="1.6" fill="' + O + '"/><circle cx="31" cy="20.5" r="1.8" fill="#f9a8a8" opacity=".7"/>';
    if (R.bd) s += '<path d="M17.5 21q2 9 9 8q5-1 7-6q-3 3-7 2q-5-1-9-4z" fill="' + R.bd + '" stroke="' + O + '" stroke-width="1"/>';
    else s += '<path d="M27 23q3 2 6-1" stroke="' + O + '" stroke-width="1.3" fill="none"/>';
    if (R.g) s += '<circle cx="29.5" cy="17" r="3.2" fill="none" stroke="' + O + '" stroke-width="1.2"/><path d="M26.3 16.5H20" stroke="' + O + '" stroke-width="1.1"/>';
    s += hat(R.hat) + arm('ppB');
    return s + '</svg>';
  }

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

  window.PPL = {
    person: person,
    pet: pet,
    isKid: function (r) { return !!(ROLES[r] && ROLES[r].k); },
    known: function (r) { return !!ROLES[r]; }
  };

  // 文章頁：<span class="rs ..." data-p="role"><i><b></b></i></span> 填入人物
  function fill() {
    var els = document.querySelectorAll('.rs[data-p]');
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getAttribute('data-p'), b = els[i].querySelector('b');
      if (b && !b.firstChild) b.innerHTML = person(r);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();
