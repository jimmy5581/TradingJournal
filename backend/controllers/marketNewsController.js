const https = require('https');

// Cache configuration
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes
let newsCache = {
  data: null,
  timestamp: null
};

/**
 * Get Indian market news via NewsAPI
 * GET /api/market-news
 */
exports.getMarketNews = async (req, res) => {
  try {
    // Check cache
    const now = Date.now();
    if (newsCache.data && newsCache.timestamp && (now - newsCache.timestamp) < CACHE_DURATION) {
      console.log('📰 Serving cached market news - marketNewsController.js:19');
      return res.json(newsCache.data);
    }

    // Check if API key exists
    const apiKey = process.env.NEWSAPI_API_KEY;
    if (!apiKey) {
      console.error('❌ NEWSAPI_API_KEY not found in environment variables - marketNewsController.js:26');
      return res.status(500).json({
        success: false,
        error: 'News service configuration error'
      });
    }

    console.log('📡 Fetching fresh market news from NewsAPI - marketNewsController.js:33');

    // Call NewsAPI - India business news, top headlines
    const newsUrl = `https://newsapi.org/v2/top-headlines?country=in&category=business&pageSize=10&apiKey=${apiKey}`;

    https.get(newsUrl, (apiResponse) => {
      let data = '';

      apiResponse.on('data', (chunk) => {
        data += chunk;
      });

      apiResponse.on('end', () => {
        try {
          if (apiResponse.statusCode === 401) {
            console.error('NewsAPI: Invalid API key - marketNewsController.js:48');
            return res.status(500).json({
              success: false,
              error: 'News service configuration error. Please check API key.'
            });
          }

          if (apiResponse.statusCode === 429) {
            console.error('NewsAPI: Rate limit exceeded - marketNewsController.js:56');
            // If rate limited, return cached data if available
            if (newsCache.data) {
              console.log('⚠️ Rate limited, serving stale cache - marketNewsController.js:59');
              return res.json(newsCache.data);
            }
            return res.status(429).json({
              success: false,
              error: 'Rate limit exceeded. Please try again later.'
            });
          }

          if (apiResponse.statusCode !== 200) {
            console.error('NewsAPI error: - marketNewsController.js:69', apiResponse.statusCode, data);
            return res.status(500).json({
              success: false,
              error: 'News service temporarily unavailable'
            });
          }

          const result = JSON.parse(data);

          // Check for error in response
          if (result.status === 'error') {
            console.error('NewsAPI error: - marketNewsController.js:80', result.message);
            return res.status(500).json({
              success: false,
              error: result.message || 'News service error'
            });
          }

          // Extract and format news items
          const newsItems = (result.articles || [])
            .slice(0, 10)
            .map(item => ({
              title: item.title,
              url: item.url,
              source: item.source?.name || 'News Source',
              publishedAt: item.publishedAt,
              summary: item.description
            }));

          const response = {
            success: true,
            count: newsItems.length,
            data: newsItems,
            cachedAt: new Date().toISOString()
          };

          // Update cache
          newsCache = {
            data: response,
            timestamp: now
          };

          console.log(`✅ Fetched ${newsItems.length} news items - marketNewsController.js:111`);

          res.json(response);

        } catch (parseError) {
          console.error('Error parsing NewsAPI response: - marketNewsController.js:116', parseError);
          res.status(500).json({
            success: false,
            error: 'Error processing news data'
          });
        }
      });

    }).on('error', (error) => {
      console.error('NewsAPI request error: - marketNewsController.js:125', error);
      res.status(500).json({
        success: false,
        error: 'News service temporarily unavailable'
      });
    });

  } catch (error) {
    console.error('Market news error: - marketNewsController.js:133', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Clear news cache (optional endpoint for manual cache refresh)
 * POST /api/market-news/refresh
 */
exports.refreshNewsCache = (req, res) => {
  newsCache = { data: null, timestamp: null };
  console.log('🔄 News cache cleared - marketNewsController.js:147');
  res.json({ success: true, message: 'Cache cleared' });
};
