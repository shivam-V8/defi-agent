import express from 'express';
import pino from 'pino';

// Import security middleware
import {
  helmetConfig,
  corsConfig,
  apiRateLimit,
  quoteRateLimit,
  requestTimeout,
  sanitizeInput,
  errorNormalizer,
  requestLogger,
  securityHeaders,
  requestSizeLimit,
} from './middleware/security.js';

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

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware (order matters!)
app.use(helmetConfig);
app.use(corsConfig);
app.use(securityHeaders);
app.use(requestSizeLimit('10mb'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(apiRateLimit);

// Request timeout
app.use(requestTimeout(30000)); // 30 second timeout

// Health check endpoint
app.get('/healthz', (_req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes with specific rate limiting
app.use('/v1/quote', quoteRateLimit, quoteRoutes);
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
app.use(errorNormalizer);

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