(function() {
  'use strict';

  const CONFIG = {
    API_ENDPOINT: '/api/market-news',
    REFRESH_ENDPOINT: '/api/market-news/refresh'
  };

  const newsList = document.getElementById('marketNewsList');
  const refreshBtn = document.getElementById('refreshNewsBtn');

  function init() {
    if (!newsList || !refreshBtn) {
      console.error('Market news elements not found');
      return;
    }

    loadNews();

    refreshBtn.addEventListener('click', handleRefresh);
  }

  async function loadNews(forceRefresh = false) {
    try {
      showLoading();

      const url = forceRefresh 
        ? CONFIG.REFRESH_ENDPOINT 
        : CONFIG.API_ENDPOINT;

      if (forceRefresh) {
        await fetch(CONFIG.REFRESH_ENDPOINT, { method: 'POST' });
      }

      const response = await fetch(CONFIG.API_ENDPOINT);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load news');
      }

      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        displayNews(data.data);
      } else {
        showNoNews();
      }

    } catch (error) {
      console.error('Market news error:', error);
      showError(error.message);
    }
  }

  async function handleRefresh() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';
    
    await loadNews(true);
    
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  }

  function displayNews(newsItems) {
    newsList.innerHTML = '';

    newsItems.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'p-2 rounded transition-colors';
      li.style.cursor = 'pointer';
      
      li.addEventListener('mouseenter', () => {
        li.style.backgroundColor = 'var(--button-secondary-hover)';
      });
      
      li.addEventListener('mouseleave', () => {
        li.style.backgroundColor = '';
      });
      
      if (item.url) {
        li.innerHTML = `
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="hover:underline" style="color: var(--primary-green);">
            ${escapeHtml(item.title)}
          </a>
          ${item.source ? `<span class="text-xs ml-2" style="color: var(--text-secondary);">${escapeHtml(item.source)}</span>` : ''}
        `;
      } else {
        li.innerHTML = `
          <span>${escapeHtml(item.title)}</span>
          ${item.source ? `<span class="text-xs ml-2" style="color: var(--text-secondary);">${escapeHtml(item.source)}</span>` : ''}
        `;
      }

      newsList.appendChild(li);
    });
  }

  function showLoading() {
    newsList.innerHTML = '<li style="color: var(--text-secondary);">Loading news...</li>';
  }

  function showNoNews() {
    newsList.innerHTML = '<li style="color: var(--text-secondary);">No news available at the moment</li>';
  }

  function showError(message) {
    newsList.innerHTML = `<li style="color: var(--color-loss);">Error: ${escapeHtml(message)}</li>`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
