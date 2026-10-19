// ── БАНКНЫ ХУУЛГА: Хаан банкны Excel хуулгыг оруулж захиалга, авлага, зардалтай тулгах ──
// 1) Хуулга оруулах → мөрүүд «Банк» хуудсанд давхардалгүй хадгалагдана
// 2) Орлого бүрийг гүйлгээний утган дахь утасны дугаар / «EB-утас» (буухиа) / дүнгээр захиалгатай тааруулна
// 3) Систем зөвхөн САНАЛ болгоно — мөр бүрийг хэрэглэгч өөрөө шалгаж «Тулгах» дарна (автоматаар юу ч бичихгүй)
// 4) Хуулгын эцсийн үлдэгдэл = санхүүгийн харилцах дансны үлдэгдэл эсэхийг шалгана

var bankLines = [], bankTab = 'todo', bankPick = {};
var BANK_IN = [['5201', 'Бусад орлого'], ['5101', 'Борлуулалт (системээс гадуур)'], ['4101', 'Хөрөнгө оруулалт (эзэн, хөрөнгө оруулагч)'], ['1201', 'Авлага орж ирсэн'],
  ['3501', 'Зээл авсан (бүртгэлгүй)'], ['5202', 'Хүүгийн орлого'], ['1208', 'Захирал хувийн зарлагаа буцааж төлсөн'], ['10003', 'Кассаас тушаасан'], ['skip', 'Тулгахгүй (алгасах)']];
var BANK_OUT = [['7205', 'Зар сурталчилгаа (boost)'], ['7301', 'Банкны шимтгэл, бусад зардал'], ['1404', 'Бараа татан авалт'], ['3101', 'Нийлүүлэгчид төлсөн'], ['7207', 'Хүргэлт (буухиа)'],
  ['7201', 'Түрээс'], ['7202', 'Цахилгаан, ус'], ['3301', 'Цалин олгосон'], ['3403', 'НДШ төлсөн'], ['3404', 'ХХОАТ төлсөн'], ['1208', 'Захирлын хувийн зарлага'],
  ['3501', 'Зээл төлсөн (бүртгэлгүй)'], ['7401', 'Зээлийн хүү'], ['4101', 'Эзэн мөнгө авсан'], ['10003', 'Касс руу бэлэн гаргасан'], ['skip', 'Тулгахгүй (алгасах)']];
var BANK_RULES = [[/boost|реклам|фэйсбүүк|facebook|meta|зар/i, '7205'], [/хураамж|шимтгэл|fee/i, '7301'], [/түрээс/i, '7201'], [/цалин/i, '3301'], [/ндш|даатгал/i, '3403'],
  [/цахилгаан|ус хангамж|дулаан/i, '7202'], [/буухиа|ebuuhia|хүргэлт/i, '7207'], [/зээл/i, '3501']];

// Данс → компани: эхлээд «Данс холбох»-оор холбосон (Script Properties), дараа нь config.js
function bankAcctInfo(acct) {
  var d = String(acct || '').replace(/\D/g, '');
  var l = (window.bankLinks || []).filter(function (x) {
    var n = String(x.no); if (!d) return false;
    if (n.length <= 4 || d.length <= 4) return n.slice(-4) === d.slice(-4);   // сүүлийн 4 оронгоор холбосон
    return d.length >= n.length ? d.slice(-n.length) === n : n.slice(-d.length) === d;
  })[0];
  if (l) return { biz: l.biz, acc: l.acc, name: l.name };
  var k = Object.keys(BANK_ACCOUNTS).filter(function (x) { return String(acct).slice(-4) === x; })[0]; return k ? BANK_ACCOUNTS[k] : null;
}

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
    if (!info) { toast('Энэ данс (****' + String(acct).slice(-4) + ') холбогдоогүй байна — эхлээд «Данс холбох» хийнэ үү'); openBankLink(String(acct)); return; }
    var biz = info.biz;
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
  // баталгаажаагүй захиалгууд; ажилтан «орсон» гэж тэмдэглэснийг эхэнд
  var unpaid = byPhone.filter(function (o) { return !o.confirmed; }).sort(function (a, b) { return (b.paid === 'Орсон') - (a.paid === 'Орсон'); });
  var exact = unpaid.filter(function (o) { return Math.abs(o.amount - l.credit) < 1; });
  if (exact.length) return { kind: 'order', o: exact[0], sure: true, eb: eb };
  if (eb && unpaid.length) { var o2 = unpaid.filter(function (o) { return o.amount > l.credit; })[0]; if (o2) return { kind: 'order', o: o2, sure: true, eb: true, fee: o2.amount - l.credit }; }
  if (unpaid.length) return { kind: 'order', o: unpaid[0], sure: false, eb: eb, fee: eb ? unpaid[0].amount - l.credit : 0 };
  if (byPhone.length) return { kind: 'paid', o: byPhone[0] };   // аль хэдийн баталгаажсан
  var amt = list.filter(function (o) { return !o.confirmed && Math.abs(o.amount - l.credit) < 1; });
  if (amt.length === 1) return { kind: 'order', o: amt[0], sure: false };
  return null;
}
function bankSuggest(l) {
  if (l.credit) { var m = bankMatch(l); if (m) return m; var dc = debtByName(l, debtCache().rec); if (dc) return dc; var lc = loanSuggest(l); if (lc) return lc; return { kind: 'acc', acc: '' }; }
  var dd = debtByName(l, debtCache().pay); if (dd) return dd;
  var ln = loanSuggest(l); if (ln) return ln;
  var r = BANK_RULES.filter(function (x) { return x[0].test(l.desc); })[0];
  return { kind: 'acc', acc: r ? r[1] : '' };
}
// Гүйлгээний утганд харилцагчийн нэр байвал тэр өр / авлагыг санал болгоно (хамгийн хуучныг)
// JS мөр доторх утга (гүйлгээний утганд ' байвал товч эвдэрхгүй)
function jsq(s) { return esc(String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")); }
function loanSuggest(l) {
  var d = String(l.desc || '').toLowerCase(), opts = loanOpts(l.biz, !!l.credit).filter(function (o) { return o[0] !== 'LN:new'; });
  var byName = opts.filter(function (o) { var L = loanById(o[0].slice(2)); return L && L.partner.length >= 3 && d.indexOf(L.partner.toLowerCase()) >= 0; });
  var pick = byName.length === 1 ? byName[0] : (/зээл/.test(d) && opts.length === 1 ? opts[0] : null);
  return pick ? { kind: 'debt', v: pick[0] } : null;
}
function debtByName(l, list) {
  var d = String(l.desc || '').toLowerCase();
  var it = list.filter(function (x) { return !x.np && x.who.length >= 3 && d.indexOf(x.who.toLowerCase()) >= 0; })[0];
  return it ? { kind: 'debt', v: 'D:' + it.acc + '|' + it.key, it: it } : null;
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
      var opts = [], cur = bankPick[l.id];   // [утга, нэр, бүлэг]
      if (l.credit) {
        if (s.kind === 'paid') opts.push(['P:' + s.o.id, 'Аль хэдийн баталгаажсан: ' + s.o.phone + ' (давхар бичихгүй)', 'Захиалгын төлбөр']);
        (window.adminOrders || []).filter(function (o) { return o.biz === biz && !o.confirmed && o.status !== 'Цуцалсан'; }).forEach(function (o) {
          opts.push(['O:' + o.id, 'Захиалга ' + o.phone + ' · ' + fmt(o.amount) + ' · ' + o.status + (o.paid === 'Орсон' ? ' · ажилтан: орсон' : ''), 'Захиалгын төлбөр']); });
        debtCache().rec.forEach(function (it) { opts.push(['D:' + it.acc + '|' + it.key, debtLabel(it), 'Авлага хаах']); });
        loanOpts(biz, true).forEach(function (o) { opts.push(o); });
        icOpts(biz, true).forEach(function (o) { opts.push(o.concat(['Компани хооронд'])); });
        BANK_IN.forEach(function (a) { opts.push([a[0] === 'skip' ? 'skip' : 'A:' + a[0], a[1], 'Бусад']); });
      } else {
        debtCache().pay.forEach(function (it) { opts.push(['D:' + it.acc + '|' + it.key, debtLabel(it), 'Өглөг хаах']); });
        poOpts(biz).forEach(function (o) { opts.push(o.concat(['Бараа захиалга'])); });
        loanOpts(biz, false).forEach(function (o) { opts.push(o); });
        icOpts(biz, false).forEach(function (o) { opts.push(o.concat(['Компани хооронд'])); });
        BANK_OUT.forEach(function (a) { opts.push([a[0] === 'skip' ? 'skip' : 'A:' + a[0], a[1], 'Бусад']); });
      }
      var def = cur || (s.kind === 'order' ? 'O:' + s.o.id : s.kind === 'paid' ? 'P:' + s.o.id : s.kind === 'debt' ? s.v : s.acc ? 'A:' + s.acc : '');
      bankPick[l.id] = def;
      var iv = loanIntSuggest(def, l);
      var groups = [], byG = {};
      opts.forEach(function (o) { var g = o[2] || 'Бусад'; if (!byG[g]) { byG[g] = []; groups.push(g); } byG[g].push(o); });
      sel = '<select onchange="bankPick[\'' + jsq(l.id) + '\']=this.value;bankPickChange(\'' + jsq(l.id) + '\')" style="max-width:280px"><option value="">— Сонгох —</option>' + groups.map(function (g) {
        return '<optgroup label="' + esc(g) + '">' + byG[g].map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === def ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</optgroup>';
      }).join('') + '</select>' +
        '<small class="muted bk-int" id="bi_' + esc(l.id) + '" style="display:' + (iv === null ? 'none' : 'block') + '">' + esc(iv || '') + '</small>' +
        (s.kind === 'order' ? ' <small class="muted">санал: ' + (s.sure ? 'утас, дүн таарсан' : 'шалгаж сонгоно уу') + (s.fee > 0 ? ' · буухиагийн хөлс ' + fmt(s.fee) : '') + '</small>' : '') +
        (s.kind === 'debt' ? ' <small class="muted">санал: нэр таарсан — шалгаж сонгоно уу</small>' : '');
    }
    return '<tr><td>' + esc(l.date) + '</td><td>' + esc(l.desc) + '</td><td class="n" style="color:var(--green)">' + (l.credit ? '+' + fmt(l.credit).slice(1) : '') + '</td>' +
      '<td class="n neg">' + (l.debit ? '−' + fmt(l.debit).slice(1) : '') + '</td><td>' + (s ? sel : '<span class="tag">' + esc(l.status) + '</span> <small class="muted">' + esc(l.link) + '</small>') + '</td>' +
      '<td class="n">' + (s ? '<button class="mini" style="color:var(--accent)" onclick="bankApply([\'' + jsq(l.id) + '\'])">Тулгах</button>' : '') + '</td></tr>';
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
  if (!quiet && ids.length === 1 && bankPick[ids[0]] === 'LN:new') { openLoanFromBank(ids[0]); return; }   // шинэ зээл үүсгэж тулгана
  if (!quiet && ids.length === 1) {   // хэрэглэгчээс баталгаажуулна
    var l0 = bankLines.filter(function (x) { return x.id === ids[0]; })[0], p0 = bankPick[ids[0]] || '';
    if (l0 && p0 && p0 !== 'skip') {
      var what = p0.indexOf('O:') === 0 ? 'захиалга ' + (((window.adminOrders || []).filter(function (o) { return o.id === p0.slice(2); })[0]) || {}).phone + ' — төлбөрийг баталгаажуулж санхүүд бичнэ' :
                 p0.indexOf('P:') === 0 ? 'өмнө баталгаажсан захиалга (давхар бичихгүй)' :
                 p0.indexOf('D:') === 0 ? (bankDebt(p0) ? debtLabel(bankDebt(p0)) + ' — хаана' : 'өр / авлага') :
                 /^(IC|L|PO):/.test(p0) ? ([].filter.call(document.querySelectorAll('option'), function (o) { return o.value === p0; })[0] || {}).textContent || p0 :
                 p0.slice(2) + ' ' + accName(p0.slice(2));
      if (!confirm(l0.date + ' · ' + (l0.credit ? '+' + fmt(l0.credit) : '−' + fmt(l0.debit)) + '\n«' + l0.desc + '»\n\n→ ' + what + '\n\nТулгах уу?')) return;
    }
  }
  var entries = [], orderUpd = [], updates = [], biz = state.biz, loanCloseIds = [];
  ids.forEach(function (id) {
    var l = bankLines.filter(function (x) { return x.id === id; })[0]; if (!l) return;
    var pick = bankPick[id] || '', info = bankAcctInfo(l.acct), acc = info ? info.acc : '1101', d = l.date.slice(0, 10), amt = l.credit || l.debit;
    if (!pick) { if (!quiet) toast('Юутай тулгахаа сонгоно уу'); return; }
    if (pick === 'skip') { updates.push({ id: id, status: 'Алгассан', link: '' }); return; }
    if (pick === 'LN:new') return;   // нэг нэгээр нь (цонхоор) тулгана
    if (pick.indexOf('P:') === 0) { updates.push({ id: id, status: 'Тулгасан', link: 'Захиалга ' + pick.slice(2) + ' (өмнө бүртгэгдсэн)' }); return; }
    if (pick.indexOf('O:') === 0) {
      var o = (window.adminOrders || []).filter(function (x) { return x.id === pick.slice(2); })[0]; if (!o) return;
      var fee = /EB-?\s?\d{8}/i.test(l.desc) && o.amount > l.credit ? o.amount - l.credit : 0;
      var pe = orderPayEntries(o, biz, acc, d, l.credit, fee, '7207', 'банк');
      entries = entries.concat(pe.entries);
      orderUpd.push({ id: o.id, fields: { confirmed: d + ' банк', saleDone: pe.saleDone, note: 'Банк ' + d } });
      o.paid = 'Орсон'; o.confirmed = d + ' банк'; if (pe.saleDone) o.saleDone = pe.saleDone;
      updates.push({ id: id, status: 'Тулгасан', link: 'Захиалга ' + o.phone + ' #' + o.id });
      return;
    }
    if (pick.indexOf('IC:') === 0) {   // компани хооронд (1290, харилцагч = нөгөө компани)
      var ob = pick.slice(3), on = BUSINESSES[ob] ? BUSINESSES[ob].name : ob;
      entries.push(l.credit ? { biz: biz, date: d, dr: acc, cr: '1290', amount: amt, desc: (l.desc.slice(0, 100) || 'Компани хооронд') + ' · ' + on + '-аас', partner: on }
                            : { biz: biz, date: d, dr: '1290', cr: acc, amount: amt, desc: (l.desc.slice(0, 100) || 'Компани хооронд') + ' · ' + on + ' руу', partner: on });
      updates.push({ id: id, status: 'Тулгасан', link: 'Компани хооронд · ' + on });
      return;
    }
    if (pick.indexOf('L:') === 0) {   // зээл: орсон / төлсөн (үндсэн + хүү)
      var le = loanEntries(pick.slice(2), l.credit ? 'in' : 'out', acc, d, amt, null, l.desc.slice(0, 80));   // үндсэн / хүүг хуваариар автоматаар
      if (!le) return;
      entries = entries.concat(le.entries); updates.push({ id: id, status: 'Тулгасан', link: le.link });
      if (le.closes) loanCloseIds.push(pick.slice(2));
      return;
    }
    if (pick.indexOf('PO:') === 0) {   // бараа захиалгын төлбөр / карго (1505)
      var pe2 = poPayEntry(pick.slice(3), acc, d, amt, l.desc.slice(0, 80));
      if (!pe2) return;
      entries.push(pe2.entry); updates.push({ id: id, status: 'Тулгасан', link: pe2.link });
      return;
    }
    if (pick.indexOf('D:') === 0) {   // сонгосон өглөг / авлагыг хаана (#лавлагаагаар яг тэр өр)
      var it = bankDebt(pick); if (!it) return;
      var tag = ' #' + debtTag(it), pn = it.np ? '' : it.who;
      entries.push(l.credit ? { biz: biz, date: d, dr: acc, cr: it.acc, amount: amt, desc: (l.desc.slice(0, 100) || 'Авлага төлөгдсөн') + tag, partner: pn }
                            : { biz: biz, date: d, dr: it.acc, cr: acc, amount: amt, desc: (l.desc.slice(0, 100) || 'Өглөг төлсөн') + tag, partner: pn });
      updates.push({ id: id, status: 'Тулгасан', link: (it.acc === '1201' ? 'Авлага · ' : /^35/.test(it.acc) ? 'Зээл · ' : 'Өглөг · ') + it.who });
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
    loanCloseIds.forEach(function (lid) { var L = loanById(lid); if (L) L.status = 'Хаагдсан'; }); if (loanCloseIds.length) save('nb_demo_loans', window.loans);
    save('nb_demo_journal', journal); save('nb_demo_bank', bankLines); save('nb_orders_cozy', window.adminOrders); render(); toast(updates.length + ' гүйлгээ тулгагдлаа'); return;
  }
  var n = 1 + orderUpd.length + loanCloseIds.length + (entries.length ? 1 : 0), fin = function () { if (--n === 0) { toast(updates.length + ' гүйлгээ тулгагдлаа'); refresh(); } };
  loanCloseIds.forEach(function (lid) { post({ type: 'admin_loan', closeId: lid }, function () { fin(); }); });
  if (entries.length) post({ type: 'admin_journal', by: ownerName, entries: entries }, function (err) { if (err) toast('Журнал: ' + err); fin(); });
  orderUpd.forEach(function (u) { post({ type: 'admin_order', id: u.id, by: ownerName, fields: u.fields }, function () { fin(); }); });
  post({ type: 'admin_bank', by: ownerName, updates: updates }, function (err) { if (err) toast('Алдаа: ' + err); fin(); });
}

function bankDebt(pick) {
  var v = pick.slice(2), acc = v.split('|')[0], key = v.slice(acc.length + 1), c = debtCache();
  return c.rec.concat(c.pay).filter(function (x) { return x.acc === acc && x.key === key; })[0] || null;
}
// ═══════════ ЗАХИАЛГЫН ТӨЛБӨР (зөвхөн удирдлага) ═══════════
// received — орж ирсэн мөнгө; diff — зөрүү (буухиагийн хөлс 7207 эсвэл хөнгөлөлт 6001); бичилт бүрийн утганд «#захиалгын ID» — буцаахад олдоно.
function orderPayEntries(o, biz, acc, d, received, diff, diffAcc, how) {
  var sold = String(o.saleDone || ''), E = [], sd, tag = ' · ' + o.phone + ' #' + o.id, cust = ordCust(o);
  if (sold === 'yes:Зээлээр') {   // бараа өгсөн, мөнгө нь авлага → авлага хаагдана
    E.push({ biz: biz, date: d, dr: acc, cr: '1201', amount: received, partner: cust, desc: 'Захиалгын төлбөр (' + how + ')' + tag });
    if (diff) E.push({ biz: biz, date: d, dr: diffAcc, cr: '1201', amount: diff, partner: cust, desc: (diffAcc === '7207' ? 'Буухиагийн хөлс' : 'Хөнгөлөлт') + tag });
  } else if (sold === 'imported') {   // хуучин хүснэгтийн захиалга — борлуулалт энд бичигдэнэ
    E.push({ biz: biz, date: d, dr: acc, cr: '5101', amount: received, partner: '', desc: 'Захиалгын борлуулалт (хуучин)' + tag });
    if (diff) E.push({ biz: biz, date: d, dr: diffAcc, cr: '5101', amount: diff, partner: '', desc: (diffAcc === '7207' ? 'Буухиагийн хөлс' : 'Хөнгөлөлт') + tag });
    sd = 'yes:bank';
  } else if (!/^yes:|^returned$/.test(sold)) {   // бараа хараахан өгөөгүй — урьдчилгаа; бараа өгөхөд орлого болно
    E.push({ biz: biz, date: d, dr: acc, cr: '3802', amount: received, partner: cust, desc: 'Захиалгын урьдчилгаа (' + how + ')' + tag });
    if (diff) E.push({ biz: biz, date: d, dr: diffAcc, cr: '3802', amount: diff, partner: cust, desc: (diffAcc === '7207' ? 'Буухиагийн хөлс' : 'Хөнгөлөлт') + tag });
  }
  return { entries: E.filter(function (e) { return e.amount > 0; }), saleDone: sd };
}
var payOrd = null;
function openPayOrder(id) {
  payOrd = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0]; if (!payOrd) return;
  $('poInfo').textContent = payOrd.phone + (payOrd.customer ? ' · ' + payOrd.customer : '') + ' · ' + fmt(payOrd.amount) + ' · ' + payOrd.status;
  $('poDate').value = todayStr();
  $('poAcc').innerHTML = ACCOUNTS.filter(function (a) { return a[3] === 'cash'; }).map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === '1101' ? ' selected' : '') + '>' + a[0] + ' ' + esc(a[1]) + '</option>'; }).join('');
  $('poAmount').value = payOrd.amount; $('poDiff').value = '7207'; poCalc();
  openSheet('payOrderSheet');
}
function poCalc() { var diff = payOrd ? payOrd.amount - (Number($('poAmount').value) || 0) : 0; $('poDiffWrap').style.display = diff > 0 ? 'block' : 'none'; $('poDiffAmt').textContent = fmt(diff); }
function savePayOrder() {
  var o = payOrd, received = Number($('poAmount').value) || 0, diff = o.amount - received, d = $('poDate').value, acc = $('poAcc').value;
  if (!(received > 0)) { toast('Орж ирсэн дүнг оруулна уу'); return; }
  if (diff < 0) { toast('Орсон дүн захиалгын дүнгээс их байна — илүү мөнгийг «Кассын баримт»-аар бүртгэнэ үү'); return; }
  var pe = orderPayEntries(o, state.biz, acc, d, received, diff, $('poDiff').value, 'гараар');
  if (!confirm('Захиалга ' + o.phone + ' — ' + fmt(received) + ' орсныг баталгаажуулж санхүүд бичих үү?' + (diff ? '\nЗөрүү ' + fmt(diff) + ': ' + accName($('poDiff').value) : ''))) return;
  var fields = { confirmed: d + ' гараар', saleDone: pe.saleDone, note: 'Төлбөр ' + d };
  if (!API_URL) {
    pe.entries.forEach(function (e, i) { e.id = 'J' + Date.now() + '-' + i; e.by = ownerName; journal.push(e); });
    o.paid = 'Орсон'; o.confirmed = fields.confirmed; if (pe.saleDone) o.saleDone = pe.saleDone;
    save('nb_demo_journal', journal); save('nb_orders_cozy', window.adminOrders); closeSheet('payOrderSheet'); render(); toast('Баталгаажлаа'); return;
  }
  var go2 = function () { post({ type: 'admin_order', id: o.id, by: ownerName, fields: fields }, function (err) { if (err) { toast('Алдаа: ' + err); return; } closeSheet('payOrderSheet'); toast('Төлбөр бүртгэгдлээ'); refresh(); }); };
  if (pe.entries.length) post({ type: 'admin_journal', by: ownerName, entries: pe.entries }, function (err) { if (err) { if (err !== 'locked') toast('Алдаа: ' + err); return; } go2(); });
  else go2();
}
// Буруу тэмдэглэсэн төлбөрийг буцаах: холбоотой бичилтүүдийг цуцалж, банкны мөрийг дахин «Тулгах» болгоно
function undoPayOrder(id) {
  var o = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0]; if (!o) return;
  var js = journal.filter(function (j) { return String(j.desc).indexOf('#' + id) >= 0; });
  var bl = (typeof bankLines !== 'undefined' ? bankLines : []).filter(function (l) { return String(l.link).indexOf('#' + id) >= 0; });
  if (!confirm('Захиалга ' + o.phone + '-ийн төлбөрийн баталгааг цуцлах уу?\n\n' + (js.length ? js.length + ' санхүүгийн бичилт цуцлагдана.\n' : '') + (bl.length ? bl.length + ' банкны гүйлгээ дахин тулгах жагсаалтад орно.' : ''))) return;
  var fields = { confirmed: '', saleDone: o.saleDone === 'yes:bank' ? 'imported' : undefined, note: 'Баталгаа цуцалсан ' + todayStr() };
  if (!API_URL) {
    var ids = {}; js.forEach(function (j) { ids[j.id] = 1; }); journal = journal.filter(function (j) { return !ids[j.id]; });
    bl.forEach(function (l) { l.status = 'Шинэ'; l.link = ''; });
    o.confirmed = ''; if (o.saleDone === 'yes:bank') o.saleDone = 'imported';
    save('nb_demo_journal', journal); save('nb_demo_bank', bankLines); save('nb_orders_cozy', window.adminOrders); render(); return;
  }
  var n = js.length + 1 + (bl.length ? 1 : 0), fin = function () { if (--n === 0) { toast('Буцаагдлаа'); refresh(); } };
  js.forEach(function (j) { post({ type: 'admin_journal', cancelId: j.id }, function () { fin(); }); });
  if (bl.length) post({ type: 'admin_bank', by: ownerName, updates: bl.map(function (l) { return { id: l.id, status: 'Шинэ', link: '' }; }) }, function () { fin(); });
  post({ type: 'admin_order', id: o.id, by: ownerName, fields: fields }, function () { fin(); });
}
