// ── Захиалгын шошго: Niimbot B1 (Bluetooth) шошгоны принтерээр хэвлэнэ ──
// NiimBlueLib (MIT, хөтчөөс Web Bluetooth-ээр) — Chrome (компьютер, Android) дээр ажиллана, iPhone/Safari дэмжихгүй.
// B1: 203 dpi (8 цэг/мм), толгой 384 цэг (48 мм). Шошгыг canvas дээр зурж, сан нь хар/цагаан болгож илгээнэ.
var NIIM_SRC = 'https://cdn.jsdelivr.net/npm/@mmote/niimbluelib@0.47.0/dist/umd/niimbluelib.min.js';
var LBL_SIZES = { '50x30': [384, 240], '40x30': [320, 240], '50x50': [384, 400], '50x70': [384, 560] };
var niim = { client: null, model: '', busy: false };
function lblSize() { var s = load('nb_lbl_size', '50x30'); return LBL_SIZES[s] ? s : '50x30'; }
function lblDensity() { return Number(load('nb_lbl_den', 3)) || 3; }
function niimOn() { return !!(niim.client && niim.client.isConnected && niim.client.isConnected()); }

function niimConnect(cb, fail) {
  if (!navigator.bluetooth) { fail && fail('Bluetooth дэмжихгүй хөтөч'); alert('Энэ хөтөч Bluetooth-ийг дэмжихгүй.\n\nКомпьютер дээр Google Chrome, эсвэл Android утсан дээр Chrome ашиглана уу. iPhone дээр ажиллахгүй.'); return; }
  if (niimOn()) { cb && cb(); return; }
  lblMsg('Принтер холбож байна… (жагсаалтаас B1-ээ сонгоно уу)');
  loadLib(NIIM_SRC, function () {
    var L = window.niimbluelib; if (!L) { lblMsg('Принтерийн сан ачаалагдсангүй — интернэтээ шалгана уу'); fail && fail('сан ачаалагдсангүй'); return; }
    var c = L.instantiateClient('bluetooth'); niim.client = c;
    c.on('connect', function () { niim.model = (c.getPrintTaskType && c.getPrintTaskType()) || 'B1'; lblStatus(); });
    c.on('disconnect', function () { niim.client = null; lblStatus(); });
    c.connect().then(function () { niim.model = (c.getPrintTaskType && c.getPrintTaskType()) || 'B1'; lblStatus(); lblMsg('Холбогдлоо: ' + niim.model); cb && cb(); })
      .catch(function (e) { niim.client = null; lblStatus(); lblMsg('Холбогдсонгүй: ' + ((e && e.message) || e)); fail && fail('холбогдсонгүй'); });
  });
}
function niimDisconnect() { try { niim.client && niim.client.disconnect(); } catch (e) {} niim.client = null; lblStatus(); }
// Принтер холбогдоогүй үед «шошго хэвлэх» чагтын хажууд сануулна
function lblWarn() {
  [].forEach.call(document.querySelectorAll('.lbl-warn'), function (w) {
    var cb = w.parentNode.querySelector('input[type=checkbox]');
    w.textContent = cb && cb.checked && !niimOn() ? '· принтер холбогдоогүй — хадгалахад холбох цонх гарна' : '';
    w.classList.toggle('warn', !!(cb && cb.checked && !niimOn()));
  });
}
function lblStatus() {
  [].forEach.call(document.querySelectorAll('.lbl-conn'), function (b) { b.textContent = niimOn() ? 'Принтер ✓' : 'Принтер холбох'; b.classList.toggle('on', niimOn()); });
  lblWarn();
  var b = $('lblConnBtn'); if (b) { b.textContent = niimOn() ? 'Принтер: ' + (niim.model || 'B1') + ' ✓' : 'Принтер холбох'; b.classList.toggle('on', niimOn()); }
  var s = $('lblState'); if (s) s.textContent = niimOn() ? 'Холбогдсон: ' + (niim.model || 'B1') : 'Холбогдоогүй';
}
function lblMsg(t) { var m = $('lblMsg'); if (m) m.textContent = t || ''; }

// ── Шошго зурах ──
function wrapLines(ctx, text, maxW, maxLines) {
  var words = String(text || '').split(/\s+/).filter(Boolean), lines = [], cur = '';
  words.forEach(function (w) {
    var t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width <= maxW) cur = t;
    else { if (cur) lines.push(cur); cur = w; while (ctx.measureText(cur).width > maxW && cur.length > 1) { var k = cur.length - 1; while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--; lines.push(cur.slice(0, k)); cur = cur.slice(k); } }
  });
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…'); }
  return lines;
}
function drawLabel(o, canvas) {
  var sz = LBL_SIZES[lblSize()], W = sz[0], H = sz[1], P = 10, ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#000'; ctx.textBaseline = 'top';
  var F = function (px, bold) { ctx.font = (bold ? 'bold ' : '') + px + 'px Arial, Helvetica, sans-serif'; };
  var big = H >= 400, y = P;
  // утас (том), нэр
  F(big ? 52 : 44, true); ctx.fillText(String(o.phone || ''), P, y); y += big ? 58 : 48;
  var who = [o.customer, o.phone2 ? '☎ ' + o.phone2 : ''].filter(Boolean).join(' · ');
  if (who) { F(big ? 22 : 18, true); wrapLines(ctx, who, W - 2 * P, 1).forEach(function (l) { ctx.fillText(l, P, y); y += big ? 26 : 21; }); }
  // хаяг
  var addr = [o.city && o.city !== 'Улаанбаатар' ? o.city : '', o.district, o.khoroo, o.address].filter(Boolean).join(', ');
  F(big ? 24 : 20, false);
  var footH = big ? 30 : 24, itemsH = big ? 60 : 22, room = H - y - footH - itemsH - 4, lh = big ? 28 : 23;
  wrapLines(ctx, addr, W - 2 * P, Math.max(1, Math.floor(room / lh))).forEach(function (l) { ctx.fillText(l, P, y); y += lh; });
  // бараа
  var items = typeof ordItemsText === 'function' ? ordItemsText(o) : '';
  F(big ? 19 : 15, false);
  var iy = H - footH - itemsH; wrapLines(ctx, items, W - 2 * P, big ? 2 : 1).forEach(function (l) { ctx.fillText(l, P, iy); iy += big ? 23 : 18; });
  // доод мөр: огноо, дэлгүүр (үнийн дүн шошгонд гарахгүй)
  ctx.fillRect(P, H - footH - 2, W - 2 * P, 2);
  F(big ? 16 : 13, false);
  ctx.fillText(String(o.date || '').slice(5) + ' · ' + String(BIZ.name || '').slice(0, 14), P, H - footH + (big ? 8 : 6));
  return canvas;
}

// ── Урьдчилан харах + хэвлэх цонх ──
var lblQueue = [];
function ensureLblSheet() {
  if ($('lblSheet')) return;
  document.body.insertAdjacentHTML('beforeend', '<div class="sheet" id="lblSheet" onclick="if(event.target===this)closeSheet(\'lblSheet\')"><div class="panel lbl-panel">' +
    '<div class="bill-h"><h2>Шошго хэвлэх</h2><button class="pos-x" onclick="closeSheet(\'lblSheet\')">✕</button></div>' +
    '<div class="lbl-bar"><button class="btn sm ghost2" id="lblConnBtn" onclick="niimOn()?niimDisconnect():niimConnect()">Принтер холбох</button>' +
    '<label>Хэмжээ <select id="lblSizeSel" onchange="save(\'nb_lbl_size\',this.value);lblRender()">' + Object.keys(LBL_SIZES).map(function (k) { return '<option value="' + k + '">' + k.replace('x', ' × ') + ' мм</option>'; }).join('') + '</select></label>' +
    '<label>Тод <select id="lblDenSel" onchange="save(\'nb_lbl_den\',Number(this.value))">' + [1, 2, 3, 4, 5].map(function (d) { return '<option>' + d + '</option>'; }).join('') + '</select></label></div>' +
    '<div class="lbl-prev" id="lblPrev"></div><small id="lblMsg" class="muted lbl-msg"></small>' +
    '<button class="btn" id="lblPrintBtn" onclick="lblPrintAll()">Хэвлэх</button>' +
    '<p class="muted" style="font-size:12px;margin-top:8px">Niimbot B1 · Chrome (компьютер, Android) дээр Bluetooth-ээр. Принтерээ асааж, ойрхон байлгана уу.</p></div></div>');
}
function openLabels(ids) {
  lblQueue = (ids || []).map(function (id) { return orders.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
  if (!lblQueue.length) { toast('Хэвлэх захиалга алга'); return; }
  ensureLblSheet(); $('lblSizeSel').value = lblSize(); $('lblDenSel').value = String(lblDensity()); lblMsg(''); lblStatus(); lblRender(); openSheet('lblSheet');
}
function lblRender() {
  var box = $('lblPrev'); box.innerHTML = '';
  lblQueue.forEach(function (o) { var c = document.createElement('canvas'); drawLabel(o, c); box.appendChild(c); });
  $('lblPrintBtn').textContent = 'Хэвлэх' + (lblQueue.length > 1 ? ' (' + lblQueue.length + ' шошго)' : '');
}
function lblPrintAll() {
  var btn = $('lblPrintBtn'), canvases = [].slice.call(document.querySelectorAll('#lblPrev canvas'));
  if (!canvases.length) { lblMsg('Хэвлэх шошго алга'); return; }
  btn.disabled = true;
  lblPrintCanvases(canvases, function (err) { btn.disabled = false; lblMsg(err ? 'Хэвлэж чадсангүй: ' + err : '✓ ' + canvases.length + ' шошго хэвлэгдлээ'); }, lblMsg);
}
// Нэг товчоор: урьдчилан харахгүйгээр шууд хэвлэнэ (принтер холбоогүй бол эхлээд холбоно — товч дарсан үйлдэл дотор байх ёстой)
function lblQuick(ids) {
  var list = (ids || []).map(function (id) { return orders.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
  if (!list.length) return;
  var go = function () {
    var cs = list.map(function (o) { return drawLabel(o, document.createElement('canvas')); });
    toast('Шошго хэвлэж байна…');
    lblPrintCanvases(cs, function (err) { if (err) { toast('Хэвлэж чадсангүй — шошгоны цонхноос дахин оролдоно уу'); openLabels(ids); lblMsg('Алдаа: ' + err); } else toast('✓ Шошго хэвлэгдлээ' + (cs.length > 1 ? ' (' + cs.length + ')' : '')); });
  };
  if (niimOn()) go(); else niimConnect(go, function (e) { toast('Принтер холбогдсонгүй: ' + e); });
}
function lblPrintCanvases(canvases, done, progress) {
  if (niim.busy) { done && done('өмнөх хэвлэлт дуусаагүй байна'); return; }
  if (!niimOn()) { niimConnect(function () { lblPrintCanvases(canvases, done, progress); }, function (e) { done && done(e); }); return; }
  var L = window.niimbluelib, task, dir;
  try {
    task = niim.client.protocol.newPrintTask(niim.model || 'B1', { totalPages: canvases.length, statusPollIntervalMs: 100, statusTimeoutMs: 8000, pageColor: 0, density: lblDensity() });   // 0 = нэг өнгө (хар)
    dir = (niim.client.getModelMetadata && (niim.client.getModelMetadata() || {}).printDirection) || 'top';
  } catch (e) { console.error(e); done && done((e && e.message) || String(e)); return; }
  niim.busy = true;
  // Принтер хариу өгөхгүй гацвал товч үүрд идэвхгүй үлдэхгүй: алхам бүрт хугацаа
  var tmo = function (p, ms) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('принтер хариу өгсөнгүй — унтрааж асаагаад дахин холбоно уу')); }, ms); })]); };
  (async function () {
    var err = null;
    try {
      await tmo(task.printInit(), 15000);
      for (var i = 0; i < canvases.length; i++) {
        progress && progress('Хэвлэж байна ' + (i + 1) + ' / ' + canvases.length + '…');
        await tmo(task.printPage(L.ImageEncoder.encodeCanvas(canvases[i], 0, dir), 1), 15000);
        await tmo(task.waitForPageFinished(), 20000);
      }
      await tmo(task.waitForFinished(), 20000);
    } catch (e) { console.error(e); err = (e && e.message) || String(e); }
    finally { try { await tmo(task.printEnd(), 5000); } catch (e2) {} niim.busy = false; done && done(err); }
  })();
}
// Захиалга хадгалахад шууд хэвлэх эсэх (төхөөрөмж бүр дээр санана)
function lblAuto() { return !!load('nb_lbl_auto', false); }
// Сангаа урьдчилан ачаална: Chrome Bluetooth-ийн сонголтын цонхыг зөвхөн товч дарсан агшинд нээдэг тул
// сан товч дарсны дараа ачаалагдвал (жагсаалтын «Хэвлэх», «Хадгалаад шошго хэвлэх») холболт татгалзагдана
if (navigator.bluetooth) loadLib(NIIM_SRC);

// ── Баримт (энгийн, И-баримт) шошгон дээр: урт баримтыг сонгосон шошгоны өндрөөр хуудас болгон хуваана ──
// blocks: {t, px, bold, c} мөр · {l, r, px, bold} зүүн/баруун · {line:1} зураас · {qr: qrcode объект}
function lblReceiptCanvases(blocks) {
  var sz = LBL_SIZES[lblSize()], W = sz[0], PH = sz[1], P = 8, m = document.createElement('canvas').getContext('2d'), ops = [], y = P;
  var place = function (h) { var pg = Math.floor(y / PH); if (y + h > (pg + 1) * PH - P && h < PH - 2 * P) y = (pg + 1) * PH + P; var at = y; y += h; return at; };   // мөрийг хоёр шошгоны заагаар таслахгүй
  var font = function (px, b) { return (b ? 'bold ' : '') + px + 'px Arial, Helvetica, sans-serif'; };
  blocks.forEach(function (b) {
    if (b.line) { var la = place(8); ops.push(function (c) { c.fillRect(P, la + 3, W - 2 * P, 2); }); return; }
    if (b.qr) {
      var q = b.qr, n = q.getModuleCount(), cell = Math.max(2, Math.floor(Math.min(W - 2 * P, PH - 2 * P - 6) / n)), s = n * cell, qa = place(s + 6);
      ops.push(function (c) { var x0 = Math.round((W - s) / 2); for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) c.fillRect(x0 + k * cell, qa + 3 + r * cell, cell, cell); });
      return;
    }
    var f = font(b.px || 18, b.bold), lh = (b.px || 18) + 5; m.font = f;
    if (b.r != null) {
      var rt = String(b.r), rw = m.measureText(rt).width;
      wrapLines(m, b.l, W - 2 * P - rw - 8, 3).forEach(function (l, i) { var at = place(lh); ops.push(function (c) { c.font = f; c.fillText(l, P, at); if (!i) c.fillText(rt, W - P - rw, at); }); });
      return;
    }
    wrapLines(m, b.t, W - 2 * P, 6).forEach(function (l) { var at = place(lh); ops.push(function (c) { c.font = f; c.fillText(l, b.c ? (W - c.measureText(l).width) / 2 : P, at); }); });
  });
  var pages = Math.max(1, Math.ceil((y + P) / PH)), out = [];
  for (var i = 0; i < pages; i++) {
    var pc = document.createElement('canvas'); pc.width = W; pc.height = PH;
    var c = pc.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, W, PH); c.fillStyle = '#000'; c.textBaseline = 'top'; c.translate(0, -i * PH);
    ops.forEach(function (op) { op(c); }); out.push(pc);
  }
  return out;
}
function lblPrintReceipt(blocks) {
  var go = function () {
    var cs = lblReceiptCanvases(blocks);
    toast('Баримт хэвлэж байна…' + (cs.length > 1 ? ' (' + cs.length + ' шошго)' : ''));
    lblPrintCanvases(cs, function (err) { toast(err ? 'Хэвлэж чадсангүй: ' + err : '✓ Баримт хэвлэгдлээ'); });
  };
  if (niimOn()) go(); else niimConnect(go, function (e) { toast('Принтер холбогдсонгүй: ' + e); });
}
