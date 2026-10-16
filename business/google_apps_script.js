// NOMAAD Бизнесүүд — Google Apps Script v2.6 (автомат нөөц, он хаах / архив)
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
const SHEET_JOURNAL = 'Журнал';
const SHEET_PARTNER = 'Харилцагч';
const JOURNAL_HEAD = ['ID', 'Огноо', 'Бизнес', 'Дебет', 'Кредит', 'Дүн', 'Харилцагч', 'Гүйлгээний утга', 'Хэн', 'Бүртгэсэн', 'biz', 'Төлөв', 'Баримтын №'];
// Кассын / харилцахын орлого, зарлагын баримт — дугаар компани бүрт тусдаа дараалалтай
const VOUCHERS = { 'КО': 1, 'КЗ': 1, 'ХО': 1, 'ХЗ': 1 };
const PROD_HEAD = ['Бизнес (meat / cozy / travel)', 'Барааны нэр', 'Нэгж', 'Үнэ', 'БҮНА код', 'Ангилал', 'Төлөв'];
const PARTNER_HEAD = ['ID', 'Бизнес', 'Төрөл', 'Нэр', 'ТТД / Регистр', 'Утас', 'Тайлбар', 'biz'];
const TZ           = 'Asia/Ulaanbaatar';
const SHEET_ID     = '1Hkmo9ttsHfm6xfr49W0BpjkE2nnPPCL0dt2fP6rGyKI';   // NOMAAD Бизнесүүд — Бүртгэл

const BIZ_NAMES = { meat: 'Махны дэлгүүр', cozy: 'Cozy Home Ulaanbaatar', travel: 'NOMAAD аяллын дэлгүүр' };
const TYPE_NAMES = { sale: 'Борлуулалт', expense: 'Зарлага', close: 'Касс хаалт' };
const LOG_HEAD = ['ID', 'Огноо', 'Цаг', 'Бизнес', 'Төрөл', 'Ажилтан', 'Бараа / Ангилал', 'Тоо', 'Нэгж',
                  'Нэгжийн үнэ', 'Дүн', 'Төлбөр', 'Тоолсон бэлэн', 'Зөрүү', 'Тайлбар', 'biz', 'type', 'Баримт', 'Төлөв', 'Харилцагч'];
// "Ажилтан" хуудасны баганууд (эхний 5 нь v1.1-ээс хэвээр)
const STAFF_HEAD = ['Бизнес (meat / cozy / travel / all)', 'Нэр', 'Код (4 орон)', 'Эрх (Худалдагч / Менежер)', 'Идэвхтэй (Тийм / Хүлээгдэж / Үгүй)',
                    'Овог', 'Утас', 'Регистр', 'Албан тушаал', 'Үндсэн цалин', 'Банкны данс', 'Бүртгүүлсэн', 'ID', 'Нэвтрэх нэр'];
const USER_RE = /^[a-z0-9._]{3,20}$/;
const TOKEN_TTL = 8 * 3600;   // удирдагчийн нэвтрэлт 8 цаг
const SALARY_HEAD = ['ID', 'Огноо', 'Сар', 'Ажилтны ID', 'Нэр', 'Бизнес', 'Төрөл', 'Дүн', 'Тайлбар'];
const SALARY_KINDS = { 'Урьдчилгаа': 1, 'Шагнал': 1, 'Суутгал': 1, 'Олгосон': 1 };
// Үлдэгдлийн хөдөлгөөн: тоо + (нэмэгдэх) / − (хасагдах). Борлуулалт «Бүртгэл»-ээс автоматаар хасагдана.
const STOCK_HEAD = ['ID', 'Огноо', 'Бизнес', 'Байршил', 'Бараа', 'Төрөл', 'Тоо', 'Нэгж өртөг', 'Хэн', 'Тайлбар', 'biz', 'Төлбөр', 'Харилцагч', 'Төлөв'];
// «Он нээлт» — он хаахад өмнөх оны эцсийн үлдэгдлийг шинэ оны эхэнд шилжүүлсэн мөр (санхүүд дахин бичигдэхгүй)
const STOCK_KINDS = { 'Эхний үлдэгдэл': 1, 'Орлого': 1, 'Шилжүүлэг': 1, 'Тооллого': 1, 'Хасалт': 1, 'Он нээлт': 1 };
const BACKUP_FOLDER = 'NOMAAD Бизнесүүд — нөөц';
const BACKUP_KEEP = 12;   // автомат нөөцийн сүүлийн 12 хуулбарыг хадгална (архивыг хэзээ ч устгахгүй)
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
    if (data.type === 'admin_journal') return json(isAdmin(data) ? adminJournal(data) : { status: 'error', error: 'auth' });
    if (data.type === 'admin_backup') return json(isAdmin(data) ? adminBackup() : { status: 'error', error: 'auth' });
    if (data.type === 'admin_close') return json(isAdmin(data) ? adminClose(data) : { status: 'error', error: 'auth' });
    if (data.type === 'admin_product') return json(isAdmin(data) ? adminProduct(data) : { status: 'error', error: 'auth' });
    if (data.type === 'admin_record') return json(isAdmin(data) ? adminRecord(data) : { status: 'error', error: 'auth' });
    if (data.type === 'admin_partner') return json(isAdmin(data) ? adminPartner(data) : { status: 'error', error: 'auth' });
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
  a.moves = stockMoves();
  a.journal = journalRows();
  a.partners = partnerRows();
  const pr = PropertiesService.getScriptProperties();
  a.meta = { closed: pr.getProperty('CLOSED') || '', lastBackup: pr.getProperty('LAST_BACKUP') || '', backupUrl: pr.getProperty('BACKUP_FOLDER_URL') || '' };
  a.products = productRows().map(function (p) { const o = Object.assign({}, p); delete o.row; return o; });
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
      r.note || '', r.biz, r.type, String(r.bill || '').slice(0, 40), '', String(r.customer || '').slice(0, 80),
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
  // «Бүх дэлгүүр»-ийн ажилтны цалинг аль компанийн зардал болохыг заана
  const biz = s.biz === 'all' ? String(e.biz || '') : s.biz;
  if (!BIZ_NAMES[biz]) return { status: 'error', error: 'biz' };
  const id = 'S' + Date.now();
  salarySheet().appendRow([id, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), e.month, s.id, s.name, biz,
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
  if (sh.getRange(1, 14).getValue() !== 'Төлөв') sh.getRange(1, 1, 1, STOCK_HEAD.length).setValues([STOCK_HEAD]);
  return sh;
}
function stockMoves() {
  const sh = stockSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, STOCK_HEAD.length).getValues().map(function (v) {
    return { id: String(v[0]), date: fmtDate(v[1], 'yyyy-MM-dd HH:mm'), loc: String(v[3]), item: String(v[4]).trim(),
             kind: String(v[5]), qty: Number(v[6]) || 0, cost: Number(v[7]) || 0, by: String(v[8]), note: String(v[9]), biz: String(v[10]),
             pay: String(v[11] || ''), partner: String(v[12] || ''), status: String(v[13] || '') };
  }).filter(function (m) { return m.status !== 'Устгасан'; });
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
    if (withCost && m.qty > 0 && m.cost > 0 && (m.kind === 'Орлого' || m.kind === 'Эхний үлдэгдэл' || m.kind === 'Он нээлт')) {
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
      if (String(v[16]) !== 'sale' || !out[biz] || String(v[18]) === 'Устгасан') return;
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
  if (d.cancelId) return cancelRow(stockSheet(), d.cancelId, 14);   // буруу хөдөлгөөнийг цуцлах (мөр үлдэнэ)
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
    const pay = /^(Бэлэн|Харилцах|Зээлээр)$/.test(String(m.pay || '')) ? m.pay : '';
    rows.push(['M' + Date.now() + '-' + (n++), now, BIZ_NAMES[m.biz], m.loc, String(m.item).trim().slice(0, 80), m.kind, qty, cost || '', by,
               String(m.note || '').slice(0, 120), m.biz, pay, String(m.partner || '').slice(0, 80), '']);
  }
  const sh = stockSheet();
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, STOCK_HEAD.length).setValues(rows);
  return { status: 'ok', saved: rows.length };
}

// ── Санхүү: гар журналын бичилт (эхний үлдэгдэл, хөрөнгө оруулалт, зээл, төлбөр төлөх г.м) ──
// Борлуулалт/зарлага/бараа/цалингийн журналыг баримтаас автоматаар тооцдог тул энд хадгалахгүй.
function journalSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_JOURNAL);
  if (!sh) {
    sh = ss.insertSheet(SHEET_JOURNAL);
    sh.appendRow(JOURNAL_HEAD);
    styleHead(sh, JOURNAL_HEAD.length, '#1E3A5F');
    sh.getRange('B:B').setNumberFormat('@'); sh.getRange('D:E').setNumberFormat('@');
    sh.hideColumns(11);
    [120, 100, 170, 90, 90, 120, 160, 260, 110, 140, 60, 80].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  if (sh.getRange(1, 13).getValue() !== 'Баримтын №') sh.getRange(1, 1, 1, JOURNAL_HEAD.length).setValues([JOURNAL_HEAD]);
  return sh;
}
function journalRows() {
  const sh = journalSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, JOURNAL_HEAD.length).getValues().map(function (v) {
    return { id: String(v[0]), date: fmtDate(v[1], 'yyyy-MM-dd'), dr: String(v[3]), cr: String(v[4]), amount: Number(v[5]) || 0,
             partner: String(v[6]), desc: String(v[7]), by: String(v[8]), biz: String(v[10]), status: String(v[11] || ''), no: String(v[12] || '') };
  }).filter(function (j) { return j.status !== 'Устгасан'; });
}
function adminJournal(d) {
  const e = d.entry || {};
  if (d.cancelId) {   // буруу бичилтийг «Устгасан» төлөвтэй болгоно (мөр устгахгүй)
    const sh = journalSheet(), last = sh.getLastRow();
    const ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(d.cancelId)) { sh.getRange(i + 2, 12).setValue('Устгасан'); return { status: 'ok' }; }
    return { status: 'error', error: 'not_found' };
  }
  const amt = Number(e.amount);
  if (!BIZ_NAMES[e.biz] || !/^\d{4}-\d{2}-\d{2}$/.test(String(e.date)) || !/^\d{4,6}$/.test(String(e.dr)) || !/^\d{4,6}$/.test(String(e.cr)) ||
      e.dr === e.cr || !(amt > 0)) return { status: 'error', error: 'fields' };
  const id = 'J' + Date.now(), sh = journalSheet();
  let no = '';
  if (VOUCHERS[e.vkind]) {   // КО-0001 гэх мэт дараалсан дугаар (цуцалсан баримтын дугаар дахин олгогдохгүй)
    const last = sh.getLastRow();
    const rows = last >= 2 ? sh.getRange(2, 1, last - 1, JOURNAL_HEAD.length).getValues() : [];
    const n = rows.filter(function (v) { return String(v[10]) === e.biz && String(v[12]).indexOf(e.vkind + '-') === 0; }).length + 1;
    no = e.vkind + '-' + ('000' + n).slice(-4);
  }
  sh.appendRow([id, e.date, BIZ_NAMES[e.biz], String(e.dr), String(e.cr), amt, String(e.partner || '').slice(0, 80),
    String(e.desc || '').slice(0, 200), String(d.by || '').slice(0, 40), Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), e.biz, '', no]);
  return { status: 'ok', id: id, no: no };
}
function partnerSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_PARTNER);
  if (!sh) {
    sh = ss.insertSheet(SHEET_PARTNER);
    sh.appendRow(PARTNER_HEAD);
    styleHead(sh, PARTNER_HEAD.length, '#475569');
    sh.hideColumns(8);
    [120, 170, 120, 220, 130, 110, 240].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}
function partnerRows() {
  const sh = partnerSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, PARTNER_HEAD.length).getValues().map(function (v) {
    return { id: String(v[0]), kind: String(v[2]), name: String(v[3]), tin: String(v[4]), phone: String(v[5]), note: String(v[6]), biz: String(v[7]) };
  });
}
function adminPartner(d) {
  const p = d.partner || {};
  if (!BIZ_NAMES[p.biz] || !/^(Нийлүүлэгч|Худалдан авагч)$/.test(String(p.kind)) || !String(p.name || '').trim()) return { status: 'error', error: 'fields' };
  const id = 'P' + Date.now();
  partnerSheet().appendRow([id, BIZ_NAMES[p.biz], p.kind, String(p.name).trim().slice(0, 80), String(p.tin || '').slice(0, 20),
    String(p.phone || '').slice(0, 20), String(p.note || '').slice(0, 120), p.biz]);
  return { status: 'ok', id: id };
}

// Удирдагч: ажилтны буруу бичлэгийг цуцлах. И-баримттай борлуулалтыг энд цуцлахгүй — дэлгүүрээс «Баримт буцаах»-аар.
function adminRecord(d) {
  const sh = logSheet(), last = sh.getLastRow();
  if (last < 2 || !d.cancelId) return { status: 'error', error: 'not_found' };
  const vals = sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) !== String(d.cancelId)) continue;
    if (String(vals[i][16]) === 'sale' && /ДДТД/.test(String(vals[i][14]))) return { status: 'error', error: 'ebarimt' };
    sh.getRange(i + 2, 19).setValue('Устгасан');
    sh.getRange(i + 2, 15).setValue(String(vals[i][14] || '') + ' [цуцалсан: ' + String(d.by || '').slice(0, 30) + ']');
    return { status: 'ok' };
  }
  return { status: 'error', error: 'not_found' };
}
function cancelRow(sh, id, col) {
  const last = sh.getLastRow();
  const ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) { sh.getRange(i + 2, col).setValue('Устгасан'); return { status: 'ok' }; }
  return { status: 'error', error: 'not_found' };
}

// ═══════════ НӨӨЦ ХУУЛБАР (AI-гүйгээр өөрөө ажиллана) ═══════════
// installBackup()-ийг редактороос НЭГ удаа ажиллуулахад долоо хоног бүрийн Даваа гарагт Sheet-ийг бүтнээр нь хуулна.
function installBackup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'weeklyBackup') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('weeklyBackup').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(3).create();
  return weeklyBackup();
}
function weeklyBackup() { return backupCopy('NOMAAD нөөц ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), true); }
function backupFolder() {
  const it = DriveApp.getFoldersByName(BACKUP_FOLDER);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER);
  PropertiesService.getScriptProperties().setProperty('BACKUP_FOLDER_URL', f.getUrl());
  return f;
}
// rotate = true бол хуучин автомат нөөцийг (сүүлийн BACKUP_KEEP-ээс бусдыг) хогийн сав руу (30 хоног сэргээх боломжтой)
function backupCopy(name, rotate) {
  const folder = backupFolder();
  const copy = DriveApp.getFileById(SHEET_ID).makeCopy(name, folder);
  PropertiesService.getScriptProperties().setProperty('LAST_BACKUP', Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'));
  if (rotate) {
    const files = [], it = folder.getFiles();
    while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf('NOMAAD нөөц ') === 0) files.push(f); }
    files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
    files.slice(BACKUP_KEEP).forEach(function (f) { f.setTrashed(true); });
  }
  return copy;
}
function adminBackup() {
  const c = backupCopy('NOMAAD нөөц ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm') + ' (гараар)', true);
  return { status: 'ok', url: c.getUrl(), name: c.getName() };
}

// ═══════════ ОН ХААХ / АРХИВ ═══════════
// 1) Бүтэн хуулбарыг архив болгон хадгална  2) хаасан оны мөрүүдийг үндсэн Sheet-ээс хасна
// 3) оны эцсийн дансны үлдэгдэл, барааны үлдэгдлийг шинэ оны 1-р сарын 1-нд «Он нээлт» болгон бичнэ.
// Үлдэгдлийн тооцоог удирдлагын самбар (reports.js) гаргаж ирүүлнэ; энд зөвхөн шалгаж бичнэ.
function adminClose(d) {
  const y = String(d.year || '');
  if (!/^\d{4}$/.test(y)) return { status: 'error', error: 'year' };
  if (y >= Utilities.formatDate(new Date(), TZ, 'yyyy')) return { status: 'error', error: 'year' };   // зөвхөн өнгөрсөн он
  const props = PropertiesService.getScriptProperties();
  const end = y + '-12-31', start = (Number(y) + 1) + '-01-01';
  if ((props.getProperty('CLOSED') || '') >= end) return { status: 'error', error: 'closed' };
  const open = d.open || [], stock = d.stock || [];
  for (let i = 0; i < open.length; i++) {
    const e = open[i];
    if (!BIZ_NAMES[e.biz] || !/^\d{4,6}$/.test(String(e.dr)) || !/^\d{4,6}$/.test(String(e.cr)) || !(Number(e.amount) > 0)) return { status: 'error', error: 'fields', index: i };
  }
  for (let i = 0; i < stock.length; i++) {
    const m = stock[i];
    if (!BIZ_NAMES[m.biz] || !STOCK_LOCS[m.loc] || !String(m.item || '').trim() || !isFinite(Number(m.qty)) || !Number(m.qty)) return { status: 'error', error: 'fields', index: i };
  }
  const copy = backupCopy('NOMAAD архив ' + y + ' (он хаахаас өмнөх бүрэн хуулбар)', false);
  const removed = {
    records: pruneSheet(logSheet(), LOG_HEAD.length, end),
    moves: pruneSheet(stockSheet(), STOCK_HEAD.length, end),
    journal: pruneSheet(journalSheet(), JOURNAL_HEAD.length, end),
    salary: pruneSheet(salarySheet(), SALARY_HEAD.length, end),
  };
  const by = String(d.by || '').slice(0, 40), now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
  if (open.length) {
    const rows = open.map(function (e, i) {
      return ['J' + Date.now() + '-' + i, start, BIZ_NAMES[e.biz], String(e.dr), String(e.cr), Number(e.amount), String(e.partner || '').slice(0, 80),
        ('Он нээлт ' + start.slice(0, 4) + ' · ' + String(e.desc || '')).slice(0, 200), by, now, e.biz, '', ''];
    });
    const sh = journalSheet();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, JOURNAL_HEAD.length).setValues(rows);
  }
  if (stock.length) {
    const rows = stock.map(function (m, i) {
      return ['M' + Date.now() + '-o' + i, start + ' 00:00', BIZ_NAMES[m.biz], m.loc, String(m.item).trim().slice(0, 80), 'Он нээлт', Number(m.qty),
        Math.max(0, Math.round((Number(m.cost) || 0) * 100) / 100) || '', by, y + ' оны эцсийн үлдэгдэл', m.biz, '', '', ''];
    });
    const sh = stockSheet();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, STOCK_HEAD.length).setValues(rows);
  }
  props.setProperty('CLOSED', end);
  return { status: 'ok', archive: copy.getUrl(), removed: removed, opened: { journal: open.length, stock: stock.length } };
}
// Огноо (2-р багана) нь «end»-ээс хойшхи мөрүүдийг л үлдээнэ (нэг дор дахин бичнэ — мөр мөрөөр устгахаас хурдан)
function pruneSheet(sh, width, end) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const rng = sh.getRange(2, 1, last - 1, width), vals = rng.getValues();
  const keep = vals.filter(function (v) { return fmtDate(v[1], 'yyyy-MM-dd').slice(0, 10) > end; });
  const n = vals.length - keep.length;
  if (!n) return 0;
  rng.clearContent();
  if (keep.length) sh.getRange(2, 1, keep.length, width).setValues(keep);
  return n;
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
    if (String(v[18]) === 'Устгасан') return;
    const time = fmtDate(v[2], 'HH:mm');
    const r = { id: v[0], date: date, time: time, biz: v[15], type: v[16], staff: v[5], amount: Number(v[10]) || 0, note: v[14] };
    if (r.type === 'sale') { r.item = v[6]; r.qty = Number(v[7]) || 0; r.unit = v[8]; r.price = Number(v[9]) || 0; r.pay = v[11]; r.bill = String(v[17] || ''); r.customer = String(v[19] || ''); }
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
  const list = productRows().filter(function (p) { return p.biz === biz; })
    .map(function (p) { return { name: p.name, unit: p.unit, price: p.price, cls: p.cls, cat: p.cat, off: p.off }; });
  return { status: 'ok', products: list };
}
function productRows() {
  const sh = prodSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, PROD_HEAD.length).getValues().map(function (v, i) {
    return { row: i + 2, biz: String(v[0]).trim(), name: String(v[1]).trim(), unit: String(v[2]).trim(), price: Number(v[3]) || 0,
             cls: String(v[4] || '').trim(), cat: String(v[5] || '').trim(), off: String(v[6]).trim() === 'Идэвхгүй' };
  }).filter(function (p) { return p.name; });
}
// Удирдагч: бараа нэмэх / засах (нэрээр нь олно). Үнэ, нэгж, ангилал, БҮНА, идэвхтэй эсэх.
function adminProduct(d) {
  const p = d.product || {};
  const name = String(p.name || '').trim().slice(0, 80);
  if (!BIZ_NAMES[p.biz] || !name || !(Number(p.price) >= 0) || (p.cls && !/^\d{7}$/.test(String(p.cls)))) return { status: 'error', error: 'fields' };
  const row = [p.biz, name, String(p.unit || '').slice(0, 10), Number(p.price) || 0, String(p.cls || ''), String(p.cat || '').slice(0, 40), p.off ? 'Идэвхгүй' : 'Идэвхтэй'];
  const sh = prodSheet();
  const cur = productRows().filter(function (x) { return x.biz === p.biz && x.name.toLowerCase() === name.toLowerCase(); })[0];
  if (cur) sh.getRange(cur.row, 1, 1, PROD_HEAD.length).setValues([row]);
  else sh.appendRow(row);
  return { status: 'ok' };
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
  if (sh.getRange(1, 20).getValue() !== 'Харилцагч') sh.getRange(1, 1, 1, LOG_HEAD.length).setValues([LOG_HEAD]);   // v2.4–2.5: Баримт, Төлөв, Харилцагч
  return sh;
}
function prodSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_PROD);
  if (!sh) {
    sh = ss.insertSheet(SHEET_PROD);
    sh.appendRow(PROD_HEAD);
    styleHead(sh, PROD_HEAD.length, '#C8743F');
    [200, 220, 80, 100].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  if (sh.getRange(1, 7).getValue() !== 'Төлөв') { sh.getRange(1, 1, 1, PROD_HEAD.length).setValues([PROD_HEAD]); styleHead(sh, PROD_HEAD.length, '#C8743F'); }
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
function setup() { logSheet(); prodSheet(); staffSheet(); salarySheet(); stockSheet(); journalSheet(); partnerSheet(); }
