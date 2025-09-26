"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Settings, List, HelpCircle, Mail, Phone } from 'lucide-react';
import { SettingsLoader } from '@/components/category-commons/Loader';

interface ServiceCategory {
  service_category_id: string;
  name: string;
}

interface PartnerSettings {
  setting_id?: string;
  partner_id: string;
  service_category_id: string;
  apr_settings: {
    [key: number]: number; // month -> apr percentage
  };
  included_items: string[];
  faqs: {
    question: string;
    answer: string;
  }[];
  company_color?: string;
  otp_enabled?: boolean;
  is_stripe_enabled?: boolean;
  is_kanda_enabled?: boolean;
  is_monthly_payment_enabled?: boolean;
  is_pay_after_installation_enabled?: boolean;
  admin_email?: string;
  gtm_event_name?: string;
  main_page_url?: string;
  ghl_calendar_id?: string;
  ghl_calendar_enabled?: boolean;
  calendar_settings?: {
    survey_booking?: {
      enabled: boolean;
      calendar_id?: string;
      calendar_name?: string;
    };
    appointments?: {
      enabled: boolean;
      calendar_id?: string;
      calendar_name?: string;
    };
    consultations?: {
      enabled: boolean;
      calendar_id?: string;
      calendar_name?: string;
    };
  };
}

interface APREntry {
  months: number;
  apr: number;
}

interface GHLCalendar {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  isActive: boolean;
}

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

export default function PartnerSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [settings, setSettings] = useState<PartnerSettings | null>(null);
  const [loading, setLoading] = useState(true); // category loading
  const [saving, setSaving] = useState(false);

  // Global account states
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>(defaultSmtp);
  const [twilioSettings, setTwilioSettings] = useState<TwilioSettings>(defaultTwilio);
  const [stripeSettings, setStripeSettings] = useState<StripeSettings>(defaultStripe);
  const [kandaSettings, setKandaSettings] = useState<KandaSettings>(defaultKanda);
  const [companyColor, setCompanyColor] = useState('#3B82F6');
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [headerCode, setHeaderCode] = useState('');
  const [bodyCode, setBodyCode] = useState('');
  const [footerCode, setFooterCode] = useState('');
  
  // Category form states
  const [aprEntries, setAprEntries] = useState<APREntry[]>([{ months: 12, apr: 0 }]);
  const [includedItems, setIncludedItems] = useState<string[]>(['']);
  const [faqs, setFaqs] = useState<{question: string; answer: string}[]>([{ question: '', answer: '' }]);
  
  // Payment settings states
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);
  const [isKandaEnabled, setIsKandaEnabled] = useState(false);
  const [isMonthlyPaymentEnabled, setIsMonthlyPaymentEnabled] = useState(false);
  const [isPayAfterInstallationEnabled, setIsPayAfterInstallationEnabled] = useState(false);
  
  // Admin email state
  const [adminEmail, setAdminEmail] = useState('');
  
  // GTM event name state
  const [gtmEventName, setGtmEventName] = useState('');
  
  // GHL Calendar states
  const [ghlCalendars, setGhlCalendars] = useState<GHLCalendar[]>([]);
  const [loadingGhlCalendars, setLoadingGhlCalendars] = useState(false);
  
  // Calendar settings for different purposes
  const [calendarSettings, setCalendarSettings] = useState({
    survey_booking: { enabled: false, calendar_id: '', calendar_name: '' },
    appointments: { enabled: false, calendar_id: '', calendar_name: '' },
    consultations: { enabled: false, calendar_id: '', calendar_name: '' }
  });

  // Main page URL state
  const [mainPageUrl, setMainPageUrl] = useState('');

  // GHL integration states
  const [ghlIntegration, setGhlIntegration] = useState<any>(null);
  const [ghlLoading, setGhlLoading] = useState(false);
  const [ghlConnecting, setGhlConnecting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Load both categories and global integrations
    loadCategories();
    loadIntegrations();
    
    // Handle URL parameters for GHL OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const ghlSuccess = urlParams.get('ghl_success');
    const ghlError = urlParams.get('ghl_error');
    
    if (ghlSuccess === 'true') {
      // Reload GHL integration status
      loadGHLIntegration();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (ghlError) {
      console.error('GHL OAuth error:', ghlError);
      // Show error message to user
      alert(`GHL OAuth Error: ${decodeURIComponent(ghlError)}`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadSettings();
    } else if (categories.length === 0 && !loading) {
      setLoading(false);
    }
  }, [selectedCategory, categories.length]);

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

  const loadIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) console.error('Auth error (integrations):', userError);
      if (!user) {
        setLoadingIntegrations(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('UserProfiles')
        .select('smtp_settings, twilio_settings, stripe_settings, kanda_settings, company_color, otp, header_code, body_code, footer_code')
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
              stripe_settings: profile.stripe_settings,
              kanda_settings: profile.kanda_settings,
            }),
          });

          if (response.ok) {
            const { smtp_settings, twilio_settings, stripe_settings, kanda_settings } = await response.json();
            const smtp = migrateSmtp(smtp_settings || {});
            const twilio = migrateTwilio(twilio_settings || {});
            const stripe = migrateStripe(stripe_settings || {});
            const kanda = migrateKanda(kanda_settings || {});
            setSmtpSettings(smtp);
            setTwilioSettings(twilio);
            setStripeSettings(stripe);
            setKandaSettings(kanda);
          } else {
            console.error('Failed to decrypt settings, using empty defaults');
            setSmtpSettings(defaultSmtp);
            setTwilioSettings(defaultTwilio);
            setStripeSettings(defaultStripe);
            setKandaSettings(defaultKanda);
          }
        } else {
          // No encrypted data, use defaults
          setSmtpSettings(defaultSmtp);
          setTwilioSettings(defaultTwilio);
          setStripeSettings(defaultStripe);
          setKandaSettings(defaultKanda);
        }
        
        setCompanyColor(profile.company_color || '#3B82F6');
        setOtpEnabled(Boolean(profile.otp));
        setHeaderCode(profile.header_code || '');
        setBodyCode(profile.body_code || '');
        setFooterCode(profile.footer_code || '');
      }

      // Load GHL integration
      await loadGHLIntegration();
    } catch (error) {
      console.error('Unexpected error loading integrations:', error);
      // Fallback to defaults on error
      setSmtpSettings(defaultSmtp);
      setTwilioSettings(defaultTwilio);
      setStripeSettings(defaultStripe);
      setKandaSettings(defaultKanda);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const saveIntegrations = async () => {
    setSavingIntegrations(true);
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
          stripe_settings: stripeSettings,
          kanda_settings: kandaSettings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Encryption API error:', errorData);
        throw new Error('Failed to encrypt settings');
      }

      const { encrypted_smtp, encrypted_twilio, encrypted_stripe, encrypted_kanda } = await response.json();

      const { error } = await supabase
        .from('UserProfiles')
        .update({
          smtp_settings: encrypted_smtp,
          twilio_settings: encrypted_twilio,
          stripe_settings: encrypted_stripe,
          kanda_settings: encrypted_kanda,
          company_color: companyColor,
          otp: otpEnabled,
          header_code: headerCode,
          body_code: bodyCode,
          footer_code: footerCode,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving integrations:', error);
        throw error;
      }
    } catch (error) {
      console.error('Unexpected error saving integrations:', error);
      // You might want to show a user-friendly error message here
    } finally {
      setSavingIntegrations(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: categoryAccess } = await supabase
        .from('UserCategoryAccess')
        .select('*, ServiceCategories(service_category_id, name)')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      const categories = categoryAccess?.map((access: any) => ({
        service_category_id: access.ServiceCategories.service_category_id,
        name: access.ServiceCategories.name
      })) || [];

      setCategories(categories);
      
      if (categories.length > 0 && !selectedCategory) {
        setSelectedCategory(categories[0].service_category_id);
      } else if (categories.length === 0) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/partner-settings?service_category_id=${selectedCategory}`);
      const result = await response.json();
      
      if (result.data) {
        setSettings(result.data);
        
        // Convert apr_settings object to array
        const aprArray = Object.entries(result.data.apr_settings || {}).map(([months, apr]: [string, any]) => ({
          months: parseInt(months),
          apr: parseFloat(apr as string)
        }));
        setAprEntries(aprArray.length > 0 ? aprArray : [{ months: 12, apr: 0 }]);
        
        setIncludedItems(result.data.included_items?.length > 0 ? result.data.included_items : ['']);
        setFaqs(result.data.faqs?.length > 0 ? result.data.faqs : [{ question: '', answer: '' }]);
        
        setIsStripeEnabled(Boolean(result.data.is_stripe_enabled));
        setIsKandaEnabled(Boolean(result.data.is_kanda_enabled));
        setIsMonthlyPaymentEnabled(Boolean(result.data.is_monthly_payment_enabled));
        setIsPayAfterInstallationEnabled(Boolean(result.data.is_pay_after_installation_enabled));
        setAdminEmail(result.data.admin_email || '');
        setGtmEventName(result.data.gtm_event_name || '');
        setMainPageUrl(result.data.main_page_url || '');
        
        // Load calendar settings
        if (result.data.calendar_settings) {
          setCalendarSettings({
            survey_booking: result.data.calendar_settings.survey_booking || { enabled: false, calendar_id: '', calendar_name: '' },
            appointments: result.data.calendar_settings.appointments || { enabled: false, calendar_id: '', calendar_name: '' },
            consultations: result.data.calendar_settings.consultations || { enabled: false, calendar_id: '', calendar_name: '' }
          });
        }
        
        console.log('Frontend: Loaded Calendar settings:', {
          calendar_settings: result.data.calendar_settings
        });
      } else {
        setSettings(null);
        setAprEntries([{ months: 12, apr: 0 }]);
        setIncludedItems(['']);
        setFaqs([{ question: '', answer: '' }]);
        setAdminEmail('');
        setGtmEventName('');
        setMainPageUrl('');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!selectedCategory) return;
    
    setSaving(true);
    try {
      const aprSettings = aprEntries.reduce((acc, entry) => {
        acc[entry.months] = entry.apr;
        return acc;
      }, {} as Record<number, number>);

      const settingsData = {
        service_category_id: selectedCategory,
        apr_settings: aprSettings,
        included_items: includedItems.filter(item => item.trim() !== ''),
        faqs: faqs.filter(faq => faq.question.trim() !== '' && faq.answer.trim() !== ''),
        is_stripe_enabled: isStripeEnabled,
        is_kanda_enabled: isKandaEnabled,
        is_monthly_payment_enabled: isMonthlyPaymentEnabled,
        is_pay_after_installation_enabled: isPayAfterInstallationEnabled,
        admin_email: adminEmail.trim() || null,
        gtm_event_name: gtmEventName.trim() || null,
        main_page_url: mainPageUrl.trim() || null,
        calendar_settings: calendarSettings,
      };

      console.log('Frontend: Sending settings data:', JSON.stringify(settingsData, null, 2));
      console.log('Frontend: Calendar settings state:', JSON.stringify(calendarSettings, null, 2));

      // Use PUT if settings exist, POST if creating new
      const method = settings ? 'PUT' : 'POST';
      
      const response = await fetch('/api/partner-settings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Save settings error:', errorData);
        throw new Error(errorData.error || 'Failed to save settings');
      }

      // Reload settings to show the updated data
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const addAprEntry = () => {
    setAprEntries([...aprEntries, { months: 12, apr: 0 }]);
  };

  const removeAprEntry = (index: number) => {
    if (aprEntries.length > 1) {
      setAprEntries(aprEntries.filter((_, i) => i !== index));
    }
  };

  const updateAprEntry = (index: number, field: 'months' | 'apr', value: number) => {
    const updated = [...aprEntries];
    updated[index][field] = value;
    setAprEntries(updated);
  };

  const addIncludedItem = () => {
    setIncludedItems([...includedItems, '']);
  };

  const removeIncludedItem = (index: number) => {
    if (includedItems.length > 1) {
      setIncludedItems(includedItems.filter((_, i) => i !== index));
    }
  };

  const updateIncludedItem = (index: number, value: string) => {
    const updated = [...includedItems];
    updated[index] = value;
    setIncludedItems(updated);
  };

  const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
  };

  const removeFaq = (index: number) => {
    if (faqs.length > 1) {
      setFaqs(faqs.filter((_, i) => i !== index));
    }
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  // GHL Integration Functions
  const loadGHLIntegration = async () => {
    setGhlLoading(true);
    try {
      const { getGHLIntegration } = await import('@/lib/ghl-api-client');
      const integration = await getGHLIntegration();
      
      if (integration) {
        setGhlIntegration(integration);
        // Load calendars when GHL integration is available
        await loadGHLCalendars();
      }
    } catch (error) {
      console.error('Unexpected error loading GHL integration:', error);
    } finally {
      setGhlLoading(false);
    }
  };

  const loadGHLCalendars = async () => {
    setLoadingGhlCalendars(true);
    try {
      console.log('🔄 Fetching GHL calendars...');
      const response = await fetch('/api/ghl/calendars');
      console.log('📡 GHL calendars response status:', response.status);
      
      if (response.ok) {
        const calendars = await response.json();
        console.log('📅 GHL calendars received:', calendars);
        setGhlCalendars(calendars || []);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load GHL calendars:', response.status, errorText);
        setGhlCalendars([]);
      }
    } catch (error) {
      console.error('❌ Error loading GHL calendars:', error);
      setGhlCalendars([]);
    } finally {
      setLoadingGhlCalendars(false);
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
      alert(`Error connecting to GHL: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      } else {
        setGhlIntegration(null);
      }
    } catch (error) {
      console.error('Unexpected error disconnecting GHL:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SettingsLoader />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configure Service Settings
        </h1>
        <p className="text-gray-600 mt-2">Configure service settings for your offerings.</p>
      </div>

      {/* Category Selection Tabs */}
      {categories.length > 0 && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex overflow-x-auto pb-px" aria-label="Tabs">
            {categories.map((category) => (
              <button
                key={category.service_category_id}
                onClick={() => setSelectedCategory(category.service_category_id)}
                className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
                  selectedCategory === category.service_category_id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      {selectedCategory && (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                General Settings
              </button>
              <button
                onClick={() => setActiveTab('included')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'included'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                What's Included
              </button>
              <button
                onClick={() => setActiveTab('faqs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'faqs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                FAQs
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
                
                {/* APR Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    APR Settings
                  </label>
                  <div className="space-y-4">
                    {aprEntries.map((entry, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                              Finance Duration (Months)
                            </label>
                            <input
                              type="number"
                              placeholder="e.g., 12, 24, 36"
                              value={entry.months}
                              onChange={(e) => updateAprEntry(index, 'months', parseInt(e.target.value) || 0)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Number of months for financing</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                              Annual Percentage Rate (%)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="e.g., 8.5, 12.0"
                                value={entry.apr}
                                onChange={(e) => updateAprEntry(index, 'apr', parseFloat(e.target.value) || 0)}
                                className="block w-full px-3 py-2 pr-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm">
                                %
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Interest rate charged annually</p>
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => removeAprEntry(index)}
                            disabled={aprEntries.length === 1}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addAprEntry}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      + Add APR Option
                    </button>
                  </div>
                </div>

                {/* Payment Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Settings
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={isStripeEnabled}
                        onChange={(e) => setIsStripeEnabled(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                      <div className="ml-3">
                        <label className="text-sm font-medium text-gray-700">
                          Enable Stripe Payments
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Allow customers to pay via Stripe for this service category
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={isKandaEnabled}
                        onChange={(e) => setIsKandaEnabled(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                      <div className="ml-3">
                        <label className="text-sm font-medium text-gray-700">
                          Enable Kanda Finance
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Allow customers to finance their purchase through Kanda for this service category
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={isMonthlyPaymentEnabled}
                        onChange={(e) => setIsMonthlyPaymentEnabled(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                      <div className="ml-3">
                        <label className="text-sm font-medium text-gray-700">
                          Enable Monthly Payment Plans
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Allow customers to pay in monthly installments for this service category
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={isPayAfterInstallationEnabled}
                        onChange={(e) => setIsPayAfterInstallationEnabled(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                      <div className="ml-3">
                        <label className="text-sm font-medium text-gray-700">
                          Enable Pay After Installation
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Allow customers to pay after the service is completed for this service category
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Email Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Admin Email Settings
                  </label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        Admin Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="admin@yourcompany.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email address to receive admin notifications for this service category. Leave empty to use the global admin email from your profile.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        GTM Event Name
                      </label>
                      <input
                        type="text"
                        placeholder="quote_submission"
                        value={gtmEventName}
                        onChange={(e) => setGtmEventName(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Google Tag Manager event name to trigger on quote submission for this service category. This will be used with your GTM code in the header/body/footer sections.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        Main Page URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://yourcompany.com"
                        value={mainPageUrl}
                        onChange={(e) => setMainPageUrl(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        The main website URL for this service category. This will be used for redirects and linking back to your main site.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Calendar Settings */}
                {ghlIntegration && (
                  <div className="bg-gray-50 rounded-lg border p-4 mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">📅</span>
                      </div>
                      <h3 className="font-medium text-gray-900">Calendar Integration</h3>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Fetch Calendars Button */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Available Calendars</h4>
                          <p className="text-xs text-gray-500">Fetch your GoHighLevel calendars to configure integrations</p>
                        </div>
                        <button
                          type="button"
                          onClick={loadGHLCalendars}
                          disabled={loadingGhlCalendars}
                          className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded disabled:opacity-50"
                        >
                          {loadingGhlCalendars ? 'Loading...' : 'Fetch Calendars'}
                        </button>
                      </div>
                      
                      {loadingGhlCalendars && (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-sm text-gray-600">Loading calendars...</span>
                        </div>
                      )}
                      
                      {ghlCalendars.length > 0 && (
                        <div className="space-y-4">
                          {/* Survey Booking Calendar */}
                          <div className="border rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">Survey Bookings</h4>
                                <p className="text-xs text-gray-500">Calendar for survey appointment bookings</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={calendarSettings.survey_booking.enabled}
                                onChange={(e) => setCalendarSettings(prev => ({
                                  ...prev,
                                  survey_booking: { ...prev.survey_booking, enabled: e.target.checked }
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </div>
                            
                            {calendarSettings.survey_booking.enabled && (
                              <select
                                value={calendarSettings.survey_booking.calendar_id}
                                onChange={(e) => {
                                  const selectedCalendar = ghlCalendars.find(c => c.id === e.target.value);
                                  setCalendarSettings(prev => ({
                                    ...prev,
                                    survey_booking: {
                                      ...prev.survey_booking,
                                      calendar_id: e.target.value,
                                      calendar_name: selectedCalendar?.name || ''
                                    }
                                  }));
                                }}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select a calendar</option>
                                {ghlCalendars.map((calendar) => (
                                  <option key={calendar.id} value={calendar.id}>
                                    {calendar.name} {calendar.timezone && `(${calendar.timezone})`}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          
                          {/* Appointments Calendar */}
                          <div className="border rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">Appointments</h4>
                                <p className="text-xs text-gray-500">Calendar for general appointments</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={calendarSettings.appointments.enabled}
                                onChange={(e) => setCalendarSettings(prev => ({
                                  ...prev,
                                  appointments: { ...prev.appointments, enabled: e.target.checked }
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </div>
                            
                            {calendarSettings.appointments.enabled && (
                              <select
                                value={calendarSettings.appointments.calendar_id}
                                onChange={(e) => {
                                  const selectedCalendar = ghlCalendars.find(c => c.id === e.target.value);
                                  setCalendarSettings(prev => ({
                                    ...prev,
                                    appointments: {
                                      ...prev.appointments,
                                      calendar_id: e.target.value,
                                      calendar_name: selectedCalendar?.name || ''
                                    }
                                  }));
                                }}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select a calendar</option>
                                {ghlCalendars.map((calendar) => (
                                  <option key={calendar.id} value={calendar.id}>
                                    {calendar.name} {calendar.timezone && `(${calendar.timezone})`}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          
                          {/* Consultations Calendar */}
                          <div className="border rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">Consultations</h4>
                                <p className="text-xs text-gray-500">Calendar for consultation bookings</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={calendarSettings.consultations.enabled}
                                onChange={(e) => setCalendarSettings(prev => ({
                                  ...prev,
                                  consultations: { ...prev.consultations, enabled: e.target.checked }
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </div>
                            
                            {calendarSettings.consultations.enabled && (
                              <select
                                value={calendarSettings.consultations.calendar_id}
                                onChange={(e) => {
                                  const selectedCalendar = ghlCalendars.find(c => c.id === e.target.value);
                                  setCalendarSettings(prev => ({
                                    ...prev,
                                    consultations: {
                                      ...prev.consultations,
                                      calendar_id: e.target.value,
                                      calendar_name: selectedCalendar?.name || ''
                                    }
                                  }));
                                }}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select a calendar</option>
                                {ghlCalendars.map((calendar) => (
                                  <option key={calendar.id} value={calendar.id}>
                                    {calendar.name} {calendar.timezone && `(${calendar.timezone})`}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {ghlCalendars.length === 0 && !loadingGhlCalendars && (
                        <div className="text-sm text-gray-500 py-4 text-center">
                          No calendars found. Click "Fetch Calendars" to load your GoHighLevel calendars.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'included' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">What's Included Items</h3>
                  <p className="text-sm text-gray-600 mt-1">Add items that are included in your service to display to customers</p>
                </div>
                
                <div className="space-y-3">
                  {includedItems.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="e.g., Free consultation, 12-month warranty, Installation included"
                            value={item}
                            onChange={(e) => updateIncludedItem(index, e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => removeIncludedItem(index)}
                          disabled={includedItems.length === 1}
                          className="px-2 py-1 text-sm text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={addIncludedItem}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  + Add Item
                </button>
              </div>
            )}

            {activeTab === 'faqs' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Frequently Asked Questions</h3>
                  <p className="text-sm text-gray-600 mt-1">Add common questions and answers to help customers understand your services</p>
                </div>
                
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          FAQ #{index + 1}
                        </span>
                        <button
                          onClick={() => removeFaq(index)}
                          disabled={faqs.length === 1}
                          className="text-red-600 hover:text-red-800 text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Question
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., How long does installation take?"
                            value={faq.question}
                            onChange={(e) => updateFaq(index, 'question', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Answer
                          </label>
                          <textarea
                            rows={3}
                            placeholder="e.g., Typical installation takes 1-2 days depending on the complexity of your home..."
                            value={faq.answer}
                            onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={addFaq}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  + Add FAQ
                </button>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md font-medium"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}