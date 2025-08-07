import { NextRequest, NextResponse } from 'next/server';

interface GooglePlaceResult {
  place_id: string;
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface Address {
  address_line_1: string;
  address_line_2?: string;
  street_name?: string;
  street_number?: string;
  building_name?: string;
  sub_building?: string;
  town_or_city: string;
  county?: string;
  postcode: string;
  formatted_address: string;
  country?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postcode = searchParams.get('postcode');

    console.log('Places API called with postcode:', postcode);

    if (!postcode) {
      return NextResponse.json(
        { error: 'Postcode parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      console.error('Google Places API key not configured');
      return NextResponse.json(
        { error: 'Google Places API not configured' },
        { status: 500 }
      );
    }

    console.log('Using API key:', apiKey?.substring(0, 10) + '...');

    // Use Google Geocoding API which is better for postcode searches
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postcode + ', UK')}&key=${apiKey}`;
    
    console.log('Making request to:', googleUrl.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(googleUrl);
    
    if (!response.ok) {
      console.error('Google API HTTP error:', response.status, response.statusText);
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Google API response status:', data.status);
    console.log('Google API response:', JSON.stringify(data, null, 2));
    
    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.error_message || data.status);
      return NextResponse.json(
        { error: `Google API error: ${data.status}${data.error_message ? ' - ' + data.error_message : ''}` },
        { status: 500 }
      );
    }

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({
        addresses: [],
        count: 0
      });
    }

    // Transform Google Geocoding results to our Address format
    const addresses: Address[] = data.results.map((place: GooglePlaceResult) => {
      let address_line_1 = '';
      let address_line_2 = '';
      let street_name = '';
      let street_number = '';
      let building_name = '';
      let sub_building = '';
      let town_or_city = '';
      let county = '';
      let postcode_found = '';
      let country = '';

      // Parse address components
      place.address_components?.forEach(component => {
        const types = component.types;
        
        if (types.includes('street_number')) {
          street_number = component.long_name;
        }
        if (types.includes('route')) {
          street_name = component.long_name;
        }
        if (types.includes('subpremise')) {
          sub_building = component.long_name;
        }
        if (types.includes('premise')) {
          building_name = component.long_name;
        }
        if (types.includes('postal_town') || types.includes('locality')) {
          town_or_city = component.long_name;
        }
        if (types.includes('administrative_area_level_2')) {
          county = component.long_name;
        }
        if (types.includes('postal_code')) {
          postcode_found = component.long_name;
        }
        if (types.includes('country')) {
          country = component.long_name;
        }
      });

      // Build address_line_1
      if (street_number && street_name) {
        address_line_1 = `${street_number} ${street_name}`;
      } else if (street_name) {
        address_line_1 = street_name;
      } else if (building_name) {
        address_line_1 = building_name;
      } else {
        // Fallback to first part of formatted address
        const addressParts = place.formatted_address.split(',');
        address_line_1 = addressParts[0] || '';
      }

      // Build address_line_2
      if (building_name && address_line_1 !== building_name) {
        address_line_2 = building_name;
      } else if (sub_building) {
        address_line_2 = `Unit ${sub_building}`;
      }

      return {
        address_line_1: address_line_1.trim(),
        address_line_2: address_line_2 ? address_line_2.trim() : undefined,
        street_name: street_name || undefined,
        street_number: street_number || undefined,
        building_name: building_name || undefined,
        sub_building: sub_building || undefined,
        town_or_city: town_or_city || '',
        postcode: postcode_found || postcode,
        formatted_address: place.formatted_address,
        country: country || 'United Kingdom'
      };
    }).filter((addr: Address) => 
      // Filter out results that don't have basic address info
      addr.address_line_1 && addr.town_or_city
    );

    console.log('Returning addresses:', addresses.length);

    return NextResponse.json({
      addresses,
      count: addresses.length
    });

  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
