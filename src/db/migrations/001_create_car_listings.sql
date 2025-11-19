-- Create car_listings table
-- This table stores scraped car listing data from Facebook Marketplace

CREATE TABLE IF NOT EXISTS car_listings (
    id SERIAL PRIMARY KEY,
    
    -- Core listing information
    title VARCHAR(500) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'PHP',
    
    -- Vehicle details
    year INTEGER,
    mileage VARCHAR(100), -- Stored as string to handle various formats (e.g., "50,000 km")
    location VARCHAR(255),
    
    -- Source metadata
    source_url TEXT UNIQUE NOT NULL, -- Prevents duplicate entries
    listing_id VARCHAR(100),
    
    -- Additional metadata
    image_url TEXT,
    description TEXT,
    
    -- Timestamps for tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Soft delete flag
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_car_listings_price ON car_listings(price);
CREATE INDEX IF NOT EXISTS idx_car_listings_year ON car_listings(year);
CREATE INDEX IF NOT EXISTS idx_car_listings_location ON car_listings(location);
CREATE INDEX IF NOT EXISTS idx_car_listings_created_at ON car_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_car_listings_is_active ON car_listings(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_car_listings_source_url ON car_listings(source_url);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_car_listings_updated_at 
    BEFORE UPDATE ON car_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for active listings only
CREATE OR REPLACE VIEW active_car_listings AS
SELECT * FROM car_listings
WHERE is_active = TRUE;

-- Add comments for documentation
COMMENT ON TABLE car_listings IS 'Stores car listing data scraped from Facebook Marketplace';
COMMENT ON COLUMN car_listings.source_url IS 'Unique URL of the listing - prevents duplicates';
COMMENT ON COLUMN car_listings.last_scraped_at IS 'Timestamp of when this listing was last updated by scraper';
COMMENT ON COLUMN car_listings.is_active IS 'Soft delete flag - FALSE if listing is no longer available';