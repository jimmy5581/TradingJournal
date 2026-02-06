# Trading Vault - Full Stack Trading Journal

A production-ready trading journal application to help traders log trades, analyze performance, and prevent emotional trading patterns.

## 🎯 Purpose

- Log every trade with detailed metrics
- Learn from past mistakes through analytics
- Prevent overtrading with behavior detection
- Track P&L, win rate, and discipline metrics

## 🛠️ Tech Stack

**Backend:** Node.js + Express + MongoDB + Mongoose  
**Frontend:** HTML + Tailwind CSS + Vanilla JavaScript  
**Auth:** JWT-based authentication with bcrypt

## 🚀 Quick Start

```bash
# Install dependencies
cd backend
npm install

# Create .env file (already exists, modify if needed)
# Start MongoDB
mongod

# Start server
npm run dev

# Open browser
http://localhost:5000/register.html
```

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.

## ✨ Features

- ✅ User registration and JWT authentication
- ✅ Full CRUD operations for trades
- ✅ Automatic P&L and Risk-Reward calculation
- ✅ Daily trade limit enforcement
- ✅ Win rate, profit factor, drawdown analytics
- ✅ Overtrading and revenge trading detection
- ✅ Setup-wise and mood-wise performance analysis
- ✅ Behavior insights and recommendations

## 📁 Project Structure

```
TradingJournal/
├── backend/
│   ├── models/          # Mongoose schemas
│   ├── controllers/     # Business logic
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth, validation, error handling
│   ├── config/          # Database connection
│   └── server.js        # Express app
└── frontend/
    ├── js/              # Frontend JavaScript
    ├── *.html           # UI pages
```

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Trades
- `POST /api/trades` - Create trade
- `GET /api/trades` - Get all trades
- `PUT /api/trades/:id` - Update trade
- `DELETE /api/trades/:id` - Delete trade

### Analytics
- `GET /api/analytics/summary` - Trading summary
- `GET /api/analytics/behavior` - Behavior analysis
- `GET /api/analytics/equity-curve` - Equity curve data

## 📊 Key Metrics

- Net P&L
- Win Rate
- Profit Factor
- Avg Risk-Reward
- Max Drawdown
- Setup Performance
- Mood Analysis

## 🔒 Security

- Bcrypt password hashing (10 rounds)
- JWT tokens with 7-day expiry
- Protected routes with auth middleware
- Input validation via Mongoose
- Environment variables for secrets

## 📄 License

MIT

---

**See SETUP_GUIDE.md for complete setup instructions and troubleshooting.**