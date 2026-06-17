// NOMAAD Catering — Google Apps Script v2.6 (хоол дуусгах төлөв бүх төхөөрөмжид sync)
const SHEET_ORDERS   = 'Захиалга';
const SHEET_CALC     = 'Тооцоо';
const SHEET_EXPENSE  = 'Ажилтны хоол зарлага';
const SHEET_REQUESTS = 'Худалдан авах хүсэлт';
const SHEET_DONE     = 'Хоол дууссан';     // тогоочийн дуусгасан хоолны төлөв (бүх төхөөрөмжид нийтлэг)
const STOCK_GID      = 1696013893;   // Худалдан авалт / нөөцийн хуудас

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    if (data.type === 'order') saveOrder(ss, data);
    else if (data.type === 'expense') saveExpense(ss, data);
    else if (data.type === 'purchase') savePurchase(ss, data);
    else if (data.type === 'request') saveRequest(ss, data);
    else if (data.type === 'request_update') updateRequest(ss, data);
    else if (data.type === 'dishdone') saveDishDone(ss, data);
    else saveCalc(ss, data);
    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', error: err.message });
  }
}

// Хоол дуусгасан/буцаасан төлөвийг бүртгэнэ (dkey бүрд нэг мөр — upsert)
function saveDishDone(ss, data) {
  let sheet = ss.getSheetByName(SHEET_DONE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DONE);
    const h = ['dkey', 'Дууссан', 'Огноо', 'Хэн'];
    sheet.appendRow(h);
    const hr = sheet.getRange(1, 1, 1, h.length);
    hr.setFontWeight('bold'); hr.setBackground('#1F4A38'); hr.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 4, [260, 80, 140, 110]);
  }
  const dkey = String(data.dkey || '');
  if (!dkey) return;
  const done = (data.done == 1 || data.done === '1' || data.done === true) ? 1 : 0;
  const last = sheet.getLastRow();
  if (last >= 2) {
    const keys = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === dkey) {
        sheet.getRange(i + 2, 2, 1, 3).setValues([[done, new Date(), data.by || '']]);
        return;
      }
    }
  }
  sheet.appendRow([dkey, done, new Date(), data.by || '']);
}

// Тогоочийн нэмэлт хүнсний хүсэлтийг бүртгэнэ
function saveRequest(ss, data) {
  let sheet = ss.getSheetByName(SHEET_REQUESTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_REQUESTS);
    const h = ['ID','Огноо','Бараа','Тоо','Нэгж','Хүсэлт гаргасан','Статус','Тэмдэглэл'];
    sheet.appendRow(h);
    const hr = sheet.getRange(1, 1, 1, h.length);
    hr.setFontWeight('bold'); hr.setBackground('#C8743F'); hr.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 8, [120, 130, 180, 60, 70, 130, 120, 200]);
  }
  sheet.appendRow([
    String(data.id || Date.now()),
    data.date || '',
    data.material || '',
    Number(data.qty) || '',
    data.unit || '',
    data.by || '',
    data.status || 'Хүлээгдэж буй',
    data.note || '',
  ]);
}

// Хүсэлтийн статусыг (Зөвшөөрсөн/Татгалзсан) шинэчилнэ
function updateRequest(ss, data) {
  const sheet = ss.getSheetByName(SHEET_REQUESTS);
  if (!sheet || sheet.getLastRow() < 2) return;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(data.id)) {
      sheet.getRange(i + 2, 7).setValue(data.status || '');
      if (data.note != null) sheet.getRange(i + 2, 8).setValue(data.note);
      return;
    }
  }
}

// gid-ээр хуудас олох
function getSheetByGid(ss, gid) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) return sheets[i];
  }
  return null;
}

// Шинээр авсан бараа материалыг нөөцийн хуудас руу нэмнэ
// Багана: №(A) | Огноо(B) | Материал(C) | Хэмжих нэгж(D) | Тоо(E) | Нэгжийн үнэ(F) | Нийт дүн(G)
function savePurchase(ss, data) {
  const sheet = getSheetByGid(ss, STOCK_GID);
  if (!sheet) throw new Error('Нөөцийн хуудас (gid ' + STOCK_GID + ') олдсонгүй');
  const qty   = Number(data.qty) || 0;
  const price = Number(data.price) || 0;
  const num   = sheet.getLastRow();   // дараагийн дугаар (толгой мөртэй тооцвол)
  sheet.appendRow([
    num,
    data.date || '',
    data.material || '',
    data.unit || '',
    qty,
    price,
    qty * price,
  ]);
}

function doGet(e) {
  try {
    const action   = e.parameter.action;
    const callback = e.parameter.callback;

    if (action === 'orders') {
      const ss    = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_ORDERS);

      if (!sheet || sheet.getLastRow() < 2) {
        return respond({ orders: [] }, callback);
      }

      const lastCol = Math.max(sheet.getLastColumn(), 12);
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
      const orders = rows.map((r, i) => {
        // col 5 (r[4]): огноо+цаг — Date object эсвэл string аль ч байж болно
        let dt = '';
        if (r[4]) {
          try {
            dt = Utilities.formatDate(r[4], 'Asia/Ulaanbaatar', 'yyyy-MM-dd HH:mm');
          } catch(e) {
            dt = String(r[4]);
          }
        }
        return {
          id:                   i + 1,
          огноо:                r[0] ? Utilities.formatDate(new Date(r[0]), 'Asia/Ulaanbaatar', 'yyyy-MM-dd HH:mm') : '',
          байгууллага:          r[1] || '',
          нэр:                  r[2] || '',
          утас:                 r[3] || '',
          арга_хэмжээний_огноо: dt,
          хүн:                  r[5] || '',
          үйлчилгээ:            r[6] || '',
          тэмдэглэл:            r[7] || '',
          статус:               r[8] || 'Шинэ',
          тайлбар:              r[9] || '',
          арга_хэмжээ:          r[10] || '',
          байршил:              r[11] || '',
        };
      });

      return respond({ orders: orders.reverse() }, callback);
    }

    if (action === 'requests') {
      const ss    = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_REQUESTS);
      if (!sheet || sheet.getLastRow() < 2) return respond({ requests: [] }, callback);
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
      const requests = rows.map(r => ({
        id:        String(r[0]),
        огноо:     r[1] ? (function(){ try { return Utilities.formatDate(new Date(r[1]), 'Asia/Ulaanbaatar', 'yyyy-MM-dd HH:mm'); } catch(e){ return String(r[1]); } })() : '',
        материал:  r[2] || '',
        тоо:       r[3] || '',
        нэгж:      r[4] || '',
        хүсэгч:    r[5] || '',
        статус:    r[6] || 'Хүлээгдэж буй',
        тэмдэглэл: r[7] || '',
      })).filter(x => x.материал);
      return respond({ requests: requests.reverse() }, callback);
    }

    if (action === 'dishdone') {
      const ss    = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_DONE);
      if (!sheet || sheet.getLastRow() < 2) return respond({ done: [] }, callback);
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
      const done = rows.filter(r => r[0]).map(r => ({ dkey: String(r[0]), done: (Number(r[1]) === 1 ? 1 : 0) }));
      return respond({ done: done }, callback);
    }

    return respond({ status: 'ok', message: 'NOMAAD Catering API v2.6' }, callback);
  } catch (err) {
    return respond({ status: 'error', error: err.message }, e.parameter.callback);
  }
}

function saveOrder(ss, data) {
  let sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ORDERS);
    const h = ['Бүртгэсэн огноо','Байгууллага','Нэр','Утас',
               'Арга хэмжээний огноо','Хүн','Үйлчилгээ','Тэмдэглэл','Статус','Тайлбар','Арга хэмжээ','Байршил'];
    sheet.appendRow(h);
    const hRange = sheet.getRange(1, 1, 1, h.length);
    hRange.setFontWeight('bold');
    hRange.setBackground('#1F4A38');
    hRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 12, [130,160,120,110,140,60,180,200,90,120,140,170]);
  }
  sheet.appendRow([
    new Date(),
    data.байгууллага || '',
    data.нэр         || '',
    data.утас        || '',
    data.эхлэх_огноо || data.арга_хэмжээний_огноо || '',
    Number(data.хүн) || '',
    data.үйлчилгээ   || '',
    data.тэмдэглэл   || '',
    data.төлөв       || 'Шинэ захиалга',
    '',
    data.арга_хэмжээ || '',   // col 11 — арга хэмжээний төрөл
    data.газар       || '',   // col 12 — байршил (NOMAAD camp байршил эсвэл хаяг)
  ]);
}

// Ажилтны хоонд нөөцөөс гаргасан зарлагыг тусдаа таб руу бичнэ
function saveExpense(ss, data) {
  let sheet = ss.getSheetByName(SHEET_EXPENSE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_EXPENSE);
    const h = ['Огноо','Материал','Хэмжих нэгж','Тоо','Нэгжийн үнэ (₮)','Нийт зардал (₮)','Бүртгэсэн'];
    sheet.appendRow(h);
    const hRange = sheet.getRange(1, 1, 1, h.length);
    hRange.setFontWeight('bold');
    hRange.setBackground('#C8743F');
    hRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 7, [110, 200, 100, 70, 120, 130, 150]);
  }
  const qty   = Number(data.qty) || 0;
  const price = Number(data.price) || 0;
  sheet.appendRow([
    data.date || '',
    data.material || '',
    data.unit || '',
    qty,
    price,
    qty * price,
    new Date(),
  ]);
}

function saveCalc(ss, data) {
  let sheet = ss.getSheetByName(SHEET_CALC);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CALC);
    const h = ['Огноо','Захиалагч','Арга хэмжээ','Үйлчилгээ','Хүн',
               'Идэх хандлага','Мах өртөг ₮','Дагалдах өртөг ₮','Нийт өртөг ₮','Нэг хүний өртөг ₮','Тэмдэглэл'];
    sheet.appendRow(h);
    const hRange = sheet.getRange(1, 1, 1, h.length);
    hRange.setFontWeight('bold');
    hRange.setBackground('#2E6049');
    hRange.setFontColor('#ffffff');
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

// JSONP болон JSON аль алиныг дэмжих
function respond(obj, callback) {
  const text = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + text + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.JSON);
}

function json(obj) {
  return respond(obj, null);
}

function onEdit(e) {
  const sheet     = e.source.getActiveSheet();
  const watchCols = [4, 5]; // D болон E багана
  const dateCol   = 1;      // A багана руу огноо бичнэ

  if (watchCols.includes(e.range.getColumn()) && e.range.getRow() > 1) {
    sheet.getRange(e.range.getRow(), dateCol).setValue(new Date());
  }
}
