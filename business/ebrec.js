// ═══════════ Буухиатай тулгах (8-р ээлж) ═══════════
// Буухиагийн тайланг (Excel/CSV) оруулж хүргэлт бүрээр системийн «Буухиагаас авах» дүнтэй харьцуулна.
// Системийн дүн = харилцагч «Буухиа»-гийн 1201 (авлага) − 3101 (өглөг) — тэр хүргэлтийн кодтой (#EB:/#EBR:/#EBX:/#EBT:) эсвэл захиалгатай (#ID) бичилтүүд.
// Зөрүүг автоматаар засахгүй — мөр бүрийг удирдлага «Засах» цонхоор шалгаж баталгаажуулна (журнал «#EBT:код»).
var ebRec = { rows: null, file: '', cols: '', err: '' };
try { var _er = JSON.parse(sessionStorage.getItem('nb_ebrec') || 'null'); if (_er) ebRec = _er; } catch (e) {}
function ebRecSave() { try { sessionStorage.setItem('nb_ebrec', JSON.stringify(ebRec)); } catch (e) {} }
function ebRecNum(v) { if (typeof v === 'number') return v; var s = String(v == null ? '' : v).replace(/[^\d.\-−]/g, '').replace('−', '-'); return Number(s) || 0; }
function ebRecPh(p) { return String(p || '').replace(/\D/g, '').slice(-8); }

// Excel/CSV → мөрүүд { code, phone, got, fee, net, st }
function ebRecFile(inp) {
  var f = inp.files && inp.files[0]; if (!f) return;
  ensureXlsx(function () {
    var rd = new FileReader();
    rd.onload = function (ev) {
      try {
        var wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' }), A = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
        var norm = function (h) { return String(h || '').toLowerCase().replace(/[\s_\-.]/g, ''); };
        var find = function (H, re, not) { for (var i = 0; i < H.length; i++) { var h = norm(H[i]); if (re.test(h) && !(not && not.test(h))) return i; } return -1; };
        var hi = -1, C = {};
        for (var r = 0; r < Math.min(A.length, 15); r++) {
          var H = A[r];
          C = { code: find(H, /код|code|дугаар|№/, /утас|phone/), phone: find(H, /утас|phone/), got: find(H, /авсан|хураасан|received|collected/),
                fee: find(H, /хөлс|хүргэлтийн(төлбөр|үнэ)|fee|үйлчилгээ/), net: find(H, /цэвэр|шилжүүлэх|net|тооцоо|үлдэгдэл/), st: find(H, /төлөв|status/) };
          if ((C.code >= 0 || C.phone >= 0) && (C.got >= 0 || C.net >= 0)) { hi = r; break; }
        }
        if (hi < 0) { ebRec = { rows: null, file: f.name, cols: '', err: 'Толгой мөр танигдсангүй — «Код»/«Утас» болон «Авсан мөнгө»/«Цэвэр» багана хэрэгтэй. Эхний мөр: ' + (A[0] || []).join(', ').slice(0, 200) }; ebRecSave(); render(); return; }
        var Hd = A[hi], rows = [];
        A.slice(hi + 1).forEach(function (v) {
          var code = C.code >= 0 ? String(v[C.code]).trim() : '', ph = C.phone >= 0 ? String(v[C.phone]).trim() : '';
          if (!code && !ph) return;
          if (/нийт|total/i.test(code + ph)) return;   // нийлбэрийн мөр
          var got = C.got >= 0 ? ebRecNum(v[C.got]) : 0, fee = C.fee >= 0 ? ebRecNum(v[C.fee]) : 0;
          rows.push({ code: code, phone: ph, got: got, fee: fee, net: C.net >= 0 ? ebRecNum(v[C.net]) : r0(got - fee), st: C.st >= 0 ? String(v[C.st]) : '' });
        });
        var used = Object.keys(C).filter(function (k) { return C[k] >= 0; }).map(function (k) { return { code: 'Код', phone: 'Утас', got: 'Авсан', fee: 'Хөлс', net: 'Цэвэр', st: 'Төлөв' }[k] + ' = «' + Hd[C[k]] + '»'; }).join(' · ');
        ebRec = { rows: rows, file: f.name, cols: used + (C.net < 0 ? ' · Цэвэр = Авсан − Хөлс' : ''), err: '' };
      } catch (e) { ebRec = { rows: null, file: f.name, cols: '', err: 'Файл уншиж чадсангүй: ' + e.message }; }
      ebRecSave(); render();
    };
    rd.readAsArrayBuffer(f);
  });
}

// Системийн «Буухиагаас авах» — кодоор (хүргэлт) нэгтгэнэ
function ebRecSys() {
  var O = {}, byCode = {}, M = (typeof ebLink === 'function' && ebAdm.list && ebAdm.biz === state.biz) ? ebLink() : {};
  (window.adminOrders || []).forEach(function (o) { if (o.biz === state.biz) { O[o.id] = o; if (o.ebCode && o.ebCode !== 'бусад') byCode[o.ebCode] = o; } });
  Object.keys(M).forEach(function (c) { if (M[c]) byCode[c] = M[c]; });
  var codeOf = {}; Object.keys(byCode).forEach(function (c) { codeOf[byCode[c].id] = c; });
  var S = {}, un = 0, tot = 0;
  J().forEach(function (e) {
    if (e.partner !== BUUHIA || e.date > todayStr()) return;
    var v = (e.dr === '1201' || e.dr === '3101' ? e.amount : 0) - (e.cr === '1201' || e.cr === '3101' ? e.amount : 0); if (!v) return;
    tot += v;
    var m = String(e.desc || '').match(/#EB[RXT]?:([\w-]+)/), id = (String(e.desc || '').match(/#(O[\w-]+)/) || [])[1] || (O[e.bill] ? e.bill : '');
    var k = m ? m[1] : id && codeOf[id] ? codeOf[id] : id ? '#' + id : '';
    if (!k) { un += v; return; }
    S[k] = (S[k] || 0) + v;
  });
  return { S: S, byCode: byCode, O: O, codeOf: codeOf, un: r0(un), tot: r0(tot) };
}

function ebRecView() {
  var head = '<div class="card"><p class="muted" style="margin:0 0 10px">Буухиагийн тайланг (Excel/CSV — ebuuhia.com → Харилцагчийн тайлан → Татах) оруулна. Хүргэлт бүрийг системийн «Буухиагаас авах» дүнтэй харьцуулна. Зөрүүг зөвхөн мөр бүрээр шалгаж, баталгаажуулж засна.</p>' +
    '<label class="b-btn ghost" style="cursor:pointer">Тайлан сонгох<input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="ebRecFile(this)"></label>' +
    (ebRec.file ? ' <span class="muted">' + esc(ebRec.file) + '</span> <button class="mini" onclick="ebRec={rows:null,file:\'\',cols:\'\',err:\'\'};ebRecSave();render()">Арилгах</button>' : '') +
    (ebRec.cols ? '<p class="muted" style="font-size:12.5px;margin:6px 0 0">Танигдсан багана: ' + esc(ebRec.cols) + '</p>' : '') +
    (ebRec.err ? '<p style="color:#B91C1C;margin:6px 0 0">' + esc(ebRec.err) + '</p>' : '') + '</div>';
  var sys = ebRecSys();
  if (!ebRec.rows) return head + '<div class="card"><p>Системд Буухиагаас цэвэр авах: <b>' + fmt(sys.tot) + '</b></p><p class="muted">Тайлан оруулсны дараа хүргэлт бүрээр тулгана.' + (!ebAdm.list ? ' Хүргэлтийн кодыг захиалгатай холбохын тулд «Борлуулалт → Хүргэлт» хуудсыг нэг удаа нээнэ үү.' : '') + '</p></div>';
  var seen = {}, rows = [], ts = 0, tr = 0, bad = 0;
  ebRec.rows.forEach(function (x, i) {
    var code = x.code, o = sys.byCode[code] || null;
    if (!o && x.phone) { var L = Object.keys(sys.O).map(function (k) { return sys.O[k]; }).filter(function (q) { return ebRecPh(q.phone) === ebRecPh(x.phone) && !ordDead(q); }); if (L.length === 1) o = L[0]; }
    var key = sys.S[code] !== undefined ? code : o && sys.codeOf[o.id] ? sys.codeOf[o.id] : o ? '#' + o.id : code;
    var s = seen[key] ? 0 : r0(sys.S[key] || 0); seen[key] = 1;
    var d = r0(x.net - s), ok = Math.abs(d) < 1; if (!ok) bad++;
    ts += s; tr += x.net;
    rows.push('<tr><td>' + esc(code || '—') + '</td><td class="nw">' + esc(x.phone || (o ? o.phone : '')) + '</td><td>' + (o ? esc((o.customer ? o.customer + ' · ' : '') + o.date) : '<span class="muted">захиалга олдсонгүй</span>') + (x.st ? '<br><small class="muted">' + esc(x.st) + '</small>' : '') + '</td>' +
      '<td class="n">' + fmt(x.got) + '</td><td class="n">' + fmt(x.fee) + '</td><td class="n"><b>' + fmt(x.net) + '</b></td><td class="n">' + fmt(s) + '</td>' +
      '<td class="n">' + (ok ? '<span style="color:#15803D">✓</span>' : '<span style="color:#B45309">⚠ ' + (d > 0 ? '+' : '−') + fmt(Math.abs(d)).slice(1) + '</span>') + '</td>' +
      '<td class="n">' + (ok ? '' : '<button class="mini" onclick="ebRecFix(' + i + ')">Засах</button>') + '</td></tr>');
  });
  // Тайланд ороогүй ч системд үлдэгдэлтэй хүргэлт
  var extra = Object.keys(sys.S).filter(function (k) { return !seen[k] && Math.abs(sys.S[k]) >= 1; });
  var ex = r0(extra.reduce(function (a, k) { return a + sys.S[k]; }, 0));
  ts = r0(ts); tr = r0(tr);
  var sum = '<div class="kpis">' + kpi('Системд', fmt(ts)) + kpi('Буухиа', fmt(tr)) + kpi('Зөрүү', '<span style="color:' + (Math.abs(tr - ts) < 1 ? 'var(--green)' : 'var(--red)') + '">' + fmt(r0(tr - ts)) + '</span>', bad ? bad + ' мөр ⚠' : 'бүгд ✓') + '</div>' +
    '<p class="muted" style="font-size:12.5px">Тайлангийн ' + ebRec.rows.length + ' хүргэлтээр. Системийн нийт Буухиагаас цэвэр авах: <b>' + fmt(sys.tot) + '</b>' +
    (extra.length ? ' · тайланд ороогүй ' + extra.length + ' хүргэлт ' + fmt(ex) : '') + (Math.abs(sys.un) >= 1 ? ' · хүргэлттэй холбогдоогүй бичилт (эхний үлдэгдэл г.м) ' + fmt(sys.un) : '') + '</p>';
  return head + '<div class="card">' + sum + '<div class="scroll"><table class="rep-t"><tr><th>Код</th><th>Утас</th><th>Захиалга</th><th class="n">Авсан</th><th class="n">Хөлс</th><th class="n">Буухиа</th><th class="n">Системд</th><th class="n">Тулгалт</th><th></th></tr>' +
    rows.join('') + '<tr class="tot"><td colspan="5">Нийт</td><td class="n">' + fmt(tr) + '</td><td class="n">' + fmt(ts) + '</td><td class="n">' + fmt(r0(tr - ts)) + '</td><td></td></tr></table></div>' +
    (extra.length ? '<p class="muted" style="margin-top:10px;font-size:12.5px">Тайланд ороогүй: ' + esc(extra.slice(0, 12).map(function (k) { return k + ' ' + fmt(sys.S[k]); }).join(', ')) + (extra.length > 12 ? '…' : '') + '</p>' : '') + '</div>';
}

// Нэг мөрийн зөрүүг гараар засах — данс сонгож, бичилтийг харуулаад баталгаажуулна
function ebRecFix(i) {
  var x = ebRec.rows[i]; if (!x) return;
  var sys = ebRecSys(), o = sys.byCode[x.code] || null;
  if (!o && x.phone) { var L = Object.keys(sys.O).map(function (k) { return sys.O[k]; }).filter(function (q) { return ebRecPh(q.phone) === ebRecPh(x.phone) && !ordDead(q); }); if (L.length === 1) o = L[0]; }
  var key = sys.S[x.code] !== undefined ? x.code : o && sys.codeOf[o.id] ? sys.codeOf[o.id] : o ? '#' + o.id : x.code;
  var s = r0(sys.S[key] || 0), d = r0(x.net - s);
  gOpen('<h2>Буухиа тулгалтын зөрүү засах</h2><p class="muted">' + esc((x.code || '') + ' · ' + (x.phone || (o ? o.phone : ''))) + '</p>' +
    '<table class="rep-t" style="margin:8px 0"><tr><td>Системд (Буухиагаас авах)</td><td class="n">' + fmt(s) + '</td></tr><tr><td><b>Буухиагийн тайлан</b></td><td class="n"><b>' + fmt(x.net) + '</b></td></tr><tr><td>Зөрүү</td><td class="n">' + (d > 0 ? '+' : '−') + fmt(Math.abs(d)).slice(1) + '</td></tr></table>' +
    '<label for="erAcc">Зөрүүний шалтгаан</label><select id="erAcc"><option value="7124">Хүргэлтийн хөлсний зөрүү — 7124 Хүргэлтийн зардал</option>' + (o ? '<option value="cust">Хураасан мөнгөний зөрүү — хэрэглэгчийн авлага (1201 ' + esc(ordCust(o)) + ')</option>' : '') + '</select>' +
    '<label for="erDate">Огноо</label><input id="erDate" type="date" value="' + todayStr() + '">' +
    '<p class="muted" style="font-size:12.5px;margin-top:8px">' + (d > 0 ? 'Дт 1201 Буухиа / Кт сонгосон данс' : 'Дт сонгосон данс / Кт 1201 Буухиа') + ' · ' + fmt(Math.abs(d)) + ' · «Буухиа тулгалт #EBT:' + esc(x.code || key) + '»</p>' +
    '<div style="margin-top:12px"><button class="btn" onclick="ebRecFixDo(' + i + ',' + d + ')">Баталгаажуулж бичих</button><button class="btn ghost" onclick="gClose()">Болих</button></div>');
}
function ebRecFixDo(i, d) {
  var x = ebRec.rows[i]; if (!x || Math.abs(d) < 1) { gClose(); return; }
  var sys = ebRecSys(), o = sys.byCode[x.code] || null;
  if (!o && x.phone) { var L = Object.keys(sys.O).map(function (k) { return sys.O[k]; }).filter(function (q) { return ebRecPh(q.phone) === ebRecPh(x.phone) && !ordDead(q); }); if (L.length === 1) o = L[0]; }
  var acc = $('erAcc').value, day = $('erDate').value || todayStr(), a = Math.abs(d), up = d > 0;
  var code = x.code || (o && sys.codeOf[o.id]) || '', tag = ' · ' + (x.phone || (o ? o.phone : '')) + (o ? ' #' + o.id : '') + (code ? ' #EBT:' + code : ''), E = [], desc = 'Буухиа тулгалт · тайлан ' + fmt(x.net) + ', систем ' + fmt(r0(x.net - d)) + tag;
  if (acc === 'cust' && o) {   // нэг бичилт нэг харилцагчтай — 1299 түр дансаар
    E.push({ biz: state.biz, date: day, dr: up ? '1299' : '1201', cr: up ? '1201' : '1299', amount: a, partner: ordParty(o), desc: desc });
    E.push({ biz: state.biz, date: day, dr: up ? '1201' : '1299', cr: up ? '1299' : '1201', amount: a, partner: BUUHIA, desc: desc });
  } else E.push({ biz: state.biz, date: day, dr: up ? '1201' : '7124', cr: up ? '7124' : '1201', amount: a, partner: BUUHIA, desc: desc });
  gClose();
  postEntries(E, function () { toast('Тулгалтын зөрүү бичигдлээ'); if (API_URL) refresh(); else render(); });
}
