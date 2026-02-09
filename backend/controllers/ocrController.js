const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const ALLOWED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function preprocessImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .grayscale()
      .normalize()
      .sharpen()
      .toFormat('png')
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Image preprocessing failed: ${error.message}`);
  }
}

async function extractTextFromImage(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng',
      {
        logger: info => {
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

function parseTradeDetails(ocrText) {
  const extracted = {
    symbol: null,
    side: null,
    entryPrice: null,
    exitPrice: null,
    quantity: null,
    timestamp: null,
    rawText: ocrText
  };

  const text = ocrText.toUpperCase();
  const lines = text.split('\n');

  const sideMatch = text.match(/\b(BUY|SELL|LONG|SHORT|BOUGHT|SOLD)\b/i);
  if (sideMatch) {
    const side = sideMatch[1].toUpperCase();
    extracted.side = ['BOUGHT', 'LONG'].includes(side) ? 'LONG' : 
                     ['SOLD', 'SHORT'].includes(side) ? 'SHORT' : side;
  }

  const symbolPatterns = [
    /(?:NSE|BSE):\s*([A-Z0-9]+)/,
    /SYMBOL\s*[:\-]?\s*([A-Z0-9]+)/,
    /SCRIP\s*[:\-]?\s*([A-Z0-9]+)/,
    /\b(NIFTY|BANKNIFTY|FINNIFTY)\s*\d*/,
    /\b([A-Z]{2,})\s+(?:CE|PE|FUT)/
  ];

  for (const pattern of symbolPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.symbol = match[1].trim();
      break;
    }
  }

  const quantityPatterns = [
    /QTY\s*[:\-]?\s*(\d+)/,
    /QUANTITY\s*[:\-]?\s*(\d+)/,
    /LOT\s*SIZE\s*[:\-]?\s*(\d+)/,
    /LOTS\s*[:\-]?\s*(\d+)/,
    /(\d+)\s*(?:SHARES|QTY|LOTS)/
  ];

  for (const pattern of quantityPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.quantity = parseInt(match[1], 10);
      break;
    }
  }

  const entryPatterns = [
    /(?:ENTRY|BUY|PURCHASE|AVG)\s*PRICE\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/,
    /(?:PRICE|RATE)\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/,
    /₹\s*([\d,]+\.?\d*)/
  ];

  for (const pattern of entryPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.entryPrice = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

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

exports.scanTrade = async (req, res) => {
  let originalPath = null;
  let processedPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    if (!ALLOWED_FORMATS.includes(req.file.mimetype)) {
      await cleanupFiles(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Invalid file format. Allowed: PNG, JPEG, JPG, WEBP'
      });
    }

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

    console.log('🔧 Preprocessing image...');
    await preprocessImage(originalPath, processedPath);

    console.log('🔍 Running OCR...');
    const extractedText = await extractTextFromImage(processedPath);
    console.log('✅ OCR completed');
    console.log('📄 Extracted text length:', extractedText.length, 'characters');

    console.log('🔎 Parsing trade details...');
    const tradeDetails = parseTradeDetails(extractedText);

    await cleanupFiles(originalPath, processedPath);

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
          rawTextPreview: tradeDetails.rawText.substring(0, 500)
        }
      }
    });

  } catch (error) {
    console.error('❌ OCR Error:', error);

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

exports.healthCheck = async (req, res) => {
  try {
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
