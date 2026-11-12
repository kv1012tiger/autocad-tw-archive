/** @OnlyCurrentDoc */
/**
 * 論壇資源島：金幣、暱稱、登島碼、下載紀錄、留言碼頭、物資島、好友的後台（Google 試算表 + Apps Script）。
 * 金幣與物資以試算表為準，同一個人用登島碼在手機、電腦都能接回同一個帳號。
 *
 * 部署：試算表 → 擴充功能 → Apps Script → 貼上本檔 → 存檔
 *       → 部署 → 管理部署作業 → 編輯（鉛筆）→ 版本選「新版本」→ 部署（網址不變）
 * 第一次換上本版：在上方函式選單選 setupOwner → 執行，建立站長的兩個帳號。
 *
 * 工作表「玩家」：每位玩家一列（登島碼、暱稱、金幣、物資、頭像、海島編號、好友…），就是統計表。
 * 工作表「下載紀錄」：逐筆記錄誰在什麼時間下載了哪篇文章的哪個檔案。
 * 工作表「造訪紀錄」：每位玩家每天第一次登上某座島時記一筆（誰、哪座島、什麼時間）。
 * 工作表「留言板」：留言碼頭的留言與站長回覆；狀態欄填「隱藏」就不會出現在網站上。
 * 工作表「物資島」：四座物資島今天的總量、已採集數量、鑽石藏在第幾份（每天第一次有人來時自動重抽）。
 * 工作表「悄悄話」：好友之間的悄悄話與送禮紀錄。
 * 工作表「公告」：站長發的公告（狀態欄填「刪除」就不會顯示）；兩個站長帳號都能在網站上發布、編輯。
 * 工作表「小島紀錄」：每位玩家在自己小島上蓋房子、種菜收成、領養寵物的紀錄。
 * 玩家表最後一欄「小島資料」是 JSON：房子等級、菜田、裝飾、寵物、蔬菜庫存（請不要手動改壞格式）。
 */
var SITE = 'https://kv1012tiger.github.io/autocad-tw-island/';
var TZ = 'Asia/Taipei';
var OWNER = [{ nick: 'Tiger&蘋果爸', admin: true }, { nick: '蘋果爸', admin: false }];
var RESERVED = /蘋果爸|管理員|站長|autocad\s*顧問|admin/i;
/* 封測：建立新帳號（登島）要有邀請碼，每組預設限 2 位。邀請碼放在「邀請碼」分頁（第 1 欄碼、第 2 欄名額、第 3 欄已用），
   可以自己在表裡新增一列：碼填英數字，名額填 2。要結束封測就把 INVITE_ON 改成 false。已經有登島碼的人不受影響。 */
var INVITE_ON = true;
var INV_HEAD = ['邀請碼', '名額', '已用', '使用者', '建立時間'];
var INV_CAP = 2;
function invKey_(v) { return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

var P_HEAD = ['登島碼', '暱稱', '目前金幣', '累計金幣', '連續登島天數', '最後登島日', '第一次登島', '最後上線',
  '下載次數', '最近下載', '管理員', '今日', '今日在線金幣', '今日爬文金幣', '今日問答金幣', '已拿金幣的問答島',
  '頭像', '海島編號', '好友', '水果', '鐵礦', '木材', '石頭', '鑽石', '累計物資', '累計鑽石',
  '今日採集', '最後採集', '今日兌換', '今日送禮', '今日留言', '最後留言', '今日悄悄話', '未讀悄悄話', '小島資料', '開放參觀', '已讀公告', '公告權限'];
var C = { code: 0, nick: 1, bal: 2, earned: 3, streak: 4, last: 5, first: 6, seen: 7, dls: 8, recent: 9, admin: 10,
  day: 11, onl: 12, rd: 13, qa: 14, qaDone: 15,
  av: 16, fid: 17, friends: 18, fruit: 19, iron: 20, wood: 21, stone: 22, dia: 23, tres: 24, tdia: 25,
  gToday: 26, gLast: 27, trades: 28, gifts: 29, msgN: 30, msgLast: 31, noteN: 32, unread: 33, isle: 34, open: 35, annSeen: 36, ann: 37 };
var D_HEAD = ['時間', '暱稱', '登島碼', '文章', '文章網址', '檔案', '下載後剩餘金幣', '備註'];
var V_HEAD = ['時間', '暱稱', '登島碼', '小島代號', '小島', '日期', '管理員'];
var M_HEAD = ['編號', '時間', '暱稱', '登島碼', '頭像', '內容', '回覆', '回覆時間', '回覆修改時間', '狀態'];
var R_HEAD = ['代號', '物資島', '日期', '今日總量', '已採集', '鑽石藏在第幾份', '已撿到鑽石'];
var N_HEAD = ['時間', '寄件海島編號', '寄件暱稱', '收件海島編號', '收件暱稱', '內容'];
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
/* 20 座物資島：[代號, 種類, 名稱, 再採間隔秒, 每次最少, 每次最多]（網頁 templates/island-home.html 有同一份，要一起改） */
var ISL = [['r0','fruit','果園島',100,3,5],['r1','iron','礦山島',90,3,6],['r2','wood','森林島',80,3,7],['r3','stone','採石島',70,2,4],['r4','fruit','蘋果灣',80,3,6],['r5','iron','鐵砧島',60,2,6],['r6','wood','松林島',30,1,3],['r7','stone','石灰岩',30,1,4],['r8','fruit','橘子島',40,1,5],['r9','iron','紅岩礦坑',70,2,4],['r10','wood','楓葉林',110,4,7],['r11','stone','花崗岩島',110,4,8],['r12','fruit','香蕉岸',120,4,6],['r13','iron','黑曜礦脈',50,2,5],['r14','wood','竹林灣',50,2,6],['r15','stone','大理石岸',100,3,5],['r16','fruit','葡萄谷',40,1,4],['r17','iron','熔爐島',120,4,8],['r18','wood','神木島',60,2,4],['r19','stone','礫石灘',90,3,6]].map(function (a) { return { id: a[0], t: a[1], name: a[2], gap: a[3], lo: a[4], hi: a[5] }; });
var ISL_MAP = {};
ISL.forEach(function (x) { ISL_MAP[x.id] = x; });
var ISL_LEGACY = { fruit: 'r0', iron: 'r1', wood: 'r2', stone: 'r3' }; // 舊版網頁送的是種類名稱
var HOUSE_MS = [0, 60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000]; // 蓋小屋／升級要花的時間：Lv1 1 分、Lv2 5 分、Lv3 15 分
/* 商店島：船（0 號免費）、金幣換物資 */
var SHIPS = [{ name: '小木帆船', cost: 0 }, { name: '彩旗帆船', cost: 8 }, { name: '海盜大帆船', cost: 25 },
  { name: '商賈雙桅船', cost: 60 }, { name: '皇家旗艦', cost: 120 }, { name: '鑽石龍船', cost: 250 }];
var BUY_COST = 1, BUY_N = 4;        // 1 枚金幣買 4 個物資（賣出是 10 個換 1 枚，所以不能無限賺）
var SWAP_FROM = 8, SWAP_TO = 4;     // 8 個甲物資換 4 個乙物資
var DIA_BUY = 15;                   // 15 枚金幣買 1 顆鑽石（賣出是 1 顆換 5 枚）
var XCHG_MAX = 20;                  // 一次最多換 20 份
var STOCK_MIN = 60, STOCK_MAX = 160; // 每座物資島每天的總量（隨機）
var GATHER_N = [2, 6];               // 每次採集拿到幾個（2～6，原本是 1～3，加倍）
var DIA_MAX = 1;                     // 每座物資島每天藏 0～1 顆鑽石（隨機；島變 20 座，所以從 2 降成 1）
var GATHER_MAX = 5;                  // 每人每座島每天最多採 5 次
var GATHER_GAP = 1000;               // 任兩次採集至少隔 1 秒（防連點）；每座島另有自己的冷卻（30～120 秒）
var TRADE_RATE = 10;                 // 10 個同種物資換 1 枚金幣
var DIA_RATE = 5;                    // 1 顆鑽石換 5 枚金幣
var TRADE_MAX = 3;                   // 每天最多兌換 3 次
var FRIEND_MAX = 50;
var A_HEAD = ['編號', '時間', '標題', '內容', '發布者', '修改時間', '狀態'];
var ANN_TITLE = 40, ANN_LEN = 500, ANN_KEEP = 20, VISIT_KEEP = 10, VISIT_GAP = 10 * 60 * 1000, VOY_KEEP = 60;
/* ---------- 我的小島：蓋房子、種菜、養寵物 ---------- */
var L_HEAD = ['時間', '暱稱', '登島碼', '動作', '內容'];
var HOUR = 3600 * 1000, DAY_MS = 24 * HOUR;
var HOUSE = [null, { wood: 5, stone: 3 }, { wood: 10, stone: 8, iron: 3 }, { wood: 20, stone: 15, iron: 8, dia: 1 }];
var FIELD = [{ wood: 3, stone: 2 }, { wood: 6, stone: 5 }, { wood: 12, stone: 8, iron: 3 }];
var DECO = {
  tree: { name: '果樹', cost: { fruit: 6, wood: 3 }, pts: 5 },
  fountain: { name: '噴水池', cost: { stone: 10, iron: 5 }, pts: 10 },
  tower: { name: '瞭望塔', cost: { wood: 15, iron: 10, dia: 1 }, pts: 20 }
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

/* ---------- 漂流寶物（隨機出現在各座島的金幣、鑽石）與每日任務 ---------- */
var DROP_SLOT = 15 * 60 * 1000;   // 每 15 分鐘換一批
var DROP_GRACE = 90 * 1000;       // 換批後 90 秒內，上一批還可以撿（網路慢的緩衝）
var DROP_COINS = 3;               // 每批有幾座島出現金幣
var DROP_DIA_CHANCE = 0.25;       // 每批另外有一座島出現鑽石的機率
var DROP_COIN_DAY = 4, DROP_DIA_DAY = 1;   // 每人每天最多撿幾枚金幣、幾顆鑽石
var DROP_SALT = 'isle-drop-v1';
var QUEST_N = 3, QUEST_COIN = 1;  // 每天 3 個任務，每個 1 枚金幣
/* 網站地圖上每座島的代號（和網頁的 ISLAND_KEYS 一致；新增島嶼時要一起加） */
var DROP_SPOTS = [
  'home', 'mine', 'search', 'msg', 'qa-0', 'isle-beginner',
  'qa-1', 'res-0', 'isle-cad2d', 'qa-2', 'game', 'isle-quiz',
  'qa-3', 'pets', 'res-1', 'isle-cad3d', 'qa-4', 'isle-f44',
  'qa-5', 'isle-videos', 'res-2', 'qa-6', 'isle-advanced', 'qa-7',
  'isle-courses', 'res-3', 'qa-8', 'isle-realtime', 'isle-announce', 'isle-career',
  'isle-plugins', 'castle', 'dock', 'shop',
  'res-4', 'res-5', 'res-6', 'res-7', 'res-8', 'res-9', 'res-10', 'res-11', 'res-12', 'res-13', 'res-14', 'res-15', 'res-16', 'res-17', 'res-18', 'res-19'
];
function hash_(str) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (var i = 0; i < str.length; i++) { var ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}
function rng_(seed) {
  var a = seed >>> 0;
  return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function dropSlot_() { return Math.floor(Date.now() / DROP_SLOT); }
/* 這一批有哪些寶物：由批次編號算出來，不用存；每位玩家各撿各的，不用搶 */
function dropAt_(slot) {
  var rnd = rng_(hash_(DROP_SALT + '|' + slot)), keys = DROP_SPOTS.slice(), out = [];
  for (var i = 0; i < DROP_COINS && keys.length; i++) out.push({ k: keys.splice(Math.floor(rnd() * keys.length), 1)[0], t: 'c' });
  if (rnd() < DROP_DIA_CHANCE && keys.length) out.push({ k: keys.splice(Math.floor(rnd() * keys.length), 1)[0], t: 'd' });
  return out;
}
function dropsPub_() {
  var slot = dropSlot_();
  return { ok: true, slot: slot, left: (slot + 1) * DROP_SLOT - Date.now(), list: dropAt_(slot), max: { c: DROP_COIN_DAY, g: DROP_DIA_DAY } };
}
var QUESTS = {
  gather3: { e: '⛏️', t: '在物資島採集 3 次', chk: function (r) { var c = counts_(r[C.gToday]), n = 0; Object.keys(c).forEach(function (k) { n += c[k]; }); return n >= 3; } },
  trade1: { e: '🏪', t: '到兌換所換 1 次',
    ok: function (r) { var b = bag_(r), m = 0; Object.keys(b).forEach(function (k) { m = Math.max(m, b[k]); }); return m >= TRADE_RATE || num_(r[C.dia]) >= 1; },
    chk: function (r) { return num_(r[C.trades]) >= 1; } },
  msg1: { e: '📮', t: '在留言碼頭留言 1 次', chk: function (r) { return num_(r[C.msgN]) >= 1; } },
  water1: { e: '💧', t: '幫好友的菜園澆水 1 次', ok: function (r) { return list_(r[C.friends]).length >= 1; },
    chk: function (r, o) { return !!o.wd && o.wd.d === day_() && o.wd.f.length >= 1; } },
  gift1: { e: '🎁', t: '送好友一份禮物', ok: function (r) { return list_(r[C.friends]).length >= 1; }, chk: function (r) { return list_(r[C.gifts]).length >= 1; } },
  pat1: { e: '🐾', t: '摸摸小島上的寵物', ok: function (r, o) { return o.pets.length >= 1; },
    chk: function (r, o) { return o.pets.some(function (p) { return num_(p.pd) === day_(); }); } },
  visit2: { e: '🧭', t: '拜訪 2 座不同的島', chk: function (r, o) { return !!o.q && o.q.d === day_() && o.q.v.length >= 2; } },
  drop1: { e: '✨', t: '撿到 1 個漂流寶物', chk: function (r, o) { return !!o.dr && o.dr.d === day_() && (num_(o.dr.c) + num_(o.dr.g)) >= 1; } }
};
/* 每人每天從「做得到的任務」裡抽 3 個，抽好就存起來（當天不會變） */
function pickQuests_(r, o) {
  var pool = Object.keys(QUESTS).filter(function (k) { return !QUESTS[k].ok || QUESTS[k].ok(r, o); });
  var rnd = rng_(hash_(String(r[C.code]) + '|' + day_() + '|q')), out = [];
  while (out.length < QUEST_N && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
function qState_(o, r) {
  if (o.q && o.q.d === day_() && Array.isArray(o.q.ids)) return false;
  o.q = { d: day_(), ids: pickQuests_(r, o), done: [], v: [] };
  return true;
}
function questSync_(r) {
  var o = isleOf_(r);
  if (qState_(o, r)) r[C.isle] = JSON.stringify(o);
}

/* ---------- 工作表 ---------- */
var SHEETS_ = {};
function sheet_(name, head) {
  if (SHEETS_[name]) return SHEETS_[name]; // 同一次執行只檢查一次標題列，省下重複讀取
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (name === '玩家' || name === '邀請碼') sh.getRange('A:A').setNumberFormat('@'); // 登島碼、邀請碼一律當文字
  }
  var cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
  if (cur.join('|') !== head.join('|')) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#ffe8a3');
    sh.setFrozenRows(1);
  }
  SHEETS_[name] = sh;
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

/* ---------- 快取（Google CacheService）：留言、造訪紀錄、站長名單 ---------- */
function cget_(k) { try { var v = CacheService.getScriptCache().get(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function cput_(k, v, sec) { try { CacheService.getScriptCache().put(k, JSON.stringify(v), sec); } catch (e) {} }
function cdel_(k) { try { CacheService.getScriptCache().remove(k); } catch (e) {} }
function ver_(name) { return cget_('ver:' + name) || 0; }
function bump_(name) { cput_('ver:' + name, ver_(name) + 1, 21600); } // 在鎖裡面呼叫，不會同時加

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
  var io = isleOf_(r), pd = day_(), cur = String(dropSlot_());
  return { code: String(r[C.code]), nick: plain_(r[C.nick]), bal: num_(r[C.bal]), earned: num_(r[C.earned]),
    streak: num_(r[C.streak]), admin: r[C.admin] === '是', qa: list_(r[C.qaDone]),
    av: plain_(r[C.av]), fid: String(r[C.fid] || ''), bag: bag_(r), dia: num_(r[C.dia]),
    tres: num_(r[C.tres]), tdia: num_(r[C.tdia]), today: counts_(r[C.gToday]), gLast: num_(r[C.gLast]),
    trades: num_(r[C.trades]), tradeMax: TRADE_MAX, unread: num_(r[C.unread]), friends: list_(r[C.friends]).length,
    veg: io.veg, score: isleScore_(io), ship: io.ship,
    cd: (function () { var m = {}, nw = Date.now(); Object.keys(io.cd).forEach(function (k) { m[k] = Math.ceil((io.cd[k] - nw) / 1000); }); return m; })(),
    open: r[C.open] !== '否', annSeen: num_(r[C.annSeen]), ann: r[C.admin] === '是' || r[C.ann] === '是',
    dr: io.dr && io.dr.d === pd && Array.isArray(io.dr.k)
      ? { c: num_(io.dr.c), g: num_(io.dr.g), k: io.dr.k.filter(function (x) { return x.split(':')[0] === cur; }).map(function (x) { return x.split(':')[1]; }) }
      : { c: 0, g: 0, k: [] },
    drMax: { c: DROP_COIN_DAY, g: DROP_DIA_DAY },
    qs: io.q && io.q.d === pd && Array.isArray(io.q.ids)
      ? io.q.ids.filter(function (id) { return QUESTS[id]; }).map(function (id) { return { id: id, e: QUESTS[id].e, t: QUESTS[id].t, ok: !!QUESTS[id].chk(r, io), got: io.q.done.indexOf(id) >= 0 }; })
      : [],
    qCoin: QUEST_COIN };
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
  SHEETS_ = {};
  var a = String(q.a || '');
  if (a === 'top') return top_(q);
  if (a === 'visitors') return { ok: true, v: visitors_(String(q.isle || '')) };
  if (a === 'visall') return { ok: true, vs: visStats_() };
  if (a === 'msgs') return msgs_(q);
  if (a === 'anns') return anns_();
  if (a === 'voyage') return voyage_();
  if (a === 'drops') return dropsPub_();
  if (a === 'isl') return islLite_();
  if (a === 'island' && !q.fid) return islandOwn_(q); // 看自己的小島：只讀、不排隊等鎖，快很多
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = players_();
    var rows = rows_(sh);

    if (a === 'reg') {
      var nick = cleanNick_(q.nick);
      if (nick.length < 2) return { ok: false, err: 'short' };
      if (RESERVED.test(nick)) return { ok: false, err: 'reserved' };
      var invRow = -1, invSh = null, invUsed = 0, invWho = '';
      if (INVITE_ON) {
        var ik = invKey_(q.inv);
        if (!ik) return { ok: false, err: 'noinv' };
        invSh = sheet_('邀請碼', INV_HEAD);
        var iv = invSh.getLastRow() > 1 ? invSh.getRange(2, 1, invSh.getLastRow() - 1, INV_HEAD.length).getValues() : [];
        for (var iq = 0; iq < iv.length; iq++) if (invKey_(iv[iq][0]) === ik) { invRow = iq + 2; break; }
        if (invRow < 0) return { ok: false, err: 'badinv' };
        var ir = iv[invRow - 2], icap = num_(ir[1]) || INV_CAP;
        invUsed = num_(ir[2]); invWho = String(ir[3] || '');
        if (invUsed >= icap) return { ok: false, err: 'invfull' };
      }
      if (nickTaken_(rows, nick, -1)) return { ok: false, err: 'taken' };
      var row = newRow_(newCode_(rows), nick, false, Math.min(CAP.qa, num_(q.init)), newFid_(rows));
      sh.appendRow(row);
      if (invRow > 0) {
        invSh.getRange(invRow, 3, 1, 2).setValues([[invUsed + 1, (invWho ? invWho + '、' : '') + nick + '（' + row[C.fid] + '）']]);
      }
      return { ok: true, p: profile_(row) };
    }
    if (a === 'isles' && !q.code) return { ok: true, isles: islesPub_(isles_(), null) };

    var i = find_(rows, q.code);
    if (i < 0) return { ok: false, err: 'nocode' };
    var r = rows[i];
    if (!r[C.fid]) r[C.fid] = newFid_(rows);
    resetDay_(r);
    questSync_(r);
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
      if (!dup) { vs.appendRow([new Date(), r[C.nick], me.code, isle, text_(q.name, 30), t2, me.admin ? '是' : '']); cdel_('vis'); }
      var vo = isleOf_(r);
      qState_(vo, r);
      if (vo.q.v.indexOf(isle) < 0 && vo.q.v.length < 30) vo.q.v.push(isle);
      r[C.isle] = JSON.stringify(vo);
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
      if (ISL_LEGACY[rk]) rk = ISL_LEGACY[rk];
      var il = ISL_MAP[rk];
      if (!il) return { ok: false, err: 'bad' };
      var now = Date.now(), wait = num_(r[C.gLast]) + GATHER_GAP - now;
      if (wait > 0) return { ok: false, err: 'cool', wait: Math.ceil(wait / 1000), p: me };
      var gio = isleOf_(r), ready = num_(gio.cd[rk]);
      if (ready > now) return { ok: false, err: 'cool', wait: Math.ceil((ready - now) / 1000), p: me };
      var tc = counts_(r[C.gToday]);
      if ((tc[rk] || 0) >= GATHER_MAX) return { ok: false, err: 'tired', p: me };
      var st = isles_(), isl = st.map[rk], left = isl.total - isl.taken;
      if (left <= 0) return { ok: false, err: 'empty', p: me, isles: islesPub_(st, r) };
      var got = Math.min(left, il.lo + Math.floor(Math.random() * (il.hi - il.lo + 1))), from = isl.taken;
      isl.taken += got;
      var dia = 0;
      isl.dias.forEach(function (pos) { if (pos > from && pos <= isl.taken) dia++; });
      if (dia) isl.found += dia;
      st.sh.getRange(isl.row, 5).setValue(isl.taken);
      if (dia) st.sh.getRange(isl.row, 7).setValue(isl.found);
      cdel_('isl2');
      tc[rk] = (tc[rk] || 0) + 1;
      r[C.gToday] = countsStr_(tc);
      r[C.gLast] = now;
      gio.cd[rk] = now + il.gap * 1000;
      r[C.isle] = JSON.stringify(gio);
      r[RES[il.t].col] = num_(r[RES[il.t].col]) + got;
      r[C.tres] = num_(r[C.tres]) + got;
      if (dia) { r[C.dia] = num_(r[C.dia]) + dia; r[C.tdia] = num_(r[C.tdia]) + dia; }
      res.got = { k: il.t, n: got, dia: dia, isle: rk };
      res.isles = islesPub_(st, r);
    /* ----- 商店島：買船、換船、金幣換物資 ----- */
    } else if (a === 'buyship' || a === 'useship') {
      var sid = Math.floor(num_(q.k)), sp = SHIPS[sid];
      if (!sp) return { ok: false, err: 'bad', p: me };
      var so = isleOf_(r);
      if (a === 'buyship') {
        if (so.ship.own.indexOf(sid) >= 0) return { ok: false, err: 'owned', p: me };
        if (!me.admin) {
          if (num_(r[C.bal]) < sp.cost) return { ok: false, err: 'nocoin', p: me };
          r[C.bal] = num_(r[C.bal]) - sp.cost;
        }
        so.ship.own.push(sid); so.ship.own.sort(function (x, y) { return x - y; });
        so.ship.cur = sid;
        sheet_('小島紀錄', L_HEAD).appendRow([new Date(), r[C.nick], r[C.code], '買船', sp.name + '（' + sp.cost + ' 金幣）']);
      } else {
        if (so.ship.own.indexOf(sid) < 0) return { ok: false, err: 'notown', p: me };
        so.ship.cur = sid;
      }
      r[C.isle] = JSON.stringify(so);
    } else if (a === 'xbuy') {
      var xk = String(q.k || ''), xn = Math.max(1, Math.min(XCHG_MAX, Math.floor(num_(q.n) || 1)));
      var xcost = (xk === 'dia' ? DIA_BUY : BUY_COST) * xn;
      if (xk !== 'dia' && !RES[xk]) return { ok: false, err: 'bad', p: me };
      if (num_(r[C.bal]) < xcost) return { ok: false, err: 'nocoin', p: me };
      r[C.bal] = num_(r[C.bal]) - xcost;
      if (xk === 'dia') r[C.dia] = num_(r[C.dia]) + xn;
      else r[RES[xk].col] = num_(r[RES[xk].col]) + BUY_N * xn;
    } else if (a === 'xswap') {
      var sf = String(q.f || ''), st2 = String(q.t || ''), sn = Math.max(1, Math.min(XCHG_MAX, Math.floor(num_(q.n) || 1)));
      if (!RES[sf] || !RES[st2] || sf === st2) return { ok: false, err: 'bad', p: me };
      if (num_(r[RES[sf].col]) < SWAP_FROM * sn) return { ok: false, err: 'few', p: me };
      r[RES[sf].col] = num_(r[RES[sf].col]) - SWAP_FROM * sn;
      r[RES[st2].col] = num_(r[RES[st2].col]) + SWAP_TO * sn;
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
        var vFriend = list_(r[C.friends]).indexOf(String(rows[jv][C.fid])) >= 0;
        if (rows[jv][C.open] === '否' && !vFriend && !me.admin) return { ok: false, err: 'closed', p: me };
        if (!me.admin) { // 留下訪客紀錄（同一人 10 分鐘內只記一次）
          var ti = isleOf_(rows[jv]), nowV = Date.now(), prevV = null;
          ti.vis.forEach(function (x) { if (x.f === me.fid) prevV = x; });
          if (!prevV || nowV - prevV.t > VISIT_GAP) {
            ti.vis = [{ f: me.fid, n: me.nick, a: me.av, t: nowV }].concat(ti.vis.filter(function (x) { return x.f !== me.fid; })).slice(0, VISIT_KEEP);
            rows[jv][C.isle] = JSON.stringify(ti); touched[jv] = 1;
          }
        }
        res.island = islePub_(rows[jv], false, isleOf_(r));
        res.island.friend = vFriend;
      } else res.island = islePub_(r, true);
    } else if (a === 'setopen') {
      r[C.open] = q.o ? '' : '否';
      res.island = islePub_(r, true);
    } else if (a === 'build' || a === 'plant' || a === 'harvest' || a === 'adopt' || a === 'feed' || a === 'pat') {
      var out = isleAct_(a, q, r, me);
      if (out.err) return { ok: false, err: out.err, miss: out.miss, p: me };
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
      res.island.friend = true;

    /* ----- 漂流寶物、每日任務 ----- */
    } else if (a === 'drop') {
      var dk = String(q.k || ''), ds = num_(q.s), dcur = dropSlot_();
      var dok = ds === dcur || (ds === dcur - 1 && Date.now() % DROP_SLOT < DROP_GRACE);
      if (!dok || DROP_SPOTS.indexOf(dk) < 0) return { ok: false, err: 'nodrop', p: me };
      var spawn = null;
      dropAt_(ds).forEach(function (x) { if (x.k === dk) spawn = x; });
      if (!spawn) return { ok: false, err: 'nodrop', p: me };
      var od = isleOf_(r), dday = day_();
      if (!od.dr || od.dr.d !== dday || !Array.isArray(od.dr.k)) od.dr = { d: dday, c: 0, g: 0, k: [] };
      var dkey = ds + ':' + dk;
      if (od.dr.k.indexOf(dkey) >= 0) return { ok: false, err: 'got', p: me };
      if (spawn.t === 'c') {
        if (num_(od.dr.c) >= DROP_COIN_DAY) return { ok: false, err: 'dropmax', p: me };
        od.dr.c = num_(od.dr.c) + 1; res.add = 1;
      } else {
        if (num_(od.dr.g) >= DROP_DIA_DAY) return { ok: false, err: 'dropmax', p: me };
        od.dr.g = num_(od.dr.g) + 1;
        r[C.dia] = num_(r[C.dia]) + 1; r[C.tdia] = num_(r[C.tdia]) + 1;
      }
      od.dr.k.push(dkey);
      if (od.dr.k.length > 12) od.dr.k = od.dr.k.slice(-12);
      r[C.isle] = JSON.stringify(od);
      res.got = { t: spawn.t, k: dk };
    } else if (a === 'qclaim') {
      var oq = isleOf_(r);
      qState_(oq, r);
      var qid = String(q.id || '');
      if (oq.q.ids.indexOf(qid) < 0 || !QUESTS[qid]) return { ok: false, err: 'bad', p: me };
      if (oq.q.done.indexOf(qid) >= 0) return { ok: false, err: 'got', p: me };
      if (!QUESTS[qid].chk(r, oq)) return { ok: false, err: 'notyet', p: me };
      oq.q.done.push(qid);
      res.add = QUEST_COIN;
      r[C.isle] = JSON.stringify(oq);
      res.got = { t: 'q', k: qid };

    /* ----- 公告 ----- */
    } else if (a === 'annread') {
      var seq = Math.min(num_(q.seq), anns_().max);
      if (seq > num_(r[C.annSeen])) r[C.annSeen] = seq;
    } else if (a === 'annpost' || a === 'annedit' || a === 'anndel') {
      if (!me.ann) return { ok: false, err: 'admin', p: me };
      var ash = sheet_('公告', A_HEAD), atitle = text_(q.title, ANN_TITLE) || '公告', atext = body_(q.text, ANN_LEN);
      if (a !== 'anndel' && plain_(atext).length < 2) return { ok: false, err: 'annshort', p: me };
      if (a === 'annpost') {
        var an = ash.getLastRow() - 1, aid = (an > 0 ? num_(ash.getRange(an + 1, 1).getValue()) : 0) + 1;
        ash.appendRow([aid, new Date(), atitle, atext, r[C.nick], '', '']);
        r[C.annSeen] = aid; // 自己發的就當作看過
      } else {
        var arow = msgRow_(ash, q.id);
        if (!arow) return { ok: false, err: 'bad', p: me };
        if (a === 'annedit') { ash.getRange(arow, 3, 1, 1).setValue(atitle); ash.getRange(arow, 4, 1, 1).setValue(atext); ash.getRange(arow, 6, 1, 1).setValue(new Date()); }
        else ash.getRange(arow, 7, 1, 1).setValue('刪除');
      }
      CacheService.getScriptCache().remove('anns');

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
      bump_('msgs');
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
      bump_('msgs');
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

/* 造訪紀錄：一次掃過整張表，算好每座島的人數與最近 12 位，快取 2 分鐘（有人新留下足跡就清掉） */
var VIS_TTL = 120;
function visStats_() {
  var hit = cget_('vis');
  if (hit) return hit;
  var vs = sheet_('造訪紀錄', V_HEAD), n = vs.getLastRow() - 1, out = {};
  if (n > 0) {
    var rows = vs.getRange(2, 1, n, V_HEAD.length).getValues(), seen = {};
    for (var i = rows.length - 1; i >= 0; i--) {
      var r = rows[i], k = String(r[3]);
      if (!k || r[6] === '是' || seen[k + '|' + r[2]]) continue;
      seen[k + '|' + r[2]] = 1;
      var o = out[k] || (out[k] = { total: 0, list: [] });
      o.total++;
      if (o.list.length < 12) o.list.push({ nick: plain_(r[1]), d: Utilities.formatDate(new Date(r[0]), TZ, 'M/d') });
    }
  }
  cput_('vis', out, VIS_TTL);
  return out;
}
function visitors_(isle) { return (isle && visStats_()[isle]) || { list: [], total: 0 }; }

/* 排行榜：coin（目前金幣）、res（累計採集的物資）、dia（累計撿到的鑽石）。
   三份名單一起算好，在 Google 快取放 60 秒，期間不用重讀整張玩家表。 */
var TOP_TTL = 60;
function topLists_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('top5');
  if (hit) return JSON.parse(hit);
  var rows = rows_(players_()), out = {}, isl = rows.map(isleOf_), scoreOf = {};
  rows.forEach(function (r, x) { scoreOf[x] = isleScore_(isl[x]); });
  [['coin', C.bal], ['res', C.tres], ['dia', C.tdia], ['isle', -1]].forEach(function (kc) {
    var k = kc[0], col = kc[1];
    var val = function (r) { return col < 0 ? scoreOf[rows.indexOf(r)] : num_(r[col]); };
    out[k] = rows
      .filter(function (r) { return r[C.nick] && r[C.admin] !== '是' && (k === 'coin' || val(r) > 0); })
      .sort(function (x, y) { return val(y) - val(x); })
      .slice(0, 20)
      .map(function (r) {
        var o = { c: String(r[C.code]).toUpperCase(), nick: plain_(r[C.nick]), av: plain_(r[C.av]), v: val(r), bal: num_(r[C.bal]), fid: String(r[C.fid] || '') };
        if (k === 'res') o.bag = bag_(r);
        return o;
      });
  });
  // 可以航向的小島：開放參觀、有蓋東西的玩家
  var voy = [];
  rows.forEach(function (r, x) {
    if (!r[C.nick] || r[C.admin] === '是' || r[C.open] === '否' || !scoreOf[x]) return;
    voy.push({ fid: String(r[C.fid] || ''), nick: plain_(r[C.nick]), av: plain_(r[C.av]), score: scoreOf[x], h: isl[x].h, pets: isl[x].pets.length, seen: r[C.seen] ? new Date(r[C.seen]).getTime() : 0 });
  });
  out.voy = voy.sort(function (p, q) { return q.score - p.score; }).slice(0, VOY_KEEP);
  // 登島船長總人數：所有有暱稱的一般玩家（不含站長帳號），不是只算排行榜前 20 名
  out.n = rows.filter(function (r) { return r[C.nick] && r[C.admin] !== '是'; }).length;
  try { cache.put('top5', JSON.stringify(out), TOP_TTL); } catch (e) {}
  return out;
}
function voyage_() { return { ok: true, list: topLists_().voy || [] }; }
function anns_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('anns');
  if (hit) return JSON.parse(hit);
  var sh = sheet_('公告', A_HEAD), n = sh.getLastRow() - 1, list = [], max = 0;
  if (n > 0) {
    var v = sh.getRange(2, 1, n, A_HEAD.length).getValues();
    for (var x = v.length - 1; x >= 0; x--) {
      var r = v[x], id = num_(r[0]);
      if (!id) continue;
      if (id > max) max = id;
      if (String(r[6]) === '刪除' || list.length >= ANN_KEEP) continue;
      list.push({ id: id, t: fmt_(r[1]), title: plain_(r[2]), text: plain_(r[3]), by: plain_(r[4]), re: fmt_(r[5]) });
    }
  }
  var out = { ok: true, list: list, max: max };
  try { cache.put('anns', JSON.stringify(out), TOP_TTL); } catch (e) {}
  return out;
}
function top_(q) {
  var lists = topLists_(), code = String(q.code || '').toUpperCase();
  function pub(list) { return list.map(function (o) { var x = {}; for (var k in o) if (k !== 'c') x[k] = o[k]; x.me = !!code && o.c === code; return x; }); }
  if (q.k === 'all') return { ok: true, n: lists.n, all: { coin: pub(lists.coin), res: pub(lists.res), dia: pub(lists.dia), isle: pub(lists.isle || []) } };
  var k = q.k === 'res' || q.k === 'dia' ? q.k : 'coin';
  return { ok: true, k: k, n: lists.n, top: pub(lists[k]) };
}

/* ---------- 物資島：每天第一次有人來時重抽總量與鑽石位置 ---------- */
function isles_() {
  var sh = sheet_('物資島', R_HEAD), t = day_(), n = sh.getLastRow() - 1;
  var vals = n > 0 ? sh.getRange(2, 1, n, R_HEAD.length).getValues() : [];
  var byId = {};
  vals.forEach(function (v) { byId[String(v[0])] = v; });
  var map = {}, rows = [], dirty = false;
  ISL.forEach(function (il, i) {
    var v = byId[il.id];
    if (!v || Number(v[2]) !== t) {
      var total = STOCK_MIN + Math.floor(Math.random() * (STOCK_MAX - STOCK_MIN + 1));
      var nd = Math.floor(Math.random() * (DIA_MAX + 1)), pos = [];
      while (pos.length < nd) { var p = 1 + Math.floor(Math.random() * total); if (pos.indexOf(p) < 0) pos.push(p); }
      v = [il.id, il.name, t, total, 0, "'" + pos.sort(function (x, y) { return x - y; }).join(','), 0];
      dirty = true;
    } else v = [v[0], v[1], v[2], v[3], v[4], "'" + String(v[5]).replace(/^'/, ''), v[6]];
    rows.push(v);
    map[il.id] = { row: i + 2, total: num_(v[3]), taken: num_(v[4]),
      dias: plain_(v[5]).split(',').filter(String).map(Number), found: num_(v[6]) };
  });
  var ordered = vals.length >= ISL.length && ISL.every(function (il, i) { return String(vals[i][0]) === il.id; });
  if (dirty || !ordered) sh.getRange(2, 1, rows.length, R_HEAD.length).setValues(rows); // 一次寫完 20 列（比一列一列寫快很多）
  return { sh: sh, map: map };
}
/* 地圖上顯示「資源島現在有沒有東西可採」用的輕量版：只讀、不重抽、快取 20 秒（有人採集就清掉） */
function islLite_() {
  var hit = cget_('isl2');
  if (hit) return hit;
  var sh = sheet_('物資島', R_HEAD), n = sh.getLastRow() - 1, t = day_(), left = {};
  ISL.forEach(function (il) { left[il.id] = 1; }); // 今天還沒人來過 → 當作還有
  (n > 0 ? sh.getRange(2, 1, n, R_HEAD.length).getValues() : []).forEach(function (v) {
    var k = String(v[0]);
    if (ISL_MAP[k] && Number(v[2]) === t) left[k] = Math.max(0, num_(v[3]) - num_(v[4]));
  });
  var out = { ok: true, left: left };
  cput_('isl2', out, 20);
  return out;
}
function islesPub_(st, r) {
  var o = {}, tc = r ? counts_(r[C.gToday]) : {};
  ISL.forEach(function (il) {
    var m = st.map[il.id];
    o[il.id] = { total: m.total, left: Math.max(0, m.total - m.taken), found: m.found, mine: tc[il.id] || 0, max: GATHER_MAX };
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
  o.vis = Array.isArray(o.vis) ? o.vis : [];
  var nowI = Date.now();
  if (o.hb && num_(o.hb.e) <= nowI) { o.h = Math.max(o.h, num_(o.hb.t)); o.hb = null; } // 施工時間到了，小屋完工
  if (!o.hb) o.hb = null;
  o.ship = o.ship && Array.isArray(o.ship.own) ? o.ship : { cur: 0, own: [0] };
  if (o.ship.own.indexOf(0) < 0) o.ship.own.unshift(0);
  if (o.ship.own.indexOf(o.ship.cur) < 0) o.ship.cur = 0;
  var cd = {};
  if (o.cd) Object.keys(o.cd).forEach(function (k) { if (ISL_MAP[k] && num_(o.cd[k]) > nowI) cd[k] = num_(o.cd[k]); });
  o.cd = cd;
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
/* 看自己的小島（只讀，不寫回試算表、不佔用鎖）：登入小島時最常被呼叫，所以走最短的路 */
function islandOwn_(q) {
  var rows = rows_(players_()), i = find_(rows, q.code);
  if (i < 0) return { ok: false, err: 'nocode' };
  var r = rows[i];
  resetDay_(r); // 只改記憶體裡的這一列（跨日的今日計數歸零），不存回去
  return { ok: true, add: 0, island: islePub_(r, true), p: profile_(r) };
}
/* 還缺多少：{ wood: 3, stone: 2 }（只列不夠的） */
function missCost_(r, cost) {
  var m = {};
  for (var k in cost) { var have = num_(r[BAG_COL[k]]); if (have < cost[k]) m[k] = cost[k] - have; }
  return m;
}
function payCost_(r, cost) { for (var k in cost) r[BAG_COL[k]] = num_(r[BAG_COL[k]]) - cost[k]; }
var COST_NAME = { fruit: '水果', iron: '鐵礦', wood: '木材', stone: '石頭', dia: '鑽石' };
function costText_(cost) { return Object.keys(cost).map(function (k) { return COST_NAME[k] + '×' + cost[k]; }).join(' '); }
function islePub_(r, mine, viewer) {
  var o = isleOf_(r), now = Date.now(), wd = viewer && viewer.wd && viewer.wd.d === day_() ? viewer.wd.f : [];
  var out = {
    nick: plain_(r[C.nick]), av: plain_(r[C.av]), fid: String(r[C.fid] || ''), mine: !!mine,
    h: o.h, fields: o.fields, deco: o.deco, score: isleScore_(o),
    hb: o.hb ? { t: num_(o.hb.t), left: Math.max(0, num_(o.hb.e) - now), total: HOUSE_MS[num_(o.hb.t)] || 0 } : null,
    f: o.f.map(function (c) { return c && VEG[c.v] ? { v: c.v, left: cropLeft_(c, now), total: VEG[c.v].hours * HOUR } : null; }),
    pets: o.pets.map(function (p) {
      return { id: p.id, k: p.k, n: p.n, full: Math.round(fullNow_(p, now)), aff: num_(p.aff), lv: petLv_(p), patted: num_(p.pd) === day_() };
    })
  };
  if (mine) { out.open = r[C.open] !== '否'; out.vis = o.vis.map(function (x) { return { n: x.n, a: x.a, t: x.t, f: x.f }; }); out.veg = o.veg; out.rules = { house: HOUSE, houseMs: HOUSE_MS, field: FIELD, deco: DECO, veg: VEG, animals: ANIMALS, fruitFood: FRUIT_FOOD }; }
  else out.watered = wd.indexOf(out.fid) >= 0;
  return out;
}
/* 小島上的動作：回傳 { err } 或 { add, gift, got, log } */
function isleAct_(a, q, r, me) {
  var o = isleOf_(r), now = Date.now(), out = {};
  if (a === 'build') {
    var kind = String(q.k || ''), cost, label;
    if (kind === 'house') {
      if (o.hb) return { err: 'building' };
      if (o.h >= 3) return { err: 'maxed' };
      cost = HOUSE[o.h + 1]; label = '小屋 Lv' + (o.h + 1) + '（施工 ' + Math.round(HOUSE_MS[o.h + 1] / 60000) + ' 分鐘）';
    } else if (kind === 'field') {
      if (o.fields >= FIELD.length) return { err: 'maxed' };
      cost = FIELD[o.fields]; label = '菜田 第 ' + (o.fields + 1) + ' 塊';
    } else if (DECO[kind]) {
      if (o.deco.indexOf(kind) >= 0) return { err: 'maxed' };
      cost = DECO[kind].cost; label = DECO[kind].name;
    } else return { err: 'bad' };
    if (!hasCost_(r, cost)) return { err: 'few', miss: missCost_(r, cost) }; // 一併告訴網頁還缺什麼
    payCost_(r, cost);
    if (kind === 'house') o.hb = { t: o.h + 1, e: now + HOUSE_MS[o.h + 1] };
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
/* 留言：每一頁（站長版／一般版）快取 60 秒；有人留言、回覆、隱藏、刪除時換版本號，快取就自動作廢 */
var MSG_TTL = 60, MSG_CACHE_PAGES = 10;
function adminCodes_() {
  var hit = cget_('adm');
  if (hit) return hit;
  var out = [];
  rows_(players_()).forEach(function (r) { if (r[C.admin] === '是') out.push(String(r[C.code]).toUpperCase()); });
  cput_('adm', out, 600);
  return out;
}
function msgsBuild_(admin, prefix) {
  var rows = rows_(players_()), avOf = {};
  rows.forEach(function (r) { avOf[String(r[C.code]).toUpperCase()] = plain_(r[C.av]); });
  var sh = sheet_('留言板', M_HEAD), n = sh.getLastRow() - 1, list = [], pending = 0;
  if (n > 0) {
    var vals = sh.getRange(2, 1, n, M_HEAD.length).getValues();
    for (var x = vals.length - 1; x >= 0; x--) {
      var v = vals[x], st = String(v[9]);
      if (!v[0] || st === '刪除' || (st === '隱藏' && !admin)) continue;
      if (!v[6] && st !== '隱藏') pending++;
      var who = String(v[3]).toUpperCase();
      list.push({ id: String(v[0]), t: fmt_(v[1]), nick: plain_(v[2]), av: avOf[who] || plain_(v[4]), text: plain_(v[5]),
        reply: plain_(v[6]), rt: fmt_(v[7]), re: fmt_(v[8]), hidden: st === '隱藏', w: who });
    }
  }
  var total = list.length, pages = Math.max(1, Math.ceil(total / MSG_PAGE)), all = {}, first = {};
  for (var p = 1; p <= Math.min(pages, MSG_CACHE_PAGES); p++) {
    first = { total: total, pending: admin ? pending : 0, pages: pages, list: list.slice((p - 1) * MSG_PAGE, p * MSG_PAGE) };
    all[prefix + p] = JSON.stringify(first);
  }
  try { CacheService.getScriptCache().putAll(all, MSG_TTL); } catch (e) {}
  return { total: total, pending: admin ? pending : 0, pages: pages, list: list };
}
function msgs_(q) {
  var code = String(q.code || '').toUpperCase();
  var admin = !!code && adminCodes_().indexOf(code) >= 0;
  var page = Math.max(1, num_(q.page) || 1);
  var prefix = 'msgs:' + ver_('msgs') + ':' + (admin ? 'a' : 'p') + ':';
  var pg = page <= MSG_CACHE_PAGES ? cget_(prefix + page) : null;
  if (!pg) {
    var all = msgsBuild_(admin, prefix);
    pg = { total: all.total, pending: all.pending, pages: all.pages, list: all.list.slice((page - 1) * MSG_PAGE, page * MSG_PAGE) };
  }
  return { ok: true, total: pg.total, pending: pg.pending, admin: admin, page: page, pages: pg.pages,
    list: pg.list.map(function (m) {
      return { id: m.id, t: m.t, nick: m.nick, av: m.av, text: m.text, reply: m.reply, rt: m.rt, re: m.re, hidden: m.hidden, mine: !!code && m.w === code };
    }) };
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
      row[C.ann] = '是';
      sh.appendRow(row);
      rows.push(row);
      Logger.log(o.nick + ' 的登島碼：' + row[C.code] + (o.admin ? '（管理員：不上排行榜、下載不扣金幣）' : ''));
    } else {
      if (rows[i][C.ann] !== '是') sh.getRange(i + 2, C.ann + 1).setValue('是'); // 兩個站長帳號都能發公告
      Logger.log(o.nick + ' 已經存在，登島碼：' + rows[i][C.code] + '（已有發公告權限）');
    }
  });
}
