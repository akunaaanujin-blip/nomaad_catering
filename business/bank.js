// ── БАНКНЫ ХУУЛГА: Хаан банкны Excel хуулгыг оруулж захиалга, авлага, зардалтай тулгах ──
// 1) Хуулга оруулах → мөрүүд «Банк» хуудсанд давхардалгүй хадгалагдана
// 2) Орлого бүрийг гүйлгээний утган дахь утасны дугаар / «EB-утас» (буухиа) / дүнгээр захиалгатай тааруулна
// 3) Систем зөвхөн САНАЛ болгоно — мөр бүрийг хэрэглэгч өөрөө шалгаж «Тулгах» дарна (автоматаар юу ч бичихгүй)
// 4) Хуулгын эцсийн үлдэгдэл = санхүүгийн харилцах дансны үлдэгдэл эсэхийг шалгана

var DIRECTOR = 'Удирдлагын авлага';   // удирдлагын зарлага (1208) — харилцагч
var bankLines = [], bankTab = 'todo', bankPick = {}, bankSel = {}, bankWho = {};
var BANK_IN = [['5201', 'Бусад орлого'], ['5101', 'Борлуулалт (системээс гадуур)'], ['4101', 'Хөрөнгө оруулалт (эзэн, хөрөнгө оруулагч)'], ['1201', 'Авлага орж ирсэн'],
  ['3501', 'Зээл авсан (бүртгэлгүй)'], ['5202', 'Хүүгийн орлого'], ['1208', 'Удирдлага зарлагаа буцааж төлсөн'], ['skip', 'Тулгахгүй (алгасах)']];
// Зарлагын «Тулгах баримт»: төлбөр, шилжүүлэг + Baaz-ын зардлын данс бүлгээрээ (дансны төлөвлөгөөнөөс)
var BANK_PAY = [['1404', 'Бараа татан авалт'], ['3101', 'Нийлүүлэгчид төлсөн'], ['3301', 'Цалин олгосон'], ['3403', 'НДШ төлсөн'], ['3404', 'ХХОАТ төлсөн'],
  ['3801', 'Сурталчилгаа (Boost) төлсөн — ажилтны бүртгэлийн өглөг'], ['1208', 'Бусад удирдлагын зарлага'], ['3501', 'Зээл төлсөн (бүртгэлгүй)'], ['4101', 'Эзэмшигч мөнгө авсан'], ['skip', 'Тулгахгүй (алгасах)']];
// 70xx (удирдлагын) зардлыг компанид сонгохгүй — удирдлагын зардлыг «Удирдлагын зарлага» (1208, ашигт нөлөөлөхгүй)-аар; удирдлагын санхүүд өөрөө шууд сонгоно
function bankOutOpts() {
  var grp = function (c) { return /^70/.test(c) ? 'Ерөнхий ба удирдлагын зардал' : /^71/.test(c) ? 'Борлуулалт, маркетингийн зардал' : 'Бусад зардал'; };
  return BANK_PAY.map(function (a) { return [a[0] === 'skip' ? 'skip' : 'A:' + a[0], a[1], a[0] === '1208' ? 'Удирдлагын зардал' : 'Төлбөр, шилжүүлэг']; })
    .concat(ACCOUNTS.filter(function (a) { return a[2] === 'exp' && !accHidden(a[0]) && !(state.biz !== 'mgmt' && BUSINESSES.mgmt && /^70/.test(a[0])); }).map(function (a) { return ['A:' + a[0], a[1], grp(a[0])]; }));
}
var BOOST_RE = /boost|буст|реклам|фэйсбүүк|facebook|\bmeta\b/i;
var BANK_RULES = [[/boost|реклам|фэйсбүүк|facebook|\bmeta\b|(^|[^а-яөүё])зар([^а-яөүё]|$)/i, '7120'],   // 2026-11-02: Boost-ыг банкаар төлсөн дүнгээр зардал (Дт 7120) — ажилтны Boost бүртгэл зөвхөн шинжилгээнд
   [/хураамж|шимтгэл|\bfee\b/i, '7201'], [/түрээс/i, '7114'], [/цалин/i, '3301'],
  [/шатахуун|бензин|benzin|petrovis|шунхлай|магнай/i, '7118'], [/unitel|mobicom|skytel|gmobile|интернет|univision/i, '7106'], [/ндш|даатгал/i, '3403'],
  [/цахилгаан|ус хангамж|дулаан/i, '7111'], [/буухиа|ebuuhia|booklo|хүргэлт/i, '7124'], [/зээл/i, '3501']];

// Данс → компани: эхлээд Мөнгө → Данснууд → «+ Банкны данс нэмэх»-оор холбосон (Script Properties), дараа нь config.js
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

// Систем эхэлсэн өдөр (шинээр эхлэх 2026-10-27) — түүнээс өмнөх хуулгын мөрийг оруулахгүй
function bankFrom() { var c = typeof ebClosed === 'function' ? ebClosed() : '2026-10-26'; var d = new Date(c + 'T00:00:00'); d.setDate(d.getDate() + 1); return todayStr(d); }
// txn_key: данс + гүйлгээний дугаар; эсвэл данс + огноо + ±дүн + утга (зай, том жижиг үсэг цэвэрлэсэн). withTwin — ID-ийн «#2» дугаарыг залгана
function bankKey(l, withTwin) {
  var tw = withTwin ? (String(l.id).match(/#(\d+)$/) || [])[1] : '';
  var a = String(l.acct).slice(-4), m = String(l.id).match(/^\d*\|([^|#]+)(#\d+)?$/);   // гүйлгээний дугаартай ID («данс|дугаар»)
  var k = l.ref || m ? a + '|R|' + (l.ref || m[1]) : a + '|' + String(l.date).trim() + '|' + (Number(l.credit) ? '+' + Number(l.credit) : '-' + Number(l.debit)) + '|' + String(l.desc || '').slice(0, 250).toLowerCase().replace(/\s+/g, '');
  return k + (tw ? '#' + tw : '');
}

// Гүйлгээний утгын богино хураангуй — ID-д: эхний 40 тэмдэгт ижил, үргэлжлэл нь өөр мөрүүд нийлэхгүй
function bankHash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); }
// Банкны мөрүүдийг цагийн дарааллаар. Нэг секундэд хийгдсэн мөрүүдийг (гүйлгээ + хураамж) үлдэгдлийн гинжээр эрэмбэлнэ:
// дараагийн мөрийн өмнөх үлдэгдэл (bal − орсон + гарсан) = өмнөх мөрийн bal. Сүүлийн элемент нь хуулгын жинхэнэ эцсийн мөр.
function bankChain(lines) {
  var near = function (x, y) { return Math.abs(x - y) < 0.005; }, G = {}, keys = [], out = [];
  lines.forEach(function (l) { var k = String(l.acct).slice(-4) + '|' + l.date; if (!G[k]) { G[k] = []; keys.push(k); } G[k].push(l); });
  keys.sort(function (a, b) { var x = a.slice(a.indexOf('|') + 1), y = b.slice(b.indexOf('|') + 1); return x < y ? -1 : x > y ? 1 : 0; });
  keys.forEach(function (k) {
    var g = G[k].slice(), before = function (l) { return l.bal - (Number(l.credit) || 0) + (Number(l.debit) || 0); };
    while (g.length) {
      var i = g.findIndex(function (l) { return !g.some(function (o) { return o !== l && near(o.bal, before(l)); }); });
      var cur = g.splice(i < 0 ? 0 : i, 1)[0]; out.push(cur);
      for (var j = 0; j >= 0;) { j = g.findIndex(function (l) { return near(before(l), cur.bal); }); if (j >= 0) { cur = g.splice(j, 1)[0]; out.push(cur); } }
    }
  });
  return out;
}

// Эхний үлдэгдэлд шингэсэн мөрийн цаг: түүнээс өмнөх гүйлгээ эхний үлдэгдэлд аль хэдийн орсон — дахин оруулахад сэргээхгүй (сэргээвэл мөнгө давхар хасагдана)
function bankOpenCut(acct) { return bankLines.filter(function (b) { return String(b.acct).slice(-4) === String(acct).slice(-4) && /^Эхний үлдэгдэлд орсон/.test(b.link); }).map(function (b) { return String(b.date).slice(0, 19); }).sort().pop() || ''; }

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
    var cRef = gi(/гүйлгээний дугаар|лавлах|reference|^ref/i);   // банкны гүйлгээний дугаар (байвал түлхүүр болно)
    var from0 = bankFrom(), cut0 = bankOpenCut(acct), lines = [], preL = [], pre = 0, seen = {}, twins = 0;
    rows.slice(h + 1).forEach(function (r) {
      var dt = String(r[cD] || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}/.test(dt)) return;
      var isPre = dt.slice(0, 10) < from0 || (cut0 && dt.slice(0, 19) <= cut0);   // эхний үлдэгдэлд шингэсэн — идэвхгүй мөр болж хуулгад харагдана
      if (isPre) pre++;
      var cr = Math.abs(num(r[cCr])), db = Math.abs(num(r[cDb])), desc = String(r[cDesc] || '').trim(), ref = cRef >= 0 ? String(r[cRef] || '').trim() : '';
      var l = { id: ref ? acct + '|' + ref : acct + '|' + dt + '|' + cr + '|' + db + '|' + desc.slice(0, 40) + '|' + bankHash(desc), acct: acct, date: dt, credit: cr, debit: db, bal: num(r[cBal]), desc: desc, party: String(r[cParty] || '').trim(), biz: biz, ref: ref };
      // нэг хуулга дотор яг ижил мөр (огноо, дүн, утга) — хоёуланг нь оруулна, 2 дахь нь «#2»
      var k = bankKey(l), n = seen[k] = (seen[k] || 0) + 1;
      if (n > 1) { l.id += '#' + n; l.twin = n; twins++; }
      (isPre ? preL : lines).push(l);
    });
    if (!lines.length && !preL.length) { toast('Гүйлгээ олдсонгүй'); return; }
    var endL = bankChain(lines.length ? lines : preL).pop();   // хуулгын эцсийн үлдэгдэл (хамгийн сүүлийн мөр)
    // Давхардал: txn_key (данс + гүйлгээний дугаар, эсвэл данс + огноо + ±дүн + цэвэрлэсэн утга) аль хэдийн байвал оруулахгүй
    var mine = bankLines.filter(function (b) { return String(b.acct).slice(-4) === String(acct).slice(-4); });
    var have = {}; mine.forEach(function (b) { have[bankKey(b, true)] = 1; });
    var delK = {}; (window.bankDeleted || []).forEach(function (b) { if (String(b.acct).slice(-4) === String(acct).slice(-4)) delK[bankKey(b, true)] = b.id; });
    var keyN = function (l) { return bankKey(l) + (l.twin ? '#' + l.twin : ''); };
    var fresh = lines.filter(function (l) { return !have[keyN(l)]; }), dup = lines.length - fresh.length;
    twins = fresh.filter(function (l) { return l.twin; }).length;   // анхааруулга зөвхөн шинээр орох ижил мөрөнд
    var idle = preL.filter(function (l) { return !have[keyN(l)]; });   // идэвхгүй оруулах: санхүүд, үлдэгдэлд нөлөөлөхгүй
    if (!fresh.length && !idle.length) { toast('Шинэ гүйлгээ алга — ' + lines.length + ' гүйлгээ бүгд өмнө орсон (давхардсан)'); return; }
    fresh.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    // Өмнөх импорт: тухайн дансны хамгийн сүүлийн «дуусах огноо»; хугацаа давхцвал анхааруулна (давхардсан мөр аль хэдийн шүүгдсэн)
    var logs = (window.importLog || []).filter(function (m) { return m.status !== 'Буцаасан' && String(m.acct).slice(-4) === String(acct).slice(-4); }).sort(function (a, b) { return a.to < b.to ? -1 : 1; });
    var lastTo = logs.length ? logs[logs.length - 1].to : (mine.map(function (b) { return b.date; }).sort().pop() || '');
    var from = (lines.length ? lines : preL).map(function (l) { return l.date; }).sort()[0], to = endL.date, overlap = lastTo && from <= lastTo;
    var restore = fresh.filter(function (l) { return delK[keyN(l)]; }), imp = 'IMP' + Date.now();
    // Үлдэгдлийн гинж: өмнөх үлдэгдэл + орлого − зарлага = эцсийн үлдэгдэл. Таарахгүй бол мөр дутуу / хуулгын завсар байна
    var chn = bankChain(lines.length ? lines : preL), gaps = 0, hasBal = chn.some(function (l) { return l.bal; });
    for (var ci = 1; ci < chn.length; ci++) if (Math.abs(chn[ci - 1].bal + chn[ci].credit - chn[ci].debit - chn[ci].bal) >= 1) gaps++;
    // Холбоос: системийн сүүлийн мөрийн эцсийн үлдэгдэл = эхний шинэ мөрийн өмнөх үлдэгдэл. Хуучин огноотой шинэ мөр бол завсраас мөр нэмэгдэж байна
    var prevL = bankChain(mine).pop(), fc = bankChain(fresh.length ? fresh : lines.length ? lines : preL)[0], openB = fc.bal - fc.credit + fc.debit, older = prevL ? fresh.filter(function (l) { return l.date < prevL.date; }).length : 0;
    var jump = hasBal && prevL && !older && Math.abs(openB - prevL.bal) >= 1, joined = hasBal && prevL && !older && !jump;
    if (!hasBal) gaps = 0;
    if (!confirm('****' + String(acct).slice(-4) + ' дансны хуулга · ' + from.slice(0, 10) + ' — ' + to.slice(0, 10) + '\n\n' +
      'Нийт ' + (lines.length + pre) + ' мөр: оруулах ' + fresh.length + (dup ? ', давхардсан ' + dup : '') + (idle.length ? ', идэвхгүй ' + idle.length + ' (эхний үлдэгдлээс өмнөх, санхүүд орохгүй)' : '') + '.' +
      (lastTo ? '\nЭнэ дансны сүүлийн хуулга: ' + lastTo.slice(0, 16) + ' хүртэл.' : '') +
      (overlap ? '\n\nАНХААР: хугацаа өмнөх хуулгатай давхцаж байна — давхардсан мөрүүдийг шүүсэн, үлдсэнийг шалгана уу.' : '') +
      (gaps ? '\n\nАНХААР: хуулга дотор ' + gaps + ' газар үлдэгдэл таарахгүй байна — мөр дутуу байж магадгүй.' : '') +
      (joined ? '\n\nҮлдэгдэл холбогдож байна: системийн сүүлийн үлдэгдэл ' + fmt(prevL.bal) + ' = шинэ мөрийн эхний үлдэгдэл ' + fmt(openB) + '.' : '') +
      (jump ? '\n\nАНХААР: системийн сүүлийн үлдэгдэл ' + fmt(prevL.bal) + ', шинэ мөрийн эхний үлдэгдэл ' + fmt(openB) + ' — зөрүү ' + mny(openB - prevL.bal) + '. Хооронд нь хуулга дутуу байна, оруулахгүй байхыг зөвлөж байна.' : '') +
      (older ? '\n\nАНХААР: ' + older + ' шинэ мөр системийн сүүлийн мөрөөс (' + String(prevL.date).slice(0, 16) + ') өмнөх огноотой — өмнө нь устгасан эсвэл эхний үлдэгдэлд орсон мөр байж магадгүй. Шалгаж байж оруулна уу.' : '') +
      (twins ? '\n\nАНХААР: нэг хуулга дотор яг ижил ' + twins + ' мөр байна (огноо, дүн, утга ижил) — хоёуланг нь оруулна, шалгана уу.' : '') +
      '\n\nОруулсан мөрүүд «Тулгаагүй» жагсаалтад орно — санхүүд зөвхөн таны баталснаар бичигдэнэ.\n\nОруулах уу?')) return;
    var log = { id: imp, acct: acct, biz: biz, from: from, to: to, total: lines.length + pre, skipped: pre, dup: dup, endBal: endL.bal, restored: restore.length };
    var IDLE = 'Эхний үлдэгдлээс өмнөх';
    var back = restore.map(function (l) { return { id: delK[keyN(l)], status: 'Шинэ', link: '', imp: imp }; }).concat(idle.filter(function (l) { return delK[keyN(l)]; }).map(function (l) { return { id: delK[keyN(l)], status: 'Идэвхгүй', link: IDLE, imp: imp }; }));
    var add = fresh.filter(function (l) { return !delK[keyN(l)]; }).map(function (l) { l.imp = imp; return l; });
    var idleNew = idle.filter(function (l) { return !delK[keyN(l)]; }).map(function (l) { l.imp = imp; return l; });
    log.restored = restore.length - idleNew.length;   // сервер оруулсан тоонд идэвхгүйг тоолохгүй
    if (!API_URL) { idleNew.forEach(function (l) { l.status = 'Идэвхгүй'; l.link = IDLE; bankLines.push(l); }); add.forEach(function (l) { l.status = 'Шинэ'; bankLines.push(l); }); log.added = fresh.length; log.at = todayStr(); (window.importLog = window.importLog || []).push(log); save('nb_demo_bank', bankLines); state.biz = biz; render(); toast(fresh.length + ' шинэ гүйлгээ'); return; }
    post({ type: 'admin_bank', by: ownerName, lines: add.concat(idleNew), updates: back, import: log }, function (err, d) {
      if (err) { toast('Алдаа: ' + err); return; }
      var done1 = function () { toast(fresh.length + ' шинэ гүйлгээ орлоо' + (dup ? ' · ' + dup + ' давхардсан' : '') + (idle.length ? ' · ' + idle.length + ' идэвхгүй' : '')); refresh(); };
      if (!idleNew.length) { done1(); return; }
      post({ type: 'admin_bank', by: ownerName, updates: idleNew.map(function (l) { return { id: l.id, status: 'Идэвхгүй', link: IDLE }; }) }, function (e2) { if (e2) toast('Алдаа: ' + e2); done1(); });
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
function ordDue(o) {
  if (!o.confirmed) return Number(o.amount) || 0;
  var c = debtCache(), a = (c.ordAdv || {})[o.id] || 0, sd = String(o.saleDone || '');
  // урьдчилгаагаар хэсэгчлэн төлсөн (бараа өгөөгүй, эсвэл өгсөн ч «Урьдчилгаа»-аар зарсан): үлдэгдэл = дүн − орсон урьдчилгаа
  if (a > 0.5 && (sd === 'yes:Урьдчилгаа' || !/^yes:|^returned$|^imported$/.test(sd))) return Math.max(0, r0((Number(o.amount) || 0) - a));
  return (c.ordLeft || {})[o.id] || 0;
}
function ordEbDone(o) { return !o.confirmed && !!(debtCache().ebDone || {})[o.id]; }   // Буухиа тооцоогоор мөнгө нь орсон
function ordOpen(o) { return !ordEbDone(o) && (!o.confirmed || ordDue(o) > 0.5); }
// Буухиа хөлсөө суутгасан зөрүү: зөвхөн хүргэлтийн хөлсний хэмжээнд. Үүнээс их зөрүү бол дутуу төлбөр — авлага хэвээр үлдэнэ
function ebFeeDiff(o, amt) { var d = r0(ordDue(o) - amt); return d > 0.5 && d <= Math.max(ordFeeAdm(o), ebFeeOf(o.biz)) + 0.5 ? d : 0; }
// Захиалгын төлбөр өмнө нь гараар бичигдсэн бөгөөд банкны мөртэй холбогдоогүй бичилт (ижил данс, ижил дүн)
function ordPayEntry(o, l) {
  var inf = bankAcctInfo(l.acct), acc = inf ? inf.acc : '', used = bankUsed();
  return (journal || []).filter(function (j) { return j.biz === l.biz && j.dr === acc && !/^tmp/.test(j.id) && !used[j.id + '|' + acc] && Math.abs(Number(j.amount) - l.credit) < 1 && hasTag(j.desc, o.id); })[0] || null;
}
function bankMatch(l) {
  var phones = (l.desc.replace(/(\d{4})\s(\d{4})/g, '$1$2').match(/\d{8}/g) || []), eb = /EB-?\s?\d{8}/i.test(l.desc);
  var list = (window.adminOrders || []).filter(function (o) { return o.biz === l.biz && !ordDead(o); });
  var byPhone = list.filter(function (o) { return phones.indexOf(String(o.phone).replace(/\D/g, '')) >= 0 || phones.indexOf(String(o.phone2 || '').replace(/\D/g, '')) >= 0; });
  // баталгаажаагүй, эсвэл хэсэгчлэн төлөгдөж авлага нь үлдсэн захиалгууд; ажилтан «орсон» гэж тэмдэглэснийг эхэнд
  var unpaid = byPhone.filter(ordOpen).sort(function (a, b) { return (b.paid === 'Орсон') - (a.paid === 'Орсон'); });
  var exact = unpaid.filter(function (o) { return Math.abs(ordDue(o) - l.credit) < 1; });
  if (exact.length) return { kind: 'order', o: exact[0], sure: true, eb: eb };
  if (eb && unpaid.length) { var o2 = unpaid.filter(function (o) { return ebFeeDiff(o, l.credit) > 0; })[0]; if (o2) return { kind: 'order', o: o2, sure: true, eb: true, fee: ebFeeDiff(o2, l.credit) }; }
  if (unpaid.length) return { kind: 'order', o: unpaid[0], sure: false, eb: eb, fee: eb ? ebFeeDiff(unpaid[0], l.credit) : 0 };
  // аль хэдийн бичигдсэн төлбөр: зөвхөн ижил дүнтэй, холбогдоогүй бичилт байвал. Үгүй бол шинэ мөнгө — санал болгохгүй
  var pd = byPhone.map(function (o) { return { o: o, j: ordPayEntry(o, l) }; }).filter(function (x) { return x.j; })[0];
  if (pd) return { kind: 'paid', o: pd.o, j: pd.j };
  var amt = list.filter(function (o) { return ordOpen(o) && Math.abs(ordDue(o) - l.credit) < 1; });
  if (amt.length === 1) return { kind: 'order', o: amt[0], sure: false };
  return null;
}
// Дэлгүүр дээр «Шилжүүлэг»-ээр хийсэн борлуулалт (захиалгагүй): орлого нь борлуулах үед банкны дансанд аль хэдийн бичигдсэн тул хуулгийн мөрийг зөвхөн тулгасан гэж тэмдэглэнэ (шинэ бичилтгүй)
function shopBills(biz) {
  var ords = {}, paid = {}, g = {};
  (window.adminOrders || []).forEach(function (o) { ords[o.id] = 1; });
  (bankLines || []).forEach(function (l) { var m = l.status === 'Тулгасан' && String(l.link || '').match(/Дэлгүүрийн борлуулалт.*#(\S+)/); if (m) paid[m[1]] = (paid[m[1]] || 0) + (+l.credit || 0); });
  (window.records || []).forEach(function (x) {
    if (x.biz !== biz || (x.type !== 'sale' && x.type !== 'collect') || x.pay !== 'Шилжүүлэг') return;
    var k = x.bill || x.id; if (ords[k]) return;
    var b = g[k] || (g[k] = { key: k, date: x.date, amt: 0 }); b.amt += Number(x.amount) || 0; if (x.date < b.date) b.date = x.date;
  });
  return Object.keys(g).map(function (k) { g[k].amt = r0(g[k].amt - (paid[k] || 0)); return g[k]; }).filter(function (b) { return b.amt > 0.5; });   // хэсэгчлэн төлсөн бол үлдэгдлээр
}
function shopMatch(l) {
  var dd = function (a, b) { return Math.abs((new Date(String(a).slice(0, 10)) - new Date(String(b).slice(0, 10))) / 864e5); };
  var c = shopBills(l.biz).filter(function (b) { return Math.abs(b.amt - l.credit) < 1; }).sort(function (a, b) { return dd(a.date, l.date) - dd(b.date, l.date); });
  if (!c.length) return null;
  return { kind: 'shop', v: 'S:' + c[0].key, b: c[0], sure: dd(c[0].date, l.date) <= 5 && (c.length === 1 || dd(c[1].date, l.date) > 5) };
}
// Хэрэглэгчийн дүрэм (Rules): гүйлгээний утгад түлхүүр үг байвал үйлдлийг урьдчилан сонгоно (батлах хүртэл бүртгэгдэхгүй)
function bankRuleHit(l) {
  var d = String(l.desc || '').toLowerCase();
  return (window.bankRules || []).filter(function (r) { return r.biz === l.biz && r.kw && d.indexOf(String(r.kw).toLowerCase()) >= 0; })[0] || null;
}
// Гараар оруулсан (эсвэл нөгөө дансны хуулгаас бичигдсэн) бүртгэл: ижил данс, ижил дүн, ±3 хоног; аль хэдийн хуулгын мөртэй тулгасныг санал болгохгүй
function bankUsed() {
  var u = {};
  bankLines.forEach(function (b) {
    if (b.status === 'Устгасан') return;
    var inf = bankAcctInfo(b.acct), a = inf ? inf.acc : '';
    String(b.jids || '').split(',').forEach(function (j) { if (j) u[j + '|' + a] = b.id; });
    var m = String(b.link || '').match(/#([\w-]+)$/); if (m) { u[m[1] + '|' + a] = b.id; (debtCache().grp[m[1]] || []).forEach(function (r) { u[r + '|' + a] = b.id; }); }
  });
  return u;
}
// Журналын бичилт + цалин, бараа орлого зэрэг бүртгэлээс автоматаар үүссэн мөнгөний бичилт — банкны мөртэй холбоно, давхар бичихгүй
function bankEntries() { return (journal || []).concat(debtCache().drv || []); }
function bankManual(l, used) {
  var inf = bankAcctInfo(l.acct), acc = inf ? inf.acc : '', amt = l.credit || l.debit, d0 = new Date(String(l.date).slice(0, 10) + 'T00:00:00');
  if (!acc) return [];
  used = used || bankUsed();
  var src = {}; bankLines.forEach(function (b) { String(b.jids || '').split(',').forEach(function (j) { if (j) src[j] = b; }); });
  return bankEntries().filter(function (j) {
    if (j.biz !== l.biz || /^tmp/.test(j.id) || used[j.id + '|' + acc] || Math.abs(Number(j.amount) - amt) >= 1 || (l.credit ? j.dr !== acc : j.cr !== acc)) return false;
    return Math.abs((new Date(String(j.date).slice(0, 10) + 'T00:00:00') - d0) / 864e5) <= 3;
  }).map(function (j) { return { j: j, tr: !!src[j.id] && src[j.id].acct !== l.acct }; });
}
// Посын мөнгө орсон мөр: борлуулалт аль хэдийн бичигдсэн тул орлого биш — Cozy-д посын авлага хаана, аяллын дэлгүүрт «Карт (POS)»-оос шилжинэ
function posSuggest(l) {
  if (!posBiz(l.biz) || !/(^|[^a-zа-яөүё])(pos|пос)([^a-zа-яөүё]|$)/i.test(String(l.desc))) return null;
  if (l.biz === POS_SHARE.to && l.credit) return { kind: 'rule', v: 'TR:110106', kw: 'pos' };
  if (l.biz === POS_SHARE.from && !l.credit) return null;
  var c = debtCache(), who = l.credit ? POS_SHARE.rec : POS_SHARE.pay;   // аяллын дэлгүүрээс Cozy руу шилжүүлсэн бол посын өглөгийг хаана — бараа татан авалт биш
  var it = (l.credit ? c.rec : c.pay).filter(function (x) { return x.who === who && !x.np; })[0];
  return it ? { kind: 'debt', v: 'D:' + it.acc + '|' + it.key, it: it } : null;
}
function bankSuggest(l) {
  var rh = bankRuleHit(l), rule = rh ? { kind: 'rule', v: rh.act, kw: rh.kw } : null, mm = bankManual(l);
  var man = mm.length ? { kind: 'man', v: 'M:' + mm[0].j.id, sure: mm.length === 1, tr: mm[0].tr } : null;
  if (l.credit) { var ps = posSuggest(l); if (ps) return ps; var m = bankMatch(l); if (m) return m; var sh = shopMatch(l); if (sh) return sh; if (man) return man; if (rule) return rule; var dc = debtByName(l, debtCache().rec); if (dc) return dc; var lc = loanSuggest(l); if (lc) return lc; return { kind: 'acc', acc: '' }; }
  var pz = posSuggest(l); if (pz) return pz;
  var bg = bbSuggest(l); if (bg) return bg;   // Boost төсөв (boostbud.js)
  var bno = bstNoIn(l.desc), inv = bno && bstInvoices().filter(function (v) { return v.no === bno; })[0];   // Boost нэхэмжлэх: утганд BST- дугаар
  if (inv) return { kind: 'bst', v: 'BST:' + bno, sure: true };
  if (BOOST_RE.test(l.desc) && bstInvoices().some(function (v) { return v.state !== 'paid'; })) return { kind: 'bst', v: 'BST:set' };
  var rqs = reqOpen(l.biz).filter(function (x) { return Math.abs(Number(x.amount) - l.debit) < 1; });   // батлагдсан хүсэлт, дүн таарсан
  if (rqs.length) return { kind: 'req', v: 'R:' + rqs[0].id, sure: rqs.length === 1 };
  if (man) return man;
  if (rule) return rule;
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
  var biz = state.biz, all = bankChain(bankLines.filter(function (l) { return l.biz === biz; })).reverse();
  var todo = all.filter(function (l) { return l.status === 'Шинэ'; });
  var idleL = all.filter(function (l) { return l.status === 'Идэвхгүй'; }), doneL = all.filter(function (l) { return l.status !== 'Шинэ' && l.status !== 'Идэвхгүй'; });
  var list = bankTab === 'todo' ? todo : bankTab === 'done' ? doneL : bankTab === 'idle' ? idleL : all;
  // Санхүүгийн данс бүрээр: бүх банкны дансны сүүлийн мөр (all нь шинэ нь эхэндээ) — хуулгын сүүлийн өдрөөр тулгана
  var G = {}, E0 = J(), jidSet = {}; (journal || []).forEach(function (j) { jidSet[j.id] = 1; });
  all.forEach(function (l) { var i0 = bankAcctInfo(l.acct), a0 = i0 ? i0.acc : '1101', k0 = String(l.acct).slice(-4), g0 = G[a0] = G[a0] || { acc: a0, seen: {}, bal: 0, date: '' }; if (g0.seen[k0]) return; g0.seen[k0] = 1; g0.bal += l.bal; if (l.date > g0.date) g0.date = l.date; });
  var sure = todo.filter(function (l) { var s = bankSuggest(l); return (s.kind === 'order' && s.sure) || (s.kind === 'shop' && s.sure) || (s.kind === 'req' && s.sure) || s.kind === 'paid'; }).length;
  var pay = (window.payInfoAll || {})[biz] || '';
  // Зөрүү нь яг тулгаагүй мөрүүдийн дүн бол алдаа биш — тулгавал таарна
  var pendOf = function (a, df) { var L0 = todo.filter(function (l) { var i0 = bankAcctInfo(l.acct); return (i0 ? i0.acc : '1101') === a; }), v = L0.reduce(function (s0, l) { return s0 + (+l.credit || 0) - (+l.debit || 0); }, 0); return L0.length && Math.abs(v - df) < 1 ? '<span class="muted">Тулгаагүй ' + L0.length + ' мөр: ' + mny(v) + ' — тулгавал таарна</span>' : ''; };
  var head = '<div class="kpis">' + kpi('Тулгах гүйлгээ', todo.length) +
    Object.keys(G).map(function (k) { var g = G[k], d0 = g.date.slice(0, 10), led = balances(E0, d0)[g.acc] || 0;
      return kpi('Хуулгын үлдэгдэл (' + d0 + ')', fmt(g.bal)) + kpi('Санхүүгийн ' + g.acc + ' үлдэгдэл', fmt(led), Math.abs(g.bal - led) < 1 ? '<span style="color:var(--green)">Таарч байна</span>' : pendOf(g.acc, g.bal - led) || '<span style="color:var(--red)">Зөрүү ' + mny(g.bal - led) + '</span>'); }).join('') + '</div>';
  var tabs = '<div class="fn-fr">' + stBar('Төлөв', [['todo', 'Тулгаагүй', todo.length], ['done', 'Тулгасан', doneL.length]].concat(idleL.length ? [['idle', 'Идэвхгүй', idleL.length]] : []).concat([['all', 'Бүгд', all.length]]), bankTab, "bankTab='%'") +
    (todo.length ? '<button class="b-btn danger" style="margin-left:auto" onclick="bankDel(null)">Тулгаагүй ' + todo.length + ' гүйлгээг устгах</button>' : '') + '</div>' +
    (todo.length && bankTab !== 'done' ? '<div class="bk-bar"><button class="b-btn" onclick="bankSelSure()">Таарсныг сонгох' + (sure ? ' (' + sure + ')' : '') + '</button>' +
      '<button class="b-btn primary" id="bkSelBtn" onclick="bankApplySel()">Сонгосныг тулгах (' + Object.keys(bankSel).length + ')</button>' +
      '<span class="muted" style="font-size:12.5px">Мөр бүрийн «Тулгах баримт» сонголтоор тулгана. Сонголтгүй мөр алгасагдана.</span></div>' : '');
  var defSeen = {};
  var rows = list.slice().reverse().map(function (l) {   // хуучнаас нь: ижил баримтын санал эхний гүйлгээнд очно
    var s = l.status === 'Шинэ' ? bankSuggest(l) : null, sel = '', dupPick = false;
    if (s) {
      var opts = [], cur = bankPick[l.id];   // [утга, нэр, бүлэг]
      if (l.credit) {
        if (s.kind === 'paid') opts.push(['P:' + s.o.id + '|' + s.j.id, 'Аль хэдийн бичигдсэн төлбөр: ' + s.o.phone + ' · ' + s.j.date + ' (давхар бичихгүй)', 'Захиалгын төлбөр']);
        if (typeof ebBankOpen === 'function') opts.push(['EB:set', 'Буухиагийн тооцоо — захиалга сонгох', 'Буухиа']);
        (window.adminOrders || []).filter(function (o) { return o.biz === biz && !ordDead(o) && ordOpen(o); }).forEach(function (o) {
          opts.push(['O:' + o.id, 'Захиалга ' + o.phone + ' · ' + (o.confirmed ? 'үлдэгдэл ' + fmt(ordDue(o)) + ' / ' : '') + fmt(o.amount) + ' · ' + ordStLabel(o) + (o.paid === 'Орсон' ? ' · ажилтан: орсон' : ''), 'Захиалгын төлбөр']); });
        shopBills(biz).forEach(function (b) { opts.push(['S:' + b.key, 'Дэлгүүр · ' + b.date + ' · ' + fmt(b.amt) + ' · шилжүүлэг (орлого бүртгэлтэй)', 'Дэлгүүрийн борлуулалт']); });
        debtByWho(debtCache().rec).forEach(function (o) { opts.push(o.concat(['Авлага хаах'])); });
        loanOpts(biz, true).forEach(function (o) { opts.push(o); });
        icOpts(biz, true).forEach(function (o) { opts.push(o.concat(['Компани хооронд'])); });
        bankXOpts(l).forEach(function (o) { opts.push(o); });
        BANK_IN.forEach(function (a) { opts.push([a[0] === 'skip' ? 'skip' : 'A:' + a[0], a[1], 'Бусад']); });
      } else {
        bankXOpts(l).forEach(function (o) { opts.push(o); });
        mgOpts(biz).forEach(function (o) { opts.push(o); });
        bbBankOpts().forEach(function (o) { opts.push(o); });
        opts.push(['BST:set', 'Boost нэхэмжлэх сонгох…', 'Boost нэхэмжлэх']);
        bstInvoices().filter(function (v) { return v.state !== 'paid'; }).forEach(function (v) {
          opts.push(['BST:' + v.no, v.no + ' · $' + v.usd + ' · ' + v.cos.map(function (c) { return bstCoName(c.biz) + (c.isPaid ? ' (төлсөн)' : ''); }).join(', ') + ' · ' + v.status, 'Boost нэхэмжлэх']); });
        reqOpen(biz).forEach(function (x) { opts.push(['R:' + x.id, x.category + ' · ' + (x.customer || '') + ' · ' + fmt(x.amount) + ' (' + (x.staff || '') + ')', 'Батлагдсан мөнгөний хүсэлт']); });
        debtByWho(debtCache().pay).forEach(function (o) { opts.push(o.concat(['Өглөг хаах'])); });
        poOpts(biz).forEach(function (o) { opts.push(o.concat(['Бараа захиалга'])); });
        loanOpts(biz, false).forEach(function (o) { opts.push(o); });
        icOpts(biz, false).forEach(function (o) { opts.push(o.concat(['Компани хооронд'])); });
        // «Удирдлагын зарлага» → Дт 1208 / Кт банк (харилцагч Удирдлагын авлага), удирдлага талд толин бичилтгүй
        bankOutOpts().forEach(function (o) { opts.push(o); });
      }
      var def = cur || (l.credit && /буух|ebuu/i.test(l.desc) && typeof ebBankOpen === 'function' ? 'EB:set' : '') || (s.kind === 'order' ? 'O:' + s.o.id : s.kind === 'paid' ? 'P:' + s.o.id + '|' + s.j.id : s.kind === 'shop' || s.kind === 'req' || s.kind === 'man' || s.kind === 'rule' || s.kind === 'bst' || s.kind === 'bg' ? s.v : s.kind === 'debt' ? s.v : s.acc ? 'A:' + s.acc : '');
      if (/^MG:/.test(def)) def = 'A:1208';   // хуучин дүрэм
      if (def === 'A:10003') def = 'TR:10003';   // касс — данс хоорондын шилжүүлэг
      if (def && !opts.some(function (o) { return o[0] === def; })) def = '';   // жагсаалтад байхгүй сонголт далд үлдэхгүй
      dupPick = /^[ORMSP]:/.test(def) && !!defSeen[def];   // нэг баримтыг хоёр мөр зэрэг санал болгохгүй
      if (dupPick && def !== cur) def = '';
      if (def) defSeen[def] = 1;
      bankPick[l.id] = def;
      var iv = loanIntSuggest(def, l);
      bankOptsBy[l.id] = opts;
      sel = '<span id="bp_' + esc(l.id) + '">' + bankPickHtml(l, def) + '</span>' +
        '<small class="muted bk-int" id="bi_' + esc(l.id) + '" style="display:' + (iv === null ? 'none' : 'block') + '">' + esc(iv || '') + '</small>' +
        (s.kind === 'order' ? ' <small class="muted">санал: ' + (s.sure ? 'утас, дүн таарсан' : 'шалгаж сонгоно уу') + (s.fee > 0 ? ' · буухиагийн хөлс ' + fmt(s.fee) : '') + '</small>' : '') +
        (s.kind === 'debt' ? ' <small class="muted">санал: нэр таарсан — шалгаж сонгоно уу</small>' : '') +
        (s.kind === 'req' ? ' <small class="muted">санал: батлагдсан хүсэлт, дүн таарсан' + (s.sure ? '' : ' (хэд хэдэн — шалгана уу)') + '</small>' : '') +
        (s.kind === 'shop' ? ' <small class="muted">санал: дэлгүүрийн борлуулалт (' + (s.sure ? 'дүн, огноо таарсан' : 'дүн таарсан — огноо шалгана уу') + ')</small>' : '') +
        (s.kind === 'man' ? ' <small class="muted">' + (s.tr ? 'Данс хоорондын шилжүүлэг — нөгөө хуулгаас бүртгэгдсэн (дахин бичихгүй)' : 'Тохирох бүртгэл олдлоо — шинээр бичихгүй, холбоно') + '</small>' : '') +
        (s.kind === 'rule' ? ' <small class="muted">дүрэм: «' + esc(s.kw) + '»</small>' : '') +
        (s.kind === 'bst' ? ' <small class="muted">' + (s.sure ? 'утганд нэхэмжлэхийн дугаар таарсан' : 'Boost — нэхэмжлэхээ сонгож тулгана') + ' · «Тулгах» дарахад хуваарилалт харагдана</small>' : '') +
        (s.kind === 'bg' ? ' <small class="muted">санал: Boost төсөв' + (s.sure ? ' (дугаар таарсан)' : ' (дүн таарсан — шалгана уу)') + '</small>' : '') +
        (dupPick ? ' <small style="color:var(--red)">энэ баримт өөр мөрт сонгогдсон — шалгана уу</small>' : '') +
        (bankLineJ(l).some(function (x) { return jidSet[x]; }) ? ' <small style="color:var(--red)">бичилт аль хэдийн бичигдсэн — давхар тулгахгүй, «Буцаах» дарж цэвэрлэнэ үү</small> <button class="mini" onclick="bankUnmatch(\'' + jsq(l.id) + '\')">Буцаах</button>' : '') +
        (/#\d+$/.test(l.id) ? ' <small style="color:var(--red)">ижил мөр ' + String(l.id).match(/#(\d+)$/)[1] + ' — шалгана уу</small>' : '');
    }
    var noJ = l.status === 'Тулгасан' && !/^Эхний үлдэгдэлд орсон/.test(l.link) && bankLineJ(l).length && !bankLineJ(l).some(function (x) { return jidSet[x]; });   // бичилт нь цуцлагдсан
    var match = s && !dupPick && ((s.kind === 'order' && s.sure) || (s.kind === 'shop' && s.sure) || (s.kind === 'req' && s.sure) || s.kind === 'paid');   // утас, дүн таарсан — ногооноор
    var fee = !l.credit && /хураамж|хураа$|шимтгэл/i.test(String(l.desc).trim());   // банкны хураамж — ягаан
    var boost = !l.credit && BOOST_RE.test(String(l.desc));   // Boost (зар сурталчилгаа) — цэнхэр
    return '<tr' + (l.status === 'Идэвхгүй' ? ' style="opacity:.5" title="Эхний үлдэгдэлд орсон — санхүүд, тулгалтад нөлөөлөхгүй"' : match ? ' class="bk-match" title="Утас, дүн таарсан"' : fee ? ' class="bk-fee" title="Банкны хураамж"' : boost ? ' class="bk-boost" title="Boost (зар сурталчилгаа)"' : '') + '><td class="bk-ck">' + (s ? '<input type="checkbox" data-id="' + esc(l.id) + '"' + (bankSel[l.id] ? ' checked' : '') + ' onchange="bankSelSet(this)">' : '') + '</td><td>' + esc(l.date) + '</td><td>' + esc(l.desc) + '</td><td class="n" style="color:var(--green)">' + (l.credit ? '+' + fmt(l.credit).slice(1) : '') + '</td>' +
      '<td class="n neg">' + (l.debit ? '−' + fmt(l.debit).slice(1) : '') + '</td><td class="n nw">' + (l.bal || l.bal === 0 ? fmt(l.bal).slice(1) : '') + '</td><td>' + (s ? sel : '<span class="tag">' + esc(l.status) + '</span> <small class="muted">' + esc(String(l.link).replace(/^\d{4,6} /, '').replace(/ #[\w-]+/g, '')) + '</small>' + (noJ ? ' <small style="color:var(--red)">бичилт алга — буцааж дахин тулгана уу</small>' : '')) + '</td>' +
      '<td class="n" style="white-space:nowrap">' + (s ? '<button class="mini" style="color:var(--accent)" onclick="bankApply([\'' + jsq(l.id) + '\'])">Тулгах</button> <button class="mini" title="Энэ утгатай гүйлгээнд сонгосон үйлдлийг дараа нь урьдчилан бөглөнө" onclick="bankRuleAdd(\'' + jsq(l.id) + '\')">Дүрэм болгох</button> <button class="mini" title="Хуулгаас устгах" onclick="bankDel([\'' + jsq(l.id) + '\'])">Устгах</button>' : l.status === 'Идэвхгүй' ? '' : '<button class="mini" title="Тулгалтыг буцааж дахин «Тулгаагүй» болгоно" onclick="bankUnmatch(\'' + jsq(l.id) + '\')">Буцаах</button>') + '</td></tr>';
  }).reverse().join('');
  return head + '<div class="card"><h2>Төлбөрийн мэдээлэл (хэрэглэгчид илгээх мессежид)</h2><div class="bar-row"><input id="payInfo" value="' + esc(pay) + '" placeholder="Жишээ: Хаан банк 53xxxxxxxx (Н.Анужин)" style="flex:1;min-width:220px">' +
    '<button class="b-btn" onclick="savePayInfo()">Хадгалах</button></div><p class="muted" style="font-size:12.5px;margin-top:6px">Ажилтан захиалга бүртгэхэд «Төлбөрийн мессеж»-д энэ данс, дүн, «Гүйлгээний утга: утасны дугаар» бичигдэнэ — тулгалт автоматаар таарна.</p></div>' +
    tabs + '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th class="bk-ck">' + (list.some(function (l) { return l.status === 'Шинэ'; }) ? '<input type="checkbox" title="Бүгдийг сонгох" onchange="bankSelAll(this.checked)">' : '') + '</th><th>Огноо</th><th>Гүйлгээний утга</th><th class="n">Орлого</th><th class="n">Зарлага</th><th class="n">Эцсийн үлдэгдэл</th><th>Тулгах баримт</th><th></th></tr>' +
    (rows || '<tr><td colspan="8" class="muted">' + (all.length ? 'Тулгах гүйлгээ алга' : 'Хуулга оруулаагүй байна — «Хуулга оруулах» дарна уу') + '</td></tr>') + '</table></div></div>' +
    bankLogCard(biz) + bankRulesCard(biz);
}
// ── «Тулгах баримт» хоёр алхмаар: эхлээд төрөл (Юу вэ?), дараа нь тэр төрлийн доторхоос (Аль нь?) ──
var bankOptsBy = {}, bankCatNow = {};
var BK_CAT_IN = ['Захиалгын төлбөр', 'Буухиа тооцоо', 'Дэлгүүрийн борлуулалт', 'Авлага орсон', 'Бүртгэлтэй бичилттэй холбох', 'Шилжүүлэг (данс, компани хооронд)', 'Зээл', 'Хөрөнгө оруулалт', 'Удирдлага буцааж төлсөн', 'Бусад орлого', 'Алгасах (тулгахгүй)'];
var BK_CAT_OUT = ['Зардал', 'Бараа, нийлүүлэгч', 'Boost, зар сурталчилгаа', 'Батлагдсан мөнгөний хүсэлт', 'Цалин, татвар', 'Удирдлагын зарлага', 'Бүртгэлтэй бичилттэй холбох', 'Шилжүүлэг (данс, компани хооронд)', 'Зээл', 'Эзэмшигч мөнгө авсан', 'Алгасах (тулгахгүй)'];
function bankCat(v, credit) {
  var k = String(v).split(':')[0], c = String(v).slice(k.length + 1);
  if (v === 'skip') return 'Алгасах (тулгахгүй)';
  if (k === 'M' || k === 'P') return 'Бүртгэлтэй бичилттэй холбох';
  if (k === 'TR' || k === 'IC') return 'Шилжүүлэг (данс, компани хооронд)';
  if (k === 'L' || k === 'LN' || c === '3501') return 'Зээл';
  if (credit) return k === 'O' ? 'Захиалгын төлбөр' : k === 'EB' ? 'Буухиа тооцоо' : k === 'S' || c === '5101' ? 'Дэлгүүрийн борлуулалт' : k === 'D' || c === '1201' ? 'Авлага орсон' : c === '4101' ? 'Хөрөнгө оруулалт' : c === '1208' ? 'Удирдлага буцааж төлсөн' : 'Бусад орлого';
  if (k === 'R') return 'Батлагдсан мөнгөний хүсэлт';
  if (k === 'BG' || k === 'BST' || c === '3801' || c === '7120') return 'Boost, зар сурталчилгаа';
  if (k === 'PO' || k === 'D' || c === '1404' || c === '3101') return 'Бараа, нийлүүлэгч';
  if (/^(3301|3403|3404)$/.test(c)) return 'Цалин, татвар';
  if (k === 'MZ' || c === '1208') return 'Удирдлагын зарлага';
  if (c === '4101') return 'Эзэмшигч мөнгө авсан';
  return 'Зардал';
}
function bankOptName(id, v) { var o = (bankOptsBy[id] || []).filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : ''; }
function bankItemsHtml(l, cat, pick) {
  var cr = !!l.credit, L = (bankOptsBy[l.id] || []).filter(function (o) { return bankCat(o[0], cr) === cat; });
  if (!L.length) return '';
  if (L.length === 1) return '<small class="muted" style="display:block;max-width:280px">' + esc(L[0][1]) + '</small>';
  if (cat === 'Зардал') {   // хамгийн их хэрэглэсэн зардал эхэнд
    var use = {}; (journal || []).forEach(function (j) { if (j.biz === l.biz) use[j.dr] = (use[j.dr] || 0) + 1; });
    var u = function (o) { return use[String(o[0]).slice(2)] || 0; };
    L = L.slice().sort(function (a, b) { return u(b) - u(a); }).map(function (o) { return [o[0], o[1], u(o) ? 'Хэрэглэж байсан' : 'Бусад зардал']; });
  }
  var G = [], B = {}; L.forEach(function (o) { var g = o[2] || cat; if (!B[g]) { B[g] = []; G.push(g); } B[g].push(o); });
  var op = function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === pick ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; };
  return '<select onchange="bankPick[\'' + jsq(l.id) + '\']=this.value;bankPickChange(\'' + jsq(l.id) + '\')" style="max-width:280px;display:block;margin-top:4px"><option value="">— Аль нь? —</option>' +
    (G.length > 1 ? G.map(function (g) { return '<optgroup label="' + esc(g) + '">' + B[g].map(op).join('') + '</optgroup>'; }).join('') : L.map(op).join('')) + '</select>';
}
function bankPickHtml(l, pick) {
  var cr = !!l.credit, have = {}; (bankOptsBy[l.id] || []).forEach(function (o) { have[bankCat(o[0], cr)] = 1; });
  var cat = pick ? bankCat(pick, cr) : bankCatNow[l.id] || '';
  if (cat && !have[cat]) cat = '';
  return '<select onchange="bankCatSet(\'' + jsq(l.id) + '\',this.value)" style="max-width:280px;display:block"><option value="">— Юу вэ? —</option>' +
    (cr ? BK_CAT_IN : BK_CAT_OUT).filter(function (c) { return have[c]; }).map(function (c) { return '<option' + (c === cat ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' + (cat ? bankItemsHtml(l, cat, pick) : '');
}
function bankCatSet(id, cat) {
  var l = bankLines.filter(function (x) { return x.id === id; })[0]; if (!l) return;
  var L = (bankOptsBy[id] || []).filter(function (o) { return bankCat(o[0], !!l.credit) === cat; });
  bankCatNow[id] = cat; bankPick[id] = L.length === 1 ? L[0][0] : '';
  var el = document.getElementById('bp_' + id); if (el) el.innerHTML = bankPickHtml(l, bankPick[id]);
  bankPickChange(id);
}
// Мөрийн сонголтод: гараар оруулсан бүртгэл (±3 хоног, ижил дүн) ба данс хоорондын шилжүүлэг
function bankXOpts(l) {
  var inf = bankAcctInfo(l.acct), acc = inf ? inf.acc : '';
  var o = bankManual(l).map(function (m) { var j = m.j, other = l.credit ? j.cr : j.dr;
    return ['M:' + j.id, j.date + ' · ' + String(j.desc || '').slice(0, 50) + ' · ' + fmt(j.amount) + ' · ' + accName(other), m.tr ? 'Данс хоорондын шилжүүлэг (нөгөө хуулгаас бүртгэгдсэн)' : 'Гараар оруулсан бүртгэлтэй тулгах']; });
  cashCodes().filter(function (c) { return c !== acc && !accHidden(c); }).forEach(function (c) {
    o.push(['TR:' + c, (l.credit ? accName(c) + '-аас орсон' : accName(c) + ' руу'), 'Данс хоорондын шилжүүлэг']); });
  return o;
}
// ── Дүрэм (Rules): гүйлгээний утгад түлхүүр үг → алгасах / шилжүүлэг / ангилал ──
function bankActLabel(a) {
  a = String(a || ''); var c = a.replace(/^\w+:/, '');
  return a === 'skip' ? 'Алгасах' : /^TR:/.test(a) ? 'Шилжүүлэг · ' + c + ' ' + accName(c) : /^MG:/.test(a) ? MG_EXP : /^MZ:/.test(a) ? MG_EXP + ' · ' + ((loanById(c) || {}).partner || c) : /^IC:/.test(a) ? 'Компани хооронд · ' + (BUSINESSES[c] ? BUSINESSES[c].name : c) : c + ' ' + accName(c);
}
function bankRuleAdd(id) {
  var l = bankLines.filter(function (x) { return x.id === id; })[0], act = bankPick[id] || ''; if (!l) return;
  if (!/^(skip|A:\d{4,6}|TR:\d{4,6}|MG:\d{4,6}|IC:\w+)$/.test(act)) { toast('Эхлээд мөрийн үйлдлээ сонгоно уу — дүрэм зөвхөн алгасах, шилжүүлэг, данс (ангилал)-д'); return; }
  var def = String(l.desc || '').replace(/[\d.,:;#№\/-]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
  var kw = prompt('Гүйлгээний утгад энэ үг байвал «' + bankActLabel(act) + '» гэж урьдчилан сонгоно (батлах хүртэл бүртгэгдэхгүй).\n\nТүлхүүр үг:', def);
  if (kw === null) return; kw = kw.trim();
  if (kw.length < 2) { toast('Түлхүүр үг хэт богино'); return; }
  var r = { kw: kw, act: act, biz: l.biz };
  if (!API_URL) { r.id = 'RL' + Date.now(); (window.bankRules = window.bankRules || []).push(r); render(); return; }
  post({ type: 'admin_bank', by: ownerName, rule: r }, function (err) { if (err) { toast('Алдаа: ' + err); return; } toast('Дүрэм нэмэгдлээ: «' + kw + '» → ' + bankActLabel(act)); refresh(); });
}
function bankRuleDel(id) {
  var r = (window.bankRules || []).filter(function (x) { return x.id === id; })[0]; if (!r) return;
  if (!confirm('Дүрэм устгах уу?\n«' + r.kw + '» → ' + bankActLabel(r.act))) return;
  if (!API_URL) { window.bankRules = window.bankRules.filter(function (x) { return x.id !== id; }); render(); return; }
  post({ type: 'admin_bank', by: ownerName, ruleCancel: id }, function (err) { if (err) { toast('Алдаа: ' + err); return; } toast('Устгагдлаа'); refresh(); });
}
function bankRulesCard(biz) {
  var L = (window.bankRules || []).filter(function (r) { return r.biz === biz; });
  return '<div class="card"><h2>Автомат дүрэм</h2><p class="muted" style="font-size:12.5px;margin:0 0 8px">Гүйлгээний утгад түлхүүр үг байвал үйлдлийг урьдчилан сонгоно — батлах хүртэл бүртгэлд орохгүй. Тулгаагүй мөрийн «Дүрэм болгох»-оор нэмнэ.</p>' +
    (L.length ? '<div class="scroll"><table class="rep-t"><tr><th>Түлхүүр үг</th><th>Үйлдэл</th><th>Нэмсэн</th><th></th></tr>' + L.map(function (r) {
      return '<tr><td>«' + esc(r.kw) + '»</td><td>' + esc(bankActLabel(r.act)) + '</td><td class="muted">' + esc((r.by || '') + ' ' + (r.at || '')) + '</td><td class="n"><button class="mini" onclick="bankRuleDel(\'' + jsq(r.id) + '\')">Устгах</button></td></tr>'; }).join('') + '</table></div>'
      : '<p class="muted" style="margin:0">Дүрэм алга.</p>') + '</div>';
}
// ── Импортын лог, үлдэгдэл тулгалт (хуулгын дуусах өдрөөр), буцаах ──
var BANK_SIDE = /^(Захиалга|Мөнгөний хүсэлт|Зээл · |Өгсөн зээл · )/;   // санхүүгээс гадна өөр зүйл өөрчилсөн тулгалт — эхлээд тус тусад нь буцаана
function bankLogCard(biz) {
  var L = (window.importLog || []).filter(function (m) { return m.biz === biz; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
  if (!L.length) return '<div class="card"><h2>Импортын түүх</h2><p class="muted" style="margin:0">Энэ хэсгээс хойш оруулсан хуулга энд бүртгэгдэнэ (данс, хугацаа, оруулсан / давхардсан / алгассан, эцсийн үлдэгдэл).</p></div>';
  var E = J();
  return '<div class="card"><h2>Импортын түүх</h2><div class="scroll"><table class="rep-t"><tr><th>Оруулсан</th><th>Данс</th><th>Хугацаа</th><th class="n">Нийт</th><th class="n">Оруулсан</th><th class="n">Давхардсан</th><th class="n">Алгассан</th><th class="n">Хуулгын үлдэгдэл</th><th>Үлдэгдэл тулгалт</th><th></th></tr>' +
    L.map(function (m) {
      var inf = bankAcctInfo(m.acct), acc = inf ? inf.acc : '', to = String(m.to).slice(0, 10), sys = acc ? balances(E, to)[acc] || 0 : 0, diff = Math.round(m.endBal - sys), undone = m.status === 'Буцаасан';
      var mine = bankLines.filter(function (b) { return String(b.acct).slice(-4) === String(m.acct).slice(-4) && String(b.date).slice(0, 10) <= to; });
      var pend = mine.filter(function (b) { return b.status === 'Шинэ'; }).length, skip = mine.filter(function (b) { return b.status === 'Алгассан'; }).length;
      var fst = bankChain(mine.filter(function (b) { return b.status !== 'Идэвхгүй'; }))[0], open0 = fst ? fst.bal - fst.credit + fst.debit : 0, sys0 = fst && acc ? balances(E, prevDay(fst.date.slice(0, 10)))[acc] || 0 : 0;
      var oHint = fst && Math.abs(Math.round(open0 - sys0) - diff) < 1 && Math.abs(diff) >= 1 ? ' · эхний үлдэгдэл дутуу: хуулгад ' + fmt(open0) + ', системд ' + fmt(sys0) : '';
      var chk = undone ? '<span class="muted">Буцаасан</span>' : Math.abs(diff) < 1 ? '<span style="color:var(--green)">✓ Тулж таарсан</span>' :
        '<span style="color:var(--red)">Зөрүү ' + mny(diff) + '</span><br><small class="muted">систем ' + fmt(sys) + (pend ? ' · тулгаагүй ' + pend : '') + (skip ? ' · алгассан ' + skip : '') + (m.dup ? ' · давхардсан ' + m.dup : '') + oHint + '</small>';
      return '<tr' + (undone ? ' style="opacity:.55"' : '') + '><td class="nw">' + esc(m.at) + '<br><small class="muted">' + esc(m.by || '') + '</small></td><td>****' + esc(String(m.acct).slice(-4)) + (acc ? '<br><small class="muted">' + acc + '</small>' : '') + '</td>' +
        '<td class="nw">' + esc(String(m.from).slice(0, 10)) + ' — ' + esc(to) + '</td><td class="n">' + m.total + '</td><td class="n">' + m.added + '</td><td class="n">' + (m.dup || '') + '</td><td class="n">' + (m.skipped || '') + '</td>' +
        '<td class="n">' + fmt(m.endBal) + '</td><td>' + chk + '</td><td class="n">' + (undone ? '' : '<button class="mini" onclick="bankUndoImport(\'' + jsq(m.id) + '\')">Буцаах</button>') + '</td></tr>';
    }).join('') + '</table></div><p class="muted" style="font-size:12.5px;margin-top:8px">Үлдэгдэл тулгалт: хуулгын эцсийн үлдэгдэл ↔ санхүүгийн дансны үлдэгдэл (хуулгын дуусах өдрөөр). Зөрүүтэй бол тулгаагүй, алгассан мөрүүдийг шалгана. Эхний үлдэгдлийг (2026-10-26) «Тохиргоо → Эхний үлдэгдэл»-д данс бүрээр оруулна.</p></div>';
}
function bankUndoImport(id) {
  var m = (window.importLog || []).filter(function (x) { return x.id === id; })[0]; if (!m) return;
  var L = bankLines.filter(function (b) { return b.imp === id; }), side = L.filter(function (b) { return b.status === 'Тулгасан' && (BANK_SIDE.test(String(b.link)) || bankLineOrders(b).length); });
  if (side.length) { toast(side.length + ' мөр захиалга / зээл / хүсэлттэй тулгагдсан — эхлээд «Тулгасан» табаас мөр бүрийг «Буцаах»-аар буцаана уу'); return; }
  var done = L.filter(function (b) { return b.status === 'Тулгасан'; }), jn = done.reduce(function (a, b) { return a + String(b.jids || '').split(',').filter(Boolean).length; }, 0);
  if (!confirmTyped(L.length, '****' + String(m.acct).slice(-4) + ' · ' + String(m.from).slice(0, 10) + ' — ' + String(m.to).slice(0, 10) + ' импортыг буцаах уу?\n\n' + L.length + ' гүйлгээ хуулгаас устгагдана' +
    (jn ? ', тэднээс үүссэн ' + jn + ' журналын бичилт цуцлагдана' : '') + '.\nГараар оруулсан бүртгэлтэй тулгасан бол зөвхөн холбоос салгагдана (бүртгэл хэвээр).')) return;
  if (!API_URL) { bankLines = bankLines.filter(function (b) { return b.imp !== id; }); m.status = 'Буцаасан'; save('nb_demo_bank', bankLines); render(); return; }
  post({ type: 'admin_bank', by: ownerName, undoImport: id }, function (err, d) {
    if (err) { toast(err === 'locked' ? 'Түгжигдсэн хугацааны бичилттэй тул буцаах боломжгүй' : 'Алдаа: ' + err); return; }
    toast('Буцаагдлаа: ' + d.lines + ' гүйлгээ' + (d.entries ? ', ' + d.entries + ' бичилт' : '')); refresh();
  });
}
// ── API холболт (Санхүү → Холболт): гадны үйлчилгээний түлхүүр, төлөв — банкны хуулгаас салгасан ──
function apiView(biz) {
  var B = BUSINESSES[biz] || {}, row = function (name, on, what) { return '<tr><td><b>' + name + '</b></td><td>' + (on === true ? '<span class="st g">Холбогдсон</span>' : '<span class="st n">' + (on || 'Тохируулаагүй') + '</span>') + '</td><td class="muted">' + what + '</td></tr>'; };
  return '<div class="card"><h2>Холболтын төлөв</h2><div class="scroll"><table class="rep-t"><tr><th>Үйлчилгээ</th><th>Төлөв</th><th>Юунд</th></tr>' +
    (B.orders ? row('Буухиа (ebuuhia)', !!window.ebOnAll, 'Захиалгыг хүргэлтэд илгээх, төлөв, авсан мөнгө татах') : '') +
    row('StorePay', !!(window.spAll || {})[biz], 'Хэрэглэгчийн зээлийн эрх шалгах, нэхэмжлэх илгээх') +
    row('И-баримт (PosAPI)', B.ebarimt === false ? 'Ашиглахгүй' : 'Касс компьютер дээр', 'Касс компьютер дээрх PosAPI-аар баримт хэвлэх (дэлгүүр бүрт)') +
    '</table></div></div>' + '<h2 class="sec-title" style="font-size:16px;margin:16px 0 8px">Банкны данс холбох</h2><div style="margin-bottom:8px"><button class="b-btn primary" onclick="openBankLink()">+ Данс холбох</button></div>' + bankLinkView() +
    ebSettingsCard(biz) + spSettingsCard(biz);
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
  var ids = bankLines.filter(function (l) { if (l.biz !== state.biz || l.status !== 'Шинэ') return false; var s = bankSuggest(l); return (s.kind === 'order' && s.sure) || (s.kind === 'shop' && s.sure) || s.kind === 'paid'; }).map(function (l) { return l.id; });
  if (!ids.length) { toast('Таарсан гүйлгээ алга'); return; }
  if (!confirm(ids.length + ' таарсан гүйлгээг тулгах уу?')) return;
  bankApply(ids, true);
}
// Сонголтын дагуу: захиалга → «Төлбөр орсон» + журнал; данс → кассын/харилцахын баримт; алгасах → тэмдэглэнэ
function bankApply(ids, quiet) {
  if (!quiet && ids.length === 1 && bankPick[ids[0]] === 'LN:new') { openLoanFromBank(ids[0]); return; }
  if (!quiet && ids.length === 1 && bankPick[ids[0]] === 'EB:set') { ebBankOpen(ids[0]); return; }
  if (!quiet && ids.length === 1 && /^BST:/.test(bankPick[ids[0]] || '')) { bstBankOpen(ids[0], bankPick[ids[0]].slice(4)); return; }   // Boost нэхэмжлэх — хуваарилалтыг цонхонд   // захиалгыг чагтаар сонгоно (ebset.js)   // шинэ зээл үүсгэж тулгана
  if (!quiet && ids.length === 1 && /^A:(1201|3101)$/.test(bankPick[ids[0]] || '')) {   // авлага, өглөг харилцагчгүй бол жагсаалтад хаагдахгүй
    var lw = bankLines.filter(function (x) { return x.id === ids[0]; })[0], w0 = lw ? prompt('Харилцагчийн нэрийг бичнэ үү (Авлага, Өглөгийн жагсаалттай ижил нэрээр):', bankWho[ids[0]] || lw.party || '') : '';
    if (!w0 || !w0.trim()) { toast('Харилцагчгүй бол авлага, өглөг хаагдахгүй — нэрээ бичнэ үү'); return; }
    bankWho[ids[0]] = w0.trim();
  }
  var askMsg = '';
  if (!quiet && ids.length === 1) {   // хэрэглэгчээс баталгаажуулна
    var l0 = bankLines.filter(function (x) { return x.id === ids[0]; })[0], p0 = bankPick[ids[0]] || '';
    if (l0 && p0 && p0 !== 'skip') {
      var what = p0.indexOf('O:') === 0 ? 'захиалга ' + (((window.adminOrders || []).filter(function (o) { return o.id === p0.slice(2); })[0]) || {}).phone + ' — төлбөрийг баталгаажуулж санхүүд бичнэ' + bankDiffNote(l0, p0) :
                 p0.indexOf('P:') === 0 ? 'өмнө баталгаажсан захиалга (давхар бичихгүй)' :
                 p0.indexOf('M:') === 0 ? 'бүртгэлтэй тулгана (шинэ бичилт үүсгэхгүй): ' + bankOptName(ids[0], p0) :
                 p0.indexOf('TR:') === 0 ? 'данс хоорондын шилжүүлэг ' + (l0.credit ? p0.slice(3) + ' → ' : '→ ') + accName(p0.slice(3)) + ' (орлого, зардалд орохгүй)' :
                 p0.indexOf('S:') === 0 ? 'дэлгүүрийн борлуулалттай тулгана (орлого бүртгэлтэй — мөнгө «Баталгаажаагүй шилжүүлэг»-ээс харилцах руу орно)' + bankDiffNote(l0, p0) :
                 p0.indexOf('R:') === 0 ? 'мөнгөний хүсэлт: ' + bankOptName(ids[0], p0) + ' — зардлаар бичигдэж хүсэлт «Төлсөн» болно' :
                 p0.indexOf('D:') === 0 ? (bankDebt(p0) ? debtLabel(bankDebt(p0)) + ' — хаана' : 'өр / авлага') :
                 p0.indexOf('MG:') === 0 || p0 === 'A:1208' ? 'удирдлагын зарлага — Дт 1208 / Кт банк (Удирдлагын авлага, ашигт нөлөөлөхгүй)' :
                 p0.indexOf('MZ:') === 0 ? 'удирдлагын зарлага (Удирдлагын авлага, ашигт нөлөөлөхгүй) · ' + (loanById(p0.slice(3)) || {}).partner + ' — ' + loanIntSuggest(p0, l0) :
                 /^(IC|L|PO|BG):/.test(p0) ? bankOptName(ids[0], p0) || p0 :
                 accName(p0.slice(2)) + bankDupNote(l0, p0);
      askMsg = l0.date + ' · ' + (l0.credit ? '+' + fmt(l0.credit) : '−' + fmt(l0.debit)) + '\n«' + l0.desc + '»\n\n→ ' + what;   // бичилт бэлэн болмогц нөлөөтэй нь асууна
    }
  }
  var entries = [], orderUpd = [], updates = [], biz = state.biz, loanCloseIds = [], reqDone = [], seen = {}, dupN = 0, noWho = 0, liveN = 0, ordLocal = [], jl = {};
  (journal || []).forEach(function (j) { jl[j.id] = 1; });
  ids = ids.filter(function (id) { var x = bankLines.filter(function (y) { return y.id === id; })[0]; if (x && bankLineJ(x).some(function (j) { return jl[j]; })) { liveN++; return false; } return true; });   // өмнө нь бичилт үүссэн (сүлжээ тасарсан) мөрийг дахин бичихгүй
  ids = ids.filter(function (id) { var p = bankPick[id] || ''; if (!/^[ORMSP]:/.test(p)) return true; if (seen[p]) { dupN++; return false; } seen[p] = 1; return true; });   // нэг баримтад нэг мөр
  // мөр бүрээс үүссэн бичилтэд bankId — сервер тэр мөрийн «Бичилт»-д ID-г хадгална (импорт буцаахад цуцлагдана)
  ids.forEach(function (id) { var n0 = entries.length; bankOne(id); for (var k = n0; k < entries.length; k++) entries[k].bankId = id; });
  function bankOne(id) {
    var l = bankLines.filter(function (x) { return x.id === id; })[0]; if (!l) return;
    var pick = bankPick[id] || '', info = bankAcctInfo(l.acct), acc = info ? info.acc : '1101', d = l.date.slice(0, 10), amt = l.credit || l.debit;
    if (!pick) { if (!quiet) toast('Тулгах баримтаа сонгоно уу'); return; }
    if (pick === 'skip') { updates.push({ id: id, status: 'Алгассан', link: '' }); return; }
    if (pick === 'LN:new' || pick === 'EB:set' || /^BST:/.test(pick)) return;   // нэг нэгээр нь (цонхоор) тулгана
    if (pick.indexOf('S:') === 0) {   // орлого борлуулах үед бичигдсэн (Дт 1298); мөнгө хуулгаар баталгаажмагц харилцах руу
      var sr = (window.records || []).filter(function (x) { return x.bill === pick.slice(2) && x.customer; })[0], sp = (String(l.desc).match(/(?:^|\D)(\d{8})(?!\d)/) || [])[1] || (String(l.desc).match(/ХААНААС:\s*\d+\s+(.+)$/i) || [])[1] || '';
      entries.push({ biz: biz, date: d, dr: acc, cr: '1298', amount: amt, desc: 'Дэлгүүрийн шилжүүлэг баталгаажсан · баримт #' + pick.slice(2), partner: sr ? String(sr.customer).slice(0, 80) : sp });   // харилцагч: баримтын хэрэглэгч, эсвэл гүйлгээний утган дахь утас / илгээгчийн нэр
      updates.push({ id: id, status: 'Тулгасан', link: 'Дэлгүүрийн борлуулалт · ' + d + ' #' + pick.slice(2) }); return;
    }
    if (pick.indexOf('R:') === 0) {   // батлагдсан мөнгөний хүсэлт — хуулгаар төлөгдсөн нь баталгаажмагц зардал болно
      var rq = (window.records || []).filter(function (x) { return x.id === pick.slice(2); })[0]; if (!rq) return;
      entries.push({ biz: biz, date: d, dr: expenseAcc(rq.category, biz, !!costEngine(biz, R()).since), cr: acc, amount: amt,
        desc: 'Мөнгөний хүсэлт · ' + rq.category + (rq.note ? ' · ' + String(rq.note).replace(/ \[.*\]$/, '') : '') + ' (' + (rq.staff || '') + ') #' + rq.id, partner: String(rq.customer || '').slice(0, 80) });
      reqDone.push(rq.id);
      updates.push({ id: id, status: 'Тулгасан', link: 'Мөнгөний хүсэлт · ' + rq.category + ' #' + rq.id }); return;
    }
    if (pick.indexOf('P:') === 0) { var pv = pick.slice(2).split('|'); updates.push({ id: id, status: 'Тулгасан', link: 'Захиалга #' + pv[0] + ' (өмнө бүртгэгдсэн)' + (pv[1] ? ' #' + pv[1] : '') }); return; }
    if (pick.indexOf('M:') === 0) {   // гараар оруулсан / нөгөө хуулгаас бичигдсэн бүртгэл — шинэ бичилт үүсгэхгүй, холбоно
      var mj = bankEntries().filter(function (j) { return j.id === pick.slice(2); })[0]; if (!mj) return;
      updates.push({ id: id, status: 'Тулгасан', link: 'Бүртгэлтэй тулгасан · ' + mj.date + ' #' + mj.id }); return;
    }
    if (pick.indexOf('TR:') === 0) {   // данс хоорондын шилжүүлэг — орлого, зардалд орохгүй, зөвхөн дансны үлдэгдэл
      var to2 = pick.slice(3), txt2 = 'Данс хоорондын шилжүүлэг · ' + (l.desc.slice(0, 90) || '');
      entries.push(l.credit ? { biz: biz, date: d, dr: acc, cr: to2, amount: amt, desc: txt2, partner: '' } : { biz: biz, date: d, dr: to2, cr: acc, amount: amt, desc: txt2, partner: '' });
      updates.push({ id: id, status: 'Тулгасан', link: 'Шилжүүлэг ' + (l.credit ? '← ' : '→ ') + to2 + ' ' + accName(to2) }); return;
    }
    if (pick.indexOf('O:') === 0) {
      var o = (window.adminOrders || []).filter(function (x) { return x.id === pick.slice(2); })[0]; if (!o) return;
      var fee = /EB-?\s?\d{8}/i.test(l.desc) ? ebFeeDiff(o, l.credit) : 0;
      var pe = orderPayEntries(o, biz, acc, d, l.credit, fee, '7124', 'банк');
      entries = entries.concat(pe.entries);
      orderUpd.push({ id: o.id, fields: { confirmed: d + ' банк', saleDone: pe.saleDone, note: 'Банк ' + d } });
      ordLocal.push({ o: o, d: d, sd: pe.saleDone });
      updates.push({ id: id, status: 'Тулгасан', link: 'Захиалга ' + o.phone + ' #' + o.id });
      return;
    }
    if (pick.indexOf('MG:') === 0 && !l.credit) {   // хуучин «Удирдлагын зарлага» сонголт (дүрэм) → 1208
      entries.push({ biz: biz, date: d, dr: '1208', cr: acc, amount: amt, desc: l.desc.slice(0, 120) || MG_EXP, partner: DIRECTOR });
      updates.push({ id: id, status: 'Тулгасан', link: MG_EXP });
      return;
    }
    if (pick.indexOf('MZ:') === 0) {   // хувийн зээлийг компанийн данснаас төлсөн — Дт 1208 / Кт банк
      var mz = mgEntry(pick.slice(3), biz, acc, d, amt, l.desc.slice(0, 80)); if (!mz) return;
      entries.push(mz.entry); updates.push({ id: id, status: 'Тулгасан', link: mz.link });
      if (mz.closes) loanCloseIds.push(pick.slice(3));
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
    if (pick.indexOf('BG:') === 0) {   // Boost төсөв — Дт 7120 «#BGT:<дугаар>», төсөв хаагдана
      var bge = bbBankEntries(pick, biz, acc, d, amt); if (!bge) return;
      entries = entries.concat(bge.entries); updates.push({ id: id, status: 'Тулгасан', link: bge.link });
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
    var a2 = pick.slice(2), who = bankWho[id] || '';
    if (/^(1201|3101)$/.test(a2) && !who) { noWho++; return; }   // бөөнөөр — харилцагчгүй бол алгасна
    entries.push(l.credit ? { biz: biz, date: d, dr: acc, cr: a2, amount: amt, desc: l.desc.slice(0, 120) || 'Банкны орлого', partner: who }
                          : { biz: biz, date: d, dr: a2, cr: acc, amount: amt, desc: l.desc.slice(0, 120) || 'Банкны зарлага', partner: who || (a2 === '1208' ? DIRECTOR : (a2 === '7120' || a2 === '3801') && BOOST_RE.test(l.desc) ? BOOST_PARTNER : '') });
    updates.push({ id: id, status: 'Тулгасан', link: a2 === '1208' ? MG_EXP : a2 + ' ' + accName(a2) });
  }
  var skipMsg = (liveN ? liveN + ' мөрт бичилт бичигдсэн байна — «Буцаах» дарна уу. ' : '') + (dupN ? dupN + ' мөр ижил баримттай тул алгаслаа. ' : '') + (noWho ? noWho + ' мөрийг харилцагчгүй тул алгаслаа — нэг нэгээр тулгана уу. ' : '');
  if (!updates.length) { if (skipMsg) toast(skipMsg); return; }
  if (askMsg && !confirm(askMsg + '\n\n' + bankEffect(entries, biz) + '\n\nТулгах уу?')) return;
  // Өглөг хасах гарах уу (өр байхгүй атал төлсөн): тулгахаас өмнө анхааруулна
  if (typeof liabNegative === 'function') {
    var nb = {}; liabNegative(J(), '9999-12-31').forEach(function (n) { nb[n.acc + '|' + n.who] = n.v; });
    var ng = liabNegative(J().concat(entries.filter(function (e) { return e.biz === biz; })), '9999-12-31').filter(function (n) { var p = nb[n.acc + '|' + n.who]; return p === undefined || n.v < p - TOL; });
    if (ng.length && !confirm('Анхаар: өглөг хасах гарна (өр байхгүй атал төлж байна):\n' + ng.map(function (n) { return n.acc + ' ' + accName(n.acc) + ' · ' + n.who + ' · ' + fmt(n.v); }).join('\n') + '\n\nЗөв ангилсан эсэхээ шалгана уу. Үргэлжлүүлэх үү?')) return;
  }
  ordLocal.forEach(function (x) { x.o.paid = 'Орсон'; x.o.confirmed = x.d + ' банк'; if (x.sd) x.o.saleDone = x.sd; });
  if (!API_URL) {
    entries.forEach(function (e, i) { e.id = 'J' + Date.now() + '-' + i; e.by = ownerName; journal.push(e); });
    updates.forEach(function (u) { bankLines.forEach(function (l) { if (l.id === u.id) { l.status = u.status; l.link = u.link; } }); });
    loanCloseIds.forEach(function (lid) { var L = loanById(lid); if (L) L.status = 'Хаагдсан'; }); if (loanCloseIds.length) save('nb_demo_loans', window.loans);
    reqDone.forEach(function (rid) { reqSetStatus(rid, 'Төлсөн', 'банк'); });
    save('nb_demo_journal', journal); save('nb_demo_bank', bankLines); save('nb_orders_cozy', window.adminOrders); render(); toast(skipMsg + updates.length + ' гүйлгээ тулгагдлаа'); return;
  }
  // Серверийг хүлээлгүй шууд харуулна (дахин тулгахаас сэргийлнэ) — шинэчлэлт ирэхэд жинхэнэ өгөгдлөөр солигдоно
  updates.forEach(function (u) { bankLines.forEach(function (l) { if (l.id === u.id) { l.status = u.status; l.link = u.link; } }); delete bankPick[u.id]; });
  entries.forEach(function (e, i) { journal.push(Object.assign({ id: 'tmp' + Date.now() + '-' + i, by: ownerName }, e)); });
  render();
  // Журнал эхэлж: бичигдсэн тохиолдолд л мөр «Тулгасан» болно (түгжсэн хугацаа г.м алдаанд мөр «Тулгаагүй» хэвээр)
  var rest = function () {
  var n = 1 + orderUpd.length + loanCloseIds.length, fin = function () { if (--n === 0) { toast(skipMsg + updates.length + ' гүйлгээ тулгагдлаа'); refresh(); } };
  loanCloseIds.forEach(function (lid) { post({ type: 'admin_loan', closeId: lid }, function () { fin(); }); });
  orderUpd.forEach(function (u) { post({ type: 'admin_order', id: u.id, by: ownerName, what: ordAudWhat((window.adminOrders || []).filter(function (z) { return z.id === u.id; })[0], u.fields), fields: u.fields }, function () { fin(); }); });
  reqDone.forEach(function (rid) { reqSetStatus(rid, 'Төлсөн', 'банк'); });
  post({ type: 'admin_bank', by: ownerName, updates: updates }, function (err) { if (err) toast('Алдаа: ' + err); fin(); });
  };
  if (entries.length) post({ type: 'admin_journal', by: ownerName, entries: entries }, function (err) { if (err) { if (err !== 'locked') toast('Журнал бичигдсэнгүй: ' + err); refresh(); return; } rest(); });
  else rest();
}
// Батлахын өмнө нөлөөг энгийнээр: Мөнгө, Авлага, Өглөг, Ашиг
function bankEffect(E, biz) {
  E = E.filter(function (e) { return e.biz === biz; });
  if (!E.length) return 'Шинэ бичилтгүй — зөвхөн холбоно.';
  var m = 0, r = 0, p = 0, a = 0, sg = function (v) { return (v > 0 ? '+' : '−') + fmt(Math.abs(v)); };
  E.forEach(function (e) { [[e.dr, e.amount], [e.cr, -e.amount]].forEach(function (x) {
    var A = ACC[x[0]] || {}, v = x[1];
    if (A.cash) m += v; else if (/^(1201|1207|1208|1209|1210|1290|1298)$/.test(x[0])) r += v; else if (A.type === 'liab') p -= v; else if (/^[5-9]/.test(x[0])) a -= v;
  }); });
  return [['Мөнгө', m], ['Авлага', r], ['Өглөг, зээл', p], ['Ашиг', a]].filter(function (x) { return Math.abs(x[1]) >= 0.5; }).map(function (x) { return x[0] + ': ' + sg(x[1]); }).join('\n') || 'Мөнгө, ашигт нөлөөлөхгүй.';
}
// Ижил дүнтэй бүртгэл (цалин, бараа орлого, журнал) байхад шинээр бичвэл давхар болно
function bankDupNote(l, p) {
  if (!/^A:/.test(p)) return '';
  var m = bankManual(l)[0]; return m ? '\n\nАНХААР: ижил дүнтэй бүртгэл байна (' + m.j.date + ' · ' + String(m.j.desc).slice(0, 50) + ') — шинээр бичвэл давхар болно. Жагсаалтаас тэр бүртгэлийг сонгоно уу.' : '';
}
// Тулгалтын зөрүүг батлахаас өмнө хэлнэ: илүү / дутуу төлбөр
function bankDiffNote(l, p) {
  var due = null;
  if (p.indexOf('O:') === 0) { var o = (window.adminOrders || []).filter(function (x) { return x.id === p.slice(2); })[0]; if (o) due = ordDue(o); if (o && /EB-?\s?\d{8}/i.test(l.desc) && ebFeeDiff(o, l.credit)) return '\nБуухиагийн хөлс: ' + fmt(ebFeeDiff(o, l.credit)); }
  else { var b = shopBills(l.biz).filter(function (x) { return x.key === p.slice(2); })[0]; if (b) due = b.amt; }
  if (due === null || Math.abs(due - l.credit) < 1) return '';
  return l.credit > due ? '\n\nАНХААР: гүйлгээ үлдэгдэл ' + fmt(due) + '-өөс ' + fmt(l.credit - due) + '-өөр илүү байна.' : '\n\nХэсэгчилсэн төлбөр: ' + fmt(due - l.credit) + ' үлдэнэ.';
}
// ── Нэг мөрийн тулгалтыг буцаах: бичилт цуцлагдаж, мөр дахин «Тулгаагүй» болно ──
function bankLineJ(l) { return String(l.jids || '').split(',').filter(Boolean); }
function bankLineOf(jid) { return bankLines.filter(function (l) { return l.status === 'Тулгасан' && (bankLineJ(l).indexOf(jid) >= 0 || hasTag(l.link, jid)); })[0] || null; }
function bankLineOrders(l) {   // мөрийн бичилтүүдэд #тэмдэглэгдсэн, баталгаажсан захиалгууд
  var js = bankLineJ(l), O = {}, out = {}, txt = String(l.link || '');
  (window.adminOrders || []).forEach(function (o) { if (o.confirmed) O[o.id] = o; });
  (journal || []).forEach(function (j) { if (js.indexOf(j.id) >= 0) txt += ' ' + j.desc; });
  (txt.match(/#[\w-]+/g) || []).forEach(function (t) { var o = O[t.slice(1)]; if (o) out[o.id] = o; });
  return Object.keys(out).map(function (k) { return out[k]; });
}
function bankUnmatch(id) {
  var l = bankLines.filter(function (x) { return x.id === id; })[0]; if (!l) return;
  if (/^Хувийн санхүү/.test(l.link)) { toast('Энэ мөрийг Хувийн санхүүгийн гүйлгээнээс буцаана'); return; }
  var js = bankLineJ(l), tags = (String(l.link).match(/#[\w-]+/g) || []).map(function (t) { return t.slice(1); }), ords = bankLineOrders(l);
  if (!js.length && l.status === 'Тулгасан' && ords.length === 1 && /^Захиалга \d/.test(l.link)) { undoPayOrder(ords[0].id); return; }   // гараар бүртгээд холбосон захиалга
  if (!js.length && /^(Зээл|Өгсөн зээл) · /.test(l.link)) { toast('Энэ мөрийг Зээл хуудаснаас буцаана'); return; }
  var rq = /^Мөнгөний хүсэлт/.test(l.link) ? tags[0] : '', ln = tags.map(loanById).filter(function (L) { return L && L.status === 'Хаагдсан'; })[0];
  if (!confirm('Тулгалтыг буцаах уу?\n' + String(l.date).slice(0, 16) + ' · ' + fmt(l.credit || l.debit) + '\n«' + l.desc + '»\n' + (l.link || l.status) + '\n\n' + (js.length ? js.length + ' бичилт цуцлагдана. ' : 'Санхүүгийн бичилтэд нөлөөлөхгүй. ') + (ords.length ? ords.length + ' захиалгын төлбөрийн баталгаа шинэчлэгдэнэ. ' : '') + (rq ? 'Мөнгөний хүсэлт «Батлагдсан» болно. ' : '') + 'Мөр дахин «Тулгаагүй» болно.')) return;
  var left = function (o) { return (journal || []).some(function (j) { return js.indexOf(j.id) < 0 && j.biz === o.biz && hasTag(j.desc, o.id); }); };
  var clear = ords.filter(function (o) { return !left(o); });
  if (!API_URL) {
    journal = journal.filter(function (j) { return js.indexOf(j.id) < 0; }); l.status = 'Шинэ'; l.link = ''; l.jids = '';
    clear.forEach(function (o) { o.confirmed = ''; if (o.saleDone === 'yes:bank') o.saleDone = 'imported'; }); if (rq) reqSetStatus(rq, 'Батлагдсан', 'банк буцаав');
    save('nb_demo_journal', journal); save('nb_demo_bank', bankLines); save('nb_orders_cozy', window.adminOrders); render(); return;
  }
  var i = 0, stop = function (e) { toast(e === 'locked' ? 'Түгжигдсэн хугацааны бичилт — буцаах боломжгүй' : 'Алдаа: ' + e); refresh(); };
  var finish = function () {
    var n = 1 + clear.length + (ln ? 1 : 0), fin = function () { if (--n === 0) { toast('Буцаагдлаа'); refresh(); } };
    clear.forEach(function (o) { var f = { confirmed: '', saleDone: o.saleDone === 'yes:bank' ? 'imported' : undefined, note: 'Банк тулгалт буцаав ' + todayStr() }; post({ type: 'admin_order', id: o.id, by: ownerName, what: ordAudWhat(o, f), fields: f }, function () { fin(); }); });
    if (ln) post({ type: 'admin_loan', openId: ln.id }, function () { fin(); });
    post({ type: 'admin_bank', by: ownerName, updates: [{ id: id, status: 'Шинэ', link: '' }] }, function (e) { if (e) toast('Алдаа: ' + e); fin(); });
  };
  var next = function () {
    if (i >= js.length) { finish(); return; }
    post({ type: 'admin_journal', cancelId: js[i++], what: 'Банк тулгалт буцаав · ' + String(l.desc).slice(0, 60) }, function (e) { if (e && e !== 'not_found') { stop(e); return; } next(); });
  };
  if (rq) post({ type: 'admin_record', statusId: rq, status: 'Батлагдсан', undo: 1, by: ownerName, ref: 'банк буцаав' }, function (e) { if (e) { toast(e === 'state' ? 'Сервер шинэчлэгдээгүй — Apps Script-ийг deploy хийсний дараа буцаана уу' : 'Алдаа: ' + e); return; } next(); });
  else next();
}

function bankDebt(pick) {
  var v = pick.slice(2), acc = v.split('|')[0], key = v.slice(acc.length + 1), c = debtCache();
  return c.rec.concat(c.pay).filter(function (x) { return x.acc === acc && x.key === key; })[0] || null;
}
// ═══════════ ЗАХИАЛГЫН ТӨЛБӨР (зөвхөн удирдлага) ═══════════
// received — орж ирсэн мөнгө; diff — зөрүү (буухиагийн хөлс 7124 эсвэл хөнгөлөлт 6002); бичилт бүрийн утганд «#захиалгын ID» — буцаахад олдоно.
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
    else if (diff) E.push({ biz: biz, date: d, dr: diffAcc, cr: '1201', amount: diff, partner: cust, desc: 'Хөнгөлөлт (захиалга, авлага)' + tag });
  } else if (sold === 'imported') {   // хуучин хүснэгтийн захиалга — борлуулалт энд бичигдэнэ
    E.push({ biz: biz, date: d, dr: acc, cr: '5101', amount: received, partner: '', desc: 'Захиалгын борлуулалт (хуучин)' + tag });
    if (diff) E.push({ biz: biz, date: d, dr: diffAcc, cr: '5101', amount: diff, partner: '', desc: (diffAcc === '7124' ? 'Буухиагийн хөлс' : 'Хөнгөлөлт') + tag });
    sd = 'yes:bank';
  } else if (!/^yes:|^returned$/.test(sold) || sold === 'yes:Урьдчилгаа') {   // бараа өгөөгүй — урьдчилгаа, бараа өгөхөд орлого болно; «Урьдчилгаа»-аар зарсан захиалгын үлдэгдэл төлбөр мөн 3802-ыг хаана
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
  $('poAmount').value = ordDue(payOrd); $('poDiff').value = '7124'; poCalc();
  poPick = null; var bc = typeof ordBankCands === 'function' ? ordBankCands(state.biz)[payOrd.id] : null;
  if (bc) { var bi = bankAcctInfo(bc.l.acct); if (bi && [].some.call($('poAcc').options, function (o) { return o.value === bi.acc; })) $('poAcc').value = bi.acc; }
  if (bc) poSelLine(bc.l.id);
  poLines();
  openSheet('payOrderSheet');
}
function poCalc() { var diff = payOrd ? ordDue(payOrd) - (Number($('poAmount').value) || 0) : 0; $('poDiffWrap').style.display = diff > 0 ? 'block' : 'none'; $('poDiffAmt').textContent = fmt(diff); }
function savePayOrder() {
  var o = payOrd, received = Number($('poAmount').value) || 0, diff = ordDue(o) - received, d = $('poDate').value, acc = $('poAcc').value;
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
  var go2 = function () { post({ type: 'admin_order', id: o.id, by: ownerName, what: ordAudWhat(o, fields), fields: fields }, function (err) { if (err) { toast('Алдаа: ' + err); return; }
    if (bl) { bl.status = 'Тулгасан'; bl.link = 'Захиалга ' + o.phone + ' #' + o.id; post({ type: 'admin_bank', by: ownerName, updates: [{ id: bl.id, status: 'Тулгасан', link: bl.link }] }, function () {}); }
    closeSheet('payOrderSheet'); toast(bl ? 'Төлбөр бүртгэгдэж, банкны гүйлгээ тулгагдлаа' : 'Төлбөр бүртгэгдлээ'); refresh(); }); };
  if (pe.entries.length) post({ type: 'admin_journal', by: ownerName, entries: pe.entries }, function (err) { if (err) { if (err !== 'locked') toast('Алдаа: ' + err); return; } go2(); });
  else go2();
}
// Буруу тэмдэглэсэн төлбөрийг буцаах: холбоотой бичилтүүдийг цуцалж, банкны мөрийг дахин «Тулгах» болгоно
function undoPayOrder(id) {
  var o = (window.adminOrders || []).filter(function (x) { return x.id === id; })[0]; if (!o) return;
  var js = journal.filter(function (j) { return hasTag(j.desc, id); }), jm = {}; js.forEach(function (j) { jm[j.id] = 1; });
  var bl = (typeof bankLines !== 'undefined' ? bankLines : []).filter(function (l) { return hasTag(l.link, id) || bankLineJ(l).some(function (x) { return jm[x]; }); });
  if (bl.some(function (l) { return bankLineJ(l).some(function (x) { return !jm[x]; }); })) { toast('Энэ төлбөр олон баримттай банкны мөрөөр хаагдсан — Банк тулгах → «Тулгасан» табаас тэр мөрийг «Буцаах»-аар буцаана уу'); return; }
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
  post({ type: 'admin_order', id: o.id, by: ownerName, what: ordAudWhat(o, fields), fields: fields }, function () { fin(); });
}

// Буруу / давхар оруулсан хуулгыг устгах — зөвхөн тулгаагүй («Шинэ») мөр (Sheet-д «Устгасан» төлөвтэй үлдэнэ, дахин оруулбал сэргэнэ).
// Тулгасан мөр санхүүд бичигдсэн тул эхлээд тулгалтыг нь буцаана.
function bankDel(ids) {
  var biz = state.biz, L = bankLines.filter(function (l) { return l.biz === biz && l.status === 'Шинэ' && (!ids || ids.indexOf(l.id) >= 0); });
  if (!L.length) return;
  var ds = L.map(function (l) { return l.date.slice(0, 10); }).sort();
  if (L.length === 1 ? !confirm('Энэ гүйлгээг хуулгаас устгах уу?\n' + L[0].date + ' · ' + L[0].desc + ' · ' + fmt(L[0].credit || -L[0].debit)) :
    !confirmTyped(L.length, 'Тулгаагүй ' + L.length + ' гүйлгээг (' + ds[0] + ' — ' + ds[ds.length - 1] + ') хуулгаас устгах уу?\nТулгасан гүйлгээ хэвээр үлдэнэ. Дараа нь хуулгаа дахин оруулж болно.')) return;
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
  bankLines.forEach(function (l) { if (l.biz !== state.biz || l.status !== 'Шинэ' || !bankPick[l.id] || /^(EB:set|BST:|LN:new)/.test(bankPick[l.id])) return; var s = bankSuggest(l); if ((s.kind === 'order' && s.sure) || (s.kind === 'shop' && s.sure) || (s.kind === 'req' && s.sure) || s.kind === 'paid') bankSel[l.id] = 1; });
  render();
}
function bankApplySel() {
  var sel = bankLines.filter(function (l) { return bankSel[l.id] && l.biz === state.biz && l.status === 'Шинэ'; });
  if (!sel.length) { toast('Тулгах мөрөө сонгоно уу'); return; }
  var ok = sel.filter(function (l) { var p = bankPick[l.id]; return p && !/^(LN:new|EB:set|BST:)/.test(p) && !(/^A:(1201|3101)$/.test(p) && !bankWho[l.id]); }), miss = sel.length - ok.length;
  var offN = ok.filter(function (l) { var p = bankPick[l.id]; return (/^[OS]:/.test(p) && bankDiffNote(l, p)) || bankDupNote(l, p); }).length;
  if (!ok.length) { toast('Сонгосон мөрүүдэд «Тулгах баримт» сонгогдоогүй байна'); return; }
  var inn = ok.reduce(function (a, l) { return a + (+l.credit || 0); }, 0), out = ok.reduce(function (a, l) { return a + (+l.debit || 0); }, 0);
  if (!confirm(ok.length + ' гүйлгээг тулгах уу?\n\nОрлого: ' + fmt(inn) + '\nЗарлага: ' + fmt(out) + (offN ? '\n\nАНХААР: ' + offN + ' мөрийн дүн баримтаас өөр, эсвэл ижил дүнтэй бүртгэлтэй (давхар болж болзошгүй).' : '') + (miss ? '\n\n' + miss + ' мөрийг алгасна — сонголтгүй, эсвэл нэг нэгээр тулгах (буухиа, Boost нэхэмжлэх, зээл, харилцагч шаардах) мөр.' : ''))) return;
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
    (k === 'r' ? debtItems(['1201', '1208'], 1) : debtItems(['3101', '3802'], -1)).filter(function (it) { return it.who === el.dataset.grp; }).forEach(function (it) { if (el.checked) debtSel[it.key] = it.left; else delete debtSel[it.key]; });
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
  var all = k === 'r' ? debtItems(['1201', '1208'], 1) : debtItems(['3101', '3802'], -1);
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
      '<option value="7124">Буухиа хөлсөө суутгасан — хүргэлтийн зардал болгож бүрэн хаах</option><option value="6002">Хөнгөлөлт болгож бүрэн хаах</option></select>' : '') +
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
    var pn = u.np ? '' : u.who === BUUHIA_T && u.ord ? ordCust(u.ord) : u.who;   // төлбөр баталгаажмагц авлага нь захиалагч дээр (ordParty)
    if (A[i] > 0) E.push(R2 ? { biz: biz, date: d, dr: acc, cr: u.acc, amount: A[i], partner: pn, desc: (u.ord ? 'Захиалгын төлбөр' : 'Авлага төлөгдсөн') + ' · ' + src + ' ' + u.tag }
                            : { biz: biz, date: d, dr: u.acc, cr: acc, amount: A[i], partner: pn, desc: 'Өглөг төлсөн · ' + src + ' ' + u.tag });
    var rest = r0(u.due - A[i]);
    if (wo && R2 && rest > 0.5) E = wo === '7124' ? E.concat(buuhiaNet(biz, d, rest, pn, ' · ' + u.desc + ' ' + u.tag, !!u.ord && ebOrdAuto(u.ord)))
                                                  : E.concat([{ biz: biz, date: d, dr: wo, cr: u.acc, amount: rest, partner: pn, desc: (u.ord ? 'Хөнгөлөлт (захиалга, авлага) · ' : 'Хөнгөлөлт · ' + u.desc + ' ') + u.tag }]);
    if (u.ord && !u.ord.confirmed && A[i] > 0) ordUpd.push(u.ord);
  });
  if (!confirm((S.units.length > 1 ? S.units.length + ' баримтыг' : '«' + S.units[0].who + '»-ийн баримтыг') + ' ' + fmt(amt) + '-өөр хаах уу?\n' + (cash ? 'Касс · ' + d : x.l.date.slice(0, 16) + ' · «' + x.l.desc + '»') +
    (over > 0.5 ? '\n\n' + fmt(over) + ' илүү төлөлт болно.' : '') + (!wo && r0(S.total - sum) > 0.5 ? '\n' + fmt(r0(S.total - sum)) + ' нь хаагдаагүй үлдэнэ.' : ''))) return;
  gClose(); debtSel = {};
  // серверийг хүлээлгүй харуулна
  E.forEach(function (e, i) { journal.push(Object.assign({ id: 'tmp' + Date.now() + '-' + i, by: ownerName }, e)); });
  if (x) { x.l.status = 'Тулгасан'; x.l.link = (R2 ? 'Авлага · ' : 'Өглөг · ') + S.units.map(function (u) { return u.who; }).join(', ').slice(0, 90); }   // захиалгын холбоо нь бичилтийн #тэмдэглэгээгээр (bankLineOrders)
  ordUpd.forEach(function (o) { o.confirmed = d + (cash ? ' гараар' : ' банк'); o.paid = 'Орсон'; });
  _debtCache = null; render();
  if (!API_URL) { save('nb_demo_journal', journal); save('nb_demo_bank', bankLines); save('nb_orders_cozy', window.adminOrders); return; }
  var n = 1 + (x ? 1 : 0) + ordUpd.length, fin = function () { if (--n === 0) { toast('Хаагдлаа'); refresh(); } };
  if (x) E.forEach(function (e) { e.bankId = x.l.id; });   // хуулгын мөрөөс үүссэн бичилт (импорт буцаахад цуцлагдана)
  post({ type: 'admin_journal', by: ownerName, entries: E }, function (err) {
    if (err) { if (err !== 'locked') toast('Алдаа: ' + err); refresh(); return; }   // журнал бичигдсэн тохиолдолд л мөр, захиалга шинэчлэгдэнэ
    fin();
    if (x) post({ type: 'admin_bank', by: ownerName, updates: [{ id: x.l.id, status: 'Тулгасан', link: x.l.link }] }, function () { fin(); });
    ordUpd.forEach(function (o) { post({ type: 'admin_order', id: o.id, by: ownerName, what: ordAudWhat(o, { confirmed: o.confirmed }), fields: { confirmed: o.confirmed, note: (cash ? 'Бэлэн ' : 'Банк ') + d } }, function () { fin(); }); });
  });
}

// ═══════════ Boost нэхэмжлэх ↔ банкны гарах гүйлгээ ═══════════
// Банкны ₮-ийг сонгосон мөрүүдэд $-ын харьцаагаар хуваана (сүүлийн мөрөнд бутархай зөрүү). Огноо = банкны огноо, тайлбар «Boost · <бараа> #BST:<дугаар>».
// Төлсөн компанийн мөр: Дт 7120 / Кт банкны данс (харилцагч «Сурталчилгаа (Meta)»).
// Өөр компанийн мөр: төлсөн компанид Дт 1290 (тэр компани) / Кт банкны данс; тэр компанид Дт 7120 / Кт 1290 (төлсөн компани).
// «Нэг данснаас» — нэхэмжлэхийн төлөгдөөгүй бүх компанийн мөр; «Компани тус бүрээр» — зөвхөн энэ дансны компанийн мөр (бусад нь өөрийн гүйлгээгээр).
var bstBk = null;
function bstBankOpen(lineId, no) {
  var l = bankLines.filter(function (x) { return x.id === lineId; })[0]; if (!l || l.credit) return;
  var inv = bstInvoices().filter(function (v) { return v.state !== 'paid' || v.no === no; });
  if (!inv.length) { toast('Төлөгдөөгүй Boost нэхэмжлэх алга'); return; }
  var v = inv.filter(function (x) { return x.no === no; })[0] || inv.filter(function (x) { return x.no === bstNoIn(l.desc); })[0] || inv[0];
  bstBk = { l: l, no: v.no, mode: '' };
  gOpen('<h2>Boost нэхэмжлэх тулгах</h2><p class="rep-note">Банк: ' + esc(l.date.slice(0, 10)) + ' · −' + fmt(l.debit) + ' · «' + esc(l.desc) + '» · ' + esc(BUSINESSES[l.biz].name) + '</p>' +
    '<label>Нэхэмжлэх</label><select id="bstBkNo" onchange="bstBk.no=this.value;bstBk.mode=\'\';bstBkCalc()">' + inv.map(function (x) {
      return '<option value="' + esc(x.no) + '"' + (x.no === v.no ? ' selected' : '') + '>' + esc(x.no + ' · $' + x.usd + ' · ' + x.staff + ' · ' + x.status) + '</option>'; }).join('') + '</select>' +
    '<div id="bstBkBody" style="margin-top:10px"></div>' +
    '<div class="row2" style="margin-top:10px"><button class="b-btn" onclick="gClose()">Болих</button><button class="b-btn primary" id="bstBkGo" onclick="bstBankSave()">Тулгах</button></div>');
  bstBkCalc();
}
function bstBkPlan() {   // сонгосон нэхэмжлэх, горимоор: мөр бүрийн ₮
  var l = bstBk.l, v = bstInvoices().filter(function (x) { return x.no === bstBk.no; })[0]; if (!v) return null;
  var rem = function (c) { return c.est - c.paid; };   // ханшаар тооцсоноос үлдсэн (хэсэгчлэн төлж байгаа)
  var open = v.cos.filter(function (c) { return rem(c) > c.est * 0.05; }), own = v.cos.filter(function (c) { return c.biz === l.biz; })[0];
  var cand = open.length ? open : v.cos;   // бүгд бараг төлөгдсөн бол нэмэлт төлбөр — бүх компани
  if (!bstBk.mode) {   // санал: дүн нь энэ компанийн үлдэгдэлд ойр бол «компани тус бүрээр»
    var eAll = cand.reduce(function (a, c) { return a + rem(c); }, 0);
    bstBk.mode = own && cand.length > 1 && cand.indexOf(own) >= 0 && Math.abs(rem(own) - l.debit) <= Math.abs(eAll - l.debit) ? 'own' : 'all';
  }
  if (bstBk.mode === 'own' && !own) bstBk.mode = 'all';
  var bz = {}; (bstBk.mode === 'own' ? [own] : cand).forEach(function (c) { bz[c.biz] = 1; });
  var rows = v.rows.filter(function (x) { return bz[x.biz]; }), tu = rows.reduce(function (a, x) { return a + x._usd; }, 0), left = l.debit;
  var alloc = rows.map(function (x, i) { var a = i < rows.length - 1 ? Math.round(l.debit * (tu ? x._usd / tu : 1 / rows.length)) : left; left -= a; return { x: x, a: a }; });
  return { v: v, own: own, alloc: alloc, cos: v.cos };
}
function bstBkCalc() {
  var P = bstBkPlan(), l = bstBk.l; if (!P) return;
  var many = P.cos.length > 1;
  var modes = many ? '<div class="fn-seg" style="margin-bottom:8px">' + [['all', 'Нэг данснаас (бүх компанийн мөр)'], ['own', 'Компани тус бүрээр (зөвхөн ' + bstCoName(l.biz) + ')']].map(function (m) {
    return '<button class="' + (bstBk.mode === m[0] ? 'on' : '') + '"' + (m[0] === 'own' && !P.own ? ' disabled' : '') + ' onclick="bstBk.mode=\'' + m[0] + '\';bstBkCalc()">' + m[1] + '</button>'; }).join('') + '</div>' : '';
  var cos = '<table class="rep-t"><tr><th>Компани</th><th class="n">$</th><th class="n">≈₮ (ханшаар)</th><th class="n">Төлсөн ₮</th><th>Төлөв</th></tr>' + P.cos.map(function (c) {
    return '<tr><td>' + esc(BUSINESSES[c.biz].name) + '</td><td class="n">$' + c.usd + '</td><td class="n">' + fmt(c.est) + '</td><td class="n">' + (c.paid ? fmt(c.paid) : '') + '</td><td>' + (c.isPaid ? 'Төлсөн · ' + c.last : 'Төлөгдөөгүй') + '</td></tr>'; }).join('') + '</table>';
  var rows = '<table class="rep-t" style="margin-top:8px"><tr><th>Компани</th><th>Бараа</th><th class="n">$</th><th class="n">Энэ гүйлгээнээс ₮</th><th>Бичилт</th></tr>' + P.alloc.map(function (o) {
    var x = o.x, other = x.biz !== l.biz;
    return '<tr><td>' + bstCoName(x.biz) + '</td><td>' + esc(x.item) + '</td><td class="n">$' + x._usd + '</td><td class="n">' + fmt(o.a) + '</td><td><small>' + (other ? bstCoName(l.biz) + ': Дт 1290 / Кт банк; ' + bstCoName(x.biz) + ': Дт 7120 / Кт 1290' : 'Дт 7120 / Кт банк') + '</small></td></tr>'; }).join('') + '</table>';
  var sel = P.cos.filter(function (c) { return P.alloc.some(function (o) { return o.x.biz === c.biz; }); }), est = sel.reduce(function (a, c) { return a + c.est - c.paid; }, 0), df = r0(l.debit - est);
  $('bstBkBody').innerHTML = modes + cos + rows + '<p class="muted" style="font-size:12.5px;margin-top:6px">Банкаар ' + fmt(l.debit) + ' · ханшаар үлдсэн ' + fmt(r0(est)) +
    (Math.abs(df) > 0.5 ? ' · ' + (df < 0 ? '<span class="neg">дутуу ' + fmt(-df) + '</span> (дараагийн гүйлгээг мөн энэ нэхэмжлэхэд тулгаж болно)' : 'илүү ' + fmt(df) + ' (ханшийн зөрүү — бодит төлсөн дүнгээр зардал болно)') : '') + '</p>';
}
function bstBankSave() {
  var P = bstBkPlan(), l = bstBk.l; if (!P || !P.alloc.length) return;
  var info = bankAcctInfo(l.acct), acc = info ? info.acc : '1101', d = l.date.slice(0, 10), payer = l.biz, pn = BUSINESSES[payer].name, tag = bstTag(P.v.no), E = [];
  P.alloc.forEach(function (o) {
    var x = o.x; if (!(o.a > 0)) return;
    if (x.biz === payer) { E.push({ biz: payer, date: d, dr: '7120', cr: acc, amount: o.a, partner: BOOST_PARTNER, desc: 'Boost · ' + x.item + ' ' + tag }); return; }
    var on = BUSINESSES[x.biz].name;
    E.push({ biz: payer, date: d, dr: '1290', cr: acc, amount: o.a, partner: on, desc: 'Boost · ' + x.item + ' · ' + on + ' ' + tag });
    E.push({ biz: x.biz, date: d, dr: '7120', cr: '1290', amount: o.a, partner: pn, desc: 'Boost · ' + x.item + ' ' + tag });
  });
  E.forEach(function (e) { e.bankId = l.id; });
  var upd = [{ id: l.id, status: 'Тулгасан', link: 'Boost нэхэмжлэх · ' + P.v.no }];
  if (!confirm('Boost нэхэмжлэх ' + P.v.no + ' · ' + d + ' · ' + fmt(l.debit) + '\n' + P.alloc.length + ' мөрөнд $-ын харьцаагаар хуваана.\n\n' + E.length + ' журналын бичилт үүснэ. Тулгах уу?')) return;
  gClose();
  if (!API_URL) { E.forEach(function (e, i) { e.id = 'J' + Date.now() + '-' + i; e.by = ownerName; journal.push(e); }); l.status = 'Тулгасан'; l.link = upd[0].link; save('nb_demo_journal', journal); save('nb_demo_bank', bankLines); render(); return; }
  l.status = 'Тулгасан'; l.link = upd[0].link; delete bankPick[l.id];
  E.forEach(function (e, i) { journal.push(Object.assign({ id: 'tmp' + Date.now() + '-' + i, by: ownerName }, e)); }); render();
  var n = 2, fin = function () { if (--n === 0) { toast('Boost нэхэмжлэх тулгагдлаа'); refresh(); } };
  post({ type: 'admin_journal', by: ownerName, entries: E }, function (err) {
    if (err) { if (err !== 'locked') toast('Журнал бичигдсэнгүй: ' + err); refresh(); return; }
    fin(); post({ type: 'admin_bank', by: ownerName, updates: upd }, function (e2) { if (e2) toast('Алдаа: ' + e2); fin(); });
  });
}
