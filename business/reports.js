// ── САНХҮҮ / ТАЙЛАНГИЙН ХӨДӨЛГҮҮР ──
// Баримт бүрээс (борлуулалт, буцаалт, зарлага, касс хаалт, бараа орлого/тооллого/хасалт, цалин, гар журнал)
// давхар бичилтийн журналыг ДҮРМЭЭР тооцоолно. Журнал хадгалагддаггүй тул баримт бүр санхүүд заавал тусна.
// Тайлан бүр { title, cols:[{k,label,num,money}], rows:[{...}], total:{...}, note } хэлбэртэй — дэлгэц + Excel.

// Дансны төлөвлөгөө (Baaz-ийн стандарт кодтой нийцүүлсэн). type: asset | liab | equity | rev | contra | cogs | exp
var ACCOUNTS = [
  ['0000', 'Он нээлтийн нэгтгэл (үргэлж 0)', 'equity'],
  ['10003', 'Касс дахь мөнгө', 'asset', 'cash'],
  ['110106', 'Пос-н данс (карт)', 'asset', 'cash'],
  ['1101', 'Байгууллагын харилцах', 'asset', 'cash'],
  ['1201', 'Дансны авлага', 'asset'],
  ['1207', 'Ажилчдаас авах авлага', 'asset'],
  ['1208', 'Захирлын хувийн зарлага (захирлаас авах)', 'asset'],
  ['1210', 'Олгосон зээл (бусдад өгсөн)', 'asset'],
  ['1290', 'Компани хоорондын тооцоо', 'asset'],
  ['1404', 'Бараа', 'asset'],
  ['1503', 'Нийлүүлэгчид төлсөн урьдчилгаа', 'asset'],
  ['1505', 'Захиалсан бараа (замд яваа)', 'asset'],
  ['2001', 'Үндсэн хөрөнгө', 'asset'],
  ['2002', 'Хуримтлагдсан элэгдэл (хасах)', 'asset'],
  ['3101', 'Дансны өглөг', 'liab'],
  ['3301', 'Цалингийн өглөг', 'liab'],
  ['3402', 'НӨАТ-ын өр', 'liab'],
  ['3403', 'Нийгмийн даатгалын шимтгэлийн өглөг', 'liab'],
  ['3404', 'ХХОАТ-ын өглөг (цалингаас суутгасан)', 'liab'],
  ['3501', 'Богино хугацаат зээл', 'liab'],
  ['3801', 'Бусад богино хугацаат өр төлбөр', 'liab'],
  ['3802', 'Хэрэглэгчээс авсан урьдчилгаа (захиалга)', 'liab'],
  ['4101', 'Өмч (эздийн оруулсан)', 'equity'],
  ['4201', 'Эздийн өмчийн бусад хэсэг (эхний үлдэгдэл)', 'equity'],
  ['4601', 'Хуримтлагдсан ашиг', 'equity'],
  ['5101', 'Бараа борлуулсны орлого', 'rev'],
  ['5102', 'Ажил үйлчилгээний орлого', 'rev'],
  ['5201', 'Бусад орлого', 'rev'],
  ['5202', 'Хүүгийн орлого', 'rev'],
  ['6001', 'Борлуулалтын буцаалт', 'contra'],
  ['6101', 'Борлуулсан барааны өртөг', 'cogs'],
  ['7101', 'Цалингийн зардал', 'exp'],
  ['7102', 'НДШ-ийн зардал', 'exp'],
  ['7201', 'Түрээсийн зардал', 'exp'],
  ['7202', 'Ашиглалтын зардал (цахилгаан, ус)', 'exp'],
  ['7203', 'Тээврийн зардал', 'exp'],
  ['7204', 'Сав, баглаа боодлын зардал', 'exp'],
  ['7205', 'Зар сурталчилгааны зардал', 'exp'],
  ['7206', 'Засвар үйлчилгээний зардал', 'exp'],
  ['7207', 'Хүргэлтийн зардал', 'exp'],
  ['7301', 'Бусад зардал', 'exp'],
  ['7302', 'Бараа материалын дутагдал, хорогдол', 'exp'],
  ['7303', 'Кассын дутагдал', 'exp'],
  ['7304', 'Элэгдлийн зардал', 'exp'],
  ['7305', 'Үндсэн хөрөнгө актласны гарз', 'exp'],
  ['7401', 'Зээлийн хүүгийн зардал', 'exp'],
];
var ACC = {};
ACCOUNTS.forEach(function (a) { ACC[a[0]] = { code: a[0], name: a[1], type: a[2], cash: a[3] === 'cash' }; });
// Удирдагчийн нэмсэн данс (жишээ: өөр банкны харилцах, тодорхой зээл) — Дансны төлөвлөгөө → «+ Данс нэмэх»
var BASE_ACC_N = ACCOUNTS.length;
function applyCustomAccounts(list) {
  ACCOUNTS.splice(BASE_ACC_N);
  (list || []).forEach(function (a) { if (!ACC[a.code] || ACC[a.code].custom) ACCOUNTS.push([a.code, a.name, a.type, a.cash ? 'cash' : '']); });
  ACCOUNTS.sort(function (x, y) { return x[0] === '0000' ? -1 : y[0] === '0000' ? 1 : x[0] < y[0] ? -1 : 1; });
  ACCOUNTS.forEach(function (a) { var was = ACC[a[0]]; ACC[a[0]] = { code: a[0], name: a[1], type: a[2], cash: a[3] === 'cash', custom: was ? was.custom : false }; });
  (list || []).forEach(function (a) { if (ACC[a.code]) ACC[a.code].custom = true; });
}
function accName(c) { return ACC[c] ? ACC[c].name : c; }
function debitNormal(c) { var t = ACC[c] && ACC[c].type; return t === 'asset' || t === 'contra' || t === 'cogs' || t === 'exp'; }

var PAY_ACC = { 'Бэлэн': '10003', 'Карт': '110106', 'Шилжүүлэг': '1101', 'Харилцах': '1101', 'Зээлээр': '3101', 'Захиалга': '1505' };   // бараа орлого (худалдан авалт); Захиалга — урьдчилж төлсөн бараа захиалгаас
// Урьдчилгаа: хүргэлтээс өмнө төлсөн захиалга — мөнгө ирэхэд 3802-т, бараа өгөхөд 3802 → орлого
var SALE_ACC = { 'Бэлэн': '10003', 'Карт': '110106', 'Шилжүүлэг': '1101', 'Зээлээр': '1201', 'Урьдчилгаа': '3802', 'StorePay': '1201' };   // StorePay — мөнгийг StorePay дараа шилжүүлнэ (авлага)                       // борлуулалт: зээлээр = авлага
var VOUCHER_NAMES = { 'КО': 'Кассын орлого', 'КЗ': 'Кассын зарлага', 'ХО': 'Харилцахын орлого', 'ХЗ': 'Харилцахын зарлага' };
function expenseAcc(cat, biz, tracked) {
  var c = String(cat || '');
  // Үлдэгдэл хөтөлдөг бол бараа «Орлого»-оор (1404 / 3101 өглөг) орсон тул кассаас төлсөн нь өглөг хаана; үгүй бол шууд өртөгт
  if (/татан авалт/i.test(c)) return tracked ? '3101' : '6101';
  if (/^бусад/i.test(c)) return '7301';
  if (/цалин/i.test(c)) return '7101';
  if (/түрээс/i.test(c)) return '7201';
  if (/цахилгаан|дулаан|(^|\s)ус(\s|$)/i.test(c)) return '7202';   // «Бусад» доторх «ус»-тай андуурахгүй
  if (/тээвэр/i.test(c)) return '7203';
  if (/сав|баглаа/i.test(c)) return '7204';
  if (/(^|\s)зар(\s|$)|сурталчилгаа/i.test(c)) return '7205';
  if (/засвар/i.test(c)) return '7206';
  if (/хүргэлт/i.test(c)) return '7207';
  return '7301';
}

// ── Өртгийн хөдөлгүүр: бараа тус бүрийн ХӨДӨЛГӨӨНТ ДУНДАЖ өртөг (Baaz-тай адил) ──
// Үйл явдлыг цаг хугацааны дарааллаар явуулж, борлуулалт/хасалт бүрийг тухайн үеийн дундаж өртгөөр үнэлнэ.
// Ингэснээр 1404 «Бараа» дансны үлдэгдэл = барааны үлдэгдлийн өртөг үргэлж таарна.
// until (заавал биш): тухайн өдрийн эцэс хүртэлх байдлыг тооцно (он хаахад)
function costEngine(biz, R, until) {
  var key = biz + '|' + R.records.length + '|' + R.moves.length + '|' + (until || '');
  if (R._ce && R._ce[key]) return R._ce[key];
  var since = '';
  R.moves.forEach(function (m) { if (m.biz === biz) { var d = String(m.date).slice(0, 16); if (!since || d < since) since = d; } });
  var ev = [];
  R.moves.forEach(function (m) { if (m.biz === biz && m.kind !== 'Шилжүүлэг') ev.push({ t: String(m.date).slice(0, 16), m: m }); });
  if (since) R.records.forEach(function (x) {
    if (x.biz !== biz || x.type !== 'sale' || isNonGoods(x.item)) return;
    var t = x.date + ' ' + (x.time || '00:00');
    if (t >= since) ev.push({ t: t, x: x });
  });
  if (until) ev = ev.filter(function (e) { return e.t.slice(0, 10) <= until; });
  ev.sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : (a.m ? -1 : 1); });   // ижил минутад хөдөлгөөн түрүүлнэ
  var it = {}, rec = {}, mv = {}, noCost = {};
  var get = function (k) { return it[k] = it[k] || { q: 0, v: 0, avg: 0 }; };
  var out = function (o, q) { var c = o.q > 0 ? o.v / o.q : o.avg; o.avg = c; o.q -= q; o.v -= q * c; if (Math.abs(o.q) < 1e-9) { o.q = 0; o.v = 0; } return q * c; };
  ev.forEach(function (e) {
    if (e.m) {
      var m = e.m, o = get(m.item), q = Number(m.qty) || 0;
      if (q > 0 && (m.kind === 'Орлого' || m.kind === 'Эхний үлдэгдэл' || m.kind === 'Он нээлт')) {
        var c = m.cost || (o.q > 0 ? o.v / o.q : o.avg);
        o.q += q; o.v += q * c; o.avg = o.q ? o.v / o.q : c; mv[m.id] = q * c;
      } else if (q > 0) { var a = o.q > 0 ? o.v / o.q : o.avg; o.q += q; o.v += q * a; mv[m.id] = q * a; }   // тооллогын илүүдэл
      else mv[m.id] = -out(o, -q);
    } else {
      var x = e.x, name = String(x.item).replace(/ \(буцаалт\)$/, ''), o2 = get(name), q2 = Number(x.qty) || 0;
      if (q2 > 0) { var cg = out(o2, q2); rec[x.id] = cg; if (!cg) noCost[name] = (noCost[name] || 0) + q2; }
      else if (q2 < 0) { var a2 = o2.q > 0 ? o2.v / o2.q : o2.avg; o2.q += -q2; o2.v += -q2 * a2; rec[x.id] = q2 * a2; }
    }
  });
  var res = { items: it, rec: rec, mv: mv, noCost: noCost, since: since.slice(0, 10) };
  R._ce = R._ce || {}; R._ce[key] = res;
  return res;
}
function avgCost(ce, item) { var o = ce.items[item]; return o ? (o.q > 0 ? o.v / o.q : o.avg) : 0; }

// ── Журнал үүсгэх ── R = { records, moves, salary, journal, stock, staff }
function buildJournal(biz, R) {
  var E = [];
  var ce = costEngine(biz, R), tracked = !!ce.since;
  var add = function (date, doc, ref, dr, cr, amount, desc, partner, bill) {
    amount = Math.round((Number(amount) || 0) * 100) / 100;
    if (!amount) return;
    if (amount < 0) { var t = dr; dr = cr; cr = t; amount = -amount; }
    E.push({ date: date, doc: doc, ref: ref || '', dr: dr, cr: cr, amount: amount, desc: desc || '', partner: partner || '', bill: bill || '' });
  };
  R.records.forEach(function (x) {
    if (x.biz !== biz) return;
    if (R.closed && x.date <= R.closed) return;   // хаагдсан онд хамаарах хоцорч ирсэн бичлэг — он нээлтэд аль хэдийн тусгагдсан тул давхар бичихгүй
    var a = Number(x.amount) || 0, d = x.date;
    if (x.type === 'sale') {
      var cash = SALE_ACC[x.pay] || '10003', cust = x.pay === 'StorePay' ? 'StorePay' : x.pay === 'Зээлээр' || x.pay === 'Урьдчилгаа' ? (x.customer || '(нэргүй харилцагч)') : '';
      var item = String(x.item).replace(/ \(буцаалт\)$/, '');
      var c = Math.abs(ce.rec[x.id] || 0);
      if (baseItem(x.item) === SPLIT_ITEM) {   // хуваан төлсөн: орлого өөрчлөгдөхгүй, мөнгө нэг хэлбэрээс нөгөөд
        if (a >= 0) add(d, 'Төлбөр хуваалт', x.id, cash, '5101', a, 'Хуваан төлсөн (' + (x.pay || 'Бэлэн') + ')', cust, x.bill);
        else add(d, 'Төлбөр хуваалт', x.id, '5101', cash, -a, 'Хуваан төлсөн (' + (x.pay || 'Бэлэн') + ')', cust, x.bill);
        return;
      }
      if (baseItem(x.item) === DISC_ITEM) { add(d, 'Борлуулалтын хөнгөлөлт', x.id, '6001', cash, -a, 'Хөнгөлөлт · баримт ' + (x.bill || ''), cust, x.bill); return; }
      if (a >= 0) {
        add(d, 'Борлуулалт', x.id, cash, '5101', a, item + ' × ' + x.qty + ' (' + (x.pay || 'Бэлэн') + ')', cust, x.bill);
        if (c) add(d, 'Борлуулалт · өртөг', x.id, '6101', '1404', c, item + ' × ' + x.qty);
      } else {
        add(d, 'Борлуулалтын буцаалт', x.id, '6001', cash, -a, item + ' × ' + Math.abs(x.qty), cust);
        if (c) add(d, 'Буцаалт · өртөг', x.id, '1404', '6101', c, item);
      }
    } else if (x.type === 'collect') {   // зээлээр (захиалга) зарсны мөнгө орсон → авлага хаагдана
      add(d, 'Авлага төлөгдсөн', x.id, SALE_ACC[x.pay] || '1101', '1201', a, 'Захиалгын төлбөр · ' + (x.customer || ''), x.customer || '(нэргүй харилцагч)');
    } else if (x.type === 'expense') {
      var ea = expenseAcc(x.category, biz, tracked);
      // нийлүүлэгчид төлсөн бол тайлбарт нэр нь байвал тэр харилцагчийн өглөгөөс хасна
      var sup = ea === '3101' ? (R.partners || []).filter(function (p) { return p.biz === biz && x.note && String(x.note).indexOf(p.name) >= 0; })[0] : null;
      add(d, 'Зарлага', x.id, ea, '10003', a, x.category + (x.note ? ' · ' + x.note : ''), sup ? sup.name : '');
    } else if (x.type === 'close' && x.diff) {
      if (x.diff < 0) add(d, 'Касс хаалт', x.id, '7303', '10003', -x.diff, 'Кассын дутагдал · ' + (x.staff || ''));
      else add(d, 'Касс хаалт', x.id, '10003', '5201', x.diff, 'Кассын илүүдэл · ' + (x.staff || ''));
    }
  });
  R.moves.forEach(function (m) {
    if (m.biz !== biz) return;
    var d = String(m.date).slice(0, 10);
    var v = Math.abs(ce.mv[m.id] || 0);
    if (m.kind === 'Он нээлт') return;   // барааны үнэлгээ журналын «Он нээлт» (1404) мөрөнд орсон
    if (m.kind === 'Эхний үлдэгдэл') add(d, 'Барааны эхний үлдэгдэл', m.id, '1404', '4201', v, m.item + ' × ' + m.qty);
    else if (m.kind === 'Орлого') {
      // Каргог тусдаа компанид төлдөг бол: барааны хэсэг нийлүүлэгчид, каргоны хэсэг карго компанид (өглөг / касс / харилцах)
      var cg = m.cargo && m.cargoPay ? Math.min(v, r0(m.cargo * m.qty)) : 0;
      var potag = m.pay === 'Захиалга' ? (String(m.note || '').match(/#PO\d+/) || [''])[0] : '';   // бараа захиалгаас ирсэн бол тэр захиалгын «#ID»
      add(d, 'Бараа орлого', m.id, '1404', PAY_ACC[m.pay] || '3101', v - cg, m.item + ' × ' + m.qty + (m.pay ? ' (' + m.pay + ')' : '') + (potag ? ' ' + potag : ''), m.partner);
      if (cg) add(d, 'Бараа орлого · карго', m.id, '1404', PAY_ACC[m.cargoPay] || '3101', cg, 'Карго · ' + m.item + ' × ' + m.qty + ' (' + m.cargoPay + ')', m.cargoPartner);
    }
    else if (m.kind === 'Тооллого' || m.kind === 'Хасалт') {
      if (m.qty < 0) add(d, m.kind, m.id, '7302', '1404', v, m.item + ' ' + m.qty);
      else add(d, m.kind, m.id, '1404', '5201', v, m.item + ' +' + m.qty);
    }
  });
  R.salary.forEach(function (e) {
    if (e.biz !== biz) return;   // «Бүх дэлгүүр»-ийн ажилтны цалинг олгохдоо компани сонгоно
    // Тухайн сарын цалин бодогдсон (журналд «Цалин бодолт ГГГГ-СС») бол олголт нь цалингийн өглөгийг (3301) хаана, үгүй бол шууд зардал
    var accrued = R.journal.some(function (j) { return j.biz === biz && String(j.desc).indexOf('Цалин бодолт ' + e.month) === 0; });
    if (e.kind === 'Олгосон' || e.kind === 'Урьдчилгаа') add(e.date, 'Цалин · ' + e.kind, e.id, accrued ? '3301' : '7101', '1101', e.amount, e.name + ' · ' + e.month + (e.note ? ' · ' + e.note : ''));
  });
  R.journal.forEach(function (j) {
    if (j.biz !== biz) return;
    add(j.date, j.no ? VOUCHER_NAMES[j.no.slice(0, 2)] + ' ' + j.no : /^Он нээлт/.test(j.desc) ? 'Он нээлт' : 'Журналын бичилт', j.id, j.dr, j.cr, j.amount, j.desc, j.partner);
  });
  // Үндсэн хөрөнгийн элэгдэл — сар бүрийн эцэст автоматаар (шулуун шугамаар, авсны дараа сараас). Гараар бичсэн сар байвал түүнийг авна.
  var td = todayStr();
  (R.assets || []).forEach(function (A) {
    if (A.biz !== biz || !(A.life > 0) || !A.date) return;
    var cap = r0(A.cost - (A.salv || 0) - (A.dep0 || 0)), mon = Math.round(Math.max(0, cap) / A.life), re = new RegExp('#' + A.id + '(?![\\w])'), manual = {};
    if (!mon) return;
    R.journal.forEach(function (j) { if (j.biz === biz && j.dr === '7304' && re.test(String(j.desc))) { var mm = String(j.desc).match(/Элэгдэл (\d{4}-\d{2})/); if (mm) manual[mm[1]] = (manual[mm[1]] || 0) + j.amount; } });
    var acc = 0, y = Number(A.date.slice(0, 4)), mo = Number(A.date.slice(5, 7)) + 1;   // авсны дараа сар (1–12)
    for (var i = 0; i < 1200 && acc < cap - 0.005; i++) {
      if (mo > 12) { mo = 1; y++; }
      var m = y + '-' + ('0' + mo).slice(-2), end = todayStr(new Date(y, mo, 0));
      if (end > td || (A.gone && end > A.gone)) break;   // зөвхөн дууссан сар, актласнаас өмнө
      var amt = manual[m] != null ? manual[m] : Math.min(mon, r0(cap - acc));
      if (manual[m] == null && !(R.closed && end <= R.closed)) add(end, 'Элэгдэл', A.id + '-' + m, '7304', '2002', amt, 'Элэгдэл ' + m + ' #' + A.id + ' ' + A.name);
      acc = r0(acc + amt); mo++;
    }
  });
  E.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return E;
}

// Дансны үлдэгдэл (дебет − кредит) тухайн огноо хүртэл
function balances(E, to, from) {
  var b = {};
  E.forEach(function (e) {
    if (to && e.date > to) return;
    if (from && e.date < from) return;
    b[e.dr] = (b[e.dr] || 0) + e.amount;
    b[e.cr] = (b[e.cr] || 0) - e.amount;
  });
  return b;
}
function r0(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function prevDay(d) { var t = new Date(d + 'T00:00:00'); t.setDate(t.getDate() - 1); return todayStr(t); }

// ═══════════ САНХҮҮГИЙН ТАЙЛАН ═══════════
function repJournal(E, from, to) {
  var rows = E.filter(function (e) { return e.date >= from && e.date <= to; }).map(function (e, i) {
    return { n: i + 1, date: e.date, doc: e.doc, desc: e.desc, partner: e.partner, dr: e.dr + ' ' + accName(e.dr), cr: e.cr + ' ' + accName(e.cr), amount: e.amount };
  });
  return { title: 'Ерөнхий журнал', cols: [c('n', '№'), c('date', 'Огноо'), c('doc', 'Баримт'), c('desc', 'Гүйлгээний утга'), c('partner', 'Харилцагч'),
    c('dr', 'Дебет данс'), c('cr', 'Кредит данс'), m('amount', 'Дүн')], rows: rows, total: { desc: 'Нийт ' + rows.length + ' бичилт', amount: sum(rows, 'amount') } };
}
function repTrial(E, from, to) {
  var open = balances(E, prevDay(from)), turn = {};
  E.forEach(function (e) {
    if (e.date < from || e.date > to) return;
    (turn[e.dr] = turn[e.dr] || { d: 0, c: 0 }).d += e.amount;
    (turn[e.cr] = turn[e.cr] || { d: 0, c: 0 }).c += e.amount;
  });
  var rows = ACCOUNTS.map(function (a) {
    var k = a[0], o = open[k] || 0, t = turn[k] || { d: 0, c: 0 }, cl = o + t.d - t.c;
    return { code: k, name: a[1], od: o > 0 ? r0(o) : 0, oc: o < 0 ? r0(-o) : 0, d: r0(t.d), c: r0(t.c), cd: cl > 0 ? r0(cl) : 0, cc: cl < 0 ? r0(-cl) : 0 };
  }).filter(function (r) { return r.od || r.oc || r.d || r.c || r.cd || r.cc; });
  var tot = { name: 'Нийт' };
  ['od', 'oc', 'd', 'c', 'cd', 'cc'].forEach(function (k) { tot[k] = sum(rows, k); });
  var ok = Math.abs(tot.d - tot.c) < 0.5 && Math.abs(tot.cd - tot.cc) < 0.5;
  return { title: 'Гүйлгээ баланс', cols: [c('code', 'Данс'), c('name', 'Дансны нэр'), m('od', 'Эхний Дт'), m('oc', 'Эхний Кт'), m('d', 'Дебет гүйлгээ'),
    m('c', 'Кредит гүйлгээ'), m('cd', 'Эцсийн Дт'), m('cc', 'Эцсийн Кт')], rows: rows, total: tot, check: ok,
    note: ok ? 'Тэнцэж байна: дебет = кредит' : 'АНХААР: дебет, кредит тэнцэхгүй байна' };
}
function repLedger(E, from, to, code) {
  var open = (balances(E, prevDay(from))[code] || 0), bal = open;
  var dn = debitNormal(code), sign = dn ? 1 : -1;
  var rows = [{ date: from, doc: '', desc: 'Эхний үлдэгдэл', corr: '', d: '', c: '', bal: r0(open * sign) }];
  E.forEach(function (e) {
    if (e.date < from || e.date > to || (e.dr !== code && e.cr !== code)) return;
    var isD = e.dr === code;
    bal += isD ? e.amount : -e.amount;
    rows.push({ date: e.date, doc: e.doc, desc: e.desc, corr: (isD ? e.cr : e.dr) + ' ' + accName(isD ? e.cr : e.dr), d: isD ? e.amount : '', c: isD ? '' : e.amount, bal: r0(bal * sign) });
  });
  return { title: 'Дансны хуулга · ' + code + ' ' + accName(code), cols: [c('date', 'Огноо'), c('doc', 'Баримт'), c('desc', 'Гүйлгээний утга'),
    c('corr', 'Харьцсан данс'), m('d', 'Дебет'), m('c', 'Кредит'), m('bal', 'Үлдэгдэл')], rows: rows,
    total: { desc: 'Эцсийн үлдэгдэл', d: sum(rows, 'd'), c: sum(rows, 'c'), bal: r0(bal * sign) } };
}
function repCash(E, from, to) {
  var codes = ACCOUNTS.filter(function (a) { return a[3] === 'cash'; }).map(function (a) { return a[0]; });
  var open = balances(E, prevDay(from)), days = {};
  E.forEach(function (e) {
    if (e.date < from || e.date > to) return;
    codes.forEach(function (k) {
      if (e.dr !== k && e.cr !== k) return;
      var key = e.date + '|' + k;
      var d = days[key] = days[key] || { date: e.date, acc: k, in: 0, out: 0 };
      if (e.dr === k) d.in += e.amount; else d.out += e.amount;
    });
  });
  var run = {};
  codes.forEach(function (k) { run[k] = open[k] || 0; });
  var rows = Object.keys(days).sort().map(function (key) {
    var d = days[key], o = run[d.acc];
    run[d.acc] = o + d.in - d.out;
    return { date: d.date, acc: d.acc + ' ' + accName(d.acc), open: r0(o), in: r0(d.in), out: r0(d.out), close: r0(run[d.acc]) };
  });
  return { title: 'Касс, харилцахын товчоо', cols: [c('date', 'Огноо'), c('acc', 'Данс'), m('open', 'Эхний'), m('in', 'Орлого'), m('out', 'Зарлага'), m('close', 'Эцсийн')],
    rows: rows, total: { acc: 'Эцсийн үлдэгдэл: ' + codes.map(function (k) { return accName(k) + ' ' + fmt(run[k]); }).join(' · '), in: sum(rows, 'in'), out: sum(rows, 'out') } };
}
function plData(E, from, to) {
  var b = balances(E, to, from), g = function (k) { return b[k] || 0; };
  var sales = -g('5101') - g('5102'), ret = g('6001'), net = sales - ret, cogs = g('6101'), gross = net - cogs;   // 5201/5202 — «бусад орлого»
  var exps = ACCOUNTS.filter(function (a) { return a[2] === 'exp'; }).map(function (a) { return { code: a[0], name: a[1], v: g(a[0]) }; }).filter(function (x) { return x.v; });
  var expT = exps.reduce(function (s, x) { return s + x.v; }, 0), other = -g('5201') - g('5202');
  return { sales: sales, ret: ret, net: net, cogs: cogs, gross: gross, exps: exps, expT: expT, other: other, profit: gross - expT + other };
}
function repPL(E, from, to) {
  var p = plData(E, from, to), rows = [];
  var L = function (name, v, bold) { rows.push({ name: name, v: v === '' ? '' : r0(v), _b: bold }); };
  L('Борлуулалтын орлого', p.sales); L('Хасах: борлуулалтын буцаалт', -p.ret); L('Цэвэр борлуулалт', p.net, 1);
  L('Борлуулсан барааны өртөг', -p.cogs); L('Нийт ашиг', p.gross, 1);
  p.exps.forEach(function (x) { L('  ' + x.code + ' ' + x.name, -x.v); });
  L('Үйл ажиллагааны зардал, нийт', -p.expT, 1); L('Бусад орлого', p.other); L('Цэвэр ашиг (алдагдал)', p.profit, 1);
  return { title: 'Орлогын дэлгэрэнгүй тайлан (ашиг, алдагдал)', cols: [c('name', 'Үзүүлэлт'), m('v', 'Дүн')], rows: rows,
    note: p.net ? 'Нийт ашгийн хувь: ' + Math.round(p.gross / p.net * 100) + '% · Цэвэр ашгийн хувь: ' + Math.round(p.profit / p.net * 100) + '%' : '' };
}
function repBalance(E, to) {   // үлдэгдэл «to» огноогоор; ашгийг оны эхнээс тусгаарлана
  var b = balances(E, to), rows = [];
  var L = function (name, v, bold) { rows.push({ name: name, v: v === '' ? '' : r0(v), _b: bold }); };
  var sec = function (type, title, sign) {
    var t = 0;
    ACCOUNTS.filter(function (a) { return a[2] === type; }).forEach(function (a) { var v = (b[a[0]] || 0) * sign; if (v) { L('  ' + a[0] + ' ' + a[1], v); t += v; } });
    return t;
  };
  L('ХӨРӨНГӨ', '', 1); var A = sec('asset', '', 1); L('Хөрөнгө, нийт', A, 1);
  L('ӨР ТӨЛБӨР', '', 1); var Li = sec('liab', '', -1); L('Өр төлбөр, нийт', Li, 1);
  L('ЭЗДИЙН ӨМЧ', '', 1); var Eq = sec('equity', '', -1);
  var plOf = function (bb) { var p = 0; ['rev', 'contra', 'cogs', 'exp'].forEach(function (t) { ACCOUNTS.filter(function (a) { return a[2] === t; }).forEach(function (a) { p -= (bb[a[0]] || 0); }); }); return p; };
  var yStart = to.slice(0, 4) + '-01-01', prev = plOf(balances(E, prevDay(yStart))), cur = plOf(b) - prev;
  if (prev) L('  Өмнөх оны хуримтлагдсан ашиг (алдагдал)', prev);
  L('  Тайлант оны ашиг (алдагдал)', cur); Eq += prev + cur; L('Эздийн өмч, нийт', Eq, 1);
  L('Өр төлбөр ба эздийн өмч, нийт', Li + Eq, 1);
  var ok = Math.abs(A - (Li + Eq)) < 0.5;
  return { title: 'Санхүүгийн байдлын тайлан (' + to + ')', cols: [c('name', 'Үзүүлэлт'), m('v', 'Дүн')], rows: rows, check: ok,
    note: ok ? 'Тэнцэж байна: хөрөнгө = өр төлбөр + эздийн өмч' : 'АНХААР: баланс тэнцэхгүй байна' };
}
function repCashflow(E, from, to) {
  var codes = {}; ACCOUNTS.forEach(function (a) { if (a[3] === 'cash') codes[a[0]] = 1; });
  var g = {};
  E.forEach(function (e) {
    if (e.date < from || e.date > to) return;
    var inCash = codes[e.dr], outCash = codes[e.cr];
    if (inCash && outCash) return;   // дотоод шилжүүлэг
    if (!inCash && !outCash) return;
    var other = inCash ? e.cr : e.dr, key = (inCash ? 'Орлого: ' : 'Зарлага: ') + other + ' ' + accName(other);
    g[key] = (g[key] || 0) + (inCash ? e.amount : -e.amount);
  });
  var rows = Object.keys(g).sort().map(function (k) { return { name: k, v: r0(g[k]) }; });
  var open = balances(E, prevDay(from)), close = balances(E, to), sc = function (b) { return Object.keys(codes).reduce(function (s, k) { return s + (b[k] || 0); }, 0); };
  rows.unshift({ name: 'Эхний үлдэгдэл (касс + харилцах)', v: r0(sc(open)), _b: 1 });
  rows.push({ name: 'Цэвэр мөнгөн гүйлгээ', v: r0(sc(close) - sc(open)), _b: 1 });
  rows.push({ name: 'Эцсийн үлдэгдэл (касс + харилцах)', v: r0(sc(close)), _b: 1 });
  return { title: 'Мөнгөн гүйлгээний тайлан', cols: [c('name', 'Үзүүлэлт'), m('v', 'Дүн')], rows: rows };
}
function repPartners(E, to) {
  var p = {};
  E.forEach(function (e) {
    if (e.date > to) return;
    [['1201', 1], ['3101', -1], ['1503', 1], ['3802', -1]].forEach(function (x) {
      var k = x[0];
      if (e.dr !== k && e.cr !== k) return;
      var nm = e.partner || '(харилцагч заагаагүй)';   // кассаас «татан авалт» төлсөн г.м — нийт дүн дансны үлдэгдэлтэй таарна
      var o = p[nm] = p[nm] || { rec: 0, pay: 0 };
      var v = e.dr === k ? e.amount : -e.amount;
      if (k === '3101' || k === '3802') o.pay -= v; else o.rec += v;
    });
  });
  var rows = Object.keys(p).sort().map(function (k) { return { name: k, rec: r0(p[k].rec), pay: r0(p[k].pay), net: r0(p[k].rec - p[k].pay) }; })
    .filter(function (r) { return r.rec || r.pay; });
  return { title: 'Авлага, өглөгийн товчоо', cols: [c('name', 'Харилцагч'), m('rec', 'Авлага'), m('pay', 'Өглөг'), m('net', 'Цэвэр')], rows: rows,
    total: { name: 'Нийт', rec: sum(rows, 'rec'), pay: sum(rows, 'pay'), net: sum(rows, 'net') },
    note: 'Харилцагчтай гүйлгээ: «Зээлээр» бараа орлого авах, эсвэл журналын бичилтэд харилцагч заах.' };
}
function repAccounts() {
  return { title: 'Дансны төлөвлөгөө', cols: [c('code', 'Код'), c('name', 'Дансны нэр'), c('type', 'Төрөл')],
    rows: ACCOUNTS.map(function (a) { return { code: a[0], name: a[1], type: { asset: 'Хөрөнгө', liab: 'Өр төлбөр', equity: 'Эздийн өмч', rev: 'Орлого', contra: 'Орлогын хасалт', cogs: 'Өртөг', exp: 'Зардал' }[a[2]] }; }) };
}

// ═══════════ БОРЛУУЛАЛТЫН ТАЙЛАН ═══════════
function salesIn(R, biz, from, to) { return R.records.filter(function (x) { return x.biz === biz && x.type === 'sale' && x.date >= from && x.date <= to; }); }
function catOf(biz, item) { var p = BUSINESSES[biz].products.filter(function (q) { return q.name === item; })[0]; return p && p.cat ? p.cat : 'Бусад'; }
function groupSales(list, keyFn) {
  var g = {};
  list.forEach(function (x) {
    var k = keyFn(x), o = g[k] = g[k] || { key: k, qty: 0, amount: 0, ret: 0, n: 0 };
    var a = Number(x.amount) || 0;
    if (isAdj(x.item)) { o.amount += a; return; }   // хөнгөлөлт, төлбөр хуваалт — борлуулалтын дүнг засна (буцаалт биш)
    if (a >= 0) { o.amount += a; o.qty += Number(x.qty) || 0; o.n++; } else { o.ret += -a; o.qty += Number(x.qty) || 0; }
  });
  return Object.keys(g).map(function (k) { var o = g[k]; o.net = o.amount - o.ret; return o; }).sort(function (a, b) { return b.net - a.net; });
}
function repSalesBy(R, biz, from, to, by) {
  var list = salesIn(R, biz, from, to);
  if (by === 'item' || by === 'cat') list = list.filter(function (x) { return !isAdj(x.item); });   // хөнгөлөлт, хуваалт бараа биш
  var kf = { item: function (x) { return String(x.item).replace(/ \(буцаалт\)$/, ''); }, cat: function (x) { return catOf(biz, String(x.item).replace(/ \(буцаалт\)$/, '')); },
             staff: function (x) { return x.staff || '—'; }, day: function (x) { return x.date; }, pay: function (x) { return x.pay || 'Бэлэн'; } }[by];
  var title = { item: 'Борлуулалт · бараагаар', cat: 'Борлуулалт · ангиллаар', staff: 'Борлуулалт · худалдагчаар', day: 'Борлуулалт · өдрөөр', pay: 'Борлуулалт · төлбөрийн хэлбэрээр' }[by];
  var rows = groupSales(list, kf);
  if (by === 'day') rows.sort(function (a, b) { return a.key < b.key ? 1 : -1; });
  var ce = costEngine(biz, R), cg = {};
  list.forEach(function (x) { var k = kf(x); cg[k] = (cg[k] || 0) + (ce.rec[x.id] || 0); });
  rows = rows.map(function (o) {
    var r = { key: o.key, qty: r0(o.qty), amount: r0(o.amount), ret: r0(o.ret), net: r0(o.net) };
    if (by === 'item') { var cs = cg[o.key] || 0; r.cogs = cs ? r0(cs) : ''; r.margin = cs ? r0(o.net - cs) : ''; }
    return r;
  });
  var cols = [c('key', { item: 'Бараа', cat: 'Ангилал', staff: 'Худалдагч', day: 'Огноо', pay: 'Төлбөр' }[by]), m('qty', 'Тоо'), m('amount', 'Борлуулалт'), m('ret', 'Буцаалт'), m('net', 'Цэвэр')];
  if (by === 'item') { cols.push(m('cogs', 'Өртөг')); cols.push(m('margin', 'Нийт ашиг')); }
  var tot = { key: 'Нийт', amount: sum(rows, 'amount'), ret: sum(rows, 'ret'), net: sum(rows, 'net') };
  if (by === 'item') { tot.cogs = sum(rows, 'cogs'); tot.margin = sum(rows, 'margin'); }
  return { title: title, cols: cols, rows: rows, total: tot };
}
// Баримтаар бүлэглэх (удирдлага): бараа, хөнгөлөлт, буцаалт, төлбөрийн хэлбэр тус бүр
function groupBills(list) {
  var g = {}, order = [];
  list.forEach(function (x) {
    var k = billKey(x);
    var o = g[k]; if (!o) { o = g[k] = { key: k, date: x.date, time: x.time || '', staff: x.staff || '', customer: '', items: [], lines: [], gross: 0, disc: 0, ret: 0, net: 0, pays: {}, ddtd: '' }; order.push(k); }
    var a = Number(x.amount) || 0, isRet = / \(буцаалт\)$/.test(x.item);
    o.lines.push(x); o.net += a;
    if (baseItem(x.item) === DISC_ITEM) o.disc += -a;
    else if (isAdj(x.item)) {}
    else if (isRet) o.ret += -a;
    else { o.gross += a; o.items.push(x.item + (Number(x.qty) !== 1 ? ' ×' + x.qty : '')); }
    if (!isRet) o.pays[x.pay || 'Бэлэн'] = (o.pays[x.pay || 'Бэлэн'] || 0) + a;
    var dd = x.ddtd || (String(x.note || '').match(/ДДТД (\d+)/) || [])[1]; if (dd) o.ddtd = dd;
    if (x.customer && !o.customer) o.customer = x.customer;
    if ((x.date + x.time) < (o.date + o.time)) { o.date = x.date; o.time = x.time || ''; }
  });
  return order.map(function (k) { return g[k]; });
}
function payText(pays) { return Object.keys(pays).filter(function (k) { return pays[k] > 0; }).map(function (k) { return k + (Object.keys(pays).length > 1 ? ' ' + fmt(pays[k]) : ''); }).join(' + '); }
function repReceipts(R, biz, from, to) {
  var ords = {}; (window.adminOrders || []).forEach(function (o) { ords[o.id] = o; });
  var custOf = function (o) { var d = ords[o.key]; return o.customer || (d ? (d.customer ? d.customer + ' ' : '') + d.phone : ''); };   // Cozy захиалгын баримтад захиалгаас
  var rows = groupBills(salesIn(R, biz, from, to)).map(function (o) {
    return { date: o.date + ' ' + o.time, staff: o.staff, items: o.items.join(', '), customer: custOf(o), pay: payText(o.pays), disc: o.disc ? r0(o.disc) : '', ret: o.ret ? r0(o.ret) : '',
             ebarimt: o.ddtd || '—', amount: r0(o.net), _bill: o.key, order: ords[o.key] ? ords[o.key].status + (ords[o.key].confirmed ? ' · баталгаажсан' : '') : '' };
  }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var oc = rows.some(function (r) { return r.order; }) ? [c('order', 'Захиалга')] : [];   // Cozy: захиалгаас үүссэн баримтын хүргэлтийн төлөв
  return { title: 'Баримтын жагсаалт', cols: [c('date', 'Огноо'), c('staff', 'Худалдагч'), c('items', 'Бараа'), c('customer', 'Хэрэглэгч')].concat(oc).concat([c('pay', 'Төлбөр'), m('disc', 'Хөнгөлөлт'), m('ret', 'Буцаалт'), c('ebarimt', 'И-баримт'), m('amount', 'Дүн')]),
    rows: rows, total: { items: rows.length + ' баримт', disc: sum(rows, 'disc'), ret: sum(rows, 'ret'), amount: sum(rows, 'amount') }, note: 'Мөр дээр дарахад баримтын дэлгэрэнгүй нээгдэнэ.' };
}
// Boost бараагаар: ажилтны бичсэн зар сурталчилгааны төлбөр (зөвхөн бүртгэл — санхүүд банкны хуулгаар 7205)
// Boost бүрийн үр дүн: boost явсан өдрүүдийн борлуулалт ↔ түүнээс өмнөх ижил урттай үе; тэр хугацаанд тухайн бараагаар ирсэн захиалга → нэг захиалгын зардал
function addDays(d, n) { return todayStr(new Date(new Date(d + 'T00:00:00').getTime() + n * 864e5)); }
function boostWin(x) {   // [эхлэл, төгсгөл) — дуусаагүй boost-ийг өнөөдрийг хүртэл; өмнөх үе ижил урттай
  var end = addDays(x.date, Math.max(1, Number(x.qty) || 1)), cap = addDays(todayStr(), 1); if (end > cap) end = cap;
  var len = Math.round((new Date(end + 'T00:00:00') - new Date(x.date + 'T00:00:00')) / 864e5);
  return { a: x.date, b: end, pa: addDays(x.date, -len), len: len };
}
function boostEnd(x) { return addDays(x.date, Math.max(1, Number(x.qty) || 1)); }   // энэ өдрөөс эхлэн boost явахгүй
function repBoost(R, biz, from, to) {
  var bs = R.records.filter(function (x) { return x.biz === biz && x.type === 'boost' && x.date >= from && x.date <= to; });
  var sales = R.records.filter(function (x) { return x.biz === biz && x.type === 'sale' && !isAdj(x.item); });
  var ords = (R.orders || []).filter(function (o) { return o.biz === biz && !ordDead(o); });
  var ce = costEngine(biz, R), today = todayStr();
  // нийт ашиг = борлуулалт − өртөг; өртөг тодорхойгүй мөр байвал noCost (дүгнэлт борлуулалтаар)
  var gpOf = function (y, flag) { var cs = ce.rec[y.id]; if (cs === undefined || (!cs && Number(y.qty) > 0)) flag.nc = true; return (Number(y.amount) || 0) - (Number(cs) || 0); };
  var verdict = function (net, run, nc) { return run ? 'Явж байна' : (net >= 0 ? 'Ашигтай' : 'Ашиггүй') + (nc ? ' (өртөггүй)' : ''); };
  var itemsOf = function (o) { try { return (typeof o.items === 'string' ? JSON.parse(o.items || '[]') : o.items || []).map(function (i) { return i.name; }); } catch (e) { return []; } };
  var by = {};
  var det = bs.slice().sort(function (a, b) { return (b.date + b.time) < (a.date + a.time) ? -1 : 1; }).map(function (x) {
    var w = boostWin(x), o = by[x.item] = by[x.item] || { n: 0, a: 0, usd: 0, d: 0, inD: {}, preD: {}, ord: {} };
    o.n++; o.a += Number(x.amount) || 0; o.d += Number(x.qty) || 0; if (x.unit === 'USD') o.usd += Number(x.price) || 0;
    for (var d = w.a; d < w.b; d = addDays(d, 1)) o.inD[d] = 1;
    for (var e = w.pa; e < w.a; e = addDays(e, 1)) o.preD[e] = 1;
    var q = 0, sa = 0, pq = 0, on = 0, gp = 0, pgp = 0, fl = {}, run = boostEnd(x) > today;
    if (run) o.run = true;
    sales.forEach(function (y) { if (baseItem(y.item) !== x.item) return; if (y.date >= w.a && y.date < w.b) { q += Number(y.qty) || 0; sa += Number(y.amount) || 0; gp += gpOf(y, fl); } else if (y.date >= w.pa && y.date < w.a) { pq += Number(y.qty) || 0; pgp += gpOf(y, fl); } });
    var up = gp - pgp, net = up - (Number(x.amount) || 0);
    ords.forEach(function (d) { if (d.date >= w.a && d.date < w.b && itemsOf(d).indexOf(x.item) >= 0) { on++; o.ord[d.id] = 1; } });
    return { key: x.date + ' ' + (x.time || '') + ' · ' + x.item + (x.note ? ' · ' + x.note : '') + ' · ' + (x.staff || ''), days: Number(x.qty) || '', usd: x.unit === 'USD' ? '$' + r0(x.price) : '',
             boost: r0(Number(x.amount) || 0), qty: r0(q), before: r0(pq), orders: on, cpo: on ? r0(Math.round((Number(x.amount) || 0) / on)) : '', sales: r0(sa), ratio: sa ? Math.round((Number(x.amount) || 0) / sa * 100) + '%' : '—',
             uplift: r0(up), net: r0(net), verdict: verdict(net, run, fl.nc), _id: x.id, _item: x.item, _from: x.date, _to: addDays(boostEnd(x), -1) };
  });
  var rows = Object.keys(by).sort(function (a, b) { return by[b].a - by[a].a; }).map(function (k) {
    var o = by[k], q = 0, sa = 0, pq = 0, on = Object.keys(o.ord).length, gp = 0, pgp = 0, fl = {};
    Object.keys(o.preD).forEach(function (d) { if (o.inD[d]) delete o.preD[d]; });   // давхцсан boost-ийн өдрийг «өмнөх үе»-д тооцохгүй
    sales.forEach(function (y) { if (baseItem(y.item) !== k) return; if (o.inD[y.date]) { q += Number(y.qty) || 0; sa += Number(y.amount) || 0; gp += gpOf(y, fl); } else if (o.preD[y.date]) { pq += Number(y.qty) || 0; pgp += gpOf(y, fl); } });
    var up = gp - pgp, net = up - o.a;
    return { key: k, n: o.n, days: o.d || '', usd: o.usd ? '$' + r0(o.usd) : '', _usd: o.usd, boost: r0(o.a), qty: r0(q), before: r0(pq), orders: on, cpo: on ? r0(Math.round(o.a / on)) : '',
             sales: r0(sa), ratio: sa ? Math.round(o.a / sa * 100) + '%' : '—', uplift: r0(up), net: r0(net), verdict: verdict(net, o.run, fl.nc), roi: o.a ? Math.round(net / o.a * 100) : 0 };
  });
  var tq = sum(rows, 'orders');
  return { title: 'Boost бараагаар', cols: [c('key', 'Бараа'), m('n', 'Удаа'), m('days', 'Хоног'), c('usd', 'Доллар'), m('boost', 'Boost ₮'), m('qty', 'Зарсан (boost үед)'), m('before', 'Өмнөх ижил үе'),
      m('orders', 'Захиалга'), m('cpo', 'Нэг захиалгын зардал'), m('sales', 'Борлуулалт (boost үед)'), c('ratio', 'Boost / борлуулалт'), m('uplift', 'Нэмэлт ашиг'), m('net', 'Цэвэр үр дүн'), c('verdict', 'Дүгнэлт')],
    rows: rows.concat(det.length ? [{ key: '— Бичилтүүд —', _b: true }] : []).concat(det),
    total: { key: 'Нийт', usd: sum(rows, '_usd') ? '$' + sum(rows, '_usd') : '', boost: sum(rows, 'boost'), qty: sum(rows, 'qty'), before: sum(rows, 'before'), orders: tq, cpo: tq ? Math.round(sum(rows, 'boost') / tq) : '', sales: sum(rows, 'sales'), uplift: sum(rows, 'uplift'), net: sum(rows, 'net') },
    note: 'Нэмэлт ашиг = boost үеийн нийт ашиг (борлуулалт − өртөг) − өмнөх ижил үеийн нийт ашиг; Цэвэр үр дүн = нэмэлт ашиг − boost зардал (≥ 0 бол ашигтай). Boost үе = эхэлсэн өдрөөс хоногийн тоогоор (дуусаагүй бол өнөөдрийг хүртэл); «Өмнөх ижил үе» — түүнээс өмнөх ижил олон хоног. Захиалга — тэр хугацаанд тухайн бараатай ирсэн Cozy захиалга. Boost — зөвхөн бүртгэл, санхүүд банкны хуулгаар (7205) орно.' };
}
// Хөнгөлөлт ба буцаалт: хэн, хэдэн, ямар шалтгаанаар
function repDiscRet(R, biz, from, to) {
  var list = salesIn(R, biz, from, to), rows = [];
  list.forEach(function (x) {
    var a = Number(x.amount) || 0;
    if (baseItem(x.item) === DISC_ITEM && a < 0) rows.push({ date: x.date + ' ' + (x.time || ''), kind: 'Хөнгөлөлт', staff: x.staff || '', item: String(x.note || '').replace(/^Хөнгөлөлт /, ''), why: '', amount: r0(-a), _bill: billKey(x) });
    else if (/ \(буцаалт\)$/.test(x.item) && !isAdj(x.item)) rows.push({ date: x.date + ' ' + (x.time || ''), kind: 'Буцаалт', staff: x.staff || '', item: baseItem(x.item) + ' ×' + Math.abs(x.qty),
      why: String(x.note || '').replace(/^Буцаалт:? ?/, '').replace(/^· /, ''), amount: r0(-a), _bill: billKey(x) });
  });
  rows.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var by = {}; rows.forEach(function (r) { var k = r.kind + ' · ' + (r.staff || '—'); by[k] = (by[k] || 0) + r.amount; });
  var sumD = rows.filter(function (r) { return r.kind === 'Хөнгөлөлт'; }).reduce(function (a, r) { return a + r.amount; }, 0), sumR = rows.filter(function (r) { return r.kind === 'Буцаалт'; }).reduce(function (a, r) { return a + r.amount; }, 0);
  return { title: 'Хөнгөлөлт, буцаалт', cols: [c('date', 'Огноо'), c('kind', 'Төрөл'), c('staff', 'Ажилтан'), c('item', 'Бараа / хэмжээ'), c('why', 'Шалтгаан'), m('amount', 'Дүн')], rows: rows,
    total: { date: 'Нийт', item: 'Хөнгөлөлт ' + fmt(sumD) + ' · Буцаалт ' + fmt(sumR), amount: r0(sumD + sumR) },
    note: Object.keys(by).length ? 'Ажилтнаар: ' + Object.keys(by).map(function (k) { return k + ' ' + fmt(by[k]); }).join(' · ') : '' };
}
// Удаан эргэлттэй бараа: үлдэгдэлтэй боловч сүүлийн N хоногт зарагдаагүй (мөнгө хөлдсөн)
function repSlow(R, biz, days, stockMap) {
  days = days || 30;
  var cut = todayStr(new Date(Date.now() - days * 864e5)), last = {}, sold = {};
  R.records.forEach(function (x) {
    if (x.biz !== biz || x.type !== 'sale' || isNonGoods(x.item) || !(Number(x.qty) > 0)) return;
    var k = x.item; if (!last[k] || x.date > last[k]) last[k] = x.date; if (x.date >= cut) sold[k] = (sold[k] || 0) + Number(x.qty);
  });
  var ce = costEngine(biz, R), st = stockMap || {};
  var rows = Object.keys(st).map(function (k) {
    var q = Math.round(((st[k].shop || 0) + (st[k].wh || 0)) * 1000) / 1000; if (!(q > 0) || isNonGoods(k)) return null;
    var cs = Math.round(avgCost(ce, k)), sq = sold[k] || 0;
    var dleft = sq ? Math.round(q / (sq / days)) : '';
    return { item: k, qty: q, last: last[k] || 'хэзээ ч', sold: sq, days: dleft, cost: cs || '', val: cs ? r0(q * cs) : '', _slow: !sq };
  }).filter(Boolean).filter(function (r) { return !r.sold || r.days > 90; })
    .sort(function (a, b) { return (Number(b.val) || 0) - (Number(a.val) || 0); });
  return { title: 'Удаан эргэлттэй бараа (' + days + ' хоног)', noRange: true, cols: [c('item', 'Бараа'), m('qty', 'Үлдэгдэл'), c('last', 'Сүүлд зарагдсан'), m('sold', days + ' хоногт зарсан'), m('days', 'Дуусахад (хоног)'), m('cost', 'Нэгж өртөг'), m('val', 'Хөлдсөн мөнгө')],
    rows: rows, total: { item: rows.length + ' бараа', val: sum(rows, 'val') }, note: 'Сүүлийн ' + days + ' хоногт огт зараагүй, эсвэл одоогийн хурдаар 90+ хоногт дуусах бараа. Урамшуулал, хямдрал зарлах, дахин захиалахгүй байхад ашиглана.' };
}
function repEbarimt(R, biz, from, to) {
  var d = {};
  salesIn(R, biz, from, to).forEach(function (x) {
    var o = d[x.date] = d[x.date] || { date: x.date, b2c: 0, b2b: 0, none: 0, ret: 0, total: 0 };
    var a = Number(x.amount) || 0, has = /ДДТД/.test(x.note || '');
    o.total += a;
    if (a < 0) o.ret += -a; else if (!has) o.none += a; else if (/ТТД/.test(x.note || '')) o.b2b += a; else o.b2c += a;
  });
  var rows = Object.keys(d).sort().reverse().map(function (k) { var o = d[k]; return { date: o.date, b2c: r0(o.b2c), b2b: r0(o.b2b), none: r0(o.none), ret: r0(o.ret), total: r0(o.total) }; });
  return { title: 'И-баримт тулгалт', cols: [c('date', 'Огноо'), m('b2c', 'Хувь хүн'), m('b2b', 'Байгууллага'), m('none', 'Баримтгүй'), m('ret', 'Буцаалт'), m('total', 'Нийт')],
    rows: rows, total: { date: 'Нийт', b2c: sum(rows, 'b2c'), b2b: sum(rows, 'b2b'), none: sum(rows, 'none'), ret: sum(rows, 'ret'), total: sum(rows, 'total') },
    note: '«Баримтгүй» мөрийг заавал шалгана уу — И-баримт гараагүй борлуулалт.' };
}

// ═══════════ БАРАА МАТЕРИАЛЫН ТАЙЛАН ═══════════
// Baaz-ийн «Бараа материалын үлдэгдэл»-тэй адил: эхний, орлого, зарлага, эцсийн (тоо, өртгөөр)
function repStockMove(R, biz, from, to) {
  var items = {};
  var get = function (k) { return items[k] = items[k] || { item: k, o: 0, inq: 0, outq: 0 }; };
  var since = null;   // үлдэгдэл хөтөлж эхэлсэн мөч (минутаар — серверийн тооцоотой адил)
  R.moves.forEach(function (m) { if (m.biz === biz) { var d = String(m.date).slice(0, 16); if (!since || d < since) since = d; } });
  R.moves.forEach(function (mv) {
    if (mv.biz !== biz || mv.kind === 'Шилжүүлэг') return;
    var d = String(mv.date).slice(0, 10), o = get(mv.item);
    if (d < from) o.o += mv.qty; else if (d <= to) { if (mv.qty > 0) o.inq += mv.qty; else o.outq += -mv.qty; }
  });
  R.records.forEach(function (x) {
    if (x.biz !== biz || x.type !== 'sale' || !since || x.date + ' ' + (x.time || '00:00') < since) return;
    var o = get(String(x.item).replace(/ \(буцаалт\)$/, '')), q = Number(x.qty) || 0;
    if (x.date < from) o.o -= q; else if (x.date <= to) { if (q > 0) o.outq += q; else o.inq += -q; }
  });
  var ce = costEngine(biz, R);
  var rows = Object.keys(items).sort().map(function (k) {
    var o = items[k], cl = o.o + o.inq - o.outq, cs = Math.round(avgCost(ce, k));
    return { item: k, o: r0(o.o), inq: r0(o.inq), outq: r0(o.outq), cl: r0(cl), cost: cs || '', val: cs ? r0(cl * cs) : '' };
  }).filter(function (r) { return r.o || r.inq || r.outq || r.cl; });
  return { title: 'Бараа материалын хөдөлгөөний тайлан', cols: [c('item', 'Бараа'), m('o', 'Эхний'), m('inq', 'Орлого'), m('outq', 'Зарлага'), m('cl', 'Эцсийн'),
    m('cost', 'Нэгж өртөг'), m('val', 'Эцсийн өртөг')], rows: rows, total: { item: 'Нийт', val: sum(rows, 'val') } };
}
function repReceiptsIn(R, biz, from, to) {
  var rows = R.moves.filter(function (m) { var d = String(m.date).slice(0, 10); return m.biz === biz && (m.kind === 'Орлого' || m.kind === 'Эхний үлдэгдэл') && d >= from && d <= to; })
    .map(function (m) { var sg = { CNY: '¥', USD: '$', MNT: '₮' }[m.cur] || '';
      return { date: m.date, kind: m.kind, item: m.item, loc: m.loc, qty: m.qty, buy: m.buy ? sg + m.buy : '', rate: m.rate || '', cargo: m.cargo || '',
               cost: m.cost || '', val: m.cost ? r0(m.qty * m.cost) : '', pay: m.pay || '', partner: m.partner || '',
               cpay: m.cargo && m.cargoPay ? m.cargoPay + (m.cargoPartner ? ' · ' + m.cargoPartner : '') : '', _id: m.id }; }).reverse();
  return { title: 'Бараа орлогын жагсаалт', cols: [c('date', 'Огноо'), c('kind', 'Төрөл'), c('item', 'Бараа'), c('loc', 'Байршил'), m('qty', 'Тоо'),
    c('buy', 'Авсан үнэ'), m('rate', 'Ханш'), m('cargo', 'Карго/ш'), m('cost', 'Өртөг үнэ'),
    m('val', 'Дүн'), c('pay', 'Төлбөр'), c('partner', 'Нийлүүлэгч'), c('cpay', 'Каргоны төлбөр')], rows: rows, total: { item: rows.length + ' мөр', val: sum(rows, 'val') } };
}

// ── туслах ──
function c(k, label) { return { k: k, label: label }; }
function m(k, label) { return { k: k, label: label, num: true }; }
function sum(rows, k) { return r0(rows.reduce(function (s, r) { return s + (Number(r[k]) || 0); }, 0)); }

// ═══════════ ОН ХААХ: оны эцсийн үлдэгдлийг шинэ оны «Он нээлт» болгох ═══════════
// Орлого/зардлын дансууд хаагдаж 4601 «Хуримтлагдсан ашиг»-т нэмэгдэнэ. Хөрөнгө, өр, өмчийн данс бүрийн үлдэгдэл
// 0000 нэгтгэлийн данстай хос бичилтээр шилжинэ (0000-ын нийлбэр үргэлж 0). Авлага, өглөгийг харилцагч тус бүрээр.
function yearClosePayload(biz, R, year) {
  var end = year + '-12-31', E = buildJournal(biz, R), b = balances(E, end), open = [];
  var line = function (acc, bal, partner, desc) {
    bal = r0(bal);
    if (Math.abs(bal) < 0.01) return;
    open.push(bal > 0 ? { biz: biz, dr: acc, cr: '0000', amount: bal, partner: partner || '', desc: desc } : { biz: biz, dr: '0000', cr: acc, amount: -bal, partner: partner || '', desc: desc });
  };
  var pl = 0;
  ACCOUNTS.forEach(function (a) { if (/^(rev|contra|cogs|exp)$/.test(a[2])) pl += b[a[0]] || 0; });
  // Харилцагчаар (зээл, бараа захиалгыг «#ID»-аар нь) салгаж шилжүүлнэ — шинэ онд зээлийн бүртгэл, захиалга үргэлжилнэ
  var byPartner = { '1201': {}, '3101': {}, '1503': {}, '3802': {}, '1290': {}, '1208': {}, '1210': {}, '3501': {}, '1505': {}, '2001': {}, '2002': {} },
      TAGGED = { '1210': 1, '3501': 1, '1505': 1, '2001': 1, '2002': 1 }, TAGONLY = { '1505': 1, '2001': 1, '2002': 1 };   // үндсэн хөрөнгө — «#FA»-аар
  E.forEach(function (e) {
    if (e.date > end) return;
    [e.dr, e.cr].forEach(function (k, i) {
      if (!byPartner[k]) return;
      var tg = TAGGED[k] ? (String(e.desc).match(/#((?:L|PO|FA)\d+)/) || [])[1] || '' : '', key = (TAGONLY[k] ? '' : e.partner || '') + '\u0001' + tg;   // захиалга, хөрөнгийг зөвхөн «#ID»-аар
      byPartner[k][key] = (byPartner[k][key] || 0) + (i === 0 ? e.amount : -e.amount);
    });
  });
  ACCOUNTS.forEach(function (a) {
    var k = a[0];
    if (k === '0000' || !/^(asset|liab|equity)$/.test(a[2])) return;
    if (byPartner[k]) { Object.keys(byPartner[k]).forEach(function (key) { var pt = key.split('\u0001'); line(k, byPartner[k][key], pt[0], a[1] + (pt[1] ? ' #' + pt[1] : '')); }); return; }
    line(k, (b[k] || 0) + (k === '4601' ? pl : 0), '', k === '4601' ? a[1] + ' (' + year + ' оны ашиг нэмэгдсэн)' : a[1]);
  });
  // Бараа: байршил тус бүрийн тоо, дундаж өртөг
  var ce = costEngine(biz, R, end), loc = {};
  R.moves.forEach(function (m) {
    if (m.biz !== biz || String(m.date).slice(0, 10) > end) return;
    var o = loc[m.item] = loc[m.item] || { wh: 0 };
    if (m.loc === 'Агуулах') o.wh += Number(m.qty) || 0;
  });
  var stock = [];
  Object.keys(ce.items).forEach(function (k) {
    var o = ce.items[k], q = r0(o.q), avg = o.q > 0 ? o.v / o.q : o.avg, wh = r0((loc[k] || {}).wh || 0), shop = r0(q - wh);
    if (shop < 0 && wh > 0) { var tk = Math.min(wh, -shop); wh = r0(wh - tk); shop = r0(shop + tk); }   // дэлгүүрт дутсаныг агуулахаас (stockAll-тай адил)
    avg = Math.round(avg * 100) / 100;   // бүхэлчилбэл 1404-тэй хэдэн ₮ зөрнө
    if (wh) stock.push({ biz: biz, loc: 'Агуулах', item: k, qty: wh, cost: avg });
    if (shop) stock.push({ biz: biz, loc: 'Дэлгүүр', item: k, qty: shop, cost: avg });
  });
  var sum = function (arr, f) { return r0(arr.reduce(function (a, x) { return a + f(x); }, 0)); };
  return { open: open, stock: stock, profit: r0(-pl),
    check: { dr: sum(open, function (x) { return x.dr === '0000' ? 0 : x.amount; }) - sum(open, function (x) { return x.cr === '0000' ? 0 : x.amount; }),
             inv1404: r0(b['1404'] || 0), invItems: sum(stock, function (x) { return x.qty * x.cost; }) } };
}


// ═══════════ НЭМЭЛТ САНХҮҮГИЙН ТАЙЛАН ═══════════
// Ерөнхий дэвтэр — гүйлгээтэй данс бүрийн эхний үлдэгдэл, гүйлгээ, эцсийн үлдэгдэл
function repGL(E, from, to) {
  var open = balances(E, prevDay(from)), rows = [];
  ACCOUNTS.forEach(function (a) {
    var k = a[0], lines = E.filter(function (e) { return e.date >= from && e.date <= to && (e.dr === k || e.cr === k); });
    var o = open[k] || 0; if (!lines.length && Math.abs(o) < 0.5) return;
    var sign = debitNormal(k) ? 1 : -1, bal = o;
    rows.push({ date: '', doc: k + ' ' + a[1], desc: 'Эхний үлдэгдэл', corr: '', d: '', c: '', bal: r0(o * sign), _b: 1 });
    lines.forEach(function (e) { var isD = e.dr === k; bal += isD ? e.amount : -e.amount;
      rows.push({ date: e.date, doc: e.doc, desc: e.desc, corr: isD ? e.cr : e.dr, d: isD ? e.amount : '', c: isD ? '' : e.amount, bal: r0(bal * sign) }); });
  });
  return { title: 'Ерөнхий дэвтэр', cols: [c('date', 'Огноо'), c('doc', 'Данс / баримт'), c('desc', 'Гүйлгээний утга'), c('corr', 'Харьцсан'), m('d', 'Дебет'), m('c', 'Кредит'), m('bal', 'Үлдэгдэл')], rows: rows };
}
// Авлага / өглөгийн насжилт — харилцагч бүрийн үлдэгдлийг үүссэн огноогоор нь (эхэлж үүссэнээс нь хааж) ангилна
function repAging(E, to, acc) {
  var p = {}, recv = acc === '1201';
  E.forEach(function (e) {
    if (e.date > to || (e.dr !== acc && e.cr !== acc)) return;
    var name = e.partner || '(харилцагч заагаагүй)', o = p[name] = p[name] || { open: [], pay: 0 };
    var inc = recv ? e.dr === acc : e.cr === acc;   // авлага: дебет нэмэгдэнэ; өглөг: кредит нэмэгдэнэ
    if (inc) o.open.push({ date: e.date, left: e.amount }); else o.pay += e.amount;
  });
  var rows = Object.keys(p).sort().map(function (n) {
    var o = p[n], pay = o.pay, r = { name: n, b0: 0, b30: 0, b60: 0, b90: 0, tot: 0 };
    o.open.forEach(function (x) { var use = Math.min(pay, x.left); x.left -= use; pay -= use; });
    o.open.forEach(function (x) {
      if (x.left < 0.5) return;
      var days = Math.round((new Date(to) - new Date(x.date)) / 864e5);
      r[days <= 30 ? 'b0' : days <= 60 ? 'b30' : days <= 90 ? 'b60' : 'b90'] += x.left; r.tot += x.left;
    });
    if (pay > 0.5) r.tot -= pay;   // илүү төлөлт
    ['b0', 'b30', 'b60', 'b90', 'tot'].forEach(function (k) { r[k] = r0(r[k]); });
    return r;
  }).filter(function (r) { return Math.abs(r.tot) >= 0.5; });
  return { title: (recv ? 'Авлагын' : 'Өглөгийн') + ' насжилтын тайлан (' + to + ')', rows: rows,
    cols: [c('name', 'Харилцагч'), m('b0', '0–30 хоног'), m('b30', '31–60'), m('b60', '61–90'), m('b90', '90+ хоног'), m('tot', 'Нийт')],
    total: { name: 'Нийт', b0: sum(rows, 'b0'), b30: sum(rows, 'b30'), b60: sum(rows, 'b60'), b90: sum(rows, 'b90'), tot: sum(rows, 'tot') } };
}
// Харилцагчийн хуулга — сонгосон харилцагчтай хийсэн бүх гүйлгээ, үлдэгдэлтэй
function repPartnerStmt(E, from, to, name) {
  var accs = { '1201': 1, '1503': 1, '3101': -1 }, open = 0, rows = [];
  E.forEach(function (e) {
    if ((e.partner || '') !== name || e.date > to) return;
    var k = accs[e.dr] ? e.dr : accs[e.cr] ? e.cr : null; if (!k) return;
    var v = (e.dr === k ? e.amount : -e.amount);   // + = бидэнд өгөх (авлага), − = бидний өгөх (өглөг)
    if (e.date < from) { open += v; return; }
    rows.push({ date: e.date, doc: e.doc, desc: e.desc, acc: k + ' ' + accName(k), inc: v > 0 ? v : '', dec: v < 0 ? -v : '' });
  });
  var bal = open;
  rows.forEach(function (r) { bal += (Number(r.inc) || 0) - (Number(r.dec) || 0); r.bal = r0(bal); });
  rows.unshift({ date: from, doc: '', desc: 'Эхний үлдэгдэл', acc: '', inc: '', dec: '', bal: r0(open), _b: 1 });
  return { title: 'Харилцагчийн хуулга · ' + name, rows: rows,
    cols: [c('date', 'Огноо'), c('doc', 'Баримт'), c('desc', 'Гүйлгээний утга'), c('acc', 'Данс'), m('inc', 'Нэмэгдсэн'), m('dec', 'Хасагдсан'), m('bal', 'Үлдэгдэл')],
    note: 'Эерэг үлдэгдэл — харилцагч бидэнд өгөх (авлага), сөрөг — бид харилцагчид өгөх (өглөг).' };
}
// Өмчийн өөрчлөлтийн тайлан
function repEquity(E, from, to) {
  var plOf = function (b) { var p = 0; ACCOUNTS.forEach(function (a) { if (/^(rev|contra|cogs|exp)$/.test(a[2])) p -= b[a[0]] || 0; }); return p; };
  var bo = balances(E, prevDay(from)), bc = balances(E, to), mv = balances(E, to, from);
  var g = function (b, k) { return -(b[k] || 0); };
  var rows = [], L = function (n, cap, oth, re, bold) { rows.push({ name: n, cap: r0(cap), oth: r0(oth), re: r0(re), tot: r0(cap + oth + re), _b: bold }); };
  var re0 = g(bo, '4601') + plOf(bo);
  L('Эхний үлдэгдэл (' + from + ')', g(bo, '4101'), g(bo, '4201') + g(bo, '0000'), re0, 1);
  L('Эзэн оруулсан / (авсан) хөрөнгө', g(mv, '4101'), 0, 0);
  L('Эхний үлдэгдлийн тохируулга', 0, g(mv, '4201') + g(mv, '0000'), g(mv, '4601'));
  L('Тайлант үеийн цэвэр ашиг (алдагдал)', 0, 0, plOf(mv));
  L('Эцсийн үлдэгдэл (' + to + ')', g(bc, '4101'), g(bc, '4201') + g(bc, '0000'), g(bc, '4601') + plOf(bc), 1);
  return { title: 'Өмчийн өөрчлөлтийн тайлан', rows: rows, cols: [c('name', 'Үзүүлэлт'), m('cap', 'Өмч (эзний)'), m('oth', 'Бусад өмч'), m('re', 'Хуримтлагдсан ашиг'), m('tot', 'Нийт')] };
}
