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
      .select('custom_domain, domain_verified')
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

    // Check domain status with Vercel
    const vercelResponse = await fetch(
      `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.VERCEL_AUTH_TOKEN}`,
        },
      }
    );

    if (!vercelResponse.ok) {
      if (vercelResponse.status === 404) {
        return NextResponse.json({
          verified: false,
          status: 'error',
          message: 'Domain not found in Vercel. Please add it to your project first.'
        });
      }
      
      const errorData = await vercelResponse.json();
      return NextResponse.json({
        verified: false,
        status: 'error',
        message: errorData.error?.message || 'Failed to check domain status'
      });
    }

    const data = await vercelResponse.json();
    console.log('Vercel domain data:', JSON.stringify(data, null, 2));
    
    // Determine verification status
    let isVerified = false;
    let status = 'error';
    let message = 'Domain exists in Vercel but may need DNS configuration. Please check your DNS settings.';

    // Check if domain is verified (Vercel's primary verification field)
    if (data.verified === true) {
      isVerified = true;
      status = 'verified';
      message = 'Domain is verified and ready to use';
    }
    // Check if domain is configured (Vercel considers it configured if it has a valid configuration)
    else if (data.configured === true) {
      isVerified = true;
      status = 'verified';
      message = 'Domain is configured and ready to use';
    }
    // Check verification status if available
    else if (data.verification && data.verification.length > 0) {
      const verification = data.verification[0];
      
      if (verification.status === 'VALID') {
        isVerified = true;
        status = 'verified';
        message = 'Domain verification is valid';
      } else if (verification.status === 'PENDING') {
        isVerified = false;
        status = 'pending';
        message = 'Domain verification is pending';
      } else {
        isVerified = false;
        status = 'error';
        message = verification.reason || 'Verification failed';
      }
    }
    // Check for other indicators of proper configuration
    else if (data.redirect || data.redirectStatusCode || data.gitBranch) {
      isVerified = true;
      status = 'verified';
      message = 'Domain is properly configured';
    }

    // Update the domain_verified status in the database
    const { error: updateError } = await supabase
      .from('UserProfiles')
      .update({ domain_verified: isVerified })
      .eq('user_id', user.id)
      .eq('custom_domain', domain);

    if (updateError) {
      console.error('Error updating domain verification status:', updateError);
    }

    return NextResponse.json({
      verified: isVerified,
      status: status,
      message: message
    });

  } catch (error) {
    console.error('Error checking domain status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
