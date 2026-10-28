import https from 'node:https';
import http from 'node:http';
import { logger } from './logger.js';

let keepAliveTimer: NodeJS.Timeout | null = null;

/**
 * Initializes automatic keep-alive ping for Render free tier.
 * Render free tier spins down services after 15 minutes of inactivity.
 * By pinging the external URL every 10 minutes through Render's edge router,
 * the inactivity timer resets and the service stays continuously awake.
 */
export function initKeepAlive(port: number): void {
  // Never run keep-alive in test environments
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // Render automatically sets RENDER_EXTERNAL_URL (e.g. https://startup-investor-networking-platform.onrender.com)
  const targetUrl = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;

  const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  if (!targetUrl) {
    logger.info(
      '[Keep-Alive] Neither RENDER_EXTERNAL_URL nor KEEP_ALIVE_URL detected. ' +
      'Set KEEP_ALIVE_URL or run in Render to enable automatic self-ping.'
    );
    return;
  }

  const pingUrl = `${targetUrl.replace(/\/+$/, '')}/health`;
  logger.info({ pingUrl, intervalMinutes: 10 }, '[Keep-Alive] Initialized self-ping service to prevent Render idle sleep');

  // Initial test ping 30s after server startup
  setTimeout(() => {
    pingServer(pingUrl);
  }, 30000).unref();

  // Recurring ping every 10 minutes
  keepAliveTimer = setInterval(() => {
    pingServer(pingUrl);
  }, INTERVAL_MS);

  // Unref timer so Node process can exit gracefully
  keepAliveTimer.unref();
}

function pingServer(url: string): void {
  try {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;

    const req = client.get(url, { timeout: 15000 }, (res) => {
      // Consume response data to prevent memory leak
      res.resume();
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
        logger.info({ statusCode: res.statusCode }, '[Keep-Alive] Heartbeat ping succeeded, server kept awake');
      } else {
        logger.warn({ statusCode: res.statusCode }, '[Keep-Alive] Heartbeat ping returned non-200 status');
      }
    });

    req.on('error', (err) => {
      logger.warn({ err: err.message }, '[Keep-Alive] Heartbeat ping network error');
    });

    req.on('timeout', () => {
      req.destroy();
      logger.warn('[Keep-Alive] Heartbeat ping timed out');
    });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[Keep-Alive] Heartbeat ping failed to dispatch');
  }
}

export function stopKeepAlive(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

