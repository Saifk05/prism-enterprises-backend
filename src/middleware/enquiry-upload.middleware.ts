import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_PDF_SIZE,
    files: 1,
    fields: 10,
    fieldSize: 64 * 1024
  },

  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== 'application/pdf') {
      callback(new Error('Only PDF documents are allowed.'));
      return;
    }

    callback(null, true);
  }
}).single('attachment');

export function handleEnquiryUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  upload(req, res, error => {
    if (error instanceof multer.MulterError) {
      let message = 'Invalid file upload.';

      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          message = 'PDF file must not exceed 10 MB.';
          break;

        case 'LIMIT_FILE_COUNT':
        case 'LIMIT_UNEXPECTED_FILE':
          message = 'Only one PDF attachment is allowed.';
          break;

        case 'LIMIT_FIELD_COUNT':
          message = 'Too many form fields.';
          break;

        case 'LIMIT_FIELD_VALUE':
          message = 'A form field is too large.';
          break;

        default:
          message = error.message;
      }

      res.status(400).json({
        success: false,
        message
      });
      return;
    }

    if (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Unable to upload attachment.'
      });
      return;
    }

    if (req.file) {
      const file = req.file;

      // Validate the PDF file signature (%PDF-).
      const hasValidSignature =
        file.buffer.length >= 5 &&
        file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';

      if (!hasValidSignature) {
        res.status(400).json({
          success: false,
          message: 'Invalid PDF document. File content is not a valid PDF.'
        });
        return;
      }
    }

    next();
  });
}