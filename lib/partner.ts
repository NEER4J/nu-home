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

  // Try verified custom domain first (exact match)
  {
    const { data, error } = await supabase
      .from('UserProfiles')
      .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp, smtp_settings, twilio_settings')
      .eq('status', 'active')
      .eq('custom_domain', hostname)
      .single()

    if (!error && data) return data as PartnerProfile
  }

  // Fallback: treat first label as platform subdomain
  const firstLabel = hostname.split('.')[0]
  if (firstLabel && firstLabel !== 'www' && firstLabel !== 'localhost') {
    const { data, error } = await supabase
      .from('UserProfiles')
      .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp, smtp_settings, twilio_settings')
      .eq('subdomain', firstLabel)
      .eq('status', 'active')
      .single()

    if (!error && data) return data as PartnerProfile
  }

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
  return resolvePartnerByHost(supabase, hostname)
}