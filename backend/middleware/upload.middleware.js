const multer = require('multer');
const path = require('path');
const { UPLOADS_DIR, generateUniquePdfName, isPdfMagicBytes, safeDeleteFile } = require('../utils/file.utils');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniquePdfName();
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  // Strictly allow only .pdf extension and application/pdf MIME type
  if (ext !== '.pdf' || (mime !== 'application/pdf' && mime !== 'application/x-pdf')) {
    const error = new Error('Invalid file format. Only PDF files are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  }
});

/**
 * Middleware wrapper to handle multer errors gracefully
 * and verify PDF signature / magic bytes.
 */
function handleAadhaarUpload(fieldName = 'aadhaar', isRequired = true) {
  const multerSingle = upload.single(fieldName);

  return (req, res, next) => {
    multerSingle(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds maximum limit of 5 MB.'
          });
        }
        if (err.code === 'INVALID_FILE_TYPE' || err.message.includes('Only PDF')) {
          return res.status(400).json({
            success: false,
            message: 'Invalid file format. Only PDF files are allowed.'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'Error uploading file.'
        });
      }

      if (isRequired && !req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aadhaar PDF document is mandatory.'
        });
      }

      // If file was uploaded, verify magic bytes
      if (req.file) {
        const isPdfValid = await isPdfMagicBytes(req.file.path);
        if (!isPdfValid) {
          safeDeleteFile(req.file.path);
          delete req.file;
          return res.status(400).json({
            success: false,
            message: 'Invalid PDF file. The uploaded file is corrupted or not a genuine PDF document.'
          });
        }
      }

      next();
    });
  };
}

module.exports = {
  handleAadhaarUpload
};
