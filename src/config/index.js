require('dotenv').config();

const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },

  // Database configuration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'app_db',
    name: process.env.DB_NAME || 'car_listings_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 20,
  },

  // Scraper configuration
  scraper: {
    url: process.env.SCRAPE_URL || 'https://www.facebook.com/marketplace/manila/cars?minPrice=350000&exact=false',
    headless: process.env.SCRAPE_HEADLESS === 'true',
    timeout: parseInt(process.env.SCRAPE_TIMEOUT, 10) || 30000,
    maxListings: parseInt(process.env.MAX_LISTINGS_PER_SCRAPE, 10) || 50,
  },

  // API configuration
  api: {
    rateLimitWindowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS, 10) || 900000,
    rateLimitMaxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
  },
};

// Validate required configuration
const validateConfig = () => {
  const required = [
    'DB_PASSWORD',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// validation only for production
if (config.server.env === 'production') {
  validateConfig();
}

module.exports = config;