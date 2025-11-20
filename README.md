# 🚗 Car Listing Service

A production-grade backend service for scraping, storing, and serving car listings from Facebook Marketplace. Built with Node.js, Express, PostgreSQL, and Puppeteer.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- **Web Scraping**: ✅ **WORKING** automated scraping of car listings from Facebook Marketplace using Puppeteer
- **Real Data Extraction**: Successfully extracts 20-50 listings per run with title, price, year, images, and URLs
- **Data Persistence**: PostgreSQL database with proper schema design and indexing
- **RESTful API**: Clean API endpoints for CRUD operations
- **Duplicate Prevention**: Intelligent upsert mechanism using unique source URLs
- **Pagination & Filtering**: Advanced query options for listing retrieval
- **Error Handling**: Comprehensive error handling with retry logic
- **Validation**: Input validation using express-validator
- **Security**: Helmet.js for security headers, parameterized queries for SQL injection prevention
- **Production Ready**: Structured logging, connection pooling, graceful shutdown
- **Health Monitoring**: Health check and statistics endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Scraping**: Puppeteer
- **Validation**: express-validator
- **Logging**: Winston
- **Security**: Helmet.js
- **Containerization**: Docker & Docker Compose

## 📦 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 12
- npm >= 9.0.0
- Docker & Docker Compose (optional, for containerized deployment)

## 🚀 Installation

### Option 1: Local Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd car-listing-service
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up PostgreSQL database**
```bash
# Create database
createdb car_listings_db

# Or using psql
psql -U postgres
CREATE DATABASE car_listings_db;
\q
```

4. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Run database migrations**
```bash
npm run migrate
```

### Option 2: Docker Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd car-listing-service
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env if needed (Docker uses docker-compose.yml values)
```

3. **Start with Docker Compose**
```bash
docker-compose up -d
```

The application will be available at `http://localhost:3000`

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=car_listings_db
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_MAX_CONNECTIONS=20

# Scraper Configuration
SCRAPE_URL=https://www.facebook.com/marketplace/manila/cars?minPrice=350000&exact=false
SCRAPE_HEADLESS=true
SCRAPE_TIMEOUT=30000
MAX_LISTINGS_PER_SCRAPE=50

# Logging
LOG_LEVEL=info
```

## 🏃 Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Run Scraper Manually
```bash
npm run scrape
```

**Expected Output:**
```
[info]: === Starting scraping process ===
[info]: Initializing browser...
[info]: Browser initialized successfully
[info]: Navigating to: https://www.facebook.com/marketplace/manila/cars...
[info]: Scraped 24 raw listings
[info]: Processed 24 valid listings
[info]: Storing 24 listings in database...
[info]: Bulk upserted 24 listings
[info]: === Scraping completed: 24 listings stored ===
```

The scraper successfully extracts:
- ✅ Car titles (e.g., "2023 Toyota Land Cruiser")
- ✅ Prices in PHP (e.g., ₱4,500,000)
- ✅ Years (extracted from titles)
- ✅ Facebook Marketplace URLs
- ✅ Listing images
- ✅ Unique listing IDs

**Note**: Scraping runs may vary based on Facebook's content and anti-bot measures. The scraper includes retry logic and robust error handling.

### Run Migrations
```bash
npm run migrate
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5
}
```

---

#### 2. Get All Listings
```http
GET /api/listings
```

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Items per page
- `sortBy` (string): Sort field (`created_at`, `price`, `year`, `title`)
- `sortOrder` (string): `ASC` or `DESC`
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `minYear` (integer): Minimum year filter
- `maxYear` (integer): Maximum year filter
- `location` (string): Location filter (partial match)
- `search` (string): Search in title and description

**Example:**
```http
GET /api/listings?page=1&limit=20&minPrice=350000&maxPrice=1000000&sortBy=price&sortOrder=ASC
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "2020 Toyota Corolla Altis",
      "price": "850000.00",
      "currency": "PHP",
      "year": 2020,
      "mileage": "25,000 km",
      "location": "Manila",
      "source_url": "https://facebook.com/marketplace/item/...",
      "listing_id": "123456789",
      "image_url": "https://...",
      "description": "Well maintained...",
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z",
      "last_scraped_at": "2024-01-15T10:00:00.000Z",
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

#### 3. Get Single Listing
```http
GET /api/listings/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "2020 Toyota Corolla Altis",
    ...
  }
}
```

---

#### 4. Update Listing
```http
PUT /api/listings/:id
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "price": 800000,
  "year": 2020,
  "mileage": "30,000 km",
  "location": "Quezon City",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Listing updated successfully"
}
```

---

#### 5. Delete Listing (Soft Delete)
```http
DELETE /api/listings/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Listing deleted successfully"
}
```

---

#### 6. Trigger Scraping
```http
POST /api/scrape
```

**Response:**
```json
{
  "success": true,
  "message": "Scraping completed successfully",
  "count": 45
}
```

---

#### 7. Get Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_listings": 150,
    "active_listings": 145,
    "average_price": "750000.00",
    "min_price": "350000.00",
    "max_price": "2500000.00",
    "average_year": 2019,
    "unique_locations": 12
  }
}
```

---

### Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error message here",
  "errors": [] // For validation errors
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (validation error)
- `404`: Not Found
- `500`: Internal Server Error

## 🗄️ Database Schema

```sql
CREATE TABLE car_listings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'PHP',
    year INTEGER,
    mileage VARCHAR(100),
    location VARCHAR(255),
    source_url TEXT UNIQUE NOT NULL,
    listing_id VARCHAR(100),
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_car_listings_price ON car_listings(price);
CREATE INDEX idx_car_listings_year ON car_listings(year);
CREATE INDEX idx_car_listings_location ON car_listings(location);
CREATE INDEX idx_car_listings_created_at ON car_listings(created_at DESC);
CREATE INDEX idx_car_listings_is_active ON car_listings(is_active);
CREATE UNIQUE INDEX idx_car_listings_source_url ON car_listings(source_url);
```

## 📁 Project Structure

```
car-listing-service/
├── src/
│   ├── config/           # Configuration management
│   ├── controllers/      # Request handlers
│   ├── db/              # Database migrations
│   ├── middleware/       # Express middleware
│   ├── models/          # Data access layer
│   ├── routes/          # API routes
│   ├── scrapers/        # Web scraping logic
│   ├── services/        # Business logic layer
│   ├── utils/           # Utility functions
│   └── app.js           # Application entry point
├── tests/               # Test files
├── logs/                # Application logs
├── .env.example         # Environment variables template
├── .gitignore
├── docker-compose.yml   # Docker orchestration
├── Dockerfile           # Container definition
├── package.json
├── README.md
└── DOCUMENTATION.md     # Detailed documentation
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint
```

## 🚢 Deployment

### Docker Deployment

1. **Build and run with Docker Compose:**
```bash
docker-compose up -d
```

2. **View logs:**
```bash
docker-compose logs -f app
```

3. **Stop services:**
```bash
docker-compose down
```

### Manual Deployment

1. **Set environment to production:**
```bash
export NODE_ENV=production
```

2. **Install production dependencies:**
```bash
npm ci --only=production
```

3. **Run migrations:**
```bash
npm run migrate
```

4. **Start application:**
```bash
npm start
```

### Using PM2 (Recommended for Production)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/app.js --name "car-listing-service"

# Enable startup script
pm2 startup
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs car-listing-service
```

## 🔧 Troubleshooting

### Scraper Issues

**Problem**: Scraper returns no data or fewer listings
- **Solution**: Facebook's DOM structure occasionally changes. The scraper is designed to be resilient.
- Try running again - results vary based on available listings
- Check logs for specific errors
- Verify you have a stable internet connection

**Problem**: "Navigation timeout" error
- **Solution**: The scraper has built-in retry logic (3 attempts)
- Increase timeout in `.env`: `SCRAPE_TIMEOUT=60000`
- Check your internet connection
- Facebook might be rate-limiting - wait a few minutes and retry

**Problem**: Puppeteer fails to launch
- **Solution**: Install required dependencies:
```bash
# Ubuntu/Debian
sudo apt-get install -y chromium-browser

# Or use Docker which has all dependencies
```

### Database Issues

**Problem**: Cannot connect to database
- **Solution**: Check database is running:
```bash
pg_isready -h localhost -p 5432
```
- Verify credentials in `.env`
- Check if database exists

**Problem**: Migration fails
- **Solution**: Drop and recreate database:
```bash
dropdb car_listings_db
createdb car_listings_db
npm run migrate
```

### General Issues

**Problem**: Port 3000 already in use
- **Solution**: Change port in `.env` or kill existing process:
```bash
lsof -ti:3000 | xargs kill
```

## 📝 License

MIT

## 👨‍💻 Author

Your Name

## 🤝 Contributing

Contributions are welcome! Please read contributing guidelines before submitting PRs.

## 📞 Support

For issues and questions, please open an issue on GitHub.