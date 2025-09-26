'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Building2, Palette, FileText, Upload, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyInfo {
  company_name: string;
  contact_person: string;
  phone: string | null;
  website_url: string | null;
  address: string | null;
  postcode: string;
  business_description: string | null;
}

interface BrandingData {
  company_info: CompanyInfo;
  logo_url: string | null;
  privacy_policy: string | null;
  terms_conditions: string | null;
  company_color: string;
  header_code: string;
  body_code: string;
  footer_code: string;
}

export default function BrandingComponent() {
  const [data, setData] = useState<BrandingData>({
    company_info: {
      company_name: '',
      contact_person: '',
      phone: null,
      website_url: null,
      address: null,
      postcode: '',
      business_description: null,
    },
    logo_url: null,
    privacy_policy: null,
    terms_conditions: null,
    company_color: '#3B82F6',
    header_code: '',
    body_code: '',
    footer_code: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadBrandingData();
  }, []);

  const loadBrandingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile data
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('company_name, contact_person, phone, website_url, address, postcode, business_description, logo_url, privacy_policy, terms_conditions, company_color, header_code, body_code, footer_code')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setData({
          company_info: {
            company_name: profile.company_name || '',
            contact_person: profile.contact_person || '',
            phone: profile.phone,
            website_url: profile.website_url,
            address: profile.address,
            postcode: profile.postcode || '',
            business_description: profile.business_description,
          },
          logo_url: profile.logo_url,
          privacy_policy: profile.privacy_policy,
          terms_conditions: profile.terms_conditions,
          company_color: profile.company_color || '#3B82F6',
          header_code: profile.header_code || '',
          body_code: profile.body_code || '',
          footer_code: profile.footer_code || '',
        });
        setLogoPreview(profile.logo_url);
      }
    } catch (error) {
      console.error('Error loading branding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveBrandingData = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('UserProfiles')
        .update({
          company_name: data.company_info.company_name,
          contact_person: data.company_info.contact_person,
          phone: data.company_info.phone,
          website_url: data.company_info.website_url,
          address: data.company_info.address,
          postcode: data.company_info.postcode,
          business_description: data.company_info.business_description,
          logo_url: data.logo_url,
          privacy_policy: data.privacy_policy,
          terms_conditions: data.terms_conditions,
          company_color: data.company_color,
          header_code: data.header_code,
          body_code: data.body_code,
          footer_code: data.footer_code,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Branding settings saved successfully!');
    } catch (error) {
      console.error('Error saving branding data:', error);
      toast.error('Failed to save branding settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateCompanyInfo = (field: keyof CompanyInfo, value: string) => {
    setData(prev => ({
      ...prev,
      company_info: {
        ...prev.company_info,
        [field]: value
      }
    }));
  };

  const updateLogoUrl = (url: string) => {
    setData(prev => ({ ...prev, logo_url: url }));
    setLogoPreview(url);
  };

  const updateLegalDoc = (field: 'privacy_policy' | 'terms_conditions', value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateCode = (field: 'header_code' | 'body_code' | 'footer_code', value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading branding settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Company Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
              <p className="text-sm text-gray-500">Basic company details and contact information</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={data.company_info.company_name}
                onChange={(e) => updateCompanyInfo('company_name', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person *
              </label>
              <input
                type="text"
                value={data.company_info.contact_person}
                onChange={(e) => updateCompanyInfo('contact_person', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={data.company_info.phone || ''}
                onChange={(e) => updateCompanyInfo('phone', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+44 123 456 7890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={data.company_info.website_url || ''}
                onChange={(e) => updateCompanyInfo('website_url', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://yourcompany.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={data.company_info.address || ''}
                onChange={(e) => updateCompanyInfo('address', e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 Business Street, City, County"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postcode *
              </label>
              <input
                type="text"
                value={data.company_info.postcode}
                onChange={(e) => updateCompanyInfo('postcode', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="SW1A 1AA"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Description
              </label>
              <textarea
                value={data.company_info.business_description || ''}
                onChange={(e) => updateCompanyInfo('business_description', e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of your business and services..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Company Logo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Company Logo</h3>
              <p className="text-sm text-gray-500">Upload your company logo for branding</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={data.logo_url || ''}
                onChange={(e) => updateLogoUrl(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-2 text-sm text-gray-500">
                Supported formats: PNG, JPG, SVG. Recommended size: 200x200px or larger.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo Preview
              </label>
              <div className="flex items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onError={() => setLogoPreview(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <span className="text-sm mt-1">No logo uploaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Documents */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Legal Documents</h3>
              <p className="text-sm text-gray-500">Links to your privacy policy and terms & conditions</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Privacy Policy URL
            </label>
            <input
              type="url"
              value={data.privacy_policy || ''}
              onChange={(e) => updateLegalDoc('privacy_policy', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://yourcompany.com/privacy-policy"
            />
            <p className="mt-2 text-sm text-gray-500">
              Link to your privacy policy page that explains how you collect, use, and protect user data.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions URL
            </label>
            <input
              type="url"
              value={data.terms_conditions || ''}
              onChange={(e) => updateLegalDoc('terms_conditions', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://yourcompany.com/terms-conditions"
            />
            <p className="mt-2 text-sm text-gray-500">
              Link to your terms & conditions page that includes your service terms and legal agreements.
            </p>
          </div>
        </div>
      </div>

      {/* Company Brand Color */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Company Brand Color</h3>
              <p className="text-sm text-gray-500">Choose your brand color for customer-facing interfaces</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={data.company_color}
                  onChange={(e) => setData(prev => ({ ...prev, company_color: e.target.value }))}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={data.company_color}
                  onChange={(e) => setData(prev => ({ ...prev, company_color: e.target.value }))}
                  className="block w-24 px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Preview:</span>
              <div 
                className="w-8 h-8 rounded border-2 border-gray-200"
                style={{ backgroundColor: data.company_color }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Code Sections */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Custom Code</h3>
              <p className="text-sm text-gray-500">Add custom HTML, CSS, or JavaScript to your customer-facing pages</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Header Code
            </label>
            <textarea
              value={data.header_code}
              onChange={(e) => updateCode('header_code', e.target.value)}
              rows={4}
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="<!-- Add your header code here -->&#10;&lt;script&gt;&#10;  // Your JavaScript code&#10;&lt;/script&gt;"
            />
            <p className="mt-2 text-sm text-gray-500">
              This code will be added to the &lt;head&gt; section of all your customer-facing pages.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body Code
            </label>
            <textarea
              value={data.body_code}
              onChange={(e) => updateCode('body_code', e.target.value)}
              rows={4}
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="<!-- Add your body code here -->&#10;&lt;div&gt;&#10;  &lt;!-- Your HTML content --&gt;&#10;&lt;/div&gt;"
            />
            <p className="mt-2 text-sm text-gray-500">
              This code will be added in the &lt;body&gt; section of all your customer-facing pages.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Footer Code
            </label>
            <textarea
              value={data.footer_code}
              onChange={(e) => updateCode('footer_code', e.target.value)}
              rows={4}
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="<!-- Add your footer code here -->&#10;&lt;script&gt;&#10;  // Your JavaScript code&#10;&lt;/script&gt;"
            />
            <p className="mt-2 text-sm text-gray-500">
              This code will be added just before the closing &lt;/body&gt; tag of all your customer-facing pages.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveBrandingData}
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
              Save Branding Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
