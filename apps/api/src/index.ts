import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';

// Import routes
import quoteRoutes from './routes/quote.js';
import simulationRoutes from './routes/simulation.js';
import txParamsRoutes from './routes/txParams.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  }, 'Incoming request');
  next();
});

// Health check endpoint
app.get('/healthz', (_req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/v1/quote', quoteRoutes);
app.use('/v1/simulate', simulationRoutes);
app.use('/v1/tx-params', txParamsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  }, 'Unhandled error');

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
});

const PORT = parseInt(process.env.PORT || '4000');
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  logger.info({
    port: PORT,
    host: HOST,
    env: process.env.NODE_ENV || 'development',
  }, 'API server started');
});

export default app;