import type { SupabaseClient } from '@supabase/supabase-js'

export type PartnerProfile = {
  company_name: string
  contact_person: string
  postcode: string
  subdomain: string | null
  business_description?: string | null
  website_url?: string | null
  logo_url?: string | null
  user_id: string
  phone?: string | null
  company_color?: string | null
  otp?: boolean | null
  smtp_settings?: any
  twilio_settings?: any
  custom_domain?: string | null
  domain_verified?: boolean | null
  admin_mail?: string | null
  privacy_policy?: string | null
  terms_conditions?: string | null
  address?: string | null
}

function normalizeHost(rawHost: string): string {
  console.log('normalizeHost - Input rawHost:', rawHost);
  const normalized = (rawHost || '').toLowerCase().split(':')[0];
  console.log('normalizeHost - Output normalized:', normalized);
  return normalized;
}

/**
 * Resolve partner profile by request host.
 * 1) Prefer exact custom_domain match
 * 2) Fallback to platform subdomain: first label of host
 */
export async function resolvePartnerByHost(
  supabase: SupabaseClient,
  rawHost: string
): Promise<PartnerProfile | null> {
  const hostname = normalizeHost(rawHost)
  console.log('resolvePartnerByHost - Input hostname:', hostname)

  // Try verified custom domain first (exact match)
  {
    console.log('Trying custom domain match for:', hostname)
    const { data, error } = await supabase
      .from('UserProfiles')
      .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp, smtp_settings, twilio_settings, custom_domain, domain_verified, admin_mail, privacy_policy, terms_conditions, address')
      .eq('status', 'active')
      .eq('custom_domain', hostname)
      .or('domain_verified.eq.true,domain_verified.is.null') // Allow both verified and unverified for now
      .single()

    if (!error && data) {
      console.log('Found partner by custom domain:', data.company_name, 'domain_verified:', data.domain_verified)
      return data as PartnerProfile
    } else {
      console.log('No custom domain match found, error:', error)
      // Let's also check if there are any records with this custom_domain regardless of verification
      const { data: allMatches, error: allMatchesError } = await supabase
        .from('UserProfiles')
        .select('company_name, custom_domain, domain_verified, status')
        .eq('custom_domain', hostname)
      
      console.log('All records with this custom_domain:', allMatches, 'error:', allMatchesError)
    }
  }

  // Fallback: treat first label as platform subdomain
  const firstLabel = hostname.split('.')[0]
  if (firstLabel && firstLabel !== 'www' && firstLabel !== 'localhost') {
    console.log('Trying subdomain match for:', firstLabel)
    const { data, error } = await supabase
      .from('UserProfiles')
      .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp, smtp_settings, twilio_settings, custom_domain, domain_verified, admin_mail, privacy_policy, terms_conditions, address')
      .eq('subdomain', firstLabel)
      .eq('status', 'active')
      .single()

    if (!error && data) {
      console.log('Found partner by subdomain:', data.company_name)
      return data as PartnerProfile
    } else {
      console.log('No subdomain match found, error:', error)
    }
  }

  console.log('No partner found for hostname:', hostname)
  return null
}

/**
 * Server-side version of partner resolver for API routes and server components
 * Takes a hostname string directly instead of using window.location
 */
export async function resolvePartnerByHostname(
  supabase: SupabaseClient,
  hostname: string
): Promise<PartnerProfile | null> {
  console.log('resolvePartnerByHostname - Input hostname:', hostname)
  return resolvePartnerByHost(supabase, hostname)
}