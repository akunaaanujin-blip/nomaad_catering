// NOMAAD Бизнесүүд — Google Apps Script v2.2 (барааны үлдэгдэл)
// Махны дэлгүүр · Cozy Home Ulaanbaatar · NOMAAD аяллын дэлгүүр
//
// Суулгах: script.google.com дээр шинэ төсөл → энэ кодыг хуулна →
// ADMIN_PIN-ээ сольно → Deploy → New deployment → Web app
// (Execute as: Me, Who has access: Anyone) → гарсан /exec холбоосыг config.js-ийн API_URL-д тавина.

const ADMIN_PIN    = '0000';          // ← анхны «admin» эзний нууц код (зөвхөн анх үүсгэхэд). Дараа нь «Ажилтан» хуудсаас солино.
const SHEET_LOG    = 'Бүртгэл';
const SHEET_PROD   = 'Бараа';
const SHEET_STAFF  = 'Ажилтан';
const SHEET_SALARY = 'Цалин';
const SHEET_STOCK  = 'Үлдэгдэл';
const TZ           = 'Asia/Ulaanbaatar';
const SHEET_ID     = '1Hkmo9ttsHfm6xfr49W0BpjkE2nnPPCL0dt2fP6rGyKI';   // NOMAAD Бизнесүүд — Бүртгэл

const BIZ_NAMES = { meat: 'Махны дэлгүүр', cozy: 'Cozy Home Ulaanbaatar', travel: 'NOMAAD аяллын дэлгүүр' };
const TYPE_NAMES = { sale: 'Борлуулалт', expense: 'Зарлага', close: 'Касс хаалт' };
const LOG_HEAD = ['ID', 'Огноо', 'Цаг', 'Бизнес', 'Төрөл', 'Ажилтан', 'Бараа / Ангилал', 'Тоо', 'Нэгж',
                  'Нэгжийн үнэ', 'Дүн', 'Төлбөр', 'Тоолсон бэлэн', 'Зөрүү', 'Тайлбар', 'biz', 'type'];
// "Ажилтан" хуудасны баганууд (эхний 5 нь v1.1-ээс хэвээр)
const STAFF_HEAD = ['Бизнес (meat / cozy / travel / all)', 'Нэр', 'Код (4 орон)', 'Эрх (Худалдагч / Менежер)', 'Идэвхтэй (Тийм / Хүлээгдэж / Үгүй)',
                    'Овог', 'Утас', 'Регистр', 'Албан тушаал', 'Үндсэн цалин', 'Банкны данс', 'Бүртгүүлсэн', 'ID', 'Нэвтрэх нэр'];
const USER_RE = /^[a-z0-9._]{3,20}$/;
const TOKEN_TTL = 8 * 3600;   // удирдагчийн нэвтрэлт 8 цаг
const SALARY_HEAD = ['ID', 'Огноо', 'Сар', 'Ажилтны ID', 'Нэр', 'Бизнес', 'Төрөл', 'Дүн', 'Тайлбар'];
const SALARY_KINDS = { 'Урьдчилгаа': 1, 'Шагнал': 1, 'Суутгал': 1, 'Олгосон': 1 };
// Үлдэгдлийн хөдөлгөөн: тоо + (нэмэгдэх) / − (хасагдах). Борлуулалт «Бүртгэл»-ээс автоматаар хасагдана.
const STOCK_HEAD = ['ID', 'Огноо', 'Бизнес', 'Байршил', 'Бараа', 'Төрөл', 'Тоо', 'Нэгж өртөг', 'Хэн', 'Тайлбар', 'biz'];
const STOCK_KINDS = { 'Эхний үлдэгдэл': 1, 'Орлого': 1, 'Шилжүүлэг': 1, 'Тооллого': 1, 'Хасалт': 1 };
const STOCK_LOCS = { 'Дэлгүүр': 1, 'Агуулах': 1 };

// ── Бичих ──
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.type === 'register') return json(register(data));
    if (data.type === 'admin_login') return json(adminLogin(data));
    if (data.type === 'admin_read') return json(isAdmin(data) ? adminRead(data) : { status: 'error', error: 'auth' });
    if (data.type === 'admin_staff') return json(isAdmin(data) ? adminStaff(data) : { status: 'error', error: 'auth' });
    if (data.type === 'admin_salary') return json(isAdmin(data) ? adminSalary(data) : { status: 'error', error: 'auth' });
    if (data.type === 'admin_stock') return json(isAdmin(data) ? adminStock(data) : { status: 'error', error: 'auth' });
    return json(saveRecords(data));
  } catch (err) {
    return json({ status: 'error', error: err.message });
  } finally {
    lock.releaseLock();
  }
}
// Удирдагчийн токен (admin_login-оор олгоно, 8 цаг хүчинтэй)
function isAdmin(data) {
  return !!(data.token && /^[0-9a-f-]{36}$/.test(String(data.token)) && CacheService.getScriptCache().get('tok_' + data.token));
}
function adminLogin(d) {
  const user = String(d.user || '').trim().toLowerCase(), pass = String(d.pass || '').trim();
  const cache = CacheService.getScriptCache();
  const key = 'afail_' + user;
  const fails = Number(cache.get(key) || 0);
  if (fails >= 10) return { status: 'error', error: 'locked' };
  const s = staffRows().filter(function (x) { return x.username === user && x.role === 'Эзэн' && x.status === 'Тийм'; })[0];
  if (!s || s.code !== pass.padStart(4, '0')) { cache.put(key, String(fails + 1), 900); return { status: 'error', error: 'auth' }; }
  cache.remove(key);
  const token = Utilities.getUuid();
  cache.put('tok_' + token, s.id, TOKEN_TTL);
  return { status: 'ok', token: token, name: s.name };
}
function adminRead(d) {
  const a = adminData();
  a.records = data(d.from).records;
  a.stock = stockAll(true);
  a.moves = stockMoves().slice(-500);
  return a;
}

// Ажилтны хуудаснаас ирсэн борлуулалт / зарлага / касс хаалт
function saveRecords(data) {
  const sheet = logSheet();
  const seen = existingIds(sheet);
  const rows = [];
  (data.records || []).forEach(function (r) {
    if (!r.id || seen[r.id] || !BIZ_NAMES[r.biz] || !TYPE_NAMES[r.type]) return;
    seen[r.id] = 1;
    rows.push([
      r.id, r.date, r.time, BIZ_NAMES[r.biz], TYPE_NAMES[r.type], r.staff || '',
      r.type === 'sale' ? r.item : (r.type === 'expense' ? r.category : ''),
      r.type === 'sale' ? Number(r.qty) : '',
      r.type === 'sale' ? r.unit : '',
      r.type === 'sale' ? Number(r.price) : '',
      Number(r.amount) || 0,
      r.type === 'sale' ? r.pay : '',
      r.type === 'close' ? Number(r.counted) : '',
      r.type === 'close' ? Number(r.diff) : '',
      r.note || '', r.biz, r.type,
    ]);
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, LOG_HEAD.length).setValues(rows);
  return { status: 'ok', saved: rows.length };
}

// ── Унших ──
function doGet(e) {
  const p = e.parameter || {};
  let out;
  if (p.action === 'products') out = products(p.biz);
  else if (p.action === 'login') out = login(p.biz, p.user, p.code);
  else if (p.action === 'stock') out = BIZ_NAMES[p.biz] ? { status: 'ok', stock: stockAll()[p.biz] || {} } : { status: 'error', error: 'biz' };
  else out = { status: 'ok', app: 'NOMAAD' };
  const body = JSON.stringify(out);
  if (p.callback) {
    return ContentService.createTextOutput(p.callback + '(' + body + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ── Ажилтны нэвтрэлт ── Кодын жагсаалтыг хэзээ ч буцаахгүй. Зөвхөн "Тийм" төлөвтэй ажилтан нэвтэрнэ.
function login(biz, user, code) {
  code = String(code || '').trim();
  user = String(user || '').trim().toLowerCase();
  if (!BIZ_NAMES[biz] || !USER_RE.test(user) || !/^\d{4,8}$/.test(code)) return { status: 'error', error: 'code' };
  const cache = CacheService.getScriptCache();
  const key = 'fail_' + biz + '_' + user;
  const fails = Number(cache.get(key) || 0);
  if (fails >= 10) return { status: 'error', error: 'locked' };
  const s = staffRows().filter(function (x) { return x.username === user && (x.biz === biz || x.biz === 'all'); })[0];
  if (s && s.code === code.padStart(4, '0')) {
    if (s.status === 'Хүлээгдэж') return { status: 'error', error: 'pending' };
    if (s.status === 'Тийм') {
      cache.remove(key);
      return { status: 'ok', name: s.name, role: s.role === 'Худалдагч' ? 'seller' : 'manager' };
    }
  }
  cache.put(key, String(fails + 1), 600);
  return { status: 'error', error: 'code' };
}

// ── Ажилтан өөрөө бүртгүүлэх ── "Хүлээгдэж" төлөвтэй орно, удирдагч баталсны дараа нэвтэрнэ.
function register(d) {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('reg_count') || 0);
  if (n >= 30) return { status: 'error', error: 'busy' };
  const biz = String(d.biz || '').trim();
  const name = String(d.name || '').trim().slice(0, 60);
  const phone = String(d.phone || '').replace(/[^\d+]/g, '').slice(0, 15);
  const code = String(d.code || '').trim();
  const username = String(d.username || '').trim().toLowerCase();
  if (!BIZ_NAMES[biz]) return { status: 'error', error: 'biz' };
  if (!USER_RE.test(username)) return { status: 'error', error: 'user' };
  if (!name || !/^\+?\d{8,12}$/.test(phone)) return { status: 'error', error: 'fields' };
  if (!/^\d{4}$/.test(code)) return { status: 'error', error: 'code' };
  const rows = staffRows();
  if (rows.some(function (s) { return s.username === username; })) return { status: 'error', error: 'user_taken' };
  const sh = staffSheet();
  const id = 'E' + Date.now();
  sh.appendRow([biz, name, code, 'Худалдагч', 'Хүлээгдэж',
    String(d.surname || '').trim().slice(0, 60), phone, String(d.regno || '').trim().slice(0, 12),
    String(d.position || '').trim().slice(0, 40), '', String(d.bank || '').trim().slice(0, 40),
    Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), id, username]);
  cache.put('reg_count', String(n + 1), 3600);
  return { status: 'ok', id: id };
}

// ── Удирдагч: ажилчид + цалин ──
function adminData() {
  const staff = staffRows().map(function (s) {
    const o = Object.assign({}, s); delete o.code; delete o.row; return o;   // кодыг хэзээ ч буцаахгүй
  });
  const sh = salarySheet();
  const last = sh.getLastRow();
  const salary = last >= 2 ? sh.getRange(2, 1, last - 1, SALARY_HEAD.length).getValues().map(function (v) {
    return { id: String(v[0]), date: fmtDate(v[1], 'yyyy-MM-dd'), month: fmtDate(v[2], 'yyyy-MM'), staffId: String(v[3]),
             name: String(v[4]), biz: String(v[5]), kind: String(v[6]), amount: Number(v[7]) || 0, note: String(v[8]) };
  }) : [];
  return { status: 'ok', staff: staff, salary: salary };
}
function adminStaff(d) {
  const sh = staffSheet();
  const s = staffRows().filter(function (x) { return x.id === d.id; })[0];
  if (!s) return { status: 'error', error: 'not_found' };
  const f = d.fields || {};
  const set = function (col, v) { sh.getRange(s.row, col).setValue(v); };
  if (f.status && /^(Тийм|Хүлээгдэж|Үгүй)$/.test(f.status)) set(5, f.status);
  if (f.role && /^(Худалдагч|Менежер|Эзэн)$/.test(f.role)) set(4, f.role);
  if (f.username !== undefined && f.username !== s.username) {
    const u = String(f.username).trim().toLowerCase();
    if (!USER_RE.test(u)) return { status: 'error', error: 'user' };
    if (staffRows().some(function (x) { return x.username === u; })) return { status: 'error', error: 'user_taken' };
    set(14, u);
  }
  if (f.biz && (BIZ_NAMES[f.biz] || f.biz === 'all')) set(1, f.biz);
  if (f.position !== undefined) set(9, String(f.position).slice(0, 40));
  if (f.salary !== undefined) set(10, Number(f.salary) || 0);
  if (f.phone !== undefined) set(7, String(f.phone).slice(0, 15));
  if (f.bank !== undefined) set(11, String(f.bank).slice(0, 40));
  if (f.name) set(2, String(f.name).slice(0, 60));
  if (f.code && /^\d{4,8}$/.test(f.code)) set(3, String(f.code));
  return { status: 'ok' };
}
function adminSalary(d) {
  const e = d.entry || {};
  if (!SALARY_KINDS[e.kind] || !(Number(e.amount) > 0) || !/^\d{4}-\d{2}$/.test(String(e.month))) return { status: 'error', error: 'fields' };
  const s = staffRows().filter(function (x) { return x.id === e.staffId; })[0];
  if (!s) return { status: 'error', error: 'not_found' };
  const id = 'S' + Date.now();
  salarySheet().appendRow([id, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), e.month, s.id, s.name, s.biz,
    e.kind, Number(e.amount), String(e.note || '').slice(0, 120)]);
  return { status: 'ok', id: id };
}

// ── Барааны үлдэгдэл ──
function stockSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_STOCK);
  if (!sh) {
    sh = ss.insertSheet(SHEET_STOCK);
    sh.appendRow(STOCK_HEAD);
    styleHead(sh, STOCK_HEAD.length, '#334155');
    sh.getRange('B:B').setNumberFormat('@');
    sh.hideColumns(11);
    [120, 140, 170, 90, 220, 120, 70, 110, 120, 220].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}
function stockMoves() {
  const sh = stockSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, STOCK_HEAD.length).getValues().map(function (v) {
    return { id: String(v[0]), date: fmtDate(v[1], 'yyyy-MM-dd HH:mm'), loc: String(v[3]), item: String(v[4]).trim(),
             kind: String(v[5]), qty: Number(v[6]) || 0, cost: Number(v[7]) || 0, by: String(v[8]), note: String(v[9]), biz: String(v[10]) };
  });
}
// Бизнес бүрийн бараа тус бүрийн үлдэгдэл: { biz: { item: { shop, wh, cost? } } }.
// Борлуулалтыг тухайн бизнесийн анхны хөдөлгөөний огнооноос хойш л хасна.
// withCost: удирдагчид л жигнэсэн дундаж өртгийг (орлого + эхний үлдэгдлээс) буцаана.
function stockAll(withCost) {
  const out = {}, since = {}, cq = {};
  stockMoves().forEach(function (m) {
    if (!BIZ_NAMES[m.biz] || !m.item) return;
    const b = out[m.biz] = out[m.biz] || {};
    const it = b[m.item] = b[m.item] || { shop: 0, wh: 0 };
    if (m.loc === 'Агуулах') it.wh += m.qty; else it.shop += m.qty;
    if (withCost && m.qty > 0 && m.cost > 0 && (m.kind === 'Орлого' || m.kind === 'Эхний үлдэгдэл')) {
      const k = m.biz + '|' + m.item;
      cq[k] = cq[k] || { q: 0, v: 0 };
      cq[k].q += m.qty; cq[k].v += m.qty * m.cost;
    }
    const d = m.date.slice(0, 16);
    if (!since[m.biz] || d < since[m.biz]) since[m.biz] = d;
  });
  const sheet = logSheet();
  const last = sheet.getLastRow();
  if (last >= 2) {
    sheet.getRange(2, 1, last - 1, LOG_HEAD.length).getValues().forEach(function (v) {
      const biz = String(v[15]);
      if (String(v[16]) !== 'sale' || !out[biz]) return;
      const when = fmtDate(v[1], 'yyyy-MM-dd') + ' ' + fmtDate(v[2], 'HH:mm');
      if (when < since[biz]) return;
      const item = String(v[6]).replace(/ \(буцаалт\)$/, '').trim();
      const it = out[biz][item] = out[biz][item] || { shop: 0, wh: 0 };
      it.shop -= Number(v[7]) || 0;   // буцаалтын тоо сөрөг тул буцааж нэмэгдэнэ
    });
  }
  Object.keys(out).forEach(function (b) { Object.keys(out[b]).forEach(function (k) {
    out[b][k].shop = Math.round(out[b][k].shop * 1000) / 1000; out[b][k].wh = Math.round(out[b][k].wh * 1000) / 1000;
    const c = cq[b + '|' + k];
    if (withCost && c && c.q) out[b][k].cost = Math.round(c.v / c.q);
  }); });
  return out;
}
// Удирдагч: хөдөлгөөн бүртгэх (олноор). Шилжүүлэг = хоёр мөр (−гарах, +орох).
function adminStock(d) {
  const moves = d.moves || [];
  if (!moves.length || moves.length > 1000) return { status: 'error', error: 'fields' };
  const rows = [], now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
  const by = String(d.by || '').slice(0, 40);
  let n = 0;
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const qty = Number(m.qty);
    if (!BIZ_NAMES[m.biz] || !STOCK_KINDS[m.kind] || !STOCK_LOCS[m.loc] || !String(m.item || '').trim() || !isFinite(qty) || qty === 0) {
      return { status: 'error', error: 'fields', index: i };
    }
    const cost = Math.max(0, Number(m.cost) || 0);
    rows.push(['M' + Date.now() + '-' + (n++), now, BIZ_NAMES[m.biz], m.loc, String(m.item).trim().slice(0, 80), m.kind, qty, cost || '', by,
               String(m.note || '').slice(0, 120), m.biz]);
  }
  const sh = stockSheet();
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, STOCK_HEAD.length).setValues(rows);
  return { status: 'ok', saved: rows.length };
}

// ── Туслах ──
function fmtDate(v, f) { return v instanceof Date ? Utilities.formatDate(v, TZ, f) : String(v); }
function staffRows() {
  const sh = staffSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, STAFF_HEAD.length).getValues().map(function (v, i) {
    return {
      row: i + 2, biz: String(v[0]).trim(), name: String(v[1]).trim(), code: String(v[2]).trim().padStart(4, '0'),
      role: /эзэн|owner/i.test(String(v[3])) ? 'Эзэн' : (/менежер|manager/i.test(String(v[3])) ? 'Менежер' : 'Худалдагч'),
      status: /^тийм$/i.test(String(v[4]).trim()) ? 'Тийм' : (/хүлээ/i.test(String(v[4])) ? 'Хүлээгдэж' : 'Үгүй'),
      surname: String(v[5]), phone: String(v[6]), regno: String(v[7]), position: String(v[8]),
      salary: Number(v[9]) || 0, bank: String(v[10]), created: fmtDate(v[11], 'yyyy-MM-dd HH:mm'), id: String(v[12]),
      username: String(v[13] || '').trim().toLowerCase(),
    };
  }).filter(function (s) { return s.name || s.code !== '0000'; });
}
function staffSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_STAFF);
  if (!sh) {
    sh = ss.insertSheet(SHEET_STAFF);
    sh.appendRow(STAFF_HEAD);
    sh.getRange('C:C').setNumberFormat('@');
    const used = {};
    const rnd = function () { let c; do { c = String(1000 + Math.floor(Math.random() * 9000)); } while (used[c]); used[c] = 1; return c; };
    sh.getRange(2, 1, 3, 5).setValues([
      ['meat', 'Менежер (Мах)', rnd(), 'Менежер', 'Тийм'],
      ['cozy', 'Менежер (Cozy)', rnd(), 'Менежер', 'Тийм'],
      ['travel', 'Менежер (Аялал)', rnd(), 'Менежер', 'Тийм'],
    ]);
  }
  // v1.1 → v2.x: нэмэлт баганууд + ажилтан бүрт ID, нэвтрэх нэр
  if (sh.getRange(1, 14).getValue() !== 'Нэвтрэх нэр') {
    sh.getRange(1, 1, 1, STAFF_HEAD.length).setValues([STAFF_HEAD]);
    styleHead(sh, STAFF_HEAD.length, '#2C5A8F');
    sh.getRange('C:C').setNumberFormat('@');
    [200, 160, 110, 170, 190, 140, 110, 110, 140, 120, 160, 140, 130, 140].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  const last = sh.getLastRow();
  if (last >= 2) {
    const ids = sh.getRange(2, 13, last - 1, 1).getValues();
    let changed = false;
    ids.forEach(function (r, i) { if (!r[0]) { r[0] = 'E' + (Date.now() + i); changed = true; } });
    if (changed) sh.getRange(2, 13, last - 1, 1).setValues(ids);
    // нэвтрэх нэргүй мөрүүдэд нэр олгоно
    const known = { 'Менежер (Мах)': 'menejer.mah', 'Менежер (Cozy)': 'menejer.cozy', 'Менежер (Аялал)': 'menejer.ayal' };
    const vals = sh.getRange(2, 1, last - 1, 14).getValues();
    if (vals.some(function (v) { return !String(v[13] || '').trim(); })) {
      const usernames = vals.map(function (v, i) { return [String(v[13] || '').trim() || known[String(v[1]).trim()] || ('ajiltan' + (i + 2))]; });
      sh.getRange(2, 14, last - 1, 1).setValues(usernames);
    }
  }
  // Эзэн (удирдагч) байхгүй бол анхны «admin» эзнийг үүсгэнэ
  const hasOwner = sh.getLastRow() >= 2 && sh.getRange(2, 4, sh.getLastRow() - 1, 1).getValues().some(function (r) { return /эзэн/i.test(String(r[0])); });
  if (!hasOwner) {
    sh.appendRow(['all', 'Эзэн', ADMIN_PIN, 'Эзэн', 'Тийм', '', '', '', 'Удирдагч', '', '',
      Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), 'E' + Date.now(), 'admin']);
  }
  return sh;
}
function salarySheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_SALARY);
  if (!sh) {
    sh = ss.insertSheet(SHEET_SALARY);
    sh.appendRow(SALARY_HEAD);
    styleHead(sh, SALARY_HEAD.length, '#7A5A00');
    sh.getRange('B:C').setNumberFormat('@');
    [120, 100, 80, 130, 160, 90, 110, 110, 240].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}

function data(from) {
  const sheet = logSheet();
  const last = sheet.getLastRow();
  if (last < 2) return { status: 'ok', records: [] };
  const vals = sheet.getRange(2, 1, last - 1, LOG_HEAD.length).getValues();
  const records = [];
  vals.forEach(function (v) {
    const date = fmtDate(v[1], 'yyyy-MM-dd');
    if (from && date < from) return;
    const time = fmtDate(v[2], 'HH:mm');
    const r = { id: v[0], date: date, time: time, biz: v[15], type: v[16], staff: v[5], amount: Number(v[10]) || 0, note: v[14] };
    if (r.type === 'sale') { r.item = v[6]; r.qty = Number(v[7]) || 0; r.unit = v[8]; r.price = Number(v[9]) || 0; r.pay = v[11]; }
    else if (r.type === 'expense') { r.category = v[6]; }
    else { r.counted = Number(v[12]) || 0; r.diff = Number(v[13]) || 0; }
    records.push(r);
  });
  return { status: 'ok', records: records };
}

// "Бараа" хуудас: Бизнес (meat/cozy/travel) | Нэр | Нэгж | Үнэ
// Энд бараа нэмж, үнээ сольвол ажилтны хуудсанд автоматаар гарч ирнэ.
function products(biz) {
  const sheet = prodSheet();
  const last = sheet.getLastRow();
  if (last < 2) return { status: 'ok', products: [] };
  const list = sheet.getRange(2, 1, last - 1, 4).getValues()
    .filter(function (v) { return String(v[0]).trim() === biz && String(v[1]).trim(); })
    .map(function (v) { return { name: String(v[1]).trim(), unit: String(v[2]).trim(), price: Number(v[3]) || 0 }; });
  return { status: 'ok', products: list };
}

// ── Хуудас үүсгэх ──
function logSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_LOG);
  if (!sh) {
    sh = ss.insertSheet(SHEET_LOG);
    sh.appendRow(LOG_HEAD);
    styleHead(sh, LOG_HEAD.length, '#1F4A38');
    sh.getRange('B:C').setNumberFormat('@');     // огноо/цагийг текстээр хадгална
    sh.hideColumns(16, 2);                       // biz, type — системийн багана
    sh.setColumnWidths(1, 15, 110);
    sh.setColumnWidth(4, 180); sh.setColumnWidth(7, 180); sh.setColumnWidth(15, 200);
  }
  return sh;
}
function prodSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_PROD);
  if (!sh) {
    sh = ss.insertSheet(SHEET_PROD);
    sh.appendRow(['Бизнес (meat / cozy / travel)', 'Барааны нэр', 'Нэгж', 'Үнэ']);
    styleHead(sh, 4, '#C8743F');
    [200, 220, 80, 100].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}
function styleHead(sh, n, color) {
  const r = sh.getRange(1, 1, 1, n);
  r.setFontWeight('bold'); r.setBackground(color); r.setFontColor('#ffffff');
  sh.setFrozenRows(1);
}
function existingIds(sheet) {
  const last = sheet.getLastRow();
  const seen = {};
  if (last < 2) return seen;
  sheet.getRange(2, 1, last - 1, 1).getValues().forEach(function (v) { seen[v[0]] = 1; });
  return seen;
}
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Нэг удаа гараар ажиллуулж хуудсуудыг үүсгэнэ (заавал биш)
function setup() { logSheet(); prodSheet(); staffSheet(); salarySheet(); stockSheet(); }
