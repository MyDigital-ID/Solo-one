/* SOLO SUITS — storefront
   - كل المسارات نسبية، يشتغل على أي حساب/مستودع GitHub
   - البيانات في site-data.json (لوحة التحكم admin.html بتعدّل عليه مباشرة في GitHub)
*/
(() => {
'use strict';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full / private mode */ } }
};
const fmt = (n) => Number(n).toLocaleString('ar-EG');
const fmtEn = (n) => Number(n).toLocaleString('en-US');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICON = {
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  bag: '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M9 6l6 6-6 6"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  wa: '<path d="M4 20l1.3-4.2A8 8 0 1 1 8.3 18.8L4 20z"/><path d="M9.2 9.2c.3 2.2 2.3 4.2 4.6 4.6l1.1-1.2-1.8-.9-.7.6c-.8-.3-1.6-1.1-1.9-1.9l.6-.7-.9-1.8-1 1.3z"/>',
  phone: '<path d="M6 4l3 .5 1.2 3.2-1.8 1.4a11 11 0 0 0 5.5 5.5l1.4-1.8 3.2 1.2.5 3a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2z"/>',
  fb: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5z"/>',
  ig: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".7" fill="currentColor"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="M4 7l8 6 8-6"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
  dl: '<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14"/>',
  chevL: '<path d="M15 6l-6 6 6 6"/>',
  chevR: '<path d="M9 6l6 6-6 6"/>',
  tag: '<path d="M4 12.5V5h7.5L20 13.5 13.5 20 4 12.5z"/><circle cx="8.5" cy="9" r="1.2"/>'
};
const svg = (n) => '<svg class="svg" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>';

const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#dcdcde"/><text x="200" y="262" text-anchor="middle" font-family="serif" font-size="54" letter-spacing="10" fill="#9a9a9f">SOLO</text></svg>');
document.addEventListener('error', (e) => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && !t.dataset.ph) { t.dataset.ph = '1'; t.src = PH; }
}, true);

const im = (url, alt, attrs) => '<img src="' + esc(url) + '" alt="' + esc(alt || '') + '" loading="lazy" decoding="async" ' + (attrs || '') + '>';

/* ---------- state ---------- */
const app = $('#app');
let DATA = null;
let cart = store.get('solo_cart', []);
let currentHash = '';
let splashDone = false;
let deferredPrompt = null;
let installShown = false;
const scrollPos = {};
const cleanups = [];
const filters = {};
const sorts = {};

const DEFAULTS = {
  storeName: 'SOLO SUITS', whatsapp: '201004929979', phone: '01004929979', email: 'solosuits743@gmail.com',
  facebook: 'https://www.facebook.com/profile.php?id=61580442328923', instagram: 'https://www.instagram.com/solo_suits.eg',
  address: 'الإسكندرية', mapQuery: 'Alexandria, Egypt', currency: 'ج.م'
};
const S = () => Object.assign({}, DEFAULTS, (DATA && DATA.settings) || {});

/* ---------- data helpers ---------- */
const catById = (id) => DATA.categories.find((c) => c.id === id);
const visible = () => DATA.products.filter((p) => !p.hidden);
const firstImage = (p) => (p.colors && p.colors[0] && p.colors[0].images && p.colors[0].images[0]) || '';
function offerFor(p, size) {
  const o = p.offers || {};
  const v = size != null && o[size] != null ? Number(o[size]) : (o['*'] != null ? Number(o['*']) : 0);
  return v > 0 && v < p.price ? v : null;
}
function bestOffer(p) {
  const vals = Object.values(p.offers || {}).map(Number).filter((v) => v > 0 && v < p.price);
  return vals.length ? Math.min(...vals) : null;
}
const priceFor = (p, size) => { const o = offerFor(p, size); return o != null ? o : p.price; };
function priceHTML(p, size) {
  const cur = esc(S().currency);
  if (size != null) {
    const o = offerFor(p, size);
    if (o != null) return '<span class="now">' + fmt(o) + '</span> ' + cur + '<del>' + fmt(p.price) + '</del>';
    return fmt(p.price) + ' ' + cur;
  }
  const best = bestOffer(p);
  if (best == null) return fmt(p.price) + ' ' + cur;
  const sizes = p.sizes || [];
  const uniform = sizes.length === 0 || sizes.every((s) => offerFor(p, s) === best);
  return '<span class="now">' + (uniform ? '' : 'من ') + fmt(best) + '</span> ' + cur + '<del>' + fmt(p.price) + '</del>';
}
const discountPct = (p) => { const b = bestOffer(p); return b ? Math.round((1 - b / p.price) * 100) : 0; };

async function loadData() {
  try {
    const r = await fetch('site-data.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('bad status');
    const d = await r.json();
    store.set('solo_data', d);
    return d;
  } catch (e) {
    const c = store.get('solo_data', null);
    if (c) return c;
    throw e;
  }
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------- cart ---------- */
function saveCart() { store.set('solo_cart', cart); updateBadges(); }
function cartCount() { return cart.reduce((n, i) => n + i.qty, 0); }
function updateBadges() {
  const n = cartCount();
  ['#cartBadge', '#dockBadge'].forEach((s) => { const b = $(s); b.textContent = fmt(n); b.hidden = !n; });
}
function addToCart(p, color, size, qty) {
  const key = [p.id, color.name, size].join('|');
  const ex = cart.find((i) => i.key === key);
  if (ex) ex.qty += qty; else cart.push({ key, pid: p.id, color: color.name, size, qty, image: (color.images && color.images[0]) || '' });
  saveCart();
}
function cartItems() {
  return cart.map((i) => {
    const p = DATA.products.find((x) => x.id === i.pid);
    return p ? Object.assign({}, i, { p, price: priceFor(p, i.size) }) : null;
  }).filter(Boolean);
}
function waLink(text) { return 'https://wa.me/' + S().whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(text); }
function orderLine(i, n) {
  return n + ') ' + i.p.name + '\n    اللون: ' + i.color + ' | المقاس: ' + i.size + ' | الكمية: ' + i.qty + ' | السعر: ' + fmtEn(i.price) + ' ' + S().currency;
}
function checkout() {
  const items = cartItems();
  if (!items.length) return;
  const total = items.reduce((n, i) => n + i.price * i.qty, 0);
  const msg = 'طلب جديد من متجر ' + S().storeName + '\n\n' + items.map((i, k) => orderLine(i, k + 1)).join('\n') +
    '\n\nالإجمالي: ' + fmtEn(total) + ' ' + S().currency + '\n\nالاسم:\nالعنوان:';
  window.open(waLink(msg), '_blank');
}
function renderCart() {
  const sh = $('#cartSheet');
  const items = cartItems();
  const cur = esc(S().currency);
  const head = '<div class="sheet-head"><h2>سلة المشتريات</h2><button class="iconbtn" data-close aria-label="إغلاق">' + svg('close') + '</button></div>';
  if (!items.length) {
    sh.innerHTML = head + '<div class="empty"><h3>السلة فاضية</h3><p>اختر قطعة من الأقسام وأضفها هنا.</p><a class="btn btn-solid" href="#/">تصفح الأقسام</a></div>';
    return;
  }
  const total = items.reduce((n, i) => n + i.price * i.qty, 0);
  sh.innerHTML = head + '<div class="cart-list">' + items.map((i) =>
    '<div class="cart-item"><a href="#/p/' + esc(i.pid) + '">' + im(i.image || firstImage(i.p), i.p.name) + '</a><div><h4>' + esc(i.p.name) + '</h4>' +
    '<p class="opt">اللون: ' + esc(i.color) + ' — المقاس: ' + esc(i.size) + '</p>' +
    '<p class="price">' + fmt(i.price) + ' ' + cur + '</p>' +
    '<div class="row"><div class="qty"><button data-act="dec" data-key="' + esc(i.key) + '" aria-label="إنقاص">' + svg('minus') + '</button><b>' + fmt(i.qty) + '</b><button data-act="inc" data-key="' + esc(i.key) + '" aria-label="زيادة">' + svg('plus') + '</button></div>' +
    '<button class="rm" data-act="rm" data-key="' + esc(i.key) + '" aria-label="حذف">' + svg('trash') + '</button></div></div></div>'
  ).join('') + '</div><div class="cart-foot"><div class="cart-total"><span>الإجمالي</span><b>' + fmt(total) + ' ' + cur + '</b></div>' +
    '<button class="btn btn-solid btn-block" data-act="checkout">' + svg('wa') + ' إتمام الطلب عبر واتساب</button>' +
    '<p class="cart-note">هيتم فتح واتساب برسالة جاهزة فيها تفاصيل طلبك، وبنأكد معاك السعر والتوصيل.</p></div>';
}
$('#cartSheet').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'checkout') return checkout();
  const it = cart.find((i) => i.key === b.dataset.key);
  if (!it) return;
  if (act === 'inc') it.qty += 1;
  if (act === 'dec') it.qty = Math.max(1, it.qty - 1);
  if (act === 'rm') cart = cart.filter((i) => i !== it);
  saveCart();
  renderCart();
});

/* ---------- sheets ---------- */
const scrim = $('#scrim');
let openSheet = null;
function showSheet(el) {
  closeSheets();
  openSheet = el;
  el.classList.add('on');
  el.setAttribute('aria-hidden', 'false');
  scrim.hidden = false;
  requestAnimationFrame(() => scrim.classList.add('on'));
  document.body.style.overflow = 'hidden';
}
function closeSheets() {
  if (!openSheet) return;
  openSheet.classList.remove('on');
  openSheet.setAttribute('aria-hidden', 'true');
  openSheet = null;
  scrim.classList.remove('on');
  setTimeout(() => { if (!openSheet) scrim.hidden = true; }, 300);
  document.body.style.overflow = '';
}
scrim.addEventListener('click', closeSheets);
document.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheets(); });
function openCart() { renderCart(); showSheet($('#cartSheet')); }

/* ---------- search ---------- */
function openSearch() {
  $('#searchBox').hidden = false;
  $('#searchInput').value = '';
  $('#searchResults').innerHTML = '';
  setTimeout(() => $('#searchInput').focus(), 50);
}
function closeSearch() { $('#searchBox').hidden = true; }
$('#searchInput').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const box = $('#searchResults');
  if (!q) { box.innerHTML = ''; return; }
  const list = visible().filter((p) => (p.name + ' ' + (p.sub || '') + ' ' + ((catById(p.category) || {}).name || '')).toLowerCase().includes(q)).slice(0, 30);
  box.innerHTML = list.length ? list.map((p) =>
    '<a class="sr" href="#/p/' + esc(p.id) + '">' + im(firstImage(p), p.name) + '<div><h4>' + esc(p.name) + '</h4><p>' + esc(p.sub || '') + '</p><p class="price">' + priceHTML(p) + '</p></div></a>'
  ).join('') : '<div class="empty"><p>مفيش نتائج للبحث ده.</p></div>';
});
$('#searchBox').addEventListener('click', (e) => { if (e.target.closest('a')) closeSearch(); });
$('#searchClose').addEventListener('click', closeSearch);

/* ---------- coverflow (3D، بدون مكتبات عشان يشتغل أوفلاين) ---------- */
function coverflow(root, items, caption) {
  const n = items.length;
  if (!n) return;
  root.innerHTML = '<div class="cf-stage">' + items.map((it, i) =>
    '<div class="cf-slide" data-i="' + i + '" role="button" aria-label="' + esc(it.title) + '"><img src="' + esc(it.image) + '" alt="" draggable="false" decoding="async"' + (i < 3 ? '' : ' loading="lazy"') + '>' + (it.badge ? '<span class="cf-badge">' + esc(it.badge) + '</span>' : '') + '</div>'
  ).join('') + '</div><div class="cf-caption" aria-live="polite"></div><div class="cf-ctrl"><button type="button" data-d="-1" aria-label="السابق">' + svg('chevL') + '</button><div class="cf-dots">' + items.map(() => '<i></i>').join('') + '</div><button type="button" data-d="1" aria-label="التالي">' + svg('chevR') + '</button></div>';

  const stage = $('.cf-stage', root);
  const slides = $$('.cf-slide', root);
  const dots = $$('.cf-dots i', root);
  const cap = $('.cf-caption', root);
  let pos = 0, shown = -1, timer = null, drag = null, visibleNow = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const wrap = (d) => (((d + n / 2) % n) + n) % n - n / 2;
  function paint() {
    slides.forEach((s, i) => {
      const o = n > 2 ? wrap(i - pos) : i - pos;
      const a = Math.abs(o);
      const rot = Math.max(-1, Math.min(1, o)) * -46;
      s.style.transform = 'translate(-50%,-50%) translateX(' + (o * 56).toFixed(2) + '%) translateZ(' + (-a * 120).toFixed(1) + 'px) rotateY(' + rot.toFixed(1) + 'deg) scale(' + (1 - Math.min(a, 1) * 0.1).toFixed(3) + ')';
      s.style.zIndex = String(60 - Math.round(a * 10));
      s.style.opacity = a > 2.7 ? '0' : '1';
      s.style.pointerEvents = a > 2.7 ? 'none' : 'auto';
      s.classList.toggle('is-center', a < 0.5);
    });
    const cur = ((Math.round(pos) % n) + n) % n;
    if (cur !== shown) {
      shown = cur;
      cap.innerHTML = caption(items[cur]);
      dots.forEach((d, i) => d.classList.toggle('on', i === cur));
    }
  }
  function go(to) { pos = to; paint(); }
  function auto() {
    stop();
    if (reduce || n < 2) return;
    timer = setInterval(() => { if (!drag && visibleNow && !document.hidden) go(Math.round(pos) + 1); }, 3800);
  }
  function stop() { clearInterval(timer); timer = null; }
  let resume;
  function pause() { stop(); clearTimeout(resume); resume = setTimeout(auto, 9000); }

  const step = () => (slides[0].offsetWidth || 260) * 0.56;
  stage.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, start: pos, moved: 0, target: e.target.closest('.cf-slide') };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('dragging');
    pause();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    pos = drag.start - dx / step();
    paint();
  });
  const end = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    stage.classList.remove('dragging');
    if (d.moved < 8 && d.target) {
      const i = +d.target.dataset.i;
      const o = n > 2 ? wrap(i - pos) : i - pos;
      if (Math.abs(o) < 0.4) { const link = items[i].href; if (link) navigate(link); return; }
      go(Math.round(pos + o));
    } else {
      go(Math.round(pos));
    }
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (b) { go(Math.round(pos) + Number(b.dataset.d)); pause(); }
  });
  stage.setAttribute('tabindex', '0');
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { go(Math.round(pos) - 1); pause(); }
    if (e.key === 'ArrowRight') { go(Math.round(pos) + 1); pause(); }
  });

  const io = new IntersectionObserver((es) => { visibleNow = es[0].isIntersecting; }, { threshold: 0.2 });
  io.observe(root);
  paint();
  auto();
  cleanups.push(() => { stop(); clearTimeout(resume); io.disconnect(); });
}

/* ---------- views ---------- */
const capFeatured = (it) => '<h3>' + esc(it.title) + '</h3><p>' + esc(it.sub || '') + '</p>' + (it.href ? '<a href="' + esc(it.href) + '">استكشف المجموعة</a>' : '');
const capOffer = (it) => '<h3>' + esc(it.title) + '</h3><p>' + esc(it.sub || '') + '</p><p class="price">' + it.priceHTML + '</p><a href="' + esc(it.href) + '">شوف العرض</a>';

function footerHTML() {
  const s = S();
  return '<footer class="foot"><img src="assets/images/logo-light.png" alt="SOLO SUITS">' +
    '<p class="foot-tag"><b>S</b>TYLE <b>O</b>F <b>L</b>UXURY <b>O</b>UTFITS</p>' +
    '<address>' + esc(s.address) + '</address>' +
    '<a class="btn btn-line" style="border-color:#fff;color:#fff" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.mapQuery || s.address) + '">' + svg('pin') + ' الموقع على الخريطة</a>' +
    '<div class="foot-links">' +
    '<a href="' + waLink('أهلاً SOLO SUITS، عندي استفسار') + '" target="_blank" rel="noopener" aria-label="واتساب">' + svg('wa') + '</a>' +
    '<a href="tel:' + esc(s.phone) + '" aria-label="اتصال">' + svg('phone') + '</a>' +
    (s.facebook ? '<a href="' + esc(s.facebook) + '" target="_blank" rel="noopener" aria-label="فيسبوك">' + svg('fb') + '</a>' : '') +
    (s.instagram ? '<a href="' + esc(s.instagram) + '" target="_blank" rel="noopener" aria-label="إنستجرام">' + svg('ig') + '</a>' : '') +
    (s.email ? '<a href="mailto:' + esc(s.email) + '" aria-label="بريد إلكتروني">' + svg('mail') + '</a>' : '') +
    '</div><small>© SOLO SUITS</small></footer>';
}

function cardHTML(p) {
  const pct = discountPct(p);
  const cols = p.colors || [];
  return '<a class="card" href="#/p/' + esc(p.id) + '"><div class="card-media">' + im(firstImage(p), p.name) +
    '<div class="tags">' + (p.isNew ? '<span class="tag">جديد</span>' : '') + (pct ? '<span class="tag tag-red">خصم ' + fmt(pct) + '٪</span>' : '') + '</div></div>' +
    '<div class="card-body"><h3>' + esc(p.name) + '</h3><p class="card-sub">' + esc(p.sub || '') + '</p><p class="price">' + priceHTML(p) + '</p>' +
    (cols.length > 1 ? '<div class="dots">' + cols.map((c) => '<i style="background:' + esc(c.hex || '#000') + '" title="' + esc(c.name) + '"></i>').join('') + '</div>' : '') +
    '</div></a>';
}

function home() {
  document.title = 'SOLO SUITS | سولو سوتس — بدل وأزياء رجالي ونسائي';
  const offers = visible().filter((p) => bestOffer(p) != null);
  app.innerHTML =
    '<section class="hero"><div class="hero-frame"><img class="hero-img" src="assets/images/banner.jpg" alt="SOLO SUITS — Style of Luxury Outfits" decoding="async"></div>' +
    '<div class="hero-copy"><p class="hero-line">أرقى خطوط الموضه العالميه بالإسكندرية </p>' +
    '<div class="hero-actions"><a class="btn btn-solid" href="#/c/suits"> شغف لا ينتهي </a><a class="btn btn-line" href="#/offers">عروض وخصومات</a></div></div></section>' +
    '<section class="block"><header class="block-head"><h2>الصور المميزة</h2><p>اختيارات الموسم، اسحب لتتصفح.</p></header><div class="cf" id="cfFeatured"></div></section>' +
    '<section class="block"><header class="block-head"><h2>تسوّق حسب القسم</h2></header><div class="scenes">' +
    DATA.categories.map((c) => {
      const count = visible().filter((p) => p.category === c.id).length;
      return '<a class="scene" href="#/c/' + esc(c.id) + '">' + im(c.image, c.name) +
        '<div class="scene-copy"><span class="scene-en">' + esc(c.en || '') + '</span><h2>' + esc(c.name) + '</h2><div class="scene-meta"><i></i><span>' + fmt(count) + ' قطعة</span></div></div></a>';
    }).join('') + '</div></section>' +
    (offers.length ? '<section class="block"><header class="block-head row"><div><h2>عروض وخصومات</h2><p>أسعار خاصة لفترة محدودة.</p></div><a class="more" href="#/offers">عرض الكل</a></header><div class="cf" id="cfOffers"></div></section>' : '') +
    footerHTML();

  coverflow($('#cfFeatured'), (DATA.featured || []).filter((f) => f.image).map((f) => ({ image: f.image, title: f.title || '', sub: f.sub || '', href: f.link || '' })), capFeatured);
  if (offers.length) {
    coverflow($('#cfOffers'), offers.map((p) => ({ image: firstImage(p), title: p.name, sub: p.sub || '', href: '#/p/' + p.id, badge: 'خصم ' + fmt(discountPct(p)) + '٪', priceHTML: priceHTML(p) })), capOffer);
  }
  bindScenes();
}

let sceneIO = null;
let sceneList = [];
function bindScenes() {
  sceneList = $$('.scene');
  if (!sceneList.length) return;
  sceneIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-active', e.isIntersecting)), { rootMargin: '-40% 0px -40% 0px' });
  sceneList.forEach((s) => sceneIO.observe(s));
  cleanups.push(() => { sceneIO.disconnect(); sceneList = []; });
  onScroll();
}
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const vh = innerHeight;
    sceneList.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      s.style.setProperty('--py', (c * -38).toFixed(1) + 'px');
    });
    scrollPos[currentHash] = scrollY;
  });
}
addEventListener('scroll', onScroll, { passive: true });

function category(id) {
  const c = catById(id);
  if (!c) return home();
  document.title = c.name + ' | SOLO SUITS';
  const prods = visible().filter((p) => p.category === id);
  const subs = ((c.subs && c.subs.length) ? c.subs : [...new Set(prods.map((p) => p.sub).filter(Boolean))]).filter((s) => prods.some((p) => p.sub === s));
  const hasOffers = prods.some((p) => bestOffer(p) != null);
  app.innerHTML =
    '<section class="cat-hero">' + im(c.image, c.name, 'loading="eager"') + '<div><span class="en">' + esc(c.en || '') + '</span><h1>' + esc(c.name) + '</h1></div></section>' +
    '<div class="toolbar"><div class="chips" role="tablist"></div><div class="sortrow"><span id="countTxt"></span><select id="sortSel" aria-label="الترتيب"><option value="new">الأحدث</option><option value="low">الأقل سعرًا</option><option value="high">الأعلى سعرًا</option></select></div></div>' +
    '<div class="grid" id="grid"></div>' + footerHTML();
  const chips = $('.chips');
  const sel = $('#sortSel');
  sel.value = sorts[id] || 'new';
  function drawChips() {
    const cur = filters[id] || '';
    const all = [['', 'الكل']].concat(subs.map((s) => [s, s]));
    if (hasOffers) all.push(['__offers', 'العروض']);
    chips.innerHTML = all.map((x) => '<button class="chip' + (cur === x[0] ? ' on' : '') + '" data-sub="' + esc(x[0]) + '">' + esc(x[1]) + '</button>').join('');
  }
  function drawGrid() {
    const f = filters[id] || '';
    let list = prods.filter((p) => !f || (f === '__offers' ? bestOffer(p) != null : p.sub === f));
    const key = (p) => (bestOffer(p) != null ? bestOffer(p) : p.price);
    const s = sorts[id] || 'new';
    if (s === 'low') list = list.slice().sort((a, b) => key(a) - key(b));
    else if (s === 'high') list = list.slice().sort((a, b) => key(b) - key(a));
    else list = list.slice().sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    $('#countTxt').textContent = fmt(list.length) + ' قطعة';
    $('#grid').innerHTML = list.length ? list.map(cardHTML).join('') : '<div class="empty" style="grid-column:1/-1"><h3>لسه مفيش قطع هنا</h3><p>جرّب قسمًا آخر أو ارجع قريبًا.</p></div>';
  }
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    filters[id] = b.dataset.sub;
    drawChips();
    drawGrid();
  });
  sel.addEventListener('change', () => { sorts[id] = sel.value; drawGrid(); });
  drawChips();
  drawGrid();
}

function offersPage() {
  document.title = 'عروض وخصومات | SOLO SUITS';
  const list = visible().filter((p) => bestOffer(p) != null);
  app.innerHTML =
    '<section class="block" style="padding-top:26px"><header class="block-head"><h2>عروض وخصومات</h2><p>الأسعار الخاصة بتتحدد حسب المقاس، افتح القطعة وشوف سعر مقاسك.</p></header>' +
    (list.length ? '<div class="grid">' + list.map(cardHTML).join('') + '</div>' : '<div class="empty"><h3>مفيش عروض دلوقتي</h3><p>تابعنا، العروض الجديدة بتنزل باستمرار.</p><a class="btn btn-solid" href="#/">الرئيسية</a></div>') +
    '</section>' + footerHTML();
}

function product(id) {
  const p = DATA.products.find((x) => x.id === id && !x.hidden);
  if (!p) return home();
  document.title = p.name + ' | SOLO SUITS';
  const c = catById(p.category) || {};
  const colors = (p.colors && p.colors.length) ? p.colors : [{ name: '', hex: '#000', images: [] }];
  const sizes = (p.sizes && p.sizes.length) ? p.sizes : ['مقاس واحد'];
  let ci = 0, size = sizes.length === 1 ? sizes[0] : null, qty = 1;

  app.innerHTML =
    '<article class="pdp"><div class="gal"><div class="gal-track" id="galTrack"></div><div class="gal-dots" id="galDots"></div></div>' +
    '<div class="pdp-info"><p class="crumb"><a href="#/c/' + esc(p.category) + '">' + esc(c.name || '') + '</a>' + (p.sub ? ' — ' + esc(p.sub) : '') + '</p>' +
    '<h1>' + esc(p.name) + '</h1><p class="price big" id="priceEl"></p>' +
    '<div class="field"><label>اللون <span id="colorName"></span></label><div class="swatches" id="swatches">' +
    colors.map((k, i) => '<button class="sw" data-i="' + i + '" style="background:' + esc(k.hex || '#000') + '" aria-label="' + esc(k.name) + '"></button>').join('') + '</div></div>' +
    '<div class="field" id="sizeField"><label>المقاس</label><div class="sizes" id="sizes">' +
    sizes.map((s) => '<button class="size" data-s="' + esc(s) + '">' + esc(s) + (offerFor(p, s) != null ? '<small>عرض</small>' : '') + '</button>').join('') + '</div></div>' +
    '<div class="field"><label>الكمية</label><div class="qty"><button id="qMinus" aria-label="إنقاص">' + svg('minus') + '</button><b id="qVal">1</b><button id="qPlus" aria-label="زيادة">' + svg('plus') + '</button></div></div>' +
    '<div class="pdp-actions"><button class="btn btn-solid" id="addBtn">' + svg('bag') + ' أضف إلى السلة</button><button class="btn btn-line" id="waBtn">' + svg('wa') + ' اطلب عبر واتساب</button></div>' +
    (p.desc ? '<p class="desc">' + esc(p.desc) + '</p>' : '') + '</div></article>' +
    '<section class="block rel" id="relBlock"></section>' + footerHTML();

  const track = $('#galTrack');
  function drawGallery() {
    const imgs = (colors[ci].images && colors[ci].images.length) ? colors[ci].images : [''];
    track.innerHTML = imgs.map((u, i) => im(u, p.name + ' ' + colors[ci].name, i === 0 ? 'loading="eager"' : '')).join('');
    $('#galDots').innerHTML = imgs.length > 1 ? imgs.map((u, i) => '<i class="' + (i === 0 ? 'on' : '') + '"></i>').join('') : '';
    track.scrollLeft = 0;
  }
  track.addEventListener('scroll', () => {
    const i = Math.round(Math.abs(track.scrollLeft) / (track.clientWidth || 1));
    $$('#galDots i').forEach((d, k) => d.classList.toggle('on', k === i));
  }, { passive: true });
  function drawState() {
    $$('.sw').forEach((b, i) => b.classList.toggle('on', i === ci));
    $$('.size').forEach((b) => b.classList.toggle('on', b.dataset.s === size));
    $('#colorName').textContent = '— ' + (colors[ci].name || '');
    $('#priceEl').innerHTML = priceHTML(p, size);
    $('#qVal').textContent = fmt(qty);
  }
  $('#swatches').addEventListener('click', (e) => {
    const b = e.target.closest('.sw');
    if (!b) return;
    ci = +b.dataset.i;
    drawGallery();
    drawState();
  });
  $('#sizes').addEventListener('click', (e) => {
    const b = e.target.closest('.size');
    if (!b) return;
    size = b.dataset.s;
    drawState();
  });
  $('#qMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); drawState(); });
  $('#qPlus').addEventListener('click', () => { qty = Math.min(20, qty + 1); drawState(); });
  function needSize() {
    if (size) return false;
    const f = $('#sizeField');
    f.classList.remove('shake');
    void f.offsetWidth;
    f.classList.add('shake');
    toast('اختر المقاس أولاً');
    return true;
  }
  $('#addBtn').addEventListener('click', () => {
    if (needSize()) return;
    addToCart(p, colors[ci], size, qty);
    toast('تمت الإضافة إلى السلة');
  });
  $('#waBtn').addEventListener('click', () => {
    if (needSize()) return;
    const line = orderLine({ p, color: colors[ci].name, size, qty, price: priceFor(p, size) }, 1);
    window.open(waLink('طلب من متجر ' + S().storeName + '\n\n' + line + '\n\nالاسم:\nالعنوان:'), '_blank');
  });

  const rel = visible().filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  if (rel.length) $('#relBlock').innerHTML = '<header class="block-head"><h2>قطع مشابهة</h2></header><div class="grid">' + rel.map(cardHTML).join('') + '</div>';
  else $('#relBlock').remove();
  drawGallery();
  drawState();
}

/* ---------- menu ---------- */
function buildMenu() {
  const s = S();
  const cats = DATA.categories;
  $('#menuSheet').innerHTML =
    '<div class="sheet-head"><h2>القائمة</h2><button class="iconbtn" data-close aria-label="إغلاق">' + svg('close') + '</button></div>' +
    '<div class="menu-logo"><img src="assets/images/logo-dark.png" alt="SOLO SUITS"><p><b>S</b>TYLE <b>O</b>F <b>L</b>UXURY <b>O</b>UTFITS</p></div>' +
    '<nav class="menu-list"><a href="#/">' + svg('home') + ' الرئيسية</a>' +
    cats.map((c) => '<a href="#/c/' + esc(c.id) + '">' + esc(c.name) + '<span class="en">' + esc(c.en || '') + '</span></a>').join('') +
    '<a href="#/offers">' + svg('tag') + ' عروض وخصومات</a>' +
    '<span class="group">تواصل معنا</span>' +
    '<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.mapQuery || s.address) + '">' + svg('pin') + ' الموقع على الخريطة</a>' +
    '<a target="_blank" rel="noopener" href="' + waLink('أهلاً SOLO SUITS، عندي استفسار') + '">' + svg('wa') + ' واتساب</a>' +
    '<a href="tel:' + esc(s.phone) + '">' + svg('phone') + ' ' + esc(s.phone) + '</a>' +
    (s.facebook ? '<a target="_blank" rel="noopener" href="' + esc(s.facebook) + '">' + svg('fb') + ' فيسبوك</a>' : '') +
    (s.instagram ? '<a target="_blank" rel="noopener" href="' + esc(s.instagram) + '">' + svg('ig') + ' إنستجرام</a>' : '') +
    (s.email ? '<a href="mailto:' + esc(s.email) + '">' + svg('mail') + ' ' + esc(s.email) + '</a>' : '') +
    '<button id="menuInstall" hidden>' + svg('dl') + ' تثبيت التطبيق</button></nav>';
  const mi = $('#menuInstall');
  if (installPossible()) mi.hidden = false;
  mi.addEventListener('click', () => { closeSheets(); doInstall(); });
}

/* ---------- router + history ---------- */
function navigate(hash) {
  if (!hash) return;
  if (hash.charAt(0) !== '#') { location.href = hash; return; }
  if (hash === (location.hash || '#/')) { closeSheets(); return; }
  delete scrollPos[hash];
  const d = ((history.state && history.state.d) || 0) + 1;
  history.pushState({ solo: 'app', d }, '', hash);
  route(false);
}
function route(restore) {
  cleanups.splice(0).forEach((fn) => fn());
  closeSheets();
  closeSearch();
  const hash = location.hash || '#/';
  currentHash = hash;
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!DATA) return;
  if (!parts.length) home();
  else if (parts[0] === 'c') category(parts[1]);
  else if (parts[0] === 'p') product(parts[1]);
  else if (parts[0] === 'offers') offersPage();
  else home();
  app.classList.remove('enter');
  void app.offsetWidth;
  app.classList.add('enter');
  const y = restore ? (scrollPos[hash] || 0) : 0;
  requestAnimationFrame(() => window.scrollTo(0, y));
}
let exitArmed = false;
addEventListener('popstate', (e) => {
  const st = e.state;
  if (st && st.solo === 'root') {
    if (exitArmed) { exitArmed = false; history.back(); return; }
    exitArmed = true;
    toast('اضغط رجوع مرة أخرى للخروج');
    history.pushState({ solo: 'app', d: 0 }, '', location.href);
    setTimeout(() => { exitArmed = false; }, 2200);
    return;
  }
  route(true);
});
addEventListener('hashchange', () => { if ((location.hash || '#/') !== currentHash) route(false); });
function initHistory() {
  if (!history.state || !history.state.solo) {
    history.replaceState({ solo: 'root' }, '', location.href);
    history.pushState({ solo: 'app', d: 0 }, '', location.href);
  }
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#/"]');
  if (!a || a.target === '_blank') return;
  e.preventDefault();
  navigate(a.getAttribute('href'));
});

/* ---------- install prompt ---------- */
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const installPossible = () => !isStandalone() && (!!deferredPrompt || isIOS());
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const mi = $('#menuInstall');
  if (mi) mi.hidden = false;
  if (splashDone) showInstall();
});
addEventListener('appinstalled', () => { deferredPrompt = null; $('#install').hidden = true; });
function showInstall() {
  if (installShown || !installPossible()) return;
  installShown = true;
  $('#installHint').textContent = deferredPrompt
    ? 'افتح المتجر بضغطة واحدة من الشاشة الرئيسية، وهيشتغل حتى بدون إنترنت.'
    : 'من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية» وهيشتغل حتى بدون إنترنت.';
  $('#installYes').textContent = deferredPrompt ? 'تثبيت' : 'تمام';
  $('#install').hidden = false;
}
async function doInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) { /* ignore */ }
    deferredPrompt = null;
  } else if (isIOS()) {
    toast('من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية»');
  }
  $('#install').hidden = true;
}
$('#installYes').addEventListener('click', doInstall);
$('#installLater').addEventListener('click', () => { $('#install').hidden = true; });

/* ---------- splash ---------- */
function runSplash() {
  const sp = $('#splash');
  const v = $('#splashVideo');
  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    sp.classList.add('hide');
    document.body.classList.remove('is-loading');
    splashDone = true;
    setTimeout(() => sp.remove(), 800);
    setTimeout(showInstall, 900);
  }
  function fallback() {
    sp.classList.add('no-video');
    setTimeout(finish, 2400);
  }
  v.addEventListener('ended', finish);
  v.addEventListener('error', fallback);
  const src = v.querySelector('source');
  if (src) src.addEventListener('error', fallback);
  const p = v.play();
  if (p && p.catch) p.catch(fallback);
  setTimeout(finish, 12000); // أمان: ما يعلقش على الفيديو أكتر من 12 ثانية
}

/* ---------- boot ---------- */
function injectIcons() {
  $('#btnMenu').innerHTML = svg('menu');
  $('#btnSearch').innerHTML = svg('search');
  $('#btnCart').insertAdjacentHTML('afterbegin', svg('bag'));
  $('#searchClose').innerHTML = svg('close');
  const map = { back: 'back', home: 'home', cart: 'bag', wa: 'wa' };
  $$('.dock button').forEach((b) => { $('i', b).innerHTML = svg(map[b.dataset.dock]); });
}
$('#btnMenu').addEventListener('click', () => showSheet($('#menuSheet')));
$('#btnCart').addEventListener('click', openCart);
$('#btnSearch').addEventListener('click', openSearch);
$('#dock').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dock]');
  if (!b) return;
  const k = b.dataset.dock;
  if (k === 'cart') return openCart();
  if (k === 'wa') return window.open(waLink('أهلاً SOLO SUITS، عندي استفسار'), '_blank');
  if (k === 'home') { if ((location.hash || '#/') === '#/') window.scrollTo({ top: 0, behavior: 'smooth' }); else navigate('#/'); return; }
  if (k === 'back') {
    if (openSheet) return closeSheets();
    if ((location.hash || '#/') === '#/') { toast('أنت في الصفحة الرئيسية'); return; }
    if (history.state && history.state.d > 0) history.back();
    else { history.replaceState({ solo: 'app', d: 0 }, '', '#/'); route(false); }
  }
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSheets(); closeSearch(); } });

function collectUrls() {
  const urls = new Set();
  (DATA.categories || []).forEach((c) => c.image && urls.add(c.image));
  (DATA.featured || []).forEach((f) => f.image && urls.add(f.image));
  (DATA.products || []).forEach((p) => (p.colors || []).forEach((c) => (c.images || []).forEach((u) => u && urls.add(u))));
  return [...urls];
}
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then((reg) => {
    const send = () => { if (reg.active && DATA) reg.active.postMessage({ type: 'CACHE_URLS', urls: collectUrls() }); };
    (window.requestIdleCallback || ((f) => setTimeout(f, 2500)))(send);
  }).catch(() => { /* SW not available (file:// or blocked) */ });
}

async function boot() {
  injectIcons();
  updateBadges();
  runSplash();
  initHistory();
  try {
    DATA = await loadData();
  } catch (e) {
    app.innerHTML = '<div class="empty"><h3>تعذر تحميل المتجر</h3><p>تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.</p><button class="btn btn-solid" onclick="location.reload()">إعادة المحاولة</button></div>';
    return;
  }
  cart = cart.filter((i) => DATA.products.some((p) => p.id === i.pid));
  saveCart();
  buildMenu();
  route(true);
  registerSW();
}
boot();
})();
