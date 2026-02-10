const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer configuration for avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.userId}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// GET /api/account - Fetch logged-in user account details
exports.getAccount = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
        twoFactorEnabled: user.twoFactorEnabled || false,
        role: user.role || 'Trader',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account details'
    });
  }
};


exports.updateAccount = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let emailChanged = false;

    // Check if email is being changed
    if (email && email !== user.email) {
      // Validate email format
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Check for duplicate email
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }

      user.email = email.toLowerCase();
      emailChanged = true;
    }

    // Update other fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Account updated successfully',
      emailChanged,
      data: {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        phone: user.phone || ''
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update account'
    });
  }
};


exports.toggle2FA = async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enabled field must be a boolean'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.twoFactorEnabled = enabled;
    await user.save();

    res.json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
      data: {
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update 2FA settings'
    });
  }
};

// POST /api/account/avatar - Upload and store profile picture
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old avatar if exists
    if (user.avatarUrl) {
      const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.avatarUrl));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatarUrl = avatarUrl;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatarUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar'
    });
  }
};

exports.uploadMiddleware = upload.single('avatar');
