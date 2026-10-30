// ── ҮНДСЭН ХӨРӨНГӨ, ЭЛЭГДЭЛ ──
// Бүртгэл нь Script Properties «ASSETS»-д (admin_setting 'assets'), мөнгөн дүн нь журналд «#FA<id>» лавлагаатай:
// 2001 өртөг, 2002 хуримтлагдсан элэгдэл, 7113 элэгдлийн зардал, 7412 ҮХ хассаны гарз.
// Элэгдэл сар бүрийн эцэст АВТОМАТААР бодогдоно (reports.js buildJournal — бүртгэлээс), гараар бичих шаардлагагүй.

function faList(biz) { return (window.assets || []).filter(function (a) { return a.biz === biz; }); }
function faById(id) { return (window.assets || []).filter(function (a) { return a.id === id; })[0]; }
function faMonthly(A) { return A.life > 0 ? Math.round(Math.max(0, A.cost - (A.dep0 || 0) - (A.salv || 0)) / A.life) : 0; }
function faStart(A) { var d = new Date(Number(A.date.slice(0, 4)), Number(A.date.slice(5, 7)), 1); return todayStr(d).slice(0, 7); }   // авсны дараа сараас
function faStat(A, E, upto) {   // acc — хуримтлагдсан элэгдэл (upto огноо хүртэл), months — элэгдэл бодогдсон сарууд
  var acc = 0, months = {};
  (E || Jc()).forEach(function (e) {
    if (!hasTag(e.desc, A.id) || (upto && e.date > upto)) return;
    if (e.cr === '2002') acc += e.amount; else if (e.dr === '2002') acc -= e.amount;
    var mm = String(e.desc).match(/Элэгдэл (\d{4}-\d{2})/);
    if (mm && e.dr === '7113') months[mm[1]] = (months[mm[1]] || 0) + e.amount;
  });
  return { acc: r0(acc), book: A.status === 'Актласан' ? 0 : r0(A.cost - acc), months: months };
}
function assetsView() {
  var biz = state.biz, E = Jc(), list = faList(biz);
  var f = state.faF || 'active', tot = { cost: 0, acc: 0, book: 0, mon: 0 };
  list.forEach(function (A) { if (A.status === 'Актласан') return; var s = faStat(A, E); tot.cost += A.cost; tot.acc += s.acc; tot.book += s.book; tot.mon += faMonthly(A); });
  var ls = list.filter(function (A) { return f === 'all' || (f === 'gone' ? A.status === 'Актласан' : A.status !== 'Актласан'); });
  var rows = ls.map(function (A) {
    var s = faStat(A, E), gone = A.status === 'Актласан', ended = !gone && r0(A.cost - (A.salv || 0) - s.acc) <= 0;
    return '<tr><td>' + esc(A.date) + '</td><td><b>' + esc(A.name) + '</b>' + (A.note ? '<br><small class="muted">' + esc(A.note) + '</small>' : '') + '</td>' +
      '<td class="n">' + dl({ acc: ['2001'], tag: A.id, sign: 1, bal: true, t: A.name + ' — өртөг' }, mny(A.cost)) + '</td><td class="n">' + A.life + ' сар</td><td class="n">' + mny(faMonthly(A)) + '</td>' +
      '<td class="n">' + (s.acc ? dl({ acc: ['2002'], tag: A.id, sign: -1, bal: true, t: A.name + ' — хуримтлагдсан элэгдэл' }, mny(s.acc)) : '') + '</td><td class="n"><b>' + mny(s.book) + '</b></td>' +
      '<td>' + (gone ? '<span class="tag">Актласан</span>' : ended ? '<span class="tag">Бүрэн элэгдсэн</span>' : '<span class="tag b">Ашиглаж буй</span>') + '</td>' +
      '<td class="n" style="white-space:nowrap">' + (gone ? '' : '<button class="mini" onclick="openAsset(\'' + A.id + '\')">Засах</button><button class="mini" onclick="faDispose(\'' + A.id + '\')">Актлах</button>') + '</td></tr>';
  }).join('');
  var tabs = stBar('Төлөв', [['active', 'Ашиглаж буй'], ['gone', 'Актласан'], ['all', 'Бүгд']], f, "state.faF='%'");
  var b = balances(E, todayStr()), unreg = r0((b['2001'] || 0) + (b['2002'] || 0) - tot.book);
  return '<div class="kpis">' + kpi('Өртөг', fmt(tot.cost)) + kpi('Хуримтлагдсан элэгдэл', fmt(tot.acc)) + kpi('Үлдэгдэл өртөг', fmt(tot.book)) + kpi('Сарын элэгдэл', fmt(tot.mon)) + '</div>' +
    '<p class="hint">Элэгдэл сар бүрийн эцэст автоматаар бодогдож санхүүд орно (Дт 7113 Элэгдлийн зардал / Кт 2002 Хуримтлагдсан элэгдэл) — гараар бичих шаардлагагүй. ' +
    'Хөрөнгө бүртгэхэд авсны дараа сараас эхэлж, үлдэх өртөгт хүрэхэд зогсоно.</p>' + tabs + '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Хөрөнгө</th><th class="n">Өртөг</th><th class="n">Хугацаа</th><th class="n">Сарын элэгдэл</th>' +
    '<th class="n">Хуримтлагдсан</th><th class="n">Үлдэгдэл өртөг</th><th>Төлөв</th><th></th></tr>' +
    (rows || '<tr><td colspan="9" class="muted">Бүртгэл алга — «+ Хөрөнгө бүртгэх» дарж нэмнэ үү (тавилга, тоног төхөөрөмж, машин, компьютер г.м)</td></tr>') + '</table></div>' +
    (Math.abs(unreg) >= 1 ? '<p class="rep-note">Бүртгэлгүй (#лавлагаагүй) үндсэн хөрөнгийн үлдэгдэл: <b>' + mny(unreg) + '</b> — өмнө нь 2001 дансанд шууд бичсэн гүйлгээ.</p>' : '') + '</div>';
}

// ── Бүртгэх / засах ──
function openAsset(id) {
  var A = id ? faById(id) : null, has = A && journal.some(function (j) { return hasTag(j.desc, A.id); });
  gOpen('<h2>' + (A ? 'Үндсэн хөрөнгө засах' : 'Үндсэн хөрөнгө бүртгэх') + '</h2>' +
    '<label for="faName">Нэр</label><input id="faName" placeholder="Жишээ: Хөргөгч, лангуу, ноутбук">' +
    '<div class="row2"><div><label for="faDate">Авсан (бүртгэх) огноо</label><input id="faDate" type="date"' + (has ? ' disabled' : '') + '></div>' +
    '<div><label for="faCost">Өртөг (₮)</label><input id="faCost" type="number" min="0" inputmode="numeric" oninput="faCalc()"' + (has ? ' disabled' : '') + '></div></div>' +
    '<div class="row2"><div><label for="faLife">Ашиглах хугацаа (сар)</label><input id="faLife" type="number" min="1" inputmode="numeric" placeholder="Жишээ: 60" oninput="faCalc()"></div>' +
    '<div><label for="faSalv">Үлдэх өртөг (₮)</label><input id="faSalv" type="number" min="0" inputmode="numeric" placeholder="0" oninput="faCalc()"></div></div>' +
    (A ? '' : '<label for="faHow">Хэрхэн авсан</label><select id="faHow" onchange="faCalc()">' +
      '<option value="1101">Харилцах дансаар төлсөн</option><option value="10003">Бэлнээр (касс) төлсөн</option>' +
      ACCOUNTS.filter(function (a) { return a[3] === 'cash' && a[0] !== '1101' && a[0] !== '10003'; }).map(function (a) { return '<option value="' + a[0] + '">' + esc(a[1]) + '</option>'; }).join('') +
      '<option value="3101">Зээлээр (нийлүүлэгчид өртэй)</option><option value="open">Өмнөөс байсан (эхний үлдэгдэл)</option><option value="none">Мөнгө нь санхүүд бичигдсэн (банкны хуулгаар 2001-д)</option></select>' +
      '<div id="faPartnerWrap" style="display:none"><label for="faPartner">Нийлүүлэгч</label><input id="faPartner" list="faPartners"><datalist id="faPartners">' + partnerOptions() + '</datalist></div>' +
      '<div id="faDep0Wrap" style="display:none"><label for="faDep0">Өнөөдрийг хүртэл хуримтлагдсан элэгдэл (₮)</label><input id="faDep0" type="number" min="0" inputmode="numeric" placeholder="0" oninput="faCalc()"></div>') +
    '<label for="faNote">Тэмдэглэл</label><input id="faNote" placeholder="Байршил, серийн дугаар г.м">' +
    '<p class="muted" id="faInfo" style="font-size:12.5px;margin-top:6px"></p>' +
    (A ? '<p class="muted" style="font-size:12.5px">Хугацаа, үлдэх өртгийг өөрчилбөл элэгдэл эхнээс нь дахин бодогдоно.</p>' : '') +
    '<button class="btn" onclick="saveAsset(' + (A ? '\'' + A.id + '\'' : '') + ')">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button>' +
    (A && !has ? '<p style="margin-top:8px"><button class="b-btn" onclick="faDelete(\'' + A.id + '\')">Буруу бүртгэсэн бол устгах</button></p>' : ''));
  $('faName').value = A ? A.name : ''; $('faDate').value = A ? A.date : todayStr(); $('faCost').value = A ? A.cost : '';
  $('faLife').value = A ? A.life : ''; $('faSalv').value = A && A.salv ? A.salv : ''; $('faNote').value = A ? A.note || '' : '';
  faCalc();
}
function faCalc() {
  var how = $('faHow') ? $('faHow').value : '';
  if ($('faHow')) { $('faPartnerWrap').style.display = how === '3101' ? '' : 'none'; $('faDep0Wrap').style.display = how === 'open' ? '' : 'none'; }
  var A = { cost: Number($('faCost').value) || 0, life: Number($('faLife').value) || 0, salv: Number($('faSalv').value) || 0, dep0: how === 'open' ? Number($('faDep0') && $('faDep0').value) || 0 : 0 };
  var mon = faMonthly(A);
  $('faInfo').innerHTML = (A.cost && A.life ? 'Сарын элэгдэл: <b>' + fmt(mon) + '</b> (' + fmt(A.cost - A.dep0 - A.salv) + ' ÷ ' + A.life + ' сар) — авсны дараа сараас эхлэн сар бүрийн эцэст автоматаар. ' : '') +
    ({ open: 'Дт 2001 / Кт 4201 эхний үлдэгдэл' + (A.dep0 ? ', хуримтлагдсан элэгдэл Дт 4201 / Кт 2002' : '') + ' бичигдэнэ.',
       none: 'Журналд юу ч бичихгүй — мөнгө нь банкны хуулгаар «Үндсэн хөрөнгө (2001)»-д тулгагдсан байх ёстой.',
       '3101': 'Дт 2001 / Кт 3101 нийлүүлэгчид өр бичигдэнэ.' }[how] || (how ? 'Дт 2001 / Кт ' + how + ' ' + esc(accName(how)) + ' бичигдэнэ.' : ''));
}
function faSave(list, cb) {
  if (!API_URL) { window.assets = list; save('nb_demo_assets', list); cb(); return; }
  post({ type: 'admin_setting', key: 'assets', value: list }, function (err) {
    if (err) { toast(err === 'too_big' ? 'Хөрөнгийн бүртгэл хэт олон боллоо' : 'Алдаа: ' + err); return; }
    window.assets = list; cb();
  });
}
function saveAsset(id) {
  var A = id ? JSON.parse(JSON.stringify(faById(id))) : { id: 'FA' + Date.now().toString().slice(-9), biz: state.biz, status: 'Ашиглаж буй' };
  A.name = $('faName').value.trim().slice(0, 60); A.life = Math.round(Number($('faLife').value) || 0); A.salv = Number($('faSalv').value) || 0; A.note = $('faNote').value.trim().slice(0, 60);
  if (!$('faDate').disabled) { A.date = $('faDate').value; A.cost = Number($('faCost').value) || 0; }
  var how = id ? '' : $('faHow').value, partner = how === '3101' ? $('faPartner').value.trim() : '';
  if (!id) A.dep0 = how === 'open' ? Number($('faDep0').value) || 0 : 0;
  if (!A.name) { toast('Нэрээ бичнэ үү'); return; }
  if (!A.date || !(A.cost > 0)) { toast('Огноо, өртгөө оруулна уу'); return; }
  if (!(A.life > 0)) { toast('Ашиглах хугацааг (сараар) оруулна уу'); return; }
  if (A.salv + (A.dep0 || 0) >= A.cost) { toast('Үлдэх өртөг + хуримтлагдсан элэгдэл өртгөөс бага байх ёстой'); return; }
  if (how === '3101' && !partner) { toast('Нийлүүлэгчээ бичнэ үү'); return; }
  var old = id ? faById(id) : null, first = lastDayOf(faStart(A));
  if (meta.lock && first <= meta.lock && (!old || old.life !== A.life || (old.salv || 0) !== A.salv)) {   // түгжсэн саруудын элэгдэл өөрчлөгдөхгүй
    toast(meta.lock + ' хүртэл түгжигдсэн — ' + (old ? 'элэгдэл нь түгжигдсэн сард бодогдсон хөрөнгийн хугацааг өөрчлөхгүй' : 'огноог түгжээнээс хойш оруулна уу')); return;
  }
  var list = (window.assets || []).filter(function (x) { return x.id !== A.id; }).concat([A]);
  var E = [], d = '#' + A.id + ' ' + A.name;
  if (how === 'open') {
    E.push({ biz: A.biz, date: A.date, dr: '2001', cr: '4201', amount: A.cost, partner: '', desc: 'Үндсэн хөрөнгө (эхний үлдэгдэл) ' + d });
    if (A.dep0) E.push({ biz: A.biz, date: A.date, dr: '4201', cr: '2002', amount: A.dep0, partner: '', desc: 'Хуримтлагдсан элэгдэл (эхний үлдэгдэл) ' + d });
  } else if (how && how !== 'none') E.push({ biz: A.biz, date: A.date, dr: '2001', cr: how, amount: A.cost, partner: partner, desc: 'Үндсэн хөрөнгө авсан ' + d });
  faSave(list, function () {
    postEntries(E, function () { gClose(); toast(id ? 'Хадгалагдлаа' : 'Бүртгэгдлээ'); if (API_URL) refresh(); else render(); });
  });
}
function faDelete(id) {
  if (journal.some(function (j) { return hasTag(j.desc, id); })) { toast('Гүйлгээтэй хөрөнгийг устгахгүй — «Актлах»-аар хасна'); return; }
  if (!confirm('Энэ бүртгэлийг устгах уу?')) return;
  faSave((window.assets || []).filter(function (x) { return x.id !== id; }), function () { gClose(); render(); toast('Устгагдлаа'); });
}
function faDispose(id) {
  var A = faById(id); if (!A) return;
  var date = prompt('«' + A.name + '»-г актлах (данснаас хасах) огноо:', todayStr());
  if (!date) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayStr()) { toast('Огноо буруу'); return; }
  var s = faStat(A, Jc(), date);   // тэр өдөр хүртэлх элэгдэл
  if (!confirm('Өртөг ' + fmt(A.cost) + ', хуримтлагдсан элэгдэл ' + fmt(s.acc) + '\nҮлдэгдэл өртөг ' + fmt(s.book) + ' гарзаар (7412) бичигдэнэ. Актлах уу?')) return;
  var d = '#' + A.id + ' ' + A.name, E = [];
  if (s.acc > 0) E.push({ biz: A.biz, date: date, dr: '2002', cr: '2001', amount: s.acc, partner: '', desc: 'Актласан — элэгдэл хаасан ' + d });
  if (s.book > 0) E.push({ biz: A.biz, date: date, dr: '7412', cr: '2001', amount: s.book, partner: '', desc: 'Актласан — үлдэгдэл өртөг гарз ' + d });
  var list = (window.assets || []).map(function (x) { return x.id === id ? Object.assign({}, x, { status: 'Актласан', gone: date }) : x; });
  postEntries(E, function () { faSave(list, function () { toast('Актлагдлаа'); if (API_URL) refresh(); else render(); }); });
}
