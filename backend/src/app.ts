import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import { config } from './config.js';

export const app = express();

app.use(
  cors({
    origin: [config.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

app.use(express.json());

if (config.NODE_ENV !== 'test') {
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url?.includes('/health') ?? false,
      },
    })
  );
}

// API Routes mounted on /api/v1
const apiRouter = express.Router();
apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(profileRouter);
apiRouter.use('/admin', adminRouter);

app.use('/api/v1', apiRouter);

// 404 & Central Error Handler
app.use(notFoundHandler);
app.use(errorHandler);
