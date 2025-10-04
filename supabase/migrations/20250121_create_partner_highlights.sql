-- Create PartnerHighlights table for storing partner-specific highlight messages
-- This table will store special points, offers, or announcements that appear in the header

CREATE TABLE IF NOT EXISTS "PartnerHighlights" (
    highlight_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    highlight_type VARCHAR(50) NOT NULL DEFAULT 'info', -- info, success, warning, offer
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher numbers = higher priority
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    link_url TEXT, -- Optional link for the highlight
    link_text VARCHAR(100), -- Text for the link button
    icon VARCHAR(50), -- Icon name from Lucide React
    color_scheme VARCHAR(20) DEFAULT '#3B82F6', -- Color scheme for the highlight
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS partner_highlights_partner_id_idx ON "PartnerHighlights"(partner_id);
CREATE INDEX IF NOT EXISTS partner_highlights_active_idx ON "PartnerHighlights"(is_active);
CREATE INDEX IF NOT EXISTS partner_highlights_priority_idx ON "PartnerHighlights"(priority DESC);
CREATE INDEX IF NOT EXISTS partner_highlights_dates_idx ON "PartnerHighlights"(start_date, end_date);

-- Create composite index for active highlights by partner
CREATE INDEX IF NOT EXISTS partner_highlights_partner_active_idx ON "PartnerHighlights"(partner_id, is_active, priority DESC);

-- Add check constraint for highlight_type
ALTER TABLE "PartnerHighlights" 
ADD CONSTRAINT partner_highlights_type_chk 
CHECK (highlight_type = ANY(ARRAY['info', 'success', 'warning', 'offer', 'announcement']));

-- Enable Row Level Security
ALTER TABLE "PartnerHighlights" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for PartnerHighlights
-- Partners can only see their own highlights
CREATE POLICY partner_highlights_select_policy ON "PartnerHighlights" 
    FOR SELECT USING (
        auth.uid() = partner_id OR 
        auth.uid() IN (SELECT user_id FROM "UserProfiles" WHERE role = 'admin')
    );

-- Partners can only insert their own highlights
CREATE POLICY partner_highlights_insert_policy ON "PartnerHighlights" 
    FOR INSERT WITH CHECK (
        auth.uid() = partner_id
    );

-- Partners can only update their own highlights
CREATE POLICY partner_highlights_update_policy ON "PartnerHighlights" 
    FOR UPDATE USING (
        auth.uid() = partner_id
    );

-- Partners can only delete their own highlights
CREATE POLICY partner_highlights_delete_policy ON "PartnerHighlights" 
    FOR DELETE USING (
        auth.uid() = partner_id
    );

-- Public read access for active highlights (for display in header)
CREATE POLICY partner_highlights_public_read_policy ON "PartnerHighlights" 
    FOR SELECT USING (is_active = true);

-- Add comment to the table
COMMENT ON TABLE "PartnerHighlights" IS 'Stores partner-specific highlight messages that appear in the header';
COMMENT ON COLUMN "PartnerHighlights".highlight_type IS 'Type of highlight: info, success, warning, offer, announcement';
COMMENT ON COLUMN "PartnerHighlights".priority IS 'Display priority - higher numbers appear first';
COMMENT ON COLUMN "PartnerHighlights".start_date IS 'Optional start date for when highlight should be shown';
COMMENT ON COLUMN "PartnerHighlights".end_date IS 'Optional end date for when highlight should be hidden';
