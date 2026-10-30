import { randomUUID } from 'crypto';
import { AppDataSource } from '../config/database';
import { supabase } from '../config/supabase';
import { Enquiry, EnquiryStatus } from '../models/enquiry.model';

const BUCKET = 'enquiry-documents';

export interface CreateEnquiryInput {
  fullName: string;
  companyName?: string;
  email: string;
  phone: string;
  requirement: string;
  projectDetails: string;
}

export interface EnquiryFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: EnquiryStatus;
}

export class EnquiryService {
  private static repository() {
    return AppDataSource.getRepository(Enquiry);
  }

  private static async uploadAttachment(file: Express.Multer.File): Promise<string> {
    const path = `enquiries/${randomUUID()}.pdf`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file.buffer, {
      contentType: 'application/pdf',
      upsert: false
    });

    if (error) throw new Error(`PDF upload failed: ${error.message}`);
    return path;
  }

  private static async deleteAttachment(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw new Error(`PDF cleanup failed: ${error.message}`);
  }

  static async create(input: CreateEnquiryInput, file?: Express.Multer.File): Promise<Enquiry> {
    const repo = this.repository();
    let attachmentPath: string | null = null;

    try {
      if (file) attachmentPath = await this.uploadAttachment(file);

      const enquiry = repo.create({
        enquiryNumber: `ENQ-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        name: input.fullName.trim(),
        company: input.companyName?.trim() || null,
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        requirement: input.requirement.trim(),
        message: input.projectDetails.trim(),
        attachmentPath,
        attachmentName: file?.originalname || null,
        status: EnquiryStatus.NEW,
        adminNotes: null
      });

      return await repo.save(enquiry);
    } catch (error) {
      if (attachmentPath) {
        try {
          await this.deleteAttachment(attachmentPath);
        } catch (cleanupError) {
          console.error('Enquiry attachment cleanup failed:', cleanupError);
        }
      }
      throw error;
    }
  }

  static async list(filters: EnquiryFilters = {}) {
    const repo = this.repository();
    const page = Math.max(1, Math.floor(Number(filters.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(filters.limit) || 10)));

    const query = repo.createQueryBuilder('enquiry');

    if (filters.status) {
      query.andWhere('enquiry.status = :status', { status: filters.status });
    }

    if (filters.search?.trim()) {
      query.andWhere(
        `(
          enquiry.name ILIKE :search OR
          enquiry.company ILIKE :search OR
          enquiry.email ILIKE :search OR
          enquiry.phone ILIKE :search OR
          enquiry.enquiryNumber ILIKE :search
        )`,
        { search: `%${filters.search.trim()}%` }
      );
    }

    query.orderBy('enquiry.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [enquiries, total] = await query.getManyAndCount();

    return {
      enquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getById(id: string): Promise<Enquiry | null> {
    return this.repository().findOneBy({ id });
  }

  static async updateStatus(id: string, status: EnquiryStatus): Promise<Enquiry | null> {
    const repo = this.repository();
    const enquiry = await repo.findOneBy({ id });

    if (!enquiry) return null;

    enquiry.status = status;
    return repo.save(enquiry);
  }

  static async updateNotes(id: string, adminNotes: string | null): Promise<Enquiry | null> {
    const repo = this.repository();
    const enquiry = await repo.findOneBy({ id });

    if (!enquiry) return null;

    enquiry.adminNotes = adminNotes?.trim() || null;
    return repo.save(enquiry);
  }

  static async getAttachmentSignedUrl(id: string): Promise<string | null> {
    const enquiry = await this.getById(id);
    if (!enquiry?.attachmentPath) return null;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(enquiry.attachmentPath, 60);

    if (error) throw new Error(`Unable to access attachment: ${error.message}`);
    return data.signedUrl;
  }

  static async getStats() {
    const repo = this.repository();

    const [total, newCount, inProgress, quoted, closed] = await Promise.all([
      repo.count(),
      repo.countBy({ status: EnquiryStatus.NEW }),
      repo.countBy({ status: EnquiryStatus.IN_PROGRESS }),
      repo.countBy({ status: EnquiryStatus.QUOTED }),
      repo.countBy({ status: EnquiryStatus.CLOSED })
    ]);

    return { total, new: newCount, inProgress, quoted, closed };
  }
}