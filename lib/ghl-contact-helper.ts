import { createClient } from '@/utils/supabase/server'
import { getGHLService } from './ghl-api'

export interface AddressData {
  address_line_1?: string
  address_line_2?: string
  street_name?: string
  street_number?: string
  building_name?: string
  sub_building?: string
  county?: string
  country?: string
  formatted_address?: string
  address_type?: string
}

export interface LeadData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  postcode?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  submissionId: string
  submissionDate: string
  quoteData?: string
  addressData?: AddressData
  serviceCategoryId: string
  emailType: string
  partnerId: string
}

export async function createGHLContact(leadData: LeadData): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    // Get GHL integration for the partner
    const { data: ghlIntegration, error: integrationError } = await supabase
      .from('ghl_integrations')
      .select('*')
      .eq('partner_id', leadData.partnerId)
      .eq('is_active', true)
      .single()

    if (integrationError || !ghlIntegration) {
      console.log('No GHL integration found for partner:', leadData.partnerId)
      return false
    }

    // Get GHL service instance
    const ghlService = await getGHLService(leadData.partnerId)
    if (!ghlService) {
      console.log('Failed to get GHL service for partner:', leadData.partnerId)
      return false
    }

    // Get field mappings for this email type
    const { data: fieldMappings, error: mappingError } = await supabase
      .from('ghl_field_mappings')
      .select('*')
      .eq('partner_id', leadData.partnerId)
      .eq('service_category_id', leadData.serviceCategoryId)
      .eq('email_type', leadData.emailType)
      .eq('is_active', true)

    if (mappingError || !fieldMappings || fieldMappings.length === 0) {
      console.log('❌ No field mappings found for email type:', leadData.emailType)
      console.log('🔍 Search criteria:', {
        partnerId: leadData.partnerId,
        serviceCategoryId: leadData.serviceCategoryId,
        emailType: leadData.emailType
      })
      return false
    }

    console.log('📋 Found field mappings:', fieldMappings.map(m => ({
      recipient_type: m.recipient_type,
      pipeline_id: m.pipeline_id,
      opportunity_stage: m.opportunity_stage,
      tags: m.tags,
      tags_type: typeof m.tags,
      tags_is_array: Array.isArray(m.tags)
    })))

    // Create contacts for both customer and admin mappings
    let successCount = 0
    let failureCount = 0
    
    for (const mapping of fieldMappings) {
      try {
        // Prepare custom fields based on mapping - convert to array format
        const customFields: Array<{field: string, value: string | number | boolean | null}> = []
        
        console.log(`🔍 Processing field mappings for ${mapping.recipient_type}:`, mapping.field_mappings)
        console.log(`📊 Lead data available:`, {
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          email: leadData.email,
          phone: leadData.phone,
          postcode: leadData.postcode,
          quoteData: leadData.quoteData,
          submissionId: leadData.submissionId
        })
        
        // Map dynamic fields to GHL custom fields
        Object.entries(mapping.field_mappings || {}).forEach(([ourFieldId, ghlFieldId]) => {
          if (ghlFieldId && ourFieldId) {
            // Map our field data to GHL custom field
            const fieldValue = getFieldValue(ourFieldId, leadData)
            if (fieldValue !== null && fieldValue !== undefined) {
              customFields.push({
                field: ghlFieldId as string,
                value: fieldValue
              })
              console.log(`🔗 Field mapping: ${ourFieldId} -> ${ghlFieldId} = ${fieldValue}`)
            } else {
              console.log(`⚠️ No value found for field: ${ourFieldId}`)
            }
          }
        })

        // Prepare tags - use database saved tags if available, otherwise use defaults
        const defaultTags = ['NU-Home Lead', `Email Type: ${leadData.emailType}`, `Recipient: ${mapping.recipient_type}`]
        const savedTags = Array.isArray(mapping.tags) ? mapping.tags : []
        const allTags = [...defaultTags, ...savedTags]
        
        console.log(`🏷️ Tags for ${mapping.recipient_type}:`, {
          defaultTags,
          savedTags,
          allTags
        })

        console.log(`📤 Custom fields to send to GHL for ${mapping.recipient_type}:`, customFields)

        // Create contact data (excluding address2 as it's not supported)
        const contactData = {
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          email: leadData.email,
          phone: leadData.phone,
          address1: leadData.address1,
          city: leadData.city,
          state: leadData.state,
          postalCode: leadData.postalCode || leadData.postcode,
          country: leadData.country || 'United Kingdom',
          customFields,
          source: 'NU-Home Website',
          tags: allTags
        }

        // Create or update contact in GHL
        let contact
        let contactId
        let isNewContact = false
        
        try {
          // Try to create new contact first
          contact = await ghlService.createContact(contactData)
          contactId = contact.id
          isNewContact = true
          console.log(`✅ Created new GHL contact for ${mapping.recipient_type}: ${contactId}`)
        } catch (createError: unknown) {
          // Check if error is due to duplicate contact
          if (createError && typeof createError === 'object' && 'message' in createError && 
              typeof createError.message === 'string' && createError.message.includes('duplicated contacts')) {
            console.log(`🔄 Contact already exists for ${mapping.recipient_type}, updating existing contact...`)
            try {
              // Extract contactId from structured error data
              const errorData = (createError as any).errorData
              if (errorData && errorData.meta && errorData.meta.contactId) {
                contactId = errorData.meta.contactId
                console.log(`📧 Updating existing GHL contact ${contactId} for ${mapping.recipient_type} (matched by ${errorData.meta.matchingField})`)
                // Update existing contact with new data
                contact = await ghlService.updateContact(contactId, contactData)
                console.log(`✅ Successfully updated existing GHL contact ${contactId} for ${mapping.recipient_type}`)
              } else {
                console.error('❌ No contactId found in duplicate error:', errorData)
                throw new Error('Could not extract contactId from duplicate error')
              }
            } catch (updateError) {
              console.error('❌ Failed to update existing contact:', updateError)
              throw updateError
            }
          } else {
            // Re-throw other creation errors
            console.error('❌ Failed to create GHL contact:', createError)
            throw createError
          }
        }
        
        if (contactId) {
          // Create opportunity in pipeline if specified
          if (mapping.pipeline_id) {
            try {
              // First, try to validate that the pipeline and stage exist
              console.log('🔍 Validating pipeline and stage...')
              let pipelineValidated = false
              
              try {
                const pipelines = await ghlService.getPipelines()
                console.log(`📋 Found ${pipelines.length} pipelines`)
                
                const targetPipeline = pipelines.find(p => p.id === mapping.pipeline_id)
                
                if (!targetPipeline) {
                  console.error(`❌ Pipeline ${mapping.pipeline_id} not found. Available pipelines:`, 
                    pipelines.map(p => ({ id: p.id, name: p.name })))
                  console.log('⚠️ Skipping opportunity creation due to invalid pipeline ID')
                  continue // Skip to next mapping
                }
                
                if (mapping.opportunity_stage) {
                  const targetStage = targetPipeline.stages?.find((s: any) => s.id === mapping.opportunity_stage)
                  if (!targetStage) {
                    console.error(`❌ Stage ${mapping.opportunity_stage} not found in pipeline ${mapping.pipeline_id}. Available stages:`, 
                      targetPipeline.stages?.map((s: any) => ({ id: s.id, name: s.name })) || [])
                    console.log('⚠️ Skipping opportunity creation due to invalid stage ID')
                    continue // Skip to next mapping
                  }
                  console.log(`✅ Pipeline "${targetPipeline.name}" and stage "${targetStage.name}" validated`)
                } else {
                  console.log(`✅ Pipeline "${targetPipeline.name}" validated (no specific stage)`)
                }
                
                pipelineValidated = true
              } catch (pipelineError) {
                console.warn('⚠️ Could not validate pipelines:', pipelineError)
                console.log('🎲 Proceeding with opportunity creation anyway (pipeline validation failed)')
                pipelineValidated = false
              }

              const opportunityName = `${leadData.firstName} ${leadData.lastName}`
              console.log(`🎯 Creating opportunity "${opportunityName}" for contact ${contactId} (source: quote_ai)`)
              const opportunity = await ghlService.createOpportunityForContact(
                contactId,
                mapping.pipeline_id,
                mapping.opportunity_stage || undefined,
                opportunityName
              )
              console.log(`✅ Created opportunity ${opportunity.id} for contact ${contactId} in pipeline ${mapping.pipeline_id}`)
            } catch (oppError) {
              console.error('❌ Failed to create opportunity for contact:', oppError)
              // If opportunity creation fails due to duplicate, that's acceptable
              if (oppError && typeof oppError === 'object' && 'message' in oppError && 
                  typeof oppError.message === 'string' && (oppError.message.includes('duplicate') || oppError.message.includes('already exists'))) {
                console.log('ℹ️ Opportunity may already exist for this contact, continuing...')
              }
            }
          } else {
            console.log(`ℹ️ No pipeline configured for ${mapping.recipient_type}, skipping opportunity creation`)
          }
        }
        successCount++
      } catch (contactError) {
        console.error(`❌ Failed to process GHL contact for ${mapping.recipient_type}:`, contactError)
        failureCount++
      }
    }

    console.log(`📊 GHL Contact Processing Summary: ${successCount} successful, ${failureCount} failed`)
    return successCount > 0
  } catch (error) {
    console.error('GHL contact creation failed:', error)
    return false
  }
}

function getFieldValue(fieldId: string, leadData: LeadData): string | number | boolean | null {
  // Map our dynamic field IDs to actual data values
  const fieldMap: Record<string, string | number | boolean | null | undefined> = {
    'firstName': leadData.firstName,
    'lastName': leadData.lastName,
    'email': leadData.email,
    'phone': leadData.phone,
    'postcode': leadData.postcode,
    'address1': leadData.address1,
    'address2': leadData.address2,
    'city': leadData.city,
    'state': leadData.state,
    'postalCode': leadData.postalCode,
    'country': leadData.country,
    'submissionId': leadData.submissionId,
    'submissionDate': leadData.submissionDate,
    'quoteData': leadData.quoteData,
    'addressData': leadData.addressData ? JSON.stringify(leadData.addressData) : null,
  }

  const value = fieldMap[fieldId]
  console.log(`🔍 getFieldValue: ${fieldId} -> ${value} (type: ${typeof value})`)
  return value !== undefined ? value : null
}

interface QuoteSubmissionData {
  first_name?: string
  firstName?: string
  last_name?: string
  lastName?: string
  email?: string
  phone?: string
  postcode?: string
  address_line_1?: string
  address1?: string
  address_line_2?: string
  address2?: string
  city?: string
  county?: string
  state?: string
  country?: string
  submission_id?: string
  id?: string
  created_at?: string
  form_answers?: any
  quoteData?: string
  street_name?: string
  street_number?: string
  building_name?: string
  sub_building?: string
  formatted_address?: string
  address_type?: string
}

export async function createGHLContactFromQuoteSubmission(
  submissionData: QuoteSubmissionData,
  serviceCategoryId: string,
  emailType: string,
  partnerId: string
): Promise<boolean> {
  const leadData: LeadData = {
    firstName: submissionData.first_name || submissionData.firstName || '',
    lastName: submissionData.last_name || submissionData.lastName || '',
    email: submissionData.email || '',
    phone: submissionData.phone || undefined,
    postcode: submissionData.postcode || undefined,
    address1: submissionData.address_line_1 || submissionData.address1 || undefined,
    address2: submissionData.address_line_2 || submissionData.address2 || undefined,
    city: submissionData.city || undefined,
    state: submissionData.county || submissionData.state || undefined,
    postalCode: submissionData.postcode || undefined,
    country: submissionData.country || 'United Kingdom',
    submissionId: submissionData.submission_id || submissionData.id || '',
    submissionDate: submissionData.created_at || new Date().toISOString(),
    quoteData: submissionData.quoteData || (submissionData.form_answers ? JSON.stringify(submissionData.form_answers) : undefined),
    addressData: {
      address_line_1: submissionData.address_line_1,
      address_line_2: submissionData.address_line_2,
      street_name: submissionData.street_name,
      street_number: submissionData.street_number,
      building_name: submissionData.building_name,
      sub_building: submissionData.sub_building,
      county: submissionData.county,
      country: submissionData.country,
      formatted_address: submissionData.formatted_address,
      address_type: submissionData.address_type
    },
    serviceCategoryId,
    emailType,
    partnerId
  }

  return await createGHLContact(leadData)
}
