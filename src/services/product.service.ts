import { AppDataSource } from '../config/database';
import { Product, ProductStatus } from '../models/product.model';

export interface ProductInput {
  name: string;
  slug: string;
  category: string;
  shortDescription?: string | null;
  description: string;
  specifications?: { name: string; value: string }[];
  featured?: boolean;
  displayOrder?: number;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: ProductStatus;
  featured?: boolean;
}

export class ProductService {
  private static get repository() {
    return AppDataSource.getRepository(Product);
  }

  static async create(input: ProductInput): Promise<Product> {
    const existing = await this.repository.findOneBy({
      slug: input.slug
    });

    if (existing) {
      throw new Error('Product slug already exists');
    }

    const product = this.repository.create({
      ...input,
      images: [],
      specifications: input.specifications ?? [],
      featured: input.featured ?? false,
      displayOrder: input.displayOrder ?? 0,
      status: ProductStatus.DRAFT
    });

    return this.repository.save(product);
  }

  static async findAll(
    filters: ProductFilters = {},
    publicOnly = false
  ) {
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(filters.limit ?? 10))
    );

    const query = this.repository.createQueryBuilder('product');

    if (publicOnly) {
      query.andWhere('product.status = :status', {
        status: ProductStatus.PUBLISHED
      });
    } else if (filters.status) {
      query.andWhere('product.status = :status', {
        status: filters.status
      });
    }

    if (filters.search?.trim()) {
      query.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search.trim()}%` }
      );
    }

    if (filters.category?.trim()) {
      query.andWhere('product.category = :category', {
        category: filters.category.trim()
      });
    }

    if (filters.featured !== undefined) {
      query.andWhere('product.featured = :featured', {
        featured: filters.featured
      });
    }

    query
      .orderBy('product.displayOrder', 'ASC')
      .addOrderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await query.getManyAndCount();

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async findById(id: string): Promise<Product | null> {
    return this.repository.findOneBy({ id });
  }

  static async findPublishedBySlug(
    slug: string
  ): Promise<Product | null> {
    return this.repository.findOneBy({
      slug,
      status: ProductStatus.PUBLISHED
    });
  }

  static async update(
    id: string,
    input: Partial<ProductInput>
  ): Promise<Product> {
    const product = await this.findById(id);

    if (!product) {
      throw new Error('Product not found');
    }

    if (input.slug && input.slug !== product.slug) {
      const existing = await this.repository.findOneBy({
        slug: input.slug
      });

      if (existing) {
        throw new Error('Product slug already exists');
      }
    }

    const updated = this.repository.merge(product, input);

    return this.repository.save(updated);
  }

  static async updateStatus(
    id: string,
    status: ProductStatus
  ): Promise<Product> {
    const product = await this.findById(id);

    if (!product) {
      throw new Error('Product not found');
    }

    product.status = status;

    return this.repository.save(product);
  }

  static async getCategories(): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.status = :status', {
        status: ProductStatus.PUBLISHED
      })
      .orderBy('category', 'ASC')
      .getRawMany<{ category: string }>();

    return rows.map(row => row.category);
  }

  static async delete(id: string): Promise<void> {
    const product = await this.findById(id);

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.images.length > 0) {
      throw new Error(
        'Product has images. Remove associated images before deleting.'
      );
    }

    await this.repository.remove(product);
  }
}