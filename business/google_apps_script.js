// NOMAAD Бизнесүүд — Google Apps Script v1.0
// Махны дэлгүүр · Cozy Home Ulaanbaatar · NOMAAD аяллын дэлгүүр
//
// Суулгах: шинэ Google Sheet → Extensions → Apps Script → энэ кодыг хуулна →
// ADMIN_PIN-ээ сольно → Deploy → New deployment → Web app
// (Execute as: Me, Who has access: Anyone) → гарсан /exec холбоосыг config.js-ийн API_URL-д тавина.

const ADMIN_PIN   = '0000';          // ← удирдагчийн PIN-ээ ЗААВАЛ сольно уу
const SHEET_LOG   = 'Бүртгэл';
const SHEET_PROD  = 'Бараа';
const TZ          = 'Asia/Ulaanbaatar';

const BIZ_NAMES = { meat: 'Махны дэлгүүр', cozy: 'Cozy Home Ulaanbaatar', travel: 'NOMAAD аяллын дэлгүүр' };
const TYPE_NAMES = { sale: 'Борлуулалт', expense: 'Зарлага', close: 'Касс хаалт' };
const LOG_HEAD = ['ID', 'Огноо', 'Цаг', 'Бизнес', 'Төрөл', 'Ажилтан', 'Бараа / Ангилал', 'Тоо', 'Нэгж',
                  'Нэгжийн үнэ', 'Дүн', 'Төлбөр', 'Тоолсон бэлэн', 'Зөрүү', 'Тайлбар', 'biz', 'type'];

// ── Бичих (ажилтны хуудаснаас) ──
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
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
    return json({ status: 'ok', saved: rows.length });
  } catch (err) {
    return json({ status: 'error', error: err.message });
  } finally {
    lock.releaseLock();
  }
}

// ── Унших (JSONP) ──
function doGet(e) {
  const p = e.parameter || {};
  let out;
  if (p.action === 'products') out = products(p.biz);
  else if (p.action === 'data') out = String(p.pin) === ADMIN_PIN ? data(p.from) : { status: 'error', error: 'pin' };
  else out = { status: 'ok', app: 'NOMAAD Бизнесүүд' };
  const body = JSON.stringify(out);
  if (p.callback) {
    return ContentService.createTextOutput(p.callback + '(' + body + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function data(from) {
  const sheet = logSheet();
  const last = sheet.getLastRow();
  if (last < 2) return { status: 'ok', records: [] };
  const vals = sheet.getRange(2, 1, last - 1, LOG_HEAD.length).getValues();
  const records = [];
  vals.forEach(function (v) {
    const date = v[1] instanceof Date ? Utilities.formatDate(v[1], TZ, 'yyyy-MM-dd') : String(v[1]);
    if (from && date < from) return;
    const time = v[2] instanceof Date ? Utilities.formatDate(v[2], TZ, 'HH:mm') : String(v[2]);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_PROD);
  if (!sh) {
    sh = ss.insertSheet(SHEET_PROD);
    sh.appendRow(['Бизнес (meat / cozy / travel)', 'Барааны нэр', 'Нэгж', 'Үнэ']);
    styleHead(sh, 4, '#C8743F');
    sh.getRange(2, 1, 6, 4).setValues([
      ['meat', 'Үхрийн мах', 'кг', 22000],
      ['meat', 'Хонины мах', 'кг', 18000],
      ['meat', 'Ямааны мах', 'кг', 16000],
      ['meat', 'Адууны мах', 'кг', 20000],
      ['cozy', 'Бараа 1', 'ш', 0],
      ['travel', 'Майхан', 'ш', 0],
    ]);
    sh.setColumnWidths(1, 4, [200, 220, 80, 100]);
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
function setup() { logSheet(); prodSheet(); }
