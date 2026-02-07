/**
 * Symbol Search with Autocomplete Dropdown
 * Searches NSE/BSE symbols via backend API
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    API_ENDPOINT: '/api/symbol-search',
    MIN_CHARS: 2,
    DEBOUNCE_MS: 300,
    MAX_RESULTS: 10
  };

  // DOM Elements
  const searchInput = document.getElementById('symbolSearch');
  const dropdown = document.getElementById('symbolDropdown');

  // State
  let debounceTimer = null;
  let currentQuery = '';

  /**
   * Initialize event listeners
   */
  function init() {
    if (!searchInput || !dropdown) {
      console.error('Symbol search elements not found');
      return;
    }

    // Input event - trigger search with debounce
    searchInput.addEventListener('input', handleInput);

    // Focus event - show dropdown if has results
    searchInput.addEventListener('focus', () => {
      if (dropdown.children.length > 0) {
        showDropdown();
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        hideDropdown();
      }
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', handleKeydown);
  }

  /**
   * Handle input events with debouncing
   */
  function handleInput(e) {
    const query = e.target.value.trim();

    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Hide dropdown if query too short
    if (query.length < CONFIG.MIN_CHARS) {
      hideDropdown();
      currentQuery = '';
      return;
    }

    // Debounce the search
    debounceTimer = setTimeout(() => {
      performSearch(query);
    }, CONFIG.DEBOUNCE_MS);
  }

  /**
   * Perform symbol search via API
   */
  async function performSearch(query) {
    currentQuery = query;

    try {
      // Show loading state
      showLoadingState();

      // Call backend API
      const response = await fetch(`${CONFIG.API_ENDPOINT}?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();

      // Display results
      if (data.success && data.data && data.data.length > 0) {
        displayResults(data.data);
      } else {
        showNoResults();
      }

    } catch (error) {
      console.error('Symbol search error:', error);
      showError(error.message);
    }
  }

  /**
   * Display search results in dropdown
   */
  function displayResults(symbols) {
    dropdown.innerHTML = '';

    symbols.forEach((symbol, index) => {
      const item = createResultItem(symbol, index);
      dropdown.appendChild(item);
    });

    showDropdown();
  }

  /**
   * Create a single result item
   */
  function createResultItem(symbol, index) {
    const div = document.createElement('div');
    div.className = 'px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors';
    div.setAttribute('data-index', index);
    
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <p class="font-medium text-sm text-gray-900">${escapeHtml(symbol.symbol)}</p>
          <p class="text-xs text-gray-500 truncate">${escapeHtml(symbol.description)}</p>
        </div>
        ${symbol.type ? `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded ml-2">${escapeHtml(symbol.type)}</span>` : ''}
      </div>
    `;

    // Click handler
    div.addEventListener('click', () => {
      selectSymbol(symbol);
    });

    return div;
  }

  /**
   * Handle symbol selection
   */
  function selectSymbol(symbol) {
    searchInput.value = symbol.symbol;
    hideDropdown();
    
    // Dispatch custom event for other components to listen
    const event = new CustomEvent('symbolSelected', {
      detail: { symbol: symbol.symbol, description: symbol.description, type: symbol.type }
    });
    searchInput.dispatchEvent(event);
    
    console.log('Symbol selected:', symbol);
  }

  /**
   * Show loading state
   */
  function showLoadingState() {
    dropdown.innerHTML = `
      <div class="px-3 py-2 text-sm text-gray-500 text-center">
        <span>Searching...</span>
      </div>
    `;
    showDropdown();
  }

  /**
   * Show no results message
   */
  function showNoResults() {
    dropdown.innerHTML = `
      <div class="px-3 py-2 text-sm text-gray-500 text-center">
        No symbols found for "${escapeHtml(currentQuery)}"
      </div>
    `;
    showDropdown();
  }

  /**
   * Show error message
   */
  function showError(message) {
    dropdown.innerHTML = `
      <div class="px-3 py-2 text-sm text-red-600 text-center">
        ${escapeHtml(message)}
      </div>
    `;
    showDropdown();
  }

  /**
   * Show dropdown
   */
  function showDropdown() {
    dropdown.classList.remove('hidden');
  }

  /**
   * Hide dropdown
   */
  function hideDropdown() {
    dropdown.classList.add('hidden');
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeydown(e) {
    const items = dropdown.querySelectorAll('[data-index]');
    if (items.length === 0) return;

    const currentActive = dropdown.querySelector('.bg-blue-50');
    let currentIndex = currentActive ? parseInt(currentActive.getAttribute('data-index')) : -1;

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        currentIndex = Math.min(currentIndex + 1, items.length - 1);
        highlightItem(items, currentIndex);
        break;

      case 'ArrowUp':
        e.preventDefault();
        currentIndex = Math.max(currentIndex - 1, 0);
        highlightItem(items, currentIndex);
        break;

      case 'Enter':
        e.preventDefault();
        if (currentIndex >= 0 && items[currentIndex]) {
          items[currentIndex].click();
        }
        break;

      case 'Escape':
        hideDropdown();
        searchInput.blur();
        break;
    }
  }

  /**
   * Highlight specific item
   */
  function highlightItem(items, index) {
    items.forEach((item, i) => {
      if (i === index) {
        item.classList.add('bg-blue-50');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('bg-blue-50');
      }
    });
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
