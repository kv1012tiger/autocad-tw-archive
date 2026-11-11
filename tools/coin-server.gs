/** @OnlyCurrentDoc */
/**
 * 論壇資源島：金幣、暱稱、登島碼、下載紀錄的後台（Google 試算表 + Apps Script）。
 * 金幣以試算表為準，同一個人用登島碼在手機、電腦都能接回同一個帳號。
 *
 * 部署：試算表 → 擴充功能 → Apps Script → 貼上本檔 → 存檔
 *       → 部署 → 管理部署作業 → 編輯（鉛筆）→ 版本選「新版本」→ 部署（網址不變）
 * 第一次換上本版：在上方函式選單選 setupOwner → 執行，建立站長的兩個帳號。
 *
 * 工作表「玩家」：每位玩家一列（登島碼、暱稱、金幣、連續登島、下載次數…），就是統計表。
 * 工作表「下載紀錄」：逐筆記錄誰在什麼時間下載了哪篇文章的哪個檔案。
 * 工作表「造訪紀錄」：每位玩家每天第一次登上某座島時記一筆（誰、哪座島、什麼時間）。
 */
var SITE = 'https://kv1012tiger.github.io/autocad-tw-archive/';
var TZ = 'Asia/Taipei';
var OWNER = [{ nick: 'Tiger&蘋果爸', admin: true }, { nick: '蘋果爸', admin: false }];
var RESERVED = /蘋果爸|管理員|站長|autocad\s*顧問|admin/i;

var P_HEAD = ['登島碼', '暱稱', '目前金幣', '累計金幣', '連續登島天數', '最後登島日', '第一次登島', '最後上線',
  '下載次數', '最近下載', '管理員', '今日', '今日在線金幣', '今日爬文金幣', '今日問答金幣', '已拿金幣的問答島'];
var C = { code: 0, nick: 1, bal: 2, earned: 3, streak: 4, last: 5, first: 6, seen: 7, dls: 8, recent: 9, admin: 10,
  day: 11, onl: 12, rd: 13, qa: 14, qaDone: 15 };
var D_HEAD = ['時間', '暱稱', '登島碼', '文章', '文章網址', '檔案', '下載後剩餘金幣', '備註'];
var V_HEAD = ['時間', '暱稱', '登島碼', '小島代號', '小島', '日期', '管理員'];
var DAILY = 3;      // 第 1 天 3 枚、第 2 天 4 枚
var DAILY_MAX = 5;  // 第 3 天起每天固定 5 枚
var CAP = { online: 3, read: 3, qa: 9 };
var KIND_COL = { online: C.onl, read: C.rd, qa: C.qa };
var ALPHA = '23456789ABCDFGHJKMNPQRSTUVWXYZ';

/* ---------- 工作表 ---------- */
function sheet_(name, head) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
  if (cur.join('|') !== head.join('|')) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#ffe8a3');
    sh.setFrozenRows(1);
  }
  return sh;
}
function players_() {
  var sh = sheet_('玩家', P_HEAD);
  sh.getRange('A:A').setNumberFormat('@');
  return sh;
}
function rows_(sh) {
  var n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, P_HEAD.length).getValues() : [];
}
function find_(rows, code) {
  code = String(code || '').toUpperCase();
  for (var i = 0; i < rows.length; i++) if (String(rows[i][C.code]).toUpperCase() === code) return i;
  return -1;
}

/* ---------- 工具 ---------- */
function day_(offset) {
  return Number(Utilities.formatDate(new Date(Date.now() + (offset || 0) * 86400000), TZ, 'yyyyMMdd'));
}
function num_(v) { v = Math.floor(Number(v)); return isFinite(v) && v >= 0 && v < 1000000 ? v : 0; }
function text_(s, n) {
  s = String(s == null ? '' : s).replace(/[<>\r\n\t]/g, ' ').trim().slice(0, n || 80);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function cleanNick_(s) { return String(s || '').replace(/[<>\r\n\t=+@]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12); }
function nickKey_(s) { return String(s).replace(/^'/, '').replace(/\s+/g, '').toLowerCase(); }
function nickTaken_(rows, nick, exceptIdx) {
  var k = nickKey_(nick);
  for (var i = 0; i < rows.length; i++) if (i !== exceptIdx && nickKey_(rows[i][C.nick]) === k) return true;
  return false;
}
function newCode_(rows) {
  for (;;) {
    var c = '';
    for (var i = 0; i < 6; i++) c += ALPHA.charAt(Math.floor(Math.random() * ALPHA.length));
    if (find_(rows, c) < 0) return c;
  }
}
function newRow_(code, nick, admin, init) {
  var now = new Date();
  return [code, text_(nick, 12), init, init, 0, 0, now, now, 0, '', admin ? '是' : '', day_(), 0, 0, 0, ''];
}
function profile_(r) {
  return { code: String(r[C.code]), nick: String(r[C.nick]).replace(/^'/, ''), bal: num_(r[C.bal]), earned: num_(r[C.earned]),
    streak: num_(r[C.streak]), admin: r[C.admin] === '是',
    qa: String(r[C.qaDone] || '').replace(/^'/, '').split(',').filter(String) };
}
function resetDay_(r) {
  var t = day_();
  if (Number(r[C.day]) !== t) { r[C.day] = t; r[C.onl] = 0; r[C.rd] = 0; r[C.qa] = 0; }
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

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
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = players_();
    var rows = rows_(sh);

    if (a === 'reg') {
      var nick = cleanNick_(q.nick);
      if (nick.length < 2) return { ok: false, err: 'short' };
      if (RESERVED.test(nick)) return { ok: false, err: 'reserved' };
      if (nickTaken_(rows, nick, -1)) return { ok: false, err: 'taken' };
      var row = newRow_(newCode_(rows), nick, false, Math.min(CAP.qa, num_(q.init)));
      sh.appendRow(row);
      return { ok: true, p: profile_(row) };
    }

    var i = find_(rows, q.code);
    if (i < 0) return { ok: false, err: 'nocode' };
    var r = rows[i];
    var me = profile_(r);
    var res = { ok: true, add: 0 };
    resetDay_(r);

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
        var doneList = String(r[C.qaDone] || '').replace(/^'/, '').split(',').filter(String);
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
    } else {
      return { ok: false, err: 'bad' };
    }

    if (res.add) { r[C.bal] = num_(r[C.bal]) + res.add; r[C.earned] = num_(r[C.earned]) + res.add; }
    r[C.seen] = new Date();
    sh.getRange(i + 2, 1, 1, P_HEAD.length).setValues([r]);
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
    if (list.length < 12) list.push({ nick: String(r[1]).replace(/^'/, ''), d: Utilities.formatDate(new Date(r[0]), TZ, 'M/d') });
  }
  return { list: list, total: total };
}

function top_(q) {
  var rows = rows_(players_());
  var code = String(q.code || '').toUpperCase();
  var top = rows
    .filter(function (r) { return r[C.nick] && r[C.admin] !== '是'; })
    .sort(function (x, y) { return num_(y[C.bal]) - num_(x[C.bal]); })
    .slice(0, 20)
    .map(function (r) { return { nick: String(r[C.nick]).replace(/^'/, ''), bal: num_(r[C.bal]), me: String(r[C.code]).toUpperCase() === code }; });
  return { ok: true, top: top };
}

/* ---------- 站長帳號：在 Apps Script 編輯器執行一次 ---------- */
function setupOwner() {
  var sh = players_();
  var rows = rows_(sh);
  OWNER.forEach(function (o) {
    var i = -1;
    for (var k = 0; k < rows.length; k++) if (nickKey_(rows[k][C.nick]) === nickKey_(o.nick)) i = k;
    if (i < 0) {
      var row = newRow_(newCode_(rows), o.nick, o.admin, 0);
      sh.appendRow(row);
      rows.push(row);
      Logger.log(o.nick + ' 的登島碼：' + row[C.code] + (o.admin ? '（管理員：不上排行榜、下載不扣金幣）' : ''));
    } else {
      Logger.log(o.nick + ' 已經存在，登島碼：' + rows[i][C.code]);
    }
  });
}
