import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { Role } from '../models/role.model';
import { Product } from '../models/product.model';
import { Enquiry } from '../models/enquiry.model';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',

  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || 'postgres',

  ssl: {
    rejectUnauthorized: process.env.NODE_ENV !== 'development'
  },

  entities: [Role, Product, Enquiry],

  synchronize: process.env.NODE_ENV === 'development',

  logging: false
});