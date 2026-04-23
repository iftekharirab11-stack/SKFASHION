// Image upload handler
const multer = require('multer');
const path = require('path');
const { supabase } = require('../config/supabase');

// Configure storage
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * Middleware to handle single image upload
 * @param {string} fieldName - Name of the form field
 */
const uploadImage = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
};

/**
 * Upload image to Supabase Storage
 * @param {Object} file - Multer file object
 * @param {string} folder - Storage folder path
 * @returns {Promise<string>} Public URL of uploaded image
 */
const uploadToSupabase = async (file, folder) => {
  try {
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase
      .storage
      .from('product-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

module.exports = { uploadImage, uploadToSupabase };