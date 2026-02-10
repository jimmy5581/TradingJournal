const Trade = require('../models/Trade');
const moment = require('moment');

exports.createTrade = async (req, res, next) => {
  try {
    const userId = req.userId;
    const tradeData = { ...req.body, userId };

    const tradeDate = moment(tradeData.date).startOf('day');
    const todayStart = tradeDate.toDate();
    const todayEnd = moment(todayStart).endOf('day').toDate();

    const todayTradeCount = await Trade.countDocuments({
      userId,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    const dailyLimit = req.user?.dailyTradeLimit || 10;

    if (todayTradeCount >= dailyLimit) {
      return res.status(400).json({
        success: false,
        message: `Daily trade limit exceeded. Maximum ${dailyLimit} trades per day allowed.`,
        currentCount: todayTradeCount
      });
    }

    const trade = await Trade.create(tradeData);

    res.status(201).json({
      success: true,
      message: 'Trade logged successfully',
      data: { trade }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errors}`
      });
    }
    next(error);
  }
};

exports.getAllTrades = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { month, year, setup, mood, status, segment, side, page = 1, limit = 50 } = req.query;

    const filter = { userId };

    if (month && year) {
      const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
      const endDate = moment(startDate).endOf('month').toDate();
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (setup) {
      filter.setup = setup.toLowerCase();
    }

    if (mood) {
      filter.mood = mood.toLowerCase();
    }

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (segment) {
      filter.segment = segment.toLowerCase();
    }

    if (side) {
      filter.side = side.toUpperCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const trades = await Trade.find(filter)
      .sort({ date: -1, time: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Trade.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        trades,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTrades: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getTradeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const trade = await Trade.findOne({ _id: id, userId });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { trade }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTrade = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updateData = req.body;

    delete updateData.userId;

    const trade = await Trade.findOne({ _id: id, userId });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    Object.assign(trade, updateData);
    await trade.save();

    res.status(200).json({
      success: true,
      message: 'Trade updated successfully',
      data: { trade }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteTrade = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const trade = await Trade.findOneAndDelete({ _id: id, userId });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trade deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
