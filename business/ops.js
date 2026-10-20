// ── ИРЦ, ҮНИЙН ТҮҮХ, ӨДРИЙН ТОЙМ И-МЭЙЛ ──

// ═══════════ Ирц: ажилтны «Ирлээ / Явлаа» → ажилласан цаг ═══════════
function hm(t) { var p = String(t || '').split(':'); return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0); }
function hmStr(min) { min = Math.round(min); return Math.floor(min / 60) + ':' + ('0' + (min % 60)).slice(-2); }
function attendDays(bizF, month) {   // { 'нэр|biz': { name, biz, days: { date: { in, out } } } }
  var o = {};
  records.filter(function (x) { return x.type === 'attend' && String(x.date).slice(0, 7) === month && (bizF === 'all' || x.biz === bizF); }).forEach(function (x) {
    var k = x.staff + '|' + x.biz, s = o[k] || (o[k] = { name: x.staff, biz: x.biz, days: {} }), d = s.days[x.date] || (s.days[x.date] = { in: '', out: '' });
    if (x.item === 'Ирлээ') { if (!d.in || x.time < d.in) d.in = x.time; }
    else if (x.item === 'Явлаа') { if (!d.out || x.time > d.out) d.out = x.time; }
  });
  return o;
}
function attendSum(s) {
  var n = 0, min = 0, noOut = 0, arr = 0, an = 0;
  Object.keys(s.days).forEach(function (d) {
    var x = s.days[d]; n++;
    if (x.in) { arr += hm(x.in); an++; }
    if (x.in && x.out && x.out > x.in) min += hm(x.out) - hm(x.in); else if (x.in) noOut++;
  });
  return { n: n, min: min, noOut: noOut, avgIn: an ? hmStr(arr / an) : '' };
}
function attendView() {
  var bizF = isOwner() ? state.staffBiz : (KEYS.length === 1 ? KEYS[0] : state.staffBiz), m = state.month, A = attendDays(bizF, m);
  var filt = KEYS.length > 1 ? '<div class="tabs">' + [['all', 'Бүгд']].concat(KEYS.map(function (k) { return [k, BUSINESSES[k].name.split(' ')[0]]; })).map(function (t) {
    return '<button class="' + (state.staffBiz === t[0] ? 'on' : '') + '" onclick="setStaffBiz(\'' + t[0] + '\')">' + esc(t[1]) + '</button>'; }).join('') + '</div>' : '<h2 style="margin:0">Ирц</h2>';
  var keys = Object.keys(A).sort(function (a, b) { return A[a].name < A[b].name ? -1 : 1; });
  var rows = keys.map(function (k) {
    var s = A[k], t = attendSum(s);
    return '<tr><td><b>' + esc(s.name) + '</b><br><small class="muted">' + esc(bizLabel(s.biz)) + '</small></td><td class="n">' + t.n + '</td><td class="n"><b>' + hmStr(t.min) + '</b></td>' +
      '<td class="n">' + (t.n - t.noOut ? hmStr(t.min / (t.n - t.noOut)) : '') + '</td><td class="n">' + esc(t.avgIn) + '</td><td class="n">' + (t.noOut || '') + '</td>' +
      '<td class="n"><button class="mini" onclick="openAttend(' + esc(JSON.stringify(k)) + ')">Өдрөөр</button></td></tr>';
  }).join('');
  return '<div class="card bar-row">' + filt + '<label class="month">Сар <input type="month" value="' + m + '" onchange="setMonth(this.value)"></label></div>' +
    '<p class="hint">Ажилтан дэлгүүрийн хуудаснаасаа «Ирлээ», «Явлаа» дарахад бүртгэгдэнэ. Ажилласан цаг = явсан − ирсэн. «Явсныг дараагүй» өдрийн цаг тооцогдохгүй.</p>' +
    '<div class="card rep"><div class="scroll"><table class="rep-t"><tr><th>Ажилтан</th><th class="n">Ирсэн өдөр</th><th class="n">Нийт цаг</th><th class="n">Өдрийн дундаж</th>' +
    '<th class="n">Дундаж ирсэн цаг</th><th class="n">Явсныг дараагүй</th><th></th></tr>' +
    (rows || '<tr><td colspan="7" class="muted">' + m + ' сард ирцийн бүртгэл алга</td></tr>') + '</table></div></div>';
}
function openAttend(k) {
  var s = attendDays('all', state.month)[k]; if (!s) return;
  var ds = Object.keys(s.days).sort();
  gOpen('<h2>' + esc(s.name) + ' · ' + state.month + '</h2><p class="muted">' + esc(bizLabel(s.biz)) + '</p>' +
    '<div class="scroll" style="max-height:60vh"><table class="rep-t"><tr><th>Огноо</th><th>Ирсэн</th><th>Явсан</th><th class="n">Цаг</th></tr>' + ds.map(function (d) {
      var x = s.days[d], ok = x.in && x.out && x.out > x.in;
      return '<tr><td>' + esc(d) + '</td><td>' + esc(x.in || '—') + '</td><td>' + esc(x.out || '—') + '</td><td class="n">' + (ok ? hmStr(hm(x.out) - hm(x.in)) : '') + '</td></tr>';
    }).join('') + '<tr class="tot"><td>Нийт</td><td></td><td></td><td class="n">' + hmStr(attendSum(s).min) + '</td></tr></table></div>' +
    '<button class="btn ghost" onclick="gClose()">Хаах</button>');
}

// ═══════════ Үнийн өөрчлөлтийн түүх (удирдлагаас үнэ солиход серверт бичигдэнэ) ═══════════
function repPrices(biz, f, t) {
  var rows = (window.priceLog || []).filter(function (x) { var d = String(x.date).slice(0, 10); return x.biz === biz && d >= f && d <= t; }).slice().reverse().map(function (x) {
    var pct = x.old ? Math.round((x.price - x.old) / x.old * 1000) / 10 : '';
    return { date: x.date, item: x.item, old: x.old, price: x.price, diff: x.price - x.old, pct: pct === '' ? '' : (pct > 0 ? '+' : '') + pct + '%', by: x.by };
  });
  return { title: 'Үнийн өөрчлөлтийн түүх', rows: rows,
    cols: [c('date', 'Огноо'), c('item', 'Бараа'), m('old', 'Хуучин үнэ'), m('price', 'Шинэ үнэ'), m('diff', 'Зөрүү'), c('pct', 'Хувь'), c('by', 'Хэн')],
    note: 'Зарах үнийг «Барааны бүртгэл»-ээс (гараар эсвэл Excel-ээр) солиход энд автоматаар бичигдэнэ.' };
}
function logPriceDemo(list) {   // туршилтын горимд үнийн түүх
  var old = {}, log = load('nb_demo_pricelog', []), now = todayStr() + ' ' + timeStr();
  BUSINESSES[state.biz].products.forEach(function (p) { old[p.name.toLowerCase()] = p.price; });
  list.forEach(function (p) { var o = old[p.name.toLowerCase()]; if (o !== undefined && o !== p.price) log.push({ date: now, biz: p.biz, item: p.name, old: o, price: p.price, by: ownerName }); });
  save('nb_demo_pricelog', log); window.priceLog = log;
}

// ═══════════ Өдрийн тойм и-мэйл (өглөө 8 цагт) ═══════════
function digestView() {
  var D = window.digestCfg || {};
  return '<div class="card"><h2>Өдрийн тойм и-мэйл</h2>' +
    '<p class="muted" style="margin:0 0 10px">Өглөө бүр 08:00-д анхаарах зүйлсийг нэг и-мэйлээр: хугацаа болсон сануулга, хоцорсон зээлийн төлөлт, баталгаажаагүй захиалгын төлбөр, тулгаагүй банкны гүйлгээ, доод үлдэгдлээс бага болсон бараа. Анхаарах зүйлгүй өдөр илгээхгүй.</p>' +
    '<label for="dgTo">И-мэйл хаяг</label><input id="dgTo" type="email" value="' + esc(D.to || '') + '" placeholder="name@gmail.com" style="max-width:360px">' +
    '<div class="pg-act" style="margin-top:8px"><button class="b-btn primary" onclick="dgSave()">Хадгалах</button><button class="b-btn" onclick="dgPreview()">Өнөөдрийнхийг харах</button></div>' +
    '<p style="margin-top:12px">Төлөв: <b>' + (D.on ? 'Идэвхтэй — өдөр бүр 08:00' : 'Унтраалттай') + '</b>' +
      (D.mail ? ' <button class="b-btn" onclick="dgToggle(' + (D.on ? 'false' : 'true') + ')">' + (D.on ? 'Унтраах' : 'Асаах') + '</button>' : '') + '</p>' +
    (D.mail ? '' : '<p class="rep-note">И-мэйл илгээхэд Google-ийн «и-мэйл илгээх» зөвшөөрлийг нэг удаа өгөх шаардлагатай, одоогоор өгөөгүй байна. Зөвшөөрөл өгтөл энд урьдчилан харж болно.</p>') +
    '<div id="dgPrev" style="margin-top:10px"></div></div>';
}
function dgPost(body, cb) {
  if (!API_URL) { var D = window.digestCfg || {}; if (body.to !== undefined) D.to = body.to; if (body.on !== undefined) D.on = body.on; window.digestCfg = D; save('nb_demo_digest', D); cb(null, { lines: dgLocal() }); return; }
  post(Object.assign({ type: 'admin_digest' }, body), cb);
}
function dgSave() {
  var to = $('dgTo').value.trim();
  if (to && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { toast('И-мэйл хаяг буруу'); return; }
  dgPost({ to: to }, function (err) { if (err) { toast('Алдаа: ' + err); return; } window.digestCfg = Object.assign(window.digestCfg || {}, { to: to }); toast('Хадгалагдлаа'); });
}
function dgToggle(on) {
  if (on && !(window.digestCfg || {}).to) { toast('Эхлээд и-мэйл хаягаа хадгална уу'); return; }
  dgPost({ on: on }, function (err) {
    if (err) { toast(err === 'nomail' ? 'И-мэйл илгээх зөвшөөрөл хараахан өгөөгүй байна' : 'Алдаа: ' + err); return; }
    window.digestCfg.on = on; render(); toast(on ? 'Асаалаа — маргааш 08:00-д ирнэ' : 'Унтраалаа');
  });
}
function dgPreview() {
  $('dgPrev').innerHTML = '<p class="muted">Ачаалж байна…</p>';
  dgPost({ preview: true }, function (err, d) {
    if (err) { $('dgPrev').innerHTML = '<p class="muted">Алдаа: ' + esc(err) + '</p>'; return; }
    var L = d.lines || [];
    $('dgPrev').innerHTML = L.length ? '<ul class="cklist">' + L.map(function (l) { return '<li style="display:block">' + esc(l) + '</li>'; }).join('') + '</ul>' : '<p class="muted">Өнөөдөр анхаарах зүйл алга — и-мэйл илгээхгүй.</p>';
  });
}
function dgLocal() {   // туршилтын горим: серверийн digestText-тэй ойролцоо
  var td = todayStr(), tm = todayStr(new Date(Date.now() + 864e5)), L = [];
  reminders.filter(function (r) { return r.status === 'Хүлээгдэж' && r.date <= tm; }).forEach(function (r) { L.push('- ' + (r.date < td ? 'Хэтэрсэн ' : r.date === td ? 'Өнөөдөр ' : 'Маргааш ') + r.date + ' — ' + r.title); });
  var late = {}; loanEvents().filter(function (e) { return !e.done && e.date < td; }).forEach(function (e) { var x = late[e.loan.id] || (late[e.loan.id] = { p: e.loan.partner, a: 0 }); x.a += e.amt; });
  Object.keys(late).forEach(function (k) { L.push('- Зээл хоцорсон — ' + late[k].p + ' ' + fmt(late[k].a)); });
  var uc = (window.adminOrders || []).filter(function (o) { return o.paid === 'Орсон' && !o.confirmed && !ordDead(o); });
  if (uc.length) L.push('- Баталгаажуулах захиалгын төлбөр: ' + uc.length);
  var nb = (bankLines || []).filter(function (l) { return l.status === 'Шинэ'; }).length;
  if (nb) L.push('- Тулгаагүй банкны гүйлгээ: ' + nb);
  var low = []; KEYS.forEach(function (k) { needList(k).forEach(function (r) { low.push(r.name); }); });
  if (low.length) L.push('- Дуусах дөхсөн бараа: ' + low.slice(0, 15).join(', '));
  return L;
}
