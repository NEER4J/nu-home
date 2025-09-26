'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// SMTP fields (global)
interface SmtpSettings {
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_FROM: string;
}

// Twilio Verify fields (global)
interface TwilioSettings {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_VERIFY_SID: string;
}

interface GHLIntegration {
  company_id: string;
  user_type: string;
  created_at: string;
  token_expires_at: string;
}

const defaultSmtp: SmtpSettings = {
  SMTP_HOST: '',
  SMTP_PORT: 587,
  SMTP_SECURE: false,
  SMTP_USER: '',
  SMTP_PASSWORD: '',
  SMTP_FROM: '',
};

const defaultTwilio: TwilioSettings = {
  TWILIO_ACCOUNT_SID: '',
  TWILIO_AUTH_TOKEN: '',
  TWILIO_VERIFY_SID: '',
};

export default function IntegrationsComponent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>(defaultSmtp);
  const [twilioSettings, setTwilioSettings] = useState<TwilioSettings>(defaultTwilio);
  const [ghlIntegration, setGhlIntegration] = useState<GHLIntegration | null>(null);
  const [ghlLoading, setGhlLoading] = useState(false);
  const [ghlConnecting, setGhlConnecting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadIntegrations();
  }, []);

  const migrateSmtp = (raw: any): SmtpSettings => {
    const merged: SmtpSettings = {
      ...defaultSmtp,
      ...(raw || {}),
    };
    // Backward compat mapping from previous lower-case keys
    if (!merged.SMTP_HOST && raw?.host) merged.SMTP_HOST = raw.host;
    if (!merged.SMTP_PORT && (raw?.port || raw?.SMTP_PORT === 0)) merged.SMTP_PORT = Number(raw.port ?? raw.SMTP_PORT ?? 587);
    if (typeof merged.SMTP_SECURE !== 'boolean' && typeof raw?.secure === 'boolean') merged.SMTP_SECURE = raw.secure;
    if (!merged.SMTP_USER && (raw?.username || raw?.user)) merged.SMTP_USER = raw.username ?? raw.user;
    if (!merged.SMTP_PASSWORD && raw?.password) merged.SMTP_PASSWORD = raw.password;
    if (!merged.SMTP_FROM && (raw?.from_email || raw?.from)) merged.SMTP_FROM = raw.from_email ?? raw.from;
    return merged;
  };

  const migrateTwilio = (raw: any): TwilioSettings => {
    const merged: TwilioSettings = {
      ...defaultTwilio,
      ...(raw || {}),
    };
    if (!merged.TWILIO_ACCOUNT_SID && raw?.account_sid) merged.TWILIO_ACCOUNT_SID = raw.account_sid;
    if (!merged.TWILIO_AUTH_TOKEN && raw?.auth_token) merged.TWILIO_AUTH_TOKEN = raw.auth_token;
    if (!merged.TWILIO_VERIFY_SID && (raw?.verify_sid || raw?.messaging_service_sid)) merged.TWILIO_VERIFY_SID = raw.verify_sid ?? raw.messaging_service_sid;
    return merged;
  };

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('UserProfiles')
        .select('smtp_settings, twilio_settings')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile integrations:', profileError);
      } else if (profile) {
        // Check if we have encrypted data
        if (profile.smtp_settings && Object.keys(profile.smtp_settings).length > 0) {
          // Decrypt the settings using server-side API
          const response = await fetch('/api/partner/decrypt-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              smtp_settings: profile.smtp_settings,
              twilio_settings: profile.twilio_settings,
            }),
          });

          if (response.ok) {
            const { smtp_settings, twilio_settings } = await response.json();
            const smtp = migrateSmtp(smtp_settings || {});
            const twilio = migrateTwilio(twilio_settings || {});
            setSmtpSettings(smtp);
            setTwilioSettings(twilio);
          } else {
            console.error('Failed to decrypt settings, using empty defaults');
            setSmtpSettings(defaultSmtp);
            setTwilioSettings(defaultTwilio);
          }
        } else {
          // No encrypted data, use defaults
          setSmtpSettings(defaultSmtp);
          setTwilioSettings(defaultTwilio);
        }
      }

      // Load GHL integration
      await loadGHLIntegration();
    } catch (error) {
      console.error('Unexpected error loading integrations:', error);
      // Fallback to defaults on error
      setSmtpSettings(defaultSmtp);
      setTwilioSettings(defaultTwilio);
    } finally {
      setLoading(false);
    }
  };

  const saveIntegrations = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Encrypt the settings using server-side API
      const response = await fetch('/api/partner/encrypt-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_settings: smtpSettings,
          twilio_settings: twilioSettings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Encryption API error:', errorData);
        throw new Error('Failed to encrypt settings');
      }

      const { encrypted_smtp, encrypted_twilio } = await response.json();

      const { error } = await supabase
        .from('UserProfiles')
        .update({
          smtp_settings: encrypted_smtp,
          twilio_settings: encrypted_twilio,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving integrations:', error);
        throw error;
      }

      toast.success('Integration settings saved successfully!');
    } catch (error) {
      console.error('Unexpected error saving integrations:', error);
      toast.error('Failed to save integration settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // GHL Integration Functions
  const loadGHLIntegration = async () => {
    setGhlLoading(true);
    try {
      const { getGHLIntegration } = await import('@/lib/ghl-api-client');
      const integration = await getGHLIntegration();
      
      if (integration) {
        setGhlIntegration(integration);
      }
    } catch (error) {
      console.error('Unexpected error loading GHL integration:', error);
    } finally {
      setGhlLoading(false);
    }
  };

  const connectGHL = async () => {
    setGhlConnecting(true);
    try {
      console.log('Requesting GHL auth URL from server...');
      
      const response = await fetch('/api/ghl/auth-url');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate auth URL');
      }
      
      console.log('Generated GHL auth URL:', data.authUrl);
      
      // Redirect to GHL OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting to GHL:', error);
      toast.error(`Error connecting to GHL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setGhlConnecting(false);
    }
  };

  const disconnectGHL = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('ghl_integrations')
        .update({ is_active: false })
        .eq('partner_id', user.id);

      if (error) {
        console.error('Error disconnecting GHL:', error);
        toast.error('Failed to disconnect GoHighLevel. Please try again.');
      } else {
        setGhlIntegration(null);
        toast.success('GoHighLevel disconnected successfully!');
      }
    } catch (error) {
      console.error('Unexpected error disconnecting GHL:', error);
      toast.error('Failed to disconnect GoHighLevel. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading integration settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SMTP Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">SMTP Settings</h3>
            <p className="text-sm text-gray-500">Configure your email server settings for sending notifications</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Host
              </label>
              <input
                type="text"
                value={smtpSettings.SMTP_HOST}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, SMTP_HOST: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Port
              </label>
              <input
                type="number"
                value={smtpSettings.SMTP_PORT}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, SMTP_PORT: parseInt(e.target.value) || 0 })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="587"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="smtp-secure"
                type="checkbox"
                checked={smtpSettings.SMTP_SECURE}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, SMTP_SECURE: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="smtp-secure" className="text-sm font-medium text-gray-700">
                Use TLS/SSL
              </label>
            </div>
            <div></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Username
              </label>
              <input
                type="text"
                value={smtpSettings.SMTP_USER}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, SMTP_USER: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="your-email@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Password
              </label>
              <input
                type="password"
                value={smtpSettings.SMTP_PASSWORD}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, SMTP_PASSWORD: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your email password or app password"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email Address
              </label>
              <input
                type="email"
                value={smtpSettings.SMTP_FROM}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, SMTP_FROM: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="noreply@yourcompany.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Twilio Verify Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Twilio Verify Settings</h3>
            <p className="text-sm text-gray-500">Configure SMS verification for customer phone numbers</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account SID
              </label>
              <input
                type="text"
                value={twilioSettings.TWILIO_ACCOUNT_SID}
                onChange={(e) => setTwilioSettings({ ...twilioSettings, TWILIO_ACCOUNT_SID: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auth Token
              </label>
              <input
                type="password"
                value={twilioSettings.TWILIO_AUTH_TOKEN}
                onChange={(e) => setTwilioSettings({ ...twilioSettings, TWILIO_AUTH_TOKEN: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your Twilio auth token"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verify Service SID
              </label>
              <input
                type="text"
                value={twilioSettings.TWILIO_VERIFY_SID}
                onChange={(e) => setTwilioSettings({ ...twilioSettings, TWILIO_VERIFY_SID: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
          </div>
        </div>
      </div>

      {/* GoHighLevel CRM Integration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">GoHighLevel CRM Integration</h3>
            <p className="text-sm text-gray-500">Connect your GoHighLevel account to automatically send leads to your CRM</p>
          </div>
        </div>
        <div className="p-6">
          {ghlLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading integration status...</span>
            </div>
          ) : ghlIntegration ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800">Connected to GoHighLevel</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your account is connected to GoHighLevel. Leads will be automatically sent to your CRM.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Company ID:</span>
                  <span className="ml-2 text-gray-600">{ghlIntegration.company_id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">User Type:</span>
                  <span className="ml-2 text-gray-600">{ghlIntegration.user_type}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Connected:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(ghlIntegration.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Token Expires:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(ghlIntegration.token_expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={disconnectGHL}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Disconnect
                </button>
                <button
                  onClick={() => window.open('https://app.gohighlevel.com', '_blank')}
                  className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Open GoHighLevel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">Not Connected</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Connect your GoHighLevel account to automatically send leads to your CRM.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="mb-2">Benefits of connecting GoHighLevel:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Automatically create contacts for every lead</li>
                  <li>Map custom fields to your CRM</li>
                  <li>Add leads to specific opportunities and stages</li>
                  <li>Sync lead data in real-time</li>
                </ul>
              </div>
              
              <button
                onClick={connectGHL}
                disabled={ghlConnecting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ghlConnecting ? 'Connecting...' : 'Connect GoHighLevel'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveIntegrations}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Integration Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
