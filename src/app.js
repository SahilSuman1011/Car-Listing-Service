const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const logger = require('./utils/logger');
const carListingRoutes = require('./routes/car-listing-routes');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');


const app = express();

// ======================
// Security Middleware
// ======================

// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: config.server.env === 'production' 
    ? ['https://yourdomain.com'] // Whitelist in production
    : '*', // Allow all in development
  credentials: true,
}));

// ======================
// Body Parsing Middleware
// ======================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// Compression Middleware
// ======================

app.use(compression());

// ======================
// Request Logging
// ======================

// Log all requests in development
if (config.server.env === 'development') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, {
      query: req.query,
      body: req.body,
      ip: req.ip,
    });
    next();
  });
}

// ======================
// Routes
// ======================

// API routes
app.use('/api', carListingRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Car Listing Service API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      listings: '/api/listings',
      scrape: '/api/scrape',
      stats: '/api/stats',
    },
    documentation: 'See README.md for full API documentation',
  });
});

// ======================
// Error Handling
// ======================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ======================
// Server Startup
// ======================

const PORT = config.server.port;
const HOST = config.server.host;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database connection
    const { closePool } = require('./config/database');
    await closePool();
    
    logger.info('Database connections closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, HOST, () => {
  logger.info(`
    ╔═══════════════════════════════════════╗
    ║   Car Listing Service Started         ║
    ╠═══════════════════════════════════════╣
    ║   Environment: ${config.server.env.padEnd(23)} ║
    ║   Server: http://${HOST}:${PORT}${' '.repeat(13)} ║
    ║   API Docs: http://${HOST}:${PORT}/api${' '.repeat(5)} ║
    ╚═══════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;