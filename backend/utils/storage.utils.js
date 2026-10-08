const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { UPLOADS_DIR, generateUniquePdfName, safeDeleteFile, isPdfMagicBytes } = require('./file.utils');

let vercelBlob = null;
try {
  vercelBlob = require('@vercel/blob');
} catch (e) {
  // @vercel/blob not available
}

/**
 * Checks whether Vercel Blob private storage is active
 */
function isVercelBlobActive() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN && vercelBlob);
}

/**
 * Validates PDF magic bytes from a Buffer
 * @param {Buffer} buffer 
 * @returns {boolean}
 */
function isPdfBufferValid(buffer) {
  if (!buffer || buffer.length < 4) return false;
  const header = buffer.subarray(0, 4).toString('utf8');
  return header === '%PDF';
}

/**
 * Saves an uploaded Aadhaar PDF document.
 * - In production on Vercel (with BLOB_READ_WRITE_TOKEN): Stores in PRIVATE Vercel Blob.
 * - In local development: Stores in local backend/uploads/aadhaar/ directory.
 * 
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original uploaded filename
 * @returns {Promise<{ filename: string, isBlob: boolean }>}
 */
async function saveAadhaarDocument(buffer, originalName = 'aadhaar.pdf') {
  const uniqueName = generateUniquePdfName();

  if (isVercelBlobActive()) {
    try {
      const blob = await vercelBlob.put(`aadhaar/${uniqueName}`, buffer, {
        access: 'private',
        contentType: 'application/pdf',
        addRandomSuffix: false
      });
      return {
        filename: blob.url || `aadhaar/${uniqueName}`,
        isBlob: true
      };
    } catch (err) {
      console.error('[STORAGE] Error uploading to private Vercel Blob:', err.message);
      throw new Error('Failed to upload Aadhaar document to secure storage.');
    }
  }

  // Fallback to local filesystem storage
  const localPath = path.join(UPLOADS_DIR, uniqueName);
  fs.writeFileSync(localPath, buffer);
  return {
    filename: uniqueName,
    isBlob: false
  };
}

/**
 * Securely streams an Aadhaar PDF document to an Express response.
 * Handles both private Vercel Blob and local filesystem storage.
 * 
 * @param {string} fileRef - File reference (URL, pathname, or local filename)
 * @param {import('express').Response} res - Express response object
 * @param {string} downloadName - Download filename
 */
async function streamAadhaarDocument(fileRef, res, downloadName = 'aadhaar.pdf') {
  if (!fileRef) {
    return res.status(404).json({
      success: false,
      message: 'No Aadhaar document found.'
    });
  }

  // Check if it's a Vercel Blob URL or pathname
  const isBlobRef = fileRef.startsWith('http') || fileRef.startsWith('aadhaar/');
  if (isBlobRef && isVercelBlobActive()) {
    try {
      const blobResult = await vercelBlob.get(fileRef, { access: 'private' });
      if (!blobResult || !blobResult.stream) {
        return res.status(404).json({
          success: false,
          message: 'Aadhaar document not found in private storage.'
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
      if (blobResult.blob && blobResult.blob.size) {
        res.setHeader('Content-Length', blobResult.blob.size);
      }

      const nodeStream = Readable.fromWeb(blobResult.stream);
      return nodeStream.pipe(res);
    } catch (err) {
      console.error('[STORAGE] Error retrieving private Vercel Blob:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving Aadhaar document from secure storage.'
      });
    }
  }

  // Local filesystem fallback
  const localFileName = path.basename(fileRef);
  const localPath = path.join(UPLOADS_DIR, localFileName);

  if (!fs.existsSync(localPath)) {
    return res.status(404).json({
      success: false,
      message: 'Aadhaar document file not found on server.'
    });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
  return res.sendFile(localPath);
}

/**
 * Safely deletes an Aadhaar document from storage.
 * @param {string} fileRef
 */
async function deleteAadhaarDocument(fileRef) {
  if (!fileRef) return;

  const isBlobRef = fileRef.startsWith('http') || fileRef.startsWith('aadhaar/');
  if (isBlobRef && isVercelBlobActive()) {
    try {
      await vercelBlob.del(fileRef);
    } catch (err) {
      console.error('[STORAGE] Error deleting private Vercel Blob:', err.message);
    }
    return;
  }

  // Local file deletion
  safeDeleteFile(fileRef);
}

module.exports = {
  isVercelBlobActive,
  isPdfBufferValid,
  saveAadhaarDocument,
  streamAadhaarDocument,
  deleteAadhaarDocument
};
