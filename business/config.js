// ── НИЙТЛЭГ ТОХИРГОО ──
// Google Apps Script-ээ deploy хийсний дараа гарах /exec холбоосыг энд тавина.
// Хоосон байвал хуудсууд "туршилтын горим"-оор ажиллана (мэдээлэл зөвхөн энэ төхөөрөмжид хадгалагдана).
var API_URL = 'https://script.google.com/macros/s/AKfycbzS1DKwIFDWPV2LBNCHKcrul_8bWFHUQHTc7ply7MeUbfBPl1YaRpfHudQMaYrSNpo8jg/exec';

var BUSINESSES = {
  meat: {
    key: 'meat',
    name: 'Махны дэлгүүр',
    icon: '🥩',
    color: '#9B2C2C',
    unit: 'кг',
    products: [
      { name: 'Үхрийн мах', unit: 'кг', price: 22000 },
      { name: 'Хонины мах', unit: 'кг', price: 18000 },
      { name: 'Ямааны мах', unit: 'кг', price: 16000 },
      { name: 'Адууны мах', unit: 'кг', price: 20000 },
      { name: 'Татсан мах', unit: 'кг', price: 24000 },
      { name: 'Яс', unit: 'кг', price: 6000 },
    ],
    expenses: ['Мах татан авалт', 'Тээвэр', 'Цалин', 'Түрээс', 'Цахилгаан', 'Сав баглаа', 'Бусад'],
  },
  cozy: {
    key: 'cozy',
    name: 'Cozy Home Ulaanbaatar',
    icon: '🏠',
    color: '#8A6A3B',
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
    icon: '🎒',
    color: '#1F4A38',
    unit: 'ш',
    products: [
      { name: 'Майхан', unit: 'ш', price: 0 },
      { name: 'Унтлагын уут', unit: 'ш', price: 0 },
      { name: 'Үүргэвч', unit: 'ш', price: 0 },
      { name: 'Түрээс (өдрөөр)', unit: 'өдөр', price: 0 },
    ],
    expenses: ['Бараа татан авалт', 'Тээвэр', 'Цалин', 'Түрээс', 'Засвар', 'Бусад'],
  },
};

// ── И-БАРИМТ (PosAPI 3.0) ──
// Дэлгүүрийн компьютер дээр PosAPI 3.0 ажиллаж байх ёстой (http://localhost:7080).
// merchantTin хоосон бол тухайн бизнест И-баримт унтраалттай байна.
// taxType: VAT_ABLE (НӨАТ төлөгч) · NO_VAT (НӨАТ төлөгч биш) — туршилтын орчинд шалгаж баталгаажуулна.
// classificationCode: БҮНА ангиллын код (бараанд тусгайлан заагаагүй үед ашиглана).
var EBARIMT = {
  meat:   { merchantTin: '', branchNo: '001', posNo: '', districtCode: '', taxType: 'NO_VAT', classificationCode: '' },
  cozy:   { merchantTin: '', branchNo: '001', posNo: '', districtCode: '', taxType: 'NO_VAT', classificationCode: '' },
  travel: { merchantTin: '', branchNo: '001', posNo: '', districtCode: '', taxType: 'NO_VAT', classificationCode: '' },
};

// Туршилтын орчны мерчант (developer.itc.gov.mn-ийн заавраас). Тохиргоо цонхонд "Туршилт" асаахад ашиглана.
var EBARIMT_TEST = { merchantTin: '37900846788', branchNo: '001', posNo: '', districtCode: '', taxType: 'VAT_ABLE', classificationCode: '2349010' };

// Төлбөрийн хэлбэр → PosAPI код
var EBARIMT_PAY = { 'Бэлэн': 'CASH', 'Карт': 'PAYMENT_CARD', 'Шилжүүлэг': 'PAYMENT_CARD' };
