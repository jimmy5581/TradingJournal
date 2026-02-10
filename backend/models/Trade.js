const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  time: {
    type: String,
    required: true
  },
  segment: {
    type: String,
    required: true,
    enum: ['equity', 'fno', 'options', 'futures'],
    lowercase: true
  },
  instrumentType: {
    type: String,
    required: true,
    enum: ['equity', 'futures', 'options'],
    lowercase: true
  },
  instrument: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  side: {
    type: String,
    required: true,
    enum: ['BUY', 'SELL', 'LONG', 'SHORT'],
    uppercase: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  lots: {
    type: Number,
    default: 1
  },
  entryPrice: {
    type: Number,
    required: true,
    min: 0
  },
  exitPrice: {
    type: Number,
    default: null
  },
  stopLoss: {
    type: Number,
    default: null
  },
  target: {
    type: Number,
    default: null
  },
  productType: {
    type: String,
    enum: ['intraday', 'delivery', 'mis', 'nrml', 'cnc'],
    default: 'intraday'
  },
  expiryDate: {
    type: Date,
    default: null
  },
  strikePrice: {
    type: Number,
    default: null
  },
  optionType: {
    type: String,
    enum: ['CE', 'PE', null],
    default: null
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'CLOSED'
  },
  strategy: {
    type: String,
    default: null
  },
  setup: {
    type: String,
    enum: ['breakout', 'trend', 'reversal', 'scalp', 'other'],
    default: 'other'
  },
  setupTags: {
    type: [String],
    default: []
  },
  timeframe: {
    type: String,
    default: null
  },
  riskTaken: {
    type: Number,
    default: null
  },
  convictionScore: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  tags: {
    type: [String],
    default: []
  },
  emotionalState: {
    type: [String],
    enum: ['calm', 'fomo', 'revenge', 'anxious', 'confident', 'neutral'],
    default: []
  },
  mood: {
    type: String,
    enum: ['calm', 'fomo', 'revenge', 'anxious', 'confident', 'neutral'],
    default: 'neutral'
  },
  preTradeNotes: {
    type: String,
    default: null
  },
  postTradeNotes: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  pnl: {
    type: Number,
    default: 0
  },
  rrRatio: {
    type: Number,
    default: 0
  },
  followedPlan: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

tradeSchema.index({ userId: 1, date: -1 });
tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ userId: 1, segment: 1 });
tradeSchema.index({ userId: 1, status: 1 });

tradeSchema.pre('save', function(next) {
  if (this.exitPrice && this.status === 'CLOSED') {
    let priceDiff;
    const normalizedSide = this.side.toUpperCase();
    
    if (normalizedSide === 'BUY' || normalizedSide === 'LONG') {
      priceDiff = this.exitPrice - this.entryPrice;
    } else {
      priceDiff = this.entryPrice - this.exitPrice;
    }
    
    this.pnl = parseFloat((priceDiff * this.quantity).toFixed(2));
  } else {
    this.pnl = 0;
  }
  
  if (this.stopLoss && this.target && this.entryPrice) {
    const risk = Math.abs(this.entryPrice - this.stopLoss);
    const reward = Math.abs(this.target - this.entryPrice);
    this.rrRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0;
  }
  
  next();
});

tradeSchema.virtual('outcome').get(function() {
  if (this.status !== 'CLOSED') return 'open';
  return this.pnl > 0 ? 'win' : this.pnl < 0 ? 'loss' : 'breakeven';
});

tradeSchema.set('toJSON', { virtuals: true });
tradeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Trade', tradeSchema);
