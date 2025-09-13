'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Code, 
  Eye, 
  Hash, 
  Copy,
  Send,
  Mail
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import Editor from '@monaco-editor/react'
import { TemplateField } from '@/lib/email-templates/shared'

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

// TemplateField interface is now imported from shared.ts

interface EmailTemplateEditorProps {
  template: EmailTemplate
  templateFields: TemplateField[]
  onChange: (template: EmailTemplate) => void
}

export default function EmailTemplateEditor({
  template,
  templateFields,
  onChange
}: EmailTemplateEditorProps) {
  const [localTemplate, setLocalTemplate] = useState(template)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, any>>({})
  const [renderedHtml, setRenderedHtml] = useState('')
  const [activeEditorTab, setActiveEditorTab] = useState('editor')
  const [partnerProfile, setPartnerProfile] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    setLocalTemplate(template)
  }, [template])

  useEffect(() => {
    loadPartnerProfile()
  }, [])

  useEffect(() => {
    // Initialize preview data with real company data and sample values from field mappings
    const initialData: Record<string, any> = {}
    
    // Use real company data if available
    if (partnerProfile) {
      initialData.companyName = partnerProfile.company_name || 'Your Company'
      initialData.companyPhone = partnerProfile.phone || '0800 123 4567'
      initialData.companyEmail = partnerProfile.contact_person ? `info@${partnerProfile.company_name?.toLowerCase().replace(/\s+/g, '')}.com` : 'info@yourcompany.com'
      initialData.companyAddress = partnerProfile.address || '123 Business Street, London'
      initialData.companyWebsite = partnerProfile.website_url || 'https://www.yourcompany.com'
      initialData.logoUrl = partnerProfile.logo_url || ''
      initialData.primaryColor = partnerProfile.company_color || '#3b82f6'
      initialData.privacyPolicy = partnerProfile.privacy_policy || 'Privacy Policy'
      initialData.termsConditions = partnerProfile.terms_conditions || 'Terms & Conditions'
    }

    // Use sample values from field mappings
    templateFields.forEach(field => {
      if (field.sample_value) {
        initialData[field.field_name] = field.sample_value
      }
    })
    
    // Add common fields that might be used
    initialData.currentYear = new Date().getFullYear()
    setPreviewData(initialData)
  }, [templateFields, partnerProfile])

  const loadPartnerProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('company_name, phone, address, website_url, logo_url, company_color, privacy_policy, terms_conditions, contact_person')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setPartnerProfile(profile)
      }
    } catch (error) {
      console.error('Error loading partner profile:', error)
    }
  }

  useEffect(() => {
    // Render template whenever it changes
    renderTemplate()
  }, [localTemplate, previewData])

  const renderTemplate = () => {
    let processedHtml = localTemplate.html_template

    // Replace simple variables
    Object.entries(previewData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processedHtml = processedHtml.replace(regex, String(value || ''))
    })

    // Apply styling
    if (localTemplate.styling && typeof localTemplate.styling === 'object') {
      const { primaryColor, fontFamily, headerBgColor, footerBgColor } = localTemplate.styling as any
      processedHtml = processedHtml.replace(/{{primaryColor}}/g, primaryColor || '#3b82f6')
      processedHtml = processedHtml.replace(/{{fontFamily}}/g, fontFamily || 'Arial, sans-serif')
      processedHtml = processedHtml.replace(/{{headerBgColor}}/g, headerBgColor || primaryColor || '#3b82f6')
      processedHtml = processedHtml.replace(/{{footerBgColor}}/g, footerBgColor || '#f9fafb')
    }

    setRenderedHtml(processedHtml)
  }

  const handleChange = (field: string, value: any) => {
    const updated = {
      ...localTemplate,
      [field]: value
    }
    setLocalTemplate(updated)
    onChange(updated)
  }



  const insertField = (fieldName: string) => {
    const fieldTag = `{{${fieldName}}}`
    const currentHtml = localTemplate.html_template || ''
    handleChange('html_template', currentHtml + fieldTag)
    toast.success(`Field {{${fieldName}}} inserted`)
  }

  const copyFieldTag = (fieldName: string) => {
    navigator.clipboard.writeText(`{{${fieldName}}}`)
    toast.success('Field tag copied to clipboard')
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address')
      return
    }

    setSendingTest(true)
    try {
      // Use the same data as preview (real company info + sample customer data)
      const testData = { ...previewData }

      // Apply test data to template
      let processedHtml = localTemplate.html_template
      let processedSubject = localTemplate.subject_template
      let processedText = localTemplate.text_template || ''

      Object.entries(testData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        processedHtml = processedHtml.replace(regex, String(value || ''))
        processedSubject = processedSubject.replace(regex, String(value || ''))
        processedText = processedText.replace(regex, String(value || ''))
      })

      // Apply styling
      if (localTemplate.styling && typeof localTemplate.styling === 'object') {
        const { primaryColor, fontFamily, headerBgColor, footerBgColor } = localTemplate.styling as any
        processedHtml = processedHtml.replace(/{{primaryColor}}/g, primaryColor || '#3b82f6')
        processedHtml = processedHtml.replace(/{{fontFamily}}/g, fontFamily || 'Arial, sans-serif')
        processedHtml = processedHtml.replace(/{{headerBgColor}}/g, headerBgColor || primaryColor || '#3b82f6')
        processedHtml = processedHtml.replace(/{{footerBgColor}}/g, footerBgColor || '#f9fafb')
      }

      // Pass the full hostname as subdomain (same as working email endpoints)
      const hostname = window.location.hostname
      const subdomain = hostname || null

      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          subject: processedSubject,
          html: processedHtml,
          text: processedText,
          subdomain: subdomain
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Test email sent successfully to ${testEmail}`)
      } else {
        toast.error(result.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error('Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  // Group template fields by category
  const categorizedFields = templateFields.reduce((acc, field) => {
    const categoryName = field.category || 'General'
    const existingCategory = acc.find(cat => cat.name === categoryName)
    
    if (existingCategory) {
      existingCategory.fields.push(field)
    } else {
      acc.push({
        name: categoryName,
        description: `Fields related to ${categoryName.toLowerCase()}`,
        fields: [field]
      })
    }
    
    return acc
  }, [] as Array<{ name: string; description: string; fields: TemplateField[] }>)

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Main Editor */}
      <div className="col-span-8">
        <Card>
          <CardHeader>
            <CardTitle>Email Template Editor</CardTitle>
            <CardDescription>
              Edit your email template content and use dynamic fields from the sidebar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6 pt-0">
            {/* Email Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-base font-semibold">Email Subject Line</Label>
              <Input
                id="subject"
                value={localTemplate.subject_template}
                onChange={(e) => handleChange('subject_template', e.target.value)}
                placeholder="Your boiler quote request - {{companyName}}"
                className="text-base"
              />
              <p className="text-sm text-gray-500">
                💡 Use dynamic fields like {`{{companyName}}`}, {`{{firstName}}`}, or {`{{refNumber}}`} to personalize
              </p>
            </div>

            {/* Editor/Preview Tabs */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="flex space-x-8" aria-label="Editor Tabs">
                <button
                  onClick={() => setActiveEditorTab('editor')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeEditorTab === 'editor'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Code className="h-4 w-4" />
                  <span>Email Content (HTML)</span>
                </button>
                <button
                  onClick={() => setActiveEditorTab('preview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeEditorTab === 'preview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  <span>Live Preview</span>
                </button>
              </nav>
            </div>

            {/* Editor Content */}
            {activeEditorTab === 'editor' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  💡 <strong>Tip:</strong> Use dynamic fields from the sidebar. Switch to Preview tab to see your changes
                </p>
                <div className="border rounded-lg overflow-hidden">
                  <Editor
                    height="500px"
                    defaultLanguage="html"
                    value={localTemplate.html_template}
                    onChange={(value) => handleChange('html_template', value || '')}
                    theme="vs-light"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      insertSpaces: true,
                      wordWrap: 'on',
                      folding: true,
                      bracketPairColorization: { enabled: true },
                      autoIndent: 'full',
                      formatOnPaste: true,
                      formatOnType: false, // Disable to avoid interference
                      suggestOnTriggerCharacters: true,
                      quickSuggestions: true,
                      parameterHints: { enabled: true },
                      hover: { enabled: true },
                      contextmenu: true,
                      selectOnLineNumbers: true,
                      glyphMargin: false,
                      lineDecorationsWidth: 10,
                      lineNumbersMinChars: 3,
                      // Ensure normal cursor behavior
                      cursorBlinking: 'blink',
                      cursorSmoothCaretAnimation: 'off',
                      disableLayerHinting: true
                    }}
                  />
                </div>
              </div>
            )}

            {/* Preview Content */}
            {activeEditorTab === 'preview' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Live preview with your real company information and sample customer data
                </p>
                <div className="border rounded-lg bg-gray-50 p-2">
                  <iframe
                    srcDoc={renderedHtml}
                    className="w-full rounded"
                    style={{ height: '600px' }}
                    title="Email Preview"
                  />
                </div>
              </div>
            )}

            {/* Test Email Section */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="text-base font-semibold mb-3 flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Test Your Email
              </h3>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1"
                />
                <Button
                  onClick={sendTestEmail}
                  disabled={sendingTest || !testEmail}
                  className="px-6"
                >
                  {sendingTest ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Send a test email to see how your template looks with sample data
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Fields Sidebar */}
      <div className="col-span-4">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Hash className="h-5 w-5 mr-2" />
              Dynamic Fields
            </CardTitle>
            <CardDescription>
              Dynamic fields for this email type. Click to copy field codes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-200px)] pr-4">
              <div className="space-y-6 p-6 pt-0">
                {/* How to Use */}
                <div>
                  <h3 className="font-semibold mb-3 text-blue-700">💡 How to Use</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <strong>Step 1:</strong> Click copy button next to any field below
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <strong>Step 2:</strong> Paste it in your email content where you want customer data to appear
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <strong>Step 3:</strong> Use "Send Test" to see the result!
                    </div>
                  </div>
                </div>

                {/* Dynamic Fields from Database */}
                {categorizedFields.length > 0 ? (
                  <div>
                    <h3 className="font-semibold mb-3">Available Fields</h3>
                    <div className="space-y-4">
                      {categorizedFields.map((category, categoryIndex) => (
                        <div key={categoryIndex}>
                          <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                            {category.name}
                            <span className="ml-2 text-xs text-gray-500">({category.fields.length})</span>
                          </h4>
                          <p className="text-xs text-gray-500 mb-2">{category.description}</p>
                          <div className="space-y-1">
                            {category.fields.map((field, fieldIndex) => (
                              <div
                                key={`${field.field_name}-${fieldIndex}`}
                                className="p-2 border rounded hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => copyFieldTag(field.field_name)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-1 mb-1">
                                      <span className="font-medium text-sm truncate">
                                        {field.display_name}
                                      </span>
                                      {field.is_required && (
                                        <Badge variant="secondary" className="text-xs px-1">
                                          *
                                        </Badge>
                                      )}
                                      {field.field_type === 'html_template' && (
                                        <Badge variant="outline" className="text-xs px-1">
                                          HTML
                                        </Badge>
                                      )}
                                    </div>
                                    <code className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                                      {`{{${field.field_name}}}`}
                                    </code>
                                    {field.description && (
                                      <p className="text-xs text-gray-500 mt-1 truncate">
                                        {field.description}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copyFieldTag(field.field_name)
                                    }}
                                    title="Copy field tag"
                                    className="h-6 w-6 p-0 shrink-0"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Hash className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <h3 className="text-sm font-medium text-gray-900 mb-1">No Fields Available</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      No field mappings have been configured for this email type yet.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => window.open('/partner/field-mappings', '_blank')}
                    >
                      Create Field Mappings
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
