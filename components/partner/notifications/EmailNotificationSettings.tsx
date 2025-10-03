'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { X, Plus, Save, Mail, Users, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface AdminEmailConfig {
  enabled: boolean
  emails: string[]
}

interface CustomerEmailConfig {
  enabled: boolean
}

interface GHLConfig {
  enabled: boolean
}

interface EmailNotificationConfig {
  admin: AdminEmailConfig
  customer: CustomerEmailConfig
  ghl: GHLConfig
}

interface EmailNotificationSettingsProps {
  emailType: string
  emailTypeName: string
  currentSettings: EmailNotificationConfig | null
  fallbackEmail: string | null
  onSave: (config: EmailNotificationConfig) => Promise<void>
}

export default function EmailNotificationSettings({
  emailType,
  emailTypeName,
  currentSettings,
  fallbackEmail,
  onSave
}: EmailNotificationSettingsProps) {
  // Admin settings
  const [adminEnabled, setAdminEnabled] = useState(currentSettings?.admin?.enabled !== false)
  const [adminEmails, setAdminEmails] = useState<string[]>(
    currentSettings?.admin?.emails && currentSettings.admin.emails.length > 0 
      ? currentSettings.admin.emails 
      : []
  )
  
  // Customer settings
  const [customerEnabled, setCustomerEnabled] = useState(currentSettings?.customer?.enabled !== false)
  
  // GHL settings
  const [ghlEnabled, setGhlEnabled] = useState(currentSettings?.ghl?.enabled !== false)
  
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const addEmail = () => {
    const trimmedEmail = newEmail.trim().toLowerCase()
    
    if (!trimmedEmail) {
      toast.error('Please enter an email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Check for duplicates
    if (adminEmails.includes(trimmedEmail)) {
      toast.error('This email is already added')
      return
    }

    setAdminEmails([...adminEmails, trimmedEmail])
    setNewEmail('')
  }

  const removeEmail = (emailToRemove: string) => {
    setAdminEmails(adminEmails.filter(e => e !== emailToRemove))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        admin: {
          enabled: adminEnabled,
          emails: adminEmails
        },
        customer: {
          enabled: customerEnabled
        },
        ghl: {
          enabled: ghlEnabled
        }
      })
      toast.success('Notification settings saved successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = () => {
    if (currentSettings?.admin?.enabled !== adminEnabled) return true
    if (currentSettings?.customer?.enabled !== customerEnabled) return true
    if (currentSettings?.ghl?.enabled !== ghlEnabled) return true
    
    const currentEmails = currentSettings?.admin?.emails || []
    if (currentEmails.length !== adminEmails.length) return true
    
    const sortedCurrent = [...currentEmails].sort()
    const sortedNew = [...adminEmails].sort()
    
    return !sortedCurrent.every((email, index) => email === sortedNew[index])
  }

  return (
    <div className="space-y-6">
      {/* Admin Email Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Header with Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Admin Email Notifications</h3>
              <p className="text-sm text-gray-500">Configure admin notification emails</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Label htmlFor={`admin-enabled-${emailType}`} className="text-sm font-medium">
              {adminEnabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id={`admin-enabled-${emailType}`}
              checked={adminEnabled}
              onCheckedChange={setAdminEnabled}
            />
          </div>
        </div>

        {/* Email List */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            Admin Email Addresses
          </Label>
          
          {/* Current Emails */}
          {adminEmails.length > 0 && (
            <div className="space-y-2">
              {adminEmails.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 border border-gray-200"
                >
                  <span className="text-sm text-gray-700">{email}</span>
                  <button
                    onClick={() => removeEmail(email)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Fallback Email Info */}
          {adminEmails.length === 0 && fallbackEmail && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Fallback email:</span> {fallbackEmail}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This is your default admin email. Add specific emails above to override it for this notification type.
              </p>
            </div>
          )}

          {/* No Email Warning */}
          {adminEmails.length === 0 && !fallbackEmail && (
            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <p className="text-sm text-amber-700">
                No admin email configured. Add at least one email address to receive notifications.
              </p>
            </div>
          )}

          {/* Add New Email */}
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <Label htmlFor={`new-email-${emailType}`} className="text-sm text-gray-600">
                Add Email Address
              </Label>
              <Input
                id={`new-email-${emailType}`}
                type="email"
                placeholder="admin@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addEmail()
                  }
                }}
                disabled={saving}
                className="mt-1"
              />
            </div>
            <Button
              type="button"
              onClick={addEmail}
              disabled={!newEmail.trim() || saving}
              variant="outline"
              size="default"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Customer Email Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-gray-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Customer Email Notifications</h3>
              <p className="text-sm text-gray-500">Send confirmation emails to customers</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Label htmlFor={`customer-enabled-${emailType}`} className="text-sm font-medium">
              {customerEnabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id={`customer-enabled-${emailType}`}
              checked={customerEnabled}
              onCheckedChange={setCustomerEnabled}
            />
          </div>
        </div>
      </div>

      {/* GHL Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="h-5 w-5 text-gray-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Leads Hub Integration</h3>
              <p className="text-sm text-gray-500">Create leads in Leads Hub</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Label htmlFor={`ghl-enabled-${emailType}`} className="text-sm font-medium">
              {ghlEnabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id={`ghl-enabled-${emailType}`}
              checked={ghlEnabled}
              onCheckedChange={setGhlEnabled}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={!hasChanges() || saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  )
}

