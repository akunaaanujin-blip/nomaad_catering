// ── ҮНДСЭН ХӨРӨНГӨ, ЭЛЭГДЭЛ ──
// Бүртгэл нь Script Properties «ASSETS»-д (admin_setting 'assets'), мөнгөн дүн нь журналд «#FA<id>» лавлагаатай:
// 2001 өртөг, 2002 хуримтлагдсан элэгдэл, 7304 элэгдлийн зардал (шулуун шугамаар, сар бүр), 7305 актласны гарз.

function faList(biz) { return (window.assets || []).filter(function (a) { return a.biz === biz; }); }
function faById(id) { return (window.assets || []).filter(function (a) { return a.id === id; })[0]; }
function faMonthly(A) { return A.life > 0 ? Math.round(Math.max(0, A.cost - (A.dep0 || 0) - (A.salv || 0)) / A.life) : 0; }
function faStart(A) { var d = new Date(Number(A.date.slice(0, 4)), Number(A.date.slice(5, 7)), 1); return todayStr(d).slice(0, 7); }   // авсны дараа сараас
function faStat(A, E) {   // acc — хуримтлагдсан элэгдэл, months — бичсэн сарууд
  var acc = 0, months = {};
  (E || Jc()).forEach(function (e) {
    if (!hasTag(e.desc, A.id)) return;
    if (e.cr === '2002') acc += e.amount; else if (e.dr === '2002') acc -= e.amount;
    var mm = String(e.desc).match(/Элэгдэл (\d{4}-\d{2})/);
    if (mm && e.dr === '7304') months[mm[1]] = (months[mm[1]] || 0) + e.amount;
  });
  return { acc: r0(acc), book: A.status === 'Актласан' ? 0 : r0(A.cost - acc), months: months };
}
function faDue(A, m, E) {   // m сард бичих элэгдэл (0 — бичих зүйлгүй)
  if (A.status !== 'Ашиглаж буй' || m < faStart(A)) return 0;
  var st = faStat(A, E);
  if (st.months[m]) return 0;
  var left = r0(A.cost - (A.salv || 0) - st.acc);
  return left > 0 ? Math.min(left, faMonthly(A)) : 0;
}
function faMissed(A, m, E) {   // m-ээс өмнө бичигдээгүй сарын тоо (хуримтлагдсан дүнгээр — он хаасны дараа ч зөв)
  var mon = faMonthly(A), s0 = faStart(A);
  if (A.status !== 'Ашиглаж буй' || !mon || m <= s0) return 0;
  var n = (Number(m.slice(0, 4)) - Number(s0.slice(0, 4))) * 12 + Number(m.slice(5, 7)) - Number(s0.slice(5, 7));
  var expect = Math.min(A.cost - (A.salv || 0), (A.dep0 || 0) + n * mon);
  return Math.max(0, Math.round((expect - faStat(A, E).acc) / mon));
}

function assetsView() {
  var biz = state.biz, E = Jc(), list = faList(biz), m = state.faMonth || prevMonth();
  var f = state.faF || 'active', tot = { cost: 0, acc: 0, book: 0, mon: 0 };
  list.forEach(function (A) { if (A.status === 'Актласан') return; var s = faStat(A, E); tot.cost += A.cost; tot.acc += s.acc; tot.book += s.book; tot.mon += faMonthly(A); });
  var due = list.map(function (A) { return { A: A, amt: faDue(A, m, E), miss: faMissed(A, m, E) }; }).filter(function (x) { return x.amt > 0; });
  var dueCard = '<div class="card rep"><div class="rep-cap"><b>Сарын элэгдэл бичих</b><span>Сар бүрийн эцэст. Мөр бүрийг шалгаад сонгосноо бичнэ (Дт 7304 Элэгдлийн зардал / Кт 2002 Хуримтлагдсан элэгдэл).</span></div>' +
    '<div class="filter"><label>Сар<input type="month" value="' + m + '" onchange="state.faMonth=this.value;render()"></label></div>' +
    (due.length ? '<div class="scroll"><table class="rep-t"><tr><th></th><th>Хөрөнгө</th><th class="n">Сарын элэгдэл</th><th>Анхааруулга</th></tr>' + due.map(function (x) {
      return '<tr><td><input type="checkbox" class="fa-ck" value="' + esc(x.A.id) + '" checked style="width:auto"></td><td>' + esc(x.A.name) + '</td><td class="n">' + mny(x.amt) + '</td>' +
        '<td>' + (x.miss ? '<small class="muted">Өмнөх ' + x.miss + ' сарынх бичигдээгүй</small> <button class="mini" onclick="faCatchUp(\'' + x.A.id + '\',\'' + m + '\')">Нөхөж бичих</button>' : '') + '</td></tr>';
    }).join('') + '<tr class="tot"><td></td><td>Нийт</td><td class="n">' + mny(due.reduce(function (a, x) { return a + x.amt; }, 0)) + '</td><td></td></tr></table></div>' +
      '<div class="pg-act" style="margin-top:8px"><button class="b-btn primary" onclick="faPostDep(\'' + m + '\')">Сонгосныг ' + m + ' сард бичих</button></div>'
      : '<p class="muted" style="margin:8px 0 0">' + m + ' сард бичих элэгдэл алга' + (list.length ? ' (бүгд бичигдсэн эсвэл хугацаа нь эхлээгүй)' : '') + '.</p>') + '</div>';
  var ls = list.filter(function (A) { return f === 'all' || (f === 'gone' ? A.status === 'Актласан' : A.status !== 'Актласан'); });
  var rows = ls.map(function (A) {
    var s = faStat(A, E), gone = A.status === 'Актласан', ended = !gone && r0(A.cost - (A.salv || 0) - s.acc) <= 0;
    return '<tr><td>' + esc(A.date) + '</td><td><b>' + esc(A.name) + '</b>' + (A.note ? '<br><small class="muted">' + esc(A.note) + '</small>' : '') + '</td>' +
      '<td class="n">' + dl({ acc: ['2001'], tag: A.id, sign: 1, bal: true, t: A.name + ' — өртөг' }, mny(A.cost)) + '</td><td class="n">' + A.life + ' сар</td><td class="n">' + mny(faMonthly(A)) + '</td>' +
      '<td class="n">' + (s.acc ? dl({ acc: ['2002'], tag: A.id, sign: -1, bal: true, t: A.name + ' — хуримтлагдсан элэгдэл' }, mny(s.acc)) : '') + '</td><td class="n"><b>' + mny(s.book) + '</b></td>' +
      '<td>' + (gone ? '<span class="tag">Актласан</span>' : ended ? '<span class="tag">Бүрэн элэгдсэн</span>' : '<span class="tag b">Ашиглаж буй</span>') + '</td>' +
      '<td class="n" style="white-space:nowrap">' + (gone ? '' : '<button class="mini" onclick="openAsset(\'' + A.id + '\')">Засах</button><button class="mini" onclick="faDispose(\'' + A.id + '\')">Актлах</button>') + '</td></tr>';
  }).join('');
  var tabs = '<div class="tabs" style="margin-bottom:10px">' + [['active', 'Ашиглаж буй'], ['gone', 'Актласан'], ['all', 'Бүгд']].map(function (t) {
    return '<button class="' + (f === t[0] ? 'on' : '') + '" onclick="state.faF=\'' + t[0] + '\';render()">' + t[1] + '</button>'; }).join('') + '</div>';
  var b = balances(E, todayStr()), unreg = r0((b['2001'] || 0) + (b['2002'] || 0) - tot.book);
  return '<div class="kpis">' + kpi('Өртөг', fmt(tot.cost)) + kpi('Хуримтлагдсан элэгдэл', fmt(tot.acc)) + kpi('Үлдэгдэл өртөг', fmt(tot.book)) + kpi('Сарын элэгдэл', fmt(tot.mon)) + '</div>' +
    dueCard + tabs + '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Огноо</th><th>Хөрөнгө</th><th class="n">Өртөг</th><th class="n">Хугацаа</th><th class="n">Сарын элэгдэл</th>' +
    '<th class="n">Хуримтлагдсан</th><th class="n">Үлдэгдэл өртөг</th><th>Төлөв</th><th></th></tr>' +
    (rows || '<tr><td colspan="9" class="muted">Бүртгэл алга — «+ Хөрөнгө бүртгэх» дарж нэмнэ үү (тавилга, тоног төхөөрөмж, машин, компьютер г.м)</td></tr>') + '</table></div>' +
    (Math.abs(unreg) >= 1 ? '<p class="rep-note">Бүртгэлгүй (#лавлагаагүй) үндсэн хөрөнгийн үлдэгдэл: <b>' + mny(unreg) + '</b> — өмнө нь 2001 дансанд шууд бичсэн гүйлгээ.</p>' : '') + '</div>';
}
function prevMonth() { var n = new Date(); return todayStr(new Date(n.getFullYear(), n.getMonth() - 1, 1)).slice(0, 7); }

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
  $('faInfo').innerHTML = (A.cost && A.life ? 'Сарын элэгдэл: <b>' + fmt(mon) + '</b> (' + fmt(A.cost - A.dep0 - A.salv) + ' ÷ ' + A.life + ' сар) — авсны дараа сараас эхэлнэ. ' : '') +
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
function faPostDep(m) {
  var ids = [].map.call(document.querySelectorAll('.fa-ck:checked'), function (c) { return c.value; });
  if (!ids.length) { toast('Хөрөнгөө сонгоно уу'); return; }
  var E0 = Jc(), d = lastDayOf(m), E = [];
  ids.forEach(function (id) {
    var A = faById(id), amt = A ? faDue(A, m, E0) : 0;
    if (amt > 0) E.push({ biz: A.biz, date: d, dr: '7304', cr: '2002', amount: amt, partner: '', desc: 'Элэгдэл ' + m + ' #' + A.id + ' ' + A.name });
  });
  if (!E.length) return;
  if (!confirm(m + ' сарын элэгдэл: ' + E.length + ' хөрөнгө, нийт ' + fmt(E.reduce(function (a, e) { return a + e.amount; }, 0)) + '\nЖурналд бичих үү?')) return;
  postEntries(E, function () { toast('✓ Элэгдэл бичигдлээ'); if (API_URL) refresh(); else render(); });
}
function addMonth(m, k) { return todayStr(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + k, 1)).slice(0, 7); }
function faCatchUp(id, m) {   // m-ээс өмнөх бичигдээгүй саруудын элэгдэл (сар бүр тусдаа, тухайн сарын сүүлийн өдрөөр)
  var A = faById(id), E0 = Jc(); if (!A) return;
  var n = faMissed(A, m, E0), st = faStat(A, E0), mon = faMonthly(A), list = [], cur = m;
  while (list.length < n) { cur = addMonth(cur, -1); if (cur < faStart(A)) break; if (!st.months[cur]) list.unshift(cur); }
  var left = r0(A.cost - (A.salv || 0) - st.acc), E = [];
  list.forEach(function (mm) { var a = Math.min(left, mon); if (a > 0) { E.push({ biz: A.biz, date: lastDayOf(mm), dr: '7304', cr: '2002', amount: a, partner: '', desc: 'Элэгдэл ' + mm + ' #' + A.id + ' ' + A.name }); left = r0(left - a); } });
  if (!E.length) return;
  if (!confirm('«' + A.name + '»: ' + E[0].desc.slice(8, 15) + ' — ' + E[E.length - 1].desc.slice(8, 15) + ' хүртэл ' + E.length + ' сарын элэгдэл, нийт ' + fmt(E.reduce(function (a, e) { return a + e.amount; }, 0)) + '\nЖурналд бичих үү?')) return;
  postEntries(E, function () { toast('✓ Нөхөж бичигдлээ'); if (API_URL) refresh(); else render(); });
}
function faDispose(id) {
  var A = faById(id); if (!A) return;
  var s = faStat(A), date = prompt('«' + A.name + '»-г актлах (данснаас хасах) огноо:', todayStr());
  if (!date) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('Огноо буруу'); return; }
  if (!confirm('Өртөг ' + fmt(A.cost) + ', хуримтлагдсан элэгдэл ' + fmt(s.acc) + '\nҮлдэгдэл өртөг ' + fmt(s.book) + ' гарзаар (7305) бичигдэнэ. Актлах уу?')) return;
  var d = '#' + A.id + ' ' + A.name, E = [];
  if (s.acc > 0) E.push({ biz: A.biz, date: date, dr: '2002', cr: '2001', amount: s.acc, partner: '', desc: 'Актласан — элэгдэл хаасан ' + d });
  if (s.book > 0) E.push({ biz: A.biz, date: date, dr: '7305', cr: '2001', amount: s.book, partner: '', desc: 'Актласан — үлдэгдэл өртөг гарз ' + d });
  var list = (window.assets || []).map(function (x) { return x.id === id ? Object.assign({}, x, { status: 'Актласан', gone: date }) : x; });
  postEntries(E, function () { faSave(list, function () { toast('Актлагдлаа'); if (API_URL) refresh(); else render(); }); });
}
