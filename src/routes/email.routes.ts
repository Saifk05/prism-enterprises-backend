import { Router } from 'express';

import { EmailController } from '../controllers/email.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All email routes require an authenticated admin.
router.use('/admin/emails', AuthMiddleware.authenticate);

// Inbox
router.get('/admin/emails', EmailController.inbox);

// Sent emails
router.get('/admin/emails/sent', EmailController.sent);

// Unread count
router.get(
  '/admin/emails/unread-count',
  EmailController.unreadCount
);

// Read individual email
router.get(
  '/admin/emails/:id',
  EmailController.getById
);

// Reply to an email
router.post(
  '/admin/emails/:id/reply',
  EmailController.reply
);

export default router;