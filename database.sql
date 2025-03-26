-- Partner Products Table
CREATE TABLE IF NOT EXISTS "PartnerProducts" (
    partner_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    base_product_id UUID REFERENCES "Products"(product_id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2),
    image_url TEXT,
    service_category_id UUID NOT NULL REFERENCES "ServiceCategories"(service_category_id) ON DELETE RESTRICT,
    specifications JSONB DEFAULT '{}'::JSONB,
    product_fields JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on partner_id
CREATE INDEX IF NOT EXISTS partner_products_partner_id_idx ON "PartnerProducts"(partner_id);

-- Create index on service_category_id
CREATE INDEX IF NOT EXISTS partner_products_category_id_idx ON "PartnerProducts"(service_category_id);

-- Create index on base_product_id
CREATE INDEX IF NOT EXISTS partner_products_base_product_id_idx ON "PartnerProducts"(base_product_id);

-- Enable Row Level Security
ALTER TABLE "PartnerProducts" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for PartnerProducts
-- Partners can only see their own products
CREATE POLICY partner_products_select_policy ON "PartnerProducts" 
    FOR SELECT USING (
        auth.uid() = partner_id OR 
        auth.uid() IN (SELECT user_id FROM "UserProfiles" WHERE role = 'admin')
    );

-- Partners can only insert their own products
CREATE POLICY partner_products_insert_policy ON "PartnerProducts" 
    FOR INSERT WITH CHECK (
        auth.uid() = partner_id
    );

-- Partners can only update their own products
CREATE POLICY partner_products_update_policy ON "PartnerProducts" 
    FOR UPDATE USING (
        auth.uid() = partner_id
    );

-- Partners can only delete their own products
CREATE POLICY partner_products_delete_policy ON "PartnerProducts" 
    FOR DELETE USING (
        auth.uid() = partner_id
    );

-- Add trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_partner_products_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_partner_products_timestamp
BEFORE UPDATE ON "PartnerProducts"
FOR EACH ROW
EXECUTE FUNCTION update_partner_products_modified_column(); 