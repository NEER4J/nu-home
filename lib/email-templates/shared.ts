// Shared utilities for email templates

export function getDefaultDynamicFields() {
  return [
    'firstName', 'lastName', 'email', 'phone', 'postcode',
    'companyName', 'companyPhone', 'companyEmail', 'companyAddress', 'companyWebsite',
    'refNumber', 'submissionId', 'quoteLink', 'submissionDate'
  ]
}
