'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Save, Globe, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceCategory {
  service_category_id: string;
  name: string;
  slug: string;
}

interface MainPageUrlManagerProps {
  categories: ServiceCategory[];
  userId: string;
}

interface PartnerSetting {
  setting_id: string;
  service_category_id: string;
  main_page_url: string | null;
}

export default function MainPageUrlManager({ categories, userId }: MainPageUrlManagerProps) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const { data: partnerSettings } = await supabase
        .from('PartnerSettings')
        .select('service_category_id, main_page_url')
        .eq('partner_id', userId);

      const settingsMap: Record<string, string> = {};
      partnerSettings?.forEach(setting => {
        settingsMap[setting.service_category_id] = setting.main_page_url || '';
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveMainPageUrl = async (categoryId: string, url: string) => {
    setSaving(categoryId);
    try {
      const { error } = await supabase
        .from('PartnerSettings')
        .upsert({
          partner_id: userId,
          service_category_id: categoryId,
          main_page_url: url || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'partner_id,service_category_id'
        });

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        [categoryId]: url
      }));

      toast.success('Main page URL saved successfully');
    } catch (error) {
      console.error('Error saving main page URL:', error);
      toast.error('Failed to save main page URL');
    } finally {
      setSaving(null);
    }
  };

  const handleUrlChange = (categoryId: string, url: string) => {
    setSettings(prev => ({
      ...prev,
      [categoryId]: url
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Globe className="h-5 w-5 mr-2 text-blue-500" />
          Main Page URLs
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Set the main page URL where your quote forms are embedded. This URL will be used in email links to redirect users back to your website.
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.service_category_id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{category.name}</h4>
                <p className="text-sm text-gray-500">Slug: {category.slug}</p>
              </div>
              <div className="flex items-center space-x-2">
                {settings[category.service_category_id] && (
                  <a
                    href={settings[category.service_category_id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Test
                  </a>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <input
                type="url"
                value={settings[category.service_category_id] || ''}
                onChange={(e) => handleUrlChange(category.service_category_id, e.target.value)}
                placeholder="https://yourwebsite.com/quote-form"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => saveMainPageUrl(category.service_category_id, settings[category.service_category_id] || '')}
                disabled={saving === category.service_category_id}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving === category.service_category_id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </>
                )}
              </button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              <p>Example: https://yourwebsite.com/boiler-quote or https://yourwebsite.com/heating-services</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• When users click email links, they'll be redirected to this URL instead of staying in the iframe</li>
          <li>• The system will detect if the email was sent from an iframe or main domain</li>
          <li>• If from iframe, users will be redirected to your main page URL</li>
          <li>• If from main domain, users will stay on the current domain</li>
        </ul>
      </div>
    </div>
  );
}
