const ThemeManager = {
  init() {
    this.applyTheme(this.getTheme());
    this.attachListeners();
  },

  getTheme() {
    return localStorage.getItem('theme') || 'light';
  },

  setTheme(theme) {
    localStorage.setItem('theme', theme);
    this.applyTheme(theme);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  },

  toggle() {
    const currentTheme = this.getTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  },

  attachListeners() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }
};

document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
