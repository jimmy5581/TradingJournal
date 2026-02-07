const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * OCR Controller for Trade Screenshot Processing
 * 
 * Flow:
 * 1. Receive uploaded image
 * 2. Validate format and size
 * 3. Preprocess image (grayscale, resize, enhance contrast)
 * 4. Run Tesseract OCR to extract text
 * 5. Parse text using regex rules (no AI, no guessing)
 * 6. Delete temporary image
 * 7. Return extracted fields as JSON
 * 
 * STRICT RULES:
 * - Only extract what's visible in the image
 * - No inference, no enrichment
 * - Missing fields = null
 * - No database save (client decides)
 */

// Allowed image formats
const ALLOWED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Preprocess image for better OCR accuracy
 * - Convert to PNG
 * - Grayscale
 * - Resize if too large
 * - Increase contrast
 * - Sharpen
 */
async function preprocessImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .resize(2000, 2000, { // Resize if larger than 2000px, maintain aspect ratio
        fit: 'inside',
        withoutEnlargement: true
      })
      .grayscale() // Convert to grayscale for better OCR
      .normalize() // Normalize contrast
      .sharpen() // Sharpen text
      .toFormat('png') // Convert to PNG
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Image preprocessing failed: ${error.message}`);
  }
}

/**
 * Extract text from image using Tesseract OCR
 */
async function extractTextFromImage(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng', // English language
      {
        logger: info => {
          // Optional: log OCR progress
          if (info.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
          }
        }
      }
    );
    
    return text;
  } catch (error) {
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
}

/**
 * Parse extracted text to find trade fields
 * Uses deterministic regex patterns - NO AI, NO GUESSING
 * 
 * Common patterns in Indian broker screenshots:
 * - Symbol: Usually uppercase, may include exchange prefix (NSE:RELIANCE, NIFTY 50)
 * - Side: BUY/SELL/LONG/SHORT
 * - Price: Numbers with decimal, may have ₹ symbol
 * - Quantity: Usually labeled as "Qty", "Quantity", "Lot"
 * - Date/Time: Various formats
 */
function parseTradeDetails(ocrText) {
  const extracted = {
    symbol: null,
    side: null,
    entryPrice: null,
    exitPrice: null,
    quantity: null,
    timestamp: null,
    rawText: ocrText // Include raw text for debugging
  };

  // Normalize text for parsing
  const text = ocrText.toUpperCase();
  const lines = text.split('\n');

  // 1. Extract SIDE (BUY/SELL/LONG/SHORT)
  const sideMatch = text.match(/\b(BUY|SELL|LONG|SHORT|BOUGHT|SOLD)\b/i);
  if (sideMatch) {
    const side = sideMatch[1].toUpperCase();
    extracted.side = ['BOUGHT', 'LONG'].includes(side) ? 'LONG' : 
                     ['SOLD', 'SHORT'].includes(side) ? 'SHORT' : side;
  }

  // 2. Extract SYMBOL (common Indian stock patterns)
  // Pattern: NSE:SYMBOL, BSE:SYMBOL, or standalone SYMBOL
  const symbolPatterns = [
    /(?:NSE|BSE):\s*([A-Z0-9]+)/,           // NSE:RELIANCE, BSE:TATASTEEL
    /SYMBOL\s*[:\-]?\s*([A-Z0-9]+)/,        // Symbol: RELIANCE
    /SCRIP\s*[:\-]?\s*([A-Z0-9]+)/,         // Scrip: INFY
    /\b(NIFTY|BANKNIFTY|FINNIFTY)\s*\d*/,   // NIFTY, BANKNIFTY
    /\b([A-Z]{2,})\s+(?:CE|PE|FUT)/         // OPTIONS: NIFTY 18000 CE
  ];

  for (const pattern of symbolPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.symbol = match[1].trim();
      break;
    }
  }

  // 3. Extract QUANTITY/LOT SIZE
  const quantityPatterns = [
    /QTY\s*[:\-]?\s*(\d+)/,                 // Qty: 100
    /QUANTITY\s*[:\-]?\s*(\d+)/,            // Quantity: 50
    /LOT\s*SIZE\s*[:\-]?\s*(\d+)/,          // Lot Size: 25
    /LOTS\s*[:\-]?\s*(\d+)/,                // Lots: 2
    /(\d+)\s*(?:SHARES|QTY|LOTS)/           // 100 Shares
  ];

  for (const pattern of quantityPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.quantity = parseInt(match[1], 10);
      break;
    }
  }

  // 4. Extract ENTRY PRICE (buy price, entry, avg price)
  const entryPatterns = [
    /(?:ENTRY|BUY|PURCHASE|AVG)\s*PRICE\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/,
    /(?:PRICE|RATE)\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/,
    /₹\s*([\d,]+\.?\d*)/ // Just ₹ symbol followed by number
  ];

  for (const pattern of entryPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Remove commas and parse
      extracted.entryPrice = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // 5. Extract EXIT PRICE (sell price, exit)
  const exitPatterns = [
    /(?:EXIT|SELL)\s*PRICE\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/,
    /SOLD\s*AT\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/
  ];

  for (const pattern of exitPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.exitPrice = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // 6. Extract TIMESTAMP (various date/time formats)
  const timestampPatterns = [
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i,
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/,
    /(?:DATE|TIME|TIMESTAMP)\s*[:\-]?\s*([0-9\/\-:\s]+)/i
  ];

  for (const pattern of timestampPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.timestamp = match[1].trim();
      break;
    }
  }

  return extracted;
}

/**
 * Clean up temporary files
 */
async function cleanupFiles(...filePaths) {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
      console.log(`Deleted temporary file: ${filePath}`);
    } catch (error) {
      console.error(`Failed to delete ${filePath}:`, error.message);
    }
  }
}

/**
 * Main OCR handler
 * POST /api/trades/scan
 */
exports.scanTrade = async (req, res) => {
  let originalPath = null;
  let processedPath = null;

  try {
    // 1. Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    // 2. Validate file type
    if (!ALLOWED_FORMATS.includes(req.file.mimetype)) {
      await cleanupFiles(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Invalid file format. Allowed: PNG, JPEG, JPG, WEBP'
      });
    }

    // 3. Validate file size
    if (req.file.size > MAX_FILE_SIZE) {
      await cleanupFiles(req.file.path);
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }

    originalPath = req.file.path;
    processedPath = path.join(
      path.dirname(originalPath),
      `processed_${Date.now()}.png`
    );

    console.log('📸 Processing trade screenshot...');
    console.log(`   Original: ${originalPath}`);
    console.log(`   Size: ${(req.file.size / 1024).toFixed(2)} KB`);

    // 4. Preprocess image
    console.log('🔧 Preprocessing image...');
    await preprocessImage(originalPath, processedPath);

    // 5. Run OCR
    console.log('🔍 Running OCR...');
    const extractedText = await extractTextFromImage(processedPath);
    console.log('✅ OCR completed');
    console.log('📄 Extracted text length:', extractedText.length, 'characters');

    // 6. Parse trade details
    console.log('🔎 Parsing trade details...');
    const tradeDetails = parseTradeDetails(extractedText);

    // 7. Delete temporary files immediately
    await cleanupFiles(originalPath, processedPath);

    // 8. Return extracted data
    res.json({
      success: true,
      message: 'OCR completed successfully',
      data: {
        extracted: {
          symbol: tradeDetails.symbol,
          side: tradeDetails.side,
          entryPrice: tradeDetails.entryPrice,
          exitPrice: tradeDetails.exitPrice,
          quantity: tradeDetails.quantity,
          timestamp: tradeDetails.timestamp
        },
        metadata: {
          ocrTextLength: extractedText.length,
          fieldsExtracted: Object.values(tradeDetails).filter(v => v !== null && v !== extractedText).length,
          // Include first 500 chars of raw text for debugging
          rawTextPreview: tradeDetails.rawText.substring(0, 500)
        }
      }
    });

  } catch (error) {
    console.error('❌ OCR Error:', error);

    // Cleanup on error
    if (originalPath || processedPath) {
      await cleanupFiles(originalPath, processedPath);
    }

    res.status(500).json({
      success: false,
      error: 'OCR processing failed',
      details: error.message
    });
  }
};

/**
 * Health check endpoint for OCR service
 */
exports.healthCheck = async (req, res) => {
  try {
    // Test if Tesseract is available
    const testText = await Tesseract.recognize(
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
      'eng'
    );

    res.json({
      success: true,
      message: 'OCR service is healthy',
      tesseract: 'operational',
      sharp: 'operational'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'OCR service unavailable',
      details: error.message
    });
  }
};
