import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { inMemoryDb } from './in-memory-db.js';

// Ensure environment variables are loaded
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/cityclean?schema=public';
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: any | undefined;
  // eslint-disable-next-line no-var
  var __useMockDb: boolean | undefined;
}

let realPrisma: PrismaClient | null = null;
try {
  realPrisma = new PrismaClient({
    log: ['error'],
  });
} catch (e) {
  realPrisma = null;
}

let useMockDb = global.__useMockDb ?? false;

const collectionMap: Record<string, string> = {
  user: 'users',
  zone: 'zones',
  ward: 'wards',
  department: 'departments',
  category: 'categories',
  complaint: 'complaints',
  complaintMedia: 'complaintMedia',
  aiVerification: 'aiVerifications',
  statusHistory: 'statusHistories',
  comment: 'comments',
  upvote: 'upvotes',
  escalationLog: 'escalationLogs',
  device: 'devices',
  sensorReading: 'sensorReadings',
  sensorAlert: 'sensorAlerts',
  setting: 'settings',
  auditLog: 'auditLogs',
};

function getModelHandler(modelName: string) {
  const collectionName = collectionMap[modelName] || `${modelName}s`;
  const mockModel = inMemoryDb.createModelProxy(collectionName);

  return new Proxy(mockModel, {
    get(target, prop, receiver) {
      const mockMethod = Reflect.get(target, prop, receiver);

      return async (...args: any[]) => {
        if (!useMockDb && realPrisma && (realPrisma as any)[modelName]) {
          try {
            const realMethod = (realPrisma as any)[modelName][prop];
            if (typeof realMethod === 'function') {
              return await realMethod.apply((realPrisma as any)[modelName], args);
            }
          } catch (err: any) {
            // Check for connection / initialization failure
            if (
              err.name === 'PrismaClientInitializationError' ||
              err.code === 'P1001' ||
              err.code === 'P1002' ||
              err.message?.includes('ECONNREFUSED') ||
              err.message?.includes('Environment variable not found')
            ) {
              if (!useMockDb) {
                useMockDb = true;
                global.__useMockDb = true;
                logger.warn(
                  `PostgreSQL unavailable. Switched to In-Memory DB fallback for ${modelName}.${String(prop)}`
                );
              }
            } else {
              throw err;
            }
          }
        }

        // Run on in-memory DB
        if (typeof mockMethod === 'function') {
          return await mockMethod.apply(target, args);
        }
        return undefined;
      };
    },
  });
}

// Proxy wrapper for PrismaClient
export const prisma: any = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === '$queryRaw') {
        return async (...args: any[]) => {
          if (!useMockDb && realPrisma) {
            try {
              return await (realPrisma as any).$queryRaw(...args);
            } catch (err) {
              useMockDb = true;
              return [];
            }
          }
          return [];
        };
      }

      if (prop === '$transaction') {
        return async (fnOrArray: any) => {
          if (Array.isArray(fnOrArray)) {
            return Promise.all(fnOrArray);
          }
          if (typeof fnOrArray === 'function') {
            return await fnOrArray(prisma);
          }
          return [];
        };
      }

      const modelName = String(prop);
      return getModelHandler(modelName);
    },
  }
);

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    if (!realPrisma) {
      useMockDb = true;
      global.__useMockDb = true;
      logger.info('ℹ️ Running with active In-Memory Database store with complete pre-seeded data.');
      return false;
    }
    await realPrisma.$queryRaw`SELECT 1`;
    logger.info('✅ Connected to PostgreSQL database with PostGIS.');
    useMockDb = false;
    global.__useMockDb = false;
    return true;
  } catch (error) {
    useMockDb = true;
    global.__useMockDb = true;
    logger.info(
      'ℹ️ PostgreSQL is not reachable at localhost:5432. Active In-Memory Database store engaged with full seed dataset.'
    );
    return false;
  }
}
