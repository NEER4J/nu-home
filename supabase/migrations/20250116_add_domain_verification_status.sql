-- Add domain_verified field to UserProfiles table
ALTER TABLE "UserProfiles" 
ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT FALSE;

-- Add index for domain verification status lookups
CREATE INDEX IF NOT EXISTS idx_userprofiles_domain_verified 
ON "UserProfiles"(domain_verified) 
WHERE domain_verified = TRUE;
