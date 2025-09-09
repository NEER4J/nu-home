/**
 * Product Formatter Utility
 * 
 * This utility provides functions to format product information from the database
 * structure into HTML for email templates. It handles the product_fields JSONB
 * structure and creates consistent, well-formatted product displays.
 */

export interface ProductData {
  name: string
  description?: string
  product_fields?: {
    power_and_price?: Array<{
      power: string
      price: string
    }>
    warranty?: string
    image_gallery?: Array<{
      image: string
    }>
    brand_image?: string
    specs?: Array<{
      items: string
    }>
    boiler_type?: string
    flow_rate?: string
    what_s_included?: Array<{
      items?: {
        title: string
        subtitle?: string
      }
      title?: string
    }>
  }
  image_url?: string
  price?: string
}

/**
 * Creates a unified product card HTML with consistent design
 */
export function createProductCardHtml(productData: {
  productName: string
  productImage?: string | null
  boilerType?: string
  selectedPowerPrice?: { power: string; price: string }
  productPrice: string
  productPower: string
  productWarranty: string
  hasSpecs?: boolean
}): string {
  const {
    productName,
    productImage,
    boilerType,
    selectedPowerPrice,
    productPrice,
    productPower,
    productWarranty,
    hasSpecs = true
  } = productData

  return `
    <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 0; margin-bottom: 20px; background-color: white; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
      ${productImage ? `
        <div style="text-align: center; background-color: #f8f9fa; padding: 30px 20px;">
          <img src="${productImage}" alt="${productName}" 
               style="max-width: 180px; max-height: 140px; border-radius: 8px;">
        </div>
      ` : ''}
      
      <div style="padding: 20px;">
        <h3 style="margin: 0 0 4px 0; color: #1f2937; font-size: 18px; font-weight: 600; line-height: 1.3;">
          ${productName}${boilerType ? ` ${boilerType}` : ''}
        </h3>
        
        ${selectedPowerPrice?.power ? `
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
            ${selectedPowerPrice.power}kW
          </div>
        ` : ''}
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 16px;">
          <tr>
            <td style="padding: 16px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #6b7280; font-size: 14px;">Fixed price (including installation)</span>
                  </td>
                </tr>
                <tr>
                  <td style="color: #dc2626; font-size: 28px; font-weight: 700; line-height: 1; padding-bottom: 4px;">
                    ${productPrice}
                  </td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 14px;">
                    pay monthly available
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
          <tr>
            <td width="50%" style="text-align: center; padding-right: 6px;">
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Power Output</div>
              <div style="color: #1f2937; font-size: 14px; font-weight: 600;">${productPower}</div>
            </td>
            <td width="50%" style="text-align: center; padding-left: 6px;">
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Warranty</div>
              <div style="color: #1f2937; font-size: 14px; font-weight: 600;">${productWarranty}</div>
            </td>
          </tr>
        </table>
        
        ${hasSpecs ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb;">
            <tr>
              <td style="padding-top: 16px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 8px;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </td>
                    <td style="vertical-align: middle;">
                      <span style="color: #6b7280; font-size: 12px; font-weight: 600;">Free installation</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        ` : ''}
      </div>
    </div>
  `
}

/**
 * Creates a sample product card for preview
 */
export function createSampleProductCard(): string {
  return createProductCardHtml({
    productName: 'Worcester Bosch Greenstar 2000',
    productImage: 'https://via.placeholder.com/180x140/f8f9fa/666?text=Boiler',
    boilerType: 'Combi',
    selectedPowerPrice: { power: '30', price: '3110' },
    productPrice: '£3,110',
    productPower: '30kW',
    productWarranty: '10 years',
    hasSpecs: true
  })
}

/**
 * Formats a single product into HTML
 */
export function formatSingleProduct(product: ProductData, index?: number): string {
  const productName = product.name || 'Product'
  const productDescription = product.description || ''
  
  // Debug logging for individual product
  console.log('formatSingleProduct received product:', JSON.stringify(product, null, 2))
  
  // Extract from product_fields JSONB
  // Handle case where product might be the product_fields object directly
  let productFields = product.product_fields || {}
  
  // If product_fields is empty but product has power_and_price, warranty, etc., 
  // then product itself might be the product_fields data
  if (!productFields.power_and_price && !productFields.warranty && 
      (product.power_and_price || product.warranty || product.image_gallery)) {
    productFields = product
  }
  
  console.log('Extracted productFields:', JSON.stringify(productFields, null, 2))
  console.log('Product has product_fields:', !!product.product_fields)
  console.log('ProductFields has power_and_price:', !!productFields.power_and_price)
  console.log('ProductFields has warranty:', !!productFields.warranty)
  
  // Get price and power from power_and_price array (use first option or selected one)
  const powerAndPrice = productFields.power_and_price || []
  const selectedPowerPrice = powerAndPrice[0] || {} // Use first option, or could be selected option
  const productPrice = selectedPowerPrice.price ? `£${selectedPowerPrice.price}` : product.price || 'Price not available'
  const productPower = selectedPowerPrice.power ? `${selectedPowerPrice.power}kW` : 'Power not specified'
  
  // Get warranty from product_fields
  const productWarranty = productFields.warranty ? `${productFields.warranty} years` : 'Warranty not specified'
  
  // Get images from product_fields
  const imageGallery = productFields.image_gallery || []
  const productImage = imageGallery[0]?.image || productFields.brand_image || product.image_url || null
  
  // Get specs for additional details
  const specs = productFields.specs || []
  const specsText = specs.map((spec: any) => spec.items).join(', ')
  
  // Get boiler type
  const boilerType = productFields.boiler_type || ''
  
  // Get what's included
  const whatsIncluded = productFields.what_s_included || []
  
  const productNumber = index !== undefined ? `${index + 1}. ` : ''
  
  // Use the unified product card design
  return createProductCardHtml({
    productName: productNumber + productName,
    productImage,
    boilerType,
    selectedPowerPrice,
    productPrice,
    productPower,
    productWarranty,
    hasSpecs: !!(productFields.specs && productFields.specs.length > 0)
  })
}

/**
 * Formats multiple products into HTML
 */
export function formatMultipleProducts(products: ProductData[]): string {
  if (!products || products.length === 0) {
    return '<div style="padding: 15px; background-color: #f3f4f6; border-radius: 6px; color: #6b7280;">No products selected</div>'
  }
  
  return products.map((product, index) => formatSingleProduct(product, index)).join('')
}

/**
 * Main function to format products - handles both single and multiple products
 */
export function formatProducts(productsData: any): string {
  if (!productsData) {
    return '<div style="padding: 15px; background-color: #f3f4f6; border-radius: 6px; color: #6b7280;">No products selected</div>'
  }
  
  // Debug logging to see what data we're receiving
  console.log('formatProducts received data:', JSON.stringify(productsData, null, 2))
  
  // Handle array of products (multiple products)
  if (Array.isArray(productsData)) {
    return formatMultipleProducts(productsData)
  }
  
  // Handle single product object
  if (typeof productsData === 'object' && productsData !== null) {
    return formatSingleProduct(productsData)
  }
  
  // Fallback for other data types
  return `<div style="padding: 15px; background-color: #f3f4f6; border-radius: 6px; color: #6b7280;">${String(productsData)}</div>`
}

/**
 * Extracts product information from various data structures
 * This is a helper function for cases where products might be nested in different ways
 */
export function extractProductsFromData(data: any): ProductData[] {
  // If data is already an array of products
  if (Array.isArray(data)) {
    return data
  }
  
  // If data is a single product
  if (data && typeof data === 'object' && data.name) {
    return [data]
  }
  
  // If data contains a products array
  if (data && data.products && Array.isArray(data.products)) {
    return data.products
  }
  
  // If data contains an orderDetails with products
  if (data && data.orderDetails && data.orderDetails.products && Array.isArray(data.orderDetails.products)) {
    return data.orderDetails.products
  }
  
  // If data contains quoteData with products
  if (data && data.quoteData && data.quoteData.products && Array.isArray(data.quoteData.products)) {
    return data.quoteData.products
  }
  
  return []
}
