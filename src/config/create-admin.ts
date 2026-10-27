
import 'reflect-metadata';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { AppDataSource } from './database';
import { Role } from '../models/role.model';

dotenv.config();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error('Valid ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }

  await AppDataSource.initialize();

  try {
    const repository = AppDataSource.getRepository(Role);
    const existing = await repository.findOneBy({ email });

    if (existing) {
      console.log('Admin account already exists');
      return;
    }

    const admin = repository.create({
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      isActive: true
    });

    await repository.save(admin);
    console.log('Admin account created successfully');
  } finally {
    await AppDataSource.destroy();
  }
}

createAdmin().catch(error => {
  console.error('Admin creation failed:', error.message);
  process.exitCode = 1;
});
