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
    products: [
      { name: 'Бараа 1', unit: 'ш', price: 0 },
      { name: 'Бараа 2', unit: 'ш', price: 0 },
      { name: 'Бараа 3', unit: 'ш', price: 0 },
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
