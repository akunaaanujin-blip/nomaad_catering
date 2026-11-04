// ── ТОГТМОЛ ТӨЛБӨР (ус, цахилгаан, дулаан, интернет, утас, түрээс) — зөвхөн Эзэн ──
// Бүртгэл: pfCfg.bills (сервер admin_setting 'pfcfg' — шинэ sheet хэрэггүй).
// Сар бүр идэвхтэй төлбөр бүрээр «Хүлээгдэж буй» мөр өөрөө гарна (хадгалагдахгүй, бүртгэлээс тооцно).
// «Төлсөн» → Хувийн: P_Transactions зарлага (link = <ID>M<YYYYMM>); компани: журнал Дт зардлын данс / Кт мөнгөний данс («#<ID>M<YYYYMM>»).
// Төлөлтийг цуцлах — тухайн гүйлгээ / журналаас. pf.js-ийн дараа ачаална.

var BL_CATS = ['Ус', 'Цахилгаан', 'Дулаан', 'Интернет', 'Утас', 'Түрээс', 'Бусад'];
var BL_ENT = [['mgmt', 'Хувийн'], ['cozy', 'Cozy Home'], ['meat', 'Махны дэлгүүр'], ['travel', 'NOMAAD']];
var BL_ACC = { 'Ус': '7111', 'Цахилгаан': '7111', 'Дулаан': '7111', 'Интернет': '7106', 'Утас': '7106', 'Түрээс': '7114', 'Бусад': '7122' };   // компанийн зардлын данс
var BL_PF = { 'Ус': 'Байр/коммунал', 'Цахилгаан': 'Байр/коммунал', 'Дулаан': 'Байр/коммунал', 'Түрээс': 'Байр/коммунал', 'Интернет': 'Утас/интернэт', 'Утас': 'Утас/интернэт' };   // хувийн зарлагын ангилал

function blList() { return (pfCfg && pfCfg.bills) || []; }
function blById(id) { return blList().filter(function (b) { return b.id === id; })[0]; }
function blEntName(k) { var e = BL_ENT.filter(function (x) { return x[0] === k; })[0]; return e ? e[1] : k; }
function blKey(b, m) { return b.id + 'M' + m.replace('-', ''); }
function blDue(b, m) { var last = Number(pfMonEnd(m).slice(8)), d = Math.min(Math.max(1, Number(b.day) || 1), last); return m + '-' + (d < 10 ? '0' : '') + d; }
function blAccOf(b) { var a = BL_ACC[b.cat] || '7122'; return ACC[a] ? a : '7122'; }
function blPfCat(b) { var c = BL_PF[b.cat] || 'Бусад', L = pfCats('exp'); return L.indexOf(c) >= 0 ? c : L.indexOf('Бусад') >= 0 ? 'Бусад' : L[0]; }
// Тухайн сарын төлөлт (нэг сард хэд хэдэн удаа төлж болно — нийлүүлнэ)
function blPaid(b, m) {
  var key = blKey(b, m), o = { amt: 0, date: '', n: 0 }, add = function (a, d) { o.amt += a; o.n++; if (d > o.date) o.date = d; };
  if (b.ent === 'mgmt') pfL('tx').forEach(function (t) { if (t.link === key && t.type === 'Зарлага') add(t.amount, t.date); });
  else (typeof journal !== 'undefined' ? journal : []).forEach(function (j) { if (j.biz === b.ent && !/^(Устгасан|Цуцалсан)$/.test(j.status || '') && hasTag(j.desc, key)) add(j.amount, j.date); });
  o.amt = r0(o.amt); return o.n ? o : null;
}
// Нэг мөр: төлбөр × сар → төлөв
function blRow(b, m) {
  var t = todayStr(), due = blDue(b, m), p = blPaid(b, m), soon = todayStr(new Date(Date.now() + 3 * 864e5));
  var st = p ? 'paid' : due < t ? 'late' : due <= soon ? 'soon' : 'wait';
  return { b: b, m: m, due: due, paid: p, st: st, exp: p ? p.amt : Number(b.amt) || 0 };
}
// Сарын мөрүүд: идэвхтэй төлбөр бүр (бүртгэсэн сараас хойш); одоогийн сарыг харахад өмнөх сарын төлөгдөөгүй мөр ч гарна
function blRows(ent, m) {
  var cur = todayStr().slice(0, 7), out = [];
  blList().forEach(function (b) {
    if (ent !== '*' && b.ent !== ent) return;
    var from = b.from || m;
    if (b.on !== false && from <= m) out.push(blRow(b, m));
    else if (b.on === false && from <= m) { var r = blRow(b, m); if (r.paid) out.push(r); }   // зогсоосон ч тэр сард төлсөн бол харагдана
    if (m === cur && b.on !== false) for (var k = 1; k <= 12; k++) { var pm = pfMonAdd(m, -k); if (pm < from) break; var rr = blRow(b, pm); if (!rr.paid) out.push(rr); }
  });
  return out.sort(function (a, c) { return a.due < c.due ? -1 : a.due > c.due ? 1 : 0; });
}
// Анхааруулга: хоцорсон эсвэл 3 хоногийн дотор төлөх
function blAlerts(ent) { return isOwner() ? blRows(ent, todayStr().slice(0, 7)).filter(function (r) { return r.st === 'late' || r.st === 'soon'; }) : []; }
var BL_ST = { paid: ['Төлсөн', 'g'], late: ['Хоцорсон', 'r'], soon: ['Удахгүй', 'y'], wait: ['Хүлээгдэж буй', ''] };
function blTag(st) { var s = BL_ST[st]; return '<span class="tag' + (s[1] ? ' ' + s[1] : '') + '">' + s[0] + '</span>'; }

// ═══════════ ХУУДАС ═══════════
function billsView(scope) {
  var ent = scope === '*' ? state.blEnt || '*' : scope, tab = state.blTab || 'month', m = state.blMon || todayStr().slice(0, 7);
  var tabs = '<div class="tabs fn-tabs">' + [['month', 'Сарын төлбөр'], ['list', 'Бүртгэл'], ['rep', 'Тайлан']].map(function (t) {
    return '<button class="' + (t[0] === tab ? 'on' : '') + '" onclick="state.blTab=\'' + t[0] + '\';render()">' + t[1] + '</button>'; }).join('') + '</div>';
  var flt = (scope === '*' ? stBar('Хамаарал', [['*', 'Бүгд']].concat(BL_ENT), ent, "state.blEnt='%'") : '') +
    (tab !== 'list' ? '<div class="fn-flt"><span class="fn-fl">Сар</span><input type="month" value="' + m + '" onchange="state.blMon=this.value||\'\';render()" style="width:auto"></div>' : '');
  return tabs + flt + (tab === 'list' ? blListView(ent) : tab === 'rep' ? blRepView(ent, m) : blMonthView(ent, m));
}
function blMonthView(ent, m) {
  var R = blRows(ent, m), inM = R.filter(function (r) { return r.m === m; });
  var due = r0(inM.reduce(function (s, r) { return s + r.exp; }, 0)), paid = r0(inM.reduce(function (s, r) { return s + (r.paid ? r.paid.amt : 0); }, 0)),
      late = R.filter(function (r) { return r.st === 'late'; }).length;
  var k = [['Энэ сард төлөх', due, ''], ['Төлсөн', paid, 'pos'], ['Үлдсэн', r0(due - paid), due - paid > 0.5 ? 'neg' : ''], ['Хоцорсон', late, late ? 'neg' : '', 1]];
  var kpis = '<div class="fn-kpis">' + k.map(function (x) { return '<div class="fn-kpi"><small>' + x[0] + '</small><b class="' + x[2] + '">' + (x[3] ? x[1] : mny(x[1])) + '</b></div>'; }).join('') + '</div>';
  var rows = R.map(function (r) {
    var b = r.b;
    return '<tr' + (r.st === 'late' ? ' style="color:var(--red)"' : '') + '><td class="nw">' + esc(r.due) + (r.m !== m ? '<br><small>' + esc(r.m) + '-ийн</small>' : '') + '</td>' +
      '<td><b>' + esc(b.name) + '</b><br><small class="muted">' + esc([b.cat, b.sup, b.acct].filter(Boolean).join(' · ')) + '</small></td>' +
      (ent === '*' ? '<td>' + esc(blEntName(b.ent)) + '</td>' : '') +
      '<td class="n">' + (b.kind === 'var' && !r.paid ? '<small class="muted">~</small>' : '') + mny(r.paid ? r.paid.amt : b.amt) + '</td>' +
      '<td>' + blTag(r.st) + (r.paid ? '<br><small class="muted">' + esc(r.paid.date) + '</small>' : '') + '</td>' +
      '<td class="n nw"><button class="mini' + (r.paid ? '' : '" style="color:var(--accent)') + '" onclick="blPay(\'' + b.id + '\',\'' + r.m + '\')">' + (r.paid ? 'Дахин төлөх' : 'Төлсөн') + '</button></td></tr>';
  }).join('');
  return kpis + '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Төлөх өдөр</th><th>Төлбөр</th>' + (ent === '*' ? '<th>Хамаарал</th>' : '') + '<th class="n">Дүн</th><th>Төлөв</th><th></th></tr>' +
    (rows || '<tr><td colspan="6" class="muted">Энэ сард төлөх зүйл алга — «Бүртгэл» хэсгээс «+ Тогтмол төлбөр» нэмнэ үү.</td></tr>') + '</table></div></div>' +
    '<p class="muted" style="font-size:12.5px">~ хэлбэлздэг төлбөрийн ойролцоо дүн. Төлсөн мөрийг цуцлах бол ' + (ent === 'mgmt' ? 'гүйлгээний жагсаалтаас' : 'тухайн гүйлгээ, журналаас') + ' цуцална.</p>';
}
function blListView(ent) {
  var L = blList().filter(function (b) { return ent === '*' || b.ent === ent; });
  var rows = L.map(function (b) {
    var off = b.on === false;
    return '<tr' + (off ? ' style="opacity:.55"' : '') + '><td><b>' + esc(b.name) + '</b><br><small class="muted">' + esc(b.cat) + '</small></td><td>' + esc(b.sup || '') + (b.acct ? '<br><small class="muted">' + esc(b.acct) + '</small>' : '') + '</td>' +
      (ent === '*' ? '<td>' + esc(blEntName(b.ent)) + '</td>' : '') + '<td>' + (b.kind === 'var' ? 'Хэлбэлздэг' : 'Тогтмол') + '</td><td class="n">' + mny(b.amt) + '</td><td class="n">' + esc(String(b.day)) + '</td>' +
      '<td>' + esc(b.ent === 'mgmt' ? pfAccName(b.pay) : b.pay ? accName(b.pay) : '') + '</td><td>' + (off ? 'Зогсоосон' : 'Идэвхтэй') + '</td>' +
      '<td class="n nw"><button class="mini" onclick="blOpen(\'' + b.id + '\')">Засах</button><button class="mini" onclick="blToggle(\'' + b.id + '\')">' + (off ? 'Сэргээх' : 'Зогсоох') + '</button></td></tr>';
  }).join('');
  return '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Нэр</th><th>Нийлүүлэгч, дугаар</th>' + (ent === '*' ? '<th>Хамаарал</th>' : '') + '<th>Дүнгийн төрөл</th><th class="n">Дүн</th><th class="n">Өдөр</th><th>Төлөх данс</th><th>Төлөв</th><th></th></tr>' +
    (rows || '<tr><td colspan="9" class="muted">Бүртгэл алга — «+ Тогтмол төлбөр» дарж нэмнэ үү.</td></tr>') + '</table></div></div>';
}
// Тайлан: ангилал × сүүлийн 6 сар (төлсөн дүн, төлбөрийн сараар), өмнөх сараас өөрчлөлт, сүүлийн 3 сарын дундаж
function blRepView(ent, m) {
  var ms = []; for (var i = 5; i >= 0; i--) ms.push(pfMonAdd(m, -i));
  var D = {}, tot = {};
  blList().forEach(function (b) {
    if (ent !== '*' && b.ent !== ent) return;
    ms.forEach(function (mm) { var p = blPaid(b, mm); if (!p) return; var c = D[b.cat] = D[b.cat] || {}; c[mm] = (c[mm] || 0) + p.amt; tot[mm] = (tot[mm] || 0) + p.amt; });
  });
  var cats = BL_CATS.filter(function (c) { return D[c]; }), prev = ms[4], last3 = ms.slice(2, 5);
  var chg = function (a, b) {
    if (!b || !a) return '';
    var p = Math.round((a - b) / b * 100); return p === 0 ? '<small class="muted">0%</small>' : '<span style="color:var(--' + (p > 0 ? 'red' : 'green') + ')">' + (p > 0 ? '▲ ' : '▼ ') + Math.abs(p) + '%</span>';
  };
  var avg = function (o) { var v = last3.filter(function (mm) { return o[mm]; }); return v.length ? r0(v.reduce(function (s, mm) { return s + o[mm]; }, 0) / v.length) : 0; };
  var line = function (name, o, cls) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + name + '</td>' + ms.map(function (mm) { return '<td class="n">' + (o[mm] ? mny(o[mm]) : '<span class="muted">—</span>') + '</td>'; }).join('') +
      '<td class="n">' + chg(o[m], o[prev]) + '</td><td class="n">' + (avg(o) ? mny(avg(o)) : '') + '</td></tr>';
  };
  // Энэ сар: төлөх / төлсөн / үлдсэн (хамаарлаар)
  var inM = blRows(ent, m).filter(function (r) { return r.m === m; }), by = {};
  inM.forEach(function (r) { var o = by[r.b.ent] = by[r.b.ent] || { d: 0, p: 0 }; o.d += r.exp; o.p += r.paid ? r.paid.amt : 0; });
  var sum = '<div class="card rep"><div class="rep-cap"><b>' + esc(m) + ' — төлөх, төлсөн, үлдсэн</b></div><div class="scroll"><table class="rep-t"><tr><th>Хамаарал</th><th class="n">Төлөх</th><th class="n">Төлсөн</th><th class="n">Үлдсэн</th></tr>' +
    (Object.keys(by).length ? BL_ENT.filter(function (e) { return by[e[0]]; }).map(function (e) { var o = by[e[0]]; return '<tr><td>' + e[1] + '</td><td class="n">' + mny(o.d) + '</td><td class="n">' + mny(o.p) + '</td><td class="n">' + mny(r0(o.d - o.p)) + '</td></tr>'; }).join('')
      : '<tr><td colspan="4" class="muted">Энэ сард төлбөр алга.</td></tr>') + '</table></div></div>';
  var cmp = '<div class="card rep"><div class="rep-cap"><b>Ангиллаар, сар сараар (төлсөн дүн)</b></div><div class="scroll"><table class="rep-t"><tr><th>Ангилал</th>' + ms.map(function (mm) { return '<th class="n">' + mm + '</th>'; }).join('') +
    '<th class="n">Өмнөх сараас</th><th class="n">3 сарын дундаж</th></tr>' +
    (cats.length ? cats.map(function (c) { return line(esc(c), D[c]); }).join('') + line('Нийт', tot, 'tot') : '<tr><td colspan="9" class="muted">Энэ хугацаанд төлсөн төлбөр алга.</td></tr>') + '</table></div></div>' +
    '<p class="muted" style="font-size:12.5px">Дүн нь тухайн сарын төлбөрөөр (төлсөн огноогоор биш). 3 сарын дундаж — ' + last3[0] + ' – ' + last3[2] + ', төлөлттэй сараар.</p>';
  return sum + cmp;
}

// ═══════════ БҮРТГЭХ, ЗАСАХ ═══════════
function blOpen(id) {
  var b = id ? blById(id) : null, ent = b ? b.ent : state.biz && state.biz !== 'mgmt' ? state.biz : state.blEnt && state.blEnt !== '*' ? state.blEnt : 'mgmt';
  gOpen('<h2>' + (b ? 'Тогтмол төлбөр засах' : 'Тогтмол төлбөр бүртгэх') + '</h2>' +
    '<div class="row2"><div><label for="blName">Нэр</label><input id="blName" placeholder="Жишээ: Цахилгаан — дэлгүүр" value="' + esc(b ? b.name : '') + '"></div>' +
    '<div><label for="blCat">Ангилал</label><select id="blCat">' + BL_CATS.map(function (c) { return '<option' + (b && b.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="row2"><div><label for="blSup">Нийлүүлэгч</label><input id="blSup" placeholder="УСУГ, УБЦТС, Univision…" value="' + esc(b ? b.sup || '' : '') + '"></div>' +
    '<div><label for="blAcct">Хэрэглэгчийн / гэрээний дугаар</label><input id="blAcct" value="' + esc(b ? b.acct || '' : '') + '"></div></div>' +
    '<div class="row2"><div><label for="blKind">Дүнгийн төрөл</label><select id="blKind" onchange="$(\'blAmtL\').textContent=this.value===\'var\'?\'Ойролцоо дүн (₮)\':\'Дүн (₮)\'">' +
      '<option value="fix"' + (b && b.kind === 'var' ? '' : ' selected') + '>Тогтмол</option><option value="var"' + (b && b.kind === 'var' ? ' selected' : '') + '>Хэлбэлздэг</option></select></div>' +
    '<div><label for="blAmt" id="blAmtL">' + (b && b.kind === 'var' ? 'Ойролцоо дүн (₮)' : 'Дүн (₮)') + '</label><input id="blAmt" type="number" min="0" inputmode="numeric" value="' + (b ? b.amt : '') + '"></div></div>' +
    '<div class="row2"><div><label for="blDay">Төлөх өдөр (сарын хэдэнд)</label><input id="blDay" type="number" min="1" max="31" inputmode="numeric" value="' + (b ? b.day : '') + '"></div>' +
    '<div><label for="blEnt">Хамаарал</label><select id="blEnt" onchange="blPayOpts()"' + (b ? ' disabled' : '') + '>' + BL_ENT.map(function (e) { return '<option value="' + e[0] + '"' + (e[0] === ent ? ' selected' : '') + '>' + e[1] + '</option>'; }).join('') + '</select></div></div>' +
    '<label for="blPay">Төлөх данс / төлбөрийн хэрэгсэл</label><select id="blPay"></select>' +
    '<label style="display:flex;gap:6px;align-items:center;margin-top:10px"><input type="checkbox" id="blOn" style="width:auto"' + (!b || b.on !== false ? ' checked' : '') + '> Идэвхтэй (сар бүр мөр гарна)</label>' +
    '<button class="btn" onclick="blSave(\'' + (id || '') + '\')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  blPayOpts(b ? b.pay : '');
}
function blPayOpts(sel) {
  var e = $('blEnt').value;
  $('blPay').innerHTML = e === 'mgmt' ? '<option value="">— сонгох —</option>' + pfAccOpts(sel) : cashAccOpts(sel || '1101');
}
function blSave(id) {
  var old = id ? blById(id) : null, b = Object.assign({}, old || { id: pfId('BL'), from: todayStr().slice(0, 7) });
  b.name = $('blName').value.trim(); b.cat = $('blCat').value; b.sup = $('blSup').value.trim(); b.acct = $('blAcct').value.trim();
  b.kind = $('blKind').value; b.amt = Number($('blAmt').value) || 0; b.day = Number($('blDay').value) || 0; b.ent = old ? old.ent : $('blEnt').value; b.pay = $('blPay').value; b.on = $('blOn').checked;
  if (!b.name) { toast('Нэрээ оруулна уу'); return; }
  if (!(b.day >= 1 && b.day <= 31)) { toast('Төлөх өдөр 1–31'); return; }
  if (b.kind === 'fix' && !(b.amt > 0)) { toast('Дүнгээ оруулна уу'); return; }
  var L = blList().filter(function (x) { return x.id !== b.id; }).concat([b]);
  pfCfgSave(Object.assign({}, pfCfg, { bills: L }), function () { gClose(); toast('Хадгаллаа'); });
}
function blToggle(id) {
  var L = blList().map(function (x) { return x.id === id ? Object.assign({}, x, { on: x.on === false }) : x; });
  pfCfgSave(Object.assign({}, pfCfg, { bills: L }));
}

// ═══════════ ТӨЛСӨН ═══════════
function blPay(id, m) {
  var b = blById(id); if (!b) return;
  var p = blPaid(b, m), pf = b.ent === 'mgmt';
  gOpen('<h2>Төлбөр төлсөн</h2><p class="muted">' + esc(b.name) + ' · ' + esc(blEntName(b.ent)) + ' · ' + esc(m) + ' сарын' + (b.acct ? ' · ' + esc(b.acct) : '') + '</p>' +
    (p ? '<p class="rep-note">Энэ сард ' + mny(p.amt) + ' төлсөн байна (' + esc(p.date) + '). Нэмж төлсөн бол бүртгэнэ үү.</p>' : '') +
    '<div class="row2"><div><label for="bpAmt">Бодит дүн (₮)</label><input id="bpAmt" type="number" min="0" inputmode="numeric"' +
      (b.kind === 'var' || p ? ' placeholder="' + (b.amt ? 'ойролцоо ' + fmt(b.amt) : '') + '"' : ' value="' + (b.amt || '') + '"') + '></div>' +
    '<div><label for="bpDate">Огноо</label><input id="bpDate" type="date" value="' + todayStr() + '"></div></div>' +
    '<label for="bpAcc">Данс</label><select id="bpAcc">' + (pf ? '<option value="">— сонгох —</option>' + pfAccOpts(b.pay) : cashAccOpts(b.pay || '1101')) + '</select>' +
    '<label for="bpNote">Тэмдэглэл</label><input id="bpNote">' +
    '<p class="muted" style="font-size:12.5px">' + (pf ? 'Хувийн санхүүд «' + esc(blPfCat(b)) + '» зарлага болж бичигдэнэ.' : esc(BUSINESSES[b.ent] ? BUSINESSES[b.ent].name : '') + '-ийн журналд Дт ' + blAccOf(b) + ' ' + esc(accName(blAccOf(b))) + ' / Кт сонгосон данс.') + '</p>' +
    '<button class="btn" onclick="blPaySave(\'' + id + '\',\'' + m + '\')">Бүртгэх</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  if (b.kind === 'var') $('bpAmt').focus();
}
function blPaySave(id, m) {
  var b = blById(id), amt = r0(Number($('bpAmt').value) || 0), d = $('bpDate').value, acc = $('bpAcc').value, note = $('bpNote').value.trim(), key = blKey(b, m);
  if (!(amt > 0)) { toast(b.kind === 'var' ? 'Хэлбэлздэг төлбөр — бодит дүнг оруулна уу' : 'Дүнгээ оруулна уу'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('Огноо оруулна уу'); return; }
  if (!acc) { toast('Дансаа сонгоно уу'); return; }
  var desc = 'Тогтмол төлбөр · ' + b.name + ' · ' + m + (b.acct ? ' · ' + b.acct : '') + (note ? ' · ' + note : '');
  if (b.ent === 'mgmt') {
    pfSave('tx', [{ date: d, type: 'Зарлага', acc: acc, toAcc: '', amount: amt, cat: blPfCat(b), desc: desc.slice(0, 170), link: key, rec: '' }], [], function () { gClose(); toast('Бүртгэгдлээ'); });
    return;
  }
  postEntries([{ biz: b.ent, date: d, dr: blAccOf(b), cr: acc, amount: amt, partner: b.sup || b.name, desc: desc.slice(0, 170) + ' #' + key }], function () {
    gClose(); toast('Бүртгэгдлээ'); if (API_URL) refresh(); else render();
  });
}

// ═══════════ ЦЭС, САМБАР ═══════════
REP_HELP.bills = 'Ус, цахилгаан, дулаан, интернет, утас, түрээс. Сар бүр мөр өөрөө гарна; «Төлсөн» дарахад зардал болж бичигдэнэ.';
(function () {
  // Хувийн санхүү: бүх хамаарал нэг дор
  PF_NAV.splice(5, 0, ['Тогтмол төлбөр', 'bell', [['pf/bills', 'Тогтмол төлбөр']]]);
  var _pv = pfView;
  pfView = function () {
    if (state.sub.pf !== 'bills') return _pv();
    return pfHead('Тогтмол төлбөр', 'Хувийн болон компаниудын ус, цахилгаан, дулаан, интернет, утас, түрээс. Сар бүр мөр өөрөө гарна; «Төлсөн» дарахад тухайн санхүүд зардал болж бичигдэнэ.',
      '<button class="b-btn primary" onclick="blOpen()">+ Тогтмол төлбөр</button>') + billsView('*');
  };
  // Компани: Тооцоо → Тогтмол зардал, төлбөр → «Төлбөрийн хуваарь» таб (тухайн компанийнх)
  var _ok = navOk;
  navOk = function (biz, k) { if (k === 'finance/bills') return biz !== 'mgmt' && isOwner() && !(BUSINESSES[biz] || {}).finOnly; return _ok(biz, k); };
  var _cv = companyView;
  companyView = function () {
    if (state.biz !== 'mgmt' && state.module === 'finance' && state.sub.finance === 'bills') {
      if (!isOwner()) return '<div class="card"><p class="muted">Энэ хэсгийг зөвхөн эзэн харна.</p></div>';
      return pageHead('Тогтмол зардал, төлбөр', '<button class="b-btn primary" onclick="blOpen()">+ Тогтмол төлбөр</button>') + billsView(state.biz);
    }
    return _cv();
  };
  // Хонх + компанийн нүүр: хоцорсон / 3 хоногийн дотор төлөх
  var _al = alertsOf;
  alertsOf = function (biz) {
    var out = _al(biz);
    blAlerts(biz).forEach(function (r) {
      out.push({ txt: (r.st === 'late' ? 'Хоцорсон: ' : 'Төлөх: ') + r.b.name + ' · ' + fmt(r.b.amt) + ' — ' + r.due, n: 1, bad: r.st === 'late',
        fn: biz === 'mgmt' ? "state.module='pf';state.sub.pf='bills';state.blTab='month';render()" : "state.blTab='month';navGo('finance/bills')" });
    });
    return out;
  };
  // Хувийн санхүүгийн нүүр: бүх хамаарлын сануулга
  var _ph = pfHomeView;
  pfHomeView = function () {
    var h = _ph(), A = blAlerts('*'); if (!A.length) return h;
    var card = '<div class="card rep"><div class="rep-cap"><b>Тогтмол төлбөр — хоцорсон, ойрын 3 хоногт</b></div><div class="scroll"><table class="rep-t"><tr><th>Өдөр</th><th>Төлбөр</th><th>Хамаарал</th><th class="n">Дүн</th><th></th></tr>' +
      A.map(function (r) { return '<tr' + (r.st === 'late' ? ' style="color:var(--red)"' : '') + '><td class="nw">' + r.due + ' ' + blTag(r.st) + '</td><td>' + esc(r.b.name) + '</td><td>' + esc(blEntName(r.b.ent)) + '</td><td class="n">' + mny(r.b.amt) + '</td>' +
        '<td class="n"><button class="mini" style="color:var(--accent)" onclick="blPay(\'' + r.b.id + '\',\'' + r.m + '\')">Төлсөн</button></td></tr>'; }).join('') + '</table></div></div>';
    var i = h.indexOf('<div class="card"><h2>Сүүлийн 12 сарын');
    return i < 0 ? h + card : h.slice(0, i) + card + h.slice(i);
  };
})();
