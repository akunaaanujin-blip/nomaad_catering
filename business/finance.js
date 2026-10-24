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
var EXP_SHORT = { '7101': 'Цалин', '7102': 'НДШ (ажил олгогч)', '7114': 'Түрээс', '7111': 'Цахилгаан, ус', '7117': 'Тээвэр', '7118': 'Шатахуун', '7123': 'Сав, баглаа',
  '7120': 'Зар сурталчилгаа', '7112': 'Засвар', '7124': 'Хүргэлт (буухиа)', '7122': 'Бусад зардал', '7421': 'Барааны хорогдол', '7404': 'Кассын дутагдал',
  '7201': 'Санхүүгийн зардал', '7105': 'Бичиг хэрэг', '7106': 'Утас, интернет', '7104': 'Томилолт', '7119': 'Хүлээн авалт', '7113': 'Элэгдэл' };
// Мөнгөний гүйлгээний төрөл (хуучин хүснэгтийн «Гүйлгээний төрөл» шиг)
function moneyType(x) {
  var o = String(x.other), isIn = (x.raw !== undefined ? x.raw : x.v) > 0;   // raw — тэмдэг солихоос өмнөх чиглэл (данс руу орсон бол +)
  if (ACC[o] && ACC[o].cash) return 'Данс хооронд';
  if (o === '5101' || o === '5102') return x.acc === '110106' ? 'Пос (карт) орлого' : 'Борлуулалтын орлого';
  if (o === '1201') return /#O\d|Захиалгын/.test(String(x.desc)) ? 'Захиалгын орлого' : 'Авлага төлөгдсөн';
  if (o === '3802') return 'Захиалгын урьдчилгаа';
  if (o === '6001') return 'Бараа буцаалт';
  if (/^35/.test(o)) return isIn ? 'Зээл авсан' : 'Зээл төлөлт';
  if (o === '4201' && /^Эхний үлдэгдэл/.test(String(x.desc))) return 'Эхний үлдэгдэл';
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
    if (s.tag && !hasTag(e.desc, s.tag)) return;   // зээл / захиалгын «#ID»
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
  if (!drillCur) return; if (!window.XLSX) { toast('Excel сан ачаалж байна — хэдэн секундийн дараа дахин оролдоно уу'); ensureXlsx(function () {}); return; }
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
    finDash(E, p, f, t, fl, PLA) + fdAnalysis(E, p, f, t) +
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
    (BUSINESSES[state.biz].finOnly ? '<div class="card"><h2>Зээл</h2><table class="rep-t">' + line('Миний өгсөн зээл (авах)', g('1210'), { acc: ['1210'], to: td, sign: 1, grp: 'partner', t: 'Өгсөн зээл' }) +
      line('Миний авсан зээл (өгөх)', -(g('3501')), { acc: loanCodes(), to: td, sign: -1, grp: 'partner', t: 'Авсан зээл' }) + '</table>' +
      '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="setSub(\'loans\')">Зээл</button></div></div></div>' :
    '<div class="card"><h2>Бараа</h2><table class="rep-t">' + line('Үлдэгдэл бараа (авсан үнээр)', g('1404'), { acc: ['1404'], to: td, sign: 1, grp: 'item', t: 'Барааны үлдэгдэл (авсан үнээр)' }) +
      (Math.abs(g('1505')) >= 1 ? line('Захиалсан, замд яваа бараа', g('1505'), { acc: ['1505'], to: td, sign: 1, grp: 'cat', t: 'Захиалсан бараа (замд яваа)' }) : '') + '</table>' +
      '<p class="muted" style="font-size:12.5px;margin-top:6px">Дэлгүүр, агуулахад байгаа барааг та хэдээр авсан бэ.</p></div></div>') +
    '<div class="grid2"><div class="card"><h2>Танд өртэй (авлага)</h2><table class="rep-t">' + (recv.length ? recv.slice(0, 8).map(function (x) {
        return line(esc(x.name), x.rec, { acc: ['1201'], partner: x.name, to: td, sign: 1, bal: true, t: x.name + ' — авлага' }); }).join('') +
      '<tr class="tot"><td>Нийт' + (recv.length > 8 ? ' (' + recv.length + ' харилцагч)' : '') + '</td><td class="n">' + dl({ acc: ['1201'], to: td, sign: 1, grp: 'partner', t: 'Авлага' }, mny(sum(recv, 'rec'))) + '</td></tr>' : '<tr><td class="muted">Авлага алга</td><td></td></tr>') + '</table>' +
      '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="setSub(\'recv\')">Дэлгэрэнгүй</button></div></div>' +
    '<div class="card"><h2>Таны өр (өглөг, зээл)</h2><table class="rep-t">' + pays.slice(0, 8).map(function (x) {
        return line(esc(x.name), x.pay, { acc: ['3101', '3802'], partner: x.name, to: td, sign: -1, bal: true, t: x.name + ' — өглөг' }); }).join('') +
      (loanBal > 0.5 ? line('Банкны зээл', loanBal, { acc: loans, to: td, sign: -1, grp: 'acc', t: 'Зээл' }) : '') +
      (payTot > 0.5 ? '<tr class="tot"><td>Нийт</td><td class="n">' + dl({ acc: ['3101', '3802'].concat(loans), to: td, sign: -1, grp: 'partner', t: 'Өглөг, зээл' }, mny(payTot)) + '</td></tr>' : '<tr><td class="muted">Өр алга</td><td></td></tr>') + '</table>' +
      '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="setSub(\'payb\')">Дэлгэрэнгүй</button><button class="b-btn" onclick="openRem(null,{kind:\'Өглөг төлөх\'})">Төлөх өдрөө сануулах</button></div></div></div>' +
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
var DEBT_TABS = { r: ['Авлага', 'Танд өгөх ёстой', ['1201'], 1], p: ['Өглөг', 'Таны өгөх ёстой (нийлүүлэгч, карго г.м)', ['3101'], -1],
  c: ['Компани хооронд', 'Бусад компани руу явуулсан (+) / тэднээс ирсэн (−)', ['1290'], 1], d: ['Захирлын зарлага', 'Захирлын хувийн зарлага (компаниас гарсан)', ['1208'], 1],
  a: ['Захиалгын урьдчилгаа', 'Мөнгө нь орсон, бараа нь хүргэгдээгүй', ['3802'], -1] };
function debtAccs(k) { return DEBT_TABS[k][2]; }
// Цэс: «Авлага», «Өглөг» тусдаа хуудас; «Бусад тооцоо» — компани хооронд, захирлын зарлага, захиалгын урьдчилгаа
function debtTabOf(sub) { if (sub === 'recv') return 'r'; if (sub === 'payb') return 'p'; return /^[cda]$/.test(state.dtab) ? state.dtab : 'c'; }
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
      var it = { date: e.date, who: who, desc: e.desc, amt: v, paid: 0, closed: '', acc: acc, np: !e.partner, ref: e.ref || '', bill: e.bill || '',
                 key: (e.ref || '') + '|' + e.date + '|' + Math.round(v) };
      if (p.over > 0) { var u = Math.min(p.over, v); it.paid += u; p.over -= u; }
      if (it.paid >= it.amt - 0.5) it.closed = e.date; else p.open.push(it);
      items.push(it);
    } else {
      // Гүйлгээний утганд «#лавлагаа» байвал яг тэр өрийг түрүүлж хаана, үлдсэнийг хамгийн хуучнаас (FIFO)
      var rest = -v, tags = (String(e.desc).match(/#[\w\-.]+/g) || []).map(function (t) { return t.slice(1); });
      var hit = function (o) { return tags.indexOf(o.ref) >= 0 || (o.bill && tags.indexOf(o.bill) >= 0) ? 0 : 1; };
      var order = tags.length ? p.open.slice().sort(function (a, b) { return hit(a) - hit(b); }) : p.open.slice();
      for (var q = 0; q < order.length && rest > 0.005; q++) { var o = order[q], u2 = Math.min(rest, o.amt - o.paid); o.paid += u2; rest -= u2; if (o.paid >= o.amt - 0.5) o.closed = e.date; }
      p.open = p.open.filter(function (o) { return !o.closed; });
      if (rest > 0.005) p.over += rest;
    }
  });
  return { items: items, P: P };
}
var DEBT_ST = [['open', 'Хаагдаагүй'], ['part', 'Хэсэгчлэн төлсөн'], ['closed', 'Хаагдсан'], ['all', 'Бүгд']];
// Харилцагчийн төрөл (бүлэг): захиалгын хэрэглэгчид, буухиа, StorePay, нийлүүлэгч, карго, компани хооронд, бусад
function debtCat(k, g) {
  var ords = {}; (window.adminOrders || []).forEach(function (o) { if (o.biz === state.biz) ords[o.id] = 1; });
  if (g.w === BUUHIA) return 'Буухиа (хүргэлтийн хөлс)';
  if (g.w === 'StorePay') return 'StorePay';
  if (ALL_KEYS.some(function (b) { return BUSINESSES[b].name === g.w; })) return 'Компани хооронд';
  if (g.L.some(function (it) { return ords[it.bill]; })) return k === 'r' ? 'Захиалгын авлага (хэрэглэгчид)' : 'Хэрэглэгчээс авсан урьдчилгаа';
  var mv = moves.filter(function (m) { return m.biz === state.biz; });
  if (mv.some(function (m) { return m.cargoPartner === g.w; })) return 'Карго';
  if (mv.some(function (m) { return m.partner === g.w; }) || partners.some(function (p) { return p.biz === state.biz && p.name === g.w && p.kind === 'Нийлүүлэгч'; })) return 'Нийлүүлэгч';
  return 'Бусад';
}
function debtStatus(it) { return it.closed ? 'closed' : it.paid > 0.5 ? 'part' : 'none'; }
function repDebts(E, k, flt) {
  flt = flt === 'none' || !flt ? 'open' : flt;
  var q = String(state.dq || '').toLowerCase().trim();   // хайлт — харилцагчийн нэр, утас, тайлбар
  var hasQ = function (t) { return !q || String(t || '').toLowerCase().indexOf(q) >= 0; };
  var keep0 = function (it) { var s2 = debtStatus(it); return flt === 'all' || (flt === 'open' ? s2 !== 'closed' : s2 === flt); };
  var keep = function (it) { return keep0(it) && (hasQ(it.who) || hasQ(it.desc) || hasQ(it.date)); };
  var T = DEBT_TABS[k], accs = debtAccs(k), td = todayStr(), oi = openItems(E, accs, T[3], td, k === 'l');
  // Нэг хүснэгт: харилцагч бүрийн нийт мөр (тод), доор нь тэр харилцагчийн баримтууд
  var days = function (d) { return Math.round((new Date(td) - new Date(d)) / 864e5); };
  var G = {}, order = [];
  oi.items.forEach(function (it) { if (!G[it.who]) { G[it.who] = []; order.push(it.who); } G[it.who].push(it); });
  Object.keys(oi.P).forEach(function (w) { if (!G[w] && oi.P[w].over > 0.5) { G[w] = []; order.push(w); } });   // зөвхөн илүү төлсөн
  var rows = [], tot = { amt: 0, paid: 0, left: 0 }, GL = [];
  order.map(function (w) {
    var L = G[w], p = oi.P[w] || { open: [], over: 0 }, left = L.reduce(function (a, it) { return a + it.amt - it.paid; }, 0) - (p.over || 0);
    return { w: w, L: L, left: left, open: L.filter(function (it) { return !it.closed; }) };
  }).filter(function (g) { return g.L.some(keep) || (flt === 'open' && Math.abs(g.left) > 0.5 && !g.L.length && hasQ(g.w)); }).forEach(function (g) {
    g.amt = g.L.reduce(function (a, it) { return a + it.amt; }, 0); g.cat = debtCat(k, g); GL.push(g);
  });
  // бүлэг (харилцагчийн төрөл) → харилцагч → баримт
  var C = {}, cats = [];
  GL.forEach(function (g) { if (!C[g.cat]) { C[g.cat] = { n: g.cat, G: [], amt: 0, left: 0 }; cats.push(C[g.cat]); } C[g.cat].G.push(g); C[g.cat].amt += g.amt; C[g.cat].left += g.left; });
  cats.sort(function (a, b) { return b.left - a.left; });
  // Хураагддаг: төрлийн бүлэг (анх нээлттэй), харилцагч (анх хураасан — дарахад баримтууд нь задарна). Хайлт хийвэл бүгд задарна.
  var OPEN = state.dOpen = state.dOpen || {}, SHUT = state.dShut = state.dShut || {};
  cats.forEach(function (cg) {
    var shut = SHUT[k + cg.n] && !q;
    rows.push({ _cls: 'dcat', _on: 'debtTog(\'dShut\',\'' + jsq(k + cg.n) + '\')', who: (shut ? '▸ ' : '▾ ') + cg.n, desc: cg.G.length + ' харилцагч', amt: r0(cg.amt), paid: r0(cg.amt - cg.left), left: r0(cg.left) });
    cg.G.sort(function (a, b) { return b.left - a.left; }).forEach(function (g) { g.shutCat = shut; pushG(g); });
  });
  function pushG(g) {
    var amt = g.amt, paid = amt - g.left, old = g.open.length ? g.open.map(function (it) { return it.date; }).sort()[0] : '';
    tot.amt += amt; tot.paid += paid; tot.left += g.left;
    if (g.shutCat) return;
    var opened = OPEN[k + g.w] || !!q;
    rows.push({ _b: 1, _act: g.open.length && /^[rp]$/.test(k) ? '<input type="checkbox" title="Энэ харилцагчийн бүх баримтыг сонгох" data-grp="' + esc(g.w) + '" onchange="debtSelGrp(this)">' : '',
      _on: 'if(!/INPUT|LABEL|BUTTON/.test(event.target.tagName))debtTog(\'dOpen\',\'' + jsq(k + g.w) + '\')', date: '', who: (opened ? '▾ ' : '▸ ') + g.w, desc: g.open.length + ' хаагдаагүй баримт', amt: r0(amt), paid: r0(paid), left: r0(g.left), closed: '', st: old ? days(old) + ' хоног' : 'Хаагдсан',
      _d: { left: debtSpec(k, { who: g.w, acc: (oi.P[g.w] || {}).acc, np: (oi.P[g.w] || {}).np }, td) } });
    if (!opened) return;
    g.L.filter(keep).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (it) {
      rows.push({ date: String(it.date).slice(5), who: '', desc: it.desc, amt: r0(it.amt), paid: r0(it.paid), left: r0(it.amt - it.paid), st: it.closed ? 'Хаагдсан ' + String(it.closed).slice(5) : (it.paid > 0.5 ? 'Хэсэгчлэн · ' : '') + days(it.date) + ' хоног',
        _act: !it.closed && /^[rp]$/.test(k) ? '<input type="checkbox" class="dsel" data-grp="' + esc(g.w) + '" data-key="' + esc(it.key) + '" data-left="' + r0(it.amt - it.paid) + '"' + (debtSel[it.key] !== undefined ? ' checked' : '') + ' onchange="debtSelSet(this)" title="Олноор хаахад сонгох"> ' +
          '<button class="mini" style="color:var(--accent)" onclick="debtClose(\'' + k + '\',\'' + esc(it.key) + '\')">' + (k === 'r' ? 'Авлага хаах' : 'Өглөг хаах') + '</button>' : '' });
    });
  }
  return { title: T[0] + ' — ' + DEBT_ST.filter(function (x) { return x[0] === flt; })[0][1].toLowerCase(), rows: rows, actions: /^[rp]$/.test(k),
    cols: [c('who', 'Харилцагч'), c('date', 'Огноо'), c('desc', 'Тайлбар'), m('amt', 'Дүн'), m('paid', 'Төлсөн'), m('left', 'Үлдэгдэл'), c('st', 'Төлөв')],
    total: { who: 'Нийт', amt: r0(tot.amt), paid: r0(tot.paid), left: r0(tot.left) } };
}
// Нэг харилцагчийн (зээлийн хувьд нэг дансны) хуулга
function debtSpec(k, p, td) {
  var T = DEBT_TABS[k];
  return { acc: k === 'l' ? [p.acc] : debtAccs(k), partner: p.np ? '(харилцагч заагаагүй)' : p.who, to: td, sign: T[3], bal: true, t: p.who + ' — ' + T[0].toLowerCase() };
}
// ═══ Компани хоорондын тооцоо — хоёр талаас тулгах ═══
// A нь B руу явуулсан бол A-д «1290 · B» +, B-д «1290 · A» − болно. Хоёулаа бүртгэгдсэн бол нийлбэр нь 0.
function icRecon() {
  var J4 = {}, out = [];
  ALL_KEYS.forEach(function (k) { J4[k] = buildJournal(k, R()); });
  var lines = function (k, other) {   // k-ийн бүртгэл дэх other-той гүйлгээ (+ явуулсан, − ирсэн)
    var nm = BUSINESSES[other].name;
    return J4[k].filter(function (e) { return (e.dr === '1290' || e.cr === '1290') && (e.partner || '') === nm; })
      .map(function (e) { return { date: e.date, v: e.dr === '1290' ? e.amount : -e.amount, desc: e.desc, used: false }; });
  };
  for (var i = 0; i < ALL_KEYS.length; i++) for (var j = i + 1; j < ALL_KEYS.length; j++) {
    var a = ALL_KEYS[i], b = ALL_KEYS[j], la = lines(a, b), lb = lines(b, a);
    if (!la.length && !lb.length) continue;
    var va = la.reduce(function (s, x) { return s + x.v; }, 0), vb = lb.reduce(function (s, x) { return s + x.v; }, 0);
    // Гүйлгээ бүрийг нөгөө талын эсрэг дүнтэй (±5 хоног) гүйлгээтэй тааруулна
    la.forEach(function (x) {
      var m = lb.filter(function (y) { return !y.used && Math.abs(x.v + y.v) < 1 && Math.abs((new Date(x.date) - new Date(y.date)) / 864e5) <= 5; })[0];
      if (m) { m.used = true; x.used = true; }
    });
    out.push({ a: a, b: b, va: r0(va), vb: r0(vb), diff: r0(va + vb),
      miss: la.filter(function (x) { return !x.used; }).map(function (x) { return Object.assign({ biz: a, other: b }, x); })
        .concat(lb.filter(function (x) { return !x.used; }).map(function (x) { return Object.assign({ biz: b, other: a }, x); })) });
  }
  return out;
}
function icReconCard() {
  var rs = icRecon().filter(function (x) { return x.a === state.biz || x.b === state.biz; });
  if (!rs.length) return '';
  var miss = [];
  rs.forEach(function (x) { x.miss.forEach(function (m) { miss.push(m); }); });
  return '<div class="card rep"><div class="rep-cap"><b>Хоёр талаас тулгах</b><span>Нэг компанид бүртгэгдсэн шилжүүлэг нөгөөд нь бүртгэгдсэн эсэх</span></div><div class="scroll"><table class="rep-t">' +
    '<tr><th>Компани</th><th class="n">Тэдний бүртгэлээр</th><th>Компани</th><th class="n">Тэдний бүртгэлээр</th><th class="n">Зөрүү</th><th></th></tr>' +
    rs.map(function (x) {
      return '<tr><td>' + esc(BUSINESSES[x.a].name) + '</td><td class="n">' + mny(x.va) + '</td><td>' + esc(BUSINESSES[x.b].name) + '</td><td class="n">' + mny(x.vb) + '</td>' +
        '<td class="n' + (Math.abs(x.diff) >= 1 ? ' neg' : '') + '">' + mny(x.diff) + '</td><td>' + (Math.abs(x.diff) < 1 ? '<span class="tag">Таарсан</span>' : '<span class="tag r">Зөрүүтэй</span>') + '</td></tr>';
    }).join('') + '</table></div>' +
    (miss.length ? '<p class="rep-note bad">Нөгөө талд нь бүртгэгдээгүй гүйлгээ (тэр компанийн банкны хуулгад «Компани хооронд» гэж тулгана):</p><div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Хаана бүртгэгдсэн</th><th>Хэнтэй</th><th class="n">Дүн</th><th>Утга</th><th></th></tr>' +
      miss.sort(function (p, q) { return p.date < q.date ? 1 : -1; }).map(function (m) {
        return '<tr><td>' + esc(m.date) + '</td><td>' + esc(BUSINESSES[m.biz].name) + '</td><td>' + esc(BUSINESSES[m.other].name) + '</td><td class="n">' + (m.v > 0 ? 'явуулсан ' : 'ирсэн ') + mny(Math.abs(m.v)) + '</td>' +
          '<td style="white-space:normal">' + esc(m.desc) + '</td><td><button class="mini" onclick="state.biz=\'' + m.other + '\';state.module=\'finance\';setSub(\'bank\')">' + esc(BUSINESSES[m.other].name) + '-ийн банк</button></td></tr>';
      }).join('') + '</table></div>' : '<p class="rep-note ok">Бүх шилжүүлэг хоёр талдаа бүртгэгдсэн.</p>') + '</div>';
}
function debtsPre(E) {
  var sub = state.sub.finance, k = debtTabOf(sub), td = todayStr(), b = balances(E, td), T = DEBT_TABS[k];
  // «Бусад тооцоо» дээр л таб (компани хооронд · захирлын зарлага · урьдчилгаа)
  var tabs = sub === 'debts' ? '<div class="seg" style="margin-bottom:12px">' + ['c', 'd', 'a'].map(function (x) {
    var v = debtAccs(x).reduce(function (a, c2) { return a + (b[c2] || 0); }, 0) * DEBT_TABS[x][3];
    return '<button class="' + (k === x ? 'on' : '') + '" onclick="state.dtab=\'' + x + '\';render()">' + DEBT_TABS[x][0] + ' <small>' + mny(v) + '</small></button>'; }).join('') + '</div>' : '';
  // Товч үзүүлэлт
  var oiC = openItems(E, debtAccs(k), T[3], td, k === 'l').items, cnt = { open: 0, part: 0, closed: 0, all: oiC.length }, left = 0, late = 0, who = {};
  oiC.forEach(function (it) { var s2 = debtStatus(it); cnt[s2]++; if (s2 !== 'closed') { cnt.open++; var l = it.amt - it.paid; left += l; who[it.who] = 1; if ((new Date(td) - new Date(it.date)) / 864e5 > 30) late += l; } });
  var kp = function (lbl, v, cls) { return '<div class="dk2' + (cls ? ' ' + cls : '') + '"><small>' + lbl + '</small><b>' + v + '</b></div>'; };
  var kpis = '<div class="dk2-row">' + kp(k === 'p' ? 'Төлөх үлдэгдэл' : k === 'r' ? 'Авах үлдэгдэл' : 'Үлдэгдэл', mny(left)) + kp('Хаагдаагүй баримт', cnt.open) +
    kp('Харилцагч', Object.keys(who).length) + kp('30 хоногоос хэтэрсэн', mny(late), late > 0.5 ? 'warn' : '') + '</div>';
  var cur = state.dst === 'none' || !state.dst ? 'open' : state.dst;
  var seg = '<div class="seg">' + DEBT_ST.map(function (x) {
    return '<button class="' + (cur === x[0] ? 'on' : '') + '" onclick="state.dst=\'' + x[0] + '\';render()">' + x[1] + ' <small>' + cnt[x[0]] + '</small></button>'; }).join('') + '</div>';
  var tool = '<div class="d-tool">' + seg + '<input id="dQ" type="search" value="' + esc(state.dq || '') + '" placeholder="Хайх: нэр, утас, тайлбар" oninput="debtSearch(this.value)"></div>';
  var selBar = /^[rp]$/.test(k) ? '<div class="d-sel" id="dSelBar"><span id="dSelTxt"></span><button class="b-btn primary" onclick="debtCloseSel()">' + (k === 'r' ? 'Сонгосныг хаах' : 'Сонгосныг төлөх') + '</button>' +
    '<button class="b-btn" onclick="debtSel={};render()">Сонголт цуцлах</button></div>' : '';
  setTimeout(function () { if (typeof debtSelCount === 'function') debtSelCount(); }, 0);
  return tabs + kpis + tool + selBar + (k === 'c' && isOwner() ? icReconCard() : '');
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
  acct: ['Нягтлангийн тайлан', [['Шалгалт', ['dash']], ['Журнал', ['entry', 'trial', 'gl']], ['Мөнгө', ['cash', 'expenses']],
    ['Авлага, өглөг', ['partners', 'aging_r', 'aging_p', 'pstmt']], ['Санхүүгийн тайлан', ['balance', 'pl', 'equity']]]],
  other: ['Бусад', [['Тайлан', ['profit', 'acct']], ['Мөнгө', ['vouchers']], ['Сар бүр', ['monthly', 'assets']], ['Тохиргоо', ['setup']]]],
  setup: ['Тохиргоо', [['Эхлэх', ['opening', 'banklink']], ['Мэдэгдэл', ['digest']], ['Хамгаалалт', ['lock', 'close']], ['Тусламж', ['glossary']]]],
};
function hubOf(sub) { var h = ''; Object.keys(HUBS).forEach(function (k) { HUBS[k][1].forEach(function (g) { if (g[1].indexOf(sub) >= 0) h = k; }); }); return h; }
function hubView(h) {
  return '<div class="rep-grid">' + HUBS[h][1].map(function (g) {
    return '<div class="card"><h2>' + g[0] + '</h2><ul class="rep-links">' + g[1].filter(function (k) { return subVisible(state.biz, k); }).map(function (k) {
      return '<li><button class="link" onclick="setSub(\'' + k + '\')">' + subLabel('finance', k) + '</button>' + (REP_HELP[k] ? '<div class="muted" style="font-size:12px;margin-top:2px">' + REP_HELP[k] + '</div>' : '') + '</li>'; }).join('') + '</ul></div>';
  }).join('') + '</div>';
}
function hubBar(sub) {
  var h = hubOf(sub); if (!h) return '';
  var opts = []; HUBS[h][1].forEach(function (g) { g[1].filter(function (k) { return subVisible(state.biz, k); }).forEach(function (k) { opts.push('<option value="' + k + '"' + (k === sub ? ' selected' : '') + '>' + g[0] + ' · ' + subLabel('finance', k) + '</option>'); }); });
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

// ═══════════ ӨГЛӨГ, АВЛАГА ХААХ — аль нэгийг нь сонгоно ═══════════
// Сонгосон өрийн лавлагаа (#...) гүйлгээний утганд бичигдэж, openItems яг тэр өрийг хаана.
var _debtCache = null;
function debtItems(accs, sign, loan) {
  return openItems(J(), accs, sign, '9999-12-31', loan).items.filter(function (it) { return !it.closed; })
    .map(function (it) { it.left = r0(it.amt - it.paid); return it; }).filter(function (it) { return it.left > 0.5; });
}
function debtCache() {   // render бүрт нэг удаа
  if (!_debtCache) {
    var ords = {}, all = debtItems(['1201'], 1), ordLeft = {}; (window.adminOrders || []).forEach(function (o) { ords[o.id] = 1; });
    all.forEach(function (it) { if (ords[it.bill]) ordLeft[it.bill] = r0((ordLeft[it.bill] || 0) + it.left); });   // захиалга бүрийн үлдсэн авлага (хэсэгчлэн төлсөн)
    _debtCache = { rec: all.filter(function (it) { return !ords[it.bill]; }),   // захиалгын авлагыг «Захиалга»-аар тулгана
                   pay: debtItems(['3101'], -1), ordLeft: ordLeft };   // зээлийг «Зээл» бүртгэлээр (L:) тулгана
  }
  return _debtCache;
}
function debtTag(it) { return it.bill || it.ref; }
function debtLabel(it) { return (it.acc === '1201' ? 'Авлага' : /^35/.test(it.acc) ? 'Зээл' : 'Өглөг') + ' · ' + it.who + ' · ' + mny(it.left) + ' (' + it.date + ' · ' + String(it.desc).split(' · ')[0].slice(0, 30) + ')'; }
function vcDebtSign(acc) { return acc === '1201' || acc === '1503' ? 1 : acc === '3101' ? -1 : 0; }
var vcItems = [], vcSel = {};
function vcOpenRender() {
  var acc = $('vcPurpose').value, sg = vcDebtSign(acc);
  if (/^35/.test(acc) && loanList(state.biz).length) {   // бүртгэсэн зээл байвал «Зээл» хуудсаар — хүү салж, үлдэгдэл зөв гарна
    vcItems = []; vcSel = {}; $('vcOpenWrap').style.display = '';
    $('vcOpenTitle').textContent = 'Бүртгэсэн зээл';
    $('vcOpen').innerHTML = '<p style="margin:6px 8px">Бүртгэсэн зээлийн төлөлтийг <b>Санхүү → Зээл → «Төлөлт»</b>-өөр хийнэ үү — үндсэн, хүү салж, зээлийн үлдэгдэл зөв гарна. ' +
      '<button class="b-btn" onclick="closeSheet(\'voucherSheet\');setSub(\'loans\')">Зээл хуудас руу</button></p>';
    return;
  }
  if (!sg) { $('vcOpenWrap').style.display = 'none'; vcItems = []; vcSel = {}; return; }
  vcItems = debtItems([acc], sg, /^35/.test(acc));
  var f = $('vcPartner').value.trim().toLowerCase(), word = sg > 0 ? 'авлага' : (/^35/.test(acc) ? 'зээл' : 'өглөг');
  var list = vcItems.map(function (it, i) { return [it, i]; }).filter(function (x) { return !f || vcSel[x[1]] || x[0].who.toLowerCase().indexOf(f) >= 0; });
  $('vcOpenWrap').style.display = '';
  $('vcOpenTitle').textContent = 'Аль ' + word + 'ийг хаах вэ? Сонгоно уу (' + vcItems.length + ' нээлттэй)';
  $('vcOpen').innerHTML = list.length ? list.map(function (x) {
    var it = x[0], i = x[1];
    return '<label class="vc-it"><input type="checkbox"' + (vcSel[i] ? ' checked' : '') + ' onchange="vcPick(' + i + ',this.checked)">' +
      '<span class="vc-d">' + esc(it.date) + '</span><span class="vc-w"><b>' + esc(it.who) + '</b><small class="muted">' + esc(String(it.desc).slice(0, 70)) + '</small></span>' +
      '<span class="vc-a">' + mny(it.left) + (it.paid > 0.5 ? '<small class="muted">' + mny(it.amt) + '-аас</small>' : '') + '</span></label>';
  }).join('') : '<p class="muted" style="margin:4px 0">Нээлттэй ' + word + ' алга' + (f ? ' (харилцагчаар шүүсэн)' : '') + '</p>';
}
function vcPick(i, on) {
  var it = vcItems[i]; if (!it) return;
  if (on) Object.keys(vcSel).forEach(function (k) { if (vcItems[k].who !== it.who) delete vcSel[k]; });   // нэг баримтад нэг харилцагч
  if (on) vcSel[i] = 1; else delete vcSel[i];
  var sel = Object.keys(vcSel).map(function (k) { return vcItems[k]; });
  if (sel.length) {
    $('vcPartner').value = sel[0].np ? '' : sel[0].who;
    $('vcAmount').value = r0(sel.reduce(function (a, x) { return a + x.left; }, 0));
    $('vcDesc').value = (vcDebtSign($('vcPurpose').value) > 0 ? 'Авлага төлөгдсөн' : /^35/.test($('vcPurpose').value) ? 'Зээл төлсөн' : 'Өглөг төлсөн') + ' · ' +
      sel.map(function (x) { return String(x.desc).split(' · ')[0].split(' #')[0].slice(0, 40); }).join(', ');
  }
  vcOpenRender();
}
function vcTags() { return Object.keys(vcSel).map(function (k) { return '#' + debtTag(vcItems[k]); }).join(' '); }
// Авлага, өглөг хуудасны «Төлөх / Төлбөр авах» → кассын баримт тэр өрийг сонгосон байдлаар нээгдэнэ
function debtPay(k, key) {
  var it = (k === 'r' ? debtItems(['1201'], 1) : debtItems(['3101'], -1)).filter(function (x) { return x.key === key; })[0];
  if (!it) { toast('Энэ өр аль хэдийн хаагдсан байна'); return; }
  openVoucher(k === 'r' ? 'ХО' : 'ХЗ');
  if (![].some.call($('vcPurpose').options, function (o) { return o.value === it.acc; }))
    $('vcPurpose').insertAdjacentHTML('beforeend', '<option value="' + it.acc + '">' + esc(accName(it.acc)) + ' төлсөн — ' + it.acc + '</option>');
  $('vcPurpose').value = it.acc; vcPurpose();
  var i = -1; vcItems.forEach(function (x, j) { if (x.key === key) i = j; });
  if (i >= 0) vcPick(i, true);
}

// Авлага, өглөгийн хайлт — бичих зуур дахин зурна, курсорыг алдахгүй
var _dqT = null;
function debtSearch(v) {
  state.dq = v; clearTimeout(_dqT);
  _dqT = setTimeout(function () { render(); var i = document.getElementById('dQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250);
}

function debtTog(kind, id) { var o = state[kind] = state[kind] || {}; if (o[id]) delete o[id]; else o[id] = 1; render(); }
