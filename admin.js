/* SOLO SUITS — لوحة التحكم
   بتشتغل مباشرة على GitHub: بتقرأ وتكتب site-data.json وبترفع الصور في assets/uploads
   بيانات الربط (الحساب/المستودع/الرمز) بتتحفظ على جهازك بس، مش مكتوبة في الكود.
*/
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const root = $('#root');
const KEY = 'solo_gh_cfg';
const S = { cfg: null, data: null, sha: null, tab: 'products', editing: null, q: '', preview: {} };

/* ---------- UI helpers ---------- */
let toastT;
function toast(msg, bad) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('bad', !!bad);
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), bad ? 5200 : 3200);
}
function busy(msg) {
  const b = $('#busy');
  if (!msg) { b.hidden = true; return; }
  $('#busyTxt').textContent = msg;
  b.hidden = false;
}
function friendly(e) {
  if (e && e.status === 401) return 'الرمز غير صحيح أو منتهي. اعمل رمز جديد من GitHub.';
  if (e && e.status === 403) return 'الرمز مالوش صلاحية الكتابة على المستودع (Contents: Read and write).';
  if (e && e.status === 404) return 'المستودع أو الفرع غير موجود. راجع اسم الحساب والمستودع والفرع.';
  if (e && /Failed to fetch|NetworkError|Load failed/i.test(e.message || '')) return 'مفيش اتصال بالإنترنت. اللوحة محتاجة إنترنت عشان تحفظ.';
  return (e && e.message) || 'حصلت مشكلة غير متوقعة.';
}

/* ---------- GitHub API ---------- */
const b64enc = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const b64dec = (b64) => {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};
async function gh(path, opt) {
  opt = opt || {};
  const r = await fetch('https://api.github.com' + path, Object.assign({}, opt, {
    headers: Object.assign({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + S.cfg.token, 'X-GitHub-Api-Version': '2022-11-28' }, opt.headers || {})
  }));
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    const err = new Error(t.message || ('HTTP ' + r.status));
    err.status = r.status;
    throw err;
  }
  return r.json();
}
const folder = () => (S.cfg.folder ? S.cfg.folder.replace(/^\/+|\/+$/g, '') + '/' : '');
const contentsUrl = (p) => '/repos/' + S.cfg.owner + '/' + S.cfg.repo + '/contents/' + (folder() + p).split('/').map(encodeURIComponent).join('/');

function normalize(d) {
  d.settings = d.settings || {};
  d.categories = d.categories || [];
  d.featured = d.featured || [];
  d.products = d.products || [];
  d.products.forEach((p) => { p.offers = p.offers || {}; p.sizes = p.sizes || []; p.colors = p.colors || []; });
  return d;
}
async function loadRemote() {
  try {
    const f = await gh(contentsUrl('site-data.json') + '?ref=' + encodeURIComponent(S.cfg.branch));
    S.sha = f.sha;
    S.data = normalize(JSON.parse(b64dec(f.content)));
  } catch (e) {
    if (e.status !== 404) throw e;
    const r = await fetch('site-data.json', { cache: 'no-store' });
    S.data = normalize(await r.json());
    S.sha = null;
  }
}
async function putData() {
  S.data.updatedAt = new Date().toISOString();
  const body = { message: 'تحديث بيانات المتجر', content: b64enc(JSON.stringify(S.data, null, 2)), branch: S.cfg.branch };
  if (S.sha) body.sha = S.sha;
  const send = () => gh(contentsUrl('site-data.json'), { method: 'PUT', body: JSON.stringify(body) });
  try {
    const r = await send();
    S.sha = r.content.sha;
  } catch (e) {
    if (e.status === 409 || e.status === 422) {
      const cur = await gh(contentsUrl('site-data.json') + '?ref=' + encodeURIComponent(S.cfg.branch));
      body.sha = cur.sha;
      const r = await send();
      S.sha = r.content.sha;
    } else throw e;
  }
}
async function save(msg) {
  busy(msg || 'جاري الحفظ والنشر…');
  try {
    await putData();
    toast('تم الحفظ. التعديلات بتظهر في الموقع خلال دقيقة تقريبًا.');
    return true;
  } catch (e) {
    toast(friendly(e), true);
    return false;
  } finally { busy(false); }
}

/* ---------- images ---------- */
async function compress(file, max, q) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch (e) {
    bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  }
  const w0 = bmp.width, h0 = bmp.height;
  const r = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.round(w0 * r);
  c.height = Math.round(h0 * r);
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', q));
  return { blob, dataUrl: c.toDataURL('image/jpeg', 0.5) };
}
async function blobB64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function uploadFiles(files, onEach) {
  const list = [...files];
  for (let i = 0; i < list.length; i++) {
    busy('جاري رفع الصورة ' + (i + 1) + ' من ' + list.length + '…');
    try {
      const { blob } = await compress(list[i], 1600, 0.86);
      const name = 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.jpg';
      const rel = 'assets/uploads/' + name;
      await gh(contentsUrl(rel), { method: 'PUT', body: JSON.stringify({ message: 'رفع صورة', content: await blobB64(blob), branch: S.cfg.branch }) });
      S.preview[rel] = URL.createObjectURL(blob);
      onEach(rel);
    } catch (e) {
      toast('تعذر رفع الصورة: ' + friendly(e), true);
    }
  }
  busy(false);
}
const imgSrc = (u) => S.preview[u] || u;

/* ---------- config / login ---------- */
function detect() {
  const h = location.hostname;
  let owner = '', repo = '';
  if (h.endsWith('.github.io')) {
    owner = h.split('.')[0];
    const seg = location.pathname.split('/').filter(Boolean)[0];
    repo = seg && !seg.includes('.') ? seg : owner + '.github.io';
  }
  return { owner, repo, branch: 'main', folder: '', token: '' };
}
function loadCfg() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* ignore */ }
  return Object.assign(detect(), saved || {});
}
function renderLogin(msg) {
  const c = S.cfg || loadCfg();
  root.innerHTML =
    '<div class="login"><img src="assets/images/logo-dark.png" alt="SOLO SUITS"><h1>لوحة تحكم SOLO SUITS</h1>' +
    '<p class="muted" style="text-align:center">اربط اللوحة بمستودع الموقع على GitHub. كل ما تعدّله هنا بيتحفظ في الموقع مباشرة.</p>' +
    (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
    '<label>اسم الحساب على GitHub (Owner)<input id="fOwner" dir="ltr" value="' + esc(c.owner) + '" autocapitalize="off" autocomplete="off"></label>' +
    '<label>اسم المستودع (Repository)<input id="fRepo" dir="ltr" value="' + esc(c.repo) + '" autocapitalize="off" autocomplete="off"></label>' +
    '<div class="two"><label>الفرع (Branch)<input id="fBranch" dir="ltr" value="' + esc(c.branch || 'main') + '" autocapitalize="off"></label>' +
    '<label>مجلد الموقع (اختياري)<input id="fFolder" dir="ltr" value="' + esc(c.folder) + '" placeholder="فاضي = أساس المستودع" autocapitalize="off"></label></div>' +
    '<label>رمز الوصول (Token)<input id="fToken" type="password" dir="ltr" value="' + esc(c.token) + '" autocomplete="off" autocapitalize="off"></label>' +
    '<details><summary>إزاي أجيب الرمز؟</summary><ol><li>ادخل GitHub ← صورتك ← <code>Settings</code></li><li><code>Developer settings</code> ← <code>Personal access tokens</code> ← <code>Fine-grained tokens</code></li><li>اضغط <code>Generate new token</code> واكتب أي اسم، واختر مدة الصلاحية</li><li>في <code>Repository access</code> اختر <code>Only select repositories</code> وحدّد مستودع الموقع</li><li>في <code>Permissions</code> ← <code>Repository permissions</code> ← <code>Contents</code> اختر <code>Read and write</code></li><li>اضغط <code>Generate token</code> وانسخ الرمز والصقه هنا</li></ol><p class="muted" style="margin-top:8px">الرمز بيتخزن على الجهاز ده بس. متشاركوش مع حد.</p></details>' +
    '<button class="btn big" id="btnLogin">دخول</button></div>';
  $('#btnLogin').addEventListener('click', () => {
    S.cfg = {
      owner: $('#fOwner').value.trim(), repo: $('#fRepo').value.trim(), branch: $('#fBranch').value.trim() || 'main',
      folder: $('#fFolder').value.trim(), token: $('#fToken').value.trim()
    };
    if (!S.cfg.owner || !S.cfg.repo || !S.cfg.token) return renderLogin('اكتب اسم الحساب والمستودع والرمز.');
    connect();
  });
}
async function connect() {
  busy('جاري الاتصال بـ GitHub…');
  try {
    const repo = await gh('/repos/' + S.cfg.owner + '/' + S.cfg.repo);
    if (repo.permissions && repo.permissions.push === false) throw new Error('الرمز مالوش صلاحية الكتابة على المستودع.');
    await loadRemote();
    localStorage.setItem(KEY, JSON.stringify(S.cfg));
    renderMain();
  } catch (e) {
    renderLogin(friendly(e));
  } finally { busy(false); }
}

/* ---------- main layout ---------- */
const TABS = [['products', 'المنتجات'], ['featured', 'الصور المميزة'], ['cats', 'الأقسام'], ['settings', 'بيانات المتجر']];
function renderMain() {
  S.editing = null;
  root.innerHTML =
    '<header class="ab"><b>SOLO</b><span>لوحة التحكم</span><a href="./" target="_blank" rel="noopener">فتح الموقع</a><button id="btnOut">خروج</button></header>' +
    '<nav class="tabs">' + TABS.map((t) => '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</nav>' +
    '<section class="pane" id="pane"></section>';
  $('#btnOut').addEventListener('click', () => {
    if (!confirm('تسجيل الخروج؟ هيتمسح الرمز من الجهاز ده.')) return;
    localStorage.removeItem(KEY);
    S.cfg = Object.assign(detect(), {});
    renderLogin();
  });
  $('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    S.tab = b.dataset.tab;
    $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
    renderPane();
  });
  renderPane();
}
function renderPane() {
  ({ products: paneProducts, featured: paneFeatured, cats: paneCats, settings: paneSettings })[S.tab]();
}
const catName = (id) => { const c = S.data.categories.find((x) => x.id === id); return c ? c.name : ''; };
const money = (n) => Number(n).toLocaleString('en-US');

/* ---------- products list ---------- */
function paneProducts() {
  const pane = $('#pane');
  pane.innerHTML = '<button class="btn big" id="newProd">+ منتج جديد</button><input id="q" type="search" placeholder="ابحث باسم المنتج" value="' + esc(S.q) + '"><div id="plist" style="display:grid;gap:10px"></div>';
  $('#newProd').addEventListener('click', () => openEditor(null));
  $('#q').addEventListener('input', (e) => { S.q = e.target.value; drawList(); });
  drawList();
}
function drawList() {
  const q = S.q.trim().toLowerCase();
  const list = S.data.products.filter((p) => !q || (p.name + ' ' + (p.sub || '')).toLowerCase().includes(q));
  $('#plist').innerHTML = list.length ? list.map((p) => {
    const img = p.colors[0] && p.colors[0].images[0] || '';
    const hasOffer = Object.keys(p.offers || {}).length > 0;
    return '<div class="row" data-id="' + esc(p.id) + '"><img src="' + esc(imgSrc(img)) + '" alt=""><div><h4>' + esc(p.name) + '</h4>' +
      '<p class="meta">' + esc(catName(p.category)) + (p.sub ? ' — ' + esc(p.sub) : '') + ' — ' + money(p.price) + ' ج.م</p>' +
      '<p>' + (p.hidden ? '<span class="pill gray">مخفي</span>' : '') + (hasOffer ? '<span class="pill red">عرض</span>' : '') + (p.isNew ? '<span class="pill">جديد</span>' : '') + '</p></div>' +
      '<div class="acts"><button class="btn sm" data-act="edit">تعديل</button><button class="btn sm line" data-act="toggle">' + (p.hidden ? 'إظهار' : 'إخفاء') + '</button><button class="btn sm danger" data-act="del">حذف</button></div></div>';
  }).join('') : '<p class="muted" style="text-align:center;padding:30px">مفيش منتجات. ابدأ بإضافة منتج جديد.</p>';
}

/* ---------- product editor ---------- */
const parseSizes = (t) => [...new Set(String(t || '').split(/[,،\n]/).map((x) => x.trim()).filter(Boolean))];
function openEditor(id) {
  const src = id ? S.data.products.find((p) => p.id === id) : null;
  const p = src ? JSON.parse(JSON.stringify(src)) : {
    id: 'p' + Date.now().toString(36), name: '', category: (S.data.categories[0] || {}).id || '', sub: '', price: '', offers: {}, sizes: [],
    colors: [{ name: '', hex: '#111111', images: [] }], desc: '', isNew: true, hidden: false
  };
  const o = p.offers || {};
  p.sizesText = (p.sizes || []).join(', ');
  p.offerMode = o['*'] != null ? 'all' : (Object.keys(o).length ? 'size' : 'none');
  p.offerAll = o['*'] != null ? o['*'] : '';
  p.offerSizes = Object.assign({}, o);
  delete p.offerSizes['*'];
  p._isNew = !src;
  S.editing = p;
  renderEditor();
  window.scrollTo(0, 0);
}
function renderEditor() {
  const e = S.editing;
  const cats = S.data.categories;
  root.innerHTML =
    '<div class="ed-top"><button id="edBack">→ رجوع</button><b>' + (e._isNew ? 'منتج جديد' : 'تعديل المنتج') + '</b></div>' +
    '<section class="pane">' +
    '<div class="card"><label>اسم المنتج<input data-k="name" value="' + esc(e.name) + '" placeholder="مثال: بدلة سوداء كلاسيك"></label>' +
    '<div class="two"><label>القسم<select data-k="category">' + cats.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === e.category ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label>' +
    '<label>القسم الفرعي<input data-k="sub" list="subList" value="' + esc(e.sub) + '" placeholder="مثال: قمصان"><datalist id="subList"></datalist></label></div>' +
    '<label>السعر الأصلي (ج.م)<input data-k="price" type="number" inputmode="numeric" min="0" value="' + esc(e.price) + '"></label></div>' +
    '<div class="card"><h3>المقاسات</h3><input data-k="sizesText" value="' + esc(e.sizesText) + '" placeholder="S, M, L, XL"><p class="muted">افصل بين المقاسات بفاصلة. أو اختر مجموعة جاهزة:</p>' +
    '<div class="presets"><button class="btn sm line" data-preset="S, M, L, XL, XXL">S - XXL</button><button class="btn sm line" data-preset="46, 48, 50, 52, 54, 56">بدل 46-56</button><button class="btn sm line" data-preset="38, 39, 40, 41, 42, 43, 44">قمصان 38-44</button><button class="btn sm line" data-preset="40, 41, 42, 43, 44, 45">أحذية رجالي</button><button class="btn sm line" data-preset="36, 37, 38, 39, 40">أحذية نسائي</button><button class="btn sm line" data-preset="مقاس واحد">مقاس واحد</button></div></div>' +
    '<div class="card" id="offersCard"></div>' +
    '<div class="card"><h3>الألوان والصور</h3><p class="muted">كل لون له صوره. أول صورة في أول لون هي صورة المنتج الأساسية.</p><div id="colorsBox" style="display:grid;gap:12px"></div><button class="btn line" id="addColor">+ إضافة لون</button></div>' +
    '<div class="card"><label>وصف المنتج<textarea data-k="desc" rows="4" placeholder="الخامة، القصة، الاستخدام…">' + esc(e.desc) + '</textarea></label>' +
    '<label class="chk"><input type="checkbox" data-k="isNew"' + (e.isNew ? ' checked' : '') + '> أظهر علامة «جديد»</label>' +
    '<label class="chk"><input type="checkbox" data-k="hidden"' + (e.hidden ? ' checked' : '') + '> إخفاء المنتج من الموقع</label></div>' +
    '</section><div class="ed-bar"><button class="btn big" id="edSave">حفظ ونشر</button></div><div style="height:90px"></div>';
  fillSubs();
  renderOffers();
  renderColors();
}
function fillSubs() {
  const e = S.editing;
  const c = S.data.categories.find((x) => x.id === e.category);
  const dl = $('#subList');
  if (dl) dl.innerHTML = ((c && c.subs) || []).map((s) => '<option value="' + esc(s) + '">').join('');
}
function renderOffers() {
  const e = S.editing;
  const sizes = parseSizes(e.sizesText);
  $('#offersCard').innerHTML =
    '<h3>سعر العرض</h3><div class="seg">' +
    [['none', 'بدون عرض'], ['all', 'سعر عرض واحد لكل المقاسات'], ['size', 'سعر عرض مختلف لكل مقاس']].map((m) =>
      '<label><input type="radio" name="om" value="' + m[0] + '"' + (e.offerMode === m[0] ? ' checked' : '') + '> ' + m[1] + '</label>').join('') + '</div>' +
    (e.offerMode === 'all' ? '<label>سعر العرض (ج.م)<input data-k="offerAll" type="number" inputmode="numeric" min="0" value="' + esc(e.offerAll) + '"></label>' : '') +
    (e.offerMode === 'size' ? (sizes.length ? '<div class="szgrid">' + sizes.map((s) => '<label>' + esc(s) + '<input data-os="' + esc(s) + '" type="number" inputmode="numeric" min="0" placeholder="—" value="' + esc(e.offerSizes[s] || '') + '"></label>').join('') + '</div><p class="muted">سيب الخانة فاضية للمقاس اللي مفيهوش خصم.</p>' : '<p class="muted">اكتب المقاسات الأول.</p>') : '');
}
function renderColors() {
  const e = S.editing;
  $('#colorsBox').innerHTML = e.colors.map((c, i) =>
    '<div class="color"><div class="two"><label>اسم اللون<input data-cn="' + i + '" value="' + esc(c.name) + '" placeholder="مثال: كحلي"></label>' +
    '<label>درجة اللون<input type="color" data-ch="' + i + '" value="' + esc(c.hex || '#111111') + '"></label></div>' +
    '<div class="thumbs">' + c.images.map((u, k) => '<div class="th"><img src="' + esc(imgSrc(u)) + '" alt=""><button data-rmimg="' + i + ':' + k + '" aria-label="حذف الصورة">×</button></div>').join('') +
    '<label class="addimg">+ إضافة صور<input type="file" accept="image/*" multiple hidden data-up="' + i + '"></label></div>' +
    (e.colors.length > 1 ? '<button class="link-danger" data-rmcolor="' + i + '">حذف هذا اللون</button>' : '') + '</div>').join('');
}
async function saveProduct() {
  const e = S.editing;
  const name = e.name.trim();
  const price = Number(e.price);
  if (!name) return toast('اكتب اسم المنتج.', true);
  if (!(price > 0)) return toast('اكتب السعر الأصلي.', true);
  const sizes = parseSizes(e.sizesText);
  if (!sizes.length) sizes.push('مقاس واحد');
  const offers = {};
  if (e.offerMode === 'all' && Number(e.offerAll) > 0) offers['*'] = Number(e.offerAll);
  if (e.offerMode === 'size') sizes.forEach((s) => { const v = Number(e.offerSizes[s]); if (v > 0) offers[s] = v; });
  if (Object.values(offers).some((v) => v >= price)) return toast('سعر العرض لازم يكون أقل من السعر الأصلي.', true);
  const colors = e.colors.filter((c) => c.name.trim() || c.images.length).map((c) => ({ name: c.name.trim() || 'افتراضي', hex: c.hex || '#111111', images: c.images }));
  if (!colors.length || !colors.some((c) => c.images.length)) return toast('أضف صورة واحدة على الأقل للمنتج.', true);
  const out = { id: e.id, name, category: e.category, sub: (e.sub || '').trim(), price, offers, sizes, colors, desc: (e.desc || '').trim(), isNew: !!e.isNew, hidden: !!e.hidden };
  const i = S.data.products.findIndex((p) => p.id === e.id);
  const backup = JSON.stringify(S.data);
  if (i >= 0) S.data.products[i] = out; else S.data.products.unshift(out);
  if (await save()) { S.tab = 'products'; renderMain(); } else { S.data = JSON.parse(backup); }
}

/* ---------- featured ---------- */
function paneFeatured() {
  const d = S.data;
  $('#pane').innerHTML =
    '<div class="card"><p class="muted">الصور دي بتظهر في قسم «الصور المميزة» بتأثير Coverflow في أول الصفحة. الأفضل 8 صور بمقاس 4:5 (مثلاً 1200×1500).</p>' +
    '<label class="btn big line" style="cursor:pointer">+ إضافة صور مميزة<input type="file" accept="image/*" multiple hidden id="featUp"></label></div>' +
    '<div id="flist" style="display:grid;gap:10px"></div><div class="ed-bar"><button class="btn big" id="saveFeat">حفظ ونشر</button></div><div style="height:80px"></div>';
  drawFeatured();
  $('#featUp').addEventListener('change', async (e) => {
    await uploadFiles(e.target.files, (rel) => d.featured.push({ image: rel, title: '', sub: '', link: '' }));
    e.target.value = '';
    drawFeatured();
  });
  $('#saveFeat').addEventListener('click', () => save());
}
function drawFeatured() {
  const d = S.data;
  $('#flist').innerHTML = d.featured.length ? d.featured.map((f, i) =>
    '<div class="fr" data-i="' + i + '"><img src="' + esc(imgSrc(f.image)) + '" alt=""><div class="f">' +
    '<input data-f="title" value="' + esc(f.title) + '" placeholder="العنوان">' +
    '<input data-f="sub" value="' + esc(f.sub) + '" placeholder="سطر صغير تحت العنوان">' +
    '<select data-f="link"><option value="">بدون رابط</option>' + d.categories.map((c) => '<option value="#/c/' + esc(c.id) + '"' + (f.link === '#/c/' + c.id ? ' selected' : '') + '>قسم: ' + esc(c.name) + '</option>').join('') + '<option value="#/offers"' + (f.link === '#/offers' ? ' selected' : '') + '>العروض</option></select></div>' +
    '<div class="mv"><button class="btn sm line" data-fa="up">↑</button><button class="btn sm line" data-fa="down">↓</button><button class="btn sm danger" data-fa="del">حذف</button></div></div>'
  ).join('') : '<p class="muted" style="text-align:center;padding:30px">مفيش صور مميزة. أضف صور من الزر فوق.</p>';
}

/* ---------- categories ---------- */
function paneCats() {
  const d = S.data;
  $('#pane').innerHTML =
    '<div class="card"><p class="muted">اسم القسم وصورته والأقسام الفرعية اللي بتظهر كأزرار داخل القسم. الصورة الأفضل أفقية أو مربعة بجودة عالية.</p></div>' +
    '<div id="clist" style="display:grid;gap:12px"></div>' +
    '<button class="btn big line" id="addCat">+ قسم جديد</button><div class="ed-bar"><button class="btn big" id="saveCats">حفظ ونشر</button></div><div style="height:80px"></div>';
  drawCats();
  $('#addCat').addEventListener('click', () => {
    d.categories.push({ id: 'c' + Date.now().toString(36), name: 'قسم جديد', en: 'New', image: '', subs: [] });
    drawCats();
  });
  $('#saveCats').addEventListener('click', () => save());
}
function drawCats() {
  const d = S.data;
  $('#clist').innerHTML = d.categories.map((c, i) =>
    '<div class="card" data-i="' + i + '"><div class="two"><label>الاسم بالعربي<input data-c="name" value="' + esc(c.name) + '"></label><label>الاسم بالإنجليزي<input data-c="en" dir="ltr" value="' + esc(c.en) + '"></label></div>' +
    '<label>الأقسام الفرعية (افصل بفاصلة)<input data-c="subs" value="' + esc((c.subs || []).join('، ')) + '"></label>' +
    '<div class="thumbs"><div class="th" style="width:130px"><img src="' + esc(imgSrc(c.image)) + '" alt=""></div><label class="addimg" style="width:130px">تغيير صورة القسم<input type="file" accept="image/*" hidden data-cup="' + i + '"></label></div>' +
    '<button class="link-danger" data-cdel="' + i + '">حذف القسم</button></div>').join('');
}

/* ---------- settings ---------- */
const FIELDS = [
  ['storeName', 'اسم المتجر'], ['whatsapp', 'رقم واتساب بالصيغة الدولية (مثال 201004929979)'], ['phone', 'رقم الهاتف'], ['email', 'البريد الإلكتروني'],
  ['facebook', 'رابط فيسبوك'], ['instagram', 'رابط إنستجرام'], ['address', 'العنوان'], ['mapQuery', 'عنوان الخريطة (للبحث في Google Maps)'], ['currency', 'العملة']
];
function paneSettings() {
  const s = S.data.settings;
  $('#pane').innerHTML = '<div class="card">' + FIELDS.map((f) => '<label>' + f[1] + '<input data-s="' + f[0] + '" value="' + esc(s[f[0]]) + '"' + (/whatsapp|phone|email|facebook|instagram|mapQuery/.test(f[0]) ? ' dir="ltr"' : '') + '></label>').join('') + '</div><div class="ed-bar"><button class="btn big" id="saveSet">حفظ ونشر</button></div><div style="height:80px"></div>';
  $('#saveSet').addEventListener('click', () => {
    s.whatsapp = String(s.whatsapp || '').replace(/\D/g, '');
    save();
  });
}

/* ---------- events (delegated) ---------- */
root.addEventListener('input', (ev) => {
  const t = ev.target;
  const e = S.editing;
  if (e) {
    if (t.dataset.k) {
      e[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.value;
      if (t.dataset.k === 'category') fillSubs();
      return;
    }
    if (t.dataset.os) { e.offerSizes[t.dataset.os] = t.value; return; }
    if (t.dataset.cn != null) { e.colors[+t.dataset.cn].name = t.value; return; }
    if (t.dataset.ch != null) { e.colors[+t.dataset.ch].hex = t.value; return; }
  }
  if (t.dataset.f) { S.data.featured[+t.closest('.fr').dataset.i][t.dataset.f] = t.value; return; }
  if (t.dataset.c) {
    const c = S.data.categories[+t.closest('[data-i]').dataset.i];
    c[t.dataset.c] = t.dataset.c === 'subs' ? t.value.split(/[,،]/).map((x) => x.trim()).filter(Boolean) : t.value;
    return;
  }
  if (t.dataset.s) { S.data.settings[t.dataset.s] = t.value; }
});
root.addEventListener('change', async (ev) => {
  const t = ev.target;
  const e = S.editing;
  if (e && t.name === 'om') { e.offerMode = t.value; renderOffers(); return; }
  if (e && t.dataset.k === 'sizesText') { renderOffers(); return; }
  if (e && t.dataset.up != null) {
    const col = e.colors[+t.dataset.up];
    await uploadFiles(t.files, (rel) => col.images.push(rel));
    renderColors();
    return;
  }
  if (t.dataset.f === 'link') { S.data.featured[+t.closest('.fr').dataset.i].link = t.value; return; }
  if (t.dataset.cup != null) {
    const c = S.data.categories[+t.dataset.cup];
    await uploadFiles(t.files.length ? [t.files[0]] : [], (rel) => { c.image = rel; });
    drawCats();
  }
});
root.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button');
  if (!t) return;
  const e = S.editing;
  if (t.id === 'edBack') { if (confirm('الرجوع من غير حفظ؟')) { S.editing = null; renderMain(); } return; }
  if (t.id === 'edSave') return saveProduct();
  if (t.id === 'addColor' && e) { e.colors.push({ name: '', hex: '#111111', images: [] }); renderColors(); return; }
  if (t.dataset.preset && e) { e.sizesText = t.dataset.preset; $('[data-k=sizesText]').value = e.sizesText; renderOffers(); return; }
  if (t.dataset.rmimg && e) { const [i, k] = t.dataset.rmimg.split(':').map(Number); e.colors[i].images.splice(k, 1); renderColors(); return; }
  if (t.dataset.rmcolor && e) { e.colors.splice(+t.dataset.rmcolor, 1); renderColors(); return; }

  const row = t.closest('.row');
  if (row && t.dataset.act) {
    const p = S.data.products.find((x) => x.id === row.dataset.id);
    if (!p) return;
    if (t.dataset.act === 'edit') return openEditor(p.id);
    if (t.dataset.act === 'toggle') { p.hidden = !p.hidden; if (await save()) drawList(); else p.hidden = !p.hidden; return; }
    if (t.dataset.act === 'del') {
      if (!confirm('حذف «' + p.name + '» نهائيًا؟')) return;
      const backup = JSON.stringify(S.data);
      S.data.products = S.data.products.filter((x) => x !== p);
      if (await save()) drawList(); else S.data = JSON.parse(backup);
    }
    return;
  }
  const fr = t.closest('.fr');
  if (fr && t.dataset.fa) {
    const list = S.data.featured;
    const i = +fr.dataset.i;
    if (t.dataset.fa === 'del') list.splice(i, 1);
    if (t.dataset.fa === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
    if (t.dataset.fa === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
    drawFeatured();
    return;
  }
  if (t.dataset.cdel != null) {
    const i = +t.dataset.cdel;
    const c = S.data.categories[i];
    if (S.data.products.some((p) => p.category === c.id)) return toast('انقل أو احذف منتجات القسم الأول.', true);
    if (confirm('حذف القسم «' + c.name + '»؟')) { S.data.categories.splice(i, 1); drawCats(); }
  }
});

/* ---------- boot ---------- */
(async function init() {
  S.cfg = loadCfg();
  if (S.cfg.token && S.cfg.owner && S.cfg.repo) connect(); else renderLogin();
})();
})();
