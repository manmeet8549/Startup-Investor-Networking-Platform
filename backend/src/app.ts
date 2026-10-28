import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { meRouter } from './routes/me.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { dealRouter } from './routes/deal.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { startupRouter } from './routes/startup.routes.js';
import { documentRouter } from './routes/document.routes.js';
import { metaRouter } from './routes/meta.routes.js';
import { matchingRouter, investorRouter } from './routes/matching.routes.js';
import { engagementRouter } from './routes/engagement.routes.js';
import { mentorshipIncubationRouter } from './routes/mentorship-incubation.routes.js';
import { reportRouter } from './routes/report.routes.js';
import { docsRouter } from './routes/docs.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import { config } from './config.js';

export const app = express();

// Trust reverse proxy (Render, Cloudflare, load balancers) so client IPs are accurate
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Root endpoint and platform health checks
app.all('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Founders Den Backend API',
    version: '1.0.0',
    health: '/health',
    docs: '/api/docs',
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// CORS configuration: supports configured origins, all Vercel deployment domains (*.vercel.app), and localhost
const configuredOrigins = config.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isOriginAllowed = (origin: string): boolean => {
  if (configuredOrigins.includes(origin)) return true;
  try {
    const parsed = new URL(origin);
    if (parsed.hostname.endsWith('.vercel.app')) return true;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
  } catch {
    if (origin.endsWith('.vercel.app')) return true;
  }
  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    logger.warn({ origin }, '[CORS] Blocked request from disallowed origin');
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-request-id'],
  exposedHeaders: ['ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// JSON body limit (1MB max)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Pino request logger with unique Request IDs
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => {
      const existingId = req.headers['x-request-id'];
      if (typeof existingId === 'string' && existingId.length > 0) {
        return existingId;
      }
      return crypto.randomUUID();
    },
    customProps: (req) => ({
      requestId: req.id,
    }),
    autoLogging: {
      ignore: (req) => req.url?.includes('/health') && config.NODE_ENV === 'test',
    },
  })
);

// Rate Limiting (standard rate-limiting headers enabled)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.NODE_ENV === 'test' ? 10000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
      },
    });
  },
});
app.use(limiter);

// API Routes mounted under /api/v1
const apiRouter = express.Router();
apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(meRouter);
apiRouter.use(profileRouter);
apiRouter.use(dealRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use(startupRouter);
apiRouter.use(documentRouter);
apiRouter.use(metaRouter);
apiRouter.use('/matches', matchingRouter);
apiRouter.use('/investors', investorRouter);
apiRouter.use(engagementRouter);
apiRouter.use(mentorshipIncubationRouter);
apiRouter.use(reportRouter);

app.use('/api', docsRouter);
app.use('/api/v1', apiRouter);

// 404 Not Found & Central Error Handler
app.use(notFoundHandler);
app.use(errorHandler);
