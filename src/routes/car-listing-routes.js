const express = require('express');
const CarListingController = require('../controllers/car-listing-controller');
const {
  validateUpdateListing,
  validateGetById,
  validateQueryParams,
} = require('../middleware/validator');

const router = express.Router();

/**
 * API Routes for Car Listings
 * RESTful API endpoints
 */

// Health check
router.get('/health', CarListingController.healthCheck);

// Statistics
router.get('/stats', CarListingController.getStatistics);

// Trigger scraping
router.post('/scrape', CarListingController.triggerScraping);

// CRUD operations for listings
router.get('/listings', validateQueryParams, CarListingController.getAllListings);
router.get('/listings/:id', validateGetById, CarListingController.getListingById);
router.put('/listings/:id', validateUpdateListing, CarListingController.updateListing);
router.delete('/listings/:id', validateGetById, CarListingController.deleteListing);

module.exports = router;