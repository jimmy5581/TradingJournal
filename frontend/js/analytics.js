if (!API.checkAuth()) {
  throw new Error('Not authenticated');
}

// Chart state management
let activeView = 'pnl';  // Default view
let activeRange = null;  // null = all time
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
    
    // Load default chart (P&L)
    await loadChart(activeView, activeRange);
  } catch (error) {
    console.error('Error loading analytics:', error);
    API.showNotification('Failed to load analytics', 'error');
  }
};

// Chart loading function
const loadChart = async (view, range) => {
  const cacheKey = range || 'all';
  
  // Check cache first
  if (chartCache[view][cacheKey]) {
    renderChart(chartCache[view][cacheKey]);
    return;
  }

  // Show loading state
  showChartLoader(true);

  try {
    let chartData;
    
    if (view === 'pnl') {
      chartData = await API.Analytics.getEquityCurve(range);
    } else {
      chartData = await API.Analytics.getTradingVolume(range);
    }

    // Cache the response
    chartCache[view][cacheKey] = chartData;
    
    // Render chart
    renderChart(chartData);
    
  } catch (error) {
    console.error('Error loading chart:', error);
    API.showNotification('Failed to load chart data', 'error');
  } finally {
    showChartLoader(false);
  }
};

// Chart rendering function
const renderChart = (response) => {
  const { title, chartType, data } = response;
  
  // Update chart title
  document.getElementById('chartTitle').textContent = title;
  
  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Prepare chart data
  const labels = data.map(item => item.date);
  const values = data.map(item => item.value);

  const ctx = document.getElementById('analyticsChart').getContext('2d');
  
  // Chart configuration based on type
  const chartConfig = {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        label: title,
        data: values,
        backgroundColor: chartType === 'bar' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
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
            callback: function(value) {
              if (activeView === 'pnl') {
                return '₹' + value.toLocaleString();
              }
              return value;
            }
          }
        },
        x: {
          ticks: {
            maxTicksLimit: 10
          }
        }
      }
    }
  };

  chartInstance = new Chart(ctx, chartConfig);
};

// Show/hide chart loader
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

// Toggle button handlers
const toggleView = async (view) => {
  if (activeView === view) return;
  
  activeView = view;
  
  // Update button states
  const pnlBtn = document.getElementById('togglePnl');
  const volumeBtn = document.getElementById('toggleVolume');
  
  if (view === 'pnl') {
    pnlBtn.classList.add('bg-blue-600', 'text-white');
    pnlBtn.classList.remove('border', 'bg-white', 'text-gray-700');
    volumeBtn.classList.remove('bg-blue-600', 'text-white');
    volumeBtn.classList.add('border', 'bg-white', 'text-gray-700');
  } else {
    volumeBtn.classList.add('bg-blue-600', 'text-white');
    volumeBtn.classList.remove('border', 'bg-white', 'text-gray-700');
    pnlBtn.classList.remove('bg-blue-600', 'text-white');
    pnlBtn.classList.add('border', 'bg-white', 'text-gray-700');
  }
  
  // Load new chart
  await loadChart(activeView, activeRange);
};

// Range filter handlers
const changeRange = async (range) => {
  if (activeRange === range) return;
  
  activeRange = range;
  
  // Update button states
  const weekBtn = document.getElementById('rangeWeek');
  const monthBtn = document.getElementById('rangeMonth');
  const allBtn = document.getElementById('rangeAll');
  
  [weekBtn, monthBtn, allBtn].forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('border');
  });
  
  if (range === 'week') {
    weekBtn.classList.add('bg-blue-600', 'text-white');
    weekBtn.classList.remove('border');
  } else if (range === 'month') {
    monthBtn.classList.add('bg-blue-600', 'text-white');
    monthBtn.classList.remove('border');
  } else {
    allBtn.classList.add('bg-blue-600', 'text-white');
    allBtn.classList.remove('border');
  }
  
  // Load chart with new range
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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Load initial analytics
  loadAnalytics();
  
  // Toggle button listeners
  document.getElementById('togglePnl').addEventListener('click', () => toggleView('pnl'));
  document.getElementById('toggleVolume').addEventListener('click', () => toggleView('volume'));
  
  // Range filter listeners
  document.getElementById('rangeWeek').addEventListener('click', () => changeRange('week'));
  document.getElementById('rangeMonth').addEventListener('click', () => changeRange('month'));
  document.getElementById('rangeAll').addEventListener('click', () => changeRange(null));
});
