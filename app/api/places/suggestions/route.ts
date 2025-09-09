import { NextRequest, NextResponse } from 'next/server';

interface PostcodeSuggestion {
  postcode: string;
  address: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partial = searchParams.get('partial');

    console.log('Postcode suggestions API called with partial:', partial);

    if (!partial) {
      return NextResponse.json(
        { error: 'Partial postcode parameter is required' },
        { status: 400 }
      );
    }

    if (partial.length < 2) {
      return NextResponse.json(
        { error: 'Minimum 2 characters required for suggestions' },
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

    // Clean partial postcode - remove spaces and convert to uppercase
    const cleanPartial = partial.replace(/\s+/g, '').toUpperCase();
    
    // Use Webuild API for postcode suggestions
    const webuildUrl = `https://webuildapi.com/post-code-lookup/api/suggestions/${cleanPartial}`;
    
    console.log('Making request to:', webuildUrl);

    const response = await fetch(webuildUrl, {
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
    
    console.log('Webuild API suggestions response:', JSON.stringify(data, null, 2));
    
    if (!data.suggestions) {
      return NextResponse.json({
        suggestions: [],
        count: 0
      });
    }

    // Transform suggestions to include formatted postcodes
    const suggestions: PostcodeSuggestion[] = data.suggestions.map((suggestion: PostcodeSuggestion) => ({
      postcode: suggestion.postcode.replace(/(.{3,4})(.+)/, '$1 $2'),
      address: suggestion.address
    }));

    console.log('Returning suggestions:', suggestions.length);

    return NextResponse.json({
      suggestions,
      count: suggestions.length
    });

  } catch (error) {
    console.error('Postcode suggestions API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
