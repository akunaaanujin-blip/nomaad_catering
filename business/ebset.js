// ═══════════ БУУХИА ТООЦОО ═══════════
// Хүргэгдмэгц: хөлс Дт 7124 / Кт 3101 Буухиа (reports.js ebAccrues); Буухиа дээр Хүргэгдсэн (st 10) үед хураасан мөнгө Дт 1201 Буухиа / Кт 1201 хэрэглэгч (#EBR).
// Тооцоо хаалт зөвхөн банкны хуулгаас: Дт харилцах (орсон) + Дт 3101 Буухиа (хөлс, хуучин өр) / Кт 1201 Буухиа — захиалгыг чагтаар сонгоно.
var ebSet = { st: 'open', f: '', t: '' };
var EB_SET_FROM = '2026-10-26';   // үүнээс хойш үүссэн захиалгагүй хүргэлтийн хөлсийг тооцоонд санал болгоно

function ebSetData() {
  var E = J(), rec = openItems(E, ['1201'], 1, '9999-12-31'), pay = openItems(E, ['3101'], -1, '9999-12-31');
  var O = {}; (window.adminOrders || []).forEach(function (o) { O[o.id] = o; });
  var X = {}, M = ebAdm.list ? ebLink() : {}; Object.keys(M).forEach(function (c) { X[M[c].id] = (ebAdm.list || []).filter(function (x) { return x.code === c; })[0]; });
  var rows = {}, old = [], row = function (id, d) { return rows[id] = rows[id] || { id: id, date: d, o: O[id] || null, col: 0, colLeft: 0, fee: 0, feeLeft: 0, closed: '', feeClosed: '' }; };
  rec.items.forEach(function (it) {
    if (it.who !== BUUHIA) return;
    var id = it.tags[0] || it.ref, r = row(id, it.date);
    r.col += it.amt; r.colLeft += it.amt - it.paid; if (it.closed) r.closed = it.closed;
  });
  pay.items.forEach(function (it) {
    if (it.who !== BUUHIA) return;
    if (!it.tags[0]) { var k = it.other === '7124' && String(it.desc).match(/\(([KQ][\w-]+)\)/); it.eb = k ? k[1] : ''; old.push(it); return; }
    var r = row(it.tags[0], it.date); r.fee += it.amt; r.feeLeft += it.amt - it.paid; if (it.closed) r.feeClosed = it.closed;
  });
  var L = Object.keys(rows).map(function (k) {
    var r = rows[k], x = X[r.id] || null;
    r.x = x; r.code = (r.o && r.o.ebCode) || (x ? x.code : ''); r.phone = r.o ? r.o.phone : x ? x.phone : '';
    r.stName = x ? x.name : ''; r.net = r0(r.col - r.fee);
    r.done = r.col > 0.5 ? r.colLeft < 0.5 : r.feeLeft < 0.5; r.doneAt = r.col > 0.5 ? r.closed : r.feeClosed;
    return r;
  }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  var j1201 = 0, j3101 = 0; E.forEach(function (e) {
    if (e.partner !== BUUHIA) return;
    if (e.dr === '1201') j1201 += e.amount; if (e.cr === '1201') j1201 -= e.amount;
    if (e.cr === '3101') j3101 += e.amount; if (e.dr === '3101') j3101 -= e.amount;
  });
  var oldLeft = old.reduce(function (a, it) { return a + it.amt - it.paid; }, 0), ebLeft = old.reduce(function (a, it) { return a + (it.eb ? it.amt - it.paid : 0); }, 0);
  var colOpen = L.reduce(function (a, r) { return a + r.colLeft; }, 0) - ((rec.P[BUUHIA] || {}).over || 0);
  var feeOpen = L.reduce(function (a, r) { return a + r.feeLeft; }, 0) - ((pay.P[BUUHIA] || {}).over || 0);
  var way = (ebAdm.list || []).filter(function (x) { return [10, 11, 12].indexOf(x.st) < 0 && !(window.ebOld || {})[x.code]; });
  return { rows: L, old: old, oldLeft: r0(oldLeft), ebLeft: r0(ebLeft), j1201: r0(j1201), j3101: r0(j3101), colOpen: r0(colOpen), feeOpen: r0(feeOpen),
    way: way, wayAmt: way.reduce(function (a, x) { return a + (Number(x.price) || 0); }, 0), M: M };
}
// Захиалгын тэггүй 3101 Буухиа: тайлбартаа (K…)/(Q…) Буухиа кодтой Дт 7124 бол захиалгагүй хүргэлтийн хөлс, бусад нь хуучин өр
function ebOldLbl(it) { return it.eb ? 'Захиалгагүй хүргэлтийн хөлс · ' + it.eb : 'Хуучин өр (эхний үлдэгдэл)'; }
// Буухиа дээр Хүргэгдсэн, манай захиалгагүй (жишээ нь буцаалт авчирсан, манай дугаар руу) хүргэлтийн хөлс — журналд бичигдээгүй
function ebSetUnlinked(M) {
  var seen = {}; J().forEach(function (e) { (String(e.desc).match(/#EB:[\w-]+/g) || []).forEach(function (t) { seen[t.slice(4)] = 1; }); if (e.partner === BUUHIA && e.dr === '7124') (String(e.desc).match(/\([KQ][\w-]+\)/g) || []).forEach(function (t) { seen[t.slice(1, -1)] = 1; }); });
  return (ebAdm.list || []).filter(function (x) {
    return x.st === 10 && !M[x.code] && !seen[x.code] && !(window.ebOld || {})[x.code] && String(x.created || '').slice(0, 10).replace(/\//g, '-') >= EB_SET_FROM;
  }).map(function (x) { return { x: x, fee: ebXFee(x) }; });
}
function ebSetChecks(D) {
  var out = [], line = function (ok, t) { out.push('<div class="fn-todo ' + (ok ? 'ok' : 'bad') + '"><span class="fn-ck">' + (ok ? '✓' : '!') + '</span><span' + (ok ? '' : ' style="color:var(--red)"') + '>' + t + '</span></div>'); };
  line(Math.abs(D.j1201 - D.colOpen) < 1, 'Журналын 1201 Буухиа ' + mny(D.j1201) + (Math.abs(D.j1201 - D.colOpen) < 1 ? ' = ' : ' ≠ ') + 'хүснэгтийн хаагдаагүй хураасан ' + mny(D.colOpen));
  var f2 = r0(D.feeOpen + D.oldLeft);
  line(Math.abs(D.j3101 - f2) < 1, 'Журналын 3101 Буухиа ' + mny(D.j3101) + (Math.abs(D.j3101 - f2) < 1 ? ' = ' : ' ≠ ') + 'хаагдаагүй хөлс ' + mny(D.feeOpen) + (D.ebLeft ? ' + захиалгагүй хүргэлтийн хөлс ' + mny(D.ebLeft) : '') + ' + хуучин өр ' + mny(r0(D.oldLeft - D.ebLeft)));
  if (!ebAdm.list) { out.push('<p class="muted" style="margin:6px 0 0">Буухиагийн мэдээлэл татаагүй — доорх 2 шалгалт хийгдээгүй.</p>'); return out.join(''); }
  var miss = ebMoneyBad().bad;
  line(!miss.length, miss.length ? 'Буухиа дээр Хүргэгдсэн боловч журналд хураасан гэж ороогүй: ' + esc(miss.map(function (x) { return x.phone + ' (' + x.code + ')'; }).join(', ')) : 'Буухиа дээр Хүргэгдсэн хүргэлт бүр журналд орсон');
  var R = ebRecvd(), bad = (ebAdm.list || []).filter(function (x) { return R[x.code] && x.st !== 10; });
  line(!bad.length, bad.length ? 'Журналд «хураасан» боловч Буухиа дээр Хүргэгдсэн биш: ' + esc(bad.map(function (x) { return x.phone + ' · ' + x.name; }).join(', ')) : 'Журналд «хураасан» бүх хүргэлт Буухиа дээр Хүргэгдсэн');
  return out.join('');
}
function ebSetFilt(D) {
  return D.rows.filter(function (r) {
    if (ebSet.st === 'open' && r.done) return false;
    if (ebSet.st === 'done' && !r.done) return false;
    if (ebSet.f && r.date < ebSet.f) return false;
    if (ebSet.t && r.date > ebSet.t) return false;
    return true;
  });
}
function ebSetView() {
  if (!ebAdm.list && !ebAdm.busy && API_URL && typeof ebAdmPull === 'function') setTimeout(ebAdmPull, 0);
  var D = ebSetData(), net = r0(D.j1201 - D.j3101);
  var kpis = '<div class="fn-kpis">' +
    '<div class="fn-kpi"><small>Буухиагаас авах</small><b>' + mny(D.j1201) + '</b></div>' +
    '<div class="fn-kpi"><small>Буухиад өгөх (хөлс)</small><b>' + mny(D.j3101) + '</b></div>' +
    '<div class="fn-kpi"><small>' + (net >= 0 ? 'Буухиа надад шилжүүлэх' : 'Би Буухиад төлөх') + '</small><b class="' + (net >= 0 ? 'pos' : 'neg') + '">' + mny(Math.abs(net)) + '</b></div>' +
    '<div class="fn-kpi"><small>Хүргэлтэнд явж байгаа (' + D.way.length + ')</small><b>' + (ebAdm.list ? mny(D.wayAmt) : '—') + '</b></div></div>';
  var L = ebSetFilt(D), T = { col: 0, fee: 0, net: 0 };
  var rows = L.map(function (r) {
    T.col += r.col; T.fee += r.fee; T.net += r.net;
    return '<tr><td class="nw">' + esc(r.date) + '</td><td class="nw">' + esc(r.phone) + '</td><td>' + esc(r.code) + '</td><td>' + esc(r.stName || (ebAdm.list ? '—' : '')) + '</td>' +
      '<td class="n">' + mny(r.col) + '</td><td class="n">' + mny(r.fee) + '</td><td class="n">' + mny(r.net) + '</td>' +
      '<td>' + (r.done ? 'Хаагдсан ' + esc(r.doneAt) : r.colLeft > 0.5 && r.colLeft < r.col - 0.5 ? 'Хэсэгчлэн · үлдэгдэл ' + mny(r.colLeft) : '<span class="muted">Хаагдаагүй</span>') + '</td></tr>';
  }).join('');
  var oldRows = ebSet.st === 'done' ? '' : D.old.filter(function (it) { return ebSet.st === 'all' || !it.closed; }).map(function (it) {
    return '<tr class="b"><td class="nw">' + esc(it.date) + '</td><td colspan="3">' + esc(ebOldLbl(it)) + ' · ' + esc(String(it.desc).slice(0, 60)) + '</td><td class="n"></td><td class="n">' + mny(it.amt) + '</td><td class="n">' + mny(-it.amt) + '</td>' +
      '<td>' + (it.closed ? 'Хаагдсан ' + esc(it.closed) : it.paid > 0.5 ? 'Үлдэгдэл ' + mny(it.amt - it.paid) : '<span class="muted">Хаагдаагүй</span>') + '</td></tr>';
  }).join('');
  var flt = '<div class="fn-fr">' + stBar('Төлөв', [['open', 'Хаагдаагүй', D.rows.filter(function (r) { return !r.done; }).length], ['done', 'Хаагдсан', D.rows.filter(function (r) { return r.done; }).length], ['all', 'Бүгд', D.rows.length]], ebSet.st, "ebSet.st='%';render()") +
    '<label style="margin-left:12px">Огноо <input type="date" value="' + esc(ebSet.f) + '" onchange="ebSet.f=this.value;render()"> — <input type="date" value="' + esc(ebSet.t) + '" onchange="ebSet.t=this.value;render()"></label>' +
    '<button class="b-btn" style="margin-left:auto" onclick="ebSetExcel()">Excel татах</button>' +
    (ebAdm.list ? '<span class="muted" style="font-size:12px;margin-left:8px">Буухиа: ' + esc(ebAdm.at || '') + '</span>' : ebAdm.busy ? '<span class="muted" style="font-size:12px;margin-left:8px">Буухиагаас татаж байна…</span>' : '') + '</div>';
  var tbl = '<div class="card">' + flt + '<div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Утас</th><th>Буухиа код</th><th>Төлөв (Буухиа)</th><th class="n">Хураасан ₮</th><th class="n">Хөлс ₮</th><th class="n">Цэвэр ₮</th><th>Хаагдсан эсэх (банкны огноо)</th></tr>' +
    oldRows + (rows || '<tr><td colspan="8" class="muted">Мөр алга</td></tr>') +
    '<tr class="tot"><td colspan="4">Нийт (' + L.length + ' захиалга)</td><td class="n">' + mny(T.col) + '</td><td class="n">' + mny(T.fee) + '</td><td class="n">' + mny(T.net) + '</td><td></td></tr></table></div>' +
    '<p class="muted" style="font-size:12.5px;margin:8px 0 0">Тооцоо хаахдаа: Мөнгө → Банк тулгах → Буухиагаас орсон гүйлгээнд «Буухиагийн тооцоо — захиалга сонгох».</p></div>';
  var ck = ebSetChecks(D), ckBad = / bad"/.test(ck);   // шалгалт зөвхөн зөрүүтэй үед харагдана
  return '<div id="ebSetBox">' + kpis + (ckBad ? '<div class="card"><h2>Зөрүү байна</h2>' + ck + '</div>' : '') + tbl + '</div>';
}
function ebSetHomeCard(biz) {
  if (biz !== state.biz || !J().some(function (e) { return e.partner === BUUHIA; })) return '';
  var D = ebSetData(), net = r0(D.j1201 - D.j3101);
  return '<div class="card"><h2>Буухиа тооцоо</h2><div class="fn-kpis">' +
    '<div class="fn-kpi"><small>Авах</small><b>' + mny(D.j1201) + '</b></div><div class="fn-kpi"><small>Өгөх</small><b>' + mny(D.j3101) + '</b></div>' +
    '<div class="fn-kpi"><small>' + (net >= 0 ? 'Буухиа надад шилжүүлэх' : 'Би Буухиад төлөх') + '</small><b class="' + (net >= 0 ? 'pos' : 'neg') + '">' + mny(Math.abs(net)) + '</b></div></div>' +
    '<button class="link" onclick="navGo(\'finance/ebset\')">Дэлгэрэнгүй →</button></div>';
}
function ebSetExcel() {
  if (!window.XLSX) { toast('Excel сан ачаалж байна — хэдэн секундийн дараа дахин оролдоно уу'); ensureXlsx(function () {}); return; }
  var D = ebSetData(), aoa = [['Буухиа тооцоо'], [BUSINESSES[state.biz].name + ' · ' + todayStr()], [],
    ['Огноо', 'Утас', 'Буухиа код', 'Төлөв (Буухиа)', 'Хураасан ₮', 'Хөлс ₮', 'Цэвэр ₮', 'Хаагдсан эсэх', 'Банкны огноо', 'Захиалга']];
  D.old.forEach(function (it) { aoa.push([it.date, '', it.eb || '', ebOldLbl(it), 0, r0(it.amt), -r0(it.amt), it.closed ? 'Хаагдсан' : 'Хаагдаагүй', it.closed || '', '']); });
  ebSetFilt(D).forEach(function (r) { aoa.push([r.date, r.phone, r.code, r.stName, r0(r.col), r0(r.fee), r.net, r.done ? 'Хаагдсан' : 'Хаагдаагүй', r.doneAt || '', r.id]); });
  aoa.push([], ['Буухиагаас авах', D.j1201], ['Буухиад өгөх', D.j3101], ['Цэвэр', r0(D.j1201 - D.j3101)]);
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Буухиа'); XLSX.writeFile(wb, xlsxName('Буухиа тооцоо'));
}

// ── Банкны хуулга: Буухиагаас орсон мөнгөөр тооцоо хаах (захиалгыг чагтаар сонгоно) ──
var ebBk = null;
// Буухиатай тайлан нийлсэн багц бүр: хаагдаагүй хүргэлтүүдийн цэвэр дүн (хураасан − хөлс), тус тусад нь
function ebBatches() {
  if (!ebAdm.list || ebAdm.biz !== state.biz || typeof ebSettledByEb !== 'function') return [];
  var B = ebSettledByEb(ebAdm.list), by = {}; Object.keys(B).forEach(function (c) { (by[B[c]] = by[B[c]] || {})[c] = 1; });
  if (!Object.keys(by).length) return [];
  var D = ebSetData(), unl = ebSetUnlinked(D.M);
  return Object.keys(by).sort().reverse().map(function (u) {
    var c = by[u], n = 0, amt = 0;
    D.rows.forEach(function (r) { if (c[r.code] && (r.colLeft > 0.5 || r.feeLeft > 0.5)) { n++; amt += r.colLeft - r.feeLeft; } });
    D.old.forEach(function (it) { if (it.eb && c[it.eb] && !it.closed) { n++; amt -= it.amt - it.paid; } });
    unl.forEach(function (x) { if (c[x.x.code]) { n++; amt -= x.fee; } });
    return { u: u, n: n, amt: r0(amt) };
  }).filter(function (b) { return b.n; });
}
function ebBatchOpts(L) { return L.map(function (b) { return ['EB:b|' + b.u, 'Тайлан нийлсэн ' + ebGenTime(b.u) + ' · ' + b.n + ' хүргэлт · ' + mny(b.amt), 'Буухиа']; }); }
function ebBatchDef(L, l) { var a = ebBkAmt(l), m = L.filter(function (b) { return Math.abs(b.amt - a) < 1; }); return m.length === 1 ? 'EB:b|' + m[0].u : 'EB:set'; }
// Сонгосон багцын хүргэлтүүдийг чагтална — дүн зөрвөл доорх «Зөрүү»-д харагдана
function ebBkBatch(u) {
  var B = ebSettledByEb(ebAdm.list || []), n = 0, on = function (k, i) { var c = document.querySelector('#gBody input[data-k=' + k + '][data-i="' + i + '"]'); if (c) { c.checked = true; n++; } };
  ebBk.rows.forEach(function (r, i) { if (B[r.code] === u) on('r', i); });
  ebBk.old.forEach(function (it, i) { if (it.eb && B[it.eb] === u) on('o', i); });
  ebBk.unl.forEach(function (x, i) { if (B[x.x.code] === u) on('u', i); });
  var el = document.getElementById('ebBkAuto'); if (el) el.textContent = 'Тайлан нийлсэн ' + ebGenTime(u) + ' · ' + n + ' хүргэлт сонгогдлоо — шалгаад тулгана уу.';
}
function ebBankOpen(lineId, batch) {
  var l = bankLines.filter(function (x) { return x.id === lineId; })[0]; if (!l) return;
  var D = ebSetData();
  ebBk = { l: l, rows: D.rows.filter(function (r) { return r.colLeft > 0.5 || r.feeLeft > 0.5; }), old: D.old.filter(function (it) { return !it.closed; }), unl: ebSetUnlinked(D.M) };
  var tr = function (k, i, d, who, col, fee, extra) {
    return '<tr><td><input type="checkbox" data-k="' + k + '" data-i="' + i + '" onchange="ebBkCalc()"></td><td class="nw">' + esc(d) + '</td><td>' + who + '</td><td class="n">' + (col ? mny(col) : '') + '</td><td class="n">' + extra + '</td></tr>';
  };
  var body = ebBk.old.map(function (it, i) {
    return tr('o', i, it.date, esc(ebOldLbl(it)), 0, 0, '<input type="number" id="ebBkOld' + i + '" value="' + r0(it.amt - it.paid) + '" max="' + r0(it.amt - it.paid) + '" style="width:110px;text-align:right" oninput="ebBkCalc()">');
  }).join('') + ebBk.rows.map(function (r, i) {
    return tr('r', i, r.date, esc(r.phone) + ' <small class="muted">' + esc(r.code) + (r.stName ? ' · ' + esc(r.stName) : '') + '</small>', r.colLeft, r.feeLeft, r.feeLeft > 0.5 ? '−' + fmt(r.feeLeft) : '');
  }).join('') + ebBk.unl.map(function (u, i) {
    return tr('u', i, String(u.x.created).slice(0, 10).replace(/\//g, '-'), 'Захиалгагүй хүргэлт · ' + esc(u.x.phone) + ' <small class="muted">' + esc(u.x.code) + '</small>', 0, u.fee, '−' + fmt(u.fee));
  }).join('');
  gOpen('<h2>Буухиагийн тооцоо</h2><p class="rep-note">Банк: ' + esc(l.date.slice(0, 10)) + ' · ' + mny(ebBkAmt(l)) + ' · «' + esc(l.desc) + '»</p><p id="ebBkAuto" class="muted" style="font-size:12.5px"></p>' +
    '<p class="muted" style="font-size:12.5px">Энэ шилжүүлэгт орсон захиалгуудыг сонгоно. Тайлан нийлсэн хүргэлтүүдээ сонгоно. Хураасан мөнгө − хөлс − хуучин өр = банкны дүн байх ёстой (буухиад төлсөн бол хасах дүн).</p>' +
    '<div class="scroll" style="max-height:50vh"><table class="rep-t"><tr><th><input type="checkbox" onchange="[].forEach.call(document.querySelectorAll(\'#gBody input[data-k=r]\'),function(c,i){c.checked=this.checked}.bind(this));ebBkCalc()"></th><th>Огноо</th><th>Захиалга</th><th class="n">Хураасан</th><th class="n">Хөлс / хасах</th></tr>' +
    (body || '<tr><td colspan="5" class="muted">Хаагдаагүй тооцоо алга</td></tr>') + '</table></div><div id="ebBkSum" style="margin:10px 0"></div>' +
    '<div class="row2"><button class="b-btn" onclick="gClose()">Болих</button><button class="b-btn primary" id="ebBkGo" onclick="ebBankSave()" disabled>Тулгах</button></div>');
  if (batch) ebBkBatch(batch); else ebBkPick();
  ebBkCalc();
}
function ebBkAmt(l) { return r0((+l.credit || 0) - (+l.debit || 0)); }   // + орсон, − буухиад төлсөн
// Тайлан нийлсэн багц: дүн нь яг банкны гүйлгээтэй таарвал хүргэлтүүдийг автоматаар чагтална (Буухиагийн багц эсвэл оруулсан тайлан)
function ebBkPick() {
  var amt = ebBkAmt(ebBk.l), G = [], B = typeof ebSettledByEb === 'function' ? ebSettledByEb(ebAdm.list || []) : {}, by = {};
  Object.keys(B).forEach(function (c) { (by[B[c]] = by[B[c]] || {})[c] = 1; });
  Object.keys(by).sort().reverse().forEach(function (u) { G.push({ t: 'Буухиагийн нийлсэн багц ' + String(u).slice(0, 10), c: by[u] }); });
  if (typeof ebRec !== 'undefined' && ebRec.rows) { var rc = {}; ebRec.rows.forEach(function (x) { if (x.code) rc[x.code] = 1; }); G.push({ t: 'Оруулсан Буухиагийн тайлан', c: rc }); }
  for (var i = 0; i < G.length; i++) {
    var ix = []; ebBk.rows.forEach(function (r, k) { if (G[i].c[r.code]) ix.push(k); });
    var net = r0(ix.reduce(function (a, k) { return a + ebBk.rows[k].colLeft - ebBk.rows[k].feeLeft; }, 0));
    if (ix.length && Math.abs(net - amt) < 1) {
      ix.forEach(function (k) { var c = document.querySelector('#gBody input[data-k=r][data-i="' + k + '"]'); if (c) c.checked = true; });
      var el = document.getElementById('ebBkAuto'); if (el) el.textContent = G[i].t + ' · ' + ix.length + ' хүргэлт автоматаар сонгогдлоо — шалгаад тулгана уу.';
      return;
    }
  }
}
// Оруулсан Буухиагийн тайлангаас хүргэлтийн нэмэлт төлбөр (нэмэлт, овор, оператор, мессеж); «Буухиатай тулгах»-аар зассан (#EBT) хүргэлтийг дахин тооцохгүй
function ebBkExt(code) {
  if (!code || typeof ebRec === 'undefined' || !ebRec.rows) return 0;
  if (J().some(function (e) { return String(e.desc).indexOf('#EBT:' + code) >= 0; })) return 0;
  return ebRec.rows.reduce(function (a, x) { return a + (x.code === code ? Number(x.ext) || 0 : 0); }, 0);
}
function ebBkSel() {
  var S = { r: [], o: [], u: [] }, ext = 0;
  [].forEach.call(document.querySelectorAll('#gBody input[data-k]'), function (c) { if (c.checked) S[c.getAttribute('data-k')].push(+c.getAttribute('data-i')); });
  var col = 0, fee = 0, old = 0, unl = 0, oeb = 0;
  S.r.forEach(function (i) { var r = ebBk.rows[i]; col += r.colLeft; fee += r.feeLeft; ext += ebBkExt(r.code); });
  S.o.forEach(function (i) { var it = ebBk.old[i], v = Math.min(Number(($('ebBkOld' + i) || {}).value) || 0, it.amt - it.paid); if (it.eb) { oeb += Math.max(0, v); ext += ebBkExt(it.eb); } else old += Math.max(0, v); });
  S.u.forEach(function (i) { unl += ebBk.unl[i].fee; ext += ebBkExt(ebBk.unl[i].x.code); }); unl += oeb;
  S.col = r0(col); S.fee = r0(fee); S.old = r0(old); S.unl = r0(unl); S.ext = r0(ext); S.exp = r0(col - fee - old - unl - ext); S.diff = r0(ebBkAmt(ebBk.l) - S.exp);
  return S;
}
// Буухиа суутгасан хөлс манай тооцооноос бага зэрэг зөрвөл гараар чагтлаад зөрүүг хөлсний зардалд (7124) бичнэ
var EB_BK_FIX_MAX = 30000;
function ebBkFixOk(S) { return !!ebBk.fix && Math.abs(S.diff) >= 1 && Math.abs(S.diff) <= EB_BK_FIX_MAX; }
function ebBkCalc() {
  if (!ebBk) return; var S = ebBkSel(), ok = (S.r.length || S.o.length || S.u.length) && (Math.abs(S.diff) < 1 || ebBkFixOk(S));
  $('ebBkSum').innerHTML = '<table class="rep-t"><tr><td>Хураасан (' + S.r.length + ' захиалга)</td><td class="n">' + mny(S.col) + '</td></tr><tr><td>− Хөлс</td><td class="n">' + mny(S.fee) + '</td></tr>' +
    (S.unl ? '<tr><td>− Захиалгагүй хүргэлтийн хөлс</td><td class="n">' + mny(S.unl) + '</td></tr>' : '') + (S.old ? '<tr><td>− Хуучин өр</td><td class="n">' + mny(S.old) + '</td></tr>' : '') + (S.ext ? '<tr><td>− Нэмэлт төлбөр (тайлангаас)</td><td class="n">' + mny(S.ext) + '</td></tr>' : '') +
    '<tr class="b"><td>= Тооцооны цэвэр дүн</td><td class="n">' + mny(S.exp) + '</td></tr><tr><td>Банкны гүйлгээ</td><td class="n">' + mny(ebBkAmt(ebBk.l)) + '</td></tr>' +
    '<tr class="b"><td>Зөрүү</td><td class="n"' + (Math.abs(S.diff) < 1 ? '' : ' style="color:var(--red)"') + '>' + mny(S.diff) + '</td></tr></table>' +
    (Math.abs(S.diff) >= 1 && Math.abs(S.diff) <= EB_BK_FIX_MAX ? '<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox"' + (ebBk.fix ? ' checked' : '') + ' onchange="ebBk.fix=this.checked;ebBkCalc()" style="width:auto">Зөрүү ' + mny(Math.abs(S.diff)) + '-ийг Буухиагийн хөлсөнд тооцох</label>' : '');
  $('ebBkGo').disabled = !ok;
}
function ebBankSave() {
  var S = ebBkSel(); if (!(S.r.length || S.o.length || S.u.length) || (Math.abs(S.diff) >= 1 && !ebBkFixOk(S))) return;
  var l = ebBk.l, info = bankAcctInfo(l.acct), acc = info ? info.acc : '1101', d = l.date.slice(0, 10), biz = state.biz, E = [], tags = [], recv = 0;
  S.r.forEach(function (i) {
    var r = ebBk.rows[i], tg = ' · ' + r.phone + ' #' + r.id, f = Math.min(r.feeLeft, r.colLeft);
    if (f > 0.5) E.push({ biz: biz, date: d, dr: '3101', cr: '1201', amount: r0(f), partner: BUUHIA, desc: 'Буухиа тооцоо · хөлс суутгасан' + tg });
    if (r.feeLeft - f > 0.5) E.push({ biz: biz, date: d, dr: '3101', cr: acc, amount: r0(r.feeLeft - f), partner: BUUHIA, desc: 'Буухиа тооцоо · хөлс (мөнгө хураагаагүй)' + tg });
    if (r.colLeft - f > 0.5) { recv += r.colLeft - f; tags.push('#' + r.id); }
  });
  S.o.forEach(function (i) {
    var it = ebBk.old[i], v = r0(Math.min(Number(($('ebBkOld' + i) || {}).value) || 0, it.amt - it.paid));
    if (v > 0.5) E.push({ biz: biz, date: d, dr: '3101', cr: acc, amount: v, partner: BUUHIA, desc: 'Буухиа тооцоо · ' + (it.eb ? 'захиалгагүй хүргэлтийн хөлс (' + it.eb + ')' : 'хуучин өрөөс суутгасан') + ' #' + debtTag(it) });
  });
  S.u.forEach(function (i) { var u = ebBk.unl[i]; E.push({ biz: biz, date: d, dr: '7124', cr: acc, amount: u.fee, partner: BUUHIA, desc: 'Буухиа тооцоо · хөлс (захиалгагүй) · ' + u.x.phone + ' #EB:' + u.x.code }); });
  if (recv > 0.5) E.unshift({ biz: biz, date: d, dr: acc, cr: '1201', amount: r0(recv), partner: BUUHIA, desc: 'Буухиа тооцоо · орсон мөнгө · ' + S.r.length + ' захиалга ' + tags.join(' ') });
  if (S.ext > 0.5) E.push({ biz: biz, date: d, dr: '7124', cr: acc, amount: S.ext, partner: BUUHIA, desc: 'Буухиа тооцоо · нэмэлт төлбөр (нэмэлт, овор, оператор, мессеж)' });
  if (Math.abs(S.diff) >= 1) E.push({ biz: biz, date: d, dr: S.diff < 0 ? '7124' : acc, cr: S.diff < 0 ? acc : '7124', amount: Math.abs(S.diff), partner: BUUHIA, desc: 'Буухиа тооцоо · хөлсний зөрүү' });
  E.forEach(function (e) { e.bankId = l.id; });
  var upd = [{ id: l.id, status: 'Тулгасан', link: 'Буухиа тооцоо · ' + S.r.length + ' захиалга' }];
  if (!confirm('Буухиагийн тооцоо ' + d + ': ' + S.r.length + ' захиалга, банкаар ' + mny(ebBkAmt(l)) + '\nХураасан ' + fmt(S.col) + ' − хөлс ' + fmt(S.fee + S.unl) + (S.old ? ' − хуучин өр ' + fmt(S.old) : '') + (S.ext ? ' − нэмэлт төлбөр ' + fmt(S.ext) : '') + (Math.abs(S.diff) >= 1 ? '\nХөлсний зөрүү ' + mny(S.diff) : '') + '\n\n' + E.length + ' журналын бичилт үүснэ. Тулгах уу?')) return;
  gClose();
  if (!API_URL) { E.forEach(function (e, i) { e.id = 'J' + Date.now() + '-' + i; e.by = ownerName; journal.push(e); }); l.status = 'Тулгасан'; l.link = upd[0].link; render(); return; }
  l.status = 'Тулгасан'; l.link = upd[0].link; delete bankPick[l.id];
  E.forEach(function (e, i) { journal.push(Object.assign({ id: 'tmp' + Date.now() + '-' + i, by: ownerName }, e)); }); _debtCache = null; render();
  var n = 2, fin = function () { if (--n === 0) { toast('Буухиагийн тооцоо тулгагдлаа'); refresh(); } };
  post({ type: 'admin_journal', by: ownerName, entries: E }, function (err) {
    if (err) { if (err !== 'locked') toast('Журнал бичигдсэнгүй: ' + err); refresh(); return; }
    fin(); post({ type: 'admin_bank', by: ownerName, updates: upd }, function (e2) { if (e2) toast('Алдаа: ' + e2); fin(); });
  });
}
// Буухиагийн мэдээлэл ирэхэд самбарыг шинэчилнэ
(function () {
  var base = window.ebRedraw;
  window.ebRedraw = function (keep) { if (base) base(keep); if (state.module === 'finance' && (state.sub || {}).finance === 'ebset' && document.getElementById('ebSetBox')) render();
    else if (state.module === 'finance' && (state.sub || {}).finance === 'bank' && window.__ebBSig !== JSON.stringify(ebBatches())) render();
    else if (state.module === 'sales' && (state.sub || {}).sales === 'ebrec' && document.getElementById('ebGenBox')) render(); };
})();
