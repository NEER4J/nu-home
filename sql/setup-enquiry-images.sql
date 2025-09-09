-- Create the enquiry-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('enquiry-images', 'enquiry-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the bucket
CREATE POLICY "Allow public uploads to enquiry-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'enquiry-images');

CREATE POLICY "Allow public access to enquiry-images" ON storage.objects
FOR SELECT USING (bucket_id = 'enquiry-images');

CREATE POLICY "Allow authenticated users to delete their enquiry images" ON storage.objects
FOR DELETE USING (bucket_id = 'enquiry-images' AND auth.role() = 'authenticated');

-- Create table to track uploaded images
CREATE TABLE IF NOT EXISTS enquiry_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'boiler', 'solar', etc.
  area_index INTEGER NOT NULL,
  area_title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_enquiry_images_submission_id ON enquiry_images(submission_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_images_category ON enquiry_images(category);
CREATE INDEX IF NOT EXISTS idx_enquiry_images_uploaded_at ON enquiry_images(uploaded_at);

-- Enable RLS
ALTER TABLE enquiry_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public access to enquiry images" ON enquiry_images;
DROP POLICY IF EXISTS "Allow public insert to enquiry images" ON enquiry_images;
DROP POLICY IF EXISTS "Allow public read of enquiry images" ON enquiry_images;
DROP POLICY IF EXISTS "Allow public write to enquiry images" ON enquiry_images;

-- Create RLS policies that allow public access (no authentication required)
CREATE POLICY "Public read access to enquiry images" ON enquiry_images
FOR SELECT USING (true);

CREATE POLICY "Public insert access to enquiry images" ON enquiry_images
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access to enquiry images" ON enquiry_images
FOR UPDATE USING (true);

CREATE POLICY "Public delete access to enquiry images" ON enquiry_images
FOR DELETE USING (true);