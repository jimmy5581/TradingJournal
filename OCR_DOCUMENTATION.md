# OCR Trade Scanner - Documentation

## Overview

Free, open-source OCR pipeline for extracting trade details from uploaded screenshots using:
- **Tesseract.js** - OCR text extraction
- **Sharp** - Image preprocessing
- **Multer** - File upload handling

## Architecture

```
User Upload → Validation → Preprocessing → OCR → Parsing → Cleanup → JSON Response
    ↓            ↓             ↓            ↓        ↓         ↓
  Image      Format/Size   Grayscale/   Tesseract  Regex   Delete    Extracted
  File       Check        Enhance                 Rules    Files     Fields
```

## API Endpoint

### POST /api/ocr/scan

**Description**: Upload a trade screenshot and extract trade details

**Request**:
```http
POST /api/ocr/scan
Content-Type: multipart/form-data

Field name: screenshot
Accepted formats: PNG, JPEG, JPG, WEBP
Max size: 10MB
```

**Response**:
```json
{
  "success": true,
  "message": "OCR completed successfully",
  "data": {
    "extracted": {
      "symbol": "RELIANCE",
      "side": "LONG",
      "entryPrice": 2450.50,
      "exitPrice": 2475.00,
      "quantity": 100,
      "timestamp": "07/02/2026 10:30:00"
    },
    "metadata": {
      "ocrTextLength": 1245,
      "fieldsExtracted": 6,
      "rawTextPreview": "NSE: RELIANCE\nBUY ORDER\nQty: 100..."
    }
  }
}
```

## OCR Processing Flow

### 1. Image Preprocessing (Sharp)
- Convert to PNG format
- Resize to max 2000x2000px (maintains aspect ratio)
- Convert to grayscale
- Normalize contrast
- Sharpen text edges

### 2. OCR Extraction (Tesseract.js)
- Extract raw text from preprocessed image
- Uses English language model
- Returns text with confidence scores

### 3. Field Parsing (Regex-based)
Deterministic parsing - NO AI inference:

**Symbol Patterns**:
- `NSE:RELIANCE`, `BSE:TATASTEEL`
- `NIFTY`, `BANKNIFTY`, `FINNIFTY`
- `Symbol: RELIANCE`

**Side Patterns**:
- `BUY`, `SELL`, `LONG`, `SHORT`
- `BOUGHT`, `SOLD`

**Quantity Patterns**:
- `Qty: 100`
- `Quantity: 50`
- `Lot Size: 25`
- `100 Shares`

**Price Patterns**:
- `Entry Price: ₹2450.50`
- `Buy Price: 2450.50`
- `₹2450.50`

**Timestamp Patterns**:
- `07/02/2026 10:30:00`
- `2026-02-07 10:30:00`
- Multiple date/time formats

### 4. Auto-Cleanup
- Original uploaded file deleted
- Preprocessed image deleted
- No persistent storage

## Example OCR Input/Output

### Example Screenshot Text (OCR Output):
```
NSE CONTRACT NOTE
Symbol: RELIANCE
Buy Order
Qty: 100 Shares
Price: ₹2,450.50
Date: 07/02/2026 10:30:15 IST
Order Type: MARKET
Product: INTRADAY
```

### Parsed Output:
```json
{
  "symbol": "RELIANCE",
  "side": "LONG",
  "entryPrice": 2450.50,
  "exitPrice": null,
  "quantity": 100,
  "timestamp": "07/02/2026 10:30:15"
}
```

## Testing with cURL

```bash
# Upload a trade screenshot
curl -X POST http://localhost:5000/api/ocr/scan \
  -F "screenshot=@/path/to/trade-screenshot.png"
```

## Testing with JavaScript (Frontend)

```javascript
// Example: Upload from file input
async function scanTradeScreenshot(file) {
  const formData = new FormData();
  formData.append('screenshot', file);

  try {
    const response = await fetch('http://localhost:5000/api/ocr/scan', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Extracted data:', result.data.extracted);
      // Populate form fields with extracted data
      document.getElementById('symbol').value = result.data.extracted.symbol || '';
      document.getElementById('side').value = result.data.extracted.side || '';
      document.getElementById('entryPrice').value = result.data.extracted.entryPrice || '';
      // ... etc
    }
  } catch (error) {
    console.error('OCR failed:', error);
  }
}

// Use with file input
document.getElementById('chartScreenshot').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    scanTradeScreenshot(file);
  }
});
```

## Health Check

```bash
# Check if OCR service is operational
curl http://localhost:5000/api/ocr/health
```

Response:
```json
{
  "success": true,
  "message": "OCR service is healthy",
  "tesseract": "operational",
  "sharp": "operational"
}
```

## Error Handling

### Invalid File Type
```json
{
  "success": false,
  "error": "Invalid file format. Allowed: PNG, JPEG, JPG, WEBP"
}
```

### File Too Large
```json
{
  "success": false,
  "error": "File too large. Maximum size: 10MB"
}
```

### OCR Processing Failed
```json
{
  "success": false,
  "error": "OCR processing failed",
  "details": "Image preprocessing failed: ..."
}
```

## Fields Extraction Rules

**STRICT POLICY**:
- ✅ Extract only what's visible in the image
- ❌ NO guessing or inference
- ❌ NO enrichment from external sources
- ❌ NO auto-save to database
- Missing fields return `null`
- Client decides what to do with extracted data

## Performance Notes

- **Average processing time**: 3-8 seconds
- **Depends on**:
  - Image size
  - Image quality
  - Text clarity
  - System resources

## Limitations

1. **OCR Accuracy**: Depends on image quality
2. **Language**: English only (can be extended)
3. **Format Recognition**: Works best with standard broker screenshots
4. **No AI**: Purely rule-based parsing
5. **Internet**: Tesseract.js may download language files on first use

## Extending Pattern Recognition

To support more broker formats, edit `ocrController.js`:

```javascript
// Add new patterns in parseTradeDetails()
const symbolPatterns = [
  /YOUR_NEW_PATTERN/,
  // ... existing patterns
];
```

## Security Considerations

- ✅ File type validation
- ✅ File size limits
- ✅ Temporary storage only
- ✅ Auto-cleanup after processing
- ✅ No persistent file storage
- ⚠️ Consider rate limiting for production
- ⚠️ Consider virus scanning for production

## Production Recommendations

1. Add rate limiting (e.g., express-rate-limit)
2. Add virus scanning (e.g., clamav)
3. Implement request queuing for concurrent uploads
4. Add comprehensive logging
5. Monitor OCR performance
6. Cache Tesseract language models
7. Add user authentication

## Dependencies

```json
{
  "tesseract.js": "^5.0.0",
  "sharp": "^0.33.0",
  "multer": "^1.4.5-lts.1"
}
```

All dependencies are free and open-source.
