// Client-side GHL API functions
// These functions make API calls to server-side routes

export interface GHLIntegration {
  integration_id: string
  partner_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  company_id: string
  location_id?: string
  user_type: 'Company' | 'Location'
  scope: string
  refresh_token_id: string
  user_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GHLOpportunity {
  id: string
  name: string
  pipelineId: string
  pipelineStageId: string
  status: string
  stages?: Array<{
    id: string
    name: string
  }>
}

export interface GHLCustomField {
  id: string
  name: string
  key: string
  fieldType: string
  options?: Array<{ id: string; name: string }>
}

// Get GHL integration status
export async function getGHLIntegration(): Promise<GHLIntegration | null> {
  try {
    const response = await fetch('/api/ghl/integration')
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching GHL integration:', error)
    return null
  }
}

// Get GHL opportunities
export async function getGHLOpportunities(): Promise<GHLOpportunity[]> {
  try {
    const response = await fetch('/api/ghl/opportunities')
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching GHL opportunities:', error)
    return []
  }
}

// Get GHL custom fields
export async function getGHLCustomFields(): Promise<GHLCustomField[]> {
  try {
    const response = await fetch('/api/ghl/custom-fields')
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching GHL custom fields:', error)
    return []
  }
}

// Get pipelines (all pipelines with their stages)
export async function getGHLPipelines(): Promise<any[]> {
  try {
    const response = await fetch('/api/ghl/pipelines')
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching GHL pipelines:', error)
    return []
  }
}

// Get opportunity stages (deprecated - use getGHLPipelines instead)
export async function getGHLOpportunityStages(opportunityId: string): Promise<any[]> {
  console.warn('getGHLOpportunityStages is deprecated, use getGHLPipelines instead')
  return getGHLPipelines()
}
