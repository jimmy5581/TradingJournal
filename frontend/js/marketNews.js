/**
 * Market News Fetcher
 * Loads Indian market news from backend API
 */

(function() {
  'use strict';

  const CONFIG = {
    API_ENDPOINT: '/api/market-news',
    REFRESH_ENDPOINT: '/api/market-news/refresh'
  };

  const newsList = document.getElementById('marketNewsList');
  const refreshBtn = document.getElementById('refreshNewsBtn');

  /**
   * Initialize news loader
   */
  function init() {
    if (!newsList || !refreshBtn) {
      console.error('Market news elements not found');
      return;
    }

    // Load news on page load
    loadNews();

    // Refresh button handler
    refreshBtn.addEventListener('click', handleRefresh);
  }

  /**
   * Load market news from API
   */
  async function loadNews(forceRefresh = false) {
    try {
      showLoading();

      const url = forceRefresh 
        ? CONFIG.REFRESH_ENDPOINT 
        : CONFIG.API_ENDPOINT;

      // For force refresh, POST to clear cache first
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

  /**
   * Handle refresh button click
   */
  async function handleRefresh() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';
    
    await loadNews(true);
    
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  }

  /**
   * Display news items
   */
  function displayNews(newsItems) {
    newsList.innerHTML = '';

    newsItems.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'hover:bg-gray-50 p-2 rounded transition-colors';
      
      if (item.url) {
        li.innerHTML = `
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
            ${escapeHtml(item.title)}
          </a>
          ${item.source ? `<span class="text-xs text-gray-400 ml-2">${escapeHtml(item.source)}</span>` : ''}
        `;
      } else {
        li.innerHTML = `
          <span>${escapeHtml(item.title)}</span>
          ${item.source ? `<span class="text-xs text-gray-400 ml-2">${escapeHtml(item.source)}</span>` : ''}
        `;
      }

      newsList.appendChild(li);
    });
  }

  /**
   * Show loading state
   */
  function showLoading() {
    newsList.innerHTML = '<li class="text-gray-400">Loading news...</li>';
  }

  /**
   * Show no news message
   */
  function showNoNews() {
    newsList.innerHTML = '<li class="text-gray-400">No news available at the moment</li>';
  }

  /**
   * Show error message
   */
  function showError(message) {
    newsList.innerHTML = `<li class="text-red-600">Error: ${escapeHtml(message)}</li>`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
