if (!API.checkAuth()) {
  throw new Error('Not authenticated');
}

let currentPeriod = 'daily';
let currentDays = 30;

const loadAnalytics = async () => {
  try {
    const [summary, behavior, equityCurve] = await Promise.all([
      API.Analytics.getSummary(),
      API.Analytics.getBehaviorAnalysis(currentDays),
      API.Analytics.getEquityCurve(currentPeriod, currentDays)
    ]);

    renderSummaryCards(summary.data);
    renderSetupPerformance(behavior.data.setupPerformance);
    renderMoodAnalysis(behavior.data.moodDistribution, behavior.data.totalTrades);
    renderInsights(behavior.data.insights);
  } catch (error) {
    console.error('Error loading analytics:', error);
    API.showNotification('Failed to load analytics', 'error');
  }
};

const renderSummaryCards = (data) => {
  document.getElementById('netPnlAnalytics').textContent = API.formatCurrency(data.netPnl);
  document.getElementById('netPnlPercentage').textContent = `~${((data.netPnl / 100000) * 100).toFixed(1)}%`;

  document.getElementById('winRateAnalytics').textContent = `${data.winRate}%`;
  document.getElementById('winRateChange').textContent = data.winRate > 50 ? '↑ 2.1%' : '↓ 0.5%';
  document.getElementById('winRateChange').className = `text-xs ${data.winRate > 50 ? 'text-green-500' : 'text-red-500'}`;

  document.getElementById('profitFactorAnalytics').textContent = data.profitFactor;
  document.getElementById('profitFactorChange').textContent = data.profitFactor >= 2 ? '↑ 0.05' : '↓ 0.05';
  document.getElementById('profitFactorChange').className = `text-xs ${data.profitFactor >= 2 ? 'text-green-500' : 'text-red-500'}`;

  document.getElementById('avgReturn').textContent = API.formatCurrency(data.avgPnl);
  document.getElementById('avgReturnPercentage').textContent = `~${((data.avgPnl / 10000) * 100).toFixed(1)}%`;
};

const renderSetupPerformance = (setupData) => {
  const container = document.getElementById('setupPerformanceContainer');
  if (!container) return;

  const setups = Object.entries(setupData);
  if (setups.length === 0) {
    container.innerHTML = '<p class="text-gray-400">No setup data available</p>';
    return;
  }

  const maxPnl = Math.max(...setups.map(([_, data]) => Math.abs(data.totalPnl)));

  container.innerHTML = setups.map(([setup, data]) => {
    const isPositive = data.totalPnl >= 0;
    const width = maxPnl > 0 ? Math.abs(data.totalPnl / maxPnl * 100) : 0;
    const barColor = isPositive ? 'bg-green-500' : 'bg-red-500';
    const textColor = isPositive ? '' : 'text-red-500';

    return `
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-sm capitalize">${setup}</span>
          <span class="text-sm font-medium ${textColor}">${API.formatCurrency(data.totalPnl)}</span>
        </div>
        <div class="h-2 bg-gray-200 rounded">
          <div class="h-2 ${barColor} rounded" style="width: ${width}%"></div>
        </div>
      </div>
    `;
  }).join('');
};

const renderMoodAnalysis = (moodData, totalTrades) => {
  const moodCount = document.getElementById('moodTotalTrades');
  if (moodCount) {
    moodCount.textContent = totalTrades;
  }

  const moodList = document.getElementById('moodBreakdown');
  if (moodList) {
    moodList.innerHTML = Object.entries(moodData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mood, count]) => `
        <div class="flex justify-between text-sm">
          <span class="capitalize">${mood}</span>
          <span>${count} trades</span>
        </div>
      `).join('');
  }
};

const renderInsights = (insights) => {
  const insightsContainer = document.getElementById('behaviorInsights');
  if (!insightsContainer) return;

  if (insights.length === 0) {
    insightsContainer.innerHTML = '<p class="text-sm text-gray-400">No insights available yet. Keep logging trades!</p>';
    return;
  }

  insightsContainer.innerHTML = insights.map(insight => `
    <div class="bg-blue-50 text-blue-700 text-sm p-3 rounded">
      ${insight}
    </div>
  `).join('');
};

const changePeriod = (period) => {
  currentPeriod = period;
  const buttons = document.querySelectorAll('.period-btn');
  buttons.forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('border');
  });
  event.target.classList.add('bg-blue-600', 'text-white');
  event.target.classList.remove('border');
  loadAnalytics();
};

document.addEventListener('DOMContentLoaded', loadAnalytics);
