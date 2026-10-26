import { app } from './app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { closeDb } from './db/index.js';

const server = app.listen(config.PORT, () => {
  logger.info(`Founders Den Backend running on port ${config.PORT} in ${config.NODE_ENV} mode`);
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down backend server gracefully...');
  server.close(async () => {
    await closeDb();
    logger.info('Database pool closed and HTTP server stopped.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
