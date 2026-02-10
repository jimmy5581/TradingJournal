const { spawn } = require('child_process');
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
  return new Promise((resolve, reject) => {
    // Use Python from PATH - will use activated environment if available
    const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
    
    const pythonScript = `
import sys
import os
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'
from paddleocr import PaddleOCR
import json

try:
    ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
    result = ocr.ocr('${imagePath.replace(/\\/g, '/')}', cls=True)
    
    if result and result[0]:
        text_lines = [line[1][0] for line in result[0]]
        print(json.dumps({'text': ' '.join(text_lines)}))
    else:
        print(json.dumps({'text': ''}))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    const python = spawn(pythonExecutable, ['-c', pythonScript]);
    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`PaddleOCR failed: ${errorOutput}`));
      } else {
        try {
          const result = JSON.parse(output);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result.text);
          }
        } catch (e) {
          reject(new Error(`Failed to parse OCR output: ${e.message}`));
        }
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}. Ensure Python and PaddleOCR are installed.`));
    });
  });
}

function parseTradeDetails(ocrText) {
  const extracted = {
    symbol: null,
    side: null,
    entryPrice: null,
    exitPrice: null,
    quantity: null,
    stopLoss: null,
    target: null,
    timestamp: null,
    rawText: ocrText
  };

  const text = ocrText.toUpperCase();
  const lines = text.split('\n');

  const sideMatch = text.match(/\b(BUY|SELL|LONG|SHORT|BOUGHT|SOLD)\b/i);
  if (sideMatch) {
    const side = sideMatch[1].toUpperCase();
    extracted.side = ['BOUGHT', 'LONG', 'BUY'].includes(side) ? 'LONG' : 
                     ['SOLD', 'SHORT', 'SELL'].includes(side) ? 'SHORT' : side;
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

  const stopLossPatterns = [
    /(?:STOP\s*LOSS|SL|STOPLOSS)\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/,
  ];

  for (const pattern of stopLossPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.stopLoss = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  const targetPatterns = [
    /(?:TARGET|TGT|TP)\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/,
  ];

  for (const pattern of targetPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.target = parseFloat(match[1].replace(/,/g, ''));
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
    } catch (error) {
      
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

    await preprocessImage(originalPath, processedPath);

    const extractedText = await extractTextFromImage(processedPath);
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
          quantity: tradeDetails.quantity,          stopLoss: tradeDetails.stopLoss,
          target: tradeDetails.target,          timestamp: tradeDetails.timestamp
        },
        metadata: {
          ocrTextLength: extractedText.length,
          fieldsExtracted: Object.values(tradeDetails).filter(v => v !== null && v !== extractedText).length,
          rawTextPreview: tradeDetails.rawText.substring(0, 500)
        }
      }
    });

  } catch (error) {

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
    // Quick health check - just verify PaddleOCR can be imported
    const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
    const testScript = `
import sys
import json
try:
    from paddleocr import PaddleOCR
    print(json.dumps({'status': 'operational'}))
except ImportError as e:
    print(json.dumps({'status': 'failed', 'error': str(e)}))
    sys.exit(1)
`;

    return new Promise((resolve, reject) => {
      const python = spawn(pythonExecutable, ['-c', testScript]);
      let output = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          res.status(503).json({
            success: false,
            error: 'PaddleOCR not available',
            details: 'Please install: pip install paddleocr paddlepaddle'
          });
        } else {
          res.json({
            success: true,
            message: 'OCR service is healthy',
            paddleocr: 'operational',
            sharp: 'operational'
          });
        }
        resolve();
      });

      python.on('error', (error) => {
        res.status(503).json({
          success: false,
          error: 'Python not available',
          details: error.message
        });
        resolve();
      });
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'OCR service unavailable',
      details: error.message
    });
  }
};
