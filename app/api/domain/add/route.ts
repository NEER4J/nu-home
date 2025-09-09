import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Verify the user owns this domain
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if the domain belongs to the current user
    const { data: profile, error: profileError } = await supabase
      .from('UserProfiles')
      .select('custom_domain')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.custom_domain !== domain) {
      return NextResponse.json(
        { error: 'Domain not found or access denied' },
        { status: 403 }
      );
    }

    // Check if Vercel environment variables are configured
    if (!process.env.VERCEL_AUTH_TOKEN || !process.env.VERCEL_PROJECT_ID) {
      return NextResponse.json(
        { error: 'Vercel configuration is missing' },
        { status: 500 }
      );
    }

    // Add domain to Vercel
    const vercelResponse = await fetch(
      `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VERCEL_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain,
        }),
      }
    );

    const vercelData = await vercelResponse.json();

    if (!vercelResponse.ok) {
      console.error('Vercel API error:', vercelData);
      
      if (vercelData.error?.code === 'DOMAIN_ALREADY_EXISTS') {
        return NextResponse.json({
          success: true,
          message: 'Domain already exists in Vercel project',
          data: vercelData
        });
      }
      
      return NextResponse.json({
        success: false,
        error: vercelData.error?.message || 'Failed to add domain to Vercel',
        data: vercelData
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Domain successfully added to Vercel',
      data: vercelData
    });

  } catch (error) {
    console.error('Error adding domain to Vercel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
