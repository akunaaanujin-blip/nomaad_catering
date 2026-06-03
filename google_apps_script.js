// ═══════════════════════════════════════════════════════
//  NOMAAD Catering — Google Apps Script  v2.0
//  2 sheet: "Захиалга" (харилцагч) + "Тооцоо" (тогооч)
//
//  ТОХИРГОО:
//  1. sheets.google.com → "NOMAAD Catering — Захиалга" хүснэгтийг нээ
//  2. Extensions → Apps Script → доорх кодыг БҮГДИЙГ буулга
//  3. Deploy → New deployment → Web app
//     • Execute as: Me
//     • Who has access: Anyone
//  4. Deploy → URL-г хуулж index.html болон kitchen.html-д
//     SHEETS_URL гэдэг хэсэгт тавь
// ═══════════════════════════════════════════════════════

const SHEET_ORDERS = 'Захиалга';     // харилцагчийн захиалга
const SHEET_CALC   = 'Тооцоо';       // тогооч/удирдагчийн тооцоо

// ── POST: захиалга эсвэл тооцоо хадгалах ──────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'order') {
      saveOrder(ss, data);
    } else {
      saveCalc(ss, data);
    }

    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', error: err.message });
  }
}

// ── GET: захиалгуудыг буцаах ──────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'orders') {
      const ss    = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_ORDERS);
      if (!sheet || sheet.getLastRow() < 2) return json({ orders: [] });

      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
      const orders = rows.map((r, i) => ({
        id:        i + 1,
        огноо:     r[0] ? Utilities.formatDate(new Date(r[0]), 'Asia/Ulaanbaatar', 'yyyy-MM-dd') : '',
        байгууллага: r[1],
        нэр:       r[2],
        утас:      r[3],
        арга_хэмжээний_огноо: r[4] ? Utilities.formatDate(new Date(r[4]), 'Asia/Ulaanbaatar', 'yyyy-MM-dd') : '',
        хүн:       r[5],
        үйлчилгээ: r[6],
        тэмдэглэл: r[7],
        статус:    r[8] || 'Шинэ',
        бүртгэсэн: r[9] || '',
      }));

      return json({ orders: orders.reverse() }); // Шинэ дээр
    }
    return json({ status: 'ok', message: 'NOMAAD Catering API v2' });
  } catch (err) {
    return json({ status: 'error', error: err.message });
  }
}

// ── Захиалга хадгалах ──────────────────────────────────
function saveOrder(ss, data) {
  let sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ORDERS);
    const h = ['Бүртгэсэн огноо', 'Байгууллага', 'Нэр', 'Утас',
                'Арга хэмжээний огноо', 'Хүн', 'Үйлчилгээ', 'Тэмдэглэл', 'Статус', 'Тайлбар'];
    sheet.appendRow(h);
    styleHeader(sheet, h.length, '#1F4A38');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 10, [120,160,120,110,140,60,160,200,90,160]);
  }
  sheet.appendRow([
    new Date(),
    data.байгууллага,
    data.нэр,
    data.утас,
    data.арга_хэмжээний_огноо || '',
    Number(data.хүн) || '',
    data.үйлчилгээ,
    data.тэмдэглэл || '',
    'Шинэ',
    '',
  ]);
}

// ── Тооцоо хадгалах ───────────────────────────────────
function saveCalc(ss, data) {
  let sheet = ss.getSheetByName(SHEET_CALC);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CALC);
    const h = ['Огноо', 'Захиалагч', 'Арга хэмжээ', 'Үйлчилгээ',
                'Хүн', 'Идэх хандлага', 'Мах өртөг ₮', 'Дагалдах өртөг ₮',
                'Нийт өртөг ₮', 'Нэг хүний өртөг ₮', 'Тэмдэглэл'];
    sheet.appendRow(h);
    styleHeader(sheet, h.length, '#2E6049');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    data.огноо, data.захиалагч, data.арга_хэмжээ, data.үйлчилгээ,
    Number(data.хүн), data.идэх_хандлага,
    Number(data.мах_өртөг), Number(data.дагалдах_өртөг),
    Number(data.нийт_өртөг), Number(data.нэг_хүний_өртөг),
    data.тэмдэглэл || '',
  ]);
}

// ── Туслах функцүүд ────────────────────────────────────
function styleHeader(sheet, cols, bg) {
  const r = sheet.getRange(1, 1, 1, cols);
  r.setFontWeight('bold');
  r.setBackground(bg);
  r.setFontColor('#ffffff');
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
