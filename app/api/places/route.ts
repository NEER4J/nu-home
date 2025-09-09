import { NextRequest, NextResponse } from 'next/server';

// Retry function with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 2): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

interface WebuildAddress {
  Id: string;
  Type: 'google_place' | 'residential';
  BuildingNumber: string;
  StreetAddress: string;
  Town: string;
  Postcode: string;
  Address: string;
  CreatedAt?: string;
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

    const apiKey = process.env.WEBUILD_API_KEY;
    
    if (!apiKey) {
      console.error('Webuild API key not configured');
      return NextResponse.json(
        { error: 'Webuild API not configured' },
        { status: 500 }
      );
    }

    console.log('Using API key:', apiKey?.substring(0, 10) + '...');

    // Clean postcode - remove spaces and convert to uppercase
    const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
    
    // Use Webuild API for postcode lookup
    const webuildUrl = `https://webuildapi.com/post-code-lookup/api/postcodes/${cleanPostcode}`;
    
    console.log('Making request to:', webuildUrl);

    // Use retry mechanism with exponential backoff
    const response = await fetchWithRetry(webuildUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Webuild API HTTP error:', response.status, response.statusText);
      throw new Error(`Webuild API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Webuild API response:', JSON.stringify(data, null, 2));
    
    if (!data.SearchEnd || !data.SearchEnd.Summaries) {
      return NextResponse.json({
        addresses: [],
        count: 0
      });
    }

    // Transform Webuild API results to our Address format
    const addresses: Address[] = data.SearchEnd.Summaries.map((summary: WebuildAddress) => {
      // Parse the address components
      const addressParts = summary.Address.split(', ');
      
      // Extract building number and street address
      let address_line_1 = '';
      let address_line_2 = '';
      let building_name = '';
      let sub_building = '';
      
      if (summary.Type === 'residential') {
        // For residential addresses, BuildingNumber might contain unit info
        if (summary.BuildingNumber.toLowerCase().includes('ff') || 
            summary.BuildingNumber.toLowerCase().includes('flat') ||
            summary.BuildingNumber.toLowerCase().includes('unit')) {
          sub_building = summary.BuildingNumber;
          address_line_1 = summary.StreetAddress;
        } else {
          address_line_1 = `${summary.BuildingNumber} ${summary.StreetAddress}`.trim();
        }
      } else {
        // For Google Places, BuildingNumber is usually the business name
        building_name = summary.BuildingNumber;
        address_line_1 = summary.StreetAddress;
      }

      // Extract street number if present
      const streetMatch = summary.StreetAddress.match(/^(\d+)\s+(.+)$/);
      const street_number = streetMatch ? streetMatch[1] : undefined;
      const street_name = streetMatch ? streetMatch[2] : summary.StreetAddress;

      // Format postcode with space
      const formattedPostcode = summary.Postcode.replace(/(.{3,4})(.+)/, '$1 $2');

      return {
        address_line_1: address_line_1.trim(),
        address_line_2: address_line_2 ? address_line_2.trim() : undefined,
        street_name: street_name || undefined,
        street_number: street_number || undefined,
        building_name: building_name || undefined,
        sub_building: sub_building || undefined,
        town_or_city: summary.Town,
        postcode: formattedPostcode,
        formatted_address: summary.Address,
        country: 'United Kingdom'
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
