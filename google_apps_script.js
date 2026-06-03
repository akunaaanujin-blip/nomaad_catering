// NOMAAD Catering — Google Apps Script v2.1
const SHEET_ORDERS = 'Захиалга';
const SHEET_CALC   = 'Тооцоо';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    if (data.type === 'order') saveOrder(ss, data);
    else saveCalc(ss, data);
    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', error: err.message });
  }
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

      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
      const orders = rows.map((r, i) => ({
        id:                    i + 1,
        огноо:                 r[0] ? Utilities.formatDate(new Date(r[0]), 'Asia/Ulaanbaatar', 'yyyy-MM-dd HH:mm') : '',
        байгууллага:           r[1] || '',
        нэр:                   r[2] || '',
        утас:                  r[3] || '',
        арга_хэмжээний_огноо:  r[4] ? Utilities.formatDate(new Date(r[4]), 'Asia/Ulaanbaatar', 'yyyy-MM-dd') : '',
        хүн:                   r[5] || '',
        үйлчилгээ:             r[6] || '',
        тэмдэглэл:             r[7] || '',
        статус:                r[8] || 'Шинэ',
        тайлбар:               r[9] || '',
      }));

      return respond({ orders: orders.reverse() }, callback);
    }

    return respond({ status: 'ok', message: 'NOMAAD Catering API v2.1' }, callback);
  } catch (err) {
    return respond({ status: 'error', error: err.message }, e.parameter.callback);
  }
}

function saveOrder(ss, data) {
  let sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ORDERS);
    const h = ['Бүртгэсэн огноо','Байгууллага','Нэр','Утас',
               'Арга хэмжээний огноо','Хүн','Үйлчилгээ','Тэмдэглэл','Статус','Тайлбар'];
    sheet.appendRow(h);
    const hRange = sheet.getRange(1, 1, 1, h.length);
    hRange.setFontWeight('bold');
    hRange.setBackground('#1F4A38');
    hRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 10, [130,160,120,110,140,60,180,200,90,160]);
  }
  sheet.appendRow([
    new Date(),
    data.байгууллага || '',
    data.нэр         || '',
    data.утас        || '',
    data.арга_хэмжээний_огноо || '',
    Number(data.хүн) || '',
    data.үйлчилгээ   || '',
    data.тэмдэглэл   || '',
    'Шинэ',
    '',
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
