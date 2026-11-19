// ═══════════ ШИНЭ БАРААНЫ СУДАЛГАА (удирдлага) ═══════════
// Ажилтнуудын оруулсан шинэ барааны санаа — бүх дэлгүүрийнх (ажилтны хуудасны «Шинэ бараа» цэс).
// Эзэн төлөв өгнө (Шинэ → Судалж байна / Захиалах / Татгалзсан) ба хариу бичнэ — ажилтанд харагдана. Менежер зөвхөн харна.
var resAdm = { items: null, loading: false, q: '', biz: '', st: '' }, RES_ADM_ST = ['Шинэ', 'Судалж байна', 'Захиалах', 'Татгалзсан'];
var RES_ADM_C = { 'Шинэ': 'n', 'Судалж байна': 'b', 'Захиалах': 'g', 'Татгалзсан': 'r' }, RES_ADM_SYM = { MNT: '₮', CNY: '¥', USD: '$', KRW: '₩' };
function researchLoad(force) {
  if (resAdm.loading || (resAdm.items && !force)) return;
  if (!API_URL) { resAdm.items = []; return; }
  resAdm.loading = true;
  post({ type: 'admin_research' }, function (err, d) {
    resAdm.loading = false;
    if (err) { toast('Судалгаа ачаалсангүй: ' + err); if (!resAdm.items) resAdm.items = []; return; }
    resAdm.items = d.items || []; resAdm.me = d.me || '';
    if (state.view === 'company' && state.module === 'products' && state.sub.products === 'research') render();
  });
}
function resAdmMoney(n, c) { return n ? (c && c !== 'MNT' ? (RES_ADM_SYM[c] || '') + Number(n).toLocaleString('en-US') : fmt(n)) : ''; }
function researchView() {
  if (!resAdm.items) { researchLoad(); return '<p class="muted">Ачаалж байна…</p>'; }
  var L = resAdm.items, bz = {}, own = isOwner(), q = resAdm.q.toLowerCase().trim();
  L.forEach(function (r) { bz[r.biz] = r.bizName || r.biz; });
  var V = L.filter(function (r) {
    return (!resAdm.biz || r.biz === resAdm.biz) && (!resAdm.st || r.status === resAdm.st) && (!q || [r.name, r.supplier, r.note, r.by, r.link].join(' ').toLowerCase().indexOf(q) >= 0);
  });
  var cnt = {}; L.forEach(function (r) { cnt[r.status] = (cnt[r.status] || 0) + 1; });
  var bar = '<div class="filter"><label>Хайх<input class="search" id="resAQ" placeholder="Нэр, нийлүүлэгч, тэмдэглэл…" value="' + esc(resAdm.q) + '" oninput="resAdm.q=this.value;render();var e=$(\'resAQ\');e.focus();e.setSelectionRange(e.value.length,e.value.length)"></label>' +
    '<label>Дэлгүүр<select onchange="resAdm.biz=this.value;render()"><option value="">Бүгд</option>' + Object.keys(bz).map(function (k) { return '<option value="' + esc(k) + '"' + (resAdm.biz === k ? ' selected' : '') + '>' + esc(bz[k]) + '</option>'; }).join('') + '</select></label>' +
    '<label>Төлөв<select onchange="resAdm.st=this.value;render()"><option value="">Бүгд (' + L.length + ')</option>' + RES_ADM_ST.map(function (s) { return '<option value="' + s + '"' + (resAdm.st === s ? ' selected' : '') + '>' + s + ' (' + (cnt[s] || 0) + ')</option>'; }).join('') + '</select></label></div>';
  if (!V.length) return bar + '<p class="muted">' + (L.length ? 'Шүүлтэд тохирох бараа алга.' : 'Ажилтнууд одоогоор шинэ барааны судалгаа оруулаагүй байна (ажилтны хуудас → «Шинэ бараа»).') + '</p>';
  return bar + '<div class="scroll"><table class="rep-t res-t"><tr><th></th><th>Бараа</th><th>Нийлүүлэгч</th><th class="n">Авах үнэ</th><th class="n">Зарах (таамаг)</th><th class="n">Зөрүү</th><th>Хэн, хэзээ</th><th>Төлөв</th></tr>' +
    V.map(function (r) {
      var mnt = !r.cur || r.cur === 'MNT', mg = mnt && r.buy && r.sell ? r.sell - r.buy : null, host = '';
      try { host = r.link ? new URL(r.link).hostname.replace(/^www\./, '') : ''; } catch (e) {}
      return '<tr><td data-l="Зураг">' + (r.thumb ? '<img class="res-th" src="' + esc(r.thumb) + '" alt="" onclick="resAdmImg(\'' + r.id + '\')">' : '<span class="muted">—</span>') + '</td>' +
        '<td data-l="Бараа" style="white-space:normal;min-width:180px"><b>' + esc(r.name) + '</b>' + (r.note ? '<br><small class="muted" style="white-space:pre-line">' + esc(r.note) + '</small>' : '') +
          (host ? '<br><a href="' + esc(r.link) + '" target="_blank" rel="noopener">' + esc(host) + ' ↗</a>' : '') + (r.reply ? '<br><small>Хариу: ' + esc(r.reply) + '</small>' : '') + '</td>' +
        '<td data-l="Нийлүүлэгч" style="white-space:normal">' + esc(r.supplier || '') + '</td>' +
        '<td data-l="Авах үнэ" class="n">' + resAdmMoney(r.buy, r.cur) + '</td><td data-l="Зарах (таамаг)" class="n">' + (r.sell ? fmt(r.sell) : '') + '</td>' +
        '<td data-l="Зөрүү" class="n">' + (mg != null ? fmt(mg) + (r.buy > 0 ? '<br><small class="muted">' + Math.round(mg / r.buy * 100) + '%</small>' : '') : '') + '</td>' +
        '<td data-l="Хэн, хэзээ" class="nw">' + esc(r.by) + '<br><small class="muted">' + esc(r.bizName || r.biz) + ' · ' + esc(r.at) + '</small></td>' +
        '<td data-l="Төлөв">' + (own ? '<select onchange="resAdmSet(\'' + r.id + '\',this.value)">' + RES_ADM_ST.map(function (s) { return '<option' + (r.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
          '<br><button class="mini" onclick="resAdmReply(\'' + r.id + '\')">' + (r.reply ? 'Хариу засах' : 'Хариу бичих') + '</button>' : '<span class="st ' + (RES_ADM_C[r.status] || 'n') + '">' + esc(r.status) + '</span>') +
          (own || r.staffId === resAdm.me ? ' <button class="mini" onclick="resAdmCancel(\'' + r.id + '\')">Цуцлах</button>' : '') + '</td></tr>';
    }).join('') + '</table></div>';
}
function resAdmFind(id) { return (resAdm.items || []).filter(function (x) { return x.id === id; })[0]; }
function resAdmSave(r, status, reply) {
  post({ type: 'admin_research', statusId: r.id, status: status, reply: reply, what: r.name }, function (err) {
    if (err) { toast('Хадгалсангүй: ' + err); render(); return; }
    r.status = status; r.reply = reply; toast('✓ ' + r.name + ' → ' + status); render();
  });
}
function resAdmSet(id, st) { var r = resAdmFind(id); if (r) resAdmSave(r, st, r.reply || ''); }
function resAdmReply(id) {
  var r = resAdmFind(id); if (!r) return;
  var t = prompt('«' + r.name + '» — ажилтанд харагдах хариу:', r.reply || ''); if (t == null) return;
  resAdmSave(r, r.status, t.trim());
}
function resAdmImg(id) {
  var r = resAdmFind(id); if (!r) return;
  gOpen('<h2>' + esc(r.name) + '</h2><img id="resAImg" src="' + esc(r.thumb) + '" alt="" style="max-width:100%;border-radius:8px">' + (r.img ? '<p class="muted" id="resAMsg">Том зураг ачаалж байна…</p>' : '') +
    '<div style="margin-top:10px"><button class="btn ghost" onclick="gClose()">Хаах</button></div>');
  if (!r.img) return;
  post({ type: 'admin_research', img: id }, function (err, d) { var m = $('resAMsg'); if (!err && d.img && $('resAImg')) { $('resAImg').src = d.img; if (m) m.remove(); } else if (m) m.textContent = 'Том зураг ачаалсангүй'; });
}
function resAdmCancel(id) {
  var r = resAdmFind(id); if (!r || !confirm('«' + r.name + '» судалгааг цуцлах уу?')) return;
  post({ type: 'admin_research', cancelId: id, what: r.name }, function (err) {
    if (err) { toast('Цуцалсангүй: ' + err); return; }
    resAdm.items = resAdm.items.filter(function (x) { return x.id !== id; }); toast('Цуцаллаа'); render();
  });
}
// Удирдлагаас шинэ бараа нэмэх (ажилтны маягттай ижил; аль дэлгүүрийнх болохыг сонгоно)
function resAdmOpen() {
  var B = ALL_KEYS.filter(function (k) { return BUSINESSES[k] && !BUSINESSES[k].finOnly && !BUSINESSES[k].hidden; });
  gOpen('<h2>Шинэ бараа (судалгаа)</h2>' +
    '<label for="raName">Барааны нэр *</label><input id="raName" maxlength="120">' +
    '<div class="row2"><div><label for="raBiz">Дэлгүүр</label><select id="raBiz">' + B.map(function (k) { return '<option value="' + k + '"' + (k === state.biz ? ' selected' : '') + '>' + esc(BUSINESSES[k].name) + '</option>'; }).join('') + '</select></div>' +
    '<div><label for="raImg">Зураг</label><input id="raImg" type="file" accept="image/*"></div></div>' +
    '<label for="raLink">Холбоос</label><input id="raLink" type="url" placeholder="https://…">' +
    '<label for="raSup">Нийлүүлэгч</label><input id="raSup" maxlength="120">' +
    '<div class="row2"><div><label for="raBuy">Авах үнэ</label><input id="raBuy" type="number" min="0" step="any"></div><div><label for="raCur">Валют</label><select id="raCur">' +
      Object.keys(RES_ADM_SYM).map(function (c) { return '<option value="' + c + '">' + RES_ADM_SYM[c] + ' ' + c + '</option>'; }).join('') + '</select></div></div>' +
    '<label for="raSell">Зарах үнэ (таамаг, ₮)</label><input id="raSell" type="number" min="0">' +
    '<label for="raNote">Тэмдэглэл</label><textarea id="raNote" rows="3" maxlength="1000"></textarea>' +
    '<div style="margin-top:10px"><button class="btn" id="raBtn" onclick="resAdmAdd()">Хадгалах</button><button class="btn ghost" onclick="gClose()">Болих</button></div>');
}
function resAdmShrink(file, max, q, cb) {
  var r = new FileReader();
  r.onload = function () {
    var im = new Image();
    im.onload = function () {
      var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', q));
    };
    im.onerror = function () { cb(''); }; im.src = r.result;
  };
  r.onerror = function () { cb(''); }; r.readAsDataURL(file);
}
function resAdmAdd() {
  var a = { name: $('raName').value.trim(), biz: $('raBiz').value, link: $('raLink').value.trim(), supplier: $('raSup').value.trim(), buy: $('raBuy').value, cur: $('raCur').value, sell: $('raSell').value, note: $('raNote').value.trim() };
  if (a.name.length < 2) { toast('Барааны нэрээ бичнэ үү'); $('raName').focus(); return; }
  if (a.link && !/^https?:\/\//i.test(a.link)) a.link = 'https://' + a.link;
  if (!API_URL) { toast('Сервертэй холбогдсон үед ажиллана'); return; }
  var f = ($('raImg').files || [])[0];
  var send = function () {
    post({ type: 'admin_research', add: a, what: a.name }, function (err) {
      if (err) { toast(err === 'size' ? 'Зураг хэт том байна' : 'Хадгалсангүй: ' + err); return; }
      gClose(); toast('✓ Судалгаа нэмэгдлээ'); researchLoad(true);
    });
  };
  if (!f) { send(); return; }
  resAdmShrink(f, 200, 0.6, function (th) { resAdmShrink(f, 1000, 0.72, function (big) { a.thumb = th; a.img = big; send(); }); });
}
