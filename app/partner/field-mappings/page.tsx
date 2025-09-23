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
  { value: 'form_submissions', label: 'Form Submissions', description: 'Form submissions' },
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
  const [showHtmlGuide, setShowHtmlGuide] = useState(false)
  const [showTemplateGenerator, setShowTemplateGenerator] = useState(false)

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
    }

    // Auto-generate simple template field name (just the last part of the path)
    const pathParts = adjustedPath.split('.')
    const lastPart = pathParts[pathParts.length - 1]

    // Use simple field name - just the last part of the path
    const templateFieldName = lastPart
    const displayName = lastPart.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    const updates: Partial<FieldMapping> = {
      database_source: databaseSource,
      database_path: { path: adjustedPath },
      template_field_name: templateFieldName,
      display_name: displayName
    }

    // Set template type based on selection
    if (templateType === 'html') {
      updates.template_type = 'html_template'
      // Auto-generate HTML template based on the selected data
      const generatedTemplate = generateHtmlTemplate(databaseSource, adjustedPath, previewData)
      updates.html_template = generatedTemplate
    } else {
      updates.template_type = 'simple'
    }

    setEditingMapping({
      ...editingMapping,
      ...updates
    })
  }

  // Function to automatically generate HTML templates based on data structure
  const generateHtmlTemplate = (databaseSource: string, fieldPath: string, sampleData: any) => {
    if (!sampleData || !sampleData[databaseSource]) {
      return `<!-- Auto-generated template for ${fieldPath} -->\n<div class="data-container">\n  <h3>{{${fieldPath.split('.').pop()}}}</h3>\n</div>`
    }

    const data = sampleData[databaseSource]
    const pathParts = fieldPath.split('.')
    let currentData = data

    // Navigate to the specific field
    for (const part of pathParts) {
      if (currentData && typeof currentData === 'object') {
        currentData = currentData[part]
      } else {
        break
      }
    }

    if (!currentData) {
      return `<!-- Auto-generated template for ${fieldPath} -->\n<div class="data-container">\n  <h3>{{${fieldPath.split('.').pop()}}}</h3>\n</div>`
    }

    // Generate template based on data type
    if (Array.isArray(currentData)) {
      return generateArrayTemplate(fieldPath, currentData)
    } else if (typeof currentData === 'object' && currentData !== null) {
      // Special handling for form_answers which is an object with UUID keys
      if (fieldPath === 'form_answers') {
        return generateFormAnswersTemplate(fieldPath, currentData)
      }
      return generateObjectTemplate(fieldPath, currentData)
    } else {
      return generateSimpleTemplate(fieldPath)
    }
  }

  const generateArrayTemplate = (fieldPath: string, arrayData: any[]) => {
    const fieldName = fieldPath.split('.').pop() || 'items'
    const displayName = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    if (arrayData.length === 0) {
      return `<!-- Auto-generated template for ${fieldPath} -->\n<div class="${fieldName}-container" style="margin: 20px 0;">\n  <h3>${displayName}</h3>\n  <p>No items available</p>\n</div>`
    }

    // Analyze the first item to understand the structure
    const firstItem = arrayData[0]
    let itemFields: string[] = []
    
    if (typeof firstItem === 'object' && firstItem !== null) {
      itemFields = Object.keys(firstItem).slice(0, 5) // Limit to first 5 fields
    }

    let template = `<!-- Auto-generated template for ${fieldPath} -->\n`
    template += `<div class="${fieldName}-container" style="margin: 20px 0;">\n`
    template += `  <h3 style="margin-bottom: 15px; color: #333;">${displayName}</h3>\n`
    template += `  {{#each ${fieldName}}}\n`
    template += `    <div class="${fieldName}-item" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px; background: #f9f9f9;">\n`

    if (itemFields.length > 0) {
      // Generate fields based on the object structure - use dynamic field names
      itemFields.forEach(field => {
        const fieldDisplayName = field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        template += `      <div class="field" style="margin: 5px 0;">\n`
        template += `        <strong style="color: #555;">${fieldDisplayName}:</strong>\n`
        template += `        <span style="margin-left: 8px;">{{${field}}}</span>\n`
        template += `      </div>\n`
      })
    } else {
      // Simple array items
      template += `      <div class="item-content" style="padding: 10px;">\n`
      template += `        {{this}}\n`
      template += `      </div>\n`
    }

    template += `    </div>\n`
    template += `  {{/each}}\n`
    template += `</div>`

    return template
  }

  const generateObjectTemplate = (fieldPath: string, objectData: any) => {
    const fieldName = fieldPath.split('.').pop() || 'data'
    const displayName = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const fields = Object.keys(objectData).slice(0, 8) // Limit to first 8 fields

    let template = `<!-- Auto-generated template for ${fieldPath} -->\n`
    template += `<div class="${fieldName}-container" style="margin: 20px 0; border: 1px solid #ddd; padding: 20px; border-radius: 4px; background: #f9f9f9;">\n`
    template += `  <h3 style="margin-bottom: 15px; color: #333;">${displayName}</h3>\n`

    fields.forEach(field => {
      const fieldDisplayName = field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      template += `  <div class="field" style="margin: 8px 0; padding: 5px 0; border-bottom: 1px solid #eee;">\n`
      template += `    <strong style="color: #555; display: inline-block; width: 150px;">${fieldDisplayName}:</strong>\n`
      template += `    <span style="color: #333;">{{${field}}}</span>\n`
      template += `  </div>\n`
    })

    template += `</div>`

    return template
  }

  const generateSimpleTemplate = (fieldPath: string) => {
    const fieldName = fieldPath.split('.').pop() || 'value'
    const displayName = fieldName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

    return `<!-- Auto-generated template for ${fieldPath} -->\n<div class="${fieldName}-container" style="margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 4px;">\n  <h3 style="margin: 0 0 10px 0; color: #333;">${displayName}</h3>\n  <p style="margin: 0; color: #666;">{{${fieldName}}}</p>\n</div>`
  }

  // Special template for form_answers which is an object with UUID keys
  const generateFormAnswersTemplate = (fieldPath: string, formAnswersData: any) => {
    const fieldName = fieldPath.split('.').pop() || 'form_answers'
    const displayName = fieldName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    
    // Get the first form answer to understand the structure
    const firstAnswer = Object.values(formAnswersData)[0] as any
    
    let template = `<!-- Auto-generated template for ${fieldPath} -->\n`
    template += `<div class="${fieldName}-container" style="margin: 20px 0;">\n`
    template += `  <h3 style="margin-bottom: 15px; color: #333;">${displayName}</h3>\n`
    template += `  {{#each ${fieldName}}}\n`
    template += `    <div class="${fieldName}-item" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px; background: #f9f9f9;">\n`
    
    if (firstAnswer && typeof firstAnswer === 'object') {
      // Generate fields based on the form answer structure
      const answerFields = Object.keys(firstAnswer)
      answerFields.forEach(field => {
        const fieldDisplayName = field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        template += `      <div class="field" style="margin: 5px 0;">\n`
        template += `        <strong style="color: #555;">${fieldDisplayName}:</strong>\n`
        template += `        <span style="margin-left: 8px;">{{${field}}}</span>\n`
        template += `      </div>\n`
      })
    }
    
    template += `    </div>\n`
    template += `  {{/each}}\n`
    template += `</div>`

    return template
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


      {/* Create/Edit Form Modal - Fullscreen */}
      {showCreateForm && editingMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 z-50">
          <div className="bg-white w-[calc(100vw-4rem)] h-[calc(100vh-4rem)] overflow-y-auto p-4 rounded-lg"> 
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingMapping.id ? 'Edit Field Mapping' : 'Create Field Mapping'}
                </h2>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Left Side - Form */}
                <div className="md:col-span-2 space-y-6">
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

                  <div className="hidden">
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

                  <div className="grid grid-cols-3 gap-4 hidden">
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
                     <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">HTML Template</h3>
                       <div className="flex gap-2">
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={() => {
                             if (editingMapping && previewData) {
                               const generatedTemplate = generateHtmlTemplate(
                                 editingMapping.database_source, 
                                 editingMapping.database_path.path, 
                                 previewData
                               )
                               setEditingMapping({
                                 ...editingMapping,
                                 html_template: generatedTemplate
                               })
                               toast.success('HTML template auto-generated!')
                             }
                           }}
                           className="text-sm"
                         >
                           🤖 Auto-Generate
                         </Button>
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={() => setShowHtmlGuide(true)}
                           className="text-sm"
                         >
                           📖 Guide
                         </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="html_template">HTML Template</Label>
                      <Editor
                        className="border border-gray-200"
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
                 <div className="space-y-6 sticky top-6 self-start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Browse Sample Data</h3>
                        <p className="text-sm text-gray-600">Click on any field to automatically populate the database path</p>
                      </div>
                      <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadSampleData}
                        disabled={loading}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                      </Button>
                      </div>
                    </div>
                    
                    
                    {previewData ? (
                      <div className="border border-gray-200">
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
                        <div className="p-4 max-h-[62vh] overflow-y-auto">
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

       {/* HTML Guide Popup */}
       {showHtmlGuide && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-6">
               <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-semibold text-gray-900">📝 HTML Template Guide</h2>
                 <Button variant="outline" onClick={() => setShowHtmlGuide(false)}>
                   Close
                 </Button>
               </div>

               <div className="space-y-6">
                 {/* Basic Usage */}
                 <div>
                   <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Usage</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                       <h4 className="font-semibold text-green-800 mb-2">Simple Text Fields</h4>
                       <div className="space-y-2">
                         <div className="text-sm">
                           <strong>Syntax:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{`{{fieldName}}`}</code>
                         </div>
                         <div className="text-sm">
                           <strong>Example:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{`{{firstName}}`}</code>
                         </div>
                         <div className="text-sm text-gray-600">
                           Use for: Names, emails, phone numbers, simple text values
                         </div>
                       </div>
                     </div>

                     <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                       <h4 className="font-semibold text-purple-800 mb-2">HTML Content Fields</h4>
                       <div className="space-y-2">
                         <div className="text-sm">
                           <strong>Syntax:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{`{{{fieldName}}}`}</code>
                         </div>
                         <div className="text-sm">
                           <strong>Example:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{`{{{productList}}}`}</code>
                         </div>
                         <div className="text-sm text-gray-600">
                           Use for: Complex HTML content, product lists, formatted data
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Common Patterns */}
                 <div>
                   <h3 className="text-lg font-semibold text-gray-800 mb-4">Common Patterns</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                       <h4 className="font-semibold text-blue-800 mb-2">Loops</h4>
                       <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
{`{{#each products}}
  <div class="product">
    <h3>{{name}}</h3>
    <p>Price: £{{price}}</p>
  </div>
{{/each}}`}
                       </pre>
                       <div className="text-sm text-gray-600 mt-2">
                         Loop through arrays of data like products, images, or form answers
                       </div>
                     </div>

                     <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                       <h4 className="font-semibold text-orange-800 mb-2">Conditionals</h4>
                       <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
{`{{#if warranty}}
  <p>Warranty: {{warranty}}</p>
{{/if}}

{{#unless warranty}}
  <p>No warranty information</p>
{{/unless}}`}
                       </pre>
                       <div className="text-sm text-gray-600 mt-2">
                         Show content only when conditions are met
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Quick Examples */}
                 <div>
                   <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Examples</h3>
                   <div className="space-y-4">
                     <div className="p-4 bg-gray-50 rounded-lg border">
                       <h4 className="font-semibold text-gray-800 mb-2">Uploaded Images</h4>
                       <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`{{#each uploaded_images}}
  <div style="margin:10px 0;">
    <strong>{{label}}:</strong>
    <img src="{{url}}" style="max-width:200px; border:1px solid #ddd;" />
  </div>
{{/each}}`}
                       </pre>
                     </div>

                     <div className="p-4 bg-gray-50 rounded-lg border">
                       <h4 className="font-semibold text-gray-800 mb-2">Form Answers Table</h4>
                       <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
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

                     <div className="p-4 bg-gray-50 rounded-lg border">
                       <h4 className="font-semibold text-gray-800 mb-2">Product Cards</h4>
                       <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`{{#each products}}
  <div style="border:1px solid #ddd; padding:16px; margin:8px 0; border-radius:4px;">
    <h3 style="margin:0 0 8px 0;">{{name}}</h3>
    <p><strong>Price:</strong> £{{price}}</p>
    <p><strong>Power:</strong> {{power}}kW</p>
    {{#if warranty}}
      <p><strong>Warranty:</strong> {{warranty}}</p>
    {{/if}}
  </div>
{{/each}}`}
                       </pre>
                     </div>
                   </div>
                 </div>

                 {/* Tips */}
                 <div>
                   <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Tips & Best Practices</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                       <h4 className="font-semibold text-yellow-800 mb-2">Email Compatibility</h4>
                       <ul className="text-sm text-gray-700 space-y-1">
                         <li>• Use inline CSS for styling</li>
                         <li>• Test with different email clients</li>
                         <li>• Keep HTML structure simple</li>
                         <li>• Use tables for complex layouts</li>
                       </ul>
                     </div>

                     <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                       <h4 className="font-semibold text-green-800 mb-2">Testing & Debugging</h4>
                       <ul className="text-sm text-gray-700 space-y-1">
                         <li>• Use "Send Test" in notifications</li>
                         <li>• Field name = template variable name</li>
                         <li>• Use triple braces for HTML content</li>
                         <li>• Check data exists in sample data</li>
                       </ul>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
