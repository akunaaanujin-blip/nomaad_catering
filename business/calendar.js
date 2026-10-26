// ── КАЛЕНДАРЬ, САНУУЛГА ──
// Өөрийн сануулга (зээл төлөх, өглөг, авлага, түрээс…) + татварын хугацаа + гэрээ дуусах өдрийг нэг календарьт.
// Утсандаа дуугаргах бол сануулга бүрийн «Google Календарьт нэмэх» — Google Calendar-ын мэдэгдлээр сэрүүлэг өгнө.

var reminders = [];
var calMonth = todayStr().slice(0, 7);
var REM_KINDS = ['Зээл төлөх', 'Өглөг төлөх', 'Авлага авах', 'Татвар, НДШ төлөх', 'Түрээс төлөх', 'Цалин олгох', 'Бусад'];

function calEvents() {
  var ev = [];
  reminders.forEach(function (r) { if (r.status !== 'Цуцалсан' && r.kind !== 'Тайлан илгээсэн') ev.push({ date: r.date, kind: 'rem', done: r.status === 'Хийгдсэн', r: r, text: r.title + (r.amount ? ' · ' + fmt(r.amount) : '') }); });
  if (isOwner()) Object.keys(ENTITIES).forEach(function (k) { taxDeadlines(k).forEach(function (x) { ev.push({ date: x.date, kind: 'tax', text: x.name + ' (' + ENTITIES[k].name + ')', k: k, go: x.go, key: x.key }); }); });
  (typeof tasks !== 'undefined' ? tasks : []).forEach(function (t) { if (t.due && t.status === 'Шинэ') ev.push({ date: t.due, kind: 'task', text: 'Даалгавар: ' + t.title + ' (' + t.staffName + ')' }); });
  staff.forEach(function (s) { if (s.status === 'Тийм' && s.contractEnd) ev.push({ date: s.contractEnd, kind: 'contract', text: 'Гэрээ дуусна: ' + s.name, id: s.id }); });
  loanEvents().forEach(function (e) { ev.push(e); });
  return ev;
}
// Зээлийн хуваарийн төлөлтүүд (бүх компани) — төлөгдсөн нь «хийгдсэн», төлөгдөөгүй өнгөрсөн нь хоцорсон
function loanEvents() {
  var EJ = {}, ev = [];
  (window.loans || []).filter(function (L) { return L.status === 'Идэвхтэй' && (L.schedule || []).length; }).forEach(function (L) {
    var E = EJ[L.biz] || (EJ[L.biz] = buildJournal(L.biz, R())), sc = loanSched(L, E), taken = L.kind === 'Авсан';
    sc.rows.forEach(function (r) {
      ev.push({ date: r.d, kind: 'loan', done: r.st === 'paid', loan: L, amt: r.st === 'paid' ? r.t : r.left,
                text: (taken ? 'Зээл төлөх · ' : 'Зээлийн төлбөр авах · ') + L.partner + ' · ' + fmt(r.st === 'paid' ? r.t : r.left) + (r.st === 'part' ? ' (үлдсэн)' : '') });
    });
  });
  return ev;
}
function loanAlerts() {   // хоцорсон эсвэл 3 хоногийн дотор төлөх зээл
  var t = todayStr(), lim = todayStr(new Date(Date.now() + 3 * 864e5));
  return loanEvents().filter(function (e) { return !e.done && e.date <= lim; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (e) {
    var late = e.date < t;
    return '<div class="alert' + (late || e.date === t ? ' bad' : '') + '"><div><b>' + esc(e.text) + '</b> — ' + e.date + (late ? ' (хоцорсон)' : e.date === t ? ' (өнөөдөр)' : '') +
      ' · ' + esc(BUSINESSES[e.loan.biz].name) + '</div><div class="pg-act"><button class="b-btn primary" onclick="state.view=\'company\';state.biz=\'' + e.loan.biz + '\';state.module=\'finance\';setSub(\'loans\')">Зээл</button></div></div>';
  }).join('');
}
function remAlerts() {   // хугацаа хэтэрсэн эсвэл 3 хоногийн дотор болох сануулга (+ зээлийн хуваарь)
  var t = todayStr(), lim = todayStr(new Date(Date.now() + 3 * 864e5));
  return loanAlerts() + reminders.filter(function (r) { return r.status === 'Хүлээгдэж' && r.date <= lim; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (r) {
    var late = r.date < t;
    return '<div class="alert' + (late || r.date === t ? ' bad' : '') + '"><div><b>' + esc(r.title) + '</b>' + (r.amount ? ' · ' + fmt(r.amount) : '') + (r.partner ? ' · ' + esc(r.partner) : '') +
      ' — ' + r.date + (late ? ' (хугацаа хэтэрсэн)' : r.date === t ? ' (өнөөдөр)' : '') + '</div><div class="pg-act"><button class="b-btn primary" onclick="remDone(\'' + r.id + '\')">Хийгдсэн</button>' +
      '<button class="b-btn" onclick="openCal()">Календарь</button></div></div>';
  }).join('');
}
function openCal(month) { state.view = 'cal'; if (month) calMonth = month; render(); window.scrollTo(0, 0); }
function calShift(n) { var d = new Date(calMonth + '-01T00:00:00'); d.setMonth(d.getMonth() + n); calMonth = todayStr(d).slice(0, 7); render(); }
function calView() {
  var ev = calEvents(), first = new Date(calMonth + '-01T00:00:00'), t = todayStr();
  var startDow = (first.getDay() + 6) % 7, days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  var MN = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
  var cells = '';
  for (var i = 0; i < startDow; i++) cells += '<div class="cal-d empty"></div>';
  for (var d = 1; d <= days; d++) {
    var ds = calMonth + '-' + ('0' + d).slice(-2), list = ev.filter(function (e) { return e.date === ds; });
    cells += '<div class="cal-d' + (ds === t ? ' today' : '') + '" onclick="openRem(\'' + ds + '\')"><span class="n">' + d + '</span>' + list.slice(0, 3).map(function (e) {
      return '<i class="ev ' + e.kind + (e.done ? ' done' : '') + '" title="' + esc(e.text) + '">' + esc(e.text) + '</i>'; }).join('') + (list.length > 3 ? '<i class="ev more">+' + (list.length - 3) + '</i>' : '') + '</div>';
  }
  var up = ev.filter(function (e) { return e.date >= todayStr(new Date(Date.now() - 7 * 864e5)) && e.date <= todayStr(new Date(Date.now() + 45 * 864e5)) && !e.done; })
    .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  return pageHead('Календарь', '<button class="b-btn primary" onclick="openRem()">+ Сануулга</button>') +
    '<p class="hint">Зээл төлөх, нийлүүлэгчид төлөх, авлага авах өдрөө тэмдэглэ. Хугацаа нь 3 хоногийн дотор болох сануулга «Миний компаниуд» болон Хянах самбарын дээд талд гарна. ' +
    'Утсандаа дуудлага/мэдэгдэл авах бол «Google Календарь» товчоор нэмээрэй.</p>' +
    '<div class="card"><div class="bar-row"><button class="b-btn" onclick="calShift(-1)">‹</button><h2 style="margin:0">' + first.getFullYear() + ' оны ' + MN[first.getMonth()] + '</h2><button class="b-btn" onclick="calShift(1)">›</button></div>' +
    '<div class="cal-g">' + ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'].map(function (w) { return '<div class="cal-h">' + w + '</div>'; }).join('') + cells + '</div>' +
    '<div class="cal-legend"><i class="ev rem">Миний сануулга</i><i class="ev loan">Зээлийн төлөлт</i><i class="ev tax">Татвар, тайлан</i><i class="ev contract">Гэрээ дуусах</i><i class="ev task">Ажилчдын даалгавар</i></div></div>' +
    '<div class="card rep"><div class="rep-cap"><b>Ойрын 45 хоног</b></div><div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Юу</th><th class="n">Дүн</th><th></th></tr>' +
    (up.length ? up.map(function (e) {
      var r = e.r, late = e.date < todayStr();
      var acts = e.kind === 'rem' ? '<button class="mini" onclick="editRem(\'' + r.id + '\')">Засах</button> <button class="mini" style="color:var(--green)" onclick="remDone(\'' + r.id + '\')">Хийгдсэн</button> <a class="mini" target="_blank" rel="noopener" href="' + gcalLink(r) + '">Google Календарь</a> <button class="mini" onclick="remCancel(\'' + r.id + '\')">Устгах</button>'
        : e.kind === 'loan' ? '<button class="mini" style="color:var(--accent)" onclick="state.view=\'company\';state.biz=\'' + e.loan.biz + '\';state.module=\'finance\';setSub(\'loans\')">Зээл</button>'
        : e.kind === 'task' ? '<button class="mini" onclick="go(\'staff\')">Ажилчид</button>' : e.kind === 'tax' ? '<button class="mini" style="color:var(--accent)" onclick="openTax(\'' + e.k + '\',\'' + e.go + '\')">Бэлтгэх</button> <button class="mini" style="color:var(--green)" onclick="markTaxSent(\'' + e.k + '\',' + esc(JSON.stringify(e.key)) + ',\'' + e.date + '\')">Илгээсэн</button>' : '<button class="mini" onclick="openContract(\'' + e.id + '\')">Гэрээ</button>';
      return '<tr' + (late ? ' class="b"' : '') + '><td>' + e.date + (late ? ' <span class="tag r">хэтэрсэн</span>' : '') + '</td><td><i class="dot-k ' + e.kind + '"></i>' + esc(e.kind === 'rem' ? r.kind + ': ' + r.title : e.text) +
        (r && r.partner ? ' · ' + esc(r.partner) : '') + (r && r.repeat === 'Сар бүр' ? ' <span class="tag b">сар бүр</span>' : '') + '</td><td class="n">' + (r && r.amount ? fmt(r.amount) : '') + '</td><td class="n">' + acts + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="muted">Ойрын хугацаанд юу ч алга</td></tr>') + '</table></div></div>';
}
function gcalLink(r) {
  var d = r.date.replace(/-/g, ''), n = new Date(r.date + 'T00:00:00'); n.setDate(n.getDate() + 1);
  var p = { action: 'TEMPLATE', text: r.title + (r.amount ? ' — ' + fmt(r.amount) : ''), dates: d + '/' + todayStr(n).replace(/-/g, ''),
            details: [r.kind, r.partner, r.note, 'NOMAAD удирдлагын самбар'].filter(Boolean).join('\n') };
  if (r.repeat === 'Сар бүр') p.recur = 'RRULE:FREQ=MONTHLY';
  return 'https://calendar.google.com/calendar/render?' + Object.keys(p).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&');
}
var remEditId = '';
function editRem(id) { var r = reminders.filter(function (x) { return x.id === id; })[0]; if (!r) return; openRem(r.date, { kind: r.kind, title: r.title, amount: r.amount, partner: r.partner, biz: r.co, repeat: r.repeat, note: r.note }); remEditId = id; }
function openRem(date, preset) {
  preset = preset || {}; remEditId = '';
  $('rmDate').value = date || todayStr(new Date(Date.now() + 864e5));
  $('rmKind').innerHTML = REM_KINDS.map(function (k) { return '<option' + (preset.kind === k ? ' selected' : '') + '>' + k + '</option>'; }).join('');
  $('rmTitle').value = preset.title || ''; $('rmAmount').value = preset.amount || ''; $('rmPartner').value = preset.partner || ''; $('rmNote').value = '';
  $('rmRepeat').value = preset.repeat || 'Нэг удаа'; if (preset.note) $('rmNote').value = preset.note;
  $('rmCo').innerHTML = ALL_KEYS.map(function (k) { return '<option value="' + k + '"' + (k === (preset.biz || state.biz) ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('');
  $('rmPartners').innerHTML = partners.map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join('');
  openSheet('remSheet');
}
function saveRem() {
  var r = { date: $('rmDate').value, kind: $('rmKind').value, title: $('rmTitle').value.trim() || $('rmKind').value, amount: Number($('rmAmount').value) || 0,
            partner: $('rmPartner').value.trim(), co: $('rmCo').value, repeat: $('rmRepeat').value, note: $('rmNote').value.trim() };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) { toast('Огноо сонгоно уу'); return; }
  var done = function () { closeSheet('remSheet'); toast('Сануулга нэмэгдлээ'); if (confirm('Утсандаа мэдэгдэл авахын тулд Google Календарьт нэмэх үү?')) window.open(gcalLink(r), '_blank'); };
  if (remEditId) {
    var id = remEditId; remEditId = '';
    if (!API_URL) { reminders = reminders.map(function (x) { return x.id === id ? Object.assign(x, r) : x; }); save('nb_demo_rem', reminders); closeSheet('remSheet'); render(); return; }
    post({ type: 'admin_reminder', updateId: id, reminder: r }, function (err) { if (err) { toast('Алдаа: ' + err); return; } closeSheet('remSheet'); toast('Засагдлаа'); refresh(); });
    return;
  }
  if (!API_URL) { r.id = 'R' + Date.now(); r.status = 'Хүлээгдэж'; reminders.push(r); save('nb_demo_rem', reminders); render(); done(); return; }
  post({ type: 'admin_reminder', reminder: r }, function (err) { if (err) { toast('Алдаа: ' + err); return; } refresh(); done(); });
}
function remDone(id) {
  var r = reminders.filter(function (x) { return x.id === id; })[0]; if (!r) return;
  if (!confirm('«' + r.title + '» хийгдсэн гэж тэмдэглэх үү?' + (r.repeat === 'Сар бүр' ? '\nДараа сарын сануулга автоматаар үүснэ.' : '') +
    (/төлөх|олгох/.test(r.kind) ? '\n\nТөлбөрөө «Санхүү → Кассын баримт»-аар бүртгэхээ мартуузай.' : ''))) return;
  if (!API_URL) {
    r.status = 'Хийгдсэн';
    if (r.repeat === 'Сар бүр') { var d = new Date(r.date + 'T00:00:00'); d.setMonth(d.getMonth() + 1); reminders.push(Object.assign({}, r, { id: 'R' + Date.now(), date: todayStr(d), status: 'Хүлээгдэж' })); }
    save('nb_demo_rem', reminders); render(); return;
  }
  post({ type: 'admin_reminder', doneId: id }, function (err) { if (err) { toast('Алдаа: ' + err); return; } toast('Тэмдэглэгдлээ'); refresh(); });
}
function remCancel(id) {
  if (!confirm('Энэ сануулгыг устгах уу?')) return;
  if (!API_URL) { reminders = reminders.filter(function (x) { return x.id !== id; }); save('nb_demo_rem', reminders); render(); return; }
  post({ type: 'admin_reminder', cancelId: id }, function (err) { if (err) { toast('Алдаа: ' + err); return; } refresh(); });
}

// ── Cozy захиалгын тойм (удирдлага) ──
function repOrders(biz) {
  var all = (window.adminOrders || []).filter(function (o) { return o.biz === biz; }).sort(function (a, b) { return (b.date + b.time) < (a.date + a.time) ? -1 : 1; });
  var list = all.filter(ordFilt(state.ordF || 'wait'));
  var items = function (o) { try { var arr = typeof o.items === 'string' ? JSON.parse(o.items || '[]') : (o.items || []); return arr.map(function (i) { return i.name + (i.qty > 1 ? ' x' + i.qty : ''); }).join(', '); } catch (e) { return String(o.items); } };
  var billed = {}; (window.records || []).forEach(function (x) { if (x.type === 'sale' && x.bill) billed[x.bill] = 1; });
  var cand = ordBankCands(biz);   // захиалга бүрт таарах банкны хуулгын гүйлгээ
  var rows = list.map(function (o) {
    var bc = cand[o.id], bk = o.confirmed ? '' : bc ? 'таарсан · ' + bc.l.date.slice(5, 10) + ' ' + fmt(bc.l.credit) + (bc.sure ? '' : ' (шалгах)') : 'хуулгад алга';
    var act = ordDead(o) ? '' : o.confirmed
      ? '<button class="mini" onclick="undoPayOrder(\'' + o.id + '\')">Буцаах</button>'
      : '<button class="mini" style="color:var(--green)" onclick="openPayOrder(\'' + o.id + '\')">Баталгаажуулах</button>' + (bc ? ' <button class="mini" title="Банкны хуулгын таарсан гүйлгээгээр шууд" onclick="ordBankMatch(\'' + o.id + '\')">Хуулгаар</button>' : '');
    if (billed[o.id]) act = '<button class="mini" onclick="openBillAdm(\'' + o.id + '\')">Баримт</button>' + act;
    return { date: o.date + ' ' + o.time, phone: o.phone, customer: o.customer, items: items(o), status: ordStLabel(o), payType: o.payType, paid: o.paid || 'Ороогүй',
             conf: o.confirmed ? 'Баталгаажсан' : '—', bank: bk, amount: o.amount, staff: o.staff, _act: act };
  });
  var unpaid = all.filter(ordFilt('wait')).reduce(function (a, o) { return a + o.amount; }, 0), nBank = all.filter(function (o) { return !o.confirmed && !ordDead(o) && cand[o.id]; }).length;
  return { title: 'Захиалга', rows: rows, actions: true,
    cols: [c('date', 'Огноо'), c('phone', 'Утас'), c('customer', 'Захиалагч'), c('items', 'Бараа'), c('status', 'Хүргэлт'), c('payType', 'Төлбөрийн хэлбэр'), c('paid', 'Ажилтан: төлбөр'), c('conf', 'Удирдлага'), c('bank', 'Банкны хуулга'), m('amount', 'Дүн'), c('staff', 'Ажилтан')],
    total: { date: rows.length + ' захиалга', amount: sum(rows, 'amount') },
    note: 'Баталгаажаагүй нийт: ' + fmt(unpaid) + (nBank ? ' · банкны хуулгаас таарсан ' + nBank + ' захиалга — «Хуулгаар баталгаажуулах» дарна' : '') + '. Ажилтны «Төлбөр орсон» нь зөвхөн тэмдэглэл — санхүүд бичигдэхгүй. «Банкны хуулга»-аар тулгах (эсвэл энд «Баталгаажуулах») үед л санхүүд орно.' };
}
// ── Харилцагчид (утасны дугаараар): хэдэн удаа, хэдийг захиалсан ──
function phoneKey(p) { return String(p || '').replace(/\D/g, '').slice(-8); }
function admOrdItems(o) { try { var arr = typeof o.items === 'string' ? JSON.parse(o.items || '[]') : (o.items || []); return arr.map(function (i) { return i.name + (i.qty > 1 ? ' x' + i.qty : ''); }).join(', '); } catch (e) { return String(o.items); } }
function custGroups(biz) {
  var g = {};
  (window.adminOrders || []).filter(function (o) { return o.biz === biz && phoneKey(o.phone).length === 8; }).forEach(function (o) {
    var k = phoneKey(o.phone), x = g[k] || (g[k] = { k: k, phone: o.phone, name: '', n: 0, canc: 0, total: 0, wait: 0, first: o.date, last: '', list: [] });
    x.list.push(o);
    if (o.date < x.first) x.first = o.date;
    if (o.date >= x.last) { x.last = o.date; x.phone = o.phone; if (o.customer) x.name = o.customer; }
    if (ordDead(o)) { x.canc++; return; }
    x.n++; x.total += Number(o.amount) || 0;
    if (!o.confirmed) x.wait += Number(o.amount) || 0;
  });
  return Object.keys(g).map(function (k) { return g[k]; });
}
function repCustomers(biz) {
  var q = String(state.cq || '').toLowerCase().trim(), qd = q.replace(/\D/g, '');
  var rows = custGroups(biz).filter(function (x) { return !q || (qd && x.k.indexOf(qd) >= 0) || String(x.name).toLowerCase().indexOf(q) >= 0; })
    .sort(function (a, b) { return b.total - a.total; }).map(function (x) {
      return { phone: x.phone, name: x.name, n: x.n, canc: x.canc || '', total: x.total, avg: x.n ? Math.round(x.total / x.n) : '', wait: x.wait || '', first: x.first, last: x.last,
               _act: '<button class="mini" onclick="openCust(\'' + x.k + '\')">Захиалгууд</button>' };
    });
  return { title: 'Харилцагчид (утасны дугаараар)', rows: rows, actions: true, noRange: true,
    cols: [c('phone', 'Утас'), c('name', 'Нэр (сүүлийн)'), m('n', 'Захиалга'), m('canc', 'Цуцалсан'), m('total', 'Нийт дүн'), m('avg', 'Дундаж'), m('wait', 'Баталгаажаагүй'), c('first', 'Анх'), c('last', 'Сүүлд')],
    total: { phone: rows.length + ' харилцагч', total: sum(rows, 'total'), wait: sum(rows, 'wait') },
    note: '2 ба түүнээс олон удаа захиалсан: ' + rows.filter(function (r) { return r.n >= 2; }).length + ' харилцагч. Цуцалсан захиалга нийт дүнд орохгүй.' };
}
function openCust(k) {
  var x = custGroups(state.biz).filter(function (g) { return g.k === k; })[0]; if (!x) return;
  gOpen('<h2>' + esc(x.name || x.phone) + '</h2><p class="muted">' + esc(x.phone) + ' · ' + x.n + ' захиалга · нийт ' + fmt(x.total) + (x.canc ? ' · ' + x.canc + ' цуцалсан' : '') + '</p>' +
    '<div class="scroll" style="max-height:60vh"><table class="rep-t"><tr><th>Огноо</th><th>Бараа</th><th>Хаяг</th><th>Төлөв</th><th class="n">Дүн</th></tr>' +
    x.list.slice().sort(function (a, b) { return (b.date + b.time) < (a.date + a.time) ? -1 : 1; }).map(function (o) {
      return '<tr><td>' + esc(o.date) + '</td><td>' + esc(admOrdItems(o)) + '</td><td>' + esc(((o.district ? o.district + ', ' : '') + (o.address || '')).slice(0, 70)) + '</td>' +
        '<td>' + esc(ordStLabel(o)) + (o.confirmed ? ' · баталгаажсан' : '') + '</td><td class="n">' + fmt(o.amount) + '</td></tr>';
    }).join('') + '</table></div><button class="btn ghost" onclick="gClose()">Хаах</button>');
}
// Баталгаажаагүй захиалга бүрт таарах банкны хуулгын гүйлгээ (утас, дүн, EB-кодоор) — «Банкны хуулга» хуудасны санал болгосонтой ижил
function ordBankCands(biz) {
  var out = {};
  (typeof bankLines !== 'undefined' ? bankLines : []).forEach(function (l) {
    if (l.biz !== biz || l.status !== 'Шинэ' || !(+l.credit > 0)) return;
    var m = bankMatch(l); if (!m || m.kind !== 'order' || !m.o) return;
    var cur = out[m.o.id]; if (!cur || (m.sure && !cur.sure)) out[m.o.id] = { l: l, sure: !!m.sure };
  });
  return out;
}
function ordBankMatch(id) {
  var c = ordBankCands(state.biz)[id]; if (!c) { toast('Таарах гүйлгээ олдсонгүй'); return; }
  bankPick[c.l.id] = 'O:' + id; bankApply([c.l.id]);
}
// Захиалгын шүүлтүүр: check — ажилтан «орсон» гэсэн ч баталгаажаагүй; wait — баталгаажаагүй бүгд; conf — баталгаажсан
function ordFilt(f) {
  return function (o) {
    if (f === 'check') return !o.confirmed && o.paid === 'Орсон' && !ordDead(o);
    if (f === 'wait') return !o.confirmed && !ordDead(o);
    if (f === 'conf') return !!o.confirmed;
    return true;
  };
}
function importCozyOld() {
  if (!API_URL) { toast('Google Sheet-тэй холбогдсон үед ажиллана'); return; }
  post({ type: 'admin_import_cozy', dryRun: true }, function (err, d) {
    if (err) { toast('Алдаа: ' + err); return; }
    if (!d.count) { toast('Шилжүүлэх шинэ мөр алга (аль хэдийн шилжсэн)'); return; }
    if (!confirm('«Cozy хүргэлт» хүснэгтээс ' + d.count + ' захиалга шилжүүлэх үү?\n\nХуучин хүснэгт өөрчлөгдөхгүй. Төлбөр ороогүй захиалгын мөнгө ормогц борлуулалт болж санхүүд бичигдэнэ; аль хэдийн төлөгдсөн хуучин захиалга санхүүд орохгүй (өмнөх хугацааных).')) return;
    post({ type: 'admin_import_cozy' }, function (err2, d2) { if (err2) { toast('Алдаа: ' + err2); return; } toast(d2.count + ' захиалга шилжлээ'); refresh(); });
  });
}
