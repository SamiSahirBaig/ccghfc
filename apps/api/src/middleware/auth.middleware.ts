import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'CITIZEN' | 'OFFICER' | 'SUPERVISOR' | 'ADMIN' | 'DEVICE';
  wardId?: string | null;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      device?: any;
    }
  }
}

/**
 * Middleware ensuring valid JWT Bearer token
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. Missing Bearer token.' },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as {
      sub: string;
      email: string;
      role: AuthUser['role'];
      wardId?: string;
    };

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      wardId: payload.wardId,
      name: payload.email,
    };

    next();
  } catch (err: any) {
    logger.debug({ err: err.message }, 'JWT authentication failed');
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired authentication token.' },
    });
  }
}

/**
 * Optional authentication middleware: populates req.user if token is present, continues otherwise
 */
export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as any;
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        wardId: payload.wardId,
        name: payload.email,
      };
    } catch (e) {
      // ignore
    }
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) guard
 */
export function authorize(...allowedRoles: Array<AuthUser['role']>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Forbidden: role ${req.user.role} does not have required permissions (${allowedRoles.join(', ')}).`,
        },
      });
    }

    next();
  };
}
