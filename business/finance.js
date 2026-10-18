// ── САНХҮҮ (цэгцэлсэн) ──
// Цөөн цэс: Үр дүн · Сар бүрээр · Барааны ашиг · Орлого, зарлага · Банкны хуулга · Кассын баримт · Авлага, өглөг, зээл · Цалин, НДШ ·
// Сар бүрийн ажил · Нягтлангийн тайлан · Тохиргоо. Дүн бүр дээр дарахад тэр дүн юунаас бүрдсэнийг (задрал) харуулна.

// ═══════════ ЗАДРАЛ ═══════════
// spec: { t: гарчиг, acc: [данс], from, to, sign: 1|-1, grp: бүлэглэх, only: нэг бүлэг, partner, other: [харьцсан данс], dir: 1 (зөвхөн эерэг), bal: үлдэгдэлтэй }
var DRILL = [], DRILLM = [], drillStack = [], drillCur = null;
function dl(spec, html) { DRILL.push(spec); return '<a class="dl" onclick="drill(' + (DRILL.length - 1) + ')">' + html + '</a>'; }
function dlm(spec, html) { DRILLM.push(spec); return '<a class="dl" onclick="drillIn(' + (DRILLM.length - 1) + ')">' + html + '</a>'; }
function mny(v) { v = Math.round(Number(v) || 0); return (v < 0 ? '−' : '') + fmt(Math.abs(v)); }
function cashCodes() { return ACCOUNTS.filter(function (a) { return a[3] === 'cash'; }).map(function (a) { return a[0]; }); }
function accsOf(type) { return ACCOUNTS.filter(function (a) { return a[2] === type; }).map(function (a) { return a[0]; }); }
function loanCodes() { return ACCOUNTS.filter(function (a) { return /^35/.test(a[0]); }).map(function (a) { return a[0]; }); }
var EXP_SHORT = { '7101': 'Цалин', '7102': 'НДШ (ажил олгогч)', '7201': 'Түрээс', '7202': 'Цахилгаан, ус', '7203': 'Тээвэр', '7204': 'Сав, баглаа', '7205': 'Маркетинг, зар',
  '7206': 'Засвар', '7207': 'Хүргэлт (буухиа)', '7301': 'Бусад зардал', '7302': 'Барааны хорогдол', '7303': 'Кассын дутагдал' };
// Мөнгөний гүйлгээний төрөл (хуучин хүснэгтийн «Гүйлгээний төрөл» шиг)
function moneyType(x) {
  var o = String(x.other), isIn = (x.raw !== undefined ? x.raw : x.v) > 0;   // raw — тэмдэг солихоос өмнөх чиглэл (данс руу орсон бол +)
  if (ACC[o] && ACC[o].cash) return 'Данс хооронд';
  if (o === '5101' || o === '5102') return x.acc === '110106' ? 'Пос (карт) орлого' : 'Борлуулалтын орлого';
  if (o === '1201') return 'Авлага төлөгдсөн';
  if (o === '3802') return 'Захиалгын урьдчилгаа';
  if (o === '6001') return 'Бараа буцаалт';
  if (/^35/.test(o)) return isIn ? 'Зээл авсан' : 'Зээл төлөлт';
  if (o === '4101' || o === '4201') return isIn ? 'Эзэн мөнгө оруулсан' : 'Эзэн мөнгө авсан';
  if (o === '3101' || o === '1404' || o === '6101' || o === '1503') return isIn ? 'Нийлүүлэгчээс буцаасан' : 'Бараа татан авалт';
  if (o === '7101' || o === '3301' || o === '1207') return 'Цалин';
  if (o === '7102' || o === '3403' || o === '3404' || o === '3402') return 'НДШ, татвар';
  if (x.doc === 'Зарлага') return String(x.desc).split(' · ')[0] || 'Бусад зардал';   // ажилтны сонгосон ангилал (Шатахуун г.м)
  if (o === '5201') return 'Бусад орлого';
  return EXP_SHORT[o] || accName(o);
}
var GRP_LABEL = { item: 'Бараагаар', cat: 'Утгаар', type: 'Төрлөөр', partner: 'Харилцагчаар', acc: 'Дансаар', month: 'Сараар' };
var GRP_COL = { item: 'Бараа', cat: 'Утга', type: 'Төрөл', partner: 'Харилцагч', acc: 'Данс', month: 'Сар' };
function drillKey(g, x) {
  if (g === 'item') return String(x.desc).split(' × ')[0].split(' · ')[0].replace(/ [+-]?\d+(\.\d+)?$/, '');
  if (g === 'cat') return x.doc === 'Зарлага' ? String(x.desc).split(' · ')[0] : String(x.desc).split(' · ')[0].split(' #')[0].slice(0, 60) || x.doc;
  if (g === 'type') return moneyType(x);
  if (g === 'partner') return x.partner || '(харилцагч заагаагүй)';
  if (g === 'acc') return (EXP_SHORT[x.acc] || accName(x.acc));
  if (g === 'month') return x.date.slice(0, 7);
  return '';
}
function drillLines(s, E) {
  E = E || J();
  var A = {}; s.acc.forEach(function (k) { A[k] = 1; });
  var from = s.from || '', to = s.to || '9999-12-31', out = [], open = 0;
  E.forEach(function (e) {
    var inD = !!A[e.dr], inC = !!A[e.cr];
    if (inD === inC || e.date > to) return;
    if (s.partner !== undefined && (e.partner || '(харилцагч заагаагүй)') !== s.partner) return;
    var raw = inD ? e.amount : -e.amount;
    var x = { date: e.date, doc: e.doc, desc: e.desc, partner: e.partner, acc: inD ? e.dr : e.cr, other: inD ? e.cr : e.dr, raw: raw, v: raw * (s.sign || 1) };
    if (s.other && s.other.indexOf(x.other) < 0) return;
    if (from && e.date < from) { if (s.bal) open += x.v; return; }
    if (s.dir && x.v * s.dir <= 0) return;
    x.key = drillKey(s.grp, x);
    if (s.only !== undefined && x.key !== s.only) return;
    out.push(x);
  });
  return { lines: out, open: open };
}
function drill(i) { var s = DRILL[i]; if (!s) return; drillStack = []; drillCur = s; drillRender(); openSheet('drillSheet'); }
function drillIn(i) { var s = DRILLM[i]; if (!s) return; drillStack.push(drillCur); drillCur = s; drillRender(); }
function drillBack() { drillCur = drillStack.pop(); if (!drillCur) { closeSheet('drillSheet'); return; } drillRender(); }
function drillRender() {
  var s = drillCur, d = drillLines(s), L = d.lines, mov = L.reduce(function (a, x) { return a + x.v; }, 0), tot = (s.bal ? d.open : 0) + mov;
  DRILLM = [];
  var G = {}, keys = [];
  L.forEach(function (x) { if (!G[x.key]) { G[x.key] = { n: 0, v: 0, in: 0, out: 0 }; keys.push(x.key); } var g = G[x.key]; g.n++; g.v += x.v; if (x.v > 0) g.in += x.v; else g.out -= x.v; });
  var grp = '';
  if (s.grp && s.only === undefined && keys.length > 1) {
    keys.sort(function (a, b) { return Math.abs(G[b].v) - Math.abs(G[a].v); });
    var base = keys.reduce(function (a, k) { return a + Math.abs(G[k].v); }, 0) || 1, two = keys.some(function (k) { return G[k].in && G[k].out; });
    grp = '<h3 class="dr-h">' + GRP_LABEL[s.grp] + ' задлах</h3><div class="scroll"><table class="rep-t"><tr><th>' + GRP_COL[s.grp] + '</th><th class="n">Гүйлгээ</th>' +
      (two ? '<th class="n">Нэмэгдсэн</th><th class="n">Хасагдсан</th>' : '') + '<th class="n">Дүн</th><th class="n">Хувь</th></tr>' + keys.map(function (k) {
        var g = G[k];
        return '<tr><td>' + dlm(Object.assign({}, s, { only: k, t: s.t + ' · ' + k }), esc(k)) + '</td><td class="n">' + g.n + '</td>' +
          (two ? '<td class="n">' + (g.in ? mny(g.in) : '') + '</td><td class="n">' + (g.out ? mny(-g.out) : '') + '</td>' : '') +
          '<td class="n' + (g.v < 0 ? ' neg' : '') + '">' + mny(g.v) + '</td><td class="n">' + Math.round(Math.abs(g.v) / base * 100) + '%</td></tr>';
      }).join('') + '<tr class="tot"><td>Нийт</td><td class="n">' + L.length + '</td>' + (two ? '<td></td><td></td>' : '') + '<td class="n">' + mny(mov) + '</td><td></td></tr></table></div>';
  }
  var MAX = 500, shown = L.slice(-MAX), run = (s.bal ? d.open : 0) + L.slice(0, L.length - shown.length).reduce(function (a, x) { return a + x.v; }, 0);
  var lines = '<h3 class="dr-h">Гүйлгээнүүд</h3><div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Гүйлгээний утга</th><th>Харилцагч</th><th>' + (s.grp === 'type' ? 'Төрөл' : 'Хаанаас / хаашаа') + '</th><th class="n">Дүн</th>' + (s.bal ? '<th class="n">Үлдэгдэл</th>' : '') + '</tr>' +
    (s.bal ? '<tr class="b"><td>' + esc(s.from || '') + '</td><td>Эхний үлдэгдэл</td><td></td><td></td><td></td><td class="n">' + mny(run) + '</td></tr>' : '') +
    (shown.length ? shown.map(function (x) {
      run += x.v;
      return '<tr><td>' + esc(x.date) + '</td><td style="white-space:normal;min-width:220px">' + esc(x.desc) + '</td><td>' + esc(x.partner || '') + '</td><td>' + esc(s.grp === 'type' ? x.key : (EXP_SHORT[x.other] || accName(x.other))) + '</td>' +
        '<td class="n' + (x.v < 0 ? ' neg' : '') + '">' + mny(x.v) + '</td>' + (s.bal ? '<td class="n">' + mny(run) + '</td>' : '') + '</tr>';
    }).join('') : '<tr><td colspan="6" class="muted">Гүйлгээ алга</td></tr>') + '</table></div>' +
    (L.length > MAX ? '<p class="muted" style="font-size:12px">Сүүлийн ' + MAX + ' гүйлгээг харууллаа (нийт ' + L.length + '). Бүгдийг Excel-ээр татна уу.</p>' : '');
  var per = s.from && s.from > '2000-01-01' ? s.from + ' — ' + s.to : (s.to ? s.to + ' хүртэл' : '');
  $('drBody').innerHTML = '<div class="dr-top"><div><div class="muted" style="font-size:12px">' + esc(BUSINESSES[state.biz].name) + ' · ' + esc(per) + '</div><h2>' + esc(s.t || 'Задрал') + '</h2></div>' +
    '<div class="dr-tot"><span class="muted">' + (s.bal ? 'Үлдэгдэл' : 'Нийт') + '</span><b>' + mny(tot) + '</b></div></div>' +
    (s.bal && d.open ? '<p class="muted" style="font-size:12.5px">Эхний үлдэгдэл ' + mny(d.open) + (mov >= 0 ? ' + ' : ' − ') + 'энэ хугацааны хөдөлгөөн ' + mny(Math.abs(mov)) + ' = ' + mny(tot) + '</p>' : '') +
    grp + lines;
  $('drBack').style.display = drillStack.length ? '' : 'none';
}
function drillExcel() {
  if (!window.XLSX || !drillCur) { toast('Excel сан ачаалагдаагүй — интернэтээ шалгана уу'); return; }
  var s = drillCur, d = drillLines(s), run = s.bal ? d.open : 0;
  var aoa = [[s.t || 'Задрал'], [BUSINESSES[state.biz].name + ' · ' + (s.from || '') + ' — ' + (s.to || '')], [], ['Огноо', 'Гүйлгээний утга', 'Харилцагч', 'Хаанаас / хаашаа', 'Дүн'].concat(s.bal ? ['Үлдэгдэл'] : [])];
  if (s.bal) aoa.push([s.from || '', 'Эхний үлдэгдэл', '', '', '', r0(run)]);
  d.lines.forEach(function (x) { run += x.v; aoa.push([x.date, x.desc, x.partner || '', s.grp === 'type' ? x.key : accName(x.other), r0(x.v)].concat(s.bal ? [r0(run)] : [])); });
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Задрал'); XLSX.writeFile(wb, xlsxName(s.t || 'задрал'));
}

// ═══════════ ҮР ДҮН (санхүүгийн гол хуудас) ═══════════
function simpleView() {
  var r = range(), f = r[0], t = r[1], td = todayStr(), E = J(), p = plData(E, f, t), b = balances(E, td);
  var g = function (k) { return b[k] || 0; };
  var REV = ['5101', '5102'], PLA = accsOf('rev').concat(accsOf('contra'), accsOf('cogs'), accsOf('exp')), cash = cashCodes(), loans = loanCodes();
  var fl = function (acc, sign, grp, title, x) { return Object.assign({ acc: acc, from: f, to: t, sign: sign, grp: grp, t: title }, x || {}); };
  var bl = function (acc, sign, grp, title, x) { return Object.assign({ acc: acc, from: f, to: td, sign: sign, grp: grp, t: title, bal: true }, x || {}); };
  var line = function (label, v, spec, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td><td class="n' + (v < 0 ? ' neg' : '') + '">' + (spec ? dl(spec, mny(v)) : mny(v)) + '</td></tr>'; };
  var moneyTot = cash.reduce(function (a, k) { return a + g(k); }, 0);
  var flow = drillLines({ acc: cash, from: f, to: t, sign: 1 }, E).lines, fin = 0, fout = 0;
  flow.forEach(function (x) { if (x.v > 0) fin += x.v; else fout -= x.v; });
  var pr = repPartners(E, td).rows;
  var recv = pr.filter(function (x) { return x.rec > 0.5; }).sort(function (a, c2) { return c2.rec - a.rec; });
  var pays = pr.filter(function (x) { return x.pay > 0.5; }).sort(function (a, c2) { return c2.pay - a.pay; });
  var loanBal = -loans.reduce(function (a, k) { return a + g(k); }, 0), payTot = sum(pays, 'pay') + Math.max(0, loanBal);
  var sentence = 'Энэ хугацаанд <b>' + mny(p.net) + '</b>-ийн бараа зарж, түүнээс <b>' + mny(p.cogs) + '</b> нь барааны өртөг, <b>' + mny(p.expT) + '</b> нь бусад зардал байлаа. ' +
    (p.profit >= 0 ? 'Үр дүнд нь <b style="color:var(--green)">' + mny(p.profit) + '</b> ашигтай ажилласан.' : '<b style="color:var(--red)">' + mny(-p.profit) + '</b> алдагдалтай ажилласан.');
  var pct = p.net ? ' <small class="muted">(' + Math.round(p.gross / p.net * 100) + '%)</small>' : '';
  return '<p class="hint">Доогуур зураастай дүн дээр дарвал тэр дүн юунаас бүрдсэнийг (задрал) харна.</p>' +
    '<div class="kpis">' +
      kpi('Борлуулалт', dl(fl(REV.concat(['6001']), -1, 'item', 'Цэвэр борлуулалт'), mny(p.net))) +
      kpi('Цэвэр ашиг', dl(fl(PLA, -1, 'acc', 'Цэвэр ашиг'), mny(p.profit))) +
      kpi('Мөнгө (өнөөдөр)', dl(bl(cash, 1, 'type', 'Нийт мөнгө'), mny(moneyTot))) +
      kpi('Авлага', dl({ acc: ['1201'], to: td, sign: 1, grp: 'partner', t: 'Авлага — танд өгөх ёстой' }, mny(g('1201')))) +
      kpi('Өглөг, зээл', dl({ acc: ['3101', '3802'].concat(loans), to: td, sign: -1, grp: 'partner', t: 'Өглөг, зээл — таны өгөх ёстой' }, mny(payTot))) +
    '</div>' +
    '<div class="card"><h2>Ашиг, алдагдал</h2><p style="font-size:14px;line-height:1.7;margin:0 0 8px">' + sentence + '</p>' +
    '<div class="grid2"><table class="rep-t">' +
      line('Борлуулалт', p.sales, fl(REV, -1, 'item', 'Борлуулалт')) +
      (p.ret ? line('Буцаалт', -p.ret, fl(['6001'], 1, 'item', 'Борлуулалтын буцаалт')) : '') +
      line('Барааны өртөг', -p.cogs, fl(['6101'], 1, 'item', 'Барааны өртөг')) +
      '<tr class="b"><td>Нийт ашиг' + pct + '</td><td class="n">' + dl(fl(REV.concat(['6001', '6101']), -1, 'item', 'Нийт ашиг (бараагаар)'), mny(p.gross)) + '</td></tr>' +
      line('Зардал', -p.expT, fl(accsOf('exp'), 1, 'acc', 'Зардал')) +
      (p.other ? line('Бусад орлого', p.other, fl(['5201'], -1, 'cat', 'Бусад орлого')) : '') +
      '<tr class="tot"><td>Цэвэр ашиг</td><td class="n' + (p.profit < 0 ? ' neg' : '') + '">' + dl(fl(PLA, -1, 'acc', 'Цэвэр ашиг'), mny(p.profit)) + '</td></tr></table>' +
    '<table class="rep-t"><tr><th>Зардал юунд гарсан</th><th class="n">Дүн</th></tr>' + (p.exps.length ? p.exps.slice().sort(function (a, c2) { return c2.v - a.v; }).map(function (x) {
      return line(esc(EXP_SHORT[x.code] || x.name), x.v, fl([x.code], 1, 'cat', EXP_SHORT[x.code] || x.name)); }).join('') +
      '<tr class="tot"><td>Нийт</td><td class="n">' + dl(fl(accsOf('exp'), 1, 'acc', 'Зардал'), mny(p.expT)) + '</td></tr>' : '<tr><td class="muted">Зардал алга</td><td></td></tr>') + '</table></div>' +
    '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="setSub(\'months\')">Сар бүрээр</button><button class="b-btn" onclick="setSub(\'profit\')">Бараа тус бүрийн ашиг</button></div></div>' +
    '<div class="grid2"><div class="card"><h2>Мөнгө хаана байна (өнөөдөр)</h2><table class="rep-t">' +
      cash.filter(function (k) { return Math.abs(g(k)) >= 1; }).map(function (k) { return line(esc(accName(k)), g(k), bl([k], 1, 'type', accName(k))); }).join('') +
      '<tr class="tot"><td>Нийт мөнгө</td><td class="n">' + dl(bl(cash, 1, 'type', 'Нийт мөнгө'), mny(moneyTot)) + '</td></tr></table>' +
      '<table class="rep-t" style="margin-top:8px">' + line('Энэ хугацаанд орсон', fin, fl(cash, 1, 'type', 'Орсон мөнгө', { dir: 1 })) + line('Энэ хугацаанд гарсан', -fout, fl(cash, -1, 'type', 'Гарсан мөнгө', { dir: 1 })) + '</table>' +
      '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="setSub(\'money\')">Орлого, зарлага</button><button class="b-btn" onclick="setSub(\'bank\')">Банкны хуулга</button></div></div>' +
    '<div class="card"><h2>Бараа</h2><table class="rep-t">' + line('Үлдэгдэл бараа (авсан үнээр)', g('1404'), { acc: ['1404'], to: td, sign: 1, grp: 'item', t: 'Барааны үлдэгдэл (авсан үнээр)' }) + '</table>' +
      '<p class="muted" style="font-size:12.5px;margin-top:6px">Дэлгүүр, агуулахад байгаа барааг та хэдээр авсан бэ.</p></div></div>' +
    '<div class="grid2"><div class="card"><h2>Танд өртэй (авлага)</h2><table class="rep-t">' + (recv.length ? recv.slice(0, 8).map(function (x) {
        return line(esc(x.name), x.rec, { acc: ['1201'], partner: x.name, to: td, sign: 1, bal: true, t: x.name + ' — авлага' }); }).join('') +
      '<tr class="tot"><td>Нийт' + (recv.length > 8 ? ' (' + recv.length + ' харилцагч)' : '') + '</td><td class="n">' + dl({ acc: ['1201'], to: td, sign: 1, grp: 'partner', t: 'Авлага' }, mny(sum(recv, 'rec'))) + '</td></tr>' : '<tr><td class="muted">Авлага алга</td><td></td></tr>') + '</table>' +
      '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="state.dtab=\'r\';setSub(\'debts\')">Дэлгэрэнгүй</button></div></div>' +
    '<div class="card"><h2>Таны өр (өглөг, зээл)</h2><table class="rep-t">' + pays.slice(0, 8).map(function (x) {
        return line(esc(x.name), x.pay, { acc: ['3101', '3802'], partner: x.name, to: td, sign: -1, bal: true, t: x.name + ' — өглөг' }); }).join('') +
      (loanBal > 0.5 ? line('Банкны зээл', loanBal, { acc: loans, to: td, sign: -1, grp: 'acc', t: 'Зээл' }) : '') +
      (payTot > 0.5 ? '<tr class="tot"><td>Нийт</td><td class="n">' + dl({ acc: ['3101', '3802'].concat(loans), to: td, sign: -1, grp: 'partner', t: 'Өглөг, зээл' }, mny(payTot)) + '</td></tr>' : '<tr><td class="muted">Өр алга</td><td></td></tr>') + '</table>' +
      '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="state.dtab=\'p\';setSub(\'debts\')">Дэлгэрэнгүй</button><button class="b-btn" onclick="openRem(null,{kind:\'Өглөг төлөх\'})">Төлөх өдрөө сануулах</button></div></div></div>' +
    simpleTodo();
}

// ═══════════ ОН СОНГОХ ═══════════
function yearOf() { return state.year || todayStr().slice(0, 4); }
function yearBar() {
  var y0 = Number(todayStr().slice(0, 4)), first = y0;
  records.concat(journal).forEach(function (x) { if (x.biz === state.biz) { var y = Number(String(x.date).slice(0, 4)); if (y > 2000 && y < first) first = y; } });
  var opts = []; for (var y = y0; y >= first; y--) opts.push('<option' + (String(y) === yearOf() ? ' selected' : '') + '>' + y + '</option>');
  return '<div class="filter"><label>Он<select onchange="state.year=this.value;render()">' + opts.join('') + '</select></label></div>';
}
function monthsOf(y) {
  var td = todayStr(), last = y === td.slice(0, 4) ? Number(td.slice(5, 7)) : y > td.slice(0, 4) ? 0 : 12, out = [];
  for (var i = 1; i <= last; i++) out.push(y + '-' + ('0' + i).slice(-2));
  return out;
}

// ═══════════ САР БҮРЭЭР (хуучин хүснэгтийн сарын хураангуй) ═══════════
function repMonths(E, y) {
  var cash = cashCodes(), REV = ['5101', '5102'], PLA = accsOf('rev').concat(accsOf('contra'), accsOf('cogs'), accsOf('exp'));
  var mk = function (f, t, closeAt) {
    var p = plData(E, f, t), fin = 0, fout = 0, b = balances(E, closeAt);
    drillLines({ acc: cash, from: f, to: t, sign: 1 }, E).lines.forEach(function (x) { if (x.v > 0) fin += x.v; else fout -= x.v; });
    var lab = f.slice(0, 7) === t.slice(0, 7) ? f.slice(0, 7) : y + ' он';
    var S = function (acc, sign, grp, title, x) { return Object.assign({ acc: acc, from: f, to: t, sign: sign, grp: grp, t: title + ' · ' + lab }, x || {}); };
    return { sales: r0(p.net), cogs: r0(p.cogs), gross: r0(p.gross), exp: r0(p.expT), profit: r0(p.profit), in: r0(fin), out: r0(fout),
      cash: r0(cash.reduce(function (a, k) { return a + (b[k] || 0); }, 0)),
      _d: { sales: S(REV.concat(['6001']), -1, 'item', 'Борлуулалт'), cogs: S(['6101'], 1, 'item', 'Өртөг'), gross: S(REV.concat(['6001', '6101']), -1, 'item', 'Нийт ашиг'),
            exp: S(accsOf('exp'), 1, 'acc', 'Зардал'), profit: S(PLA, -1, 'acc', 'Цэвэр ашиг'), in: S(cash, 1, 'type', 'Орсон мөнгө', { dir: 1 }), out: S(cash, -1, 'type', 'Гарсан мөнгө', { dir: 1 }),
            cash: { acc: cash, from: f, to: closeAt, sign: 1, grp: 'type', bal: true, t: 'Мөнгө · ' + lab } } };
  };
  var ms = monthsOf(y), rows = ms.map(function (mm) { var o = mk(mm + '-01', lastDayOf(mm), lastDayOf(mm)); o.m = mm; return o; });
  var tot = ms.length ? mk(y + '-01-01', lastDayOf(ms[ms.length - 1]), lastDayOf(ms[ms.length - 1])) : {};
  tot.m = 'Нийт ' + y;
  rows = blankZero(rows);
  return { title: y + ' он — сар бүрийн дүн', rows: rows, total: tot,
    cols: [c('m', 'Сар'), m('sales', 'Борлуулалт'), m('cogs', 'Өртөг'), m('gross', 'Нийт ашиг'), m('exp', 'Зардал'), m('profit', 'Цэвэр ашиг'), m('in', 'Орсон мөнгө'), m('out', 'Гарсан мөнгө'), m('cash', 'Сарын эцсийн мөнгө')] };
}
// Гүйлгээгүй эхний саруудыг хасаж, 0 дүнг хоосон харуулна (уншихад амар)
function blankZero(rows) {
  var busy = function (r) { return Object.keys(r).some(function (k) { return k !== 'm' && k !== '_d' && Math.abs(Number(r[k]) || 0) >= 1; }); };
  while (rows.length > 1 && !busy(rows[0])) rows.shift();
  rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (k !== 'm' && k !== '_d' && Math.abs(Number(r[k]) || 0) < 0.5) r[k] = ''; }); });
  return rows;
}
// Мөнгө төрлөөр × сар (хуучин хүснэгтийн «Гүйлгээний төрөл» баганууд)
function monthTypeCard(E, y) {
  var cash = cashCodes(), ms = monthsOf(y); if (!ms.length) return '';
  var L = drillLines({ acc: cash, from: y + '-01-01', to: lastDayOf(ms[ms.length - 1]), sign: 1, grp: 'type' }, E).lines, T = { in: {}, out: {} };
  if (L.length) ms = ms.filter(function (mm) { return mm >= L[0].date.slice(0, 7); });
  L.forEach(function (x) { var dir = x.v > 0 ? 'in' : 'out', o = T[dir][x.key] = T[dir][x.key] || { tot: 0 }, mm = x.date.slice(0, 7); o[mm] = (o[mm] || 0) + Math.abs(x.v); o.tot += Math.abs(x.v); });
  var sec = function (dir, title, sign) {
    var keys = Object.keys(T[dir]).sort(function (a, b) { return T[dir][b].tot - T[dir][a].tot; });
    if (!keys.length) return '<tr class="b"><td>' + title + '</td><td colspan="' + (ms.length + 1) + '" class="muted">алга</td></tr>';
    var cell = function (k, mm, v) { return '<td class="n">' + (v ? dl({ acc: cash, from: mm ? mm + '-01' : y + '-01-01', to: mm ? lastDayOf(mm) : lastDayOf(ms[ms.length - 1]), sign: sign, dir: 1, grp: 'type', only: k, t: (k || title) + ' · ' + (mm || y) }, mny(v)) : '') + '</td>'; };
    var colTot = function (mm) { return keys.reduce(function (a, k) { return a + (T[dir][k][mm] || 0); }, 0); };
    return '<tr class="b"><td>' + title + '</td>' + ms.map(function (mm) { var v = colTot(mm); return '<td class="n">' + (v ? dl({ acc: cash, from: mm + '-01', to: lastDayOf(mm), sign: sign, dir: 1, grp: 'type', t: title + ' · ' + mm }, mny(v)) : '') + '</td>'; }).join('') +
      '<td class="n">' + dl({ acc: cash, from: y + '-01-01', to: lastDayOf(ms[ms.length - 1]), sign: sign, dir: 1, grp: 'type', t: title + ' · ' + y }, mny(keys.reduce(function (a, k) { return a + T[dir][k].tot; }, 0))) + '</td></tr>' +
      keys.map(function (k) { return '<tr><td style="padding-left:16px">' + esc(k) + '</td>' + ms.map(function (mm) { return cell(k, mm, T[dir][k][mm]); }).join('') + cell(k, '', T[dir][k].tot) + '</tr>'; }).join('');
  };
  return '<div class="card rep"><div class="rep-cap"><b>Мөнгө хаанаас орж, хаашаа гарсан — сар бүр</b><span>Касс, банкны бүх данс · данс хоорондын шилжүүлэг ороогүй</span></div><div class="scroll"><table class="rep-t">' +
    '<tr><th>Төрөл</th>' + ms.map(function (mm) { return '<th class="n">' + mm.slice(5) + '-р сар</th>'; }).join('') + '<th class="n">Нийт</th></tr>' +
    sec('in', 'Орсон мөнгө', 1) + sec('out', 'Гарсан мөнгө', -1) + '</table></div></div>';
}

// ═══════════ БАРААНЫ АШИГ (хуучин «тайлан» хуудас) ═══════════
function repProfit(Rr, biz, f, t) {
  var base = repSalesBy(Rr, biz, f, t, 'item'), noc = 0;
  var rows = base.rows.map(function (r) {
    var has = r.cogs !== '';
    if (!has && r.net) noc++;
    var S = function (acc, sign, title) { return { acc: acc, from: f, to: t, sign: sign, grp: 'item', only: r.key, t: r.key + ' — ' + title }; };
    return { key: r.key, qty: r.qty, net: r.net, avg: r.qty ? r0(r.net / r.qty) : '', cogs: r.cogs, margin: r.margin, pct: has && r.net ? Math.round(r.margin / r.net * 100) + '%' : '',
      _d: { net: S(['5101', '5102', '6001'], -1, 'борлуулалт'), cogs: S(['6101'], 1, 'өртөг'), margin: S(['5101', '5102', '6001', '6101'], -1, 'ашиг') } };
  }).sort(function (a, b) { return (Number(b.margin) || 0) - (Number(a.margin) || 0) || b.net - a.net; });
  var tot = { key: 'Нийт', net: sum(rows, 'net'), cogs: sum(rows, 'cogs'), margin: sum(rows, 'margin') };
  tot.pct = tot.net && tot.cogs ? Math.round(tot.margin / tot.net * 100) + '%' : '';
  tot._d = { net: { acc: ['5101', '5102', '6001'], from: f, to: t, sign: -1, grp: 'item', t: 'Цэвэр борлуулалт' }, cogs: { acc: ['6101'], from: f, to: t, sign: 1, grp: 'item', t: 'Барааны өртөг' },
             margin: { acc: ['5101', '5102', '6001', '6101'], from: f, to: t, sign: -1, grp: 'item', t: 'Нийт ашиг (бараагаар)' } };
  return { title: 'Бараа тус бүрийн ашиг', rows: rows, total: tot,
    cols: [c('key', 'Бараа'), m('qty', 'Тоо'), m('net', 'Борлуулалт'), m('avg', 'Дундаж үнэ'), m('cogs', 'Өртөг'), m('margin', 'Ашиг'), c('pct', 'Ашгийн %')],
    note: noc ? noc + ' барааны авсан үнэ (өртөг) бүртгэгдээгүй тул ашиг нь тооцогдоогүй — «Бараа» → «Орлого»-оор авсан үнийг оруулна уу.' : '' };
}

// ═══════════ ОРЛОГО, ЗАРЛАГА (хуучин хүснэгтийн банкны хуудас шиг) ═══════════
function moneyAccs() { var s = state.macc || 'all'; return s === 'all' ? cashCodes() : [s]; }
function repMoney(E, f, t) {
  var A = moneyAccs(), all = A.length > 1, d = drillLines({ acc: A, from: f, to: t, sign: 1, grp: 'type', bal: true }, E), run = d.open;
  var rows = [{ date: f, desc: 'Эхний үлдэгдэл', bal: r0(d.open), _b: 1 }];
  d.lines.forEach(function (x) {
    run += x.v;
    rows.push({ date: x.date, acc: accName(x.acc), desc: x.desc, partner: x.partner, type: x.key, in: x.v > 0 ? r0(x.v) : '', out: x.v < 0 ? r0(-x.v) : '', bal: r0(run) });
  });
  var cols = [c('date', 'Огноо')].concat(all ? [c('acc', 'Данс')] : [], [c('desc', 'Гүйлгээний утга'), c('partner', 'Харилцагч'), c('type', 'Төрөл'), m('in', 'Орлого'), m('out', 'Зарлага'), m('bal', 'Үлдэгдэл')]);
  var tin = sum(rows, 'in'), tout = sum(rows, 'out');
  return { title: 'Орлого, зарлага · ' + (all ? 'бүх данс' : A[0] + ' ' + accName(A[0])), rows: rows, cols: cols,
    total: { desc: 'Эцсийн үлдэгдэл', in: tin, out: tout, bal: r0(run),
      _d: { in: { acc: A, from: f, to: t, sign: 1, dir: 1, grp: 'type', t: 'Орсон мөнгө' }, out: { acc: A, from: f, to: t, sign: -1, dir: 1, grp: 'type', t: 'Гарсан мөнгө' },
            bal: { acc: A, from: f, to: t, sign: 1, grp: 'type', bal: true, t: 'Мөнгөний үлдэгдэл' } } } };
}
function moneyPre(E, f, t) {
  var A = moneyAccs(), sel = state.macc || 'all';
  var L = drillLines({ acc: A, from: f, to: t, sign: 1, grp: 'type' }, E).lines, I = {}, O = {};
  L.forEach(function (x) { if (x.v > 0) I[x.key] = (I[x.key] || 0) + x.v; else O[x.key] = (O[x.key] || 0) - x.v; });
  var tbl = function (o, title, sign) {
    var keys = Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }), tot = keys.reduce(function (a, k) { return a + o[k]; }, 0);
    return '<div class="card"><h2>' + title + '</h2><table class="rep-t">' + (keys.length ? keys.map(function (k) {
      return '<tr><td>' + esc(k) + '</td><td class="n">' + dl({ acc: A, from: f, to: t, sign: sign, dir: 1, grp: 'type', only: k, t: k }, mny(o[k])) + '</td></tr>'; }).join('') : '<tr><td class="muted">алга</td><td></td></tr>') +
      '<tr class="tot"><td>Нийт</td><td class="n">' + dl({ acc: A, from: f, to: t, sign: sign, dir: 1, grp: 'type', t: title }, mny(tot)) + '</td></tr></table></div>';
  };
  return '<div class="filter"><label>Данс<select onchange="state.macc=this.value;render()"><option value="all">Бүх данс (касс + банк)</option>' + cashCodes().map(function (k) {
      return '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + k + ' ' + esc(accName(k)) + '</option>'; }).join('') + '</select></label></div>' +
    '<div class="grid2">' + tbl(I, 'Орсон мөнгө — төрлөөр', 1) + tbl(O, 'Гарсан мөнгө — төрлөөр', -1) + '</div>';
}

// ═══════════ АВЛАГА, ӨГЛӨГ, ЗЭЭЛ (хуучин хүснэгтийн «Авлага», «өглөг» жагсаалт) ═══════════
var DEBT_TABS = { r: ['Авлага', 'Танд өгөх ёстой', ['1201'], 1], p: ['Өглөг', 'Таны өгөх ёстой (нийлүүлэгч г.м)', ['3101'], -1], l: ['Зээл', 'Банк, хүнээс авсан зээл', null, -1], a: ['Захиалгын урьдчилгаа', 'Мөнгө нь орсон, бараа нь хүргэгдээгүй', ['3802'], -1] };
function debtAccs(k) { return DEBT_TABS[k][2] || loanCodes(); }
// Нэг бүрчлэн (FIFO): үүссэн өр бүрийг дараагийн төлөлтөөр хааж, хаасан огноог тэмдэглэнэ
function openItems(E, accs, sign, to, loanKey) {
  var A = {}; accs.forEach(function (k) { A[k] = 1; });
  var P = {}, items = [];
  E.forEach(function (e) {
    if (e.date > to) return;
    var inD = !!A[e.dr], inC = !!A[e.cr]; if (inD === inC) return;
    var acc = inD ? e.dr : e.cr, v = (inD ? e.amount : -e.amount) * sign;
    var who = e.partner || (loanKey ? accName(acc) : '(харилцагч заагаагүй)'), p = P[who] = P[who] || { open: [], over: 0, acc: acc, np: !e.partner };
    if (v > 0) {
      var it = { date: e.date, who: who, desc: e.desc, amt: v, paid: 0, closed: '', acc: acc, np: !e.partner };
      if (p.over > 0) { var u = Math.min(p.over, v); it.paid += u; p.over -= u; }
      if (it.paid >= it.amt - 0.5) it.closed = e.date; else p.open.push(it);
      items.push(it);
    } else {
      var rest = -v;
      while (rest > 0.005 && p.open.length) { var o = p.open[0], u2 = Math.min(rest, o.amt - o.paid); o.paid += u2; rest -= u2; if (o.paid >= o.amt - 0.5) { o.closed = e.date; p.open.shift(); } }
      if (rest > 0.005) p.over += rest;
    }
  });
  return { items: items, P: P };
}
function repDebts(E, k, showClosed) {
  var T = DEBT_TABS[k], accs = debtAccs(k), td = todayStr(), oi = openItems(E, accs, T[3], td, k === 'l');
  var rows = oi.items.filter(function (it) { return showClosed || !it.closed; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (it) {
    var days = Math.round((new Date(td) - new Date(it.date)) / 864e5);
    return { date: it.date, who: it.who, desc: it.desc, amt: r0(it.amt), paid: r0(it.paid), left: r0(it.amt - it.paid), closed: it.closed, st: it.closed ? 'Хаагдсан' : days + ' хоног',
      _d: { left: debtSpec(k, it, td) } };
  });
  return { title: T[0] + ' — ' + (showClosed ? 'бүгд' : 'хаагдаагүй'), rows: rows,
    cols: [c('date', 'Үүссэн огноо'), c('who', 'Харилцагч'), c('desc', 'Тайлбар'), m('amt', 'Дүн'), m('paid', 'Төлсөн'), m('left', 'Үлдэгдэл'), c('closed', 'Хаасан огноо'), c('st', 'Төлөв')],
    total: { date: 'Нийт', amt: sum(rows, 'amt'), paid: sum(rows, 'paid'), left: sum(rows, 'left') } };
}
// Нэг харилцагчийн (зээлийн хувьд нэг дансны) хуулга
function debtSpec(k, p, td) {
  var T = DEBT_TABS[k];
  return { acc: k === 'l' ? [p.acc] : debtAccs(k), partner: p.np ? '(харилцагч заагаагүй)' : p.who, to: td, sign: T[3], bal: true, t: p.who + ' — ' + T[0].toLowerCase() };
}
function debtsPre(E) {
  var k = state.dtab || 'r', td = todayStr(), b = balances(E, td);
  var tabs = '<div class="tabs" style="margin-bottom:10px">' + Object.keys(DEBT_TABS).map(function (x) {
    var v = debtAccs(x).reduce(function (a, c2) { return a + (b[c2] || 0); }, 0) * DEBT_TABS[x][3];
    return '<button class="' + (k === x ? 'on' : '') + '" onclick="state.dtab=\'' + x + '\';render()">' + DEBT_TABS[x][0] + ' <small>' + mny(v) + '</small></button>'; }).join('') + '</div>';
  var T = DEBT_TABS[k], accs = debtAccs(k), oi = openItems(E, accs, T[3], td, k === 'l');
  var who = Object.keys(oi.P).map(function (w) {
    var p = oi.P[w], left = p.open.reduce(function (a, it) { return a + it.amt - it.paid; }, 0) - p.over;
    var old = p.open.length ? Math.round((new Date(td) - new Date(p.open[0].date)) / 864e5) : 0;
    return { w: w, left: left, old: old, sp: debtSpec(k, { acc: p.acc, np: p.np, who: w }, td) };
  }).filter(function (x) { return Math.abs(x.left) > 0.5; }).sort(function (a, b) { return b.left - a.left; });
  var tot = who.reduce(function (a, x) { return a + x.left; }, 0);
  var card = '<div class="card"><h2>' + T[0] + ' — харилцагчаар <small class="muted" style="font-weight:400">' + T[1] + '</small></h2><table class="rep-t"><tr><th>Харилцагч</th><th class="n">Үлдэгдэл</th><th class="n">Хамгийн удсан</th></tr>' +
    (who.length ? who.map(function (x) {
      return '<tr><td>' + esc(x.w) + '</td><td class="n' + (x.left < 0 ? ' neg' : '') + '">' + dl(x.sp, mny(x.left)) +
        (x.left < 0 ? ' <small class="muted">илүү төлсөн</small>' : '') + '</td><td class="n">' + (x.old ? x.old + ' хоног' : '') + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>Нийт</td><td class="n">' + dl({ acc: accs, to: td, sign: T[3], grp: k === 'l' ? 'acc' : 'partner', t: T[0] }, mny(tot)) + '</td><td></td></tr>' : '<tr><td class="muted" colspan="3">' + T[0] + ' алга</td></tr>') + '</table></div>';
  var chk = '<label style="display:inline-flex;gap:6px;align-items:center;font-size:13px;margin:4px 0 8px"><input type="checkbox"' + (state.dclosed ? ' checked' : '') + ' onchange="state.dclosed=this.checked;render()"> Хаагдсаныг (бүрэн төлөгдсөн) харуулах</label>';
  return tabs + card + chk;
}

// ═══════════ ЦАЛИН, НДШ (хуучин «НДШ Цалин», «ХХОАТ/НДШ тайлан») ═══════════
function repPayroll(E, y) {
  var cash = cashCodes(), isCash = function (k) { return cash.indexOf(k) >= 0; };
  var mk = function (f, t, lab) {
    var o = { gross: 0, ndER: 0, ndEE: 0, pit: 0, paid: 0, taxPaid: 0 };
    E.forEach(function (e) {
      if (e.date < f || e.date > t) return;
      if (e.dr === '7101') o.gross += e.amount;
      if (e.dr === '7102') o.ndER += e.amount;
      if (e.dr === '3301' && e.cr === '3403') o.ndEE += e.amount;
      if (e.dr === '3301' && e.cr === '3404') o.pit += e.amount;
      if ((e.dr === '3301' || e.dr === '7101') && isCash(e.cr)) o.paid += e.amount;
      if ((e.dr === '3403' || e.dr === '3404') && isCash(e.cr)) o.taxPaid += e.amount;
    });
    var b = balances(E, t);
    Object.keys(o).forEach(function (k) { o[k] = r0(o[k]); });
    o.owe = r0(-(b['3301'] || 0)); o.oweTax = r0(-((b['3403'] || 0) + (b['3404'] || 0)));
    var S = function (x) { return Object.assign({ from: f, to: t }, x, { t: x.t + ' · ' + lab }); };
    o._d = { gross: S({ acc: ['7101'], sign: 1, grp: 'cat', t: 'Цалингийн зардал' }), ndER: S({ acc: ['7102'], sign: 1, grp: 'cat', t: 'НДШ (ажил олгогч)' }),
      ndEE: S({ acc: ['3403'], other: ['3301'], sign: -1, grp: 'cat', t: 'НДШ (ажилтнаас суутгасан)' }), pit: S({ acc: ['3404'], other: ['3301'], sign: -1, grp: 'cat', t: 'ХХОАТ (суутгасан)' }),
      paid: S({ acc: cash, other: ['3301', '7101'], sign: -1, grp: 'cat', t: 'Олгосон цалин' }), taxPaid: S({ acc: cash, other: ['3403', '3404'], sign: -1, grp: 'acc', t: 'Тушаасан НДШ, ХХОАТ' }),
      owe: { acc: ['3301'], from: f, to: t, sign: -1, bal: true, t: 'Олгох цалингийн үлдэгдэл · ' + lab }, oweTax: { acc: ['3403', '3404'], from: f, to: t, sign: -1, bal: true, grp: 'acc', t: 'Тушаах НДШ, ХХОАТ · ' + lab } };
    return o;
  };
  var ms = monthsOf(y), rows = ms.map(function (mm) { var o = mk(mm + '-01', lastDayOf(mm), mm); o.m = mm; return o; });
  var tot = ms.length ? mk(y + '-01-01', lastDayOf(ms[ms.length - 1]), y + ' он') : {};
  tot.m = 'Нийт ' + y;
  rows = blankZero(rows);
  return { title: y + ' он — цалин, НДШ, ХХОАТ', rows: rows, total: tot,
    cols: [c('m', 'Сар'), m('gross', 'Цалингийн зардал'), m('ndER', 'НДШ ажил олгогч'), m('ndEE', 'НДШ ажилтан'), m('pit', 'ХХОАТ'), m('paid', 'Олгосон цалин'), m('taxPaid', 'Тушаасан НДШ, ХХОАТ'), m('owe', 'Олгох үлдэгдэл'), m('oweTax', 'Тушаах үлдэгдэл')],
    note: 'Олгох / тушаах үлдэгдэл — тухайн сарын эцэст ажилчдад өгөх цалин, улсад тушаах НДШ, ХХОАТ хэд үлдсэн бэ.' };
}

// ═══════════ НЯГТЛАНГИЙН ТАЙЛАН, ТОХИРГОО (нэг хуудсанд цуглуулсан) ═══════════
var HUBS = {
  acct: ['Нягтлангийн тайлан', [['Шалгалт', ['dash']], ['Журнал', ['entry', 'journal', 'trial', 'ledger', 'gl']], ['Мөнгө', ['cash', 'cashflow', 'expenses']],
    ['Авлага, өглөг', ['partners', 'aging_r', 'aging_p', 'pstmt']], ['Санхүүгийн тайлан', ['balance', 'pl', 'equity']]]],
  setup: ['Тохиргоо', [['Эхлэх', ['opening', 'accounts']], ['Хамгаалалт', ['lock', 'close']], ['Тусламж', ['glossary']]]],
};
function hubOf(sub) { var h = ''; Object.keys(HUBS).forEach(function (k) { HUBS[k][1].forEach(function (g) { if (g[1].indexOf(sub) >= 0) h = k; }); }); return h; }
function hubView(h) {
  return '<div class="rep-grid">' + HUBS[h][1].map(function (g) {
    return '<div class="card"><h2>' + g[0] + '</h2><ul class="rep-links">' + g[1].map(function (k) {
      return '<li><button class="link" onclick="setSub(\'' + k + '\')">' + subLabel('finance', k) + '</button>' + (REP_HELP[k] ? '<div class="muted" style="font-size:12px;margin-top:2px">' + REP_HELP[k] + '</div>' : '') + '</li>'; }).join('') + '</ul></div>';
  }).join('') + '</div>';
}
function hubBar(sub) {
  var h = hubOf(sub); if (!h) return '';
  var opts = []; HUBS[h][1].forEach(function (g) { g[1].forEach(function (k) { opts.push('<option value="' + k + '"' + (k === sub ? ' selected' : '') + '>' + g[0] + ' · ' + subLabel('finance', k) + '</option>'); }); });
  return '<div class="hubbar"><button class="b-btn" onclick="setSub(\'' + h + '\')">← ' + HUBS[h][0] + '</button><select onchange="setSub(this.value)">' + opts.join('') + '</select></div>';
}

// ═══════════ Бусад тайланд задрал нэмэх (Орлогын тайлан, Баланс, Гүйлгээ баланс, Авлага өглөг, Мөнгөн гүйлгээ) ═══════════
function addDrill(sub, rep, f, t) {
  if (!rep || !rep.rows) return rep;
  var REV = ['5101', '5102'], PLA = accsOf('rev').concat(accsOf('contra'), accsOf('cogs'), accsOf('exp')), cash = cashCodes();
  var codeOf = function (name) { var mm = String(name).match(/^\s*(\d{4,6}) /); return mm ? mm[1] : ''; };
  if (sub === 'pl') {
    var PLMAP = { 'Борлуулалтын орлого': [REV, -1, 'item'], 'Хасах: борлуулалтын буцаалт': [['6001'], -1, 'item'], 'Цэвэр борлуулалт': [REV.concat(['6001']), -1, 'item'],
      'Борлуулсан барааны өртөг': [['6101'], -1, 'item'], 'Нийт ашиг': [REV.concat(['6001', '6101']), -1, 'item'], 'Үйл ажиллагааны зардал, нийт': [accsOf('exp'), -1, 'acc'],
      'Бусад орлого': [['5201'], -1, 'cat'], 'Цэвэр ашиг (алдагдал)': [PLA, -1, 'acc'] };
    rep.rows.forEach(function (r) {
      var x = PLMAP[r.name], cd = codeOf(r.name);
      if (cd) x = [[cd], -1, 'cat'];
      if (x && r.v !== '') r._d = { v: { acc: x[0], from: f, to: t, sign: x[1], grp: x[2], t: String(r.name).trim() } };
    });
  }
  if (sub === 'balance') rep.rows.forEach(function (r) {
    var cd = codeOf(r.name); if (!cd) return;
    r._d = { v: { acc: [cd], from: t.slice(0, 4) + '-01-01', to: t, sign: debitNormal(cd) ? 1 : -1, bal: true, grp: cd === '1404' ? 'item' : /^(1201|3101|3802|1503)$/.test(cd) ? 'partner' : ACC[cd] && ACC[cd].cash ? 'type' : 'cat', t: String(r.name).trim() } };
  });
  if (sub === 'trial') rep.rows.forEach(function (r) {
    var gp = ACC[r.code] && ACC[r.code].cash ? 'type' : 'cat';
    r._d = { d: { acc: [r.code], from: f, to: t, sign: 1, dir: 1, grp: gp, t: r.code + ' ' + r.name + ' — дебет' }, c: { acc: [r.code], from: f, to: t, sign: -1, dir: 1, grp: gp, t: r.code + ' ' + r.name + ' — кредит' } };
  });
  if (sub === 'partners') rep.rows.forEach(function (r) {
    r._d = { rec: { acc: ['1201', '1503'], partner: r.name, to: t, sign: 1, bal: true, t: r.name + ' — авлага' }, pay: { acc: ['3101', '3802'], partner: r.name, to: t, sign: -1, bal: true, t: r.name + ' — өглөг' } };
  });
  if (sub === 'cashflow') rep.rows.forEach(function (r) {
    var mm = String(r.name).match(/^(Орлого|Зарлага): (\d{4,6}) /); if (!mm) return;
    r._d = { v: { acc: cash, other: [mm[2]], from: f, to: t, sign: 1, dir: mm[1] === 'Орлого' ? 1 : -1, grp: 'cat', t: r.name } };
  });
  return rep;
}
