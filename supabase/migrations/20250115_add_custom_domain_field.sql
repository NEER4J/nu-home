-- Add custom_domain field to UserProfiles table
ALTER TABLE "UserProfiles" 
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) NULL;

-- Add index for custom domain lookups
CREATE INDEX IF NOT EXISTS idx_userprofiles_custom_domain 
ON "UserProfiles"(custom_domain) 
WHERE custom_domain IS NOT NULL;

-- Add unique constraint to ensure no duplicate custom domains
ALTER TABLE "UserProfiles" 
ADD CONSTRAINT userprofiles_custom_domain_unique 
UNIQUE (custom_domain) 
WHERE custom_domain IS NOT NULL;
