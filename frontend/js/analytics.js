if (!API.checkAuth()) {
  throw new Error('Not authenticated');
}

let activeView = 'pnl';
let activeRange = null;
let chartInstance = null;
let chartCache = {
  pnl: {},
  volume: {}
};

const loadAnalytics = async () => {
  try {
    const [summary, behavior] = await Promise.all([
      API.Analytics.getSummary(),
      API.Analytics.getBehaviorAnalysis(30)
    ]);

    renderSummaryCards(summary.data);
    renderSetupPerformance(behavior.data.setupPerformance);
    renderMoodAnalysis(behavior.data.moodDistribution, behavior.data.totalTrades);
    renderInsights(behavior.data.insights);
    
    await loadChart(activeView, activeRange);
  } catch (error) {
    console.error('Error loading analytics:', error);
    API.showNotification('Failed to load analytics', 'error');
  }
};

const loadChart = async (view, range) => {
  const cacheKey = range || 'all';
  
  if (chartCache[view][cacheKey]) {
    renderChart(chartCache[view][cacheKey]);
    return;
  }

  showChartLoader(true);

  try {
    let chartData;
    
    if (view === 'pnl') {
      chartData = await API.Analytics.getEquityCurve(range);
    } else {
      chartData = await API.Analytics.getTradingVolume(range);
    }

    chartCache[view][cacheKey] = chartData;
    
    renderChart(chartData);
    
  } catch (error) {
    console.error('Error loading chart:', error);
    API.showNotification('Failed to load chart data', 'error');
  } finally {
    showChartLoader(false);
  }
};

const renderChart = (response) => {
  const { title, chartType, data } = response;
  
  document.getElementById('chartTitle').textContent = title;
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = data.map(item => item.date);
  const values = data.map(item => item.value);

  const style = getComputedStyle(document.documentElement);
  const neutralChart = style.getPropertyValue('--neutral-chart').trim();
  const colorProfit = style.getPropertyValue('--color-profit').trim();
  const colorLoss = style.getPropertyValue('--color-loss').trim();
  const textSecondary = style.getPropertyValue('--text-secondary').trim();

  let lineColor = neutralChart;
  let fillColor = neutralChart + '20';
  let barColor = neutralChart + '99';

  if (activeView === 'pnl') {
    const finalValue = values[values.length - 1];
    if (finalValue >= 0) {
      lineColor = colorProfit;
      fillColor = colorProfit + '20';
    } else {
      lineColor = colorLoss;
      fillColor = colorLoss + '20';
    }
  }

  const ctx = document.getElementById('analyticsChart').getContext('2d');
  
  const chartConfig = {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        label: title,
        data: values,
        backgroundColor: chartType === 'bar' ? barColor : fillColor,
        borderColor: lineColor,
        borderWidth: 2,
        fill: chartType === 'line',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              if (activeView === 'pnl') {
                return `P&L: ${API.formatCurrency(value)}`;
              }
              return `Volume: ${value}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: activeView === 'volume',
          ticks: {
            color: textSecondary,
            callback: function(value) {
              if (activeView === 'pnl') {
                return '₹' + value.toLocaleString();
              }
              return value;
            }
          },
          grid: {
            color: textSecondary + '20'
          }
        },
        x: {
          ticks: {
            color: textSecondary,
            maxTicksLimit: 10
          },
          grid: {
            color: textSecondary + '20'
          }
        }
      }
    }
  };

  chartInstance = new Chart(ctx, chartConfig);
};

const showChartLoader = (show) => {
  const loader = document.getElementById('chartLoader');
  const canvas = document.getElementById('analyticsChart');
  
  if (show) {
    loader.classList.remove('hidden');
    canvas.style.display = 'none';
  } else {
    loader.classList.add('hidden');
    canvas.style.display = 'block';
  }
};

const toggleView = async (view) => {
  if (activeView === view) return;
  
  activeView = view;
  
  const pnlBtn = document.getElementById('togglePnl');
  const volumeBtn = document.getElementById('toggleVolume');
  
  if (view === 'pnl') {
    pnlBtn.classList.add('toggle-btn-active');
    pnlBtn.classList.remove('toggle-btn');
    volumeBtn.classList.remove('toggle-btn-active');
    volumeBtn.classList.add('toggle-btn');
  } else {
    volumeBtn.classList.add('toggle-btn-active');
    volumeBtn.classList.remove('toggle-btn');
    pnlBtn.classList.remove('toggle-btn-active');
    pnlBtn.classList.add('toggle-btn');
  }
  
  await loadChart(activeView, activeRange);
};

const changeRange = async (range) => {
  if (activeRange === range) return;
  
  activeRange = range;
  
  const weekBtn = document.getElementById('rangeWeek');
  const monthBtn = document.getElementById('rangeMonth');
  const allBtn = document.getElementById('rangeAll');
  
  [weekBtn, monthBtn, allBtn].forEach(btn => {
    btn.classList.remove('filter-btn-active');
    btn.classList.add('filter-btn');
  });
  
  if (range === 'week') {
    weekBtn.classList.add('filter-btn-active');
    weekBtn.classList.remove('filter-btn');
  } else if (range === 'month') {
    monthBtn.classList.add('filter-btn-active');
    monthBtn.classList.remove('filter-btn');
  } else {
    allBtn.classList.add('filter-btn-active');
    allBtn.classList.remove('filter-btn');
  }
  
  await loadChart(activeView, activeRange);
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
    container.innerHTML = '<p style="color: var(--text-secondary);">No setup data available</p>';
    return;
  }

  const maxPnl = Math.max(...setups.map(([_, data]) => Math.abs(data.totalPnl)));

  container.innerHTML = setups.map(([setup, data]) => {
    const isPositive = data.totalPnl >= 0;
    const width = maxPnl > 0 ? Math.abs(data.totalPnl / maxPnl * 100) : 0;
    const barColor = isPositive ? 'var(--color-profit)' : 'var(--color-loss)';
    const textColor = isPositive ? 'var(--color-profit)' : 'var(--color-loss)';

    return `
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-sm capitalize">${setup}</span>
          <span class="text-sm font-medium" style="color: ${textColor};">${API.formatCurrency(data.totalPnl)}</span>
        </div>
        <div class="h-2 rounded" style="background-color: var(--border-subtle);">
          <div class="h-2 rounded" style="background-color: ${barColor}; width: ${width}%"></div>
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
    insightsContainer.innerHTML = '<p class="text-sm" style="color: var(--text-secondary);">No insights available yet. Keep logging trades!</p>';
    return;
  }

  insightsContainer.innerHTML = insights.map(insight => `
    <div class="text-sm p-3 rounded" style="background-color: var(--button-secondary-hover); color: var(--color-profit);">
      ${insight}
    </div>
  `).join('');
};

document.addEventListener('DOMContentLoaded', () => {
  loadAnalytics();
  
  document.getElementById('togglePnl').addEventListener('click', () => toggleView('pnl'));
  document.getElementById('toggleVolume').addEventListener('click', () => toggleView('volume'));
  
  document.getElementById('rangeWeek').addEventListener('click', () => changeRange('week'));
  document.getElementById('rangeMonth').addEventListener('click', () => changeRange('month'));
  document.getElementById('rangeAll').addEventListener('click', () => changeRange(null));

  const observer = new MutationObserver(() => {
    if (chartInstance) {
      loadChart(activeView, activeRange);
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
});
