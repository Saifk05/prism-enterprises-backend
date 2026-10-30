import { randomUUID } from 'crypto';
import { supabase, STORAGE_BUCKET } from '../config/supabase';

export interface UploadedProductImage {
  path: string;
  url: string;
}

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

export class StorageService {

  private static validateImage(file: Express.Multer.File): string {
    const extension = ALLOWED_TYPES[file.mimetype];

    if (!extension) {
      throw new Error('Unsupported image format');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('Image file is empty');
    }

    if (file.buffer.length > 5 * 1024 * 1024) {
      throw new Error('Image exceeds the 5 MB limit');
    }

    const buffer = file.buffer;

    const isJPEG =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isPNG =
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      );

    const isWEBP =
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';

    const valid =
      (file.mimetype === 'image/jpeg' && isJPEG) ||
      (file.mimetype === 'image/png' && isPNG) ||
      (file.mimetype === 'image/webp' && isWEBP);

    if (!valid) {
      throw new Error('Image content does not match its file type');
    }

    return extension;
  }

  static async uploadProductImages(
    productId: string,
    files: Express.Multer.File[]
  ): Promise<UploadedProductImage[]> {

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
      throw new Error('Invalid product ID');
    }

    if (files.length > 10) {
      throw new Error('Maximum 10 images are allowed');
    }

    // Validate all files before uploading anything.
    const validated = files.map(file => ({
      file,
      extension: this.validateImage(file)
    }));

    const uploaded: UploadedProductImage[] = [];

    try {
      for (const { file, extension } of validated) {

        const filename = `${randomUUID()}.${extension}`;
        const path = `products/${productId}/${filename}`;

        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw new Error(`Image upload failed: ${error.message}`);
        }

        const { data } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);

        uploaded.push({
          path,
          url: data.publicUrl
        });
      }

      return uploaded;

    } catch (error) {

      // Clean up files uploaded during this request.
      if (uploaded.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(uploaded.map(image => image.path));

        if (cleanupError) {
          console.error('Image cleanup failed:', cleanupError);
        }
      }

      throw error;
    }
  }

  static async deleteProductImages(
    productId: string,
    paths: string[]
  ): Promise<void> {

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
      throw new Error('Invalid product ID');
    }

    if (paths.length === 0) {
      return;
    }

    const prefix = `products/${productId}/`;

    // Only allow deletion from this product's folder.
    for (const path of paths) {
      if (
        !path.startsWith(prefix) ||
        !/^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path)
      ) {
        throw new Error('Invalid product image path');
      }
    }

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(paths);

    if (error) {
      throw new Error(`Image deletion failed: ${error.message}`);
    }
  }
}