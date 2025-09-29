# Google Reviews Import Setup

This feature allows partners to import reviews from their Google Business profile directly into the review section.

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Apify API Token (required for Google Reviews scraping)
APIFY_TOKEN=your_apify_token_here
```

## Getting Your Apify Token

1. Go to [Apify Console](https://console.apify.com/)
2. Sign up for a free account
3. Go to Settings > Integrations > API tokens
4. Create a new token
5. Copy the token and add it to your `.env.local` file

## How to Use

1. Go to Partner Configuration > Content Sections
2. Scroll down to "Import Google Reviews"
3. Paste your Google Maps business URL (e.g., `https://maps.google.com/maps/place/Your+Business+Name/@lat,lng,zoom/data=...`)
4. Click "Import Google Reviews"
5. The system will fetch up to 50 reviews and save them to your review section

## Supported URLs

- `https://maps.google.com/maps/place/Business+Name/@lat,lng,zoom/data=...`
- `https://www.google.com/maps/place/Business+Name/@lat,lng,zoom/data=...`
- Any valid Google Maps business URL with reviews

## Features

- ✅ Fetches up to 1000 reviews (all available reviews)
- ✅ Includes reviewer names, ratings, and text
- ✅ Automatically saves to database
- ✅ Updates review section in real-time
- ✅ Handles errors gracefully
- ✅ Shows import progress
- ✅ Extended timeout for large review sets (2-5 minutes)

## Troubleshooting

- **No reviews found**: Check that your Google Maps URL contains reviews
- **Import failed**: Verify your Apify token is correct
- **Invalid URL**: Ensure you're using a Google Maps business URL
