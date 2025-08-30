'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Monitor, 
  Smartphone, 
  Mail, 
  RefreshCw,
  Download,
  Send
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

interface EmailTemplate {
  template_id: string
  subject_template: string
  html_template: string
  text_template?: string
  dynamic_fields: any[]
  styling: any
}

interface TemplateField {
  field_id: string
  field_name: string
  field_type: string
  display_name: string
  sample_value?: string
}

interface EmailTemplatePreviewProps {
  template: EmailTemplate
  templateFields: TemplateField[]
}

export default function EmailTemplatePreview({
  template,
  templateFields
}: EmailTemplatePreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [previewData, setPreviewData] = useState<Record<string, any>>({})
  const [renderedHtml, setRenderedHtml] = useState('')
  const [renderedText, setRenderedText] = useState('')
  const [renderedSubject, setRenderedSubject] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    // Initialize preview data with sample values
    const initialData: Record<string, any> = {}
    templateFields.forEach(field => {
      if (field.sample_value) {
        initialData[field.field_name] = field.sample_value
      }
    })
    
    // Add current year
    initialData.currentYear = new Date().getFullYear()
    
    setPreviewData(initialData)
  }, [templateFields])

  useEffect(() => {
    renderTemplate()
  }, [template, previewData])

  const renderTemplate = () => {
    // Process HTML template
    let processedHtml = template.html_template
    let processedText = template.text_template || ''
    let processedSubject = template.subject_template

    // Replace simple variables
    Object.entries(previewData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processedHtml = processedHtml.replace(regex, value || '')
      processedText = processedText.replace(regex, value || '')
      processedSubject = processedSubject.replace(regex, value || '')
    })

    // Process conditionals (simple implementation)
    // {{#if fieldName}}...{{/if}}
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g
    
    processedHtml = processedHtml.replace(conditionalRegex, (match, fieldName, content) => {
      const fieldValue = previewData[fieldName]
      return fieldValue ? content : ''
    })
    
    processedText = processedText.replace(conditionalRegex, (match, fieldName, content) => {
      const fieldValue = previewData[fieldName]
      return fieldValue ? content : ''
    })

    // {{#if fieldName}}...{{else}}...{{/if}}
    const conditionalElseRegex = /{{#if\s+(\w+)}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g
    
    processedHtml = processedHtml.replace(conditionalElseRegex, (match, fieldName, ifContent, elseContent) => {
      const fieldValue = previewData[fieldName]
      return fieldValue ? ifContent : elseContent
    })
    
    processedText = processedText.replace(conditionalElseRegex, (match, fieldName, ifContent, elseContent) => {
      const fieldValue = previewData[fieldName]
      return fieldValue ? ifContent : elseContent
    })

    // Apply styling
    if (template.styling) {
      const { primaryColor, fontFamily, headerBgColor, footerBgColor } = template.styling
      processedHtml = processedHtml.replace(/{{primaryColor}}/g, primaryColor || '#3b82f6')
      processedHtml = processedHtml.replace(/{{fontFamily}}/g, fontFamily || 'Arial, sans-serif')
      processedHtml = processedHtml.replace(/{{headerBgColor}}/g, headerBgColor || primaryColor || '#3b82f6')
      processedHtml = processedHtml.replace(/{{footerBgColor}}/g, footerBgColor || '#f9fafb')
    }

    setRenderedHtml(processedHtml)
    setRenderedText(processedText)
    setRenderedSubject(processedSubject)
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    setPreviewData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const resetToDefaults = () => {
    const defaultData: Record<string, any> = {}
    templateFields.forEach(field => {
      if (field.sample_value) {
        defaultData[field.field_name] = field.sample_value
      }
    })
    defaultData.currentYear = new Date().getFullYear()
    setPreviewData(defaultData)
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address')
      return
    }

    setSending(true)
    try {
      // Here you would call your API to send a test email
      // For now, we'll just show a success message
      toast.success(`Test email would be sent to ${testEmail}`)
      
      // TODO: Implement actual email sending
      // const response = await fetch('/api/email/test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     to: testEmail,
      //     subject: renderedSubject,
      //     html: renderedHtml,
      //     text: renderedText
      //   })
      // })
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error('Failed to send test email')
    } finally {
      setSending(false)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([renderedHtml], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'email-template.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Preview Area */}
      <div className="col-span-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Email Preview</CardTitle>
                <CardDescription>
                  See how your email will look with sample data
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={device === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDevice('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={device === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDevice('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Subject Line Preview */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Subject:</span>
              </div>
              <p className="font-medium">{renderedSubject}</p>
            </div>

            {/* Email Content Preview */}
            <Tabs defaultValue="html">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="html">HTML Version</TabsTrigger>
                <TabsTrigger value="text">Text Version</TabsTrigger>
              </TabsList>
              
              <TabsContent value="html" className="mt-4">
                <div 
                  className={`bg-white border rounded-lg overflow-hidden ${
                    device === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
                  }`}
                >
                  <iframe
                    srcDoc={renderedHtml}
                    className="w-full"
                    style={{ height: '600px' }}
                    title="Email Preview"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="text" className="mt-4">
                <div className="bg-white border rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {renderedText}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Test Data Sidebar */}
      <div className="col-span-4">
        <Card className="sticky top-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Data</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
            <CardDescription>
              Customize preview data to test your template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {templateFields
                  .filter(field => template.dynamic_fields?.includes(field.field_name))
                  .map((field) => (
                    <div key={field.field_id}>
                      <Label htmlFor={field.field_name} className="text-sm">
                        {field.display_name}
                        {field.field_type !== 'text' && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {field.field_type}
                          </Badge>
                        )}
                      </Label>
                      <Input
                        id={field.field_name}
                        type={field.field_type === 'number' ? 'number' : 'text'}
                        value={previewData[field.field_name] || ''}
                        onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                        placeholder={field.sample_value || `Enter ${field.display_name.toLowerCase()}`}
                        className="mt-1"
                      />
                    </div>
                  ))}
              </div>
            </ScrollArea>

            {/* Send Test Email */}
            <div className="mt-6 pt-6 border-t">
              <Label htmlFor="test-email" className="text-sm">
                Send Test Email
              </Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email address"
                />
                <Button
                  onClick={sendTestEmail}
                  disabled={sending}
                  size="sm"
                >
                  {sending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
