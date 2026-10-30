import { google } from 'googleapis';

export class GmailService {
  private static getClient() {
    const {
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN,
      GMAIL_ACCOUNT
    } = process.env;

    if (
      !GOOGLE_CLIENT_ID ||
      !GOOGLE_CLIENT_SECRET ||
      !GOOGLE_REFRESH_TOKEN ||
      !GMAIL_ACCOUNT
    ) {
      throw new Error('Gmail OAuth configuration is incomplete');
    }

    const auth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    auth.setCredentials({
      refresh_token: GOOGLE_REFRESH_TOKEN
    });

    return google.gmail({
      version: 'v1',
      auth
    });
  }

  private static getHeader(
    headers: Array<{ name?: string | null; value?: string | null }> = [],
    name: string
  ): string {
    return (
      headers.find(
        header => header.name?.toLowerCase() === name.toLowerCase()
      )?.value || ''
    );
  }

  private static decodeBase64Url(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
  }

  private static extractText(payload: any): string {
    if (!payload) return '';

    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return this.decodeBase64Url(payload.body.data);
    }

    for (const part of payload.parts || []) {
      const text = this.extractText(part);
      if (text) return text;
    }

    if (payload.body?.data) {
      return this.decodeBase64Url(payload.body.data);
    }

    return '';
  }

  static async getInbox(maxResults = 20) {
    const gmail = this.getClient();

    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: Math.min(Math.max(maxResults, 1), 100)
    });

    const messages = response.data.messages || [];

    const results = await Promise.all(
      messages.map(async message => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });

        const headers = detail.data.payload?.headers || [];

        return {
          id: detail.data.id,
          threadId: detail.data.threadId,
          from: this.getHeader(headers, 'From'),
          subject: this.getHeader(headers, 'Subject'),
          date: this.getHeader(headers, 'Date'),
          snippet: detail.data.snippet || '',
          unread: detail.data.labelIds?.includes('UNREAD') || false
        };
      })
    );

    return {
      messages: results,
      nextPageToken: response.data.nextPageToken || null
    };
  }

  static async getMessage(id: string) {
    const gmail = this.getClient();

    const response = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full'
    });

    const message = response.data;
    const headers = message.payload?.headers || [];

    return {
      id: message.id,
      threadId: message.threadId,
      from: this.getHeader(headers, 'From'),
      replyTo: this.getHeader(headers, 'Reply-To'),
      to: this.getHeader(headers, 'To'),
      subject: this.getHeader(headers, 'Subject'),
      date: this.getHeader(headers, 'Date'),
      messageId: this.getHeader(headers, 'Message-ID'),
      references: this.getHeader(headers, 'References'),
      body: this.extractText(message.payload),
      snippet: message.snippet || '',
      unread: message.labelIds?.includes('UNREAD') || false
    };
  }

  static async getSent(maxResults = 20) {
    const gmail = this.getClient();

    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['SENT'],
      maxResults: Math.min(Math.max(maxResults, 1), 100)
    });

    const messages = response.data.messages || [];

    return Promise.all(
      messages.map(async message => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['To', 'Subject', 'Date']
        });

        const headers = detail.data.payload?.headers || [];

        return {
          id: detail.data.id,
          threadId: detail.data.threadId,
          to: this.getHeader(headers, 'To'),
          subject: this.getHeader(headers, 'Subject'),
          date: this.getHeader(headers, 'Date'),
          snippet: detail.data.snippet || ''
        };
      })
    );
  }

  static async getUnreadCount() {
    const gmail = this.getClient();

    const response = await gmail.users.labels.get({
      userId: 'me',
      id: 'INBOX'
    });

    return response.data.messagesUnread || 0;
  }

  static async reply(messageId: string, replyText: string) {
    const gmail = this.getClient();

    const original = await this.getMessage(messageId);

    const rawRecipient = original.replyTo || original.from;

    const emailMatch =
      rawRecipient.match(/<([^<>]+)>/) ||
      rawRecipient.match(/([^\s<>]+@[^\s<>]+)/);

    const recipient = emailMatch?.[1];

    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      throw new Error('Cannot determine a valid reply address');
    }

    const account = process.env.GMAIL_ACCOUNT;

    if (!account) {
      throw new Error('GMAIL_ACCOUNT is missing');
    }

    const subject = /^Re:/i.test(original.subject)
      ? original.subject
      : `Re: ${original.subject || 'Your Enquiry'}`;

    // Encode the subject safely, including non-ASCII characters.
    const encodedSubject =
      `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

    const safeReply = replyText
      .replace(/\r?\n/g, '\r\n')
      .replace(/^\./gm, '..');

    const headers = [
      `From: ${account}`,
      `To: ${recipient}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64'
    ];

    if (original.messageId) {
      headers.push(`In-Reply-To: ${original.messageId}`);

      const references = [
        original.references,
        original.messageId
      ].filter(Boolean).join(' ');

      headers.push(`References: ${references}`);
    }

    const mimeMessage = [
      ...headers,
      '',
      Buffer.from(safeReply, 'utf8').toString('base64')
    ].join('\r\n');

    const raw = Buffer.from(mimeMessage).toString('base64url');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        threadId: original.threadId || undefined
      }
    });

    return {
      id: response.data.id,
      threadId: response.data.threadId,
      to: recipient,
      subject
    };
  }
}