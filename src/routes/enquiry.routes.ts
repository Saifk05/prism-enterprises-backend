import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { EnquiryController } from '../controllers/enquiry.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { handleEnquiryUpload } from '../middleware/enquiry-upload.middleware';

const router = Router();

/**
 * Public enquiry submission rate limiter
 * Maximum 5 requests per IP address every 15 minutes.
 */
const enquiryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many enquiry submissions. Please try again after 15 minutes.'
  }
});

/**
 * PUBLIC ROUTE
 * POST /api/v1/enquiries
 *
 * Content-Type: multipart/form-data
 *
 * Fields:
 * - fullName
 * - companyName (optional)
 * - email
 * - phone
 * - requirement
 * - projectDetails
 * - attachment (optional PDF, max 10 MB)
 */
router.post(
  '/enquiries',
  enquiryRateLimiter,
  handleEnquiryUpload,
  EnquiryController.create
);

/**
 * ADMIN ROUTES
 * All routes below require authentication.
 */
router.use('/admin/enquiries', AuthMiddleware.authenticate);

/**
 * GET /api/v1/admin/enquiries
 * List enquiries with pagination, search and status filters.
 */
router.get(
  '/admin/enquiries',
  EnquiryController.list
);

/**
 * GET /api/v1/admin/enquiries/stats
 * Dashboard statistics.
 *
 * IMPORTANT:
 * This route must appear before /:id.
 */
router.get(
  '/admin/enquiries/stats',
  EnquiryController.getStats
);

/**
 * GET /api/v1/admin/enquiries/:id
 * View an individual enquiry.
 */
router.get(
  '/admin/enquiries/:id',
  EnquiryController.getById
);

/**
 * PATCH /api/v1/admin/enquiries/:id/status
 * Update enquiry status.
 */
router.patch(
  '/admin/enquiries/:id/status',
  EnquiryController.updateStatus
);

/**
 * PATCH /api/v1/admin/enquiries/:id/notes
 * Update internal admin notes.
 */
router.patch(
  '/admin/enquiries/:id/notes',
  EnquiryController.updateNotes
);

/**
 * GET /api/v1/admin/enquiries/:id/attachment
 * Generate a temporary signed URL for the PDF.
 */
router.get(
  '/admin/enquiries/:id/attachment',
  EnquiryController.getAttachment
);

export default router;