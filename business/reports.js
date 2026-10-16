// ── САНХҮҮ / ТАЙЛАНГИЙН ХӨДӨЛГҮҮР ──
// Баримт бүрээс (борлуулалт, буцаалт, зарлага, касс хаалт, бараа орлого/тооллого/хасалт, цалин, гар журнал)
// давхар бичилтийн журналыг ДҮРМЭЭР тооцоолно. Журнал хадгалагддаггүй тул баримт бүр санхүүд заавал тусна.
// Тайлан бүр { title, cols:[{k,label,num,money}], rows:[{...}], total:{...}, note } хэлбэртэй — дэлгэц + Excel.

// Дансны төлөвлөгөө (Baaz-ийн стандарт кодтой нийцүүлсэн). type: asset | liab | equity | rev | contra | cogs | exp
var ACCOUNTS = [
  ['10003', 'Касс дахь мөнгө', 'asset', 'cash'],
  ['110106', 'Пос-н данс (карт)', 'asset', 'cash'],
  ['1101', 'Байгууллагын харилцах', 'asset', 'cash'],
  ['1201', 'Дансны авлага', 'asset'],
  ['1207', 'Ажилчдаас авах авлага', 'asset'],
  ['1404', 'Бараа', 'asset'],
  ['1503', 'Нийлүүлэгчид төлсөн урьдчилгаа', 'asset'],
  ['2001', 'Үндсэн хөрөнгө', 'asset'],
  ['3101', 'Дансны өглөг', 'liab'],
  ['3301', 'Цалингийн өглөг', 'liab'],
  ['3402', 'НӨАТ-ын өр', 'liab'],
  ['3501', 'Богино хугацаат зээл', 'liab'],
  ['3801', 'Бусад богино хугацаат өр төлбөр', 'liab'],
  ['4101', 'Өмч (эздийн оруулсан)', 'equity'],
  ['4201', 'Эздийн өмчийн бусад хэсэг (эхний үлдэгдэл)', 'equity'],
  ['4601', 'Хуримтлагдсан ашиг', 'equity'],
  ['5101', 'Бараа борлуулсны орлого', 'rev'],
  ['5102', 'Ажил үйлчилгээний орлого', 'rev'],
  ['5201', 'Бусад орлого', 'rev'],
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
];
var ACC = {};
ACCOUNTS.forEach(function (a) { ACC[a[0]] = { code: a[0], name: a[1], type: a[2], cash: a[3] === 'cash' }; });
function accName(c) { return ACC[c] ? ACC[c].name : c; }
function debitNormal(c) { var t = ACC[c] && ACC[c].type; return t === 'asset' || t === 'contra' || t === 'cogs' || t === 'exp'; }

var PAY_ACC = { 'Бэлэн': '10003', 'Карт': '110106', 'Шилжүүлэг': '1101', 'Харилцах': '1101', 'Зээлээр': '3101' };
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
function costEngine(biz, R) {
  var key = biz + '|' + R.records.length + '|' + R.moves.length;
  if (R._ce && R._ce[key]) return R._ce[key];
  var since = '';
  R.moves.forEach(function (m) { if (m.biz === biz) { var d = String(m.date).slice(0, 16); if (!since || d < since) since = d; } });
  var ev = [];
  R.moves.forEach(function (m) { if (m.biz === biz && m.kind !== 'Шилжүүлэг') ev.push({ t: String(m.date).slice(0, 16), m: m }); });
  if (since) R.records.forEach(function (x) {
    if (x.biz !== biz || x.type !== 'sale') return;
    var t = x.date + ' ' + (x.time || '00:00');
    if (t >= since) ev.push({ t: t, x: x });
  });
  ev.sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : (a.m ? -1 : 1); });   // ижил минутад хөдөлгөөн түрүүлнэ
  var it = {}, rec = {}, mv = {}, noCost = {};
  var get = function (k) { return it[k] = it[k] || { q: 0, v: 0, avg: 0 }; };
  var out = function (o, q) { var c = o.q > 0 ? o.v / o.q : o.avg; o.avg = c; o.q -= q; o.v -= q * c; if (Math.abs(o.q) < 1e-9) { o.q = 0; o.v = 0; } return q * c; };
  ev.forEach(function (e) {
    if (e.m) {
      var m = e.m, o = get(m.item), q = Number(m.qty) || 0;
      if (q > 0 && (m.kind === 'Орлого' || m.kind === 'Эхний үлдэгдэл')) {
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
  var add = function (date, doc, ref, dr, cr, amount, desc, partner) {
    amount = Math.round((Number(amount) || 0) * 100) / 100;
    if (!amount) return;
    if (amount < 0) { var t = dr; dr = cr; cr = t; amount = -amount; }
    E.push({ date: date, doc: doc, ref: ref || '', dr: dr, cr: cr, amount: amount, desc: desc || '', partner: partner || '' });
  };
  R.records.forEach(function (x) {
    if (x.biz !== biz) return;
    var a = Number(x.amount) || 0, d = x.date;
    if (x.type === 'sale') {
      var cash = PAY_ACC[x.pay] || '10003';
      var item = String(x.item).replace(/ \(буцаалт\)$/, '');
      var c = Math.abs(ce.rec[x.id] || 0);
      if (a >= 0) {
        add(d, 'Борлуулалт', x.id, cash, '5101', a, item + ' × ' + x.qty + ' (' + (x.pay || 'Бэлэн') + ')');
        if (c) add(d, 'Борлуулалт · өртөг', x.id, '6101', '1404', c, item + ' × ' + x.qty);
      } else {
        add(d, 'Борлуулалтын буцаалт', x.id, '6001', cash, -a, item + ' × ' + Math.abs(x.qty));
        if (c) add(d, 'Буцаалт · өртөг', x.id, '1404', '6101', c, item);
      }
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
    if (m.kind === 'Эхний үлдэгдэл') add(d, 'Барааны эхний үлдэгдэл', m.id, '1404', '4201', v, m.item + ' × ' + m.qty);
    else if (m.kind === 'Орлого') add(d, 'Бараа орлого', m.id, '1404', PAY_ACC[m.pay] || '3101', v, m.item + ' × ' + m.qty + (m.pay ? ' (' + m.pay + ')' : ''), m.partner);
    else if (m.kind === 'Тооллого' || m.kind === 'Хасалт') {
      if (m.qty < 0) add(d, m.kind, m.id, '7302', '1404', v, m.item + ' ' + m.qty);
      else add(d, m.kind, m.id, '1404', '5201', v, m.item + ' +' + m.qty);
    }
  });
  R.salary.forEach(function (e) {
    if (e.biz !== biz) return;   // «Бүх дэлгүүр»-ийн ажилтны цалинг олгохдоо компани сонгоно
    if (e.kind === 'Олгосон' || e.kind === 'Урьдчилгаа') add(e.date, 'Цалин · ' + e.kind, e.id, '7101', '1101', e.amount, e.name + ' · ' + e.month + (e.note ? ' · ' + e.note : ''));
  });
  R.journal.forEach(function (j) {
    if (j.biz !== biz) return;
    add(j.date, 'Журналын бичилт', j.id, j.dr, j.cr, j.amount, j.desc, j.partner);
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
  var sales = -g('5101') - g('5102'), ret = g('6001'), net = sales - ret, cogs = g('6101'), gross = net - cogs;
  var exps = ACCOUNTS.filter(function (a) { return a[2] === 'exp'; }).map(function (a) { return { code: a[0], name: a[1], v: g(a[0]) }; }).filter(function (x) { return x.v; });
  var expT = exps.reduce(function (s, x) { return s + x.v; }, 0), other = -g('5201');
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
    [['1201', 1], ['3101', -1], ['1503', 1]].forEach(function (x) {
      var k = x[0];
      if (e.dr !== k && e.cr !== k) return;
      var nm = e.partner || '(харилцагч заагаагүй)';   // кассаас «татан авалт» төлсөн г.м — нийт дүн дансны үлдэгдэлтэй таарна
      var o = p[nm] = p[nm] || { rec: 0, pay: 0 };
      var v = e.dr === k ? e.amount : -e.amount;
      if (k === '3101') o.pay -= v; else o.rec += v;
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
    if (a >= 0) { o.amount += a; o.qty += Number(x.qty) || 0; o.n++; } else { o.ret += -a; o.qty += Number(x.qty) || 0; }
  });
  return Object.keys(g).map(function (k) { var o = g[k]; o.net = o.amount - o.ret; return o; }).sort(function (a, b) { return b.net - a.net; });
}
function repSalesBy(R, biz, from, to, by) {
  var list = salesIn(R, biz, from, to);
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
function repReceipts(R, biz, from, to) {
  var g = {};
  salesIn(R, biz, from, to).forEach(function (x) {
    var dd = (String(x.note || '').match(/ДДТД (\d+)/) || [])[1];
    var k = x.bill || dd || x.id;
    var o = g[k] = g[k] || { date: x.date, time: x.time, staff: x.staff, pay: x.pay, items: [], amount: 0, ddtd: '', ret: false };
    o.items.push(String(x.item) + ' × ' + x.qty); o.amount += Number(x.amount) || 0;
    if (dd) o.ddtd = dd; if (x.amount < 0) o.ret = true;
  });
  var rows = Object.keys(g).map(function (k) { var o = g[k];
    return { date: o.date + ' ' + o.time, staff: o.staff, items: o.items.join(', '), pay: o.pay, ebarimt: o.ddtd ? (o.ret ? 'Буцаалт · ' : '') + o.ddtd : '—', amount: r0(o.amount) };
  }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return { title: 'Баримтын жагсаалт', cols: [c('date', 'Огноо'), c('staff', 'Худалдагч'), c('items', 'Бараа'), c('pay', 'Төлбөр'), c('ebarimt', 'И-баримт ДДТД'), m('amount', 'Дүн')],
    rows: rows, total: { items: rows.length + ' баримт', amount: sum(rows, 'amount') } };
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
function repItemCard(R, biz, item, from, to) {
  var ev = [], since = costEngine(biz, R).since;
  R.moves.forEach(function (m) { if (m.biz === biz && m.item === item) ev.push({ date: String(m.date).slice(0, 16), doc: m.kind + (m.loc ? ' · ' + m.loc : ''), q: m.qty, note: m.note || m.partner || '' }); });
  R.records.forEach(function (x) { if (x.biz === biz && x.type === 'sale' && since && x.date >= since && String(x.item).replace(/ \(буцаалт\)$/, '') === item) ev.push({ date: x.date + ' ' + x.time, doc: x.amount < 0 ? 'Борлуулалтын буцаалт' : 'Борлуулалт', q: -(Number(x.qty) || 0), note: x.staff || '' }); });
  ev.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  var bal = 0, rows = [];
  ev.forEach(function (e) { bal += e.q; if (e.date.slice(0, 10) >= from && e.date.slice(0, 10) <= to) rows.push({ date: e.date, doc: e.doc, inq: e.q > 0 ? r0(e.q) : '', outq: e.q < 0 ? r0(-e.q) : '', bal: r0(bal), note: e.note }); });
  return { title: 'Барааны карт · ' + item, cols: [c('date', 'Огноо'), c('doc', 'Гүйлгээ'), m('inq', 'Орлого'), m('outq', 'Зарлага'), m('bal', 'Үлдэгдэл'), c('note', 'Тайлбар')], rows: rows };
}
function repReceiptsIn(R, biz, from, to) {
  var rows = R.moves.filter(function (m) { var d = String(m.date).slice(0, 10); return m.biz === biz && (m.kind === 'Орлого' || m.kind === 'Эхний үлдэгдэл') && d >= from && d <= to; })
    .map(function (m) { return { date: m.date, kind: m.kind, item: m.item, loc: m.loc, qty: m.qty, cost: m.cost || '', val: m.cost ? r0(m.qty * m.cost) : '', pay: m.pay || '', partner: m.partner || '', _id: m.id }; }).reverse();
  return { title: 'Бараа орлогын жагсаалт', cols: [c('date', 'Огноо'), c('kind', 'Төрөл'), c('item', 'Бараа'), c('loc', 'Байршил'), m('qty', 'Тоо'), m('cost', 'Нэгж өртөг'),
    m('val', 'Дүн'), c('pay', 'Төлбөр'), c('partner', 'Нийлүүлэгч')], rows: rows, total: { item: rows.length + ' мөр', val: sum(rows, 'val') } };
}

// ── туслах ──
function c(k, label) { return { k: k, label: label }; }
function m(k, label) { return { k: k, label: label, num: true }; }
function sum(rows, k) { return r0(rows.reduce(function (s, r) { return s + (Number(r[k]) || 0); }, 0)); }
