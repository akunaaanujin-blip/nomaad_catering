// ── БАРАА ЗАХИАЛГА (Хятад) ──
// Захиалга үүсгэнэ → урьдчилгаа, үлдэгдэл төлбөр (банкны хуулга эсвэл «Төлбөр» товч) → бараа ирэх бүрт «Бараа ирсэн» (хэсэг хэсгээр).
// Төлбөр бүр журналд Дт 1505 «Захиалсан бараа»-аар «#ID» лавлагаатай — бараа ирэх хүртэл 1505 нь нийлүүлэгчээс авах авлага («Замд»).
// Ирэлт бүрт 1505-ын үлдэгдлийг ирээгүй барааны үнийн дүнд эзлэх хувиар нь бараанд шилжүүлнэ (Дт 1404 / Кт 1505); сүүлийн ирэлт үлдсэнийг бүгдийг авна.
// Карго: бараа ирсний дараа тооцогддог — «ирэлт N»-ийн карго нь Дт 1404 / Кт банк (эсвэл 3101) «#ID ирэлт N»; өртгийн хөдөлгүүр тэр ирэлтийн бараанд нэмнэ.

var PO_CUR = { CNY: '¥', USD: '$', MNT: '₮' };
function poList(biz) { return (window.pos || []).filter(function (p) { return p.biz === biz && p.status !== 'Цуцалсан'; }); }
function poById(id) { return (window.pos || []).filter(function (p) { return p.id === id; })[0]; }
function poCurAmt(P, v) { return P.cur === 'MNT' ? fmt(v) : PO_CUR[P.cur] + (Math.round(v * 100) / 100).toLocaleString('en-US'); }
function poShipNo(note) { var x = String(note || '').match(/ирэлт (\d+)/); return x ? Number(x[1]) : 1; }   // хуучин (ирэлтгүй) орлого — 1-р ирэлт
function poShipRe(n) { return new RegExp('ирэлт ' + n + '(?!\\d)'); }
function poStat(P, E) {   // post — бараа ирсний дараа тооцсон карго (1404), bal — 1505-д үлдсэн (замд яваа, нийлүүлэгчээс авах)
  var sup = 0, cargo = 0, accr = 0, accrC = 0, post = 0, out = 0;
  (E || Jc()).forEach(function (e) {
    if (!hasTag(e.desc, P.id)) return;
    var isC = /карго/i.test(e.desc);
    if (e.cr === '1505') { out += e.amount; return; }
    if (e.dr === '1404' && isC) { post += e.amount; return; }
    if (e.dr !== '1505') return;
    var cash = ACC[e.cr] && ACC[e.cr].cash;
    if (cash) { if (isC) cargo += e.amount; else sup += e.amount; } else { if (isC) accrC += e.amount; else accr += e.amount; }
  });
  return { sup: r0(sup), cargo: r0(cargo), accr: r0(accr), accrC: r0(accrC), post: r0(post), total: r0(sup + cargo + accr + accrC), bal: r0(sup + cargo + accr + accrC - out) };
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
  var L = Object.keys(S).map(function (k) { return S[k]; }).sort(function (a, b) { return a.n - b.n; });
  (E || Jc()).forEach(function (e) {
    if (e.dr !== '1404' || !/карго/i.test(e.desc) || !hasTag(e.desc, P.id)) return;
    var n = poShipNo(e.desc); L.forEach(function (x) { if (x.n === n) x.cargoPost += e.amount; });
  });
  L.forEach(function (x) { x.goods = r0(x.goods); x.cargoPre = r0(x.cargoPre); x.cargoPost = r0(x.cargoPost); });
  return L;
}
function poRecvQty(P, L) { var o = {}; (L || poShips(P)).forEach(function (x) { for (var k in x.items) o[k] = (o[k] || 0) + x.items[k]; }); return o; }
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
      '<span class="tag b">' + (L.length ? 'Хэсэгчлэн ирсэн' : s.sup ? 'Төлбөр хийгдсэн' : 'Захиалсан') + '</span>';
    return '<tr' + (P.status === 'Цуцалсан' ? ' style="opacity:.55"' : '') + '><td style="white-space:nowrap"><b>' + esc(P.no) + '</b><br><small class="muted">' + esc(P.date) + '</small></td><td style="min-width:110px">' + esc(P.supplier) + (P.cargoCo ? '<br><small class="muted">Карго: ' + esc(P.cargoCo) + '</small>' : '') + '</td>' +
      '<td style="white-space:normal;min-width:180px">' + esc(its.map(function (i) { return i.name + ' × ' + (rq[i.name] ? round2(rq[i.name]) + '/' : '') + i.qty; }).join(', ')) + shipTxt + '</td>' +
      '<td class="n">' + poCurAmt(P, P.total) + '</td>' +
      '<td class="n">' + (s.sup ? dl(Object.assign({}, spec, { t: spec.t + ' — нийлүүлэгчид төлсөн' }), mny(s.sup)) : '') + '</td>' +
      '<td class="n">' + (s.cargo + s.accrC + s.post ? mny(s.cargo + s.accrC + s.post) : '') + '</td>' +
      '<td class="n">' + (Math.abs(s.bal) >= 1 ? dl(Object.assign({}, spec, { dir: 0, t: spec.t + ' — замд яваа (1505)' }), mny(s.bal)) : '') + '</td>' +
      '<td style="white-space:nowrap">' + st + '</td><td class="n"><div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;min-width:150px">' + acts + '</div></td></tr>';
  }).join('');
  return '<p class="hint">1) «+ Шинэ захиалга» — ямар бараа, хэдийг, хэдэн юаниар захиалсан. 2) Нийлүүлэгчид төлсөн мөнгийг «Банкны хуулга»-аас энэ захиалгаар тулгана — бараа ирэх хүртэл «Замд» баганад авлага болж харагдана. ' +
    '3) Бараа ирэх бүрт «Бараа ирсэн» — ирсэн тоогоо оруулна (хэсэг хэсгээр ирж болно); ирсэн барааны хэсэг нь «Замд»-аас хасагдаж үлдэгдэлд орно. ' +
    '4) Каргоны мөнгийг бараа ирсний дараа хуулгаас «… ирэлтийн карго»-оор тулгана (эсвэл «Карго» товч) — тэр ирэлтийн барааны өртөгт нэмэгдэнэ.</p>' + poLowCard() +
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
  pqIt = P ? (P.items || []).map(function (i) { return { name: i.name, qty: i.qty, price: i.price }; }) : preset && preset.items ? preset.items : [{ name: '', qty: '', price: '' }];
  gOpen('<h2>' + (P ? 'Захиалга засах · ' + esc(P.no) : 'Шинэ бараа захиалга') + '</h2>' +
    '<div class="row2"><div><label for="pqSup">Нийлүүлэгч</label><input id="pqSup" list="pqSups" placeholder="Жишээ: Yiwu ..."><datalist id="pqSups">' + partnerOptions() + '</datalist></div>' +
    '<div><label for="pqDate">Огноо</label><input id="pqDate" type="date"></div></div>' +
    '<div class="row2"><div><label for="pqCur">Валют</label><select id="pqCur" onchange="pqRender()"><option value="CNY">¥ юань</option><option value="USD">$ доллар</option><option value="MNT">₮ төгрөг</option></select></div>' +
    '<div><label for="pqCargo">Карго компани</label><input id="pqCargo" list="pqSups" placeholder="Мэдэгдэж байвал"></div></div>' +
    '<label>Бараа</label><datalist id="pqProds">' + BUSINESSES[state.biz].products.map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join('') + '</datalist>' +
    '<div id="pqItems"></div><button class="b-btn" style="margin-top:6px" onclick="pqIt.push({name:\'\',qty:\'\',price:\'\'});pqRender()">+ Мөр нэмэх</button>' +
    '<p id="pqTot" style="margin-top:8px"></p>' +
    '<label for="pqNote">Тэмдэглэл</label><input id="pqNote">' +
    '<button class="btn" onclick="savePo(' + (P ? '\'' + P.id + '\'' : '') + ')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  $('pqSup').value = P ? P.supplier : preset ? preset.supplier || '' : ''; $('pqDate').value = P ? P.date : todayStr(); $('pqCur').value = P ? P.cur : load('nb_cur', 'CNY');
  $('pqCargo').value = P ? P.cargoCo : load('nb_cargoco', ''); $('pqNote').value = P ? P.note : preset ? preset.note || '' : '';
  pqRender();
}
function pqRender() {
  var sg = PO_CUR[$('pqCur').value];
  $('pqItems').innerHTML = '<table class="rep-t"><tr><th>Бараа</th><th class="n">Тоо</th><th class="n">Нэгж үнэ (' + sg + ')</th><th class="n">Дүн</th><th></th></tr>' + pqIt.map(function (it, i) {
    return '<tr><td><input list="pqProds" value="' + esc(it.name) + '" oninput="pqIt[' + i + '].name=this.value" style="min-width:180px"></td>' +
      '<td class="n"><input type="number" min="0" step="any" value="' + it.qty + '" oninput="pqIt[' + i + '].qty=this.value;pqTot()" style="width:70px"></td>' +
      '<td class="n"><input type="number" min="0" step="any" value="' + it.price + '" oninput="pqIt[' + i + '].price=this.value;pqTot()" style="width:100px"></td>' +
      '<td class="n" id="pqL' + i + '"></td><td><button class="mini" onclick="pqIt.splice(' + i + ',1);pqRender()">✕</button></td></tr>';
  }).join('') + '</table>';
  pqTot();
}
function pqTot() {
  var sg = PO_CUR[$('pqCur').value], t = 0;
  pqIt.forEach(function (it, i) { var v = (Number(it.qty) || 0) * (Number(it.price) || 0); t += v; var c = $('pqL' + i); if (c) c.textContent = v ? sg + (Math.round(v * 100) / 100).toLocaleString('en-US') : ''; });
  $('pqTot').innerHTML = 'Нийт: <b>' + sg + (Math.round(t * 100) / 100).toLocaleString('en-US') + '</b>';
}
function savePo(id) {
  var items = pqIt.filter(function (i) { return String(i.name).trim() && Number(i.qty) > 0; }).map(function (i) { return { name: String(i.name).trim(), qty: Number(i.qty), price: Number(i.price) || 0 }; });
  var x = { biz: state.biz, supplier: $('pqSup').value.trim(), date: $('pqDate').value, cur: $('pqCur').value, cargoCo: $('pqCargo').value.trim(), note: $('pqNote').value.trim(), items: items };
  if (x.supplier.length < 2) { toast('Нийлүүлэгчийн нэрийг бичнэ үү'); return; }
  if (!items.length) { toast('Дор хаяж нэг бараа, тоотой нь бичнэ үү'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date)) { toast('Огноо оруулна уу'); return; }
  save('nb_cur', x.cur); if (x.cargoCo) save('nb_cargoco', x.cargoCo);
  if (!API_URL) {
    window.pos = window.pos || [];
    x.total = Math.round(items.reduce(function (a, i) { return a + i.qty * i.price; }, 0) * 100) / 100;
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
  return type === 'c' ? 'Карго (урьдчилж)' : type === 'a' ? 'Урьдчилгаа' : type === 'b' ? 'Үлдэгдэл төлбөр' : (poStat(P).sup > 0 ? 'Үлдэгдэл төлбөр' : 'Урьдчилгаа');
}
function poPayEntry(spec, acc, d, amt, note, cco) {   // spec: «PO123|s» (s — нийлүүлэгч, c — карго урьдчилж, kN — N-р ирэлтийн карго, a/b — урьдчилгаа/үлдэгдэл)
  var id = spec.split('|')[0], type = spec.split('|')[1] || 's', P = poById(id); if (!P) return null;
  var ship = /^k\d+$/.test(type), label = poPayLabel(P, type), partner = type === 'c' || ship ? (cco || P.cargoCo || 'Карго') : P.supplier;
  return { entry: { biz: P.biz, date: d, dr: ship ? '1404' : '1505', cr: acc, amount: amt, partner: partner, desc: ((note ? note + ' · ' : '') + P.no + ' · ' + label + ' · ' + partner).slice(0, 170) + ' #' + P.id },
           link: 'Бараа захиалга ' + P.no + ' · ' + label };
}
function poOpts(biz) {
  var out = [], from = todayStr(new Date(Date.now() - 180 * 864e5)), E = Jc();
  poList(biz).forEach(function (P) {
    var open = P.status === 'Захиалсан';
    if (open) out.push(['PO:' + P.id + '|s', 'Бараа захиалга ' + P.no + ' · ' + P.supplier + ' — ' + poPayLabel(P, 's').toLowerCase()]);
    poShips(P, E).filter(function (x) { return x.date >= from; }).forEach(function (x) {
      var c = x.cargoPre + x.cargoPost;
      out.push(['PO:' + P.id + '|k' + x.n, 'Бараа захиалга ' + P.no + ' — ' + x.n + '-р ирэлтийн карго (' + x.date.slice(5) + '-нд ирсэн' + (c ? ', бүртгэсэн ' + fmt(c) : '') + ')' + (P.cargoCo ? ' · ' + P.cargoCo : '')]);
    });
    if (open) out.push(['PO:' + P.id + '|c', 'Бараа захиалга ' + P.no + ' — карго, бараа ирэхээс өмнө' + (P.cargoCo ? ' (' + P.cargoCo + ')' : '')]);
  });
  return out;
}
function openPoPay(id, type) {
  var P = poById(id), s = poStat(P), cargo = type === 'c', L = cargo ? poShips(P) : [], open = P.status === 'Захиалсан';
  gOpen('<h2>' + esc(P.no) + ' · ' + (cargo ? 'Каргоны төлбөр' : 'Төлбөр') + '</h2><p class="muted">' + esc(P.supplier) + ' · ' + poCurAmt(P, P.total) +
    ' · төлсөн ' + mny(s.sup) + (s.cargo + s.accrC + s.post ? ' · карго ' + mny(s.cargo + s.accrC + s.post) : '') + '</p>' +
    (cargo ? '<label for="ppShip">Аль барааны карго</label><select id="ppShip">' + L.map(function (x, i) {
        return '<option value="' + x.n + '"' + (i === L.length - 1 ? ' selected' : '') + '>' + x.n + '-р ирэлт · ' + esc(x.date) + ' ирсэн · ' + Object.keys(x.items).length + ' бараа' + (x.cargoPre + x.cargoPost ? ' (карго ' + fmt(x.cargoPre + x.cargoPost) + ')' : '') + '</option>'; }).join('') +
        (open || !L.length ? '<option value=""' + (L.length ? '' : ' selected') + '>Бараа ирээгүй байна (урьдчилж төлсөн)</option>' : '') + '</select>'
      : '<label for="ppType">Төрөл</label><select id="ppType"><option value="a"' + (s.sup ? '' : ' selected') + '>Урьдчилгаа</option><option value="b"' + (s.sup ? ' selected' : '') + '>Үлдэгдэл төлбөр</option></select>') +
    '<div class="row2"><div><label for="ppDate">Огноо</label><input id="ppDate" type="date" value="' + todayStr() + '"></div><div><label for="ppAcc">Хаанаас төлсөн</label><select id="ppAcc">' + cashAccOpts('1101') +
      (cargo ? '<option value="3101">Дараа төлнө (өглөг)</option>' : '') + '</select></div></div>' +
    '<div class="row2"><div><label for="ppAmt">' + (cargo ? 'Каргоны дүн (₮)' : 'Төлсөн дүн (₮)') + '</label><input id="ppAmt" type="number" min="0" inputmode="numeric"></div>' +
    (cargo ? '<div><label for="ppCo">Карго компани</label><input id="ppCo" value="' + esc(P.cargoCo || '') + '"></div>' :
      '<div><label for="ppFx">' + (P.cur === 'MNT' ? 'Тайлбар' : 'Валютаар (' + PO_CUR[P.cur] + ', заавал биш)') + '</label><input id="ppFx" ' + (P.cur === 'MNT' ? '' : 'type="number" min="0" step="any"') + '></div>') + '</div>' +
    (cargo ? '<p class="muted" style="font-size:12.5px">Ирсэн барааны карго тэр ирэлтийн бараа бүрийн өртөгт үнийн дүнгийн хувиар нэмэгдэнэ.</p>' : '') +
    '<button class="btn" onclick="savePoPay(\'' + id + '\',\'' + (cargo ? 'c' : '') + '\')">Бүртгэх</button><button class="btn ghost" onclick="gClose()">Болих</button>');
}
function savePoPay(id, cargo) {
  var P = poById(id), amt = Number($('ppAmt').value) || 0, d = $('ppDate').value, acc = $('ppAcc').value, cco = cargo ? $('ppCo').value.trim() : '';
  if (!(amt > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (cargo && acc === '3101' && !cco) { toast('Каргог дараа төлөх бол карго компанийн нэрийг бичнэ үү'); return; }
  if (cco && cco !== P.cargoCo) P.cargoCo = cco;
  var fx = !cargo && $('ppFx') ? $('ppFx').value.trim() : '', note = fx ? (P.cur === 'MNT' ? fx : PO_CUR[P.cur] + fx + ' (ханш ' + Math.round(amt / Number(fx) * 100) / 100 + ')') : '';
  var type = cargo ? ($('ppShip').value ? 'k' + $('ppShip').value : 'c') : $('ppType').value;
  var pe = poPayEntry(id + '|' + type, acc, d, amt, note, cco);
  postEntries([pe.entry], function () { gClose(); toast(pe.link + ' бүртгэгдлээ'); if (API_URL) refresh(); else render(); });
}
// ── Бараа ирсэн (хэсэг хэсгээр): 1505-ын үлдэгдлээс энэ ирэлтэд ногдохыг бараанд хуваах ──
var _prId = '';
function openPoRecv(id) {
  _prId = id;
  var P = poById(id), s = poStat(P), L = poShips(P), rq = poRecvQty(P, L), wh = hasWarehouse(state.biz);
  gOpen('<h2>' + esc(P.no) + ' · Бараа ирсэн' + (L.length ? ' (' + (L.length + 1) + '-р ирэлт)' : '') + '</h2><p class="muted">' + esc(P.supplier) + ' · захиалга ' + poCurAmt(P, P.total) + '</p>' +
    '<div class="row2"><div><label for="prDate">Ирсэн огноо</label><input id="prDate" type="date" value="' + todayStr() + '"></div>' +
    (wh ? '<div><label for="prLoc">Байршил</label><select id="prLoc"><option>Агуулах</option><option>Дэлгүүр</option></select></div>' : '<div></div>') + '</div>' +
    '<div id="prItems"></div>' +
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
        '<td class="n">' + it.price + '</td><td class="n" id="prU' + i + '"></td><td class="n" id="prT' + i + '"></td></tr>';
    }).join('') + '</table>';
  prAuto();
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
  var rows = (P.items || []).map(function (it, i) { return { name: it.name, price: it.price, ord: it.qty, prev: rq[it.name] || 0, qty: Number(($('prQ' + i) || {}).value) || 0 }; });
  var useQty = !rows.some(function (r) { return r.price > 0; }), wt = function (r, q) { return useQty ? q : q * r.price; };
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
  if (!confirm(P.no + ' · ' + a.n + '-р ирэлт — ' + a.rows.filter(function (r) { return r.qty > 0; }).length + ' бараа, өртөг ' + fmt(a.total) + '-өөр үлдэгдэлд (' + loc + ') орох уу?' +
    (a.fin ? '\n\nЗахиалга хаагдана.' : '\n\nЗахиалга нээлттэй үлдэнэ — үлдсэн бараа ирэхэд дахин «Бараа ирсэн».'))) return;
  var E = [];
  if (a.unSup > 0) E.push({ biz: P.biz, date: d, dr: '1505', cr: '3101', amount: a.unSup, partner: P.supplier, desc: P.no + ' · үлдэгдэл төлбөр (дараа төлнө) · ' + P.supplier + ' #' + P.id });
  if (a.unC > 0) E.push({ biz: P.biz, date: d, dr: '1505', cr: '3101', amount: a.unC, partner: cco, desc: P.no + ' · карго (дараа төлнө) · ' + cco + ' #' + P.id });
  var rate = P.cur !== 'MNT' && a.value ? Math.round(a.goods / a.value * 100) / 100 : '';
  var ms = a.rows.filter(function (r) { return r.qty > 0; }).map(function (r) {
    return { biz: P.biz, loc: loc, item: r.name, kind: 'Орлого', qty: r.qty, cost: r.unit, pay: 'Захиалга', partner: P.supplier, note: P.no + ' · ирэлт ' + a.n + ' #' + P.id,
             buy: r.price || '', cur: r.price ? P.cur : '', rate: rate, cargo: r.cargoU || '', cargoPay: '', cargoPartner: '' };
  });
  if (cco && cco !== P.cargoCo) P.cargoCo = cco;
  var done = function () { gClose(); toast(P.no + ' — ' + a.n + '-р ирэлт үлдэгдэлд орлоо'); };
  postEntries(E, function () {
    sendMoves(ms, function () {
      if (a.fin) poSetStatus(id, 'Ирсэн', d, done);
      else { done(); if (API_URL) refresh(); else render(); }
    });
  });
}
