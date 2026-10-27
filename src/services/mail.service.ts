
import nodemailer from 'nodemailer';

export class MailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  static async sendPasswordReset(email: string, token: string): Promise<void> {
    const url = new URL('/reset-password', process.env.FRONTEND_URL || 'http://localhost:8100');
    url.searchParams.set('token', token);

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Prism Enterprises | Reset Password',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:550px;margin:auto;padding:24px">
          <h2 style="color:#174c82">Prism Enterprises</h2>
          <p>Hello,</p>
          <p>We received a request to reset your admin account password.</p>
          <p>
            <a href="${url.toString()}" style="background:#174c82;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;display:inline-block">
              Reset Password
            </a>
          </p>
          <p>This link expires in <strong>15 minutes</strong>.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr>
          <small>Prism Enterprises — Admin Portal</small>
        </div>
      `,
      text: `Reset your password using this link (valid for 15 minutes): ${url.toString()}`
    });
  }
}
