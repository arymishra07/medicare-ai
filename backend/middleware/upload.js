const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { ALLOWED_REPORT_MIME_TYPES } = require('../config/constants');
const ApiError = require('../utils/apiError');

const uploadDir = path.resolve(
  __dirname,
  '..',
  process.env.UPLOAD_DIR || 'uploads'
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const extensionByMime = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const extension = extensionByMime[file.mimetype] || path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_REPORT_MIME_TYPES.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Only PDF, JPG or PNG files are allowed'));
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
    return cb(ApiError.badRequest('The file extension does not match an allowed file type'));
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 1,
  },
});

const uploadReport = upload.single('file');

module.exports = {
  uploadReport,
  uploadDir,
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
};
