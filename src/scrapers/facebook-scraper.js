const puppeteer = require('puppeteer');
const config = require('../config');
const logger = require('../utils/logger');
const CarListingModel = require('../models/car-listing');

/**
 * Facebook Marketplace Scraper
 * Uses Puppeteer to scrape car listings from Facebook Marketplace
 * 
 * Challenges:
 * - Facebook uses dynamic content loading (React)
 * - Anti-bot detection mechanisms
 * - Rate limiting
 * - Changing DOM structure
 */

class FacebookScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    try {
      logger.info('Initializing browser...');
      
      this.browser = await puppeteer.launch({
        headless: config.scraper.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ],
      });

      this.page = await this.browser.newPage();
      
      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Set extra headers to appear more like a real browser
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser', error);
      throw error;
    }
  }

  /**
   * Scrape car listings from Facebook Marketplace
   * @returns {Promise<Array>} Array of car listing objects
   */
  async scrape() {
    const listings = [];

    try {
      await this.initialize();

      logger.info(`Navigating to: ${config.scraper.url}`);
      
      // Navigate to the URL
      await this.page.goto(config.scraper.url, {
        waitUntil: 'networkidle2',
        timeout: config.scraper.timeout,
      });

      // Wait for content to load
      await this.page.waitForTimeout(5000);

      // Try to scroll to load more items (lazy loading)
      await this.autoScroll();

      // Extract listing data
      const scrapedData = await this.page.evaluate((maxListings) => {
        const results = [];
        
        // Facebook Marketplace uses dynamic class names, so we need to be flexible
        // This is a simplified version - actual selectors may need adjustment
        
        // Try multiple possible selectors for listing containers
        const possibleSelectors = [
          '[data-pagelet*="Marketplace"]',
          'div[role="main"] > div > div > div',
          'a[href*="/marketplace/item/"]',
        ];

        let listingElements = [];
        for (const selector of possibleSelectors) {
          listingElements = document.querySelectorAll(selector);
          if (listingElements.length > 0) break;
        }

        // Extract data from each listing (simplified - needs actual FB structure)
        Array.from(listingElements).slice(0, maxListings).forEach((element) => {
          try {
            // This is a placeholder structure
            // Real implementation needs to match actual Facebook DOM structure
            const titleElement = element.querySelector('span[dir="auto"]');
            const priceElement = element.querySelector('span[dir="auto"]');
            const linkElement = element.closest('a') || element.querySelector('a');
            
            if (titleElement && priceElement && linkElement) {
              const listing = {
                title: titleElement.textContent.trim(),
                price_raw: priceElement.textContent.trim(),
                url: linkElement.href,
              };

              // Only add if we have minimum required data
              if (listing.title && listing.price_raw && listing.url) {
                results.push(listing);
              }
            }
          } catch (err) {
            console.log('Error parsing listing element:', err);
          }
        });

        return results;
      }, config.scraper.maxListings);

      logger.info(`Scraped ${scrapedData.length} raw listings`);

      // Process and normalize the scraped data
      for (const item of scrapedData) {
        const listing = this.normalizeListingData(item);
        if (listing) {
          listings.push(listing);
        }
      }

      logger.info(`Processed ${listings.length} valid listings`);

    } catch (error) {
      logger.error('Scraping error', error);
      throw error;
    } finally {
      await this.cleanup();
    }

    return listings;
  }

  /**
   * Auto-scroll to load lazy-loaded content
   */
  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight >= 3000) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });

    await this.page.waitForTimeout(2000);
  }

  /**
   * Normalize and validate scraped data
   * @param {Object} rawData - Raw scraped data
   * @returns {Object|null} Normalized listing object or null
   */
  normalizeListingData(rawData) {
    try {
      // Extract price and currency
      const priceMatch = rawData.price_raw.match(/([A-Z]{3})?[\s₱$€£]*([\d,]+)/);
      if (!priceMatch) {
        logger.warn('Could not parse price', { rawData });
        return null;
      }

      const currency = priceMatch[1] || 'PHP';
      const price = parseFloat(priceMatch[2].replace(/,/g, ''));

      // Extract year from title if present
      const yearMatch = rawData.title.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

      // Extract mileage if present in title
      const mileageMatch = rawData.title.match(/(\d+[,.]?\d*)\s*(k|km|miles)/i);
      const mileage = mileageMatch ? mileageMatch[0] : null;

      return {
        title: rawData.title,
        price,
        currency,
        year,
        mileage,
        location: rawData.location || 'Manila', // Default location
        source_url: rawData.url,
        listing_id: this.extractListingId(rawData.url),
        image_url: rawData.image_url || null,
        description: rawData.description || null,
      };
    } catch (error) {
      logger.error('Error normalizing listing data', { error, rawData });
      return null;
    }
  }

  /**
   * Extract listing ID from URL
   * @param {string} url - Listing URL
   * @returns {string|null} Listing ID
   */
  extractListingId(url) {
    try {
      const match = url.match(/\/item\/(\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cleanup browser resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }
}

/**
 * Main scraping function with database persistence
 */
async function scrapeAndStore() {
  const scraper = new FacebookScraper();
  
  try {
    logger.info('=== Starting scraping process ===');
    
    const listings = await scraper.scrape();
    
    if (listings.length === 0) {
      logger.warn('No listings scraped');
      return { success: true, count: 0 };
    }

    // Store listings in database
    logger.info(`Storing ${listings.length} listings in database...`);
    const stored = await CarListingModel.bulkUpsert(listings);
    
    logger.info(`=== Scraping completed: ${stored.length} listings stored ===`);
    
    return {
      success: true,
      count: stored.length,
      listings: stored,
    };
  } catch (error) {
    logger.error('Scraping process failed', error);
    throw error;
  }
}

// Run scraper if executed directly
if (require.main === module) {
  scrapeAndStore()
    .then((result) => {
      logger.info('Scraper finished', result);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Scraper failed', error);
      process.exit(1);
    });
}

module.exports = {
  FacebookScraper,
  scrapeAndStore,
};