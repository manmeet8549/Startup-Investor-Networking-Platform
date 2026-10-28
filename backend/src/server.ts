import { app } from './app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { closeDb } from './db/index.js';
import { initKeepAlive, stopKeepAlive } from './utils/keep-alive.js';

const port = Number(process.env.PORT) || config.PORT || 5000;
const host = '0.0.0.0';

const server = app.listen(port, host, () => {
  logger.info(`Founders Den Backend running on http://${host}:${port} in ${config.NODE_ENV} mode`);
  logger.info(`DB mode: ${config.dbMode}`);
  console.log(`DB mode: ${config.dbMode}`);

  // Automatically start keep-alive ping for Render free tier
  initKeepAlive(port);
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down backend server gracefully...');
  stopKeepAlive();
  server.close(async () => {
    try {
      await closeDb();
      logger.info('Database pool closed and HTTP server stopped.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error closing database pool during shutdown');
      process.exit(1);
    }
  });

  // Force exit after 10s timeout to prevent hanging process
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
