/**
 * Field Mapping Engine
 * 
 * This engine processes field mappings from the database and transforms
 * lead_submission_data into template-ready data for various integrations.
 */

import { createClient } from '@/utils/supabase/server'

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

  constructor(supabase: any, partnerId: string, serviceCategoryId: string) {
    this.supabase = supabase
    this.partnerId = partnerId
    this.serviceCategoryId = serviceCategoryId
  }

  /**
   * Process submission data using field mappings
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

    // Get field mappings for this email type and integration
    const { data: mappings, error: mappingsError } = await this.supabase
      .from('email_field_mappings')
      .select('*')
      .eq('partner_id', this.partnerId)
      .eq('service_category_id', this.serviceCategoryId)
      .eq('email_type', emailType)
      .eq('is_active', true)
      .contains('integration_types', [integrationType])

    if (mappingsError) {
      throw new Error('Failed to load field mappings')
    }

    const processedData: ProcessedFieldData = {}

    // Process each mapping
    for (const mapping of mappings || []) {
      try {
        const value = await this.processFieldMapping(submissionData, mapping)
        if (value !== undefined) {
          processedData[mapping.template_field_name] = value
        }
      } catch (error) {
        console.error(`Error processing field ${mapping.template_field_name}:`, error)
        // Continue processing other fields even if one fails
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
    console.log(`  🔍 Getting source data from: ${mapping.database_source}`)
    console.log(`  🔍 Database path:`, mapping.database_path)

    // Support cross-column access by checking if the path specifies a different column
    const rawValue = this.getNestedValueWithCrossColumnSupport(submissionData, mapping)
    console.log(`  📊 Raw value extracted:`, rawValue)

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
    
    console.log(`  ✅ Final result:`, result)
    return result
  }

  /**
   * Get nested value from object using path
   * Supports array access: "field[0].property" or "field.0.property"
   */
  private getNestedValue(obj: any, path: any): any {
    console.log(`    🔍 getNestedValue called with path:`, path)
    console.log(`    🔍 Object keys:`, obj ? (Array.isArray(obj) ? `[Array length: ${obj.length}]` : Object.keys(obj)) : 'null')

    let result: any
    let pathString: string

    if (typeof path === 'string') {
      pathString = path
    } else if (path && typeof path === 'object' && path.path) {
      pathString = path.path
    } else {
      console.log(`    🔍 Returning object as-is`)
      return obj
    }

    console.log(`    🔍 Using path: ${pathString}`)

    // Handle array access syntax: field[0] -> field.0
    const normalizedPath = pathString.replace(/\[(\d+)\]/g, '.$1')
    console.log(`    🔍 Normalized path: ${normalizedPath}`)

    result = normalizedPath.split('.').reduce((current, key) => {
      console.log(`    🔍 Accessing key: "${key}" from:`, Array.isArray(current) ? `[Array length: ${current.length}]` : (current && typeof current === 'object' ? Object.keys(current) : current))

      // Handle numeric keys for array access
      if (Array.isArray(current) && /^\d+$/.test(key)) {
        const index = parseInt(key, 10)
        return current[index]
      }

      return current?.[key]
    }, obj)

    console.log(`    ✅ getNestedValue result:`, result)
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

    // Check if the path starts with @ to indicate cross-column access
    if (pathString && pathString.startsWith('@')) {
      // Cross-column access: @column_name.field.path or @column_name[0].field
      const pathWithoutPrefix = pathString.substring(1) // Remove @

      // Handle array notation in column name: form_submissions[0] -> form_submissions.0
      const normalizedPath = pathWithoutPrefix.replace(/\[(\d+)\]/g, '.$1')
      const pathParts = normalizedPath.split('.')
      const columnName = pathParts[0]
      const fieldPathParts = pathParts.slice(1)

      console.log(`    🔍 Cross-column access detected: ${columnName}`)
      console.log(`    🔍 Field path: ${fieldPathParts.join('.')}`)

      sourceData = submissionData[columnName]
      pathToUse = fieldPathParts.length > 0 ? fieldPathParts.join('.') : null

      console.log(`    📊 Cross-column source data available:`, !!sourceData)
      if (sourceData) {
        console.log(`    📊 Cross-column source data type:`, Array.isArray(sourceData) ? `[Array length: ${sourceData.length}]` : typeof sourceData)
      }
    } else {
      // Standard access using database_source
      sourceData = submissionData[mapping.database_source]
      pathToUse = pathString || mapping.database_path

      console.log(`    📊 Standard source data from ${mapping.database_source}:`, !!sourceData)
      if (sourceData) {
        console.log(`    📊 Standard source data type:`, Array.isArray(sourceData) ? `[Array length: ${sourceData.length}]` : typeof sourceData)
      }
    }

    // Get the nested value from the source data
    if (pathToUse) {
      return this.getNestedValue(sourceData, pathToUse)
    } else {
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
    console.log('🔧 renderCustomTemplateWithContext called')
    console.log('🔧 Field name:', fieldName)
    console.log('🔧 Value type:', typeof value)
    console.log('🔧 Value:', value)
    console.log('🔧 Template:', template)

    // Create a context object where the field name maps to the actual value
    const context = { [fieldName]: value }
    console.log('🔧 Context created:', context)

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
    const fieldMappings = await this.getFieldMappings(emailType)
    console.log(`📋 Found ${fieldMappings.length} field mappings`)

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

    for (const mapping of fieldMappings) {
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

    console.log('🔧 Processing Handlebars template...')
    console.log('🔧 Template contains {{#each}}:', template.includes('{{#each'))
    console.log('🔧 Available data keys:', Object.keys(data))

    let result = template

    // Handle {{#each}} loops
    result = this.processEachLoops(result, data)

    // Handle simple {{variable}} replacements
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      const stringValue = String(value || '')
      result = result.replace(regex, stringValue)
    })

    console.log('🔧 Final processed template (first 200 chars):', result.substring(0, 200))
    return result
  }

  /**
   * Process {{#each}} loops in templates
   */
  private processEachLoops(template: string, data: ProcessedFieldData): string {
    let result = template

    // Find all {{#each}} blocks
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
    let match

    while ((match = eachRegex.exec(template)) !== null) {
      const [fullMatch, arrayKey, loopTemplate] = match
      console.log(`🔧 Processing {{#each ${arrayKey}}} loop`)
      console.log(`🔧 Loop template:`, loopTemplate)

      // Check if the array key exists in the data
      let arrayData = data[arrayKey]

      // If the arrayKey is the same as the data object key, use the data directly
      // This handles cases where we want to loop over the main data object itself
      if (!arrayData && arrayKey in data) {
        arrayData = data[arrayKey]
      }

      console.log(`🔧 Array data for ${arrayKey}:`, arrayData)
      console.log(`🔧 Array data type:`, typeof arrayData)
      console.log(`🔧 Array data is array:`, Array.isArray(arrayData))
      console.log(`🔧 Array data is object:`, arrayData && typeof arrayData === 'object')

      if (Array.isArray(arrayData)) {
        // Process array data
        const loopResults = arrayData.map((item, index) => {
          let itemTemplate = loopTemplate

          // Replace variables within the loop
          Object.entries(item).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g')
            itemTemplate = itemTemplate.replace(regex, String(value || ''))
          })

          return itemTemplate
        })

        result = result.replace(fullMatch, loopResults.join(''))
      } else if (arrayData && typeof arrayData === 'object') {
        // Process object data (like form_answers)
        const loopResults: string[] = []

        console.log(`🔧 Processing object data for ${arrayKey}:`, Object.keys(arrayData))

        Object.entries(arrayData).forEach(([key, item]) => {
          if (typeof item === 'object' && item !== null) {
            let itemTemplate = loopTemplate
            console.log(`🔧 Processing item ${key}:`, item)

            // Replace variables within the loop
            Object.entries(item).forEach(([itemKey, value]) => {
              const regex = new RegExp(`{{${itemKey}}}`, 'g')
              const stringValue = String(value || '')
              console.log(`🔧 Replacing {{${itemKey}}} with:`, stringValue)
              itemTemplate = itemTemplate.replace(regex, stringValue)
            })

            loopResults.push(itemTemplate)
          }
        })

        console.log(`🔧 Generated ${loopResults.length} loop results`)
        result = result.replace(fullMatch, loopResults.join(''))
      } else {
        // No data or invalid data
        console.log(`⚠️ No valid array/object data for ${arrayKey}:`, arrayData)
        result = result.replace(fullMatch, '')
      }
    }

    return result
  }
}
