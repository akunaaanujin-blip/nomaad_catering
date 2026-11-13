// NOMAAD Бизнесүүд — Google Apps Script v8.10 (ажилтанд санамж: admin_setting notice, products → notices; Хаан банкны мессежийн бодит загвар; банкны мэдэгдлээр автоматаар оруулах: шилжүүлгийн баримтын и-мэйл bankMailScan, утаснаас дамжуулсан мессеж bank_sms, тохиргоо admin_setting bankauto, хуулгатай нийлүүлэх admin_bank updates.fix; admin_read: poLog — ажилтны шийдэгдсэн бүртгэл; Буухиагийн сайтаас устгасан хүргэлтийг дахин илгээх: eb_unlink; Буухиа руу үнийн дүнтэй / дүнгүй илгээх: noAmt, «Буухиа дүн» багана; ажилтны «Бараа ирсэн»-д каргоны дүн; «Бараа ирсэн», карго — удирдлага батална: staff_po, staff_po_in, admin_po inboxId; буухиа: Cozy-ийн бүртгэлтэй хүргэлт NOMAAD-д харагдахгүй — EB_HOME; засах: барааны хөдөлгөөн admin_stock editId, зарлага admin_record editId, харилцагч admin_partner editId / delId; цуцалсан/буцаасан захиалгын бараа үлдэгдэлд зөвхөн «Бараа буцаж ирсэн»-ээр — буухиа цуцлахад шууд нэмэхгүй; Boost төсөв: удирдлага BOOST_BUD-д гаргана, ажилтан boost_bud-аар төсөв + задаргаагаа харна; хуучин JS хувилбарын хүсэлтийг бичихгүй — MIN_JS; ажилтны нэвтрэлт 11-02-оос өмнөх шигээ: нэвтрэх нэр + код, нийтлэг эрх зөвшөөрнө, 4 оронтой код, PIN албадан солихгүй; Boost нэхэмжлэх: олон компанийн мөр, Meta баримтын зураг «Boost баримт», admin_boost; буухиа руу илгээхэд дүүрэг/сум заавал биш; захиалгын хүргэлтийн төлбөр, хөнгөлөлт засахад борлуулалтын мөр дагана — orderSyncAdj; удирдлагаас хүргэлт/хөнгөлөлт засах, «Хүргэлтийн компани» багана; банкны хуулга: ImportLog, Rules, импорт буцаах, Банк-д import_id/Бичилт; төлбөрийн хэлбэр засах admin_record payId — касс хаасан өдрийн бэлэн, И-баримттай баримт хориглоно; цуцлахад борлуулалт шууд буцна — давхар буцаалтгүй; ажилтан утас + 6 оронтой PIN, нийтлэг эрх хориглох, staff_pin; буухиа руу хаяг: хот/аймаг заавал, хороо дугаараар; буухиа цуцалсан/буцаасан → захиалга «Буцаасан», шалтгаантай; удирдлагаас «Бараа буцаж ирсэн»; удирдлагаас захиалга засах; бичилтийн дараа flush; түүхийн цаг текстээр; удирдлага захиалга цуцлах + буцаалт, сэргээх; буухиа өмнөх үеийн тэмдэглэгээ EB_OLD; буухиагийн дүнг ₮/таслалтай ч уншина; буухиа ↔ «Шинэ» захиалга утас+огноо+дүнгээр холбох, гараар холбох ebCode; компанийн мэдээлэл COMPANY; өөрчлөлтийн түүх «Түүх» sheet, хогийн сав: цуцалсныг сэргээх; мөнгөний хүсэлт «Батлагдсан» → банкны хуулгаар төлсөн; шинээр эхлэх: admin_reset; ажилтанд өмнөх өдрүүдийн борлуулалт; буухиа тооцоо давхар бичихгүй; ebuuhia API: хүргэлт илгээх, бүх хүргэлтийн төлөв/мэдээлэл, удирдлагад харах; захиалгын «Буухиа код») (тооллого: тоолсон хүн, цаг; ажилтны тооллого батлах, мөнгөний хүсэлт; удирдлагын тойм — дүгнэлт REVIEW; boost бараагаар; баркод; хөнгөлөлт, хуваан төлөх, борлуулалтын зорилт; ажилтны уншилт кэштэй; StorePay merchant API; хүргэлтийн төлбөр үлдэгдэлд орохгүй, Буцаасан төлөв; серверийн кэш; KPI бонус; өдрийн тойм и-мэйл; менежерийн эрх, KPI, үндсэн хөрөнгө, доод үлдэгдэл, ирц, үнийн түүх, харилцагчийн түүх, өдрийн тойм)
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

const BIZ_NAMES = { meat: 'Махны дэлгүүр', cozy: 'Cozy Home Ulaanbaatar', travel: 'NOMAAD аяллын дэлгүүр', mgmt: 'Удирдлага' };   // mgmt — зөвхөн санхүү (удирдлагын данс)
// Ажилтны «Бизнес» багана: 'cozy' · 'cozy,meat' (нэг эрхээр хэд хэдэн дэлгүүрт) · 'all' (бүх дэлгүүр)
const STAFF_BIZ = ['meat', 'cozy', 'travel'];
function staffBizes(b) { b = String(b || '').trim(); return b === 'all' ? STAFF_BIZ.slice() : b.split(',').map(function (x) { return x.trim(); }).filter(function (x) { return STAFF_BIZ.indexOf(x) >= 0; }); }
function staffIn(s, b) { return staffBizes(s.biz).indexOf(String(b || '')) >= 0; }
function cleanStaffBiz(v) { v = String(v || '').trim(); if (v === 'all') return 'all'; const L = staffBizes(v); return L.length && L.length === v.split(',').length ? L.join(',') : ''; }
const TYPE_NAMES = { sale: 'Борлуулалт', expense: 'Зарлага', request: 'Мөнгөний хүсэлт', close: 'Касс хаалт', collect: 'Төлбөр орсон', attend: 'Ирц', boost: 'Boost' };   // boost — зөвхөн бүртгэл, санхүүд банкны хуулгаар орно
const SHEET_PRICE = 'Үнийн түүх';
const PRICE_HEAD = ['Огноо', 'biz', 'Бараа', 'Хуучин үнэ', 'Шинэ үнэ', 'Хэн'];
// Захиалга (Cozy: Facebook захиалга → буухиа хүргэлт)
const SHEET_ORDER = 'Захиалга';
const ORDER_HEAD = ['ID', 'Огноо', 'Цаг', 'biz', 'Ажилтан', 'Захиалагч', 'Утас', 'Нэмэлт утас', 'Хот/аймаг', 'Дүүрэг/сум', 'Хороо', 'Хаяг',
  'Бараа', 'Дүн', 'Хүргэх огноо', 'Төлбөрийн хэлбэр', 'Хүргэлтийн төлөв', 'Төлбөр', 'Тэмдэглэл', 'Шинэчилсэн', 'Борлуулалт', 'Баталгаа', 'Буухиа код', 'Хүргэлтийн компани', 'Буухиа дүн'];
const ORDER_KEYS = ['id', 'date', 'time', 'biz', 'staff', 'customer', 'phone', 'phone2', 'city', 'district', 'khoroo', 'address',
  'items', 'amount', 'deliverDate', 'payType', 'status', 'paid', 'note', 'updated', 'saleDone', 'confirmed', 'ebCode', 'courier', 'ebCod'];
const SHEET_REMIND = 'Сануулга';
const REMIND_HEAD = ['ID', 'Огноо', 'Гарчиг', 'Төрөл', 'Дүн', 'Харилцагч', 'Компани', 'Давтамж', 'Төлөв', 'Тэмдэглэл', 'Үүсгэсэн'];
const SHEET_BANK = 'Банк';
const BANK_HEAD = ['ID', 'Данс', 'Огноо', 'Орлого', 'Зарлага', 'Үлдэгдэл', 'Гүйлгээний утга', 'Харьцсан данс', 'biz', 'Төлөв', 'Холбоос', 'Хэн', 'Оруулсан', 'import_id', 'Бичилт'];   // «Банк» = BankTxn; Бичилт — энэ мөрөөс үүссэн журналын ID (таслалаар)
// Хуулга импортын лог, банкны дүрэм (гүйлгээний утгад түлхүүр үг → үйлдэл)
const SHEET_IMPORT = 'ImportLog';
const IMPORT_HEAD = ['import_id', 'Данс', 'Бизнес', 'biz', 'Эхлэх огноо', 'Дуусах огноо', 'Нийт мөр', 'Оруулсан', 'Алгассан', 'Давхардсан', 'Эцсийн үлдэгдэл', 'Импорт хийсэн', 'Хэн', 'Төлөв'];
const SHEET_RULES = 'Rules';
const RULE_HEAD = ['ID', 'Түлхүүр үг', 'Үйлдэл', 'biz', 'Хэн', 'Огноо', 'Төлөв'];
const SHEET_TASK = 'Даалгавар';
const TASK_HEAD = ['ID', 'Үүсгэсэн', 'biz', 'Ажилтан ID', 'Ажилтан', 'Даалгавар', 'Хугацаа', 'Төлөв', 'Хийсэн', 'Хийсэн огноо', 'Хэнээс', 'Тайлбар'];
const SHEET_LOAN = 'Зээл';
const LOAN_HEAD = ['ID', 'Огноо', 'biz', 'Төрөл', 'Харилцагч', 'Дүн', 'Хүү (сар %)', 'Дуусах огноо', 'Төлөх өдөр', 'Тэмдэглэл', 'Төлөв', 'Үүсгэсэн',
  'Төлөх нийт (хүүтэй)', 'Төлөлтийн хуваарь', 'Сарын төлөх дүн', 'Төлөх данс', 'Хүү бодох'];   // хуваарь: [{d: огноо, p: үндсэн, i: хүү}]
const SHEET_PO = 'Бараа захиалга';
const SHEET_POIN = 'Бараа ирсэн бүртгэл';
const PO_FA = '[Хөрөнгө]';   // po.js-тэй ижил: үндсэн хөрөнгийн захиалгын тэмдэг
const POIN_HEAD = ['ID', 'Огноо', 'biz', 'PO ID', 'PO дугаар', 'Төрөл', 'Мэдээлэл', 'Ажилтан', 'Төлөв', 'Шийдсэн', 'Шийдсэн огноо'];
const PO_HEAD = ['ID', 'Дугаар', 'Огноо', 'biz', 'Нийлүүлэгч', 'Бараа', 'Валют', 'Нийт (валютаар)', 'Карго компани', 'Төлөв', 'Ирсэн огноо', 'Тэмдэглэл', 'Үүсгэсэн'];
const SHEET_DOC = 'Маягт';
const DOC_HEAD = ['ID', 'Нэр', 'Бүлэг', 'Агуулга (HTML)', 'Үндсэн маягт', 'Шинэчилсэн', 'Төлөв'];
const FEE_ITEM = 'Хүргэлтийн төлбөр', DISC_ITEM = 'Хөнгөлөлт', SPLIT_ITEM = 'Төлбөр хуваалт';   // захиалгын хүргэлтийн төлбөр (борлуулалтын мөр, үлдэгдэлд орохгүй)
const COZY_OLD_SHEET = '1KUXN7wrApwDSwQQZnzYgPigfRkzkiG3Xbt4VSihQd9c';   // хуучин «Cozy хүргэлт» хүснэгт (шилжүүлэхэд л уншина)
const LOG_HEAD = ['ID', 'Огноо', 'Цаг', 'Бизнес', 'Төрөл', 'Ажилтан', 'Бараа / Ангилал', 'Тоо', 'Нэгж',
                  'Нэгжийн үнэ', 'Дүн', 'Төлбөр', 'Тоолсон бэлэн', 'Зөрүү', 'Тайлбар', 'biz', 'type', 'Баримт', 'Төлөв', 'Харилцагч'];
// "Ажилтан" хуудасны баганууд (эхний 5 нь v1.1-ээс хэвээр)
const STAFF_HEAD = ['Бизнес (meat / cozy / travel / all)', 'Нэр', 'Код (4 орон)', 'Эрх (Худалдагч / Менежер)', 'Идэвхтэй (Тийм / Хүлээгдэж / Үгүй)',
                    'Овог', 'Утас', 'Регистр', 'Албан тушаал', 'Үндсэн цалин', 'Банкны данс', 'Бүртгүүлсэн', 'ID', 'Нэвтрэх нэр',
                    'Гэрийн хаяг', 'Ажилд орох огноо', 'Гэрээний №', 'Гэрээ байгуулсан', 'Гэрээ дуусах', 'Гэрээний нөхцөл',
                    'НД мэргэжлийн код', 'Даатгуулагчийн төрөл'];
const USER_RE = /^[a-z0-9._]{3,20}$/;
const TOKEN_TTL = 8 * 3600;   // удирдагчийн нэвтрэлт 8 цаг
const SALARY_HEAD = ['ID', 'Огноо', 'Сар', 'Ажилтны ID', 'Нэр', 'Бизнес', 'Төрөл', 'Дүн', 'Тайлбар'];
const SALARY_KINDS = { 'Урьдчилгаа': 1, 'KPI бонус': 1, 'Шагнал': 1, 'Суутгал': 1, 'Олгосон': 1 };   // «Шагнал» — хуучин нэр (KPI бонус)
// Үлдэгдлийн хөдөлгөөн: тоо + (нэмэгдэх) / − (хасагдах). Борлуулалт «Бүртгэл»-ээс автоматаар хасагдана.
const STOCK_HEAD = ['ID', 'Огноо', 'Бизнес', 'Байршил', 'Бараа', 'Төрөл', 'Тоо', 'Нэгж өртөг', 'Хэн', 'Тайлбар', 'biz', 'Төлбөр', 'Харилцагч', 'Төлөв',
  'Авсан үнэ (нэгж)', 'Валют', 'Ханш', 'Карго (нэгжид ₮)', 'Каргоны төлбөр', 'Карго компани'];   // Нэгж өртөг = авсан үнэ × ханш + карго
// «Он нээлт» — он хаахад өмнөх оны эцсийн үлдэгдлийг шинэ оны эхэнд шилжүүлсэн мөр (санхүүд дахин бичигдэхгүй)
const STOCK_KINDS = { 'Эхний үлдэгдэл': 1, 'Орлого': 1, 'Шилжүүлэг': 1, 'Тооллого': 1, 'Хасалт': 1, 'Он нээлт': 1 };
const STOCK_LOCS = { 'Дэлгүүр': 1, 'Агуулах': 1 };

// ── Бичих ──
// Өдрийн тойм и-мэйл: редактороос нэг удаа ажиллуулж «таны нэрээр и-мэйл илгээх» зөвшөөрлийг өгнө (зөвшөөрлийн цонхонд мөр бүрийг чагтлаад Continue).
// Самбарт и-мэйлээ хадгалсан бол туршилтын тойм тэр хаяг руу явна.
function digestTest() {
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, ['https://www.googleapis.com/auth/script.send_mail']);
  const to = PropertiesService.getScriptProperties().getProperty('DIGEST_TO');
  if (!to) { Logger.log('Зөвшөөрөл OK. Туршилтын и-мэйл явуулах бол самбарын Санхүү → Тохиргоо → Өдрийн тойм и-мэйлд хаягаа хадгалаад дахин ажиллуулна.'); return; }
  const lines = digestText();
  digestSend(to, 'NOMAAD — туршилтын тойм', (lines.length ? lines.join('\n') : 'Өнөөдөр анхаарах зүйл алга.') + '\n\n(Туршилт)');
  Logger.log('Илгээлээ: ' + to);
}
// (Функцийн жагсаалтад эхэнд харагдахаар энд байрлуулсан.) Редактороос нэг удаа ажиллуулж «гадаад үйлчилгээнд холбогдох» зөвшөөрлийг өгнө (зөвшөөрлийн цонхонд тэр мөрийг чагтална)
function tinTest() {
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, ['https://www.googleapis.com/auth/script.external_request']);
  const r = tinInfo('8330042');
  Logger.log(JSON.stringify(r));
  return r;
}
// Хөтчийн кэшээс хуучин JS ачаалсан хуудас бичилт хийхгүй: удирдлагын бичилт (admin.js post) болон Boost нэхэмжлэх (staff.js) JS хувилбараа илгээнэ
const MIN_JS = '20261103a';
function oldJs(d) {
  const t = String(d.type || '');
  if (!(/^admin_/.test(t) && !/^admin_(login|read|audit)$/.test(t)) && t !== 'boost_img') return false;
  return !(String(d.v || '') >= MIN_JS);
}
function doPost(e) {
  // StorePay — гадаад API хүлээдэг тул түгжээгүй (бусад бичилтийг саатуулахгүй); Sheet-д юу ч бичихгүй
  try { const sp = JSON.parse(e.postData.contents); if (/^storepay_/.test(String(sp.type))) return json(storePay(sp)); } catch (e0) {}
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let drop = null;
  try {
    const data = JSON.parse(e.postData.contents);
    if (oldJs(data)) return json({ status: 'error', error: 'old', msg: 'Хуудсаа шинэчилнэ үү (Ctrl+Shift+R)' });
    drop = cacheKeysFor(data);   // бичилт бол хамаарах кэшийг (хариу өгсний дараа) цэвэрлэнэ
    if (/^admin_/.test(String(data.type)) && data.type !== 'admin_login') {   // удирдлагын эрх: Эзэн — бүгд, Менежер — өөрийн дэлгүүр
      const who = adminWho(data);
      if (!who) return json({ status: 'error', error: 'auth' });
      if (who.role !== 'Эзэн') { const g = mgrGuard(data, who); if (g) return json({ status: 'error', error: g }); }
      data._who = who;
    }
    const res = route(data);
    if (res && res.status === 'ok') try { audit(data, res); } catch (eA) {}   // өөрчлөлтийн түүх (амжилттай бичилт)
    return json(res);
  } catch (err) {
    return json({ status: 'error', error: err.message });
  } finally {
    try { if (drop) { SpreadsheetApp.flush(); cacheDrop(drop); } } catch (e2) {}   // бичилтийг дуусгаад кэш цэвэрлэнэ (зэрэг уншилт хуучныг кэшлэхгүй)
    lock.releaseLock();
  }
}
// Хүсэлтийг төрлөөр нь гүйцэтгэнэ (doPost — түгжээ, эрх, түүх)
function route(data) {
  if (data.type === 'register') return register(data);
  if (data.type === 'admin_login') return adminLogin(data);
  if (data.type === 'admin_read') return isAdmin(data) ? adminRead(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_staff') return isAdmin(data) ? adminStaff(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_salary') return isAdmin(data) ? adminSalary(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_stock') return isAdmin(data) ? adminStock(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_journal') return isAdmin(data) ? adminJournal(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_doc') return isAdmin(data) ? adminDoc(data) : { status: 'error', error: 'auth' };
  if (data.type === 'bank_sms') return bankSms(data);   // утаснаас дамжуулсан банкны мессеж (нууц түлхүүртэй)
  if (data.type === 'admin_bank') return !isAdmin(data) ? { status: 'error', error: 'auth' } : data.undoImport ? bankUndoImport(data) : data.rule || data.ruleCancel ? bankRule(data) : adminBank(data);
  if (data.type === 'admin_order') return isAdmin(data) ? adminOrder(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_task') return isAdmin(data) ? adminTask(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_setting') return isAdmin(data) ? adminSetting(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_eb') return isAdmin(data) ? ebAdmin(data) : { status: 'error', error: 'auth' };
  if (data.type === 'tasks') return staffTasks(data);
  if (data.type === 'record_receipt') return recordReceipt(data);
  if (data.type === 'boost_img') return boostImgSave(data);
  if (data.type === 'admin_boost') return isAdmin(data) ? adminBoost(data) : { status: 'error', error: 'auth' };
  if (data.type === 'barcode_set') return barcodeSet(data);
  if (data.type === 'task_done') return staffTaskDone(data);
  if (data.type === 'admin_reminder') return isAdmin(data) ? adminReminder(data) : { status: 'error', error: 'auth' };
  if (data.type === 'order_save') return orderSave(data);
  if (data.type === 'staff_pin') return staffPin(data);
  if (data.type === 'order_delete') return orderDelete(data);
  if (data.type === 'orders_ship') return ordersShip(data);
  if (data.type === 'eb_send' || data.type === 'eb_sync' || data.type === 'eb_del' || data.type === 'eb_other' || data.type === 'eb_unlink') return ebuuhia(data);
  if (data.type === 'staff_today') return staffToday(data);
  if (data.type === 'boost_bud') return boostBudStaff(data);
  if (data.type === 'requests') return staffRequests(data);
  if (data.type === 'stock_count') return stockCount(data);
  if (data.type === 'staff_po') return staffPo(data);
  if (data.type === 'staff_po_in') return staffPoIn(data);
  if (data.type === 'orders') return ordersFor(data);
  if (data.type === 'order_hist') return orderHist(data);
  if (data.type === 'admin_import_cozy') return isAdmin(data) ? importCozy(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_contract') return isAdmin(data) ? adminContract(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_backup') return isAdmin(data) ? adminBackup() : { status: 'error', error: 'auth' };
  if (data.type === 'admin_close') return isAdmin(data) ? adminClose(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_reset') return isAdmin(data) ? adminReset(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_product') return isAdmin(data) ? adminProduct(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_record') return isAdmin(data) ? adminRecord(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_partner') return isAdmin(data) ? adminPartner(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_loan') return isAdmin(data) ? adminLoan(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_pf') return data._who && data._who.role === 'Эзэн' ? adminPf(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_po') return isAdmin(data) ? adminPo(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_digest') return isAdmin(data) ? adminDigest(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_audit') return isAdmin(data) ? adminAudit(data) : { status: 'error', error: 'auth' };
  if (data.type === 'admin_restore') return isAdmin(data) ? adminRestore(data) : { status: 'error', error: 'auth' };
  return saveRecords(data);
}

// ═══════════ ӨӨРЧЛӨЛТИЙН ТҮҮХ ═══════════
// Удирдлагын бүх бичилт, захиалга, тооллого: хэн · хэзээ · юу (амжилттай болсныг л). Нууц утга (түлхүүр, код, нууц үг) бичигдэхгүй.
// Ажилтны борлуулалт, зарлагын мөр өөрөө ажилтан, цагтай тул энд давхар бичихгүй.
const SHEET_AUDIT = 'Түүх', AUDIT_HEAD = ['Цаг', 'Хэн', 'Компани', 'Үйлдэл', 'Тайлбар', 'Төрөл', 'ID', 'Дэлгэрэнгүй'];
const AUDIT_SKIP = { bank_sms: 1, boost_img: 1, staff_pin: 1, register: 1, admin_login: 1, record_receipt: 1, barcode_set: 1, admin_backup: 1, admin_audit: 1, admin_restore: 0 };
function auditSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_AUDIT);
  if (!sh) { sh = ss.insertSheet(SHEET_AUDIT); sh.appendRow(AUDIT_HEAD); sh.setFrozenRows(1); }
  return sh;
}
function auditLabel(d) {
  const t = d.type, n = function (a) { return Array.isArray(a) ? a.length : 0; };
  if (t === 'admin_journal') return d.cancelId ? 'Журналын бичилт цуцалсан' : 'Журналд бичсэн' + (n(d.entries) > 1 ? ' (' + n(d.entries) + ')' : '');
  if (t === 'admin_record') return d.statusId ? 'Мөнгөний хүсэлт: ' + d.status : d.payId ? 'Төлбөрийн хэлбэр засав → ' + d.pay : d.editId ? 'Зарлага засав' : d.cancelId ? 'Баримт / зарлага цуцалсан' : 'Бичлэг засварласан';
  if (t === 'admin_stock') return d.approveId ? 'Тооллого баталсан' : d.editId ? 'Барааны хөдөлгөөн засав' : d.cancelId ? 'Барааны хөдөлгөөн цуцалсан / тооллого татгалзсан' : 'Барааны хөдөлгөөн бичсэн (' + n(d.moves) + ')';
  if (t === 'admin_restore') return 'Хогийн савнаас сэргээсэн';
  if (t === 'admin_partner') return d.delId ? 'Харилцагч устгасан' : d.editId ? 'Харилцагч засав' : 'Харилцагч нэмсэн';
  if (t === 'admin_boost') return 'Boost нэхэмжлэх засварласан';
  if (t === 'admin_setting') return d.key === 'ebold' ? 'Буухиа: өмнөх үеийнх гэж тэмдэглэсэн' : 'Тохиргоо: ' + String(d.key || '');
  if (t === 'admin_order' && d.fields && d.fields.status === 'Цуцалсан') return 'Захиалга цуцалсан' + (d.fields.receive ? ' (борлуулалт буцаасан)' : '');
  if (t === 'admin_order' && d.fields && d.fields.restore) return 'Цуцалсан захиалгыг сэргээсэн';
  if (t === 'admin_order' && d.fields && d.fields.edit) return 'Захиалга засварласан';
  if (t === 'admin_order' && d.fields && d.fields.receive && !d.fields.status) return 'Захиалгын бараа буцаж ирсэн';
  if (t === 'order_save') return d.order && d.order.id ? 'Захиалга засварласан' : 'Захиалга бүртгэсэн';
  if (t === 'order_delete') return 'Захиалга бүр устгасан';
  if (t === 'orders_ship') return 'Захиалга → ' + String(d.to || '');
  if (t === 'stock_count') return 'Тооллого илгээсэн';
  if (t === 'admin_eb' || /^eb_/.test(t)) return 'Буухиа: ' + String(d.op || t.replace('eb_', ''));
  return ({ admin_bank: 'Банкны хуулга', admin_product: 'Бараа, үнэ', admin_partner: 'Харилцагч', admin_loan: 'Зээл', admin_pf: 'Хувийн санхүү', admin_po: 'Бараа захиалга', admin_staff: 'Ажилтан',
    admin_salary: 'Цалин', admin_order: 'Захиалгын төлбөр', admin_task: 'Даалгавар', admin_reminder: 'Сануулга', admin_doc: 'Маягт', admin_contract: 'Гэрээ', admin_close: 'Он хаасан',
    admin_reset: 'Шинээр эхэлсэн', admin_import_cozy: 'Cozy импорт', admin_digest: 'Өдрийн тойм', task_done: 'Даалгавар биелүүлсэн', requests: 'Мөнгөний хүсэлт' })[t] || t;
}
function auditClean(v, depth) {   // нууц талбарыг хасаж, урт жагсаалтыг богиносгоно
  if (depth > 3) return '…';
  if (Array.isArray(v)) { const a = v.slice(0, 20).map(function (x) { return auditClean(x, depth + 1); }); if (v.length > 20) a.push('… +' + (v.length - 20)); return a; }
  if (v && typeof v === 'object') {
    const o = {};
    Object.keys(v).forEach(function (k) { if (/^(token|_who|code|pin|pass|password|secret|appPass|key2)$/i.test(k)) return; o[k] = auditClean(v[k], depth + 1); });
    return o;
  }
  return typeof v === 'string' ? v.slice(0, 200) : v;
}
function audit(d, res) {
  const t = String(d.type || '');
  if (!t || AUDIT_SKIP[t] || CACHE_READ[t] || (t === 'admin_eb' && !/^(send|del|other|unlink)$/.test(String(d.op || '')))) return;
  if (t === 'requests' && !d.add) return;
  let who = '', biz = String(d.biz || (d.entry && d.entry.biz) || (d.order && d.order.biz) || '');
  if (d._who) who = String(d.by || d._who.id || '');
  else { const s = checkStaff(d.token); if (s) { who = s.staff.name; biz = biz || s.biz; } }
  const det = auditClean(d, 0);
  if (t === 'admin_setting') { delete det.value; if (/^(lock|review|targets|company)$/.test(String(d.key))) det.value = auditClean(d.value, 1); }   // түлхүүр, нууц тохиргоог бичихгүй
  delete det.type; delete det.by;
  const id = String(d.cancelId || d.editId || d.delId || d.approveId || d.statusId || d.restoreId || (d.order && d.order.id) || (t === 'admin_order' ? d.id : '') || '');
  auditSheet().appendRow(['\'' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), who.slice(0, 40), biz, auditLabel(d), String(d.what || '').slice(0, 200), t, id, JSON.stringify(det).slice(0, 3000)]);
}
// Түүх унших: сүүлийн N мөр (шинэ нь эхэнд), from — огнооноос хойш
function adminAudit(d) {
  const sh = auditSheet(), last = sh.getLastRow(); if (last < 2) return { status: 'ok', rows: [] };
  const lim = Math.min(Number(d.limit) || 500, 3000), start = Math.max(2, last - lim + 1);
  const rows = sh.getRange(start, 1, last - start + 1, AUDIT_HEAD.length).getValues().reverse()
    .map(function (r) { r[0] = r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, 'yyyy-MM-dd HH:mm:ss') : String(r[0]); return r; })
    .filter(function (r) { return !d.from || r[0] >= String(d.from); })
    .map(function (r) { return { at: r[0], who: String(r[1]), biz: String(r[2]), what: String(r[3]), note: String(r[4]), type: String(r[5]), id: String(r[6]), det: String(r[7]) }; });
  return { status: 'ok', rows: rows };
}
// ═══════════ ХОГИЙН САВ: цуцалсан бичлэгийг (30 хоногийн дотор) сэргээх ═══════════
// kind: rec — баримт/зарлага (Бүртгэл, 19-р багана), mov — барааны хөдөлгөөн (14), jr — журнал (12). Түгжсэн хугацааных сэргэхгүй.
function adminRestore(d) {
  const K = { rec: [logSheet(), 19, 2], mov: [stockSheet(), 14, 2], jr: [journalSheet(), 12, 2] }[d.kind];
  if (!K) return { status: 'error', error: 'fields' };
  const sh = K[0], last = sh.getLastRow(); if (last < 2) return { status: 'error', error: 'not_found' };
  const v = sh.getRange(2, 1, last - 1, Math.max(K[1], 3)).getValues();
  for (let i = 0; i < v.length; i++) {
    if (String(v[i][0]) !== String(d.restoreId)) continue;
    if (String(v[i][K[1] - 1]) !== 'Устгасан') return { status: 'error', error: 'state' };
    if (lockedDate(fmtDate(v[i][K[2] - 1], 'yyyy-MM-dd'))) return { status: 'error', error: 'locked' };
    if (d.kind === 'mov') {   // сэргээхэд үлдэгдэл хасах болохгүй
      const mv = stockMovesAll().filter(function (m) { return m.id === String(d.restoreId); })[0];
      if (mv && mv.kind === 'Тооллого' && !/баталсан/.test(String(mv.note))) return { status: 'error', error: 'state' };   // татгалзсан тооллого сэргэхгүй (баталгаагүй үлдэгдэлд орно)
      if (mv && Number(mv.qty) < 0) { const bad = stockNegative(mv.biz, [{ loc: mv.loc, item: mv.item, qty: Number(mv.qty) }]); if (bad) return { status: 'error', error: 'negative', item: bad }; }
    }
    sh.getRange(i + 2, K[1]).setValue('');
    return { status: 'ok' };
  }
  return { status: 'error', error: 'not_found' };
}

// ── Серверийн кэш (хурд): удирдлагын уншилт хуудас тус бүрийг 5 мин кэшлэнэ, бичилт хийхэд тэр хуудсыг л цэвэрлэнэ ──
// Sheet-ийг гараар засвал 5 минутын дотор шинэчлэгдэнэ.
const CACHE_ALL = ['adm', 'rec', 'stk', 'mov', 'jr', 'pt', 'rem', 'bank', 'imp', 'rule', 'docs', 'task', 'ord', 'prod', 'loan', 'po', 'price', 'stf', 'pf'];
const CACHE_MAP = { admin_eb: ['ord', 'rec', 'stk'], eb_other: ['ord', 'rec', 'stk'], eb_del: ['ord'], eb_unlink: ['ord'], eb_send: ['ord', 'rec', 'stk'], stock_count: ['mov', 'stk'], admin_record: ['rec', 'stk'], record_receipt: ['rec', 'stk'], order_save: ['ord', 'rec'], order_delete: ['ord'], orders_ship: ['ord', 'rec', 'stk'], admin_order: ['ord', 'jr', 'bank', 'rec', 'stk'],
  staff_po_in: ['mov', 'stk', 'jr', 'po'], admin_import_cozy: ['ord'], admin_stock: ['mov', 'stk'], admin_journal: ['jr', 'bank'], admin_bank: ['bank', 'jr', 'ord', 'imp', 'rule'], bank_sms: ['bank'], admin_partner: ['pt'], admin_reminder: ['rem'],
  admin_doc: ['docs'], admin_task: ['task'], task_done: ['task'], admin_product: ['prod', 'price'], admin_loan: ['loan', 'jr'], admin_pf: ['pf'], admin_po: ['po', 'jr'],
  admin_restore: ['rec', 'stk', 'mov', 'jr'], admin_staff: ['adm', 'stf'], staff_pin: ['adm', 'stf'], admin_salary: ['adm'], admin_contract: ['adm', 'stf'], register: ['adm', 'stf'] };
const CACHE_READ = { staff_po: 1, admin_audit: 1, eb_sync: 1, requests: 1, staff_today: 1, admin_read: 1, admin_login: 1, orders: 1, order_hist: 1, tasks: 1, admin_setting: 1, admin_digest: 1, admin_backup: 1 };
function cacheKeysFor(d) {
  if (!d.type) return ['rec', 'stk'];   // ажилтны бичлэг (борлуулалт, зарлага, касс)
  if (CACHE_READ[d.type]) return null;
  if (d.type === 'admin_eb' && d.op !== 'send' && d.op !== 'del' && d.op !== 'other' && d.op !== 'unlink') return null;
  if (d.type === 'admin_boost' && !d.edit) return null;   // зураг унших
  if (d.type === 'boost_img') return null;   // төлөв татах — бичвэл ebuuhia() өөрөө кэш цэвэрлэнэ
  return CACHE_MAP[d.type] || CACHE_ALL;   // мэдэгдэхгүй бичилт (он хаах г.м) — бүгдийг
}
const CACHE_OFF = {};   // 2026-11-01: нөөцийн кэш (stk, mov) дахин асаасан — бичилт бүр cacheKeysFor-оор цэвэрлэнэ.  Хуучин: «ТҮР УНТРААСАН:   // ТҮР УНТРААСАН: нөөцийн кэш (сайжруулалт дуустал) — дахин асаахдаа энэ жагсаалтаас хасна
function cacheGet(name, fn) {
  if (CACHE_OFF[name]) return fn();
  const c = CacheService.getScriptCache(), k = 'ck2_' + name, n = Number(c.get(k) || 0);
  if (n > 0) {
    const keys = []; for (let i = 0; i < n; i++) keys.push(k + '_' + i);
    const parts = c.getAll(keys); let s = '';
    for (let i = 0; i < n; i++) { const p = parts[keys[i]]; if (p == null) { s = null; break; } s += p; }
    if (s != null) { try { return JSON.parse(s); } catch (e) {} }
  }
  const v = fn(), s = JSON.stringify(v), CH = 40000, cnt = Math.max(1, Math.ceil(s.length / CH));   // нэг утга ≤100KB (кирилл 2 байт)
  if (cnt <= 60) { const o = {}; for (let i = 0; i < cnt; i++) o[k + '_' + i] = s.slice(i * CH, (i + 1) * CH); o[k] = String(cnt); try { c.putAll(o, 300); } catch (e) {} }
  return JSON.parse(s);
}
function cacheDrop(names) { CacheService.getScriptCache().removeAll(names.map(function (n) { return 'ck2_' + n; })); }   // ck2_ — 2026-10-22 эвдэрсэн кэшийг хүчингүй болгосон
// Удирдагчийн токен (admin_login-оор олгоно, 8 цаг хүчинтэй)
function isAdmin(data) { return !!adminWho(data); }
// Токен → { id, role, biz }. Хуучин токен (зөвхөн ID) = Эзэн.
function adminWho(data) {
  if (!(data.token && /^[0-9a-f-]{36}$/.test(String(data.token)))) return null;
  const v = CacheService.getScriptCache().get('tok_' + data.token);
  if (!v) return null;
  if (v.charAt(0) !== '{') return { id: v, role: 'Эзэн', biz: 'all' };
  try { return JSON.parse(v); } catch (e) { return null; }
}
// Менежер: зөвхөн өөрийн дэлгүүрийн борлуулалт, бараа, захиалга, банк, кассын баримт. Цалин, ажилчид, тохиргоо, зээл, удирдлагын санхүү — эзэнд.
const MGR_TYPES = { admin_read: 1, admin_order: 1, admin_stock: 1, admin_product: 1, admin_bank: 1, admin_journal: 1, admin_partner: 1, admin_po: 1,
                    admin_task: 1, admin_reminder: 1, admin_record: 1, admin_import_cozy: 1, admin_setting: 1, admin_eb: 1, admin_boost: 1 };
function mgrCan(who, b) { b = String(b || ''); return who.biz === 'all' ? (!!BIZ_NAMES[b] && b !== 'mgmt') : staffIn(who, b); }
function mgrGuard(d, who) {
  if (!MGR_TYPES[d.type]) return 'role';
  const ok = function (b) { return mgrCan(who, b); };
  const all = function (arr, f) { return (arr || []).every(function (x) { return ok(f(x)); }); };
  const byId = function (rows, id) { return rows.filter(function (x) { return x.id === String(id); })[0]; };
  const t = d.type;
  if (t === 'admin_read') return '';
  if (t === 'admin_journal') {
    if (d.cancelId) { const j = byId(journalRows(), d.cancelId); return j && ok(j.biz) ? '' : 'role'; }
    return (!d.entry || ok(d.entry.biz)) && all(d.entries, function (x) { return x.biz; }) ? '' : 'role';
  }
  if (t === 'admin_stock') {
    const sid = d.cancelId || d.approveId; if (sid) { const m = byId(stockMovesAll(), sid); return m && ok(m.biz) ? '' : 'role'; }
    return all(d.moves, function (x) { return x.biz; }) ? '' : 'role';
  }
  if (t === 'admin_product') return (!d.product || ok(d.product.biz)) && all(d.products, function (x) { return x.biz; }) ? '' : 'role';
  if (t === 'admin_bank') {
    if (d.undoImport) { const m = byId(importRows(), d.undoImport); return m && ok(m.biz) ? '' : 'role'; }
    if (d.ruleCancel) { const r = byId(ruleRows(), d.ruleCancel); return r && ok(r.biz) ? '' : 'role'; }
    if (d.rule) return ok(d.rule.biz) ? '' : 'role';
    if (d.import && !ok(d.import.biz)) return 'role';
    if (!all(d.lines, function (x) { return x.biz; })) return 'role';
    if ((d.updates || []).length) { const B = {}; bankRows().forEach(function (r) { B[r.id] = r.biz; }); if (!d.updates.every(function (u) { return ok(B[String(u.id)]); })) return 'role'; }
    return '';
  }
  if (t === 'admin_order') { const o = byId(orderRows(), d.id); return o && ok(o.biz) ? '' : 'role'; }
  if (t === 'admin_partner') return ok((d.partner || {}).biz) ? '' : 'role';
  if (t === 'admin_po') {
    if (d.inboxId) { const r = byId(poInRows(), d.inboxId); return r && ok(r.biz) ? '' : 'role'; }
    const pid = d.statusId || d.updateId; if (pid) { const p = byId(poRows(), pid); if (!p || !ok(p.biz)) return 'role'; }
    return !d.po || ok(d.po.biz) ? '' : 'role';
  }
  if (t === 'admin_task') {
    if (d.cancelId) { const k = byId(taskRows(), d.cancelId); return k && ok(k.biz) ? '' : 'role'; }
    return ok((d.task || {}).biz) ? '' : 'role';
  }
  if (t === 'admin_reminder') {
    const rid = d.cancelId || d.doneId || d.updateId; if (rid) { const r = byId(reminderRows(), rid); if (!r || !ok(r.co)) return 'role'; }
    return !d.reminder || ok(d.reminder.co) ? '' : 'role';
  }
  if (t === 'admin_record') {
    const sh = logSheet(), last = sh.getLastRow(); if (last < 2) return 'role';
    const v = sh.getRange(2, 1, last - 1, 18).getValues();
    for (let i = 0; i < v.length; i++) if (d.payId ? String(v[i][17]) === String(d.payId) : String(v[i][0]) === String(d.cancelId || d.statusId)) return ok(v[i][15]) ? '' : 'role';
    return 'role';
  }
  if (t === 'admin_import_cozy') return ok('cozy') ? '' : 'role';
  if (t === 'admin_boost') {   // зураг харах — бүгд; нэхэмжлэх засах — мөр бүрийн компанид эрхтэй бол
    if (!d.edit) return '';
    const B = {}; const sh = logSheet(), last = sh.getLastRow(); if (last >= 2) sh.getRange(2, 1, last - 1, 16).getValues().forEach(function (v) { B[String(v[0])] = String(v[15]); });
    return (d.edit || []).every(function (x) { return ok(B[String(x.id)]); }) ? '' : 'role';
  }
  if (t === 'admin_eb') return ok(d.biz) ? '' : 'role';
  if (t === 'admin_setting') return d.key === 'minstock' && ok(d.biz) ? '' : 'role';   // менежер зөвхөн өөрийн дэлгүүрийн доод үлдэгдлийг
  return 'role';
}
function adminLogin(d) {
  const user = String(d.user || '').trim().toLowerCase(), pass = String(d.pass || '').trim();
  const cache = CacheService.getScriptCache();
  const key = 'afail_' + user;
  const fails = Number(cache.get(key) || 0);
  if (fails >= 10) return { status: 'error', error: 'locked' };
  const s = cacheGet('stf', staffRows).filter(function (x) { return x.username === user && (x.role === 'Эзэн' || x.role === 'Менежер') && x.status === 'Тийм'; })[0];
  if (!s || s.code !== pass.padStart(4, '0')) { cache.put(key, String(fails + 1), 900); return { status: 'error', error: 'auth' }; }
  cache.remove(key);
  const token = Utilities.getUuid();
  cache.put('tok_' + token, s.role === 'Эзэн' ? s.id : JSON.stringify({ id: s.id, role: 'Менежер', biz: s.biz }), TOKEN_TTL);
  return { status: 'ok', token: token, name: s.name, role: s.role, biz: s.biz };
}
function adminRead(d) {
  const a = cacheGet('adm', adminData);
  a.records = d.from ? data(d.from).records : cacheGet('rec', function () { return data('').records; });
  a.stock = cacheGet('stk', function () { return stockAll(true); });
  a.moves = cacheGet('mov', stockMoves);
  a.counts = stockMovesAll().filter(function (m) { return m.status === 'Хүлээгдэж'; });   // ажилтны тооллого — батлах
  a.journal = cacheGet('jr', journalRows);
  a.partners = cacheGet('pt', partnerRows);
  const pr = PropertiesService.getScriptProperties();
  a.taxcfg = JSON.parse(pr.getProperty('TAXCFG') || '{}');
  a.accountsX = JSON.parse(pr.getProperty('ACCOUNTS_X') || '[]');
  a.lock = pr.getProperty('LOCK') || '';
  a.meta = { closed: pr.getProperty('CLOSED') || '', lastBackup: pr.getProperty('LAST_BACKUP') || '', backupUrl: pr.getProperty('BACKUP_FOLDER_URL') || '' };
  a.reminders = cacheGet('rem', reminderRows);
  a.bank = cacheGet('bank', bankRows);
  a.importLog = cacheGet('imp', importRows);
  a.bankRules = cacheGet('rule', ruleRows);
  a.docs = cacheGet('docs', docRows);
  a.tasks = cacheGet('task', taskRows);
  a.payInfo = payInfoAll();
  a.notices = staffNoticeList();
  a.storepay = {}; Object.keys(BIZ_NAMES).forEach(function (b) { a.storepay[b] = spOn(b); });
  a.ebuuhia = ebOn();   // буухиа API асаалттай эсэх (түлхүүр буцаахгүй)   // зөвхөн асаалттай эсэх — түлхүүр буцаахгүй
  a.orders = cacheGet('ord', orderRows).map(function (o) { delete o.row; return o; });
  a.tasks = a.tasks.map(function (t) { delete t.row; return t; });
  a.products = cacheGet('prod', productRows).map(function (p) { const o = Object.assign({}, p); delete o.row; return o; });
  a.loans = cacheGet('loan', loanRows).map(function (x) { delete x.row; return x; });
  a.pf = cacheGet('pf', pfAll);   // хувийн санхүү — зөвхөн Эзэнд (доор менежерээс хасна)
  a.pfcfg = JSON.parse(pr.getProperty('PF_CFG') || '{}');
  a.pos = cacheGet('po', poRows).map(function (x) { delete x.row; return x; });
  const poIn0 = poInRows().map(function (x) { delete x.row; return x; });
  a.poInbox = poIn0.filter(function (x) { return x.status === 'Хүлээгдэж'; });   // ажилтны «Бараа ирсэн», карго — батлах
  a.poLog = poIn0.filter(function (x) { return x.status !== 'Хүлээгдэж'; }).slice(-300);   // шийдэгдсэн ажилтны бүртгэл — хэн илгээснийг хадгална («Ажилтны бүртгэл» таб)
  a.bankLinks = JSON.parse(pr.getProperty('BANKLINKS') || '[]');
  a.bankAuto = bankAutoInfo();   // мэдэгдлээр автоматаар оруулах: асаалттай эсэх, сүүлд ирсэн (түлхүүр буцаахгүй)
  a.kpi = JSON.parse(pr.getProperty('KPI') || '{}');
  a.boostbud = JSON.parse(pr.getProperty('BOOST_BUD') || '[]');   // Boost төсөв [{ id, biz, from, days, mnt, usd, note, by, at }]
  a.targets = JSON.parse(pr.getProperty('TARGETS') || '{}');   // борлуулалтын зорилт { 'biz|YYYY-MM': { total, staff: { нэр: дүн } } }
  a.assets = JSON.parse(pr.getProperty('ASSETS') || '[]');
  a.review = JSON.parse(pr.getProperty('REVIEW') || '{}');
  a.company = JSON.parse(pr.getProperty('COMPANY') || '{}');
  a.ebold = JSON.parse(pr.getProperty('EB_OLD') || '{}');   // буухиа: эхний үлдэгдлээс өмнөх (тооцоо хийгдсэн) хүргэлтийн код → { by, at }   // компанийн мэдээлэл { biz: { name, short, color, taxMode, tin, vat, ebarimt, addr, phone, email, fyStart, ebFee } }   // удирдлагын тойм { 'biz|YYYY-MM': { good, issues, next, complaints, planProfit } }
  a.minstock = minStockAll();
  a.digest = { on: pr.getProperty('DIGEST') === 'on', to: pr.getProperty('DIGEST_TO') || '', mail: DIGEST_MAIL };
  a.priceLog = cacheGet('price', priceRows);
  const who = d._who || { role: 'Эзэн', biz: 'all' };
  a.role = who.role; a.roleBiz = who.biz;
  if (who.role !== 'Эзэн') {   // менежер: зөвхөн өөрийн дэлгүүр
    const ok = function (b) { return mgrCan(who, b); }, keep = function (arr, f) { return (arr || []).filter(function (x) { return ok(f ? f(x) : x.biz); }); };
    a.staff = (a.staff || []).filter(function (s) { return staffBizes(s.biz).some(ok); }).map(function (s) { return { id: s.id, name: s.name, biz: s.biz, role: s.role, status: s.status, username: s.username }; });
    a.salary = []; a.loans = []; a.docs = []; a.assets = []; a.kpi = {}; a.digest = { on: false, to: '' }; a.pf = {}; a.pfcfg = {};
    ['records', 'moves', 'journal', 'partners', 'bank', 'orders', 'tasks', 'products', 'pos', 'poInbox', 'poLog', 'priceLog', 'bankLinks'].forEach(function (k) { a[k] = keep(a[k]); });
    a.reminders = keep(a.reminders, function (r) { return r.co; });
    const st = {}; Object.keys(a.stock || {}).forEach(function (b) { if (ok(b)) st[b] = a.stock[b]; }); a.stock = st;
    const ms = {}; Object.keys(a.minstock || {}).forEach(function (b) { if (ok(b)) ms[b] = a.minstock[b]; }); a.minstock = ms;
    const pi = {}; Object.keys(a.payInfo || {}).forEach(function (b) { if (ok(b)) pi[b] = a.payInfo[b]; }); a.payInfo = pi;
  }
  return a;
}

// Ажилтны хуудаснаас ирсэн борлуулалт / зарлага / касс хаалт
// Бичлэг бүрийг ажилтны токеноор шалгана: бичлэгийн өөрийн токен (r.tok) эсвэл одоо нэвтэрсэн ажилтны токен (data.token).
// Токенгүй, хуурамч, хугацаа дууссан, эсвэл идэвхгүй ажилтны бичлэгийг хүлээж авахгүй (rejected-д буцаана — дэлгүүр дахин илгээнэ).
function saveRecords(data) {
  const cur = checkStaff(data.token), memo = {};
  const verify = function (t) { if (!t) return null; if (!(t in memo)) memo[t] = checkStaff(t); return memo[t]; };
  const sheet = logSheet();
  const seen = existingIds(sheet);
  const rows = [], rejected = [];
  // Захиалгаас үүссэн борлуулалт (bill = захиалгын ID): нэг захиалгын нэг барааг давхар борлуулахгүй (хөтөч серверээс хоцорвол давхар илгээдэг)
  const net = {};
  if ((data.records || []).some(function (r) { return r.type === 'sale' && /^O\d/.test(String(r.bill || '')); })) {
    const lr = sheet.getLastRow();
    if (lr >= 2) sheet.getRange(2, 1, lr - 1, LOG_HEAD.length).getValues().forEach(function (v) {
      if (String(v[16]) === 'sale' && /^O\d/.test(String(v[17])) && String(v[18]) !== 'Устгасан') { const k = v[17] + '|' + String(v[6]).replace(/ \(буцаалт\)/, ''); net[k] = (net[k] || 0) + (Number(v[7]) > 0 ? 1 : -1); }
    });
  }
  (data.records || []).forEach(function (r) {
    if (!r.id || seen[r.id] || !BIZ_NAMES[r.biz] || !TYPE_NAMES[r.type]) return;
    if (r.type === 'collect') return;   // «Төлбөр орсон»-ыг зөвхөн удирдлага бүртгэнэ (хуучин хуудаснаас ирсэнийг алгасна)
    const own = verify(r.tok);
    let who = own && own.biz === r.biz ? own : (cur && cur.biz === r.biz ? cur : null);
    if (!who && r.type === 'boost' && r.biz !== 'mgmt') who = own || cur;   // Boost нэхэмжлэх: нэг нэхэмжлэхэд олон компанийн мөр (нэвтэрсэн ажилтан)
    if (!who) { rejected.push(r.id); return; }
    if (r.type === 'sale' && /^O\d/.test(String(r.bill || ''))) {
      const k = r.bill + '|' + String(r.item || '').slice(0, 80).replace(/ \(буцаалт\)/, ''), sg = Number(r.qty) > 0 ? 1 : -1;
      if (sg > 0 ? (net[k] || 0) > 0 : (net[k] || 0) <= 0) return;   // давхар борлуулалт / эх борлуулалтгүй буцаалт
      net[k] = (net[k] || 0) + sg;
    }
    const staffName = own && (own.biz === r.biz || r.type === 'boost') ? own.staff.name : (r.staff || who.staff.name);   // өөрийн токентой бол нэрийг сервер бичнэ
    seen[r.id] = 1;
    rows.push([
      r.id, r.date, r.time, BIZ_NAMES[r.biz], TYPE_NAMES[r.type], staffName,
      r.type === 'sale' || r.type === 'attend' || r.type === 'boost' ? String(r.item || '').slice(0, 80) : (r.type === 'expense' || r.type === 'request' ? String(r.category || '').slice(0, 80) : ''),
      r.type === 'sale' || r.type === 'boost' ? Number(r.qty) : '',     // boost: qty = хоног
      r.type === 'sale' || r.type === 'boost' ? r.unit : '',            // boost: unit = валют (USD/MNT)
      r.type === 'sale' || r.type === 'boost' ? Number(r.price) : '',   // boost: price = валютаар төлсөн дүн
      Number(r.amount) || 0,
      r.type === 'sale' || r.type === 'collect' ? r.pay : '',
      r.type === 'close' ? Number(r.counted) : '',
      r.type === 'close' ? Number(r.diff) : '',
      r.note || '', r.biz, r.type, String(r.bill || '').slice(0, 40), '', String(r.customer || '').slice(0, 80),
    ]);
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, LOG_HEAD.length).setValues(rows);
  if (data.token && !cur) return { status: 'error', error: 'auth', saved: rows.length, rejected: rejected };   // одоогийн нэвтрэлт хүчингүй
  return { status: 'ok', saved: rows.length, rejected: rejected };
}

// ── Ажилтны токен: «ажилтны ID | дэлгүүр | дуусах хугацаа | гарын үсэг» ──
// Гарын үсгийг зөвхөн серверт (Script Properties) хадгалагдах нууц түлхүүрээр зурна — GitHub-д байхгүй тул хуурамчаар хийх боломжгүй.
const STAFF_TOKEN_DAYS = 7;
function staffSecret() {
  const p = PropertiesService.getScriptProperties();
  let k = p.getProperty('STAFF_SECRET');
  if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('STAFF_SECRET', k); }
  return k;
}
function staffSig(body) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, staffSecret())); }
function signStaff(id, biz) {
  const body = id + '|' + biz + '|' + (Date.now() + STAFF_TOKEN_DAYS * 864e5);
  return body + '|' + staffSig(body);
}
function checkStaff(tok) {
  const p = String(tok || '').split('|');
  if (p.length !== 4 || !BIZ_NAMES[p[1]] || !(Number(p[2]) > Date.now())) return null;
  if (staffSig(p.slice(0, 3).join('|')) !== p[3]) return null;
  const s = cacheGet('stf', staffRows).filter(function (x) { return x.id === p[0]; })[0];   // кэш — ажилтны өөрчлөлтөөр цэвэрлэгдэнэ
  if (!s || s.status !== 'Тийм' || !staffIn(s, p[1])) return null;   // идэвхгүй болгомогц шууд хүчингүй
  return { staff: s, biz: p[1] };
}

// ── Унших ──
function doGet(e) {
  const p = e.parameter || {};
  let out;
  if (p.action === 'products') out = products(p.biz);
  else if (p.action === 'login') out = login(p.biz, p.user, p.code, p.multi === '1');
  else if (p.action === 'stock') out = BIZ_NAMES[p.biz] ? { status: 'ok', stock: stockPublic(p.biz) } : { status: 'error', error: 'biz' };
  else if (p.action === 'tin') out = tinInfo(p.q);
  else out = { status: 'ok', app: 'NOMAAD' };
  const body = JSON.stringify(out);
  if (p.callback) {
    return ContentService.createTextOutput(p.callback + '(' + body + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ── И-баримтыг дараа нь (нөхөж) гаргасан борлуулалтын тайлбарт ДДТД бичнэ (ажилтны токеноор, зөвхөн өөрийн дэлгүүрийн мөр) ──
function recordReceipt(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const ids = (Array.isArray(d.ids) ? d.ids : []).map(String).slice(0, 200), ddtd = String(d.ddtd || '');
  if (!ids.length || !/^\d{15,40}$/.test(ddtd)) return { status: 'error', error: 'fields' };
  const sh = logSheet(), last = sh.getLastRow();
  if (last < 2) return { status: 'error', error: 'not_found' };
  const v = sh.getRange(2, 1, last - 1, 16).getValues(); let n = 0;
  for (let i = 0; i < v.length; i++) {
    if (ids.indexOf(String(v[i][0])) < 0 || String(v[i][15]) !== who.biz) continue;
    sh.getRange(i + 2, 15).setValue(('ДДТД ' + ddtd + ' · ' + String(d.note || 'нөхөж олгосон')).slice(0, 200)); n++;
  }
  return { status: 'ok', updated: n };
}

// ═══════════ ӨДӨР БҮРИЙН И-МЭЙЛ ТОЙМ ═══════════
// Хоцорсон зээл, сануулга, баталгаажаагүй захиалгын төлбөр, тулгаагүй банкны гүйлгээ, дуусах дөхсөн бараа.
// Асаах: удирдлага → Тохиргоо → «И-мэйл тойм». Анх удаа редактороос digestTest-ийг ажиллуулж «и-мэйл илгээх» зөвшөөрөл өгнө.
function digestText() {
  const td = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), lines = [];
  const fmtN = function (n) { return '₮' + Math.round(n).toLocaleString('en-US'); };
  // Сануулга (өнөөдөр / хэтэрсэн / маргааш)
  const tm = Utilities.formatDate(new Date(Date.now() + 864e5), TZ, 'yyyy-MM-dd');
  reminderRows().filter(function (r) { return r.status === 'Хүлээгдэж' && r.date <= tm; }).forEach(function (r) {
    lines.push((r.date < td ? '- Хэтэрсэн ' : r.date === td ? '- Өнөөдөр ' : '- Маргааш ') + r.date + ' — ' + r.title + (r.amount ? ' ' + fmtN(r.amount) : ''));
  });
  // Зээлийн хуваарь: журналын «#ID» бичилтээс төлсөн дүн
  const J = journalRows();
  loanRows().filter(function (L) { return L.status === 'Идэвхтэй' && (L.schedule || []).length; }).forEach(function (L) {
    const la = L.kind === 'Авсан' ? '3501' : '1210', ia = L.kind === 'Авсан' ? '7401' : '5202', re = new RegExp('#' + L.id + '(?![\\w])');
    let paid = 0;
    J.forEach(function (j) {
      if (!re.test(String(j.desc))) return;
      if (L.kind === 'Авсан' ? (j.dr === la || j.dr === ia) : (j.cr === la || j.cr === ia)) paid += Number(j.amount) || 0;
    });
    let cum = 0, late = 0, since = '';
    L.schedule.slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }).forEach(function (r) {
      cum += (Number(r.p) || 0) + (Number(r.i) || 0);
      if (r.d < td && cum - paid > 0.5) { late = cum - paid; if (!since) since = r.d; }
    });
    if (late > 0.5) lines.push('- Зээл хоцорсон — ' + L.partner + ' ' + fmtN(late) + ' (' + since + '-наас) · ' + (BIZ_NAMES[L.biz] || L.biz));
  });
  // Ажилтан «орсон» гэсэн ч баталгаажаагүй захиалга
  const uc = orderRows().filter(function (o) { return o.paid === 'Орсон' && !o.confirmed && !/^(Цуцалсан|Буцаасан)$/.test(o.status); });
  if (uc.length) lines.push('- Баталгаажуулах захиалгын төлбөр: ' + uc.length + ' захиалга, ' + fmtN(uc.reduce(function (a, o) { return a + o.amount; }, 0)));
  // Тулгаагүй банкны гүйлгээ
  const nb = bankRows().filter(function (l) { return l.status === 'Шинэ'; }).length;
  if (nb) lines.push('- Тулгаагүй банкны гүйлгээ: ' + nb);
  // Дуусах дөхсөн бараа
  const mins = minStockAll(), st = stockAll(), low = [];
  Object.keys(mins).forEach(function (b) { Object.keys(mins[b]).forEach(function (it) { const s = (st[b] || {})[it], q = s ? s.shop + s.wh : 0; if (q <= Number(mins[b][it])) low.push(it + ' (' + q + ')'); }); });
  if (low.length) lines.push('- Дуусах дөхсөн бараа: ' + low.slice(0, 15).join(', ') + (low.length > 15 ? ' …' : ''));
  return lines;
}
function dailyDigest() {
  const pr = PropertiesService.getScriptProperties(), to = pr.getProperty('DIGEST_TO');
  if (pr.getProperty('DIGEST') !== 'on' || !to) return 'off';
  const lines = digestText();
  if (!lines.length) return 'empty';
  return digestSend(to, 'NOMAAD — өнөөдөр анхаарах ' + lines.length + ' зүйл', lines.join('\n') + '\n\nУдирдлагын самбар: https://akunaaanujin-blip.github.io/nomaad_catering/business/admin.html') ? 'sent' : 'nomail';
}
// И-мэйл илгээх (script.send_mail зөвшөөрөл — файлын эхэн дэх digestTest-ээр өгнө)
const DIGEST_MAIL = true;
function digestSend(to, subj, body) { MailApp.sendEmail(to, subj, body); return true; }
function adminDigest(d) {
  const pr = PropertiesService.getScriptProperties();
  if (d.to !== undefined) { const to = String(d.to || '').trim(); if (to && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { status: 'error', error: 'email' }; pr.setProperty('DIGEST_TO', to); }
  if (d.on && !DIGEST_MAIL) return { status: 'error', error: 'nomail' };
  if (d.on !== undefined) {
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyDigest') ScriptApp.deleteTrigger(t); });
    if (d.on) ScriptApp.newTrigger('dailyDigest').timeBased().everyDays(1).atHour(8).create();
    pr.setProperty('DIGEST', d.on ? 'on' : 'off');
  }
  if (d.preview) return { status: 'ok', lines: digestText() };
  return { status: 'ok' };
}

// ── ТТД / регистр → байгууллагын нэр ──
// ebarimt.mn-ийн нийтийн лавлагаа (хөтчөөс шууд дуудахыг CORS хаадаг тул энд дамжуулна). 6 цаг кэшлэнэ.
// Анх удаа: редактороос tinTest()-ийг нэг удаа ажиллуулж «гадаад холболт» (UrlFetchApp)-ын зөвшөөрөл өгнө.
function tinInfo(q) {
  q = String(q || '').trim().toUpperCase().replace(/\s/g, '');
  if (!/^(\d{7}|\d{11,12})$/.test(q)) return { status: 'error', error: 'format' };
  // 2026-10-19: ebarimt.mn нь Google-ийн (гадаад) серверээс ирсэн хүсэлтийг хаадаг («Address unavailable», ~100 сек) —
  // ажилтан удаан хүлээхгүйн тулд унтраалттай. ITC нээвэл Script Properties-д TIN_LOOKUP = on болгоно.
  if (PropertiesService.getScriptProperties().getProperty('TIN_LOOKUP') !== 'on') return { status: 'error', error: 'blocked' };
  const cache = CacheService.getScriptCache(), key = 'tin_' + q, hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const get = function (url) {
    const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return null;
    try { return JSON.parse(r.getContentText()); } catch (e) { return null; }
  };
  try {
    let tin = /^\d{11,12}$/.test(q) ? q : '', out;
    if (!tin) {   // 7 оронтой регистр → ТТД
      const a = get('https://api.ebarimt.mn/api/info/check/getTinInfo?regNo=' + encodeURIComponent(q));
      if (a && a.status === 200 && a.data) tin = String(a.data);
    }
    const b = tin ? get('https://api.ebarimt.mn/api/info/check/getInfo?tin=' + encodeURIComponent(tin)) : null;
    if (b && b.status === 200 && b.data && b.data.found) out = { status: 'ok', found: true, tin: tin, regNo: /^\d{7}$/.test(q) ? q : '', name: String(b.data.name || ''), vatPayer: !!b.data.vatPayer };
    else out = { status: 'ok', found: false, tin: tin };
    cache.put(key, JSON.stringify(out), out.found ? 21600 : 1800);
    return out;
  } catch (e) {
    return { status: 'error', error: /permission|зөвшөөр|authoriz/i.test(String(e.message)) ? 'perm' : 'network', msg: String(e.message).slice(0, 160) };
  }
}

// ── Ажилтны нэвтрэлт ── Кодын жагсаалтыг хэзээ ч буцаахгүй. Зөвхөн "Тийм" төлөвтэй ажилтан нэвтэрнэ.
function login(biz, user, code, multi) {
  code = String(code || '').trim();
  user = String(user || '').trim().toLowerCase();
  if (!BIZ_NAMES[biz] || !USER_RE.test(user) || !/^\d{4,8}$/.test(code)) return { status: 'error', error: 'code' };
  const cache = CacheService.getScriptCache();
  const key = 'fail_' + biz + '_' + user;
  const fails = Number(cache.get(key) || 0);
  if (fails >= 10) return { status: 'error', error: 'locked' };
  // multi — шинэ хуудас: эрхтэй бүх дэлгүүрийн токеныг нэг дор буцаана (хуудас хооронд дахин нэвтрэхгүй шилжинэ)
  const s = cacheGet('stf', staffRows).filter(function (x) { return x.username === user && (multi ? staffBizes(x.biz).length : staffIn(x, biz)); })[0];
  if (s && s.code === code.padStart(4, '0')) {
    if (s.status === 'Хүлээгдэж') return { status: 'error', error: 'pending' };
    if (s.status === 'Тийм') {
      cache.remove(key);
      const out = { status: 'ok', name: s.name, role: s.role === 'Худалдагч' ? 'seller' : 'manager' };
      if (staffIn(s, biz)) out.token = signStaff(s.id, biz);
      if (multi) { out.tokens = {}; staffBizes(s.biz).forEach(function (b) { out.tokens[b] = b === biz && out.token ? out.token : signStaff(s.id, b); }); }
      return out;
    }
  }
  cache.put(key, String(fails + 1), 600);
  return { status: 'error', error: 'code' };
}

// Ажилтан PIN-ээ солих (6 орон): хуучин PIN заавал
function staffPin(d) {
  const who = checkStaff(d.token); if (!who) return { status: 'error', error: 'auth' };
  const old = String(d.old || '').trim(), pin = String(d.pin || '').trim();
  if (!/^\d{6}$/.test(pin)) return { status: 'error', error: 'pin' };
  if (who.staff.code !== old.padStart(4, '0')) return { status: 'error', error: 'old' };
  const c = staffSheet().getRange(who.staff.row, 3); c.setNumberFormat('@'); c.setValue(pin);
  return { status: 'ok' };
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
  if (!/^\d{4}$/.test(code)) return { status: 'error', error: 'code' };   // код 4 орон
  const rows = staffRows();
  if (rows.some(function (s) { return s.username === username; })) return { status: 'error', error: 'user_taken' };
  const sh = staffSheet();
  const id = 'E' + Date.now();
  sh.appendRow([biz, name, code, 'Худалдагч', 'Хүлээгдэж',
    String(d.surname || '').trim().slice(0, 60), phone, String(d.regno || '').trim().slice(0, 12),
    String(d.position || '').trim().slice(0, 40), '', String(d.bank || '').trim().slice(0, 40),
    Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), id, username,
    String(d.address || '').trim().slice(0, 150), /^\d{4}-\d{2}-\d{2}$/.test(String(d.start)) ? d.start : '', '', '', '', '']);
  sh.getRange(sh.getLastRow(), 3).setNumberFormat('@').setValue(code);   // «012345» тэгээрээ хадгалагдана
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
  if (f.biz !== undefined) { const b = cleanStaffBiz(f.biz); if (!b) return { status: 'error', error: 'biz' }; set(1, b); }
  if (f.position !== undefined) set(9, String(f.position).slice(0, 40));
  if (f.salary !== undefined) set(10, Number(f.salary) || 0);
  if (f.phone !== undefined) set(7, String(f.phone).slice(0, 15));
  if (f.bank !== undefined) set(11, String(f.bank).slice(0, 40));
  if (f.name) set(2, String(f.name).slice(0, 60));
  if (f.code && /^\d{4,8}$/.test(f.code)) { sh.getRange(s.row, 3).setNumberFormat('@'); set(3, String(f.code)); }
  if (f.address !== undefined) set(15, String(f.address).slice(0, 150));
  if (f.ndJob !== undefined && /^(\d{4}-\d{2})?$/.test(String(f.ndJob))) set(21, String(f.ndJob));
  if (f.ndType !== undefined && /^\d{5}$/.test(String(f.ndType))) set(22, String(f.ndType));
  return { status: 'ok', biz: f.biz !== undefined ? cleanStaffBiz(f.biz) : s.biz };   // biz — шинэ сервер (олон дэлгүүр) суусныг удирдлага шалгана
}
// Удирдагч: хөдөлмөрийн гэрээ байгуулах / шинэчлэх. Дугаар ХГ-2026-001 гэх мэт он бүр шинээр дараална.
function adminContract(d) {
  const s = staffRows().filter(function (x) { return x.id === d.id; })[0];
  if (!s) return { status: 'error', error: 'not_found' };
  const t = d.terms || {}, ymd = /^\d{4}-\d{2}-\d{2}$/;
  if (!ymd.test(String(t.start)) || !(Number(t.salary) > 0) || !String(t.position || '').trim()) return { status: 'error', error: 'fields' };
  if (t.end && !ymd.test(String(t.end))) return { status: 'error', error: 'fields' };
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), y = today.slice(0, 4);
  let no = s.contractNo;
  if (!no || d.renew) {
    const n = staffRows().filter(function (x) { return x.contractNo.indexOf('ХГ-' + y + '-') === 0; }).length + 1;
    no = 'ХГ-' + y + '-' + ('00' + n).slice(-3);
  }
  const sh = staffSheet();
  sh.getRange(s.row, 9, 1, 2).setValues([[String(t.position).slice(0, 40), Number(t.salary)]]);
  if (t.address !== undefined) sh.getRange(s.row, 15).setValue(String(t.address).slice(0, 150));
  sh.getRange(s.row, 16, 1, 5).setValues([[t.start, no, today, t.end || '', JSON.stringify(t).slice(0, 1000)]]);
  return { status: 'ok', no: no, date: today };
}
function adminSalary(d) {
  const e = d.entry || {};
  if (!SALARY_KINDS[e.kind] || !(Number(e.amount) > 0) || !/^\d{4}-\d{2}$/.test(String(e.month))) return { status: 'error', error: 'fields' };
  const s = staffRows().filter(function (x) { return x.id === e.staffId; })[0];
  if (!s) return { status: 'error', error: 'not_found' };
  // Хэд хэдэн дэлгүүрийн ажилтны цалинг аль компанийн зардал болохыг заана
  const L = staffBizes(s.biz), biz = L.length === 1 ? L[0] : String(e.biz || '');
  if (!BIZ_NAMES[biz] || (s.biz !== 'all' && L.indexOf(biz) < 0)) return { status: 'error', error: 'biz' };
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
  if (sh.getRange(1, STOCK_HEAD.length).getValue() !== STOCK_HEAD[STOCK_HEAD.length - 1]) {
    if (sh.getMaxColumns() < STOCK_HEAD.length) sh.insertColumnsAfter(sh.getMaxColumns(), STOCK_HEAD.length - sh.getMaxColumns());
    sh.getRange(1, 1, 1, STOCK_HEAD.length).setValues([STOCK_HEAD]);
    styleHead(sh, STOCK_HEAD.length, '#334155');
  }
  return sh;
}
// Ажилтны тооллого «Хүлээгдэж» төлөвтэй орж, удирдлага баталсны дараа л үлдэгдэлд тусна
function stockMoves() { return stockMovesAll().filter(function (m) { return m.status !== 'Хүлээгдэж'; }); }
function stockMovesAll() {
  const sh = stockSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, STOCK_HEAD.length).getValues().map(function (v) {
    return { id: String(v[0]), date: fmtDate(v[1], 'yyyy-MM-dd HH:mm'), loc: String(v[3]), item: String(v[4]).trim(),
             kind: String(v[5]), qty: Number(v[6]) || 0, cost: Number(v[7]) || 0, by: String(v[8]), note: String(v[9]), biz: String(v[10]),
             pay: String(v[11] || ''), partner: String(v[12] || ''), status: String(v[13] || ''),
             buy: Number(v[14]) || 0, cur: String(v[15] || ''), rate: Number(v[16]) || 0, cargo: Number(v[17]) || 0,
             cargoPay: String(v[18] || ''), cargoPartner: String(v[19] || '') };
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
      if (item === FEE_ITEM || item === DISC_ITEM || item === SPLIT_ITEM) return;   // хүргэлт, хөнгөлөлт, төлбөр хуваалт — бараа биш
      const it = out[biz][item] = out[biz][item] || { shop: 0, wh: 0 };
      it.shop -= Number(v[7]) || 0;   // буцаалтын тоо сөрөг тул буцааж нэмэгдэнэ
    });
  }
  Object.keys(out).forEach(function (b) { Object.keys(out[b]).forEach(function (k) {
    const it = out[b][k];
    if (it.shop < 0 && it.wh > 0) { const t = Math.min(it.wh, -it.shop); it.wh -= t; it.shop += t; }   // дэлгүүрт дутсаныг агуулахаас
    out[b][k].shop = Math.round(out[b][k].shop * 1000) / 1000; out[b][k].wh = Math.round(out[b][k].wh * 1000) / 1000;
    const c = cq[b + '|' + k];
    if (withCost && c && c.q) out[b][k].cost = Math.round(c.v / c.q);
  }); });
  return out;
}
// Удирдагч: хөдөлгөөн бүртгэх (олноор). Шилжүүлэг = хоёр мөр (−гарах, +орох).
// Хөдөлгөөний дараа аль нэг байршлын үлдэгдэл хасах болох эсэх (болох бол барааны нэр)
function stockNegative(biz, list) {
  const st = stockAll()[biz] || {};
  for (let i = 0; i < list.length; i++) {
    const m = list[i], it = st[m.item] = st[m.item] || { shop: 0, wh: 0 }, k = m.loc === 'Агуулах' ? 'wh' : 'shop';
    it[k] += Number(m.qty) || 0;
    if (Number(m.qty) < 0 && it[k] < -1e-9) return m.item + ' (' + m.loc + ')';
  }
  return '';
}
function adminStock(d) {
  if (d.approveId) {   // ажилтны тооллогыг батлах — тэр үеийн зөрүүгээр үлдэгдэлд тусна
    const mv = stockMovesAll().filter(function (m) { return m.id === String(d.approveId) && m.status === 'Хүлээгдэж'; })[0];
    if (!mv) return { status: 'error', error: 'not_found' };
    if (mv.qty < 0) { const bad = stockNegative(mv.biz, [{ loc: mv.loc, item: mv.item, qty: mv.qty }]); if (bad) return { status: 'error', error: 'negative', item: bad }; }
    const sh = stockSheet(), ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === mv.id) { sh.getRange(i + 2, 14).setValue(''); sh.getRange(i + 2, 10).setValue(mv.note + ' · баталсан: ' + String(d.by || '').slice(0, 30)); return { status: 'ok' }; }
    return { status: 'error', error: 'not_found' };
  }
  if (d.editId) {   // хөдөлгөөн засах: тоо, нэгж өртөг, тайлбар, харилцагч (бараа, байршил, төрөл, огноо хэвээр)
    const mv = stockMoves().filter(function (m) { return m.id === String(d.editId); })[0];
    if (!mv) return { status: 'error', error: 'not_found' };
    if (mv.kind === 'Шилжүүлэг') return { status: 'error', error: 'state' };   // хос мөртэй — цуцлаад дахин бичнэ
    if (lockedDate(mv.date)) return { status: 'error', error: 'locked' };
    const qty = Number(d.qty);
    if (!isFinite(qty) || qty === 0 || (mv.qty > 0) !== (qty > 0)) return { status: 'error', error: 'fields' };
    if (qty - mv.qty < 0) { const bad = stockNegative(mv.biz, [{ loc: mv.loc, item: mv.item, qty: qty - mv.qty }]); if (bad) return { status: 'error', error: 'negative', item: bad }; }
    const sh = stockSheet(), ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === mv.id) {
      sh.getRange(i + 2, 7, 1, 4).setValues([[qty, Math.max(0, Number(d.cost) || 0) || '', sh.getRange(i + 2, 9).getValue(), String(d.note || '').slice(0, 120)]]);
      sh.getRange(i + 2, 13).setValue(String(d.partner || '').slice(0, 80));
      return { status: 'ok' };
    }
    return { status: 'error', error: 'not_found' };
  }
  if (d.cancelId) {   // буруу хөдөлгөөнийг цуцлах (мөр үлдэнэ) — цуцалснаар үлдэгдэл хасах болохгүй
    const mv = stockMoves().filter(function (m) { return m.id === String(d.cancelId); })[0];
    if (mv && mv.qty > 0) { const bad = stockNegative(mv.biz, [{ loc: mv.loc, item: mv.item, qty: -mv.qty }]); if (bad) return { status: 'error', error: 'negative', item: bad }; }
    return cancelRow(stockSheet(), d.cancelId, 14);
  }
  const moves = d.moves || [];
  if (!moves.length || moves.length > 1000) return { status: 'error', error: 'fields' };
  const byBiz = {};
  moves.forEach(function (m) { (byBiz[m.biz] = byBiz[m.biz] || []).push(m); });
  for (const b in byBiz) { const bad = stockNegative(b, byBiz[b]); if (bad) return { status: 'error', error: 'negative', item: bad }; }
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
    const pay = /^(Бэлэн|Харилцах|Зээлээр|Захиалга)$/.test(String(m.pay || '')) ? m.pay : '';   // Захиалга — урьдчилж төлсөн бараа захиалгаас (1505)
    const cur = /^(CNY|USD|MNT)$/.test(String(m.cur || '')) ? m.cur : '';
    const num = function (x) { const v = Number(x); return isFinite(v) && v > 0 ? Math.round(v * 10000) / 10000 : ''; };
    rows.push(['M' + Date.now() + '-' + (n++), now, BIZ_NAMES[m.biz], m.loc, String(m.item).trim().slice(0, 80), m.kind, qty, cost || '', by,
               String(m.note || '').slice(0, 120), m.biz, pay, String(m.partner || '').slice(0, 80), '',
               num(m.buy), num(m.buy) ? cur : '', num(m.rate), num(m.cargo),
               num(m.cargo) && /^(Бэлэн|Харилцах|Зээлээр)$/.test(String(m.cargoPay || '')) ? m.cargoPay : '', num(m.cargo) ? String(m.cargoPartner || '').slice(0, 80) : '']);
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
// Түгжсэн хугацааны (LOCK огноо хүртэл) гүйлгээг нэмэх, цуцлахыг хориглоно
function lockedDate(dt) { const l = PropertiesService.getScriptProperties().getProperty('LOCK') || ''; return l && String(dt).slice(0, 10) <= l; }
function adminJournal(d) {
  if (d.entries && d.entries.some(function (x) { return lockedDate(x.date); })) return { status: 'error', error: 'locked' };
  if (d.entry && d.entry.date && lockedDate(d.entry.date)) return { status: 'error', error: 'locked' };
  if (d.cancelId) { const jr = journalRows().filter(function (j) { return j.id === String(d.cancelId); })[0]; if (jr && lockedDate(jr.date)) return { status: 'error', error: 'locked' }; }
  if (d.entries) {   // олон мөр нэг дор (цалин бодолт г.м); бүгд зөв байж байж л бичнэ
    const list = d.entries;
    if (!list.length || list.length > 300) return { status: 'error', error: 'fields' };
    for (let i = 0; i < list.length; i++) {
      const x = list[i];
      if (!BIZ_NAMES[x.biz] || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) || !/^\d{4,6}$/.test(String(x.dr)) || !/^\d{4,6}$/.test(String(x.cr)) || x.dr === x.cr || !(Number(x.amount) > 0)) return { status: 'error', error: 'fields', index: i };
    }
    // v5.8: буухиа тооцоо — ижил хүргэлтийн (#EB:код) тооцоо журналд аль хэдийн байвал бүхэлд нь хүлээж авахгүй (2 таб/төхөөрөмж давхар бичихээс)
    const ebTag = function (t) { return /^Буухиа тооцоо/.test(String(t)) ? String(t).match(/#EB:[\w-]+/g) || [] : []; };
    const newEb = {}; list.forEach(function (x) { ebTag(x.desc).forEach(function (k) { newEb[k] = 1; }); });
    if (Object.keys(newEb).length) {
      const dup = []; journalRows().forEach(function (j) { ebTag(j.desc).forEach(function (k) { if (newEb[k] && dup.indexOf(k) < 0) dup.push(k); }); });
      if (dup.length) return { status: 'error', error: 'eb_dup', codes: dup.map(function (k) { return k.slice(4); }) };
    }
    const now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), by = String(d.by || '').slice(0, 40), sh = journalSheet();
    const rows = list.map(function (x, i) { return ['J' + Date.now() + '-' + i, x.date, BIZ_NAMES[x.biz], String(x.dr), String(x.cr), Number(x.amount), String(x.partner || '').slice(0, 80),
      String(x.desc || '').slice(0, 200), by, now, x.biz, '', '']; });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, JOURNAL_HEAD.length).setValues(rows);
    // банкны хуулгын мөрөөс үүссэн бичилт: тэр мөрийн «Бичилт» баганад журналын ID (импорт буцаахад цуцлагдана)
    const bj = {}; list.forEach(function (x, i) { if (x.bankId) (bj[String(x.bankId)] = bj[String(x.bankId)] || []).push(rows[i][0]); });
    if (Object.keys(bj).length) { const bs = bankSheet(); bankRows().forEach(function (r, i) { if (bj[r.id]) bs.getRange(i + 2, 15).setValue((r.jids ? r.jids + ',' : '') + bj[r.id].join(',')); }); }
    return { status: 'ok', saved: rows.length };
  }
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
  if (d.delId || d.editId) {   // харилцагч засах / устгах (журналын бичилтийн нэр өөрчлөгдөхгүй)
    const sh = partnerSheet(), last = sh.getLastRow(), ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) !== String(d.delId || d.editId)) continue;
      if (d.delId) { sh.deleteRow(i + 2); return { status: 'ok' }; }
      const q = d.partner || {};
      if (!/^(Нийлүүлэгч|Худалдан авагч)$/.test(String(q.kind)) || !String(q.name || '').trim()) return { status: 'error', error: 'fields' };
      sh.getRange(i + 2, 3, 1, 5).setValues([[q.kind, String(q.name).trim().slice(0, 80), String(q.tin || '').slice(0, 20), String(q.phone || '').slice(0, 20), String(q.note || '').slice(0, 120)]]);
      return { status: 'ok' };
    }
    return { status: 'error', error: 'not_found' };
  }
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
  if (last >= 2 && d.statusId) {   // мөнгөний хүсэлт: Батлагдсан / Төлсөн / Татгалзсан
    if (!/^(Батлагдсан|Төлсөн|Татгалзсан)$/.test(String(d.status))) return { status: 'error', error: 'fields' };
    const v = sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues();
    for (let i = 0; i < v.length; i++) {
      if (String(v[i][0]) !== String(d.statusId)) continue;
      const cur = String(v[i][18] || '');   // Хүлээгдэж ('') → Батлагдсан / Төлсөн / Татгалзсан; Батлагдсан → Төлсөн / Татгалзсан
      if (String(v[i][16]) !== 'request' || (cur && !(cur === 'Батлагдсан' && d.status !== 'Батлагдсан') && !(cur === 'Төлсөн' && d.status === 'Батлагдсан' && d.undo))) return { status: 'error', error: 'state' };   // undo — банкны тулгалт буцаахад
      sh.getRange(i + 2, 19).setValue(d.status);
      sh.getRange(i + 2, 15).setValue(String(v[i][14] || '') + ' [' + d.status.toLowerCase() + ': ' + String(d.by || '').slice(0, 30) + (d.ref ? ' ' + String(d.ref).slice(0, 30) : '') + ']');
      return { status: 'ok' };
    }
    return { status: 'error', error: 'not_found' };
  }
  if (last >= 2 && d.payId) {   // төлбөрийн хэлбэр засах: нэг баримтын (bill) бүх борлуулалтын мөр, огноо хэвээр
    const PAYS = { 'Бэлэн': 1, 'Карт': 1, 'Шилжүүлэг': 1, 'Зээлээр': 1, 'StorePay': 1 };
    if (!PAYS[d.pay] || !String(d.note || '').trim()) return { status: 'error', error: 'fields' };
    const v = sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues(), hit = [];
    for (let i = 0; i < v.length; i++) if (String(v[i][17]) === String(d.payId) && String(v[i][16]) === 'sale' && String(v[i][18]) !== 'Устгасан') hit.push(i);
    if (!hit.length) return { status: 'error', error: 'not_found' };
    const r0 = v[hit[0]], date = fmtDate(r0[1], 'yyyy-MM-dd'), biz = String(r0[15]);
    if (hit.some(function (i) { return /ДДТД/.test(String(v[i][14])); })) return { status: 'error', error: 'ebarimt' };
    if (lockedDate(date)) return { status: 'error', error: 'locked' };
    const cashTouched = d.pay === 'Бэлэн' || hit.some(function (i) { return String(v[i][11]) === 'Бэлэн'; });
    if (cashTouched && v.some(function (r) { return String(r[16]) === 'close' && String(r[15]) === biz && String(r[18]) !== 'Устгасан' && fmtDate(r[1], 'yyyy-MM-dd') === date; })) return { status: 'error', error: 'closed' };
    const from = hit.map(function (i) { return String(v[i][11]); }).filter(function (x, k, a) { return a.indexOf(x) === k; }).join('/');
    const stamp = ' [Төлбөр засав: ' + from + ' → ' + d.pay + ' · ' + String(d.by || '').slice(0, 30) + ' · ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd') + ' · ' + String(d.note).slice(0, 80) + ']';
    hit.forEach(function (i) { sh.getRange(i + 2, 12).setValue(d.pay); sh.getRange(i + 2, 15).setValue(String(v[i][14] || '') + stamp); });
    return { status: 'ok', n: hit.length };
  }
  if (last >= 2 && d.editId) {   // зарлага засах: ангилал, дүн, тайлбар (огноо, ажилтан хэвээр)
    const amt = Number(d.amount), v = sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues();
    if (!String(d.category || '').trim() || !(amt > 0)) return { status: 'error', error: 'fields' };
    for (let i = 0; i < v.length; i++) {
      if (String(v[i][0]) !== String(d.editId)) continue;
      if (String(v[i][16]) !== 'expense' || String(v[i][18]) === 'Устгасан') return { status: 'error', error: 'state' };
      const date = fmtDate(v[i][1], 'yyyy-MM-dd'), biz = String(v[i][15]);
      if (lockedDate(date)) return { status: 'error', error: 'locked' };
      if (Number(v[i][10]) !== amt && v.some(function (r) { return String(r[16]) === 'close' && String(r[15]) === biz && String(r[18]) !== 'Устгасан' && fmtDate(r[1], 'yyyy-MM-dd') === date; })) return { status: 'error', error: 'closed' };
      sh.getRange(i + 2, 7).setValue(String(d.category).trim().slice(0, 80));
      sh.getRange(i + 2, 11).setValue(amt);
      sh.getRange(i + 2, 15).setValue(String(d.note || '').slice(0, 200) + ' [засав: ' + String(d.by || '').slice(0, 30) + ' · ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd') + (Number(v[i][10]) !== amt ? ' · ' + Number(v[i][10]) + ' → ' + amt : '') + ']');
      return { status: 'ok' };
    }
    return { status: 'error', error: 'not_found' };
  }
  if (last < 2 || !d.cancelId) return { status: 'error', error: 'not_found' };
  const vals = sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) !== String(d.cancelId)) continue;
    if (String(vals[i][16]) === 'sale' && /ДДТД/.test(String(vals[i][14]))) return { status: 'error', error: 'ebarimt' };
    if (lockedDate(fmtDate(vals[i][1], 'yyyy-MM-dd'))) return { status: 'error', error: 'locked' };
    sh.getRange(i + 2, 19).setValue('Устгасан');
    sh.getRange(i + 2, 15).setValue(String(vals[i][14] || '') + ' [цуцалсан: ' + String(d.by || '').slice(0, 30) + ']');
    return { status: 'ok' };
  }
  return { status: 'error', error: 'not_found' };
}
// ── Boost нэхэмжлэх: Meta-гийн баримтын зураг (JPEG data URL) — Drive-ын эрх шаардахгүйн тулд «Boost баримт» хуудсанд 45,000 тэмдэгтээр хувааж хадгална ──
const SHEET_BSTIMG = 'Boost баримт', BSTIMG_HEAD = ['Нэхэмжлэх', 'Огноо', 'biz', 'Ажилтан', 'Хэсэг', 'Зураг'], BSTIMG_CHUNK = 45000, BSTIMG_MAX = 12;
function bstImgSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_BSTIMG);
  if (!sh) { sh = ss.insertSheet(SHEET_BSTIMG); sh.appendRow(BSTIMG_HEAD); sh.setFrozenRows(1); }
  return sh;
}
function boostImgSave(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const bill = String(d.bill || ''), img = String(d.img || '');
  if (!/^BST-[\w-]{4,30}$/.test(bill) || !/^data:image\/(jpeg|png|webp);base64,/.test(img)) return { status: 'error', error: 'fields' };
  const parts = []; for (let i = 0; i < img.length; i += BSTIMG_CHUNK) parts.push(img.slice(i, i + BSTIMG_CHUNK));
  if (parts.length > BSTIMG_MAX) return { status: 'error', error: 'size' };
  const sh = bstImgSheet(), last = sh.getLastRow();
  if (last >= 2 && sh.getRange(2, 1, last - 1, 1).getValues().some(function (v) { return String(v[0]) === bill; })) return { status: 'ok', img: true, dup: true };
  if (sh.getMaxColumns() < 5 + parts.length) sh.insertColumnsAfter(sh.getMaxColumns(), 5 + parts.length - sh.getMaxColumns());
  sh.getRange(last + 1, 1, 1, 5 + parts.length).setValues([[bill, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), who.biz, who.staff.name, parts.length].concat(parts)]);
  return { status: 'ok', img: true };
}
// Удирдлага: зураг унших (img: дугаар) / нэхэмжлэхийн мөр засах (edit: [{id, bill, date, qty, note}])
function adminBoost(d) {
  if (d.img) {
    const sh = bstImgSheet(), last = sh.getLastRow(); if (last < 2) return { status: 'error', error: 'not_found' };
    const v = sh.getRange(2, 1, last - 1, Math.min(sh.getLastColumn(), 5 + BSTIMG_MAX)).getValues();
    for (let i = v.length - 1; i >= 0; i--) if (String(v[i][0]) === String(d.img)) return { status: 'ok', img: v[i].slice(5, 5 + (Number(v[i][4]) || 1)).join('') };
    return { status: 'error', error: 'not_found' };
  }
  const ed = d.edit || [], sh = logSheet(), last = sh.getLastRow(); if (!ed.length || last < 2) return { status: 'error', error: 'fields' };
  const v = sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues(), at = {};
  v.forEach(function (r, i) { at[String(r[0])] = i; });
  for (let k = 0; k < ed.length; k++) {
    const x = ed[k], i = at[String(x.id)];
    if (i === undefined || String(v[i][16]) !== 'boost') return { status: 'error', error: 'not_found' };
    if ((x.bill && !/^BST-[\w-]{4,30}$/.test(String(x.bill))) || (x.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))) || (x.qty != null && !(Number(x.qty) >= 1))) return { status: 'error', error: 'fields' };
  }
  ed.forEach(function (x) {
    const i = at[String(x.id)];
    if (x.date) sh.getRange(i + 2, 2).setValue(String(x.date));
    if (x.qty != null) sh.getRange(i + 2, 8).setValue(Number(x.qty));
    if (x.note != null) sh.getRange(i + 2, 15).setValue(String(x.note).slice(0, 80));
    if (x.bill) sh.getRange(i + 2, 18).setValue(String(x.bill));
  });
  return { status: 'ok', n: ed.length };
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
function weeklyBackup() { return backupCopy('NOMAAD нөөц ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')); }
// Drive-ын нэмэлт эрх шаардахгүйн тулд Sheet-ийн өөрийн хуулах функцийг ашиглана (хуулбар Drive-ийн «Миний Drive»-д үүснэ).
// Хуучин нөөцийг Drive дээрээс «NOMAAD нөөц» гэж хайгаад гараар устгаж болно (жилд ~52 жижиг файл).
function backupCopy(name) {
  const copy = SpreadsheetApp.openById(SHEET_ID).copy(name);
  const pr = PropertiesService.getScriptProperties();
  pr.setProperty('LAST_BACKUP', Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'));
  pr.setProperty('BACKUP_FOLDER_URL', 'https://drive.google.com/drive/search?q=NOMAAD%20%D0%BD%D3%A9%D3%A9%D1%86');
  return copy;
}
function adminBackup() {
  const c = backupCopy('NOMAAD нөөц ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm') + ' (гараар)');
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
  const copy = backupCopy('NOMAAD архив ' + y + ' (он хаахаас өмнөх бүрэн хуулбар)');
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
    const sh = journalSheet(), r0w = sh.getLastRow() + 1;
    sh.getRange(r0w, 4, rows.length, 2).setNumberFormat('@');   // «0000» тоо 0 болохгүй
    sh.getRange(r0w, 1, rows.length, JOURNAL_HEAD.length).setValues(rows);
  }
  if (stock.length) {
    const rows = stock.map(function (m, i) {
      return ['M' + Date.now() + '-o' + i, start + ' 00:00', BIZ_NAMES[m.biz], m.loc, String(m.item).trim().slice(0, 80), 'Он нээлт', Number(m.qty),
        Math.max(0, Math.round((Number(m.cost) || 0) * 100) / 100) || '', by, y + ' оны эцсийн үлдэгдэл', m.biz, '', '', '', '', '', '', '', '', ''];
    });
    const sh = stockSheet();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, STOCK_HEAD.length).setValues(rows);
  }
  props.setProperty('CLOSED', end);
  return { status: 'ok', archive: copy.getUrl(), removed: removed, opened: { journal: open.length, stock: stock.length } };
}
// ═══════════ ШИНЭЭР ЭХЛЭХ ═══════════
// Он хаахтай ижил, гэхдээ дурын огноогоор: «cutoff» хүртэлх бүх гүйлгээ (борлуулалт, хөдөлгөөн, журнал, цалин, банкны хуулга,
// дууссан захиалга) архивт хуулагдаад үндсэн Sheet-ээс хасагдана; удирдлага (нягтлан баталсан) эхний үлдэгдлийг «start»-д «Он нээлт» болгон бичнэ.
// Хүргэгдээгүй (идэвхтэй) захиалга үлдэнэ.
function adminReset(d) {
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), end = String(d.cutoff || ''), start = String(d.start || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || end >= today || start <= end || start > today) return { status: 'error', error: 'date' };
  const props = PropertiesService.getScriptProperties();
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
  const copy = backupCopy('NOMAAD архив ' + end + ' хүртэл (шинээр эхлэхээс өмнөх бүрэн хуулбар)');
  const st = ORDER_KEYS.indexOf('status'), DONE = { 'Хүргэгдсэн': 1, 'Буцаасан': 1, 'Цуцалсан': 1 };
  const removed = {
    records: pruneSheet(logSheet(), LOG_HEAD.length, end),
    moves: pruneSheet(stockSheet(), STOCK_HEAD.length, end),
    journal: pruneSheet(journalSheet(), JOURNAL_HEAD.length, end),
    salary: pruneSheet(salarySheet(), SALARY_HEAD.length, end),
    bank: pruneSheet(bankSheet(), BANK_HEAD.length, end, 2),
    orders: pruneSheet(orderSheet(), ORDER_HEAD.length, end, 1, function (v) { return !DONE[String(v[st] || '').trim()]; }),
  };
  const by = String(d.by || '').slice(0, 40), now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
  if (open.length) {
    const rows = open.map(function (e, i) {
      return ['J' + Date.now() + '-' + i, start, BIZ_NAMES[e.biz], String(e.dr), String(e.cr), Number(e.amount), String(e.partner || '').slice(0, 80),
        ('Он нээлт ' + start + ' · ' + String(e.desc || '')).slice(0, 200), by, now, e.biz, '', ''];
    });
    const sh = journalSheet(), r0w = sh.getLastRow() + 1;
    sh.getRange(r0w, 4, rows.length, 2).setNumberFormat('@');   // «0000» тоо 0 болохгүй
    sh.getRange(r0w, 1, rows.length, JOURNAL_HEAD.length).setValues(rows);
  }
  if (stock.length) {
    const rows = stock.map(function (m, i) {
      return ['M' + Date.now() + '-o' + i, start + ' 00:00', BIZ_NAMES[m.biz], m.loc, String(m.item).trim().slice(0, 80), 'Он нээлт', Number(m.qty),
        Math.max(0, Math.round((Number(m.cost) || 0) * 100) / 100) || '', by, 'Шинээр эхлэх ' + start + ' · эхний үлдэгдэл', m.biz, '', '', '', '', '', '', '', '', ''];
    });
    const sh = stockSheet();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, STOCK_HEAD.length).setValues(rows);
  }
  props.setProperty('CLOSED', end);
  return { status: 'ok', archive: copy.getUrl(), removed: removed, opened: { journal: open.length, stock: stock.length } };
}
// Огноо (2-р багана, эсвэл «col») нь «end»-ээс хойшхи мөрүүдийг л үлдээнэ (нэг дор дахин бичнэ — мөр мөрөөр устгахаас хурдан). keepFn — хуучин ч үлдээх мөр
function pruneSheet(sh, width, end, col, keepFn) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const rng = sh.getRange(2, 1, last - 1, width), vals = rng.getValues(), c = col == null ? 1 : col;
  const keep = vals.filter(function (v) { return fmtDate(v[c], 'yyyy-MM-dd').slice(0, 10) > end || (keepFn && keepFn(v)); });
  const n = vals.length - keep.length;
  if (!n) return 0;
  rng.clearContent();
  if (keep.length) sh.getRange(2, 1, keep.length, width).setValues(keep);
  return n;
}

// ═══════════ КАЛЕНДАРЬ / САНУУЛГА (зээл төлөх, өглөг, авлага г.м) ═══════════
function remindSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_REMIND);
  if (!sh) { sh = ss.insertSheet(SHEET_REMIND); sh.appendRow(REMIND_HEAD); styleHead(sh, REMIND_HEAD.length, '#B45309'); sh.getRange('B:B').setNumberFormat('@'); }
  return sh;
}
function reminderRows() {
  const sh = remindSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, REMIND_HEAD.length).getValues().map(function (v) {
    return { id: String(v[0]), date: fmtDate(v[1], 'yyyy-MM-dd'), title: String(v[2]), kind: String(v[3]), amount: Number(v[4]) || 0, partner: String(v[5]),
             co: String(v[6]), repeat: String(v[7]), status: String(v[8]), note: String(v[9]) };
  }).filter(function (r) { return r.id && r.status !== 'Цуцалсан'; });
}
function adminReminder(d) {
  const sh = remindSheet();
  const find = function (id) { const last = sh.getLastRow(); const ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2; return 0; };
  if (d.cancelId) { const r = find(d.cancelId); if (!r) return { status: 'error', error: 'not_found' }; sh.getRange(r, 9).setValue('Цуцалсан'); return { status: 'ok' }; }
  if (d.doneId) {
    const r = find(d.doneId); if (!r) return { status: 'error', error: 'not_found' };
    sh.getRange(r, 9).setValue('Хийгдсэн');
    const v = sh.getRange(r, 1, 1, REMIND_HEAD.length).getValues()[0];
    if (String(v[7]) === 'Сар бүр') {   // дараагийн сарын сануулгыг автоматаар үүсгэнэ
      const dt = new Date(fmtDate(v[1], 'yyyy-MM-dd') + 'T00:00:00'); dt.setMonth(dt.getMonth() + 1);
      sh.appendRow(['R' + Date.now(), Utilities.formatDate(dt, TZ, 'yyyy-MM-dd'), v[2], v[3], v[4], v[5], v[6], v[7], 'Хүлээгдэж', v[9], Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')]);
    }
    return { status: 'ok' };
  }
  const x = d.reminder || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) || !String(x.title || '').trim()) return { status: 'error', error: 'fields' };
  if (d.updateId) {   // засах
    const r = find(d.updateId); if (!r) return { status: 'error', error: 'not_found' };
    sh.getRange(r, 2, 1, 7).setValues([[x.date, String(x.title).slice(0, 120), String(x.kind || 'Бусад').slice(0, 30), Number(x.amount) || 0, String(x.partner || '').slice(0, 80),
      String(x.co || '').slice(0, 20), x.repeat === 'Сар бүр' ? 'Сар бүр' : 'Нэг удаа']]);
    sh.getRange(r, 10).setValue(String(x.note || '').slice(0, 200));
    return { status: 'ok', id: d.updateId };
  }
  const id = 'R' + Date.now();
  sh.appendRow([id, x.date, String(x.title).slice(0, 120), String(x.kind || 'Бусад').slice(0, 30), Number(x.amount) || 0, String(x.partner || '').slice(0, 80),
    String(x.co || '').slice(0, 20), x.repeat === 'Сар бүр' ? 'Сар бүр' : 'Нэг удаа', x.status === 'Хийгдсэн' ? 'Хийгдсэн' : 'Хүлээгдэж', String(x.note || '').slice(0, 200), Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')]);
  return { status: 'ok', id: id };
}

// ═══════════ МАЯГТ (удирдагч засварласан / шинээр нэмсэн загвар) ═══════════
function docSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_DOC);
  if (!sh) { sh = ss.insertSheet(SHEET_DOC); sh.appendRow(DOC_HEAD); styleHead(sh, DOC_HEAD.length, '#374151'); }
  return sh;
}
function docRows() {
  const sh = docSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, DOC_HEAD.length).getValues().map(function (v, i) {
    return { row: i + 2, id: String(v[0]), name: String(v[1]), group: String(v[2]), html: String(v[3]), base: String(v[4]), updated: fmtDate(v[5], 'yyyy-MM-dd HH:mm'), status: String(v[6]) };
  }).filter(function (d) { return d.id && d.status !== 'Устгасан'; }).map(function (d) { const o = Object.assign({}, d); delete o.row; return o; });
}
function adminDoc(d) {
  const sh = docSheet(), last = sh.getLastRow();
  const ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  if (d.cancelId) { const i = ids.indexOf(String(d.cancelId)); if (i < 0) return { status: 'error', error: 'not_found' }; sh.getRange(i + 2, 7).setValue('Устгасан'); return { status: 'ok' }; }
  const x = d.doc || {};
  if (!String(x.name || '').trim() || !String(x.html || '').trim()) return { status: 'error', error: 'fields' };
  const now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
  const row = [x.id || 'D' + Date.now(), String(x.name).slice(0, 80), String(x.group || 'Бусад').slice(0, 30), String(x.html).slice(0, 45000), String(x.base || '').slice(0, 30), now, ''];
  const i = x.id ? ids.indexOf(String(x.id)) : -1;
  if (i >= 0) sh.getRange(i + 2, 1, 1, DOC_HEAD.length).setValues([row]); else sh.appendRow(row);
  return { status: 'ok', id: row[0] };
}

// ═══════════ БАНКНЫ ХУУЛГА ═══════════
// Хуулгын мөрүүдийг ID-аар (данс+огноо+дүн+утга) давхардалгүй хадгалж, тулгасан эсэх (Төлөв) ба юутай холбосныг (Холбоос) тэмдэглэнэ.
function bankSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_BANK);
  if (!sh) { sh = ss.insertSheet(SHEET_BANK); sh.appendRow(BANK_HEAD); styleHead(sh, BANK_HEAD.length, '#0F766E'); sh.getRange('A:C').setNumberFormat('@'); sh.getRange('H:H').setNumberFormat('@'); }
  else if (sh.getLastColumn() < BANK_HEAD.length) { sh.getRange(1, 1, 1, BANK_HEAD.length).setValues([BANK_HEAD]); styleHead(sh, BANK_HEAD.length, '#0F766E'); }   // v7.2: import_id, Бичилт багана нэмэгдсэн
  return sh;
}
function importSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_IMPORT);
  if (!sh) { sh = ss.insertSheet(SHEET_IMPORT); sh.appendRow(IMPORT_HEAD); styleHead(sh, IMPORT_HEAD.length, '#0F766E'); sh.getRange('A:B').setNumberFormat('@'); sh.getRange('E:F').setNumberFormat('@'); }
  return sh;
}
function importRows() {
  const sh = importSheet(), last = sh.getLastRow(); if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, IMPORT_HEAD.length).getValues().map(function (v) {
    return { id: String(v[0]), acct: String(v[1]), biz: String(v[3]), from: String(v[4]), to: String(v[5]), total: Number(v[6]) || 0, added: Number(v[7]) || 0, skipped: Number(v[8]) || 0,
             dup: Number(v[9]) || 0, endBal: Number(v[10]) || 0, at: fmtDate(v[11], 'yyyy-MM-dd HH:mm'), by: String(v[12]), status: String(v[13]) };
  });
}
function ruleSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_RULES);
  if (!sh) { sh = ss.insertSheet(SHEET_RULES); sh.appendRow(RULE_HEAD); styleHead(sh, RULE_HEAD.length, '#0F766E'); }
  return sh;
}
function ruleRows() {
  const sh = ruleSheet(), last = sh.getLastRow(); if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, RULE_HEAD.length).getValues().map(function (v) {
    return { id: String(v[0]), kw: String(v[1]), act: String(v[2]), biz: String(v[3]), by: String(v[4]), at: fmtDate(v[5], 'yyyy-MM-dd'), status: String(v[6]) };
  }).filter(function (r) { return r.status !== 'Устгасан'; });
}
function bankRows() {
  const sh = bankSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, BANK_HEAD.length).getValues().map(function (v) {
    return { id: String(v[0]), acct: String(v[1]), date: String(v[2]), credit: Number(v[3]) || 0, debit: Number(v[4]) || 0, bal: Number(v[5]) || 0, desc: String(v[6]),
             party: String(v[7]), biz: String(v[8]), status: String(v[9]), link: String(v[10]), imp: String(v[13] || ''), jids: String(v[14] || '') };
  });
}
// lines: шинэ мөрүүд (давхардсаныг алгасна); updates: [{id, status, link}] — тулгалтын үр дүн
function adminBank(d) {
  const sh = bankSheet(), have = {}, rows = [];
  const cur = bankRows();
  cur.forEach(function (r, i) { have[r.id] = i + 2; });
  const now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), by = String(d.by || '').slice(0, 40);
  (d.lines || []).forEach(function (l) {
    const id = String(l.id || '').slice(0, 120);
    if (!id || have[id] || !BIZ_NAMES[l.biz]) return;
    have[id] = -1;
    rows.push([id, String(l.acct).slice(0, 20), String(l.date).slice(0, 19), Number(l.credit) || 0, Number(l.debit) || 0, Number(l.bal) || 0, String(l.desc || '').slice(0, 250),
               String(l.party || '').slice(0, 30), l.biz, 'Шинэ', '', by, now, String(l.imp || d.import && d.import.id || '').slice(0, 30), '']);
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, BANK_HEAD.length).setValues(rows);
  if (d.import && d.import.id && BIZ_NAMES[d.import.biz]) {   // импортын лог
    const m = d.import;
    importSheet().appendRow([String(m.id).slice(0, 30), String(m.acct).slice(0, 20), BIZ_NAMES[m.biz], m.biz, String(m.from).slice(0, 19), String(m.to).slice(0, 19), Number(m.total) || 0,
      rows.length + (Number(m.restored) || 0), Number(m.skipped) || 0, Number(m.dup) || 0, Number(m.endBal) || 0, now, by, '']);
  }
  let upd = 0;
  const pos = {};
  bankRows().forEach(function (r, i) { pos[r.id] = i + 2; });
  (d.updates || []).forEach(function (u) {
    const r = pos[String(u.id)]; if (!r) return;
    if (u.fix && /\|N\|/.test(String(u.id))) {   // мэдэгдлээр орсон мөр хуулгын ижил гүйлгээтэй нийлэв: хуулгын огноо, үлдэгдэл, утга, харьцсан дансыг бичнэ (төлөв, тулгалт хэвээр)
      const f = u.fix; sh.getRange(r, 3).setValue(String(f.date || '').slice(0, 19));
      sh.getRange(r, 6, 1, 3).setValues([[Number(f.bal) || 0, String(f.desc || '').slice(0, 250), String(f.party || '').slice(0, 30)]]);
      sh.getRange(r, 14).setValue(String(u.imp || 'IMP').slice(0, 30)); upd++; return;
    }
    sh.getRange(r, 10, 1, 3).setValues([[String(u.status || '').slice(0, 20), String(u.link || '').slice(0, 120), by]]); upd++;
    if (u.status === 'Шинэ' || u.status === 'Устгасан') sh.getRange(r, 15).setValue('');   // тулгалт буцаавал бичилтийн холбоос арилна
    if (u.imp) sh.getRange(r, 14).setValue(String(u.imp).slice(0, 30));   // устгасан мөрийг дахин импортлоход шинэ импорттой холбоно
  });
  return { status: 'ok', added: rows.length, updated: upd };
}
// Импорт буцаах: тэр импортоор орсон мөрүүд «Устгасан», тэднээс үүссэн журналын бичилт «Устгасан»; гараар оруулсан бүртгэлтэй тулгасан бол зөвхөн холбоос арилна
function bankUndoImport(d) {
  const lg = importSheet(), lv = lg.getLastRow() >= 2 ? lg.getRange(2, 1, lg.getLastRow() - 1, IMPORT_HEAD.length).getValues() : [];
  let li = -1; for (let i = 0; i < lv.length; i++) if (String(lv[i][0]) === String(d.undoImport)) li = i;
  if (li < 0) return { status: 'error', error: 'not_found' };
  if (String(lv[li][13]) === 'Буцаасан') return { status: 'error', error: 'state' };
  const sh = bankSheet(), rows = bankRows(), mine = [], jids = {};
  rows.forEach(function (r, i) { if (r.imp === String(d.undoImport) && r.status !== 'Устгасан') { mine.push(i + 2); r.jids.split(',').forEach(function (j) { if (j) jids[j] = 1; }); } });
  const js = journalSheet(), jl = js.getLastRow(), jv = jl >= 2 ? js.getRange(2, 1, jl - 1, 2).getValues() : [], hit = [];
  for (let i = 0; i < jv.length; i++) if (jids[String(jv[i][0])]) { if (lockedDate(fmtDate(jv[i][1], 'yyyy-MM-dd'))) return { status: 'error', error: 'locked' }; hit.push(i + 2); }
  hit.forEach(function (r) { js.getRange(r, 12).setValue('Устгасан'); });
  const by = String(d.by || '').slice(0, 40);
  mine.forEach(function (r) { sh.getRange(r, 10, 1, 3).setValues([['Устгасан', '', by]]); sh.getRange(r, 15).setValue(''); });
  lg.getRange(li + 2, 14).setValue('Буцаасан');
  return { status: 'ok', lines: mine.length, entries: hit.length };
}
// ── МЭДЭГДЛЭЭР АВТОМАТААР ОРУУЛАХ ──
// 1) Шилжүүлгийн баримтын и-мэйл (noreply@khanbank.com) — 10 минут тутам уншина (bankMailScan, зөвхөн зарлага)
// 2) Утаснаас дамжуулсан банкны мессеж — bank_sms (нууц түлхүүртэй)
// Мөр нь «Банк» хуудсанд «Шинэ» төлөвтэй, import_id = MAIL / SMS, ID = данс|N|огноо цаг|±дүн. Санхүүд юу ч бичихгүй — удирдлага өөрөө тулгана.
// Дараа нь хуулга оруулахад ижил гүйлгээтэй нийлнэ (admin_bank updates.fix) — давхардахгүй.
const BANK_ACC4 = { '5790': 'cozy', '2825': 'travel' };   // config.js BANK_ACCOUNTS-тай ижил (сүүлийн 4 орон)
const BANK_MAIL_FROM = 'noreply@khanbank.com';
function bankNoteBiz(no) {
  const L = JSON.parse(PropertiesService.getScriptProperties().getProperty('BANKLINKS') || '[]');
  const mk = String(no || '').match(/^(\d*)[*xX]+(\d*)$/);   // мессежид данс нуугдсан (5313***790): эхлэл, төгсгөлөөр холбосон данснаас хайна
  if (mk) { const f = L.filter(function (x) { const n = String(x.no); return n.length >= 8 && n.indexOf(mk[1]) === 0 && n.slice(-mk[2].length) === mk[2] && mk[1].length + mk[2].length >= 4; }); if (f.length === 1) return { biz: f[0].biz, no: String(f[0].no) }; no = mk[2]; }
  const d = String(no || '').replace(/\D/g, ''); if (d.length < 4) return null;
  const l = L.filter(function (x) { const n = String(x.no); return n.length <= 4 || d.length <= 4 ? n.slice(-4) === d.slice(-4) : d.length >= n.length ? d.slice(-n.length) === n : n.slice(-d.length) === d; })[0];
  if (l) return { biz: l.biz, no: d.length >= String(l.no).length ? d : String(l.no) };
  return BANK_ACC4[d.slice(-4)] ? { biz: BANK_ACC4[d.slice(-4)], no: d } : null;
}
function bankNoteMs(s) { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : NaN; }
// notes: [{ no, date 'yyyy-MM-dd HH:mm:ss', credit, debit, bal, desc, party }], src: 'MAIL' | 'SMS'. Дуудагч түгжээтэй байх ёстой.
function bankNoteAdd(notes, src) {
  if (!notes.length) return 0;
  const sh = bankSheet(), cur = bankRows(), have = {}, rows = [], now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
  cur.forEach(function (r) { have[r.id] = 1; });
  const pr = PropertiesService.getScriptProperties(); let paired = []; try { paired = JSON.parse(pr.getProperty('BANK_NOTE_IDS') || '[]'); } catch (e) {}   // нөгөө эх сурвалжийн мөртэй нийлсэн мэдэгдлийн ID — дахин уншихад давхардахгүй
  const n0 = paired.length; paired.forEach(function (x) { have[x] = 1; });
  const same = function (r, n, a4) { return String(r.acct).slice(-4) === a4 && Math.abs(r.credit - n.credit) < 0.005 && Math.abs(r.debit - n.debit) < 0.005; };
  notes.forEach(function (n) {
    const inf = bankNoteBiz(n.no); if (!inf) return;
    n.credit = Math.abs(Number(n.credit) || 0); n.debit = Math.abs(Number(n.debit) || 0);
    if (!(n.credit > 0) === !(n.debit > 0)) return;
    const a4 = inf.no.slice(-4), id = (inf.no + '|N|' + n.date + '|' + (n.credit ? '+' + n.credit : '-' + n.debit)).slice(0, 120);
    if (have[id]) return;
    const t = bankNoteMs(n.date); if (isNaN(t)) return;
    let hit = -1, twin = false;
    cur.forEach(function (r, i) {
      if (hit >= 0 || twin || !same(r, n, a4)) return;
      const dt = Math.abs(bankNoteMs(r.date) - t), prov = /^(SMS|MAIL)$/.test(r.imp) && /\|N\|/.test(r.id);
      if (r.imp === src && /\|N\|/.test(r.id)) return;   // ижил эх сурвалжийн өөр мэдэгдэл — тусдаа гүйлгээ
      if (prov && dt <= 5 * 6e4) hit = i;                // нөгөө эх сурвалжаас (мессеж ↔ и-мэйл) аль хэдийн орсон
      else if (!/\|N\|/.test(r.id) && dt <= 15 * 6e4) twin = true;   // хуулгаар аль хэдийн орсон
    });
    if (twin) return;
    if (hit >= 0) {   // нэг гүйлгээ: и-мэйлийн утга, харьцсан данс илүү бүрэн — нөхнө; дахин нийлэхгүйгээр тэмдэглэнэ
      const r = cur[hit];
      if (src === 'MAIL') sh.getRange(hit + 2, 7, 1, 2).setValues([[String(n.desc || r.desc).slice(0, 250), String(n.party || r.party).slice(0, 30)]]);
      else if (n.bal && !r.bal) sh.getRange(hit + 2, 6).setValue(Number(n.bal) || 0);
      sh.getRange(hit + 2, 14).setValue(r.imp + '+' + src); r.imp = r.imp + '+' + src; have[id] = 1; paired.push(id); return;
    }
    have[id] = 1;
    const row = { id: id, acct: inf.no, date: n.date, credit: n.credit, debit: n.debit, bal: Number(n.bal) || 0, desc: String(n.desc || '').slice(0, 250), party: String(n.party || '').slice(0, 30), biz: inf.biz, imp: src };
    cur.push(row);
    rows.push([row.id, row.acct, row.date, row.credit, row.debit, row.bal, row.desc, row.party, row.biz, 'Шинэ', '', src === 'MAIL' ? 'И-мэйл' : 'Мессеж', now, src, '']);
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, BANK_HEAD.length).setValues(rows);
  if (paired.length !== n0) pr.setProperty('BANK_NOTE_IDS', JSON.stringify(paired.slice(-150)));
  return rows.length;
}
// «Шилжүүлгийн баримт» и-мэйлийн HTML → гүйлгээ. Бүтэц: Огноо/Date | Журналын No | Дт/From: данс, нэр, дүн, валют | Кт/To: дүн, валют, банк, данс, нэр | Гүйлгээний утга
function bankMailParse(html) {
  const T = String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<\/?(span|b|i|u|strong|em|font|a)\b[^>]*>/gi, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#\d+;|&\w+;/g, ' ')
    .split('\n').map(function (x) { return x.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  const all = T.join('\n'), dm = all.match(/Date:\s*(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}:\d{2}:\d{2})/);
  if (!dm) return null;
  const num = function (x) { return Number(String(x).replace(/,/g, '')); }, isAmt = function (x) { return /^\d{1,3}(,\d{3})*\.\d{2}$|^\d+\.\d{2}$/.test(x); };
  const iTo = T.findIndex(function (x) { return /^[KК][тt]\/To$/i.test(x); }), iFrom = T.findIndex(function (x) { return /^Дт\/From$/i.test(x); });
  const iDesc = T.findIndex(function (x) { return /Transaction description/i.test(x); });
  if (iFrom < 0 || iTo < iFrom || iDesc < iTo) return null;
  const F = T.slice(iFrom + 1, iTo), K = T.slice(iTo + 1, iDesc);
  const fa = F.findIndex(function (x) { return /^\d{8,20}$/.test(x); }); if (fa < 0) return null;
  const fm = F.findIndex(function (x, i) { return i > fa && isAmt(x); }); if (fm < 0) return null;
  const ka = K.filter(function (x) { return /^\d{6,20}$/.test(x); }).pop() || '', kn = ka ? K[K.lastIndexOf(ka) + 1] || '' : '';
  let desc = [];
  for (let i = iDesc + 1; i < T.length && !/^-{5,}$|Харилцагч танд баярлалаа|Thank you/.test(T[i]); i++) desc.push(T[i]);
  desc = desc.join(' ').trim();
  return { no: F[fa], date: dm[1] + '-' + dm[2] + '-' + dm[3] + ' ' + dm[4], credit: 0, debit: num(F[fm]), bal: 0, desc: (desc + (kn && !/[\/:*]/.test(kn) ? ' · ' + kn : '')).trim(), party: ka };
}
function bankMailScan() {
  const pr = PropertiesService.getScriptProperties();
  if (pr.getProperty('BANK_MAIL') !== 'on') return;
  const since = Number(pr.getProperty('BANK_MAIL_SEEN') || 0), notes = []; let top = since, bad = 0;
  GmailApp.search('from:' + BANK_MAIL_FROM + ' subject:"Transaction receipt" newer_than:3d', 0, 40).forEach(function (th) {
    th.getMessages().forEach(function (m) {
      const t = m.getDate().getTime();
      if (t <= since || m.getFrom().toLowerCase().indexOf(BANK_MAIL_FROM) < 0) return;
      if (t > top) top = t;
      let n = null; try { n = bankMailParse(m.getBody()); } catch (e) {}
      if (n) notes.push(n); else bad++;
    });
  });
  let added = 0;
  if (notes.length) {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try { added = bankNoteAdd(notes, 'MAIL'); SpreadsheetApp.flush(); if (added) cacheDrop(['bank']); } finally { lock.releaseLock(); }
  }
  pr.setProperty('BANK_MAIL_SEEN', String(top));
  pr.setProperty('BANK_MAIL_LAST', Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm') + (notes.length || bad ? ' · ' + notes.length + ' баримт, ' + added + ' шинэ' + (bad ? ', ' + bad + ' уншигдаагүй' : '') : ''));
}
// Редактороос нэг удаа ажиллуулж Gmail унших зөвшөөрөл өгнө (и-мэйл унших асаахын өмнө)
function bankMailAuth() { Logger.log('Хаан банкны баримт: ' + GmailApp.search('from:' + BANK_MAIL_FROM + ' newer_than:3d', 0, 5).length + ' и-мэйл олдлоо — зөвшөөрөл өгөгдсөн'); }
// Банкны мессеж → гүйлгээ. Латин / кирилл аль алинаар: данс, орлого / зарлага, дүн, үлдэгдэл, гүйлгээний утга
function bankSmsParse(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  // Хаан банкны загвар (2026-11): «Khan Bank:Tany 5***5790 dansand ZARLAGA:5,000.00MNT garch ULDEGDEL:1,601,619.08MNT bolloo.Utga:EB-gth»
  const kb = s.match(/Tany\s+([\d*xX]{4,20})\s+dansand\s+(ORLOGO|ZARLAGA):([\d,]+(?:\.\d{1,2})?)\s*[A-Z]{3}\b.*?ULDEGDEL:(-?[\d,]+(?:\.\d{1,2})?)\s*[A-Z]{3}\s+bolloo\.?\s*(?:Utga:(.*))?$/i);
  if (kb) { const v = Number(kb[3].replace(/,/g, '')), inc = /orlogo/i.test(kb[2]); return { no: kb[1], credit: inc ? v : 0, debit: inc ? 0 : v, bal: Number(kb[4].replace(/,/g, '')), desc: String(kb[5] || '').trim(), party: '' }; }
  const u0 = s.search(/(?:guilgeenii utga|гүйлгээний утга|utga|утга)\s*[:\-]/i), lo = (u0 >= 0 ? s.slice(0, u0) : s).toLowerCase();   // чиглэлийг утгаас өмнөх хэсгээс (утганд «zarlaga» гэж бичсэн байж болно)
  const isIn = /orlogo|орлого|credit/.test(lo), isOut = /zarlaga|зарлага|debit/.test(lo);
  if (isIn === isOut) return null;
  const am = s.match(/(\d[\d*xX]{5,19})\s*(?:toot\s*)?(?:dans|данс)|(?:dans|данс|account|acc)[^\d*x]{0,12}([\d*xX]{4,20})/i) || s.match(/\b(\d{10})\b/) || s.match(/(\d{0,6}[*xX]{2,}\d{3,4})\b/);
  const no = am ? String(am[1] || am[2] || '') : '';
  const nums = function (str) { return (str.match(/\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+/g) || []).map(function (x) { return { raw: x, v: Number(x.replace(/,/g, '')) }; }); };
  const bm = s.match(/(?:uldegdel|үлдэгдэл|balance)\D{0,8}([\d,]+(?:\.\d{1,2})?)/i), um = s.match(/(?:guilgeenii utga|гүйлгээний утга|utga|утга)\s*[:\-]?\s*(.+)$/i);
  let head = s; if (um) head = head.slice(0, um.index); if (bm) head = head.replace(bm[0], ' '); if (no) head = head.replace(no, ' ');
  const cand = nums(head).filter(function (x) { return x.raw.replace(/\D/g, '').length < 10 && !(no && no.indexOf(x.raw) >= 0); });
  const pick = cand.filter(function (x) { return /[.,]/.test(x.raw); })[0] || cand.filter(function (x) { return x.v >= 100; })[0];
  if (!pick || !no) return null;
  let desc = um ? um[1].trim() : ''; if (bm && desc.indexOf(bm[0]) >= 0) desc = desc.slice(0, desc.indexOf(bm[0])).trim();
  return { no: no, credit: isIn ? pick.v : 0, debit: isOut ? pick.v : 0, bal: bm ? Number(bm[1].replace(/,/g, '')) : 0, desc: desc.replace(/[.\s]+$/, ''), party: '' };
}
function bankSms(d) {
  const pr = PropertiesService.getScriptProperties(), key = pr.getProperty('BANK_SMS_KEY') || '';
  if (!key || String(d.secret || '') !== key) return { status: 'error', error: 'auth' };
  const text = String(d.text || '').slice(0, 600), now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
  let n = null; try { n = bankSmsParse(text); } catch (e) {}
  const known = n && bankNoteBiz(n.no);
  let added = 0;
  if (known) { n.date = now; added = bankNoteAdd([n], 'SMS'); }
  // оношлогоо: сүүлийн мессеж уншигдсан эсэх (зөвхөн эзэнд харагдана). Уншигдаагүй бол бичвэрийг нь хадгална — загварыг засахад хэрэгтэй
  pr.setProperty('BANK_SMS_LAST', JSON.stringify({ at: now.slice(0, 16), ok: !!known, added: added, why: !n ? 'загвар танигдсангүй' : !known ? 'данс холбогдоогүй' : '', text: known ? '' : text.slice(0, 300) }));
  return { status: 'ok', added: added, parsed: !!n };
}
function bankAutoInfo() {
  const pr = PropertiesService.getScriptProperties(); let sms = {}; try { sms = JSON.parse(pr.getProperty('BANK_SMS_LAST') || '{}'); } catch (e) {}
  return { mail: pr.getProperty('BANK_MAIL') === 'on', mailLast: pr.getProperty('BANK_MAIL_LAST') || '', sms: !!pr.getProperty('BANK_SMS_KEY'), smsLast: sms };
}
// Тохиргоо (зөвхөн эзэн): value.mail true/false — и-мэйл унших; value.sms 'new' — мессежийн түлхүүр шинээр үүсгэж нэг удаа буцаана, 'off' — унтраана
function bankAutoSetting(d) {
  if (!d._who || d._who.role !== 'Эзэн') return { status: 'error', error: 'role' };
  const pr = PropertiesService.getScriptProperties(), v = d.value || {}, out = { status: 'ok' };
  if (v.mail !== undefined) {
    if (v.mail) { try { GmailApp.search('from:' + BANK_MAIL_FROM + ' newer_than:1d', 0, 1); } catch (e) { return { status: 'error', error: 'gmail_auth' }; } }
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'bankMailScan') ScriptApp.deleteTrigger(t); });
    if (v.mail) { ScriptApp.newTrigger('bankMailScan').timeBased().everyMinutes(10).create(); if (!pr.getProperty('BANK_MAIL_SEEN')) pr.setProperty('BANK_MAIL_SEEN', String(Date.now())); }   // асаасан мөчөөс хойших баримт — өмнөхийг хуулгаар оруулсан
    pr.setProperty('BANK_MAIL', v.mail ? 'on' : 'off');
  }
  if (v.sms === 'new') { const k = Utilities.getUuid().replace(/-/g, ''); pr.setProperty('BANK_SMS_KEY', k); out.smsKey = k; }
  if (v.sms === 'off') pr.deleteProperty('BANK_SMS_KEY');
  out.auto = bankAutoInfo();
  return out;
}
// Банкны дүрэм: нэмэх (rule: {kw, act, biz}) / устгах (ruleCancel: ID)
function bankRule(d) {
  const sh = ruleSheet();
  if (d.ruleCancel) {
    const last = sh.getLastRow(), ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(d.ruleCancel)) { sh.getRange(i + 2, 7).setValue('Устгасан'); return { status: 'ok' }; }
    return { status: 'error', error: 'not_found' };
  }
  const r = d.rule || {}, kw = String(r.kw || '').trim().slice(0, 60), act = String(r.act || '').slice(0, 40);
  if (kw.length < 2 || !/^(skip|A:\d{4,6}|TR:\d{4,6}|MG:\d{4,6}|IC:\w+)$/.test(act) || !BIZ_NAMES[r.biz]) return { status: 'error', error: 'fields' };
  const id = 'RL' + Date.now();
  sh.appendRow([id, kw, act, r.biz, String(d.by || '').slice(0, 40), Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), '']);
  return { status: 'ok', id: id };
}
// Захиалгын бараа буцаж ирсэн: сөрөг борлуулалтын мөрүүд (үлдэгдэлд нэмэгдэнэ), saleDone = returned. Алдаа бол код.
function orderReturnRows(o, by, why) {
  const pay = String(o.saleDone).slice(4), now = new Date(), date = Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), time = Utilities.formatDate(now, TZ, 'HH:mm'), rows = [];
  if (lockedDate(date)) return 'locked';
  let items; try { items = JSON.parse(o.items || '[]'); } catch (e) { items = []; }
  // Давхар буцаалтгүй: энэ захиалгын бараа бүрийн одоогийн цэвэр тоо (зарсан − буцаасан) — 0 болсон барааг дахин буцаахгүй
  const log = logSheet(), lr = log.getLastRow(), net = {};
  if (lr >= 2) log.getRange(2, 1, lr - 1, LOG_HEAD.length).getValues().forEach(function (v) {
    if (String(v[16]) === 'sale' && String(v[17]) === String(o.id) && String(v[18]) !== 'Устгасан') { const k = String(v[6]).replace(/ \(буцаалт\)/, ''); net[k] = (net[k] || 0) + (Number(v[7]) || 0); }
  });
  items.forEach(function (i, k) {
    const nm = String(i.name || '').slice(0, 80);
    const q = Math.min(Number(i.qty) || 1, Math.max(0, net[nm] || 0)), p = Number(i.price) || 0, amt = Math.round(q * p); if (!amt) return;
    net[nm] -= q;
    rows.push([o.biz + '-' + now.getTime() + '-r' + k, date, time, BIZ_NAMES[o.biz], TYPE_NAMES.sale, String(by || 'Удирдлага').slice(0, 40), (String(i.name || '') + ' (буцаалт)').slice(0, 80), -q, 'ш', p, -amt, pay,
      '', '', 'Захиалга ' + o.phone + ' ' + why, o.biz, 'sale', o.id, '', pay === 'Урьдчилгаа' ? ((o.customer ? o.customer + ' ' : '') + o.phone) : '']);
  });
  if (rows.length) log.getRange(log.getLastRow() + 1, 1, rows.length, LOG_HEAD.length).setValues(rows);
  orderSheet().getRange(o.row, 21).setValue('returned');
  return '';
}
// Удирдагч захиалгын төлбөрийг «Орсон» болгох (банкны хуулгаар тулгахад)
function adminOrder(d) {
  const o = orderRows().filter(function (x) { return x.id === String(d.id); })[0];
  if (!o) return { status: 'error', error: 'not_found' };
  const sh = orderSheet(), f = d.fields || {};
  if (f.paid) sh.getRange(o.row, 18).setValue(f.paid === 'Орсон' ? 'Орсон' : 'Ороогүй');
  if (f.confirmed !== undefined) {   // удирдлагын баталгаа (банкны хуулгаар / гараар). Хоосон бол цуцлагдана.
    sh.getRange(o.row, 22).setValue(String(f.confirmed).slice(0, 40));
    if (f.confirmed) sh.getRange(o.row, 18).setValue('Орсон');
  }
  if (f.saleDone !== undefined) sh.getRange(o.row, 21).setValue(String(f.saleDone).slice(0, 30));
  if (f.ebCode === 'бусад' && !o.ebCode) sh.getRange(o.row, 23).setValue('бусад');
  else if (f.ebCode && /^[\w-]{3,40}$/.test(String(f.ebCode)) && !o.ebCode) {   // буухиагийн хүргэлттэй гараар холбох (дахин илгээгдэхгүй)
    if (orderRows().some(function (x) { return String(x.ebCode) === String(f.ebCode); })) return { status: 'error', error: 'dup' };
    sh.getRange(o.row, 23).setValue(String(f.ebCode));
  }   // буухиад өгөөгүй (өөрсдөө хүргэсэн) гэж тэмдэглэх — зөвхөн кодгүй захиалгад
  if (f.note) sh.getRange(o.row, 19).setValue(String(o.note || '') + ' ' + String(f.note).slice(0, 100));
  let edited = false, adj = 0;
  if (f.edit && typeof f.edit === 'object' && (f.edit.fee !== undefined || f.edit.disc !== undefined)) {   // удирдлага хүргэлтийн төлбөр, хөнгөлөлт засах — дүн, борлуулалтын мөр дагана
    if (/^(Цуцалсан|Буцаасан)$/.test(o.status)) return { status: 'error', error: 'state' };
    let items; try { items = JSON.parse(o.items || '[]'); } catch (e) { items = []; }
    const fee = f.edit.fee !== undefined ? Math.max(0, Math.round(Number(f.edit.fee) || 0)) : null, disc = f.edit.disc !== undefined ? Math.max(0, Math.round(Number(f.edit.disc) || 0)) : null;
    const why = (items.filter(function (i) { return i.name === DISC_ITEM; })[0] || {}).why || '';
    items = items.filter(function (i) { return !((fee !== null && i.name === FEE_ITEM) || (disc !== null && i.name === DISC_ITEM)); });
    if (disc) items.push({ name: DISC_ITEM, qty: 1, price: -disc, why: why || 'Удирдлага' });
    if (fee) items.push({ name: FEE_ITEM, qty: 1, price: fee });
    const amount = items.reduce(function (a, i) { return a + (Number(i.qty) || 1) * (Number(i.price) || 0); }, 0);
    sh.getRange(o.row, 13, 1, 2).setValues([[JSON.stringify(items), Math.round(amount)]]);
    o.items = JSON.stringify(items); o.amount = amount; edited = true;
  }
  if (f.sync || edited) adj = orderSyncAdj(o, d.by);   // «Авлагыг захиалгатай тааруулах»
  if (f.edit && typeof f.edit === 'object') {   // удирдлагаас засах: нэр, хаяг, хүргэх өдөр, тэмдэглэл (утас, бараа, дүн — ажилтан)
    ['customer', 'district', 'khoroo', 'address', 'deliverDate', 'note', 'courier'].forEach(function (k) {
      if (f.edit[k] === undefined) return;
      if (k === 'courier' && !/^(Буухиа|Бусад|)$/.test(String(f.edit[k]))) return;
      const v = String(f.edit[k]).slice(0, k === 'note' ? 300 : 120);
      if (k === 'deliverDate' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
      sh.getRange(o.row, ORDER_KEYS.indexOf(k) + 1).setValue(v); edited = true;
    });
  }
  // Удирдлага цуцлах: шалтгаан заавал; receive — бараа гарт ирсэн бол борлуулалтыг эсрэг бичилтээр буцаана (ажилтны «Буцаалт хүлээн авсан»-тай адил)
  if (f.status === 'Цуцалсан') {
    if (/^(Цуцалсан|Буцаасан)$/.test(o.status)) return { status: 'error', error: 'state' };
    if (!String(f.reason || '').trim()) return { status: 'error', error: 'fields' };
    sh.getRange(o.row, 17).setValue('Цуцалсан');
    sh.getRange(o.row, 19).setValue((String(o.note || '') + ' · цуцалсан: ' + String(f.reason).slice(0, 120) + ' (өмнө: ' + o.status + ')').slice(0, 300));
    // бараа гарсан (зарагдсан) захиалга: бараа буухиад — «буухиа цуцалсан ӨДӨР» тэмдэглэл (орлого тэр өдөр буцна), үлдэгдэлд «Бараа буцаж ирсэн»-ээр
    if (/^yes:/.test(String(o.saleDone || ''))) sh.getRange(o.row, 19).setValue((String(o.note || '') + ' · цуцалсан: ' + String(f.reason).slice(0, 120) + ' (өмнө: ' + o.status + ') · буухиа цуцалсан ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd')).slice(0, 300));
  }
  // Буухиа цуцалсан / буцаасан захиалгын бараа буцаж ирсэн: борлуулалтын буцаалтын мөр (журналд зөвхөн Дт 1404 / Кт 6101 — орлого цуцлах үед буцаагдсан)
  if (f.receive && !f.status && /^(Буцаасан|Цуцалсан)$/.test(o.status)) {
    if (!/^yes:/.test(String(o.saleDone || ''))) return { status: 'error', error: 'state' };
    const er = orderReturnRows(o, d.by, 'буцаж ирсэн'); if (er) return { status: 'error', error: er };
    sh.getRange(o.row, 19).setValue((String(o.note || '') + ' · бараа буцаж ирсэн ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')).slice(0, 300));
  }
  if (f.restore && o.status === 'Цуцалсан' && String(o.saleDone || '') !== 'returned' && /^(Шинэ|Буухиад өгсөн|Хүргэгдсэн)$/.test(String(f.restore))) sh.getRange(o.row, 17).setValue(String(f.restore));   // хогийн савнаас сэргээх
  sh.getRange(o.row, 20).setValue(Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm') + ' ' + String(d.by || 'Удирдлага'));
  return { status: 'ok', edited: edited, adj: adj };
}
// Дэлгүүрийн төлбөрийн мэдээлэл (данс, эзэмшигч) — GitHub-д бичихгүй, Script Properties-д
function adminSetting(d) {
  if (d.key === 'storepay') return storePaySetting(d);
  if (d.key === 'ebuuhia') return ebSetting(d);
  if (d.key === 'bankauto') return bankAutoSetting(d);
  if (d.key === 'notice') return staffNoticeSet(d);
  if (d.key === 'accounts') { PropertiesService.getScriptProperties().setProperty('ACCOUNTS_X', JSON.stringify(d.value || []).slice(0, 8000)); return { status: 'ok' }; }
  if (d.key === 'delcode') { const v = String(d.value || '').trim(); if (v && !/^\d{4,12}$/.test(v)) return { status: 'error', error: 'fields' }; PropertiesService.getScriptProperties().setProperty('DELETE_CODE', v); return { status: 'ok', set: !!v }; }   // цуцалсан захиалга устгах код (зөвхөн эзэн)
  if (d.key === 'lock') { const v = String(d.value || ''); if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { status: 'error', error: 'fields' }; PropertiesService.getScriptProperties().setProperty('LOCK', v); return { status: 'ok' }; }
  if (d.key === 'taxcfg') { PropertiesService.getScriptProperties().setProperty('TAXCFG', JSON.stringify(d.value || {}).slice(0, 8000)); return { status: 'ok' }; }
  if (d.key === 'minstock') {   // доод үлдэгдэл — дэлгүүр тус бүр тусдаа (бараа олон тул)
    if (!BIZ_NAMES[d.biz] || d.biz === 'mgmt') return { status: 'error', error: 'biz' };
    const ms = JSON.stringify(d.value || {});
    if (ms.length > 8500) return { status: 'error', error: 'too_big' };
    PropertiesService.getScriptProperties().setProperty('MINSTOCK_' + d.biz, ms); return { status: 'ok' };
  }
  const JSONKEYS = { kpi: 'KPI', assets: 'ASSETS', targets: 'TARGETS', review: 'REVIEW', company: 'COMPANY', ebold: 'EB_OLD', pfcfg: 'PF_CFG', boostbud: 'BOOST_BUD' };   // + удирдлагын тоймын дүгнэлт   // KPI %, үндсэн хөрөнгө, борлуулалтын зорилт
  if (JSONKEYS[d.key]) {
    const s = JSON.stringify(d.value || (d.key === 'assets' ? [] : {}));
    if (s.length > 8500) return { status: 'error', error: 'too_big' };
    PropertiesService.getScriptProperties().setProperty(JSONKEYS[d.key], s); return { status: 'ok' };
  }
  if (d.key === 'banklinks') {   // банкны данс ↔ компани (бүтэн дугаар зөвхөн энд, нийтийн кодонд бичихгүй)
    const v = (Array.isArray(d.value) ? d.value : []).filter(function (x) { return x && /^\d{4,20}$/.test(String(x.no || '')) && BIZ_NAMES[x.biz] && /^\d{4,6}$/.test(String(x.acc || '')); })
      .map(function (x) { return { no: String(x.no), biz: x.biz, acc: String(x.acc), name: String(x.name || '').slice(0, 60) }; });
    PropertiesService.getScriptProperties().setProperty('BANKLINKS', JSON.stringify(v).slice(0, 8000)); return { status: 'ok' };
  }
  if (!BIZ_NAMES[d.biz]) return { status: 'error', error: 'biz' };
  PropertiesService.getScriptProperties().setProperty('PAYINFO_' + d.biz, String(d.payInfo || '').slice(0, 300));
  return { status: 'ok' };
}
function minStockAll() { const p = PropertiesService.getScriptProperties(), o = {}; Object.keys(BIZ_NAMES).forEach(function (b) { if (b !== 'mgmt') o[b] = JSON.parse(p.getProperty('MINSTOCK_' + b) || '{}'); }); return o; }
// Ажилтанд санамж (удирдлага бичнэ): NOTICES = [{id, biz: 'all'|meat|cozy|travel, text, at, by}]. Ажилтны хуудасны дээд хэсэгт харагдана
function staffNoticeList() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('NOTICES') || '[]'); } catch (e) { return []; } }
function staffNoticeSet(d) {
  const v = d.value || {}, L = staffNoticeList();
  if (v.del) { const i = L.findIndex(function (x) { return x.id === String(v.del); }); if (i >= 0) L.splice(i, 1); }
  if (v.add) {
    const t = String(v.add.text || '').trim().slice(0, 600), b = String(v.add.biz || 'all');
    if (!t || (b !== 'all' && !BIZ_NAMES[b])) return { status: 'error', error: 'fields' };
    L.unshift({ id: 'N' + Date.now(), biz: b, text: t, at: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), by: String(d.by || '').slice(0, 40) });
  }
  const out = JSON.stringify(L.slice(0, 12)); if (out.length > 8500) return { status: 'error', error: 'too_big' };
  PropertiesService.getScriptProperties().setProperty('NOTICES', out);
  return { status: 'ok', notices: L.slice(0, 12) };
}
function payInfoAll() { const p = PropertiesService.getScriptProperties(), o = {}; Object.keys(BIZ_NAMES).forEach(function (b) { o[b] = p.getProperty('PAYINFO_' + b) || ''; }); return o; }

// ═══════════ STOREPAY (хэрэглэгч хувааж төлөх — merchant API) ═══════════
// Түлхүүр Script Property STOREPAY = {appUser, appPass, user, pass, stores:{cozy:'id',...}} — ЗӨВХӨН энд, репод болон хөтөчид буцаахгүй.
// Урсгал: possibleAmount (лимит) → merchant/loan (хүсэлт, хэрэглэгч апп дээрээ батална) → merchant/loan/check/{id} (баталсан эсэх).
const SP_API = 'https://service.storepay.mn/lend-merchant/';
function spCfg() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('STOREPAY') || '{}'); } catch (e) { return {}; } }
function spOn(biz) { const c = spCfg(); return !!(c.user && c.appUser && c.stores && c.stores[biz]); }
function spToken(c, fresh) {
  const ck = CacheService.getScriptCache(), k = 'sp_tok_' + Utilities.base64EncodeWebSafe(String(c.user)).slice(0, 40);
  const t = fresh ? null : ck.get(k); if (t) return t;
  const url = 'https://service.storepay.mn/merchant-uaa/oauth/token?grant_type=password&username=' + encodeURIComponent(c.user) + '&password=' + encodeURIComponent(c.pass);
  const r = UrlFetchApp.fetch(url, { method: 'post', headers: { Authorization: 'Basic ' + Utilities.base64Encode(c.appUser + ':' + c.appPass) },
    contentType: 'application/json', payload: JSON.stringify({ username: c.user, password: c.pass }), muteHttpExceptions: true });
  let d = {}; try { d = JSON.parse(r.getContentText() || '{}'); } catch (e) {}
  if (!d.access_token) throw new Error('storepay_auth' + (d.error_description || d.error ? ': ' + (d.error_description || d.error) : ' (' + r.getResponseCode() + ')'));
  const ex = Number(d.expires_in) || 0; if (ex > 120) ck.put(k, d.access_token, Math.min(21600, ex - 60));
  return d.access_token;
}
function spCall(c, method, path, body) {
  const go = function (fresh) {
    const o = { method: method, headers: { Authorization: 'Bearer ' + spToken(c, fresh) }, contentType: 'application/json', muteHttpExceptions: true };
    if (body) o.payload = JSON.stringify(body);
    return UrlFetchApp.fetch(SP_API + path, o);
  };
  let r = go(false); if (r.getResponseCode() === 401) r = go(true);   // хугацаа дууссан токен
  try { return JSON.parse(r.getContentText() || '{}'); } catch (e) { return { status: 'Failed', error: 'http ' + r.getResponseCode() }; }
}
function spErr(d) { const m = d && d.msgList && d.msgList[0]; return String((m && (m.text || m.code)) || (d && d.error) || 'storepay'); }
function storePay(d) {
  const who = checkStaff(d.token); if (!who) return { status: 'error', error: 'auth' };
  const c = spCfg(), store = c.stores && c.stores[who.biz];
  if (!c.user || !c.appUser || !store) return { status: 'error', error: 'storepay_off' };
  const phone = String(d.phone || '').replace(/\D/g, '').slice(-8);
  try {
    if (d.type === 'storepay_amount') {
      if (phone.length !== 8) return { status: 'error', error: 'phone' };
      const r = spCall(c, 'post', 'user/possibleAmount', { mobileNumber: phone });
      if (r.status === 'Failed') return { status: 'error', error: spErr(r) };
      return { status: 'ok', amount: Number(r.value) || 0 };
    }
    if (d.type === 'storepay_create') {
      const amount = Math.round(Number(d.amount) || 0);
      if (phone.length !== 8 || !(amount > 0)) return { status: 'error', error: 'fields' };
      const r = spCall(c, 'post', 'merchant/loan', { storeId: Number(store), mobileNumber: Number(phone), description: String(d.desc || BIZ_NAMES[who.biz]).slice(0, 120),
        amount: amount, callbackUrl: '', requestId: String(d.requestId || ('NB' + Date.now())).slice(0, 60) });
      if (r.status !== 'Success') return { status: 'error', error: spErr(r) };
      return { status: 'ok', id: String(r.value) };
    }
    if (d.type === 'storepay_check') {
      if (!d.id) return { status: 'error', error: 'fields' };
      const r = spCall(c, 'get', 'merchant/loan/check/' + encodeURIComponent(String(d.id)));
      if (r.status === 'Failed') return { status: 'error', error: spErr(r) };
      return { status: 'ok', paid: !!r.value };
    }
  } catch (err) { return { status: 'error', error: String(err.message || err).slice(0, 200) }; }
  return { status: 'error', error: 'type' };
}
// Удирдлага (зөвхөн Эзэн): түлхүүр хадгалах — хоосон талбар хуучныг хэвээр үлдээнэ; test=true бол токен авч шалгана. Нууц утгыг хэзээ ч буцаахгүй.
function storePaySetting(d) {
  if (!d._who || d._who.role !== 'Эзэн') return { status: 'error', error: 'role' };
  const c = spCfg(), v = d.value || {};
  ['appUser', 'appPass', 'user', 'pass'].forEach(function (k) { if (String(v[k] || '').trim()) c[k] = String(v[k]).trim().slice(0, 200); });
  c.stores = c.stores || {};
  if (d.biz && BIZ_NAMES[d.biz] && v.store !== undefined) { const st = String(v.store || '').replace(/\D/g, ''); if (st) c.stores[d.biz] = st; else delete c.stores[d.biz]; }
  if (v.off) { delete c.stores[d.biz]; }
  PropertiesService.getScriptProperties().setProperty('STOREPAY', JSON.stringify(c));
  const out = { status: 'ok', on: spOn(d.biz), stores: Object.keys(c.stores) };
  if (d.test) { try { spToken(c, true); out.test = 'ok'; } catch (e) { out.test = String(e.message || e).slice(0, 200); } }
  return out;
}

// ═══════════ EBUUHIA (Буухиа) — партнерын API v1 ═══════════
// Түлхүүр Script Property EBUUHIA = {key, secret} — ЗӨВХӨН энд (репод, хөтөчид буцаахгүй). Хүсэлт бүрийг HMAC-SHA256-аар гарын үсэг зурна:
//   METHOD \n PATH(+query) \n X-Timestamp \n X-Nonce \n Idempotency-Key \n sha256hex(body)
const EB_OTHER = 'бусад', EB_API = 'https://api.ebuuhia.com', EB_ST = { 1: 'Бүртгэгдсэн', 2: 'Хүлээн авсан', 3: 'Жолоочид хуваарилсан', 5: 'Хүлээгдэж буй', 10: 'Хүргэгдсэн', 11: 'Цуцалсан', 12: 'Буцаасан' };
function ebCfg() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('EBUUHIA') || '{}'); } catch (e) { return {}; } }
function ebOn() { const c = ebCfg(); return !!(c.key && c.secret); }
function ebHex(b) { return b.map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join(''); }
function ebCall(c, method, path, body, idem) {
  const raw = body ? JSON.stringify(body) : '', ts = String(Math.floor(Date.now() / 1000)), nonce = Utilities.getUuid().replace(/-/g, '');
  const bh = ebHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8));
  const sig = ebHex(Utilities.computeHmacSha256Signature([method.toUpperCase(), path, ts, nonce, idem || '', bh].join('\n'), c.secret, Utilities.Charset.UTF_8));
  const h = { 'X-Api-Key': c.key, 'X-Timestamp': ts, 'X-Nonce': nonce, 'X-Signature': sig };
  if (idem) h['Idempotency-Key'] = idem;
  const o = { method: method.toLowerCase(), headers: h, muteHttpExceptions: true };
  if (raw) { o.payload = raw; o.contentType = 'application/json'; }
  const r = UrlFetchApp.fetch(EB_API + path, o);
  let j = {}; try { j = JSON.parse(r.getContentText() || '{}'); } catch (e) { j = { error: String(r.getContentText()).slice(0, 200) }; }
  return { code: r.getResponseCode(), data: j };
}
function ebErr(r) {   // буухиагийн бүтэн алдаа: код + тайлбар (түлхүүр, нууц утгыг агуулахгүй)
  const d = r.data || {}, e = d.error && typeof d.error === 'object' ? d.error : d;
  const code = String(e.code || (typeof d.error === 'string' ? d.error : '') || ('http ' + r.code)), msg = String(e.message || e.detail || d.message || '');
  return (code + (msg && msg !== code ? ' — ' + msg : '') + ' [' + r.code + ']').slice(0, 300);
}
// Буухиа устгасан хүргэлтийн түлхүүрийг дахин ашиглавал хуучин хариу ирж болзошгүй — дахин илгээх бүрт шинэ Idempotency-Key
function ebIdem(id) { const n = PropertiesService.getScriptProperties().getProperty('EBR_' + id); return 'nb-' + id + (n ? '-r' + n : ''); }
function ebIdemNext(id) { const p = PropertiesService.getScriptProperties(); p.setProperty('EBR_' + id, String((Number(p.getProperty('EBR_' + id)) || 0) + 1)); }
function ebObj(d) { return d && (d.data && !Array.isArray(d.data) ? d.data : d.delivery || d); }
function ebList(c, fresh) {   // сүүлийн 1 сарын хүргэлтүүд (хуудаслаж, ихдээ 500); 60 секунд кэшлэнэ (ажилтан, удирдлага зэрэг нээхэд дахин татахгүй)
  const cc = CacheService.getScriptCache();
  if (!fresh) { const hit = cc.get('eb_list'); if (hit) { try { return JSON.parse(hit); } catch (e) {} } }
  const out = ebListRaw(c), js = JSON.stringify(out);
  if (js.length < 95000) cc.put('eb_list', js, 60); else cc.remove('eb_list');
  return out;
}
function ebListRaw(c) {
  const out = [];
  for (let off = 0; off < 500; off += 100) {
    const r = ebCall(c, 'get', '/api/partner/v1/deliveries?limit=100&offset=' + off);
    if (r.code >= 300) throw new Error(ebErr(r));
    const d = r.data, arr = Array.isArray(d) ? d : d.data && Array.isArray(d.data) ? d.data : d.deliveries || d.items || d.rows || [];
    arr.forEach(function (x) { out.push(x); });
    if (arr.length < 100) break;
  }
  return out;
}
// ebuuhia-ийн хүргэлтийг нэг хэлбэрт оруулна (талбарын нэр өөр байж болох тул хэд хэдэн нэрээр хайна) + бүх анхны талбар (raw)
function ebNum(v) { const n = Number(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; }   // «77,000₮», «77000.00» → 77000
function ebPick(x, keys) {
  for (let i = 0; i < keys.length; i++) {
    let v = x; keys[i].split('.').forEach(function (k) { v = v != null && typeof v === 'object' ? v[k] : undefined; });
    if (v != null && v !== '' && typeof v !== 'object') return v;
  }
  return '';
}
function ebTime(v) {   // буухиа UTC-ээр өгдөг → Улаанбаатарын цаг, буухиагийн сайттай ижил «2026/10/25 16:17»
  if (!v) return '';
  const d = new Date(v); return isNaN(d.getTime()) ? String(v).slice(0, 16) : Utilities.formatDate(d, TZ, 'yyyy/MM/dd HH:mm');
}
function ebFlat(x, pre, out) {
  Object.keys(x || {}).forEach(function (k) {
    const v = x[k], key = pre ? pre + '.' + k : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v)) ebFlat(v, key, out);
    else if (Array.isArray(v)) { if (v.length) out.push([key, v.map(function (y) { return y && typeof y === 'object' ? JSON.stringify(y) : String(y); }).join(', ').slice(0, 300)]); }
    else if (v != null && v !== '') out.push([key, /_at$/.test(k) ? ebTime(v) : typeof v === 'boolean' ? (v ? 'Тийм' : 'Үгүй') : String(v).slice(0, 300)]);
  });
  return out;
}
function ebNorm(x) {
  const so = x.status && typeof x.status === 'object' ? x.status : null;
  const st = Number(so ? so.id || so.code : x.status) || 0;
  const ad = x.address && typeof x.address === 'object' ? x.address : null;
  const addr = ad ? [ad.city, ad.district, ad.committee, ad.addition].filter(function (y) { return y; }).join(', ') || String(ad.full || '') : String(ebPick(x, ['address', 'full_address', 'customer_address']));
  const cr = ebPick(x, ['created_at', 'createdAt', 'registered_at']), vf = ebPick(x, ['verified']);
  return { code: String(ebPick(x, ['code', 'delivery_code', 'tracking_code'])), ext: String(ebPick(x, ['external_order_id'])), st: st,
    name: EB_ST[st] || String(ebPick(x, ['status_name', 'status.name']) || ''),
    created: ebTime(cr), day: cr ? ebTime(cr).slice(0, 10).replace(/\//g, '-') : '',
    at: ebTime(ebPick(x, ['closed_at', 'delivered_at', 'status_changed_at', 'updated_at'])),
    cust: String(ebPick(x, ['customer.name', 'customer_name', 'receiver_name'])), phone: String(ebPick(x, ['customer.phone', 'customer_phone', 'phone', 'receiver_phone'])),
    phone2: String(ebPick(x, ['customer.phone2', 'phone2'])), addr: addr,
    item: String(ebPick(x, ['delivery.item_name', 'item_name'])), qty: Number(ebPick(x, ['delivery.quantity', 'quantity'])) || 0,
    price: ebNum(ebPick(x, ['delivery.total_price', 'total_price', 'price'])), got: ebNum(ebPick(x, ['received_money', 'delivery.received_money', 'collected_amount', 'paid_amount'])),
    fee: Number(ebPick(x, ['delivery_fee', 'delivery_price', 'shipping_fee', 'fee', 'delivery.fee'])) || 0,
    driver: String(ebPick(x, ['driver.name', 'driver_name', 'driver'])), dphone: String(ebPick(x, ['driver_desc', 'driver.phone', 'driver_phone'])),
    ok: vf === '' ? '' : vf === true || vf === 'true' || vf === 1 ? 'Тийм' : 'Үгүй',
    note: String(ebPick(x, ['delivery.description', 'description', 'note'])), type: String(ebPick(x, ['delivery.item_type', 'item_type'])),
    reason: String(ebPick(x, ['return_reason', 'cancel_reason', 'reason', 'comment'])), raw: ebFlat(x, '', []).slice(0, 60) };
}
// Хүргэлтийг манай захиалгатай холбоно: external_order_id → код → (буухиагийн сайтаас гараар үүсгэсэн бол) утас + огноогоор.
// Утсаар: тухайн дэлгүүрийн буухиад өгсөн/хүргэгдсэн/буцаасан, кодгүй захиалгаас хүргэлтийн өдөр буюу түүнээс өмнөх хамгийн сүүлийнх. write=true бол кодыг захиалгад бичнэ.
// Буухиагийн хүргэлт ↔ манай захиалга: 1) external_order_id / код, 2) утас (+ «Шинэ» захиалгад огноо ±1 өдөр, дүн). Холбогдсон «Шинэ» захиалга → fresh (Буухиад өгсөн болгоно)
// ebuuhia-ийн данс Cozy-д бүртгэлтэй: манай захиалгатай холбогдоогүй (буухиа дээр шууд үүсгэсэн) хүргэлт, утсаар таних — зөвхөн Cozy-д.
// Бусад компани зөвхөн өөрийн захиалгаас илгээсэн (external_order_id / код таарсан) хүргэлтээ харна.
const EB_HOME = 'cozy';
function ebLink(L, biz, write) {
  const rows = cacheGet('ord', orderRows), byExt = {}, byCode = {}, byPhone = {}, used = {}, sh = write ? orderSheet() : null, done = [], fresh = [], canc = [];
  const dayOff = function (a, b) { return Math.abs((new Date(String(a) + 'T00:00:00') - new Date(String(b) + 'T00:00:00')) / 864e5); };
  let wrote = false;
  rows.forEach(function (o) { byExt[o.id] = o; if (o.ebCode) byCode[String(o.ebCode)] = o; });
  rows.forEach(function (o) {
    if (o.biz !== biz || o.ebCode || !/^(Шинэ|Буухиад өгсөн|Хүргэгдсэн|Буцаасан)$/.test(o.status)) return;
    const ph = String(o.phone).replace(/\D/g, ''); if (ph) (byPhone[ph] = byPhone[ph] || []).push(o);
  });
  const out = [];
  L.slice().sort(function (a, b) { return a.created < b.created ? -1 : 1; }).forEach(function (n) {
    let o = byExt[n.ext] || byCode[n.code];
    if (!o && biz !== EB_HOME) return;
    if (!o) {
      const c = (byPhone[String(n.phone).replace(/\D/g, '')] || []).filter(function (x) {
        if (used[x.id] || (n.day && String(x.date) > n.day && x.status !== 'Шинэ')) return false;
        if (x.status !== 'Шинэ') return true;
        return n.st !== 11 && n.st !== 12 && n.day && dayOff(x.date, n.day) <= 1 && (!(n.price > 0) || Math.abs(n.price - Number(x.amount)) <= 1);   // «Шинэ»: огноо ±1 өдөр, дүн таарах
      });
      o = c.sort(function (a, b) { return String(b.date) < String(a.date) ? -1 : 1; })[0];
      if (o) { used[o.id] = 1; if (write && n.code) { sh.getRange(o.row, 23).setValue(n.code); wrote = true; if (o.status === 'Шинэ') fresh.push(o.id); if (!String(o.customer || '').trim() && n.cust && n.cust !== n.phone) sh.getRange(o.row, 6).setValue(String(n.cust).slice(0, 80)); } }
    }
    if (o && o.biz !== biz) return;
    if (o) { n.id = o.id; n.our = o.status; n.sd = String(o.saleDone || ''); if (write && !o.ebCode && n.code && !used[o.id]) { sh.getRange(o.row, 23).setValue(n.code); wrote = true; } if (n.st === 10 && o.status === 'Буухиад өгсөн') done.push(o.id); if ((n.st === 11 || n.st === 12) && /^(Буухиад өгсөн|Хүргэгдсэн)$/.test(o.status)) canc.push({ o: o, n: n }); }
    out.push(n);
  });
  if (wrote) cacheDrop(['ord']);
  // Буухиагийн сайтаас устгасан: манай захиалга кодтой, буухиа дээр тэр хүргэлт алга. Татсан жагсаалтын хамгийн эртний өдрөөс хойшхыг л шалгана.
  const codes = {}, exts = {}; let oldest = '';
  L.forEach(function (n) { codes[n.code] = 1; exts[n.ext] = 1; if (n.day && (!oldest || n.day < oldest)) oldest = n.day; });
  const gone = !oldest ? [] : rows.filter(function (o) { return o.biz === biz && o.status === 'Буухиад өгсөн' && o.ebCode && String(o.ebCode) !== EB_OTHER && !codes[String(o.ebCode)] && !exts[o.id] && String(o.date) >= oldest; })
    .map(function (o) { return { id: o.id, phone: o.phone, cust: String(o.customer || ''), amount: o.amount, code: String(o.ebCode), date: String(o.date) }; });
  return { list: out, done: done, fresh: fresh, canc: canc, gone: gone };
}
// Буухиа цуцалсан (11) / буцаасан (12) → манай захиалга «Буцаасан», шалтгаан буухиагаас. Тэмдэглэлд «буухиа цуцалсан YYYY-MM-DD» —
// журнал (клиент buildJournal) тэр өдөр орлого, авлагыг эсрэг бичнэ; бараа «буухиад байгаа» (буцаж ирэхэд Дт 1404 / Кт 6101).
function ebCancelApply(list, who) {
  if (!list || !list.length) return 0;
  const sh = orderSheet(), today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  list.forEach(function (c) {
    const o = c.o, n = c.n, at = String(n.at || '').slice(0, 10).replace(/\//g, '-');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(at) && at <= today && !lockedDate(at) ? at : today;
    const why = (n.st === 11 ? 'буухиа цуцалсан ' : 'буухиа буцаасан ') + date + (n.reason ? ': ' + String(n.reason).slice(0, 80) : '');
    sh.getRange(o.row, 17).setValue('Буцаасан');
    sh.getRange(o.row, 19).setValue((String(o.note || '') + ' · ' + why + ' (өмнө: ' + o.status + ')').slice(0, 300));
    sh.getRange(o.row, 20).setValue(Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm') + ' Буухиа');
    // бараа буухиа дээр — үлдэгдэлд зөвхөн «Бараа хүлээн авсан»-аар (журналд 1209 авлага → 1404)
    try { auditSheet().appendRow(['\'' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), 'Буухиа', o.biz, 'Буухиа цуцалсан → захиалга буцаасан', ((o.customer ? o.customer + ' ' : '') + o.phone + ' · ₮' + Math.round(Number(o.amount) || 0).toLocaleString('en-US') + ' · ' + why).slice(0, 200), 'eb_cancel', o.id, JSON.stringify({ code: n.code, st: n.st, reason: n.reason, prev: o.status })]); } catch (e) {}
  });
  return list.length;
}
function ebKh(k) { k = String(k || ''); if (/хороолол/i.test(k)) return ''; const m = k.match(/(\d{1,2})/); return m ? String(Number(m[1])) : ''; }   // хороо — зөвхөн дугаар
function ebView(c, biz, fresh) { return ebLink(ebList(c, fresh).map(ebNorm), biz, true); }
// Удирдлага: зөвхөн харах (төлөв, код бичихгүй)
// Удирдлага: ажилтантай ижил үйлдэл (илгээх, төлөв татах, устгах) — op: send | del | sync
function ebAdmin(d) {
  if (!BIZ_NAMES[d.biz]) return { status: 'error', error: 'fields' };
  const s = staffRows().filter(function (x) { return x.id === d._who.id; })[0];
  const who = { biz: String(d.biz), staff: { name: s ? s.name : 'Удирдлага' } };
  return ebuuhia(Object.assign({}, d, { type: d.op === 'send' ? 'eb_send' : d.op === 'del' ? 'eb_del' : d.op === 'other' ? 'eb_other' : d.op === 'unlink' ? 'eb_unlink' : 'eb_sync' }), who);
}
function ebuuhia(d, asWho) {
  const who = asWho || checkStaff(d.token); if (!who) return { status: 'error', error: 'auth' };
  if (d.type === 'eb_other') {   // буухиад өгөхгүй — өөрсдөө / бусад хүргэлтээр: борлуулалт бичигдэж «Буухиад өгсөн» төлөвтэй, код = «бусад» (буухиагийн хөлс бичигдэхгүй)
    const want = {}; (Array.isArray(d.ids) ? d.ids : []).slice(0, 50).forEach(function (x) { want[String(x)] = 1; });
    const ids = orderRows().filter(function (o) { return want[o.id] && o.biz === who.biz && !o.ebCode && o.status === 'Шинэ'; }).map(function (o) { return o.id; });
    if (!ids.length) return { status: 'ok', shipped: [], skipped: [] };
    const ship = ordersShipAs({ ids: ids, to: 'Буухиад өгсөн' }, who), sh = orderSheet(), done = {};
    (ship.shipped || []).forEach(function (x) { done[x.id] = 1; });
    orderRows().forEach(function (o) { if (done[o.id]) sh.getRange(o.row, 23).setValue(EB_OTHER); });
    return { status: 'ok', shipped: ship.shipped || [], skipped: ship.skipped || [] };
  }
  const c = ebCfg(); if (!c.key || !c.secret) return { status: 'error', error: 'eb_off' };
  try {
    if (d.type === 'eb_send') {   // шинэ захиалгыг буухиад өгнө (борлуулалт бичигдэнэ), дараа нь ebuuhia-д хүргэлт үүсгэнэ
      const want = {}; (Array.isArray(d.ids) ? d.ids : []).slice(0, 50).forEach(function (x) { want[String(x)] = 1; });
      // Ажилтны харсан (засварласан / хаягаас таньсан) эцсийн хаягийг эхлээд хадгална
      if (d.addr && typeof d.addr === 'object') { const osh0 = orderSheet(); orderRows().forEach(function (o) {
        const a = d.addr[o.id]; if (!want[o.id] || !a || o.biz !== who.biz || o.ebCode) return;
        osh0.getRange(o.row, 9, 1, 4).setValues([[String(a.city || '').slice(0, 40), String(a.district || '').slice(0, 40), ebKh(a.khoroo), String(a.address || '').replace(/\s*дүүрэг хоосон\s*/gi, ' ').trim().slice(0, 300)]]);
      }); }
      let list = orderRows().filter(function (o) { return want[o.id] && o.biz === who.biz && !o.ebCode && (o.status === 'Шинэ' || o.status === 'Буухиад өгсөн'); });
      const fresh = list.filter(function (o) { return o.status === 'Шинэ'; }).map(function (o) { return o.id; });
      let ship = { shipped: [], skipped: [] };
      if (fresh.length) ship = ordersShipAs({ ids: fresh, to: 'Буухиад өгсөн' }, who);
      const skip = {}; (ship.skipped || []).forEach(function (x) { skip[x.id] = x.why; });
      list = orderRows().filter(function (o) { return want[o.id] && o.biz === who.biz && !o.ebCode && o.status === 'Буухиад өгсөн' && !skip[o.id]; });
      const sh = orderSheet(), sent = [], failed = [];
      list.forEach(function (o) {
        let items; try { items = JSON.parse(o.items || '[]'); } catch (e) { items = []; }
        const goods = items.filter(function (i) { return i.name !== FEE_ITEM && i.name !== DISC_ITEM && i.name !== SPLIT_ITEM; });
        const cod = d.noAmt || o.paid === 'Орсон' || o.confirmed ? 0 : Math.round(o.amount);   // үнийн дүнгүй сонгосон эсвэл төлбөр орсон бол буухиа мөнгө авахгүй
        const qty = goods.reduce(function (a, i) { return a + (Number(i.qty) || 1); }, 0) || 1;
        const kh = ebKh(o.khoroo), city = String(o.city || '').trim(), dist = String(o.district || '').trim();
        if (!city) { failed.push({ id: o.id, phone: o.phone, why: 'Хот/аймаг сонгоно уу' }); return; }   // Улаанбаатар гэж автоматаар тавихгүй; дүүрэг/сум заавал биш
        const body = { external_order_id: o.id,
          customer: { name: String(o.customer || o.phone).slice(0, 80), phone: String(o.phone).replace(/\D/g, ''), phone2: String(o.phone2 || '').replace(/\D/g, '') },
          address: { city: city, district: dist, committee: kh ? kh + '-р хороо' : '', addition: String(o.address || '').replace(/\s*дүүрэг хоосон\s*/gi, ' ').trim().slice(0, 255) },
          delivery: { item_name: goods.map(function (i) { return i.name + ' ' + (Number(i.qty) || 1) + 'ш'; }).join(', ').slice(0, 250), quantity: qty,
            description: String(o.note || '').slice(0, 200), total_price: cod } };
        const r = ebCall(c, 'post', '/api/partner/v1/deliveries', body, ebIdem(o.id));
        const x = ebObj(r.data), code = x && (x.code || x.delivery_code) || '';
        if (r.code < 300 && code) { sh.getRange(o.row, 23, 1, 1).setValue(String(code)); sh.getRange(o.row, 25).setValue(cod > 0 ? '1' : '0'); sent.push({ id: o.id, phone: o.phone, code: String(code) }); }
        else failed.push({ id: o.id, phone: o.phone, why: ebErr(r) });
      });
      if (sent.length) CacheService.getScriptCache().remove('eb_list');
      return { status: 'ok', sent: sent, failed: failed, skipped: ship.skipped || [] };
    }
    if (d.type === 'eb_del') {   // зөвхөн «Бүртгэгдсэн» (1) хүргэлтийг буухиагаас устгана; манай захиалгын кодыг арилгана (дахин илгээж болно)
      const code = String(d.code || '').replace(/[^\w-]/g, '').slice(0, 40); if (!code) return { status: 'error', error: 'fields' };
      const r = ebCall(c, 'delete', '/api/partner/v1/deliveries/' + encodeURIComponent(code));
      if (r.code >= 300) return { status: 'error', error: ebErr(r) };
      const o = orderRows().filter(function (x) { return x.biz === who.biz && String(x.ebCode) === code; })[0];
      if (o) { orderSheet().getRange(o.row, 23).setValue(''); ebIdemNext(o.id); }
      CacheService.getScriptCache().remove('eb_list');
      return { status: 'ok', id: o ? o.id : '' };
    }
    if (d.type === 'eb_unlink') {   // буухиагийн сайтаас устгасан хүргэлтийн кодыг арилгана: буухиа дээр үнэхээр байхгүйг шинээр татаж шалгана; борлуулалт, үлдэгдэл хэвээр
      const o = orderRows().filter(function (x) { return x.id === String(d.id || '') && x.biz === who.biz; })[0];
      if (!o) return { status: 'error', error: 'not_found' };
      const code = String(o.ebCode || '');
      if (o.status !== 'Буухиад өгсөн' || !code || code === EB_OTHER) return { status: 'error', error: 'state' };
      const L = ebList(c, true).map(ebNorm);
      if (!L.length || L.some(function (n) { return n.code === code || n.ext === o.id; })) return { status: 'error', error: 'still_there' };
      orderSheet().getRange(o.row, 23).setValue(''); ebIdemNext(o.id); cacheDrop(['ord']);
      return { status: 'ok', id: o.id };
    }
    if (d.type === 'eb_sync') {   // ebuuhia-ийн бүх хүргэлтийг (31 хоног) татна; «Хүргэгдсэн» (10) бол манай захиалгыг автоматаар Хүргэгдсэн болгоно
      const v = ebView(c, who.biz, !!d.fresh);
      let ship = null; if (v.done.length) { ship = ordersShipAs({ ids: v.done, to: 'Хүргэгдсэн' }, who); cacheDrop(['ord', 'rec', 'stk']); }
      if (v.fresh.length) { ordersShipAs({ ids: v.fresh, to: 'Буухиад өгсөн' }, who); cacheDrop(['ord', 'rec', 'stk']); }   // буухиа дээр аль хэдийн байсан «Шинэ» захиалга
      const cancelled = ebCancelApply(v.canc, who); if (cancelled) cacheDrop(['ord', 'rec', 'stk']);
      return { status: 'ok', list: v.list, delivered: v.done.length, cancelled: cancelled, ship: ship, gone: v.gone };
    }
  } catch (err) { return { status: 'error', error: String(err.message || err).slice(0, 200) }; }
  return { status: 'error', error: 'type' };
}
// Удирдлага (зөвхөн Эзэн): түлхүүр хадгалах (хоосон талбар хуучныг хэвээр); test=true бол /ping-ээр шалгана. Нууцыг хэзээ ч буцаахгүй.
function ebSetting(d) {
  if (!d._who || d._who.role !== 'Эзэн') return { status: 'error', error: 'role' };
  const c = ebCfg(), v = d.value || {};
  if (String(v.key || '').trim()) c.key = String(v.key).trim().slice(0, 120);
  if (String(v.secret || '').trim()) c.secret = String(v.secret).trim().slice(0, 200);
  if (v.off) { delete c.key; delete c.secret; }
  PropertiesService.getScriptProperties().setProperty('EBUUHIA', JSON.stringify(c));
  const out = { status: 'ok', on: ebOn() };
  if (d.test && out.on) {
    try { const r = ebCall(c, 'get', '/api/partner/v1/ping'); out.test = r.code < 300 ? 'ok' : ebErr(r); } catch (e) { out.test = String(e.message || e).slice(0, 200); }
    // оношлогоо: түлхүүрийн урт, эхлэл (нууцыг буцаахгүй), серверийн цаг
    out.diag = 'key ' + String(c.key).length + ' тэмдэгт, ' + String(c.key).slice(0, 8) + '… · secret ' + String(c.secret).length + ' тэмдэгт · сервер ' + new Date().toISOString().slice(0, 19) + 'Z';
  }
  return out;
}

// ═══════════ ЗЭЭЛИЙН БҮРТГЭЛ (авсан / өгсөн) ═══════════
// Мөнгөн гүйлгээ нь журналд «#ID» лавлагаатай бичигдэнэ (үндсэн 3501 / 1210, хүү 7401 / 5202) — үлдэгдлийг тэндээс тооцно.
function loanSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_LOAN);
  if (!sh) { sh = ss.insertSheet(SHEET_LOAN); sh.appendRow(LOAN_HEAD); styleHead(sh, LOAN_HEAD.length, '#7C2D12'); sh.getRange('B:B').setNumberFormat('@'); sh.getRange('H:H').setNumberFormat('@'); }
  else if (String(sh.getRange(1, LOAN_HEAD.length).getValue()) !== LOAN_HEAD[LOAN_HEAD.length - 1]) { sh.getRange(1, 1, 1, LOAN_HEAD.length).setValues([LOAN_HEAD]); styleHead(sh, LOAN_HEAD.length, '#7C2D12'); }
  return sh;
}
function loanRows() {
  const sh = loanSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, LOAN_HEAD.length).getValues().map(function (v, i) {
    return { row: i + 2, id: String(v[0]), date: fmtDate(v[1], 'yyyy-MM-dd'), biz: String(v[2]), kind: String(v[3]), partner: String(v[4]), amount: Number(v[5]) || 0,
             rate: Number(v[6]) || 0, due: v[7] ? fmtDate(v[7], 'yyyy-MM-dd') : '', payDay: Number(v[8]) || 0, note: String(v[9] || ''), status: String(v[10] || 'Идэвхтэй'),
             total: Number(v[12]) || 0, schedule: (function () { try { return JSON.parse(v[13] || '[]'); } catch (e) { return []; } })(),
             monthly: Number(v[14]) || 0, payAcc: String(v[15] || ''), intMode: String(v[16] || '') };
  }).filter(function (x) { return x.id && x.status !== 'Устгасан'; });
}
function adminLoan(d) {
  const sh = loanSheet();
  if (d.cancelId || d.closeId || d.openId) {
    const id = String(d.cancelId || d.closeId || d.openId), cur = loanRows().filter(function (x) { return x.id === id; })[0];
    if (!cur) return { status: 'error', error: 'not_found' };
    sh.getRange(cur.row, 11).setValue(d.cancelId ? 'Устгасан' : d.closeId ? 'Хаагдсан' : 'Идэвхтэй');
    return { status: 'ok' };
  }
  const x = d.loan || {};
  if (!BIZ_NAMES[x.biz] || !/^(Авсан|Өгсөн)$/.test(String(x.kind)) || !String(x.partner || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) || !(Number(x.amount) > 0) ||
      (x.due && !/^\d{4}-\d{2}-\d{2}$/.test(String(x.due)))) return { status: 'error', error: 'fields' };
  const vals = [x.date, x.biz, x.kind, String(x.partner).trim().slice(0, 80), Number(x.amount), Math.max(0, Number(x.rate) || 0), String(x.due || ''),
                Math.min(31, Math.max(0, Math.round(Number(x.payDay) || 0))) || '', String(x.note || '').slice(0, 200)];
  const sched = (Array.isArray(x.schedule) ? x.schedule : []).filter(function (r) { return /^\d{4}-\d{2}-\d{2}$/.test(String(r.d)); }).slice(0, 600)
    .map(function (r) { return { d: String(r.d), p: Math.max(0, Number(r.p) || 0), i: Math.max(0, Number(r.i) || 0) }; });
  if (Number(x.total) > 0 && Number(x.total) < Number(x.amount)) return { status: 'error', error: 'total' };   // хүүтэй нийт < зээлийн дүн
  const extra = [Math.max(0, Number(x.total) || 0) || '', sched.length ? JSON.stringify(sched).slice(0, 45000) : '', Math.max(0, Math.round(Number(x.monthly) || 0)) || '',
                 String(x.payAcc || '').slice(0, 40), /^(day|mon)$/.test(String(x.intMode)) ? String(x.intMode) : ''];
  if (d.updateId) {
    const cur = loanRows().filter(function (y) { return y.id === String(d.updateId); })[0];
    if (!cur) return { status: 'error', error: 'not_found' };
    sh.getRange(cur.row, 2, 1, 9).setValues([vals]); sh.getRange(cur.row, 13, 1, 5).setValues([extra]);
    return { status: 'ok', id: cur.id };
  }
  const id = 'L' + Date.now();
  sh.appendRow([id].concat(vals, ['Идэвхтэй', Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')], extra));
  return { status: 'ok', id: id };
}

// ═══════════ ХУВИЙН САНХҮҮ (зөвхөн Эзэн) ═══════════
// Тусдаа 4 хуудас: данс, гүйлгээ, төсөв, хөрөнгө. Устгахгүй — «Цуцалсан» төлөв. Бүх нүд текст (огноо, тоо хөрвөхгүй).
const PF_T = {
  acc: ['P_Accounts', ['id', 'name', 'type', 'bank', 'bank4', 'open', 'openDate', 'active', 'status', 'by', 'updated']],
  tx: ['P_Transactions', ['id', 'date', 'type', 'acc', 'toAcc', 'amount', 'cat', 'desc', 'link', 'rec', 'status', 'prin', 'intr', 'fee', 'bankId', 'co', 'jids', 'by', 'updated']],
  bud: ['P_Budget', ['id', 'month', 'cat', 'amount', 'status', 'by', 'updated']],
  asset: ['P_Assets', ['id', 'name', 'type', 'value', 'date', 'note', 'status', 'by', 'updated']],
};
const PF_NUM = { open: 1, amount: 1, prin: 1, intr: 1, fee: 1, value: 1 };
function pfSheet(t) {
  const ss = SpreadsheetApp.openById(SHEET_ID), T = PF_T[t];
  let sh = ss.getSheetByName(T[0]);
  if (!sh) { sh = ss.insertSheet(T[0]); sh.getRange(1, 1, sh.getMaxRows(), T[1].length).setNumberFormat('@'); sh.appendRow(T[1]); styleHead(sh, T[1].length, '#334155'); sh.setFrozenRows(1); }
  return sh;
}
function pfRows(t) {
  const sh = pfSheet(t), H = PF_T[t][1], last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, H.length).getValues().map(function (v) {
    const o = {}; H.forEach(function (k, i) { o[k] = PF_NUM[k] ? Number(v[i]) || 0 : v[i] instanceof Date ? fmtDate(v[i], 'yyyy-MM-dd') : String(v[i]); }); return o;
  }).filter(function (o) { return o.id; });
}
function pfAll() { const o = {}; Object.keys(PF_T).forEach(function (t) { o[t] = pfRows(t); }); return o; }
// d.table — acc|tx|bud|asset; d.rows — [{id?, ...}] (id-гүй бол шинэ); d.cancel — [id]
function adminPf(d) {
  const t = String(d.table || ''); if (!PF_T[t]) return { status: 'error', error: 'table' };
  const sh = pfSheet(t), H = PF_T[t][1], now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), by = String(d.by || '').slice(0, 40), pos = {}, ids = [];
  const last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (v, i) { if (v[0]) pos[String(v[0])] = i + 2; });
  (Array.isArray(d.cancel) ? d.cancel : []).slice(0, 200).forEach(function (id) { const r = pos[String(id)]; if (r) { sh.getRange(r, H.indexOf('status') + 1).setValue('Цуцалсан'); sh.getRange(r, H.length - 1, 1, 2).setValues([[by, now]]); } });
  const add = [];
  (Array.isArray(d.rows) ? d.rows : []).slice(0, 200).forEach(function (x, n) {
    if (!x || typeof x !== 'object') return;
    if ((x.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))) || (x.month && !/^\d{4}-\d{2}$/.test(String(x.month)))) return;
    const id = String(x.id || '') || ('P' + t.charAt(0).toUpperCase() + Date.now() + n), row = H.map(function (k) {
      if (k === 'id') return id; if (k === 'by') return by; if (k === 'updated') return now;
      if (k === 'status') return String(x.status || 'Идэвхтэй').slice(0, 20);
      return PF_NUM[k] ? String(Math.round((Number(x[k]) || 0) * 100) / 100) : String(x[k] == null ? '' : x[k]).slice(0, k === 'desc' || k === 'note' ? 300 : 120);
    });
    ids.push(id);
    if (pos[id]) sh.getRange(pos[id], 1, 1, H.length).setNumberFormat('@').setValues([row]); else add.push(row);
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, H.length).setNumberFormat('@').setValues(add);
  return { status: 'ok', ids: ids };
}

// ═══════════ БАРАА ЗАХИАЛГА (Хятад: урьдчилгаа → үлдэгдэл → карго → бараа ирэх) ═══════════
// Төлбөр бүр журналд Дт 1505 «Захиалсан бараа»-аар «#ID» лавлагаатай; бараа ирэхэд өртөг нь 1505-аас 1404 руу шилжинэ.
function poSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_PO);
  if (!sh) { sh = ss.insertSheet(SHEET_PO); sh.appendRow(PO_HEAD); styleHead(sh, PO_HEAD.length, '#1E40AF'); sh.getRange('C:C').setNumberFormat('@'); sh.getRange('K:K').setNumberFormat('@'); }
  return sh;
}
function poRows() {
  const sh = poSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, PO_HEAD.length).getValues().map(function (v, i) {
    let items = []; try { items = JSON.parse(v[5] || '[]'); } catch (e) {}
    return { row: i + 2, id: String(v[0]), no: String(v[1]), date: fmtDate(v[2], 'yyyy-MM-dd'), biz: String(v[3]), supplier: String(v[4]), items: items, cur: String(v[6] || 'CNY'),
             total: Number(v[7]) || 0, cargoCo: String(v[8] || ''), status: String(v[9] || 'Захиалсан'), recvDate: v[10] ? fmtDate(v[10], 'yyyy-MM-dd') : '', note: String(v[11] || '') };
  }).filter(function (x) { return x.id; });
}
function adminPo(d) {
  if (d.inboxId) return poInDecide(d);
  const sh = poSheet(), rows = poRows();
  if (d.statusId) {   // Захиалсан / Ирсэн / Цуцалсан
    const cur = rows.filter(function (x) { return x.id === String(d.statusId); })[0];
    if (!cur || !/^(Захиалсан|Ирсэн|Цуцалсан)$/.test(String(d.status))) return { status: 'error', error: 'fields' };
    sh.getRange(cur.row, 10, 1, 2).setValues([[d.status, d.status === 'Ирсэн' ? String(d.recvDate || Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd')) : '']]);
    return { status: 'ok' };
  }
  const x = d.po || {};
  const items = (Array.isArray(x.items) ? x.items : []).filter(function (i) { return String(i.name || '').trim() && Number(i.qty) > 0; })
    .map(function (i) { return { name: String(i.name).trim().slice(0, 80), qty: Number(i.qty), price: Math.max(0, Number(i.price) || 0), cn: Math.max(0, Number(i.cn) || 0) }; });   // cn — Хятад дахь карго (мөрийн дүн)
  if (!BIZ_NAMES[x.biz] || !String(x.supplier || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) || !items.length || !/^(CNY|USD|MNT)$/.test(String(x.cur))) return { status: 'error', error: 'fields' };
  const total = Math.round(items.reduce(function (a, i) { return a + i.qty * i.price + i.cn; }, 0) * 100) / 100;
  const vals = [x.date, x.biz, String(x.supplier).trim().slice(0, 80), JSON.stringify(items).slice(0, 45000), x.cur, total, String(x.cargoCo || '').slice(0, 80)];
  if (d.updateId) {
    const cur = rows.filter(function (y) { return y.id === String(d.updateId); })[0];
    if (!cur) return { status: 'error', error: 'not_found' };
    sh.getRange(cur.row, 3, 1, 7).setValues([vals]); sh.getRange(cur.row, 12).setValue(String(x.note || '').slice(0, 200));
    return { status: 'ok', id: cur.id, no: cur.no };
  }
  const n = rows.filter(function (y) { return y.biz === x.biz; }).length + 1, no = 'ЗХ-' + ('000' + n).slice(-4), id = 'PO' + Date.now();
  sh.appendRow([id, no].concat(vals, ['Захиалсан', '', String(x.note || '').slice(0, 200), Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')]));
  return { status: 'ok', id: id, no: no };
}

// ═══════════ АЖИЛТНЫ «БАРАА ИРСЭН», КАРГО — удирдлага батална ═══════════
// Ажилтан зөвхөн тоо, каргоны дүнг бичнэ (үнэ, өртөг харахгүй). Үлдэгдэл, журнал нь удирдлага баталмагц admin-ийн «Бараа ирсэн» / «Карго»-оор бичигдэнэ.
function poInSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_POIN);
  if (!sh) { sh = ss.insertSheet(SHEET_POIN); sh.appendRow(POIN_HEAD); styleHead(sh, POIN_HEAD.length, '#1E40AF'); sh.getRange('B:B').setNumberFormat('@'); sh.getRange('K:K').setNumberFormat('@'); }
  return sh;
}
function poInRows() {
  const sh = poInSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, POIN_HEAD.length).getValues().map(function (v, i) {
    let x = {}; try { x = JSON.parse(v[6] || '{}'); } catch (e) {}
    return { row: i + 2, id: String(v[0]), at: String(v[1]), biz: String(v[2]), poId: String(v[3]), poNo: String(v[4]), kind: String(v[5]), data: x, by: String(v[7]), status: String(v[8] || 'Хүлээгдэж'), doneBy: String(v[9] || ''), doneAt: String(v[10] || '') };
  }).filter(function (x) { return x.id; });
}
function staffPo(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const cut = Utilities.formatDate(new Date(Date.now() - 60 * 864e5), TZ, 'yyyy-MM-dd'), cut30 = Utilities.formatDate(new Date(Date.now() - 30 * 864e5), TZ, 'yyyy-MM-dd');
  const list = cacheGet('po', poRows).filter(function (p) { return p.biz === who.biz && (p.status === 'Захиалсан' || (p.status === 'Ирсэн' && p.recvDate >= cut)); });
  const mv = stockMoves().filter(function (m) { return m.biz === who.biz && m.kind === 'Орлого' && m.pay === 'Захиалга'; });
  const cargoJ = cacheGet('jr', journalRows).filter(function (e) { return e.biz === who.biz && e.status !== 'Цуцалсан' && /карго/i.test(e.desc); });
  const pos = list.map(function (p) {
    const re = new RegExp('#' + p.id + '(?![\\w])'), got = {}, S = {};
    mv.forEach(function (m) {
      if (!re.test(m.note)) return;
      got[m.item] = (got[m.item] || 0) + m.qty;
      const x = m.note.match(/ирэлт (\d+)/), n = x ? Number(x[1]) : 1; S[n] = S[n] || m.date.slice(0, 10);
    });
    return { id: p.id, no: p.no, date: p.date, supplier: p.supplier, cargoCo: p.cargoCo, status: p.status,   // үнэ буцаахгүй
      items: (p.items || []).map(function (i) { return { name: i.name, qty: i.qty, got: Math.round((got[i.name] || 0) * 1000) / 1000 }; }),
      ships: Object.keys(S).map(function (n) { return { n: Number(n), date: S[n] }; }).sort(function (a, b) { return a.n - b.n; }) };
  }).filter(function (p) {   // бүрэн ирсэн, карго нь бүртгэгдсэн захиалга хүлээгдэхгүй — ажилтны жагсаалтаас нуух (нэмэлт каргог удирдлага бүртгэнэ)
    if (p.status !== 'Ирсэн' || !p.items.every(function (i) { return i.got >= i.qty; })) return true;
    const re = new RegExp('#' + p.id + '(?![\\w])');
    return !cargoJ.some(function (e) { return re.test(e.desc); });
  });
  const sent = poInRows().filter(function (x) { return x.biz === who.biz && (x.status === 'Хүлээгдэж' || x.at.slice(0, 10) >= cut30); }).map(function (x) { delete x.row; return x; }).reverse();
  return { status: 'ok', pos: pos, sent: sent };
}
function staffPoIn(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const p = poRows().filter(function (x) { return x.id === String(d.poId) && x.biz === who.biz; })[0];
  if (!p || p.status === 'Цуцалсан') return { status: 'error', error: 'not_found' };
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), date = String(d.date || ''), note = String(d.note || '').trim().slice(0, 200);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return { status: 'error', error: 'date' };
  let x;
  const fa = String(p.note || '').indexOf(PO_FA) === 0;   // үндсэн хөрөнгө — ашиглах хугацаа шаардана, удирдлага батална
  if (d.kind === 'recv') {
    if (p.status !== 'Захиалсан') return { status: 'error', error: 'state' };
    const pend = poInRows().filter(function (r) { return r.poId === p.id && r.kind === 'recv' && r.status === 'Хүлээгдэж'; });
    if (fa && pend.length) return { status: 'error', error: 'pending' };
    const names = {}; (p.items || []).forEach(function (i) { names[i.name] = 1; });
    const items = (Array.isArray(d.items) ? d.items : []).filter(function (i) { return names[i.name] && Number(i.qty) > 0; }).map(function (i) { return { name: String(i.name), qty: Number(i.qty) }; });
    if (!items.length) return { status: 'error', error: 'fields' };
    const cargo = Math.max(0, Math.round((Number(d.cargo) || 0) * 100) / 100), cco = String(d.co || '').trim().slice(0, 80);
    if (cargo > 0 && !cco) return { status: 'error', error: 'fields' };
    x = { date: date, loc: STOCK_LOCS[d.loc] ? d.loc : 'Дэлгүүр', items: items, note: note, cargo: cargo, co: cco };
    if (!fa) {   // шууд хүлээн авна: өмнөх хүлээгдэж буй бүртгэлийг энэ орлоно
      if (lockedDate(date)) return { status: 'error', error: 'locked' };
      const r = poDirectRecv(p, x, who);
      if (r.status !== 'ok') return r;
      pend.forEach(function (q) { poInSheet().getRange(q.row, 9, 1, 3).setValues([['Татгалзсан', 'Дахин илгээв', Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')]]); });
      const id0 = 'PI' + Date.now(), t0 = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
      poInSheet().appendRow([id0, t0, who.biz, p.id, p.no, 'recv', JSON.stringify(x).slice(0, 45000), who.staff.name, 'Батлагдсан', 'Шууд', t0]);
      return { status: 'ok', id: id0, direct: true, total: r.total, noCost: !(r.total > 0) };
    }
  } else if (d.kind === 'cargo') {
    const amount = Math.round(Number(d.amount) * 100) / 100, co = String(d.co || '').trim().slice(0, 80);
    if (!(amount > 0) || !co) return { status: 'error', error: 'fields' };
    x = { date: date, amount: amount, co: co, ship: Number(d.ship) || 0, note: note };
    if (!fa) {   // шууд: өртөгт нэмж, карго компанид өглөг (кассаас хасагдахгүй)
      if (lockedDate(date)) return { status: 'error', error: 'locked' };
      const cj = adminJournal({ by: who.staff.name, entries: [x.ship ? { biz: p.biz, date: date, dr: '1404', cr: '3101', amount: amount, partner: co, desc: p.no + ' · ирэлт ' + x.ship + ' · карго (дараа төлнө) · ' + co + ' #' + p.id }
        : { biz: p.biz, date: date, dr: '1505', cr: '3101', amount: amount, partner: co, desc: p.no + ' · карго (дараа төлнө) · ' + co + ' #' + p.id }] });
      if (cj.status !== 'ok') return cj;
      const id1 = 'PI' + Date.now(), t1 = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
      poInSheet().appendRow([id1, t1, who.biz, p.id, p.no, 'cargo', JSON.stringify(x).slice(0, 45000), who.staff.name, 'Батлагдсан', 'Шууд', t1]);
      return { status: 'ok', id: id1, direct: true, total: amount };
    }
  } else return { status: 'error', error: 'fields' };
  const id = 'PI' + Date.now();
  poInSheet().appendRow([id, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), who.biz, p.id, p.no, d.kind, JSON.stringify(x).slice(0, 45000), who.staff.name, 'Хүлээгдэж', '', '']);
  return { status: 'ok', id: id };
}
// Ажилтны «Бараа ирсэн»-ийг шууд үлдэгдэлд оруулна. Өртөг: po.js prAlloc-той ижил — захиалгад бүртгэгдсэн төлбөр (1505)-өөс ирэлтэд ногдох хэсэг + карго
function poDirectRecv(p, x, who) {
  const r2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; }, re = new RegExp('#' + p.id + '(?![\\w])');
  let gIn = 0, cIn = x.cargo;
  journalRows().forEach(function (e) { if (e.biz !== p.biz || e.dr !== '1505' || !re.test(e.desc)) return; if (/карго/i.test(e.desc)) cIn += e.amount; else gIn += e.amount; });
  let gDone = 0, cDone = 0, n = 0; const prev = {};
  stockMoves().forEach(function (m) {
    if (m.biz !== p.biz || m.kind !== 'Орлого' || m.pay !== 'Захиалга' || !re.test(m.note)) return;
    const q = Number(m.qty) || 0, s = String(m.note).match(/ирэлт (\d+)/); n = Math.max(n, s ? Number(s[1]) : 1);
    prev[m.item] = (prev[m.item] || 0) + q; gDone += q * ((Number(m.cost) || 0) - (Number(m.cargo) || 0)); cDone += q * (Number(m.cargo) || 0);
  });
  n += 1;
  const got = {}; x.items.forEach(function (i) { got[i.name] = (got[i.name] || 0) + i.qty; });
  const rows = (p.items || []).map(function (it) { return { name: it.name, price: Number(it.price) || 0, cn: Number(it.cn) || 0, ord: Number(it.qty) || 0, prev: prev[it.name] || 0, qty: got[it.name] || 0 }; });
  const useQty = !rows.some(function (r) { return r.price > 0; }), wt = function (r, q) { return useQty ? q : q * r.price + (r.ord ? r.cn * q / r.ord : 0); };
  const remV = rows.reduce(function (a, r) { return a + wt(r, Math.max(0, r.ord - r.prev)); }, 0), shipV = rows.reduce(function (a, r) { return a + wt(r, r.qty); }, 0);
  const fin = rows.every(function (r) { return r.prev + r.qty >= r.ord - 1e-9; }), share = fin || !(remV > 0) ? 1 : Math.min(1, shipV / remV);
  const goods = r2(Math.max(0, gIn - gDone) * share), cargo = r2(Math.max(0, cIn - cDone)), total = r2(goods + cargo), live = rows.filter(function (r) { return r.qty > 0; });
  let left = total;
  live.forEach(function (r, k) {
    const w = shipV ? wt(r, r.qty) / shipV : 0, t = k === live.length - 1 ? left : r2(total * w);
    left = r2(left - t); r.unit = r2(t / r.qty); r.cargoU = r2(cargo * w / r.qty);
  });
  const value = rows.reduce(function (a, r) { return a + r.qty * r.price; }, 0), rate = p.cur !== 'MNT' && value ? r2(goods / value) : '';
  if (x.cargo > 0) { const j = adminJournal({ by: who.staff.name, entries: [{ biz: p.biz, date: x.date, dr: '1505', cr: '3101', amount: x.cargo, partner: x.co, desc: p.no + ' · карго (дараа төлнө) · ' + x.co + ' #' + p.id }] }); if (j.status !== 'ok') return j; }
  const st = adminStock({ by: who.staff.name, moves: live.map(function (r) {
    return { biz: p.biz, loc: x.loc, item: r.name, kind: 'Орлого', qty: r.qty, cost: r.unit, pay: 'Захиалга', partner: p.supplier, note: p.no + ' · ирэлт ' + n + ' #' + p.id, buy: r.price || '', cur: r.price ? p.cur : '', rate: rate, cargo: r.cargoU || '', cargoPay: '', cargoPartner: '' };
  }) });
  if (st.status !== 'ok') return st;
  if (fin && goods > 0) poSheet().getRange(p.row, 10, 1, 2).setValues([['Ирсэн', x.date]]);   // төлбөр бүртгэгдээгүй бол нээлттэй — дараа нь төлбөрийг нь тулгана
  return { status: 'ok', total: total };
}
function poInDecide(d) {
  const r = poInRows().filter(function (x) { return x.id === String(d.inboxId); })[0];
  if (!r || !/^(Батлагдсан|Татгалзсан)$/.test(String(d.inboxStatus))) return { status: 'error', error: 'fields' };
  if (r.status !== 'Хүлээгдэж') return { status: 'error', error: 'state' };
  poInSheet().getRange(r.row, 9, 1, 3).setValues([[d.inboxStatus, String(d.by || '').slice(0, 40), Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')]]);
  return { status: 'ok' };
}

// ═══════════ АЖИЛЧДАД ДААЛГАВАР ═══════════
function taskSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_TASK);
  if (!sh) { sh = ss.insertSheet(SHEET_TASK); sh.appendRow(TASK_HEAD); styleHead(sh, TASK_HEAD.length, '#6D28D9'); sh.getRange('B:B').setNumberFormat('@'); sh.getRange('G:G').setNumberFormat('@'); }
  return sh;
}
function taskRows() {
  const sh = taskSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, TASK_HEAD.length).getValues().map(function (v, i) {
    return { row: i + 2, id: String(v[0]), created: fmtDate(v[1], 'yyyy-MM-dd HH:mm'), biz: String(v[2]), staffId: String(v[3]), staffName: String(v[4]), title: String(v[5]),
             due: fmtDate(v[6], 'yyyy-MM-dd'), status: String(v[7]), doneBy: String(v[8]), doneAt: fmtDate(v[9], 'yyyy-MM-dd HH:mm'), from: String(v[10]), note: String(v[11]) };
  }).filter(function (t) { return t.id && t.status !== 'Цуцалсан'; });
}
function adminTask(d) {
  const sh = taskSheet();
  if (d.cancelId) { const t = taskRows().filter(function (x) { return x.id === String(d.cancelId); })[0]; if (!t) return { status: 'error', error: 'not_found' }; sh.getRange(t.row, 8).setValue('Цуцалсан'); return { status: 'ok' }; }
  const t = d.task || {};
  if (!BIZ_NAMES[t.biz] || !String(t.title || '').trim()) return { status: 'error', error: 'fields' };
  const s = t.staffId && t.staffId !== 'all' ? staffRows().filter(function (x) { return x.id === t.staffId; })[0] : null;
  const id = 'T' + Date.now();
  sh.appendRow([id, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), t.biz, s ? s.id : 'all', s ? s.name : 'Бүх ажилтан', String(t.title).slice(0, 200),
    /^\d{4}-\d{2}-\d{2}$/.test(String(t.due)) ? t.due : '', 'Шинэ', '', '', String(d.by || '').slice(0, 40), String(t.note || '').slice(0, 300)]);
  return { status: 'ok', id: id };
}
function staffTasks(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const since = Utilities.formatDate(new Date(Date.now() - 7 * 864e5), TZ, 'yyyy-MM-dd');
  return { status: 'ok', tasks: taskRows().filter(function (t) {
    return t.biz === who.biz && (t.staffId === 'all' || t.staffId === who.staff.id) && (t.status === 'Шинэ' || t.doneAt.slice(0, 10) >= since);
  }).map(function (t) { delete t.row; return t; }) };
}
function staffTaskDone(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const t = taskRows().filter(function (x) { return x.id === String(d.id) && x.biz === who.biz && (x.staffId === 'all' || x.staffId === who.staff.id); })[0];
  if (!t) return { status: 'error', error: 'not_found' };
  taskSheet().getRange(t.row, 8, 1, 3).setValues([['Хийсэн', who.staff.name, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')]]);
  return { status: 'ok' };
}

// ═══════════ ЗАХИАЛГА ═══════════
function orderSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_ORDER);
  if (!sh) {
    sh = ss.insertSheet(SHEET_ORDER);
    sh.appendRow(ORDER_HEAD);
    styleHead(sh, ORDER_HEAD.length, '#7A5A2E');
    sh.getRange('B:C').setNumberFormat('@'); sh.getRange('G:H').setNumberFormat('@'); sh.getRange('O:O').setNumberFormat('@');
    sh.hideColumns(4);
  } else if (String(sh.getRange(1, 22).getValue()) !== 'Баталгаа') {
    // v3.4: «Баталгаа» багана нэмнэ. Өмнө нь «Орсон»-ыг зөвхөн удирдлага тавьдаг байсан тул тэдгээрийг баталгаажсан гэж тооцно.
    if (sh.getMaxColumns() < 22) sh.insertColumnsAfter(sh.getMaxColumns(), 22 - sh.getMaxColumns());
    sh.getRange(1, 22).setValue('Баталгаа');
    const last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 22, last - 1, 1).setValues(sh.getRange(2, 18, last - 1, 1).getValues().map(function (r) { return [r[0] === 'Орсон' ? 'Удирдлага' : '']; }));
    styleHead(sh, 22, '#7A5A2E');
  }
  if (String(sh.getRange(1, 23).getValue()) !== 'Буухиа код') {   // v5.6: ebuuhia API-ийн хүргэлтийн код
    if (sh.getMaxColumns() < 23) sh.insertColumnsAfter(sh.getMaxColumns(), 23 - sh.getMaxColumns());
    sh.getRange(1, 23).setValue('Буухиа код'); sh.getRange('W:W').setNumberFormat('@'); styleHead(sh, 23, '#7A5A2E');
  }
  if (String(sh.getRange(1, 24).getValue()) !== 'Хүргэлтийн компани') {   // v7.3: Буухиа / Бусад — захиалга дээр сонгоно (хоосон = Буухиа)
    if (sh.getMaxColumns() < 24) sh.insertColumnsAfter(sh.getMaxColumns(), 24 - sh.getMaxColumns());
    sh.getRange(1, 24).setValue('Хүргэлтийн компани'); styleHead(sh, 24, '#7A5A2E');
  }
  if (String(sh.getRange(1, 25).getValue()) !== 'Буухиа дүн') {   // v8.5: 1 — үнийн дүнтэй, 0 — үнийн дүнгүй илгээсэн (хоосон = хуучин)
    if (sh.getMaxColumns() < 25) sh.insertColumnsAfter(sh.getMaxColumns(), 25 - sh.getMaxColumns());
    sh.getRange(1, 25).setValue('Буухиа дүн'); styleHead(sh, 25, '#7A5A2E');
  }
  return sh;
}
function orderRows() {
  const sh = orderSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, ORDER_HEAD.length).getValues().map(function (v, i) {
    const o = { row: i + 2 };
    ORDER_KEYS.forEach(function (k, j) { o[k] = v[j] instanceof Date ? fmtDate(v[j], j === 2 ? 'HH:mm' : 'yyyy-MM-dd') : v[j]; });
    o.amount = Number(o.amount) || 0; o.id = String(o.id); o.phone = String(o.phone); o.phone2 = String(o.phone2 || '');
    return o;
  }).filter(function (o) { return o.id; });
}
// Ажилтан захиалга нэмэх / засах (токеноор). Мөрийг ID-аар нь олж шинэчилнэ.
function orderSave(d) {
  const who = checkStaff(d.token), o = d.order || {};
  if (!who || who.biz !== o.biz) return { status: 'error', error: 'auth' };
  if (!o.id && !o.noPhone && !/^\d{8}$/.test(String(o.phone || '').replace(/\D/g, ''))) return { status: 'error', error: 'phone' };
  const sh = orderSheet(), now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
  const cur = o.id ? orderRows().filter(function (x) { return x.id === String(o.id); })[0] : null;
  if (o.id && !cur) return { status: 'error', error: 'not_found' };
  const base = cur || { id: 'O' + Date.now(), date: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), time: Utilities.formatDate(new Date(), TZ, 'HH:mm'), biz: o.biz, staff: who.staff.name };
  const merged = {};
  ORDER_KEYS.forEach(function (k) { merged[k] = base[k] !== undefined ? base[k] : ''; });
  ['customer', 'phone', 'phone2', 'city', 'district', 'khoroo', 'address', 'items', 'amount', 'deliverDate', 'payType', 'status', 'paid', 'note', 'saleDone', 'courier'].forEach(function (k) {
    if (o[k] !== undefined) merged[k] = typeof o[k] === 'string' ? o[k].slice(0, k === 'items' ? 2000 : 300) : o[k];
  });
  // Ажилтан «Орсон/Ороогүй» гэж тэмдэглэж болно (санхүүд бичигдэхгүй). Баталгааг ЗӨВХӨН удирдлага (банкны тулгалт) тавина.
  merged.paid = merged.paid === 'Орсон' ? 'Орсон' : 'Ороогүй';
  merged.confirmed = cur ? (cur.confirmed || '') : '';
  if (merged.confirmed) merged.paid = 'Орсон';   // баталгаажсан төлбөрийг ажилтан буцааж чадахгүй
  if (cur) {
    const sd = String(cur.saleDone || '');
    if ((/^yes:/.test(sd) || sd === 'returned') && !/^yes:|^returned$/.test(String(merged.saleDone || ''))) merged.saleDone = sd;
  }
  merged.updated = now + ' ' + who.staff.name;
  const row = ORDER_KEYS.map(function (k) { return merged[k]; });
  if (cur) sh.getRange(cur.row, 1, 1, ORDER_HEAD.length).setValues([row]); else sh.appendRow(row);
  const adj = cur ? orderSyncAdj(Object.assign({ row: cur.row }, merged), who.staff.name) : 0;   // илгээгдсэн захиалгын хүргэлт, хөнгөлөлт засварлавал борлуулалтын мөр дагана
  return { status: 'ok', order: merged, adj: adj };
}
// Илгээгдсэн (борлуулалт бичигдсэн) захиалгын «Хүргэлтийн төлбөр», «Хөнгөлөлт»-ийг засахад борлуулалтын мөрийг захиалгатай тааруулна —
// журнал (авлага 1201, орлого 5102, хөнгөлөлт 6002) бүртгэлээс үүсдэг тул дагаж шинэчлэгдэнэ. Түгжигдээгүй анхны мөрийг засна, үгүй бол зөрүүг шинэ мөрөөр.
function orderSyncAdj(o, by) {
  if (!/^yes:/.test(String(o.saleDone || '')) || /^(Цуцалсан|Буцаасан)$/.test(String(o.status))) return 0;
  let items; try { items = JSON.parse(o.items || '[]'); } catch (e) { return 0; }
  const want = {}; want[FEE_ITEM] = 0; want[DISC_ITEM] = 0;
  items.forEach(function (i) { if (want[i.name] !== undefined) want[i.name] += Math.round((Number(i.qty) || 1) * (Number(i.price) || 0)); });
  const log = logSheet(), lr = log.getLastRow(), have = {}, first = {};
  if (lr >= 2) log.getRange(2, 1, lr - 1, LOG_HEAD.length).getValues().forEach(function (v, i) {
    if (String(v[16]) !== 'sale' || String(v[17]) !== String(o.id) || String(v[18]) === 'Устгасан') return;
    const k = String(v[6]).replace(/ \(буцаалт\)$/, ''); if (want[k] === undefined) return;
    have[k] = (have[k] || 0) + (Number(v[10]) || 0);
    if (String(v[6]) === k && !first[k] && !lockedDate(fmtDate(v[1], 'yyyy-MM-dd'))) first[k] = { r: i + 2, amt: Number(v[10]) || 0 };
  });
  const pay = String(o.saleDone).slice(4), now = new Date(), date = Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), rows = [];
  let n = 0;
  Object.keys(want).forEach(function (k) {
    const diff = Math.round(want[k] - (have[k] || 0)); if (!diff) return;
    const x = first[k], nv = x ? x.amt + diff : 0; n++;
    if (x && nv === 0) { log.getRange(x.r, 19).setValue('Устгасан'); return; }   // хүргэлт үнэгүй / хөнгөлөлтгүй болсон
    if (x && nv * x.amt > 0) { log.getRange(x.r, 8, 1, 4).setValues([[1, 'ш', nv, nv]]); return; }
    if (lockedDate(date)) { n--; return; }
    rows.push([o.biz + '-' + now.getTime() + '-a' + n, date, Utilities.formatDate(now, TZ, 'HH:mm'), BIZ_NAMES[o.biz], TYPE_NAMES.sale, String(by || 'Удирдлага').slice(0, 40), k, 1, 'ш', diff, diff, pay,
      '', '', 'Захиалга ' + o.phone + ' · засвар', o.biz, 'sale', o.id, '', pay === 'Урьдчилгаа' ? ((o.customer ? o.customer + ' ' : '') + o.phone) : '']);
  });
  if (rows.length) log.getRange(log.getLastRow() + 1, 1, rows.length, LOG_HEAD.length).setValues(rows);
  return n;
}
// Ажилтанд үлдэгдэл — удирдлагын кэшээс (өртөггүй)
function stockPublic(biz) {
  const all = cacheGet('stk', function () { return stockAll(true); })[biz] || {}, out = {};
  Object.keys(all).forEach(function (k) { out[k] = { shop: all[k].shop, wh: all[k].wh }; });
  return out;
}
function ordersFor(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const since = Utilities.formatDate(new Date(Date.now() - 45 * 864e5), TZ, 'yyyy-MM-dd');
  return { status: 'ok', orders: cacheGet('ord', orderRows).filter(function (o) {
    return o.biz === who.biz && (o.date >= since || !/^(Хүргэгдсэн|Цуцалсан|Буцаасан)$/.test(o.status) || (!o.confirmed && !/^(Цуцалсан|Буцаасан)$/.test(o.status)));
  }).map(function (o) { delete o.row; return o; }) };
}
// Утасны дугаараар өмнөх захиалга (ажилтан шинэ захиалга бичихэд): тоо, нийт дүн, сүүлийн хаяг
function orderHist(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const ph = String(d.phone || '').replace(/\D/g, '').slice(-8);
  if (ph.length < 8) return { status: 'error', error: 'fields' };
  const L = orderRows().filter(function (o) { return o.biz === who.biz && String(o.phone).replace(/\D/g, '').slice(-8) === ph; })
    .sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  const ok = L.filter(function (o) { return !/^(Цуцалсан|Буцаасан)$/.test(o.status); }), l = L[L.length - 1];
  return { status: 'ok', n: ok.length, canc: L.length - ok.length, total: ok.reduce(function (a, o) { return a + (Number(o.amount) || 0); }, 0),
           last: l ? { date: l.date, customer: l.customer, address: l.address, district: l.district, khoroo: l.khoroo, city: l.city, phone2: l.phone2 } : null };
}
// Хуучин «Cozy хүргэлт» хүснэгтийн эхний хуудаснаас захиалгуудыг нэг удаа шилжүүлнэ (давхардсаныг алгасна).
function importCozy(d) {
  const src = SpreadsheetApp.openById(COZY_OLD_SHEET).getSheets()[0];
  const vals = src.getDataRange().getValues();
  const have = {};
  orderRows().forEach(function (o) { have[o.phone + '|' + o.items + '|' + o.amount] = 1; });
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), rows = [];
  vals.slice(1).forEach(function (v, i) {
    const phone = String(v[0] || '').replace(/\D/g, ''), item = String(v[1] || '').trim();
    if (!phone || !item) return;
    const amount = Number(String(v[3]).replace(/[^\d.]/g, '')) || 0;
    const items = JSON.stringify([{ name: item, qty: 1, price: amount }]);
    if (have[phone + '|' + items + '|' + amount]) return;
    const st = String(v[4] || '').trim().toLowerCase();
    const status = /хүргэгдсэн/.test(st) ? 'Хүргэгдсэн' : /өгсөн/.test(st) ? 'Буухиад өгсөн' : 'Шинэ';
    const paid = /^орсон/.test(String(v[5] || '').trim().toLowerCase()) ? 'Орсон' : 'Ороогүй';
    rows.push(['O' + Date.now() + '-' + i, today, '00:00', 'cozy', 'Хуучин хүснэгт', '', phone, '', 'Улаанбаатар', '', '', String(v[2] || '').trim(),
      items, amount, '', paid === 'Орсон' ? 'Шилжүүлэг' : 'Хүргэлтээр бэлэн', status, paid, String(v[6] || '').trim(), 'Хуучин хүснэгтээс шилжүүлсэн', 'imported', paid === 'Орсон' ? 'Хуучин' : '', '', '', '']);
  });
  if (d.dryRun) return { status: 'ok', count: rows.length };
  if (rows.length) { const sh = orderSheet(); sh.getRange(sh.getLastRow() + 1, 1, rows.length, ORDER_HEAD.length).setValues(rows); }
  return { status: 'ok', count: rows.length };
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
      address: String(v[14] || ''), start: fmtDate(v[15], 'yyyy-MM-dd'), contractNo: String(v[16] || ''),
      contractDate: fmtDate(v[17], 'yyyy-MM-dd'), contractEnd: fmtDate(v[18], 'yyyy-MM-dd'), terms: String(v[19] || ''),
      ndJob: String(v[20] || ''), ndType: String(v[21] || '01001'),
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
  if (sh.getRange(1, 22).getValue() !== 'Даатгуулагчийн төрөл') {   // v2.x → v2.8: гэрээ, НДШ-ийн баганууд
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
    else if (r.type === 'collect') { r.pay = v[11]; r.customer = String(v[19] || ''); r.bill = String(v[17] || ''); }
    else if (r.type === 'expense') { r.category = v[6]; }
    else if (r.type === 'request') { r.category = String(v[6] || ''); r.customer = String(v[19] || ''); r.status = String(v[18] || ''); }   // мөнгөний хүсэлт: '' = хүлээгдэж, Төлсөн, Татгалзсан
    else if (r.type === 'attend') { r.item = String(v[6] || ''); }
    else if (r.type === 'boost') { r.item = String(v[6] || ''); r.qty = Number(v[7]) || 0; r.unit = String(v[8] || ''); r.price = Number(v[9]) || 0; r.bill = String(v[17] || ''); }
    else { r.counted = Number(v[12]) || 0; r.diff = Number(v[13]) || 0; }
    records.push(r);
  });
  return { status: 'ok', records: records };
}

// "Бараа" хуудас: Бизнес (meat/cozy/travel) | Нэр | Нэгж | Үнэ
// Энд бараа нэмж, үнээ сольвол ажилтны хуудсанд автоматаар гарч ирнэ.
function products(biz) {
  const list = cacheGet('prod', productRows).filter(function (p) { return p.biz === biz; })   // кэш — бараа засахад цэвэрлэгдэнэ
    .map(function (p) { return { name: p.name, unit: p.unit, price: p.price, cls: p.cls, cat: p.cat, off: p.off }; });
  let bc = {}; try { bc = JSON.parse(PropertiesService.getScriptProperties().getProperty('BARCODES_' + biz) || '{}'); } catch (e) {}
  return { status: 'ok', products: list, payInfo: PropertiesService.getScriptProperties().getProperty('PAYINFO_' + biz) || '', storepay: spOn(biz), barcodes: bc,
    notices: staffNoticeList().filter(function (x) { return x.biz === 'all' || x.biz === biz; }) };
}
// Баркод → барааны нэр (дэлгүүр тус бүр Script Property BARCODES_<biz>). Ажилтан кассаас уншуулж сургана; name хоосон бол баркодыг устгана.
function barcodeSet(d) {
  const who = checkStaff(d.token); if (!who) return { status: 'error', error: 'auth' };
  const code = String(d.code || '').replace(/\s/g, '').slice(0, 40), name = String(d.name || '').trim().slice(0, 80);
  if (code.length < 4) return { status: 'error', error: 'fields' };
  const pr = PropertiesService.getScriptProperties(), k = 'BARCODES_' + who.biz;
  let m = {}; try { m = JSON.parse(pr.getProperty(k) || '{}'); } catch (e) {}
  if (name) m[code] = name; else delete m[code];
  const js = JSON.stringify(m); if (js.length > 8500) return { status: 'error', error: 'too_big' };
  pr.setProperty(k, js); return { status: 'ok' };
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
function priceSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_PRICE);
  if (!sh) { sh = ss.insertSheet(SHEET_PRICE); sh.appendRow(PRICE_HEAD); styleHead(sh, PRICE_HEAD.length, '#C8743F'); sh.getRange('A:A').setNumberFormat('@'); }
  return sh;
}
function priceRows() {   // сүүлийн 1000
  const sh = priceSheet(), last = sh.getLastRow(); if (last < 2) return [];
  const n = Math.min(1000, last - 1);
  return sh.getRange(last - n + 1, 1, n, PRICE_HEAD.length).getValues().map(function (v) {
    return { date: String(v[0]), biz: String(v[1]), item: String(v[2]), old: Number(v[3]) || 0, price: Number(v[4]) || 0, by: String(v[5]) };
  });
}
// Үнэ өөрчлөгдсөн бол түүхэнд бичнэ
function priceLog(rows, by) {
  if (!rows.length) return;
  const now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), sh = priceSheet();
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, PRICE_HEAD.length).setValues(rows.map(function (r) { return [now, r.biz, r.name, r.old, r.price, String(by || '').slice(0, 40)]; }));
}
function adminProduct(d) {
  if (Array.isArray(d.products)) {   // Excel-ээс олноор (нэг уншилт, нэг бичилт)
    const list = d.products;
    if (!list.length || list.length > 1000) return { status: 'error', error: 'fields' };
    const sh = prodSheet(), idx = {}, add = [], oldP = {}, changed = [];
    productRows().forEach(function (x) { idx[x.biz + '|' + x.name.toLowerCase()] = x.row; oldP[x.biz + '|' + x.name.toLowerCase()] = x.price; });
    for (let i = 0; i < list.length; i++) {
      const p = list[i], name = String(p.name || '').trim().slice(0, 80);
      if (!BIZ_NAMES[p.biz] || !name || !(Number(p.price) >= 0) || (p.cls && !/^\d{7}$/.test(String(p.cls)))) return { status: 'error', error: 'fields', index: i };
      const row = [p.biz, name, String(p.unit || '').slice(0, 10), Number(p.price) || 0, String(p.cls || ''), String(p.cat || '').slice(0, 40), p.off ? 'Идэвхгүй' : 'Идэвхтэй'];
      const k = p.biz + '|' + name.toLowerCase();
      if (oldP[k] !== undefined && oldP[k] !== (Number(p.price) || 0)) changed.push({ biz: p.biz, name: name, old: oldP[k], price: Number(p.price) || 0 });
      if (idx[k] > 0) sh.getRange(idx[k], 1, 1, PROD_HEAD.length).setValues([row]);
      else if (!idx[k]) { add.push(row); idx[k] = -1; }
    }
    if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, PROD_HEAD.length).setValues(add);
    priceLog(changed, d.by);
    return { status: 'ok', saved: list.length };
  }
  const p = d.product || {};
  const name = String(p.name || '').trim().slice(0, 80);
  if (!BIZ_NAMES[p.biz] || !name || !(Number(p.price) >= 0) || (p.cls && !/^\d{7}$/.test(String(p.cls)))) return { status: 'error', error: 'fields' };
  const row = [p.biz, name, String(p.unit || '').slice(0, 10), Number(p.price) || 0, String(p.cls || ''), String(p.cat || '').slice(0, 40), p.off ? 'Идэвхгүй' : 'Идэвхтэй'];
  const sh = prodSheet();
  const cur = productRows().filter(function (x) { return x.biz === p.biz && x.name.toLowerCase() === name.toLowerCase(); })[0];
  if (cur && cur.price !== (Number(p.price) || 0)) priceLog([{ biz: p.biz, name: name, old: cur.price, price: Number(p.price) || 0 }], d.by);
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
// Редактороос ажиллуулж шалгах: токен зөв зурагдаж/шалгагдаж байгаа эсэх (өгөгдөл өөрчлөхгүй)
function selfTest() {
  const s = staffRows().filter(function (x) { return x.status === 'Тийм'; })[0];
  if (!s) return Logger.log('Идэвхтэй ажилтан алга');
  const biz = staffBizes(s.biz)[0] || 'meat', t = signStaff(s.id, biz);
  const ok = !!checkStaff(t), fake = !!checkStaff(t.slice(0, -3) + 'abc'), none = !!checkStaff('');
  Logger.log('ТОКЕН ' + (ok && !fake && !none ? 'OK' : 'АЛДАА') + ' (зөв=' + ok + ', хуурамч=' + fake + ', хоосон=' + none + ')');
}
function setup() { logSheet(); prodSheet(); staffSheet(); salarySheet(); stockSheet(); journalSheet(); partnerSheet(); orderSheet(); bankSheet(); taskSheet(); remindSheet(); loanSheet(); poSheet(); }
// Нэг удаа ажиллуулна: бүх хуудсанд «Show a warning» хамгаалалт (гараар засахад анхааруулга, скрипт хэвийн бичнэ)
function protectAllSheets() {
  SpreadsheetApp.openById(SHEET_ID).getSheets().forEach(function (sh) {
    if (!sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) sh.protect().setDescription('NOMAAD систем').setWarningOnly(true);
  });
}
// Цуцалсан захиалгыг бүр устгана — тусдаа «устгах код» (Script property DELETE_CODE) шаардана; борлуулалт бичигдсэн захиалгыг устгахгүй
function orderDelete(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const want = String(PropertiesService.getScriptProperties().getProperty('DELETE_CODE') || ''), cache = CacheService.getScriptCache();
  if (!want) return { status: 'error', error: 'nocode' };
  const fails = Number(cache.get('delfail') || 0);
  if (fails >= 5) return { status: 'error', error: 'locked' };
  if (String(d.code || '') !== want) { cache.put('delfail', String(fails + 1), 900); return { status: 'error', error: 'code' }; }
  cache.remove('delfail');
  const ids = (Array.isArray(d.ids) ? d.ids : []).map(String).slice(0, 200);
  const rows = orderRows().filter(function (x) { return ids.indexOf(x.id) >= 0 && x.biz === who.biz && x.status === 'Цуцалсан' && !/^yes:|^returned$/.test(String(x.saleDone || '')); });
  const sh = orderSheet();
  rows.sort(function (a, b) { return b.row - a.row; }).forEach(function (x) { sh.deleteRow(x.row); });
  return { status: 'ok', deleted: rows.map(function (x) { return x.id; }) };
}
// Нэг удаа ажиллуулна: өртөггүй (Cozy) орлого/эхний үлдэгдлийн мөрөнд өртөг = борлуулах үнэ × 0.85 бичнэ (өртөгтэй мөрийг хөндөхгүй)
function fillMissingCost() {
  const sh = stockSheet(), last = sh.getLastRow(); if (last < 2) return;
  const price = {}; SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_PROD).getDataRange().getValues().slice(1).forEach(function (r) { if (String(r[0]) === 'cozy') price[String(r[1]).trim()] = Number(r[3]) || 0; });
  const v = sh.getRange(2, 1, last - 1, STOCK_HEAD.length).getValues(), done = [], skipped = [];
  v.forEach(function (r, i) {
    if (String(r[10]) !== 'cozy' || String(r[13]) === 'Устгасан' || !(Number(r[6]) > 0) || Number(r[7]) || !/^(Орлого|Эхний үлдэгдэл)$/.test(String(r[5]))) return;
    const p = price[String(r[4]).trim()];
    if (!p) { skipped.push(String(r[4])); return; }
    const c = Math.round(p * 0.85); sh.getRange(i + 2, 8).setValue(c); done.push(String(r[4]) + ' ' + c);
  });
  Logger.log('ӨРТӨГ: ' + done.length + ' мөр бичлээ — ' + done.join('; ') + (skipped.length ? ' | үнэгүй, алгассан: ' + skipped.join(', ') : ''));
}
// Нэг удаа ажиллуулна: захиалгаас үүссэн давхар борлуулалтын мөрийг (нэг захиалгын нэг бараа 2+ удаа) сүүлийнхийг нь «Устгасан» болгоно — нөөц буцаж нэмэгдэнэ
function cancelDuplicateOrderSales() {
  const sh = logSheet(), last = sh.getLastRow(); if (last < 2) return;
  const v = sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues(), net = {}, done = [];
  v.forEach(function (r, i) {
    if (String(r[16]) !== 'sale' || !/^O\d/.test(String(r[17])) || String(r[18]) === 'Устгасан' || /ДДТД/.test(String(r[14]))) return;
    const k = r[17] + '|' + String(r[6]).replace(/ \(буцаалт\)/, ''), sg = Number(r[7]) > 0 ? 1 : -1;
    if (sg > 0 && (net[k] || 0) > 0) { sh.getRange(i + 2, 19).setValue('Устгасан'); sh.getRange(i + 2, 15).setValue(String(r[14] || '') + ' [давхар бүртгэл — цуцалсан]'); done.push(r[6] + ' ' + r[10]); return; }
    net[k] = (net[k] || 0) + sg;
  });
  Logger.log('ДАВХАР: ' + done.length + ' мөр цуцаллаа — ' + done.join('; '));
}
// Нэг удаа (2026-10-22, хэрэглэгч баталсан): борлуулалт нь бичигдсэн «Шинэ» захиалга → «Буухиад өгсөн»; илүү гутлын тавиурын орлого, аяллын 10-15-ны 3 туршилтын борлуулалт, журналын 50₮ → «Устгасан»
function cleanupOct22() {
  const log = logSheet(), lv = log.getRange(2, 1, log.getLastRow() - 1, LOG_HEAD.length).getValues(), sold = {}, out = [];
  lv.forEach(function (r) { if (String(r[16]) === 'sale' && /^O\d/.test(String(r[17])) && String(r[18]) !== 'Устгасан') sold[String(r[17])] = 1; });
  const os = orderSheet(), ov = os.getRange(2, 1, os.getLastRow() - 1, ORDER_HEAD.length).getValues(); let n = 0;
  ov.forEach(function (r, i) { if (String(r[16]) === 'Шинэ' && sold[String(r[0])] && !/^yes:/.test(String(r[20]))) { os.getRange(i + 2, 17).setValue('Буухиад өгсөн'); os.getRange(i + 2, 21).setValue('yes:Шилжүүлэг'); n++; } });
  out.push('захиалга ' + n);
  const ss = stockSheet(), sv = ss.getRange(2, 1, ss.getLastRow() - 1, 1).getValues();
  sv.forEach(function (r, i) { if (String(r[0]) === 'M1792663557917-0') { ss.getRange(i + 2, 14).setValue('Устгасан'); out.push('орлого цуцалсан'); } });
  let t = 0;
  lv.forEach(function (r, i) { if (String(r[15]) === 'travel' && String(r[16]) === 'sale' && fmtDate(r[1], 'yyyy-MM-dd') === '2026-10-15' && String(r[18]) !== 'Устгасан') { log.getRange(i + 2, 19).setValue('Устгасан'); log.getRange(i + 2, 15).setValue(String(r[14] || '') + ' [туршилт — цуцалсан]'); t++; } });
  out.push('туршилтын борлуулалт ' + t);
  const js = journalSheet(), jv = js.getRange(2, 1, js.getLastRow() - 1, 1).getValues();
  jv.forEach(function (r, i) { if (String(r[0]) === 'J1792487001494-0') { js.getRange(i + 2, 12).setValue('Устгасан'); out.push('журнал 50₮ цуцалсан'); } });
  Logger.log('ЦЭВЭРЛЭГЭЭ: ' + out.join('; '));
}
// «Буухиад өгсөн» / «Хүргэгдсэн» болгох — борлуулалт ба төлөвийг сервер нэг хүсэлтээр, нэг түгжээн дор бичнэ
// (өмнө нь хөтөч захиалга бүрийг тусад нь илгээдэг байсан тул хагас хадгалагдаж, дахин дарахад давхардаж байсан)
function ordersShip(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  return ordersShipAs(d, who);
}
function ordersShipAs(d, who) {
  const to = d.to === 'Хүргэгдсэн' ? 'Хүргэгдсэн' : 'Буухиад өгсөн', want = {};
  (Array.isArray(d.ids) ? d.ids : []).slice(0, 300).forEach(function (x) { want[String(x)] = 1; });
  const list = orderRows().filter(function (o) { return want[o.id] && o.biz === who.biz; });
  const stock = stockAll(false)[who.biz] || {}, hasStock = Object.keys(stock).length > 0, avail = {};
  Object.keys(stock).forEach(function (k) { avail[k] = (Number(stock[k].shop) || 0) + (Number(stock[k].wh) || 0); });
  const now = new Date(), date = Utilities.formatDate(now, TZ, 'yyyy-MM-dd'), time = Utilities.formatDate(now, TZ, 'HH:mm'), stamp = date + ' ' + time;
  const rows = [], upd = [], skipped = [];
  list.forEach(function (o, n) {
    if (o.status === 'Цуцалсан' || o.status === 'Буцаасан') { skipped.push({ id: o.id, phone: o.phone, why: o.status }); return; }
    let items; try { items = JSON.parse(o.items || '[]'); } catch (e) { items = []; }
    let saleDone = String(o.saleDone || '');
    if (!/^yes:/.test(saleDone) && saleDone !== 'imported') {
      if (hasStock) {   // үлдэгдэл хасах руу орохгүй — хүрэлцэхгүй бол «Шинэ» хэвээр
        const need = {};
        items.forEach(function (i) { if (i.name === FEE_ITEM || i.name === DISC_ITEM || i.name === SPLIT_ITEM) return; need[i.name] = (need[i.name] || 0) + (Number(i.qty) || 1); });
        const short = Object.keys(need).filter(function (k) { return need[k] > (avail[k] || 0) + 1e-9; });
        if (short.length) { skipped.push({ id: o.id, phone: o.phone, why: short.map(function (k) { return '«' + k + '» — хэрэгтэй ' + need[k] + ', үлдэгдэл ' + Math.max(0, avail[k] || 0); }).join('; ') }); return; }
        Object.keys(need).forEach(function (k) { avail[k] = (avail[k] || 0) - need[k]; });
      }
      const pay = o.confirmed ? 'Урьдчилгаа' : 'Шилжүүлэг', cust = pay === 'Урьдчилгаа' ? ((o.customer ? o.customer + ' ' : '') + o.phone) : '';
      items.forEach(function (i, k) {
        const q = Number(i.qty) || 1, p = Number(i.price) || 0, amt = Math.round(q * p); if (!amt) return;
        rows.push([who.biz + '-' + now.getTime() + '-s' + n + '-' + k, date, time, BIZ_NAMES[who.biz], TYPE_NAMES.sale, who.staff.name, String(i.name || '').slice(0, 80), q, 'ш', p, amt, pay,
          '', '', 'Захиалга ' + o.phone, who.biz, 'sale', o.id, '', cust]);
      });
      saleDone = 'yes:' + pay;
    }
    upd.push({ row: o.row, id: o.id, saleDone: saleDone });
  });
  if (rows.length) { const log = logSheet(); log.getRange(log.getLastRow() + 1, 1, rows.length, LOG_HEAD.length).setValues(rows); }   // эхлээд борлуулалт, дараа нь төлөв
  const osh = orderSheet();
  upd.forEach(function (u) { osh.getRange(u.row, 17).setValue(to); osh.getRange(u.row, 20).setValue(stamp + ' ' + who.staff.name); osh.getRange(u.row, 21).setValue(u.saleDone); });
  return { status: 'ok', shipped: upd.map(function (u) { return { id: u.id, saleDone: u.saleDone }; }), skipped: skipped, to: to };
}
// Ажилтны мөнгөний хүсэлтүүд (сүүлийн 90 хоног, өөрийн дэлгүүрийн)
function staffRequests(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const cut = Utilities.formatDate(new Date(Date.now() - 90 * 864e5), TZ, 'yyyy-MM-dd'), sh = logSheet(), last = sh.getLastRow(), out = [];
  if (last >= 2) sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues().forEach(function (r) {
    if (String(r[15]) !== who.biz || String(r[16]) !== 'request' || String(r[18]) === 'Устгасан') return;
    const dt = fmtDate(r[1], 'yyyy-MM-dd'); if (dt < cut) return;
    out.push({ id: String(r[0]), date: dt, time: fmtDate(r[2], 'HH:mm'), staff: String(r[5]), category: String(r[6] || ''), amount: Number(r[10]) || 0,
               note: String(r[14] || ''), customer: String(r[19] || ''), status: String(r[18] || '') });
  });
  return { status: 'ok', requests: out };
}
// Ажилтны тооллого: тоолсон тоо − системийн тоо = зөрүүг «Тооллого» хөдөлгөөн болгож «Хүлээгдэж» төлөвтэй бичнэ (удирдлага батална)
function stockCount(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const biz = who.biz, loc = STOCK_LOCS[d.loc] ? d.loc : 'Дэлгүүр', items = d.items || [], counter = String(d.counter || '').trim().slice(0, 40);
  if (!BIZ_NAMES[biz] || !items.length || items.length > 1000 || !counter) return { status: 'error', error: 'fields' };
  const now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'), at = String(d.at || '');
  const week = Utilities.formatDate(new Date(Date.now() - 7 * 864e5), TZ, 'yyyy-MM-dd');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(at) || at > now || at < week) return { status: 'error', error: 'time' };
  // Тоолсон цаг дахь системийн тоо = одоогийн тоо + тэр цагаас хойш зарагдсан − тэр цагаас хойш орсон (хөдөлгөөн)
  const st = stockAll()[biz] || {}, k = loc === 'Агуулах' ? 'wh' : 'shop', after = {};
  stockMoves().forEach(function (m) { if (m.biz === biz && m.loc === loc && m.date > at) after[m.item] = (after[m.item] || 0) - m.qty; });
  if (loc === 'Дэлгүүр') {
    const sh0 = logSheet(), l0 = sh0.getLastRow();
    if (l0 >= 2) sh0.getRange(2, 1, l0 - 1, LOG_HEAD.length).getValues().forEach(function (v) {
      if (String(v[15]) !== biz || String(v[16]) !== 'sale' || String(v[18]) === 'Устгасан') return;
      if (fmtDate(v[1], 'yyyy-MM-dd') + ' ' + fmtDate(v[2], 'HH:mm') <= at) return;
      const item = String(v[6]).replace(/ \(буцаалт\)$/, '').trim();
      after[item] = (after[item] || 0) + (Number(v[7]) || 0);
    });
  }
  const rows = [];
  let same = 0;
  items.forEach(function (x, i) {
    const name = String(x.item || '').trim().slice(0, 80), cnt = Number(x.counted);
    if (!name || !isFinite(cnt) || cnt < 0) return;
    const sys = Math.round(((((st[name] || {})[k]) || 0) + (after[name] || 0)) * 1000) / 1000, diff = Math.round((cnt - sys) * 1000) / 1000;
    if (!diff) { same++; return; }
    rows.push(['M' + Date.now() + '-c' + i, at, BIZ_NAMES[biz], loc, name, 'Тооллого', diff, '', counter,
               ('Тоолсон ' + cnt + ', системд ' + sys + ' · илгээсэн ' + who.staff.name).slice(0, 120), biz, '', '', 'Хүлээгдэж', '', '', '', '', '', '']);
  });
  if (rows.length) { const sh = stockSheet(); sh.getRange(sh.getLastRow() + 1, 1, rows.length, STOCK_HEAD.length).setValues(rows); }
  return { status: 'ok', diff: rows.length, same: same };
}
// Ажилтны «Өнөөдрийн дүн / баримт» — төхөөрөмжийн хуулбар биш, серверийн өнөөдрийн бичлэг (цуцалсан нь орохгүй)
// v5.9: past=1 — өмнөх өдрүүдийн (≤60 хоног, өнөөдрөөс бусад) бүх ажилтны борлуулалт («Өмнөх борлуулалт» карт)
// Boost төсөв — ажилтанд: өөрийн компанийн сүүлийн 60 хоногийн төсөв + түүнд бичсэн задаргаа (boost мөр, bill = төсвийн дугаар)
function boostBudStaff(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const from = Utilities.formatDate(new Date(Date.now() - 60 * 864e5), TZ, 'yyyy-MM-dd'), ids = {};
  const B = JSON.parse(PropertiesService.getScriptProperties().getProperty('BOOST_BUD') || '[]').filter(function (b) { return b.biz === who.biz && String(b.from) >= from; });
  B.forEach(function (b) { ids[b.id] = 1; });
  const sh = logSheet(), last = sh.getLastRow(), rows = [];
  if (last >= 2 && B.length) sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues().forEach(function (r) {
    if (String(r[16]) !== 'boost' || !ids[String(r[17])] || String(r[18]) === 'Устгасан') return;
    rows.push({ id: String(r[0]), bill: String(r[17]), date: fmtDate(r[1], 'yyyy-MM-dd'), staff: String(r[5]), item: String(r[6]), qty: Number(r[7]) || 0, price: Number(r[9]) || 0, note: String(r[14] || '') });
  });
  return { status: 'ok', budgets: B, rows: rows };
}
function staffToday(d) {
  const who = checkStaff(d.token);
  if (!who) return { status: 'error', error: 'auth' };
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), sh = logSheet(), last = sh.getLastRow(), out = [], past = !!d.past;
  const from = Utilities.formatDate(new Date(Date.now() - Math.min(60, Math.max(1, Number(d.days) || 60)) * 864e5), TZ, 'yyyy-MM-dd');
  if (last >= 2) sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues().forEach(function (r) {
    if (String(r[15]) !== who.biz || String(r[18]) === 'Устгасан') return;
    const date = fmtDate(r[1], 'yyyy-MM-dd');
    if (past ? (date >= today || date < from || String(r[16]) !== 'sale') : date !== today) return;
    const t = String(r[16]), note = String(r[14] || ''), m = note.match(/ДДТД\s*(\d{10,40})/);
    out.push({ id: String(r[0]), date: date, time: fmtDate(r[2], 'HH:mm'), biz: who.biz, type: t, staff: String(r[5]),
      item: t === 'expense' || t === 'request' ? '' : String(r[6]), category: t === 'expense' || t === 'request' ? String(r[6]) : '', status: String(r[18] || ''), qty: Number(r[7]) || 0, unit: String(r[8] || ''),
      price: Number(r[9]) || 0, amount: Number(r[10]) || 0, pay: String(r[11] || ''), counted: Number(r[12]) || 0, diff: Number(r[13]) || 0,
      note: note, bill: String(r[17] || ''), customer: String(r[19] || ''), ddtd: m ? m[1] : '' });
  });
  return { status: 'ok', records: out };
}
