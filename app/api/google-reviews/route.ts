import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';

interface GoogleReview {
  id: string;
  author_name: string;
  rating: number;
  text: string;
  time: string;
  relative_time_description: string;
}

// Enhanced Google Reviews fetching using Apify API
async function fetchGoogleReviews(googleReviewLink: string): Promise<GoogleReview[]> {
  console.log('🔄 Fetching reviews from:', googleReviewLink);
  
  if (!process.env.APIFY_TOKEN) {
    console.log('❌ APIFY_TOKEN not configured - cannot fetch reviews');
    return [];
  }

  try {
    // Validate the Google Maps URL
    try {
      const parsedUrl = new URL(googleReviewLink);
      if (!parsedUrl.hostname.includes('google.com') && !parsedUrl.hostname.includes('maps.google.com')) {
        console.log('❌ URL must be a valid Google Maps URL');
        return [];
      }
    } catch (error) {
      console.log('❌ Invalid URL format:', error);
      return [];
    }

    // Initialize the ApifyClient with API token
    const client = new ApifyClient({
      token: process.env.APIFY_TOKEN,
    });

    // Prepare Actor input for Google Maps Reviews Scraper
    const input = {
      startUrls: [
        {
          url: googleReviewLink
        }
      ],
      maxReviews: 1000, // Increased to get all reviews
      reviewsSort: "newest", // Get newest reviews first
      language: "en",
      reviewsOrigin: "all",
      personalData: true, // Include reviewer names
      includeHistogram: false, // Don't include histogram data
      includeOpeningHours: false, // Don't include opening hours
      includePeopleAlsoSearch: false, // Don't include related searches
      maxCrawledPlacesPerStartUrl: 1, // Focus on the specific place
      maxAutomaticZoomOut: 0, // Don't zoom out to find more places
      searchMatching: "all" // Get all matching reviews
    };

    console.log('🔄 Calling Apify Google Maps Reviews Scraper...');

    try {
      // Run the Actor with longer timeout for more reviews
      const run = await client.actor("compass~google-maps-reviews-scraper").call(input, {
        timeout: 300000, // 5 minutes timeout
        memory: 2048, // 2GB memory
        waitSecs: 30 // Wait 30 seconds between checks
      });

      // Fetch results from the run's dataset
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      
      console.log('📡 Apify API response length:', items?.length || 0);
      
      if (!items || items.length === 0) {
        console.log('⚠️ No review data returned from Apify API');
        return [];
      }

      // Transform Apify response to our GoogleReview format
      const reviews: GoogleReview[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Extract reviews from the item (Apify returns place data + reviews)
        if (item.reviews && Array.isArray(item.reviews)) {
          console.log('✅ Found', item.reviews.length, 'reviews in item', i);
          
          item.reviews.forEach((review: any, reviewIndex: number) => {
            try {
              const transformedReview: GoogleReview = {
                id: `apify_review_${i}_${reviewIndex}`,
                author_name: (review?.name || review?.author_name || review?.reviewerName || 'Anonymous') as string,
                rating: (review?.stars || review?.rating || 5) as number,
                text: (review?.text || review?.reviewText || review?.comment || '') as string,
                time: (review?.publishedAtDate || review?.time || review?.date || new Date().toISOString()) as string,
                relative_time_description: review?.publishedAtDate ? 
                  formatRelativeTime(review.publishedAtDate as string) : 'Recently'
              };
              
              // Only add reviews with text content
              if (transformedReview.text && transformedReview.text.trim().length > 0) {
                reviews.push(transformedReview);
              }
            } catch (reviewError) {
              console.error('❌ Error processing review:', reviewError);
            }
          });
        } else if (item?.name && item?.stars) {
          // If the item itself is a review (alternative structure)
          const transformedReview: GoogleReview = {
            id: `apify_review_${i}`,
            author_name: (item?.name || item?.author_name || 'Anonymous') as string,
            rating: (item?.stars || item?.rating || 5) as number,
            text: (item?.text || item?.reviewText || '') as string,
            time: (item?.publishedAtDate || item?.time || new Date().toISOString()) as string,
            relative_time_description: item?.publishedAtDate ? 
              formatRelativeTime(item.publishedAtDate as string) : 'Recently'
          };
          
          if (transformedReview.text && transformedReview.text.trim().length > 0) {
            reviews.push(transformedReview);
          }
        }
      }

      console.log('✅ Successfully processed', reviews.length, 'reviews from Apify');
      console.log('📊 Review breakdown:', {
        total_found: reviews.length,
        with_text: reviews.filter(r => r.text && r.text.trim().length > 0).length,
        ratings: reviews.reduce((acc, r) => {
          acc[r.rating] = (acc[r.rating] || 0) + 1;
          return acc;
        }, {} as Record<number, number>)
      });
      return reviews;

    } catch (error) {
      console.error('❌ Apify API error:', error);
      return [];
    }

  } catch (error) {
    console.error('❌ Error fetching Google reviews:', error);
    return [];
  }
}

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInDays / 365)} year${Math.floor(diffInDays / 365) > 1 ? 's' : ''} ago`;
  } catch (error) {
    return 'Recently';
  }
}

// Save reviews to database
async function saveReviewsToDatabase(reviews: GoogleReview[], partnerId: string, serviceCategoryId: string) {
  const supabase = await createClient();
  
  try {
    // Get current partner settings
    const { data: settings, error: settingsError } = await supabase
      .from('PartnerSettings')
      .select('review_section')
      .eq('partner_id', partnerId)
      .eq('service_category_id', serviceCategoryId)
      .single();

    if (settingsError) {
      console.error('❌ Error fetching partner settings:', settingsError);
      return false;
    }

    // Transform reviews to match our database format
    const transformedReviews = reviews.map(review => ({
      id: review.id,
      name: review.author_name,
      rating: review.rating,
      text: review.text
    }));

    // Update the review section with new reviews
    const updatedReviewSection = {
      ...settings.review_section,
      reviews: transformedReviews,
      last_updated: new Date().toISOString()
    };

    // Save to database
    const { error: updateError } = await supabase
      .from('PartnerSettings')
      .update({ 
        review_section: updatedReviewSection,
        updated_at: new Date().toISOString()
      })
      .eq('partner_id', partnerId)
      .eq('service_category_id', serviceCategoryId);

    if (updateError) {
      console.error('❌ Error saving reviews to database:', updateError);
      return false;
    }

    console.log('✅ Successfully saved', transformedReviews.length, 'reviews to database');
    return true;

  } catch (error) {
    console.error('❌ Error saving reviews:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { googleReviewLink, partnerId, serviceCategoryId } = await request.json();

    console.log('📊 Google Reviews API called:', { 
      hasGoogleLink: !!googleReviewLink, 
      partnerId, 
      serviceCategoryId 
    });

    if (!googleReviewLink) {
      return NextResponse.json(
        { error: 'Google review link is required' },
        { status: 400 }
      );
    }

    if (!partnerId || !serviceCategoryId) {
      return NextResponse.json(
        { error: 'Partner ID and Service Category ID are required' },
        { status: 400 }
      );
    }

    // Fetch reviews from Google using Apify
    const reviews = await fetchGoogleReviews(googleReviewLink);

    if (!reviews || reviews.length === 0) {
      console.log('⚠️ No reviews found');
      return NextResponse.json({
        success: false,
        message: 'No reviews found. Please check your Google review link.',
        reviews_count: 0
      });
    }

    // Save reviews to database
    const saved = await saveReviewsToDatabase(reviews, partnerId, serviceCategoryId);

    if (!saved) {
      return NextResponse.json({
        success: false,
        message: 'Failed to save reviews to database',
        reviews_count: reviews.length
      });
    }

    console.log('✅ Successfully fetched and saved', reviews.length, 'reviews');

    return NextResponse.json({
      success: true,
      message: `Successfully fetched and saved ${reviews.length} reviews`,
      reviews_count: reviews.length,
      reviews: reviews.slice(0, 5) // Return first 5 reviews as preview
    });

  } catch (error) {
    console.error('❌ Error in google-reviews API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch and save reviews' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testUrl = searchParams.get('testUrl');
  
  if (testUrl) {
    // Test URL validation endpoint
    console.log('🧪 Testing URL validation for:', testUrl);
    
    let isValidUrl = false;
    let errorMessage = '';
    
    try {
      const parsedUrl = new URL(testUrl);
      if (parsedUrl.hostname.includes('google.com') || parsedUrl.hostname.includes('maps.google.com')) {
        isValidUrl = true;
      } else {
        errorMessage = 'URL must be a valid Google Maps URL';
      }
    } catch (error) {
      errorMessage = 'Invalid URL format';
    }
    
    return NextResponse.json({
      test_url: testUrl,
      is_valid_google_maps_url: isValidUrl,
      error_message: errorMessage,
      apify_token_configured: !!process.env.APIFY_TOKEN,
      apify_token_length: process.env.APIFY_TOKEN?.length || 0
    });
  }
  
  return NextResponse.json({
    message: 'Google Reviews API - Use POST to fetch reviews or GET with ?testUrl= to test URL validation',
    apify_token_configured: !!process.env.APIFY_TOKEN,
    supported_url_formats: [
      'https://maps.google.com/maps/place/Business+Name/@lat,lng,zoom/data=...',
      'https://www.google.com/maps/place/Business+Name/@lat,lng,zoom/data=...',
      'Any valid Google Maps business URL with reviews'
    ]
  });
}
