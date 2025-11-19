const CarListingModel = require('../models/car-listing');
const logger = require('../utils/logger');
const { scrapeAndStore } = require('../scrapers/facebook-scraper');

/**
 * Car Listing Service Layer
 * Business logic layer between controllers and models
 * Handles data validation, transformation, and orchestration
 */

class CarListingService {
  /**
   * Get all listings with filters and pagination
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Paginated listings
   */
  static async getAllListings(filters) {
    try {
      // Validate and sanitize filters
      const sanitizedFilters = this.sanitizeFilters(filters);
      
      // Fetch from database
      const result = await CarListingModel.findAll(sanitizedFilters);
      
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      logger.error('Error in getAllListings', error);
      throw new Error('Failed to fetch listings');
    }
  }

  /**
   * Get a single listing by ID
   * @param {number} id - Listing ID
   * @returns {Promise<Object>} Listing object
   */
  static async getListingById(id) {
    try {
      const listing = await CarListingModel.findById(id);
      
      if (!listing) {
        const error = new Error('Listing not found');
        error.status = 404;
        throw error;
      }

      return {
        success: true,
        data: listing,
      };
    } catch (error) {
      logger.error('Error in getListingById', { id, error });
      throw error;
    }
  }

  /**
   * Update a listing
   * @param {number} id - Listing ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated listing
   */
  static async updateListing(id, updates) {
    try {
      // Validate updates
      this.validateUpdateData(updates);

      const listing = await CarListingModel.update(id, updates);
      
      if (!listing) {
        const error = new Error('Listing not found or inactive');
        error.status = 404;
        throw error;
      }

      return {
        success: true,
        data: listing,
        message: 'Listing updated successfully',
      };
    } catch (error) {
      logger.error('Error in updateListing', { id, error });
      throw error;
    }
  }

  /**
   * Delete a listing (soft delete)
   * @param {number} id - Listing ID
   * @returns {Promise<Object>} Success response
   */
  static async deleteListing(id) {
    try {
      const deleted = await CarListingModel.delete(id);
      
      if (!deleted) {
        const error = new Error('Listing not found');
        error.status = 404;
        throw error;
      }

      return {
        success: true,
        message: 'Listing deleted successfully',
      };
    } catch (error) {
      logger.error('Error in deleteListing', { id, error });
      throw error;
    }
  }

  /**
   * Trigger scraping process
   * @returns {Promise<Object>} Scraping result
   */
  static async triggerScraping() {
    try {
      logger.info('Triggering scraping process...');
      const result = await scrapeAndStore();
      
      return {
        success: true,
        message: 'Scraping completed successfully',
        count: result.count,
      };
    } catch (error) {
      logger.error('Error in triggerScraping', error);
      throw new Error('Scraping process failed');
    }
  }

  /**
   * Get statistics about listings
   * @returns {Promise<Object>} Statistics
   */
  static async getStatistics() {
    try {
      const stats = await CarListingModel.getStats();
      
      return {
        success: true,
        data: {
          total_listings: parseInt(stats.total_listings, 10),
          active_listings: parseInt(stats.active_listings, 10),
          average_price: parseFloat(stats.avg_price || 0).toFixed(2),
          min_price: parseFloat(stats.min_price || 0),
          max_price: parseFloat(stats.max_price || 0),
          average_year: stats.avg_year ? Math.round(stats.avg_year) : null,
          unique_locations: parseInt(stats.unique_locations, 10),
        },
      };
    } catch (error) {
      logger.error('Error in getStatistics', error);
      throw new Error('Failed to fetch statistics');
    }
  }

  /**
   * Sanitize and validate filter parameters
   * @param {Object} filters - Raw filters
   * @returns {Object} Sanitized filters
   */
  static sanitizeFilters(filters) {
    const sanitized = {};

    // Pagination
    if (filters.page) {
      sanitized.page = Math.max(1, parseInt(filters.page, 10) || 1);
    }
    if (filters.limit) {
      sanitized.limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    }

    // Sorting
    const allowedSortFields = ['created_at', 'price', 'year', 'title'];
    if (filters.sortBy && allowedSortFields.includes(filters.sortBy)) {
      sanitized.sortBy = filters.sortBy;
    }
    if (filters.sortOrder && ['ASC', 'DESC'].includes(filters.sortOrder.toUpperCase())) {
      sanitized.sortOrder = filters.sortOrder.toUpperCase();
    }

    // Filters
    if (filters.minPrice) {
      sanitized.minPrice = parseFloat(filters.minPrice);
    }
    if (filters.maxPrice) {
      sanitized.maxPrice = parseFloat(filters.maxPrice);
    }
    if (filters.minYear) {
      sanitized.minYear = parseInt(filters.minYear, 10);
    }
    if (filters.maxYear) {
      sanitized.maxYear = parseInt(filters.maxYear, 10);
    }
    if (filters.location) {
      sanitized.location = filters.location.trim();
    }
    if (filters.search) {
      sanitized.search = filters.search.trim();
    }
    if (filters.isActive !== undefined) {
      sanitized.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    return sanitized;
  }

  /**
   * Validate update data
   * @param {Object} updates - Update data
   * @throws {Error} If validation fails
   */
  static validateUpdateData(updates) {
    if (updates.price !== undefined) {
      const price = parseFloat(updates.price);
      if (isNaN(price) || price < 0) {
        throw new Error('Invalid price value');
      }
      updates.price = price;
    }

    if (updates.year !== undefined) {
      const year = parseInt(updates.year, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 1) {
        throw new Error('Invalid year value');
      }
      updates.year = year;
    }

    if (updates.title !== undefined && updates.title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }
  }
}

module.exports = CarListingService;