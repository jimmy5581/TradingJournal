require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const symbolSearchRoutes = require('./routes/symbolSearchRoutes');
const marketNewsRoutes = require('./routes/marketNewsRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const accountRoutes = require('./routes/accountRoutes');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/symbol-search', symbolSearchRoutes);
app.use('/api/market-news', marketNewsRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/account', accountRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  
});

module.exports = app;
