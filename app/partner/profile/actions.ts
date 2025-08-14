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

export async function updateCustomDomain(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const customDomain = formData.get('custom_domain')?.toString().trim() || null;
  
  // Validate domain format
  if (customDomain && !isValidDomain(customDomain)) {
    return { success: false, message: 'Please enter a valid domain (e.g., shop.yourdomain.com)' };
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: 'Authentication required' };
    }

    // Check if Vercel environment variables are configured
    if (!process.env.VERCEL_AUTH_TOKEN || !process.env.VERCEL_PROJECT_ID) {
      return { success: false, message: 'Vercel configuration is missing. Please contact support.' };
    }

    // If a custom domain is provided, add it to Vercel first
    let vercelSuccess = true;
    let vercelMessage = '';
    
    if (customDomain) {
      try {
        console.log('Adding domain to Vercel:', customDomain);
        const vercelResponse = await fetch(`https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: customDomain,
          }),
        });

        const vercelData = await vercelResponse.json();
        
        if (!vercelResponse.ok) {
          console.error('Vercel API error:', vercelData);
          vercelSuccess = false;
          
          // Handle specific Vercel errors
          if (vercelData.error?.code === 'DOMAIN_ALREADY_EXISTS') {
            vercelMessage = 'Domain already exists in Vercel project.';
            vercelSuccess = true; // This is actually fine
          } else if (vercelData.error?.code === 'INVALID_DOMAIN') {
            return { success: false, message: 'Invalid domain format. Please check your domain name.' };
          } else {
            vercelMessage = `Vercel error: ${vercelData.error?.message || 'Unknown error'}`;
          }
        } else {
          vercelMessage = 'Domain successfully added to Vercel.';
          console.log('Domain added to Vercel successfully:', vercelData);
        }
      } catch (vercelError) {
        console.error('Error adding domain to Vercel:', vercelError);
        vercelSuccess = false;
        vercelMessage = 'Failed to add domain to Vercel. Please try again or contact support.';
      }
    }

    // Update the custom domain in the database
    const { error: updateError } = await supabase
      .from('UserProfiles')
      .update({ custom_domain: customDomain })
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    revalidatePath('/partner/profile');
    
    // Return appropriate message based on Vercel success
    if (customDomain) {
      if (vercelSuccess) {
        return { 
          success: true, 
          message: `Custom domain ${customDomain} saved successfully. ${vercelMessage} Please configure your DNS settings.` 
        };
      } else {
        return { 
          success: true, 
          message: `Custom domain ${customDomain} saved to database, but there was an issue with Vercel: ${vercelMessage} Please contact support.` 
        };
      }
    } else {
      return { 
        success: true, 
        message: 'Custom domain removed successfully' 
      };
    }
  } catch (error) {
    console.error('Error updating custom domain:', error);
    return { success: false, message: 'Failed to update custom domain' };
  }
}

export async function checkDomainStatus(domain: string) {
  try {
    // Check if Vercel environment variables are configured
    if (!process.env.VERCEL_AUTH_TOKEN || !process.env.VERCEL_PROJECT_ID) {
      return { verified: false, status: 'error', message: 'Vercel configuration is missing' };
    }

    const response = await fetch(`https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_AUTH_TOKEN}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { verified: false, status: 'error', message: 'Domain not found in Vercel. Please add it to your project first.' };
      }
      return { verified: false, status: 'error', message: 'Failed to check domain status' };
    }

    const data = await response.json();
    console.log('Vercel domain data (actions):', JSON.stringify(data, null, 2));
    
    // Check if domain is verified (Vercel's primary verification field)
    if (data.verified === true) {
      return { verified: true, status: 'verified' };
    }

    // Check if domain is configured (Vercel considers it configured if it has a valid configuration)
    if (data.configured === true) {
      return { verified: true, status: 'verified' };
    }

    // Check verification status if available
    if (data.verification && data.verification.length > 0) {
      const verification = data.verification[0];
      if (verification.status === 'VALID') {
        return { verified: true, status: 'verified' };
      } else if (verification.status === 'PENDING') {
        return { verified: false, status: 'pending' };
      } else {
        return { verified: false, status: 'error', message: verification.reason || 'Verification failed' };
      }
    }

    // Check for other indicators of proper configuration
    if (data.redirect || data.redirectStatusCode || data.gitBranch) {
      return { verified: true, status: 'verified' };
    }

    // If we reach here, the domain exists but might not be fully configured
    return { verified: false, status: 'error', message: 'Domain exists in Vercel but may need DNS configuration. Please check your DNS settings.' };
  } catch (error) {
    console.error('Error checking domain status:', error);
    return { verified: false, status: 'error', message: 'Failed to check domain status' };
  }
}

function isValidDomain(domain: string): boolean {
  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain) && domain.length <= 253;
} 