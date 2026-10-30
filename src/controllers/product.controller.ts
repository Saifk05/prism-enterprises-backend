import { Request, Response } from 'express';
import { z } from 'zod';
import { ProductService } from '../services/product.service';
import { Product, ProductStatus } from '../models/product.model';
import { StorageService } from '../services/storage.service';
import { AppDataSource } from '../config/database';

const uuid = z.uuid();
const specification = z.object({
  name: z.string().trim().min(1).max(150),
  value: z.string().trim().min(1).max(1000)
}).strict();

const productSchema = z.object({
  name: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string().trim().min(1).max(150),
  shortDescription: z.string().trim().max(2000).nullable().optional(),
  description: z.string().trim().min(1),
  specifications: z.array(specification).max(100).optional(),
  featured: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
}).strict();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(255).optional(),
  category: z.string().max(150).optional(),
  featured: z.enum(['true', 'false']).optional(),
  status: z.enum(ProductStatus).optional()
});

const statusSchema = z.object({ status: z.enum(ProductStatus) }).strict();
const pathsSchema = z.object({
  paths: z.array(z.string().min(1)).min(1).max(10)
}).strict();

export class ProductController {
  private static handleError(res: Response, error: unknown): void {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null;

    if (message === 'Product not found') {
      res.status(404).json({ success: false, message });
      return;
    }

    if (message === 'Product slug already exists' || code === '23505') {
      res.status(409).json({ success: false, message: 'Product slug already exists' });
      return;
    }

    if (message === 'Product has images. Remove associated images before deleting.') {
      res.status(409).json({ success: false, message });
      return;
    }

    console.error('Product API error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const product = await ProductService.create(productSchema.parse(req.body));
      res.status(201).json({ success: true, message: 'Product created successfully', data: product });
    } catch (error) { ProductController.handleError(res, error); }
  }

  static async getAdminProducts(req: Request, res: Response): Promise<void> {
    try {
      const { featured, ...filters } = listSchema.parse(req.query);
      const data = await ProductService.findAll({
        ...filters, featured: featured === undefined ? undefined : featured === 'true'
      });
      res.json({ success: true, data });
    } catch (error) { ProductController.handleError(res, error); }
  }

  static async getPublicProducts(req: Request, res: Response): Promise<void> {
    try {
      const { featured, ...filters } = listSchema.parse(req.query);
      const data = await ProductService.findAll({
        ...filters, featured: featured === undefined ? undefined : featured === 'true'
      }, true);
      res.json({ success: true, data });
    } catch (error) { ProductController.handleError(res, error); }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const product = await ProductService.findById(uuid.parse(req.params.id));
      if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }
      res.json({ success: true, data: product });
    } catch (error) { ProductController.handleError(res, error); }
  }

  static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const slug = z.string().min(1).max(255).parse(req.params.slug);
      const product = await ProductService.findPublishedBySlug(slug);
      if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }
      res.json({ success: true, data: product });
    } catch (error) { ProductController.handleError(res, error); }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const product = await ProductService.update(
        uuid.parse(req.params.id), productSchema.partial().parse(req.body)
      );
      res.json({ success: true, message: 'Product updated successfully', data: product });
    } catch (error) { ProductController.handleError(res, error); }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = statusSchema.parse(req.body);
      const product = await ProductService.updateStatus(uuid.parse(req.params.id), status);
      res.json({ success: true, message: `Product status updated to ${status}`, data: product });
    } catch (error) { ProductController.handleError(res, error); }
  }

  static async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await ProductService.getCategories() });
    } catch (error) { ProductController.handleError(res, error); }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await ProductService.delete(uuid.parse(req.params.id));
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) { ProductController.handleError(res, error); }
  }

  static async uploadImages(req: Request, res: Response): Promise<void> {
    try {
      const id = uuid.parse(req.params.id);
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files?.length) {
        res.status(400).json({ success: false, message: 'Please select at least one image' });
        return;
      }

      const repo = AppDataSource.getRepository(Product);
      const product = await repo.findOneBy({ id });

      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      if (product.images.length + files.length > 10) {
        res.status(400).json({ success: false, message: 'Maximum 10 images per product' });
        return;
      }

      const uploaded = await StorageService.uploadProductImages(id, files);
      const paths = uploaded.map(image => image.path);

      try {
        const result = await repo.createQueryBuilder()
          .update(Product)
          .set({ images: () => `COALESCE(images, '[]'::jsonb) || :newImages::jsonb` })
          .where('id = :id', { id })
          .andWhere("jsonb_array_length(COALESCE(images, '[]'::jsonb)) + :count <= 10", {
            count: paths.length
          })
          .setParameter('newImages', JSON.stringify(paths))
          .execute();

        if (!result.affected) {
          throw new Error('Product was deleted or image limit was reached');
        }
      } catch (error) {
        try {
          await StorageService.deleteProductImages(id, paths);
        } catch (cleanupError) {
          console.error('Image cleanup failed:', cleanupError);
        }
        throw error;
      }

      res.json({ success: true, message: 'Images uploaded successfully', data: uploaded });
    } catch (error) { ProductController.handleError(res, error); }
  }

  static async deleteImages(req: Request, res: Response): Promise<void> {
    try {
      const id = uuid.parse(req.params.id);
      const { paths } = pathsSchema.parse(req.body);
      const uniquePaths = [...new Set(paths)];
      const repo = AppDataSource.getRepository(Product);
      const product = await repo.findOneBy({ id });

      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      if (uniquePaths.some(path => !product.images.includes(path))) {
        res.status(400).json({ success: false, message: 'Invalid product image paths' });
        return;
      }

      // Remove references first to prevent the website from serving deleted images.
      const result = await repo.createQueryBuilder()
        .update(Product)
        .set({
          images: () => `COALESCE(images, '[]'::jsonb) - ARRAY[:...paths]::text[]`
        })
        .where('id = :id', { id })
        .andWhere('images @> :requiredImages::jsonb', {
          requiredImages: JSON.stringify(uniquePaths)
        })
        .setParameter('paths', uniquePaths)
        .execute();

      if (!result.affected) {
        res.status(409).json({ success: false, message: 'Product images changed. Please retry.' });
        return;
      }

      // If storage deletion fails, references have already been removed.
      // Log the failure so orphaned files can be cleaned up.
      try {
        await StorageService.deleteProductImages(id, uniquePaths);
      } catch (storageError) {
        console.error('Storage cleanup required:', { productId: id, paths: uniquePaths, storageError });
        res.status(500).json({
          success: false,
          message: 'Image references removed, but storage cleanup failed'
        });
        return;
      }

      const updated = await repo.findOneBy({ id });
      res.json({
        success: true,
        message: 'Images deleted successfully',
        data: { images: updated?.images ?? [] }
      });
    } catch (error) { ProductController.handleError(res, error); }
  }
}