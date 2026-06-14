// 실시간 번역앱 - 공통 스크립트
(function () {
  // ─── 테마 ───
  const html = document.documentElement;
  function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved === 'dark');
  }
  function setTheme(dark) {
    html.classList.toggle('dark-mode', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = dark ? '☀️' : '🌙';
  }
  window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', () => setTheme(!html.classList.contains('dark-mode')));
  });

  // ─── 토스트 ───
  let toastTimer;
  window.showToast = function (msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  };

  // ─── 클립보드 복사 ───
  window.copyText = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
      window.showToast('복사했어요 📋');
    } catch {
      window.showToast('복사에 실패했어요');
    }
  };

  // ─── 번역 API 호출 ───
  // payload: { text } 또는 { image, mediaType }
  window.translate = async function (payload) {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '번역에 실패했습니다.');
    return data;
  };

  // ─── 히스토리 (localStorage) ───
  const HKEY = 'translator-history';
  window.history_load = function () {
    try {
      return JSON.parse(localStorage.getItem(HKEY) || '[]');
    } catch {
      return [];
    }
  };
  window.history_add = function (original, translation) {
    if (!translation) return;
    const list = window.history_load();
    list.unshift({ original, translation, at: Date.now() });
    localStorage.setItem(HKEY, JSON.stringify(list.slice(0, 100)));
  };
  window.history_clear = function () {
    localStorage.removeItem(HKEY);
  };
})();
