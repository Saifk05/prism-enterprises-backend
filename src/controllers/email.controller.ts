import { Request, Response } from 'express';
import { GmailService } from '../services/gmail.service';

export class EmailController {

  static async inbox(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit || 20);

      const data = await GmailService.getInbox(
        Number.isFinite(limit) ? limit : 20
      );

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Gmail inbox error:', error);

      res.status(502).json({
        success: false,
        message: 'Unable to fetch Gmail inbox'
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      const message = await GmailService.getMessage(id);

      res.status(200).json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Gmail message error:', error);

      res.status(502).json({
        success: false,
        message: 'Unable to fetch email'
      });
    }
  }

  static async sent(req: Request, res: Response): Promise<void> {
    try {
      const messages = await GmailService.getSent();

      res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Gmail sent error:', error);

      res.status(502).json({
        success: false,
        message: 'Unable to fetch sent emails'
      });
    }
  }

  static async unreadCount(
    _req: Request,
    res: Response
  ): Promise<void> {
    try {
      const count = await GmailService.getUnreadCount();

      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Gmail unread count error:', error);

      res.status(502).json({
        success: false,
        message: 'Unable to fetch unread count'
      });
    }
  }

  static async reply(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { message } = req.body;

      if (
        typeof message !== 'string' ||
        !message.trim() ||
        message.length > 20000
      ) {
        res.status(400).json({
          success: false,
          message: 'Reply must contain 1–20000 characters'
        });
        return;
      }

      const result = await GmailService.reply(id, message.trim());

      res.status(200).json({
        success: true,
        message: 'Reply sent successfully',
        data: result
      });
    } catch (error) {
      console.error('Gmail reply error:', error);

      res.status(502).json({
        success: false,
        message: 'Unable to send reply'
      });
    }
  }
}