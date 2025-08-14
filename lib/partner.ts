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
}

function normalizeHost(rawHost: string): string {
  return (rawHost || '').toLowerCase().split(':')[0]
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
      .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp, smtp_settings, twilio_settings')
      .eq('status', 'active')
      .eq('custom_domain', hostname)
      .eq('domain_verified', true)
      .single()

    if (!error && data) {
      console.log('Found partner by custom domain:', data.company_name)
      return data as PartnerProfile
    } else {
      console.log('No custom domain match found, error:', error)
    }
  }

  // Fallback: treat first label as platform subdomain
  const firstLabel = hostname.split('.')[0]
  if (firstLabel && firstLabel !== 'www' && firstLabel !== 'localhost') {
    console.log('Trying subdomain match for:', firstLabel)
    const { data, error } = await supabase
      .from('UserProfiles')
      .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp, smtp_settings, twilio_settings')
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