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

    // Get domain details from Vercel
    const vercelResponse = await fetch(
      `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.VERCEL_AUTH_TOKEN}`,
        },
      }
    );

    const vercelData = await vercelResponse.json();

    return NextResponse.json({
      success: true,
      domain: domain,
      vercelResponse: {
        status: vercelResponse.status,
        ok: vercelResponse.ok,
        data: vercelData
      },
      analysis: {
        configured: vercelData.configured,
        hasVerification: Boolean(vercelData.verification && vercelData.verification.length > 0),
        verificationStatus: vercelData.verification?.[0]?.status,
        hasRedirect: Boolean(vercelData.redirect),
        hasGitBranch: Boolean(vercelData.gitBranch),
        shouldBeVerified: vercelData.configured === true || 
                         (vercelData.verification && vercelData.verification[0]?.status === 'VALID') ||
                         vercelData.redirect ||
                         vercelData.gitBranch
      }
    });

  } catch (error) {
    console.error('Error debugging domain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
