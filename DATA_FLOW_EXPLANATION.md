# How Data Flows from Pages to Email Templates

## Overview

Each page decides what data to send to the API based on what information is available and relevant for that specific email type. Here's exactly how it works:

## 1. Page-Level Data Collection

### Quote Initial Page (`/boiler/quote`)
**What data is collected:**
```javascript
// From form submission
const contactDetails = {
  firstName: "John",
  lastName: "Doe", 
  email: "john@example.com",
  phone: "07123456789",
  postcode: "SW1A 1AA"
}

// From form answers
const filteredAnswers = {
  "property_type": "Semi-detached",
  "boiler_type": "Combi",
  "bedrooms": "3"
}

// From address selection
const selectedAddress = {
  "line1": "123 Main Street",
  "city": "London",
  "postcode": "SW1A 1AA"
}

// From form questions
const questions = [
  { id: "property_type", question: "What type of property?" },
  { id: "boiler_type", question: "What type of boiler?" }
]
```

**What gets sent to API:**
```javascript
await fetch('/api/email/boiler/quote-initial', {
  method: 'POST',
  body: JSON.stringify({
    first_name: contactDetails.firstName,        // → firstName
    last_name: contactDetails.lastName,          // → lastName
    email: contactDetails.email,                 // → email
    phone: contactDetails.phone,                 // → phone
    postcode: contactDetails.postcode,           // → postcode
    quote_data: filteredAnswers,                 // → quoteInfo (formatted)
    address_data: selectedAddress,               // → addressInfo (formatted)
    questions: questions,                        // → Used for formatting
    submission_id: result.data.submission_id,   // → submissionId
    subdomain: hostname                          // → Used for partner lookup
  })
})
```

### Save Quote Dialog (`/boiler/products`)
**What data is collected:**
```javascript
// From dialog form
const firstName = "John"
const lastName = "Doe"
const email = "john@example.com"
const submissionId = "uuid-here"
const postcode = "SW1A 1AA"

// From selected products
const products = [
  {
    name: "Combi Boiler",
    price: 2500,
    description: "High efficiency boiler"
  },
  {
    name: "Extended Warranty", 
    price: 200,
    description: "5 year warranty"
  }
]
```

**What gets sent to API:**
```javascript
await fetch('/api/email/boiler/save-quote', {
  method: 'POST',
  body: JSON.stringify({
    first_name: firstName,        // → firstName
    last_name: lastName,          // → lastName
    email: email,                 // → email
    submission_id: submissionId,  // → submissionId
    postcode: postcode,           // → postcode
    products: products,           // → quoteInfo (formatted)
    subdomain: hostname           // → Used for partner lookup
  })
})
```

### Checkout Page (`/boiler/checkout`)
**What data is collected:**
```javascript
// From checkout form
const details = {
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com", 
  phone: "07123456789",
  postcode: "SW1A 1AA"
}

// From product selection
const selectedProduct = {
  name: "Combi Boiler",
  price: 2500
}

// From addon selection
const selectedAddons = [
  {
    title: "Extended Warranty",
    quantity: 1,
    price: 200
  }
]

// From bundles
const selectedBundles = [
  {
    bundle: { title: "Installation Package" },
    quantity: 1,
    unitPrice: 500
  }
]

// From date selection
const selectedDate = "2024-02-15"
const orderTotal = 3200
```

**What gets sent to API:**
```javascript
const emailData = {
  first_name: details.firstName,        // → firstName
  last_name: details.lastName,          // → lastName
  email: details.email,                 // → email
  phone: details.phone,                 // → phone
  postcode: details.postcode,           // → postcode
  order_details: {                      // → orderDetails (formatted)
    product: selectedProduct ? {
      name: selectedProduct.name,
      price: basePrice
    } : null,
    addons: selectedAddons.map(addon => ({
      title: addon.title,
      quantity: addon.quantity,
      price: addon.price
    })),
    bundles: selectedBundles.map(bundle => ({
      title: bundle.bundle.title,
      quantity: bundle.quantity,
      unitPrice: bundle.unitPrice
    })),
    total: orderTotal
  },
  installation_date: selectedDate,      // → installationInfo (formatted)
  submission_id: submissionId,          // → submissionId
  subdomain: hostname                   // → Used for partner lookup
}

// Sent to different endpoints based on payment method
const apiEndpoints = {
  stripe: '/api/email/boiler/checkout-stripe',
  monthly: '/api/email/boiler/checkout-monthly', 
  'pay-later': '/api/email/boiler/checkout-pay-later'
}
```

## 2. API Route Data Processing

### Data Extraction
Each API route extracts the data it needs:

```javascript
// Example from save-quote route
const { 
  first_name, 
  last_name, 
  email, 
  submission_id, 
  postcode, 
  products, 
  subdomain 
} = body || {}
```

### Partner Information Loading
All routes load partner information from the database:

```javascript
const partner = await resolvePartnerByHost(supabase, hostname)

const companyName = partner.company_name
const logoUrl = partner.logo_url
const companyColor = partner.company_color
const privacyPolicy = partner.privacy_policy
const termsConditions = partner.terms_conditions
const companyPhone = partner.phone
const companyAddress = partner.address
const companyWebsite = partner.website_url
```

### Data Formatting
Each route formats the data appropriately:

```javascript
// Products formatting (save-quote)
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

const productsInfo = formatProducts(products)

// Date formatting
const submissionDate = new Date().toLocaleString('en-GB', {
  day: '2-digit',
  month: '2-digit', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})
```

### Template Data Mapping
Each route maps the data to template field names:

```javascript
// Example from save-quote route
const templateData = {
  // Customer fields (from page data)
  firstName: first_name,           // first_name → firstName
  lastName: last_name,             // last_name → lastName
  email: email,                    // email → email
  phone: undefined,                // Not available in save-quote
  postcode: postcode,              // postcode → postcode
  
  // Company fields (from partner database)
  companyName: companyName,        // partner.company_name → companyName
  companyPhone: companyPhone,      // partner.phone → companyPhone
  companyEmail: companyEmail,      // partner.admin_email → companyEmail
  companyAddress: companyAddress,  // partner.address → companyAddress
  companyWebsite: companyWebsite,  // partner.website_url → companyWebsite
  logoUrl: logoUrl,                // partner.logo_url → logoUrl
  
  // Quote fields (formatted from page data)
  refNumber: submission_id || `BOILER-${Date.now()...}`,  // submission_id → refNumber
  submissionId: submission_id,     // submission_id → submissionId
  quoteLink: quoteLink,            // Generated URL → quoteLink
  quoteInfo: productsInfo,         // Formatted products → quoteInfo
  addressInfo: undefined,          // Not available in save-quote
  submissionDate: submissionDate,  // Formatted date → submissionDate
  
  // System fields (from partner database)
  privacyPolicy: privacyPolicy,    // partner.privacy_policy → privacyPolicy
  termsConditions: termsConditions, // partner.terms_conditions → termsConditions
  primaryColor: companyColor       // partner.company_color → primaryColor
}
```

## 3. Template Processing

### Custom Template Check
```javascript
const customCustomerTemplate = await getProcessedEmailTemplate(
  partner.user_id,
  'boiler',
  'save-quote', 
  'customer',
  templateData
)
```

### Placeholder Replacement
```javascript
// Replace {{fieldName}} with actual data
Object.entries(templateData).forEach(([key, value]) => {
  const regex = new RegExp(`{{${key}}}`, 'g')
  processedHtml = processedHtml.replace(regex, String(value || ''))
  processedSubject = processedSubject.replace(regex, String(value || ''))
  processedText = processedText.replace(regex, String(value || ''))
})
```

## 4. Data Flow Summary

```
Page Form Data → API Route → Data Mapping → Template Fields → Email Template
     ↓              ↓            ↓              ↓              ↓
  Raw form      Extract &     Format &      Template      Replace
  inputs        validate      transform     field names    placeholders
```

### Key Points:

1. **Each page decides what to send** based on what data is available and relevant
2. **API routes extract only what they need** from the request body
3. **Partner information is loaded** from the database in every route
4. **Data is formatted** appropriately for each field type
5. **Field names are standardized** (snake_case → camelCase)
6. **Templates use consistent field names** across all email types

### Field Name Mapping Examples:

| Page Data | API Field | Template Field | Description |
|-----------|-----------|----------------|-------------|
| `first_name` | `first_name` | `firstName` | Customer first name |
| `last_name` | `last_name` | `lastName` | Customer last name |
| `submission_id` | `submission_id` | `submissionId` | Unique submission ID |
| `products` | `products` | `quoteInfo` | Formatted product list |
| `order_details` | `order_details` | `orderDetails` | Formatted order info |
| `partner.company_name` | - | `companyName` | Company name from DB |
| `partner.logo_url` | - | `logoUrl` | Logo URL from DB |

This system ensures that each page sends only the data it has, and each API route processes and formats that data appropriately for the email templates.
