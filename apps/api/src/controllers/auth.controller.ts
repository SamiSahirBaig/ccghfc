import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['CITIZEN', 'OFFICER', 'SUPERVISOR', 'ADMIN']).default('CITIZEN'),
  wardId: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  public static async register(req: Request, res: Response) {
    const data = RegisterSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'A user with this email address already exists.' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        passwordHash,
        role: data.role,
        wardId: data.wardId || null,
        trustScore: 1.0,
      },
    });

    const accessToken = AuthController.generateAccessToken(user);
    const refreshToken = AuthController.generateRefreshToken(user);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          wardId: user.wardId,
          trustScore: user.trustScore,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  }

  public static async login(req: Request, res: Response) {
    const data = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: { ward: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' },
      });
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' },
      });
    }

    const accessToken = AuthController.generateAccessToken(user);
    const refreshToken = AuthController.generateRefreshToken(user);

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          wardId: user.wardId,
          wardName: user.ward?.name,
          trustScore: user.trustScore,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  }

  public static async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing refreshToken in request body.' },
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, error: { message: 'Invalid refresh token.' } });
      }

      const newAccessToken = AuthController.generateAccessToken(user);
      return res.json({
        success: true,
        data: { accessToken: newAccessToken },
      });
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired refresh token.' },
      });
    }
  }

  public static async me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { ward: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found.' } });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        wardId: user.wardId,
        wardName: user.ward?.name,
        trustScore: user.trustScore,
        createdAt: user.createdAt,
      },
    });
  }

  public static async logout(req: Request, res: Response) {
    return res.json({
      success: true,
      data: { message: 'Logged out successfully.' },
    });
  }

  private static generateAccessToken(user: any): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        wardId: user.wardId,
      },
      config.jwt.accessSecret,
      { expiresIn: '15m' }
    );
  }

  private static generateRefreshToken(user: any): string {
    return jwt.sign(
      { sub: user.id },
      config.jwt.refreshSecret,
      { expiresIn: '7d' }
    );
  }
}
