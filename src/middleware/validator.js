const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation Middleware
 * Uses express-validator for request validation
 */

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

/**
 * Validation rules for updating a listing
 */
const validateUpdateListing = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Title must be between 3 and 500 characters'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 10 })
    .withMessage('Currency must be between 3 and 10 characters'),
  
  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be a valid year'),
  
  body('mileage')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Mileage must be less than 100 characters'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  
  handleValidationErrors,
];

/**
 * Validation rules for getting a listing by ID
 */
const validateGetById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Validation rules for query parameters
 */
const validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['created_at', 'price', 'year', 'title'])
    .withMessage('Invalid sortBy field'),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Sort order must be ASC or DESC'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a positive number'),
  
  query('minYear')
    .optional()
    .isInt({ min: 1900 })
    .withMessage('Min year must be a valid year'),
  
  query('maxYear')
    .optional()
    .isInt({ min: 1900 })
    .withMessage('Max year must be a valid year'),
  
  query('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search query must be less than 255 characters'),
  
  handleValidationErrors,
];

module.exports = {
  validateUpdateListing,
  validateGetById,
  validateQueryParams,
  handleValidationErrors,
};