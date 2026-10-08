const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.resolve(__dirname, '../uploads/aadhaar');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Checks if the file contains the PDF magic bytes signature (%PDF-)
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function isPdfMagicBytes(filePath) {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(filePath)) {
        return resolve(false);
      }
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(5);
      const bytesRead = fs.readSync(fd, buffer, 0, 5, 0);
      fs.closeSync(fd);

      if (bytesRead < 4) {
        return resolve(false);
      }

      // Check for %PDF-
      const header = buffer.toString('utf8', 0, 4);
      resolve(header === '%PDF');
    } catch (err) {
      console.error('Error verifying PDF magic bytes:', err.message);
      resolve(false);
    }
  });
}

/**
 * Safely removes a file from disk if it exists
 * @param {string} relativeOrFullPath
 */
function safeDeleteFile(relativeOrFullPath) {
  if (!relativeOrFullPath) return;
  try {
    const fullPath = path.isAbsolute(relativeOrFullPath)
      ? relativeOrFullPath
      : path.join(UPLOADS_DIR, path.basename(relativeOrFullPath));

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('Error safely deleting file:', err.message);
  }
}

/**
 * Generates a collision-resistant unique filename
 * @returns {string}
 */
function generateUniquePdfName() {
  const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  return `${Date.now()}-${uuid}.pdf`;
}

module.exports = {
  UPLOADS_DIR,
  isPdfMagicBytes,
  safeDeleteFile,
  generateUniquePdfName
};
