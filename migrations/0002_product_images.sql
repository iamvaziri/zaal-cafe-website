-- Zaal product photos uploaded from the admin panel.
-- Additive only: creates one new table; the catalog and its history are not touched.
CREATE TABLE IF NOT EXISTS product_images (
  name TEXT PRIMARY KEY CHECK (name GLOB 'up-*' AND length(name) BETWEEN 8 AND 80),
  content_type TEXT NOT NULL CHECK (content_type IN ('image/webp', 'image/jpeg')),
  size INTEGER NOT NULL CHECK (size > 0 AND size <= 2000000),
  data_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
