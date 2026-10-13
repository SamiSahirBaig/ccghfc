import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { standardLimiter } from './middleware/rate-limiter.js';
import { openapiSpec } from './swagger/openapi.js';

// Route modules
import authRoutes from './routes/auth.routes.js';
import complaintsRoutes from './routes/complaints.routes.js';
import deviceRoutes from './routes/device.routes.js';
import adminRoutes from './routes/admin.routes.js';
import publicRoutes from './routes/public.routes.js';
import streamRoutes from './routes/stream.routes.js';

export const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // allow local photo loading
}));
app.use(cors({
  origin: '*', // in production configure allowed origins
  credentials: true,
}));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving
app.use('/uploads', express.static(config.storage.localUploadDir));

// Swagger UI Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Health Checks
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date() });
});

app.get('/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready', env: config.env });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/complaints', complaintsRoutes);
app.use('/api/v1/device', deviceRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/stream', streamRoutes);

// Global 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
});

// Global error handler
app.use(errorHandler);
