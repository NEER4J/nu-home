# Custom Domain Setup Guide

This guide explains how to set up custom domains for partner forms in the Nu-Home platform.

## Overview

The custom domain feature allows partners to use their own domain (e.g., `shop.clientdomain.com`) instead of the default subdomain (`partner.aifortrades.co.uk`).

## Features Implemented

1. **Custom Domain Management**: Partners can set their custom domain in the profile page
2. **DNS Instructions**: Automatic generation of DNS configuration instructions
3. **Vercel Integration**: Automatic domain addition to Vercel project via API
4. **Domain Verification**: API endpoint to check domain verification status
5. **Middleware Routing**: Automatic routing of custom domains to correct partner content
6. **Manual Vercel Addition**: Button to manually add domains to Vercel if automatic addition fails

## Environment Variables Required

Add these to your `.env.local` file:

```bash
VERCEL_AUTH_TOKEN=your_vercel_auth_token
VERCEL_PROJECT_ID=your_vercel_project_id
```

### Getting Vercel Credentials

1. **Vercel Auth Token**: 
   - Go to Vercel Dashboard → Settings → Tokens
   - Create a new token with "Full Account" scope
   - Copy the token value

2. **Vercel Project ID**:
   - Go to your Vercel project dashboard
   - The Project ID is in the URL: `https://vercel.com/your-team/your-project`
   - Or find it in Project Settings → General

## Database Migration

Run the following migration to add the custom_domain field:

```sql
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
```

## Vercel Configuration

1. **Wildcard Domain**: Ensure your Vercel project has a wildcard domain configured
2. **DNS Records**: Partners need to add a CNAME record pointing to `aifortrades.co.uk`
3. **API Permissions**: Ensure your Vercel token has permission to add domains to the project

## How It Works

### 1. Partner Sets Custom Domain
- Partner goes to Profile → Custom Domain tab
- Enters their domain (e.g., `shop.clientdomain.com`)
- System validates domain format
- Domain is saved to database
- **Domain is automatically added to Vercel project via API**

### 2. DNS Configuration
The system provides DNS instructions:
- **Type**: CNAME
- **Name**: `shop` (for subdomain) or `@` (for root domain)
- **Value**: `aifortrades.co.uk`
- **TTL**: Auto

### 3. Domain Verification
- Partners can check domain verification status
- System calls Vercel API to verify domain configuration
- Shows real-time status updates
- **Manual "Add to Vercel" button if automatic addition fails**

### 4. Request Routing
- Middleware checks incoming requests
- If hostname matches a custom domain, routes to correct partner
- Falls back to subdomain logic if no custom domain match

## API Endpoints

### POST /api/domain/verify
Checks domain verification status with Vercel.

**Request:**
```json
{
  "domain": "shop.clientdomain.com"
}
```

**Response:**
```json
{
  "verified": true,
  "status": "verified"
}
```

### POST /api/domain/add
Manually adds a domain to Vercel project.

**Request:**
```json
{
  "domain": "shop.clientdomain.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Domain successfully added to Vercel",
  "data": { ... }
}
```

## Components Created

1. **CustomDomainForm.tsx**: Form for managing custom domains with Vercel integration
2. **TabSwitcher.tsx**: Tab navigation for profile page
3. **Domain verification API**: Backend endpoint for checking domain status
4. **Domain addition API**: Backend endpoint for adding domains to Vercel
5. **Updated middleware**: Handles custom domain routing
6. **Updated actions**: Server actions with improved Vercel integration

## Usage Flow

1. Partner logs into their dashboard
2. Navigates to Profile → Custom Domain tab
3. Enters their custom domain
4. Saves the domain (automatically adds to Vercel)
5. If Vercel addition fails, uses "Add to Vercel" button
6. Configures DNS settings as instructed
7. Checks domain verification status
8. Once verified, their forms are accessible at the custom domain

## Vercel API Integration Details

### Automatic Domain Addition
When a partner saves a custom domain:
1. Domain is validated for format
2. Domain is saved to database
3. Vercel API is called to add domain to project
4. Success/error feedback is provided to user

### Error Handling
- **Domain Already Exists**: Treated as success (domain is already configured)
- **Invalid Domain**: Returns validation error
- **API Errors**: Logged and user is informed
- **Missing Configuration**: Clear error message about missing environment variables

### Manual Addition
If automatic addition fails:
- "Add to Vercel" button appears
- Partner can manually trigger domain addition
- Status is rechecked after manual addition

## Security Considerations

- Only authenticated partners can manage their own domains
- Domain ownership is verified before allowing updates
- Custom domains are unique across all partners
- Middleware validates domain ownership for each request
- Vercel API calls are authenticated with secure tokens

## Troubleshooting

### Domain Not Verifying
1. Check DNS propagation (can take up to 48 hours)
2. Verify CNAME record is correctly configured
3. Ensure domain is added to Vercel project
4. Check Vercel API token permissions
5. Use "Add to Vercel" button if automatic addition failed

### Vercel API Issues
1. Verify environment variables are set correctly
2. Check Vercel API token validity and permissions
3. Ensure project ID is correct
4. Check network connectivity to Vercel API
5. Review Vercel project settings and domain limits

### Middleware Issues
1. Verify custom domain is in database
2. Check domain status is 'active'
3. Ensure middleware is properly configured
4. Check Vercel project settings

### Common Vercel Errors
- **DOMAIN_ALREADY_EXISTS**: Domain is already configured (this is fine)
- **INVALID_DOMAIN**: Check domain format
- **FORBIDDEN**: Check API token permissions
- **NOT_FOUND**: Check project ID
