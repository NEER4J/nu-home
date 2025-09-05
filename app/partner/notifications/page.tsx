'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Edit, Eye, Save, RotateCcw } from 'lucide-react'
import EmailTemplateEditor from '@/components/partner/notifications/EmailTemplateEditor'
import { toast } from 'sonner'

interface EmailTemplate {
  template_id: string
  category: string
  service_category_id: string
  email_type: string
  recipient_type: 'customer' | 'admin'
  subject_template: string
  html_template: string
  text_template?: string
  dynamic_fields: any[]
  styling: any
  is_active: boolean
  is_default: boolean
  name?: string
  description?: string
}

interface ServiceCategory {
  service_category_id: string
  name: string
  slug: string
  description?: string
  icon_url?: string
  is_active: boolean
}

interface TemplateField {
  field_id: string
  field_name: string
  field_type: string
  display_name: string
  description?: string
  is_required: boolean
  is_system: boolean
  sample_value?: string
}

const EMAIL_TYPES = [
  {
    id: 'quote-initial',
    name: 'Initial Quote Request',
    description: 'Sent when a customer submits a quote request',
    category: 'boiler',
  },
  {
    id: 'quote-verified',
    name: 'Quote Verified',
    description: 'Sent when a customer completes phone verification',
    category: 'boiler',
  },
  {
    id: 'save-quote',
    name: 'Save Quote',
    description: 'Sent when a customer saves their quote for later',
    category: 'boiler',
  },
]


export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)

  const [activeTab, setActiveTab] = useState('customer')
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [selectedEmailType, setSelectedEmailType] = useState('quote-initial')
  
  const supabase = createClient()

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedCategoryId) {
      loadTemplates()
      loadTemplateFields()
      loadAdminEmail()
    }
  }, [selectedCategoryId, selectedEmailType])

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get partner profile to find profile_id
      const { data: profile, error: profileError } = await supabase
        .from('UserProfiles')
        .select('profile_id')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        setLoading(false)
        return
      }

      if (!profile) {
        setLoading(false)
        return
      }

      // Get partner's approved category access (same as my-products page)
      const { data: approvedCategories, error: categoryError } = await supabase
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

      if (categoryError) {
        console.error('Category access error:', categoryError)
        toast.error('Failed to load categories')
        setLoading(false)
        return
      }

      const categories = approvedCategories
        ?.map(ac => ac.ServiceCategories)
        .filter(cat => cat && cat.is_active) as ServiceCategory[]

      setCategories(categories || [])

      // Select first category by default
      if (categories && categories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categories[0].service_category_id)
      } else if (categories.length === 0) {
        // No categories found, stop loading
        setLoading(false)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load categories')
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    if (!selectedCategoryId) {
      setLoading(false)
      return
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Check if templates exist for this partner and category
      let { data: existingTemplates, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('partner_id', user.id)
        .eq('service_category_id', selectedCategoryId)
        .eq('email_type', selectedEmailType)
        .eq('is_active', true)

      // If service_category_id query fails, try with old category approach
      if (error || !existingTemplates || existingTemplates.length === 0) {
        console.log('Trying fallback category approach for templates')
        const { data: fallbackTemplates, error: fallbackError } = await supabase
          .from('email_templates')
          .select('*')
          .eq('partner_id', user.id)
          .eq('category', 'boiler') // fallback
          .eq('email_type', selectedEmailType)
          .eq('is_active', true)

        if (!fallbackError && fallbackTemplates) {
          existingTemplates = fallbackTemplates
        }
      }

      if (existingTemplates && existingTemplates.length > 0) {
        setTemplates(existingTemplates)
        // Set the first template as selected
        const customerTemplate = existingTemplates.find(t => t.recipient_type === 'customer')
        if (customerTemplate) {
          setSelectedTemplate(customerTemplate)
        }
      } else {
        // Create default templates if none exist
        try {
          await createDefaultTemplates(user.id, selectedCategoryId, selectedEmailType)
          // After creating templates, try to load them again
          const { data: newTemplates } = await supabase
            .from('email_templates')
            .select('*')
            .eq('partner_id', user.id)
            .eq('service_category_id', selectedCategoryId)
            .eq('email_type', selectedEmailType)
            .eq('is_active', true)

          if (newTemplates && newTemplates.length > 0) {
            setTemplates(newTemplates)
            const customerTemplate = newTemplates.find(t => t.recipient_type === 'customer')
            if (customerTemplate) {
              setSelectedTemplate(customerTemplate)
            }
          } else {
            setTemplates([])
          }
        } catch (createError) {
          console.error('Error creating default templates:', createError)
          setTemplates([])
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Failed to load email templates')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const loadTemplateFields = async () => {
    if (!selectedCategoryId) return
    
    try {
      // Try to load fields by service_category_id first
      let { data, error } = await supabase
        .from('template_fields')
        .select('*')
        .eq('service_category_id', selectedCategoryId)
        .order('display_name')

      // If that fails, try the old category-based approach
      if (error || !data || data.length === 0) {
        console.log('Trying fallback category approach for template fields')
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('template_fields')
          .select('*')
          .eq('category', 'boiler') // fallback to boiler for now
          .order('display_name')

        if (fallbackError) throw fallbackError
        data = fallbackData
      }

      setTemplateFields(data || [])
    } catch (error) {
      console.error('Error loading template fields:', error)
      // Set empty array so the page doesn't get stuck
      setTemplateFields([])
    }
  }

  const loadAdminEmail = async () => {
    if (!selectedCategoryId) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get category-specific admin email from PartnerSettings
      const { data: partnerSettings } = await supabase
        .from('PartnerSettings')
        .select('admin_email')
        .eq('partner_id', user.id)
        .eq('service_category_id', selectedCategoryId)
        .single()

      setAdminEmail(partnerSettings?.admin_email || null)
    } catch (error) {
      console.error('Error loading admin email:', error)
      setAdminEmail(null)
    }
  }

  const createDefaultTemplates = async (partnerId: string, categoryId: string, emailType: string) => {
    try {
      // First, ensure template fields exist for this category
      await createDefaultTemplateFields(categoryId)

      // Get partner profile for company details
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('company_name, company_color, logo_url')
        .eq('user_id', partnerId)
        .single()

      // Get category-specific admin email from PartnerSettings
      const { data: partnerSettings } = await supabase
        .from('PartnerSettings')
        .select('admin_email')
        .eq('partner_id', partnerId)
        .eq('service_category_id', categoryId)
        .single()

      // Use category-specific admin email if available
      const adminEmail = partnerSettings?.admin_email

      const defaultTemplates = [
        {
          partner_id: partnerId,
          service_category_id: categoryId,
          category: 'boiler', // Keep for backward compatibility
          email_type: emailType,
          recipient_type: 'customer',
          name: emailType === 'quote-initial' ? 'Customer Quote Confirmation' : 'Customer Quote Verified',
          description: emailType === 'quote-initial' 
            ? 'Email sent to customers after they submit a quote request'
            : 'Email sent to customers after phone verification is completed',
          subject_template: emailType === 'quote-initial' 
            ? 'Your quote request - {{companyName}}'
            : emailType === 'quote-verified'
            ? 'Quote Verified Successfully - {{companyName}}'
            : 'Quote Saved Successfully - {{companyName}}',
          html_template: emailType === 'quote-initial' 
            ? getDefaultCustomerTemplate()
            : emailType === 'quote-verified'
            ? getDefaultCustomerVerifiedTemplate()
            : getDefaultCustomerSaveQuoteTemplate(),
          text_template: emailType === 'quote-initial'
            ? getDefaultCustomerTextTemplate()
            : emailType === 'quote-verified'
            ? getDefaultCustomerVerifiedTextTemplate()
            : getDefaultCustomerSaveQuoteTextTemplate(),
          dynamic_fields: getDefaultDynamicFields(),
          styling: {
            primaryColor: profile?.company_color || '#3b82f6',
            fontFamily: 'Arial, sans-serif',
            headerBgColor: profile?.company_color || '#3b82f6',
            footerBgColor: '#f9fafb'
          },
          is_active: true,
          is_default: true
        },
        {
          partner_id: partnerId,
          service_category_id: categoryId,
          category: 'boiler', // Keep for backward compatibility
          email_type: emailType,
          recipient_type: 'admin',
          name: emailType === 'quote-initial' ? 'Admin Quote Notification' : 'Admin Quote Verified Notification',
          description: emailType === 'quote-initial'
            ? 'Notification sent to admin when a new quote is submitted'
            : 'Notification sent to admin when customer completes phone verification',
          subject_template: emailType === 'quote-initial'
            ? 'New Quote Request - {{companyName}}'
            : emailType === 'quote-verified'
            ? 'Quote Verified - Customer Ready - {{companyName}}'
            : 'Customer Saved Quote - Follow Up - {{companyName}}',
          html_template: emailType === 'quote-initial'
            ? getDefaultAdminTemplate()
            : emailType === 'quote-verified'
            ? getDefaultAdminVerifiedTemplate()
            : getDefaultAdminSaveQuoteTemplate(),
          text_template: emailType === 'quote-initial'
            ? getDefaultAdminTextTemplate()
            : emailType === 'quote-verified'
            ? getDefaultAdminVerifiedTextTemplate()
            : getDefaultAdminSaveQuoteTextTemplate(),
          dynamic_fields: getDefaultDynamicFields(),
          styling: {
            primaryColor: profile?.company_color || '#3b82f6',
            fontFamily: 'Arial, sans-serif',
            headerBgColor: profile?.company_color || '#3b82f6',
            footerBgColor: '#f9fafb'
          },
          is_active: true,
          is_default: true
        }
      ]

      const { error } = await supabase
        .from('email_templates')
        .insert(defaultTemplates)

      if (error) throw error
      toast.success('Default templates created successfully')
    } catch (error) {
      console.error('Error creating default templates:', error)
      toast.error('Failed to create default templates')
      throw error // Re-throw so the calling function knows it failed
    }
  }

  const createDefaultTemplateFields = async (categoryId: string) => {
    try {
      // Check if fields already exist for this category
      const { data: existingFields } = await supabase
        .from('template_fields')
        .select('field_id')
        .eq('service_category_id', categoryId)
        .limit(1)

      if (existingFields && existingFields.length > 0) {
        return // Fields already exist
      }

      const defaultFields = [
        // Customer fields
        { service_category_id: categoryId, category: 'boiler', field_name: 'firstName', field_type: 'text', display_name: 'First Name', description: 'Customer first name', is_required: true, is_system: true, sample_value: 'John' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'lastName', field_type: 'text', display_name: 'Last Name', description: 'Customer last name', is_required: true, is_system: true, sample_value: 'Doe' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'email', field_type: 'text', display_name: 'Email', description: 'Customer email address', is_required: true, is_system: true, sample_value: 'john.doe@example.com' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'phone', field_type: 'text', display_name: 'Phone', description: 'Customer phone number', is_required: false, is_system: true, sample_value: '07123456789' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'postcode', field_type: 'text', display_name: 'Postcode', description: 'Customer postcode', is_required: true, is_system: true, sample_value: 'SW1A 1AA' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'refNumber', field_type: 'text', display_name: 'Reference Number', description: 'Quote reference number', is_required: true, is_system: true, sample_value: 'REF-2024-001' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'submissionId', field_type: 'text', display_name: 'Submission ID', description: 'Unique submission identifier', is_required: true, is_system: true, sample_value: '896cd588-20e5-45c2-8c30-2622958bfca2' },

        // Company fields
        { service_category_id: categoryId, category: 'boiler', field_name: 'companyName', field_type: 'text', display_name: 'Company Name', description: 'Partner company name', is_required: true, is_system: true, sample_value: 'ABC Boilers Ltd' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'companyPhone', field_type: 'text', display_name: 'Company Phone', description: 'Company contact phone', is_required: false, is_system: true, sample_value: '0800 123 4567' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'companyEmail', field_type: 'text', display_name: 'Company Email', description: 'Company contact email', is_required: false, is_system: true, sample_value: 'info@abcboilers.com' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'companyAddress', field_type: 'text', display_name: 'Company Address', description: 'Company full address', is_required: false, is_system: true, sample_value: '123 Business St, London' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'companyWebsite', field_type: 'text', display_name: 'Company Website', description: 'Company website URL', is_required: false, is_system: true, sample_value: 'https://www.abcboilers.com' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'logoUrl', field_type: 'text', display_name: 'Logo URL', description: 'Company logo image URL', is_required: false, is_system: true, sample_value: 'https://example.com/logo.png' },

        // Quote fields
        { service_category_id: categoryId, category: 'boiler', field_name: 'quoteInfo', field_type: 'table', display_name: 'Quote Information', description: 'Detailed quote information', is_required: false, is_system: true, sample_value: 'Boiler Type: Combi\nProperty Type: Semi-detached' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'addressInfo', field_type: 'table', display_name: 'Address Information', description: 'Property address details', is_required: false, is_system: true, sample_value: 'Line 1: 123 Main St\nCity: London' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'submissionDate', field_type: 'date', display_name: 'Submission Date', description: 'Date of quote submission', is_required: true, is_system: true, sample_value: '2024-01-15' },

        // Links
        { service_category_id: categoryId, category: 'boiler', field_name: 'quoteLink', field_type: 'text', display_name: 'Quote Link', description: 'Link to view full quote', is_required: false, is_system: true, sample_value: 'https://example.com/quote/123' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'privacyPolicy', field_type: 'text', display_name: 'Privacy Policy', description: 'Privacy policy text or link', is_required: false, is_system: true, sample_value: 'Privacy Policy' },
        { service_category_id: categoryId, category: 'boiler', field_name: 'termsConditions', field_type: 'text', display_name: 'Terms & Conditions', description: 'Terms and conditions text or link', is_required: false, is_system: true, sample_value: 'Terms & Conditions' }
      ]

      const { error } = await supabase
        .from('template_fields')
        .insert(defaultFields)

      if (error) {
        console.error('Error creating template fields:', error)
      }
    } catch (error) {
      console.error('Error in createDefaultTemplateFields:', error)
    }
  }

  const handleSaveTemplate = async (updatedTemplate: EmailTemplate) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject_template: updatedTemplate.subject_template,
          html_template: updatedTemplate.html_template,
          text_template: updatedTemplate.text_template,
          dynamic_fields: updatedTemplate.dynamic_fields,
          styling: updatedTemplate.styling,
          updated_at: new Date().toISOString()
        })
        .eq('template_id', updatedTemplate.template_id)

      if (error) throw error

      toast.success('Template saved successfully')
      await loadTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleResetTemplate = async () => {
    if (!selectedTemplate || !window.confirm('Are you sure you want to reset this template to default? This action cannot be undone.')) {
      return
    }

    setSaving(true)
    try {
      const defaultHtml = selectedTemplate.recipient_type === 'customer' 
        ? getDefaultCustomerTemplate() 
        : getDefaultAdminTemplate()
      
      const defaultText = selectedTemplate.recipient_type === 'customer'
        ? getDefaultCustomerTextTemplate()
        : getDefaultAdminTextTemplate()

      await handleSaveTemplate({
        ...selectedTemplate,
        html_template: defaultHtml,
        text_template: defaultText,
        subject_template: selectedTemplate.recipient_type === 'customer'
          ? 'Your boiler quote request - {{companyName}}'
          : 'New Boiler Quote Request - {{companyName}}'
      })
    } finally {
      setSaving(false)
    }
  }

  const selectTemplateByType = (recipientType: 'customer' | 'admin') => {
    const template = templates.find(t => t.recipient_type === recipientType)
    if (template) {
      setSelectedTemplate(template)
      // Don't reset edit/preview modes when switching tabs
      // setEditMode(false)
      // setPreviewMode(false)
    }
  }

  const handleTemplateChange = (template: EmailTemplate) => {
    setSelectedTemplate(template)
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
          <h1 className="text-2xl font-semibold text-gray-900">Email Notifications</h1>
          <p className="mt-1 text-sm text-gray-600">Customize your email templates for different notifications</p>
        </div>
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
                  setSelectedTemplate(null)
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
      {selectedCategoryId && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Email Types">
            {EMAIL_TYPES.map((emailType) => (
              <button
                key={emailType.id}
                onClick={() => {
                  setSelectedEmailType(emailType.id)
                  setSelectedTemplate(null)
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedEmailType === emailType.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {emailType.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Email Template Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {EMAIL_TYPES.find(et => et.id === selectedEmailType)?.name || 'Email Templates'}
              </h2>
              <p className="text-sm text-gray-500">
                {EMAIL_TYPES.find(et => et.id === selectedEmailType)?.description || 'Customize your email templates for different notifications'}
              </p>
              {adminEmail && (
                <p className="text-xs text-blue-600 mt-1">
                  Admin notifications will be sent to: {adminEmail}
                </p>
              )}
              {!adminEmail && (
                <p className="text-xs text-amber-600 mt-1">
                  No admin email configured. Configure in Settings → General Settings → Admin Email Settings
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetTemplate}
              disabled={saving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
            <Button
              size="sm"
              onClick={() => selectedTemplate && handleSaveTemplate(selectedTemplate)}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Customer/Admin Email Tabs */}
      {selectedCategoryId && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Email Types">
            <button
              onClick={() => {
                setActiveTab('customer')
                selectTemplateByType('customer')
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'customer'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Customer Email
            </button>
            <button
              onClick={() => {
                setActiveTab('admin')
                selectTemplateByType('admin')
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'admin'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Admin Email
            </button>
          </nav>
        </div>
      )}

      {/* Template Content */}
      {selectedTemplate && (
        <EmailTemplateEditor
          template={selectedTemplate}
          templateFields={templateFields}
          onChange={handleTemplateChange}
        />
      )}
    </div>
  )
}

// Default template functions
function getDefaultDynamicFields() {
  return [
    'firstName', 'lastName', 'email', 'phone', 'postcode',
    'companyName', 'companyPhone', 'companyEmail', 'companyAddress', 'companyWebsite',
    'refNumber', 'submissionId', 'quoteLink', 'submissionDate'
  ]
}

function getDefaultCustomerTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, {{primaryColor}}, {{primaryColor}}dd); padding: 25px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 40px; max-width: 150px;">
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0;">Hi {{firstName}},</h1>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for requesting a quote. We've received your information and will be in touch shortly.
              </p>
              
              <!-- Details Table -->
              <table width="100%" cellpadding="12" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold; width: 35%;">Reference:</td>
                  <td>{{refNumber}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Name:</td>
                  <td>{{firstName}} {{lastName}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Email:</td>
                  <td>{{email}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Phone:</td>
                  <td>{{phone}}</td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{quoteLink}}" style="display: inline-block; background-color: {{primaryColor}}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View Your Quote
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                © {{currentYear}} {{companyName}}. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0;">
                <a href="{{companyWebsite}}" style="color: {{primaryColor}}; text-decoration: none;">Visit our website</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function getDefaultCustomerTextTemplate() {
  return `Hi {{firstName}},

Thank you for requesting a quote. We've received your information and will be in touch shortly.

Your Details:
Reference: {{refNumber}}
Name: {{firstName}} {{lastName}}
Email: {{email}}
Phone: {{phone}}

View your quote: {{quoteLink}}

Best regards,
{{companyName}}

© {{currentYear}} {{companyName}}. All rights reserved.
Visit our website: {{companyWebsite}}`
}

function getDefaultAdminTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Quote Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, {{primaryColor}}, {{primaryColor}}dd); padding: 25px 30px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0; text-align: center;">New Quote Request</h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h3 style="color: #1f2937; margin: 0 0 20px 0;">Customer Information</h3>
              
              <!-- Customer Details -->
              <table width="100%" cellpadding="10" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold; width: 35%;">Reference:</td>
                  <td>{{refNumber}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Name:</td>
                  <td>{{firstName}} {{lastName}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Email:</td>
                  <td>{{email}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Phone:</td>
                  <td>{{phone}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Postcode:</td>
                  <td>{{postcode}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Submission Date:</td>
                  <td>{{submissionDate}}</td>
                </tr>
              </table>
              
              <h3 style="color: #1f2937; margin: 30px 0 20px 0;">Quote Details</h3>
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                {{quoteInfo}}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This is an automated notification from {{companyName}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function getDefaultAdminTextTemplate() {
  return `New Quote Request

Customer Information:
Reference: {{refNumber}}
Name: {{firstName}} {{lastName}}
Email: {{email}}
Phone: {{phone}}
Postcode: {{postcode}}
Submission Date: {{submissionDate}}

Quote Details:
{{quoteInfo}}

This is an automated notification from {{companyName}}`
}

function getDefaultCustomerVerifiedTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Verified</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, {{primaryColor}}, {{primaryColor}}dd); padding: 25px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 40px; max-width: 150px;">
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0;">Great news, {{firstName}}!</h1>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your quote has been verified and you can now proceed to view your boiler options and pricing.
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                What happens next?
              </p>
              
              <div style="margin-bottom: 30px;">
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Browse our range of boiler options and pricing
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Select the perfect boiler for your home
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Choose your preferred installation date
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Complete your booking with secure payment
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Our certified engineers will handle the installation
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Enjoy your new efficient heating system
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{quoteLink}}" style="display: inline-block; background-color: {{primaryColor}}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View Your Boiler Options
                </a>
              </div>
              
              <p style="margin: 30px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6;">
                Thank you for choosing {{companyName}}!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                © {{currentYear}} {{companyName}}. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0;">
                <a href="{{companyWebsite}}" style="color: {{primaryColor}}; text-decoration: none;">Visit our website</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function getDefaultCustomerVerifiedTextTemplate() {
  return `Great news, {{firstName}}!

Your quote has been verified and you can now proceed to view your boiler options and pricing.

What happens next?
✓ Browse our range of boiler options and pricing
✓ Select the perfect boiler for your home
✓ Choose your preferred installation date
✓ Complete your booking with secure payment
✓ Our certified engineers will handle the installation
✓ Enjoy your new efficient heating system

View your boiler options: {{quoteLink}}

Thank you for choosing {{companyName}}!

© {{currentYear}} {{companyName}}. All rights reserved.
Visit our website: {{companyWebsite}}`
}

function getDefaultAdminVerifiedTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Verified - Customer Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="700" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, {{primaryColor}}, {{primaryColor}}dd); padding: 25px 30px; border-radius: 8px 8px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; vertical-align: middle;">
                    <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 40px; max-width: 150px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #374151;">
                Quote Verified - Customer Ready
              </h2>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                A customer has completed phone verification and is ready to proceed with booking.
              </p>

              <!-- Customer Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Customer Information
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Full Name:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{firstName}} {{lastName}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Email:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{email}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Phone:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{phone}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Postcode:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{postcode}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Reference:</td>
                        <td style="padding: 12px 15px; color: #6b7280;">{{refNumber}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #0c4a6e; text-align: center;">
                  Status: Ready to Proceed
                </h3>
                <p style="margin: 0; font-size: 16px; color: #0c4a6e; text-align: center; line-height: 1.6;">
                  Customer phone verification completed successfully. Ready to view products and proceed with booking.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 15px;">
                    <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 40px; max-width: 150px; margin-bottom: 10px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      ©2025 {{companyName}}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function getDefaultAdminVerifiedTextTemplate() {
  return `Quote Verified - Customer Ready

Customer Information:
Name: {{firstName}} {{lastName}}
Email: {{email}}
Phone: {{phone}}
Postcode: {{postcode}}
Reference: {{refNumber}}

Status: Customer phone verification completed successfully. Ready to view products and proceed with booking.

This is an automated notification from {{companyName}}`
}

function getDefaultCustomerSaveQuoteTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Saved Successfully</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: {{primaryColor}}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              {{#if logoUrl}}
                <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 60px; max-width: 200px; margin-bottom: 15px;">
              {{/if}}
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Quote Saved Successfully!
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                Hi {{firstName}},
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Great news! Your boiler quote has been successfully saved. You can return anytime to complete your booking or make changes to your selection.
              </p>

              <!-- Quote Details -->
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Your Quote Details</h3>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong> {{firstName}} {{lastName}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Email:</strong> {{email}}</td>
                  </tr>
                  {{#if postcode}}
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Postcode:</strong> {{postcode}}</td>
                  </tr>
                  {{/if}}
                  {{#if refNumber}}
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Reference:</strong> {{refNumber}}</td>
                  </tr>
                  {{/if}}
                </table>
              </div>

              {{#if quoteInfo}}
              <!-- Products Information -->
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">Saved Products & Options</h3>
                <div style="color: #92400e; font-size: 14px; line-height: 1.6; white-space: pre-line;">{{quoteInfo}}</div>
              </div>
              {{/if}}

              <!-- Benefits Section -->
              <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px;">Your Quote Benefits</h3>
                <ul style="margin: 0; padding-left: 20px; color: #065f46; font-size: 14px; line-height: 1.6;">
                  <li>Quote saved for 30 days - no pressure to decide now</li>
                  <li>Prices locked in at current rates</li>
                  <li>Easy to return and complete your booking</li>
                  <li>Modify your selection anytime before booking</li>
                  <li>Professional installation included</li>
                  <li>Full warranty and aftercare support</li>
                </ul>
              </div>

              <!-- Call to Action -->
              {{#if quoteLink}}
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{quoteLink}}" style="display: inline-block; background-color: {{primaryColor}}; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  View & Complete Your Quote
                </a>
              </div>
              {{/if}}

              <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thank you for choosing {{companyName}}! We're here whenever you're ready to proceed with your boiler installation.
              </p>

              <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                If you have any questions or need assistance, please don't hesitate to contact us.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              {{#if companyPhone}}
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Phone: {{companyPhone}}
              </p>
              {{/if}}
              {{#if companyEmail}}
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Email: {{companyEmail}}
              </p>
              {{/if}}
              {{#if companyAddress}}
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                {{companyAddress}}
              </p>
              {{/if}}
              {{#if companyWebsite}}
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Website: {{companyWebsite}}
              </p>
              {{/if}}
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ©2025 {{companyName}}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function getDefaultCustomerSaveQuoteTextTemplate() {
  return `Quote Saved Successfully - {{companyName}}

Hi {{firstName}},

Great news! Your boiler quote has been successfully saved. You can return anytime to complete your booking or make changes to your selection.

Your Quote Details:
Name: {{firstName}} {{lastName}}
Email: {{email}}
{{#if postcode}}Postcode: {{postcode}}{{/if}}
{{#if refNumber}}Reference: {{refNumber}}{{/if}}

{{#if quoteInfo}}Saved Products & Options:
{{quoteInfo}}

{{/if}}Your Quote Benefits:
• Quote saved for 30 days - no pressure to decide now
• Prices locked in at current rates
• Easy to return and complete your booking
• Modify your selection anytime before booking
• Professional installation included
• Full warranty and aftercare support

{{#if quoteLink}}View & Complete Your Quote: {{quoteLink}}

{{/if}}Thank you for choosing {{companyName}}! We're here whenever you're ready to proceed with your boiler installation.

If you have any questions or need assistance, please don't hesitate to contact us.

{{#if companyPhone}}Phone: {{companyPhone}}{{/if}}
{{#if companyEmail}}Email: {{companyEmail}}{{/if}}
{{#if companyAddress}}{{companyAddress}}{{/if}}
{{#if companyWebsite}}Website: {{companyWebsite}}{{/if}}

©2025 {{companyName}}. All rights reserved.`
}

function getDefaultAdminSaveQuoteTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Saved Quote - Follow Up</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #f59e0b; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              {{#if logoUrl}}
                <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 60px; max-width: 200px; margin-bottom: 15px;">
              {{/if}}
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Customer Saved Quote - Follow Up
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                Great Follow-Up Opportunity!
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                A customer has saved their boiler quote - this is a great opportunity to follow up and help them complete their booking.
              </p>

              <!-- Customer Information -->
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Customer Information</h3>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong> {{firstName}} {{lastName}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Email:</strong> {{email}}</td>
                  </tr>
                  {{#if postcode}}
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Postcode:</strong> {{postcode}}</td>
                  </tr>
                  {{/if}}
                  {{#if refNumber}}
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Reference:</strong> {{refNumber}}</td>
                  </tr>
                  {{/if}}
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Date Saved:</strong> {{submissionDate}}</td>
                  </tr>
                </table>
              </div>

              {{#if quoteInfo}}
              <!-- Products Information -->
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">Saved Products & Options</h3>
                <div style="color: #92400e; font-size: 14px; line-height: 1.6; white-space: pre-line;">{{quoteInfo}}</div>
              </div>
              {{/if}}

              <!-- Action Required -->
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 18px;">Action Required</h3>
                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                  <strong>Contact customer within 24-48 hours</strong> to help convert the quote into a booking. 
                  This is a high conversion opportunity - the customer has shown strong interest by saving their quote.
                </p>
              </div>

              <!-- Follow-up Tips -->
              <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px;">Follow-up Tips</h3>
                <ul style="margin: 0; padding-left: 20px; color: #065f46; font-size: 14px; line-height: 1.6;">
                  <li>Call or email to answer any questions they may have</li>
                  <li>Offer to schedule a convenient installation date</li>
                  <li>Highlight any current promotions or incentives</li>
                  <li>Provide additional information about your services</li>
                  <li>Offer a free consultation or site visit</li>
                </ul>
              </div>

              {{#if quoteLink}}
              <!-- Quote Link -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{quoteLink}}" style="display: inline-block; background-color: {{primaryColor}}; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  View Customer Quote
                </a>
              </div>
              {{/if}}

              <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                This is an automated notification from {{companyName}}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ©2025 {{companyName}}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function getDefaultAdminSaveQuoteTextTemplate() {
  return `Customer Saved Quote - Follow Up - {{companyName}}

Great Follow-Up Opportunity!

A customer has saved their boiler quote - this is a great opportunity to follow up and help them complete their booking.

Customer Information:
Name: {{firstName}} {{lastName}}
Email: {{email}}
{{#if postcode}}Postcode: {{postcode}}{{/if}}
{{#if refNumber}}Reference: {{refNumber}}{{/if}}
Date Saved: {{submissionDate}}

{{#if quoteInfo}}Saved Products & Options:
{{quoteInfo}}

{{/if}}Action Required:
Contact customer within 24-48 hours to help convert the quote into a booking. This is a high conversion opportunity - the customer has shown strong interest by saving their quote.

Follow-up Tips:
• Call or email to answer any questions they may have
• Offer to schedule a convenient installation date
• Highlight any current promotions or incentives
• Provide additional information about your services
• Offer a free consultation or site visit

{{#if quoteLink}}View Customer Quote: {{quoteLink}}

{{/if}}This is an automated notification from {{companyName}}.

©2025 {{companyName}}. All rights reserved.`
}
