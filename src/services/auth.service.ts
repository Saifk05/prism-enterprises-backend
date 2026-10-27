
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { AppDataSource } from '../config/database';
import { Role } from '../models/role.model';
import { MailService } from './mail.service';

export class AuthService {
  private static repo = () => AppDataSource.getRepository(Role);
  private static hash = (value: string) => createHash('sha256').update(value).digest('hex');
  private static generate = () => randomBytes(32).toString('hex');
  private static user = (a: Role) => ({ id: a.id, email: a.email, role: a.role, isActive: a.isActive });

  private static token(account: Role): string {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing');
    return jwt.sign({ role: account.role }, process.env.JWT_SECRET, {
      subject: account.id, expiresIn: '15m', algorithm: 'HS256'
    });
  }

  static async login(data: any) {
    const { email, password, rememberMe = false } = data ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || typeof rememberMe !== 'boolean')
      throw new Error('Invalid request');

    const account = await this.repo().findOneBy({ email: email.trim().toLowerCase() });
    if (!account || !(await bcrypt.compare(password, account.passwordHash)))
      throw new Error('Invalid email or password');
    if (!account.isActive || account.role !== 'ADMIN')
      throw new Error('Account inactive or unauthorized');

    const refreshToken = this.generate();
    account.refreshTokenHash = this.hash(refreshToken);
    account.refreshTokenExpiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 86400000);
    account.rememberMe = rememberMe;
    await this.repo().save(account);

    return { token: this.token(account), refreshToken, rememberMe, user: this.user(account) };
  }

  static async forgotPassword(email: unknown): Promise<void> {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      throw new Error('Invalid request');

    const account = await this.repo().findOneBy({ email: email.trim().toLowerCase(), isActive: true, role: 'ADMIN' });
    if (!account) return;

    const token = this.generate();
    account.resetTokenHash = this.hash(token);
    account.resetTokenExpiresAt = new Date(Date.now() + 15 * 60000);
    await this.repo().save(account);
    await MailService.sendPasswordReset(account.email, token);
  }

  static async resetPassword(data: any): Promise<void> {
    const { token, password } = data ?? {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72)
      throw new Error('Invalid request');

    const hash = this.hash(token);
    const account = await this.repo().createQueryBuilder('r')
      .where('r.reset_token_hash = :hash AND r.reset_token_expires_at > NOW()', { hash })
      .andWhere('r.is_active = true AND r.role = :role', { role: 'ADMIN' }).getOne();

    if (!account) throw new Error('Invalid or expired reset link');

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await this.repo().createQueryBuilder().update(Role).set({
      passwordHash, resetTokenHash: null, resetTokenExpiresAt: null,
      refreshTokenHash: null, refreshTokenExpiresAt: null, rememberMe: false
    }).where('id = :id AND reset_token_hash = :hash AND reset_token_expires_at > NOW()', {
      id: account.id, hash
    }).execute();

    if (!result.affected) throw new Error('Invalid or expired reset link');
  }

  static async refresh(value: unknown) {
    if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error('Session expired');

    const hash = this.hash(value);
    const account = await this.repo().createQueryBuilder('r')
      .where('r.refresh_token_hash = :hash AND r.refresh_token_expires_at > NOW()', { hash })
      .andWhere('r.is_active = true AND r.role = :role', { role: 'ADMIN' }).getOne();

    if (!account) throw new Error('Session expired');

    const refreshToken = this.generate();
    const updated = await this.repo().createQueryBuilder().update(Role)
      .set({ refreshTokenHash: this.hash(refreshToken) })
      .where('id = :id AND refresh_token_hash = :hash AND refresh_token_expires_at > NOW()', {
        id: account.id, hash
      }).execute();

    if (!updated.affected) throw new Error('Session expired');

    return {
      token: this.token(account), refreshToken, user: this.user(account),
      rememberMe: account.rememberMe,
      remainingMs: Math.max(0, account.refreshTokenExpiresAt!.getTime() - Date.now())
    };
  }

  static async logout(value: unknown): Promise<void> {
    if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return;

    await this.repo().createQueryBuilder().update(Role).set({
      refreshTokenHash: null, refreshTokenExpiresAt: null, rememberMe: false
    }).where('refresh_token_hash = :hash', { hash: this.hash(value) }).execute();
  }
}
