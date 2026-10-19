// ── ТАТВАР, НИЙГМИЙН ДААТГАЛ, САНХҮҮГИЙН ТАЙЛАН (хуулийн этгээдээр нэгтгэсэн) ──
// Хувь хэмжээ, хугацаа бүгд config.js-ийн TAX-д. Энд зөвхөн тооцоолж, албан маягтын баганын дарааллаар гаргана.
// Тайланг сайтад илгээх API байхгүй тул: систем бэлдэнэ → та e-TAX / НДаатгал / e-Balance-д нэвтэрч оруулна.

var taxState = { ent: 'weiss', sub: 'calendar', month: '', quarter: '', year: '' };
(function () {
  var d = new Date(); d.setMonth(d.getMonth() - 1);
  taxState.month = todayStr(d).slice(0, 7);
  var q = Math.floor(d.getMonth() / 3) + 1;
  taxState.quarter = d.getFullYear() + '-Q' + q;
  taxState.year = String(new Date().getFullYear() - (new Date().getMonth() < 3 ? 1 : 0));
})();
var TAX_SUBS = [
  ['Хуанли', [['calendar', 'Тайлангийн хуанли']]],
  ['Цалин, НДШ', [['payroll', 'Цалин бодолт'], ['nd8', 'НДШ тайлан (НД-8)'], ['tt11', 'ТТ-11 (ХХОАТ суутгал)']]],
  ['Татвар', [['tt02', 'ТТ-02 (ААНОАТ) бэлтгэл']]],
  ['Санхүүгийн тайлан', [['ebalance', 'e-Balance жилийн тайлан'], ['entpl', 'Нэгтгэсэн орлогын тайлан']]],
];
function entBiz(k) { return ENTITIES[k].biz; }
function entOf(biz) { var r = 'weiss'; Object.keys(ENTITIES).forEach(function (k) { if (ENTITIES[k].biz.indexOf(biz) >= 0) r = k; }); return r; }
// Хуулийн этгээдийн бүх дэлгүүрийн журналыг нэгтгэнэ
function entJournal(k) { var E = []; entBiz(k).forEach(function (b) { E = E.concat(buildJournal(b, R())); }); E.sort(function (a, b) { return a.date < b.date ? -1 : 1; }); return E; }
function lastDay(m) { var d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0); return todayStr(d); }
function qMonths(q) { var y = q.slice(0, 4), n = Number(q.slice(-1)); return [1, 2, 3].map(function (i) { return y + '-' + ('0' + ((n - 1) * 3 + i)).slice(-2); }); }

// ═══════════ ЦАЛИН БОДОЛТ ═══════════
function rateSum(o) { return Object.keys(o).reduce(function (a, k) { return a + o[k]; }, 0); }
function jobInjury(code) {
  if (!code || !window.ND_JOBS) return TAX.ndDefaultInjury;
  var j = ND_JOBS.filter(function (x) { return x[0] === code; })[0];
  return j ? j[2] : TAX.ndDefaultInjury;
}
function pitCredit(income) { for (var i = 0; i < TAX.pitCredit.length; i++) if (income <= TAX.pitCredit[i][0]) return TAX.pitCredit[i][1]; return 0; }
function entStaff(k) {
  var bs = entBiz(k);
  return staff.filter(function (s) { return s.status === 'Тийм' && (bs.indexOf(s.biz) >= 0 || (s.biz === 'all' && k === 'weiss')) && (s.role !== 'Эзэн' || Number(s.salary) > 0); });
}
function calcPay(s, month) {
  var e = salary.filter(function (x) { return x.staffId === s.id && x.month === month; });
  var sumK = function (k) { return e.filter(function (x) { return x.kind === k; }).reduce(function (a, x) { return a + x.amount; }, 0); };
  var started = !s.start || s.start <= lastDay(month);   // ажилд орохоос өмнөх сард цалин тооцохгүй
  var ended = s.contractEnd && s.contractEnd < month + '-01';
  var base = started && !ended ? Number(s.salary) || 0 : 0, bonus = sumK('KPI бонус') + sumK('Шагнал'), gross = base + bonus;
  var ndBase = Math.min(gross, TAX.ndCeiling), inj = jobInjury(s.ndJob);
  var ndEE = Math.round(ndBase * rateSum(TAX.ndEmployee) / 100), ndER = Math.round(ndBase * (rateSum(TAX.ndEmployer) + inj) / 100);
  var taxable = gross - ndEE, credit = gross ? pitCredit(gross) : 0, pit = Math.max(0, Math.round(taxable * TAX.pitRate / 100) - credit);
  var net = gross - ndEE - pit, ded = sumK('Суутгал'), paid = sumK('Урьдчилгаа') + sumK('Олгосон');
  return { s: s, base: base, bonus: bonus, gross: gross, ndEE: ndEE, ndER: ndER, inj: inj, taxable: taxable, credit: credit, pit: pit, net: net, ded: ded, paid: paid, left: net - ded - paid,
           biz: s.biz === 'all' ? entBiz('weiss')[0] : s.biz };
}
function payrollReport(k, month) {
  var rows = entStaff(k).map(function (s) { return calcPay(s, month); }).filter(function (p) { return p.gross > 0; });
  var r = rows.map(function (p) { return { name: full(p.s), regno: p.s.regno, pos: p.s.position, gross: p.gross, ndEE: p.ndEE, pit: p.pit, credit: p.credit, net: p.net, ded: p.ded, paid: p.paid, left: p.left, ndER: p.ndER }; });
  return { title: 'Цалингийн хүснэгт · ' + month, rows: r, raw: rows,
    cols: [c('name', 'Ажилтан'), c('regno', 'Регистр'), c('pos', 'Албан тушаал'), m('gross', 'Нийт цалин'), m('ndEE', 'НДШ (ажилтан)'), m('credit', 'ХХОАТ хөнгөлөлт'),
      m('pit', 'ХХОАТ'), m('net', 'Гарт олгох'), m('ded', 'Суутгал'), m('paid', 'Олгосон'), m('left', 'Үлдэгдэл'), m('ndER', 'НДШ (ажил олгогч)')],
    total: { name: 'Нийт', gross: sum(r, 'gross'), ndEE: sum(r, 'ndEE'), credit: sum(r, 'credit'), pit: sum(r, 'pit'), net: sum(r, 'net'), ded: sum(r, 'ded'), paid: sum(r, 'paid'), left: sum(r, 'left'), ndER: sum(r, 'ndER') },
    note: 'НДШ: ажилтан ' + rateSum(TAX.ndEmployee) + '%, ажил олгогч ' + rateSum(TAX.ndEmployer) + '% + ҮОМШӨ (мэргэжлийн кодоор 0.5–2.5%). ХХОАТ ' + TAX.pitRate + '% − хөнгөлөлт. «Бодолт хийх» дарвал санхүүд бичигдэнэ.' };
}
function payrollPosted(k, month) {
  return journal.filter(function (j) { return entBiz(k).indexOf(j.biz) >= 0 && String(j.desc).indexOf('Цалин бодолт ' + month) === 0; });
}
function postPayroll() {
  var k = taxState.ent, month = taxState.month, rep = payrollReport(k, month);
  if (!rep.raw.length) { toast('Цалинтай ажилтан алга — ажилтны үндсэн цалинг тохируулна уу'); return; }
  if (payrollPosted(k, month).length) { toast('Энэ сарын цалин аль хэдийн бодогдсон'); return; }
  if (!confirm(month + ' сарын цалинг бодож санхүүд бичих үү?\nНийт цалин ' + fmt(rep.total.gross) + ', НДШ ' + fmt(rep.total.ndEE + rep.total.ndER) + ', ХХОАТ ' + fmt(rep.total.pit))) return;
  var d = lastDay(month), E = [];
  rep.raw.forEach(function (p) {
    var tag = 'Цалин бодолт ' + month + ' · ' + full(p.s);
    E.push({ biz: p.biz, date: d, dr: '7101', cr: '3301', amount: p.gross, desc: tag + ' · нийт цалин' });
    if (p.ndEE) E.push({ biz: p.biz, date: d, dr: '3301', cr: '3403', amount: p.ndEE, desc: tag + ' · НДШ ажилтан' });
    if (p.pit) E.push({ biz: p.biz, date: d, dr: '3301', cr: '3404', amount: p.pit, desc: tag + ' · ХХОАТ' });
    if (p.ndER) E.push({ biz: p.biz, date: d, dr: '7102', cr: '3403', amount: p.ndER, desc: tag + ' · НДШ ажил олгогч' });
  });
  if (!API_URL) { E.forEach(function (e, i) { e.id = 'J' + Date.now() + '-' + i; e.by = ownerName; journal.push(e); }); save('nb_demo_journal', journal); render(); toast('Бодогдлоо'); return; }
  post({ type: 'admin_journal', by: ownerName, entries: E }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    toast('Цалин бодогдож санхүүд бичигдлээ'); refresh();
  });
}
function cancelPayroll() {
  var list = payrollPosted(taxState.ent, taxState.month);
  if (!list.length || !confirm(taxState.month + ' сарын цалин бодолтыг (' + list.length + ' мөр) цуцлах уу?')) return;
  if (!API_URL) { var ids = {}; list.forEach(function (j) { ids[j.id] = 1; }); journal = journal.filter(function (j) { return !ids[j.id]; }); save('nb_demo_journal', journal); render(); return; }
  var n = list.length;
  list.forEach(function (j) { post({ type: 'admin_journal', cancelId: j.id }, function () { if (--n === 0) { toast('Цуцлагдлаа'); refresh(); } }); });
}

// ═══════════ НДШ тайлан — НД-8 Excel (портал «Маягт татах»-ын баганын дараалал) ═══════════
var ND8_COLS = ['Регистрийн дугаар', 'Ургийн овог', 'Эцэг/эхийн нэр', 'Нэр', 'Даатгуулагчийн төрөл', 'Ажил мэргэжлийн ангилал', 'Цалин хөлс, түүнтэй адилтгах орлого',
  'Үндсэн цалин', 'Шагнал урамшуулал', 'Нэмэгдэл, нэмэгдэл хөлс', 'Хоол, унааны үнийн хөнгөлөлт', 'Түлээ, нүүрсний үнийн хөнгөлөлт, адилтгах орлого', 'Иргэншил', 'Харилцах утасны дугаар', 'Цахим шуудангийн хаяг'];
function nd8Report(k, month) {
  var rows = entStaff(k).map(function (s) { return calcPay(s, month); }).filter(function (p) { return p.gross > 0; }).map(function (p) {
    return { reg: p.s.regno || '', clan: '', surname: p.s.surname || '', name: p.s.name, type: p.s.ndType || '01001', job: p.s.ndJob || '', gross: p.gross, base: p.base, bonus: p.bonus,
             add: 0, food: 0, fuel: 0, cit: 'Монгол', phone: p.s.phone || '', mail: '', _ee: p.ndEE, _er: p.ndER, _miss: !p.s.regno || !p.s.ndJob };
  });
  var keys = ['reg', 'clan', 'surname', 'name', 'type', 'job', 'gross', 'base', 'bonus', 'add', 'food', 'fuel', 'cit', 'phone', 'mail'];
  var miss = rows.filter(function (r) { return r._miss; }).length;
  return { title: 'НДШ тайлан (НД-8) · ' + month, rows: rows, keys: keys,
    cols: keys.map(function (k2, i) { return /^(gross|base|bonus|add|food|fuel)$/.test(k2) ? m(k2, ND8_COLS[i]) : c(k2, ND8_COLS[i]); }),
    total: { reg: 'Нийт ' + rows.length, gross: sum(rows, 'gross'), base: sum(rows, 'base'), bonus: sum(rows, 'bonus') },
    note: 'Төлөх шимтгэл: ажилтны ' + fmt(sum(rows, '_ee')) + ' + ажил олгогчийн ' + fmt(sum(rows, '_er')) + ' = ' + fmt(sum(rows, '_ee') + sum(rows, '_er')) + '. ' +
      (miss ? miss + ' ажилтны регистр эсвэл НД мэргэжлийн код дутуу — Ажилчид → Засах. ' : '') + 'Excel-ийг portal.ndaatgal.mn → НДШ тайлан-д оруулна.' };
}
function exportNd8() {
  var rep = nd8Report(taxState.ent, taxState.month);
  var aoa = [ND8_COLS].concat(rep.rows.map(function (r) { return rep.keys.map(function (k2) { return r[k2] === 0 ? 0 : r[k2] || ''; }); }));
  var wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = ND8_COLS.map(function () { return { wch: 18 }; });
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, 'НД-8 ' + ENTITIES[taxState.ent].name + ' ' + taxState.month + '.xlsx');
}

// ═══════════ ТТ-11 — цалингаас суутгасан ХХОАТ (улирлаар, ажилтан бүрээр) ═══════════
function tt11Report(k, q) {
  var rows = [];
  entStaff(k).forEach(function (s) {
    var r = { name: full(s), regno: s.regno || '', gross: 0, ndEE: 0, taxable: 0, tax: 0, credit: 0, pit: 0 };
    qMonths(q).forEach(function (mo) { var p = calcPay(s, mo); r.gross += p.gross; r.ndEE += p.ndEE; r.taxable += p.taxable; r.tax += Math.round(p.taxable * TAX.pitRate / 100); r.credit += Math.min(p.credit, Math.round(p.taxable * TAX.pitRate / 100)); r.pit += p.pit; });
    if (r.gross) rows.push(r);
  });
  return { title: 'ТТ-11 · ' + q.replace('-Q', ' оны ') + '-р улирал', rows: rows,
    cols: [c('name', 'Ажилтан'), c('regno', 'Регистр'), m('gross', 'Цалин хөлс'), m('ndEE', 'НДШ (ажилтан)'), m('taxable', 'Татвар ногдох орлого'), m('tax', 'Ногдуулсан татвар'), m('credit', 'Хөнгөлөлт'), m('pit', 'Суутгасан ХХОАТ')],
    total: { name: 'Нийт', gross: sum(rows, 'gross'), ndEE: sum(rows, 'ndEE'), taxable: sum(rows, 'taxable'), tax: sum(rows, 'tax'), credit: sum(rows, 'credit'), pit: sum(rows, 'pit') },
    note: 'e-TAX → Тайлан тушаах → ТТ-11-д ажилтан бүрийн мөрийг эдгээр тоогоор бөглөнө. Хөнгөлөлтийн хүснэгт config.js-ийн TAX.pitCredit-д — нягтлантайгаа нэг удаа тулгаарай.' };
}

// ═══════════ ТТ-02 — ААНОАТ бэлтгэл (оны эхнээс өссөн дүнгээр) ═══════════
function tt02Report(k, q) {
  var y = q.slice(0, 4), to = lastDay(qMonths(q)[2]), from = y + '-01-01', E = entJournal(k), p = plData(E, from, to);
  var qp = plData(E, qMonths(q)[0] + '-01', to);
  var rev = p.sales + p.other - p.ret, rows = [];
  var L = function (n, v, b) { rows.push({ name: n, v: Math.round(v), _b: b }); };
  L('Борлуулалтын орлого (цэвэр)', p.net); L('Бусад орлого', p.other); L('Нийт орлого', rev, 1);
  L('Борлуулсан барааны өртөг', -p.cogs); L('Үйл ажиллагааны зардал', -p.expT); L('Татвар төлөхийн өмнөх ашиг', p.profit, 1);
  L('— Хувилбар А: ердийн горим (ашгийн 10%)', Math.max(0, p.profit) * 0.10);
  L('— Хувилбар Б: жижиг ААН (нийт орлогын 1%)', rev * 0.01);
  L('Энэ улирлын орлого (мэдээлэл)', qp.sales + qp.other - qp.ret);
  return { title: 'ТТ-02 бэлтгэл · ' + y + ' оны ' + q.slice(-1) + '-р улирал (оны эхнээс өссөн дүн)', rows: rows, cols: [c('name', 'Үзүүлэлт'), m('v', 'Дүн')],
    note: (ENTITIES[k].type === 'Хувь хүн' ? 'Хувь хүн ААНОАТ тайлагнахгүй — бизнесийн орлогын ХХОАТ-ыг нягтлантайгаа тодруулна. ' : '') +
      'Аль горимд хамаарахыг (жилийн орлогын босго, үйл ажиллагааны чиглэл) нягтлантайгаа заавал тодруулна. И-баримтын тулгалтын тайлантай орлого таарч байгааг шалгаарай.' };
}

// ═══════════ e-Balance — жилийн санхүүгийн тайлан (стандарт маягтын мөрөөр) ═══════════
function ebalanceReport(k, y) {
  var to = y + '-12-31', E = entJournal(k), b = balances(E, to), g = function () { var t = 0; for (var i = 0; i < arguments.length; i++) t += b[arguments[i]] || 0; return t; };
  var p = plData(E, y + '-01-01', to), rows = [];
  var H = function (n) { rows.push({ code: '', name: n, v: '', _b: 1 }); }, L = function (code, n, v, bold) { rows.push({ code: code, name: n, v: Math.round(v), _b: bold }); };
  H('САНХҮҮГИЙН БАЙДЛЫН ТАЙЛАН (' + to + ')');
  var cash = g('10003', '110106', '1101'), rec = g('1201'), oth = g('1207'), inv = g('1404'), pre = g('1503'), fa = g('2001');
  L('1.1.1', 'Мөнгө, түүнтэй адилтгах хөрөнгө', cash); L('1.1.2', 'Дансны авлага', rec); L('1.1.3', 'Бусад авлага', oth); L('1.1.4', 'Бараа материал', inv); L('1.1.5', 'Урьдчилж төлсөн зардал/тооцоо', pre);
  L('1.1', 'Эргэлтийн хөрөнгийн дүн', cash + rec + oth + inv + pre, 1); L('1.2', 'Үндсэн хөрөнгө', fa); L('1', 'НИЙТ ХӨРӨНГӨ', cash + rec + oth + inv + pre + fa, 1);
  var ap = -g('3101'), wage = -g('3301'), tax = -g('3402', '3404'), nd = -g('3403'), loan = -g('3501'), ol = -g('3801');
  L('2.1.1', 'Дансны өглөг', ap); L('2.1.2', 'Цалингийн өглөг', wage); L('2.1.3', 'Татварын өр', tax); L('2.1.4', 'НДШ-ийн өглөг', nd); L('2.1.5', 'Богино хугацаат зээл', loan); L('2.1.6', 'Бусад богино хугацаат өр төлбөр', ol);
  var liab = ap + wage + tax + nd + loan + ol; L('2.1', 'Нийт өр төлбөр', liab, 1);
  var cap = -g('4101'), other = -g('4201'), plAll = 0;
  ACCOUNTS.forEach(function (a) { if (/^(rev|contra|cogs|exp)$/.test(a[2])) plAll -= b[a[0]] || 0; });
  var re = -g('4601') + plAll;
  L('2.2.1', 'Өмч (эздийн оруулсан)', cap); L('2.2.2', 'Эздийн өмчийн бусад хэсэг', other); L('2.2.3', 'Хуримтлагдсан ашиг', re); L('2.2', 'Эздийн өмчийн дүн', cap + other + re, 1);
  L('2', 'НИЙТ ӨР ТӨЛБӨР БА ЭЗДИЙН ӨМЧ', liab + cap + other + re, 1);
  H('ОРЛОГЫН ДЭЛГЭРЭНГҮЙ ТАЙЛАН (' + y + ')');
  var sell = g('7205', '7207'), adm = p.expT - sell;
  L('1', 'Борлуулалтын орлого (цэвэр)', p.net); L('2', 'Борлуулалтын өртөг', -p.cogs); L('3', 'Нийт ашиг', p.gross, 1);
  L('4', 'Бусад орлого', p.other); L('5', 'Борлуулалт, маркетингийн зардал', -sell); L('6', 'Ерөнхий ба удирдлагын зардал', -adm);
  L('7', 'Татвар төлөхийн өмнөх ашиг', p.profit, 1); L('8', 'Орлогын татварын зардал', 0); L('9', 'Тайлант үеийн цэвэр ашиг', p.profit, 1);
  var ok = Math.abs((cash + rec + oth + inv + pre + fa) - (liab + cap + other + re)) < 1;
  return { title: 'e-Balance · ' + ENTITIES[k].name + ' · ' + y + ' он', rows: rows, cols: [c('code', 'Мөр'), c('name', 'Үзүүлэлт'), m('v', 'Дүн')], check: ok,
    note: (ok ? 'Баланс тэнцэж байна. ' : 'АНХААР: баланс тэнцэхгүй байна. ') + 'ebalance.mof.gov.mn-д байгууллагаа сонгоод маягтын мөр бүрт эдгээр дүнг оруулна. Мөрийн дугаар таны маягтынхаас өөр бол нэрээр нь тулгана. Орлогын татварын зардлыг нягтлан бөглөнө.' };
}
function entPlReport(k) { var r = range(), rep = repPL(entJournal(k), r[0], r[1]); rep.title = 'Нэгтгэсэн орлогын тайлан · ' + ENTITIES[k].name; return rep; }

// ═══════════ ТАЙЛАНГИЙН ХУАНЛИ ═══════════
// Тайлан бүрийн давтамж, өдрийг компани бүрээр гараар тохируулна (Календарь → «Тайлангийн тохиргоо»).
// Анхны утга нь e-TAX-ийн «Тайлан тушаах хуулийн хугацаа»-аас: ТТ-11 улирал бүр, ТТ-02 зөвхөн жилийн, НДШ сар бүр.
var TAX_DEFAULT = {
  weiss: { nd: 'month', ndDay: 10, tt11: 'quarter', tt11Day: 20, tt02: 'year', tt02Day: 20, ebalance: 'year' },
  cozy:  { nd: 'month', ndDay: 10, tt11: 'quarter', tt11Day: 20, tt02: 'none', tt02Day: 20, ebalance: 'none' },
};
var taxCfg = {};
function tcfg(k) { return Object.assign({}, TAX_DEFAULT[k] || TAX_DEFAULT.weiss, taxCfg[k] || {}); }
function taxKey(k, x) { return 'TAX|' + k + '|' + x.name; }
function taxDone(k, x) { return (typeof reminders !== 'undefined' ? reminders : []).some(function (r) { return r.kind === 'Тайлан илгээсэн' && r.title === taxKey(k, x); }); }
function taxDeadlines(k, all) {
  var cf = tcfg(k), out = [], now = new Date(), y = now.getFullYear(), D = TAX.due, ind = ENTITIES[k].type === 'Хувь хүн';
  var hasStaff = entStaff(k).some(function (st) { return Number(st.salary) > 0; });
  if (cf.nd === 'month' && hasStaff) for (var i = -1; i <= 3; i++) {
    var d = new Date(y, now.getMonth() + i, 1), prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    out.push({ date: todayStr(new Date(d.getFullYear(), d.getMonth(), Number(cf.ndDay) || 10)), name: 'НДШ тайлан, шимтгэл · ' + todayStr(prev).slice(0, 7), site: 'portal.ndaatgal.mn', go: 'nd8' });
  }
  var periodic = function (code, freq, day, label, go, site) {
    [y - 1, y].forEach(function (yy) {
      var parts = freq === 'quarter' ? [1, 2, 3] : freq === 'half' ? [2] : [];
      parts.forEach(function (q) { out.push({ date: todayStr(new Date(yy, q * 3, Number(day) || 20)), name: label + ' · ' + yy + (freq === 'half' ? ' оны хагас жил' : ' оны ' + q + '-р улирал'), site: site, go: go }); });
      if (freq !== 'none') out.push({ date: (yy + 1) + '-' + (code === 'tt11' ? D.tt11year : D.tt02year), name: label + ' · ' + yy + ' оны жилийн', site: site, go: go });
    });
  };
  if (hasStaff || !ind) periodic('tt11', cf.tt11, cf.tt11Day, 'ТТ-11 ХХОАТ суутгал', 'tt11', 'etax.mta.mn');
  if (!ind) periodic('tt02', cf.tt02, cf.tt02Day, 'ТТ-02 ААНОАТ', 'tt02', 'etax.mta.mn');
  if (cf.ebalance === 'year') [y - 1, y].forEach(function (yy) { out.push({ date: (yy + 1) + '-' + D.ebalance, name: 'e-Balance санхүүгийн тайлан · ' + yy + ' он', site: 'ebalance.mof.gov.mn', go: 'ebalance' }); });
  var t = todayStr(), lim = todayStr(new Date(Date.now() + 120 * 864e5));
  return out.filter(function (x) { return x.date >= todayStr(new Date(Date.now() - 20 * 864e5)) && x.date <= lim; })
    .map(function (x) { x.days = Math.round((new Date(x.date) - new Date(t)) / 864e5); x.done = taxDone(k, x); x.key = taxKey(k, x); return x; })
    .filter(function (x) { return all || !x.done; })
    .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
}
// «Илгээсэн» — тухайн тайланг дахин сануулахгүй (буцаах боломжтой)
function markTaxSent(k, key, date) {
  var r = { date: date || todayStr(), title: key, kind: 'Тайлан илгээсэн', amount: 0, partner: '', co: '', repeat: 'Нэг удаа', note: 'Илгээсэн ' + todayStr(), status: 'Хийгдсэн' };
  if (!API_URL) { r.id = 'R' + Date.now(); reminders.push(r); save('nb_demo_rem', reminders); render(); return; }
  post({ type: 'admin_reminder', reminder: r }, function (err) { if (err) { toast('Алдаа: ' + err); return; } toast('Илгээсэн гэж тэмдэглэгдлээ'); refresh(); });
}
function unmarkTaxSent(key) {
  var r = reminders.filter(function (x) { return x.kind === 'Тайлан илгээсэн' && x.title === key; })[0]; if (!r) return;
  if (!API_URL) { reminders = reminders.filter(function (x) { return x !== r; }); save('nb_demo_rem', reminders); render(); return; }
  post({ type: 'admin_reminder', cancelId: r.id }, function () { refresh(); });
}
function taxCfgCard(k) {
  var cf = tcfg(k), sel = function (id, val, opts) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
  var F = [['none', 'Тушаадаггүй'], ['quarter', 'Улирал бүр + жилийн'], ['half', 'Хагас жил + жилийн'], ['year', 'Зөвхөн жилийн']];
  return '<div class="card"><h2>Тайлангийн тохиргоо · ' + esc(ENTITIES[k].name) + '</h2><p class="muted" style="font-size:13px">e-TAX-ийн «Тайлан тушаах» жагсаалттайгаа тулгаж тохируулна. Буруу бол энд засаад хадгална уу.</p>' +
    '<div class="filter" style="margin-top:8px"><label>НДШ' + sel('tcNd', cf.nd, [['month', 'Сар бүр'], ['none', 'Тушаадаггүй']]) + '</label><label>НДШ өдөр<input id="tcNdDay" type="number" min="1" max="31" value="' + cf.ndDay + '"></label>' +
    '<label>ТТ-11' + sel('tcTt11', cf.tt11, F) + '</label><label>ТТ-11 өдөр<input id="tcTt11Day" type="number" min="1" max="31" value="' + cf.tt11Day + '"></label>' +
    '<label>ТТ-02' + sel('tcTt02', cf.tt02, F) + '</label><label>ТТ-02 өдөр<input id="tcTt02Day" type="number" min="1" max="31" value="' + cf.tt02Day + '"></label>' +
    '<label>e-Balance' + sel('tcEb', cf.ebalance, [['year', 'Жил бүр'], ['none', 'Тушаадаггүй']]) + '</label>' +
    '<label>&nbsp;<button class="b-btn primary" onclick="saveTaxCfg(\'' + k + '\')">Хадгалах</button></label></div>' +
    '<p class="muted" style="font-size:12.5px">Өөр тайлан, хугацаа нэмэх бол Календарь → «+ Сануулга» (төрөл «Татвар, НДШ төлөх»).</p></div>';
}
function saveTaxCfg(k) {
  taxCfg[k] = { nd: $('tcNd').value, ndDay: Number($('tcNdDay').value) || 10, tt11: $('tcTt11').value, tt11Day: Number($('tcTt11Day').value) || 20,
                tt02: $('tcTt02').value, tt02Day: Number($('tcTt02Day').value) || 20, ebalance: $('tcEb').value };
  if (!API_URL) { save('nb_demo_taxcfg', taxCfg); render(); toast('Хадгалагдлаа'); return; }
  post({ type: 'admin_setting', key: 'taxcfg', value: taxCfg }, function (err) { if (err) { toast('Алдаа: ' + err); return; } toast('Хадгалагдлаа'); refresh(); });
}
function taxAlerts() {   // Миний компаниуд дээрх сануулга: 7 хоногийн дотор хугацаа нь дуусах тайлан
  var out = [];
  Object.keys(ENTITIES).forEach(function (k) {
    var hasStaff = entStaff(k).some(function (st) { return Number(st.salary) > 0; });   // ажилтангүй бол НДШ/ТТ-11 сануулахгүй
    taxDeadlines(k).filter(function (x) { return x.days >= 0 && x.days <= 7 && (hasStaff || !/^(nd8|tt11)$/.test(x.go)); }).forEach(function (x) {
      out.push('<div class="alert' + (x.days <= 2 ? ' bad' : '') + '"><div><b>' + esc(x.name) + '</b> — ' + esc(ENTITIES[k].name) + ', ' + x.date + ' (' + (x.days ? x.days + ' хоног үлдлээ' : 'өнөөдөр') + ')</div>' +
        '<div class="pg-act"><button class="b-btn primary" onclick="openTax(\'' + k + '\',\'' + x.go + '\')">Бэлтгэх</button><button class="b-btn" onclick="markTaxSent(\'' + k + '\',' + esc(JSON.stringify(x.key)) + ',\'' + x.date + '\')">Илгээсэн</button></div></div>');
    });
  });
  return out.join('');
}

// ═══════════ ДЭЛГЭЦ ═══════════
function openTax(k, sub) { state.view = 'tax'; if (k) taxState.ent = k; if (sub) taxState.sub = sub; if (/^(payroll|nd8|tt11)$/.test(taxState.sub)) loadJobs(); render(); window.scrollTo(0, 0); }
function taxSubnav() {
  var E = ENTITIES[taxState.ent];
  return '<div class="sub-co"><span class="mono" style="--co:#1E3A5F">' + esc(E.name.charAt(0)) + '</span><div><small>Хуулийн этгээд</small><b>' + esc(E.name) + '</b>' +
    '<select onchange="openTax(this.value)">' + Object.keys(ENTITIES).map(function (k) { return '<option value="' + k + '"' + (k === taxState.ent ? ' selected' : '') + '>' + esc(ENTITIES[k].name) + ' (' + ENTITIES[k].type + ')</option>'; }).join('') + '</select></div></div>' +
    '<div class="sub-title">Татвар, тайлан</div>' + TAX_SUBS.map(function (g) {
      return '<div class="sub-group">' + g[0] + '</div><ul class="sub-list">' + g[1].map(function (s) {
        return '<li><button class="' + (taxState.sub === s[0] ? 'on' : '') + '" onclick="openTax(null,\'' + s[0] + '\')">' + s[1] + '</button></li>'; }).join('') + '</ul>';
    }).join('');
}
function taxView() {
  var k = taxState.ent, E = ENTITIES[k], sub = taxState.sub, label = '';
  TAX_SUBS.forEach(function (g) { g[1].forEach(function (s) { if (s[0] === sub) label = s[1]; }); });
  var info = '<p class="hint">' + esc(E.name) + ' (' + esc(E.type) + (E.regNo ? ', регистр ' + esc(E.regNo) : '') + ') — ' +
    E.biz.map(function (b) { return esc(BUSINESSES[b].name); }).join(' + ') + ' нэгтгэсэн.</p>';
  var monthSel = '<div class="filter"><label>Сар<input type="month" value="' + taxState.month + '" onchange="taxState.month=this.value;render()"></label></div>';
  var qOpts = [], yy = new Date().getFullYear();
  [yy, yy - 1].forEach(function (y) { [4, 3, 2, 1].forEach(function (q) { qOpts.push(y + '-Q' + q); }); });
  var qSel = '<div class="filter"><label>Улирал<select onchange="taxState.quarter=this.value;render()">' + qOpts.map(function (q) {
    return '<option value="' + q + '"' + (q === taxState.quarter ? ' selected' : '') + '>' + q.replace('-Q', ' оны ') + '-р улирал</option>'; }).join('') + '</select></label></div>';
  var ySel = '<div class="filter"><label>Он<select onchange="taxState.year=this.value;render()">' + [yy, yy - 1, yy - 2].map(function (y) {
    return '<option' + (String(y) === taxState.year ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select></label></div>';
  var xl = '<button class="b-btn" onclick="exportTax()">Excel</button><button class="b-btn" onclick="window.print()">Хэвлэх</button>';
  if (sub === 'calendar') {
    var list = taxDeadlines(k, true);
    return pageHead(label, '') + info + '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Хугацаа</th><th>Тайлан</th><th>Хаана</th><th class="n">Үлдсэн</th><th></th></tr>' +
      (list.map(function (x) { var dim = x.done || x.days < 0;
        return '<tr' + (dim ? ' style="color:#9CA3AF"' : '') + '><td>' + x.date + '</td><td>' + esc(x.name) + (x.done ? ' <span class="tag">Илгээсэн</span>' : '') + '</td><td>' + esc(x.site) + '</td><td class="n' + (!x.done && x.days >= 0 && x.days <= 7 ? ' neg' : '') + '">' +
          (x.done ? '' : x.days < 0 ? 'өнгөрсөн' : x.days + ' хоног') + '</td><td class="n">' +
          (x.done ? '<button class="mini" onclick="unmarkTaxSent(' + esc(JSON.stringify(x.key)) + ')">Буцаах</button>' : '<button class="mini" style="color:var(--accent)" onclick="openTax(null,\'' + x.go + '\')">Бэлтгэх</button> <button class="mini" style="color:var(--green)" onclick="markTaxSent(\'' + k + '\',' + esc(JSON.stringify(x.key)) + ',\'' + x.date + '\')">Илгээсэн</button>') + '</td></tr>'; }).join('') ||
       '<tr><td colspan="5" class="muted">Ойрын 4 сард тушаах тайлан алга</td></tr>') +
      '</table></div></div>' + taxCfgCard(k);
  }
  if (sub === 'payroll') {
    var rep = payrollReport(k, taxState.month), posted = payrollPosted(k, taxState.month).length;
    var acts = (posted ? '<button class="b-btn" onclick="cancelPayroll()">Бодолтыг цуцлах</button>' : '<button class="b-btn primary" onclick="postPayroll()">Бодолт хийх (санхүүд бичих)</button>') + xl;
    return pageHead(label, acts) + info + monthSel + (posted ? '<div class="alert"><div>Энэ сарын цалин бодогдож санхүүд бичигдсэн (' + posted + ' мөр). Олгосон цалин «Цалингийн өглөг»-өөс хасагдана.</div></div>' : '') + taxCard(rep);
  }
  if (sub === 'nd8') return pageHead(label, '<button class="b-btn primary" onclick="exportNd8()">НД-8 Excel татах</button><button class="b-btn" onclick="window.print()">Хэвлэх</button>') + info + monthSel + taxCard(nd8Report(k, taxState.month));
  if (sub === 'tt11') return pageHead(label, xl) + info + qSel + taxCard(tt11Report(k, taxState.quarter));
  if (sub === 'tt02') return pageHead(label, xl) + info + qSel + taxCard(tt02Report(k, taxState.quarter));
  if (sub === 'ebalance') return pageHead(label, xl) + info + ySel + taxCard(ebalanceReport(k, taxState.year));
  if (sub === 'entpl') return pageHead(label, xl) + info + periodBar() + taxCard(entPlReport(k));
  return '';
}
function curTaxReport() {
  var k = taxState.ent, s = taxState.sub;
  return s === 'payroll' ? payrollReport(k, taxState.month) : s === 'nd8' ? nd8Report(k, taxState.month) : s === 'tt11' ? tt11Report(k, taxState.quarter) :
    s === 'tt02' ? tt02Report(k, taxState.quarter) : s === 'ebalance' ? ebalanceReport(k, taxState.year) : entPlReport(k);
}
function taxCard(rep) {
  var keep = state.biz; state.biz = entBiz(taxState.ent)[0]; var h = reportCard(rep); state.biz = keep;
  h = h.replace(esc(BUSINESSES[entBiz(taxState.ent)[0]].name), esc(ENTITIES[taxState.ent].name));
  return taxState.sub === 'entpl' ? h : h.replace(/ · \d{4}-\d{2}-\d{2} — \d{4}-\d{2}-\d{2}/, '');   // хугацаа гарчигт нь байгаа
}
function exportTax() {
  var rep = curTaxReport(), wb = XLSX.utils.book_new(), keep = state.biz;
  state.biz = entBiz(taxState.ent)[0];
  XLSX.utils.book_append_sheet(wb, repAoa(rep), 'Тайлан');
  state.biz = keep;
  XLSX.writeFile(wb, (ENTITIES[taxState.ent].name + ' ' + rep.title).replace(/[\\/:*?"<>|·]/g, ' ').replace(/\s+/g, ' ') + '.xlsx');
}
// НДаатгалын мэргэжлийн кодын жагсаалт (300KB) — хэрэгтэй үед л ачаална
function loadJobs(cb) {
  if (window.ND_JOBS) { if (cb) cb(); return; }
  var sc = document.createElement('script'); sc.src = 'nd_jobs.js';
  sc.onload = function () { if (cb) cb(); else render(); };
  document.head.appendChild(sc);
}
