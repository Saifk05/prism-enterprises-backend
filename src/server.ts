
import 'reflect-metadata';
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { AppDataSource } from './config/database.js';

const app = express();

const PORT = Number(process.env['PORT'] || 3000);

// Security middleware
app.use(helmet());

app.use(cors({
  origin: [
    'http://localhost:8100',
    'http://localhost:4200',
    'https://prism.atnav.in'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check API
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Prism Enterprises Backend API is running',
    database: AppDataSource.isInitialized
      ? 'connected'
      : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Handle unknown routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Start server after connecting to PostgreSQL
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
