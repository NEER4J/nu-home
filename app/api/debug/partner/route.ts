import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolvePartnerByHostname } from '@/lib/partner';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const hostname = url.searchParams.get('hostname');
    
    if (!hostname) {
      return NextResponse.json({ error: 'hostname parameter required' }, { status: 400 });
    }

    console.log('Debug endpoint - Testing hostname:', hostname);
    console.log('Debug endpoint - Request headers host:', request.headers.get('host'));
    console.log('Debug endpoint - Request URL:', request.url);

    const supabase = await createClient();
    
    // Test direct database query
    const { data: directQuery, error: directError } = await supabase
      .from('UserProfiles')
      .select('company_name, custom_domain, domain_verified, status, user_id')
      .eq('custom_domain', hostname);

    console.log('Direct query result:', directQuery, 'error:', directError);

    // Get all partners with custom domains for comparison
    const { data: allCustomDomains, error: allCustomDomainsError } = await supabase
      .from('UserProfiles')
      .select('company_name, custom_domain, domain_verified, status, user_id')
      .not('custom_domain', 'is', null);

    console.log('All custom domains:', allCustomDomains, 'error:', allCustomDomainsError);

    // Test partner resolution
    const partner = await resolvePartnerByHostname(supabase, hostname);
    
    return NextResponse.json({
      hostname,
      requestHost: request.headers.get('host'),
      directQuery: {
        data: directQuery,
        error: directError
      },
      allCustomDomains: {
        data: allCustomDomains,
        error: allCustomDomainsError
      },
      partnerResolution: {
        found: !!partner,
        partner: partner ? {
          company_name: partner.company_name,
          user_id: partner.user_id,
          custom_domain: partner.custom_domain,
          domain_verified: partner.domain_verified
        } : null
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: 'Debug endpoint failed' }, { status: 500 });
  }
}
