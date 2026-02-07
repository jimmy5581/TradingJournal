const https = require('https');

/**
 * Search stock symbols via Twelve Data API
 * GET /api/symbol-search?q=<query>
 */
exports.searchSymbols = async (req, res) => {
  try {
    const { q } = req.query;

    // Validate query parameter
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" must be at least 2 characters'
      });
    }

    // Check if API key exists
    const apiKey = process.env.TWELVEDATA_API_KEY;
    if (!apiKey) {
      console.error('❌ TWELVEDATA_API_KEY not found in environment variables - symbolSearchController.js:22');
      return res.status(500).json({
        success: false,
        error: 'Search service configuration error'
      });
    }

    console.log(`🔍 Searching Twelve Data for: "${q}" - symbolSearchController.js:29`);

    // Call Twelve Data API
    const twelveDataUrl = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(q)}&apikey=${apiKey}`;

    https.get(twelveDataUrl, (apiResponse) => {
      let data = '';

      apiResponse.on('data', (chunk) => {
        data += chunk;
      });

      apiResponse.on('end', () => {
        try {
          // Check for API errors
          if (apiResponse.statusCode === 401) {
            console.error('Twelve Data API: Invalid API key - symbolSearchController.js:45');
            return res.status(500).json({
              success: false,
              error: 'Search service configuration error. Please check API key.'
            });
          }

          if (apiResponse.statusCode === 429) {
            console.error('Twelve Data API: Rate limit exceeded - symbolSearchController.js:53');
            return res.status(429).json({
              success: false,
              error: 'Rate limit exceeded. Please try again later.'
            });
          }

          if (apiResponse.statusCode !== 200) {
            console.error('Twelve Data API error: - symbolSearchController.js:61', apiResponse.statusCode, data);
            return res.status(500).json({
              success: false,
              error: 'Search service temporarily unavailable'
            });
          }

          const result = JSON.parse(data);

          // Check for error in response
          if (result.status === 'error') {
            console.error('Twelve Data API error: - symbolSearchController.js:72', result.message);
            return res.status(500).json({
              success: false,
              error: result.message || 'Search service error'
            });
          }

          // Extract and limit results
          const symbols = (result.data || [])
            .slice(0, 10) // Limit to 10 results
            .map(item => ({
              symbol: item.symbol,
              description: item.instrument_name || item.exchange,
              type: item.instrument_type || item.type || 'Stock'
            }));

          console.log(`✅ Found ${symbols.length} symbols for "${q}" - symbolSearchController.js:88`);

          res.json({
            success: true,
            count: symbols.length,
            data: symbols
          });

        } catch (parseError) {
          console.error('Error parsing Twelve Data response: - symbolSearchController.js:97', parseError);
          res.status(500).json({
            success: false,
            error: 'Error processing search results'
          });
        }
      });

    }).on('error', (error) => {
      console.error('Twelve Data API request error: - symbolSearchController.js:106', error);
      res.status(500).json({
        success: false,
        error: 'Search service temporarily unavailable'
      });
    });

  } catch (error) {
    console.error('Symbol search error: - symbolSearchController.js:114', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
