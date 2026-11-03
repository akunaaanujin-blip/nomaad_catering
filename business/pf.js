// ── ХУВИЙН САНХҮҮ (компани сонгогчид «Хувийн санхүү», value="mgmt") — зөвхөн Эзэн ──
// Өгөгдөл: P_Accounts, P_Transactions, P_Budget, P_Assets (сервер admin_pf). Устгахгүй — «Цуцалсан».
// Зээл нь хуучин «Зээл» хуудаснаас (biz='mgmt'); төлөлт бүр P_Transactions-д «Зээлийн төлөлт» зарлага (link = зээлийн ID, үндсэн/хүү/торгууль).
// Компанид өгсөн / компаниас авсан — тухайн компанийн журналд эсрэг бичилт (Дт/Кт 1208 «Захирлын зарлага», тайлбарт #PF ID).
// nav.js-ийн дараа ачаална.

var PF = { acc: [], tx: [], bud: [], asset: [] }, pfCfg = {};
var PF_INC0 = ['Цалин', 'Компаниас авсан', 'Түрээс', 'Бусад'];
var PF_EXP0 = ['Хоол хүнс', 'Байр/коммунал', 'Тээвэр/шатахуун', 'Эрүүл мэнд', 'Хүүхэд/боловсрол', 'Хувцас', 'Аялал', 'Утас/интернэт', 'Зээлийн төлөлт', 'Бэлэг/хандив', 'Компанид өгсөн', 'Бусад'];
var PF_SYS = { inc: ['Компаниас авсан', 'Зээлийн эргэн төлөлт'], exp: ['Зээлийн төлөлт', 'Компанид өгсөн'] };   // устгаж болохгүй (автомат бичилтэд хэрэгтэй)
var PF_ACC_T = ['Бэлэн', 'Банк', 'Карт', 'Хадгаламж', 'Цахим хэтэвч'];
var PF_ASSET_T = ['Үл хөдлөх', 'Машин', 'Хадгаламж', 'Компанийн хувь', 'Бусад'];
var PF_CO = /^(Компаниас авсан|Компанид өгсөн)$/;

function pfApply(d, cfg) {
  PF = { acc: (d && d.acc) || [], tx: (d && d.tx) || [], bud: (d && d.bud) || [], asset: (d && d.asset) || [] };
  pfCfg = cfg || {};
}
function pfL(t) { var L = (PF[t] || []).filter(function (x) { return x.status !== 'Цуцалсан'; }); return t === 'tx' ? L.concat(pfVirt()) : L; }
// Компаниас захирлын өмнөөс төлсөн зарлага (компанийн журналд Дт 1208, удирдлагын 7023 «Бусад компаниас авсан зарлага») — хувийн зарлагад орно, дансанд нөлөөлөхгүй.
// Хувийн санхүүгээс «Компаниас авсан»-аар үүссэн (#PT…) болон эхний үлдэгдлийн бичилт орохгүй. Засах/цуцлах — тухайн компанийн журналаас.
var PF_COEXP = 'Бусад компаниас авсан зарлага', _pfV = { j: null, n: -1, v: [] };
function pfVirt() {
  var J0 = typeof journal !== 'undefined' ? journal : [];
  if (_pfV.j === J0 && _pfV.n === J0.length) return _pfV.v;
  var v = J0.filter(function (j) {
    return j.biz !== 'mgmt' && BUSINESSES[j.biz] && !/^(Устгасан|Цуцалсан)$/.test(j.status || '') && accMig(j.dr, j.id, j.desc) === '1208' && !/#P[TF][0-9A-Z]/.test(String(j.desc)) && !/эхний үлдэгдэл|^Он нээлт/i.test(String(j.desc));
  }).map(function (j) {
    return { id: 'J' + j.id, date: j.date, type: 'Зарлага', acc: '', toAcc: '', amount: j.amount, cat: PF_COEXP, desc: (j.desc || 'Захирлын зарлага') + ' · ' + BUSINESSES[j.biz].name + '-аас төлсөн', link: '', rec: '', co: j.biz, virt: 1, status: 'Идэвхтэй' };
  });
  _pfV = { j: J0, n: J0.length, v: v };
  return v;
}
function pfCats(kind) {
  var L = (pfCfg[kind] && pfCfg[kind].length ? pfCfg[kind] : kind === 'inc' ? PF_INC0 : PF_EXP0).slice();
  PF_SYS[kind].forEach(function (c) { if (L.indexOf(c) < 0) L.splice(Math.max(0, L.length - 1), 0, c); });
  return L;
}
function pfAcc(id) { return (PF.acc || []).filter(function (a) { return a.id === id; })[0]; }
function pfAccName(id) { var a = pfAcc(id); return a ? a.name : id ? '—' : ''; }
function pfTxAccName(t) { return t.virt ? (BUSINESSES[t.co] || {}).name || '' : pfAccName(t.acc); }
function pfAccOpts(sel, all) {
  return pfL('acc').filter(function (a) { return all || a.active !== 'Үгүй' || a.id === sel; }).map(function (a) {
    return '<option value="' + esc(a.id) + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('');
}
// Дансны үлдэгдэл = эхний үлдэгдэл + орлого − зарлага ± шилжүүлэг (эхний огнооноос хойш)
function pfBal(id, to) {
  var a = pfAcc(id); if (!a) return 0;
  var v = a.open || 0, from = a.openDate || '';
  if (to && from && to < from) return 0;   // эхний огнооноос өмнө данс байгаагүй
  pfL('tx').forEach(function (t) {
    if ((from && t.date < from) || (to && t.date > to)) return;
    if (t.acc === id) v += t.type === 'Орлого' ? t.amount : -t.amount;
    if (t.type === 'Шилжүүлэг' && t.toAcc === id) v += t.amount;
  });
  return r0(v);
}
function pfCash(to) { return r0(pfL('acc').reduce(function (s, a) { return s + pfBal(a.id, to); }, 0)); }
function pfMonthSum(m, type) {
  var o = {}; pfL('tx').forEach(function (t) { if (t.type === type && t.date.slice(0, 7) === m) o[t.cat || 'Бусад'] = (o[t.cat || 'Бусад'] || 0) + t.amount; }); return o;
}
function pfSumIn(from, to, type) {
  var o = {}; pfL('tx').forEach(function (t) { if (t.type === type && t.date >= from && t.date <= to) o[t.cat || 'Бусад'] = (o[t.cat || 'Бусад'] || 0) + t.amount; }); return o;
}
function pfTot(o) { return r0(Object.keys(o).reduce(function (s, k) { return s + o[k]; }, 0)); }
function pfId(p) { return p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
function pfMonAdd(m, k) { var d = new Date(m + '-01T00:00:00'); d.setMonth(d.getMonth() + k); return todayStr(d).slice(0, 7); }
function pfMonEnd(m) { var d = new Date(m + '-01T00:00:00'); d.setMonth(d.getMonth() + 1); d.setDate(0); return todayStr(d); }

// Хадгалах: сервер (эсвэл туршилтын горимд энэ төхөөрөмж) → дотоод жагсаалтыг шууд шинэчилж зурна
function pfSave(table, rows, cancel, cb) {
  rows = rows || []; cancel = cancel || [];
  var apply = function () {
    var L = PF[table] = PF[table] || [], now = todayStr() + ' ' + timeStr();
    rows.forEach(function (r) { r.status = r.status || 'Идэвхтэй'; r.updated = now; var i = L.map(function (x) { return x.id; }).indexOf(r.id); if (i >= 0) L[i] = r; else L.push(r); });
    cancel.forEach(function (id) { L.forEach(function (x) { if (x.id === id) { x.status = 'Цуцалсан'; x.updated = now; } }); });
  };
  rows.forEach(function (r) { if (!r.id) r.id = pfId('P' + table.charAt(0).toUpperCase()); });
  if (!API_URL) { apply(); save('nb_demo_pf', PF); if (cb) cb(); render(); return; }
  post({ type: 'admin_pf', table: table, rows: rows, cancel: cancel }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    apply(); if (cb) cb(); render(); refresh();
  });
}
function pfCfgSave(v, cb) {
  pfCfg = v;
  if (!API_URL) { save('nb_demo_pfcfg', v); if (cb) cb(); render(); return; }
  post({ type: 'admin_setting', key: 'pfcfg', value: v }, function (err) { if (err) { toast('Алдаа: ' + err); return; } if (cb) cb(); render(); });
}

// ═══════════ ЦЭС ═══════════
var PF_NAV = [
  ['Нүүр', 'home', [['pf/home', 'Нүүр']]],
  ['Данс', 'money', [['pf/acc', 'Данс']]],
  ['Гүйлгээ', 'sales', [['pf/tx', 'Гүйлгээ']]],
  ['Төсөв', 'reports', [['pf/bud', 'Төсөв']]],
  ['Зээл', 'people', [['pf/loans', 'Авсан зээл'], ['pf/lgiven', 'Өгсөн зээл'], ['pf/fixed', 'Тогтмол зардал']]],
  ['Хөрөнгө', 'products', [['pf/asset', 'Хөрөнгө']]],
  ['Тайлан', 'reports', [['pf/rep', 'Тайлан']]],
  ['Тохиргоо', 'gear', [['pf/set', 'Тохиргоо'], ['finance/api', 'Банкны данс холбох'], ['finance/ledger', 'Хуучин бүртгэл (журнал)'], ['finance/audit', 'Өөрчлөлтийн түүх'], ['finance/trash', 'Хогийн сав']]],
];
var PF_LEGACY = /^(api|ledger|audit|trash)$/;
(function () {
  var withNav = function (fn) { return function () { if (state.biz !== 'mgmt') return fn.apply(this, arguments); var m = MNAV; MNAV = PF_NAV; try { return fn.apply(this, arguments); } finally { MNAV = m; } }; };
  subnavHtml = withNav(subnavHtml); fnOpen = withNav(fnOpen);
  var _navOk = navOk;
  navOk = function (biz, k) { if (biz === 'mgmt') return isOwner() && (/^pf\//.test(k) || /^finance\/(api|ledger|audit|trash)$/.test(k)); return _navOk(biz, k); };
  var _cv = companyView;
  companyView = function () {
    if (state.biz !== 'mgmt') return _cv();
    if (!isOwner()) return '<div class="card"><p class="muted">Энэ хэсгийг зөвхөн эзэн харна.</p></div>';
    if (state.module === 'finance' && PF_LEGACY.test(state.sub.finance)) return _cv();
    state.module = 'pf'; state.sub.pf = state.sub.pf || 'home';
    return '<div class="pf">' + pfView() + '</div>';
  };
  // «Миний компаниуд» дээрх карт
  mgmtCard = function () {
    var cash = pfCash(), debt = pfDebt(), as = pfAssetSum();
    return '<h2 class="sec-title">Хувийн санхүү</h2><div class="co-grid"><div class="co-card" style="--co:#374151">' +
      '<div class="co-head"><span class="mono" style="--co:#374151">Х</span><div><b>Хувийн санхүү</b><small>Данс, гүйлгээ, төсөв, зээл, хөрөнгө</small></div></div>' +
      '<div class="co-stats"><div><span>Нийт мөнгө</span><b>' + mny(cash) + '</b></div><div><span>Нийт өр</span><b>' + mny(debt) + '</b></div>' +
      '<div><span>Хөрөнгө</span><b>' + mny(as) + '</b></div><div><span>Цэвэр хөрөнгө</span><b>' + mny(cash + as + pfRecv() - debt) + '</b></div></div>' +
      '<button class="btn" style="background:#374151" onclick="state.sub.pf=\'home\';go(\'company\',\'mgmt\')">Нэвтрэх →</button></div></div>';
  };
  // Хувийн санхүүгийн төлөлт зээлийн үлдэгдэлд орно (журналынхтай нийлж)
  var _ls = loanStat;
  window.loanStatJ = _ls;
  loanStat = function (L, E) {
    var s = _ls(L, E);
    if (!L || L.biz !== 'mgmt') return s;
    pfLoanTx(L.id).forEach(function (t) { s.paid += t.prin || 0; s.intr += t.intr || 0; if (t.date > (s.last || '')) s.last = t.date; });
    if (s.got < 0.5) s.got = L.amount;   // хувийн зээл: бүртгэсэн дүн = авсан
    s.paid = r0(s.paid); s.intr = r0(s.intr); s.left = r0(s.got - s.paid);
    return s;
  };
})();
function pfHead(t, d, act) { return '<div class="pg-head"><div><h1>' + t + '</h1>' + (d ? '<p class="pg-desc">' + d + '</p>' : '') + '</div><div class="pg-act">' + (act || '') + '</div></div>'; }
function pfView() {
  var s = state.sub.pf;
  if (s === 'acc') return pfAccView();
  if (s === 'tx') return pfTxView();
  if (s === 'bud') return pfBudView();
  if (s === 'loans') return pfHead('Авсан зээл', 'Таны төлөх зээл, өр. «Төлөлт» дарахад данснаас зарлага автоматаар бичигдэнэ.',
    '<button class="b-btn" onclick="openLoan(null,\'Авсан\')">+ Авсан зээл</button>') + loansView('Авсан');
  if (s === 'fixed') return pfHead('Тогтмол зардал', 'Түрээс, интернэт, даатгал г.м давтагддаг төлбөр. «Төлсөн» дарахад тухайн ангилалд зарлага бичигдэнэ.',
    '<button class="b-btn" onclick="openLoan(null,\'Авсан\');$(\'lnSrc\').value=\'fixed\';spSrcSet()">+ Тогтмол зардал</button>') + loansView('fixed');
  if (s === 'lgiven') return pfHead('Өгсөн зээл', 'Бусдад өгсөн, танд буцааж төлөх зээл. «Төлбөр авсан» дарахад данс руу орлого бичигдэнэ.',
    '<button class="b-btn" onclick="openLoan(null,\'Өгсөн\')">+ Өгсөн зээл</button>') + loansView('Өгсөн');
  if (s === 'asset') return pfAssetView();
  if (s === 'rep') return pfRepView();
  if (s === 'set') return pfSetView();
  return pfHomeView();
}

// ═══════════ ЗЭЭЛ (хувийн) ═══════════
function pfLoans(kind, withFx) { return loanList('mgmt').filter(function (L) { return (!kind || L.kind === kind) && (withFx || !lnFx(L)); }); }   // тогтмол зардал өр биш
function pfLoanTx(id, all) { return (PF.tx || []).filter(function (t) { return t.link === id && (all || t.status !== 'Цуцалсан'); }); }
function pfLoanOpen(L) { var s = loanStat(L); return L.status !== 'Хаагдсан' && s.left > 0.5; }
function pfDebt() { return r0(pfLoans('Авсан').filter(pfLoanOpen).reduce(function (a, L) { return a + loanStat(L).left; }, 0)); }
function pfRecv() { return r0(pfLoans('Өгсөн').filter(pfLoanOpen).reduce(function (a, L) { return a + loanStat(L).left; }, 0)); }
function pfAssetSum(to) { return r0(pfL('asset').filter(function (a) { return !to || !a.date || a.date <= to; }).reduce(function (s, a) { return s + a.value; }, 0)); }
// Хүү: хоногоор — үлдэгдэл × жилийн хүү ÷ 365 × өмнөх төлөлтөөс хойшх хоног; сараар — үлдэгдэл × сарын хүү
function pfLoanInt(L, d, skipTx) {
  var s = loanStat(L), left = s.left, last = L.date;
  if (skipTx) { left += skipTx.prin || 0; }
  pfLoanTx(L.id).forEach(function (t) { if (t !== skipTx && t.date <= d && t.date > last) last = t.date; });
  var je = Jc().filter(function (e) { return hasTag(e.desc, L.id) && e.date <= d; }).map(function (e) { return e.date; }).sort().pop();
  if (je && je > last) last = je;
  if (!L.rate) return { i: 0, days: 0, last: last };
  var days = Math.max(0, Math.round((new Date(d + 'T00:00:00') - new Date(last + 'T00:00:00')) / 864e5));
  var i = (L.intMode || 'day') === 'mon' ? left * L.rate / 100 : left * L.rate * 12 / 100 / 365 * days;
  return { i: Math.max(0, Math.round(i)), days: days, last: last, mon: L.intMode === 'mon' };
}
var lpp = null;   // { id, tx, intrMan, prinMan }
function pfLoanPay(id, mode, txId) {
  var L = loanById(id); if (!L) return;
  if (!pfL('acc').length) { toast('Эхлээд «Данс» хэсэгт данс нэмнэ үү'); state.sub.pf = 'acc'; render(); return; }
  var tx = txId ? (PF.tx || []).filter(function (t) { return t.id === txId; })[0] : null, s = loanStat(L), sc = loanSched(L), taken = L.kind === 'Авсан';
  lpp = { id: id, tx: tx, intrMan: !!tx, prinMan: false };
  var def = tx ? r0(tx.amount - (tx.fee || 0)) : L.monthly || (sc.next ? sc.next.amt : '');
  gOpen('<h2>' + (tx ? 'Төлөлт засах' : lnFx(L) ? 'Тогтмол зардал төлөх' : taken ? 'Зээлийн төлөлт' : 'Зээлийн төлбөр авсан') + '</h2><p class="muted">' + esc(L.partner) + ' · үлдэгдэл ' + mny(s.left) +
      (L.rate ? ' · сарын хүү ' + L.rate + '% (жилийн ' + r0(L.rate * 12) + '%)' : '') + (L.monthly ? ' · сарын төлөх ' + mny(L.monthly) : '') + '</p>' +
    '<div class="row2"><div><label for="lpDate">Огноо</label><input id="lpDate" type="date" value="' + (tx ? tx.date : todayStr()) + '" onchange="lppCalc()"></div>' +
    '<div><label for="lpTot">' + (taken ? 'Төлсөн нийт дүн (₮)' : 'Авсан нийт дүн (₮)') + '</label><input id="lpTot" type="number" min="0" inputmode="numeric" value="' + def + '" oninput="lppCalc()"></div></div>' +
    '<div class="row2"><div><label for="lpInt">Үүнээс хүү (₮)</label><input id="lpInt" type="number" min="0" inputmode="numeric" oninput="lpp.intrMan=true;lpp.prinMan=false;lppCalc()"></div>' +
    '<div><label for="lpPrin">Үүнээс үндсэн (₮)</label><input id="lpPrin" type="number" min="0" inputmode="numeric" oninput="lpp.prinMan=true;lpp.intrMan=false;lppCalc()"></div></div>' +
    '<p class="muted" id="lpInfo" style="font-size:12.5px;margin:4px 0"></p>' +
    '<div class="row2"><div><label for="lpFee">Торгууль/шимтгэл (₮)</label><input id="lpFee" type="number" min="0" inputmode="numeric" placeholder="заавал биш" value="' + (tx && tx.fee ? tx.fee : '') + '"></div>' +
    '<div><label for="lpAcc">' + (taken ? 'Төлсөн данс' : 'Орсон данс') + '</label><select id="lpAcc">' + pfAccOpts(tx ? tx.acc : L.payAcc && pfAcc(L.payAcc) ? L.payAcc : '') + '</select></div></div>' +
    '<label for="lpNote">Тэмдэглэл</label><input id="lpNote" value="' + esc(tx ? String(tx.desc || '').replace(/^(Зээлийн төлөлт|Зээлийн төлбөр авсан|Тогтмол зардал) · [^·]*(· )?/, '') : '') + '">' +
    '<button class="btn" onclick="pfLoanPaySave()">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  if (tx) { $('lpInt').value = tx.intr || 0; $('lpPrin').value = tx.prin || 0; }
  lppCalc();
}
function lppCalc() {
  var L = loanById(lpp.id), tot = Number($('lpTot').value) || 0, d = $('lpDate').value || todayStr(), ii = pfLoanInt(L, d, lpp.tx);
  if (!lpp.intrMan && !lpp.prinMan) {
    var i = ii.i;
    if (!L.rate && (L.schedule || []).length) i = loanSplit(L, tot).intr;   // хүүгүй боловч хуваарьтай — хуваариар
    i = Math.min(i, tot); $('lpInt').value = tot ? i : ''; $('lpPrin').value = tot ? r0(tot - i) : '';
  } else if (lpp.intrMan) $('lpPrin').value = tot ? r0(tot - (Number($('lpInt').value) || 0)) : '';
  else $('lpInt').value = tot ? r0(tot - (Number($('lpPrin').value) || 0)) : '';
  var p = Number($('lpPrin').value) || 0, it = Number($('lpInt').value) || 0, bad = Math.abs(p + it - tot) > 0.5 || p < 0 || it < 0;
  $('lpInfo').innerHTML = (!L.rate && !(L.total > L.amount) && !lnFx(L) ? 'Хүүгүй зээл — төлбөр бүхэлдээ үндсэнд · ' : '') + (L.rate ? (ii.mon ? 'Хүү сараар: үлдэгдэл × ' + L.rate + '%' : 'Хүү хоногоор: үлдэгдэл × ' + r0(L.rate * 12) + '% ÷ 365 × ' + ii.days + ' хоног (' + ii.last + '-аас хойш)') + ' · ' : '') +
    'Хүү ' + fmt(it) + ' + үндсэн ' + fmt(p) + ' = ' + fmt(p + it) + (bad ? ' <b style="color:var(--red)">≠ нийт ' + fmt(tot) + '</b>' : '');
}
function pfLoanPaySave() {
  var L = loanById(lpp.id); if (!L) return;
  var d = $('lpDate').value, tot = Number($('lpTot').value) || 0, it = Number($('lpInt').value) || 0, p = Number($('lpPrin').value) || 0, fee = Number($('lpFee').value) || 0, acc = $('lpAcc').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('Огноо оруулна уу'); return; }
  if (!(tot > 0)) { toast('Төлсөн дүнгээ оруулна уу'); return; }
  if (p < 0 || it < 0 || Math.abs(p + it - tot) > 0.5) { toast('Хүү + үндсэн = нийт дүн байх ёстой'); return; }
  if (!acc) { toast('Данс сонгоно уу'); return; }
  var taken = L.kind === 'Авсан', note = $('lpNote').value.trim(), s = loanStat(L), prev = lpp.tx, fx = lnFx(L);
  var t = { id: prev ? prev.id : pfId('PT'), date: d, type: taken ? 'Зарлага' : 'Орлого', acc: acc, toAcc: '', amount: r0(tot + fee), cat: fx ? fx.cat : taken ? 'Зээлийн төлөлт' : 'Зээлийн эргэн төлөлт',
            desc: (fx ? 'Тогтмол зардал · ' : taken ? 'Зээлийн төлөлт · ' : 'Зээлийн төлбөр авсан · ') + L.partner + (note ? ' · ' + note : ''), link: L.id, rec: prev ? prev.rec : '', prin: r0(p), intr: r0(it), fee: r0(fee),
            bankId: prev ? prev.bankId : '', co: '', jids: '' };
  var left = r0(s.left + (prev ? prev.prin || 0 : 0) - p);
  pfSave('tx', [t], [], function () {
    gClose();
    if (left <= 0.5 && L.status !== 'Хаагдсан') { loanClose(L.id, function () { toast('Бүртгэгдлээ — зээл бүрэн төлөгдөж хаагдлаа'); }); return; }
    if (left > 0.5 && L.status === 'Хаагдсан') pfLoanReopen(L);
    toast('Бүртгэгдлээ · үлдэгдэл ' + fmt(left));
  });
}
function pfLoanReopen(L) {
  if (!API_URL) { L.status = 'Идэвхтэй'; save('nb_demo_loans', window.loans); render(); return; }
  post({ type: 'admin_loan', openId: L.id }, function () { refresh(); });
}
// Зээл устгах: зээл «Устгасан», түүний төлөлтүүд «Цуцалсан» (Sheet-д түүх хадгалагдана); хуучин журналын бичилт хогийн саванд
function pfLoanDel(id) {
  var L = loanById(id); if (!L) return;
  var T = pfLoanTx(id), js = journal.filter(function (j) { return hasTag(j.desc, id); });
  if (!confirm('«' + L.partner + '» зээлийг устгах уу?' + (T.length ? '\n\n' + T.length + ' төлөлт (' + fmt(T.reduce(function (a, t) { return a + t.amount; }, 0)) + ') мөн цуцлагдаж, дансны үлдэгдэлд буцна.' : '') +
    (js.length ? '\nХуучин журналын ' + js.length + ' бичилт хогийн саванд орно (сэргээж болно).' : '') + '\n\nТүүх Sheet-д хадгалагдана.')) return;
  var fin = function () {
    if (!API_URL) { L.status = 'Устгасан'; save('nb_demo_loans', window.loans); render(); toast('Устгагдлаа'); return; }
    post({ type: 'admin_loan', cancelId: id }, function (err) { if (err) { toast('Алдаа: ' + err); return; } toast('Устгагдлаа'); refresh(); });
  };
  var next = function () { pfJCancel(js, fin); };
  if (T.length) pfSave('tx', [], T.map(function (t) { return t.id; }), next); else next();
}
function pfLoanHist(id) {
  var L = loanById(id); if (!L) return;
  var T = pfLoanTx(id, true).sort(function (a, b) { return a.date < b.date ? -1 : 1; }), tot = { a: 0, p: 0, i: 0, f: 0 };
  var J0 = journal.filter(function (j) { return hasTag(j.desc, id); });
  gOpen('<h2>Төлөлтийн түүх · ' + esc(L.partner) + '</h2>' +
    '<div class="scroll" style="max-height:60vh"><table class="rep-t"><tr><th>Огноо</th><th class="n">Нийт</th><th class="n">Хүү</th><th class="n">Үндсэн</th><th class="n">Торгууль</th><th>Данс</th><th>Тэмдэглэл</th><th></th></tr>' +
    (T.length ? T.map(function (t) {
      var off = t.status === 'Цуцалсан';
      if (!off) { tot.a += t.amount; tot.p += t.prin || 0; tot.i += t.intr || 0; tot.f += t.fee || 0; }
      return '<tr' + (off ? ' style="opacity:.5;text-decoration:line-through"' : '') + '><td class="nw">' + esc(t.date) + '</td><td class="n">' + mny(t.amount) + '</td><td class="n">' + mny(t.intr) + '</td><td class="n">' + mny(t.prin) + '</td>' +
        '<td class="n">' + (t.fee ? mny(t.fee) : '') + '</td><td>' + esc(pfAccName(t.acc)) + '</td><td>' + esc(t.desc) + '</td><td class="nw">' +
        (off ? '<small>цуцалсан</small>' : '<button class="mini" onclick="pfLoanPay(\'' + id + '\',\'pay\',\'' + t.id + '\')">Засах</button><button class="mini" onclick="pfTxCancel(\'' + t.id + '\')">Цуцлах</button>') + '</td></tr>';
    }).join('') + '<tr class="tot"><td>Нийт</td><td class="n">' + mny(tot.a) + '</td><td class="n">' + mny(tot.i) + '</td><td class="n">' + mny(tot.p) + '</td><td class="n">' + mny(tot.f) + '</td><td></td><td></td><td></td></tr>'
      : '<tr><td colspan="8" class="muted">Төлөлт бүртгэгдээгүй</td></tr>') + '</table></div>' +
    (J0.length ? '<p class="muted" style="font-size:12.5px">Өмнөх (журналын) бичилт: ' + J0.length + ' — «Тохиргоо → Хуучин бүртгэл»-д.</p>' : '') +
    '<button class="btn" onclick="pfLoanPay(\'' + id + '\',\'pay\')">+ Төлөлт</button><button class="btn ghost" onclick="gClose()">Хаах</button>');
}
// Ойрын N хоногийн төлөлт (хоцорсныг оруулна)
function pfUpcoming(days) {
  var td = todayStr(), lim = todayStr(new Date(Date.now() + days * 864e5)), out = [];
  pfLoans('Авсан', 1).filter(pfLoanOpen).forEach(function (L) {
    var s = loanStat(L), sc = loanSched(L);
    if (sc.rows.length) sc.rows.forEach(function (r) { if (r.st !== 'paid' && r.d <= lim) out.push({ d: r.d, L: L, amt: r.left, late: r.d < td }); });
    else { var nl = loanNextLate(L, sc, s); if (nl.next && nl.next <= lim) out.push({ d: nl.next, L: L, amt: L.monthly || 0, late: nl.next < td }); }
  });
  return out.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
}

// ═══════════ НҮҮР ═══════════
function pfHomeView() {
  var td = todayStr(), m = td.slice(0, 7), inc = pfMonthSum(m, 'Орлого'), exp = pfMonthSum(m, 'Зарлага'), I = pfTot(inc), X = pfTot(exp);
  var cash = pfCash(), debt = pfDebt(), as = pfAssetSum(), rc = pfRecv(), net = cash + as + rc - debt;
  var k = [['Нийт мөнгө', cash, ''], ['Энэ сарын орлого', I, 'pos'], ['Энэ сарын зарлага', X, 'neg'], ['Хэмнэлт', I - X, I - X < 0 ? 'neg' : 'pos'], ['Нийт өр', debt, debt ? 'neg' : ''],
           ['Цэвэр хөрөнгө', net, net < 0 ? 'neg' : '']];
  var kpis = '<div class="fn-kpis pf-k6">' + k.map(function (x) { return '<div class="fn-kpi"><small>' + x[0] + '</small><b class="' + x[2] + '">' + mny(x[1]) + '</b></div>'; }).join('') + '</div>' +
    '<p class="muted" style="font-size:12px;margin:-4px 0 12px">Цэвэр хөрөнгө = мөнгө ' + fmt(cash) + ' + хөрөнгө ' + fmt(as) + (rc ? ' + өгсөн зээл ' + fmt(rc) : '') + ' − өр ' + fmt(debt) + '</p>';
  var up = pfUpcoming(30);
  var upc = '<div class="card rep"><div class="rep-cap"><b>Ойрын 30 хоногийн зээлийн төлөлт</b></div>' + (up.length ? '<div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Зээл</th><th class="n">Дүн</th><th></th></tr>' +
    up.map(function (u) { return '<tr><td class="nw">' + u.d + (u.late ? ' <span class="tag r">хоцорсон</span>' : '') + '</td><td>' + esc(u.L.partner) + '</td><td class="n">' + mny(u.amt) + '</td>' +
      '<td class="n"><button class="mini" style="color:var(--accent)" onclick="pfLoanPay(\'' + u.L.id + '\',\'pay\')">Төлөх</button></td></tr>'; }).join('') + '</table></div>'
    : '<p class="muted" style="padding:0 14px 12px">Ойрын 30 хоногт төлөх зээл алга.</p>') + '</div>';
  // 12 сар
  var ms = []; for (var i = 11; i >= 0; i--) ms.push(pfMonAdd(m, -i));
  var data = ms.map(function (mm) { return { m: mm, i: pfTot(pfMonthSum(mm, 'Орлого')), x: pfTot(pfMonthSum(mm, 'Зарлага')) }; });
  var mx = Math.max.apply(null, data.map(function (d) { return Math.max(d.i, d.x); }).concat([1])), W = 640, H = 150, bw = W / 12;
  var svg = '<svg viewBox="0 0 ' + W + ' ' + (H + 18) + '" class="fn-chart" preserveAspectRatio="none">' + data.map(function (d, j) {
    var hi = d.i / mx * H, hx = d.x / mx * H, x = j * bw, w = bw / 2 - 4;
    return '<g><title>' + d.m + ' · орлого ' + fmt(d.i) + ' · зарлага ' + fmt(d.x) + '</title><rect x="' + (x + 4) + '" y="' + (H - hi) + '" width="' + w + '" height="' + hi + '" fill="var(--income)"/>' +
      '<rect x="' + (x + 4 + w) + '" y="' + (H - hx) + '" width="' + w + '" height="' + hx + '" fill="var(--expense)"/><text x="' + (x + bw / 2) + '" y="' + (H + 14) + '" text-anchor="middle">' + d.m.slice(5) + '</text></g>';
  }).join('') + '</svg>';
  var chart = '<div class="card"><h2>Сүүлийн 12 сарын орлого, зарлага</h2><div class="fn-leg"><span><i style="background:var(--income)"></i>Орлого</span><span><i style="background:var(--expense)"></i>Зарлага</span></div>' + svg + '</div>';
  var ek = Object.keys(exp).sort(function (a, b) { return exp[b] - exp[a]; }), em = ek.length ? exp[ek[0]] : 1;
  var cats = '<div class="card"><h2>Энэ сарын зарлага ангиллаар</h2>' + (ek.length ? ek.map(function (c) {
    return '<div class="pf-bar"><span>' + esc(c) + '</span><i><b style="width:' + Math.max(2, Math.round(exp[c] / em * 100)) + '%"></b></i><em>' + mny(exp[c]) + '</em></div>'; }).join('') : '<p class="muted">Энэ сард зарлага алга.</p>') + '</div>';
  var bud = pfBudRows(m).filter(function (r) { return r.b > 0 && r.s > r.b; });
  var over = '<div class="card"><h2>Төсөв хэтэрсэн ангилал</h2>' + (bud.length ? '<div class="scroll"><table class="rep-t"><tr><th>Ангилал</th><th class="n">Төсөв</th><th class="n">Зарцуулсан</th><th class="n">Хэтэрсэн</th></tr>' +
    bud.map(function (r) { return '<tr><td>' + esc(r.c) + '</td><td class="n">' + mny(r.b) + '</td><td class="n">' + mny(r.s) + '</td><td class="n" style="color:var(--red)">' + mny(r.s - r.b) + '</td></tr>'; }).join('') + '</table></div>'
    : '<p class="muted">' + (pfL('bud').some(function (b) { return b.month === m; }) ? 'Хэтэрсэн ангилал алга.' : 'Энэ сарын төсөв оруулаагүй.') + '</p>') + '</div>';
  return pfHead('Нүүр', td + ' — мөнгө, энэ сарын орлого зарлага, ойрын төлөлт.', '<button class="b-btn" onclick="pfQuick()">+ Хурдан нэмэх</button>') + kpis + upc + chart +
    '<div class="pf-2">' + cats + over + '</div>';
}

// ═══════════ ДАНС ═══════════
function pfAccView() {
  var A = PF.acc || [], show = state.pfAccAll ? A : A.filter(function (a) { return a.status !== 'Цуцалсан'; });
  var rows = show.map(function (a) {
    var off = a.status === 'Цуцалсан', b = pfBal(a.id), pend = a.bank4 ? pfBankLines(a).length : 0;
    return '<tr' + (off ? ' style="opacity:.5"' : '') + '><td><b>' + esc(a.name) + '</b>' + (a.active === 'Үгүй' ? ' <small class="muted">(идэвхгүй)</small>' : '') + '</td><td>' + esc(a.type) + '</td><td>' + esc(a.bank || '') + (a.bank4 ? ' <small class="muted">****' + esc(a.bank4) + '</small>' : '') + '</td>' +
      '<td class="n">' + mny(a.open) + '<br><small class="muted">' + esc(a.openDate || '') + '</small></td><td class="n"><b>' + mny(b) + '</b></td>' +
      '<td class="n">' + (pend ? '<button class="link" onclick="state.pfRec=\'' + a.id + '\';render()">' + pend + ' тулгаагүй</button>' : a.bank4 ? '<small class="muted">тулгасан</small>' : '') + '</td>' +
      '<td class="n nw">' + (off ? '<small>цуцалсан</small>' : '<button class="mini" onclick="state.pfF={acc:\'' + a.id + '\'};state.sub.pf=\'tx\';render()">Хуулга</button><button class="mini" onclick="pfAccOpen(\'' + a.id + '\')">Засах</button>') + '</td></tr>';
  }).join('');
  var tot = pfCash();
  var tbl = '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Нэр</th><th>Төрөл</th><th>Банк</th><th class="n">Эхний үлдэгдэл</th><th class="n">Одоогийн үлдэгдэл</th><th class="n">Банкны хуулга</th><th></th></tr>' +
    (rows || '<tr><td colspan="7" class="muted">Данс алга — «+ Данс» дарж бэлэн мөнгө, банкны данс, картаа нэмнэ үү.</td></tr>') +
    (show.length ? '<tr class="tot"><td>Нийт</td><td></td><td></td><td></td><td class="n">' + mny(tot) + '</td><td></td><td></td></tr>' : '') + '</table></div></div>' +
    '<label class="muted" style="font-size:12.5px;display:flex;gap:6px;align-items:center"><input type="checkbox" style="width:auto"' + (state.pfAccAll ? ' checked' : '') + ' onchange="state.pfAccAll=this.checked;render()"> Цуцалсан дансыг харуулах</label>';
  return pfHead('Данс', 'Одоогийн үлдэгдэл = эхний үлдэгдэл + орлого − зарлага ± шилжүүлэг. Банкны данс бол хуулгаа (Excel) оруулж гүйлгээтэй тулгана.',
    '<button class="b-btn" onclick="pfAccOpen()">+ Данс</button><button class="b-btn" onclick="ensureXlsx(function(){$(\'pfBankFile\').click()})">Хуулга оруулах</button>' +
    '<input type="file" id="pfBankFile" accept=".xlsx,.xls,.csv" style="display:none" onchange="importBank(this)">') + tbl + pfRecView();
}
function pfAccOpen(id) {
  var a = id ? pfAcc(id) : null;
  gOpen('<h2>' + (a ? 'Данс засах' : 'Данс нэмэх') + '</h2>' +
    '<label for="paName">Нэр</label><input id="paName" placeholder="Жишээ: Хаан банк — цалингийн" value="' + esc(a ? a.name : '') + '">' +
    '<div class="row2"><div><label for="paType">Төрөл</label><select id="paType">' + PF_ACC_T.map(function (t) { return '<option' + (a && a.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
    '<div><label for="paBank">Банк</label><input id="paBank" placeholder="Хаан, Голомт…" value="' + esc(a ? a.bank : '') + '"></div></div>' +
    '<label for="paNo">Дансны дугаар (хуулга тулгахад — сүүлийн 4 орон хангалттай)</label><input id="paNo" inputmode="numeric" placeholder="заавал биш" value="' + esc(a && a.bank4 ? a.bank4 : '') + '">' +
    '<div class="row2"><div><label for="paOpen">Эхний үлдэгдэл (₮)</label><input id="paOpen" type="number" inputmode="numeric" value="' + (a ? a.open : '') + '"></div>' +
    '<div><label for="paDate">Эхний огноо</label><input id="paDate" type="date" value="' + (a && a.openDate ? a.openDate : todayStr()) + '"></div></div>' +
    '<p class="muted" style="font-size:12.5px">Эхний огнооноос өмнөх гүйлгээ үлдэгдэлд тооцогдохгүй (эхний үлдэгдэлд багтсан гэж үзнэ).</p>' +
    '<label style="display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" id="paActive" style="width:auto"' + (!a || a.active !== 'Үгүй' ? ' checked' : '') + '> Идэвхтэй (гүйлгээний сонголтод харагдана)</label>' +
    '<button class="btn" onclick="pfAccSave(' + (a ? '\'' + a.id + '\'' : '') + ')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>' +
    (a ? '<p style="margin-top:8px"><button class="b-btn" onclick="pfAccCancel(\'' + a.id + '\')">Цуцлах</button></p>' : ''));
}
function pfAccSave(id) {
  var a = id ? Object.assign({}, pfAcc(id)) : {}, no = $('paNo').value.replace(/\D/g, '');
  a.name = $('paName').value.trim(); a.type = $('paType').value; a.bank = $('paBank').value.trim(); a.bank4 = no.slice(-4);
  a.open = Number($('paOpen').value) || 0; a.openDate = $('paDate').value; a.active = $('paActive').checked ? 'Тийм' : 'Үгүй';
  if (a.name.length < 2) { toast('Дансны нэрийг бичнэ үү'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.openDate)) { toast('Эхний огноо оруулна уу'); return; }
  if (no && no.length < 4) { toast('Дансны дугаарын сүүлийн 4 оронг бичнэ үү'); return; }
  pfSave('acc', [a], [], function () { gClose(); toast('Хадгалагдлаа'); if (no) pfLinkBank(no, a.name); });
}
// Хуулга оруулахад данс «Хувийн санхүү»-д холбогдсон байх ёстой (bankLinks) — байхгүй бол автоматаар холбоно
function pfLinkBank(no, name) {
  var links = window.bankLinks || [];
  if (links.some(function (l) { return String(l.no).slice(-4) === no.slice(-4); })) return;
  var used = links.filter(function (l) { return l.biz === 'mgmt'; }).map(function (l) { return l.acc; }), acc = '1101';
  for (var i = 1; i <= 9; i++) { if (used.indexOf('110' + i) < 0 && (i === 1 || ACC['110' + i])) { acc = '110' + i; break; } }
  var nl = links.concat([{ no: no, biz: 'mgmt', acc: acc, name: name }]); window.bankLinks = nl;
  if (!API_URL) { save('nb_demo_banklinks', nl); return; }
  post({ type: 'admin_setting', key: 'banklinks', value: nl }, function () {});
}
function pfAccCancel(id) {
  var n = pfL('tx').filter(function (t) { return t.acc === id || t.toAcc === id; }).length;
  if (!confirm('Энэ дансыг цуцлах уу?' + (n ? '\n\n' + n + ' гүйлгээ хэвээр үлдэнэ (түүх хадгалагдана).' : ''))) return;
  pfSave('acc', [], [id], function () { gClose(); toast('Цуцлагдлаа'); });
}
// ── Банкны хуулга тулгах (одоо байгаа «Банкны хуулга» импорт — bankLines, biz='mgmt') ──
function pfBankLines(a) { return (typeof bankLines !== 'undefined' ? bankLines : []).filter(function (l) { return l.biz === 'mgmt' && l.status === 'Шинэ' && a.bank4 && String(l.acct).slice(-4) === a.bank4; }); }
function pfBankMatch(a, l) {
  var amt = l.credit || l.debit, d = String(l.date).slice(0, 10), out = !l.credit, used = {};
  (PF.tx || []).forEach(function (t) { if (t.bankId) used[t.bankId] = 1; });
  return pfL('tx').filter(function (t) {
    if (t.rec === '1' || t.bankId) return false;
    var dir = t.acc === a.id ? (t.type === 'Орлого' ? 'in' : 'out') : t.toAcc === a.id ? 'in' : '';
    return dir && (dir === 'out') === out && Math.abs(t.amount - amt) < 0.5 && Math.abs(new Date(t.date) - new Date(d)) <= 3 * 864e5;
  })[0];
}
function pfRecView() {
  var A = pfL('acc').filter(function (a) { return a.bank4 && pfBankLines(a).length; });
  if (!A.length) return '';
  var a = pfAcc(state.pfRec) && A.some(function (x) { return x.id === state.pfRec; }) ? pfAcc(state.pfRec) : A[0], L = pfBankLines(a).sort(function (x, y) { return x.date < y.date ? -1 : 1; });
  return '<div class="card rep"><div class="rep-cap"><b>Банкны хуулга тулгах</b><span>' + A.map(function (x) {
      return '<button class="mini' + (x.id === a.id ? ' on' : '') + '" onclick="state.pfRec=\'' + x.id + '\';render()">' + esc(x.name) + ' (' + pfBankLines(x).length + ')</button>'; }).join('') + '</span></div>' +
    '<div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Гүйлгээний утга</th><th class="n">Орлого</th><th class="n">Зарлага</th><th>Тохирох гүйлгээ</th><th></th></tr>' +
    L.map(function (l) {
      var m = pfBankMatch(a, l);
      return '<tr><td class="nw">' + esc(String(l.date).slice(0, 10)) + '</td><td class="fn-ell" title="' + esc(l.desc) + '">' + esc(l.desc) + '</td><td class="n">' + (l.credit ? mny(l.credit) : '') + '</td><td class="n">' + (l.debit ? mny(l.debit) : '') + '</td>' +
        '<td>' + (m ? esc(m.date + ' · ' + (m.cat || m.type) + ' · ' + (m.desc || '')) : '<small class="muted">олдсонгүй</small>') + '</td>' +
        '<td class="n nw">' + (m ? '<button class="mini" style="color:var(--accent)" onclick="pfRecMatch(\'' + jsq(l.id) + '\',\'' + m.id + '\')">Тулгах</button>' : '') +
        '<button class="mini" onclick="pfRecNew(\'' + jsq(l.id) + '\',\'' + a.id + '\')">Гүйлгээ болгох</button><button class="mini" onclick="pfRecSkip(\'' + jsq(l.id) + '\')">Алгасах</button></td></tr>';
    }).join('') + '</table></div></div>';
}
function pfBankUpd(lineId, status, link) {
  var upd = [{ id: lineId, status: status, link: link }];
  bankLines.forEach(function (x) { if (x.id === lineId) { x.status = status; x.link = link; } });
  if (!API_URL) { save('nb_demo_bank', bankLines); render(); return; }
  post({ type: 'admin_bank', by: ownerName, updates: upd }, function (err) { if (err) toast('Алдаа: ' + err); render(); });
}
function pfRecMatch(lineId, txId) {
  var t = (PF.tx || []).filter(function (x) { return x.id === txId; })[0]; if (!t) return;
  var u = Object.assign({}, t, { rec: '1', bankId: lineId });
  pfSave('tx', [u], [], function () { pfBankUpd(lineId, 'Тулгасан', 'Хувийн санхүү #' + txId); toast('Тулгагдлаа'); });
}
function pfRecSkip(lineId) { pfBankUpd(lineId, 'Алгассан', 'Хувийн санхүү'); }
function pfRecNew(lineId, accId) {
  var l = bankLines.filter(function (x) { return x.id === lineId; })[0]; if (!l) return;
  pfTxOpen(null, { date: String(l.date).slice(0, 10), type: l.credit ? 'Орлого' : 'Зарлага', acc: accId, amount: l.credit || l.debit, desc: String(l.desc || '').slice(0, 120), bankId: lineId, rec: '1' });
}

// ═══════════ ГҮЙЛГЭЭ ═══════════
function pfCatOpts(type, sel) {
  var o = function (c) { return '<option' + (c === sel ? ' selected' : '') + '>' + esc(c) + '</option>'; };
  if (type === 'Орлого') return pfCats('inc').map(o).join('');
  if (type === 'Зарлага') return pfCats('exp').map(o).join('');
  return '<optgroup label="Зарлага">' + pfCats('exp').map(o).join('') + '</optgroup><optgroup label="Орлого">' + pfCats('inc').map(o).join('') + '</optgroup>';
}
function pfTxView() {
  var f = state.pfF = state.pfF || {}, q = nz(f.q || '');
  if (f.m == null) f.m = todayStr().slice(0, 7);
  var L = (PF.tx || []).concat(pfVirt()).filter(function (t) {
    if (!f.off && t.status === 'Цуцалсан') return false;
    if (f.m && t.date.slice(0, 7) !== f.m) return false;
    if (f.acc && t.acc !== f.acc && t.toAcc !== f.acc) return false;
    if (f.cat && t.cat !== f.cat) return false;
    if (q && nz([t.desc, t.cat, t.type, pfAccName(t.acc), t.amount].join(' ')).indexOf(q) < 0) return false;
    return true;
  }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1; });
  var inc = 0, exp = 0;
  var rows = L.map(function (t) {
    var off = t.status === 'Цуцалсан', sg = t.type === 'Орлого' || (t.type === 'Шилжүүлэг' && f.acc && t.toAcc === f.acc) ? 1 : t.type === 'Шилжүүлэг' && !f.acc ? 0 : -1;
    if (!off && t.type === 'Орлого') inc += t.amount; if (!off && t.type === 'Зарлага') exp += t.amount;
    return '<tr' + (off ? ' style="opacity:.5;text-decoration:line-through"' : '') + '><td class="nw">' + esc(t.date) + '</td><td>' + esc(t.type) + '</td>' +
      '<td>' + esc(pfTxAccName(t)) + (t.type === 'Шилжүүлэг' ? ' → ' + esc(pfAccName(t.toAcc)) : '') + '</td><td>' + esc(t.cat || '') + (t.co && BUSINESSES[t.co] ? '<br><small class="muted">' + esc(BUSINESSES[t.co].name) + '</small>' : '') + '</td>' +
      '<td class="fn-ell" title="' + esc(t.desc) + '">' + esc(t.desc || '') + '</td>' +
      '<td class="n" style="color:' + (sg > 0 ? 'var(--income)' : sg < 0 ? 'var(--expense)' : 'inherit') + '">' + (sg > 0 ? '+' : sg < 0 ? '−' : '') + fmt(t.amount) + '</td>' +
      '<td class="n">' + (t.rec === '1' || t.bankId ? '✓' : '') + '</td>' +
      '<td class="n nw">' + (t.virt ? '<small class="muted" title="Тухайн компанийн журналаас засна">компанийн журнал</small>' : off ? '<small>цуцалсан</small>' : '<button class="mini" onclick="pfTxOpen(\'' + t.id + '\')">Засах</button><button class="mini" onclick="pfTxCancel(\'' + t.id + '\')">Цуцлах</button>') + '</td></tr>';
  }).join('');
  var cats = pfCats('exp').concat([PF_COEXP], pfCats('inc').filter(function (c) { return pfCats('exp').indexOf(c) < 0; }));
  var flt = '<div class="pf-flt"><input type="month" value="' + esc(f.m) + '" onchange="state.pfF.m=this.value;render()" title="Сар (хоосон — бүгд)">' +
    '<select onchange="state.pfF.acc=this.value;render()"><option value="">Бүх данс</option>' + pfAccOpts(f.acc, true) + '</select>' +
    '<select onchange="state.pfF.cat=this.value;render()"><option value="">Бүх ангилал</option>' + cats.map(function (c) { return '<option' + (c === f.cat ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
    '<input type="search" placeholder="Хайх…" value="' + esc(f.q || '') + '" onchange="state.pfF.q=this.value;render()">' +
    '<label class="muted"><input type="checkbox" style="width:auto"' + (f.off ? ' checked' : '') + ' onchange="state.pfF.off=this.checked;render()"> цуцалсан</label>' +
    (f.m || f.acc || f.cat || f.q ? '<button class="link" onclick="state.pfF={m:\'\'};render()">Шүүлтүүр арилгах</button>' : '') + '</div>';
  return pfHead('Гүйлгээ', 'Орлого, зарлага, данс хоорондын шилжүүлэг. Буруу бичсэнийг «Цуцлах» — түүх нь хадгалагдана.',
      '<button class="b-btn" onclick="pfQuick()">+ Хурдан нэмэх</button><button class="b-btn" onclick="pfTxOpen()">+ Гүйлгээ</button>') + flt +
    '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Төрөл</th><th>Данс</th><th>Ангилал</th><th>Тайлбар</th><th class="n">Дүн</th><th class="n">Тулгасан</th><th></th></tr>' +
    (rows || '<tr><td colspan="8" class="muted">Гүйлгээ алга</td></tr>') +
    (L.length ? '<tr class="tot"><td colspan="5">Нийт: орлого ' + fmt(inc) + ' · зарлага ' + fmt(exp) + '</td><td class="n">' + mny(inc - exp) + '</td><td></td><td></td></tr>' : '') + '</table></div></div>';
}
// Хурдан нэмэх: огноо, дүн, ангилал, данс (ангиллаас орлого/зарлага тодорно)
function pfQuick() {
  if (!pfL('acc').length) { toast('Эхлээд «Данс» хэсэгт данс нэмнэ үү'); state.sub.pf = 'acc'; render(); return; }
  gOpen('<h2>Хурдан нэмэх</h2>' +
    '<div class="row2"><div><label for="qkDate">Огноо</label><input id="qkDate" type="date" value="' + todayStr() + '"></div>' +
    '<div><label for="qkAmt">Дүн (₮)</label><input id="qkAmt" type="number" min="0" inputmode="numeric" autofocus></div></div>' +
    '<label for="qkCat">Ангилал</label><select id="qkCat">' + pfCatOpts('', 'Хоол хүнс') + '</select>' +
    '<label for="qkAcc">Данс</label><select id="qkAcc">' + pfAccOpts(state.pfLastAcc || '') + '</select>' +
    '<button class="btn" onclick="pfQuickSave()">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  setTimeout(function () { var e = $('qkAmt'); if (e) e.focus(); }, 50);
}
function pfQuickSave() {
  var c = $('qkCat'), cat = c.value, inc = c.options[c.selectedIndex].parentNode.label === 'Орлого', amt = Number($('qkAmt').value) || 0, d = $('qkDate').value;
  if (!(amt > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast('Огноо оруулна уу'); return; }
  if (PF_CO.test(cat) || cat === 'Зээлийн төлөлт' || cat === 'Зээлийн эргэн төлөлт') { var acc0 = $('qkAcc').value; gClose(); pfTxOpen(null, { date: d, amount: amt, cat: cat, acc: acc0, type: inc ? 'Орлого' : 'Зарлага' }); return; }
  state.pfLastAcc = $('qkAcc').value;
  pfSave('tx', [{ date: d, type: inc ? 'Орлого' : 'Зарлага', acc: $('qkAcc').value, toAcc: '', amount: amt, cat: cat, desc: '', link: '', rec: '' }], [], function () { gClose(); toast('Нэмэгдлээ'); });
}
function pfTxOpen(id, pre) {
  var t = id ? (PF.tx || []).filter(function (x) { return x.id === id; })[0] : null;
  if (t && t.link && loanById(t.link)) { pfLoanPay(t.link, 'pay', t.id); return; }
  if (!pfL('acc').length) { toast('Эхлээд «Данс» хэсэгт данс нэмнэ үү'); state.sub.pf = 'acc'; render(); return; }
  var v = t || pre || {}, type = v.type || 'Зарлага';
  window.pfTxPre = pre || null;
  gOpen('<h2>' + (t ? 'Гүйлгээ засах' : 'Гүйлгээ нэмэх') + '</h2>' +
    (pre && pre.bankId ? '<p class="rep-note ok">Банкны гүйлгээ: ' + esc(pre.date) + ' · ' + fmt(pre.amount) + ' · «' + esc(pre.desc) + '» — хадгалахад тулгагдана.</p>' : '') +
    '<label for="ptType">Төрөл</label><select id="ptType" onchange="pfTxType()">' + ['Зарлага', 'Орлого', 'Шилжүүлэг'].map(function (x) { return '<option' + (x === type ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
    '<div class="row2"><div><label for="ptDate">Огноо</label><input id="ptDate" type="date" value="' + esc(v.date || todayStr()) + '"></div>' +
    '<div><label for="ptAmt">Дүн (₮)</label><input id="ptAmt" type="number" min="0" inputmode="numeric" value="' + (v.amount || '') + '"></div></div>' +
    '<div class="row2"><div><label for="ptAcc" id="ptAccL">Данс</label><select id="ptAcc">' + pfAccOpts(v.acc || state.pfLastAcc || '') + '</select></div>' +
    '<div id="ptToW"><label for="ptTo">Хүлээн авах данс</label><select id="ptTo">' + pfAccOpts(v.toAcc || '') + '</select></div>' +
    '<div id="ptCatW"><label for="ptCat">Ангилал</label><select id="ptCat" onchange="pfTxType()"></select></div></div>' +
    '<div id="ptCoW" style="display:none"><div class="row2"><div><label for="ptCo">Компани</label><select id="ptCo">' + KEYS.filter(function (k) { return BUSINESSES[k]; }).map(function (k) {
      return '<option value="' + k + '"' + (k === v.co ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="ptCoAcc">Компанийн данс</label><select id="ptCoAcc">' + cashAccOpts('1101') + '</select></div></div>' +
      '<p class="muted" style="font-size:12.5px;margin:4px 0" id="ptCoHint"></p></div>' +
    '<label for="ptDesc">Тайлбар</label><input id="ptDesc" value="' + esc(v.desc || '') + '">' +
    '<button class="btn" onclick="pfTxSave(' + (t ? '\'' + t.id + '\'' : '') + ')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>' +
    (t ? '<p style="margin-top:8px"><button class="b-btn" onclick="pfTxCancel(\'' + t.id + '\')">Цуцлах</button></p>' : ''));
  pfTxType(v.cat || '');
  if (t && t.co) { $('ptCo').disabled = true; $('ptCoAcc').disabled = true; }
}
function pfTxType(cat) {
  var type = $('ptType').value, c = $('ptCat'), cur = typeof cat === 'string' ? cat : c.value;
  if (typeof cat === 'string' || c.dataset.t !== type) { c.innerHTML = pfCatOpts(type, cur); c.dataset.t = type; }
  var tr = type === 'Шилжүүлэг';
  $('ptToW').style.display = tr ? '' : 'none'; $('ptCatW').style.display = tr ? 'none' : '';
  $('ptAccL').textContent = tr ? 'Илгээх данс' : type === 'Орлого' ? 'Орсон данс' : 'Гарсан данс';
  var co = !tr && PF_CO.test(c.value);
  $('ptCoW').style.display = co ? '' : 'none';
  if (co) $('ptCoHint').textContent = c.value === 'Компанид өгсөн' ? 'Компанийн журналд: Дт мөнгө / Кт 1208 «Захирлын зарлага» (захирал мөнгө оруулсан) автоматаар бичигдэнэ.' :
    'Компанийн журналд: Дт 1208 «Захирлын зарлага» / Кт мөнгө (компаниас захиралд өгсөн) автоматаар бичигдэнэ.';
}
function pfTxSave(id) {
  var old = id ? (PF.tx || []).filter(function (x) { return x.id === id; })[0] : null, pre = window.pfTxPre || {};
  var t = Object.assign({}, old || { link: '', rec: pre.rec || '', bankId: pre.bankId || '', prin: 0, intr: 0, fee: 0, co: '', jids: '' });
  t.type = $('ptType').value; t.date = $('ptDate').value; t.amount = Number($('ptAmt').value) || 0; t.acc = $('ptAcc').value;
  t.toAcc = t.type === 'Шилжүүлэг' ? $('ptTo').value : ''; t.cat = t.type === 'Шилжүүлэг' ? '' : $('ptCat').value; t.desc = $('ptDesc').value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) { toast('Огноо оруулна уу'); return; }
  if (!(t.amount > 0)) { toast('Дүнгээ оруулна уу'); return; }
  if (!t.acc) { toast('Данс сонгоно уу'); return; }
  if (t.type === 'Шилжүүлэг' && (!t.toAcc || t.toAcc === t.acc)) { toast('Хүлээн авах өөр данс сонгоно уу'); return; }
  if (t.cat === 'Зээлийн төлөлт' && !old) {
    var Ls = pfLoans('Авсан').filter(pfLoanOpen);
    if (Ls.length && confirm('Зээлийн төлөлтийг «Зээл» хэсгийн «Төлөлт»-өөр бүртгэвэл үлдэгдэл, хүү автоматаар шинэчлэгдэнэ.\n\n«' + Ls[0].partner + '» зээлийн төлөлт болгох уу?')) { gClose(); pfLoanPay(Ls[0].id, 'pay'); return; }
  }
  state.pfLastAcc = t.acc;
  var co = !old && PF_CO.test(t.cat) && t.type !== 'Шилжүүлэг' ? $('ptCo').value : '', coAcc = co ? $('ptCoAcc').value : '';
  if (!t.id) t.id = pfId('PT');
  if (co) t.co = co;
  // Огноо/дүн өөрчлөгдвөл компанийн эсрэг бичилтийг шинэчилнэ (хуучныг цуцалж шинээр)
  var coRe = old && old.co && (old.date !== t.date || old.amount !== t.amount || old.cat !== t.cat), coOld = coRe ? journal.filter(function (j) { return hasTag(j.desc, t.id); }) : [];
  if (coRe && !PF_CO.test(t.cat)) t.co = '';
  pfSave('tx', [t], [], function () {
    gClose(); toast(id ? 'Хадгалагдлаа' : 'Нэмэгдлээ');
    if (pre.bankId && !id) pfBankUpd(pre.bankId, 'Тулгасан', 'Хувийн санхүү #' + t.id);
    window.pfTxPre = null;
    if (co) pfCoPost(t, co, coAcc);
    if (coRe) {
      var acc0 = coOld.map(function (j) { return j.dr === '1208' ? j.cr : j.dr; })[0] || '1101';
      pfJCancel(coOld, function () { if (t.co) pfCoPost(t, t.co, acc0); });
    }
  });
}
function pfCoPost(t, co, coAcc) {
  var give = t.cat === 'Компанид өгсөн';
  postEntries([{ biz: co, date: t.date, dr: give ? coAcc : '1208', cr: give ? '1208' : coAcc, amount: t.amount, partner: typeof DIRECTOR !== 'undefined' ? DIRECTOR : 'Захирал',
    desc: ((give ? 'Захирал мөнгө оруулсан' : 'Захиралд өгсөн') + (t.desc ? ' · ' + t.desc : '')).slice(0, 150) + ' #' + t.id }], function () { toast(BUSINESSES[co].name + '-д эсрэг бичилт хийгдлээ'); });
}
function pfJCancel(list, cb) {
  if (!list.length) { if (cb) cb(); return; }
  if (!API_URL) { var ids = {}; list.forEach(function (j) { ids[j.id] = 1; }); journal = journal.filter(function (j) { return !ids[j.id]; }); save('nb_demo_journal', journal); if (cb) cb(); return; }
  var n = list.length; list.forEach(function (j) { post({ type: 'admin_journal', cancelId: j.id }, function () { if (--n === 0 && cb) cb(); }); });
}
function pfTxCancel(id) {
  var t = (PF.tx || []).filter(function (x) { return x.id === id; })[0]; if (!t) return;
  var js = journal.filter(function (j) { return hasTag(j.desc, id); }), L = t.link ? loanById(t.link) : null;
  if (!confirm('Энэ гүйлгээг цуцлах уу? (' + t.date + ' · ' + fmt(t.amount) + ')' + (js.length ? '\n\n' + (BUSINESSES[t.co] || {}).name + '-ийн эсрэг бичилт мөн цуцлагдана.' : '') +
    (t.bankId ? '\nБанкны гүйлгээ дахин «тулгаагүй» болно.' : '') + (L ? '\nЗээлийн үлдэгдэл ' + fmt(t.prin || 0) + '-өөр нэмэгдэнэ.' : ''))) return;
  pfSave('tx', [], [id], function () {
    gClose(); toast('Цуцлагдлаа');
    pfJCancel(js);
    if (t.bankId) pfBankUpd(t.bankId, 'Шинэ', '');
    if (L && L.status === 'Хаагдсан') pfLoanReopen(L);
  });
}

// ═══════════ ТӨСӨВ ═══════════
function pfBudRows(m) {
  var spent = pfMonthSum(m, 'Зарлага'), B = {};
  pfL('bud').forEach(function (b) { if (b.month === m) B[b.cat] = b; });
  var cats = pfCats('exp'); Object.keys(spent).concat(Object.keys(B)).forEach(function (c) { if (cats.indexOf(c) < 0) cats.push(c); });
  return cats.map(function (c) { return { c: c, b: B[c] ? B[c].amount : 0, id: B[c] ? B[c].id : '', s: r0(spent[c] || 0) }; });
}
function pfBudView() {
  var m = state.pfBm = state.pfBm || todayStr().slice(0, 7), R = pfBudRows(m), tb = 0, ts = 0;
  var rows = R.map(function (r, i) {
    tb += r.b; ts += r.s;
    var p = r.b > 0 ? Math.round(r.s / r.b * 100) : r.s > 0 ? null : 0, col = p === null || p >= 100 ? 'var(--red)' : p >= 80 ? 'var(--warning,#B7791F)' : 'inherit';
    return '<tr><td>' + esc(r.c) + '</td><td class="n"><input class="pf-bin" type="number" min="0" inputmode="numeric" data-c="' + esc(r.c) + '" data-id="' + esc(r.id) + '" value="' + (r.b || '') + '"></td>' +
      '<td class="n">' + mny(r.s) + '</td><td class="n"' + (r.b - r.s < 0 ? ' style="color:var(--red)"' : '') + '>' + (r.b ? mny(r.b - r.s) : '') + '</td>' +
      '<td class="n"><b style="color:' + col + '">' + (p === null ? 'төсөвгүй' : r.b ? p + '%' : '') + '</b>' +
      (r.b ? '<div class="pf-meter"><i style="width:' + Math.min(100, p) + '%;background:' + (p >= 100 ? 'var(--red)' : p >= 80 ? 'var(--warning,#B7791F)' : 'var(--income)') + '"></i></div>' : '') + '</td></tr>';
  }).join('');
  return pfHead('Төсөв', 'Сар бүр ангилал тус бүрт төсөв. 80%-иас дээш — шар, 100%-иас дээш — улаан.',
      '<input type="month" value="' + m + '" onchange="state.pfBm=this.value||state.pfBm;render()">' +
      '<button class="b-btn" onclick="pfBudCopy()">Өмнөх сарын төсвийг хуулах</button><button class="b-btn" style="color:var(--accent)" onclick="pfBudSave()">Хадгалах</button>') +
    '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Ангилал</th><th class="n">Төсөв</th><th class="n">Зарцуулсан</th><th class="n">Үлдсэн</th><th class="n">%</th></tr>' + rows +
    '<tr class="tot"><td>Нийт</td><td class="n">' + mny(tb) + '</td><td class="n">' + mny(ts) + '</td><td class="n">' + mny(tb - ts) + '</td><td class="n">' + (tb ? Math.round(ts / tb * 100) + '%' : '') + '</td></tr></table></div></div>';
}
function pfBudCopy() {
  var m = state.pfBm, pm = pfMonAdd(m, -1), P = {};
  pfL('bud').forEach(function (b) { if (b.month === pm) P[b.cat] = b.amount; });
  if (!Object.keys(P).length) { toast(pm + '-ийн төсөв алга'); return; }
  var n = 0; document.querySelectorAll('.pf-bin').forEach(function (e) { if (P[e.dataset.c] != null) { e.value = P[e.dataset.c] || ''; n++; } });
  toast(pm + '-ийн ' + n + ' ангиллыг хууллаа — шалгаад «Хадгалах» дарна уу');
}
function pfBudSave() {
  var m = state.pfBm, rows = [];
  document.querySelectorAll('.pf-bin').forEach(function (e) {
    var v = Number(e.value) || 0, cur = e.dataset.id ? pfL('bud').filter(function (b) { return b.id === e.dataset.id; })[0] : null;
    if (cur ? cur.amount !== v : v > 0) rows.push({ id: e.dataset.id || 'PB' + m + '|' + e.dataset.c, month: m, cat: e.dataset.c, amount: v });
  });
  if (!rows.length) { toast('Өөрчлөлт алга'); return; }
  pfSave('bud', rows, [], function () { toast('Төсөв хадгалагдлаа'); });
}

// ═══════════ ХӨРӨНГӨ ═══════════
function pfAssetView() {
  var A = pfL('asset'), tot = 0;
  var rows = A.map(function (a) { tot += a.value;
    return '<tr><td><b>' + esc(a.name) + '</b>' + (a.note ? '<br><small class="muted">' + esc(a.note) + '</small>' : '') + '</td><td>' + esc(a.type) + '</td><td class="n">' + mny(a.value) + '</td><td class="nw">' + esc(a.date || '') + '</td>' +
      '<td class="n"><button class="mini" onclick="pfAssetOpen(\'' + a.id + '\')">Засах</button></td></tr>'; }).join('');
  return pfHead('Хөрөнгө', 'Үл хөдлөх, машин, хадгаламж, компанийн хувь — үнэлгээгээр. Цэвэр хөрөнгөд орно.', '<button class="b-btn" onclick="pfAssetOpen()">+ Хөрөнгө</button>') +
    '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Нэр</th><th>Төрөл</th><th class="n">Үнэлгээ</th><th>Үнэлсэн огноо</th><th></th></tr>' +
    (rows || '<tr><td colspan="5" class="muted">Хөрөнгө бүртгээгүй</td></tr>') + (A.length ? '<tr class="tot"><td>Нийт</td><td></td><td class="n">' + mny(tot) + '</td><td></td><td></td></tr>' : '') + '</table></div></div>';
}
function pfAssetOpen(id) {
  var a = id ? pfL('asset').filter(function (x) { return x.id === id; })[0] : null;
  gOpen('<h2>' + (a ? 'Хөрөнгө засах' : 'Хөрөнгө нэмэх') + '</h2>' +
    '<label for="asName">Нэр</label><input id="asName" value="' + esc(a ? a.name : '') + '">' +
    '<div class="row2"><div><label for="asType">Төрөл</label><select id="asType">' + PF_ASSET_T.map(function (t) { return '<option' + (a && a.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
    '<div><label for="asVal">Үнэлгээ (₮)</label><input id="asVal" type="number" min="0" inputmode="numeric" value="' + (a ? a.value : '') + '"></div></div>' +
    '<label for="asDate">Үнэлсэн огноо</label><input id="asDate" type="date" value="' + (a && a.date ? a.date : todayStr()) + '">' +
    '<label for="asNote">Тэмдэглэл</label><input id="asNote" value="' + esc(a ? a.note : '') + '">' +
    '<button class="btn" onclick="pfAssetSave(' + (a ? '\'' + a.id + '\'' : '') + ')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>' +
    (a ? '<p style="margin-top:8px"><button class="b-btn" onclick="if(confirm(\'Цуцлах уу?\'))pfSave(\'asset\',[],[\'' + a.id + '\'],function(){gClose();toast(\'Цуцлагдлаа\')})">Цуцлах</button></p>' : ''));
}
function pfAssetSave(id) {
  var a = id ? Object.assign({}, pfL('asset').filter(function (x) { return x.id === id; })[0]) : {};
  a.name = $('asName').value.trim(); a.type = $('asType').value; a.value = Number($('asVal').value) || 0; a.date = $('asDate').value; a.note = $('asNote').value.trim();
  if (a.name.length < 2) { toast('Нэрээ бичнэ үү'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) { toast('Огноо оруулна уу'); return; }
  pfSave('asset', [a], [], function () { gClose(); toast('Хадгалагдлаа'); });
}

// ═══════════ ТАЙЛАН ═══════════
function pfPeriod(kind, anchor, k) {   // [эхлэх, дуусах, нэр]; k — үеийн шилжилт (−1 = өмнөх)
  var y = Number(anchor.slice(0, 4)), mo = Number(anchor.slice(5, 7));
  if (kind === 'year') { y += k; return [y + '-01-01', y + '-12-31', String(y)]; }
  if (kind === 'q') { var q = Math.floor((mo - 1) / 3) + k, yy = y + Math.floor(q / 4); q = ((q % 4) + 4) % 4; var m0 = yy + '-' + ('0' + (q * 3 + 1)).slice(-2); return [m0 + '-01', pfMonEnd(pfMonAdd(m0, 2)), yy + ' ' + (q + 1) + '-р улирал']; }
  var m = pfMonAdd(anchor.slice(0, 7), k); return [m + '-01', pfMonEnd(m), m];
}
var PF_RT = [['io', 'Орлого, зарлага'], ['mon', 'Сар бүрээр'], ['acc', 'Дансаар'], ['bud', 'Төсвийн гүйцэтгэл'], ['loan', 'Зээл'], ['tx', 'Гүйлгээний жагсаалт']];
function pfRepData() {
  var kind = state.pfRk || 'month', an = state.pfRa || todayStr().slice(0, 7), cur = pfPeriod(kind, an, 0), prv = pfPeriod(kind, an, -1), inP = function (t) { return t.date >= cur[0] && t.date <= cur[1]; };
  var sec = function (type, cats) {
    var a = pfSumIn(cur[0], cur[1], type), b = pfSumIn(prv[0], prv[1], type);
    Object.keys(a).concat(Object.keys(b)).forEach(function (c) { if (cats.indexOf(c) < 0) cats.push(c); });
    return cats.filter(function (c) { return a[c] || b[c]; }).map(function (c) { return [c, r0(a[c] || 0), r0(b[c] || 0)]; });
  };
  var inc = sec('Орлого', pfCats('inc').slice()), exp = sec('Зарлага', pfCats('exp').slice());
  // Сар бүрээр: үеийн (жил бол 12 сар, улирал бол 3) сар тус бүрийн ангилал
  var ms = []; for (var m = cur[0].slice(0, 7); m <= cur[1].slice(0, 7); m = pfMonAdd(m, 1)) ms.push(m);
  if (ms.length < 2) { ms = []; for (var k = 11; k >= 0; k--) ms.push(pfMonAdd(cur[0].slice(0, 7), -k)); }
  var mon = function (type, cats) {
    var S = ms.map(function (mm) { return pfMonthSum(mm, type); });
    S.forEach(function (o) { Object.keys(o).forEach(function (c) { if (cats.indexOf(c) < 0) cats.push(c); }); });
    return cats.filter(function (c) { return S.some(function (o) { return o[c]; }); }).map(function (c) { return [c].concat(S.map(function (o) { return r0(o[c] || 0); })); });
  };
  // Дансаар: эхний, орлого, зарлага, шилжүүлэг орсон/гарсан, эцсийн
  var d0 = todayStr(new Date(new Date(cur[0] + 'T00:00:00').getTime() - 864e5));
  var acc = pfL('acc').map(function (A) {
    var o = { i: 0, x: 0, ti: 0, to: 0 };
    pfL('tx').forEach(function (t) {
      if (!inP(t) || (A.openDate && t.date < A.openDate)) return;
      if (t.acc === A.id) { if (t.type === 'Орлого') o.i += t.amount; else if (t.type === 'Зарлага') o.x += t.amount; else o.to += t.amount; }
      if (t.type === 'Шилжүүлэг' && t.toAcc === A.id) o.ti += t.amount;
    });
    var op = A.openDate && A.openDate >= cur[0] && A.openDate <= cur[1] ? A.open : pfBal(A.id, d0);
    return [A.name, op, r0(o.i), r0(o.x), r0(o.ti), r0(o.to), pfBal(A.id, cur[1])];
  });
  // Төсөв: үеийн сарын төсвийн нийлбэр ба зарцуулсан
  var B = {}, sp = pfSumIn(cur[0], cur[1], 'Зарлага');
  pfL('bud').forEach(function (b) { if (b.month >= cur[0].slice(0, 7) && b.month <= cur[1].slice(0, 7)) B[b.cat] = (B[b.cat] || 0) + b.amount; });
  var bud = pfCats('exp').concat(Object.keys(sp).filter(function (c) { return pfCats('exp').indexOf(c) < 0; })).filter(function (c) { return B[c] || sp[c]; })
    .map(function (c) { var b = r0(B[c] || 0), x = r0(sp[c] || 0); return [c, b, x, r0(b - x), b ? Math.round(x / b * 100) : null]; });
  // Зээл: энэ үед төлсөн үндсэн, хүү, торгууль + нийт, үлдэгдэл
  var loans = pfLoans().map(function (L) {
    var s = loanStat(L), P = { a: 0, p: 0, i: 0, f: 0 };
    pfLoanTx(L.id).forEach(function (t) { if (inP(t)) { P.a += t.amount; P.p += t.prin || 0; P.i += t.intr || 0; P.f += t.fee || 0; } });
    return [L.partner + (L.kind === 'Өгсөн' ? ' (өгсөн)' : ''), L.amount, r0(P.a), r0(P.p), r0(P.i), r0(P.f), s.paid, s.intr, s.left, L.status === 'Хаагдсан' || s.left <= 0.5 ? 'Хаагдсан' : 'Идэвхтэй'];
  });
  var tx = pfL('tx').filter(inP).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
    .map(function (t) { return [t.date, t.type, pfTxAccName(t) + (t.type === 'Шилжүүлэг' ? ' → ' + pfAccName(t.toAcc) : ''), t.cat || '', t.desc || '', t.type === 'Орлого' ? t.amount : t.type === 'Зарлага' ? -t.amount : t.amount]; });
  return { cur: cur, prv: prv, inc: inc, exp: exp, ms: ms, minc: mon('Орлого', pfCats('inc').slice()), mexp: mon('Зарлага', pfCats('exp').slice()), acc: acc, bud: bud, loans: loans, tx: tx };
}
function pfRepView() {
  var D = pfRepData(), kind = state.pfRk || 'month', rt = state.pfRt || 'io';
  var T = function (head, body, foot) { return '<div class="card rep"><div class="scroll"><table class="rep-t"><tr>' + head.map(function (h, i) { return '<th' + (i ? ' class="n"' : '') + '>' + esc(h) + '</th>'; }).join('') + '</tr>' + body + (foot || '') + '</table></div></div>'; };
  var tr = function (r, cls, b) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' + r.map(function (v, i) { return i ? '<td class="n">' + (typeof v === 'number' ? (b ? '<b>' + mny(v) + '</b>' : mny(v)) : esc(v == null ? '' : v)) + '</td>' : '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; };
  var sum = function (rows, n) { var o = []; for (var i = 1; i < n; i++) o.push(r0(rows.reduce(function (s, r) { return s + (Number(r[i]) || 0); }, 0))); return o; };
  var pct = function (a, b) { return b ? (a - b > 0 ? '+' : '') + Math.round((a - b) / b * 100) + '%' : ''; };
  var html = '';
  if (rt === 'io') {
    var blk = function (title, rows) { var t = sum(rows, 3); return '<tr class="pf-sec"><td colspan="5"><b>' + title + '</b></td></tr>' + rows.map(function (r) { return tr([r[0], r[1], r[2], r0(r[1] - r[2]), pct(r[1], r[2])]); }).join('') + tr(['Нийт ' + title.toLowerCase(), t[0], t[1], r0(t[0] - t[1]), pct(t[0], t[1])], 'tot'); };
    var ti = sum(D.inc, 3), te = sum(D.exp, 3);
    html = T(['Ангилал', D.cur[2], D.prv[2], 'Зөрүү', '%'], blk('Орлого', D.inc) + blk('Зарлага', D.exp), tr(['Хэмнэлт (орлого − зарлага)', r0(ti[0] - te[0]), r0(ti[1] - te[1]), r0(ti[0] - te[0] - ti[1] + te[1]), ''], 'tot'));
  } else if (rt === 'mon') {
    var n = D.ms.length + 1, blk2 = function (title, rows) { var t = sum(rows, n); return '<tr class="pf-sec"><td colspan="' + (n + 1) + '"><b>' + title + '</b></td></tr>' + rows.map(function (r) { return tr(r.concat([r0(r.slice(1).reduce(function (a, v) { return a + v; }, 0))])); }).join('') + tr(['Нийт ' + title.toLowerCase()].concat(t, [r0(t.reduce(function (a, v) { return a + v; }, 0))]), 'tot'); };
    var ti2 = sum(D.minc, n), te2 = sum(D.mexp, n), sv = ti2.map(function (v, i) { return r0(v - te2[i]); });
    html = T(['Ангилал'].concat(D.ms, ['Нийт']), blk2('Орлого', D.minc) + blk2('Зарлага', D.mexp), tr(['Хэмнэлт'].concat(sv, [r0(sv.reduce(function (a, v) { return a + v; }, 0))]), 'tot'));
  } else if (rt === 'acc') {
    var ta = sum(D.acc, 7);
    html = T(['Данс', 'Эхний үлдэгдэл', 'Орлого', 'Зарлага', 'Шилжүүлэг орсон', 'Шилжүүлэг гарсан', 'Эцсийн үлдэгдэл'], D.acc.map(function (r) { return tr(r); }).join('') || '<tr><td colspan="7" class="muted">Данс алга</td></tr>', D.acc.length ? tr(['Нийт'].concat(ta), 'tot', 1) : '');
  } else if (rt === 'bud') {
    var tb = sum(D.bud, 4);
    html = T(['Ангилал', 'Төсөв', 'Зарцуулсан', 'Үлдсэн', '%'], D.bud.map(function (r) {
      var c = r[4] === null || r[4] >= 100 ? 'var(--red)' : r[4] >= 80 ? 'var(--warning,#B7791F)' : 'inherit';
      return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + mny(r[1]) + '</td><td class="n">' + mny(r[2]) + '</td><td class="n"' + (r[3] < 0 ? ' style="color:var(--red)"' : '') + '>' + mny(r[3]) + '</td><td class="n"><b style="color:' + c + '">' + (r[4] === null ? 'төсөвгүй' : r[4] + '%') + '</b></td></tr>'; }).join('') || '<tr><td colspan="5" class="muted">Төсөв, зарлага алга</td></tr>',
      D.bud.length ? tr(['Нийт', tb[0], tb[1], tb[2], tb[0] ? Math.round(tb[1] / tb[0] * 100) + '%' : ''], 'tot') : '');
  } else if (rt === 'loan') {
    var tl = sum(D.loans, 9);
    html = T(['Зээл', 'Гэрээний дүн', 'Энэ үед төлсөн', '…үндсэн', '…хүү', '…торгууль', 'Нийт төлсөн үндсэн', 'Нийт төлсөн хүү', 'Үлдэгдэл', 'Төлөв'], D.loans.map(function (r) { return tr(r); }).join('') || '<tr><td colspan="10" class="muted">Зээл алга</td></tr>',
      D.loans.length ? tr(['Нийт'].concat(tl, ['']), 'tot', 1) : '');
  } else {
    var inc = 0, exp = 0; D.tx.forEach(function (r) { if (r[1] === 'Орлого') inc += r[5]; else if (r[1] === 'Зарлага') exp -= r[5]; });
    html = T(['Огноо', 'Төрөл', 'Данс', 'Ангилал', 'Тайлбар', 'Дүн'], D.tx.map(function (r) { return '<tr><td class="nw">' + r[0] + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td>' + esc(r[3]) + '</td><td>' + esc(r[4]) + '</td><td class="n">' + mny(r[5]) + '</td></tr>'; }).join('') || '<tr><td colspan="6" class="muted">Гүйлгээ алга</td></tr>',
      D.tx.length ? '<tr class="tot"><td colspan="5">Орлого ' + fmt(inc) + ' · зарлага ' + fmt(exp) + ' · хэмнэлт</td><td class="n">' + mny(inc - exp) + '</td></tr>' : '');
  }
  var bar = '<div class="pf-flt"><select onchange="state.pfRk=this.value;render()">' + [['month', 'Сар'], ['q', 'Улирал'], ['year', 'Жил']].map(function (o) { return '<option value="' + o[0] + '"' + (kind === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
    '<button class="mini" onclick="pfRepShift(-1)">‹</button><b>' + esc(D.cur[2]) + '</b><button class="mini" onclick="pfRepShift(1)">›</button>' +
    (rt === 'io' ? '<span class="muted">өмнөх үе: ' + esc(D.prv[2]) + '</span>' : rt === 'mon' && kind === 'month' ? '<span class="muted">сүүлийн 12 сар</span>' : '') + '</div>';
  var tabs = '<div class="tabs fn-tabs">' + PF_RT.map(function (t) { return '<button class="' + (t[0] === rt ? 'on' : '') + '" onclick="state.pfRt=\'' + t[0] + '\';render()">' + t[1] + '</button>'; }).join('') + '</div>';
  return pfHead('Тайлан', 'Сар, улирал, жилээр — ангилал, сар бүр, данс, төсөв, зээл, гүйлгээ.', '<button class="b-btn" onclick="pfRepXlsx()">Excel татах</button>') + tabs + bar + html;
}
function pfRepShift(k) {
  var kind = state.pfRk || 'month', an = state.pfRa || todayStr().slice(0, 7);
  state.pfRa = pfMonAdd(an, k * (kind === 'year' ? 12 : kind === 'q' ? 3 : 1)); render();
}
// Excel: бүх тайлан нэг файлд (хуудас бүр нэг тайлан)
function pfRepXlsx() {
  if (!window.XLSX) { toast('Excel сан ачаалж байна — хэдэн секундийн дараа дахин оролдоно уу'); ensureXlsx(function () {}); return; }
  var D = pfRepData(), wb = XLSX.utils.book_new(), add = function (name, aoa, w) { var ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = w.map(function (x) { return { wch: x }; }); XLSX.utils.book_append_sheet(wb, ws, name); };
  var io = [['Орлого, зарлага · ' + D.cur[2]], [], ['Ангилал', D.cur[2], D.prv[2], 'Зөрүү']];
  [['ОРЛОГО', D.inc], ['ЗАРЛАГА', D.exp]].forEach(function (s) { io.push([s[0]]); s[1].forEach(function (r) { io.push([r[0], r[1], r[2], r0(r[1] - r[2])]); }); io.push([]); });
  add('Орлого зарлага', io, [28, 16, 16, 16]);
  var mo = [['Ангилал'].concat(D.ms)]; [['ОРЛОГО', D.minc], ['ЗАРЛАГА', D.mexp]].forEach(function (s) { mo.push([s[0]]); s[1].forEach(function (r) { mo.push(r); }); mo.push([]); });
  add('Сар бүрээр', mo, [24].concat(D.ms.map(function () { return 12; })));
  add('Дансаар', [['Данс', 'Эхний үлдэгдэл', 'Орлого', 'Зарлага', 'Шилжүүлэг орсон', 'Шилжүүлэг гарсан', 'Эцсийн үлдэгдэл']].concat(D.acc), [22, 14, 14, 14, 14, 14, 14]);
  add('Төсөв', [['Ангилал', 'Төсөв', 'Зарцуулсан', 'Үлдсэн', '%']].concat(D.bud.map(function (r) { return [r[0], r[1], r[2], r[3], r[4] === null ? '' : r[4]]; })), [24, 14, 14, 14, 8]);
  add('Зээл', [['Зээл', 'Гэрээний дүн', 'Энэ үед төлсөн', 'үндсэн', 'хүү', 'торгууль', 'Нийт төлсөн үндсэн', 'Нийт төлсөн хүү', 'Үлдэгдэл', 'Төлөв']].concat(D.loans), [24, 14, 14, 12, 12, 10, 16, 14, 14, 10]);
  add('Гүйлгээ', [['Огноо', 'Төрөл', 'Данс', 'Ангилал', 'Тайлбар', 'Дүн']].concat(D.tx), [11, 10, 24, 18, 36, 13]);
  XLSX.writeFile(wb, ('Хувийн санхүү ' + D.cur[2]).replace(/[\\/:*?"<>|]/g, '') + '.xlsx');
}

// ═══════════ ТОХИРГОО ═══════════
function pfSetView() {
  var box = function (k, title) {
    return '<div class="card"><h2>' + title + '</h2><p class="muted" style="font-size:12.5px">Мөр бүрт нэг ангилал. Автомат бичилтэд хэрэгтэй (' + PF_SYS[k].join(', ') + ') ангиллыг хасаж болохгүй.</p>' +
      '<textarea id="pfc_' + k + '" rows="' + (pfCats(k).length + 1) + '" style="width:100%">' + esc(pfCats(k).join('\n')) + '</textarea></div>';
  };
  return pfHead('Тохиргоо', 'Орлого, зарлагын ангилал. Банкны данс холбох, хуучин журнал — зүүн цэсэнд.', '<button class="b-btn" style="color:var(--accent)" onclick="pfSetSave()">Хадгалах</button>') +
    '<div class="pf-2">' + box('inc', 'Орлогын ангилал') + box('exp', 'Зарлагын ангилал') + '</div>';
}
function pfSetSave() {
  var get = function (k) { var seen = {}; return $('pfc_' + k).value.split(/\n/).map(function (x) { return x.trim().slice(0, 40); }).filter(function (x) { if (!x || seen[x]) return false; seen[x] = 1; return true; }); };
  var v = { inc: get('inc'), exp: get('exp') };
  if (!v.inc.length || !v.exp.length) { toast('Ангилал хоосон байж болохгүй'); return; }
  pfCfgSave(v, function () { toast('Хадгалагдлаа'); });
}

// Хэв загвар (утсанд: хүснэгт хэвтээ гүйнэ, товч хуруунд тохирох)
(function () {
  var st = document.createElement('style');
  st.textContent = '.pf .pf-k6{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.pf .pf-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '.pf .pf-flt{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px}.pf .pf-flt input,.pf .pf-flt select{width:auto;min-width:0;margin:0}' +
    '.pf .pf-bar{display:grid;grid-template-columns:minmax(90px,30%) 1fr auto;gap:8px;align-items:center;margin:6px 0;font-size:13px}.pf .pf-bar i{display:block;height:8px;background:var(--line,#eef0f3);border-radius:4px;overflow:hidden}' +
    '.pf .pf-bar i b{display:block;height:100%;background:var(--expense)}.pf .pf-bar em{font-style:normal;font-variant-numeric:tabular-nums}' +
    '.pf .pf-bin{width:120px;text-align:right;margin:0}.pf .pf-meter{height:4px;background:var(--line,#eef0f3);border-radius:2px;margin-top:3px}.pf .pf-meter i{display:block;height:100%;border-radius:2px}' +
    '.pf .pf-acts{display:flex;flex-wrap:nowrap;gap:4px;margin-top:6px}.pf .pf-acts .mini{margin:0}.pf .pf-sec td{background:var(--bg2,#f6f7f9)}.pf .scroll{-webkit-overflow-scrolling:touch}.pf .rep-cap .mini.on{font-weight:700;color:var(--accent)}' +
    '.pf table.rep-t td,.pf table.rep-t th{white-space:nowrap!important;overflow-wrap:normal!important}.pf td.fn-ell{max-width:260px;overflow:hidden;text-overflow:ellipsis}' +
    '@media(max-width:760px){.bz-admin .pf .card.rep .rep-t{display:table}.bz-admin .pf .card.rep .rep-t tbody{display:table-row-group}.bz-admin .pf .card.rep .rep-t tr,.bz-admin .pf .card.rep .rep-t tr:first-child:has(th){display:table-row;border:0;padding:0;margin:0;background:none}' +
    '.bz-admin .pf .card.rep .rep-t td{display:table-cell;padding:7px 8px;border-bottom:1px solid var(--border)}.bz-admin .pf .card.rep .rep-t td.n{text-align:right}.bz-admin .pf .card.rep .rep-t td:not(.n){text-align:left}.bz-admin .pf .card.rep .rep-t td::before{display:none}' +
    '.bz-admin .pf .card.rep .scroll{overflow-x:auto}.bz-admin .pf .card.rep .rep-t tr.tot td{background:var(--surface-alt)}' +
    '.pf .pf-k6{grid-template-columns:1fr 1fr}.pf .pf-2{grid-template-columns:1fr}.pf .mini,.pf .b-btn{min-height:38px;padding-left:12px;padding-right:12px}' +
    '.pf .pg-act{flex-wrap:wrap}.pf .pf-bin{width:96px}}';
  document.head.appendChild(st);
})();

if (window.PF_RAW) pfApply(PF_RAW[0], PF_RAW[1]);   // admin.js өмнө нь уншсан бол
