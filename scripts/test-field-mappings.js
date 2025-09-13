/**
 * Test script for field mapping system
 * This script tests the field mapping engine with sample data
 */

const { createClient } = require('@supabase/supabase-js')

// Mock data based on your lead_submission_data structure
const sampleSubmissionData = {
  submission_id: 'test-submission-123',
  partner_id: 'test-partner-123',
  service_category_id: 'test-category-123',
  quote_data: {
    is_complete: true,
    otp_enabled: false,
    completed_at: '2025-01-17T11:23:52.656Z',
    form_answers: {
      '047a5090-9cdc-4678-83c0-39d340748909': {
        answer: '3-5 Weeks',
        answered_at: '2025-01-17T11:23:52.656Z',
        question_id: '047a5090-9cdc-4678-83c0-39d340748909',
        question_text: 'When Are You Thinking About Replacing Your Boiler?'
      },
      '206c4071-9266-4ff8-bb82-1e46d43fed74': {
        answer: 'External Wall',
        answered_at: '2025-01-17T11:23:52.656Z',
        question_id: '206c4071-9266-4ff8-bb82-1e46d43fed74',
        question_text: 'Where does your boiler\'s flue exit your home?'
      },
      '32df9572-3672-4573-bfda-35cba40716bc': {
        answer: 'Mains Gas',
        answered_at: '2025-01-17T11:23:52.656Z',
        question_id: '32df9572-3672-4573-bfda-35cba40716bc',
        question_text: 'Which fuel powers your boiler?'
      },
      '59b0f11d-bfa7-44b9-9b50-33e16dc9ac57': {
        answer: 'Detached',
        answered_at: '2025-01-17T11:23:52.656Z',
        question_id: '59b0f11d-bfa7-44b9-9b50-33e16dc9ac57',
        question_text: 'What type of property do you have?'
      },
      '66406449-622d-43e4-acb5-13fb668166ed': {
        answer: 'Regular Boiler',
        answered_at: '2025-01-17T11:23:52.656Z',
        question_id: '66406449-622d-43e4-acb5-13fb668166ed',
        question_text: 'What type of boiler do you currently have?'
      }
    },
    selected_address: {
      address_line_1: '123 Main Street',
      address_line_2: 'Apartment 4B',
      town_or_city: 'London',
      postcode: 'SW1A 1AA',
      formatted_address: '123 Main Street, Apartment 4B, London, SW1A 1AA'
    },
    contact_details: {
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@example.com',
      phone: '07123456789'
    }
  },
  products_data: {
    selected_products: [
      {
        product_id: 'prod-123',
        name: 'Worcester Bosch 30kW Combi Boiler',
        power: '30kW',
        price: '2500.00',
        monthly_price: '89.99',
        warranty: '10 years',
        image_url: 'https://example.com/boiler.jpg',
        description: 'High-efficiency combi boiler perfect for medium homes',
        product_fields: {
          specs: [
            { items: '30kW output' },
            { items: 'A-rated efficiency' },
            { items: '10-year warranty' }
          ],
          what_s_included: [
            {
              items: {
                image: 'https://example.com/boiler-icon.png',
                title: 'Boiler Unit',
                subtitle: 'Worcester Bosch 30kW'
              }
            },
            {
              items: {
                image: 'https://example.com/install-icon.png',
                title: 'Installation',
                subtitle: 'Professional installation included'
              }
            }
          ]
        }
      }
    ]
  },
  addons_data: {
    selected_addons: [
      {
        addon_id: 'addon-123',
        name: 'Smart Thermostat',
        price: '299.00',
        quantity: 1,
        total_price: '299.00',
        addon_image: 'https://example.com/thermostat.jpg'
      }
    ],
    selected_bundles: [
      {
        bundle_id: 'bundle-123',
        name: 'Premium Installation Package',
        description: 'Complete installation with premium addons',
        discount_type: 'percentage',
        discount_value: '15',
        included_items: [
          {
            addon_name: 'Smart Thermostat',
            addon_price: '299.00',
            quantity_included: 1,
            addon_image: 'https://example.com/thermostat.jpg'
          }
        ]
      }
    ]
  },
  checkout_data: {
    calculator_settings: {
      monthly_payment: '89.99',
      selected_plan: {
        months: 36,
        apr: '9.9'
      },
      selected_deposit: '500.00'
    },
    booking_data: {
      total_amount: '2799.00',
      payment_method: 'monthly',
      stripe_metadata: {
        payment_status: 'pending'
      },
      preferred_installation_date: '2025-02-15',
      special_requirements: 'Please call before 9 AM'
    }
  }
}

// Test field mapping functions
function testFieldMappingEngine() {
  console.log('🧪 Testing Field Mapping Engine...\n')

  // Test 1: Simple field mapping
  console.log('Test 1: Simple field mapping')
  const customerName = getNestedValue(sampleSubmissionData.quote_data, 'contact_details.first_name')
  console.log('Customer Name:', customerName)
  console.log('✅ Expected: John\n')

  // Test 2: Address formatting
  console.log('Test 2: Address formatting')
  const address = formatAddress(sampleSubmissionData.quote_data.selected_address)
  console.log('Formatted Address:', address)
  console.log('✅ Expected: 123 Main Street, Apartment 4B, London, SW1A 1AA\n')

  // Test 3: Q&A pairs formatting
  console.log('Test 3: Q&A pairs formatting')
  const qaPairs = formatQAPairs(sampleSubmissionData.quote_data.form_answers)
  console.log('Q&A Pairs:')
  console.log(qaPairs)
  console.log('✅ Expected: Formatted question-answer pairs\n')

  // Test 4: Phone formatting
  console.log('Test 4: Phone formatting')
  const phone = formatPhone(sampleSubmissionData.quote_data.contact_details.phone)
  console.log('Formatted Phone:', phone)
  console.log('✅ Expected: +447123456789\n')

  // Test 5: Product card HTML generation
  console.log('Test 5: Product card HTML generation')
  const productCard = renderProductCard(sampleSubmissionData.products_data.selected_products[0], `
    <div style="border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px;">
      <h3>{{name}}</h3>
      <p><strong>Power:</strong> {{power}}</p>
      <p><strong>Price:</strong> £{{price}}</p>
      <p><strong>Monthly:</strong> £{{monthly_price}}</p>
      <p><strong>Warranty:</strong> {{warranty}}</p>
      <img src="{{image_url}}" alt="{{name}}" style="max-width: 200px;">
      <p>{{description}}</p>
      <h4>Specifications:</h4>
      <ul>
        {{#each product_fields.specs}}
        <li>{{items}}</li>
        {{/each}}
      </ul>
    </div>
  `)
  console.log('Product Card HTML:')
  console.log(productCard.substring(0, 200) + '...')
  console.log('✅ Expected: HTML with product details\n')

  console.log('🎉 All tests completed!')
}

// Helper functions (simplified versions from the engine)
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

function formatAddress(address) {
  if (!address || typeof address !== 'object') return ''
  
  if (address.formatted_address) {
    return address.formatted_address
  }
  
  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.town_or_city,
    address.postcode
  ].filter(Boolean)
  
  return parts.join(', ')
}

function formatQAPairs(formAnswers) {
  if (!formAnswers || typeof formAnswers !== 'object') return ''
  
  return Object.entries(formAnswers).map(([questionId, answerData]) => {
    const questionText = answerData.question_text || questionId
    const answer = answerData.answer
    const formattedAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer)
    return `${questionText}: ${formattedAnswer}`
  }).join('\n')
}

function formatPhone(phone) {
  if (!phone) return ''
  
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('44')) {
    return `+${cleaned}`
  } else if (cleaned.startsWith('0')) {
    return `+44${cleaned.slice(1)}`
  }
  
  return phone
}

function renderProductCard(product, template) {
  if (!product || typeof product !== 'object') return ''

  let html = template

  // Replace product-specific placeholders
  const replacements = {
    '{{name}}': product.name || 'Product',
    '{{power}}': product.power || 'N/A',
    '{{price}}': product.price || '0',
    '{{warranty}}': product.warranty || 'N/A',
    '{{image_url}}': product.image_url || '',
    '{{description}}': product.description || '',
    '{{product_id}}': product.product_id || '',
    '{{monthly_price}}': product.monthly_price || '0'
  }

  Object.entries(replacements).forEach(([placeholder, replacement]) => {
    html = html.replace(new RegExp(placeholder, 'g'), String(replacement))
  })

  // Handle product_fields nested data
  if (product.product_fields) {
    // Replace specs
    if (product.product_fields.specs && Array.isArray(product.product_fields.specs)) {
      const specsHtml = product.product_fields.specs.map(spec => 
        `<li>${spec.items || ''}</li>`
      ).join('')
      html = html.replace(/\{\{#each product_fields\.specs\}\}.*?\{\{\/each\}\}/gs, specsHtml)
    }
  }

  return html
}

// Run the tests
testFieldMappingEngine()

module.exports = {
  testFieldMappingEngine,
  sampleSubmissionData
}
