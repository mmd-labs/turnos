import { STORAGE_KEYS } from './constants.js';
export const Theme = {
  init() {
    this.toggleBtn = document.getElementById('theme-toggle');
    this.icon = document.getElementById('theme-icon');
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    this.setTheme(initial);

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        this.setTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
  },

  setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (this.icon) this.icon.textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (this.icon) this.icon.textContent = '🌙';
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }
};

