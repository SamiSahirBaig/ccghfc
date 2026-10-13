import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limiter (100 requests per 15 min per IP)
 */
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: { message: 'Too many requests from this IP, please try again later.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiter for Authentication and Registration endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: { message: 'Too many authentication attempts, please try again after 15 minutes.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for complaint submission
 */
export const complaintLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    error: { message: 'Too many complaint submissions. Please wait a few minutes before submitting another report.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for IoT hardware nodes
 */
export const deviceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // allows frequent telemetry samples
  standardHeaders: true,
  legacyHeaders: false,
});
