# Email Template Data Flow Documentation

## Overview

This document explains how dynamic field data flows from product pages to email templates in the boiler service system.

## Data Flow Architecture

```
Product Pages → API Routes → Email Templates → Customer/Admin Emails
```

## 1. Data Sources (Product Pages)

### Quote Initial (`/boiler/quote`)
**Data Sent:**
```javascript
{
  first_name: "John",
  last_name: "Doe", 
  email: "john@example.com",
  phone: "07123456789",
  postcode: "SW1A 1AA",
  quote_data: filteredAnswers,        // Form answers
  address_data: selectedAddress,      // Property address
  questions: questions,               // Form questions
  submission_id: "uuid-here",
  subdomain: "partner-subdomain"
}
```

### Save Quote (`/boiler/products`)
**Data Sent:**
```javascript
{
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com", 
  submission_id: "uuid-here",
  postcode: "SW1A 1AA",
  products: [                        // Selected products
    {
      name: "Combi Boiler",
      price: 2500,
      description: "High efficiency boiler"
    }
  ],
  subdomain: "partner-subdomain"
}
```

### Checkout (Stripe/Monthly/Pay-Later)
**Data Sent:**
```javascript
{
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  phone: "07123456789", 
  postcode: "SW1A 1AA",
  order_details: {
    product: {
      name: "Combi Boiler",
      price: 2500
    },
    addons: [
      {
        title: "Extended Warranty",
        quantity: 1,
        price: 200
      }
    ],
    bundles: [...],
    total: 2700
  },
  installation_date: "2024-02-15",
  submission_id: "uuid-here",
  subdomain: "partner-subdomain"
}
```

### Enquiry Submitted (`/boiler/enquiry`)
**Data Sent:**
```javascript
{
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  phone: "07123456789",
  postcode: "SW1A 1AA", 
  enquiry_details: formData,         // Enquiry form data
  submission_id: "uuid-here",
  category: "boiler",
  uploaded_image_urls: {...}         // Uploaded images
}
```

## 2. API Route Processing

### Template Data Mapping

Each API route (`/api/email/boiler/*`) processes the incoming data and maps it to template fields:

```javascript
// Example from save-quote route
const templateData = {
  // Customer fields
  firstName: first_name,
  lastName: last_name, 
  email,
  phone: undefined, // Not available in save-quote
  postcode,
  
  // Company fields (from partner profile)
  companyName,
  companyPhone,
  companyEmail,
  companyAddress,
  companyWebsite,
  logoUrl,
  
  // Quote fields
  refNumber: submission_id || `BOILER-${Date.now()...}`,
  submissionId: submission_id,
  quoteLink: quoteLink || undefined,
  quoteInfo: productsInfo,           // Formatted products
  addressInfo: undefined,            // Not available in save-quote
  submissionDate,
  
  // System fields
  privacyPolicy,
  termsConditions,
  primaryColor: companyColor
}
```

### Data Formatting Functions

**Products Formatting:**
```javascript
const formatProducts = (productsData) => {
  if (Array.isArray(productsData)) {
    return productsData.map((product, index) => {
      let productText = `${index + 1}. ${product.name || 'Product'}`
      if (product.price) productText += ` - £${product.price.toFixed(2)}`
      if (product.description) productText += `\n   ${product.description}`
      return productText
    }).join('\n\n')
  }
  return String(productsData)
}
```

## 3. Dynamic Field Categories by Email Type

### Quote Initial (`quote-initial`)
- **Common Fields**: firstName, lastName, email, phone, postcode, companyName, etc.
- **Quote Details**: quoteInfo, addressInfo, quoteLink

### Quote Verified (`quote-verified`) 
- **Common Fields**: firstName, lastName, email, phone, postcode, companyName, etc.
- **Quote Details**: quoteInfo, addressInfo, quoteLink

### Save Quote (`save-quote`)
- **Common Fields**: firstName, lastName, email, postcode, companyName, etc.
- **Quote Details**: quoteInfo, quoteLink

### Checkout Stripe (`checkout-stripe`)
- **Common Fields**: firstName, lastName, email, phone, postcode, companyName, etc.
- **Order Details**: orderDetails, paymentInfo, installationInfo

### Checkout Monthly (`checkout-monthly`)
- **Common Fields**: firstName, lastName, email, phone, postcode, companyName, etc.
- **Order Details**: orderDetails, paymentInfo, installationInfo
- **Payment Plan**: paymentPlanInfo

### Checkout Pay Later (`checkout-pay-later`)
- **Common Fields**: firstName, lastName, email, phone, postcode, companyName, etc.
- **Order Details**: orderDetails, paymentInfo, installationInfo

### Enquiry Submitted (`enquiry-submitted`)
- **Common Fields**: firstName, lastName, email, phone, postcode, companyName, etc.
- **Enquiry Details**: enquiryDetails, uploadedImages, category

### Survey Submitted (`survey-submitted`)
- **Common Fields**: firstName, lastName, email, phone, postcode, companyName, etc.
- **Survey Details**: notes

## 4. Template Processing

### Custom Templates
1. Check for custom template in `email_templates` table
2. If found, use `getProcessedEmailTemplate()` function
3. Replace `{{fieldName}}` placeholders with actual data
4. Apply styling (colors, fonts, etc.)

### Default Templates
1. If no custom template, use hardcoded template from template files
2. Same placeholder replacement process
3. Apply default styling

### Template Rendering
```javascript
// Replace variables in template
Object.entries(templateData).forEach(([key, value]) => {
  const regex = new RegExp(`{{${key}}}`, 'g')
  processedHtml = processedHtml.replace(regex, String(value || ''))
  processedSubject = processedSubject.replace(regex, String(value || ''))
  processedText = processedText.replace(regex, String(value || ''))
})
```

## 5. Available Dynamic Fields

### Customer Fields
- `firstName` - Customer first name
- `lastName` - Customer last name  
- `email` - Customer email address
- `phone` - Customer phone number
- `postcode` - Customer postcode

### Company Fields
- `companyName` - Partner company name
- `companyPhone` - Company contact phone
- `companyEmail` - Company contact email
- `companyAddress` - Company full address
- `companyWebsite` - Company website URL
- `logoUrl` - Company logo image URL

### Quote/Order Fields
- `refNumber` - Quote reference number
- `submissionId` - Unique submission identifier
- `quoteLink` - Link to view full quote
- `submissionDate` - Date of quote submission
- `quoteInfo` - Detailed quote information (formatted)
- `addressInfo` - Property address details

### Payment Fields
- `orderDetails` - Order information and items
- `paymentInfo` - Payment details and status
- `paymentPlanInfo` - Monthly payment plan details
- `installationInfo` - Installation details and schedule

### Enquiry Fields
- `enquiryDetails` - Customer enquiry information
- `uploadedImages` - Customer uploaded images
- `category` - Service category name

### Survey Fields
- `notes` - Customer notes or comments

### System Fields
- `primaryColor` - Company primary color
- `currentYear` - Current year
- `privacyPolicy` - Privacy policy text or link
- `termsConditions` - Terms and conditions text or link

## 6. Usage in Templates

### HTML Templates
```html
<h1>Hello {{firstName}} {{lastName}}!</h1>
<p>Your quote reference is: {{refNumber}}</p>
<p>Company: {{companyName}}</p>
```

### Text Templates
```
Hello {{firstName}} {{lastName}}!

Your quote reference is: {{refNumber}}
Company: {{companyName}}
```

### Subject Lines
```
Your quote request - {{companyName}}
Quote Saved Successfully - {{companyName}}
```

## 7. Data Flow Summary

1. **User fills form** on product page (quote, products, checkout, etc.)
2. **Form data sent** to appropriate API route (`/api/email/boiler/*`)
3. **API route processes** data and maps to template fields
4. **Partner info loaded** from database (company details, SMTP settings)
5. **Template selected** (custom from database or default hardcoded)
6. **Placeholders replaced** with actual data (`{{fieldName}}` → actual value)
7. **Email sent** via SMTP to customer and/or admin
8. **Template categorized** by email type for better organization in editor

This system ensures consistent data flow and makes it easy to Customise email templates while maintaining data integrity across all email types.
