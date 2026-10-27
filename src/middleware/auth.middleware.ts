
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { Role } from '../models/role.model';

export class AuthMiddleware {
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      if (!token) { res.status(401).json({ success: false, message: 'Authentication required' }); return; }

      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET is missing');

      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
      if (typeof decoded === 'string' || !decoded.sub) {
        res.status(401).json({ success: false, message: 'Invalid token' }); return;
      }

      const account = await AppDataSource.getRepository(Role).findOneBy({ id: decoded.sub });
      if (!account || !account.isActive || account.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: 'Account inactive or unauthorized' }); return;
      }

      res.locals.admin = { id: account.id, email: account.email, role: account.role, isActive: account.isActive };
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ success: false, message: 'Invalid or expired token' }); return;
      }
      console.error('Authentication error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
