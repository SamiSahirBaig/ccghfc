import 'dotenv/config';
import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { checkDatabaseConnection } from './lib/prisma.js';
import { slaService } from './services/queue/sla-escalation.service.js';
import { deviceService } from './services/device/device.service.js';
import { emailService } from './services/email/email.service.js';

const server = app.listen(config.port, async () => {
  logger.info(`=======================================================`);
  logger.info(`🏙️  CityClean REST API Server running on port ${config.port}`);
  logger.info(`📚 Swagger UI OpenAPI Docs: http://localhost:${config.port}/api/docs`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`=======================================================`);

  // Verify external connections asynchronously
  await checkDatabaseConnection();
  await emailService.verifyConnection();

  // Reconcile open complaints for 72h SLA restarts
  await slaService.reconcileOpenComplaints();

  // Schedule device offline detection interval (every 60s)
  setInterval(() => {
    deviceService.checkOfflineDevices();
  }, 60 * 1000);
});

// Graceful Shutdown
function handleShutdown(signal: string) {
  logger.info({ signal }, 'Graceful shutdown signal received');
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default server;
