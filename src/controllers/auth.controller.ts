
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private static cookie = 'prism_refresh';

  private static options() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/api/v1/auth'
    };
  }

  private static error(res: Response, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Invalid email or password' || message === 'Session expired' ? 401
      : message === 'Account inactive or unauthorized' ? 403
      : ['Invalid request', 'Invalid or expired reset link'].includes(message) ? 400 : 500;

    if (status === 500) console.error('Auth error:', error);
    res.status(status).json({ success: false, message: status === 500 ? 'Internal server error' : message });
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.cookie(AuthController.cookie, result.refreshToken, {
        ...AuthController.options(),
        ...(result.rememberMe ? { maxAge: 30 * 86400000 } : {})
      });
      res.json({ success: true, message: 'Login successful', data: { token: result.token, user: result.user } });
    } catch (error) { AuthController.error(res, error); }
  }

  static async me(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: res.locals.admin });
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      await AuthService.forgotPassword(req.body?.email);
      res.json({ success: true, message: 'If the email is registered, a reset link will be sent.' });
    } catch (error) { AuthController.error(res, error); }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      await AuthService.resetPassword(req.body);
      res.clearCookie(AuthController.cookie, AuthController.options());
      res.json({ success: true, message: 'Password updated successfully. Please login again.' });
    } catch (error) { AuthController.error(res, error); }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.refresh(req.cookies?.[AuthController.cookie]);
      res.cookie(AuthController.cookie, result.refreshToken, {
        ...AuthController.options(),
        ...(result.rememberMe ? { maxAge: result.remainingMs } : {})
      });
      res.json({ success: true, data: { token: result.token, user: result.user } });
    } catch (error) {
      res.clearCookie(AuthController.cookie, AuthController.options());
      AuthController.error(res, error);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      await AuthService.logout(req.cookies?.[AuthController.cookie]);
      res.clearCookie(AuthController.cookie, AuthController.options());
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) { AuthController.error(res, error); }
  }
}
