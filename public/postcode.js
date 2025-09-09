const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { Client } = require('@googlemaps/google-maps-services-js');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

dotenv.config();

const app = express();
const PORT = 5000;

// Initialize Google Maps client
const googleMapsClient = new Client({});

// In-memory cache for postcode data (simple LRU-like behavior)
const postcodeCache = new Map();
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for Google Places data
const placesCache = new Map();
const PLACES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Simple cache cleanup function
const cleanupCache = () => {
  const now = Date.now();
  
  // Clean postcode cache
  for (const [key, value] of postcodeCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      postcodeCache.delete(key);
    }
  }
  
  // Clean places cache
  for (const [key, value] of placesCache.entries()) {
    if (now - value.timestamp > PLACES_CACHE_TTL) {
      placesCache.delete(key);
    }
  }
  
  // Limit cache size
  if (postcodeCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(postcodeCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - CACHE_MAX_SIZE);
    toDelete.forEach(([key]) => postcodeCache.delete(key));
  }
};

// Run cache cleanup every minute
setInterval(cleanupCache, 60 * 1000);

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// CORS configuration with optimized preflight handling
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204, // Some legacy browsers choke on 204
  credentials: false,
  maxAge: 86400 // Cache preflight for 24 hours
};

// Optimized CORS middleware with fast preflight handling
app.use((req, res, next) => {
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    return res.status(204).end();
  }
  next();
});

app.use(cors(corsOptions));
app.use(compression()); // Add response compression
app.use(express.json({ limit: '1mb' })); // Limit JSON payload size

// Rate limiter for unauthenticated users
const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many requests from this IP. Please sign up for full access.',
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}, API Key: ${req.headers.authorization?.split(' ')[1] || 'none'}`);
    res.status(429).json({ error: 'Too many requests. Please sign up for full access.' });
  }
});

// Generate a new API key
const generateApiKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Middleware to validate API key and enforce rate limits
const validateApiKeyAndRateLimit = async (req, res, next) => {
  const apiKey = req.headers.authorization?.split(' ')[1]?.trim();
  const origin = req.headers.origin || req.headers.referer;
  
  if (!apiKey) {
    console.log('API key is required');
    return res.status(401).json({ error: 'API key is required' });
  }

  try {
    // Allow demo_key for unauthenticated users
    if (apiKey === 'demo_key') {
      console.log(`Request from logged-out user with demo key: ${req.ip}`);
      req.userId = 'demo_user';
      return next();
    }

    // Check if API key exists and get allowed domains
    const { data, error } = await supabase
      .from('profiles')
      .select('*, allowed_domains')
      .eq('new_api_key', apiKey)
      .single();

    if (error) {
      console.error('Error validating API key:', error);
      return res.status(500).json({ error: 'Error validating API key' });
    }

    if (!data) {
      console.log(`Unauthorized request with API key: ${apiKey}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if request origin is allowed
    if (origin) {
      const requestDomain = new URL(origin).hostname;
      const allowedDomains = data.allowed_domains || [];
      
      if (!allowedDomains.includes(requestDomain) && allowedDomains.length > 0) {
        console.log(`Unauthorized domain: ${requestDomain}`);
        return res.status(403).json({ 
          error: 'Domain not authorized. Please add this domain in your dashboard settings.' 
        });
      }
    }

    req.userId = data.id;
    req.rateLimit = data.rate_limit;
    next();
  } catch (error) {
    console.error('Error validating API key:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Apply rate limiter to protected endpoints (skip preflight requests)
app.use(['/post-code-lookup/api/postcodes/:postcode', '/post-code-lookup/api/residential-address'], 
  (req, res, next) => {
    // Skip rate limiting for preflight requests
    if (req.method === 'OPTIONS') {
      return next();
    }
    
    const apiKey = req.headers.authorization?.split(' ')[1]?.trim();
    if (!apiKey || apiKey === 'demo_key') {
      demoLimiter(req, res, next);
    } else {
      validateApiKeyAndRateLimit(req, res, next);
    }
});

// Endpoint to generate and return an API key
app.post('/post-code-lookup/api/generate-key', async (req, res) => {
  const userId = req.body.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const apiKey = generateApiKey();
    
    const { data: profileExists } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId);

    let updateResult;
    
    if (!profileExists || profileExists.length === 0) {
      updateResult = await supabase
        .from('profiles')
        .insert([{ 
          id: userId,
          new_api_key: apiKey,
          rate_limit: 100,
          request_count: 0,
          last_request_time: new Date().toISOString()
        }]);
    } else {
      updateResult = await supabase
        .from('profiles')
        .update({ new_api_key: apiKey })
        .eq('id', userId);
    }

    if (updateResult.error) throw updateResult.error;
    res.json({ apiKey });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST endpoint for adding residential addresses
app.post('/post-code-lookup/api/residential-address', validateApiKeyAndRateLimit, async (req, res) => {
  const { postcode, buildingNumber, streetAddress, town } = req.body;
  const userId = req.userId;

  if (!streetAddress || !town || !buildingNumber) {
    return res.status(400).json({ 
      error: 'Building number/name, street address, and town are required' 
    });
  }

  try {
    const fullAddress = `${buildingNumber} ${streetAddress}, ${postcode}`;

    const { data, error } = await supabase
      .from('residential_addresses')
      .insert([{
        postcode: postcode.toUpperCase(),
        building_number: buildingNumber,
        street_address: streetAddress,
        town: town,
        full_address: fullAddress,
        submitted_by: userId,
        // created_at will be set by default in the database
      }])
      .select('id, postcode, building_number, street_address, town, full_address, created_at')
      .single();

    if (error) throw error;

    const formattedAddress = {
      Id: data.id, // Using the UUID from the database
      Type: 'residential',
      StreetAddress: `${data.building_number} ${data.street_address}`,
      Town: data.town,
      Postcode: data.postcode,
      Address: data.full_address,
      CreatedAt: data.created_at
    };

    res.json({ 
      message: 'Residential address submitted successfully',
      address: formattedAddress
    });
  } catch (error) {
    console.error('Error submitting residential address:', error);
    res.status(500).json({ error: 'Error submitting address' });
  }
});

app.get('/post-code-lookup/api/postcodes/:postcode', validateApiKeyAndRateLimit, async (req, res) => {
  const { postcode } = req.params;
  const userId = req.userId;
  const normalizedPostcode = postcode.toUpperCase().replace(/\s+/g, '');
  
  try {
    // 1. Check cache first for postcode data
    let postcodeData;
    const cacheKey = `postcode_${normalizedPostcode}`;
    const cachedPostcode = postcodeCache.get(cacheKey);
    
    if (cachedPostcode && (Date.now() - cachedPostcode.timestamp) < CACHE_TTL) {
      postcodeData = cachedPostcode.data;
    } else {
      // Fetch from API and cache
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
      postcodeData = await response.json();
      
      if (postcodeData.status === 200) {
        postcodeCache.set(cacheKey, {
          data: postcodeData,
          timestamp: Date.now()
        });
      }
    }
    
    if (postcodeData.status !== 200) {
      // Log failed attempt for non-demo users (non-blocking)
      if (userId !== 'demo_user') {
        supabase
          .from('api_usage')
          .insert([{
            user_id: userId,
            endpoint: `/post-code-lookup/api/postcodes/${postcode}`,
            status: 'error',
            timestamp: new Date().toISOString(),
          }])
          .then()
          .catch(err => console.error('Error logging failed attempt:', err));
      }
      return res.status(postcodeData.status).json({ 
        SearchEnd: {
          Summaries: []
        }
      });
    }

    // 2. Check cache for Google Places data
    const placesCacheKey = `places_${normalizedPostcode}`;
    let placesData;
    const cachedPlaces = placesCache.get(placesCacheKey);
    
    if (cachedPlaces && (Date.now() - cachedPlaces.timestamp) < PLACES_CACHE_TTL) {
      placesData = { status: 'fulfilled', value: cachedPlaces.data };
    } else {
      // Fetch Google Places data
      placesData = await Promise.allSettled([
        googleMapsClient.placesNearby({
          params: {
            location: {
              lat: postcodeData.result.latitude,
              lng: postcodeData.result.longitude
            },
            radius: 250, // Further reduced for faster response
            key: process.env.GOOGLE_MAPS_API_KEY,
            type: 'establishment'
          }
        }).then(response => response.data.results?.slice(0, 12) || []) // Reduced to 12 results
      ]).then(results => results[0]);
      
      // Cache successful results
      if (placesData.status === 'fulfilled' && placesData.value) {
        placesCache.set(placesCacheKey, {
          data: placesData.value,
          timestamp: Date.now()
        });
      }
    }

    // 3. Run Supabase query in parallel with places processing
    const residentialAddresses = await supabase
      .from('residential_addresses')
      .select('id, postcode, building_number, street_address, town, full_address, created_at')
      .eq('postcode', normalizedPostcode)
      .limit(15); // Reduced limit for faster response

    // 4. Process results and build summaries array
    let summaries = [];

    // Process Google Places data
    if (placesData.status === 'fulfilled' && placesData.value) {
      summaries = placesData.value.map((place) => {
        const addressParts = (place.vicinity || '').split(',');
        const streetAddress = addressParts.length > 1 ? addressParts[0].trim() : '';
        
        return {
          Id: `gp_${place.place_id}`,
          Type: 'google_place',
          BuildingNumber: place.name,
          StreetAddress: streetAddress,
          Town: postcodeData.result.admin_district || '',
          Postcode: postcodeData.result.postcode,
          Address: `${place.vicinity || ''}, ${postcodeData.result.postcode}`.trim()
        };
      });
    } else if (placesData.status === 'rejected') {
      console.error('Error fetching nearby places:', placesData.reason);
    }

    // Process residential addresses
    if (residentialAddresses.data?.length > 0) {
      const formattedResidential = residentialAddresses.data.map(addr => ({
        Id: addr.id,
        Type: 'residential',
        BuildingNumber: addr.building_number,
        StreetAddress: addr.street_address,
        Town: addr.town,
        Postcode: addr.postcode,
        Address: addr.full_address,
        CreatedAt: addr.created_at
      }));
      summaries = [...summaries, ...formattedResidential];
    }

    // 5. Log successful attempt (non-blocking background operation)
    if (userId !== 'demo_user') {
      supabase
        .from('api_usage')
        .insert([{
          user_id: userId,
          endpoint: `/post-code-lookup/api/postcodes/${postcode}`,
          status: 'success',
          timestamp: new Date().toISOString(),
        }])
        .then()
        .catch(err => console.error('Error logging successful attempt:', err));
    }

    // 6. Return results immediately with optimized response
    res.json({
      SearchEnd: {
        Summaries: summaries
      }
    });
    
  } catch (error) {
    console.error('Error in postcode lookup:', error);
    res.status(500).json({ 
      SearchEnd: {
        Summaries: []
      }
    });
  }
});

// Add this new endpoint to your Express server

// Endpoint for postcode suggestions
app.get('/post-code-lookup/api/suggestions/:partial', validateApiKeyAndRateLimit, async (req, res) => {
  const { partial } = req.params;
  const userId = req.userId;
  const normalizedPartial = partial.toUpperCase().replace(/\s+/g, '');

  if (!partial || partial.length < 2) {
    return res.json({ suggestions: [] });
  }

  try {
    // Check cache for suggestions
    const suggestionsCacheKey = `suggestions_${normalizedPartial}`;
    const cachedSuggestions = postcodeCache.get(suggestionsCacheKey);
    
    if (cachedSuggestions && (Date.now() - cachedSuggestions.timestamp) < CACHE_TTL) {
      return res.json({ suggestions: cachedSuggestions.data });
    }

    // Run both queries in parallel for better performance
    const [residentialResult, postcodeResult] = await Promise.allSettled([
      // 1. Check residential addresses in our database
      supabase
        .from('residential_addresses')
        .select('postcode, building_number, street_address, town')
        .ilike('postcode', `${partial}%`)
        .limit(3), // Reduced limit for faster response

      // 2. Use postcodes.io to get additional suggestions
      (async () => {
        const { default: fetch } = await import('node-fetch');
        const response = await fetch(`https://api.postcodes.io/postcodes/${partial}/autocomplete`);
        return response.json();
      })()
    ]);

    let suggestions = [];

    // Process residential addresses
    if (residentialResult.status === 'fulfilled' && residentialResult.value.data?.length > 0) {
      const residentialSuggestions = residentialResult.value.data.map(addr => ({
        postcode: addr.postcode,
        address: `${addr.building_number} ${addr.street_address}, ${addr.town}`
      }));
      suggestions = [...suggestions, ...residentialSuggestions];
    }

    // Process postcodes.io suggestions
    if (postcodeResult.status === 'fulfilled' && postcodeResult.value.status === 200 && postcodeResult.value.result) {
      const postcodeSuggestions = postcodeResult.value.result.slice(0, 3).map(postcode => ({
        postcode: postcode,
        address: 'United Kingdom'
      }));
      suggestions = [...suggestions, ...postcodeSuggestions];
    }

    // Remove duplicates based on postcode
    suggestions = suggestions.filter((suggestion, index, self) =>
      index === self.findIndex((s) => s.postcode === suggestion.postcode)
    );

    // Cache the results
    const finalSuggestions = suggestions.slice(0, 5);
    postcodeCache.set(suggestionsCacheKey, {
      data: finalSuggestions,
      timestamp: Date.now()
    });

    // Log API usage for non-demo users (non-blocking)
    if (userId !== 'demo_user') {
      supabase
        .from('api_usage')
        .insert([{
          user_id: userId,
          endpoint: `/post-code-lookup/api/suggestions/${partial}`,
          status: 'success',
          timestamp: new Date().toISOString(),
        }])
        .then()
        .catch(err => console.error('Error logging suggestions usage:', err));
    }

    res.json({ suggestions: finalSuggestions });
  } catch (error) {
    console.error('Error in postcode suggestions:', error);
    
    // Log error for non-demo users (non-blocking)
    if (userId !== 'demo_user') {
      supabase
        .from('api_usage')
        .insert([{
          user_id: userId,
          endpoint: `/post-code-lookup/api/suggestions/${partial}`,
          status: 'error',
          timestamp: new Date().toISOString(),
        }])
        .then()
        .catch(err => console.error('Error logging suggestions error:', err));
    }
    
    res.status(500).json({ 
      error: 'Error fetching suggestions',
      suggestions: [] 
    });
  }
});


// Endpoint to get all users
app.get('/post-code-lookup/api/users', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, new_api_key, rate_limit, request_count, last_request_time');
  
      if (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: 'Error fetching users' });
      }
  
      res.json(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  // Endpoint to update a user's rate limit
  app.put('/post-code-lookup/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    const { rateLimit, full_name, email, allowed_domains } = req.body;
  
    if (!rateLimit && !full_name && !email && !allowed_domains) {
      return res.status(400).json({ error: 'At least one field is required for update' });
    }
  
    try {
      const updates = {};
      if (rateLimit !== undefined) updates.rate_limit = rateLimit;
      if (full_name !== undefined) updates.full_name = full_name;
      if (email !== undefined) updates.email = email;
      if (allowed_domains !== undefined) updates.allowed_domains = allowed_domains;
  
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
  
      if (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ error: 'Error updating user' });
      }
  
      res.json({ message: 'User updated successfully' });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  
  // Delete user endpoint
  app.delete('/post-code-lookup/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      // First, delete from profiles table
      // This will cascade to api_usage due to the foreign key constraint
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
  
      if (deleteProfileError) {
        console.error('Error deleting user profile:', deleteProfileError);
        return res.status(500).json({ error: 'Error deleting user profile' });
      }
  
      // Then attempt to delete from auth.users
      try {
        const { data: user, error: getUserError } = await supabase.auth.admin.getUserById(userId);
        
        if (getUserError) {
          console.error('Error getting user:', getUserError);
          // Continue anyway as the profile is already deleted
        }
  
        if (user) {
          const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
          if (deleteAuthError) {
            console.error('Error deleting from auth.users:', deleteAuthError);
            // Don't return error as the profile deletion was successful
          }
        }
      } catch (authError) {
        console.error('Error in auth operations:', authError);
        // Don't return error as the profile deletion was successful
      }
  
      // Return success even if auth.users deletion failed, as the profile is deleted
      res.json({ message: 'User deleted successfully' });
  
    } catch (error) {
      console.error('Error in delete operation:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    cache: {
      postcodeCache: postcodeCache.size,
      placesCache: placesCache.size
    }
  });
});

// Performance logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) { // Log slow requests (>1s)
      console.log(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});