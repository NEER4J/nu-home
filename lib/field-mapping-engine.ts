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
    const sourceData = submissionData[mapping.database_source]
    const rawValue = this.getNestedValue(sourceData, mapping.database_path)

    switch (mapping.template_type) {
      case 'simple':
        return rawValue

      case 'format':
        return this.formatValue(rawValue, mapping)

      case 'html_template':
        return this.processHtmlTemplate(rawValue, mapping)

      case 'loop_template':
        return this.processLoopTemplate(rawValue, mapping)

      default:
        return rawValue
    }
  }

  /**
   * Get nested value from object using path
   */
  private getNestedValue(obj: any, path: any): any {
    if (typeof path === 'string') {
      return path.split('.').reduce((current, key) => current?.[key], obj)
    }
    
    if (path && typeof path === 'object' && path.path) {
      return path.path.split('.').reduce((current: any, key: string) => current?.[key], obj)
    }
    
    return obj
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
    if (!formAnswers || typeof formAnswers !== 'object') return ''
    
    return Object.entries(formAnswers).map(([questionId, answerData]: [string, any]) => {
      const questionText = answerData.question_text || questionId
      const answer = answerData.answer
      const formattedAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer)
      return `${questionText}: ${formattedAnswer}`
    }).join('\n')
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
        html = html.replace(/\{\{#each product_fields\.specs\}\}.*?\{\{\/each\}\}/gs, specsHtml)
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
        html = html.replace(/\{\{#each product_fields\.what_s_included\}\}.*?\{\{\/each\}\}/gs, includedHtml)
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
    if (!formAnswers || typeof formAnswers !== 'object') return ''

    const qaPairs = Object.entries(formAnswers).map(([questionId, answerData]: [string, any]) => {
      const questionText = answerData.question_text || questionId
      const answer = answerData.answer
      const formattedAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer)
      return { question: questionText, answer: formattedAnswer }
    })

    let html = template

    // Replace Q&A pairs
    const qaHtml = qaPairs.map(qa => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 0; width: 40%; font-weight: 600; color: #374151;">${qa.question}:</td>
        <td style="padding: 12px 0; color: #6b7280;">${qa.answer}</td>
      </tr>
    `).join('')

    html = html.replace(/\{\{#each form_answers\}\}.*?\{\{\/each\}\}/gs, qaHtml)

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
        html = html.replace(/\{\{#each included_items\}\}.*?\{\{\/each\}\}/gs, includedHtml)
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

    let html = template

    // Replace all object properties
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g')
      html = html.replace(placeholder, String(value || ''))
    })

    return html
  }

  /**
   * Get available field mappings for a partner
   */
  async getFieldMappings(
    emailType: string,
    integrationType: string = 'email'
  ): Promise<FieldMapping[]> {
    const { data, error } = await this.supabase
      .from('email_field_mappings')
      .select('*')
      .eq('partner_id', this.partnerId)
      .eq('service_category_id', this.serviceCategoryId)
      .eq('email_type', emailType)
      .eq('is_active', true)
      .contains('integration_types', [integrationType])
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error('Failed to load field mappings')
    }

    return data || []
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
}
