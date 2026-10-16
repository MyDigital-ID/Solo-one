// ============================================================
// SOLO SUITS — Site Data Loader
// بيحمّل site-data.json (من الشبكة أولاً عشان تعديلات لوحة التحكم تظهر فوراً)
// ولو مفيش إنترنت بيرجع لآخر نسخة محفوظة على الجهاز
// ============================================================

(function () {
  'use strict';

  const DATA_URL  = 'site-data.json';
  const CACHE_KEY = 'solo_data';   // نفس المفتاح اللي كان بيستخدمه الموقع، فالنسخ المحفوظة قبل كده تفضل شغالة

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) { return null; }
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); }
    catch (e) { /* التخزين ممتلئ أو التصفح الخاص */ }
  }

  async function fetchFresh() {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || typeof data !== 'object') throw new Error('Invalid data format');
    writeCache(data);
    return data;
  }

  // network-first: لو الشبكة وقعت نرجع للنسخة المحفوظة، ولو مفيش نسخة نرمي الخطأ
  async function load() {
    try {
      return await fetchFresh();
    } catch (err) {
      const cached = readCache();
      if (cached) return cached;
      throw err;
    }
  }

  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* ignore */ }
  }

  window.SiteDataLoader = { load: load, clearCache: clearCache, DATA_URL: DATA_URL };
})();
