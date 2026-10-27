
import 'reflect-metadata';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { AppDataSource } from './config/database';
import router from './config/router';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet());

app.use(cors({
  origin: ['http://localhost:8100', 'http://localhost:4200', 'https://prism.atnav.in'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Prism Enterprises Backend API is running',
    database: AppDataSource.isInitialized ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1', router);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

async function startServer(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('PostgreSQL connected successfully');

    app.listen(PORT, () => {
      console.log(`Prism Enterprises API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Prism Enterprises API:', error);
    process.exit(1);
  }
}

void startServer();
