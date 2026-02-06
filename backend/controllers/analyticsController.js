const Trade = require('../models/Trade');
const moment = require('moment');

exports.getSummary = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { month, year } = req.query;

    const filter = { userId };

    if (month && year) {
      const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
      const endDate = moment(startDate).endOf('month').toDate();
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const trades = await Trade.find(filter);

    if (trades.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          netPnl: 0,
          avgPnl: 0,
          avgRR: 0,
          bestTrade: 0,
          worstTrade: 0,
          maxDrawdown: 0,
          profitFactor: 0
        }
      });
    }

    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const winCount = winningTrades.length;
    const lossCount = losingTrades.length;
    const winRate = ((winCount / totalTrades) * 100).toFixed(2);

    const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnl = netPnl / totalTrades;

    const totalGains = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? (totalGains / totalLosses).toFixed(2) : 0;

    const tradesWithRR = trades.filter(t => t.rrRatio > 0);
    const avgRR = tradesWithRR.length > 0 
      ? (tradesWithRR.reduce((sum, t) => sum + t.rrRatio, 0) / tradesWithRR.length).toFixed(2)
      : 0;

    const bestTrade = trades.reduce((max, t) => t.pnl > max ? t.pnl : max, trades[0].pnl);
    const worstTrade = trades.reduce((min, t) => t.pnl < min ? t.pnl : min, trades[0].pnl);

    const sortedByDate = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnl = 0;

    sortedByDate.forEach(trade => {
      runningPnl += trade.pnl;
      if (runningPnl > peak) {
        peak = runningPnl;
      }
      const drawdown = peak - runningPnl;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalTrades,
        winningTrades: winCount,
        losingTrades: lossCount,
        winRate: parseFloat(winRate),
        netPnl: parseFloat(netPnl.toFixed(2)),
        avgPnl: parseFloat(avgPnl.toFixed(2)),
        avgRR: parseFloat(avgRR),
        bestTrade: parseFloat(bestTrade.toFixed(2)),
        worstTrade: parseFloat(worstTrade.toFixed(2)),
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        profitFactor: parseFloat(profitFactor)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getBehaviorAnalysis = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { days = 30 } = req.query;

    const startDate = moment().subtract(days, 'days').startOf('day').toDate();
    const trades = await Trade.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: 1, time: 1 });

    const tradesByDay = {};
    const tradesByWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    trades.forEach(trade => {
      const dateKey = moment(trade.date).format('YYYY-MM-DD');
      const weekday = moment(trade.date).day();
      
      if (!tradesByDay[dateKey]) {
        tradesByDay[dateKey] = [];
      }
      tradesByDay[dateKey].push(trade);
      tradesByWeekday[weekday]++;
    });

    const overtradingDays = [];
    const dailyTradeLimit = req.user.dailyTradeLimit;
    
    Object.entries(tradesByDay).forEach(([date, dayTrades]) => {
      if (dayTrades.length > dailyTradeLimit) {
        overtradingDays.push({
          date,
          tradeCount: dayTrades.length,
          netPnl: dayTrades.reduce((sum, t) => sum + t.pnl, 0)
        });
      }
    });

    let revengeTradingCount = 0;
    for (let i = 1; i < trades.length; i++) {
      const prevTrade = trades[i - 1];
      const currTrade = trades[i];
      
      const timeDiff = moment(`${currTrade.date} ${currTrade.time}`)
        .diff(moment(`${prevTrade.date} ${prevTrade.time}`), 'minutes');
      
      if (prevTrade.pnl < 0 && timeDiff <= 30 && currTrade.mood === 'revenge') {
        revengeTradingCount++;
      }
    }

    const moodDistribution = {};
    const moodPnl = {};
    trades.forEach(trade => {
      if (!moodDistribution[trade.mood]) {
        moodDistribution[trade.mood] = 0;
        moodPnl[trade.mood] = 0;
      }
      moodDistribution[trade.mood]++;
      moodPnl[trade.mood] += trade.pnl;
    });

    const setupPerformance = {};
    trades.forEach(trade => {
      if (!setupPerformance[trade.setup]) {
        setupPerformance[trade.setup] = {
          count: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0
        };
      }
      setupPerformance[trade.setup].count++;
      setupPerformance[trade.setup].totalPnl += trade.pnl;
      if (trade.pnl > 0) {
        setupPerformance[trade.setup].wins++;
      } else if (trade.pnl < 0) {
        setupPerformance[trade.setup].losses++;
      }
    });

    const ruleBreaks = trades.filter(t => !t.followedPlan).length;
    const tradesWithoutSL = trades.filter(t => !t.stopLoss).length;
    const poorRRTrades = trades.filter(t => t.rrRatio > 0 && t.rrRatio < 1).length;

    const bestWeekday = Object.entries(tradesByWeekday)
      .reduce((max, [day, count]) => count > max[1] ? [day, count] : max, ['0', 0]);

    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostActiveDay = weekdayNames[bestWeekday[0]];

    const insights = [];
    
    if (overtradingDays.length > 0) {
      insights.push(`You exceeded your daily limit on ${overtradingDays.length} day(s)`);
    }
    
    if (revengeTradingCount > 0) {
      insights.push(`Detected ${revengeTradingCount} potential revenge trades`);
    }

    const worstMood = Object.entries(moodPnl)
      .sort((a, b) => a[1] - b[1])[0];
    if (worstMood && worstMood[1] < 0) {
      insights.push(`Most losses occur during "${worstMood[0]}" trades`);
    }

    if (tradesWithoutSL > 0) {
      insights.push(`${tradesWithoutSL} trades without stop loss`);
    }

    if (poorRRTrades > trades.length * 0.3) {
      insights.push(`${poorRRTrades} trades have poor risk-reward ratio (<1:1)`);
    }

    res.status(200).json({
      success: true,
      data: {
        overtradingDays,
        revengeTradingCount,
        moodDistribution,
        moodPnl,
        setupPerformance,
        ruleBreaks,
        tradesWithoutSL,
        poorRRTrades,
        mostActiveDay,
        insights,
        totalTrades: trades.length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getEquityCurve = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { period = 'daily', days = 30 } = req.query;

    const startDate = moment().subtract(days, 'days').startOf('day').toDate();
    const trades = await Trade.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: 1, time: 1 });

    let runningPnl = 0;
    const equityCurve = [];

    if (period === 'daily') {
      const tradesByDate = {};
      trades.forEach(trade => {
        const dateKey = moment(trade.date).format('YYYY-MM-DD');
        if (!tradesByDate[dateKey]) {
          tradesByDate[dateKey] = 0;
        }
        tradesByDate[dateKey] += trade.pnl;
      });

      Object.entries(tradesByDate)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .forEach(([date, pnl]) => {
          runningPnl += pnl;
          equityCurve.push({
            date,
            pnl: parseFloat(pnl.toFixed(2)),
            cumulativePnl: parseFloat(runningPnl.toFixed(2))
          });
        });
    } else {
      trades.forEach(trade => {
        runningPnl += trade.pnl;
        equityCurve.push({
          date: moment(trade.date).format('YYYY-MM-DD'),
          time: trade.time,
          pnl: parseFloat(trade.pnl.toFixed(2)),
          cumulativePnl: parseFloat(runningPnl.toFixed(2))
        });
      });
    }

    res.status(200).json({
      success: true,
      data: {
        equityCurve,
        finalPnl: parseFloat(runningPnl.toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};
