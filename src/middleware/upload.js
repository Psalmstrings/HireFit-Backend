const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure local uploads directory exists for fallback
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage so we have buffer for text extraction & Cloudinary upload
const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain'
];

const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const isMimeValid = allowedMimeTypes.includes(file.mimetype);
  const isExtValid = allowedExtensions.includes(ext);

  if (isMimeValid && isExtValid) {
    return cb(null, true);
  }

  const err = new Error(
    `Unsupported file type '${ext}'. Please upload a valid PDF (.pdf) or Word document (.docx).`
  );
  err.code = 'INVALID_FILE_TYPE';
  cb(err, false);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max limit
  },
  fileFilter
});

module.exports = upload;
