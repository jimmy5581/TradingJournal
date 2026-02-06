# 🚀 SETUP GUIDE - Trading Vault

## Quick Start (5 minutes)

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Start MongoDB
Make sure MongoDB is running on your system:
```bash
mongod
```

Or if using MongoDB as a service:
```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod
```

### Step 3: Create .env file
The .env file already exists in the backend folder. If you want to change settings:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tradevault
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
NODE_ENV=development
```

### Step 4: Start the server
```bash
npm run dev
```

Expected output:
```
✅ MongoDB Connected: localhost
🚀 Server running on port 5000
📂 Frontend: http://localhost:5000
🔌 API: http://localhost:5000/api
```

### Step 5: Open your browser
```
http://localhost:5000/register.html
```

Register a new account and start using the app!

---

## 📋 Complete Feature List

### ✅ Implemented Features

1. **User Authentication**
   - Register with email/password
   - Login with JWT tokens
   - Secure password hashing
   - Auto-logout on token expiry

2. **Trade Management**
   - Log trades with full details
   - View all trades in journal
   - Edit existing trades
   - Delete trades
   - Search and filter trades
   - Pagination

3. **Analytics Dashboard**
   - Net P&L calculation
   - Win rate percentage
   - Profit factor
   - Average R:R ratio
   - Best/worst trade
   - Max drawdown

4. **Behavior Detection**
   - Overtrading alerts
   - Revenge trading detection
   - Mood-based analysis
   - Rule break tracking
   - Missing stop-loss alerts
   - Poor R:R warnings

5. **Performance Analysis**
   - Setup-wise breakdown (trend, breakout, reversal, scalp)
   - Mood distribution
   - Daily/weekly trading patterns
   - Insights and recommendations

---

## 🧪 Testing the Application

### Test User Registration
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

### Test Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### Test Create Trade
```bash
POST http://localhost:5000/api/trades
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "date": "2026-02-06",
  "time": "10:30",
  "instrument": "NIFTY",
  "segment": "options",
  "side": "LONG",
  "setup": "breakout",
  "entryPrice": 200,
  "exitPrice": 250,
  "quantity": 100,
  "stopLoss": 180,
  "target": 270,
  "mood": "calm",
  "notes": "Clean breakout with volume",
  "followedPlan": true
}
```

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
❌ MongoDB Connection Error: connect ECONNREFUSED
```
**Solution**: Make sure MongoDB is running
```bash
mongod
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Change PORT in .env file or kill the process using port 5000

### JWT Token Error
```
Invalid token. User not found.
```
**Solution**: Login again to get a fresh token

### CORS Error in Browser
```
Access to fetch has been blocked by CORS policy
```
**Solution**: Make sure backend server is running and API_BASE_URL in frontend/js/api.js matches your backend URL

---

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique, indexed),
  password: String (hashed),
  dailyTradeLimit: Number (default: 5),
  createdAt: Date,
  updatedAt: Date
}
```

### Trades Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, indexed),
  date: Date (indexed),
  time: String,
  instrument: String,
  segment: enum ['options', 'futures', 'equity'],
  side: enum ['LONG', 'SHORT'],
  setup: enum ['breakout', 'trend', 'reversal', 'scalp', 'other'],
  entryPrice: Number,
  exitPrice: Number,
  quantity: Number,
  stopLoss: Number,
  target: Number,
  pnl: Number (auto-calculated),
  rrRatio: Number (auto-calculated),
  mood: enum ['calm', 'fomo', 'revenge', 'anxious', 'confident', 'neutral'],
  notes: String,
  followedPlan: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Security Best Practices

1. **Never commit .env file** - Already in .gitignore
2. **Change JWT_SECRET in production** - Use a strong 32+ character string
3. **Use HTTPS in production** - Add SSL certificate
4. **Enable MongoDB authentication** - Set up users and roles
5. **Rate limiting** - Add express-rate-limit for API protection
6. **Input sanitization** - Already implemented via Mongoose validation

---

## 🚀 Production Deployment Checklist

- [ ] Change JWT_SECRET to a strong secret
- [ ] Use production MongoDB (MongoDB Atlas recommended)
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Add rate limiting
- [ ] Enable MongoDB authentication
- [ ] Set up logging (Winston/Morgan)
- [ ] Configure proper CORS origins
- [ ] Add API monitoring
- [ ] Set up backups for database

---

## 📞 Support

For issues or questions:
1. Check this setup guide
2. Review the troubleshooting section
3. Check MongoDB and Node.js logs

---

**Built with ❤️ for traders who want to improve**
