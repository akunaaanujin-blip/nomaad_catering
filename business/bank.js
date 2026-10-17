// ── БАНКНЫ ХУУЛГА: Хаан банкны Excel хуулгыг оруулж захиалга, авлага, зардалтай тулгах ──
// 1) Хуулга оруулах → мөрүүд «Банк» хуудсанд давхардалгүй хадгалагдана
// 2) Орлого бүрийг гүйлгээний утган дахь утасны дугаар / «EB-утас» (буухиа) / дүнгээр захиалгатай тааруулна
// 3) Систем зөвхөн САНАЛ болгоно — мөр бүрийг хэрэглэгч өөрөө шалгаж «Тулгах» дарна (автоматаар юу ч бичихгүй)
// 4) Хуулгын эцсийн үлдэгдэл = санхүүгийн харилцах дансны үлдэгдэл эсэхийг шалгана

var bankLines = [], bankTab = 'todo', bankPick = {};
var BANK_IN = [['5201', 'Бусад орлого'], ['5101', 'Борлуулалт (системээс гадуур)'], ['4101', 'Эзэн мөнгө оруулсан'], ['1201', 'Авлага орж ирсэн'], ['3501', 'Зээл авсан'], ['10003', 'Кассаас тушаасан'], ['skip', 'Тулгахгүй (алгасах)']];
var BANK_OUT = [['7205', 'Зар сурталчилгаа (boost)'], ['7301', 'Банкны шимтгэл, бусад зардал'], ['1404', 'Бараа татан авалт'], ['3101', 'Нийлүүлэгчид төлсөн'], ['7207', 'Хүргэлт (буухиа)'],
  ['7201', 'Түрээс'], ['7202', 'Цахилгаан, ус'], ['3301', 'Цалин олгосон'], ['3403', 'НДШ төлсөн'], ['3404', 'ХХОАТ төлсөн'], ['3501', 'Зээл төлсөн'], ['4101', 'Эзэн мөнгө авсан'], ['10003', 'Касс руу бэлэн гаргасан'], ['skip', 'Тулгахгүй (алгасах)']];
var BANK_RULES = [[/boost|реклам|фэйсбүүк|facebook|meta|зар/i, '7205'], [/хураамж|шимтгэл|fee/i, '7301'], [/түрээс/i, '7201'], [/цалин/i, '3301'], [/ндш|даатгал/i, '3403'],
  [/цахилгаан|ус хангамж|дулаан/i, '7202'], [/буухиа|ebuuhia|хүргэлт/i, '7207'], [/зээл/i, '3501']];

function bankAcctInfo(acct) { var k = Object.keys(BANK_ACCOUNTS).filter(function (x) { return String(acct).slice(-4) === x; })[0]; return k ? BANK_ACCOUNTS[k] : null; }

// ── Хуулга унших (Хаан банк: «Гүйлгээний огноо | Салбар | Эхний үлдэгдэл | Кредит | Дебит | Эцсийн үлдэгдэл | Гүйлгээний утга | Харьцсан данс») ──
function importBank(input) {
  var f = input.files && input.files[0]; input.value = '';
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function (e) {
    var wb; try { wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' }); } catch (err) { toast('Файлыг уншиж чадсангүй'); return; }
    var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
    var acct = '', h = -1;
    rows.forEach(function (r, i) { var t = r.join(' '); var m = t.match(/MN\d{2}\s?0*\d{4}\s?0*(\d{10})/) || t.match(/MN\d{18}/); if (m && !acct) acct = (m[1] || m[0]).slice(-10); if (h < 0 && r.some(function (c) { return /Гүйлгээний огноо/.test(c); })) h = i; });
    if (h < 0) { toast('Хаан банкны хуулга биш байна («Гүйлгээний огноо» багана олдсонгүй)'); return; }
    if (!acct) { var mm = f.name.match(/(\d{10})/); acct = mm ? mm[1] : ''; }
    var col = {}; rows[h].forEach(function (c, i) { col[String(c).trim()] = i; });
    var gi = function (re) { var k = Object.keys(col).filter(function (x) { return re.test(x); })[0]; return k === undefined ? -1 : col[k]; };
    var cD = gi(/огноо/i), cCr = gi(/кредит/i), cDb = gi(/дебит/i), cBal = gi(/эцсийн/i), cDesc = gi(/утга/i), cParty = gi(/харьцсан/i);
    var info = bankAcctInfo(acct);
    var biz = info ? info.biz : prompt('Энэ данс (' + acct + ') аль компанийнх вэ? ' + KEYS.join(' / '), 'cozy');
    if (!BUSINESSES[biz]) { toast('Компани буруу'); return; }
    var num = function (v) { var n = Number(String(v).replace(/[,\s]/g, '')); return isFinite(n) ? n : 0; };
    var lines = [];
    rows.slice(h + 1).forEach(function (r) {
      var dt = String(r[cD] || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}/.test(dt)) return;
      var cr = Math.abs(num(r[cCr])), db = Math.abs(num(r[cDb])), desc = String(r[cDesc] || '').trim();
      lines.push({ id: acct + '|' + dt + '|' + cr + '|' + db + '|' + desc.slice(0, 40), acct: acct, date: dt, credit: cr, debit: db, bal: num(r[cBal]), desc: desc, party: String(r[cParty] || '').trim(), biz: biz });
    });
    if (!lines.length) { toast('Гүйлгээ олдсонгүй'); return; }
    var fresh = lines.filter(function (l) { return !bankLines.some(function (b) { return b.id === l.id; }); });
    if (!API_URL) { fresh.forEach(function (l) { l.status = 'Шинэ'; bankLines.push(l); }); save('nb_demo_bank', bankLines); state.biz = biz; render(); toast(fresh.length + ' шинэ гүйлгээ'); return; }
    post({ type: 'admin_bank', by: ownerName, lines: fresh }, function (err, d) {
      if (err) { toast('Алдаа: ' + err); return; }
      toast(d.added + ' шинэ гүйлгээ орлоо (' + (lines.length - d.added) + ' өмнө нь орсон)'); refresh();
    });
  };
  rd.readAsArrayBuffer(f);
}

// ── Тааруулах ──
function ordCust(o) { return (o.customer ? o.customer + ' ' : '') + o.phone; }
function bankMatch(l) {
  var phones = (l.desc.replace(/(\d{4})\s(\d{4})/g, '$1$2').match(/\d{8}/g) || []), eb = /EB-?\s?\d{8}/i.test(l.desc);
  var list = (window.adminOrders || []).filter(function (o) { return o.biz === l.biz && o.status !== 'Цуцалсан'; });
  var byPhone = list.filter(function (o) { return phones.indexOf(String(o.phone).replace(/\D/g, '')) >= 0 || phones.indexOf(String(o.phone2 || '').replace(/\D/g, '')) >= 0; });
  var unpaid = byPhone.filter(function (o) { return o.paid !== 'Орсон'; });
  var exact = unpaid.filter(function (o) { return Math.abs(o.amount - l.credit) < 1; });
  if (exact.length) return { kind: 'order', o: exact[0], sure: true, eb: eb };
  if (eb && unpaid.length) { var o2 = unpaid.filter(function (o) { return o.amount > l.credit; })[0]; if (o2) return { kind: 'order', o: o2, sure: true, eb: true, fee: o2.amount - l.credit }; }
  if (unpaid.length) return { kind: 'order', o: unpaid[0], sure: false, eb: eb, fee: eb ? unpaid[0].amount - l.credit : 0 };
  if (byPhone.length) return { kind: 'paid', o: byPhone[0] };   // аль хэдийн «орсон» гэж тэмдэглэгдсэн
  var amt = list.filter(function (o) { return o.paid !== 'Орсон' && Math.abs(o.amount - l.credit) < 1; });
  if (amt.length === 1) return { kind: 'order', o: amt[0], sure: false };
  return null;
}
function bankSuggest(l) {
  if (l.credit) { var m = bankMatch(l); if (m) return m; return { kind: 'acc', acc: '' }; }
  var r = BANK_RULES.filter(function (x) { return x[0].test(l.desc); })[0];
  return { kind: 'acc', acc: r ? r[1] : '' };
}

// ── Дэлгэц ──
function bankView() {
  var biz = state.biz, all = bankLines.filter(function (l) { return l.biz === biz; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var todo = all.filter(function (l) { return l.status === 'Шинэ'; });
  var list = bankTab === 'todo' ? todo : bankTab === 'done' ? all.filter(function (l) { return l.status !== 'Шинэ'; }) : all;
  var last = all.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
  var info = last ? bankAcctInfo(last.acct) : null, acc = info ? info.acc : '1101';
  var ledger = balances(J(), todayStr())[acc] || 0;
  var sure = todo.filter(function (l) { var s = bankSuggest(l); return (s.kind === 'order' && s.sure) || s.kind === 'paid'; }).length;
  var pay = (window.payInfoAll || {})[biz] || '';
  var head = '<div class="kpis">' + kpi('Тулгах гүйлгээ', todo.length) +
    (last ? kpi('Хуулгын үлдэгдэл (' + last.date.slice(0, 10) + ')', fmt(last.bal)) + kpi('Санхүүгийн ' + acc + ' үлдэгдэл', fmt(ledger), Math.abs(last.bal - ledger) < 1 ? '<span style="color:var(--green)">Таарч байна</span>' : '<span style="color:var(--red)">Зөрүү ' + fmt(last.bal - ledger) + '</span>') : '') + '</div>';
  var tabs = '<div class="tabs" style="margin-bottom:10px">' + [['todo', 'Тулгах'], ['done', 'Тулгасан'], ['all', 'Бүгд']].map(function (t) {
    return '<button class="' + (bankTab === t[0] ? 'on' : '') + '" onclick="bankTab=\'' + t[0] + '\';render()">' + t[1] + '</button>'; }).join('') + '</div>';
  var rows = list.map(function (l) {
    var s = l.status === 'Шинэ' ? bankSuggest(l) : null, sel = '';
    if (s) {
      var opts = [], cur = bankPick[l.id];
      if (l.credit) {
        (window.adminOrders || []).filter(function (o) { return o.biz === biz && o.paid !== 'Орсон' && o.status !== 'Цуцалсан'; }).forEach(function (o) {
          opts.push(['O:' + o.id, 'Захиалга ' + o.phone + ' · ' + fmt(o.amount) + ' · ' + o.status]); });
        BANK_IN.forEach(function (a) { opts.push([a[0] === 'skip' ? 'skip' : 'A:' + a[0], a[1]]); });
        if (s.kind === 'paid') opts.unshift(['P:' + s.o.id, 'Аль хэдийн бүртгэгдсэн: ' + s.o.phone + ' (давхар бичихгүй)']);
      } else BANK_OUT.forEach(function (a) { opts.push([a[0] === 'skip' ? 'skip' : 'A:' + a[0], a[1]]); });
      var def = cur || (s.kind === 'order' ? 'O:' + s.o.id : s.kind === 'paid' ? 'P:' + s.o.id : s.acc ? 'A:' + s.acc : '');
      bankPick[l.id] = def;
      sel = '<select onchange="bankPick[\'' + esc(l.id) + '\']=this.value" style="max-width:260px"><option value="">— Сонгох —</option>' + opts.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (o[0] === def ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' +
        (s.kind === 'order' ? ' <small class="muted">санал: ' + (s.sure ? 'утас, дүн таарсан' : 'шалгаж сонгоно уу') + (s.fee > 0 ? ' · буухиагийн хөлс ' + fmt(s.fee) : '') + '</small>' : '');
    }
    return '<tr><td>' + esc(l.date) + '</td><td>' + esc(l.desc) + '</td><td class="n" style="color:var(--green)">' + (l.credit ? '+' + fmt(l.credit).slice(1) : '') + '</td>' +
      '<td class="n neg">' + (l.debit ? '−' + fmt(l.debit).slice(1) : '') + '</td><td>' + (s ? sel : '<span class="tag">' + esc(l.status) + '</span> <small class="muted">' + esc(l.link) + '</small>') + '</td>' +
      '<td class="n">' + (s ? '<button class="mini" style="color:var(--accent)" onclick="bankApply([\'' + esc(l.id) + '\'])">Тулгах</button>' : '') + '</td></tr>';
  }).join('');
  return head + '<div class="card"><h2>Төлбөрийн мэдээлэл (хэрэглэгчид илгээх мессежид)</h2><div class="bar-row"><input id="payInfo" value="' + esc(pay) + '" placeholder="Жишээ: Хаан банк 53xxxxxxxx (Н.Анужин)" style="flex:1;min-width:220px">' +
    '<button class="b-btn" onclick="savePayInfo()">Хадгалах</button></div><p class="muted" style="font-size:12.5px;margin-top:6px">Ажилтан захиалга бүртгэхэд «Төлбөрийн мессеж»-д энэ данс, дүн, «Гүйлгээний утга: утасны дугаар» бичигдэнэ — тулгалт автоматаар таарна.</p></div>' +
    tabs + '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Гүйлгээний утга</th><th class="n">Орлого</th><th class="n">Зарлага</th><th>Юутай тулгах</th><th></th></tr>' +
    (rows || '<tr><td colspan="6" class="muted">' + (all.length ? 'Тулгах гүйлгээ алга' : 'Хуулга оруулаагүй байна — «Хуулга оруулах» дарна уу') + '</td></tr>') + '</table></div></div>';
}
function savePayInfo() {
  var v = $('payInfo').value.trim();
  window.payInfoAll = window.payInfoAll || {}; window.payInfoAll[state.biz] = v;
  if (!API_URL) { save('nb_demo_payinfo', window.payInfoAll); toast('Хадгалагдлаа'); return; }
  post({ type: 'admin_setting', biz: state.biz, payInfo: v }, function (err) { toast(err ? 'Алдаа: ' + err : 'Хадгалагдлаа'); });
}
function bankApplyAll() {
  var ids = bankLines.filter(function (l) { if (l.biz !== state.biz || l.status !== 'Шинэ') return false; var s = bankSuggest(l); return (s.kind === 'order' && s.sure) || s.kind === 'paid'; }).map(function (l) { return l.id; });
  if (!ids.length) { toast('Таарсан гүйлгээ алга'); return; }
  if (!confirm(ids.length + ' таарсан гүйлгээг тулгах уу?')) return;
  bankApply(ids, true);
}
// Сонголтын дагуу: захиалга → «Төлбөр орсон» + журнал; данс → кассын/харилцахын баримт; алгасах → тэмдэглэнэ
function bankApply(ids, quiet) {
  if (!quiet && ids.length === 1) {   // хэрэглэгчээс баталгаажуулна
    var l0 = bankLines.filter(function (x) { return x.id === ids[0]; })[0], p0 = bankPick[ids[0]] || '';
    if (l0 && p0 && p0 !== 'skip') {
      var what = p0.indexOf('O:') === 0 ? 'захиалга ' + (((window.adminOrders || []).filter(function (o) { return o.id === p0.slice(2); })[0]) || {}).phone + ' — «Төлбөр орсон»' :
                 p0.indexOf('P:') === 0 ? 'өмнө бүртгэгдсэн захиалга (давхар бичихгүй)' : p0.slice(2) + ' ' + accName(p0.slice(2));
      if (!confirm(l0.date + ' · ' + (l0.credit ? '+' + fmt(l0.credit) : '−' + fmt(l0.debit)) + '\n«' + l0.desc + '»\n\n→ ' + what + '\n\nТулгах уу?')) return;
    }
  }
  var entries = [], orderUpd = [], updates = [], biz = state.biz;
  ids.forEach(function (id) {
    var l = bankLines.filter(function (x) { return x.id === id; })[0]; if (!l) return;
    var pick = bankPick[id] || '', info = bankAcctInfo(l.acct), acc = info ? info.acc : '1101', d = l.date.slice(0, 10), amt = l.credit || l.debit;
    if (!pick) { if (!quiet) toast('Юутай тулгахаа сонгоно уу'); return; }
    if (pick === 'skip') { updates.push({ id: id, status: 'Алгассан', link: '' }); return; }
    if (pick.indexOf('P:') === 0) { updates.push({ id: id, status: 'Тулгасан', link: 'Захиалга ' + pick.slice(2) + ' (өмнө бүртгэгдсэн)' }); return; }
    if (pick.indexOf('O:') === 0) {
      var o = (window.adminOrders || []).filter(function (x) { return x.id === pick.slice(2); })[0]; if (!o) return;
      var fee = /EB-?\s?\d{8}/i.test(l.desc) && o.amount > l.credit ? o.amount - l.credit : 0;
      var sold = String(o.saleDone || '');
      if (sold === 'yes:Зээлээр') {   // авлага хаана (+ буухиагийн хөлс)
        entries.push({ biz: biz, date: d, dr: acc, cr: '1201', amount: l.credit, partner: ordCust(o), desc: 'Захиалгын төлбөр (банк) · ' + o.phone });
        if (fee) entries.push({ biz: biz, date: d, dr: '7207', cr: '1201', amount: fee, partner: ordCust(o), desc: 'Буухиагийн хөлс · ' + o.phone });
      } else if (sold === 'imported' || sold === '') {
        if (sold === 'imported') {   // хуучин хүснэгтийн захиалга — борлуулалтыг энд бичнэ
          entries.push({ biz: biz, date: d, dr: acc, cr: '5101', amount: l.credit + fee, partner: '', desc: 'Захиалгын борлуулалт (хуучин) · ' + o.phone });
          if (fee) entries.push({ biz: biz, date: d, dr: '7207', cr: acc, amount: fee, partner: '', desc: 'Буухиагийн хөлс · ' + o.phone });
        }   // «Шинэ» (урьдчилж төлсөн) — борлуулалт буухиад өгөхөд бичигдэнэ
      }
      orderUpd.push({ id: o.id, fields: { paid: 'Орсон', saleDone: sold === 'imported' ? 'yes:bank' : undefined, note: 'Банк ' + d } });
      o.paid = 'Орсон'; if (sold === 'imported') o.saleDone = 'yes:bank';
      updates.push({ id: id, status: 'Тулгасан', link: 'Захиалга ' + o.phone });
      return;
    }
    var a2 = pick.slice(2);
    entries.push(l.credit ? { biz: biz, date: d, dr: acc, cr: a2, amount: amt, desc: l.desc.slice(0, 120) || 'Банкны орлого', partner: '' }
                          : { biz: biz, date: d, dr: a2, cr: acc, amount: amt, desc: l.desc.slice(0, 120) || 'Банкны зарлага', partner: '' });
    updates.push({ id: id, status: 'Тулгасан', link: a2 + ' ' + accName(a2) });
  });
  if (!updates.length) return;
  if (!API_URL) {
    entries.forEach(function (e, i) { e.id = 'J' + Date.now() + '-' + i; e.by = ownerName; journal.push(e); });
    updates.forEach(function (u) { bankLines.forEach(function (l) { if (l.id === u.id) { l.status = u.status; l.link = u.link; } }); });
    save('nb_demo_journal', journal); save('nb_demo_bank', bankLines); save('nb_orders_cozy', window.adminOrders); render(); toast(updates.length + ' гүйлгээ тулгагдлаа'); return;
  }
  var n = 1 + orderUpd.length + (entries.length ? 1 : 0), fin = function () { if (--n === 0) { toast(updates.length + ' гүйлгээ тулгагдлаа'); refresh(); } };
  if (entries.length) post({ type: 'admin_journal', by: ownerName, entries: entries }, function (err) { if (err) toast('Журнал: ' + err); fin(); });
  orderUpd.forEach(function (u) { post({ type: 'admin_order', id: u.id, by: ownerName, fields: u.fields }, function () { fin(); }); });
  post({ type: 'admin_bank', by: ownerName, updates: updates }, function (err) { if (err) toast('Алдаа: ' + err); fin(); });
}
