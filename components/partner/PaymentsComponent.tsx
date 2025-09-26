'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

// Stripe fields (global)
interface StripeSettings {
  STRIPE_PUBLISHABLE_KEY_LIVE: string;
  STRIPE_SECRET_KEY_LIVE: string;
  STRIPE_PUBLISHABLE_KEY_TEST: string;
  STRIPE_SECRET_KEY_TEST: string;
  enabled_environment: 'live' | 'test';
}

// Kanda Finance fields (global)
interface KandaSettings {
  KANDA_ENTERPRISE_ID: string;
  KANDA_PROD: string;
}

const defaultStripe: StripeSettings = {
  STRIPE_PUBLISHABLE_KEY_LIVE: '',
  STRIPE_SECRET_KEY_LIVE: '',
  STRIPE_PUBLISHABLE_KEY_TEST: '',
  STRIPE_SECRET_KEY_TEST: '',
  enabled_environment: 'live',
};

const defaultKanda: KandaSettings = {
  KANDA_ENTERPRISE_ID: '',
  KANDA_PROD: '',
};

export default function PaymentsComponent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeSettings, setStripeSettings] = useState<StripeSettings>(defaultStripe);
  const [kandaSettings, setKandaSettings] = useState<KandaSettings>(defaultKanda);

  const supabase = createClient();

  useEffect(() => {
    loadPaymentsData();
  }, []);

  const migrateStripe = (raw: any): StripeSettings => {
    const merged: StripeSettings = {
      ...defaultStripe,
      ...(raw || {}),
    };
    // Backward compat mapping from previous lower-case keys
    if (!merged.STRIPE_PUBLISHABLE_KEY_LIVE && raw?.publishable_key_live) merged.STRIPE_PUBLISHABLE_KEY_LIVE = raw.publishable_key_live;
    if (!merged.STRIPE_SECRET_KEY_LIVE && raw?.secret_key_live) merged.STRIPE_SECRET_KEY_LIVE = raw.secret_key_live;
    if (!merged.STRIPE_PUBLISHABLE_KEY_TEST && raw?.publishable_key_test) merged.STRIPE_PUBLISHABLE_KEY_TEST = raw.publishable_key_test;
    if (!merged.STRIPE_SECRET_KEY_TEST && raw?.secret_key_test) merged.STRIPE_SECRET_KEY_TEST = raw.secret_key_test;
    if (!merged.enabled_environment && raw?.enabled_environment) merged.enabled_environment = raw.enabled_environment;
    return merged;
  };

  const migrateKanda = (raw: any): KandaSettings => {
    const merged: KandaSettings = {
      ...defaultKanda,
      ...(raw || {}),
    };
    // Backward compat mapping from previous lower-case keys
    if (!merged.KANDA_ENTERPRISE_ID && raw?.enterprise_id) merged.KANDA_ENTERPRISE_ID = raw.enterprise_id;
    if (!merged.KANDA_PROD && raw?.prod) merged.KANDA_PROD = raw.prod;
    return merged;
  };

  const loadPaymentsData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('UserProfiles')
        .select('stripe_settings, kanda_settings')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile payments:', profileError);
      } else if (profile) {
        // Check if we have encrypted data
        if (profile.stripe_settings && Object.keys(profile.stripe_settings).length > 0) {
          // Decrypt the settings using server-side API
          const response = await fetch('/api/partner/decrypt-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stripe_settings: profile.stripe_settings,
              kanda_settings: profile.kanda_settings,
            }),
          });

          if (response.ok) {
            const { stripe_settings, kanda_settings } = await response.json();
            const stripe = migrateStripe(stripe_settings || {});
            const kanda = migrateKanda(kanda_settings || {});
            setStripeSettings(stripe);
            setKandaSettings(kanda);
          } else {
            console.error('Failed to decrypt settings, using empty defaults');
            setStripeSettings(defaultStripe);
            setKandaSettings(defaultKanda);
          }
        } else {
          // No encrypted data, use defaults
          setStripeSettings(defaultStripe);
          setKandaSettings(defaultKanda);
        }
      }
    } catch (error) {
      console.error('Unexpected error loading payments data:', error);
      // Fallback to defaults on error
      setStripeSettings(defaultStripe);
      setKandaSettings(defaultKanda);
    } finally {
      setLoading(false);
    }
  };

  const savePaymentsData = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Encrypt the settings using server-side API
      const response = await fetch('/api/partner/encrypt-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripe_settings: stripeSettings,
          kanda_settings: kandaSettings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Encryption API error:', errorData);
        throw new Error('Failed to encrypt settings');
      }

      const { encrypted_stripe, encrypted_kanda } = await response.json();

      const { error } = await supabase
        .from('UserProfiles')
        .update({
          stripe_settings: encrypted_stripe,
          kanda_settings: encrypted_kanda,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving payments data:', error);
        throw error;
      }

      toast.success('Payment settings saved successfully!');
    } catch (error) {
      console.error('Unexpected error saving payments data:', error);
      toast.error('Failed to save payment settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading payment settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stripe Payment Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Stripe Payment Settings</h3>
            <p className="text-sm text-gray-500">Configure your Stripe payment gateway for processing customer payments</p>
          </div>
        </div>
        <div className="p-6">
          {/* Environment Toggle */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Environment:</span>
              <div className="flex bg-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setStripeSettings({ ...stripeSettings, enabled_environment: 'live' })}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    stripeSettings.enabled_environment === 'live'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Live
                </button>
                <button
                  onClick={() => setStripeSettings({ ...stripeSettings, enabled_environment: 'test' })}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    stripeSettings.enabled_environment === 'test'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Test
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Choose between live (production) or test environment for your Stripe keys.
            </p>
          </div>

          {/* Stripe Keys */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {stripeSettings.enabled_environment === 'live' ? 'Publishable Key (Live)' : 'Publishable Key (Test)'}
              </label>
              <input
                type="text"
                value={stripeSettings.enabled_environment === 'live' ? stripeSettings.STRIPE_PUBLISHABLE_KEY_LIVE : stripeSettings.STRIPE_PUBLISHABLE_KEY_TEST}
                onChange={(e) => {
                  if (stripeSettings.enabled_environment === 'live') {
                    setStripeSettings({ ...stripeSettings, STRIPE_PUBLISHABLE_KEY_LIVE: e.target.value });
                  } else {
                    setStripeSettings({ ...stripeSettings, STRIPE_PUBLISHABLE_KEY_TEST: e.target.value });
                  }
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={stripeSettings.enabled_environment === 'live' ? 'pk_live_...' : 'pk_test_...'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Stripe publishable key. Safe to use in client-side code.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {stripeSettings.enabled_environment === 'live' ? 'Secret Key (Live)' : 'Secret Key (Test)'}
              </label>
              <input
                type="password"
                value={stripeSettings.enabled_environment === 'live' ? stripeSettings.STRIPE_SECRET_KEY_LIVE : stripeSettings.STRIPE_SECRET_KEY_TEST}
                onChange={(e) => {
                  if (stripeSettings.enabled_environment === 'live') {
                    setStripeSettings({ ...stripeSettings, STRIPE_SECRET_KEY_LIVE: e.target.value });
                  } else {
                    setStripeSettings({ ...stripeSettings, STRIPE_SECRET_KEY_TEST: e.target.value });
                  }
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={stripeSettings.enabled_environment === 'live' ? 'sk_live_...' : 'sk_test_...'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Stripe secret key. Keep this secure and never share it.
              </p>
            </div>
          </div>

          {/* Stripe Info */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">Stripe Integration</h4>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Configure your Stripe API keys to enable payment processing for your customers.</p>
                  <p className="mt-1">Test keys are safe to use for development. Live keys will process real payments.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanda Finance Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Kanda Finance Settings</h3>
            <p className="text-sm text-gray-500">Configure Kanda Finance for customer financing options</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enterprise ID
              </label>
              <input
                type="text"
                value={kandaSettings.KANDA_ENTERPRISE_ID}
                onChange={(e) => setKandaSettings({ ...kandaSettings, KANDA_ENTERPRISE_ID: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="1234567890123456"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Kanda Finance enterprise identifier.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Production Environment
              </label>
              <input
                type="text"
                value={kandaSettings.KANDA_PROD}
                onChange={(e) => setKandaSettings({ ...kandaSettings, KANDA_PROD: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="prod"
              />
              <p className="text-xs text-gray-500 mt-1">
                Environment identifier for Kanda Finance.
              </p>
            </div>
          </div>

          {/* Kanda Info */}
          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-purple-800">Kanda Finance Integration</h4>
                <div className="mt-2 text-sm text-purple-700">
                  <p>Configure your Kanda Finance credentials to offer financing options to your customers.</p>
                  <p className="mt-1">This enables customers to finance their purchases through Kanda's financing solutions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={savePaymentsData}
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
              Save Payment Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
