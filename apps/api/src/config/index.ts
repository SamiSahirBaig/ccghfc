import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT || '5000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  webBaseUrl: process.env.WEB_BASE_URL || 'http://localhost:3000',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cityclean?schema=public',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'cityclean_super_secret_access_jwt_key_2026_production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'cityclean_super_secret_refresh_jwt_key_2026_production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 'minio' | 's3',
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      bucket: process.env.MINIO_BUCKET || 'cityclean-media',
    },
    localUploadDir: path.resolve(process.cwd(), 'uploads'),
  },

  email: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '"CityClean Civic Redressal" <no-reply@cityclean.gov>',
    dmOfficeEmail: process.env.DM_OFFICE_EMAIL || 'dm-office@district.gov.in',
    stateOversightEmail: process.env.STATE_OVERSIGHT_EMAIL || 'commissioner@civic.state.gov.in',
  },

  ai: {
    provider: (process.env.AI_PROVIDER || 'mock') as 'mock' | 'gemini' | 'claude',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-1.5-flash',
  },

  sla: {
    defaultHours: parseInt(process.env.DEFAULT_SLA_HOURS || '72', 10),
    overrideMinutes: parseInt(process.env.SLA_OVERRIDE_MINUTES || '0', 10),
  },

  device: {
    enableHmac: process.env.ENABLE_DEVICE_HMAC === 'true',
    clockSkewToleranceSeconds: parseInt(process.env.DEVICE_CLOCK_SKEW_TOLERANCE_SECONDS || '300', 10),
  },
};
