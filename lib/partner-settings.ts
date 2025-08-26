import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export interface PartnerSettings {
  header_code?: string;
  body_code?: string;
  footer_code?: string;
  company_color?: string;
}

export async function getPartnerSettings(host?: string): Promise<PartnerSettings | null> {
  try {
    const supabase = await createClient();
    
    // If no host provided, try to get from request headers
    if (!host) {
      return null;
    }

    // Extract subdomain from host
    const subdomain = host.split('.')[0];
    
    // Query for partner profile with the given subdomain
    const { data: profile, error } = await supabase
      .from('UserProfiles')
      .select('header_code, body_code, footer_code, company_color')
      .eq('subdomain', subdomain)
      .single();

    if (error || !profile) {
      console.log('No partner profile found for subdomain:', subdomain);
      return null;
    }

    return {
      header_code: profile.header_code || '',
      body_code: profile.body_code || '',
      footer_code: profile.footer_code || '',
      company_color: profile.company_color || '#3B82F6',
    };
  } catch (error) {
    console.error('Error fetching partner settings:', error);
    return null;
  }
}
