const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// 确保上传目录存在
const uploadPath = config.upload.path;
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'novel-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// 文件过滤器 - 允许小说文件类型
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'text/plain',           // .txt
    'application/epub+zip', // .epub
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword',   // .doc
  ];

  const allowedExtensions = ['.txt', '.epub', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

// 配置 multer - 小说文件上传（最大50MB）
const novelUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter,
});

module.exports = novelUpload;

