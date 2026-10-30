import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum EnquiryStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  QUOTED = 'QUOTED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

@Entity('enquiries')
export class Enquiry {

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({
    name: 'enquiry_number',
    type: 'varchar',
    length: 50,
    unique: true
  })
  enquiryNumber!: string;

  @Column({
    type: 'varchar',
    length: 150
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true
  })
  company!: string | null;

  @Index()
  @Column({
    type: 'varchar',
    length: 255
  })
  email!: string;

  @Column({
    type: 'varchar',
    length: 30
  })
  phone!: string;

  @Column({
    type: 'varchar',
    length: 200
  })
  requirement!: string;

  @Column({
    type: 'text'
  })
  message!: string;

  @Column({
    name: 'attachment_path',
    type: 'text',
    nullable: true
  })
  attachmentPath!: string | null;

  @Column({
    name: 'attachment_name',
    type: 'varchar',
    length: 255,
    nullable: true
  })
  attachmentName!: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: EnquiryStatus,
    enumName: 'enquiry_status_enum',
    default: EnquiryStatus.NEW
  })
  status!: EnquiryStatus;

  @Column({
    name: 'admin_notes',
    type: 'text',
    nullable: true
  })
  adminNotes!: string | null;

  @Index()
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