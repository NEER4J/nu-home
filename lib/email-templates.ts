import { createClient } from '@/utils/supabase/server'

interface EmailTemplateData {
  // Customer fields
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  postcode?: string
  
  // Company fields
  companyName?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
  companyWebsite?: string
  logoUrl?: string
  
  // Quote fields
  refNumber?: string
  submissionId?: string
  quoteLink?: string
  quoteInfo?: string
  addressInfo?: string
  submissionDate?: string
  
  // Payment fields
  productName?: string
  productPrice?: number
  installationDate?: string
  paymentMethod?: string
  
  // Links
  privacyPolicy?: string
  termsConditions?: string
  
  // Styling
  primaryColor?: string
  
  // Additional dynamic fields
  [key: string]: any
}

export async function getProcessedEmailTemplate(
  partnerId: string,
  category: string,
  emailType: string,
  recipientType: 'customer' | 'admin',
  data: EmailTemplateData
): Promise<{ subject: string; html: string; text: string } | null> {
  try {
    const supabase = await createClient()
    
    // Fetch the custom template
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('category', category)
      .eq('email_type', emailType)
      .eq('recipient_type', recipientType)
      .eq('is_active', true)
      .single()

    if (error || !template) {
      // No custom template found, return null to use default
      return null
    }

    // Process the template with the provided data
    let processedHtml = template.html_template
    let processedText = template.text_template || ''
    let processedSubject = template.subject_template

    // Add current year to data
    const processData = {
      ...data,
      currentYear: new Date().getFullYear()
    }

    // Replace variables
    Object.entries(processData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processedHtml = processedHtml.replace(regex, String(value || ''))
      processedText = processedText.replace(regex, String(value || ''))
      processedSubject = processedSubject.replace(regex, String(value || ''))
    })



    // Apply styling if present
    if (template.styling) {
      const { primaryColor, fontFamily, headerBgColor, footerBgColor } = template.styling
      processedHtml = processedHtml.replace(/{{primaryColor}}/g, primaryColor || data.primaryColor || '#3b82f6')
      processedHtml = processedHtml.replace(/{{fontFamily}}/g, fontFamily || 'Arial, sans-serif')
      processedHtml = processedHtml.replace(/{{headerBgColor}}/g, headerBgColor || primaryColor || data.primaryColor || '#3b82f6')
      processedHtml = processedHtml.replace(/{{footerBgColor}}/g, footerBgColor || '#f9fafb')
    }

    return {
      subject: processedSubject,
      html: processedHtml,
      text: processedText
    }
  } catch (error) {
    console.error('Error processing email template:', error)
    return null
  }
}

// Helper function to build the quote link URL
export function buildQuoteLink(
  customDomain: string | null,
  domainVerified: boolean | null,
  subdomain: string | null,
  submissionId: string,
  category: string = 'boiler',
  mainPageUrl?: string | null,
  isIframeContext?: boolean
): string | null {
  console.log('buildQuoteLink called with:', {
    customDomain,
    domainVerified,
    subdomain,
    submissionId,
    category,
    mainPageUrl,
    isIframeContext
  });

  // If we have a main page URL and this is from iframe context, use the main page URL
  if (mainPageUrl && isIframeContext) {
    console.log('Using main page URL for iframe context:', mainPageUrl);
    // Add submission ID as a parameter to the main page URL
    const url = new URL(mainPageUrl);
    url.searchParams.set('submission', submissionId);
    const result = url.toString();
    console.log('Generated main page URL with submission:', result);
    return result;
  }

  // Otherwise, use the original logic for main domain
  const baseUrl = customDomain && domainVerified 
    ? `https://${customDomain}`
    : subdomain 
      ? `https://${subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'yourdomain.com'}`
      : null

  if (!baseUrl) return null
  
  const result = `${baseUrl}/${category}/products?submission=${submissionId}`;
  console.log('Generated subdomain/custom domain URL:', result);
  return result;
}
