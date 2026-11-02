// ═══════════ Сурталчилгаа (Boost) — зардал бүртгэх, ROAS (8-р ээлж) ═══════════
// Удирдлагаас бүртгэсэн зардал: Дт 7120 Зар сурталчилгааны зардал / Кт мөнгөний данс (карт, харилцах) — журналд «Сурталчилгаа · <кампанит ажил> #ADS».
// Ажилтны Boost бүртгэл (Дт 7120 / Кт 3801) хэвээр. ROAS = тухайн хугацааны борлуулалт ÷ зардал.
var ADS_TAG = '#ADS';
function adsCamp(e, rec) {   // 7120 бичилтийн кампанит ажлын нэр
  var m = String(e.desc || '').match(/^Сурталчилгаа · (.*?) #ADS/); if (m) return m[1];
  if (e.doc === 'Сурталчилгаа' && rec[e.ref]) return 'Boost · ' + rec[e.ref].item;
  return 'Бусад (банкаар бичсэн)';
}
function adsOpen() {
  var cos = KEYS.filter(function (k) { return !BUSINESSES[k].finOnly; });
  gOpen('<h2>Сурталчилгааны зардал бүртгэх</h2>' +
    '<label for="adDate">Огноо</label><input id="adDate" type="date" value="' + todayStr() + '">' +
    '<label for="adBiz">Компани</label><select id="adBiz">' + cos.map(function (k) { return '<option value="' + k + '"' + (k === state.biz ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('') + '</select>' +
    '<label for="adCamp">Кампанит ажлын нэр</label><input id="adCamp" placeholder="Жишээ: 11-р сарын хямдрал" maxlength="60">' +
    '<label for="adAmt">Дүн (₮)</label><input id="adAmt" type="number" inputmode="numeric" min="0">' +
    '<label for="adSrc">Төлбөрийн эх үүсвэр</label><select id="adSrc">' + cashCodes().map(function (c) { return '<option value="' + c + '"' + (c === '1101' ? ' selected' : '') + '>' + esc(c + ' ' + accName(c)) + '</option>'; }).join('') + '</select>' +
    '<p class="muted" style="font-size:12.5px;margin-top:8px">Бичилт: Дт 7120 Зар сурталчилгааны зардал / Кт сонгосон мөнгөний данс. Ашиг алдагдлын тайланд орно.</p>' +
    '<div style="margin-top:12px"><button class="btn" onclick="adsSave()">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button></div>');
}
function adsSave() {
  var d = $('adDate').value, biz = $('adBiz').value, camp = $('adCamp').value.trim().replace(/#/g, ''), a = Math.round(Number($('adAmt').value) || 0), src = $('adSrc').value;
  if (!d || !camp || !(a > 0)) { toast('Огноо, кампанит ажлын нэр, дүнгээ бөглөнө үү'); return; }
  if (!confirm('Сурталчилгааны зардал бүртгэх үү?\n\n' + d + ' · ' + BUSINESSES[biz].name + '\n' + camp + ' · ' + fmt(a) + '\nДт 7120 / Кт ' + src + ' ' + accName(src))) return;
  gClose();
  postEntries([{ biz: biz, date: d, dr: '7120', cr: src, amount: a, partner: BOOST_PARTNER, desc: 'Сурталчилгаа · ' + camp + ' ' + ADS_TAG }],
    function () { toast('Сурталчилгааны зардал бүртгэгдлээ'); if (API_URL) refresh(); else render(); });
}
function adsView() {
  var r = range(), f = r[0], t = r[1], Rr = R(), rec = {}; Rr.records.forEach(function (x) { rec[x.id] = x; });
  var cos = KEYS.filter(function (k) { return !BUSINESSES[k].finOnly; }), byCo = [], byCamp = [];
  var roas = function (s, c) { return c > 0 ? (Math.round(s / c * 100) / 100).toFixed(2) + '×' : '—'; };
  cos.forEach(function (biz) {
    var E = buildJournal(biz, Rr), p = plData(E, f, t), C = {}, spend = 0;
    E.forEach(function (e) { if (e.date < f || e.date > t || (e.dr !== '7120' && e.cr !== '7120')) return; var v = e.dr === '7120' ? e.amount : -e.amount; spend += v; var k = adsCamp(e, rec); C[k] = (C[k] || 0) + v; });
    byCo.push({ biz: biz, spend: r0(spend), sales: r0(p.net) });
    Object.keys(C).forEach(function (k) {
      if (Math.abs(C[k]) < 1) return;
      var it = /^Boost · /.test(k) ? k.slice(8) : '', sales = p.net, basis = 'компанийн цэвэр борлуулалт';
      if (it) { sales = Rr.records.filter(function (x) { return x.biz === biz && x.type === 'sale' && x.date >= f && x.date <= t && baseItem(x.item) === it; }).reduce(function (a, x) { return a + (Number(x.amount) || 0); }, 0); basis = 'барааны борлуулалт'; }
      byCamp.push({ biz: biz, camp: k, spend: r0(C[k]), sales: r0(sales), basis: basis });
    });
  });
  byCamp.sort(function (a, b) { return b.spend - a.spend; });
  var tS = byCo.reduce(function (a, x) { return a + x.spend; }, 0), tR = byCo.reduce(function (a, x) { return a + x.sales; }, 0);
  return '<div class="card"><div class="ord-bar"><h2 style="margin:0;flex:1">Сурталчилгаа, ROAS</h2><button class="btn" onclick="adsOpen()">Зардал бүртгэх</button></div>' +
    '<p class="muted" style="margin:6px 0 0">' + f + ' — ' + t + ' · ROAS = борлуулалт ÷ сурталчилгааны зардал (7120). Ажилтны Boost бүртгэл, удирдлагаас бүртгэсэн зардал, банкаар бичсэн 7120 бүгд орно.</p></div>' +
    '<div class="card rep"><div class="rep-cap"><b>Компаниар</b></div><div class="scroll"><table class="rep-t"><tr><th>Компани</th><th class="n">Зардал</th><th class="n">Цэвэр борлуулалт</th><th class="n">ROAS</th></tr>' +
    byCo.map(function (x) { return '<tr><td>' + esc(BUSINESSES[x.biz].name) + '</td><td class="n">' + fmt(x.spend) + '</td><td class="n">' + fmt(x.sales) + '</td><td class="n">' + roas(x.sales, x.spend) + '</td></tr>'; }).join('') +
    '<tr class="tot"><td>Нийт</td><td class="n">' + fmt(tS) + '</td><td class="n">' + fmt(tR) + '</td><td class="n">' + roas(tR, tS) + '</td></tr></table></div></div>' +
    '<div class="card rep"><div class="rep-cap"><b>Кампанит ажлаар</b><span>Boost — тухайн барааны борлуулалт; бусад — компанийн цэвэр борлуулалт</span></div><div class="scroll"><table class="rep-t"><tr><th>Компани</th><th>Кампанит ажил</th><th class="n">Зардал</th><th class="n">Борлуулалт</th><th class="n">ROAS</th></tr>' +
    (byCamp.map(function (x) { return '<tr><td>' + esc(BUSINESSES[x.biz].name) + '</td><td>' + esc(x.camp) + '<br><small class="muted">' + x.basis + '</small></td><td class="n">' + fmt(x.spend) + '</td><td class="n">' + fmt(x.sales) + '</td><td class="n">' + roas(x.sales, x.spend) + '</td></tr>'; }).join('') ||
      '<tr><td colspan="5" class="muted">Энэ хугацаанд сурталчилгааны зардал алга.</td></tr>') + '</table></div></div>';
}
