// ═══════════ Boost төсөв (удирдлага → Boost → Boost төсөв) ═══════════
// Удирдлага: компани, эхлэх огноо, хэдэн хоног, ₮ / $ дүн → BGT-ООССӨӨ-n дугаартай төсөв (Script Property BOOST_BUD, admin_setting boostbud).
// Банкны хуулгаар «Boost төсөв»-өөр тулгахад Дт 7120 / Кт банк «… #BGT:<дугаар>» — төсөв «Төлсөн» болж хаагдана.
// Ажилтан тухайн төсвөө харж, ямар бараа хэрхэн boost хийснээ бичнэ (boost мөр, bill = төсвийн дугаар) — staff.js.
function bbAll() { return window.boostBud || []; }
function bbFind(id) { return bbAll().filter(function (b) { return b.id === id; })[0] || null; }
function bbTo(b) { return addDays(b.from, Math.max(1, Number(b.days) || 1) - 1); }
function bbAmt(b) { return [b.mnt ? fmt(b.mnt) : '', b.usd ? '$' + b.usd : ''].filter(Boolean).join(' · '); }
function bbPaid(b) {   // журналын «#BGT:<дугаар>» тагтай 7120 бичилт (төсвийн компанид)
  var tg = '#BGT:' + b.id, a = 0, last = '';
  (window.journal || []).forEach(function (e) {
    if (e.biz !== b.biz || String(e.desc || '').indexOf(tg) < 0 || (e.dr !== '7120' && e.cr !== '7120')) return;
    a += e.dr === '7120' ? Number(e.amount) || 0 : -(Number(e.amount) || 0); if (e.date > last) last = e.date;
  });
  return { amt: r0(a), date: last, ok: a > 0.5 };
}
function bbRows(b) { return (records || []).filter(function (x) { return x.type === 'boost' && x.bill === b.id && x.status !== 'Устгасан'; }); }
function bbUnpaid() { return bbAll().filter(function (b) { return !bbPaid(b).ok; }); }
// Boost хуудасны шинжилгээнд: төсвөөр төлсөн ₮-ийг задаргааны мөрүүдэд $-ын харьцаагаар хуваана
function bbPaidMap() {
  var m = {};
  bbAll().forEach(function (b) {
    var p = bbPaid(b), L = bbRows(b), tu = L.reduce(function (a, x) { return a + (Number(x.price) || 0); }, 0);
    L.forEach(function (x) { var sh = tu ? (Number(x.price) || 0) / tu : 1 / L.length; m[x.id] = { paid: p.amt * sh, est: Number(x.amount) || 0 }; });
  });
  return m;
}
function bbNewId(from) {
  var base = 'BGT-' + String(from || todayStr()).replace(/-/g, '').slice(2), n = 1;
  while (bbFind(base + '-' + n)) n++;
  return base + '-' + n;
}
function bbSaveAll(list, msg) {
  window.boostBud = list;
  if (!API_URL) { save('nb_demo_boostbud', list); toast(msg); render(); return; }
  post({ type: 'admin_setting', key: 'boostbud', value: list }, function (err) { if (err) { toast(err === 'too_big' ? 'Төсөв хэт олон — хуучныг цуцлана уу' : 'Алдаа: ' + err); refresh(); return; } toast(msg); render(); });
}
function bbOpen() {
  var cos = bstCos();
  gOpen('<h2>Boost төсөв гаргах</h2>' +
    (cos.length > 1 ? '<label for="bbBiz">Компани</label><select id="bbBiz">' + cos.map(function (k) { return '<option value="' + k + '"' + (k === state.biz ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('') + '</select>' : '<input type="hidden" id="bbBiz" value="' + (cos[0] || '') + '">') +
    '<div style="display:flex;gap:8px"><div style="flex:1"><label for="bbFrom">Эхлэх өдөр</label><input id="bbFrom" type="date" value="' + todayStr() + '" oninput="bbHint()"></div>' +
    '<div style="flex:1"><label for="bbDays">Хэдэн хоног</label><input id="bbDays" type="number" inputmode="numeric" min="1" value="7" oninput="bbHint()"></div></div>' +
    '<div style="display:flex;gap:8px"><div style="flex:1"><label for="bbMnt">Төгрөг (₮)</label><input id="bbMnt" type="number" inputmode="numeric" min="0"></div>' +
    '<div style="flex:1"><label for="bbUsd">Доллар ($)</label><input id="bbUsd" type="number" inputmode="decimal" min="0" step="0.01"></div></div>' +
    '<label for="bbNote">Тайлбар (заавал биш)</label><input id="bbNote" maxlength="80" placeholder="Жишээ: шинэ ирсэн бараа">' +
    '<p class="muted" id="bbHint" style="font-size:12.5px;margin-top:8px"></p>' +
    '<div style="margin-top:12px"><button class="btn" onclick="bbSave()">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button></div>');
  bbHint();
}
function bbHint() {
  var f = $('bbFrom').value, n = Math.max(1, Number($('bbDays').value) || 1);
  $('bbHint').textContent = f ? 'Хугацаа: ' + f + ' – ' + addDays(f, n - 1) + ' (' + n + ' хоног). Дугаар: ' + bbNewId(f) + ' — банкаар төлөхдөө гүйлгээний утгад бичвэл автоматаар тулгана.' : '';
}
function bbSave() {
  var biz = $('bbBiz').value, f = $('bbFrom').value, n = Math.round(Number($('bbDays').value) || 0), mnt = Math.round(Number($('bbMnt').value) || 0), usd = Math.round((Number($('bbUsd').value) || 0) * 100) / 100;
  if (!biz || !f || !(n >= 1)) { toast('Эхлэх өдөр, хоногоо бөглөнө үү'); return; }
  if (!(mnt > 0) && !(usd > 0)) { toast('Төгрөг эсвэл долларын дүнгээ бичнэ үү'); return; }
  var b = { id: bbNewId(f), biz: biz, from: f, days: n, mnt: mnt, usd: usd, note: $('bbNote').value.trim().slice(0, 80), by: ownerName || '', at: todayStr() };
  if (!confirm('Boost төсөв ' + b.id + '\n' + BUSINESSES[biz].name + ' · ' + f + ' – ' + bbTo(b) + ' (' + n + ' хоног)\n' + bbAmt(b) + '\n\nХадгалах уу?')) return;
  gClose();
  bbSaveAll(bbAll().concat([b]), 'Төсөв ' + b.id + ' гарлаа — ажилтанд харагдана');
}
function bbCancel(id) {
  var b = bbFind(id); if (!b) return;
  if (bbPaid(b).ok) { toast('Банкаар тулгасан төсвийг цуцлахгүй — эхлээд банкны тулгалтыг буцаана'); return; }
  var n = bbRows(b).length;
  if (!confirm('Төсөв ' + id + ' (' + bbAmt(b) + ') цуцлах уу?' + (n ? '\n\nАжилтны бичсэн ' + n + ' мөр задаргаа хэвээр үлдэнэ.' : ''))) return;
  bbSaveAll(bbAll().filter(function (x) { return x.id !== id; }), 'Төсөв цуцлагдлаа');
}
function boostBudView() {
  var cos = bstCos(), many = cos.length > 1, t = todayStr();
  var L = bbAll().filter(function (b) { return BST.biz === 'all' || b.biz === BST.biz; }).slice().sort(function (a, b) { return a.from < b.from ? 1 : a.from > b.from ? -1 : a.id < b.id ? 1 : -1; });
  var unp = L.filter(function (b) { return !bbPaid(b).ok; });
  var seg = '<div class="fn-flt"><span class="fn-fl">Компани</span><div class="fn-seg">' + [['all', 'Бүгд']].concat(cos.map(function (k) { return [k, bstName(k)]; })).map(function (o) {
    return '<button class="' + (BST.biz === o[0] ? 'on' : '') + '" onclick="bstSet(\'biz\',\'' + o[0] + '\')">' + o[1] + '</button>'; }).join('') + '</div></div>';
  var rows = L.map(function (b) {
    var p = bbPaid(b), R0 = bbRows(b), usd = Math.round(R0.reduce(function (a, x) { return a + (Number(x.price) || 0); }, 0) * 100) / 100, to = bbTo(b);
    var st = p.ok ? '<span class="st g">Төлсөн</span><br><small class="muted">' + p.date + ' · ' + fmt(p.amt) + '</small>' : '<span class="st r">Төлөгдөөгүй</span><br><small class="muted">банкны хуулгаар тулгана</small>';
    var per = to < t ? '<small class="muted">Дууссан</small>' : b.from > t ? '<small class="muted">Эхлээгүй</small>' : '<small style="color:var(--income)">Явж байна</small>';
    var items = {}; R0.forEach(function (x) { items[x.item] = (items[x.item] || 0) + (Number(x.price) || 0); });
    var det = Object.keys(items).map(function (k) { return esc(k) + ' $' + Math.round(items[k] * 100) / 100; }).join(', ');
    return '<tr>' + (many ? '<td class="nw">' + esc(bstName(b.biz)) + '</td>' : '') + '<td class="nw"><b>' + esc(b.id) + '</b>' + (b.note ? '<br><small class="muted">' + esc(b.note) + '</small>' : '') + '</td>' +
      '<td class="nw">' + b.from.slice(5) + ' – ' + to.slice(5) + ' · ' + b.days + ' хоног<br>' + per + '</td><td class="n nw">' + bbAmt(b) + '</td>' +
      '<td style="min-width:180px">' + (R0.length ? '<b>$' + usd + '</b>' + (b.usd ? ' / $' + b.usd + (usd > b.usd + 0.009 ? ' <span class="neg">хэтэрсэн</span>' : '') : '') + '<br><small class="muted">' + det + '</small>' : '<small class="muted">Ажилтан задаргаа бичээгүй</small>') + '</td>' +
      '<td>' + st + '</td><td class="n">' + (p.ok ? '' : '<button class="mini" onclick="bbCancel(' + esc(JSON.stringify(b.id)) + ')">Цуцлах</button>') + '</td></tr>';
  }).join('');
  return '<div class="card"><div class="ord-bar"><p class="muted" style="margin:0;flex:1">Төсөв ажилтанд харагдана; ажилтан ямар бараа boost хийснээ бичнэ. Банкаар төлөхөд төсөв хаагдана.</p><button class="btn" onclick="bbOpen()">+ Төсөв гаргах</button></div>' +
    (many ? '<div style="margin-top:8px">' + seg + '</div>' : '') + '</div>' +
    '<div class="fn-kpis"><div class="fn-kpi"><small>Төлөгдөөгүй төсөв</small><b' + (unp.length ? ' class="neg"' : '') + '>' + unp.length + '</b></div>' +
    '<div class="fn-kpi"><small>Төлөгдөөгүй дүн</small><b>' + (unp.reduce(function (a, b) { return a + (b.mnt || 0); }, 0) ? fmt(unp.reduce(function (a, b) { return a + (b.mnt || 0); }, 0)) : '—') +
      (unp.reduce(function (a, b) { return a + (b.usd || 0); }, 0) ? ' <span class="muted" style="font-size:.7em">· $' + Math.round(unp.reduce(function (a, b) { return a + (b.usd || 0); }, 0) * 100) / 100 + '</span>' : '') + '</b></div></div>' +
    '<div class="card rep"><div class="scroll"><table class="rep-t"><tr>' + (many ? '<th>Компани</th>' : '') + '<th>Дугаар</th><th>Хугацаа</th><th class="n">Төсөв</th><th>Ажилтны задаргаа</th><th>Төлөв</th><th></th></tr>' +
    (rows || '<tr><td colspan="' + (many ? 7 : 6) + '" class="muted">Төсөв гаргаагүй байна.</td></tr>') + '</table></div></div>';
}
// ── Банкны хуулга ↔ Boost төсөв ──
function bbBankOpts() {
  return bbUnpaid().map(function (b) { return ['BG:' + b.id, b.id + ' · ' + bstName(b.biz) + ' · ' + b.from.slice(5) + ' ' + b.days + ' хоног · ' + bbAmt(b), 'Boost төсөв']; });
}
function bbSuggest(l) {   // утганд дугаар таарвал итгэлтэй; эс бөгөөс ₮ дүн таарсан ганц төсөв
  var U = bbUnpaid(); if (!U.length) return null;
  var m = String(l.desc || '').match(/BGT-?\s?(\d{6}-\d+)/i), b = m && U.filter(function (x) { return x.id === 'BGT-' + m[1]; })[0];
  if (b) return { kind: 'bg', v: 'BG:' + b.id, sure: true };
  var A = U.filter(function (x) { return x.mnt && Math.abs(x.mnt - l.debit) < 1; });
  return A.length ? { kind: 'bg', v: 'BG:' + A[0].id, sure: false } : null;
}
function bbBankEntries(pick, biz, acc, d, amt) {   // төсвийн компани өөр бол 1290-оор (компани хооронд)
  var b = bbFind(pick.slice(3)); if (!b) return null;
  var tg = ' #BGT:' + b.id, ds = 'Boost төсөв · ' + b.from + ' · ' + b.days + ' хоног', E = [];
  if (b.biz === biz) E.push({ biz: biz, date: d, dr: '7120', cr: acc, amount: amt, desc: ds + tg, partner: BOOST_PARTNER });
  else {
    var on = BUSINESSES[b.biz].name, pn = BUSINESSES[biz].name;
    E.push({ biz: biz, date: d, dr: '1290', cr: acc, amount: amt, desc: ds + ' · ' + on + tg, partner: on });
    E.push({ biz: b.biz, date: d, dr: '7120', cr: '1290', amount: amt, desc: ds + tg, partner: pn });
  }
  return { entries: E, link: 'Boost төсөв · ' + b.id };
}
