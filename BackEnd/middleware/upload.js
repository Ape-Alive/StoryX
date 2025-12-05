const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure upload directory exists
if (!fs.existsSync(config.upload.path)) {
  fs.mkdirSync(config.upload.path, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.path);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: ' + config.upload.allowedTypes.join(', ')), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxSize,
  },
  fileFilter,
});

module.exports = upload;

