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
    required: [true, 'Trade date is required'],
    index: true
  },
  time: {
    type: String,
    required: [true, 'Trade time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
  },
  instrument: {
    type: String,
    required: [true, 'Instrument is required'],
    trim: true,
    uppercase: true
  },
  segment: {
    type: String,
    required: [true, 'Segment is required'],
    enum: ['options', 'futures', 'equity'],
    lowercase: true
  },
  side: {
    type: String,
    required: [true, 'Side is required'],
    enum: ['LONG', 'SHORT'],
    uppercase: true
  },
  setup: {
    type: String,
    required: [true, 'Setup is required'],
    enum: ['breakout', 'trend', 'reversal', 'scalp', 'other'],
    lowercase: true
  },
  entryPrice: {
    type: Number,
    required: [true, 'Entry price is required'],
    min: [0, 'Entry price must be positive']
  },
  exitPrice: {
    type: Number,
    required: [true, 'Exit price is required'],
    min: [0, 'Exit price must be positive']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  stopLoss: {
    type: Number,
    default: null,
    min: [0, 'Stop loss must be positive']
  },
  target: {
    type: Number,
    default: null,
    min: [0, 'Target must be positive']
  },
  pnl: {
    type: Number,
    default: 0
  },
  rrRatio: {
    type: Number,
    default: 0
  },
  mood: {
    type: String,
    required: [true, 'Mood is required'],
    enum: ['calm', 'fomo', 'revenge', 'anxious', 'confident', 'neutral'],
    lowercase: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  followedPlan: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

tradeSchema.index({ userId: 1, date: -1 });
tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ userId: 1, segment: 1 });

tradeSchema.pre('save', function(next) {
  const priceDiff = this.exitPrice - this.entryPrice;
  const multiplier = this.side === 'LONG' ? 1 : -1;
  this.pnl = parseFloat((priceDiff * multiplier * this.quantity).toFixed(2));
  
  if (this.stopLoss && this.target) {
    const risk = Math.abs(this.entryPrice - this.stopLoss);
    const reward = Math.abs(this.target - this.entryPrice);
    this.rrRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0;
  }
  
  next();
});

tradeSchema.virtual('outcome').get(function() {
  return this.pnl > 0 ? 'win' : this.pnl < 0 ? 'loss' : 'breakeven';
});

tradeSchema.set('toJSON', { virtuals: true });
tradeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Trade', tradeSchema);
