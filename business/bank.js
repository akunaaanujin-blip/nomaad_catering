// ── БАНКНЫ ХУУЛГА: Хаан банкны Excel хуулгыг оруулж захиалга, авлага, зардалтай тулгах ──
// 1) Хуулга оруулах → мөрүүд «Банк» хуудсанд давхардалгүй хадгалагдана
// 2) Орлого бүрийг гүйлгээний утган дахь утасны дугаар / «EB-утас» (буухиа) / дүнгээр захиалгатай тааруулна
// 3) Систем зөвхөн САНАЛ болгоно — мөр бүрийг хэрэглэгч өөрөө шалгаж «Тулгах» дарна (автоматаар юу ч бичихгүй)
// 4) Хуулгын эцсийн үлдэгдэл = санхүүгийн харилцах дансны үлдэгдэл эсэхийг шалгана

var bankLines = [], bankTab = 'todo', bankPick = {}, bankSel = {};
var BANK_IN = [['5201', 'Бусад орлого'], ['5101', 'Борлуулалт (системээс гадуур)'], ['4101', 'Хөрөнгө оруулалт (эзэн, хөрөнгө оруулагч)'], ['1201', 'Авлага орж ирсэн'],
  ['3501', 'Зээл авсан (бүртгэлгүй)'], ['5202', 'Хүүгийн орлого'], ['1208', 'Захирал хувийн зарлагаа буцааж төлсөн'], ['10003', 'Кассаас тушаасан'], ['skip', 'Тулгахгүй (алгасах)']];
// Зарлагын «Тулгах баримт»: төлбөр, шилжүүлэг + Baaz-ын зардлын данс бүлгээрээ (дансны төлөвлөгөөнөөс)
var BANK_PAY = [['1404', 'Бараа татан авалт'], ['3101', 'Нийлүүлэгчид төлсөн'], ['3301', 'Цалин олгосон'], ['3403', 'НДШ төлсөн'], ['3404', 'ХХОАТ төлсөн'],
  ['1208', 'Захирлын хувийн зарлага'], ['3501', 'Зээл төлсөн (бүртгэлгүй)'], ['4101', 'Эзэн мөнгө авсан'], ['10003', 'Касс руу бэлэн гаргасан'], ['skip', 'Тулгахгүй (алгасах)']];
function bankOutOpts() {
  var grp = function (c) { return /^70/.test(c) ? 'Ерөнхий ба удирдлагын зардал' : /^71/.test(c) ? 'Борлуулалт, маркетингийн зардал' : 'Бусад зардал'; };
  return BANK_PAY.map(function (a) { return [a[0] === 'skip' ? 'skip' : 'A:' + a[0], a[1], 'Төлбөр, шилжүүлэг']; })
    .concat(ACCOUNTS.filter(function (a) { return a[2] === 'exp' && !accHidden(a[0]); }).map(function (a) { return ['A:' + a[0], a[0] + ' ' + a[1], grp(a[0])]; }));
}
var BANK_RULES = [[/boost|реклам|фэйсбүүк|facebook|meta|зар/i, '7120'], [/хураамж|шимтгэл|fee/i, '7201'], [/түрээс/i, '7114'], [/цалин/i, '3301'],
  [/шатахуун|бензин|benzin|petrovis|шунхлай|магнай/i, '7118'], [/unitel|mobicom|skytel|gmobile|интернет|univision/i, '7106'], [/ндш|даатгал/i, '3403'],
  [/цахилгаан|ус хангамж|дулаан/i, '7111'], [/буухиа|ebuuhia|booklo|хүргэлт/i, '7124'], [/зээл/i, '3501']];

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
    // Давхардлаас сэргийлнэ: тухайн дансны хамгийн сүүлд оруулсан гүйлгээнээс хойшхыг л авна (илүү урт хуулга явуулсан ч)
    var mine = bankLines.filter(function (b) { return String(b.acct).slice(-4) === String(acct).slice(-4); });
    var lastL = mine.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).pop(), last = lastL ? lastL.date : '';
    var have = {}; mine.forEach(function (b) { have[b.id] = 1; });
    var fresh = lines.filter(function (l) { return !have[l.id] && (!last || l.date >= last); });
    var older = lines.filter(function (l) { return !have[l.id] && last && l.date < last; }).length;
    if (!fresh.length) { toast('Шинэ гүйлгээ алга — энэ дансны хуулга ' + last.slice(0, 16) + ' хүртэл аль хэдийн орсон'); return; }
    fresh.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    // Үлдэгдлийн гинж: шинэ эхний гүйлгээний өмнөх үлдэгдэл = сүүлд оруулсан үлдэгдэл байх ёстой (дутуу гүйлгээ илрүүлнэ)
    var f0 = fresh[0], before = Math.round((Number(f0.bal) - Number(f0.credit) + Number(f0.debit)) * 100) / 100;
    var gap = lastL && lastL.date !== f0.date && Math.abs(before - Number(lastL.bal)) > 0.5;
    if (!confirm('****' + String(acct).slice(-4) + ' дансны хуулга\n\n' + fresh.length + ' шинэ гүйлгээ оруулна (' + f0.date.slice(0, 16) + ' — ' + fresh[fresh.length - 1].date.slice(0, 16) + ').' +
      (last ? '\nСүүлд оруулсан: ' + last.slice(0, 16) + '.' : '') + (older ? '\n' + older + ' гүйлгээ өмнө оруулсан хугацаанд тул алгасна.' : '') +
      (gap ? '\n\nАНХААР: үлдэгдэл таарахгүй байна (сүүлийн ' + fmt(lastL.bal) + ', шинэ хуулгын эхэнд ' + fmt(before) + ') — хооронд нь гүйлгээ дутуу байж магадгүй.' : '') + '\n\nОруулах уу?')) return;
    var del = {}; (window.bankDeleted || []).forEach(function (l) { del[l.id] = 1; });   // өмнө устгасан мөрийг дахин оруулбал сэргээнэ
    var back = fresh.filter(function (l) { return del[l.id]; }).map(function (l) { return { id: l.id, status: 'Шинэ', link: '' }; });
    if (!API_URL) { fresh.forEach(function (l) { l.status = 'Шинэ'; bankLines.push(l); }); save('nb_demo_bank', bankLines); state.biz = biz; render(); toast(fresh.length + ' шинэ гүйлгээ'); return; }
    post({ type: 'admin_bank', by: ownerName, lines: fresh.filter(function (l) { return !del[l.id]; }), updates: back }, function (err, d) {
      if (err) { toast('Алдаа: ' + err); return; }
      var n = d.added + back.length; toast(n + ' шинэ гүйлгээ орлоо' + (older ? ' · ' + older + ' хуучныг алгаслаа' : '')); refresh();
    });
  };
  rd.readAsArrayBuffer(f);
}

// ── Тааруулах ──
// Банкны тулгалтын сонголт: харилцагч бүр нэг мөр (хамгийн хуучин баримтаас эхлэн FIFO хаагдана) — жишээ нь «Өглөг · Буухиа · ₮413,000 (59 баримт)»
function debtByWho(list) {
  var G = {}, out = [];
  list.forEach(function (it) { var k = it.acc + '|' + it.who; if (!G[k]) { G[k] = { it: it, n: 0, left: 0 }; out.push(G[k]); } G[k].n++; G[k].left += it.left; });
  return out.map(function (g) {
    var it = g.it, kind = it.acc === '1201' ? 'Авлага' : /^35/.test(it.acc) ? 'Зээл' : 'Өглөг';
    return ['D:' + it.acc + '|' + it.key, kind + ' · ' + it.who + ' · ' + fmt(r0(g.left)) + (g.n > 1 ? ' (' + g.n + ' баримт)' : ' (' + it.date + ')')];
  });
}
function ordCust(o) { return (o.customer ? o.customer + ' ' : '') + o.phone; }
// Захиалгын төлөх үлдэгдэл: баталгаажаагүй бол бүтэн дүн, хэсэгчлэн төлсөн бол авлагын үлдэгдэл (жишээ нь бараа 70,000 + хүргэлт 7,000-ыг тусад нь шилжүүлсэн)
function ordDue(o) { return o.confirmed ? ((debtCache().ordLeft || {})[o.id] || 0) : Number(o.amount) || 0; }
function ordOpen(o) { return !o.confirmed || ordDue(o) > 0.5; }
function bankMatch(l) {
  var phones = (l.desc.replace(/(\d{4})\s(\d{4})/g, '$1$2').match(/\d{8}/g) || []), eb = /EB-?\s?\d{8}/i.test(l.desc);
  var list = (window.adminOrders || []).filter(function (o) { return o.biz === l.biz && !ordDead(o); });
  var byPhone = list.filter(function (o) { return phones.indexOf(String(o.phone).replace(/\D/g, '')) >= 0 || phones.indexOf(String(o.phone2 || '').replace(/\D/g, '')) >= 0; });
  // баталгаажаагүй, эсвэл хэсэгчлэн төлөгдөж авлага нь үлдсэн захиалгууд; ажилтан «орсон» гэж тэмдэглэснийг эхэнд
  var unpaid = byPhone.filter(ordOpen).sort(function (a, b) { return (b.paid === 'Орсон') - (a.paid === 'Орсон'); });
  var exact = unpaid.filter(function (o) { return Math.abs(ordDue(o) - l.credit) < 1; });
  if (exact.length) return { kind: 'order', o: exact[0], sure: true, eb: eb };
  if (eb && unpaid.length) { var o2 = unpaid.filter(function (o) { return o.amount > l.credit; })[0]; if (o2) return { kind: 'order', o: o2, sure: true, eb: true, fee: o2.amount - l.credit }; }
  if (unpaid.length) return { kind: 'order', o: unpaid[0], sure: false, eb: eb, fee: eb ? unpaid[0].amount - l.credit : 0 };
  if (byPhone.length) return { kind: 'paid', o: byPhone[0] };   // аль хэдийн баталгаажсан
  var amt = list.filter(function (o) { return ordOpen(o) && Math.abs(ordDue(o) - l.credit) < 1; });
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
    return '<button class="' + (bankTab === t[0] ? 'on' : '') + '" onclick="bankTab=\'' + t[0] + '\';render()">' + t[1] + '</button>'; }).join('') +
    (todo.length ? '<button style="margin-left:auto" onclick="bankDel(null)">Тулгаагүй ' + todo.length + ' гүйлгээг устгах</button>' : '') + '</div>' +
    (todo.length && bankTab !== 'done' ? '<div class="bk-bar"><button class="b-btn" onclick="bankSelSure()">Таарсныг сонгох' + (sure ? ' (' + sure + ')' : '') + '</button>' +
      '<button class="b-btn primary" id="bkSelBtn" onclick="bankApplySel()">Сонгосныг тулгах (' + Object.keys(bankSel).length + ')</button>' +
      '<span class="muted" style="font-size:12.5px">Мөр бүрийн «Тулгах баримт» сонголтоор тулгана. Сонголтгүй мөр алгасагдана.</span></div>' : '');
  var rows = list.map(function (l) {
    var s = l.status === 'Шинэ' ? bankSuggest(l) : null, sel = '';
    if (s) {
      var opts = [], cur = bankPick[l.id];   // [утга, нэр, бүлэг]
      if (l.credit) {
        if (s.kind === 'paid') opts.push(['P:' + s.o.id, 'Аль хэдийн баталгаажсан: ' + s.o.phone + ' (давхар бичихгүй)', 'Захиалгын төлбөр']);
        (window.adminOrders || []).filter(function (o) { return o.biz === biz && !ordDead(o) && ordOpen(o); }).forEach(function (o) {
          opts.push(['O:' + o.id, 'Захиалга ' + o.phone + ' · ' + (o.confirmed ? 'үлдэгдэл ' + fmt(ordDue(o)) + ' / ' : '') + fmt(o.amount) + ' · ' + o.status + (o.paid === 'Орсон' ? ' · ажилтан: орсон' : ''), 'Захиалгын төлбөр']); });
        debtByWho(debtCache().rec).forEach(function (o) { opts.push(o.concat(['Авлага хаах'])); });
        loanOpts(biz, true).forEach(function (o) { opts.push(o); });
        icOpts(biz, true).forEach(function (o) { opts.push(o.concat(['Компани хооронд'])); });
        BANK_IN.forEach(function (a) { opts.push([a[0] === 'skip' ? 'skip' : 'A:' + a[0], a[1], 'Бусад']); });
      } else {
        debtByWho(debtCache().pay).forEach(function (o) { opts.push(o.concat(['Өглөг хаах'])); });
        poOpts(biz).forEach(function (o) { opts.push(o.concat(['Бараа захиалга'])); });
        loanOpts(biz, false).forEach(function (o) { opts.push(o); });
        icOpts(biz, false).forEach(function (o) { opts.push(o.concat(['Компани хооронд'])); });
        // Удирдлагын зарлага: компанийн данснаас удирдлагын зардлыг төлсөн — удирдлагын санхүүд 70xx зардлаар, компанид «компани хооронд».
        // Нэрийг нь өөрчилсөн (жишээ нь 7004 «Удирдлагын зарлага») данс эхэнд.
        if (biz !== 'mgmt' && BUSINESSES.mgmt) ACCOUNTS.filter(function (a) { return /^70/.test(a[0]) && !accHidden(a[0]); })
          .sort(function (x, y) { return (ACC[y[0]].renamed ? 1 : 0) - (ACC[x[0]].renamed ? 1 : 0); }).forEach(function (a) {
            opts.push(['MG:' + a[0], a[0] + ' ' + a[1].replace(/ \(удирдлага\)$/, ''), 'Удирдлагын зарлага → удирдлагын санхүүд']); });
        bankOutOpts().forEach(function (o) { opts.push(o); });
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
    var match = s && ((s.kind === 'order' && s.sure) || s.kind === 'paid');   // утас, дүн таарсан — ногооноор
    var fee = !l.credit && /хураамж|хураа$|шимтгэл/i.test(String(l.desc).trim());   // банкны хураамж — ягаан
    var boost = !l.credit && /boost|буст|реклам|facebook|фэйсбүүк|meta/i.test(String(l.desc));   // Boost (зар сурталчилгаа) — цэнхэр
    return '<tr' + (match ? ' class="bk-match" title="Утас, дүн таарсан"' : fee ? ' class="bk-fee" title="Банкны хураамж"' : boost ? ' class="bk-boost" title="Boost (зар сурталчилгаа)"' : '') + '><td class="bk-ck">' + (s ? '<input type="checkbox" data-id="' + esc(l.id) + '"' + (bankSel[l.id] ? ' checked' : '') + ' onchange="bankSelSet(this)">' : '') + '</td><td>' + esc(l.date) + '</td><td>' + esc(l.desc) + '</td><td class="n" style="color:var(--green)">' + (l.credit ? '+' + fmt(l.credit).slice(1) : '') + '</td>' +
      '<td class="n neg">' + (l.debit ? '−' + fmt(l.debit).slice(1) : '') + '</td><td>' + (s ? sel : '<span class="tag">' + esc(l.status) + '</span> <small class="muted">' + esc(l.link) + '</small>') + '</td>' +
      '<td class="n" style="white-space:nowrap">' + (s ? '<button class="mini" style="color:var(--accent)" onclick="bankApply([\'' + jsq(l.id) + '\'])">Тулгах</button> <button class="mini" title="Хуулгаас устгах" onclick="bankDel([\'' + jsq(l.id) + '\'])">Устгах</button>' : '') + '</td></tr>';
  }).join('');
  return head + '<div class="card"><h2>Төлбөрийн мэдээлэл (хэрэглэгчид илгээх мессежид)</h2><div class="bar-row"><input id="payInfo" value="' + esc(pay) + '" placeholder="Жишээ: Хаан банк 53xxxxxxxx (Н.Анужин)" style="flex:1;min-width:220px">' +
    '<button class="b-btn" onclick="savePayInfo()">Хадгалах</button></div><p class="muted" style="font-size:12.5px;margin-top:6px">Ажилтан захиалга бүртгэхэд «Төлбөрийн мессеж»-д энэ данс, дүн, «Гүйлгээний утга: утасны дугаар» бичигдэнэ — тулгалт автоматаар таарна.</p></div>' +
    spSettingsCard(biz) + ebSettingsCard(biz) +
    tabs + '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th class="bk-ck">' + (list.some(function (l) { return l.status === 'Шинэ'; }) ? '<input type="checkbox" title="Бүгдийг сонгох" onchange="bankSelAll(this.checked)">' : '') + '</th><th>Огноо</th><th>Гүйлгээний утга</th><th class="n">Орлого</th><th class="n">Зарлага</th><th>Тулгах баримт</th><th></th></tr>' +
    (rows || '<tr><td colspan="7" class="muted">' + (all.length ? 'Тулгах гүйлгээ алга' : 'Хуулга оруулаагүй байна — «Хуулга оруулах» дарна уу') + '</td></tr>') + '</table></div></div>';
}
// StorePay merchant API — түлхүүрийг зөвхөн серверт хадгална (энд хэзээ ч буцааж харуулахгүй); хоосон талбар хуучныг хэвээр үлдээнэ
function spSettingsCard(biz) {
  if (typeof isOwner === 'function' && !isOwner()) return '';
  var on = (window.spAll || {})[biz];
  return '<div class="card"><h2>StorePay холболт <small class="muted" style="font-weight:400">' + (on ? '· асаалттай' : '· тохируулаагүй') + '</small></h2>' +
    '<p class="muted" style="font-size:12.5px;margin:-4px 0 10px">StorePay-ээс авсан merchant API-ийн мэдээллийг бичнэ. Нууц утгууд зөвхөн серверт хадгалагдаж, дахин харагдахгүй. Хоосон үлдээсэн талбар өөрчлөгдөхгүй.</p>' +
    '<div class="row2"><div><label>App (client) нэр</label><input id="spAppUser" autocomplete="off"></div><div><label>App (client) нууц үг</label><input id="spAppPass" type="password" autocomplete="new-password"></div></div>' +
    '<div class="row2"><div><label>Merchant нэвтрэх нэр</label><input id="spUser" autocomplete="off"></div><div><label>Merchant нууц үг</label><input id="spPass" type="password" autocomplete="new-password"></div></div>' +
    '<div class="row2"><div><label>Store ID (' + esc(BIZ_NAMES_C(biz)) + ')</label><input id="spStore" inputmode="numeric" placeholder="' + (on ? 'тохируулсан — солих бол бичнэ' : 'жишээ: 1234') + '"></div><div></div></div>' +
    '<div class="bar-row" style="margin-top:10px"><button class="b-btn" onclick="spSave(true)">Хадгалаад шалгах</button>' + (on ? '<button class="b-btn ghost" onclick="spSave(false,true)">Энэ компанид унтраах</button>' : '') +
    '<small class="muted" id="spMsg"></small></div></div>';
}
// Буухиа (ebuuhia) API — X-Api-Key, Secret зөвхөн серверт хадгалагдана (дахин харагдахгүй). Захиалгатай компанид л.
function ebSettingsCard(biz) {
  if (typeof isOwner === 'function' && !isOwner()) return '';
  if (!(BUSINESSES[biz] || {}).orders) return '';
  var on = !!window.ebOnAll;
  return '<div class="card"><h2>Буухиа (ebuuhia) API <small class="muted" style="font-weight:400">' + (on ? '· асаалттай' : '· тохируулаагүй') + '</small></h2>' +
    '<p class="muted" style="font-size:12.5px;margin:-4px 0 10px">ebuuhia-аас ирсэн X-Api-Key, Secret-ийг энд өөрөө хуулж тавина. Зөвхөн серверт хадгалагдаж, дахин харагдахгүй. Асаасны дараа ажилтны хуудасны «Хүргэлт» цэсээс захиалгыг буухиа руу шууд илгээнэ.</p>' +
    '<div class="row2"><div><label>X-Api-Key</label><input id="ebKey" autocomplete="off" placeholder="' + (on ? 'тохируулсан — солих бол бичнэ' : 'eb_live_…') + '"></div>' +
    '<div><label>Secret</label><input id="ebSecret" type="password" autocomplete="new-password" placeholder="' + (on ? 'тохируулсан — солих бол бичнэ' : '') + '"></div></div>' +
    '<div class="bar-row" style="margin-top:10px"><button class="b-btn" onclick="ebSave(true)">Хадгалаад шалгах</button>' + (on ? '<button class="b-btn ghost" onclick="ebSave(false,true)">Унтраах</button>' : '') +
    '<small class="muted" id="ebMsg"></small></div></div>';
}
function ebSave(test, off) {
  var v = { key: $('ebKey').value.trim(), secret: $('ebSecret').value.trim() };
  if (!off && ((v.key && v.key.length < 20) || (v.secret && v.secret.length < 16))) { $('ebMsg').textContent = 'Түлхүүр хэт богино байна (key ' + v.key.length + ', secret ' + v.secret.length + ' тэмдэгт) — буухиагаас ирсэн утгыг бүтнээр нь хуулж тавина уу'; return; }
  if (off) { if (!confirm('Буухиа API-г унтраах уу?')) return; v = { off: true }; }
  if (!API_URL) { toast('Google Sheet-тэй холбогдсон үед ажиллана'); return; }
  $('ebMsg').textContent = 'Хадгалж байна…';
  post({ type: 'admin_setting', key: 'ebuuhia', value: v, test: !!test }, function (err, d) {
    if (err) { $('ebMsg').textContent = 'Алдаа: ' + err; return; }
    window.ebOnAll = !!d.on; $('ebSecret').value = ''; $('ebKey').value = '';
    $('ebMsg').textContent = (d.on ? 'Асаалттай' : 'Түлхүүр дутуу — асаагүй') + (d.test ? (d.test === 'ok' ? ' · Буухиатай амжилттай холбогдлоо' : ' · Холболтын алдаа: ' + d.test + (d.diag ? ' (' + d.diag + ')' : '')) : '');
  });
}
function BIZ_NAMES_C(b) { return (BUSINESSES[b] && BUSINESSES[b].name) || b; }
function spSave(test, off) {
  var v = { appUser: $('spAppUser').value, appPass: $('spAppPass').value, user: $('spUser').value, pass: $('spPass').value };
  var st = $('spStore').value.replace(/\D/g, ''); if (st) v.store = st; if (off) { v.off = true; if (!confirm('Энэ компанид StorePay-г унтраах уу?')) return; }
  if (!API_URL) { toast('Google Sheet-тэй холбогдсон үед ажиллана'); return; }
  $('spMsg').textContent = 'Хадгалж байна…';
  post({ type: 'admin_setting', key: 'storepay', biz: state.biz, value: v, test: !!test }, function (err, d) {
    if (err) { $('spMsg').textContent = 'Алдаа: ' + err; return; }
    window.spAll = window.spAll || {}; window.spAll[state.biz] = !!d.on;
    ['spAppPass', 'spPass'].forEach(function (k) { $(k).value = ''; });
    $('spMsg').textContent = (d.on ? 'Асаалттай' : 'Store ID дутуу — асаагүй') + (d.test ? (d.test === 'ok' ? ' · StorePay-д амжилттай нэвтэрлээ' : ' · Нэвтрэх алдаа: ' + d.test) : '');
  });
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
                 p0.indexOf('MG:') === 0 ? 'удирдлагын зарлага: ' + accName(p0.slice(3)) + ' — удирдлагын санхүүд зардлаар, энэ компанид «Компани хооронд · ' + BUSINESSES.mgmt.name + '» болно' :
                 /^(IC|L|PO):/.test(p0) ? ([].filter.call(document.querySelectorAll('option'), function (o) { return o.value === p0; })[0] || {}).textContent || p0 :
                 p0.slice(2) + ' ' + accName(p0.slice(2));
      if (!confirm(l0.date + ' · ' + (l0.credit ? '+' + fmt(l0.credit) : '−' + fmt(l0.debit)) + '\n«' + l0.desc + '»\n\n→ ' + what + '\n\nТулгах уу?')) return;
    }
  }
  var entries = [], orderUpd = [], updates = [], biz = state.biz, loanCloseIds = [];
  ids.forEach(function (id) {
    var l = bankLines.filter(function (x) { return x.id === id; })[0]; if (!l) return;
    var pick = bankPick[id] || '', info = bankAcctInfo(l.acct), acc = info ? info.acc : '1101', d = l.date.slice(0, 10), amt = l.credit || l.debit;
    if (!pick) { if (!quiet) toast('Тулгах баримтаа сонгоно уу'); return; }
    if (pick === 'skip') { updates.push({ id: id, status: 'Алгассан', link: '' }); return; }
    if (pick === 'LN:new') return;   // нэг нэгээр нь (цонхоор) тулгана
    if (pick.indexOf('P:') === 0) { updates.push({ id: id, status: 'Тулгасан', link: 'Захиалга ' + pick.slice(2) + ' (өмнө бүртгэгдсэн)' }); return; }
    if (pick.indexOf('O:') === 0) {
      var o = (window.adminOrders || []).filter(function (x) { return x.id === pick.slice(2); })[0]; if (!o) return;
      var fee = /EB-?\s?\d{8}/i.test(l.desc) && o.amount > l.credit ? o.amount - l.credit : 0;
      var pe = orderPayEntries(o, biz, acc, d, l.credit, fee, '7124', 'банк');
      entries = entries.concat(pe.entries);
      orderUpd.push({ id: o.id, fields: { confirmed: d + ' банк', saleDone: pe.saleDone, note: 'Банк ' + d } });
      o.paid = 'Орсон'; o.confirmed = d + ' банк'; if (pe.saleDone) o.saleDone = pe.saleDone;
      updates.push({ id: id, status: 'Тулгасан', link: 'Захиалга ' + o.phone + ' #' + o.id });
      return;
    }
    if (pick.indexOf('MG:') === 0 && !l.credit && biz !== 'mgmt') {   // удирдлагын зарлага: компани 1290 (Удирдлага) / удирдлага 70xx зардал, 1290 (компани)
      var mc = pick.slice(3), mn = BUSINESSES.mgmt.name, cn = BUSINESSES[biz].name, txt = l.desc.slice(0, 100) || 'Удирдлагын зарлага';
      entries.push({ biz: biz, date: d, dr: '1290', cr: acc, amount: amt, desc: txt + ' · Удирдлагын зарлага (' + accName(mc) + ')', partner: mn });
      entries.push({ biz: 'mgmt', date: d, dr: mc, cr: '1290', amount: amt, desc: txt + ' · ' + cn + '-ийн данснаас төлсөн', partner: cn });
      updates.push({ id: id, status: 'Тулгасан', link: 'Удирдлагын зарлага · ' + accName(mc) });
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
  // Серверийг хүлээлгүй шууд харуулна (дахин тулгахаас сэргийлнэ) — шинэчлэлт ирэхэд жинхэнэ өгөгдлөөр солигдоно
  updates.forEach(function (u) { bankLines.forEach(function (l) { if (l.id === u.id) { l.status = u.status; l.link = u.link; } }); delete bankPick[u.id]; });
  entries.forEach(function (e, i) { journal.push(Object.assign({ id: 'tmp' + Date.now() + '-' + i, by: ownerName }, e)); });
  render();
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
// received — орж ирсэн мөнгө; diff — зөрүү (буухиагийн хөлс 7124 эсвэл хөнгөлөлт 6001); бичилт бүрийн утганд «#захиалгын ID» — буцаахад олдоно.
// Буухиа хөлсөө суутгаж шилжүүлсэн: хэрэглэгчийн авлагаас хасаж хүргэлтийн зардал (7124) болгоно.
// old — хүргэх үед өглөг бичигдсэн хуучин захиалга: тэр өглөгөөс хаана (7124-оор дамжиж цэвэр 0 — давхар зардал болохгүй)
function buuhiaNet(biz, d, amt, cust, tag, old) {
  if (!old) return [{ biz: biz, date: d, dr: '7124', cr: '1201', amount: amt, partner: cust, desc: 'Буухиагийн хөлс суутгасан' + tag }];
  return [{ biz: biz, date: d, dr: '7124', cr: '1201', amount: amt, partner: cust, desc: 'Буухиагийн хөлс суутгасан' + tag },
          { biz: biz, date: d, dr: '3101', cr: '7124', amount: amt, partner: BUUHIA, desc: 'Буухиагийн өглөгөөс суутгав' + tag }];
}
function orderPayEntries(o, biz, acc, d, received, diff, diffAcc, how) {
  var sold = String(o.saleDone || ''), E = [], sd, tag = ' · ' + o.phone + ' #' + o.id, cust = ordCust(o);
  if (sold === 'yes:Зээлээр' || sold === 'yes:Шилжүүлэг') {   // бараа өгсөн, мөнгө нь авлага (хуримтлалын аргачлал) → авлага хаагдана
    E.push({ biz: biz, date: d, dr: acc, cr: '1201', amount: received, partner: cust, desc: 'Захиалгын төлбөр (' + how + ')' + tag });
    // буухиа хөлсөө суутгаж шилжүүлсэн — хүргэлтийн зардал (хуучин захиалгад хүргэх үед бичигдсэн өглөгөөс хаана)
    if (diff && diffAcc === '7124') E = E.concat(buuhiaNet(biz, d, diff, cust, tag, ebOrdAuto(o)));
    else if (diff) E.push({ biz: biz, date: d, dr: diffAcc, cr: '1201', amount: diff, partner: cust, desc: 'Хөнгөлөлт' + tag });
  } else if (sold === 'imported') {   // хуучин хүснэгтийн захиалга — борлуулалт энд бичигдэнэ
    E.push({ biz: biz, date: d, dr: acc, cr: '5101', amount: received, partner: '', desc: 'Захиалгын борлуулалт (хуучин)' + tag });
    if (diff) E.push({ biz: biz, date: d, dr: diffAcc, cr: '5101', amount: diff, partner: '', desc: (diffAcc === '7124' ? 'Буухиагийн хөлс' : 'Хөнгөлөлт') + tag });
    sd = 'yes:bank';
  } else if (!/^yes:|^returned$/.test(sold)) {   // бараа хараахан өгөөгүй — урьдчилгаа; бараа өгөхөд орлого болно
    E.push({ biz: biz, date: d, dr: acc, cr: '3802', amount: received, partner: cust, desc: 'Захиалгын урьдчилгаа (' + how + ')' + tag });
    if (diff) E.push({ biz: biz, date: d, dr: diffAcc, cr: '3802', amount: diff, partner: cust, desc: (diffAcc === '7124' ? 'Буухиагийн хөлс' : 'Хөнгөлөлт') + tag });
  }
  return { entries: E.filter(function (e) { return e.amount > 0; }), saleDone: sd };
}
var payOrd = null, poPick = null;
// Сонгосон дансанд тулгагдаагүй үлдсэн орлогууд — захиалгын дүн, утсаар таарсныг эхэнд
function poLines() {
  var el = $('poLines'); if (!el || !payOrd) return;
  var acc = $('poAcc').value, ph = String(payOrd.phone || '').replace(/\D/g, '');
  var L = (bankLines || []).filter(function (l) { return l.biz === state.biz && l.status === 'Шинэ' && +l.credit > 0 && ((bankAcctInfo(l.acct) || {}).acc || '1101') === acc; })
    .map(function (l) { return { l: l, d: Math.abs(+l.credit - payOrd.amount), hit: ph && l.desc.replace(/\s/g, '').indexOf(ph) >= 0 }; })
    .sort(function (a, b) { return (b.hit - a.hit) || (a.d - b.d); }).slice(0, 40);
  if (!L.length) { poPick = null; el.innerHTML = '<p class="muted" style="font-size:12.5px;margin:6px 0">Энэ дансанд тулгагдаагүй орлого алга — доор гараар бүртгэнэ.</p>'; return; }
  if (poPick && !L.some(function (x) { return x.l.id === poPick; })) poPick = null;
  el.innerHTML = '<label style="margin-top:8px">Тулгагдаагүй орлогууд (' + L.length + ') — таарахыг сонгоно уу</label><div class="dc-list" style="max-height:200px;overflow:auto">' +
    '<label class="dc-l"><input type="radio" name="poLine"' + (poPick ? '' : ' checked') + ' onchange="poSelLine(null)"><span class="dc-d">Хуулгаас сонгохгүй (гараар бүртгэнэ)</span></label>' +
    L.map(function (x) {
      return '<label class="dc-l' + (x.d < 1 ? ' hit' : '') + '"><input type="radio" name="poLine"' + (poPick === x.l.id ? ' checked' : '') + ' onchange="poSelLine(\'' + x.l.id + '\')"><span>' + esc(x.l.date.slice(0, 16)) + '</span><span class="dc-d">' + esc(x.l.desc) + '</span><b>' + fmt(+x.l.credit) + '</b>' + (x.d < 1 ? '<em>дүн таарсан</em>' : x.hit ? '<em>утас таарсан</em>' : '') + '</label>';
    }).join('') + '</div>';
}
function poSelLine(id) {
  poPick = id; var l = id ? (bankLines || []).filter(function (x) { return x.id === id; })[0] : null;
  if (l) { $('poAmount').value = +l.credit; $('poDate').value = l.date.slice(0, 10); }
  poCalc();
}
function openPayOrder(id) {
  payOrd = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0]; if (!payOrd) return;
  $('poInfo').textContent = payOrd.phone + (payOrd.customer ? ' · ' + payOrd.customer : '') + ' · ' + fmt(payOrd.amount) + ' · ' + payOrd.status;
  $('poDate').value = todayStr();
  $('poAcc').innerHTML = ACCOUNTS.filter(function (a) { return a[3] === 'cash'; }).map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === '1101' ? ' selected' : '') + '>' + a[0] + ' ' + esc(a[1]) + '</option>'; }).join('');
  $('poAmount').value = payOrd.amount; $('poDiff').value = '7124'; poCalc();
  poPick = null; var bc = typeof ordBankCands === 'function' ? ordBankCands(state.biz)[payOrd.id] : null;
  if (bc) { var bi = bankAcctInfo(bc.l.acct); if (bi && [].some.call($('poAcc').options, function (o) { return o.value === bi.acc; })) $('poAcc').value = bi.acc; }
  if (bc) poSelLine(bc.l.id);
  poLines();
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
  var bl = poPick ? (bankLines || []).filter(function (x) { return x.id === poPick; })[0] : null;
  var go2 = function () { post({ type: 'admin_order', id: o.id, by: ownerName, fields: fields }, function (err) { if (err) { toast('Алдаа: ' + err); return; }
    if (bl) { bl.status = 'Тулгасан'; bl.link = 'Захиалга ' + o.phone + ' #' + o.id; post({ type: 'admin_bank', by: ownerName, updates: [{ id: bl.id, status: 'Тулгасан', link: bl.link }] }, function () {}); }
    closeSheet('payOrderSheet'); toast(bl ? 'Төлбөр бүртгэгдэж, банкны гүйлгээ тулгагдлаа' : 'Төлбөр бүртгэгдлээ'); refresh(); }); };
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

// Буруу / давхар оруулсан хуулгыг устгах — зөвхөн тулгаагүй («Шинэ») мөр (Sheet-д «Устгасан» төлөвтэй үлдэнэ, дахин оруулбал сэргэнэ).
// Тулгасан мөр санхүүд бичигдсэн тул эхлээд тулгалтыг нь буцаана.
function bankDel(ids) {
  var biz = state.biz, L = bankLines.filter(function (l) { return l.biz === biz && l.status === 'Шинэ' && (!ids || ids.indexOf(l.id) >= 0); });
  if (!L.length) return;
  var ds = L.map(function (l) { return l.date.slice(0, 10); }).sort();
  if (!confirm(L.length === 1 ? 'Энэ гүйлгээг хуулгаас устгах уу?\n' + L[0].date + ' · ' + L[0].desc + ' · ' + fmt(L[0].credit || -L[0].debit) :
    'Тулгаагүй ' + L.length + ' гүйлгээг (' + ds[0] + ' — ' + ds[ds.length - 1] + ') хуулгаас устгах уу?\n\nТулгасан гүйлгээ хэвээр үлдэнэ. Дараа нь хуулгаа дахин оруулж болно.')) return;
  var gone = {}; L.forEach(function (l) { gone[l.id] = 1; });
  if (!API_URL) { bankLines = bankLines.filter(function (l) { return !gone[l.id]; }); save('nb_demo_bank', bankLines); render(); return; }
  post({ type: 'admin_bank', by: ownerName, updates: L.map(function (l) { return { id: l.id, status: 'Устгасан', link: '' }; }) }, function (err) {
    if (err) { toast('Алдаа: ' + err); return; }
    toast(L.length + ' гүйлгээ устгагдлаа'); refresh();
  });
}

// ── Олноор нь тулгах: сонгосон мөрүүдийг тус бүрийн «Тулгах баримт» сонголтоор нэг дор ──
function bankSelSet(el) { if (el.checked) bankSel[el.dataset.id] = 1; else delete bankSel[el.dataset.id]; bankSelCount(); }
function bankSelCount() { var b = document.getElementById('bkSelBtn'); if (b) b.textContent = 'Сонгосныг тулгах (' + Object.keys(bankSel).length + ')'; }
function bankSelAll(on) {
  [].forEach.call(document.querySelectorAll('td.bk-ck input[type=checkbox]'), function (c) { c.checked = on; if (on) bankSel[c.dataset.id] = 1; else delete bankSel[c.dataset.id]; });
  bankSelCount();
}
function bankSelSure() {   // утас, дүн таарсан захиалгын төлбөрүүдийг сонгоно
  bankLines.forEach(function (l) { if (l.biz !== state.biz || l.status !== 'Шинэ') return; var s = bankSuggest(l); if ((s.kind === 'order' && s.sure) || s.kind === 'paid') bankSel[l.id] = 1; });
  render();
}
function bankApplySel() {
  var sel = bankLines.filter(function (l) { return bankSel[l.id] && l.biz === state.biz && l.status === 'Шинэ'; });
  if (!sel.length) { toast('Тулгах мөрөө сонгоно уу'); return; }
  var ok = sel.filter(function (l) { return bankPick[l.id] && bankPick[l.id] !== 'LN:new'; }), miss = sel.length - ok.length;
  if (!ok.length) { toast('Сонгосон мөрүүдэд «Тулгах баримт» сонгогдоогүй байна'); return; }
  var inn = ok.reduce(function (a, l) { return a + (+l.credit || 0); }, 0), out = ok.reduce(function (a, l) { return a + (+l.debit || 0); }, 0);
  if (!confirm(ok.length + ' гүйлгээг тулгах уу?\n\nОрлого: ' + fmt(inn) + '\nЗарлага: ' + fmt(out) + (miss ? '\n\n' + miss + ' мөрөнд сонголт байхгүй (эсвэл шинэ зээл) тул алгасна.' : ''))) return;
  ok.forEach(function (l) { delete bankSel[l.id]; });
  bankApply(ok.map(function (l) { return l.id; }), true);
}

// ── Авлага / өглөг хаах: нэг эсвэл олон баримтыг нэг гүйлгээгээр, бүтэн эсвэл хэсэгчлэн ──
// Харилцах бол банкны хуулгын тулгаагүй гүйлгээнээс сонгоно (тэр мөр «Тулгасан» болж давхардахгүй), бэлэн бол касс.
var debtSel = {}, dcState = null;
function debtSelSet(el) { if (el.checked) debtSel[el.dataset.key] = Number(el.dataset.left) || 0; else delete debtSel[el.dataset.key]; debtSelCount(); }
function debtSelGrp(el) {
  var boxes = document.querySelectorAll('input.dsel[data-grp="' + el.dataset.grp + '"]');
  if (!boxes.length) {   // харилцагч хураасан — баримтуудыг өгөгдлөөс сонгоно
    var k = debtTabOf(state.sub.finance);
    (k === 'r' ? debtItems(['1201'], 1) : debtItems(['3101'], -1)).filter(function (it) { return it.who === el.dataset.grp; }).forEach(function (it) { if (el.checked) debtSel[it.key] = it.left; else delete debtSel[it.key]; });
    debtSelCount(); return;
  }
  [].forEach.call(document.querySelectorAll('input.dsel[data-grp="' + el.dataset.grp + '"]'), function (c) { c.checked = el.checked; if (el.checked) debtSel[c.dataset.key] = Number(c.dataset.left) || 0; else delete debtSel[c.dataset.key]; });
  debtSelCount();
}
function debtSelCount() {   // сонгосон үед л доод талд «Сонгосныг хаах» мөр гарна
  var bar = document.getElementById('dSelBar'), ks = Object.keys(debtSel); if (!bar) return;
  bar.classList.toggle('on', ks.length > 0);
  document.getElementById('dSelTxt').innerHTML = '<b>' + ks.length + '</b> баримт сонгосон · <b>' + fmt(ks.reduce(function (a, k) { return a + debtSel[k]; }, 0)) + '</b>';
}
function debtCloseSel() { var ks = Object.keys(debtSel); if (!ks.length) { toast('Хаах баримтаа чагтална уу'); return; } debtClose(debtTabOf(state.sub.finance), ks); }
function debtClose(k, keys) {
  if (typeof keys === 'string') keys = [keys];
  var all = k === 'r' ? debtItems(['1201'], 1) : debtItems(['3101'], -1);
  var its = all.filter(function (x) { return keys.indexOf(x.key) >= 0; });
  if (!its.length) { toast('Сонгосон баримт аль хэдийн хаагдсан байна'); return; }
  var ords = {}; (window.adminOrders || []).forEach(function (o) { if (o.biz === state.biz) ords[o.id] = o; });
  var U = {}, units = [];   // нэгж: захиалга (бүх мөр нь хамт) эсвэл нэг баримт
  its.forEach(function (it) {
    var o = ords[it.bill], id = o ? 'O' + o.id : 'K' + it.key;
    if (!U[id]) { U[id] = { id: id, ord: o || null, who: it.who, acc: it.acc, date: it.date, desc: o ? 'Захиалга ' + o.phone : String(it.desc).split(' · ')[0].slice(0, 50), tag: '#' + (o ? o.id : debtTag(it)), due: 0, np: it.np }; units.push(U[id]); }
    U[id].due = r0(U[id].due + it.left); if (it.date < U[id].date) U[id].date = it.date;
  });
  units.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  var total = r0(units.reduce(function (a, u) { return a + u.due; }, 0));
  var digits = [], words = [];
  units.forEach(function (u) { digits = digits.concat(String(u.who).match(/\d{8}/g) || []); if (u.ord) digits.push(String(u.ord.phone).replace(/\D/g, ''));
    words = words.concat(String(u.who).toLowerCase().split(/\s+/).filter(function (w) { return w.length >= 3 && !/^\d+$/.test(w); })); });
  var L = bankLines.filter(function (l) { return l.biz === state.biz && l.status === 'Шинэ' && (k === 'r' ? +l.credit > 0 : +l.debit > 0); }).map(function (l) {
    var d = String(l.desc).replace(/(\d{4})\s(\d{4})/g, '$1$2').toLowerCase(), amt = k === 'r' ? +l.credit : +l.debit, sc = 0;
    if (digits.some(function (x) { return x && d.indexOf(x) >= 0; }) || words.some(function (w) { return d.indexOf(w) >= 0; })) sc += 2;
    if (Math.abs(amt - total) < 1) sc += 1;
    return { l: l, amt: amt, sc: sc };
  }).sort(function (a, b) { return b.sc - a.sc || (a.l.date < b.l.date ? 1 : -1); });
  dcState = { k: k, units: units, total: total, L: L };
  var lines = L.slice(0, 60).map(function (x, i) {
    return '<label class="dc-l' + (x.sc >= 2 ? ' hit' : '') + '"><input type="radio" name="dcLine" value="' + i + '"' + (i === 0 && x.sc >= 2 ? ' checked' : '') + ' onchange="dcAlloc(true)">' +
      '<span>' + esc(x.l.date.slice(0, 16)) + '</span><span class="dc-d">' + esc(x.l.desc) + '</span><b>' + fmt(x.amt) + '</b>' +
      (x.sc >= 2 ? '<em>' + (x.sc === 3 ? 'нэр/утас, дүн таарсан' : 'нэр/утас таарсан') + '</em>' : x.sc === 1 ? '<em class="g">дүн таарсан</em>' : '') + '</label>';
  }).join('');
  var urows = units.map(function (u, i) {
    return '<tr><td>' + esc(u.who) + '<br><small class="muted">' + esc(u.date) + ' · ' + esc(u.desc) + '</small></td><td class="n">' + fmt(u.due) + '</td>' +
      '<td class="n"><input class="dc-a" data-i="' + i + '" type="number" min="0" step="1" style="width:110px;text-align:right" oninput="dcAlloc(false)"></td></tr>';
  }).join('');
  gOpen('<h2>' + (k === 'r' ? 'Авлага хаах' : 'Өглөг хаах') + (units.length > 1 ? ' — ' + units.length + ' баримт' : '') + '</h2>' +
    '<label for="dcHow">Хэрхэн ' + (k === 'r' ? 'төлбөр орсон бэ' : 'төлсөн бэ') + '?</label><select id="dcHow" onchange="dcHowChange()">' +
      '<option value="bank">Харилцах данс — банкны хуулгын тулгаагүй гүйлгээнээс сонгох</option><option value="cash">Бэлэн мөнгө (касс)</option></select>' +
    '<div id="dcBank" style="margin-top:8px">' + (L.length ? '<div class="dc-list">' + lines + '</div>' :
      '<p class="muted">Тулгаагүй ' + (k === 'r' ? 'орлогын' : 'зарлагын') + ' гүйлгээ алга — эхлээд банкны хуулгаа оруулна уу.</p>') + '</div>' +
    '<div id="dcCash" style="display:none;margin-top:8px"><div class="row2"><div><label for="dcCashAmt">Дүн</label><input id="dcCashAmt" type="number" min="0" value="' + total + '" oninput="dcAlloc(true)"></div>' +
      '<div><label for="dcCashDate">Огноо</label><input id="dcCashDate" type="date" value="' + todayStr() + '"></div></div></div>' +
    '<table class="rep-t dc-t" style="margin-top:10px"><tr><th>' + (k === 'r' ? 'Авлага' : 'Өглөг') + '</th><th class="n">Үлдэгдэл</th><th class="n">Хаах дүн</th></tr>' + urows +
      '<tr class="tot"><td>Нийт</td><td class="n">' + fmt(total) + '</td><td class="n" id="dcSum"></td></tr></table>' +
    '<p id="dcInfo" class="muted" style="font-size:12.5px;margin:6px 0"></p>' +
    (k === 'r' ? '<label for="dcWo">Хаагдаагүй үлдсэн хэсэг</label><select id="dcWo" onchange="dcAlloc(true)"><option value="">Авлага хэвээр үлдэнэ (дараа төлнө)</option>' +
      '<option value="7124">Буухиа хөлсөө суутгасан — хүргэлтийн зардал болгож бүрэн хаах</option><option value="6001">Хөнгөлөлт болгож бүрэн хаах</option></select>' : '') +
    '<button class="btn" onclick="dcSave()">Хаах</button><button class="btn ghost" onclick="gClose()">Болих</button>');
  dcAlloc(true);
}
function ordFeeAdm(o) {   // захиалгын «Хүргэлтийн төлбөр» мөрийн дүн (буухиагийн хөлс)
  var it = o.items; if (typeof it === 'string') { try { it = JSON.parse(it); } catch (e) { it = []; } }
  return (it || []).filter(function (i) { return isFee(i.name); }).reduce(function (a, i) { return a + (Number(i.price) || 0) * (Number(i.qty) || 1); }, 0);
}
function dcHowChange() { var c = $('dcHow').value === 'cash'; $('dcBank').style.display = c ? 'none' : ''; $('dcCash').style.display = c ? '' : 'none'; dcAlloc(true); }
function dcAmount() {   // сонгосон гүйлгээний / бэлэн мөнгөний дүн
  var S = dcState; if ($('dcHow').value === 'cash') return Number($('dcCashAmt').value) || 0;
  var r = document.querySelector('input[name=dcLine]:checked'); return r ? S.L[Number(r.value)].amt : 0;
}
function dcAlloc(refill) {   // refill — дүнг хуучнаас нь (FIFO) дахин хуваарилна
  var S = dcState; if (!S) return;
  var amt = dcAmount(), inp = document.querySelectorAll('input.dc-a');
  var wo0 = $('dcWo') ? $('dcWo').value : '';
  if (refill && wo0 === '7124') {   // буухиа хөлсөө суутгасан: захиалга бүрээс өөрийнх нь хүргэлтийн хөлсийг хасна
    S.units.forEach(function (u, i) { var a = Math.max(0, r0(u.due - (u.ord ? ordFeeAdm(u.ord) : 0))); inp[i].value = a ? a : ''; });
  } else if (refill) { var rest = amt; S.units.forEach(function (u, i) { var a = Math.min(u.due, Math.max(0, rest)); rest = r0(rest - a); inp[i].value = a ? r0(a) : ''; }); }
  var sum = 0; [].forEach.call(inp, function (x) { sum += Number(x.value) || 0; }); sum = r0(sum);
  $('dcSum').textContent = fmt(sum);
  var left = r0(S.total - sum), over = r0(amt - sum), wo = $('dcWo') ? $('dcWo').value : '';
  $('dcInfo').innerHTML = (amt ? 'Гүйлгээний дүн <b>' + fmt(amt) + '</b>. ' : 'Гүйлгээгээ сонгоно уу. ') +
    (over > 0.5 ? '<span style="color:#B45309">' + fmt(over) + ' хуваарилаагүй — эхний харилцагчийн илүү төлөлт (урьдчилгаа) болно.</span> ' : over < -0.5 ? '<span style="color:#E11D48">Хуваарилсан дүн гүйлгээнээс ' + fmt(-over) + '-өөр их байна.</span> ' : '') +
    (left > 0.5 ? (wo ? fmt(left) + ' нь ' + (wo === '7124' ? 'буухиагийн хөлс' : 'хөнгөлөлт') + ' болж бүрэн хаагдана.' : fmt(left) + ' нь ' + (S.k === 'r' ? 'авлага' : 'өглөг') + ' хэвээр үлдэнэ.') : 'Бүгд бүрэн хаагдана.');
}
function dcSave() {
  var S = dcState; if (!S) return;
  var cash = $('dcHow').value === 'cash', amt = dcAmount(), x = null, acc, d;
  if (cash) { acc = '10003'; d = $('dcCashDate').value || todayStr(); }
  else {
    var r = document.querySelector('input[name=dcLine]:checked'); if (!r) { toast('Банкны гүйлгээгээ сонгоно уу'); return; }
    x = S.L[Number(r.value)]; d = x.l.date.slice(0, 10); var info = bankAcctInfo(x.l.acct); acc = info ? info.acc : '1101';
  }
  if (!(amt > 0)) { toast('Дүн оруулна уу'); return; }
  var inp = document.querySelectorAll('input.dc-a'), A = S.units.map(function (u, i) { return Math.max(0, Number(inp[i].value) || 0); });
  var sum = r0(A.reduce(function (a, v) { return a + v; }, 0));
  if (sum > amt + 0.5) { toast('Хуваарилсан дүн гүйлгээнээс их байна'); return; }
  var over = r0(amt - sum); if (over > 0.5) { var fi = A.findIndex(function (v) { return v > 0; }); A[fi < 0 ? 0 : fi] = r0(A[fi < 0 ? 0 : fi] + over); }   // илүү төлөлт — эхний харилцагчид
  var wo = $('dcWo') ? $('dcWo').value : '', biz = state.biz, R2 = S.k === 'r', E = [], ordUpd = [];
  var src = cash ? 'Бэлэн' : String(x.l.desc).slice(0, 80);
  S.units.forEach(function (u, i) {
    var pn = u.np ? '' : u.who;
    if (A[i] > 0) E.push(R2 ? { biz: biz, date: d, dr: acc, cr: u.acc, amount: A[i], partner: pn, desc: (u.ord ? 'Захиалгын төлбөр' : 'Авлага төлөгдсөн') + ' · ' + src + ' ' + u.tag }
                            : { biz: biz, date: d, dr: u.acc, cr: acc, amount: A[i], partner: pn, desc: 'Өглөг төлсөн · ' + src + ' ' + u.tag });
    var rest = r0(u.due - A[i]);
    if (wo && R2 && rest > 0.5) E = wo === '7124' ? E.concat(buuhiaNet(biz, d, rest, pn, ' · ' + u.desc + ' ' + u.tag, !!u.ord && ebOrdAuto(u.ord)))
                                                  : E.concat([{ biz: biz, date: d, dr: wo, cr: u.acc, amount: rest, partner: pn, desc: 'Хөнгөлөлт · ' + u.desc + ' ' + u.tag }]);
    if (u.ord && !u.ord.confirmed && A[i] > 0) ordUpd.push(u.ord);
  });
  if (!confirm((S.units.length > 1 ? S.units.length + ' баримтыг' : '«' + S.units[0].who + '»-ийн баримтыг') + ' ' + fmt(amt) + '-өөр хаах уу?\n' + (cash ? 'Касс · ' + d : x.l.date.slice(0, 16) + ' · «' + x.l.desc + '»') +
    (over > 0.5 ? '\n\n' + fmt(over) + ' илүү төлөлт болно.' : '') + (!wo && r0(S.total - sum) > 0.5 ? '\n' + fmt(r0(S.total - sum)) + ' нь хаагдаагүй үлдэнэ.' : ''))) return;
  gClose(); debtSel = {};
  // серверийг хүлээлгүй харуулна
  E.forEach(function (e, i) { journal.push(Object.assign({ id: 'tmp' + Date.now() + '-' + i, by: ownerName }, e)); });
  if (x) { x.l.status = 'Тулгасан'; x.l.link = (R2 ? 'Авлага · ' : 'Өглөг · ') + S.units.map(function (u) { return u.who; }).join(', ').slice(0, 90); }
  ordUpd.forEach(function (o) { o.confirmed = d + (cash ? ' гараар' : ' банк'); o.paid = 'Орсон'; });
  _debtCache = null; render();
  if (!API_URL) { save('nb_demo_journal', journal); save('nb_demo_bank', bankLines); save('nb_orders_cozy', window.adminOrders); return; }
  var n = 1 + (x ? 1 : 0) + ordUpd.length, fin = function () { if (--n === 0) { toast('Хаагдлаа'); refresh(); } };
  post({ type: 'admin_journal', by: ownerName, entries: E }, function (err) { if (err) toast('Алдаа: ' + err); fin(); });
  if (x) post({ type: 'admin_bank', by: ownerName, updates: [{ id: x.l.id, status: 'Тулгасан', link: x.l.link }] }, function () { fin(); });
  ordUpd.forEach(function (o) { post({ type: 'admin_order', id: o.id, by: ownerName, fields: { confirmed: o.confirmed, note: (cash ? 'Бэлэн ' : 'Банк ') + d } }, function () { fin(); }); });
}
