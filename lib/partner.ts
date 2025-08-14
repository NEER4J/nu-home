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
}

function normalizeHost(rawHost: string): { host: string; noWww: string } {
  const host = (rawHost || '').toLowerCase().split(':')[0]
  const noWww = host.replace(/^www\./, '')
  return { host, noWww }
}

/**
 * Resolve partner profile by request host.
 * 1) Prefer exact custom_domain match (ignoring leading www)
 * 2) Fallback to platform subdomain: first label of host
 */
export async function resolvePartnerByHost(
  supabase: SupabaseClient,
  rawHost: string
): Promise<PartnerProfile | null> {
  const { host, noWww } = normalizeHost(rawHost)

  // Try verified custom domain first (host or host without leading www)
  {
    const { data, error } = await supabase
      .from('UserProfiles')
      .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp')
      .eq('status', 'active')
      .in('custom_domain', [host, noWww])
      .single()

    if (!error && data) return data as PartnerProfile
  }

  // Fallback: treat first label as platform subdomain
  const firstLabel = noWww.split('.')[0]
  if (firstLabel && firstLabel !== 'www' && firstLabel !== 'localhost') {
    const { data, error } = await supabase
      .from('UserProfiles')
      .select('company_name, contact_person, postcode, subdomain, business_description, website_url, logo_url, user_id, phone, company_color, otp')
      .eq('subdomain', firstLabel)
      .eq('status', 'active')
      .single()

    if (!error && data) return data as PartnerProfile
  }

  return null
}


