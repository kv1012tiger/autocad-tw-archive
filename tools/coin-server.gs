/** @OnlyCurrentDoc */
/**
 * 論壇資源島：金幣、暱稱、登島碼、下載紀錄、留言碼頭、物資島、好友的後台（Google 試算表 + Apps Script）。
 * 金幣與物資以試算表為準，同一個人用登島碼在手機、電腦都能接回同一個帳號。
 *
 * 部署：試算表 → 擴充功能 → Apps Script → 貼上本檔 → 存檔
 *       → 部署 → 管理部署作業 → 編輯（鉛筆）→ 版本選「新版本」→ 部署（網址不變）
 * 第一次換上本版：在上方函式選單選 setupOwner → 執行，建立站長的兩個帳號。
 *
 * 工作表「玩家」：每位玩家一列（登島碼、暱稱、金幣、物資、頭像、旅人編號、好友…），就是統計表。
 * 工作表「下載紀錄」：逐筆記錄誰在什麼時間下載了哪篇文章的哪個檔案。
 * 工作表「造訪紀錄」：每位玩家每天第一次登上某座島時記一筆（誰、哪座島、什麼時間）。
 * 工作表「留言板」：留言碼頭的留言與站長回覆；狀態欄填「隱藏」就不會出現在網站上。
 * 工作表「物資島」：四座物資島今天的總量、已採集數量、鑽石藏在第幾份（每天第一次有人來時自動重抽）。
 * 工作表「悄悄話」：好友之間的悄悄話與送禮紀錄。
 * 工作表「小島紀錄」：每位玩家在自己小島上蓋房子、種菜收成、領養寵物的紀錄。
 * 玩家表最後一欄「小島資料」是 JSON：房子等級、菜田、裝飾、寵物、蔬菜庫存（請不要手動改壞格式）。
 */
var SITE = 'https://kv1012tiger.github.io/autocad-tw-island/';
var TZ = 'Asia/Taipei';
var OWNER = [{ nick: 'Tiger&蘋果爸', admin: true }, { nick: '蘋果爸', admin: false }];
var RESERVED = /蘋果爸|管理員|站長|autocad\s*顧問|admin/i;

var P_HEAD = ['登島碼', '暱稱', '目前金幣', '累計金幣', '連續登島天數', '最後登島日', '第一次登島', '最後上線',
  '下載次數', '最近下載', '管理員', '今日', '今日在線金幣', '今日爬文金幣', '今日問答金幣', '已拿金幣的問答島',
  '頭像', '旅人編號', '好友', '水果', '鐵礦', '木材', '石頭', '鑽石', '累計物資', '累計鑽石',
  '今日採集', '最後採集', '今日兌換', '今日送禮', '今日留言', '最後留言', '今日悄悄話', '未讀悄悄話', '小島資料'];
var C = { code: 0, nick: 1, bal: 2, earned: 3, streak: 4, last: 5, first: 6, seen: 7, dls: 8, recent: 9, admin: 10,
  day: 11, onl: 12, rd: 13, qa: 14, qaDone: 15,
  av: 16, fid: 17, friends: 18, fruit: 19, iron: 20, wood: 21, stone: 22, dia: 23, tres: 24, tdia: 25,
  gToday: 26, gLast: 27, trades: 28, gifts: 29, msgN: 30, msgLast: 31, noteN: 32, unread: 33, isle: 34 };
var D_HEAD = ['時間', '暱稱', '登島碼', '文章', '文章網址', '檔案', '下載後剩餘金幣', '備註'];
var V_HEAD = ['時間', '暱稱', '登島碼', '小島代號', '小島', '日期', '管理員'];
var M_HEAD = ['編號', '時間', '暱稱', '登島碼', '頭像', '內容', '回覆', '回覆時間', '回覆修改時間', '狀態'];
var R_HEAD = ['代號', '物資島', '日期', '今日總量', '已採集', '鑽石藏在第幾份', '已撿到鑽石'];
var N_HEAD = ['時間', '寄件旅人編號', '寄件暱稱', '收件旅人編號', '收件暱稱', '內容'];
var DAILY = 3;      // 第 1 天 3 枚、第 2 天 4 枚
var DAILY_MAX = 5;  // 第 3 天起每天固定 5 枚
var CAP = { online: 3, read: 3, qa: 9 };
var KIND_COL = { online: C.onl, read: C.rd, qa: C.qa };
var ALPHA = '23456789ABCDFGHJKMNPQRSTUVWXYZ';

/* 動物頭像（網站上的選單要和這裡一致） */
var AVATARS = ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐧', '🦉', '🐢'];
/* 物資島 */
var RES = {
  fruit: { name: '果園島', item: '水果', col: C.fruit },
  iron: { name: '礦山島', item: '鐵礦', col: C.iron },
  wood: { name: '森林島', item: '木材', col: C.wood },
  stone: { name: '採石島', item: '石頭', col: C.stone }
};
var RES_KEYS = ['fruit', 'iron', 'wood', 'stone'];
var STOCK_MIN = 30, STOCK_MAX = 80;  // 每座物資島每天的總量（隨機）
var DIA_MAX = 2;                     // 每座物資島每天藏 0～2 顆鑽石（隨機）
var GATHER_MAX = 5;                  // 每人每座島每天最多採 5 次
var GATHER_GAP = 30 * 1000;          // 兩次採集至少隔 30 秒
var TRADE_RATE = 10;                 // 10 個同種物資換 1 枚金幣
var DIA_RATE = 5;                    // 1 顆鑽石換 5 枚金幣
var TRADE_MAX = 3;                   // 每天最多兌換 3 次
var FRIEND_MAX = 50;
/* ---------- 我的小島：蓋房子、種菜、養寵物 ---------- */
var L_HEAD = ['時間', '暱稱', '登島碼', '動作', '內容'];
var HOUR = 3600 * 1000, DAY_MS = 24 * HOUR;
var HOUSE = [null, { wood: 10, stone: 5 }, { wood: 20, stone: 15, iron: 5 }, { wood: 40, stone: 30, iron: 15, dia: 1 }];
var FIELD = [{ wood: 5, stone: 5 }, { wood: 10, stone: 10 }, { wood: 20, stone: 15, iron: 5 }];
var DECO = {
  tree: { name: '果樹', cost: { fruit: 10, wood: 5 }, pts: 5 },
  fountain: { name: '噴水池', cost: { stone: 20, iron: 10 }, pts: 10 },
  tower: { name: '瞭望塔', cost: { wood: 30, iron: 20, dia: 1 }, pts: 20 }
};
var VEG = {
  carrot: { name: '胡蘿蔔', seed: 1, hours: 4, n: 2, food: 20 },
  cabbage: { name: '高麗菜', seed: 2, hours: 8, n: 3, food: 35 },
  pumpkin: { name: '南瓜', seed: 3, hours: 24, n: 2, food: 60 }
};
var FRUIT_FOOD = 10, HUNGER_PER_DAY = 25, PUMPKIN_RATE = 5, WATER_BONUS = HOUR;
var ANIMALS = {
  hamster: { name: '倉鼠', cost: 10 }, rabbit: { name: '兔兔', cost: 15 }, turtle: { name: '烏龜', cost: 15 },
  dog: { name: '狗狗', cost: 20 }, cat: { name: '貓貓', cost: 20 }, parrot: { name: '鸚鵡', cost: 25 },
  fox: { name: '狐狸', cost: 40 }, panda: { name: '熊貓', cost: 60 }
};
var BAG_COL = { fruit: C.fruit, iron: C.iron, wood: C.wood, stone: C.stone, dia: C.dia };
/* 留言碼頭與悄悄話 */
var MSG_LEN = 300, MSG_DAY = 10, MSG_GAP = 60 * 1000, MSG_PAGE = 20;
var NOTE_LEN = 100, NOTE_DAY = 20;

/* ---------- 工作表 ---------- */
function sheet_(name, head) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (name === '玩家') sh.getRange('A:A').setNumberFormat('@'); // 登島碼一律當文字
  }
  var cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
  if (cur.join('|') !== head.join('|')) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#ffe8a3');
    sh.setFrozenRows(1);
  }
  return sh;
}
function players_() { return sheet_('玩家', P_HEAD); }
function rows_(sh) {
  var n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, P_HEAD.length).getValues() : [];
}
function find_(rows, code) {
  code = String(code || '').toUpperCase();
  if (!code) return -1;
  for (var i = 0; i < rows.length; i++) if (String(rows[i][C.code]).toUpperCase() === code) return i;
  return -1;
}
function findFid_(rows, fid) {
  fid = String(fid || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
  if (!fid) return -1;
  for (var i = 0; i < rows.length; i++) if (String(rows[i][C.fid]).toUpperCase() === fid) return i;
  return -1;
}

/* ---------- 工具 ---------- */
function day_(offset) {
  return Number(Utilities.formatDate(new Date(Date.now() + (offset || 0) * 86400000), TZ, 'yyyyMMdd'));
}
function num_(v) { v = Math.floor(Number(v)); return isFinite(v) && v >= 0 && v < 1e15 ? v : 0; }
function text_(s, n) {
  s = String(s == null ? '' : s).replace(/[<>\r\n\t]/g, ' ').trim().slice(0, n || 80);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
/* 留言內容：保留換行（最多連續 2 個），網站顯示時會再跳脫 */
function body_(s, n) {
  s = String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\t\u0000-\u0008\u000b-\u001f]/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function plain_(v) { return String(v == null ? '' : v).replace(/^'/, ''); }
function cleanNick_(s) { return String(s || '').replace(/[<>\r\n\t=+@]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12); }
function nickKey_(s) { return String(s).replace(/^'/, '').replace(/\s+/g, '').toLowerCase(); }
function nickTaken_(rows, nick, exceptIdx) {
  var k = nickKey_(nick);
  for (var i = 0; i < rows.length; i++) if (i !== exceptIdx && nickKey_(rows[i][C.nick]) === k) return true;
  return false;
}
function rand_(n) { var s = ''; for (var i = 0; i < n; i++) s += ALPHA.charAt(Math.floor(Math.random() * ALPHA.length)); return s; }
function newCode_(rows) { for (;;) { var c = rand_(6); if (find_(rows, c) < 0) return c; } }
function newFid_(rows) { for (;;) { var c = rand_(5); if (findFid_(rows, c) < 0) return c; } }
function newRow_(code, nick, admin, init, fid) {
  var now = new Date(), r = [];
  for (var i = 0; i < P_HEAD.length; i++) r.push('');
  r[C.code] = code; r[C.nick] = text_(nick, 12); r[C.bal] = init; r[C.earned] = init; r[C.streak] = 0; r[C.last] = 0;
  r[C.first] = now; r[C.seen] = now; r[C.dls] = 0; r[C.admin] = admin ? '是' : ''; r[C.day] = day_();
  r[C.onl] = 0; r[C.rd] = 0; r[C.qa] = 0; r[C.fid] = fid;
  return r;
}
function list_(v) { return plain_(v).split(',').filter(String); }
/* 今日計數「fruit:2,iron:1」 */
function counts_(v) {
  var o = {};
  plain_(v).split(',').forEach(function (p) { var kv = p.split(':'); if (kv[0]) o[kv[0]] = num_(kv[1]); });
  return o;
}
function countsStr_(o) { return Object.keys(o).map(function (k) { return k + ':' + o[k]; }).join(','); }
function bag_(r) { return { fruit: num_(r[C.fruit]), iron: num_(r[C.iron]), wood: num_(r[C.wood]), stone: num_(r[C.stone]) }; }
function profile_(r) {
  return { code: String(r[C.code]), nick: plain_(r[C.nick]), bal: num_(r[C.bal]), earned: num_(r[C.earned]),
    streak: num_(r[C.streak]), admin: r[C.admin] === '是', qa: list_(r[C.qaDone]),
    av: plain_(r[C.av]), fid: String(r[C.fid] || ''), bag: bag_(r), dia: num_(r[C.dia]),
    tres: num_(r[C.tres]), tdia: num_(r[C.tdia]), today: counts_(r[C.gToday]), gLast: num_(r[C.gLast]),
    trades: num_(r[C.trades]), tradeMax: TRADE_MAX, unread: num_(r[C.unread]), friends: list_(r[C.friends]).length,
    veg: isleOf_(r).veg, score: isleScore_(isleOf_(r)) };
}
function pub_(r) { return { nick: plain_(r[C.nick]), av: plain_(r[C.av]), fid: String(r[C.fid] || '') }; }
function resetDay_(r) {
  var t = day_();
  if (Number(r[C.day]) !== t) {
    r[C.day] = t; r[C.onl] = 0; r[C.rd] = 0; r[C.qa] = 0;
    r[C.gToday] = ''; r[C.trades] = 0; r[C.gifts] = ''; r[C.msgN] = 0; r[C.noteN] = 0;
  }
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fmt_(d) { return d ? Utilities.formatDate(new Date(d), TZ, 'yyyy/M/d HH:mm') : ''; }

/* ---------- 主程式 ---------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var q = {};
  try { q = JSON.parse(p.q || '{}'); } catch (err) { return out_({ ok: false, err: 'bad' }); }
  if (!q.a && p.a) q = p;
  return out_(handle_(q));
}
function doPost(e) {
  var q = {};
  try { q = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out_({ ok: false, err: 'bad' }); }
  return out_(handle_(q));
}

function handle_(q) {
  var a = String(q.a || '');
  if (a === 'top') return top_(q);
  if (a === 'visitors') return { ok: true, v: visitors_(String(q.isle || '')) };
  if (a === 'msgs') return msgs_(q);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = players_();
    var rows = rows_(sh);

    if (a === 'reg') {
      var nick = cleanNick_(q.nick);
      if (nick.length < 2) return { ok: false, err: 'short' };
      if (RESERVED.test(nick)) return { ok: false, err: 'reserved' };
      if (nickTaken_(rows, nick, -1)) return { ok: false, err: 'taken' };
      var row = newRow_(newCode_(rows), nick, false, Math.min(CAP.qa, num_(q.init)), newFid_(rows));
      sh.appendRow(row);
      return { ok: true, p: profile_(row) };
    }
    if (a === 'isles' && !q.code) return { ok: true, isles: islesPub_(isles_(), null) };

    var i = find_(rows, q.code);
    if (i < 0) return { ok: false, err: 'nocode' };
    var r = rows[i];
    if (!r[C.fid]) r[C.fid] = newFid_(rows);
    resetDay_(r);
    var me = profile_(r);
    var res = { ok: true, add: 0 };
    var touched = {}; // 一起被改到的其他玩家（加好友、送禮、悄悄話）

    if (a === 'login' || a === 'me') {
      // 只回傳資料
    } else if (a === 'daily') {
      var t = day_();
      if (Number(r[C.last]) !== t) {
        r[C.streak] = Number(r[C.last]) === day_(-1) ? num_(r[C.streak]) + 1 : 1;
        r[C.last] = t;
        res.add = Math.min(DAILY + (r[C.streak] - 1), DAILY_MAX);
      }
    } else if (a === 'earn') {
      var k = String(q.k || '');
      var col = KIND_COL[k];
      if (col == null) return { ok: false, err: 'bad' };
      if (k === 'qa') {
        // 每座問答島每個帳號只能拿一次（不論用哪台裝置）
        var key = String(q.key || '').replace(/[^0-9a-z_-]/gi, '').slice(0, 12);
        var doneList = list_(r[C.qaDone]);
        if (!key || doneList.indexOf(key) >= 0) return { ok: true, add: 0, p: me };
        doneList.push(key);
        r[C.qaDone] = doneList.join(',');
      }
      if (num_(r[col]) < CAP[k]) { r[col] = num_(r[col]) + 1; res.add = 1; }
    } else if (a === 'dl') {
      var note = '';
      if (me.admin) note = '管理員免扣';
      else if (me.bal < 1) return { ok: false, err: 'nocoin', p: me };
      else r[C.bal] = me.bal - 1;
      r[C.dls] = num_(r[C.dls]) + 1;
      var item = text_(q.title, 60) + '／' + text_(q.file, 60);
      r[C.recent] = [item].concat(String(r[C.recent] || '').split('\n').filter(String)).slice(0, 10).join('\n');
      sheet_('下載紀錄', D_HEAD).appendRow([new Date(), r[C.nick], r[C.code], text_(q.title, 100), SITE + text_(q.page, 80),
        text_(q.file, 100), num_(r[C.bal]), note]);
    } else if (a === 'visit') {
      var isle = text_(q.isle, 40), vs = sheet_('造訪紀錄', V_HEAD), t2 = day_(), dup = false;
      var vn = vs.getLastRow() - 1;
      if (vn > 0) {
        var recent = vs.getRange(Math.max(2, vn - 498), 3, Math.min(vn, 500), 4).getValues();
        for (var x = recent.length - 1; x >= 0; x--) {
          if (Number(recent[x][3]) !== t2) break;
          if (String(recent[x][0]) === me.code && String(recent[x][1]) === isle) { dup = true; break; }
        }
      }
      if (!dup) vs.appendRow([new Date(), r[C.nick], me.code, isle, text_(q.name, 30), t2, me.admin ? '是' : '']);
      res.v = visitors_(isle);
    } else if (a === 'nick') {
      var nn = cleanNick_(q.nick);
      if (nn.length < 2) return { ok: false, err: 'short' };
      if (nickKey_(nn) !== nickKey_(r[C.nick])) {
        if (RESERVED.test(nn) && !me.admin) return { ok: false, err: 'reserved' };
        if (nickTaken_(rows, nn, i)) return { ok: false, err: 'taken' };
        r[C.nick] = text_(nn, 12);
      }
    } else if (a === 'avatar') {
      if (AVATARS.indexOf(String(q.av)) < 0) return { ok: false, err: 'bad' };
      r[C.av] = String(q.av);

    /* ----- 物資島 ----- */
    } else if (a === 'isles') {
      res.isles = islesPub_(isles_(), r);
    } else if (a === 'gather') {
      var rk = String(q.isle || '');
      if (!RES[rk]) return { ok: false, err: 'bad' };
      var now = Date.now(), wait = num_(r[C.gLast]) + GATHER_GAP - now;
      if (wait > 0) return { ok: false, err: 'cool', wait: Math.ceil(wait / 1000), p: me };
      var tc = counts_(r[C.gToday]);
      if ((tc[rk] || 0) >= GATHER_MAX) return { ok: false, err: 'tired', p: me };
      var st = isles_(), isl = st.map[rk], left = isl.total - isl.taken;
      if (left <= 0) return { ok: false, err: 'empty', p: me, isles: islesPub_(st, r) };
      var got = Math.min(left, 1 + Math.floor(Math.random() * 3)), from = isl.taken;
      isl.taken += got;
      var dia = 0;
      isl.dias.forEach(function (pos) { if (pos > from && pos <= isl.taken) dia++; });
      if (dia) isl.found += dia;
      st.sh.getRange(isl.row, 5).setValue(isl.taken);
      if (dia) st.sh.getRange(isl.row, 7).setValue(isl.found);
      tc[rk] = (tc[rk] || 0) + 1;
      r[C.gToday] = countsStr_(tc);
      r[C.gLast] = now;
      r[RES[rk].col] = num_(r[RES[rk].col]) + got;
      r[C.tres] = num_(r[C.tres]) + got;
      if (dia) { r[C.dia] = num_(r[C.dia]) + dia; r[C.tdia] = num_(r[C.tdia]) + dia; }
      res.got = { k: rk, n: got, dia: dia };
      res.isles = islesPub_(st, r);
    } else if (a === 'trade') {
      var tk = String(q.k || '');
      if (num_(r[C.trades]) >= TRADE_MAX) return { ok: false, err: 'trademax', p: me };
      if (tk === 'dia') {
        if (num_(r[C.dia]) < 1) return { ok: false, err: 'few', p: me };
        r[C.dia] = num_(r[C.dia]) - 1; res.add = DIA_RATE;
      } else if (tk === 'pumpkin') {
        var tis = isleOf_(r);
        if (tis.veg.pumpkin < PUMPKIN_RATE) return { ok: false, err: 'few', p: me };
        tis.veg.pumpkin -= PUMPKIN_RATE; r[C.isle] = JSON.stringify(tis); res.add = 1;
      } else if (RES[tk]) {
        if (num_(r[RES[tk].col]) < TRADE_RATE) return { ok: false, err: 'few', p: me };
        r[RES[tk].col] = num_(r[RES[tk].col]) - TRADE_RATE; res.add = 1;
      } else return { ok: false, err: 'bad' };
      r[C.trades] = num_(r[C.trades]) + 1;

    /* ----- 我的小島 ----- */
    } else if (a === 'island') {
      if (q.fid && String(q.fid).toUpperCase() !== String(r[C.fid])) {
        var jv = findFid_(rows, q.fid);
        if (jv < 0) return { ok: false, err: 'nofid', p: me };
        if (list_(r[C.friends]).indexOf(String(rows[jv][C.fid])) < 0) return { ok: false, err: 'notfriend', p: me };
        res.island = islePub_(rows[jv], false, isleOf_(r));
      } else res.island = islePub_(r, true);
    } else if (a === 'build' || a === 'plant' || a === 'harvest' || a === 'adopt' || a === 'feed' || a === 'pat') {
      var out = isleAct_(a, q, r, me);
      if (out.err) return { ok: false, err: out.err, p: me };
      if (out.add) res.add = out.add;
      if (out.gift) res.gift = out.gift;
      if (out.got) res.got = out.got;
      if (out.log) sheet_('小島紀錄', L_HEAD).appendRow([new Date(), r[C.nick], r[C.code], out.log[0], out.log[1]]);
      res.island = islePub_(r, true);
    } else if (a === 'water') {
      var jw = findFid_(rows, q.fid);
      if (jw < 0 || jw === i) return { ok: false, err: 'bad', p: me };
      if (list_(r[C.friends]).indexOf(String(rows[jw][C.fid])) < 0) return { ok: false, err: 'notfriend', p: me };
      var mi = isleOf_(r), fi = isleOf_(rows[jw]), today = day_();
      if (mi.wd.d !== today) mi.wd = { d: today, f: [] };
      if (mi.wd.f.indexOf(String(rows[jw][C.fid])) >= 0) return { ok: false, err: 'watered', p: me };
      var nowW = Date.now(), target = -1;
      fi.f.forEach(function (c, k) { if (target < 0 && c && cropLeft_(c, nowW) > 0) target = k; });
      if (target < 0) return { ok: false, err: 'nocrop', p: me };
      fi.f[target].b = num_(fi.f[target].b) + WATER_BONUS;
      mi.wd.f.push(String(rows[jw][C.fid]));
      var wk = RES_KEYS[Math.floor(Math.random() * RES_KEYS.length)];
      r[RES[wk].col] = num_(r[RES[wk].col]) + 1;
      r[C.isle] = JSON.stringify(mi);
      rows[jw][C.isle] = JSON.stringify(fi); touched[jw] = 1;
      res.got = { k: wk, n: 1 };
      res.island = islePub_(rows[jw], false, mi);

    /* ----- 好友 ----- */
    } else if (a === 'friends') {
      res.friends = friendsOf_(rows, r);
    } else if (a === 'fadd') {
      var j = findFid_(rows, q.fid);
      if (j < 0) return { ok: false, err: 'nofid', p: me };
      if (j === i) return { ok: false, err: 'self', p: me };
      var mine = list_(r[C.friends]), theirs = list_(rows[j][C.friends]), ofid = String(rows[j][C.fid]);
      if (mine.indexOf(ofid) < 0) {
        if (mine.length >= FRIEND_MAX) return { ok: false, err: 'fmax', p: me };
        mine.push(ofid); r[C.friends] = mine.join(',');
      }
      if (theirs.indexOf(String(r[C.fid])) < 0 && theirs.length < FRIEND_MAX) {
        theirs.push(String(r[C.fid])); rows[j][C.friends] = theirs.join(','); touched[j] = 1;
      }
      res.added = pub_(rows[j]);
      res.friends = friendsOf_(rows, r);
    } else if (a === 'fdel') {
      var fid = String(q.fid || '').toUpperCase();
      r[C.friends] = list_(r[C.friends]).filter(function (f) { return f !== fid; }).join(',');
      var jd = findFid_(rows, fid);
      if (jd >= 0) {
        rows[jd][C.friends] = list_(rows[jd][C.friends]).filter(function (f) { return f !== String(r[C.fid]); }).join(',');
        touched[jd] = 1;
      }
      res.friends = friendsOf_(rows, r);
    } else if (a === 'gift') {
      var gk = String(q.k || ''), jg = findFid_(rows, q.fid);
      if (!RES[gk] || jg < 0) return { ok: false, err: 'bad', p: me };
      var gfid = String(rows[jg][C.fid]);
      if (list_(r[C.friends]).indexOf(gfid) < 0) return { ok: false, err: 'notfriend', p: me };
      var gl = list_(r[C.gifts]);
      if (gl.indexOf(gfid) >= 0) return { ok: false, err: 'gifted', p: me };
      if (num_(r[RES[gk].col]) < 1) return { ok: false, err: 'few', p: me };
      r[RES[gk].col] = num_(r[RES[gk].col]) - 1;
      rows[jg][RES[gk].col] = num_(rows[jg][RES[gk].col]) + 1;
      rows[jg][C.unread] = num_(rows[jg][C.unread]) + 1;
      touched[jg] = 1;
      gl.push(gfid); r[C.gifts] = gl.join(',');
      sheet_('悄悄話', N_HEAD).appendRow([new Date(), r[C.fid], r[C.nick], gfid, rows[jg][C.nick], '🎁 送你 1 個' + RES[gk].item]);
      res.friends = friendsOf_(rows, r);
    } else if (a === 'note') {
      var jn = findFid_(rows, q.fid), txt = body_(q.text, NOTE_LEN);
      if (jn < 0 || !txt) return { ok: false, err: 'bad', p: me };
      if (list_(r[C.friends]).indexOf(String(rows[jn][C.fid])) < 0) return { ok: false, err: 'notfriend', p: me };
      if (num_(r[C.noteN]) >= NOTE_DAY) return { ok: false, err: 'notemax', p: me };
      r[C.noteN] = num_(r[C.noteN]) + 1;
      rows[jn][C.unread] = num_(rows[jn][C.unread]) + 1;
      touched[jn] = 1;
      sheet_('悄悄話', N_HEAD).appendRow([new Date(), r[C.fid], r[C.nick], rows[jn][C.fid], rows[jn][C.nick], txt]);
    } else if (a === 'inbox') {
      res.inbox = inbox_(rows, String(r[C.fid]));
      r[C.unread] = 0;

    /* ----- 留言碼頭 ----- */
    } else if (a === 'msg') {
      var body = body_(q.text, MSG_LEN);
      if (plain_(body).length < 2) return { ok: false, err: 'msgshort', p: me };
      var mw = num_(r[C.msgLast]) + MSG_GAP - Date.now();
      if (mw > 0 && !me.admin) return { ok: false, err: 'msgcool', wait: Math.ceil(mw / 1000), p: me };
      if (num_(r[C.msgN]) >= MSG_DAY && !me.admin) return { ok: false, err: 'msgmax', p: me };
      r[C.msgN] = num_(r[C.msgN]) + 1;
      r[C.msgLast] = Date.now();
      sheet_('留言板', M_HEAD).appendRow(['M' + Date.now().toString(36).toUpperCase(), new Date(), r[C.nick], r[C.code], r[C.av], body, '', '', '', '']);
    } else if (a === 'reply' || a === 'hide' || a === 'mdel') {
      var ms = sheet_('留言板', M_HEAD), mrow = msgRow_(ms, q.id);
      if (!mrow) return { ok: false, err: 'bad', p: me };
      var mv = ms.getRange(mrow, 1, 1, M_HEAD.length).getValues()[0];
      if (a === 'reply') {
        if (!me.admin) return { ok: false, err: 'admin', p: me };
        var rep = body_(q.text, MSG_LEN);
        if (!plain_(rep)) { mv[6] = ''; mv[7] = ''; mv[8] = ''; }
        else { if (mv[6] && mv[7]) mv[8] = new Date(); else mv[7] = new Date(); mv[6] = rep; }
      } else if (a === 'hide') {
        if (!me.admin) return { ok: false, err: 'admin', p: me };
        mv[9] = q.h ? '隱藏' : '';
      } else {
        if (String(mv[3]).toUpperCase() !== me.code.toUpperCase() && !me.admin) return { ok: false, err: 'admin', p: me };
        mv[9] = '刪除';
      }
      ms.getRange(mrow, 1, 1, M_HEAD.length).setValues([mv]);
    } else {
      return { ok: false, err: 'bad' };
    }

    if (res.add) { r[C.bal] = num_(r[C.bal]) + res.add; r[C.earned] = num_(r[C.earned]) + res.add; }
    r[C.seen] = new Date();
    sh.getRange(i + 2, 1, 1, P_HEAD.length).setValues([r]);
    Object.keys(touched).forEach(function (jx) { jx = Number(jx); sh.getRange(jx + 2, 1, 1, P_HEAD.length).setValues([rows[jx]]); });
    res.p = profile_(r);
    return res;
  } finally {
    lock.releaseLock();
  }
}

function visitors_(isle) {
  var vs = sheet_('造訪紀錄', V_HEAD);
  var n = vs.getLastRow() - 1;
  if (n < 1 || !isle) return { list: [], total: 0 };
  var rows = vs.getRange(2, 1, n, V_HEAD.length).getValues();
  var seen = {}, list = [], total = 0;
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (String(r[3]) !== isle || r[6] === '是' || seen[r[2]]) continue;
    seen[r[2]] = 1; total++;
    if (list.length < 12) list.push({ nick: plain_(r[1]), d: Utilities.formatDate(new Date(r[0]), TZ, 'M/d') });
  }
  return { list: list, total: total };
}

/* 排行榜：coin（目前金幣）、res（累計採集的物資）、dia（累計撿到的鑽石）。
   三份名單一起算好，在 Google 快取放 60 秒，期間不用重讀整張玩家表。 */
var TOP_TTL = 60;
function topLists_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('top4');
  if (hit) return JSON.parse(hit);
  var rows = rows_(players_()), out = {};
  var scoreOf = {};
  rows.forEach(function (r, x) { scoreOf[x] = isleScore_(isleOf_(r)); });
  [['coin', C.bal], ['res', C.tres], ['dia', C.tdia], ['isle', -1]].forEach(function (kc) {
    var k = kc[0], col = kc[1];
    var val = function (r) { return col < 0 ? scoreOf[rows.indexOf(r)] : num_(r[col]); };
    out[k] = rows
      .filter(function (r) { return r[C.nick] && r[C.admin] !== '是' && (k === 'coin' || val(r) > 0); })
      .sort(function (x, y) { return val(y) - val(x); })
      .slice(0, 20)
      .map(function (r) {
        var o = { c: String(r[C.code]).toUpperCase(), nick: plain_(r[C.nick]), av: plain_(r[C.av]), v: val(r), bal: num_(r[C.bal]) };
        if (k === 'res') o.bag = bag_(r);
        return o;
      });
  });
  try { cache.put('top4', JSON.stringify(out), TOP_TTL); } catch (e) {}
  return out;
}
function top_(q) {
  var lists = topLists_(), code = String(q.code || '').toUpperCase();
  function pub(list) { return list.map(function (o) { var x = {}; for (var k in o) if (k !== 'c') x[k] = o[k]; x.me = !!code && o.c === code; return x; }); }
  if (q.k === 'all') return { ok: true, all: { coin: pub(lists.coin), res: pub(lists.res), dia: pub(lists.dia), isle: pub(lists.isle || []) } };
  var k = q.k === 'res' || q.k === 'dia' ? q.k : 'coin';
  return { ok: true, k: k, top: pub(lists[k]) };
}

/* ---------- 物資島：每天第一次有人來時重抽總量與鑽石位置 ---------- */
function isles_() {
  var sh = sheet_('物資島', R_HEAD), t = day_(), n = sh.getLastRow() - 1;
  var vals = n > 0 ? sh.getRange(2, 1, n, R_HEAD.length).getValues() : [];
  var map = {};
  RES_KEYS.forEach(function (k) {
    var idx = -1;
    for (var x = 0; x < vals.length; x++) if (String(vals[x][0]) === k) idx = x;
    var v = idx >= 0 ? vals[idx] : null;
    if (!v || Number(v[2]) !== t) {
      var total = STOCK_MIN + Math.floor(Math.random() * (STOCK_MAX - STOCK_MIN + 1));
      var nd = Math.floor(Math.random() * (DIA_MAX + 1)), pos = [];
      while (pos.length < nd) { var p = 1 + Math.floor(Math.random() * total); if (pos.indexOf(p) < 0) pos.push(p); }
      v = [k, RES[k].name, t, total, 0, "'" + pos.sort(function (a, b) { return a - b; }).join(','), 0];
      if (idx < 0) { sh.appendRow(v); idx = sh.getLastRow() - 2; vals.push(v); }
      else sh.getRange(idx + 2, 1, 1, R_HEAD.length).setValues([v]);
    }
    map[k] = { row: idx + 2, total: num_(v[3]), taken: num_(v[4]),
      dias: plain_(v[5]).split(',').filter(String).map(Number), found: num_(v[6]) };
  });
  return { sh: sh, map: map };
}
function islesPub_(st, r) {
  var o = {}, tc = r ? counts_(r[C.gToday]) : {};
  RES_KEYS.forEach(function (k) {
    var m = st.map[k];
    o[k] = { total: m.total, left: Math.max(0, m.total - m.taken), found: m.found, mine: tc[k] || 0, max: GATHER_MAX };
  });
  return o;
}

/* ---------- 我的小島 ---------- */
function isleOf_(r) {
  var o = {};
  try { o = JSON.parse(plain_(r[C.isle]) || '{}') || {}; } catch (e) { o = {}; }
  o.h = num_(o.h); o.fields = num_(o.fields);
  o.f = Array.isArray(o.f) ? o.f : [];
  while (o.f.length < o.fields) o.f.push(null);
  o.deco = Array.isArray(o.deco) ? o.deco.filter(function (d) { return DECO[d]; }) : [];
  o.pets = Array.isArray(o.pets) ? o.pets : [];
  o.veg = o.veg || {};
  Object.keys(VEG).forEach(function (k) { o.veg[k] = num_(o.veg[k]); });
  o.wd = o.wd && o.wd.f ? o.wd : { d: 0, f: [] };
  return o;
}
function isleScore_(o) {
  var s = o.h * 10;
  o.deco.forEach(function (d) { s += DECO[d].pts; });
  o.pets.forEach(function (p) { s += num_(p.aff); });
  return s;
}
function cropLeft_(c, now) { return Math.max(0, num_(c.t) + VEG[c.v].hours * HOUR - num_(c.b) - now); }
function fullNow_(p, now) { return Math.max(0, Math.min(100, Number(p.full) - HUNGER_PER_DAY * (now - num_(p.ft)) / DAY_MS)); }
function petLv_(p) { return 1 + Math.floor(num_(p.aff) / 10); }
function hasCost_(r, cost) { for (var k in cost) if (num_(r[BAG_COL[k]]) < cost[k]) return false; return true; }
function payCost_(r, cost) { for (var k in cost) r[BAG_COL[k]] = num_(r[BAG_COL[k]]) - cost[k]; }
var COST_NAME = { fruit: '水果', iron: '鐵礦', wood: '木材', stone: '石頭', dia: '鑽石' };
function costText_(cost) { return Object.keys(cost).map(function (k) { return COST_NAME[k] + '×' + cost[k]; }).join(' '); }
function islePub_(r, mine, viewer) {
  var o = isleOf_(r), now = Date.now(), wd = viewer && viewer.wd && viewer.wd.d === day_() ? viewer.wd.f : [];
  var out = {
    nick: plain_(r[C.nick]), av: plain_(r[C.av]), fid: String(r[C.fid] || ''), mine: !!mine,
    h: o.h, fields: o.fields, deco: o.deco, score: isleScore_(o),
    f: o.f.map(function (c) { return c && VEG[c.v] ? { v: c.v, left: cropLeft_(c, now), total: VEG[c.v].hours * HOUR } : null; }),
    pets: o.pets.map(function (p) {
      return { id: p.id, k: p.k, n: p.n, full: Math.round(fullNow_(p, now)), aff: num_(p.aff), lv: petLv_(p), patted: num_(p.pd) === day_() };
    })
  };
  if (mine) { out.veg = o.veg; out.rules = { house: HOUSE, field: FIELD, deco: DECO, veg: VEG, animals: ANIMALS, fruitFood: FRUIT_FOOD }; }
  else out.watered = wd.indexOf(out.fid) >= 0;
  return out;
}
/* 小島上的動作：回傳 { err } 或 { add, gift, got, log } */
function isleAct_(a, q, r, me) {
  var o = isleOf_(r), now = Date.now(), out = {};
  if (a === 'build') {
    var kind = String(q.k || ''), cost, label;
    if (kind === 'house') {
      if (o.h >= 3) return { err: 'maxed' };
      cost = HOUSE[o.h + 1]; label = '小屋 Lv' + (o.h + 1);
    } else if (kind === 'field') {
      if (o.fields >= FIELD.length) return { err: 'maxed' };
      cost = FIELD[o.fields]; label = '菜田 第 ' + (o.fields + 1) + ' 塊';
    } else if (DECO[kind]) {
      if (o.deco.indexOf(kind) >= 0) return { err: 'maxed' };
      cost = DECO[kind].cost; label = DECO[kind].name;
    } else return { err: 'bad' };
    if (!hasCost_(r, cost)) return { err: 'few' };
    payCost_(r, cost);
    if (kind === 'house') o.h++;
    else if (kind === 'field') { o.fields++; o.f.push(null); }
    else o.deco.push(kind);
    out.log = ['蓋', label + '（' + costText_(cost) + '）'];
  } else if (a === 'plant') {
    var fi = num_(q.i), v = String(q.v || '');
    if (!VEG[v] || fi >= o.fields) return { err: 'bad' };
    if (o.f[fi]) return { err: 'busy' };
    if (num_(r[C.fruit]) < VEG[v].seed) return { err: 'few' };
    r[C.fruit] = num_(r[C.fruit]) - VEG[v].seed;
    o.f[fi] = { v: v, t: now, b: 0 };
  } else if (a === 'harvest') {
    var hi = num_(q.i), c = o.f[hi];
    if (!c || !VEG[c.v]) return { err: 'bad' };
    if (cropLeft_(c, now) > 0) return { err: 'notyet' };
    o.veg[c.v] += VEG[c.v].n; out.got = { k: c.v, n: VEG[c.v].n };
    o.f[hi] = null;
    out.log = ['收成', VEG[c.v].name + '×' + VEG[c.v].n];
  } else if (a === 'adopt') {
    var an = ANIMALS[String(q.k || '')], name = cleanNick_(q.name).slice(0, 8);
    if (!an) return { err: 'bad' };
    if (o.h < 1) return { err: 'nohouse' };
    if (o.pets.length >= o.h) return { err: 'petmax' };
    if (name.length < 1) name = an.name;
    if (!me.admin) {
      if (num_(r[C.bal]) < an.cost) return { err: 'nocoin' };
      r[C.bal] = num_(r[C.bal]) - an.cost;
    }
    o.pets.push({ id: 'P' + now.toString(36).toUpperCase(), k: String(q.k), n: text_(name, 8), full: 80, ft: now, aff: 0, pd: 0 });
    out.log = ['領養', an.name + '「' + name + '」' + (me.admin ? '（管理員免費）' : '（' + an.cost + ' 金幣）')];
  } else if (a === 'feed' || a === 'pat') {
    var pet = null;
    o.pets.forEach(function (p) { if (p.id === String(q.id || '')) pet = p; });
    if (!pet) return { err: 'bad' };
    var full = fullNow_(pet, now);
    if (a === 'feed') {
      var food = String(q.food || ''), plus;
      if (full >= 100) return { err: 'petfull' };
      if (food === 'fruit') { if (num_(r[C.fruit]) < 1) return { err: 'few' }; r[C.fruit] = num_(r[C.fruit]) - 1; plus = FRUIT_FOOD; }
      else if (VEG[food]) { if (o.veg[food] < 1) return { err: 'few' }; o.veg[food]--; plus = VEG[food].food; }
      else return { err: 'bad' };
      pet.full = Math.min(100, full + plus); pet.ft = now;
    } else {
      if (num_(pet.pd) === day_()) return { err: 'patted' };
      pet.pd = day_(); pet.aff = num_(pet.aff) + 1;
      if (full >= 50) {
        if (Math.random() < 0.1) { out.add = 1; out.gift = { k: 'coin', n: 1 }; }
        else { var gk = RES_KEYS[Math.floor(Math.random() * RES_KEYS.length)]; r[RES[gk].col] = num_(r[RES[gk].col]) + 1; out.gift = { k: gk, n: 1 }; }
      }
    }
  }
  r[C.isle] = JSON.stringify(o);
  return out;
}

/* ---------- 好友 ---------- */
function friendsOf_(rows, r) {
  var gifted = list_(r[C.gifts]);
  return list_(r[C.friends]).map(function (f) {
    var j = findFid_(rows, f);
    if (j < 0) return null;
    var x = rows[j];
    return { fid: f, nick: plain_(x[C.nick]), av: plain_(x[C.av]), bal: num_(x[C.bal]), bag: bag_(x), dia: num_(x[C.dia]),
      tres: num_(x[C.tres]), seen: x[C.seen] ? Utilities.formatDate(new Date(x[C.seen]), TZ, 'M/d') : '',
      gifted: gifted.indexOf(f) >= 0 };
  }).filter(Boolean);
}
function inbox_(rows, fid) {
  var sh = sheet_('悄悄話', N_HEAD), n = sh.getLastRow() - 1, out = [];
  if (n < 1) return out;
  var from = Math.max(0, n - 1500), vals = sh.getRange(2 + from, 1, n - from, N_HEAD.length).getValues();
  for (var x = vals.length - 1; x >= 0 && out.length < 30; x--) {
    var v = vals[x];
    if (String(v[3]) !== fid) continue;
    var j = findFid_(rows, v[1]);
    out.push({ t: fmt_(v[0]), fid: String(v[1]), nick: j >= 0 ? plain_(rows[j][C.nick]) : plain_(v[2]), av: j >= 0 ? plain_(rows[j][C.av]) : '', text: plain_(v[5]) });
  }
  return out;
}

/* ---------- 留言碼頭 ---------- */
function msgRow_(sh, id) {
  id = String(id || '');
  var n = sh.getLastRow() - 1;
  if (n < 1 || !id) return 0;
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var x = ids.length - 1; x >= 0; x--) if (String(ids[x][0]) === id) return x + 2;
  return 0;
}
function msgs_(q) {
  var rows = rows_(players_()), i = find_(rows, q.code), admin = i >= 0 && rows[i][C.admin] === '是';
  var code = i >= 0 ? String(rows[i][C.code]).toUpperCase() : '';
  var sh = sheet_('留言板', M_HEAD), n = sh.getLastRow() - 1, list = [], pending = 0;
  var avOf = {};
  rows.forEach(function (r) { avOf[String(r[C.code]).toUpperCase()] = plain_(r[C.av]); });
  if (n > 0) {
    var vals = sh.getRange(2, 1, n, M_HEAD.length).getValues();
    for (var x = vals.length - 1; x >= 0; x--) {
      var v = vals[x], st = String(v[9]);
      if (!v[0] || st === '刪除' || (st === '隱藏' && !admin)) continue;
      if (!v[6] && st !== '隱藏') pending++;
      var who = String(v[3]).toUpperCase();
      list.push({ id: String(v[0]), t: fmt_(v[1]), nick: plain_(v[2]), av: avOf[who] || plain_(v[4]), text: plain_(v[5]),
        reply: plain_(v[6]), rt: fmt_(v[7]), re: fmt_(v[8]), hidden: st === '隱藏', mine: !!code && who === code });
    }
  }
  var page = Math.max(1, num_(q.page) || 1), total = list.length;
  return { ok: true, total: total, pending: admin ? pending : 0, admin: admin, page: page,
    pages: Math.max(1, Math.ceil(total / MSG_PAGE)), list: list.slice((page - 1) * MSG_PAGE, page * MSG_PAGE) };
}

/* ---------- 站長帳號：在 Apps Script 編輯器執行一次 ---------- */
function setupOwner() {
  var sh = players_();
  var rows = rows_(sh);
  OWNER.forEach(function (o) {
    var i = -1;
    for (var k = 0; k < rows.length; k++) if (nickKey_(rows[k][C.nick]) === nickKey_(o.nick)) i = k;
    if (i < 0) {
      var row = newRow_(newCode_(rows), o.nick, o.admin, 0, newFid_(rows));
      sh.appendRow(row);
      rows.push(row);
      Logger.log(o.nick + ' 的登島碼：' + row[C.code] + (o.admin ? '（管理員：不上排行榜、下載不扣金幣）' : ''));
    } else {
      Logger.log(o.nick + ' 已經存在，登島碼：' + rows[i][C.code]);
    }
  });
}
