if (!API.checkAuth()) {
  throw new Error('Not authenticated');
}

let currentPage = 1;
let currentFilters = {};

const loadJournal = async (page = 1) => {
  try {
    currentPage = page;
    const filters = { ...currentFilters, page, limit: 50 };
    
    const response = await API.Trade.getAllTrades(filters);
    const { trades, pagination } = response.data;

    renderTrades(trades);
    updatePagination(pagination);
  } catch (error) {
    console.error('Error loading journal:', error);
    API.showNotification('Failed to load trades', 'error');
  }
};

const renderTrades = (trades) => {
  const tbody = document.querySelector('#tradesTable tbody');
  if (!tbody) return;

  if (trades.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8" style="text-align: center; color: var(--text-muted);">
          No trades found. Click "+ New Entry" to log your first trade.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = trades.map(trade => {
    const sideClass = trade.side === 'LONG' ? 'status-long' : 'status-short';
    const pnlClass = trade.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
    const moodColors = {
      calm: 'mood-calm',
      fomo: 'mood-fomo',
      revenge: 'mood-revenge',
      anxious: 'mood-anxious',
      confident: 'mood-confident',
      neutral: 'mood-neutral'
    };

    return `
      <tr>
        <td class="p-3">
          <div class="font-medium">${API.formatDate(trade.date)}</div>
          <div class="text-xs" style="color: var(--text-muted);">${trade.time} IST</div>
        </td>
        <td class="p-3">
          <div class="font-medium">${trade.instrument}</div>
          <div class="text-xs" style="color: var(--text-muted);">${trade.segment}</div>
        </td>
        <td class="p-3">
          <span class="${sideClass}">${trade.side}</span>
        </td>
        <td class="p-3">${trade.setup}</td>
        <td class="p-3 ${pnlClass}">
          ${trade.pnl >= 0 ? '+' : ''}${API.formatCurrency(trade.pnl)}
        </td>
        <td class="p-3">
          <span class="mood-badge ${moodColors[trade.mood] || moodColors.neutral}">
            ${trade.mood}
          </span>
        </td>
        <td class="p-3" style="color: var(--text-secondary);">${trade.notes ? trade.notes.substring(0, 30) + '...' : '-'}</td>
        <td class="p-3 cursor-pointer" style="color: var(--text-muted);" onclick="showTradeMenu('${trade._id}')">⋯</td>
      </tr>
    `;
  }).join('');
};

const updatePagination = (pagination) => {
  const paginationText = document.getElementById('paginationText');
  if (paginationText) {
    const start = (pagination.currentPage - 1) * pagination.limit + 1;
    const end = Math.min(pagination.currentPage * pagination.limit, pagination.totalTrades);
    paginationText.textContent = `Showing ${start} to ${end} of ${pagination.totalTrades} entries`;
  }

  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  
  if (prevBtn) {
    prevBtn.disabled = pagination.currentPage === 1;
    prevBtn.onclick = () => loadJournal(pagination.currentPage - 1);
  }
  
  if (nextBtn) {
    nextBtn.disabled = pagination.currentPage === pagination.totalPages;
    nextBtn.onclick = () => loadJournal(pagination.currentPage + 1);
  }
};

const showTradeMenu = (tradeId) => {
  const confirmDelete = confirm('Delete this trade?');
  if (confirmDelete) {
    deleteTrade(tradeId);
  }
};

const deleteTrade = async (tradeId) => {
  try {
    await API.Trade.deleteTrade(tradeId);
    API.showNotification('Trade deleted successfully');
    loadJournal(currentPage);
  } catch (error) {
    console.error('Error deleting trade:', error);
    API.showNotification('Failed to delete trade', 'error');
  }
};

const applyFilters = () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput && searchInput.value) {
    currentFilters.search = searchInput.value;
  }
  loadJournal(1);
};

document.addEventListener('DOMContentLoaded', () => {
  loadJournal();
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(applyFilters, 500));
  }
});

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
