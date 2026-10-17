// ── САНХҮҮ — ЭНГИЙН ТОЙМ, САР БҮРИЙН АЖИЛ, НЭР ТОМЬЁО ──
// Нягтлан биш хүнд зориулав: мөнгө хаана байна, хэд олж хэд зарцуулсан, хэн өртэй, юу хийх ёстой — энгийн үгээр.

// Тайлан бүрийн дээр гарах энгийн тайлбар
var REP_HELP = {
  dash: 'Санхүүгийн бүртгэл зөв эсэхийг автоматаар шалгадаг хуудас.',
  entry: 'Дэлгүүрийн хуудаснаас автоматаар ордоггүй гүйлгээг (зээл авах, эзэн мөнгө оруулах г.м) энд гараар бичнэ.',
  journal: 'Бүх гүйлгээ огноо дарааллаар: юунаас (кредит) юу руу (дебет) мөнгө шилжсэн.',
  trial: 'Данс бүрийн нийт орсон, гарсан дүн. Доод мөрөнд дебет, кредит тэнцүү байх ёстой.',
  ledger: 'Нэг дансны (жишээ нь касс) бүх гүйлгээ, өдөр бүрийн үлдэгдэл — банкны хуулга шиг.',
  gl: 'Бүх дансны хуулгыг нэг дор.',
  bank: 'Банкнаас татсан хуулгыг оруулж, гүйлгээ бүрийг юунд хамаарахыг сонгоно.',
  vouchers: 'Касс, банкнаас мөнгө орсон, гарсан бүрийг баримт болгож дугаарлана, хэвлэнэ.',
  expenses: 'Дэлгүүрийн ажилчдын бичсэн зарлага, өдрийн касс хаалт.',
  cash: 'Касс, банкны дансанд өдөр бүр хэд орж, хэд гарсан, хэд үлдсэн.',
  cashflow: 'Мөнгө хаанаас орж, хаашаа гарсан (борлуулалт, зардал, зээл…).',
  partners: 'Харилцагч бүр танд хэд өртэй (авлага), та тэдэнд хэд өртэй (өглөг).',
  aging_r: 'Танд өртэй хүмүүсийн өр хэр удаж байгааг харуулна — 90+ хоног бол анхаарах.',
  aging_p: 'Таны төлөх ёстой өр хэр удаж байгааг харуулна.',
  pstmt: 'Нэг хүн / байгууллагатай хийсэн бүх тооцоо.',
  balance: 'Тухайн өдрийн байдлаар танд юу байна (мөнгө, бараа, авлага), юу өгөх ёстой (өр), үлдсэн нь таны өмч.',
  pl: 'Сонгосон хугацаанд хэдийн орлого олж, хэд зарцуулж, хэдэн төгрөгийн ашиг (алдагдал) гаргасан.',
  equity: 'Таны өмч (бизнес дэх таны хөрөнгө) хэрхэн өөрчлөгдсөн.',
  accounts: 'Санхүүгийн бүх данс (ангилал). Шинэ банкны данс, зээл нэмэх бол «+ Данс нэмэх».',
  opening: 'Системийг эхлүүлэх өдрийн мөнгө, өр, авлагын үлдэгдлийг нэг удаа оруулна.',
  lock: 'Шалгаж дууссан сарыг түгжвэл тэр хүртэлх гүйлгээ санамсаргүй өөрчлөгдөхгүй.',
  close: 'Жилийн эцэст оныг хааж архивлах, нөөц хуулбар.',
};
var GLOSSARY = [
  ['Орлого', 'Бараа зарж орж ирсэн мөнгө (эсвэл ирэх ёстой мөнгө). Буцаалтыг хассан дүнг «цэвэр борлуулалт» гэнэ.'],
  ['Өртөг', 'Зарсан барааг та хэдээр авсан бэ. 87,000₮-өөр зарсан тавгийг 50,000₮-өөр авсан бол өртөг нь 50,000₮.'],
  ['Нийт ашиг', 'Орлого − өртөг. Түрээс, цалин зэрэг зардлыг хасаагүй байна.'],
  ['Зардал', 'Бизнесээ явуулахад гарсан мөнгө: түрээс, цалин, зар сурталчилгаа, хүргэлт г.м.'],
  ['Цэвэр ашиг', 'Нийт ашиг − бүх зардал. Үнэхээр хэдэн төгрөг олсон бэ гэдэг нь.'],
  ['Авлага', 'Танд өгөх ёстой мөнгө — жишээ нь зээлээр бараа авсан хүний өр.'],
  ['Өглөг', 'Таны бусдад өгөх ёстой мөнгө — жишээ нь нийлүүлэгчээс зээлээр авсан барааны мөнгө.'],
  ['Харилцах данс', 'Банкны данс. Касс бол дэлгүүрт байгаа бэлэн мөнгө.'],
  ['Эхний үлдэгдэл', 'Системийг ашиглаж эхлэх өдөр байсан мөнгө, бараа, өр.'],
  ['Өмч', 'Танд байгаа бүх зүйлээс (мөнгө, бараа, авлага) өрийг хассан дүн — бизнес дэх таны хөрөнгө.'],
  ['Хуримтлагдсан ашиг', 'Өмнөх жилүүдэд олсон, бизнест үлдсэн ашиг.'],
  ['Дебет / Кредит', 'Нягтлан бодох бүртгэлийн хоёр тал. Энгийнээр: мөнгө (эсвэл үнэ цэнэ) дебет данс руу ОРЖ, кредит данснаас ГАРНА. Систем автоматаар бичдэг тул та бодох шаардлагагүй.'],
  ['Журнал', 'Бүх гүйлгээний жагсаалт. Систем борлуулалт, зарлага бүрээс өөрөө бичдэг.'],
  ['Гүйлгээ баланс', 'Данс бүрийн нийт дүн. Дебет = кредит тэнцүү байвал бүртгэл зөв.'],
  ['Санхүүгийн байдлын тайлан', '«Баланс» гэж нэрлэдэг: хөрөнгө = өр + өмч. Жилд нэг удаа e-Balance-д тушаана.'],
  ['Орлогын тайлан', '«Ашиг алдагдлын тайлан»: орлого − өртөг − зардал = ашиг.'],
  ['Мөнгөн гүйлгээний тайлан', 'Мөнгө хаанаас орж, хаашаа гарсан. Ашигтай байсан ч мөнгө дутаж болдгийг харуулна.'],
  ['Насжилт', 'Өр хэдэн хоног болсон бэ. Удсан өрийг түрүүлж нэхэх хэрэгтэй.'],
  ['НДШ', 'Нийгмийн даатгалын шимтгэл — ажилтны цалингаас 11.5%, ажил олгогч нэмж 12.5–14.5% төлнө. Сар бүр.'],
  ['ХХОАТ', 'Хувь хүний орлогын албан татвар — цалингаас 10% суутгаж улсад тушаана (ТТ-11 тайлан).'],
  ['ААНОАТ', 'Аж ахуйн нэгжийн орлогын албан татвар — компанийн ашгаас (ТТ-02 тайлан).'],
  ['И-баримт', 'Худалдан авагчид өгдөг цахим төлбөрийн баримт (ebarimt.mn).'],
  ['Тооллого', 'Дэлгүүр, агуулах дахь барааг бодитоор тоолж системийн тоотой тулгах.'],
  ['Гүйлгээ түгжих', 'Шалгаж дууссан хугацааны бүртгэлийг өөрчлөгдөхөөс хамгаалах.'],
];

// ═══════════ ЭНГИЙН ТОЙМ ═══════════
function simpleView() {
  var r = range(), E = J(), p = plData(E, r[0], r[1]), b = balances(E, todayStr());
  var g = function (k) { return b[k] || 0; };
  var cashAccs = ACCOUNTS.filter(function (a) { return a[3] === 'cash'; });
  var money = cashAccs.map(function (a) { return [a[1], g(a[0])]; }).filter(function (x) { return Math.abs(x[1]) >= 1; });
  var moneyTot = money.reduce(function (s, x) { return s + x[1]; }, 0);
  var row = function (label, v, cls) { return '<tr><td>' + esc(label) + '</td><td class="n' + (cls ? ' ' + cls : '') + '">' + (v < 0 ? '−' : '') + fmt(Math.abs(v)) + '</td></tr>'; };
  // Хугацааны зардал ангиллаар
  var expRows = p.exps.slice().sort(function (a, c2) { return c2.v - a.v; }).slice(0, 6);
  // Авлага, өглөг харилцагчаар
  var ar = repPartners(E, todayStr()).rows;
  var recv = ar.filter(function (x) { return x.rec > 0.5; }).sort(function (a, c2) { return c2.rec - a.rec; });
  var pays = ar.filter(function (x) { return x.pay > 0.5; }).sort(function (a, c2) { return c2.pay - a.pay; });
  var loans = -(g('3501')) + ACCOUNTS.filter(function (a) { return a[0] !== '3501' && /^35/.test(a[0]); }).reduce(function (s, a) { return s - g(a[0]); }, 0);
  var sentence = 'Энэ хугацаанд <b>' + fmt(p.net) + '</b>-ийн бараа зарж, түүнээс <b>' + fmt(p.cogs) + '</b> нь барааны өртөг, <b>' + fmt(p.expT) + '</b> нь бусад зардал байлаа. ' +
    (p.profit >= 0 ? 'Үр дүнд нь <b style="color:var(--green)">' + fmt(p.profit) + '</b> ашигтай ажилласан.' : '<b style="color:var(--red)">' + fmt(-p.profit) + '</b> алдагдалтай ажилласан.');
  return '<p class="hint">Санхүүгийн гол мэдээлэл энгийн үгээр. Дэлгэрэнгүйг зүүн цэсний «Нягтлангийн тайлан» хэсгээс харна.</p>' +
    '<div class="card"><h2>Энэ хугацааны үр дүн</h2><p style="font-size:14.5px;line-height:1.7">' + sentence + '</p>' +
    '<div class="grid2" style="margin-top:8px"><table class="rep-t">' + row('Борлуулалт (буцаалт хассан)', p.net) + row('Барааны өртөг', -p.cogs) + '<tr class="b"><td>Нийт ашиг</td><td class="n">' + fmt(p.gross) + '</td></tr>' +
    row('Бусад зардал', -p.expT) + (p.other ? row('Бусад орлого', p.other) : '') + '<tr class="tot"><td>Цэвэр ашиг</td><td class="n' + (p.profit < 0 ? ' neg' : '') + '">' + (p.profit < 0 ? '−' : '') + fmt(Math.abs(p.profit)) + '</td></tr></table>' +
    '<table class="rep-t"><tr><th>Зардал юунд гарсан</th><th class="n">Дүн</th></tr>' + (expRows.length ? expRows.map(function (x) { return row(x.name, x.v); }).join('') : '<tr><td class="muted">Зардал алга</td><td></td></tr>') + '</table></div>' +
    '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="setSub(\'pl\')">Орлогын тайлан (дэлгэрэнгүй)</button></div></div>' +
    '<div class="grid2"><div class="card"><h2>Мөнгө хаана байна (өнөөдөр)</h2><table class="rep-t">' + (money.length ? money.map(function (x) { return row(x[0], x[1], x[1] < 0 ? 'neg' : ''); }).join('') : '<tr><td class="muted">Мөнгөн хөрөнгийн бүртгэл алга</td><td></td></tr>') +
      '<tr class="tot"><td>Нийт мөнгө</td><td class="n">' + fmt(moneyTot) + '</td></tr></table>' +
      (money.some(function (x) { return x[1] < 0; }) ? '<p class="muted" style="font-size:12.5px;margin-top:6px">Хасах дүн гарвал эхний үлдэгдлийг оруулаагүй байж магадгүй — «Эхний үлдэгдэл».</p>' : '') +
      '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="setSub(\'cash\')">Касс, банкны хөдөлгөөн</button></div></div>' +
    '<div class="card"><h2>Бараа</h2><table class="rep-t">' + row('Үлдэгдэл бараа (авсан үнээр)', g('1404')) + '</table>' +
      '<p class="muted" style="font-size:12.5px;margin-top:6px">Дэлгүүр, агуулахад байгаа барааг та хэдээр авсан бэ.</p></div></div>' +
    '<div class="grid2"><div class="card"><h2>Танд өртэй хүмүүс (авлага)</h2><table class="rep-t">' + (recv.length ? recv.slice(0, 8).map(function (x) { return row(x.name, x.rec); }).join('') +
      '<tr class="tot"><td>Нийт</td><td class="n">' + fmt(sum(recv, 'rec')) + '</td></tr>' : '<tr><td class="muted">Авлага алга</td><td></td></tr>') + '</table>' +
      '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="setSub(\'aging_r\')">Хэр удсаныг харах</button></div></div>' +
    '<div class="card"><h2>Таны өр (өглөг, зээл)</h2><table class="rep-t">' + (pays.length ? pays.slice(0, 8).map(function (x) { return row(x.name, x.pay); }).join('') : '') +
      (loans > 0.5 ? row('Банкны зээл', loans) : '') + ((pays.length || loans > 0.5) ? '<tr class="tot"><td>Нийт</td><td class="n">' + fmt(sum(pays, 'pay') + Math.max(0, loans)) + '</td></tr>' : '<tr><td class="muted">Өр алга</td><td></td></tr>') + '</table>' +
      '<div class="pg-act" style="margin-top:8px"><button class="b-btn" onclick="openRem(null,{kind:\'Өглөг төлөх\'})">Төлөх өдрөө сануулах</button></div></div></div>' +
    simpleTodo();
}
// «Анхаарах зүйл» — энгийн үгээр
function simpleTodo() {
  var out = [], biz = state.biz, b = balances(J(), todayStr());
  var untagged = (typeof bankLines !== 'undefined' ? bankLines : []).filter(function (l) { return l.biz === biz && l.status === 'Шинэ'; }).length;
  if (untagged) out.push(['Банкны хуулгын ' + untagged + ' гүйлгээг тулгаагүй байна.', "setSub('bank')", 'Тулгах']);
  ACCOUNTS.filter(function (a) { return a[3] === 'cash'; }).forEach(function (a) { if ((b[a[0]] || 0) < -0.5) out.push([a[1] + ' хасах дүнтэй байна — эхний үлдэгдэл дутуу эсвэл бичилт дутуу байж магадгүй.', "setSub('opening')", 'Эхний үлдэгдэл']); });
  var ce = costEngine(biz, R()); var nc = Object.keys(ce.noCost).length;
  if (nc) out.push([nc + ' бараа авсан үнэгүйгээр (өртөггүй) зарагдсан — ашиг хэт өндөр гарна.', "openModule('products');setSub('in')", 'Бараа орлого']);
  var t = todayStr(), y = todayStr(new Date(Date.now() - 864e5));
  var hasSales = records.some(function (x) { return x.biz === biz && x.type === 'sale' && x.date === y; });
  var closed = records.some(function (x) { return x.biz === biz && x.type === 'close' && x.date === y; });
  if (hasSales && !closed && !BUSINESSES[biz].orders) out.push(['Өчигдрийн касс хаагдаагүй байна (дэлгүүрийн ажилтан «Өдрийн касс хаах» дарна).', '', '']);
  return '<div class="card"><h2>Анхаарах зүйл</h2>' + (out.length ? '<ul class="cklist">' + out.map(function (x) {
    return '<li><span class="ck bad">!</span><span style="flex:1">' + esc(x[0]) + '</span>' + (x[1] ? '<button class="b-btn" onclick="' + x[1] + '">' + x[2] + '</button>' : '') + '</li>'; }).join('') + '</ul>'
    : '<p class="muted">Анхаарах зүйл алга.</p>') + '</div>';
}

// ═══════════ САР БҮРИЙН АЖИЛ ═══════════
function monthlyView() {
  var biz = state.biz, now = new Date(), lm = todayStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
  var items = [];
  var bl = (typeof bankLines !== 'undefined' ? bankLines : []).filter(function (l) { return l.biz === biz; });
  var lastImp = bl.map(function (l) { return l.date.slice(0, 10); }).sort().pop() || '';
  items.push([!!lastImp && !bl.some(function (l) { return l.status === 'Шинэ'; }), 'Банкны хуулгаа оруулж тулгах', lastImp ? 'Сүүлийн гүйлгээ: ' + lastImp + (bl.some(function (l) { return l.status === 'Шинэ'; }) ? ' · тулгаагүй гүйлгээ байна' : '') : 'Хуулга оруулаагүй', "setSub('bank')"]);
  var ent = entOf(biz), hasStaff = entStaff(ent).some(function (s) { return Number(s.salary) > 0; });
  if (hasStaff) items.push([payrollPosted(ent, lm).length > 0, lm + ' сарын цалинг бодох', 'Цалин, НДШ, ХХОАТ санхүүд бичигдэнэ', "openTax('" + ent + "','payroll')"]);
  var due = taxDeadlines(ent).filter(function (x) { return x.days <= 31; });
  due.forEach(function (x) { items.push([false, x.name + ' тушаах (' + x.date + ')', x.site, "openTax('" + ent + "','" + x.go + "')"]); });
  var tracked = moves.some(function (m) { return m.biz === biz; });
  if (tracked) { var lc = moves.filter(function (m) { return m.biz === biz && m.kind === 'Тооллого'; }).map(function (m) { return String(m.date).slice(0, 10); }).sort().pop() || '';
    items.push([lc >= lm + '-01', 'Барааны тооллого хийх', lc ? 'Сүүлийн тооллого: ' + lc : 'Тооллого хийгээгүй', "openModule('products');setSub('stock')"]); }
  var unpaidOld = repAging(J(), todayStr(), '1201').rows.filter(function (r) { return r.b60 + r.b90 > 0; });
  items.push([!unpaidOld.length, 'Удсан авлагаа нэхэх', unpaidOld.length ? unpaidOld.length + ' хүний өр 60 хоногоос удсан' : 'Удсан авлага алга', "setSub('aging_r')"]);
  items.push([!!meta.lock && meta.lock >= lastDayOf(lm), lm + ' сарыг шалгаад түгжих', meta.lock ? 'Одоо ' + meta.lock + ' хүртэл түгжигдсэн' : 'Түгжээгүй', "setSub('lock')"]);
  items.push([false, 'Сарын тайлангаа Excel-ээр хадгалах', 'Бүх тайлан → Excel татах', "openModule('reports')"]);
  return '<p class="hint">Сар бүрийн эхэнд энэ жагсаалтыг дарааллаар нь хийхэд санхүү тань цэгцтэй байна. Ногоон тэмдэг — хийгдсэн.</p>' +
    '<div class="card"><ul class="cklist">' + items.map(function (x, i) {
      return '<li><span class="ck ' + (x[0] ? 'ok' : 'bad') + '">' + (x[0] ? '✓' : i + 1) + '</span><span style="flex:1"><b>' + esc(x[1]) + '</b><br><small class="muted">' + esc(x[2]) + '</small></span>' +
        '<button class="b-btn" onclick="' + x[3] + '">Нээх</button></li>'; }).join('') + '</ul></div>';
}
function lastDayOf(m) { var d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0); return todayStr(d); }
function glossaryView() {
  return '<p class="hint">Санхүүгийн хэсэгт гардаг үгсийн энгийн тайлбар.</p><div class="card"><table class="rep-t">' +
    GLOSSARY.map(function (x) { return '<tr><td style="width:28%;white-space:normal"><b>' + esc(x[0]) + '</b></td><td style="white-space:normal">' + esc(x[1]) + '</td></tr>'; }).join('') + '</table></div>';
}
