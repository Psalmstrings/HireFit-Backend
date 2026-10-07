const fs = require('fs');
const path = require('path');
const { cloudinary, isCloudinaryConfigured } = require('../../config/cloudinary');

const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Upload a document to Cloudinary, or fallback to local disk storage
 * @param {Buffer} fileBuffer
 * @param {string} originalname
 * @param {string} mimetype
 * @returns {Promise<{ url: string, publicId: string, storageType: 'cloudinary' | 'local' }>}
 */
const uploadDocument = async (fileBuffer, originalname, mimetype) => {
  const sanitizedName = originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const fileName = `${uniquePrefix}_${sanitizedName}`;

  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'hirefit_cvs',
          public_id: fileName
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            // Fallback to local on Cloudinary network error
            saveToLocalDisk(fileBuffer, fileName)
              .then(resolve)
              .catch(reject);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              storageType: 'cloudinary'
            });
          }
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  // Local storage fallback
  return await saveToLocalDisk(fileBuffer, fileName);
};

const saveToLocalDisk = async (fileBuffer, fileName) => {
  const filePath = path.join(uploadDir, fileName);
  await fs.promises.writeFile(filePath, fileBuffer);
  return {
    url: `/uploads/${fileName}`,
    publicId: fileName,
    storageType: 'local'
  };
};

/**
 * Delete a document from Cloudinary or local disk
 * @param {string} publicId
 * @param {'cloudinary' | 'local'} storageType
 */
const deleteDocument = async (publicId, storageType = 'local') => {
  if (!publicId) return;

  try {
    if (storageType === 'cloudinary' && isCloudinaryConfigured()) {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      console.log(`Cloudinary asset deleted: ${publicId}`);
    } else {
      const filePath = path.join(uploadDir, publicId);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`Local file deleted: ${filePath}`);
      }
    }
  } catch (err) {
    console.warn(`Failed to delete document asset (${publicId}):`, err.message);
  }
};

module.exports = { uploadDocument, deleteDocument };
