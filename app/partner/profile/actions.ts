'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const updates = {
    company_name: formData.get('company_name'),
    contact_person: formData.get('contact_person'),
    address: formData.get('address'),
    phone: formData.get('phone'),
    postcode: formData.get('postcode'),
    business_description: formData.get('business_description'),
    website_url: formData.get('website_url')?.toString() || null,
    subdomain: formData.get('subdomain'),
    tier_id: formData.get('tier_id') || null
  };

  try {
    const { error } = await supabase
      .from('UserProfiles')
      .update(updates)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    if (error) throw error;

    revalidatePath('/partner/profile');
    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    return { success: false, message: 'Failed to update profile' };
  }
} 