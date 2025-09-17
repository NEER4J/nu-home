/**
 * Field Mapping Engine
 * 
 * This engine processes field mappings from the database and transforms
 * lead_submission_data into template-ready data for various integrations.
 */

import { createClient } from '@/utils/supabase/server'
import Handlebars from 'handlebars'

export interface FieldMapping {
  id: string
  partner_id: string
  service_category_id: string
  email_type: string
  template_field_name: string
  database_source: string
  database_path: any
  template_type: string
  html_template?: string
  html_template_type?: string
  loop_config: any
  template_variables: any
  integration_types: string[]
  display_name: string
  description?: string
  field_category: string
  is_required: boolean
  is_system: boolean
  is_active: boolean
}

export interface ProcessedFieldData {
  [key: string]: any
}

export class FieldMappingEngine {
  private supabase: any
  private partnerId: string
  private serviceCategoryId: string
  public debugLogs: string[] = []

  constructor(supabase: any, partnerId: string, serviceCategoryId: string) {
    this.supabase = supabase
    this.partnerId = partnerId
    this.serviceCategoryId = serviceCategoryId
    this.debugLogs = []
  }

  private log(message: string) {
    console.log(message)
    this.debugLogs.push(message)
  }

  /**
   * Process submission data using field mappings for any integration type
   */
  async processSubmissionData(
    submissionId: string,
    emailType: string,
    integrationType: string = 'email'
  ): Promise<ProcessedFieldData> {
    // Get submission data
    const { data: submissionData, error: submissionError } = await this.supabase
      .from('lead_submission_data')
      .select('*')
      .eq('submission_id', submissionId)
      .single()

    if (submissionError || !submissionData) {
      throw new Error('Submission data not found')
    }

    // Get partner profile data for company information fields
    const { data: partnerProfile } = await this.supabase
      .from('UserProfiles')
      .select('company_name, address, phone, postcode, website_url, logo_url, company_color, privacy_policy, terms_conditions')
      .eq('user_id', this.partnerId)
      .single()

    // Create enhanced submission data with partner profile information
    const enhancedSubmissionData = {
      ...submissionData,
      partner_profile: partnerProfile || {}
    }

    // Get field mappings for this email type and integration
    let mappings: any[]
    let mappingsError: any

    if (integrationType === 'ghl') {
      // For GHL integration, query the ghl_field_mappings table
      console.log('🔍 Querying ghl_field_mappings table for GHL integration')
      const ghlMappingsResult = await this.supabase
        .from('ghl_field_mappings')
        .select('*')
        .eq('partner_id', this.partnerId)
        .eq('service_category_id', this.serviceCategoryId)
        .eq('email_type', emailType)
        .eq('recipient_type', 'customer') // For GHL, we typically use customer mappings
        .eq('is_active', true)

      mappings = ghlMappingsResult.data
      mappingsError = ghlMappingsResult.error

      console.log('✅ GHL field mappings found:', mappings?.length || 0)
      if (mappings && mappings.length > 0) {
        console.log('📋 GHL field mappings structure:', mappings[0])
      }
    } else {
      // For email and other integrations, use the existing email_field_mappings table
      const emailMappingsResult = await this.supabase
        .from('email_field_mappings')
        .select('*')
        .eq('partner_id', this.partnerId)
        .eq('service_category_id', this.serviceCategoryId)
        .eq('email_type', emailType)
        .eq('is_active', true)

      mappings = emailMappingsResult.data
      mappingsError = emailMappingsResult.error

      // Filter mappings client-side for integration type if we have mappings
      if (mappings && integrationType !== 'email') {
        mappings = mappings.filter(mapping =>
          mapping.integration_types &&
          Array.isArray(mapping.integration_types) &&
          mapping.integration_types.includes(integrationType)
        )
      }
    }

    if (mappingsError) {
      console.error('❌ Field mappings error:', mappingsError)
      throw new Error(`Failed to load field mappings: ${mappingsError.message}`)
    }

    const processedData: ProcessedFieldData = {}

    if (integrationType === 'ghl' && mappings && mappings.length > 0) {
      // For GHL integration, we need to:
      // 1. Extract the actual data values for template fields
      // 2. Map them to GHL custom field IDs from field_mappings
      console.log('🔧 Processing GHL field mappings...')

      // First, extract common template field values from submission data
      const templateFieldValues = this.extractTemplateFieldValues(enhancedSubmissionData)
      console.log('📋 Extracted template field values:', Object.keys(templateFieldValues))

      for (const ghlMapping of mappings) {
        if (ghlMapping.field_mappings && typeof ghlMapping.field_mappings === 'object') {
          console.log('📋 GHL field mappings:', Object.keys(ghlMapping.field_mappings))

          // Map template field values to GHL custom field IDs
          Object.entries(ghlMapping.field_mappings).forEach(([templateFieldName, ghlFieldId]) => {
            try {
              const templateValue = templateFieldValues[templateFieldName]
              if (templateValue !== undefined) {
                // Store the GHL field ID as the key and the template value as the value
                processedData[ghlFieldId as string] = templateValue
                console.log(`✅ GHL mapping: ${templateFieldName} = "${templateValue}" → GHL field ${ghlFieldId}`)
              } else {
                console.log(`⚠️ No value found for template field: ${templateFieldName}`)
              }
            } catch (error) {
              console.error(`❌ Error processing GHL field mapping ${templateFieldName}:`, error)
            }
          })
        }
      }
    } else {
      // For email and other integrations, use the existing logic
      for (const mapping of mappings || []) {
        try {
          const value = await this.processFieldMapping(enhancedSubmissionData, mapping)
          if (value !== undefined) {
            processedData[mapping.template_field_name] = value
          }
        } catch (error) {
          console.error(`Error processing field ${mapping.template_field_name}:`, error)
          // Continue processing other fields even if one fails
        }
      }
    }

    // Add system fields
    processedData.currentYear = new Date().getFullYear()
    processedData.submissionId = submissionId
    processedData.processedAt = new Date().toISOString()

    return processedData
  }

  /**
   * Process a single field mapping
   */
  private async processFieldMapping(
    submissionData: any,
    mapping: FieldMapping
  ): Promise<any> {
    this.log(`  🔍 Processing field: ${mapping.template_field_name}`)
    this.log(`  🔍 Getting source data from: ${mapping.database_source}`)
    this.log(`  🔍 Database path: ${JSON.stringify(mapping.database_path)}`)

    // Support cross-column access by checking if the path specifies a different column
    const rawValue = this.getNestedValueWithCrossColumnSupport(submissionData, mapping)
    this.log(`  📊 Raw value extracted for ${mapping.template_field_name}: ${JSON.stringify(rawValue)}`)
    this.log(`  📊 Raw value type: ${typeof rawValue}`)

    let result: any
    switch (mapping.template_type) {
      case 'simple':
        result = rawValue
        break

      case 'format':
        result = this.formatValue(rawValue, mapping)
        break

      case 'html_template':
        result = this.processHtmlTemplate(rawValue, mapping)
        break

      case 'loop_template':
        result = this.processLoopTemplate(rawValue, mapping)
        break

      default:
        result = rawValue
    }

    this.log(`  ✅ Final result for ${mapping.template_field_name}: ${JSON.stringify(result)}`)
    return result
  }

  /**
   * Extract common template field values from submission data
   * This maps common field names to their actual values from the submission
   */
  private extractTemplateFieldValues(submissionData: any): Record<string, any> {
    const templateValues: Record<string, any> = {}

    // Extract values from quote_data.contact_details (for regular quote submissions)
    const contactDetails = submissionData.quote_data?.contact_details
    if (contactDetails) {
      templateValues.firstName = contactDetails.first_name
      templateValues.first_name = contactDetails.first_name
      templateValues.lastName = contactDetails.last_name
      templateValues.last_name = contactDetails.last_name
      templateValues.email = contactDetails.email
      templateValues.phone = contactDetails.phone
      templateValues.postcode = contactDetails.postcode
      templateValues.city = contactDetails.city
    }

    // Extract values from save_quote_data (for save quote submissions)
    const saveQuoteData = submissionData.save_quote_data
    if (saveQuoteData && Array.isArray(saveQuoteData) && saveQuoteData.length > 0) {
      // Get the most recent save quote entry
      const latestSaveQuote = saveQuoteData[saveQuoteData.length - 1]
      
      if (latestSaveQuote.user_info) {
        templateValues.firstName = latestSaveQuote.user_info.first_name
        templateValues.first_name = latestSaveQuote.user_info.first_name
        templateValues.lastName = latestSaveQuote.user_info.last_name
        templateValues.last_name = latestSaveQuote.user_info.last_name
        templateValues.email = latestSaveQuote.user_info.email
        templateValues.phone = latestSaveQuote.user_info.phone
        templateValues.postcode = latestSaveQuote.user_info.postcode
        templateValues.city = latestSaveQuote.user_info.city
      }

      // Extract products data
      if (latestSaveQuote.products && Array.isArray(latestSaveQuote.products)) {
        templateValues.products = latestSaveQuote.products
        templateValues.products_count = latestSaveQuote.products.length
      }

      // Extract detailed products data
      if (latestSaveQuote.detailed_products_data && Array.isArray(latestSaveQuote.detailed_products_data)) {
        templateValues.detailed_products = latestSaveQuote.detailed_products_data
        templateValues.detailed_products_count = latestSaveQuote.detailed_products_data.length
      }

      // Extract save type and other metadata
      templateValues.save_type = latestSaveQuote.save_type
      templateValues.total_products_viewed = latestSaveQuote.total_products_viewed
      templateValues.save_quote_opened_at = latestSaveQuote.save_quote_opened_at
      templateValues.action = latestSaveQuote.action

    }

    // Extract submission_id
    templateValues.submission_id = submissionData.submission_id

    // Extract partner information
    if (submissionData.partner_profile) {
      templateValues.companyName = submissionData.partner_profile.company_name
      templateValues.companyPostcode = submissionData.partner_profile.postcode
      templateValues.companyPhone = submissionData.partner_profile.phone
      templateValues.companyAddress = submissionData.partner_profile.address
    }

    // Extract other common fields
    templateValues.serviceCategoryId = submissionData.service_category_id
    templateValues.partnerId = submissionData.partner_id

    // Extract form answers if needed (from quote_data)
    const formAnswers = submissionData.quote_data?.form_answers
    if (formAnswers && typeof formAnswers === 'object') {
      // You can add specific form field extractions here if needed
      // For example, if you have specific questions you want to map:
      Object.entries(formAnswers).forEach(([questionId, answerData]: [string, any]) => {
        if (answerData && typeof answerData === 'object' && answerData.answer) {
          // Create template fields based on question IDs
          templateValues[`form_${questionId}`] = answerData.answer
        }
      })
    }

    console.log('🔧 Extracted template values:', templateValues)
    return templateValues
  }

  /**
   * Get nested value from path string (for GHL field mappings)
   * Supports paths like "quote_data.contact_details.first_name"
   */
  private getNestedValueFromPath(obj: any, pathString: string): any {
    if (!pathString || typeof pathString !== 'string') {
      return obj
    }

    console.log(`    🔍 getNestedValueFromPath: ${pathString}`)

    // Handle array access syntax: field[0] -> field.0
    const normalizedPath = pathString.replace(/\[(\d+)\]/g, '.$1')
    console.log(`    🔍 Normalized path: ${normalizedPath}`)

    const result = normalizedPath.split('.').reduce((current, key) => {
      console.log(`    🔍 Accessing key: "${key}" from:`, Array.isArray(current) ? `[Array length: ${current.length}]` : (current && typeof current === 'object' ? Object.keys(current) : current))

      // Handle numeric keys for array access
      if (Array.isArray(current) && /^\d+$/.test(key)) {
        const index = parseInt(key, 10)
        return current[index]
      }

      return current?.[key]
    }, obj)

    console.log(`    ✅ getNestedValueFromPath result:`, result)
    return result
  }

  /**
   * Get nested value from object using path
   * Supports array access: "field[0].property" or "field.0.property"
   */
  private getNestedValue(obj: any, path: any): any {
    this.log(`    🔍 getNestedValue called with path: ${JSON.stringify(path)}`)
    this.log(`    🔍 Object keys: ${obj ? (Array.isArray(obj) ? `[Array length: ${obj.length}]` : Object.keys(obj)) : 'null'}`)

    let result: any
    let pathString: string

    if (typeof path === 'string') {
      pathString = path
    } else if (path && typeof path === 'object' && path.path) {
      pathString = path.path
    } else {
      this.log(`    🔍 Returning object as-is`)
      return obj
    }

    this.log(`    🔍 Using path: ${pathString}`)

    // Handle array access syntax: field[0] -> field.0
    const normalizedPath = pathString.replace(/\[(\d+)\]/g, '.$1')
    this.log(`    🔍 Normalized path: ${normalizedPath}`)

    result = normalizedPath.split('.').reduce((current, key) => {
      this.log(`    🔍 Accessing key: "${key}" from: ${Array.isArray(current) ? `[Array length: ${current.length}]` : (current && typeof current === 'object' ? Object.keys(current) : current)}`)

      // Handle numeric keys for array access
      if (Array.isArray(current) && /^\d+$/.test(key)) {
        const index = parseInt(key, 10)
        const result = current[index]
        this.log(`    🔍 Array access [${index}] result: ${JSON.stringify(result)}`)
        return result
      }

      const result = current?.[key]
      this.log(`    🔍 Object access [${key}] result: ${JSON.stringify(result)}`)
      return result
    }, obj)

    this.log(`    ✅ getNestedValue final result: ${JSON.stringify(result)}`)
    return result
  }

  /**
   * Get nested value with cross-column support
   * Supports paths like:
   * - "form_answers" (uses default database_source)
   * - "contact_details.first_name" (uses default database_source)
   * - "form_submissions[0].submission_id" (uses default database_source)
   * - "@form_submissions[0].submission_id" (cross-column: uses form_submissions column)
   * - "@enquiry_data.customer_name" (cross-column: uses enquiry_data column)
   * - "@save_quote_data[0].user_info.email" (cross-column: uses save_quote_data column)
   */
  private getNestedValueWithCrossColumnSupport(submissionData: any, mapping: FieldMapping): any {
    let sourceData: any
    let pathToUse: any

    // Extract the path string from the mapping configuration
    let pathString: string | null = null
    if (mapping.database_path && typeof mapping.database_path === 'object' && mapping.database_path.path) {
      pathString = mapping.database_path.path
    } else if (typeof mapping.database_path === 'string') {
      pathString = mapping.database_path
    }

    this.log(`    🔍 Path string extracted: ${pathString}`)

    // Check if the path starts with @ to indicate cross-column access
    if (pathString && pathString.startsWith('@')) {
      // Cross-column access: @column_name.field.path or @column_name[0].field
      const pathWithoutPrefix = pathString.substring(1) // Remove @

      // Handle array notation in column name: form_submissions[0] -> form_submissions.0
      const normalizedPath = pathWithoutPrefix.replace(/\[(\d+)\]/g, '.$1')
      const pathParts = normalizedPath.split('.')
      const columnName = pathParts[0]
      const fieldPathParts = pathParts.slice(1)

      this.log(`    🔍 Cross-column access detected: ${columnName}`)
      this.log(`    🔍 Field path: ${fieldPathParts.join('.')}`)

      sourceData = submissionData[columnName]
      pathToUse = fieldPathParts.length > 0 ? fieldPathParts.join('.') : null

      this.log(`    📊 Cross-column source data available: ${!!sourceData}`)
      if (sourceData) {
        this.log(`    📊 Cross-column source data type: ${Array.isArray(sourceData) ? `[Array length: ${sourceData.length}]` : typeof sourceData}`)

        // Special handling for save_quote_data array - get the latest entry
        if (columnName === 'save_quote_data' && Array.isArray(sourceData) && sourceData.length > 0) {
          this.log(`    🔍 Using latest save_quote_data entry (index ${sourceData.length - 1})`)
          sourceData = sourceData[sourceData.length - 1]
        }
      }
    } else {
      // Standard access using database_source
      sourceData = submissionData[mapping.database_source]
      pathToUse = pathString || mapping.database_path

      this.log(`    📊 Standard source data from ${mapping.database_source}: ${!!sourceData}`)
      if (sourceData) {
        this.log(`    📊 Standard source data type: ${Array.isArray(sourceData) ? `[Array length: ${sourceData.length}]` : typeof sourceData}`)

        // Special handling for save_quote_data as database source
        if (mapping.database_source === 'save_quote_data' && Array.isArray(sourceData) && sourceData.length > 0) {
          this.log(`    🔍 Using latest save_quote_data entry (index ${sourceData.length - 1})`)
          const latestEntry = sourceData[sourceData.length - 1]
          this.log(`    🔍 Latest entry data: ${JSON.stringify(latestEntry)}`)
          sourceData = latestEntry
        }
      }
    }

    this.log(`    📊 Path to use: ${pathToUse}`)
    this.log(`    📊 Source data after processing: ${JSON.stringify(sourceData)}`)

    // Get the nested value from the source data
    if (pathToUse) {
      const result = this.getNestedValue(sourceData, pathToUse)
      this.log(`    📊 Nested value result: ${JSON.stringify(result)}`)
      return result
    } else {
      this.log(`    📊 Returning source data as-is`)
      return sourceData
    }
  }

  /**
   * Format value based on mapping configuration
   */
  private formatValue(value: any, mapping: FieldMapping): any {
    if (!value) return ''

    switch (mapping.html_template_type) {
      case 'qa_pairs':
        return this.formatQAPairs(value)
      case 'address_string':
        return this.formatAddress(value)
      case 'date':
        return new Date(value).toLocaleDateString('en-GB')
      case 'currency':
        return `£${parseFloat(value).toFixed(2)}`
      case 'phone':
        return this.formatPhone(value)
      default:
        return String(value)
    }
  }

  /**
   * Format Q&A pairs from form answers
   */
  private formatQAPairs(formAnswers: any): string {
    console.log('🔧 formatQAPairs called with:', formAnswers)

    if (!formAnswers || typeof formAnswers !== 'object') {
      console.log('❌ No form answers or invalid format')
      return ''
    }

    const result = Object.entries(formAnswers).map(([questionId, answerData]: [string, any]) => {
      const questionText = answerData.question_text || questionId
      const answer = answerData.answer
      const formattedAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer)
      return `${questionText}: ${formattedAnswer}`
    }).join('\n')

    console.log('🔧 formatQAPairs result:', result)
    return result
  }

  /**
   * Format address from address object
   */
  private formatAddress(address: any): string {
    if (!address || typeof address !== 'object') return ''
    
    // Use formatted_address if available, otherwise build from components
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

  /**
   * Format phone number
   */
  private formatPhone(phone: string): string {
    if (!phone) return ''
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Format UK numbers
    if (cleaned.startsWith('44')) {
      return `+${cleaned}`
    } else if (cleaned.startsWith('0')) {
      return `+44${cleaned.slice(1)}`
    }
    
    return phone
  }

  /**
   * Process HTML template
   */
  private processHtmlTemplate(value: any, mapping: FieldMapping): string {
    if (!mapping.html_template) return String(value || '')

    let html = mapping.html_template

    // Handle different template types
    switch (mapping.html_template_type) {
      case 'product_card':
        return this.renderProductCard(value, html)
      case 'product_list':
        return this.renderProductList(value, html)
      case 'qa_pairs':
        return this.renderQAPairs(value, html)
      case 'addon_list':
        return this.renderAddonList(value, html)
      case 'bundle_list':
        return this.renderBundleList(value, html)
      case 'payment_plan':
        return this.renderPaymentPlan(value, html)
      case 'order_summary':
        return this.renderOrderSummary(value, html)
      case 'custom':
        // For custom templates, we need to create a context where the field name matches the template variable
        return this.renderCustomTemplateWithContext(value, html, mapping.template_field_name)
      default:
        return this.renderCustomTemplate(value, html)
    }
  }

  /**
   * Process loop template for arrays
   */
  private processLoopTemplate(value: any, mapping: FieldMapping): string {
    if (!Array.isArray(value)) return ''

    const { loop_config } = mapping
    const { item_template, separator = '' } = loop_config || {}

    return value.map(item => {
      if (item_template) {
        return this.renderCustomTemplate(item, item_template)
      }
      return String(item)
    }).join(separator)
  }

  /**
   * Render product card
   */
  private renderProductCard(product: any, template: string): string {
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
        const specsHtml = product.product_fields.specs.map((spec: any) => 
          `<li>${spec.items || ''}</li>`
        ).join('')
        html = html.replace(/\{\{#each product_fields\.specs\}\}[\s\S]*?\{\{\/each\}\}/g, specsHtml)
      }

      // Replace what's included
      if (product.product_fields.what_s_included && Array.isArray(product.product_fields.what_s_included)) {
        const includedHtml = product.product_fields.what_s_included.map((item: any) => {
          const image = item.items?.image ? `<img src="${item.items.image}" alt="${item.items.title}" style="width: 32px; height: 32px; margin-right: 12px;">` : ''
          const title = item.items?.title || item.title || ''
          const subtitle = item.items?.subtitle || ''
          return `
            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
              ${image}
              <div>
                <div style="font-weight: 600;">${title}</div>
                ${subtitle ? `<div style="font-size: 12px; color: #6b7280;">${subtitle}</div>` : ''}
              </div>
            </div>
          `
        }).join('')
        html = html.replace(/\{\{#each product_fields\.what_s_included\}\}[\s\S]*?\{\{\/each\}\}/g, includedHtml)
      }
    }

    return html
  }

  /**
   * Render product list
   */
  private renderProductList(products: any[], template: string): string {
    if (!Array.isArray(products)) return ''

    return products.map(product => this.renderProductCard(product, template)).join('')
  }

  /**
   * Render Q&A pairs
   */
  private renderQAPairs(formAnswers: any, template: string): string {
    console.log('🔧 renderQAPairs called with:', formAnswers)
    console.log('🔧 Template:', template)

    if (!formAnswers || typeof formAnswers !== 'object') {
      console.log('❌ No form answers or invalid format')
      return ''
    }

    const qaPairs = Object.entries(formAnswers).map(([questionId, answerData]: [string, any]) => {
      const questionText = answerData.question_text || questionId
      const answer = answerData.answer
      const formattedAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer)
      return { question: questionText, answer: formattedAnswer }
    })

    console.log('🔧 Generated QA pairs:', qaPairs.length)

    let html = template

    // Replace Q&A pairs
    const qaHtml = qaPairs.map(qa => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 0; width: 40%; font-weight: 600; color: #374151;">${qa.question}:</td>
        <td style="padding: 12px 0; color: #6b7280;">${qa.answer}</td>
      </tr>
    `).join('')

    console.log('🔧 Generated QA HTML:', qaHtml)

    html = html.replace(/\{\{#each form_answers\}\}[\s\S]*?\{\{\/each\}\}/g, qaHtml)

    console.log('🔧 Final HTML:', html)
    return html
  }

  /**
   * Render addon list
   */
  private renderAddonList(addons: any[], template: string): string {
    if (!Array.isArray(addons)) return ''

    return addons.map(addon => {
      let html = template
      const replacements = {
        '{{name}}': addon.name || '',
        '{{price}}': addon.price || '0',
        '{{quantity}}': addon.quantity || '1',
        '{{total_price}}': addon.total_price || addon.price || '0',
        '{{addon_id}}': addon.addon_id || ''
      }

      Object.entries(replacements).forEach(([placeholder, replacement]) => {
        html = html.replace(new RegExp(placeholder, 'g'), String(replacement))
      })

      return html
    }).join('')
  }

  /**
   * Render bundle list
   */
  private renderBundleList(bundles: any[], template: string): string {
    if (!Array.isArray(bundles)) return ''

    return bundles.map(bundle => {
      let html = template
      const replacements = {
        '{{name}}': bundle.name || '',
        '{{description}}': bundle.description || '',
        '{{discount_type}}': bundle.discount_type || '',
        '{{discount_value}}': bundle.discount_value || '0',
        '{{bundle_id}}': bundle.bundle_id || ''
      }

      Object.entries(replacements).forEach(([placeholder, replacement]) => {
        html = html.replace(new RegExp(placeholder, 'g'), String(replacement))
      })

      // Handle included items
      if (bundle.included_items && Array.isArray(bundle.included_items)) {
        const includedHtml = bundle.included_items.map((item: any) => `
          <div style="display: flex; align-items: center; margin-bottom: 5px;">
            ${item.addon_image ? `<img src="${item.addon_image}" alt="${item.addon_name}" style="width: 20px; height: 20px; margin-right: 8px;">` : ''}
            <div style="font-size: 12px; color: #6b7280;">
              ${item.addon_name} (${item.quantity_included}x) - £${item.addon_price}
            </div>
          </div>
        `).join('')
        html = html.replace(/\{\{#each included_items\}\}[\s\S]*?\{\{\/each\}\}/g, includedHtml)
      }

      return html
    }).join('')
  }

  /**
   * Render payment plan
   */
  private renderPaymentPlan(calculatorSettings: any, template: string): string {
    if (!calculatorSettings || typeof calculatorSettings !== 'object') return ''

    let html = template
    const replacements = {
      '{{monthly_payment}}': calculatorSettings.monthly_payment || '0',
      '{{months}}': calculatorSettings.selected_plan?.months || '0',
      '{{apr}}': calculatorSettings.selected_plan?.apr || '0',
      '{{deposit}}': calculatorSettings.selected_deposit || '0'
    }

    Object.entries(replacements).forEach(([placeholder, replacement]) => {
      html = html.replace(new RegExp(placeholder, 'g'), String(replacement))
    })

    return html
  }

  /**
   * Render order summary
   */
  private renderOrderSummary(bookingData: any, template: string): string {
    if (!bookingData || typeof bookingData !== 'object') return ''

    let html = template
    const replacements = {
      '{{total_amount}}': bookingData.total_amount || '0',
      '{{payment_method}}': bookingData.payment_method || '',
      '{{payment_status}}': bookingData.stripe_metadata?.payment_status || '',
      '{{preferred_installation_date}}': bookingData.preferred_installation_date || '',
      '{{special_requirements}}': bookingData.special_requirements || ''
    }

    Object.entries(replacements).forEach(([placeholder, replacement]) => {
      html = html.replace(new RegExp(placeholder, 'g'), String(replacement))
    })

    return html
  }

  /**
   * Render custom template
   */
  private renderCustomTemplate(data: any, template: string): string {
    if (!data || typeof data !== 'object') return template

    console.log('🔧 renderCustomTemplate called with data:', Object.keys(data))
    console.log('🔧 Template contains {{#each}}:', template.includes('{{#each'))

    // Use the Handlebars processing to handle loops
    return this.processHandlebarsTemplate(template, data)
  }

  /**
   * Render custom template with specific context
   */
  private renderCustomTemplateWithContext(value: any, template: string, fieldName: string): string {
    this.log('🔧 renderCustomTemplateWithContext called')
    this.log('🔧 Field name: ' + fieldName)
    this.log('🔧 Value type: ' + typeof value)
    this.log('🔧 Value: ' + JSON.stringify(value))
    this.log('🔧 Template preview: ' + template.substring(0, 200))

    // Special handling for detailed_products_data from save_quote_data
    if (fieldName === 'detailed_products_data' && value && typeof value === 'object') {
      this.log('🔧 Special processing for detailed_products_data')

      // If value has detailed_products_data property, use that directly
      if (value.detailed_products_data && Array.isArray(value.detailed_products_data)) {
        this.log('🔧 Using value.detailed_products_data array: ' + value.detailed_products_data.length)
        const context = { [fieldName]: value.detailed_products_data }
        return this.processHandlebarsTemplate(template, context)
      }

      // If value is already an array, use it directly
      if (Array.isArray(value)) {
        this.log('🔧 Value is already an array: ' + value.length)

        // Enhance each product with nested field access for better template processing
        const enhancedProducts = value.map(product => {
          if (product && typeof product === 'object') {
            // Create a flattened version that includes both direct fields and product_fields
            const enhanced = { ...product }

            // If product has product_fields, merge them at the top level for easier access
            if (product.product_fields && typeof product.product_fields === 'object') {
              this.log('🔧 Found product_fields, merging to top level')
              // Don't overwrite existing fields, just add missing ones
              Object.keys(product.product_fields).forEach(key => {
                if (!(key in enhanced)) {
                  enhanced[key] = product.product_fields[key]
                }
              })
            }

            return enhanced
          }
          return product
        })

        this.log('🔧 Enhanced products for template processing: ' + JSON.stringify(enhancedProducts))
        const context = { [fieldName]: enhancedProducts }
        return this.processHandlebarsTemplate(template, context)
      }
    }

    // Create a context object where the field name maps to the actual value
    const context = { [fieldName]: value }
    this.log('🔧 Context created: ' + JSON.stringify(context))

    // Use the Handlebars processing to handle loops
    return this.processHandlebarsTemplate(template, context)
  }

  /**
   * Get available field mappings for a partner
   */
  async getFieldMappings(
    emailType: string,
    integrationType: string = 'email'
  ): Promise<FieldMapping[]> {
    console.log('🔍 Getting field mappings for:', {
      partnerId: this.partnerId,
      serviceCategoryId: this.serviceCategoryId,
      emailType,
      integrationType
    })

    const { data, error } = await this.supabase
      .from('email_field_mappings')
      .select('*')
      .eq('partner_id', this.partnerId)
      .eq('service_category_id', this.serviceCategoryId)
      .eq('email_type', emailType)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    console.log('📊 Field mappings query result:', { data: data?.length || 0, error })

    if (error) {
      console.error('❌ Field mappings query error:', error)
      throw new Error('Failed to load field mappings')
    }

    // Filter by integration type on the client side since contains might not work as expected
    const filteredMappings = (data || []).filter((mapping: FieldMapping) => 
      mapping.integration_types && 
      Array.isArray(mapping.integration_types) && 
      mapping.integration_types.includes(integrationType)
    )

    console.log('📊 Filtered field mappings:', filteredMappings.length)
    return filteredMappings
  }

  /**
   * Create a new field mapping
   */
  async createFieldMapping(mapping: Omit<FieldMapping, 'id' | 'created_at' | 'updated_at'>): Promise<FieldMapping> {
    const { data, error } = await this.supabase
      .from('email_field_mappings')
      .insert(mapping)
      .select()
      .single()

    if (error) {
      throw new Error('Failed to create field mapping')
    }

    return data
  }

  /**
   * Update an existing field mapping
   */
  async updateFieldMapping(id: string, mapping: Partial<FieldMapping>): Promise<FieldMapping> {
    const { data, error } = await this.supabase
      .from('email_field_mappings')
      .update(mapping)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error('Failed to update field mapping')
    }

    return data
  }

  /**
   * Delete a field mapping
   */
  async deleteFieldMapping(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('email_field_mappings')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error('Failed to delete field mapping')
    }
  }

  /**
   * Map submission data to template fields for a specific email type and recipient
   */
  async mapSubmissionToTemplateFields(
    submissionId: string,
    emailType: string,
    recipientType: 'customer' | 'admin'
  ): Promise<ProcessedFieldData> {
    console.log(`🔍🔍🔍 Starting field mapping for ${emailType} (${recipientType}) 🔍🔍🔍`)

    // Get field mappings for this email type
    const { data: fieldMappings, error: mappingsError } = await this.supabase
      .from('email_field_mappings')
      .select('*')
      .eq('partner_id', this.partnerId)
      .eq('service_category_id', this.serviceCategoryId)
      .eq('email_type', emailType)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (mappingsError) {
      console.error('❌ Field mappings query error:', mappingsError)
      throw new Error('Failed to load field mappings')
    }

    console.log(`📋 Found ${fieldMappings?.length || 0} field mappings for ${recipientType}`)
    if (fieldMappings && fieldMappings.length > 0) {
      console.log(`📋 Field mappings:`, fieldMappings.map((m: any) => ({
        template_field_name: m.template_field_name,
        database_source: m.database_source,
        database_path: m.database_path,
        template_type: m.template_type
      })))
    }

    // Get submission data
    const { data: submissionData, error } = await this.supabase
      .from('lead_submission_data')
      .select('*')
      .eq('submission_id', submissionId)
      .single()

    if (error || !submissionData) {
      console.error('❌ Submission data not found:', error)
      throw new Error('Submission data not found')
    }

    // Get partner profile data for company information fields
    const { data: partnerProfile } = await this.supabase
      .from('UserProfiles')
      .select('company_name, address, phone, postcode, website_url, logo_url, company_color, privacy_policy, terms_conditions')
      .eq('user_id', this.partnerId)
      .single()

    console.log('📊 Partner profile data available:', !!partnerProfile)
    if (partnerProfile) {
      console.log('📊 Partner profile keys:', Object.keys(partnerProfile))
    }

    console.log('📊 Raw submission data structure:')
    console.log('📊 Keys:', Object.keys(submissionData))
    if (submissionData.quote_data) {
      console.log('📊 Quote data keys:', Object.keys(submissionData.quote_data))
    }

    // Create enhanced submission data with partner profile information
    const enhancedSubmissionData = {
      ...submissionData,
      partner_profile: partnerProfile || {}
    }

    // Process field mappings
    const processedData: ProcessedFieldData = {}

    for (const mapping of fieldMappings || []) {
      console.log(`🔧 Processing mapping: ${mapping.template_field_name}`)
      console.log(`🔧 Database source: ${mapping.database_source}`)
      console.log(`🔧 Database path:`, mapping.database_path)
      console.log(`🔧 Template type: ${mapping.template_type}`)

      try {
        const fieldData = await this.processFieldMapping(enhancedSubmissionData, mapping)
        processedData[mapping.template_field_name] = fieldData
        console.log(`✅ ${mapping.template_field_name} = ${fieldData}`)

        // Special debugging for form_answers
        if (mapping.template_field_name === 'form_answers') {
          console.log(`🔍 form_answers field mapping details:`)
          console.log(`🔍 - template_type: ${mapping.template_type}`)
          console.log(`🔍 - html_template_type: ${mapping.html_template_type}`)
          console.log(`🔍 - html_template: ${mapping.html_template}`)
          console.log(`🔍 - database_source: ${mapping.database_source}`)
          console.log(`🔍 - database_path: ${mapping.database_path}`)
          console.log(`🔍 - raw data from database:`, submissionData[mapping.database_source])

          // Check if form_answers exists in different sources
          console.log(`🔍 Checking form_answers in all sources:`)
          Object.keys(submissionData).forEach(key => {
            if (submissionData[key] && typeof submissionData[key] === 'object') {
              if (Array.isArray(submissionData[key])) {
                console.log(`🔍 - ${key} (array):`, submissionData[key])
                if (submissionData[key].length > 0) {
                  console.log(`🔍 - ${key}[0]:`, submissionData[key][0])
                  if (submissionData[key][0].form_answers) {
                    console.log(`🔍 - ${key}[0].form_answers:`, submissionData[key][0].form_answers)
                  }
                }
              } else {
                console.log(`🔍 - ${key} (object):`, submissionData[key])
                if (submissionData[key].form_answers) {
                  console.log(`🔍 - ${key}.form_answers:`, submissionData[key].form_answers)
                }
              }
            }
          })
        }
      } catch (error) {
        console.warn(`❌ Failed to process field mapping ${mapping.template_field_name}:`, error)
        // Continue with other fields
      }
    }

    // No fallback logic - only use mapped fields

    return processedData
  }

  /**
   * Process email template with mapped data
   */
  async processEmailTemplate(
    template: any, 
    templateData: ProcessedFieldData
  ): Promise<{ subject: string; html: string; text: string }> {
    console.log('🔧 Processing email template...')
    console.log('🔧 Template data available:', Object.keys(templateData))
    console.log('🔧 Template data values:', templateData)
    
    // Simple template processing - replace {{fieldName}} with values
    let subject = template.subject_template || ''
    let html = template.html_template || ''
    let text = template.text_template || ''

    console.log('🔧 Original subject:', subject)
    console.log('🔧 Original HTML (first 200 chars):', html.substring(0, 200))

    // Process Handlebars templates
    subject = this.processHandlebarsTemplate(subject, templateData)
    html = this.processHandlebarsTemplate(html, templateData)
    text = this.processHandlebarsTemplate(text, templateData)

    console.log('🔧 Final subject:', subject)
    console.log('🔧 Final HTML (first 200 chars):', html.substring(0, 200))

    return { subject, html, text }
  }

  /**
   * Process Handlebars template with loops and conditionals
   */
  private processHandlebarsTemplate(template: string, data: ProcessedFieldData): string {
    if (!template) return ''

    this.log('🔧 Processing Handlebars template with real Handlebars library...')
    this.log('🔧 Template contains {{#each}}: ' + template.includes('{{#each'))
    this.log('🔧 Available data keys: ' + Object.keys(data).join(', '))

    try {
      // Compile the template with Handlebars
      const compiledTemplate = Handlebars.compile(template)

      // Render the template with data
      const result = compiledTemplate(data)

      this.log('🔧 Handlebars processing successful')
      this.log('🔧 Result preview: ' + result.substring(0, 200))

      return result
    } catch (error) {
      this.log('❌ Handlebars processing error: ' + String(error))
      this.log('❌ Template: ' + template.substring(0, 300))
      this.log('❌ Data: ' + JSON.stringify(data))
      this.log('❌ Falling back to original template')
      return template
    }
  }

  // Note: Removed custom regex-based processing methods since we now use real Handlebars library
}
