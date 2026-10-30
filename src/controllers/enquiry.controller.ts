import { Request, Response } from 'express';
import { z } from 'zod';
import { EnquiryService } from '../services/enquiry.service';
import { EnquiryStatus } from '../models/enquiry.model';

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  companyName: z.string().trim().max(200).optional(),
  email: z.email().max(255),
  phone: z.string().trim().min(7).max(20),
  requirement: z.string().trim().min(2).max(200),
  projectDetails: z.string().trim().min(10).max(10000)
}).strict();

const idSchema = z.uuid();

const statusSchema = z.object({
  status: z.enum(EnquiryStatus)
}).strict();

const notesSchema = z.object({
  adminNotes: z.string().max(10000).nullable()
}).strict();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(200).optional(),
  status: z.enum(EnquiryStatus).optional()
});

export class EnquiryController {

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid enquiry details',
          errors: z.flattenError(parsed.error).fieldErrors
        });
        return;
      }

      const file = req.file;

      const enquiry = await EnquiryService.create(parsed.data, file);

      res.status(201).json({
        success: true,
        message: 'Your enquiry has been submitted successfully.',
        data: {
          id: enquiry.id,
          enquiryNumber: enquiry.enquiryNumber
        }
      });
    } catch (error) {
      console.error('Create enquiry error:', error);

      res.status(500).json({
        success: false,
        message: 'Unable to submit enquiry. Please try again.'
      });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const parsed = listSchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid enquiry filters'
        });
        return;
      }

      const result = await EnquiryService.list(parsed.data);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('List enquiries error:', error);

      res.status(500).json({
        success: false,
        message: 'Unable to load enquiries'
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const parsed = idSchema.safeParse(req.params.id);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid enquiry ID'
        });
        return;
      }

      const enquiry = await EnquiryService.getById(parsed.data);

      if (!enquiry) {
        res.status(404).json({
          success: false,
          message: 'Enquiry not found'
        });
        return;
      }

      res.json({
        success: true,
        data: enquiry
      });
    } catch (error) {
      console.error('Get enquiry error:', error);

      res.status(500).json({
        success: false,
        message: 'Unable to load enquiry'
      });
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = idSchema.safeParse(req.params.id);
      const body = statusSchema.safeParse(req.body);

      if (!id.success || !body.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid enquiry ID or status'
        });
        return;
      }

      const enquiry = await EnquiryService.updateStatus(
        id.data,
        body.data.status
      );

      if (!enquiry) {
        res.status(404).json({
          success: false,
          message: 'Enquiry not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Enquiry status updated successfully',
        data: enquiry
      });
    } catch (error) {
      console.error('Update enquiry status error:', error);

      res.status(500).json({
        success: false,
        message: 'Unable to update enquiry status'
      });
    }
  }

  static async updateNotes(req: Request, res: Response): Promise<void> {
    try {
      const id = idSchema.safeParse(req.params.id);
      const body = notesSchema.safeParse(req.body);

      if (!id.success || !body.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid enquiry ID or notes'
        });
        return;
      }

      const enquiry = await EnquiryService.updateNotes(
        id.data,
        body.data.adminNotes
      );

      if (!enquiry) {
        res.status(404).json({
          success: false,
          message: 'Enquiry not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Admin notes updated successfully',
        data: enquiry
      });
    } catch (error) {
      console.error('Update enquiry notes error:', error);

      res.status(500).json({
        success: false,
        message: 'Unable to update admin notes'
      });
    }
  }

  static async getAttachment(req: Request, res: Response): Promise<void> {
    try {
      const parsed = idSchema.safeParse(req.params.id);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid enquiry ID'
        });
        return;
      }

      const enquiry = await EnquiryService.getById(parsed.data);

      if (!enquiry) {
        res.status(404).json({
          success: false,
          message: 'Enquiry not found'
        });
        return;
      }

      if (!enquiry.attachmentPath) {
        res.status(404).json({
          success: false,
          message: 'No attachment available'
        });
        return;
      }

      const url = await EnquiryService.getAttachmentSignedUrl(parsed.data);

      if (!url) {
        res.status(404).json({
          success: false,
          message: 'Attachment not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          url,
          expiresIn: 60
        }
      });
    } catch (error) {
      console.error('Get enquiry attachment error:', error);

      res.status(500).json({
        success: false,
        message: 'Unable to access attachment'
      });
    }
  }

  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await EnquiryService.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Enquiry statistics error:', error);

      res.status(500).json({
        success: false,
        message: 'Unable to load enquiry statistics'
      });
    }
  }
}