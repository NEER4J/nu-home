-- Create PartnerKeyPoints table
CREATE TABLE IF NOT EXISTS "PartnerKeyPoints" (
    key_point_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES "UserProfiles"(user_id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL, -- Icon name from Lucide React
    position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4), -- Position 1-4
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS partner_key_points_partner_id_idx ON "PartnerKeyPoints"(partner_id);
CREATE INDEX IF NOT EXISTS partner_key_points_active_idx ON "PartnerKeyPoints"(is_active);
CREATE INDEX IF NOT EXISTS partner_key_points_position_idx ON "PartnerKeyPoints"(position);

-- Create unique constraint to ensure only one key point per position per partner
CREATE UNIQUE INDEX IF NOT EXISTS partner_key_points_partner_position_unique 
ON "PartnerKeyPoints"(partner_id, position) WHERE is_active = true;
