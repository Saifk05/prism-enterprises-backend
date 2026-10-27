
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 50, default: 'ADMIN' })
  role!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'reset_token_hash', type: 'varchar', length: 64, nullable: true })
  resetTokenHash!: string | null;

  @Column({ name: 'reset_token_expires_at', type: 'timestamptz', nullable: true })
  resetTokenExpiresAt!: Date | null;

  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 64, nullable: true })
  refreshTokenHash!: string | null;

  @Column({ name: 'refresh_token_expires_at', type: 'timestamptz', nullable: true })
  refreshTokenExpiresAt!: Date | null;

  @Column({ name: 'remember_me', type: 'boolean', default: false })
  rememberMe!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
