if (!API.checkAuth()) {
  throw new Error('Not authenticated');
}

const loadDashboardData = async () => {
  try {
    const user = API.getUser();
    if (user) {
      document.getElementById('userName').textContent = user.name;
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [summary, recentTrades] = await Promise.all([
      API.Analytics.getSummary({ month: currentMonth, year: currentYear }),
      API.Trade.getAllTrades({ limit: 1 })
    ]);

    const data = summary.data;

    document.getElementById('netPnl').textContent = API.formatCurrency(data.netPnl);
    document.getElementById('netPnlChange').textContent = data.netPnl >= 0 ? '+15.2%' : '-5.2%';

    document.getElementById('winRate').textContent = `${data.winRate}%`;
    document.getElementById('winRateChange').textContent = '+2.1% improvement';

    document.getElementById('profitFactor').textContent = data.profitFactor;
    document.getElementById('profitFactorTarget').textContent = 'Target: 2.50';

    document.getElementById('avgRR').textContent = `1 : ${data.avgRR}`;
    document.getElementById('avgRRTrades').textContent = `Based on ${data.totalTrades} trades`;

    document.getElementById('bestDay').textContent = API.formatCurrency(data.bestTrade);
    document.getElementById('worstDay').textContent = API.formatCurrency(data.worstTrade);
    document.getElementById('avgWinningTrade').textContent = API.formatCurrency(
      data.winningTrades > 0 ? (data.netPnl / data.winningTrades) : 0
    );
    document.getElementById('avgLosingTrade').textContent = API.formatCurrency(
      data.losingTrades > 0 ? (data.netPnl / data.losingTrades) : 0
    );

    if (recentTrades.data.trades.length > 0) {
      loadRecentTrades(recentTrades.data.trades.slice(0, 5));
    }

  } catch (error) {
    console.error('Error loading dashboard:', error);
    API.showNotification('Failed to load dashboard data', 'error');
  }
};

const loadRecentTrades = (trades) => {
  const tbody = document.querySelector('#recentTradesTable tbody');
  if (!tbody) return;

  tbody.innerHTML = trades.map(trade => `
    <tr class="border-t">
      <td class="p-2">${new Date(trade.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
      <td class="p-2">${trade.instrument}</td>
      <td class="p-2">${trade.segment}</td>
      <td class="p-2">${trade.segment === 'options' ? 'Index' : 'Equity'}</td>
      <td class="p-2">${trade.side}</td>
      <td class="p-2">${trade.entryPrice}</td>
      <td class="p-2">${trade.exitPrice}</td>
      <td class="p-2 ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-500'}">
        ${trade.pnl >= 0 ? '+' : ''}${API.formatCurrency(trade.pnl)}
      </td>
      <td class="p-2">Closed</td>
    </tr>
  `).join('');
};

document.addEventListener('DOMContentLoaded', loadDashboardData);
