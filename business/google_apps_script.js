// NOMAAD Бизнесүүд — Google Apps Script v2.0 (ажилчдын бүртгэл, цалин)
// Махны дэлгүүр · Cozy Home Ulaanbaatar · NOMAAD аяллын дэлгүүр
//
// Суулгах: script.google.com дээр шинэ төсөл → энэ кодыг хуулна →
// ADMIN_PIN-ээ сольно → Deploy → New deployment → Web app
// (Execute as: Me, Who has access: Anyone) → гарсан /exec холбоосыг config.js-ийн API_URL-д тавина.

const ADMIN_PIN    = '0000';          // ← удирдагчийн PIN-ээ ЗААВАЛ сольно уу
const SHEET_LOG    = 'Бүртгэл';
const SHEET_PROD   = 'Бараа';
const SHEET_STAFF  = 'Ажилтан';
const SHEET_SALARY = 'Цалин';
const TZ           = 'Asia/Ulaanbaatar';
const SHEET_ID     = '1Hkmo9ttsHfm6xfr49W0BpjkE2nnPPCL0dt2fP6rGyKI';   // NOMAAD Бизнесүүд — Бүртгэл

const BIZ_NAMES = { meat: 'Махны дэлгүүр', cozy: 'Cozy Home Ulaanbaatar', travel: 'NOMAAD аяллын дэлгүүр' };
const TYPE_NAMES = { sale: 'Борлуулалт', expense: 'Зарлага', close: 'Касс хаалт' };
const LOG_HEAD = ['ID', 'Огноо', 'Цаг', 'Бизнес', 'Төрөл', 'Ажилтан', 'Бараа / Ангилал', 'Тоо', 'Нэгж',
                  'Нэгжийн үнэ', 'Дүн', 'Төлбөр', 'Тоолсон бэлэн', 'Зөрүү', 'Тайлбар', 'biz', 'type'];
// "Ажилтан" хуудасны баганууд (эхний 5 нь v1.1-ээс хэвээр)
const STAFF_HEAD = ['Бизнес (meat / cozy / travel / all)', 'Нэр', 'Код (4 орон)', 'Эрх (Худалдагч / Менежер)', 'Идэвхтэй (Тийм / Хүлээгдэж / Үгүй)',
                    'Овог', 'Утас', 'Регистр', 'Албан тушаал', 'Үндсэн цалин', 'Банкны данс', 'Бүртгүүлсэн', 'ID'];
const SALARY_HEAD = ['ID', 'Огноо', 'Сар', 'Ажилтны ID', 'Нэр', 'Бизнес', 'Төрөл', 'Дүн', 'Тайлбар'];
const SALARY_KINDS = { 'Урьдчилгаа': 1, 'Шагнал': 1, 'Суутгал': 1, 'Олгосон': 1 };

// ── Бичих ──
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.type === 'register') return json(register(data));
    if (data.type === 'admin_staff') return json(isAdmin(data) ? adminStaff(data) : { status: 'error', error: 'pin' });
    if (data.type === 'admin_salary') return json(isAdmin(data) ? adminSalary(data) : { status: 'error', error: 'pin' });
    return json(saveRecords(data));
  } catch (err) {
    return json({ status: 'error', error: err.message });
  } finally {
    lock.releaseLock();
  }
}
function isAdmin(data) { return String(data.pin) === ADMIN_PIN; }

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
  else if (p.action === 'login') out = login(p.biz, p.code);
  else if (p.action === 'data') out = String(p.pin) === ADMIN_PIN ? data(p.from) : { status: 'error', error: 'pin' };
  else if (p.action === 'admin') out = String(p.pin) === ADMIN_PIN ? adminData() : { status: 'error', error: 'pin' };
  else out = { status: 'ok', app: 'NOMAAD' };
  const body = JSON.stringify(out);
  if (p.callback) {
    return ContentService.createTextOutput(p.callback + '(' + body + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ── Ажилтны нэвтрэлт ── Кодын жагсаалтыг хэзээ ч буцаахгүй. Зөвхөн "Тийм" төлөвтэй ажилтан нэвтэрнэ.
function login(biz, code) {
  code = String(code || '').trim();
  if (!BIZ_NAMES[biz] || !/^\d{4}$/.test(code)) return { status: 'error', error: 'code' };
  const cache = CacheService.getScriptCache();
  const key = 'fail_' + biz;
  const fails = Number(cache.get(key) || 0);
  if (fails >= 15) return { status: 'error', error: 'locked' };
  const rows = staffRows();
  for (let i = 0; i < rows.length; i++) {
    const s = rows[i];
    if ((s.biz === biz || s.biz === 'all') && s.code === code) {
      if (s.status === 'Хүлээгдэж') return { status: 'error', error: 'pending' };
      if (s.status !== 'Тийм') continue;
      cache.remove(key);
      return { status: 'ok', name: s.name, role: s.role === 'Менежер' ? 'manager' : 'seller' };
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
  if (!BIZ_NAMES[biz]) return { status: 'error', error: 'biz' };
  if (!name || !/^\+?\d{8,12}$/.test(phone)) return { status: 'error', error: 'fields' };
  if (!/^\d{4}$/.test(code)) return { status: 'error', error: 'code' };
  const rows = staffRows();
  if (rows.some(function (s) { return s.code === code && (s.biz === biz || s.biz === 'all' || biz === 'all') && s.status !== 'Үгүй'; })) {
    return { status: 'error', error: 'code_taken' };
  }
  const sh = staffSheet();
  const id = 'E' + Date.now();
  sh.appendRow([biz, name, code, 'Худалдагч', 'Хүлээгдэж',
    String(d.surname || '').trim().slice(0, 60), phone, String(d.regno || '').trim().slice(0, 12),
    String(d.position || '').trim().slice(0, 40), '', String(d.bank || '').trim().slice(0, 40),
    Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), id]);
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
  if (f.role && /^(Худалдагч|Менежер)$/.test(f.role)) set(4, f.role);
  if (f.biz && (BIZ_NAMES[f.biz] || f.biz === 'all')) set(1, f.biz);
  if (f.position !== undefined) set(9, String(f.position).slice(0, 40));
  if (f.salary !== undefined) set(10, Number(f.salary) || 0);
  if (f.phone !== undefined) set(7, String(f.phone).slice(0, 15));
  if (f.bank !== undefined) set(11, String(f.bank).slice(0, 40));
  if (f.name) set(2, String(f.name).slice(0, 60));
  if (f.code && /^\d{4}$/.test(f.code)) {
    const taken = staffRows().some(function (x) { return x.id !== s.id && x.code === f.code && (x.biz === s.biz || x.biz === 'all' || s.biz === 'all') && x.status !== 'Үгүй'; });
    if (taken) return { status: 'error', error: 'code_taken' };
    set(3, f.code);
  }
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

// ── Туслах ──
function fmtDate(v, f) { return v instanceof Date ? Utilities.formatDate(v, TZ, f) : String(v); }
function staffRows() {
  const sh = staffSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, STAFF_HEAD.length).getValues().map(function (v, i) {
    return {
      row: i + 2, biz: String(v[0]).trim(), name: String(v[1]).trim(), code: String(v[2]).trim().padStart(4, '0'),
      role: /менежер|manager/i.test(String(v[3])) ? 'Менежер' : 'Худалдагч',
      status: /^тийм$/i.test(String(v[4]).trim()) ? 'Тийм' : (/хүлээ/i.test(String(v[4])) ? 'Хүлээгдэж' : 'Үгүй'),
      surname: String(v[5]), phone: String(v[6]), regno: String(v[7]), position: String(v[8]),
      salary: Number(v[9]) || 0, bank: String(v[10]), created: fmtDate(v[11], 'yyyy-MM-dd HH:mm'), id: String(v[12]),
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
  // v1.1 → v2.0: нэмэлт баганууд + ажилтан бүрт ID
  if (sh.getRange(1, 13).getValue() !== 'ID') {
    sh.getRange(1, 1, 1, STAFF_HEAD.length).setValues([STAFF_HEAD]);
    styleHead(sh, STAFF_HEAD.length, '#2C5A8F');
    sh.getRange('C:C').setNumberFormat('@');
    [200, 160, 110, 170, 190, 140, 110, 110, 140, 120, 160, 140, 130].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  const last = sh.getLastRow();
  if (last >= 2) {
    const ids = sh.getRange(2, 13, last - 1, 1).getValues();
    let changed = false;
    ids.forEach(function (r, i) { if (!r[0]) { r[0] = 'E' + (Date.now() + i); changed = true; } });
    if (changed) sh.getRange(2, 13, last - 1, 1).setValues(ids);
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
function setup() { logSheet(); prodSheet(); staffSheet(); salarySheet(); }
