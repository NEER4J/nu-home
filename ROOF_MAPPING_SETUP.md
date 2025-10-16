# Roof Mapping Feature Setup

## Overview
The roof mapping feature allows users to:
1. Pin their house location on a Google Maps satellite view
2. Draw the outline of their roof by clicking corners
3. Take a screenshot of the mapped roof area
4. Store the image in Supabase storage for later access

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Google Maps API Key (required for map functionality)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Supabase configuration (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important:** The Google Maps API key is required for the roof mapping feature to work. Without it, users will see a loading state and an error message.

### Getting a Google Maps API Key:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Maps JavaScript API" and "Places API"
4. Create credentials (API Key)
5. Restrict the API key to your domain for security
6. Add the key to your `.env.local` file

## Supabase Storage Setup

1. Create a new storage bucket called `roof-mappings` in your Supabase dashboard
2. Set the bucket to public if you want public access to the images
3. Configure appropriate RLS policies for security

## Features Implemented

### Components Created:
- `components/category-commons/quote/RoofMappingStep.tsx` - Main roof mapping component
- `app/api/roof-mapping/upload/route.ts` - API endpoint for image uploads

### Integration:
- Added roof mapping step to solar quote flow (after postcode step)
- Integrated with existing form submission process
- Images are stored in session and uploaded to Supabase on form submission

### User Flow:
1. User enters postcode and selects address
2. User is shown Google Maps with their address centered
3. User pins their exact house location
4. User draws roof outline by clicking corners
5. User confirms the roof mapping
6. Screenshot is taken and stored in session
7. On form submission, image is uploaded to Supabase storage

## Dependencies Added:
- `html2canvas` - For taking screenshots of the map

## Usage:
The roof mapping step is automatically included in the solar quote flow. No additional configuration is needed once the environment variables are set up.
