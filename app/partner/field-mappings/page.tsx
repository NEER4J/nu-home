'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Edit, Trash2, Eye, Code, Save, RefreshCw, MapPin, Settings } from 'lucide-react'
import { toast } from 'sonner'
import Editor from '@monaco-editor/react'

interface FieldMapping {
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
  created_at: string
  updated_at: string
}

interface ServiceCategory {
  service_category_id: string
  name: string
  slug: string
  description?: string
  icon_url?: string
  is_active: boolean
}

const EMAIL_TYPES = [
  { id: 'quote-initial', name: 'Initial Quote Request', description: 'Sent when a customer submits a quote request' },
  { id: 'quote-verified', name: 'Quote Verified', description: 'Sent when a customer completes phone verification' },
  { id: 'save-quote', name: 'Save Quote', description: 'Sent when a customer saves their quote for later' },
  { id: 'checkout-monthly', name: 'Monthly Payment Plan', description: 'Sent when a customer confirms a monthly payment plan' },
  { id: 'checkout-pay-later', name: 'Pay After Installation', description: 'Sent when a customer books installation with pay-after-completion' },
  { id: 'checkout-stripe', name: 'Payment Confirmed', description: 'Sent when a customer completes payment via Stripe' },
  { id: 'enquiry-submitted', name: 'Enquiry Submitted', description: 'Sent when a customer submits a general enquiry' },
  { id: 'survey-submitted', name: 'Survey Submitted', description: 'Sent when a customer completes a survey' },
]

const DATABASE_SOURCES = [
  { value: 'quote_data', label: 'Quote Data', description: 'Form answers, contact details, address' },
  { value: 'products_data', label: 'Products Data', description: 'Selected products, product details' },
  { value: 'addons_data', label: 'Addons Data', description: 'Selected addons and bundles' },
  { value: 'checkout_data', label: 'Checkout Data', description: 'Payment, booking, order details' },
  { value: 'survey_data', label: 'Survey Data', description: 'Survey responses and images' },
  { value: 'enquiry_data', label: 'Enquiry Data', description: 'General enquiry information' },
  { value: 'save_quote_data', label: 'Save Quote Data', description: 'User info, products, and metadata from save quote submissions' },
]

const TEMPLATE_TYPES = [
  { value: 'simple', label: 'Simple', description: 'Direct field mapping (text, numbers, etc.)' },
  { value: 'html_template', label: 'HTML Template', description: 'Custom HTML with loops, styling, and complex layouts' },
]


// Email types by category (matching notification page)
const EMAIL_TYPES_BY_CATEGORY = {
  boiler: [
    {
      id: 'quote-initial',
      name: 'Initial Quote Request',
      description: 'Sent when a customer submits a boiler quote request',
    },
    {
      id: 'quote-verified',
      name: 'Quote Verified',
      description: 'Sent when a customer completes phone verification',
    },
    {
      id: 'save-quote',
      name: 'Save Quote',
      description: 'Sent when a customer saves their quote for later',
    },
    {
      id: 'checkout-monthly',
      name: 'Monthly Payment Plan',
      description: 'Sent when a customer confirms a monthly payment plan',
    },
    {
      id: 'checkout-pay-later',
      name: 'Pay After Installation',
      description: 'Sent when a customer books installation with pay-after-completion',
    },
    {
      id: 'checkout-stripe',
      name: 'Payment Confirmed',
      description: 'Sent when a customer completes payment via Stripe',
    },
    {
      id: 'enquiry-submitted',
      name: 'Enquiry Submitted',
      description: 'Sent when a customer submits a general enquiry',
    },
    {
      id: 'survey-submitted',
      name: 'Survey Submitted',
      description: 'Sent when a customer completes a survey',
    },
  ],
  aircon: [
    {
      id: 'aircon-quote-initial',
      name: 'Initial AC Quote Request',
      description: 'Sent when a customer submits an air conditioning quote request',
    },
    {
      id: 'aircon-installation-scheduled',
      name: 'Installation Scheduled',
      description: 'Sent when AC installation appointment is scheduled',
    },
    {
      id: 'aircon-maintenance-reminder',
      name: 'Maintenance Reminder',
      description: 'Sent to remind customers about AC maintenance',
    },
  ],
}

export default function FieldMappingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedEmailType, setSelectedEmailType] = useState('quote-initial')
  const [editingMapping, setEditingMapping] = useState<FieldMapping | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [activeDataTab, setActiveDataTab] = useState<string>('')

  const supabase = createClient()

  // Get email types for the selected category
  const getEmailTypesForCategory = (categorySlug: string) => {
    return EMAIL_TYPES_BY_CATEGORY[categorySlug as keyof typeof EMAIL_TYPES_BY_CATEGORY] || []
  }

  const availableEmailTypes = selectedCategoryId 
    ? getEmailTypesForCategory(categories.find(c => c.service_category_id === selectedCategoryId)?.slug || '')
    : []

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedCategoryId) {
      const categorySlug = categories.find(c => c.service_category_id === selectedCategoryId)?.slug || ''
      const categoryEmailTypes = getEmailTypesForCategory(categorySlug)
      
      // Reset email type if current selection isn't available for this category
      if (categoryEmailTypes.length === 0) {
        setSelectedEmailType('')
        setMappings([])
        setLoading(false)
        return
      } else if (!categoryEmailTypes.find(type => type.id === selectedEmailType)) {
        setSelectedEmailType(categoryEmailTypes[0].id)
      }
      
      loadMappings()
      loadSampleData()
    }
  }, [selectedCategoryId, selectedEmailType, categories])

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: approvedCategories, error } = await supabase
        .from('UserCategoryAccess')
        .select(`
          *,
          ServiceCategories(
            service_category_id,
            name,
            slug,
            description,
            icon_url,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')

      if (error) {
        console.error('Error loading categories:', error)
        toast.error('Failed to load categories')
        return
      }

      const categories = approvedCategories
        ?.map(ac => ac.ServiceCategories)
        .filter(cat => cat && cat.is_active) as ServiceCategory[]

      setCategories(categories || [])
      if (categories && categories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categories[0].service_category_id)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const loadMappings = async () => {
    if (!selectedCategoryId) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('email_field_mappings')
        .select('*')
        .eq('partner_id', user.id)
        .eq('service_category_id', selectedCategoryId)
        .eq('email_type', selectedEmailType)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading mappings:', error)
        toast.error('Failed to load field mappings')
        return
      }

      setMappings(data || [])
    } catch (error) {
      console.error('Error loading mappings:', error)
      toast.error('Failed to load field mappings')
    }
  }


  const handleCreateMapping = () => {
    setEditingMapping({
      id: '',
      partner_id: '',
      service_category_id: selectedCategoryId || '',
      email_type: selectedEmailType,
      template_field_name: '',
      database_source: 'quote_data',
      database_path: { path: '' },
      template_type: 'simple',
      html_template: '',
      html_template_type: 'custom',
      loop_config: {},
      template_variables: {},
      integration_types: ['email'],
      display_name: '',
      description: '',
      field_category: 'General',
      is_required: false,
      is_system: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    setShowCreateForm(true)
  }

  const handleEditMapping = (mapping: FieldMapping) => {
    setEditingMapping(mapping)
    setShowCreateForm(true)
  }

  const handleSaveMapping = async () => {
    if (!editingMapping) return

    // Validate required fields
    if (!selectedCategoryId) {
      toast.error('Please select a service category')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const mappingData = {
        ...editingMapping,
        partner_id: user.id,
        service_category_id: selectedCategoryId,
        email_type: selectedEmailType
      }
      
      // Remove fields that shouldn't be sent for new records
      if (!editingMapping.id) {
        delete (mappingData as any).id
        delete (mappingData as any).created_at
        delete (mappingData as any).updated_at
        // Keep partner_id and service_category_id for new records
      }

      if (editingMapping.id) {
        // Update existing mapping
        const { error } = await supabase
          .from('email_field_mappings')
          .update(mappingData)
          .eq('id', editingMapping.id)

        if (error) throw error
        toast.success('Field mapping updated successfully')
      } else {
        // Create new mapping
        const { error } = await supabase
          .from('email_field_mappings')
          .insert(mappingData)

        if (error) throw error
        toast.success('Field mapping created successfully')
      }

      setShowCreateForm(false)
      setEditingMapping(null)
      loadMappings()
    } catch (error: any) {
      console.error('Error saving mapping:', error)
      toast.error(error.message || 'Failed to save field mapping')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMapping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field mapping?')) return

    try {
      const { error } = await supabase
        .from('email_field_mappings')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Field mapping deleted successfully')
      loadMappings()
    } catch (error: any) {
      console.error('Error deleting mapping:', error)
      toast.error(error.message || 'Failed to delete field mapping')
    }
  }

  const copyDefaultMappings = async () => {
    if (!selectedCategoryId || !selectedEmailType) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Call the copy function
      const { error } = await supabase.rpc('copy_default_field_mappings', {
        p_partner_id: user.id,
        p_service_category_id: selectedCategoryId
      })

      if (error) throw error

      toast.success('Default field mappings loaded successfully')
      loadMappings()
    } catch (error: any) {
      console.error('Error loading default mappings:', error)
      toast.error(error.message || 'Failed to load default mappings')
    } finally {
      setSaving(false)
    }
  }


  const handleFieldSelect = (databaseSource: string, fieldPath: string, templateType?: string) => {
    if (!editingMapping) return

    // Adjust path for save_quote_data source to remove [0] prefix since the field mapping engine
    // automatically selects the latest entry from the save_quote_data array
    let adjustedPath = fieldPath
    if (databaseSource === 'save_quote_data' && fieldPath.startsWith('[0].')) {
      adjustedPath = fieldPath.substring(4) // Remove '[0].' prefix
      console.log(`Adjusted save_quote_data path from ${fieldPath} to ${adjustedPath}`)
    }

    // Auto-generate template field name with parent context
    const pathParts = adjustedPath.split('.')
    const lastPart = pathParts[pathParts.length - 1]

    let templateFieldName = lastPart
    let displayName = lastPart.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Add parent context to make field names more descriptive
    if (pathParts.length > 1) {
      // Get the parent part (second to last)
      const parentPart = pathParts[pathParts.length - 2]

      // Skip array indices like [0], [1], etc.
      if (!parentPart.match(/^\[\d+\]$/)) {
        // Clean up parent part (remove array notation)
        const cleanParent = parentPart.replace(/\[\d+\]/g, '').replace(/_/g, ' ')
        const parentPrefix = cleanParent.replace(/\b\w/g, l => l.toUpperCase()).replace(/\s+/g, '')

        templateFieldName = `${cleanParent.replace(/\s+/g, '_').toLowerCase()}_${lastPart}`
        displayName = `${parentPrefix} ${displayName}`
      }
    }

    const updates: Partial<FieldMapping> = {
      database_source: databaseSource,
      database_path: { path: adjustedPath },
      template_field_name: templateFieldName,
      display_name: displayName
    }

    // Set template type based on selection
    if (templateType === 'html') {
      updates.template_type = 'html_template'
    } else {
      updates.template_type = 'simple'
    }

    setEditingMapping({
      ...editingMapping,
      ...updates
    })
  }

  const loadSampleData = async () => {
    if (!selectedCategoryId) return

    try {
      // Load sample submission data for data browser
      // Try to find a record with actual data in different columns
      const { data, error } = await supabase
        .from('lead_submission_data')
        .select('*')
        .eq('service_category_id', selectedCategoryId)
        .not('checkout_data', 'is', null)
        .limit(1)
        .single()

      if (error) {
        console.log('No checkout data found, trying any record:', error.message)
        // If no checkout data, try any record
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('lead_submission_data')
          .select('*')
          .eq('service_category_id', selectedCategoryId)
          .limit(1)
          .single()

        if (fallbackError) {
          console.error('Error loading sample data:', fallbackError)
          return
        }
        setPreviewData(fallbackData)
      } else {
        setPreviewData(data)
      }
      
      // Set first available data source as active tab
      if (data) {
        const recordData = data
        const availableSources = Object.keys(recordData).filter(sourceKey => 
          ['quote_data', 'products_data', 'addons_data', 'survey_data', 'checkout_data', 'enquiry_data', 'success_data'].includes(sourceKey)
        )
        if (availableSources.length > 0) {
          setActiveDataTab(availableSources[0])
        }
      }
    } catch (error) {
      console.error('Error loading sample data:', error)
    }
  }

  const renderDataBrowser = (data: any, prefix: string = '', databaseSource: string = '') => {
    if (!data) return null

    // Handle JSON strings that might need parsing
    let parsedData = data
    if (typeof data === 'string' && data.startsWith('{')) {
      try {
        parsedData = JSON.parse(data)
      } catch (e) {
        // If parsing fails, use the original data
        parsedData = data
      }
    }

    const items: React.ReactElement[] = []

    if (Array.isArray(parsedData)) {
      parsedData.forEach((item, index) => {
        items.push(
          <div key={index} className="ml-4 border-l-2 border-gray-200 pl-4">
            <div className="text-sm text-gray-500 mb-2">Item {index}</div>
            {renderDataBrowser(item, `${prefix}[${index}]`, databaseSource)}
          </div>
        )
      })
    } else if (typeof parsedData === 'object' && parsedData !== null) {
      Object.entries(parsedData).forEach(([key, value]) => {
        const currentPath = prefix ? `${prefix}.${key}` : key
        const isClickable = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        const isArray = Array.isArray(value)
        const isObject = typeof value === 'object' && value !== null && !isArray
        const isComplexObject = isObject && Object.keys(value).length > 0
        
        items.push(
          <div key={key} className="mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-700">{key}:</span>
              {isClickable ? (
                <button
                  onClick={() => handleFieldSelect(databaseSource, currentPath)}
                  className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded cursor-pointer transition-colors"
                >
                  Select
                </button>
              ) : isArray || isComplexObject ? (
                <button
                  onClick={() => handleFieldSelect(databaseSource, currentPath, 'html')}
                  className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs rounded cursor-pointer transition-colors"
                  title="Use as HTML template (supports loops and custom layouts)"
                >
                  HTML
                </button>
              ) : (
                <span className="text-xs text-gray-500">
                  {Array.isArray(value) ? `Array (${value.length} items)` : 'Object'}
                </span>
              )}
            </div>
            {!isClickable && (
              <div className="ml-4 mt-1">
                {renderDataBrowser(value, currentPath, databaseSource)}
              </div>
            )}
          </div>
        )
      })
    }

    return <div>{items}</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Field Mappings</h1>
          <p className="mt-1 text-sm text-gray-600">Map database fields to template fields for various integrations</p>
        </div>
        <Button onClick={handleCreateMapping}>
          <Plus className="h-4 w-4 mr-2" />
          Create Mapping
        </Button>
      </div>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex overflow-x-auto pb-px" aria-label="Categories">
            {categories.map((category) => (
              <button
                key={category.service_category_id}
                onClick={() => {
                  setSelectedCategoryId(category.service_category_id)
                  setEditingMapping(null)
                }}
                className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  selectedCategoryId === category.service_category_id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {category.icon_url && (
                  <img 
                    src={category.icon_url} 
                    alt={category.name} 
                    className="h-4 w-4"
                  />
                )}
                <span>{category.name}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Email Type Selection */}
      {selectedCategoryId && availableEmailTypes.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Email Type</h2>
              <p className="text-sm text-gray-600">Select the email type to manage field mappings for</p>
            </div>
            <div className="w-80">
              <Select value={selectedEmailType} onValueChange={setSelectedEmailType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select email type" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmailTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div>
                        <div className="font-medium">{type.name}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}


      {/* Field Mappings Content */}
      {selectedCategoryId && availableEmailTypes.length > 0 && selectedEmailType && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Field Mappings for {availableEmailTypes.find(t => t.id === selectedEmailType)?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {mappings.length} mapping{mappings.length !== 1 ? 's' : ''} configured
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Copy default mappings for this category/email type
                      copyDefaultMappings()
                    }}
                    disabled={saving}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load Defaults
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {mappings.map(mapping => (
                  <div key={mapping.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{mapping.display_name}</h4>
                        <Badge variant={mapping.is_active ? 'default' : 'secondary'}>
                          {mapping.template_type}
                        </Badge>
                        {mapping.is_system && (
                          <Badge variant="outline">System</Badge>
                        )}
                        {mapping.is_required && (
                          <Badge variant="destructive">Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{mapping.description}</p>
                      <p className="text-xs text-gray-500">
                        <code className="bg-gray-100 px-1 py-0.5 rounded">{mapping.database_source}</code> → 
                        <code className="bg-gray-100 px-1 py-0.5 rounded ml-1">{mapping.template_field_name}</code>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMapping(mapping)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMapping(mapping.id)}
                        disabled={mapping.is_system}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {mappings.length === 0 && (
                  <div className="text-center py-12">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No field mappings found</h3>
                    <p className="text-gray-600 mb-4">Create your first field mapping to get started</p>
                    <Button onClick={handleCreateMapping}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Mapping
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Create/Edit Form Modal */}
      {showCreateForm && editingMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingMapping.id ? 'Edit Field Mapping' : 'Create Field Mapping'}
                </h2>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                {/* Left Side - Form */}
                <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={editingMapping.display_name}
                        onChange={(e) => setEditingMapping({
                          ...editingMapping,
                          display_name: e.target.value
                        })}
                        placeholder="e.g., Customer Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template_field_name">Template Field Name</Label>
                      <Input
                        id="template_field_name"
                        value={editingMapping.template_field_name}
                        onChange={(e) => setEditingMapping({
                          ...editingMapping,
                          template_field_name: e.target.value
                        })}
                        placeholder="e.g., customer_name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editingMapping.description}
                      onChange={(e) => setEditingMapping({
                        ...editingMapping,
                        description: e.target.value
                      })}
                      placeholder="Brief description of this field mapping"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="field_category">Field Category</Label>
                      <Input
                        id="field_category"
                        value={editingMapping.field_category}
                        onChange={(e) => setEditingMapping({
                          ...editingMapping,
                          field_category: e.target.value
                        })}
                        placeholder="e.g., Contact"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_required"
                        checked={editingMapping.is_required}
                        onCheckedChange={(checked) => setEditingMapping({
                          ...editingMapping,
                          is_required: checked
                        })}
                      />
                      <Label htmlFor="is_required">Required</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={editingMapping.is_active}
                        onCheckedChange={(checked) => setEditingMapping({
                          ...editingMapping,
                          is_active: checked
                        })}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>
                </div>

                {/* Data Mapping */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Data Mapping</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="database_source">Database Source</Label>
                      <Select
                        value={editingMapping.database_source}
                        onValueChange={(value) => setEditingMapping({
                          ...editingMapping,
                          database_source: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATABASE_SOURCES.map(source => (
                            <SelectItem key={source.value} value={source.value}>
                              <div>
                                <div className="font-medium">{source.label}</div>
                                <div className="text-xs text-gray-500">{source.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="database_path">Database Path</Label>
                      <Input
                        id="database_path"
                        placeholder="e.g., contact_details.first_name"
                        value={editingMapping.database_path.path}
                        onChange={(e) => setEditingMapping({
                          ...editingMapping,
                          database_path: { path: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="template_type">Template Type</Label>
                    <Select
                      value={editingMapping.template_type}
                      onValueChange={(value) => setEditingMapping({
                        ...editingMapping,
                        template_type: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* HTML Template */}
                {editingMapping.template_type === 'html_template' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">HTML Template</h3>

                    {/* Comprehensive HTML Tutorial */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-semibold text-gray-800 mb-4">📚 Complete Guide: Creating HTML Fields & Nested Data</h4>

                      <div className="space-y-6 text-sm max-h-[60vh] overflow-y-auto">
                        {/* Understanding Field Types */}
                        <div>
                          <h5 className="font-semibold mb-2 text-green-700">🎯 Understanding Field Types</h5>
                          <div className="space-y-2">
                            <div className="p-3 bg-white rounded border-l-4 border-green-400">
                              <strong>Text Fields:</strong> Use <code>{`{{fieldName}}`}</code> for simple text like names, emails, phone numbers
                              <div className="mt-1 text-xs text-gray-600">Example: <code>{`{{firstName}}`}</code> → "John"</div>
                            </div>
                            <div className="p-3 bg-white rounded border-l-4 border-purple-400">
                              <strong>HTML Fields:</strong> Use <code>{`{{{fieldName}}}`}</code> for complex HTML content like product lists
                              <div className="mt-1 text-xs text-gray-600">Example: <code>{`{{{detailed_products_data}}}`}</code> → Renders full HTML product cards</div>
                            </div>
                          </div>
                        </div>

                        {/* Working with Nested Data */}
                        <div>
                          <h5 className="font-semibold mb-2 text-indigo-700">🔗 Working with Nested Data</h5>
                          <div className="space-y-3">
                            <div className="p-3 bg-white rounded">
                              <strong>Accessing Nested Fields</strong>
                              <div className="text-xs text-gray-600 mt-2">
                                Use dot notation to access nested data:<br/>
                                • <code>user_info.first_name</code> → Customer's first name<br/>
                                • <code>products[0].name</code> → First product name<br/>
                                • <code>contact_details.postcode</code> → Customer postcode
                              </div>
                            </div>
                            <div className="p-3 bg-white rounded">
                              <strong>Cross-Column Access</strong>
                              <div className="text-xs text-gray-600 mt-2">
                                Use @ prefix to access different database columns:<br/>
                                • <code>@save_quote_data.user_info.email</code><br/>
                                • <code>@quote_data.contact_details.phone</code>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* HTML Template Examples */}
                        <div>
                          <h5 className="font-semibold mb-2 text-red-700">🎨 HTML Template Examples</h5>
                          <div className="space-y-3">
                            <div className="p-3 bg-white rounded">
                              <strong>Simple Product Loop</strong>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
{`<div class="products">
  {{#each detailed_products_data}}
    <div class="product">
      <h3>{{name}}</h3>
      <p>Price: £{{price}}</p>
      <p>Power: {{power}}kW</p>
    </div>
  {{/each}}
</div>`}
                              </pre>
                            </div>
                            <div className="p-3 bg-white rounded">
                              <strong>Advanced Product Card with Nested Fields</strong>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
{`{{#each detailed_products_data}}
  <div class="product-card" style="border:1px solid #ddd; padding:16px; margin:8px;">
    <img src="{{image_url}}" alt="{{name}}" style="max-width:100%;" />
    <h2>{{name}}</h2>
    <p>{{description}}</p>
    <p><strong>£{{price}}</strong> (Monthly: £{{monthly_price}})</p>

    <!-- Access nested product_fields -->
    <div class="specs">
      <p>Power: {{power}}kW</p>
      <p>Warranty: {{warranty}}</p>
      <p>Flow Rate: {{flow_rate}} L/min</p>
    </div>

    <!-- Loop through what's included -->
    {{#if what_s_included}}
      <h4>What's Included:</h4>
      <ul>
        {{#each what_s_included}}
          <li>
            {{#if items.image}}<img src="{{items.image}}" style="width:20px;" />{{/if}}
            {{items.title}} - {{items.subtitle}}
          </li>
        {{/each}}
      </ul>
    {{/if}}
  </div>
{{/each}}`}
                              </pre>
                            </div>
                            <div className="p-3 bg-white rounded">
                              <strong>Customer Q&A from Form</strong>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
{`<table style="width:100%; border-collapse:collapse;">
  {{#each form_answers}}
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:8px; font-weight:bold;">{{question_text}}:</td>
      <td style="padding:8px;">{{answer}}</td>
    </tr>
  {{/each}}
</table>`}
                              </pre>
                            </div>
                          </div>
                        </div>

                        {/* Common Patterns */}
                        <div>
                          <h5 className="font-semibold mb-2 text-teal-700">🔄 Common Patterns & Tips</h5>
                          <div className="space-y-2">
                            <div className="p-3 bg-white rounded">
                              <strong>Conditional Content:</strong>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
{`{{#if warranty}}
  <p>Warranty: {{warranty}}</p>
{{/if}}`}
                              </pre>
                            </div>
                            <div className="p-3 bg-white rounded">
                              <strong>Default Values:</strong>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
{`<p>Power: {{power}}{{#unless power}}N/A{{/unless}}kW</p>`}
                              </pre>
                            </div>
                            <div className="p-3 bg-white rounded">
                              <strong>Styling Tips:</strong>
                              <div className="text-xs text-gray-600 mt-1">
                                • Use inline CSS for email compatibility<br/>
                                • Test with different email clients<br/>
                                • Keep HTML structure simple<br/>
                                • Use tables for complex layouts
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Troubleshooting */}
                        <div>
                          <h5 className="font-semibold mb-2 text-orange-700">🐛 Troubleshooting</h5>
                          <div className="space-y-2">
                            <div className="p-3 bg-white rounded">
                              <strong>Field not showing data?</strong>
                              <div className="text-xs text-gray-600 mt-1">
                                1. Check the field mapping path is correct<br/>
                                2. Verify data exists in the database<br/>
                                3. Ensure you're using the right column source<br/>
                                4. Test with "Send Test" button in notifications
                              </div>
                            </div>
                            <div className="p-3 bg-white rounded">
                              <strong>HTML not rendering?</strong>
                              <div className="text-xs text-gray-600 mt-1">
                                1. Use triple braces <code>{`{{{field}}}`}</code> for HTML fields<br/>
                                2. Check field type is set to "html_template"<br/>
                                3. Validate your HTML syntax
                              </div>
                            </div>
                            <div className="p-3 bg-white rounded">
                              <strong>Loops not working?</strong>
                              <div className="text-xs text-gray-600 mt-1">
                                1. Ensure data is an array<br/>
                                2. Use correct Handlebars syntax: <code>{`{{#each array}}`}</code><br/>
                                3. Close with <code>{`{{/each}}`}</code>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Field Variable Reference */}
                        <div>
                          <h5 className="font-semibold mb-2 text-blue-700">📋 Available Template Variables</h5>
                          <div className="p-3 bg-white rounded">
                            <div className="text-xs text-gray-600">
                              Common variables you can use in your HTML templates:<br/>
                              • <code>{`{{data}}`}</code> - The raw data from database path<br/>
                              • <code>{`{{form_answers}}`}</code> - All form answers object<br/>
                              • <code>{`{{contact_details}}`}</code> - Contact information<br/>
                              • <code>{`{{selected_address}}`}</code> - Address details<br/>
                              • <code>{`{{detailed_products_data}}`}</code> - Product array with full details<br/>
                              • <code>{`{{user_info}}`}</code> - User information from save quote<br/>
                              • <code>{`{{products}}`}</code> - Basic product information<br/>
                              • <code>{`{{quote_link}}`}</code> - Quote link URL (always present)<br/>
                              • <code>{`{{conditional_quote_link}}`}</code> - Quote link only if not in iframe<br/>
                              • <code>{`{{show_quote_link}}`}</code> - Boolean: true if quote link should be shown<br/>
                              • <code>{`{{is_iframe}}`}</code> - Boolean: true if submission was from iframe
                            </div>
                          </div>
                        </div>

                        {/* Quote Link Example */}
                        <div>
                          <h5 className="font-semibold mb-2 text-purple-700">🔗 Conditional Quote Link Example</h5>
                          <div className="p-3 bg-white rounded">
                            <strong>Show quote link only when not in iframe:</strong>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
{`{{#if show_quote_link}}
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{conditional_quote_link}}"
       style="background: #007cba; color: white; padding: 12px 24px;
              text-decoration: none; border-radius: 4px; display: inline-block;">
      View Your Quote
    </a>
  </div>
{{else}}
  <p style="color: #666; font-style: italic; text-align: center;">
    Your quote has been saved and can be accessed through your account.
  </p>
{{/if}}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="html_template">HTML Template</Label>
                      <Editor
                        height="300px"
                        language="html"
                        value={editingMapping.html_template || ''}
                        onChange={(value) => setEditingMapping({
                          ...editingMapping,
                          html_template: value || ''
                        })}
                        options={{
                          minimap: { enabled: false },
                          wordWrap: 'on',
                          lineNumbers: 'on',
                          folding: true,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                )}
                </div>

                {/* Right Side - Data Browser */}
                <div className="space-y-6 sticky top-0 right-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Browse Sample Data</h3>
                        <p className="text-sm text-gray-600">Click on any field to automatically populate the database path</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadSampleData}
                        disabled={loading}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                      </Button>
                    </div>
                    
                    {previewData ? (
                      <div className="border border-gray-200 rounded-lg">
                        {/* Data Source Tabs */}
                        <div className="border-b border-gray-200">
                          <nav className="flex overflow-x-auto" aria-label="Data Sources">
                            {Object.entries(previewData)
                              .filter(([sourceKey]) => 
                                ['quote_data', 'products_data', 'addons_data', 'survey_data', 'checkout_data', 'enquiry_data', 'success_data', 'form_submissions', 'save_quote_data'].includes(sourceKey)
                              )
                              .map(([sourceKey, sourceData]) => (
                              <button
                                key={sourceKey}
                                onClick={() => setActiveDataTab(sourceKey)}
                                className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${
                                  activeDataTab === sourceKey
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {sourceKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </button>
                            ))}
                          </nav>
                        </div>
                        
                        {/* Data Content */}
                        <div className="p-4 max-h-[80vh] overflow-y-auto">
                          {activeDataTab && previewData && previewData[activeDataTab] ? (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-3">
                                {activeDataTab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Data
                              </h4>
                              {renderDataBrowser(previewData[activeDataTab], '', activeDataTab)}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Eye className="h-8 w-8 mx-auto mb-2" />
                              <p>Select a data source to browse fields</p>
                              {previewData && (
                                <div className="text-xs text-gray-400 mt-2">
                                  Available sources: {Object.keys(previewData).join(', ')}
                                  <br />
                                  Active tab: {activeDataTab || 'none'}
                                  <br />
                                  Checkout data type: {typeof previewData.checkout_data}
                                  <br />
                                  Checkout data value: {previewData.checkout_data ? JSON.stringify(previewData.checkout_data).substring(0, 100) + '...' : 'null/undefined'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Eye className="h-8 w-8 mx-auto mb-2" />
                        <p>No sample data available</p>
                        <p className="text-sm">Sample data will appear here when available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-8 pt-6 border-t border-gray-200">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMapping} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Mapping
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
