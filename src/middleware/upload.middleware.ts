import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 10;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

const storage = multer.memoryStorage();

export const uploadProductImages = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES
  },

  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new Error(
          'Invalid image format. Only JPEG, PNG and WebP images are allowed.'
        )
      );
      return;
    }

    callback(null, true);
  }
}).array('images', MAX_FILES);

export function handleProductImageUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  uploadProductImages(req, res, error => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        success: false,
        message:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Each image must be 5 MB or smaller.'
            : error.code === 'LIMIT_FILE_COUNT' ||
                error.code === 'LIMIT_UNEXPECTED_FILE'
              ? 'Maximum 10 images are allowed per upload.'
              : error.message
      });
      return;
    }

    if (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Image upload failed.'
      });
      return;
    }

    next();
  });
}