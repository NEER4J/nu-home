import { createClient } from '@/utils/supabase/server'

// GHL API Configuration
const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_AUTH_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation'
const GHL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token'

// Environment variables
const GHL_CLIENT_ID = process.env.GHL_CLIENT_ID
const GHL_CLIENT_SECRET = process.env.GHL_CLIENT_SECRET
const GHL_SHARED_SECRET = process.env.GHL_SHARED_SECRET

export interface GHLTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
  refreshTokenId: string
  userType: 'Company' | 'Location'
  companyId: string
  locationId?: string
  userId: string
  isBulkInstallation?: boolean
  traceId?: string
}

export interface GHLContact {
  firstName: string
  lastName: string
  email: string
  phone?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  customFields?: Record<string, any>
  source?: string
  tags?: string[]
}

export interface GHLOpportunity {
  id: string
  name: string
  pipelineId: string
  pipelineStageId: string
  status: string
}

export interface GHLCustomField {
  id: string
  name: string
  key: string
  fieldType: string
  options?: Array<{ id: string; name: string }>
}

export class GHLAPIService {
  public accessToken: string
  private refreshToken: string
  private companyId: string
  public locationId?: string
  public userType: 'Company' | 'Location'

  constructor(accessToken: string, refreshToken: string, companyId: string, locationId?: string, userType: 'Company' | 'Location' = 'Location') {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.companyId = companyId
    this.locationId = locationId
    this.userType = userType
  }

  async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${GHL_BASE_URL}${endpoint}`
    console.log(`🔄 Making GHL API request to: ${url}`)
    console.log(`🔑 Using access token: ${this.accessToken.substring(0, 20)}...`)
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28',
        ...options.headers,
      },
    })

    console.log(`📡 Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ GHL API Error: ${response.status} - ${errorText}`)
      
      // Try to parse error response as JSON to preserve structured data
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      
      const error = new Error(`GHL API Error: ${response.status} - ${errorText}`)
      ;(error as any).errorData = errorData
      ;(error as any).status = response.status
      throw error
    }

    const data = await response.json()
    console.log(`✅ GHL API response data:`, data)
    return data
  }

  // Get authorization URL for OAuth flow
  static getAuthorizationUrl(redirectUri: string, state?: string): string {
    if (!GHL_CLIENT_ID) {
      throw new Error('GHL_CLIENT_ID environment variable is not set')
    }

    const params = new URLSearchParams({
      client_id: GHL_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
        scope: 'contacts.write contacts.readonly opportunities.readonly opportunities.write locations/customFields.readonly',
      ...(state && { state }),
    })

    return `${GHL_AUTH_URL}?${params.toString()}`
  }

  // Exchange authorization code for access token
  static async exchangeCodeForToken(code: string, redirectUri: string): Promise<GHLTokenResponse> {
    if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
      throw new Error('GHL_CLIENT_ID and GHL_CLIENT_SECRET environment variables must be set')
    }

    const response = await fetch(GHL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: GHL_CLIENT_ID,
        client_secret: GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        user_type: 'Company', // We'll start with Company level access
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token exchange failed:', response.status, errorText)
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`)
    }

    const tokenData = await response.json()
    
    // Validate required fields
    if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.companyId || !tokenData.userId) {
      console.error('Invalid token response:', tokenData)
      throw new Error('Invalid token response: missing required fields')
    }

    return tokenData
  }

  // Refresh access token
  async refreshAccessToken(): Promise<GHLTokenResponse> {
    if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
      throw new Error('GHL_CLIENT_ID and GHL_CLIENT_SECRET environment variables must be set')
    }

    const response = await fetch(GHL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: GHL_CLIENT_ID,
        client_secret: GHL_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        user_type: this.userType,
        redirect_uri: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/auth/crm/callback',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token refresh failed:', response.status, errorText)
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`)
    }

    const tokenData = await response.json()
    
    // Validate required fields
    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error('Invalid refresh token response:', tokenData)
      throw new Error('Invalid refresh token response: missing required fields')
    }
    
    // Update instance tokens
    this.accessToken = tokenData.access_token
    this.refreshToken = tokenData.refresh_token

    return tokenData
  }

  // Get location access token from agency token
  async getLocationToken(locationId: string): Promise<GHLTokenResponse> {
    console.log('🔄 Requesting location token with:', {
      companyId: this.companyId,
      locationId: locationId,
      currentUserType: this.userType
    })
    
    const response = await this.makeRequest('/oauth/locationToken', {
      method: 'POST',
      body: JSON.stringify({
        companyId: this.companyId,
        locationId: locationId,
      }),
    })

    console.log('✅ Location token response:', {
      hasAccessToken: !!response.access_token,
      hasRefreshToken: !!response.refresh_token,
      locationId: response.locationId,
      userType: response.userType,
      companyId: response.companyId
    })

    return response
  }

  // Get all opportunities
  async getOpportunities(): Promise<GHLOpportunity[]> {
    try {
      let endpoint = '/opportunities'
      
      // Add locationId as query parameter for Location tokens
      if (this.userType === 'Location' && this.locationId) {
        endpoint += `?locationId=${this.locationId}`
      }
      
      const response = await this.makeRequest(endpoint)
      return response.opportunities || response.data || []
    } catch (error) {
      console.warn('Could not fetch opportunities:', error)
      return []
    }
  }

  // Get opportunity stages (pipelines) - deprecated, use getPipelines instead
  async getOpportunityStages(opportunityId: string): Promise<any[]> {
    console.warn('⚠️ getOpportunityStages is deprecated, use getPipelines() instead')
    return this.getPipelines()
  }

  // Get all pipelines (with their stages)
  async getPipelines(): Promise<any[]> {
    try {
      let endpoint = '/opportunities/pipelines'
      
      // Add locationId as query parameter for Location tokens
      if (this.userType === 'Location' && this.locationId) {
        endpoint += `?locationId=${this.locationId}`
      }
      
      const response = await this.makeRequest(endpoint)
      return response.pipelines || response.data || response || []
    } catch (error) {
      console.warn('Could not fetch pipelines:', error)
      return []
    }
  }

  // Get custom fields
  async getCustomFields(): Promise<GHLCustomField[]> {
    try {
      let endpoint = '/custom-fields'
      
      // Use location-specific endpoint if we have a location token
      if (this.userType === 'Location' && this.locationId) {
        endpoint = `/locations/${this.locationId}/customFields`
      }
      
      const response = await this.makeRequest(endpoint)
      return response.customFields || []
    } catch (error) {
      console.warn('Could not fetch custom fields:', error)
      // If location-specific endpoint fails, try global endpoint as fallback
      if (this.userType === 'Location' && this.locationId) {
        try {
          const fallbackResponse = await this.makeRequest('/custom-fields')
          return fallbackResponse.customFields || []
        } catch (fallbackError) {
          console.warn('Fallback custom fields request also failed:', fallbackError)
        }
      }
      return []
    }
  }

  // Create contact
  async createContact(contact: GHLContact): Promise<any> {
    const contactData: any = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      address1: contact.address1,
      city: contact.city,
      state: contact.state,
      postalCode: contact.postalCode,
      country: contact.country || 'United Kingdom',
      customFields: contact.customFields || [],
      source: contact.source || 'NU-Home Website',
      tags: contact.tags || ['NU-Home Lead'],
    }
    
    // Only include address2 if it has a value (GHL may not support it)
    if (contact.address2) {
      contactData.address2 = contact.address2
    }

    let endpoint = '/contacts'
    
    // Add locationId to contact data for Location tokens
    if (this.userType === 'Location' && this.locationId) {
      contactData.locationId = this.locationId
    }

    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(contactData),
    })
  }

  // Update contact
  async updateContact(contactId: string, contact: Partial<GHLContact>): Promise<any> {
    let endpoint = `/contacts/${contactId}`
    
    // Prepare contact data, excluding address2 if empty and ensuring customFields is array
    const contactData: any = { ...contact }
    
    // Remove address2 if it's empty or undefined
    if (!contactData.address2) {
      delete contactData.address2
    }
    
    // Remove locationId if it exists (should not be in update body)
    delete contactData.locationId
    
    // Ensure customFields is an array if provided
    if (contactData.customFields && !Array.isArray(contactData.customFields)) {
      contactData.customFields = []
    }
    
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    })
  }

  // Create opportunity for contact in pipeline using direct curl/fetch approach
  async createOpportunityForContact(contactId: string, pipelineId: string, stageId?: string, opportunityName?: string): Promise<any> {
    // Validate required fields
    if (!this.locationId) {
      console.error('❌ LocationId is required for opportunity creation but not available')
      throw new Error('LocationId is required for opportunity creation')
    }

    if (!stageId) {
      console.error('❌ pipelineStageId is required for opportunity creation but not provided')
      throw new Error('pipelineStageId is required for opportunity creation')
    }

    // Build payload exactly matching your working Postman example
    const data = {
      pipelineId,
      locationId: this.locationId,
      pipelineStageId: stageId,
      name: opportunityName || 'New Lead from NU-Home',
      status: 'open',
      monetaryValue: 0 // Adding this field from your working example
    }

    console.log('🔍 Direct API Opportunity creation payload:', JSON.stringify(data, null, 2))
    console.log('🏢 User type:', this.userType, 'Location ID:', this.locationId)
    
    // Validate contact exists first (helps debug 404 issues)
    try {
      const contactCheck = await this.makeRequest(`/contacts/${contactId}`)
      console.log('✅ Contact validated for opportunity creation:', contactId)
    } catch (contactError) {
      console.warn('⚠️ Could not validate contact existence:', contactError)
    }

    // Use direct fetch with exact headers from your working Postman example
    const url = `${GHL_BASE_URL}/opportunities/upsert`
    console.log(`🔄 Making direct GHL API request to: ${url}`)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        'Version': '2021-07-28'
      },
      body: JSON.stringify(data)
    })

    console.log(`📡 Direct API Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Direct GHL API Error: ${response.status} - ${errorText}`)
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      
      const error = new Error(`GHL API Error: ${response.status} - ${errorText}`)
      ;(error as any).errorData = errorData
      ;(error as any).status = response.status
      throw error
    }

    const result = await response.json()
    console.log(`✅ Direct GHL API response:`, result)
    return result
  }

  // Add contact to opportunity (deprecated - use createOpportunityForContact instead)
  async addContactToOpportunity(contactId: string, opportunityId: string, stageId?: string): Promise<any> {
    console.warn('⚠️ addContactToOpportunity is deprecated, use createOpportunityForContact instead')
    const data: any = {
      contactId,
      opportunityId,
    }

    if (stageId) {
      data.pipelineStageId = stageId
    }

    return this.makeRequest('/opportunities/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// Helper functions for database operations
export async function saveGHLIntegration(
  partnerId: string,
  tokenData: GHLTokenResponse
): Promise<void> {
  // Validate required fields
  if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.companyId || !tokenData.userId) {
    console.error('Invalid token data received:', tokenData)
    throw new Error('Invalid token data: missing required fields')
  }

  const supabase = await createClient()
  
  const expiresAt = new Date()
  expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

  const { error } = await supabase
    .from('ghl_integrations')
    .upsert({
      partner_id: partnerId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      company_id: tokenData.companyId,
      location_id: tokenData.locationId || null,
      user_type: tokenData.userType || 'Company',
      scope: tokenData.scope || '',
      refresh_token_id: tokenData.refreshTokenId || '',
      user_id: tokenData.userId,
      is_active: true,
    })

  if (error) {
    console.error('Database error saving GHL integration:', error)
    throw new Error(`Failed to save GHL integration: ${error.message}`)
  }
}

export async function getGHLIntegration(partnerId: string): Promise<any | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ghl_integrations')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // No integration found
    }
    throw new Error(`Failed to get GHL integration: ${error.message}`)
  }

  return data
}

export async function refreshGHLIntegration(partnerId: string): Promise<GHLAPIService | null> {
  const integration = await getGHLIntegration(partnerId)
  if (!integration) return null

  const ghlService = new GHLAPIService(
    integration.access_token,
    integration.refresh_token,
    integration.company_id,
    integration.location_id,
    integration.user_type
  )

  try {
    const newTokenData = await ghlService.refreshAccessToken()
    
      // Update database with new tokens
      const supabase = await createClient()
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + newTokenData.expires_in)

    await supabase
      .from('ghl_integrations')
      .update({
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('integration_id', integration.integration_id)

    return ghlService
  } catch (error) {
    console.error('Failed to refresh GHL token:', error)
    return null
  }
}

export async function getGHLService(partnerId: string): Promise<GHLAPIService | null> {
  const integration = await getGHLIntegration(partnerId)
  if (!integration) return null

  // Check if token is expired
  const now = new Date()
  const expiresAt = new Date(integration.token_expires_at)
  
  if (now >= expiresAt) {
    // Token is expired, try to refresh
    return await refreshGHLIntegration(partnerId)
  }

  // Create the service with the stored token
  let ghlService = new GHLAPIService(
    integration.access_token,
    integration.refresh_token,
    integration.company_id,
    integration.location_id,
    integration.user_type
  )

  // If we have a Company-level token but need Location-level access, get a location token
  if (integration.user_type === 'Company' && integration.location_id) {
    try {
      console.log('🔄 Converting Company token to Location token...')
      console.log('🔍 Company token details:', {
        companyId: integration.company_id,
        locationId: integration.location_id,
        userType: integration.user_type
      })
      
      const locationTokenData = await ghlService.getLocationToken(integration.location_id)
      console.log('✅ Location token obtained:', {
        hasAccessToken: !!locationTokenData.access_token,
        hasRefreshToken: !!locationTokenData.refresh_token,
        locationId: locationTokenData.locationId,
        userType: locationTokenData.userType,
        companyId: locationTokenData.companyId
      })
      
      // Create a new service with the location token
      ghlService = new GHLAPIService(
        locationTokenData.access_token,
        locationTokenData.refresh_token,
        locationTokenData.companyId,
        locationTokenData.locationId,
        'Location'
      )
      
      console.log('✅ GHL Service updated with Location token')
    } catch (error) {
      console.error('❌ Failed to get location token:', error)
      console.log('⚠️ Continuing with Company token...')
      // Continue with the company token and see if it works
    }
  } else {
    console.log('ℹ️ Using existing token:', {
      userType: integration.user_type,
      locationId: integration.location_id,
      companyId: integration.company_id
    })
  }

  return ghlService
}
