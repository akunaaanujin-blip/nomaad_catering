// ═══════════════════════════════════════════════════════
//  NOMAAD Catering — Google Apps Script
//  Google Sheets-д тооцоо хадгалах backend
//
//  ТОХИРГОО:
//  1. https://sheets.google.com → Шинэ хүснэгт үүсгэ
//     Нэр: "NOMAAD Catering — Захиалга"
//  2. Extensions → Apps Script → доорх кодыг буулга
//  3. Deploy → New deployment → Web app
//     • Execute as: Me
//     • Who has access: Anyone
//  4. Deploy → URL-г хуулж kitchen.html-д SHEETS_URL-д тавь
// ═══════════════════════════════════════════════════════

const SHEET_NAME = 'Захиалга';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Sheet байхгүй бол үүсгэж, гарчиг нэмнэ
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      const headers = [
        'Огноо', 'Захиалагч', 'Арга хэмжээ', 'Үйлчилгээ',
        'Хүн', 'Идэх хандлага', 'Сонгосон хоол',
        'Мах өртөг ₮', 'Дагалдах өртөг ₮', 'Нийт өртөг ₮',
        'Нэг хүний өртөг ₮', 'Махны үнэ (₮/кг)', 'Дагалдах ₮/хүн', 'Тэмдэглэл'
      ];
      sheet.appendRow(headers);
      // Гарчгийг тодруулах
      const hRange = sheet.getRange(1, 1, 1, headers.length);
      hRange.setFontWeight('bold');
      hRange.setBackground('#1F4A38');
      hRange.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 100);  // Огноо
      sheet.setColumnWidth(2, 160);  // Захиалагч
      sheet.setColumnWidth(6, 130);  // Идэх хандлага
      sheet.setColumnWidth(7, 280);  // Сонгосон хоол
      sheet.setColumnWidth(12, 250); // Махны үнэ
    }

    sheet.appendRow([
      data.огноо,
      data.захиалагч,
      data.арга_хэмжээ,
      data.үйлчилгээ,
      Number(data.хүн),
      data.идэх_хандлага,
      data.сонгосон_хоол,
      Number(data.мах_өртөг),
      Number(data.дагалдах_өртөг),
      Number(data.нийт_өртөг),
      Number(data.нэг_хүний_өртөг),
      data.махны_үнэ,
      Number(data.дагалдах_нэг_хүн) || '',
      data.тэмдэглэл
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// CORS — browser-с шууд fetch хийхэд хэрэгтэй
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'NOMAAD Sheets endpoint' }))
    .setMimeType(ContentService.MimeType.JSON);
}
