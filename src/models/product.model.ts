import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED'
}

export interface ProductSpecification {
  name: string;
  value: string;
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Index()
  @Column({ type: 'varchar', length: 150 })
  category!: string;

  @Column({
    name: 'short_description',
    type: 'text',
    nullable: true
  })
  shortDescription!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb"
  })
  images!: string[];

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb"
  })
  specifications!: ProductSpecification[];

  @Index()
  @Column({
    type: 'enum',
    enum: ProductStatus,
    enumName: 'product_status_enum',
    default: ProductStatus.DRAFT
  })
  status!: ProductStatus;

  @Column({
    type: 'boolean',
    default: false
  })
  featured!: boolean;

  @Column({
    name: 'display_order',
    type: 'integer',
    default: 0
  })
  displayOrder!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz'
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz'
  })
  updatedAt!: Date;
}