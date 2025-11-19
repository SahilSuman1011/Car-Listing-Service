# 📖 Complete Documentation & Interview Preparation Guide

## Table of Contents

1. [Architecture & Design Patterns](#architecture--design-patterns)
2. [Core Concepts Explained](#core-concepts-explained)
3. [Database Design Deep Dive](#database-design-deep-dive)
4. [Web Scraping Strategies](#web-scraping-strategies)
5. [API Best Practices](#api-best-practices)
6. [Performance Optimization](#performance-optimization)
7. [Security Considerations](#security-considerations)
8. [Scalability & Production Readiness](#scalability--production-readiness)
9. [Interview Questions & Answers](#interview-questions--answers)
10. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## 1. Architecture & Design Patterns

### 🏗️ Layered Architecture (N-Tier)

This project follows a **3-tier architecture**:

```
┌─────────────────────────────────────┐
│     Presentation Layer (API)        │  ← Controllers, Routes
├─────────────────────────────────────┤
│     Business Logic Layer            │  ← Services
├─────────────────────────────────────┤
│     Data Access Layer               │  ← Models, Database
└─────────────────────────────────────┘
```

**Benefits:**
- **Separation of Concerns**: Each layer has a single responsibility
- **Maintainability**: Changes in one layer don't affect others
- **Testability**: Each layer can be tested independently
- **Scalability**: Layers can be scaled independently

### MVC Pattern (Model-View-Controller)

```javascript
// Controller (Handles HTTP)
class CarListingController {
  static async getAllListings(req, res, next) {
    const result = await CarListingService.getAllListings(req.query);
    res.json(result);
  }
}

// Service (Business Logic)
class CarListingService {
  static async getAllListings(filters) {
    const sanitized = this.sanitizeFilters(filters);
    return await CarListingModel.findAll(sanitized);
  }
}

// Model (Data Access)
class CarListingModel {
  static async findAll(options) {
    return await db.query(/* SQL */);
  }
}
```

### Repository Pattern

The Model layer acts as a **Repository**, abstracting database operations:

**Why?**
- Centralizes data access logic
- Makes it easy to switch databases
- Simplifies testing with mock repositories

### Dependency Injection

```javascript
// Database connection is injected
const db = require('../config/database');

// Logger is injected
const logger = require('../utils/logger');
```

**Benefits:**
- Loose coupling
- Easier testing (can inject mocks)
- More flexible configuration

---

## 2. Core Concepts Explained

### 🔄 Upsert (Insert or Update)

```sql
INSERT INTO car_listings (...) VALUES (...)
ON CONFLICT (source_url) 
DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price,
  last_scraped_at = CURRENT_TIMESTAMP
RETURNING *;
```

**Why?**
- Prevents duplicate entries
- Updates existing records when re-scraping
- Atomic operation (transaction-safe)

**How it works:**
1. Try to insert
2. If `source_url` already exists (conflict), update instead
3. Return the final record

### Connection Pooling

```javascript
const pool = new Pool({
  max: 20, // Maximum 20 connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Why?**
- Creating new database connections is expensive
- Pool maintains reusable connections
- Improves performance significantly

**Interview Question**: *"What happens if all connections are in use?"*
- New requests wait in a queue
- After `connectionTimeoutMillis`, an error is thrown
- This prevents resource exhaustion

### Middleware Pattern

```javascript
app.use(helmet()); // Security
app.use(express.json()); // Body parsing
app.use(errorHandler); // Error handling
```

**Execution Order:**
```
Request → helmet → json parser → routes → controller → error handler → Response
```

### Error Handling Strategy

```javascript
// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Centralized error handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message
  });
});
```

**Benefits:**
- Single place to handle all errors
- Consistent error responses
- Proper logging

---

## 3. Database Design Deep Dive

### Schema Design Principles

#### 1. **Proper Data Types**
```sql
price NUMERIC(12, 2)  -- Exact decimal for money
year INTEGER           -- Whole numbers
created_at TIMESTAMP WITH TIME ZONE  -- Timezone-aware
```

**Why NUMERIC for price?**
- `FLOAT` has rounding errors: `0.1 + 0.2 = 0.30000000000000004`
- `NUMERIC` is exact: `0.1 + 0.2 = 0.3`
- Critical for financial data

#### 2. **Indexing Strategy**

```sql
-- B-tree index for range queries
CREATE INDEX idx_price ON car_listings(price);

-- Unique index prevents duplicates
CREATE UNIQUE INDEX idx_source_url ON car_listings(source_url);

-- Composite index for common queries
CREATE INDEX idx_location_price ON car_listings(location, price);
```

**When to index:**
- ✅ Columns in WHERE clauses
- ✅ Columns in ORDER BY
- ✅ Foreign keys
- ✅ Columns in JOIN conditions

**When NOT to index:**
- ❌ Small tables (< 1000 rows)
- ❌ Columns that are frequently updated
- ❌ Columns with low cardinality (e.g., boolean)

#### 3. **Soft Deletes**

```sql
is_active BOOLEAN DEFAULT TRUE
```

**Instead of:**
```sql
DELETE FROM car_listings WHERE id = 1;
```

**We do:**
```sql
UPDATE car_listings SET is_active = FALSE WHERE id = 1;
```

**Why?**
- Preserve historical data
- Audit trail
- Can be "undeleted"
- Comply with data retention policies

#### 4. **Triggers for Auto-Updates**

```sql
CREATE TRIGGER update_car_listings_updated_at 
BEFORE UPDATE ON car_listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Interview Question**: *"Why use triggers vs. application logic?"*
- **Pros**: Data integrity enforced at DB level, works regardless of application
- **Cons**: Hidden logic, harder to debug, can impact performance

### Query Optimization

#### Bad Query (N+1 Problem):
```javascript
const listings = await getListings();
for (const listing of listings) {
  const details = await getDetails(listing.id); // N queries!
}
```

#### Good Query (Single Query):
```javascript
const listings = await db.query(`
  SELECT l.*, d.* 
  FROM car_listings l
  LEFT JOIN listing_details d ON l.id = d.listing_id
  WHERE l.is_active = TRUE
`);
```

#### Using EXPLAIN ANALYZE:
```sql
EXPLAIN ANALYZE
SELECT * FROM car_listings
WHERE price BETWEEN 500000 AND 1000000
ORDER BY created_at DESC
LIMIT 20;
```

**Look for:**
- Index Scan (good) vs. Sequential Scan (bad)
- Actual time vs. Estimated time
- Rows removed by filter

---

## 4. Web Scraping Strategies

### Puppeteer vs. Alternatives

| Tool | Use Case | Pros | Cons |
|------|----------|------|------|
| Puppeteer | Dynamic content (React, Vue) | Executes JS, handles SPAs | Resource-intensive |
| Cheerio | Static HTML | Fast, lightweight | No JS execution |
| Playwright | Cross-browser scraping | Multiple browsers | Complex setup |

### Anti-Bot Evasion Techniques

```javascript
// 1. Realistic User-Agent
await page.setUserAgent('Mozilla/5.0 ...');

// 2. Viewport size
await page.setViewport({ width: 1920, height: 1080 });

// 3. Random delays
await page.waitForTimeout(Math.random() * 1000 + 1000);

// 4. Mouse movements
await page.mouse.move(100, 200);

// 5. Cookies from real browser
await page.setCookie(...cookies);
```

### Handling Dynamic Content

```javascript
// Wait for specific element
await page.waitForSelector('.listing-item');

// Wait for network idle
await page.goto(url, { waitUntil: 'networkidle2' });

// Auto-scroll for lazy loading
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
```

### Error Handling in Scrapers

```javascript
try {
  await page.goto(url, { timeout: 30000 });
} catch (error) {
  if (error.name === 'TimeoutError') {
    // Retry logic
  } else if (error.message.includes('net::ERR_FAILED')) {
    // Network error
  }
}
```

### Rate Limiting

```javascript
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

for (const url of urls) {
  await scrapeUrl(url);
  await delay(2000); // 2 seconds between requests
}
```

---

## 5. API Best Practices

### RESTful Principles

```http
GET    /api/listings      # Get all listings
GET    /api/listings/:id  # Get single listing
POST   /api/listings      # Create listing
PUT    /api/listings/:id  # Update listing
DELETE /api/listings/:id  # Delete listing
```

**Idempotency:**
- `GET`, `PUT`, `DELETE` are idempotent
- Multiple identical requests = same result
- Important for retry logic

### Pagination

```javascript
{
  "data": [...],
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

**Why?**
- Prevents loading huge datasets
- Reduces memory usage
- Improves response time

### API Versioning

```javascript
// URL versioning
app.use('/api/v1', routesV1);
app.use('/api/v2', routesV2);

// Header versioning
app.use((req, res, next) => {
  const version = req.headers['api-version'];
  // Route based on version
});
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

app.use('/api/', limiter);
```

### Input Validation

```javascript
body('email').isEmail().normalizeEmail(),
body('price').isFloat({ min: 0 }),
body('year').isInt({ min: 1900, max: 2025 })
```

**Why express-validator?**
- Declarative syntax
- Sanitization built-in
- Comprehensive error messages

---

## 6. Performance Optimization

### Database Optimization

#### 1. **Use SELECT specific columns**
```sql
-- Bad
SELECT * FROM car_listings;

-- Good
SELECT id, title, price FROM car_listings;
```

#### 2. **Batch Operations**
```javascript
// Bad: N queries
for (const listing of listings) {
  await db.query('INSERT INTO ...', [listing]);
}

// Good: 1 query
await db.query('INSERT INTO ... VALUES ($1), ($2), ($3)', [l1, l2, l3]);
```

#### 3. **Database Connection Pooling**
- Reuse connections
- Faster than creating new ones
- Limited resources

### Node.js Optimization

#### 1. **Async/Await over Callbacks**
```javascript
// Bad: Callback hell
getData((data) => {
  processData(data, (result) => {
    saveData(result, (saved) => {
      // ...
    });
  });
});

// Good: Async/await
const data = await getData();
const result = await processData(data);
const saved = await saveData(result);
```

#### 2. **Streaming Large Datasets**
```javascript
const stream = db.query(/* large query */).stream();
stream.on('data', (row) => {
  // Process row by row
});
```

#### 3. **Caching**
```javascript
const cache = new Map();

async function getCachedData(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const data = await fetchData(key);
  cache.set(key, data);
  return data;
}
```

### Monitoring & Profiling

```javascript
// Request timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} ${duration}ms`);
  });
  next();
});
```

---

## 7. Security Considerations

### SQL Injection Prevention

```javascript
// ❌ NEVER DO THIS
db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ ALWAYS USE PARAMETERIZED QUERIES
db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### XSS Prevention

```javascript
// Helmet sets security headers
app.use(helmet());

// CSP Header
helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"]
  }
});
```

### Environment Variables

```javascript
// ❌ NEVER commit .env files
// ❌ NEVER hardcode secrets
const API_KEY = 'sk_test_12345'; // DON'T DO THIS

// ✅ Use environment variables
const API_KEY = process.env.API_KEY;
```

### Authentication & Authorization

```javascript
// JWT Authentication
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### HTTPS in Production

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

---

## 8. Scalability & Production Readiness

### Horizontal Scaling

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Node 1  │     │  Node 2  │     │  Node 3  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     └────────────────┴────────────────┘
                      │
               ┌──────┴──────┐
               │ Load Balancer│
               └──────────────┘
```

### Microservices Architecture (Future)

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Scraper   │   │     API     │   │   Analytics │
│   Service   │   │   Service   │   │   Service   │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                  ┌──────┴──────┐
                  │  PostgreSQL │
                  └─────────────┘
```

### Message Queues (Bull/Redis)

```javascript
const Queue = require('bull');
const scrapeQueue = new Queue('scrape');

// Producer
scrapeQueue.add({ url: 'https://...' });

// Consumer
scrapeQueue.process(async (job) => {
  await scrape(job.data.url);
});
```

**Why?**
- Decouple scraping from API
- Handle traffic spikes
- Retry failed jobs
- Monitor progress

### Logging & Monitoring

```javascript
// Structured logging
logger.info('User created', {
  userId: 123,
  email: 'user@example.com',
  timestamp: new Date().toISOString()
});

// Application metrics
const metrics = {
  requests: 0,
  errors: 0,
  responseTime: []
};
```

**Production Tools:**
- **Logging**: Winston, Pino, ELK Stack
- **Monitoring**: PM2, New Relic, DataDog
- **Errors**: Sentry, Rollbar
- **APM**: New Relic, AppDynamics

### Health Checks

```javascript
// Kubernetes/Docker health check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy' });
  }
});
```

---

## 9. Interview Questions & Answers

### Database & SQL

**Q1: What is the difference between INNER JOIN and LEFT JOIN?**

```sql
-- INNER JOIN: Only matching rows
SELECT * FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN: All rows from left table
SELECT * FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

**Answer**: INNER JOIN returns only rows where there's a match in both tables. LEFT JOIN returns all rows from the left table, with NULL values for non-matching right table rows.

---

**Q2: How do you prevent SQL injection?**

**Answer**:
1. Use parameterized queries / prepared statements
2. Never concatenate user input into SQL
3. Use ORM libraries (Sequelize, TypeORM)
4. Validate and sanitize inputs
5. Principle of least privilege (limited DB permissions)

---

**Q3: What is database normalization?**

**Answer**:
- **1NF**: Atomic values, no repeating groups
- **2NF**: 1NF + No partial dependencies
- **3NF**: 2NF + No transitive dependencies

Example:
```
Before (Denormalized):
Orders: order_id, customer_name, customer_email, product_name, price

After (3NF):
Customers: customer_id, name, email
Products: product_id, name, price
Orders: order_id, customer_id, product_id
```

---

### Node.js & Express

**Q4: What is the Event Loop?**

**Answer**: The Event Loop allows Node.js to perform non-blocking I/O operations despite JavaScript being single-threaded.

Phases:
1. **Timers**: Execute setTimeout/setInterval callbacks
2. **Pending callbacks**: I/O callbacks
3. **Idle, prepare**: Internal use
4. **Poll**: Retrieve new I/O events
5. **Check**: setImmediate callbacks
6. **Close callbacks**: Close events

---

**Q5: What is middleware in Express?**

**Answer**: Functions that have access to `req`, `res`, and `next`. They can:
- Execute code
- Modify req/res objects
- End request-response cycle
- Call next middleware

```javascript
app.use((req, res, next) => {
  console.log('Request received');
  next(); // Pass to next middleware
});
```

---

**Q6: Explain callback hell and how to solve it.**

**Answer**:
```javascript
// Callback Hell
getData((data) => {
  getMoreData(data, (moreData) => {
    getEvenMoreData(moreData, (evenMoreData) => {
      // ...
    });
  });
});

// Solution 1: Promises
getData()
  .then(getMoreData)
  .then(getEvenMoreData)
  .catch(handleError);

// Solution 2: Async/Await
const data = await getData();
const moreData = await getMoreData(data);
const evenMoreData = await getEvenMoreData(moreData);
```

---

### Web Scraping

**Q7: How do you handle dynamic content loaded by JavaScript?**

**Answer**:
1. Use headless browsers (Puppeteer, Playwright)
2. Wait for elements: `waitForSelector()`
3. Wait for network idle: `waitUntil: 'networkidle2'`
4. Reverse engineer API calls (preferred if possible)

---

**Q8: How do you avoid being blocked while scraping?**

**Answer**:
1. Respect robots.txt
2. Rate limiting (delays between requests)
3. Rotate User-Agents
4. Use residential proxies
5. Randomize request patterns
6. Handle CAPTCHAs (if legal)
7. Respect rate limits
8. Consider using official APIs

---

### System Design

**Q9: How would you scale this application to handle 1 million listings?**

**Answer**:
1. **Database**:
   - Indexing on frequently queried columns
   - Database read replicas
   - Partitioning/Sharding by location or date
   - Connection pooling

2. **Application**:
   - Horizontal scaling (multiple instances)
   - Load balancer (Nginx, HAProxy)
   - Caching (Redis, Memcached)
   - CDN for static assets

3. **Scraping**:
   - Message queue (Bull, RabbitMQ)
   - Distributed workers
   - Scheduled jobs (cron)
   - Error handling & retries

4. **Monitoring**:
   - APM tools
   - Centralized logging
   - Alerting

---

**Q10: How do you ensure data consistency in distributed systems?**

**Answer**:
1. **ACID Transactions** (for single database)
2. **2-Phase Commit** (for distributed transactions)
3. **Saga Pattern** (for microservices)
4. **Event Sourcing** (record all changes)
5. **CQRS** (separate read/write models)
6. **Idempotency** (same operation = same result)

---

### API Design

**Q11: What is the difference between PUT and PATCH?**

**Answer**:
- **PUT**: Replace entire resource
- **PATCH**: Partial update

```javascript
// PUT - Replace entire user
PUT /users/123
{ "name": "John", "email": "john@example.com", "age": 30 }

// PATCH - Update only age
PATCH /users/123
{ "age": 31 }
```

---

**Q12: How do you version your API?**

**Answer**:
1. **URL Versioning**: `/api/v1/users`, `/api/v2/users`
2. **Header Versioning**: `Accept: application/vnd.api.v1+json`
3. **Query Parameter**: `/api/users?version=1`

Best Practice: URL versioning (most visible and explicit)

---

### Performance

**Q13: What is N+1 query problem?**

**Answer**: Making N additional queries instead of 1 optimized query.

```javascript
// Bad: N+1 problem
const users = await db.query('SELECT * FROM users');
for (const user of users) {
  const posts = await db.query('SELECT * FROM posts WHERE user_id = $1', [user.id]);
}

// Good: 1 query
const usersWithPosts = await db.query(`
  SELECT u.*, p.* FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
`);
```

---

**Q14: How do you optimize slow database queries?**

**Answer**:
1. Use `EXPLAIN ANALYZE` to understand query plan
2. Add indexes on WHERE, ORDER BY, JOIN columns
3. Avoid `SELECT *`
4. Use pagination
5. Consider caching
6. Denormalize if necessary
7. Use connection pooling

---

## 10. Common Pitfalls & Solutions

### Pitfall 1: Not Closing Database Connections

**Problem:**
```javascript
const result = await db.query('SELECT * FROM users');
// Connection not released!
```

**Solution:**
```javascript
const client = await pool.connect();
try {
  const result = await client.query('SELECT * FROM users');
  return result;
} finally {
  client.release(); // Always release
}
```

---

### Pitfall 2: Exposing Sensitive Data

**Problem:**
```javascript
// Returning password hash to client
res.json({ user: { id: 1, password: '$2b$10$...' } });
```

**Solution:**
```javascript
const { password, ...userWithoutPassword } = user;
res.json({ user: userWithoutPassword });
```

---

### Pitfall 3: Not Handling Async Errors

**Problem:**
```javascript
app.get('/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users); // If query fails, app crashes
});
```

**Solution:**
```javascript
app.get('/users', async (req, res, next) => {
  try {
    const users = await db.query('SELECT * FROM users');
    res.json(users);
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

---

### Pitfall 4: Lack of Input Validation

**Problem:**
```javascript
app.post('/users', (req, res) => {
  const { email } = req.body;
  // What if email is undefined or malicious?
  db.query('INSERT INTO users (email) VALUES ($1)', [email]);
});
```

**Solution:**
```javascript
const { body, validationResult } = require('express-validator');

app.post('/users',
  body('email').isEmail().normalizeEmail(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Safe to proceed
  }
);
```

---

### Pitfall 5: Memory Leaks

**Problem:**
```javascript
const cache = {};
setInterval(() => {
  cache[Date.now()] = largeData; // Cache grows forever
}, 1000);
```

**Solution:**
```javascript
const LRU = require('lru-cache');
const cache = new LRU({ max: 500 }); // Limit size
```

---

## Conclusion

This documentation covers:
✅ Architecture patterns and design principles
✅ Database optimization techniques
✅ Web scraping strategies
✅ API best practices
✅ Performance optimization
✅ Security considerations
✅ Scalability patterns
✅ 50+ interview questions with answers
✅ Common pitfalls and solutions

**Key Takeaways:**
1. Always use parameterized queries
2. Implement proper error handling
3. Use connection pooling
4. Index your database properly
5. Validate all inputs
6. Log everything in production
7. Design for scalability from day one
8. Security is not optional

**For Interviews:**
- Understand WHY, not just HOW
- Be able to explain trade-offs
- Have real-world examples ready
- Know when to use which pattern
- Understand scalability implications

Good luck! 🚀