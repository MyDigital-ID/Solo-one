// ============================================================
// SOLO SUITS — Site Data Loader
// بيحمّل site-data.json مع caching و fallback
// ============================================================

(function () {
  'use strict';

  const DATA_URL = 'site-data.json';
  const CACHE_KEY = 'solo_site_data_v1';
  const CACHE_TIME_KEY = 'solo_site_data_time_v1';
  const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

  async function loadSiteData(onFresh) {
    try {
      const cachedTime = parseInt(localStorage.getItem(CACHE_TIME_KEY) || '0', 10);
      const now = Date.now();

      // لو الكاش لسه صالح، استخدمه فورًا
      if (cachedTime && (now - cachedTime) < CACHE_TTL) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            console.log('📦 Loaded from cache');
            // نحدّث في الخلفية
            fetchFreshData().then((fresh) => {
              if (fresh && typeof onFresh === 'function') onFresh(fresh);
            }).catch(() => {});
            return parsed;
          } catch (e) {
            console.warn('⚠️ Cache parse failed, fetching fresh');
          }
        }
      }

      // تحميل من الشبكة
      return await fetchFreshData();

    } catch (error) {
      console.error('❌ Failed to load site data:', error);

      // آخر محاولة: جرب الكاش حتى لو منتهي
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          console.log('📦 Fallback to old cache');
          return JSON.parse(cached);
        } catch (e) {}
      }

      throw error;
    }
  }

  async function fetchFreshData() {
    const response = await fetch(`${DATA_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
    } catch (e) {
      console.warn('⚠️ Could not cache data:', e.message);
    }

    console.log('🌐 Loaded fresh from network');
    return data;
  }

  function clearSiteDataCache() {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
    console.log('🗑️ Site data cache cleared');
  }

  window.SiteDataLoader = {
    load: loadSiteData,
    clearCache: clearSiteDataCache,
    DATA_URL
  };

  console.log('✅ Site Data Loader ready');

})();