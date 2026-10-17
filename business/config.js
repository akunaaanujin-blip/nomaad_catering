// ── НИЙТЛЭГ ТОХИРГОО ──
// Google Apps Script-ээ deploy хийсний дараа гарах /exec холбоосыг энд тавина.
// Хоосон байвал хуудсууд "туршилтын горим"-оор ажиллана (мэдээлэл зөвхөн энэ төхөөрөмжид хадгалагдана).
var API_URL = 'https://script.google.com/macros/s/AKfycbzS1DKwIFDWPV2LBNCHKcrul_8bWFHUQHTc7ply7MeUbfBPl1YaRpfHudQMaYrSNpo8jg/exec';

var BUSINESSES = {
  meat: {
    key: 'meat',
    name: 'Махны дэлгүүр',
    icon: 'М',
    color: '#8B1E2D',
    unit: 'кг',
    products: [
      { name: 'Үхрийн мах', unit: 'кг', price: 22000, cls: '2111100' },
      { name: 'Хонины мах', unit: 'кг', price: 18000, cls: '2111500' },
      { name: 'Ямааны мах', unit: 'кг', price: 16000, cls: '2111600' },
      { name: 'Адууны мах', unit: 'кг', price: 20000, cls: '2111800' },
      { name: 'Татсан мах', unit: 'кг', price: 24000, cls: '2111100' },
      { name: 'Яс', unit: 'кг', price: 6000, cls: '2115941' },
    ],
    expenses: ['Мах татан авалт', 'Тээвэр', 'Цалин', 'Түрээс', 'Цахилгаан', 'Сав баглаа', 'Бусад'],
  },
  cozy: {
    key: 'cozy',
    name: 'Cozy Home Ulaanbaatar',
    icon: 'C',
    color: '#7A5A2E',
    unit: 'ш',
    orders: true,                          // Facebook захиалга → буухиа хүргэлт
    buuhiaStore: 'Nomaad Аяллын дэлгүүр',   // ebuuhia.com-д бүртгэлтэй дэлгүүрийн нэр (импортод ЯГ таарах ёстой)
    // «Cozy хүргэлт» хүснэгтийн үнээр. Үнэгүй барааны үнийг Удирдлага → Бараа материал → Барааны бүртгэлээс оруулна.
    products: [
      { name: 'Хайруулын таваг 28см', unit: 'ш', price: 77000, cat: 'Хайруулын таваг' },
      { name: 'Хайруулын таваг 30см', unit: 'ш', price: 82000, cat: 'Хайруулын таваг' },
      { name: 'Хайруулын таваг 32см', unit: 'ш', price: 87000, cat: 'Хайруулын таваг' },
      { name: 'Ногоон хайруулын таваг', unit: 'ш', price: 61000, cat: 'Хайруулын таваг' },
      { name: 'Жигнүүр', unit: 'ш', price: 79000, cat: 'Тогоо, жигнүүр' },
      { name: 'Шавар тогоо', unit: 'ш', price: 35000, cat: 'Тогоо, жигнүүр' },
      { name: 'Тогооны хутгуур', unit: 'ш', price: 21000, cat: 'Гал тогооны хэрэгсэл' },
      { name: 'Савны ком', unit: 'ш', price: 24500, cat: 'Гал тогооны хэрэгсэл' },
      { name: 'Босоо ланч бокс', unit: 'ш', price: 25900, cat: 'Хоолны сав' },
      { name: 'Гутлын тавиур 8 давхар', unit: 'ш', price: 52000, cat: 'Гэр ахуй' },
      { name: 'Шилэн данх', unit: 'ш', price: 0, cat: 'Гал тогооны хэрэгсэл' },
      { name: 'Битүү чанагч', unit: 'ш', price: 0, cat: 'Тогоо, жигнүүр' },
      { name: 'Хоол бутлагч', unit: 'ш', price: 0, cat: 'Гал тогооны хэрэгсэл' },
      { name: 'Түм', unit: 'ш', price: 0, cat: 'Гал тогооны хэрэгсэл' },
      { name: 'Аяга халбаганы сет', unit: 'ш', price: 0, cat: 'Гал тогооны хэрэгсэл' },
      { name: 'Хоолны халуун сав', unit: 'ш', price: 0, cat: 'Хоолны сав' },
    ],
    expenses: ['Бараа татан авалт', 'Хүргэлт', 'Цалин', 'Түрээс', 'Зар сурталчилгаа', 'Бусад'],
  },
  travel: {
    key: 'travel',
    name: 'NOMAAD аяллын дэлгүүр',
    icon: 'N',
    color: '#1E4D3B',
    unit: 'ш',
    products: (typeof TRAVEL_PRODUCTS !== 'undefined') ? TRAVEL_PRODUCTS : [],   // products.js
    expenses: ['Бараа татан авалт', 'Тээвэр', 'Цалин', 'Түрээс', 'Засвар', 'Бусад'],
  },
};

// ── И-БАРИМТ (PosAPI 3.0) ──
// Дэлгүүрийн компьютер дээр PosAPI 3.0 ажиллаж байх ёстой (http://localhost:7080).
// merchantTin хоосон бол тухайн бизнест И-баримт унтраалттай байна.
// Мах + Аяллын дэлгүүр: Вайс бротерс (рег 8330042, ТТД 93202187027, НӨАТ төлөгч биш) — салбараар ялгана.
// Cozy Home: И-баримт шаардлагагүй.
// taxType: VAT_ABLE (НӨАТ төлөгч) · NO_VAT (НӨАТ төлөгч биш) — туршилтын орчинд шалгаж баталгаажуулна.
// classificationCode: БҮНА ангиллын код (бараанд тусгайлан заагаагүй үед ашиглана).
var EBARIMT = {
  meat:   { legalName: 'Вайс бротерс', regNo: '8330042', merchantTin: '93202187027', branchNo: '001', posNo: '', districtCode: '', taxType: 'NO_VAT', classificationCode: '' },
  cozy:   { legalName: '', merchantTin: '', branchNo: '001', posNo: '', districtCode: '', taxType: 'NO_VAT', classificationCode: '' },
  travel: { legalName: 'Вайс бротерс', regNo: '8330042', merchantTin: '93202187027', branchNo: '002', posNo: '', districtCode: '', taxType: 'NO_VAT', classificationCode: '' },
};

// Туршилтын орчны мерчант (developer.itc.gov.mn-ийн заавраас). Тохиргоо цонхонд "Туршилт" асаахад ашиглана.
var EBARIMT_TEST = { legalName: 'ТЕСТИЙН ХЭРЭГЛЭГЧ 1', merchantTin: '37900846788', branchNo: '001', posNo: '', districtCode: '', taxType: 'VAT_ABLE', classificationCode: '2349010' };

// Төлбөрийн хэлбэр → PosAPI код
// «Зээлээр» — бараа өгөхөд баримт гаргана (төлбөрийн хэлбэр CASH), мөнгө нь дараа «Кассын орлого»-оор авлагаас хаагдана
var EBARIMT_PAY = { 'Бэлэн': 'CASH', 'Карт': 'PAYMENT_CARD', 'Шилжүүлэг': 'PAYMENT_CARD', 'Зээлээр': 'CASH' };

// ── Банкны данс → компани (дансны сүүлийн 4 оронгоор; бүтэн дугаарыг нийтийн кодонд бичихгүй) ──
var BANK_ACCOUNTS = {
  '5790': { biz: 'cozy', acc: '1101', name: 'Хаан банк ****5790 (Cozy)' },
};

// ── Хуулийн этгээд (татвар, НДШ, санхүүгийн тайлан эдгээрээр тушаагдана) ──
var ENTITIES = {
  weiss: { name: 'Вайс бротерс', type: 'ХХК', regNo: '8330042', tin: '93202187027', biz: ['meat', 'travel'], district: 'Баянзүрх' },
  cozy:  { name: 'Cozy Home Ulaanbaatar', type: 'Хувь хүн', regNo: '', tin: '', biz: ['cozy'] },
};
// ── Татвар, нийгмийн даатгалын хувь (албан эх сурвалж: portal.ndaatgal.mn «Даатгуулагчийн төрөл 20241125», ХХОАТ-ын хууль) ──
// Хууль өөрчлөгдвөл ЗӨВХӨН энд засна.
var TAX = {
  // 01001 — хөдөлмөрийн гэрээтэй үндсэн ажилтан: тэтгэвэр, тэтгэмж, ажилгүйдэл, ЭМД (+ ҮОМШӨ ажил олгогчид, мэргэжлээс хамаарч 0.5–2.5)
  ndEmployee: { pension: 8.5, benefit: 0.8, unemployment: 0.2, health: 2 },          // = 11.5%
  ndEmployer: { pension: 8.5, benefit: 1, unemployment: 0.5, health: 2 },            // + ҮОМШӨ = 12.5–14.5%
  ndDefaultInjury: 0.5,
  ndCeiling: 7920000,      // НДШ ногдуулах сарын дээд хязгаар (хөдөлмөрийн хөлсний доод хэмжээ × 10) — жил бүр шалгана
  pitRate: 10,             // ХХОАТ, %
  // ХХОАТ-ын хөнгөлөлт: сарын орлогын хэмжээгээр (дээд хязгаар, хөнгөлөлт)
  pitCredit: [[500000, 20000], [1000000, 18000], [1500000, 16000], [2000000, 14000], [2500000, 12000], [3000000, 10000], [Infinity, 0]],
  // Тайлан тушаах хугацаа (e-TAX хянах самбарт харуулсан огноотой тулгасан)
  due: { nd: 10, tt11q: 20, tt11year: '02-15', tt02q: 20, tt02year: '02-10', ebalance: '02-10' },
};
