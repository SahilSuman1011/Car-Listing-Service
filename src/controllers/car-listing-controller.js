const CarListingService = require('../services/car-listing-service');
const logger = require('../utils/logger');

/**
 * Car Listing Controller
 * Handles HTTP requests and responses
 * Follows MVC pattern
 */

class CarListingController {
  /**
   * GET /api/listings
   * Get all listings with filters and pagination
   */
  static async getAllListings(req, res, next) {
    try {
      const filters = req.query;
      const result = await CarListingService.getAllListings(filters);
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/listings/:id
   * Get a single listing by ID
   */
  static async getListingById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await CarListingService.getListingById(parseInt(id, 10));
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/listings/:id
   * Update a listing
   */
  static async updateListing(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const result = await CarListingService.updateListing(parseInt(id, 10), updates);
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/listings/:id
   * Delete a listing (soft delete)
   */
  static async deleteListing(req, res, next) {
    try {
      const { id } = req.params;
      const result = await CarListingService.deleteListing(parseInt(id, 10));
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/scrape
   * Trigger the scraping process
   */
  static async triggerScraping(req, res, next) {
    try {
      // Start scraping asynchronously
      // In production, this should use a job queue (Bull, Bee-Queue, etc.)
      const result = await CarListingService.triggerScraping();
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stats
   * Get statistics about listings
   */
  static async getStatistics(req, res, next) {
    try {
      const result = await CarListingService.getStatistics();
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/health
   * Health check endpoint
   */
  static async healthCheck(req, res) {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
}

module.exports = CarListingController;