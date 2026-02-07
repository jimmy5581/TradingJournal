const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ocrController = require('../controllers/ocrController');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/temp');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for file uploads
// Store temporarily with unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `trade-screenshot-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPEG, JPG, and WEBP are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * POST /api/ocr/scan
 * Upload trade screenshot and extract data using OCR
 * 
 * Request:
 * - Content-Type: multipart/form-data
 * - Field name: "screenshot"
 * - Accepted formats: PNG, JPEG, JPG, WEBP
 * - Max size: 10MB
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     extracted: {
 *       symbol: "RELIANCE" | null,
 *       side: "LONG" | "SHORT" | null,
 *       entryPrice: 2450.50 | null,
 *       exitPrice: 2475.00 | null,
 *       quantity: 100 | null,
 *       timestamp: "07/02/2026 10:30:00" | null
 *     },
 *     metadata: {
 *       ocrTextLength: 1245,
 *       fieldsExtracted: 4,
 *       rawTextPreview: "..."
 *     }
 *   }
 * }
 */
router.post('/scan', upload.single('screenshot'), ocrController.scanTrade);

/**
 * GET /api/ocr/health
 * Check if OCR service is operational
 */
router.get('/health', ocrController.healthCheck);

module.exports = router;
