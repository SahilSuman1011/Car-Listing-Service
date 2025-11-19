const db = require('../config/database');
const logger = require('../utils/logger');


class CarListingModel {
  /**
   * Create a new car listing or update if exists (upsert)
   * @param {Object} listing - Car listing data
   * @returns {Promise<Object>} Created or updated listing
   */
  static async upsert(listing) {
    const {
      title,
      price,
      currency = 'PHP',
      year,
      mileage,
      location,
      source_url,
      listing_id,
      image_url,
      description,
    } = listing;

    const query = `
      INSERT INTO car_listings (
        title, price, currency, year, mileage, location,
        source_url, listing_id, image_url, description,
        last_scraped_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (source_url) 
      DO UPDATE SET
        title = EXCLUDED.title,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        year = EXCLUDED.year,
        mileage = EXCLUDED.mileage,
        location = EXCLUDED.location,
        listing_id = EXCLUDED.listing_id,
        image_url = EXCLUDED.image_url,
        description = EXCLUDED.description,
        last_scraped_at = CURRENT_TIMESTAMP,
        is_active = TRUE
      RETURNING *;
    `;

    try {
      const result = await db.query(query, [
        title, price, currency, year, mileage, location,
        source_url, listing_id, image_url, description
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error upserting car listing', { error: error.message, listing });
      throw error;
    }
  }

  /**
   * Bulk upsert multiple listings
   * @param {Array} listings - Array of car listing objects
   * @returns {Promise<Array>} Array of created/updated listings
   */
  static async bulkUpsert(listings) {
    const client = await db.getClient();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const listing of listings) {
        const result = await this.upsert(listing);
        results.push(result);
      }

      await client.query('COMMIT');
      logger.info(`Bulk upserted ${results.length} listings`);
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error in bulk upsert', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find all listings with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      minPrice,
      maxPrice,
      minYear,
      maxYear,
      location,
      search,
      isActive = true,
    } = options;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramCount = 1;

    // Build WHERE clause
    if (isActive !== undefined) {
      conditions.push(`is_active = $${paramCount++}`);
      params.push(isActive);
    }

    if (minPrice) {
      conditions.push(`price >= $${paramCount++}`);
      params.push(minPrice);
    }

    if (maxPrice) {
      conditions.push(`price <= $${paramCount++}`);
      params.push(maxPrice);
    }

    if (minYear) {
      conditions.push(`year >= $${paramCount++}`);
      params.push(minYear);
    }

    if (maxYear) {
      conditions.push(`year <= $${paramCount++}`);
      params.push(maxYear);
    }

    if (location) {
      conditions.push(`location ILIKE $${paramCount++}`);
      params.push(`%${location}%`);
    }

    if (search) {
      conditions.push(`(title ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM car_listings ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM car_listings
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const dataResult = await db.query(dataQuery, params);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Find a single listing by ID
   * @param {number} id - Listing ID
   * @returns {Promise<Object|null>} Listing object or null
   */
  static async findById(id) {
    const query = 'SELECT * FROM car_listings WHERE id = $1 AND is_active = TRUE';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update a listing
   * @param {number} id - Listing ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated listing or null
   */
  static async update(id, updates) {
    const allowedFields = ['title', 'price', 'currency', 'year', 'mileage', 'location', 'description', 'image_url'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClauses = fields.map((field, index) => `${field} = $${index + 2}`);
    const query = `
      UPDATE car_listings
      SET ${setClauses.join(', ')}
      WHERE id = $1 AND is_active = TRUE
      RETURNING *;
    `;

    const values = [id, ...fields.map(field => updates[field])];
    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Soft delete a listing
   * @param {number} id - Listing ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const query = 'UPDATE car_listings SET is_active = FALSE WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Get statistics about listings
   * @returns {Promise<Object>} Statistics object
   */
  static async getStats() {
    const query = `
      SELECT
        COUNT(*) as total_listings,
        COUNT(*) FILTER (WHERE is_active = TRUE) as active_listings,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(year) as avg_year,
        COUNT(DISTINCT location) as unique_locations
      FROM car_listings;
    `;

    const result = await db.query(query);
    return result.rows[0];
  }
}

module.exports = CarListingModel;