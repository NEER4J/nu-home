// Shared utilities for email templates

export interface TemplateField {
  field_name: string
  field_type: string
  display_name: string
  description?: string
  is_required: boolean
  is_system: boolean
  sample_value?: string
}

export function getDefaultDynamicFields(): string[] {
  return [
    // Customer fields
    'firstName', 'lastName', 'email', 'phone', 'postcode',
    
    // Company fields
    'companyName', 'companyPhone', 'companyEmail', 'companyAddress', 'companyWebsite', 'logoUrl',
    
    // Quote/Order fields
    'refNumber', 'submissionId', 'quoteLink', 'submissionDate', 'quoteInfo', 'addressInfo',
    
    // Payment fields
    'orderDetails', 'paymentInfo', 'paymentPlanInfo', 'installationInfo',
    
    // Enquiry fields
    'enquiryDetails', 'uploadedImages', 'category',
    
    // Survey fields
    'notes',
    
    // System fields
    'primaryColor', 'currentYear', 'privacyPolicy', 'termsConditions'
  ]
}

// Template-specific field categories
export interface TemplateFieldCategory {
  name: string
  description: string
  fields: TemplateField[]
}

// Get template fields categorized by email type
export function getTemplateFieldsByEmailType(emailType: string): TemplateFieldCategory[] {
  const allFields = getAllTemplateFields()
  
  const categories: Record<string, TemplateFieldCategory> = {
    // Common fields for all templates
    'Common': {
      name: 'Common Fields',
      description: 'Fields available in all email templates',
      fields: allFields.filter(field => 
        ['firstName', 'lastName', 'email', 'phone', 'postcode', 'companyName', 'companyPhone', 'companyEmail', 'companyAddress', 'companyWebsite', 'logoUrl', 'refNumber', 'submissionId', 'submissionDate', 'primaryColor', 'currentYear', 'privacyPolicy', 'termsConditions'].includes(field.field_name)
      )
    }
  }

  // Add template-specific categories
  switch (emailType) {
    case 'quote-initial':
      categories['Quote Details'] = {
        name: 'Quote Details',
        description: 'Initial quote request information',
        fields: allFields.filter(field => 
          ['quoteInfo', 'addressInfo', 'quoteLink'].includes(field.field_name)
        )
      }
      break

    case 'quote-verified':
      categories['Quote Details'] = {
        name: 'Quote Details',
        description: 'Verified quote information',
        fields: allFields.filter(field => 
          ['quoteInfo', 'addressInfo', 'quoteLink'].includes(field.field_name)
        )
      }
      break

    case 'save-quote':
      categories['Quote Details'] = {
        name: 'Quote Details',
        description: 'Saved quote information',
        fields: allFields.filter(field => 
          ['quoteInfo', 'quoteLink'].includes(field.field_name)
        )
      }
      break

    case 'checkout-stripe':
    case 'checkout-monthly':
    case 'checkout-pay-later':
      categories['Order Details'] = {
        name: 'Order Details',
        description: 'Product and order information',
        fields: allFields.filter(field => 
          ['orderDetails', 'paymentInfo', 'installationInfo'].includes(field.field_name)
        )
      }
      if (emailType === 'checkout-monthly') {
        categories['Payment Plan'] = {
          name: 'Payment Plan',
          description: 'Monthly payment plan details',
          fields: allFields.filter(field => 
            ['paymentPlanInfo'].includes(field.field_name)
          )
        }
      }
      break

    case 'enquiry-submitted':
      categories['Enquiry Details'] = {
        name: 'Enquiry Details',
        description: 'Customer enquiry information',
        fields: allFields.filter(field => 
          ['enquiryDetails', 'uploadedImages', 'category'].includes(field.field_name)
        )
      }
      break

    case 'survey-submitted':
      categories['Survey Details'] = {
        name: 'Survey Details',
        description: 'Survey response information',
        fields: allFields.filter(field => 
          ['notes'].includes(field.field_name)
        )
      }
      break
  }

  return Object.values(categories)
}

// Get all template fields (used internally)
function getAllTemplateFields(): TemplateField[] {
  return [
    // Customer fields
    { field_name: 'firstName', field_type: 'text', display_name: 'First Name', description: 'Customer first name', is_required: true, is_system: true, sample_value: 'John' },
    { field_name: 'lastName', field_type: 'text', display_name: 'Last Name', description: 'Customer last name', is_required: true, is_system: true, sample_value: 'Doe' },
    { field_name: 'email', field_type: 'text', display_name: 'Email', description: 'Customer email address', is_required: true, is_system: true, sample_value: 'john.doe@example.com' },
    { field_name: 'phone', field_type: 'text', display_name: 'Phone', description: 'Customer phone number', is_required: false, is_system: true, sample_value: '07123456789' },
    { field_name: 'postcode', field_type: 'text', display_name: 'Postcode', description: 'Customer postcode', is_required: true, is_system: true, sample_value: 'SW1A 1AA' },
    
    // Company fields
    { field_name: 'companyName', field_type: 'text', display_name: 'Company Name', description: 'Partner company name', is_required: true, is_system: true, sample_value: 'ABC Boilers Ltd' },
    { field_name: 'companyPhone', field_type: 'text', display_name: 'Company Phone', description: 'Company contact phone', is_required: false, is_system: true, sample_value: '0800 123 4567' },
    { field_name: 'companyEmail', field_type: 'text', display_name: 'Company Email', description: 'Company contact email', is_required: false, is_system: true, sample_value: 'info@abcboilers.com' },
    { field_name: 'companyAddress', field_type: 'text', display_name: 'Company Address', description: 'Company full address', is_required: false, is_system: true, sample_value: '123 Business St, London' },
    { field_name: 'companyWebsite', field_type: 'text', display_name: 'Company Website', description: 'Company website URL', is_required: false, is_system: true, sample_value: 'https://www.abcboilers.com' },
    { field_name: 'logoUrl', field_type: 'text', display_name: 'Logo URL', description: 'Company logo image URL', is_required: false, is_system: true, sample_value: 'https://example.com/logo.png' },
    
    // Quote/Order fields
    { field_name: 'refNumber', field_type: 'text', display_name: 'Reference Number', description: 'Quote reference number', is_required: true, is_system: true, sample_value: 'REF-2024-001' },
    { field_name: 'submissionId', field_type: 'text', display_name: 'Submission ID', description: 'Unique submission identifier', is_required: true, is_system: true, sample_value: '896cd588-20e5-45c2-8c30-2622958bfca2' },
    { field_name: 'quoteLink', field_type: 'text', display_name: 'Quote Link', description: 'Link to view full quote', is_required: false, is_system: true, sample_value: 'https://example.com/quote/123' },
    { field_name: 'submissionDate', field_type: 'date', display_name: 'Submission Date', description: 'Date of quote submission', is_required: true, is_system: true, sample_value: '2024-01-15' },
    { field_name: 'quoteInfo', field_type: 'table', display_name: 'Quote Information', description: 'Detailed quote information', is_required: false, is_system: true, sample_value: 'Boiler Type: Combi\nProperty Type: Semi-detached' },
    { field_name: 'addressInfo', field_type: 'table', display_name: 'Address Information', description: 'Property address details', is_required: false, is_system: true, sample_value: 'Line 1: 123 Main St\nCity: London' },
    
    // Payment fields
    { field_name: 'orderDetails', field_type: 'table', display_name: 'Order Details', description: 'Order information and items', is_required: false, is_system: true, sample_value: 'Product: Combi Boiler\nQuantity: 1' },
    { field_name: 'paymentInfo', field_type: 'table', display_name: 'Payment Information', description: 'Payment details and status', is_required: false, is_system: true, sample_value: 'Payment Method: Card\nAmount: £2,500' },
    { field_name: 'paymentPlanInfo', field_type: 'table', display_name: 'Payment Plan', description: 'Monthly payment plan details', is_required: false, is_system: true, sample_value: 'Monthly Amount: £125\nTotal Months: 20' },
    { field_name: 'installationInfo', field_type: 'table', display_name: 'Installation Information', description: 'Installation details and schedule', is_required: false, is_system: true, sample_value: 'Installation Date: 2024-02-15\nEngineer: John Smith' },
    
    // Enquiry fields
    { field_name: 'enquiryDetails', field_type: 'table', display_name: 'Enquiry Details', description: 'Customer enquiry information', is_required: false, is_system: true, sample_value: 'Service: Boiler Repair\nUrgency: High' },
    { field_name: 'uploadedImages', field_type: 'text', display_name: 'Uploaded Images', description: 'Customer uploaded images', is_required: false, is_system: true, sample_value: '3 images uploaded' },
    { field_name: 'category', field_type: 'text', display_name: 'Service Category', description: 'Service category name', is_required: false, is_system: true, sample_value: 'Boiler Services' },
    
    // Survey fields
    { field_name: 'notes', field_type: 'text', display_name: 'Notes', description: 'Customer notes or comments', is_required: false, is_system: true, sample_value: 'Customer prefers morning appointments' },
    
    // System fields
    { field_name: 'primaryColor', field_type: 'text', display_name: 'Primary Color', description: 'Company primary color', is_required: false, is_system: true, sample_value: '#3b82f6' },
    { field_name: 'currentYear', field_type: 'text', display_name: 'Current Year', description: 'Current year', is_required: false, is_system: true, sample_value: '2024' },
    { field_name: 'privacyPolicy', field_type: 'text', display_name: 'Privacy Policy', description: 'Privacy policy text or link', is_required: false, is_system: true, sample_value: 'Privacy Policy' },
    { field_name: 'termsConditions', field_type: 'text', display_name: 'Terms & Conditions', description: 'Terms and conditions text or link', is_required: false, is_system: true, sample_value: 'Terms & Conditions' }
  ]
}

// Legacy function for backward compatibility
export function getDefaultTemplateFields(): TemplateField[] {
  return getAllTemplateFields()
}
