// Shared utilities for email templates
import { createSampleProductCard } from './product-formatter'

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
    // User info fields (for all email types)
    'firstName', 'lastName', 'email', 'phone', 'postcode', 'fullAddress', 'submissionId', 'submissionDate',
    
    // Company info fields (for all email types)
    'companyName', 'companyPhone', 'companyEmail', 'companyAddress', 'companyWebsite', 'logoUrl', 'primaryColor', 'currentYear', 'privacyPolicy', 'termsConditions',
    
    // Quote fields
    'quoteData', 'quoteLink',
    
    // Product fields (for all templates)
    'productInformation',
    
    // Payment fields
    'orderDetails', 'paymentInfo', 'paymentPlanInfo', 'installationInfo',
    
    // Monthly payment plan fields
    'monthlyPayment', 'paymentDuration', 'deposit', 'apr', 'totalAmount',
    
    // Enquiry fields
    'enquiryDetails', 'uploadedImages', 'category', 'projectDescription',
    
    // Survey fields
    'notes', 'uploadedImageUrls', 'imageInfo', 'surveyDetails'
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
    // User Information - available for all templates
    'User Information': {
      name: 'User Information',
      description: 'Customer personal information available in all email templates',
      fields: allFields.filter(field => 
        ['firstName', 'lastName', 'email', 'phone', 'postcode', 'fullAddress', 'submissionId', 'submissionDate'].includes(field.field_name)
      )
    },
    
    // Company Information - available for all templates
    'Company Information': {
      name: 'Company Information',
      description: 'Partner company information available in all email templates',
      fields: allFields.filter(field => 
        ['companyName', 'companyPhone', 'companyEmail', 'companyAddress', 'companyWebsite', 'logoUrl', 'primaryColor', 'currentYear', 'privacyPolicy', 'termsConditions'].includes(field.field_name)
      )
    },
    
    // Product Information - available for all templates
    'Product Information': {
      name: 'Product Information',
      description: 'Product details available in all email templates',
      fields: allFields.filter(field => 
        ['productInformation'].includes(field.field_name)
      )
    }
  }

  // Add template-specific categories
  switch (emailType) {
    case 'quote-initial':
    case 'quote-verified':
      categories['Quote Details'] = {
        name: 'Quote Details',
        description: 'Quote request and verification information',
        fields: allFields.filter(field => 
          ['quoteData', 'quoteLink'].includes(field.field_name)
        )
      }
      break

    case 'save-quote':
      // Save quote only has product information (already included in Product Information category)
      break

    case 'checkout-monthly':
      categories['Payment Plan Details'] = {
        name: 'Payment Plan Details',
        description: 'Monthly payment plan information',
        fields: allFields.filter(field => 
          ['monthlyPayment', 'paymentDuration', 'deposit', 'apr', 'totalAmount'].includes(field.field_name)
        )
      }
      categories['Order Details'] = {
        name: 'Order Details',
        description: 'Order and payment information',
        fields: allFields.filter(field => 
          ['orderDetails', 'paymentInfo', 'installationInfo'].includes(field.field_name)
        )
      }
      break

    case 'checkout-pay-later':
    case 'checkout-stripe':
      categories['Order Details'] = {
        name: 'Order Details',
        description: 'Order and payment information',
        fields: allFields.filter(field => 
          ['orderDetails', 'paymentInfo', 'installationInfo'].includes(field.field_name)
        )
      }
      break

    case 'enquiry-submitted':
      categories['Enquiry Details'] = {
        name: 'Enquiry Details',
        description: 'Customer enquiry information',
        fields: allFields.filter(field => 
          ['enquiryDetails', 'uploadedImages', 'category', 'projectDescription'].includes(field.field_name)
        )
      }
      break

    case 'survey-submitted':
      categories['Survey Details'] = {
        name: 'Survey Details',
        description: 'Survey response and image information',
        fields: allFields.filter(field => 
          ['notes', 'uploadedImageUrls', 'imageInfo', 'surveyDetails'].includes(field.field_name)
        )
      }
      break
  }

  return Object.values(categories)
}

// Get all template fields (used internally)
function getAllTemplateFields(): TemplateField[] {
  return [
    // User Information fields (for all email types)
    { field_name: 'firstName', field_type: 'text', display_name: 'First Name', description: 'Customer first name', is_required: true, is_system: true, sample_value: 'John' },
    { field_name: 'lastName', field_type: 'text', display_name: 'Last Name', description: 'Customer last name', is_required: true, is_system: true, sample_value: 'Doe' },
    { field_name: 'email', field_type: 'text', display_name: 'Email', description: 'Customer email address', is_required: true, is_system: true, sample_value: 'john.doe@example.com' },
    { field_name: 'phone', field_type: 'text', display_name: 'Phone', description: 'Customer phone number', is_required: false, is_system: true, sample_value: '07123456789' },
    { field_name: 'postcode', field_type: 'text', display_name: 'Postcode', description: 'Customer postcode', is_required: true, is_system: true, sample_value: 'SW1A 1AA' },
    { field_name: 'fullAddress', field_type: 'text', display_name: 'Full Address', description: 'Customer complete address', is_required: false, is_system: true, sample_value: '123 Main Street, London, SW1A 1AA' },
    { field_name: 'submissionId', field_type: 'text', display_name: 'Submission ID', description: 'Unique submission identifier', is_required: true, is_system: true, sample_value: '896cd588-20e5-45c2-8c30-2622958bfca2' },
    { field_name: 'submissionDate', field_type: 'date', display_name: 'Submission Date', description: 'Date of quote submission', is_required: true, is_system: true, sample_value: '2024-01-15' },
    
    // Company Information fields (for all email types)
    { field_name: 'companyName', field_type: 'text', display_name: 'Company Name', description: 'Partner company name', is_required: true, is_system: true, sample_value: 'ABC Boilers Ltd' },
    { field_name: 'companyPhone', field_type: 'text', display_name: 'Company Phone', description: 'Company contact phone', is_required: false, is_system: true, sample_value: '0800 123 4567' },
    { field_name: 'companyEmail', field_type: 'text', display_name: 'Company Email', description: 'Company contact email', is_required: false, is_system: true, sample_value: 'info@abcboilers.com' },
    { field_name: 'companyAddress', field_type: 'text', display_name: 'Company Address', description: 'Company full address', is_required: false, is_system: true, sample_value: '123 Business St, London' },
    { field_name: 'companyWebsite', field_type: 'text', display_name: 'Company Website', description: 'Company website URL', is_required: false, is_system: true, sample_value: 'https://www.abcboilers.com' },
    { field_name: 'logoUrl', field_type: 'text', display_name: 'Logo URL', description: 'Company logo image URL', is_required: false, is_system: true, sample_value: 'https://example.com/logo.png' },
    { field_name: 'primaryColor', field_type: 'text', display_name: 'Primary Color', description: 'Company primary color', is_required: false, is_system: true, sample_value: '#3b82f6' },
    { field_name: 'currentYear', field_type: 'text', display_name: 'Current Year', description: 'Current year', is_required: false, is_system: true, sample_value: '2024' },
    { field_name: 'privacyPolicy', field_type: 'text', display_name: 'Privacy Policy', description: 'Privacy policy text or link', is_required: false, is_system: true, sample_value: 'Privacy Policy' },
    { field_name: 'termsConditions', field_type: 'text', display_name: 'Terms & Conditions', description: 'Terms and conditions text or link', is_required: false, is_system: true, sample_value: 'Terms & Conditions' },
    
    // Product Information field (for all templates)
    { field_name: 'productInformation', field_type: 'html', display_name: 'Product Information', description: 'Comprehensive product information with formatted HTML (handles multiple products)', is_required: false, is_system: true, sample_value: createSampleProductCard() },
    
    // Quote fields
    { field_name: 'quoteData', field_type: 'table', display_name: 'Quote Data', description: 'Detailed quote information with question and answer pairs', is_required: false, is_system: true, sample_value: 'Which fuel powers your boiler?: Mains Gas\nWhat type of boiler do you currently have?: Regular Boiler\nGreat, do you want your boiler in a new location?: No, I don\'t\nWhere is your current boiler?: Kitchen\nWhat type of property do you have?: Detached\nHow many bedrooms does it have?: 2\nHow many bathrooms does it have?: 2\nWhere does your boiler\'s flue exit your home?: External Wall\nWhen Are You Thinking About Replacing Your Boiler?: 1-3 Weeks\nWhere did you hear about us?: Word of mouth' },
    { field_name: 'quoteLink', field_type: 'text', display_name: 'Quote Link', description: 'Link to view full quote', is_required: false, is_system: true, sample_value: 'https://example.com/quote/123' },
    
    // Payment fields
    { field_name: 'orderDetails', field_type: 'table', display_name: 'Order Details', description: 'Order information and items', is_required: false, is_system: true, sample_value: 'Product: Combi Boiler\nQuantity: 1\nInstallation: Included' },
    { field_name: 'paymentInfo', field_type: 'table', display_name: 'Payment Information', description: 'Payment details and status', is_required: false, is_system: true, sample_value: 'Payment Method: Card\nAmount: £2,500\nStatus: Confirmed' },
    { field_name: 'paymentPlanInfo', field_type: 'table', display_name: 'Payment Plan Info', description: 'Payment plan details', is_required: false, is_system: true, sample_value: 'Monthly Amount: £125\nTotal Months: 20\nAPR: 9.9%' },
    { field_name: 'installationInfo', field_type: 'table', display_name: 'Installation Information', description: 'Installation details and schedule', is_required: false, is_system: true, sample_value: 'Installation Date: 2024-02-15\nEngineer: John Smith\nTime: 9:00 AM' },
    
    // Monthly payment plan fields
    { field_name: 'monthlyPayment', field_type: 'text', display_name: 'Monthly Payment', description: 'Monthly payment amount', is_required: false, is_system: true, sample_value: '£125' },
    { field_name: 'paymentDuration', field_type: 'text', display_name: 'Payment Duration', description: 'Number of months for payment', is_required: false, is_system: true, sample_value: '20 months' },
    { field_name: 'deposit', field_type: 'text', display_name: 'Deposit', description: 'Initial deposit amount', is_required: false, is_system: true, sample_value: '£500' },
    { field_name: 'apr', field_type: 'text', display_name: 'APR', description: 'Annual percentage rate', is_required: false, is_system: true, sample_value: '9.9%' },
    { field_name: 'totalAmount', field_type: 'text', display_name: 'Total Amount', description: 'Total amount to be paid', is_required: false, is_system: true, sample_value: '£2,500' },
    
    // Enquiry fields
    { field_name: 'enquiryDetails', field_type: 'table', display_name: 'Enquiry Details', description: 'Customer enquiry information', is_required: false, is_system: true, sample_value: 'Service: Boiler Repair\nUrgency: High\nPreferred Contact: Phone' },
    { field_name: 'uploadedImages', field_type: 'text', display_name: 'Uploaded Images', description: 'Customer uploaded images', is_required: false, is_system: true, sample_value: '3 images uploaded' },
    { field_name: 'category', field_type: 'text', display_name: 'Service Category', description: 'Service category name', is_required: false, is_system: true, sample_value: 'Boiler Services' },
    { field_name: 'projectDescription', field_type: 'text', display_name: 'Project Description', description: 'Tell us about your project', is_required: false, is_system: true, sample_value: 'Need a new boiler installation for my 3-bedroom house' },
    
    // Survey fields
    { field_name: 'notes', field_type: 'text', display_name: 'Notes', description: 'Customer notes or comments', is_required: false, is_system: true, sample_value: 'Customer prefers morning appointments' },
    { field_name: 'uploadedImageUrls', field_type: 'text', display_name: 'Uploaded Image URLs', description: 'URLs of uploaded images', is_required: false, is_system: true, sample_value: 'https://example.com/image1.jpg, https://example.com/image2.jpg' },
    { field_name: 'imageInfo', field_type: 'text', display_name: 'Image Info', description: 'Information about what each image shows', is_required: false, is_system: true, sample_value: 'Image 1: Current boiler\nImage 2: Installation area' },
    { field_name: 'surveyDetails', field_type: 'table', display_name: 'Survey Details', description: 'Survey questions and answers', is_required: false, is_system: true, sample_value: 'Q: Property type? A: Semi-detached\nQ: Current heating? A: Gas central heating' }
  ]
}

// Get all template fields for all email types in a category
export function getAllTemplateFieldsForCategory(): TemplateFieldCategory[] {
  const allFields = getAllTemplateFields()
  
  return [
    // User Information - available for all templates
    {
      name: 'User Information',
      description: 'Customer personal information available in all email templates',
      fields: allFields.filter(field => 
        ['firstName', 'lastName', 'email', 'phone', 'postcode', 'fullAddress', 'submissionId', 'submissionDate'].includes(field.field_name)
      )
    },
    
    // Company Information - available for all templates
    {
      name: 'Company Information',
      description: 'Partner company information available in all email templates',
      fields: allFields.filter(field => 
        ['companyName', 'companyPhone', 'companyEmail', 'companyAddress', 'companyWebsite', 'logoUrl', 'primaryColor', 'currentYear', 'privacyPolicy', 'termsConditions'].includes(field.field_name)
      )
    },
    
    // Product Information - available for all templates
    {
      name: 'Product Information',
      description: 'Product details available in all email templates',
      fields: allFields.filter(field => 
        ['productInformation'].includes(field.field_name)
      )
    },
    
    // Quote Details - for quote-related templates
    {
      name: 'Quote Details',
      description: 'Quote request and verification information',
      fields: allFields.filter(field => 
        ['quoteData', 'quoteLink'].includes(field.field_name)
      )
    },
    
    // Payment Plan Details - for monthly payment templates
    {
      name: 'Payment Plan Details',
      description: 'Monthly payment plan information',
      fields: allFields.filter(field => 
        ['monthlyPayment', 'paymentDuration', 'deposit', 'apr', 'totalAmount'].includes(field.field_name)
      )
    },
    
    // Order Details - for checkout templates
    {
      name: 'Order Details',
      description: 'Order and payment information',
      fields: allFields.filter(field => 
        ['orderDetails', 'paymentInfo', 'paymentPlanInfo', 'installationInfo'].includes(field.field_name)
      )
    },
    
    // Enquiry Details - for enquiry templates
    {
      name: 'Enquiry Details',
      description: 'Customer enquiry information',
      fields: allFields.filter(field => 
        ['enquiryDetails', 'uploadedImages', 'category', 'projectDescription'].includes(field.field_name)
      )
    },
    
    // Survey Details - for survey templates
    {
      name: 'Survey Details',
      description: 'Survey response and image information',
      fields: allFields.filter(field => 
        ['notes', 'uploadedImageUrls', 'imageInfo', 'surveyDetails'].includes(field.field_name)
      )
    }
  ]
}

// Legacy function for backward compatibility
export function getDefaultTemplateFields(): TemplateField[] {
  return getAllTemplateFields()
}
