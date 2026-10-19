// ── БАРАА ЗАХИАЛГА (Хятад) ──
// Захиалга үүсгэнэ → урьдчилгаа, үлдэгдэл төлбөр, карго (банкны хуулга эсвэл «Төлбөр» товч) → бараа ирэхэд «Бараа ирсэн».
// Төлбөр бүр журналд Дт 1505 «Захиалсан бараа»-аар «#ID» лавлагаатай бичигдэнэ. Бараа ирэхэд нийт зардал (бараа + карго)
// бараа тус бүрт үнийн дүнгийн жингээр хуваагдаж, үлдэгдэлд өртөгтэй нь орно (Дт 1404 / Кт 1505).

var PO_CUR = { CNY: '¥', USD: '$', MNT: '₮' };
function poList(biz) { return (window.pos || []).filter(function (p) { return p.biz === biz && p.status !== 'Цуцалсан'; }); }
function poById(id) { return (window.pos || []).filter(function (p) { return p.id === id; })[0]; }
function poCurAmt(P, v) { return P.cur === 'MNT' ? fmt(v) : PO_CUR[P.cur] + (Math.round(v * 100) / 100).toLocaleString('en-US'); }
function poStat(P, E) {
  var sup = 0, cargo = 0, accr = 0, accrC = 0;
  (E || Jc()).forEach(function (e) {
    if (e.dr !== '1505' || !hasTag(e.desc, P.id)) return;
    var isC = /карго/i.test(e.desc), cash = ACC[e.cr] && ACC[e.cr].cash;
    if (cash) { if (isC) cargo += e.amount; else sup += e.amount; } else { if (isC) accrC += e.amount; else accr += e.amount; }
  });
  return { sup: r0(sup), cargo: r0(cargo), accr: r0(accr), accrC: r0(accrC), total: r0(sup + cargo + accr + accrC) };
}
function poView() {
  var list = (window.pos || []).filter(function (p) { return p.biz === state.biz; }).slice().reverse(), E = Jc();
  var rows = list.map(function (P) {
    var s = poStat(P, E), open = P.status === 'Захиалсан', its = P.items || [];
    var spec = { acc: ['1505'], tag: P.id, sign: 1, dir: 1, grp: 'cat', t: P.no + ' · ' + P.supplier };
    var acts = open ? '<button class="mini" style="color:var(--accent)" onclick="openPoPay(\'' + P.id + '\',\'s\')">Төлбөр</button>' +
      '<button class="mini" onclick="openPoPay(\'' + P.id + '\',\'c\')">Карго</button>' +
      '<button class="mini" style="color:var(--green)" onclick="openPoRecv(\'' + P.id + '\')">Бараа ирсэн</button>' +
      '<button class="mini" onclick="openPo(\'' + P.id + '\')">Засах</button><button class="mini" onclick="poCancel(\'' + P.id + '\')">Цуцлах</button>' : '';
    return '<tr' + (P.status === 'Цуцалсан' ? ' style="opacity:.55"' : '') + '><td><b>' + esc(P.no) + '</b><br><small class="muted">' + esc(P.date) + '</small></td><td>' + esc(P.supplier) + (P.cargoCo ? '<br><small class="muted">Карго: ' + esc(P.cargoCo) + '</small>' : '') + '</td>' +
      '<td style="white-space:normal;min-width:200px">' + esc(its.map(function (i) { return i.name + ' × ' + i.qty; }).join(', ')) + '</td>' +
      '<td class="n">' + poCurAmt(P, P.total) + '</td>' +
      '<td class="n">' + (s.sup ? dl(Object.assign({}, spec, { t: spec.t + ' — нийлүүлэгчид төлсөн' }), mny(s.sup)) : '') + '</td>' +
      '<td class="n">' + (s.cargo + s.accrC ? dl(Object.assign({}, spec, { t: spec.t + ' — карго' }), mny(s.cargo + s.accrC)) : '') + '</td>' +
      '<td>' + (P.status === 'Ирсэн' ? '<span class="tag">Ирсэн ' + esc(P.recvDate || '') + '</span>' : P.status === 'Цуцалсан' ? '<span class="tag r">Цуцалсан</span>' :
        '<span class="tag b">' + (s.sup ? 'Төлбөр хийгдсэн' : 'Захиалсан') + '</span>') + '</td><td class="n" style="white-space:nowrap">' + acts + '</td></tr>';
  }).join('');
  return '<p class="hint">1) «+ Шинэ захиалга» — ямар бараа, хэдийг, хэдэн юаниар захиалсан. 2) Урьдчилгаа, үлдэгдэл төлбөр, каргоны мөнгийг «Банкны хуулга»-аас энэ захиалгаар тулгана (эсвэл «Төлбөр», «Карго» товч). ' +
    '3) Бараа ирэхэд «Бараа ирсэн» — бүх зардал барааны өртөгт хуваагдаж, үлдэгдэлд орно.</p>' +
    '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Дугаар</th><th>Нийлүүлэгч</th><th>Бараа</th><th class="n">Нийт (валютаар)</th><th class="n">Төлсөн</th><th class="n">Карго</th><th>Төлөв</th><th></th></tr>' +
    (rows || '<tr><td colspan="8" class="muted">Захиалга алга — «+ Шинэ захиалга» дарна уу</td></tr>') + '</table></div></div>';
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
function poPayLabel(P, type) { return type === 'c' ? 'Карго' : type === 'a' ? 'Урьдчилгаа' : type === 'b' ? 'Үлдэгдэл төлбөр' : (poStat(P).sup > 0 ? 'Үлдэгдэл төлбөр' : 'Урьдчилгаа'); }
function poPayEntry(spec, acc, d, amt, note) {   // spec: «PO123|s» (s — нийлүүлэгч, c — карго, a/b — урьдчилгаа/үлдэгдэл)
  var id = spec.split('|')[0], type = spec.split('|')[1] || 's', P = poById(id); if (!P) return null;
  var label = poPayLabel(P, type), partner = type === 'c' ? (P.cargoCo || 'Карго') : P.supplier;
  return { entry: { biz: P.biz, date: d, dr: '1505', cr: acc, amount: amt, partner: partner, desc: ((note ? note + ' · ' : '') + P.no + ' · ' + label + ' · ' + partner).slice(0, 170) + ' #' + P.id },
           link: 'Бараа захиалга ' + P.no + ' · ' + label };
}
function poOpts(biz) {
  var out = [];
  poList(biz).filter(function (P) { return P.status === 'Захиалсан'; }).forEach(function (P) {
    out.push(['PO:' + P.id + '|s', 'Бараа захиалга ' + P.no + ' · ' + P.supplier + ' — ' + poPayLabel(P, 's').toLowerCase()]);
    out.push(['PO:' + P.id + '|c', 'Бараа захиалга ' + P.no + ' — карго' + (P.cargoCo ? ' (' + P.cargoCo + ')' : '')]);
  });
  return out;
}
function openPoPay(id, type) {
  var P = poById(id), s = poStat(P), cargo = type === 'c';
  gOpen('<h2>' + esc(P.no) + ' · ' + (cargo ? 'Каргоны төлбөр' : 'Төлбөр') + '</h2><p class="muted">' + esc(P.supplier) + ' · ' + poCurAmt(P, P.total) +
    ' · төлсөн ' + mny(s.sup) + (s.cargo ? ' · карго ' + mny(s.cargo) : '') + '</p>' +
    (cargo ? '' : '<label for="ppType">Төрөл</label><select id="ppType"><option value="a"' + (s.sup ? '' : ' selected') + '>Урьдчилгаа</option><option value="b"' + (s.sup ? ' selected' : '') + '>Үлдэгдэл төлбөр</option></select>') +
    '<div class="row2"><div><label for="ppDate">Огноо</label><input id="ppDate" type="date" value="' + todayStr() + '"></div><div><label for="ppAcc">Хаанаас төлсөн</label><select id="ppAcc">' + cashAccOpts('1101') + '</select></div></div>' +
    '<div class="row2"><div><label for="ppAmt">Төлсөн дүн (₮)</label><input id="ppAmt" type="number" min="0" inputmode="numeric"></div>' +
    (cargo ? '<div><label for="ppCo">Карго компани</label><input id="ppCo" value="' + esc(P.cargoCo || '') + '"></div>' :
      '<div><label for="ppFx">' + (P.cur === 'MNT' ? 'Тайлбар' : 'Валютаар (' + PO_CUR[P.cur] + ', заавал биш)') + '</label><input id="ppFx" ' + (P.cur === 'MNT' ? '' : 'type="number" min="0" step="any"') + '></div>') + '</div>' +
    '<button class="btn" onclick="savePoPay(\'' + id + '\',\'' + (cargo ? 'c' : '') + '\')">Бүртгэх</button><button class="btn ghost" onclick="gClose()">Болих</button>');
}
function savePoPay(id, cargo) {
  var P = poById(id), amt = Number($('ppAmt').value) || 0, d = $('ppDate').value;
  if (!(amt > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (cargo && $('ppCo').value.trim() && $('ppCo').value.trim() !== P.cargoCo) P.cargoCo = $('ppCo').value.trim();
  var fx = !cargo && $('ppFx') ? $('ppFx').value.trim() : '', note = fx ? (P.cur === 'MNT' ? fx : PO_CUR[P.cur] + fx + ' (ханш ' + Math.round(amt / Number(fx) * 100) / 100 + ')') : '';
  var pe = poPayEntry(id + '|' + (cargo ? 'c' : $('ppType').value), $('ppAcc').value, d, amt, note);
  postEntries([pe.entry], function () { gClose(); toast(pe.link + ' бүртгэгдлээ'); if (API_URL) refresh(); else render(); });
}
// ── Бараа ирсэн: зардлыг бараанд хуваах ──
var _prId = '';
function openPoRecv(id) {
  _prId = id;
  var P = poById(id), s = poStat(P), wh = hasWarehouse(state.biz);
  gOpen('<h2>' + esc(P.no) + ' · Бараа ирсэн</h2><p class="muted">' + esc(P.supplier) + ' · захиалга ' + poCurAmt(P, P.total) + '</p>' +
    '<div class="row2"><div><label for="prDate">Ирсэн огноо</label><input id="prDate" type="date" value="' + todayStr() + '"></div>' +
    (wh ? '<div><label for="prLoc">Байршил</label><select id="prLoc"><option>Агуулах</option><option>Дэлгүүр</option></select></div>' : '<div></div>') + '</div>' +
    '<div id="prItems"></div>' +
    '<table class="rep-t" style="margin-top:8px"><tr><td>Нийлүүлэгчид төлсөн</td><td class="n">' + mny(s.sup) + '</td></tr><tr><td>Карго төлсөн</td><td class="n">' + mny(s.cargo) + '</td></tr></table>' +
    '<div class="row2"><div><label for="prUnSup">Нийлүүлэгчид дараа төлөх (₮)</label><input id="prUnSup" type="number" min="0" inputmode="numeric" oninput="prCalc()"></div>' +
    '<div><label for="prUnCargo">Карго — дараа төлөх (₮)</label><input id="prUnCargo" type="number" min="0" inputmode="numeric" oninput="prCalc()"></div></div>' +
    '<label for="prCargoCo">Карго компани</label><input id="prCargoCo" value="' + esc(P.cargoCo || '') + '">' +
    '<p id="prSum" style="margin-top:8px"></p>' +
    '<p class="muted" style="font-size:12.5px">Бараа, каргоны нийт зардал бараа бүрийн үнийн дүнгийн хувиар хуваагдана. «Дараа төлөх» дүн өглөг болж «Авлага, өглөг»-д гарна.</p>' +
    '<button class="btn" onclick="savePoRecv(\'' + id + '\')">Бараа хүлээн авах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  $('prItems').innerHTML = '<table class="rep-t"><tr><th>Бараа</th><th class="n">Захиалсан</th><th class="n">Ирсэн</th><th class="n">Үнэ (' + PO_CUR[P.cur] + ')</th><th class="n">Өртөг / ш</th><th class="n">Нийт өртөг</th></tr>' +
    (P.items || []).map(function (it, i) {
      return '<tr><td>' + esc(it.name) + '</td><td class="n">' + it.qty + '</td><td class="n"><input id="prQ' + i + '" type="number" min="0" step="any" value="' + it.qty + '" oninput="prCalc()" style="width:70px"></td>' +
        '<td class="n">' + it.price + '</td><td class="n" id="prU' + i + '"></td><td class="n" id="prT' + i + '"></td></tr>';
    }).join('') + '</table>';
  prCalc();
}
function prAlloc(P) {   // { rows:[{name,qty,price,unit,cargoU,tot}], goods, cargo, total }
  var s = poStat(P), unSup = Number(($('prUnSup') || {}).value) || 0, unC = Number(($('prUnCargo') || {}).value) || 0;
  var goods = s.sup + s.accr + unSup, cargo = s.cargo + s.accrC + unC, total = goods + cargo;
  var rows = (P.items || []).map(function (it, i) { return { name: it.name, price: it.price, qty: Number(($('prQ' + i) || {}).value) || 0 }; });
  var base = rows.reduce(function (a, r) { return a + r.qty * r.price; }, 0), useQty = !(base > 0);
  if (useQty) base = rows.reduce(function (a, r) { return a + r.qty; }, 0);
  var left = total, live = rows.filter(function (r) { return r.qty > 0; });
  live.forEach(function (r, k) {
    var w = base ? (useQty ? r.qty : r.qty * r.price) / base : 0;
    var t = k === live.length - 1 ? left : Math.round(total * w * 100) / 100;   // сүүлийнх нь үлдэгдлийг авна (бүхэлчлэлийн зөрүүгүй)
    left = Math.round((left - t) * 100) / 100;
    r.tot = t; r.unit = Math.round(t / r.qty * 100) / 100; r.cargoU = Math.round(cargo * w / r.qty * 100) / 100;
  });
  return { rows: rows, goods: r0(goods), cargo: r0(cargo), total: r0(total), unSup: unSup, unC: unC, value: rows.reduce(function (a, r) { return a + r.qty * r.price; }, 0) };
}
function prCalc() {
  var P = poById(_prId); if (!P) return;
  var a = prAlloc(P);
  a.rows.forEach(function (r, i) { $('prU' + i).textContent = r.qty > 0 ? fmt(r.unit).slice(1) : ''; $('prT' + i).textContent = r.qty > 0 ? fmt(r.tot).slice(1) : ''; });
  $('prSum').innerHTML = 'Бараа ' + mny(a.goods) + ' + карго ' + mny(a.cargo) + ' = нийт өртөг <b>' + mny(a.total) + '</b>' +
    (P.cur !== 'MNT' && a.value ? ' · бодит ханш ≈ ' + Math.round(a.goods / a.value * 100) / 100 : '');
}
function savePoRecv(id) {
  var P = poById(id), a = prAlloc(P), d = $('prDate').value, loc = $('prLoc') ? $('prLoc').value : 'Дэлгүүр', cco = $('prCargoCo').value.trim();
  if (!a.rows.some(function (r) { return r.qty > 0; })) { toast('Ирсэн тоогоо оруулна уу'); return; }
  if (!(a.total > 0)) { toast('Зардал 0 байна — төлбөрөө бүртгэх эсвэл «дараа төлөх» дүнг оруулна уу'); return; }
  if (a.unC > 0 && !cco) { toast('Каргог дараа төлөх бол карго компанийн нэрийг бичнэ үү'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('Огноо оруулна уу'); return; }
  if (!confirm(P.no + ' — ' + a.rows.filter(function (r) { return r.qty > 0; }).length + ' бараа, нийт өртөг ' + fmt(a.total) + '-өөр үлдэгдэлд (' + loc + ') орох уу?')) return;
  var E = [];
  if (a.unSup > 0) E.push({ biz: P.biz, date: d, dr: '1505', cr: '3101', amount: a.unSup, partner: P.supplier, desc: P.no + ' · үлдэгдэл төлбөр (дараа төлнө) · ' + P.supplier + ' #' + P.id });
  if (a.unC > 0) E.push({ biz: P.biz, date: d, dr: '1505', cr: '3101', amount: a.unC, partner: cco, desc: P.no + ' · карго (дараа төлнө) · ' + cco + ' #' + P.id });
  var rate = P.cur !== 'MNT' && a.value ? Math.round(a.goods / a.value * 100) / 100 : '';
  var ms = a.rows.filter(function (r) { return r.qty > 0; }).map(function (r) {
    return { biz: P.biz, loc: loc, item: r.name, kind: 'Орлого', qty: r.qty, cost: r.unit, pay: 'Захиалга', partner: P.supplier, note: P.no + ' #' + P.id,
             buy: r.price || '', cur: r.price ? P.cur : '', rate: rate, cargo: r.cargoU || '', cargoPay: '', cargoPartner: '' };
  });
  postEntries(E, function () {
    sendMoves(ms, function () {
      poSetStatus(id, 'Ирсэн', d, function () { gClose(); toast(P.no + ' — бараа үлдэгдэлд орлоо'); });
    });
  });
}
