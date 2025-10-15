import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const postcode = url.searchParams.get('postcode');

    if (!postcode) {
      return NextResponse.json({ error: 'Postcode is required' }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_WEBUILD_API_KEY) {
      console.error('NEXT_PUBLIC_WEBUILD_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Postcode service is not available. Please try again later.' },
        { status: 500 }
      );
    }

    const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
    const webuildApiResponse = await fetch(`https://webuildapi.com/post-code-lookup/api/postcodes/${cleanPostcode}`, {
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WEBUILD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!webuildApiResponse.ok) {
      const errorData = await webuildApiResponse.json();
      console.error('Webuild API error:', webuildApiResponse.status, errorData);
      return NextResponse.json(
        { error: 'Failed to fetch addresses from external service', details: errorData },
        { status: webuildApiResponse.status }
      );
    }

    const data = await webuildApiResponse.json();
    
    if (!data.SearchEnd || !data.SearchEnd.Summaries || data.SearchEnd.Summaries.length === 0) {
        return NextResponse.json({ addresses: [], success: false, message: "No addresses found for this postcode." }, { status: 200 });
    }

    // Transform Webuild API results to our Address format (similar to PostcodeStep.tsx)
    const addresses = data.SearchEnd.Summaries.map((summary: any) => {
      let address_line_1 = '';
      let address_line_2 = '';
      let building_name = '';
      let sub_building = '';
      
      if (summary.Type === 'residential') {
        if (summary.BuildingNumber.toLowerCase().includes('ff') || 
            summary.BuildingNumber.toLowerCase().includes('flat') ||
            summary.BuildingNumber.toLowerCase().includes('unit')) {
          sub_building = summary.BuildingNumber;
          address_line_1 = summary.StreetAddress;
        } else {
          address_line_1 = `${summary.BuildingNumber} ${summary.StreetAddress}`.trim();
        }
      } else {
        building_name = summary.BuildingNumber;
        address_line_1 = summary.StreetAddress;
      }

      const streetMatch = summary.StreetAddress.match(/^(\d+)\s+(.+)$/);
      const street_number = streetMatch ? streetMatch[1] : undefined;
      const street_name = streetMatch ? streetMatch[2] : summary.StreetAddress;

      const formattedPostcode = summary.Postcode;

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
        country: 'United Kingdom',
      };
    }).filter((addr: any) => 
      addr.address_line_1 && addr.town_or_city
    );

    return NextResponse.json({ addresses, success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in postcode lookup API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during postcode lookup' },
      { status: 500 }
    );
  }
}
