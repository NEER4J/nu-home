'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Copy, Check, Globe, ExternalLink, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceCategory {
  service_category_id: string;
  name: string;
  slug: string;
}

interface EmbedCode {
  category: ServiceCategory;
  subdomainUrl: string | null;
  customDomainUrl: string | null;
  iframeCode: string | null;
  customDomainIframeCode: string | null;
}

interface PartnerProfile {
  subdomain: string | null;
  custom_domain: string | null;
  company_name: string | null;
}

function generateEmbedCodes(categories: ServiceCategory[], profile: PartnerProfile): EmbedCode[] {
  const mainDomain = process.env.NEXT_PUBLIC_SITE_URL || 'aifortrades.co.uk';
  const protocol = 'https:';

  return categories.map(category => {
    let subdomainUrl = null;
    let customDomainUrl = null;
    let iframeCode = null;
    let customDomainIframeCode = null;

    // Generate subdomain URL and iframe code
    if (profile.subdomain) {
      subdomainUrl = `${protocol}//${profile.subdomain}.${mainDomain}/${category.slug}/quote`;
      iframeCode = `<iframe 
  id="quote-form-iframe-${category.slug}"
  src="${subdomainUrl}" 
  width="100%" 
  height="100vh" 
  frameborder="0" 
  style="border: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999;"
  title="Quote Form - ${category.name}">
</iframe>

<script>
// Configure iframe settings
window.currentIframe = document.getElementById('quote-form-iframe-${category.slug}');
window.currentCategorySlug = '${category.slug}';
</script>
<script src="https://www.aifortrades.co.uk/quote-script.js"></script>`;
    }

    // Generate custom domain URL and iframe code
    if (profile.custom_domain) {
      customDomainUrl = `${protocol}//${profile.custom_domain}/${category.slug}/quote`;
      customDomainIframeCode = `<iframe 
  id="quote-form-iframe-${category.slug}"
  src="${customDomainUrl}" 
  width="100%" 
  height="100vh" 
  frameborder="0" 
  style="border: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999;"
  title="Quote Form - ${category.name}">
</iframe>

<script>
// Configure iframe settings
window.currentIframe = document.getElementById('quote-form-iframe-${category.slug}');
window.currentCategorySlug = '${category.slug}';
</script>
<script src="https://www.aifortrades.co.uk/quote-script.js"></script>`;
    }

    return {
      category,
      subdomainUrl,
      customDomainUrl,
      iframeCode,
      customDomainIframeCode
    };
  });
}

export default function IntegrationComponent() {
  const [loading, setLoading] = useState(true);
  const [embedCodes, setEmbedCodes] = useState<EmbedCode[]>([]);
  const [mainPageUrls, setMainPageUrls] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadIntegrationData();
  }, []);

  const loadIntegrationData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get partner profile
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('subdomain, custom_domain, company_name')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Get partner's approved categories
      const { data: categoryAccess } = await supabase
        .from('UserCategoryAccess')
        .select(`
          ServiceCategories (
            service_category_id,
            name,
            slug
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved');

      const categories = categoryAccess?.map(access => access.ServiceCategories).filter(Boolean) || [];
      
      // Get main page URL settings for each category
      const { data: partnerSettings } = await supabase
        .from('PartnerSettings')
        .select('service_category_id, main_page_url')
        .eq('partner_id', user.id);

      const mainPageUrls: Record<string, string> = {};
      partnerSettings?.forEach(setting => {
        mainPageUrls[setting.service_category_id] = setting.main_page_url || '';
      });
      
      // Generate embed codes for each category
      const codes = generateEmbedCodes(categories as unknown as ServiceCategory[], profile);
      
      setEmbedCodes(codes);
      setMainPageUrls(mainPageUrls);
    } catch (error) {
      console.error('Error loading integration data:', error);
      toast.error('Failed to load integration data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
      toast.success('Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy code');
    }
  };

  const saveMainPageUrl = async (categoryId: string, url: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('PartnerSettings')
        .upsert({
          partner_id: user.id,
          service_category_id: categoryId,
          main_page_url: url || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'partner_id,service_category_id'
        });

      if (error) throw error;

      setMainPageUrls(prev => ({ ...prev, [categoryId]: url }));
      toast.success('Main page URL saved successfully');
    } catch (error) {
      console.error('Error saving main page URL:', error);
      toast.error('Failed to save main page URL');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading integration data...</span>
      </div>
    );
  }

  if (embedCodes.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Available</h3>
        <p className="text-gray-500">
          You need to have approved category access to generate embed codes.
        </p>
      </div>
    );
  }

  const currentEmbedCode = embedCodes[activeTab];
  const currentMainPageUrl = mainPageUrls[currentEmbedCode.category.service_category_id] || '';

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {embedCodes.map((embedCode, index) => (
            <button
              key={embedCode.category.service_category_id}
              onClick={() => setActiveTab(index)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === index
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {embedCode.category.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {currentEmbedCode.category.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Slug: {currentEmbedCode.category.slug}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {currentEmbedCode.subdomainUrl && currentMainPageUrl && (
              <a
                href={currentEmbedCode.subdomainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Preview
              </a>
            )}
          </div>
        </div>

        {/* Main Page URL Field */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900 flex items-center">
                <Globe className="h-4 w-4 mr-2 text-blue-500" />
                Main Page URL
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Set the main page URL where your quote forms are embedded. This URL will be used in email links to redirect users back to your website.
              </p>
            </div>
            {currentMainPageUrl && (
              <a
                href={currentMainPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Test
              </a>
            )}
          </div>
          
          <div className="flex space-x-2">
            <input
              type="url"
              value={currentMainPageUrl}
              onChange={(e) => {
                const newUrls = { ...mainPageUrls };
                newUrls[currentEmbedCode.category.service_category_id] = e.target.value;
                setMainPageUrls(newUrls);
              }}
              placeholder="https://yourwebsite.com/quote-form"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => saveMainPageUrl(currentEmbedCode.category.service_category_id, currentMainPageUrl)}
              disabled={saving}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
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

        {/* Show iframe codes only if main page URL is set */}
        {currentMainPageUrl ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subdomain Embed Code */}
            {currentEmbedCode.subdomainUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-gray-500" />
                    Subdomain Embed Code
                  </h4>
                  <button
                    onClick={() => copyToClipboard(currentEmbedCode.iframeCode!, `subdomain-${currentEmbedCode.category.service_category_id}`)}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    {copiedCode === `subdomain-${currentEmbedCode.category.service_category_id}` ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-2">URL: {currentEmbedCode.subdomainUrl}</div>
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                    {currentEmbedCode.iframeCode}
                  </pre>
                </div>
              </div>
            )}

            {/* Custom Domain Embed Code */}
            {currentEmbedCode.customDomainUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-blue-500" />
                    Custom Domain Embed Code
                  </h4>
                  <button
                    onClick={() => copyToClipboard(currentEmbedCode.customDomainIframeCode!, `custom-${currentEmbedCode.category.service_category_id}`)}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    {copiedCode === `custom-${currentEmbedCode.category.service_category_id}` ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-2">URL: {currentEmbedCode.customDomainUrl}</div>
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                    {currentEmbedCode.customDomainIframeCode}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
            <Globe className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <h4 className="font-medium text-yellow-900 mb-2">Main Page URL Required</h4>
            <p className="text-sm text-yellow-700">
              Please set a main page URL above to generate embed codes for this category.
            </p>
          </div>
        )}
      </div>

      {/* Tab Indicator */}
      <div className="text-sm text-gray-500 text-center">
        Showing {activeTab + 1} of {embedCodes.length} categories
      </div>
    </div>
  );
}
