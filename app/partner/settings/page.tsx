"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Settings, DollarSign, Shield, List, HelpCircle } from 'lucide-react';

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
  otp_enabled: boolean;
  included_items: string[];
  faqs: {
    question: string;
    answer: string;
  }[];
}

interface APREntry {
  months: number;
  apr: number;
}

export default function PartnerSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [settings, setSettings] = useState<PartnerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [aprEntries, setAprEntries] = useState<APREntry[]>([{ months: 12, apr: 0 }]);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [companyColor, setCompanyColor] = useState('#3B82F6');
  const [includedItems, setIncludedItems] = useState<string[]>(['']);
  const [faqs, setFaqs] = useState<{question: string; answer: string}[]>([{ question: '', answer: '' }]);

  const supabase = createClient();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadSettings();
    } else if (categories.length === 0 && !loading) {
      setLoading(false);
    }
  }, [selectedCategory, categories.length]);

  const loadCategories = async () => {
    console.log('Loading categories...');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('User:', user, 'Error:', userError);
      
      if (!user) {
        console.log('No user found');
        setLoading(false);
        return;
      }

      const { data: categoryAccess, error: categoryError } = await supabase
        .from('UserCategoryAccess')
        .select('*, ServiceCategories(service_category_id, name)')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      console.log('Category access:', categoryAccess, 'Error:', categoryError);

      const categories = categoryAccess?.map((access: any) => ({
        service_category_id: access.ServiceCategories.service_category_id,
        name: access.ServiceCategories.name
      })) || [];

      console.log('Processed categories:', categories);
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
    console.log('Loading settings for category:', selectedCategory);
    setLoading(true);
    try {
      const response = await fetch(`/api/partner-settings?service_category_id=${selectedCategory}`);
      console.log('Settings API response status:', response.status);
      
      const result = await response.json();
      console.log('Settings API result:', result);
      
      if (result.data) {
        setSettings(result.data);
        
        // Convert apr_settings object to array
        const aprArray = Object.entries(result.data.apr_settings || {}).map(([months, apr]) => ({
          months: parseInt(months),
          apr: parseFloat(apr as string)
        }));
        setAprEntries(aprArray.length > 0 ? aprArray : [{ months: 12, apr: 0 }]);
        
        setOtpEnabled(result.data.otp_enabled || false);
        setCompanyColor(result.data.company_color || '#3B82F6');
        setIncludedItems(result.data.included_items?.length > 0 ? result.data.included_items : ['']);
        setFaqs(result.data.faqs?.length > 0 ? result.data.faqs : [{ question: '', answer: '' }]);
      } else {
        // No settings exist, use defaults
        console.log('No settings found, using defaults');
        setSettings(null);
        setAprEntries([{ months: 12, apr: 0 }]);
        setOtpEnabled(false);
        setCompanyColor('#3B82F6');
        setIncludedItems(['']);
        setFaqs([{ question: '', answer: '' }]);
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
      // Convert APR entries array to object
      const aprSettings = aprEntries.reduce((acc, entry) => {
        if (entry.months > 0) {
          acc[entry.months] = entry.apr;
        }
        return acc;
      }, {} as {[key: number]: number});

      const payload = {
        service_category_id: selectedCategory,
        apr_settings: aprSettings,
        otp_enabled: otpEnabled,
        company_color: companyColor,
        included_items: includedItems.filter(item => item.trim() !== ''),
        faqs: faqs.filter(faq => faq.question.trim() !== '' || faq.answer.trim() !== '')
      };

      const response = await fetch('/api/partner-settings', {
        method: settings ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.data);
      } else {
        const error = await response.json();
        console.error('Error saving settings:', error);
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Partner Settings
        </h1>
        <p className="text-gray-600 mt-2">Configure your settings for each service category</p>
      </div>

      {/* Category Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Service Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.service_category_id} value={category.service_category_id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

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
                <Settings className="inline h-4 w-4 mr-1" />
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
                <List className="inline h-4 w-4 mr-1" />
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
                <HelpCircle className="inline h-4 w-4 mr-1" />
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

                {/* OTP Setting */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={otpEnabled}
                      onChange={(e) => setOtpEnabled(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    />
                    <div className="ml-3">
                      <label className="text-sm font-medium text-gray-700">
                        Enable OTP Verification
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Require customers to verify their phone number via SMS before submitting quotes
                      </p>
                    </div>
                  </div>
                </div>

                {/* Company Color Setting */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-start">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Brand Color
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Choose a color that represents your brand. This will be used in customer-facing interfaces.
                      </p>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={companyColor}
                            onChange={(e) => setCompanyColor(e.target.value)}
                            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={companyColor}
                            onChange={(e) => setCompanyColor(e.target.value)}
                            placeholder="#3B82F6"
                            className="block w-24 px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>Preview:</span>
                          <div 
                            className="w-8 h-8 rounded border-2 border-gray-200"
                            style={{ backgroundColor: companyColor }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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