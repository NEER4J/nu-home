-- Create ev_vehicle_brand table
CREATE TABLE IF NOT EXISTS "ev_vehicle_brand" (
  brand_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name VARCHAR(255) NOT NULL,
  brand_image_url TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(brand_name)
);

-- Create index for brand lookups
CREATE INDEX IF NOT EXISTS idx_ev_vehicle_brand_name ON "ev_vehicle_brand"(brand_name);
CREATE INDEX IF NOT EXISTS idx_ev_vehicle_brand_active ON "ev_vehicle_brand"(is_active);

-- Create ev_vehicle_model table
CREATE TABLE IF NOT EXISTS "ev_vehicle_model" (
  model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES "ev_vehicle_brand"(brand_id) ON DELETE CASCADE,
  model_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(brand_id, model_name)
);

-- Create indexes for model lookups
CREATE INDEX IF NOT EXISTS idx_ev_vehicle_model_brand ON "ev_vehicle_model"(brand_id);
CREATE INDEX IF NOT EXISTS idx_ev_vehicle_model_name ON "ev_vehicle_model"(model_name);
CREATE INDEX IF NOT EXISTS idx_ev_vehicle_model_active ON "ev_vehicle_model"(is_active);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_ev_vehicle_brand_updated_at
  BEFORE UPDATE ON "ev_vehicle_brand"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ev_vehicle_model_updated_at
  BEFORE UPDATE ON "ev_vehicle_model"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
