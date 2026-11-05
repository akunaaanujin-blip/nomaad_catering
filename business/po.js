// ── БАРАА ЗАХИАЛГА (Хятад) ──
// Захиалга үүсгэнэ → урьдчилгаа, үлдэгдэл төлбөр (банкны хуулга эсвэл «Төлбөр» товч) → бараа ирэх бүрт «Бараа ирсэн» (хэсэг хэсгээр).
// Төлбөр бүр журналд Дт 1505 «Захиалсан бараа»-аар «#ID» лавлагаатай — бараа ирэх хүртэл 1505 нь нийлүүлэгчээс авах авлага («Замд»).
// Ирэлт бүрт 1505-ын үлдэгдлийг ирээгүй барааны үнийн дүнд эзлэх хувиар нь бараанд шилжүүлнэ (Дт 1404 / Кт 1505); сүүлийн ирэлт үлдсэнийг бүгдийг авна.
// Карго: бараа ирсний дараа тооцогддог — «ирэлт N»-ийн карго нь Дт 1404 / Кт банк (эсвэл 3101) «#ID ирэлт N»; өртгийн хөдөлгүүр тэр ирэлтийн бараанд нэмнэ.

var PO_CUR = { CNY: '¥', USD: '$', MNT: '₮' };
function poList(biz) { return (window.pos || []).filter(function (p) { return p.biz === biz && p.status !== 'Цуцалсан'; }); }
function poById(id) { return (window.pos || []).filter(function (p) { return p.id === id; })[0]; }
// Төрөл: тэмдэглэлийн эхэнд «[Хөрөнгө]» — ирэлт нь үлдэгдэлд биш, Үндсэн хөрөнгөд орно (Дт 2001 / Кт 1505 «ирэлт N · нэр × тоо #FA… #PO…»)
var PO_FA = '[Хөрөнгө]';
function poIsAsset(P) { return String((P || {}).note || '').indexOf(PO_FA) === 0; }
function poNoteText(P) { return String((P || {}).note || '').replace(PO_FA, '').replace(/\[Нэр: [^\]]*\]/, '').trim(); }
// Захиалгын нэр: хэрэглэгчийн өгсөн нэр («Тэмдэглэл»-д [Нэр: …] хэлбэрээр), нэргүй хуучин захиалгад барааны нэрс
function poNameOwn(P) { return (String((P || {}).note || '').match(/\[Нэр: ([^\]]*)\]/) || [])[1] || ''; }
function poTitle(P) {
  var n = poNameOwn(P); if (n) return n;
  var it = (P || {}).items; if (typeof it === 'string') { try { it = JSON.parse(it); } catch (e) { it = []; } }
  it = (it || []).map(function (x) { return x.name; }).filter(Boolean);
  return it.length ? it.slice(0, 2).join(', ') + (it.length > 2 ? ' +' + (it.length - 2) : '') : (P || {}).no || '';
}
function poAssetTag(P, n) {   // тэр ирэлтийн хамгийн их өртөгтэй хөрөнгө — дараа ирсэн карго түүний өртөгт нэмэгдэнэ
  var best = null;
  Jc().forEach(function (e) { if (e.dr === '2001' && e.cr === '1505' && hasTag(e.desc, P.id) && poShipRe(n).test(e.desc) && (!best || e.amount > best.amount)) best = e; });
  return best ? (String(best.desc).match(/#(FA\d+)/) || [])[1] || '' : '';
}
function poCurAmt(P, v) { return P.cur === 'MNT' ? fmt(v) : PO_CUR[P.cur] + (Math.round(v * 100) / 100).toLocaleString('en-US'); }
function poShipNo(note) { var x = String(note || '').match(/ирэлт (\d+)/); return x ? Number(x[1]) : 1; }   // хуучин (ирэлтгүй) орлого — 1-р ирэлт
function poShipRe(n) { return new RegExp('ирэлт ' + n + '(?!\\d)'); }
function poStat(P, E) {   // post — бараа ирсний дараа тооцсон карго (1404), bal — 1505-д үлдсэн (замд яваа, нийлүүлэгчээс авах)
  var sup = 0, cargo = 0, accr = 0, accrC = 0, post = 0, out = 0;
  (E || Jc()).forEach(function (e) {
    if (!hasTag(e.desc, P.id)) return;
    var isC = /карго/i.test(e.desc);
    if (e.cr === '1505') { out += e.amount; return; }
    if ((e.dr === '1404' || e.dr === '2001') && isC) { post += e.amount; return; }
    if (e.dr !== '1505') return;
    var cash = ACC[e.cr] && ACC[e.cr].cash;
    if (cash) { if (isC) cargo += e.amount; else sup += e.amount; } else { if (isC) accrC += e.amount; else accr += e.amount; }
  });
  return { sup: r0(sup), paid: r0(sup + accr), cargo: r0(cargo), accr: r0(accr), accrC: r0(accrC), post: r0(post), total: r0(sup + cargo + accr + accrC), bal: r0(sup + cargo + accr + accrC - out) };
}
// Ирэлтүүд: [{ n, date, items:{name:qty}, goods, cargoPre, cargoPost }] — орлогын хөдөлгөөн (тэмдэглэлд «ирэлт N #ID») + журналын карго
function poShips(P, E) {
  var S = {};
  (moves || []).forEach(function (m) {
    if (m.biz !== P.biz || m.kind !== 'Орлого' || m.pay !== 'Захиалга' || !hasTag(m.note, P.id)) return;
    var n = poShipNo(m.note), x = S[n] = S[n] || { n: n, date: String(m.date).slice(0, 10), items: {}, goods: 0, cargoPre: 0, cargoPost: 0 }, q = Number(m.qty) || 0;
    x.items[m.item] = (x.items[m.item] || 0) + q;
    x.goods += q * ((Number(m.cost) || 0) - (Number(m.cargo) || 0)); x.cargoPre += q * (Number(m.cargo) || 0);
  });
  if (poIsAsset(P)) (E || Jc()).forEach(function (e) {   // хөрөнгийн ирэлт — хөдөлгөөн биш, журналаас
    if (e.dr !== '2001' || e.cr !== '1505' || !hasTag(e.desc, P.id)) return;
    var m = String(e.desc).match(/· ирэлт (\d+) · (.+) × ([\d.]+)(?: · карго ([\d.]+))? #/); if (!m) return;
    var n = Number(m[1]), x = S[n] = S[n] || { n: n, date: String(e.date).slice(0, 10), items: {}, goods: 0, cargoPre: 0, cargoPost: 0 }, c = Number(m[4]) || 0;
    x.items[m[2]] = (x.items[m[2]] || 0) + Number(m[3]); x.goods += e.amount - c; x.cargoPre += c;
  });
  var L = Object.keys(S).map(function (k) { return S[k]; }).sort(function (a, b) { return a.n - b.n; });
  (E || Jc()).forEach(function (e) {
    if ((e.dr !== '1404' && e.dr !== '2001') || e.cr === '1505' || !/карго/i.test(e.desc) || !hasTag(e.desc, P.id)) return;
    var n = poShipNo(e.desc); L.forEach(function (x) { if (x.n === n) x.cargoPost += e.amount; });
  });
  L.forEach(function (x) { x.goods = r0(x.goods); x.cargoPre = r0(x.cargoPre); x.cargoPost = r0(x.cargoPost); });
  return L;
}
function poRecvQty(P, L) { var o = {}; (L || poShips(P)).forEach(function (x) { for (var k in x.items) o[k] = (o[k] || 0) + x.items[k]; }); return o; }
// ── Ажилтны «Бараа ирсэн», карго: тоо, дүнг ажилтан бичнэ — энд баталмагц ердийн цонхоор үлдэгдэл, журналд орно ──
var _piId = '';
function poInPend(biz) { return (window.poInbox || []).filter(function (x) { return x.biz === biz && x.status === 'Хүлээгдэж'; }); }
function poInCard() {
  var L = poInPend(state.biz); if (!L.length) return '';
  return '<div class="card rep"><div class="rep-cap"><b>Ажилтны бүртгэл — батлах</b></div><div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Ажилтан</th><th>Захиалга</th><th>Юу</th><th></th></tr>' + L.map(function (x) {
    var d = x.data || {}, what = x.kind === 'recv' ? 'Бараа ирсэн: ' + (d.items || []).map(function (i) { return esc(i.name) + ' × ' + i.qty; }).join(', ') + (hasWarehouse(state.biz) ? ' · ' + esc(d.loc || '') : '') + (d.cargo ? ' · карго ' + mny(d.cargo) + ' (' + esc(d.co || '') + ')' : '')
      : 'Карго ' + mny(d.amount) + ' · ' + esc(d.co || '') + (d.ship ? ' · ' + d.ship + '-р ирэлт' : '');
    return '<tr><td class="nw">' + esc(d.date || x.at.slice(0, 10)) + '</td><td>' + esc(x.by) + '</td><td>' + esc(x.poNo) + '</td><td>' + what + (d.note ? '<br><small class="muted">' + esc(d.note) + '</small>' : '') + '</td>' +
      '<td class="n" style="white-space:nowrap"><button class="mini" style="color:var(--green)" onclick="poInOpen(\'' + x.id + '\')">Батлах</button> <button class="mini" onclick="poInReject(\'' + x.id + '\')">Татгалзах</button></td></tr>';
  }).join('') + '</table></div></div>';
}
// Ажилтны хийсэн бүртгэл (Бараа ирсэн, карго): хөдөлгөөн + журналаас, хамгийн шинэ нь эхэнд
function poInLog() {
  var biz = state.biz, L = (window.pos || []).filter(function (p) { return p.biz === biz; }), R0 = [];
  var po = function (t) { return L.filter(function (p) { return hasTag(t, p.id); })[0]; };
  (moves || []).forEach(function (m) {
    if (m.biz !== biz || m.kind !== 'Орлого' || m.pay !== 'Захиалга') return;
    var P = po(m.note); if (!P) return;
    R0.push({ d: String(m.date), by: m.by, P: P, what: m.item + ' × ' + m.qty + (hasWarehouse(biz) ? ' · ' + m.loc : ''), v: (Number(m.cost) || 0) * (Number(m.qty) || 0), id: m.id });
  });
  (journal || []).forEach(function (j) {
    if (j.biz !== biz || !/карго \(дараа төлнө\)/.test(j.desc)) return;
    var P = po(j.desc); if (!P) return;
    R0.push({ d: String(j.date), by: j.by, P: P, what: 'Карго · ' + (j.partner || ''), v: Number(j.amount) || 0 });
  });
  R0.sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
  return poInCard() + '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Хэн</th><th>Захиалга</th><th>Юу</th><th class="n">Өртөг</th><th></th></tr>' +
    (R0.length ? R0.slice(0, 200).map(function (r) {
      return '<tr><td class="nw">' + esc(r.d.slice(0, 16)) + '</td><td>' + esc(r.by || '') + '</td><td>' + esc(poTitle(r.P)) + '<br><small class="muted">' + esc(r.P.no) + '</small></td><td>' + esc(r.what) + '</td><td class="n">' + (r.v ? fmt(r.v) : '<span class="neg">0</span>') + '</td>' +
        '<td class="n">' + (r.id ? '<button class="mini" onclick="cancelMove(' + esc(JSON.stringify(r.id)) + ')">Устгах</button>' : '') + '</td></tr>'; }).join('')
      : '<tr><td colspan="6" class="muted">Ажилтны бүртгэл алга</td></tr>') + '</table></div></div>';
}
function poInOpen(id) {
  var x = (window.poInbox || []).filter(function (r) { return r.id === id; })[0]; if (!x) return;
  var P = poById(x.poId), d = x.data || {}; if (!P) { toast('Захиалга олдсонгүй'); return; }
  if (x.kind === 'recv') {
    if (P.status !== 'Захиалсан') { toast('Энэ захиалга хаагдсан байна — татгалзана уу'); return; }
    openPoRecv(P.id);
    var q = {}; (d.items || []).forEach(function (i) { q[i.name] = i.qty; });
    (P.items || []).forEach(function (it, i) { $('prQ' + i).value = q[it.name] || 0; });
    $('prDate').value = d.date || todayStr(); if ($('prLoc') && d.loc) $('prLoc').value = d.loc;
    if (d.cargo) { $('prUnCargo').value = d.cargo; $('prCargoCo').value = d.co || ''; }   // Дт 1505 / Кт 3101 — карго компанийн өглөг, хуулгаар хаагдана
    prAuto();
  } else {
    openPoPay(P.id, 'c');
    $('ppDate').value = d.date || todayStr(); $('ppAcc').value = '3101'; $('ppAmt').value = d.amount; $('ppCo').value = d.co || '';
    if (d.ship && $('ppShip').querySelector('option[value="' + d.ship + '"]')) $('ppShip').value = String(d.ship);
    ppCalc();
  }
  _piId = id;
}
function poInDone(id, st, cb) {   // төлөв бичээд жагсаалтаас хасна
  var drop = function () { window.poInbox = (window.poInbox || []).filter(function (r) { return r.id !== id; }); };
  if (!API_URL) { drop(); save('nb_demo_poinbox', load('nb_demo_poinbox', []).map(function (r) { if (r.id === id) r.status = st; return r; })); cb(); return; }
  post({ type: 'admin_po', inboxId: id, inboxStatus: st }, function (err) { if (err) toast('Төлөв шинэчлэгдсэнгүй: ' + err); else drop(); cb(); });
}
function poInClose(cb) { var id = _piId; _piId = ''; if (id) poInDone(id, 'Батлагдсан', cb); else cb(); }
function poInReject(id) {
  if (!confirm('Ажилтны энэ бүртгэлийг татгалзах уу? Үлдэгдэл, журнал өөрчлөгдөхгүй.')) return;
  poInDone(id, 'Татгалзсан', function () { toast('Татгалзлаа'); render(); });
}
function poView() {
  var list = (window.pos || []).filter(function (p) { return p.biz === state.biz; }).slice().reverse(), E = Jc();
  var rows = list.map(function (P) {
    var s = poStat(P, E), L = poShips(P, E), rq = poRecvQty(P, L), open = P.status === 'Захиалсан', its = P.items || [];
    var spec = { acc: ['1505'], tag: P.id, sign: 1, dir: 1, grp: 'cat', t: P.no + ' · ' + P.supplier };
    var acts = (open ? '<button class="mini" style="color:var(--accent)" onclick="openPoPay(\'' + P.id + '\',\'s\')">Төлбөр</button>' : '') +
      (P.status !== 'Цуцалсан' ? '<button class="mini" onclick="openPoPay(\'' + P.id + '\',\'c\')">Карго</button>' : '') +
      (open ? '<button class="mini" style="color:var(--green)" onclick="openPoRecv(\'' + P.id + '\')">Бараа ирсэн</button>' +
        '<button class="mini" onclick="openPo(\'' + P.id + '\')">Засах</button>' + (L.length ? '' : '<button class="mini" onclick="poCancel(\'' + P.id + '\')">Цуцлах</button>') : '');
    var shipTxt = L.map(function (x) {
      var c = x.cargoPre + x.cargoPost;
      return '<br><small class="muted">' + x.n + '-р ирэлт ' + esc(x.date.slice(5)) + ' · ' + Object.keys(x.items).length + ' бараа · ' + (c ? 'карго ' + mny(c) : 'карго тооцоогүй') + '</small>';
    }).join('');
    var st = P.status === 'Ирсэн' ? '<span class="tag">Ирсэн ' + esc(P.recvDate || '') + '</span>' : P.status === 'Цуцалсан' ? '<span class="tag r">Цуцалсан</span>' :
      '<span class="tag b">' + (L.length ? 'Хэсэгчлэн ирсэн' : s.paid ? 'Төлбөр хийгдсэн' : 'Захиалсан') + '</span>';
    return '<tr' + (P.status === 'Цуцалсан' ? ' style="opacity:.55"' : '') + '><td><b>' + esc(poTitle(P)) + '</b><br><small class="muted">' + esc(P.no) + ' · ' + esc(P.date) + '</small></td><td style="min-width:110px">' + esc(P.supplier) + (P.cargoCo ? '<br><small class="muted">Карго: ' + esc(P.cargoCo) + '</small>' : '') + '</td>' +
      '<td style="white-space:normal;min-width:180px">' + (poIsAsset(P) ? '<small class="muted">Үндсэн хөрөнгө</small><br>' : '') + esc(its.map(function (i) { return i.name + ' × ' + (rq[i.name] ? round2(rq[i.name]) + '/' : '') + i.qty; }).join(', ')) + shipTxt + '</td>' +
      '<td class="n">' + poCurAmt(P, P.total) + '</td>' +
      '<td class="n">' + (s.paid ? dl(Object.assign({}, spec, { t: spec.t + ' — нийлүүлэгчид төлсөн' }), mny(s.paid)) : '') + '</td>' +
      '<td class="n">' + (s.cargo + s.accrC + s.post ? mny(s.cargo + s.accrC + s.post) : '') + '</td>' +
      '<td class="n">' + (Math.abs(s.bal) >= 1 ? dl(Object.assign({}, spec, { dir: 0, t: spec.t + ' — замд яваа (1505)' }), mny(s.bal)) : '') + '</td>' +
      '<td style="white-space:nowrap">' + st + '</td><td class="n"><div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;min-width:150px">' + acts + '</div></td></tr>';
  }).join('');
  return poInCard() + '<p class="hint">1) «+ Шинэ захиалга» — ямар бараа, хэдийг, хэдэн юаниар захиалсан. 2) Нийлүүлэгчид төлсөн мөнгийг «Банкны хуулга»-аас энэ захиалгаар тулгана — бараа ирэх хүртэл «Замд» баганад авлага болж харагдана. ' +
    '3) Бараа ирэх бүрт «Бараа ирсэн» — ирсэн тоогоо оруулна (хэсэг хэсгээр ирж болно); ирсэн барааны хэсэг нь «Замд»-аас хасагдаж үлдэгдэлд орно. ' +
    '4) Каргоны мөнгийг бараа ирсний дараа хуулгаас «… ирэлтийн карго»-оор тулгана (эсвэл «Карго» товч) — тэр ирэлтийн барааны өртөгт нэмэгдэнэ. ' +
    'Төрлийг «Үндсэн хөрөнгө» гэж сонгосон захиалга ирэхэд (ажилтан бүртгэсэн ч) үлдэгдэлд биш, «Үндсэн хөрөнгө»-д орно.</p>' + poLowCard() +
    '<div class="card rep"><div class="rep-cap"><b>Захиалгууд</b></div><div class="scroll"><table class="rep-t"><tr><th>Дугаар</th><th>Нийлүүлэгч</th><th>Бараа (ирсэн/захиалсан)</th><th class="n">Нийт (валютаар)</th><th class="n">Төлсөн</th><th class="n">Карго</th><th class="n" title="Төлсөн боловч бараа нь ирээгүй — нийлүүлэгчээс авах (1505)">Замд</th><th>Төлөв</th><th></th></tr>' +
    (rows || '<tr><td colspan="9" class="muted">Захиалга алга — «+ Шинэ захиалга» дарна уу</td></tr>') + '</table></div></div>';
}
// ── Захиалах бараа: үлдэгдэл + замд яваа нь доод үлдэгдлээс бага ──
function poSuggest(biz, r, oo) { return Math.max(1, Math.ceil(minOf(biz, r.name) * 2 - (round2(r.shop + r.wh) + (oo[r.name] || 0)))); }
function poLowCard() {
  var biz = state.biz, oo = onOrder(biz), lb = lastBuys(biz), rows = stockRows(biz);
  if (state.msEdit) {
    return '<div class="card rep"><div class="rep-cap"><b>Доод үлдэгдэл тохируулах</b><span>Бараа бүрийн хамгийн бага байх тоо. Хоосон эсвэл 0 — хянахгүй.</span></div>' +
      '<div class="bar-row" style="padding:10px 12px;gap:6px"><input class="search" placeholder="Бараа хайх…" oninput="msFilter(this.value)" style="max-width:260px">' +
      '<div class="pg-act"><button class="b-btn primary" onclick="msSave()">Хадгалах</button><button class="b-btn" onclick="state.msEdit=false;render()">Болих</button></div></div>' +
      '<div class="scroll"><table class="rep-t"><tr><th>Бараа</th><th>Ангилал</th><th class="n">Үлдэгдэл</th><th class="n">Замд</th><th class="n">Доод үлдэгдэл</th></tr>' +
      rows.map(function (r) {
        var mn = minOf(biz, r.name);
        return '<tr class="ms-row" data-q="' + esc((r.name + ' ' + r.cat).toLowerCase()) + '"><td>' + esc(r.name) + '</td><td class="muted">' + esc(r.cat) + '</td><td class="n">' + round2(r.shop + r.wh) + '</td>' +
          '<td class="n">' + (oo[r.name] ? round2(oo[r.name]) : '') + '</td><td class="n"><input type="number" min="0" step="any" class="ms-in" data-k="' + esc(r.name) + '" value="' + (mn || '') + '" style="width:80px"></td></tr>';
      }).join('') + '</table></div></div>';
  }
  var need = needList(biz), anyMin = rows.some(function (r) { return minOf(biz, r.name) > 0; });
  return '<div class="card rep"><div class="rep-cap"><b>Захиалах бараа</b><span>Үлдэгдэл + замд яваа нь доод үлдэгдлээс бага болсон бараа</span></div>' +
    (need.length ? '<div class="scroll"><table class="rep-t"><tr><th>Бараа</th><th class="n">Үлдэгдэл</th><th class="n">Замд</th><th class="n">Доод үлдэгдэл</th><th class="n">Санал болгох тоо</th><th class="n">Сүүлд авсан үнэ</th></tr>' +
      need.map(function (r) {
        return '<tr><td>' + esc(r.name) + '</td><td class="n">' + round2(r.shop + r.wh) + '</td><td class="n">' + (oo[r.name] ? round2(oo[r.name]) : '') + '</td><td class="n">' + round2(minOf(biz, r.name)) + '</td>' +
          '<td class="n"><b>' + poSuggest(biz, r, oo) + '</b></td><td class="n">' + buyText(lb[r.name]) + '</td></tr>';
      }).join('') + '</table></div>'
      : '<p class="muted" style="margin:10px 12px">' + (anyMin ? 'Доод үлдэгдлээс бага бараа алга.' : 'Доод үлдэгдэл тохируулаагүй байна — «Доод үлдэгдэл тохируулах» дарж бараа бүрийн хамгийн бага тоог оруулбал дуусах дөхсөн бараа энд гарна.') + '</p>') +
    '<div class="pg-act" style="padding:0 12px 12px">' + (need.length ? '<button class="b-btn primary" onclick="poFromLow()">Эдгээрээр захиалга үүсгэх</button>' : '') +
    '<button class="b-btn" onclick="state.msEdit=true;render()">Доод үлдэгдэл тохируулах</button></div></div>';
}
function msFilter(q) {
  q = String(q || '').toLowerCase().trim();
  [].forEach.call(document.querySelectorAll('.ms-row'), function (tr) { tr.style.display = !q || tr.dataset.q.indexOf(q) >= 0 ? '' : 'none'; });
}
// ── Захиалга үүсгэх / засах ──
var pqIt = [];
function openPo(id, preset) {   // preset — «Захиалах» бараанаас үүсгэсэн ноорог { items, supplier, note }
  var P = id ? poById(id) : null;
  pqIt = P ? (P.items || []).map(function (i) { return { name: i.name, qty: i.qty, price: i.price, cn: i.cn || '' }; }) : preset && preset.items ? preset.items : [{ name: '', qty: '', price: '', cn: '' }];
  var shipped = P && poShips(P).length;
  gOpen('<h2>' + (P ? 'Захиалга засах · ' + esc(P.no) : 'Шинэ бараа захиалга') + '</h2>' +
    '<label for="pqKind">Төрөл</label><select id="pqKind" onchange="pqRender()"' + (shipped ? ' disabled title="Ирэлт бүртгэгдсэн тул солихгүй"' : '') + '>' + (P || preset ? '' : '<option value="">Сонгоно уу</option>') +
      '<option value="goods">Дэлгүүрийн бараа — үлдэгдэлд орж зарагдана</option><option value="asset">Үндсэн хөрөнгө — дэлгүүрт өөрөө ашиглана</option></select>' +
    '<label for="pqName">Захиалгын нэр</label><input id="pqName" maxlength="60" placeholder="Жишээ: Зүлэг 11 сар, Лего шал" autocomplete="off">' +
    '<div class="row2"><div><label for="pqSup">Нийлүүлэгч</label><input id="pqSup" list="pqSups" placeholder="Жишээ: Yiwu ..."><datalist id="pqSups">' + partnerOptions() + '</datalist></div>' +
    '<div><label for="pqDate">Огноо</label><input id="pqDate" type="date"></div></div>' +
    '<div class="row2"><div><label for="pqCur">Валют</label><select id="pqCur" onchange="pqRender()"><option value="CNY">¥ юань</option><option value="USD">$ доллар</option><option value="MNT">₮ төгрөг</option></select></div>' +
    '<div><label for="pqCargo">Карго компани</label><input id="pqCargo" list="pqSups" placeholder="Мэдэгдэж байвал"></div></div>' +
    '<label>Бараа</label><datalist id="pqProds">' + BUSINESSES[state.biz].products.map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join('') + '</datalist>' +
    '<div id="pqItems"></div><button class="b-btn" style="margin-top:6px" onclick="pqIt.push({name:\'\',qty:\'\',price:\'\',cn:\'\'});pqRender()">+ Мөр нэмэх</button>' +
    '<p id="pqTot" style="margin-top:8px"></p>' +
    '<label for="pqNote">Тэмдэглэл</label><input id="pqNote">' +
    '<button class="btn" onclick="savePo(' + (P ? '\'' + P.id + '\'' : '') + ')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  $('pqSup').value = P ? P.supplier : preset ? preset.supplier || '' : ''; $('pqDate').value = P ? P.date : todayStr(); $('pqCur').value = P ? P.cur : load('nb_cur', 'CNY');
  $('pqCargo').value = P ? P.cargoCo : load('nb_cargoco', ''); $('pqNote').value = P ? poNoteText(P) : preset ? preset.note || '' : ''; $('pqName').value = P ? poNameOwn(P) : '';
  $('pqKind').value = P ? (poIsAsset(P) ? 'asset' : 'goods') : preset ? 'goods' : '';
  pqRender();
}
function pqRender() {
  var sg = PO_CUR[$('pqCur').value];
  $('pqItems').innerHTML = '<table class="rep-t"><tr><th>Бараа</th><th class="n">Тоо</th><th class="n">Нэгж үнэ (' + sg + ')</th><th class="n" title="Нийлүүлэгчээс Хятад дахь каргоны агуулах хүртэлх тээвэр — мөрийн нийт дүн">Хятад дахь карго (' + sg + ')</th><th class="n">Дүн</th><th></th></tr>' + pqIt.map(function (it, i) {
    return '<tr><td style="white-space:nowrap"><input list="pqProds" value="' + esc(it.name) + '" oninput="pqIt[' + i + '].name=this.value;pqMark(' + i + ')" style="min-width:180px"> <span id="pqN' + i + '" class="muted" style="font-size:12px" title="Барааны бүртгэлд алга — ирэхэд нь бүртгэнэ"></span></td>' +
      '<td class="n"><input type="number" min="0" step="any" value="' + it.qty + '" oninput="pqIt[' + i + '].qty=this.value;pqTot()" style="width:70px"></td>' +
      '<td class="n"><input type="number" min="0" step="any" value="' + it.price + '" oninput="pqIt[' + i + '].price=this.value;pqTot()" style="width:100px"></td>' +
      '<td class="n"><input type="number" min="0" step="any" value="' + (it.cn || '') + '" oninput="pqIt[' + i + '].cn=this.value;pqTot()" style="width:90px"></td>' +
      '<td class="n" id="pqL' + i + '"></td><td><button class="mini" onclick="pqIt.splice(' + i + ',1);pqRender()">✕</button></td></tr>';
  }).join('') + '</table>';
  pqIt.forEach(function (it, i) { pqMark(i); });
  pqTot();
}
function poKnown(name) { var n = String(name || '').trim().toLowerCase(); return BUSINESSES[state.biz].products.some(function (p) { return p.name.toLowerCase() === n; }); }
function pqMark(i) { var c = $('pqN' + i), n = String(pqIt[i].name || '').trim(); if (c) c.textContent = n && $('pqKind').value !== 'asset' && !poKnown(n) ? 'шинэ' : ''; }
function pqTot() {
  var sg = PO_CUR[$('pqCur').value], t = 0;
  pqIt.forEach(function (it, i) { var v = (Number(it.qty) || 0) * (Number(it.price) || 0) + (Number(it.cn) || 0); t += v; var c = $('pqL' + i); if (c) c.textContent = v ? sg + (Math.round(v * 100) / 100).toLocaleString('en-US') : ''; });
  $('pqTot').innerHTML = 'Нийт: <b>' + sg + (Math.round(t * 100) / 100).toLocaleString('en-US') + '</b>';
}
function savePo(id) {
  var items = pqIt.filter(function (i) { return String(i.name).trim() && Number(i.qty) > 0; }).map(function (i) { return { name: String(i.name).trim(), qty: Number(i.qty), price: Number(i.price) || 0, cn: Number(i.cn) || 0 }; });
  var x = { biz: state.biz, supplier: $('pqSup').value.trim(), date: $('pqDate').value, cur: $('pqCur').value, cargoCo: $('pqCargo').value.trim(), note: (($('pqName').value.trim() ? '[Нэр: ' + $('pqName').value.trim().replace(/[\[\]]/g, '').slice(0, 60) + '] ' : '') + $('pqNote').value.trim()).trim(), items: items };
  var kind = $('pqKind').value;
  if (!kind) { toast('Төрлөө сонгоно уу: дэлгүүрийн бараа эсвэл үндсэн хөрөнгө'); return; }
  if (kind === 'asset') x.note = (PO_FA + ' ' + x.note).trim();   // нэр нь дээр нэмэгдсэн
  if (x.supplier.length < 2) { toast('Нийлүүлэгчийн нэрийг бичнэ үү'); return; }
  if (!items.length) { toast('Дор хаяж нэг бараа, тоотой нь бичнэ үү'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date)) { toast('Огноо оруулна уу'); return; }
  save('nb_cur', x.cur); if (x.cargoCo) save('nb_cargoco', x.cargoCo);
  if (!API_URL) {
    window.pos = window.pos || [];
    x.total = Math.round(items.reduce(function (a, i) { return a + i.qty * i.price + i.cn; }, 0) * 100) / 100;
    if (id) Object.assign(poById(id), x);
    else { x.id = 'PO' + Date.now(); x.no = 'ЗХ-' + ('000' + (window.pos.filter(function (p) { return p.biz === x.biz; }).length + 1)).slice(-4); x.status = 'Захиалсан'; window.pos.push(x); }
    save('nb_demo_pos', window.pos); gClose(); render(); toast('Хадгалагдлаа'); return;
  }
  post({ type: 'admin_po', po: x, updateId: id || undefined }, function (err, d) { if (err) { toast('Алдаа: ' + err); return; } gClose(); toast((d.no || '') + ' хадгалагдлаа'); refresh(); });
}
function poCancel(id) {
  var P = poById(id), s = poStat(P);
  if (!confirm(P.no + ' захиалгыг цуцлах уу?' + (s.total ? '\n\nАНХААР: энэ захиалгад ' + fmt(s.total) + ' төлсөн байна — тэр мөнгө «Захиалсан бараа (1505)»-д үлдэнэ. Буцааж авбал «Банкны хуулга»-аас тулгана.' : ''))) return;
  poSetStatus(id, 'Цуцалсан', '', function () { toast('Цуцлагдлаа'); });
}
function poSetStatus(id, st, recvDate, cb) {
  if (!API_URL) { var P = poById(id); P.status = st; P.recvDate = recvDate || ''; save('nb_demo_pos', window.pos); render(); if (cb) cb(); return; }
  post({ type: 'admin_po', statusId: id, status: st, recvDate: recvDate }, function (err) { if (err) { toast('Алдаа: ' + err); return; } if (cb) cb(); refresh(); });
}
// ── Төлбөр (урьдчилгаа / үлдэгдэл / карго) ──
function poPayLabel(P, type) {
  if (/^k\d+$/.test(type)) return 'ирэлт ' + type.slice(1) + ' · карго';
  return type === 'c' ? 'Карго (урьдчилж)' : type === 'a' ? 'Урьдчилгаа' : type === 'b' ? 'Үлдэгдэл төлбөр' : type === 'f' ? 'Бүтэн төлбөр' : (poStat(P).paid > 0 ? 'Үлдэгдэл төлбөр' : 'Урьдчилгаа');
}
function poPayEntry(spec, acc, d, amt, note, cco) {   // spec: «PO123|s» (s — нийлүүлэгч, c — карго урьдчилж, kN — N-р ирэлтийн карго, a/b — урьдчилгаа/үлдэгдэл)
  var id = spec.split('|')[0], type = spec.split('|')[1] || 's', P = poById(id); if (!P) return null;
  var ship = /^k\d+$/.test(type), fa = ship && poIsAsset(P), tag = fa ? poAssetTag(P, type.slice(1)) : '', label = poPayLabel(P, type), partner = type === 'c' || ship ? (cco || P.cargoCo || 'Карго') : P.supplier;
  return { entry: { biz: P.biz, date: d, dr: fa ? '2001' : ship ? '1404' : '1505', cr: acc, amount: amt, partner: partner, desc: ((note ? note + ' · ' : '') + P.no + ' · ' + label + ' · ' + partner).slice(0, 170) + (tag ? ' #' + tag : '') + ' #' + P.id },
           link: 'Бараа захиалга · ' + poTitle(P) + ' · ' + label };
}
function poOpts(biz) {
  var out = [], from = todayStr(new Date(Date.now() - 180 * 864e5)), E = Jc();
  poList(biz).forEach(function (P) {
    var open = P.status === 'Захиалсан';
    if (open) out.push(['PO:' + P.id + '|s', poTitle(P) + ' · ' + P.supplier + ' — ' + poPayLabel(P, 's').toLowerCase()]);
    poShips(P, E).filter(function (x) { return x.date >= from; }).forEach(function (x) {
      var c = x.cargoPre + x.cargoPost;
      out.push(['PO:' + P.id + '|k' + x.n, poTitle(P) + ' — ' + x.n + '-р ирэлтийн карго (' + x.date.slice(5) + '-нд ирсэн' + (c ? ', бүртгэсэн ' + fmt(c) : '') + ')' + (P.cargoCo ? ' · ' + P.cargoCo : '')]);
    });
    if (open) out.push(['PO:' + P.id + '|c', poTitle(P) + ' — карго, бараа ирэхээс өмнө' + (P.cargoCo ? ' (' + P.cargoCo + ')' : '')]);
  });
  return out;
}
function openPoPay(id, type) {
  _piId = '';
  var P = poById(id), s = poStat(P), cargo = type === 'c', L = cargo ? poShips(P) : [], open = P.status === 'Захиалсан';
  gOpen('<h2>' + esc(P.no) + ' · ' + (cargo ? 'Каргоны төлбөр' : 'Төлбөр') + '</h2><p class="muted">' + esc(P.supplier) + ' · ' + poCurAmt(P, P.total) +
    ' · төлсөн ' + mny(s.paid) + (s.cargo + s.accrC + s.post ? ' · карго ' + mny(s.cargo + s.accrC + s.post) : '') + '</p>' +
    (cargo ? '<label for="ppShip">Аль барааны карго</label><select id="ppShip">' + L.map(function (x, i) {
        return '<option value="' + x.n + '"' + (i === L.length - 1 ? ' selected' : '') + '>' + x.n + '-р ирэлт · ' + esc(x.date) + ' ирсэн · ' + Object.keys(x.items).length + ' бараа' + (x.cargoPre + x.cargoPost ? ' (карго ' + fmt(x.cargoPre + x.cargoPost) + ')' : '') + '</option>'; }).join('') +
        (open || !L.length ? '<option value=""' + (L.length ? '' : ' selected') + '>Бараа ирээгүй байна (урьдчилж төлсөн)</option>' : '') + '</select>'
      : '<label for="ppType">Төрөл</label><select id="ppType"><option value="a"' + (s.paid ? '' : ' selected') + '>Урьдчилгаа</option><option value="b"' + (s.paid ? ' selected' : '') + '>Үлдэгдэл төлбөр</option><option value="f">Бүтэн төлбөр (нийт дүнгээр)</option></select>') +
    '<div class="row2"><div><label for="ppDate">Огноо</label><input id="ppDate" type="date" value="' + todayStr() + '"></div><div><label for="ppAcc">Хаанаас төлсөн</label><select id="ppAcc">' + cashAccOpts('1101') +
      (cargo ? '<option value="3101">Дараа төлнө (өглөг)</option>' : '') + '<option value="4201">Хаалтаас (' + esc(meta.closed || '10-26') + ') өмнө төлсөн — эхний үлдэгдэл</option></select></div></div>' +
    '<div class="row2"><div><label for="ppCur">Валют</label><select id="ppCur" onchange="ppCalc()"><option value="MNT">₮ төгрөг</option><option value="CNY">¥ юань</option><option value="USD">$ доллар</option></select></div>' +
      '<div><label for="ppAmt">' + (cargo ? 'Каргоны дүн' : 'Төлсөн дүн') + '</label><input id="ppAmt" type="number" min="0" step="any" oninput="ppCalc()"></div></div>' +
    '<div class="row2" id="ppRateRow" style="display:none"><div><label for="ppRate">Ханш (1 = ₮)</label><input id="ppRate" type="number" min="0" step="any" oninput="ppCalc()"></div><div><label>Төгрөгөөр</label><p id="ppMnt" style="margin:10px 0 0"></p></div></div>' +
    (cargo ? '<label for="ppCo">Карго компани</label><input id="ppCo" value="' + esc(P.cargoCo || '') + '">' : '') +
    (cargo ? '<p class="muted" style="font-size:12.5px">Ирсэн барааны карго тэр ирэлтийн бараа бүрийн өртөгт үнийн дүнгийн хувиар нэмэгдэнэ.</p>' : '') +
    '<button class="btn" onclick="savePoPay(\'' + id + '\',\'' + (cargo ? 'c' : '') + '\')">Бүртгэх</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  $('ppCur').value = cargo ? 'MNT' : P.cur;
  if ($('ppType')) $('ppType').onchange = function () { if (this.value === 'f') { $('ppCur').value = P.cur; $('ppAmt').value = P.total; } ppCalc(); };   // бүтэн төлбөр — захиалгын нийт дүн, захиалгын валютаар
  ppCalc();
}
function ppCalc() {   // валютаар бол ханшаар ₮ болгоно (журнал ₮-өөр)
  var cur = $('ppCur').value, fx = cur !== 'MNT', a = Number($('ppAmt').value) || 0, r = Number($('ppRate').value) || 0;
  $('ppRateRow').style.display = fx ? '' : 'none';
  $('ppMnt').textContent = fx && a && r ? fmt(Math.round(a * r)) : '';
  return fx ? Math.round(a * r) : Math.round(a);
}
function savePoPay(id, cargo) {
  var P = poById(id), cur = $('ppCur').value, fxAmt = Number($('ppAmt').value) || 0, amt = ppCalc(), d = $('ppDate').value, acc = $('ppAcc').value, cco = cargo ? $('ppCo').value.trim() : '';
  if (!(fxAmt > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (!(amt > 0)) { toast('Ханшаа оруулна уу'); return; }
  var paid = poStat(P).paid;   // давхар төлбөрөөс сэргийлнэ (хаалтаас өмнөх 4201 ч орно)
  if (!cargo && paid > 0 && !confirm(P.no + '-д нийлүүлэгчид ' + fmt(paid) + ' төлсөн гэж бүртгэгдсэн байна. Дахин ' + fmt(amt) + ' нэмэх үү?')) return;
  if (cargo && acc === '3101' && !cco) { toast('Каргог дараа төлөх бол карго компанийн нэрийг бичнэ үү'); return; }
  if (cco && cco !== P.cargoCo) P.cargoCo = cco;
  var note = cur !== 'MNT' ? PO_CUR[cur] + fxAmt + ' (ханш ' + (Number($('ppRate').value) || 0) + ')' : '';
  var type = cargo ? ($('ppShip').value ? 'k' + $('ppShip').value : 'c') : $('ppType').value;
  // Хаалтаас өмнө төлсөн (мөнгө нь архивт) — Дт 1505 / Кт 4201, огноо = шинээр эхэлсэн өдөр (хаалтын өдөр түгжигдсэн)
  if (acc === '4201') { if (meta.closed && d <= meta.closed) d = addDays(meta.closed, 1); note = (note ? note + ' · ' : '') + 'хаалтаас өмнө төлсөн'; }
  var pe = poPayEntry(id + '|' + type, acc, d, amt, note, cco);
  postEntries([pe.entry], function () { poInClose(function () { gClose(); toast(pe.link + ' бүртгэгдлээ'); if (API_URL) refresh(); else render(); }); });
}
// ── Бараа ирсэн (хэсэг хэсгээр): 1505-ын үлдэгдлээс энэ ирэлтэд ногдохыг бараанд хуваах ──
var _prId = '';
function openPoRecv(id) {
  _prId = id; prDone = {}; _piId = '';
  var P = poById(id), s = poStat(P), L = poShips(P), rq = poRecvQty(P, L), fa = poIsAsset(P), wh = !fa && hasWarehouse(state.biz);
  gOpen('<h2>' + esc(P.no) + ' · Бараа ирсэн' + (L.length ? ' (' + (L.length + 1) + '-р ирэлт)' : '') + '</h2><p class="muted">' + esc(P.supplier) + ' · захиалга ' + poCurAmt(P, P.total) + (fa ? ' · үндсэн хөрөнгөд орно' : '') + '</p>' +
    '<div class="row2"><div><label for="prDate">Ирсэн огноо</label><input id="prDate" type="date" value="' + todayStr() + '"></div>' +
    (wh ? '<div><label for="prLoc">Байршил</label><select id="prLoc"><option>Агуулах</option><option>Дэлгүүр</option></select></div>' : fa ? '<div><label for="prLife">Ашиглах хугацаа (сар)</label><input id="prLife" type="number" min="1" inputmode="numeric" placeholder="Жишээ: 60"></div>' : '<div></div>') + '</div>' +
    '<div id="prItems"></div><div id="prNew"></div>' +
    '<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="prFin" onchange="prCalc()" style="width:auto"> Захиалгын бүх бараа ирж дууссан (захиалгыг хаана)</label>' +
    '<table class="rep-t" style="margin-top:8px"><tr><td>Замд (1505) — нийлүүлэгчид төлсөн, бараа нь ирээгүй</td><td class="n">' + mny(s.bal) + '</td></tr></table>' +
    '<div class="row2"><div><label for="prUnSup">Нийлүүлэгчид дараа төлөх (₮)</label><input id="prUnSup" type="number" min="0" inputmode="numeric" oninput="prCalc()"></div>' +
    '<div><label for="prUnCargo">Карго — мэдэгдэж байвал, дараа төлөх (₮)</label><input id="prUnCargo" type="number" min="0" inputmode="numeric" oninput="prCalc()"></div></div>' +
    '<label for="prCargoCo">Карго компани</label><input id="prCargoCo" value="' + esc(P.cargoCo || '') + '">' +
    '<p id="prSum" style="margin-top:8px"></p>' +
    '<p class="muted" style="font-size:12.5px">Ирсэн барааны үнийн дүн ирээгүй үлдсэн барааны хэдэн хувь вэ, тэр хувиар «Замд»-аас бараанд шилжинэ; сүүлийн ирэлт үлдсэнийг бүгдийг авна. ' +
      'Карго ирсний дараа тооцогдвол хоосон орхиод, дараа нь банкны хуулгаас «' + (L.length + 1) + '-р ирэлтийн карго»-оор тулгана.</p>' +
    '<button class="btn" onclick="savePoRecv(\'' + id + '\')">Бараа хүлээн авах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  $('prItems').innerHTML = '<table class="rep-t"><tr><th>Бараа</th><th class="n">Захиалсан</th><th class="n">Өмнө ирсэн</th><th class="n">Одоо ирсэн</th><th class="n">Үнэ (' + PO_CUR[P.cur] + ')</th><th class="n">Өртөг / ш</th><th class="n">Нийт өртөг</th></tr>' +
    (P.items || []).map(function (it, i) {
      var prev = round2(rq[it.name] || 0), left = Math.max(0, round2(it.qty - prev));
      return '<tr><td>' + esc(it.name) + '</td><td class="n">' + it.qty + '</td><td class="n">' + (prev || '') + '</td><td class="n"><input id="prQ' + i + '" type="number" min="0" step="any" value="' + left + '" oninput="prAuto()" style="width:70px"></td>' +
        '<td class="n">' + it.price + (it.cn ? ' <span class="muted">+ ' + it.cn + '</span>' : '') + '</td><td class="n" id="prU' + i + '"></td><td class="n" id="prT' + i + '"></td></tr>';
    }).join('') + '</table>';
  prNewRender();
  prAuto();
}
// Барааны бүртгэлд алга бараа — ирсэн үед нь яг тэр нэрээр бүртгэнэ (нэр зөрвөл үлдэгдэл, өртөг тусдаа үлдэнэ)
var prDone = {};
function prNewRender(saved) {
  var P = poById(_prId), box = $('prNew'); if (!P || !box) return;
  if (poIsAsset(P)) { box.innerHTML = ''; return; }
  if (saved) prDone[saved.toLowerCase()] = 1;
  var nw = (P.items || []).filter(function (it) { return !poKnown(it.name) && !prDone[it.name.toLowerCase()]; });
  box.innerHTML = nw.length ? '<p class="muted" style="font-size:12.5px;margin-top:8px">Барааны бүртгэлд алга: ' + nw.map(function (it) {
    return esc(it.name) + ' <button class="mini" onclick="prNewOpen(' + P.items.indexOf(it) + ')">Бүртгэх</button>';
  }).join(' · ') + ' — бүртгэхгүй бол үлдэгдэлд орох ч зарах жагсаалтад гарахгүй.</p>' : '';
}
function prNewOpen(i) {
  var it = poById(_prId).items[i], r = prAlloc(poById(_prId)).rows[i];
  openProduct(); $('pdName').value = it.name; $('pdName').readOnly = true;   // захиалгын нэрээр — үлдэгдэл, өртөг нэг бараанд
  if (r && r.qty > 0 && r.unit > 0) $('pdPrice').placeholder = 'өртөг ' + fmt(r.unit).slice(1) + ' / ш';
}
function prAuto() {   // үлдсэн бүх бараа ирвэл «дууссан» автоматаар чагтлагдана (гараар өөрчилж болно)
  var P = poById(_prId); if (!P) return;
  var rq = poRecvQty(P);
  $('prFin').checked = (P.items || []).every(function (it, i) { return round2((rq[it.name] || 0) + (Number(($('prQ' + i) || {}).value) || 0)) >= it.qty; });
  prCalc();
}
function prAlloc(P) {   // { rows:[{name,qty,price,unit,cargoU,tot}], goods, cargo, total, share }
  var s = poStat(P), L = poShips(P), rq = poRecvQty(P, L), unSup = Number(($('prUnSup') || {}).value) || 0, unC = Number(($('prUnCargo') || {}).value) || 0;
  var gDone = L.reduce(function (a, x) { return a + x.goods; }, 0), cDone = L.reduce(function (a, x) { return a + x.cargoPre; }, 0);
  var gPool = Math.max(0, s.sup + s.accr - gDone + unSup), cPool = Math.max(0, s.cargo + s.accrC - cDone + unC);   // 1505-д үлдсэн бараа / каргоны хэсэг
  var rows = (P.items || []).map(function (it, i) { return { name: it.name, price: it.price, cn: Number(it.cn) || 0, ord: it.qty, prev: rq[it.name] || 0, qty: Number(($('prQ' + i) || {}).value) || 0 }; });
  var useQty = !rows.some(function (r) { return r.price > 0; }), wt = function (r, q) { return useQty ? q : q * r.price + (r.ord ? r.cn * q / r.ord : 0); };   // Хятад дахь карго тэр барааны өртөгт
  var remV = rows.reduce(function (a, r) { return a + wt(r, Math.max(0, r.ord - r.prev)); }, 0), shipV = rows.reduce(function (a, r) { return a + wt(r, r.qty); }, 0);
  var fin = $('prFin') && $('prFin').checked, share = fin || !(remV > 0) ? 1 : Math.min(1, shipV / remV);
  var goods = r0(gPool * share), cargo = r0(cPool), total = r0(goods + cargo);   // урьдчилж төлсөн карго — энэ ирэлтэд
  var left = total, live = rows.filter(function (r) { return r.qty > 0; });
  live.forEach(function (r, k) {
    var w = shipV ? wt(r, r.qty) / shipV : 0;
    var t = k === live.length - 1 ? left : Math.round(total * w * 100) / 100;   // сүүлийнх нь үлдэгдлийг авна (бүхэлчлэлийн зөрүүгүй)
    left = Math.round((left - t) * 100) / 100;
    r.tot = t; r.unit = Math.round(t / r.qty * 100) / 100; r.cargoU = Math.round(cargo * w / r.qty * 100) / 100;
  });
  return { rows: rows, goods: goods, cargo: cargo, total: total, share: share, fin: fin, n: L.length + 1, unSup: unSup, unC: unC, value: rows.reduce(function (a, r) { return a + r.qty * r.price; }, 0) };
}
function prCalc() {
  var P = poById(_prId); if (!P) return;
  var a = prAlloc(P);
  a.rows.forEach(function (r, i) { $('prU' + i).textContent = r.qty > 0 ? fmt(r.unit).slice(1) : ''; $('prT' + i).textContent = r.qty > 0 ? fmt(r.tot).slice(1) : ''; });
  $('prSum').innerHTML = (a.share < 1 ? 'Энэ ирэлтэд ногдох: ' + Math.round(a.share * 1000) / 10 + '% · ' : '') + 'Бараа ' + mny(a.goods) + (a.cargo ? ' + карго ' + mny(a.cargo) : '') + ' = өртөг <b>' + mny(a.total) + '</b>' +
    (P.cur !== 'MNT' && a.value ? ' · бодит ханш ≈ ' + Math.round(a.goods / a.value * 100) / 100 : '');
}
function savePoRecv(id) {
  var P = poById(id), a = prAlloc(P), d = $('prDate').value, loc = $('prLoc') ? $('prLoc').value : 'Дэлгүүр', cco = $('prCargoCo').value.trim();
  if (!a.rows.some(function (r) { return r.qty > 0; })) { toast('Ирсэн тоогоо оруулна уу'); return; }
  if (!(a.total > 0)) { toast('Зардал 0 байна — төлбөрөө бүртгэх эсвэл «дараа төлөх» дүнг оруулна уу'); return; }
  if (a.unC > 0 && !cco) { toast('Каргог дараа төлөх бол карго компанийн нэрийг бичнэ үү'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('Огноо оруулна уу'); return; }
  var fa = poIsAsset(P), life = fa ? Math.round(Number($('prLife').value) || 0) : 0;
  if (fa && !isOwner()) { toast('Үндсэн хөрөнгийн ирэлтийг эзэн батална'); return; }
  if (fa && !(life > 0)) { toast('Ашиглах хугацааг (сараар) оруулна уу'); return; }
  if (fa && meta.lock && lastDayOf(faStart({ date: d })) <= meta.lock) { toast(meta.lock + ' хүртэл түгжигдсэн — огноог түгжээнээс хойш оруулна уу'); return; }
  if (!confirm((a.goods > 0 ? '' : 'Нийлүүлэгчийн төлбөр бүртгэгдээгүй — барааны өртөг 0 болно.\n\n') + P.no + ' · ' + a.n + '-р ирэлт — ' + a.rows.filter(function (r) { return r.qty > 0; }).length + ' бараа, өртөг ' + fmt(a.total) + (fa ? '-өөр үндсэн хөрөнгөд орох уу?' : '-өөр үлдэгдэлд (' + loc + ') орох уу?') +
    (a.fin ? '\n\nЗахиалга хаагдана.' : '\n\nЗахиалга нээлттэй үлдэнэ — үлдсэн бараа ирэхэд дахин «Бараа ирсэн».'))) return;
  var E = [];
  if (a.unSup > 0) E.push({ biz: P.biz, date: d, dr: '1505', cr: '3101', amount: a.unSup, partner: P.supplier, desc: P.no + ' · үлдэгдэл төлбөр (дараа төлнө) · ' + P.supplier + ' #' + P.id });
  if (a.unC > 0) E.push({ biz: P.biz, date: d, dr: '1505', cr: '3101', amount: a.unC, partner: cco, desc: P.no + ' · карго (дараа төлнө) · ' + cco + ' #' + P.id });
  if (fa) {
    var list = (window.assets || []).slice(), now = Date.now();
    a.rows.filter(function (r) { return r.qty > 0 && r.tot > 0; }).forEach(function (r, i) {
      var A = { id: 'FA' + String(now + i).slice(-9), biz: P.biz, status: 'Ашиглаж буй', name: (r.name + (r.qty > 1 ? ' × ' + r.qty : '')).slice(0, 60), date: d, cost: r.tot, life: life, salv: 0, dep0: 0, note: P.no + ' · ирэлт ' + a.n, po: P.id };
      var c = r0((r.cargoU || 0) * r.qty);
      list.push(A);
      E.push({ biz: P.biz, date: d, dr: '2001', cr: '1505', amount: r.tot, partner: P.supplier, desc: P.no + ' · ирэлт ' + a.n + ' · ' + r.name + ' × ' + r.qty + (c ? ' · карго ' + c : '') + ' #' + A.id + ' #' + P.id });
    });
    var fin = function () { gClose(); toast(P.no + ' — ' + a.n + '-р ирэлт үндсэн хөрөнгөд орлоо'); };
    if (cco && cco !== P.cargoCo) P.cargoCo = cco;
    faSave(list, function () { postEntries(E, function () { poInClose(function () {
      if (a.fin) poSetStatus(id, 'Ирсэн', d, fin); else { fin(); if (API_URL) refresh(); else render(); }
    }); }); });
    return;
  }
  var rate = P.cur !== 'MNT' && a.value ? Math.round(a.goods / a.value * 100) / 100 : '';
  var ms = a.rows.filter(function (r) { return r.qty > 0; }).map(function (r) {
    return { biz: P.biz, loc: loc, item: r.name, kind: 'Орлого', qty: r.qty, cost: r.unit, pay: 'Захиалга', partner: P.supplier, note: P.no + ' · ирэлт ' + a.n + ' #' + P.id,
             buy: r.price || '', cur: r.price ? P.cur : '', rate: rate, cargo: r.cargoU || '', cargoPay: '', cargoPartner: '' };
  });
  if (cco && cco !== P.cargoCo) P.cargoCo = cco;
  var done = function () { gClose(); toast(P.no + ' — ' + a.n + '-р ирэлт үлдэгдэлд орлоо'); };
  postEntries(E, function () {
    sendMoves(ms, function () {
      poInClose(function () {
        if (a.fin) poSetStatus(id, 'Ирсэн', d, done);
        else { done(); if (API_URL) refresh(); else render(); }
      });
    });
  });
}
