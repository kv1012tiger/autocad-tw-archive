/** @OnlyCurrentDoc */
/**
 * 論壇資源島：金幣、暱稱、下載紀錄的後台（Google 試算表 + Apps Script）。
 * 部署方式：試算表 → 擴充功能 → Apps Script → 貼上本檔 → 部署為「網頁應用程式」
 * （執行身分：我；誰可以存取：所有人），把網址填進 docs/assets/js/coins.js 的 API。
 * 工作表「玩家」就是統計表：暱稱、目前金幣、連續登島、最後上線、下載次數與最近下載。
 * 工作表「下載紀錄」逐筆記錄誰在什麼時間下載了哪篇文章的哪個檔案。
 */
var SHEET_PLAYERS = '玩家';
var SHEET_DL = '下載紀錄';
var P_HEAD = ['玩家ID', '暱稱', '目前金幣', '累計金幣', '連續登島天數', '第一次登島', '最後上線', '下載次數', '最近下載'];
var D_HEAD = ['時間', '暱稱', '玩家ID', '文章', '文章網址', '檔案', '下載後剩餘金幣'];
var SITE = 'https://kv1012tiger.github.io/autocad-tw-archive/';

function sheet_(name, header) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#ffe8a3');
  }
  return sh;
}

// 文字清理：限制長度、去掉 < >，開頭是 = + - @ 時加 ' 避免被當成公式
function clean_(s, n) {
  s = String(s == null ? '' : s).replace(/[<>\r\n\t]/g, ' ').trim().slice(0, n || 80);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function num_(v) {
  v = Math.floor(Number(v));
  return isFinite(v) && v >= 0 && v < 1000000 ? v : 0;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var o;
  try { o = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out_({ ok: false }); }
  var id = String(o.id || '');
  if (!/^p[a-z0-9]{6,23}$/.test(id)) return out_({ ok: false });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet_(SHEET_PLAYERS, P_HEAD);
    var now = new Date();
    var last = sh.getLastRow();
    var ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
    var row = ids.indexOf(id);
    if (row < 0) {
      sh.appendRow([id, clean_(o.nick, 12), num_(o.bal), num_(o.earned), num_(o.streak), now, now, 0, '']);
      row = sh.getLastRow();
    } else {
      row += 2;
    }
    var range = sh.getRange(row, 1, 1, P_HEAD.length);
    var v = range.getValues()[0];
    if (o.nick) v[1] = clean_(o.nick, 12);
    v[2] = num_(o.bal);
    if (o.earned != null) v[3] = Math.max(num_(o.earned), Number(v[3]) || 0);
    if (o.streak != null) v[4] = num_(o.streak);
    v[6] = now;
    if (o.a === 'dl') {
      v[7] = (Number(v[7]) || 0) + 1;
      var item = clean_(o.title, 60) + '／' + clean_(o.file, 60);
      v[8] = [item].concat(String(v[8] || '').split('\n').filter(String)).slice(0, 10).join('\n');
      sheet_(SHEET_DL, D_HEAD).appendRow([now, v[1], id, clean_(o.title, 100), SITE + clean_(o.page, 80), clean_(o.file, 100), num_(o.bal)]);
    }
    range.setValues([v]);
    return out_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.a === 'top') {
    var sh = sheet_(SHEET_PLAYERS, P_HEAD);
    var n = sh.getLastRow() - 1;
    if (n < 1) return out_({ top: [] });
    var me = String(p.me || '');
    var top = sh.getRange(2, 1, n, 3).getValues()
      .filter(function (r) { return r[1]; })
      .sort(function (a, b) { return (Number(b[2]) || 0) - (Number(a[2]) || 0); })
      .slice(0, 20)
      .map(function (r) { return { nick: String(r[1]).replace(/^'/, ''), bal: Number(r[2]) || 0, me: r[0] === me }; });
    return out_({ top: top });
  }
  return out_({ ok: true });
}
