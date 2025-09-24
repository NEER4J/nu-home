'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Globe, ExternalLink, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

interface EmbedCodeCardProps {
  embedCode: {
    category: {
      service_category_id: string;
      name: string;
      slug: string;
    };
    subdomainUrl: string | null;
    customDomainUrl: string | null;
    iframeCode: string | null;
    customDomainIframeCode: string | null;
  };
  mainPageUrl: string;
  userId: string;
}

export default function EmbedCodeCard({ embedCode, mainPageUrl, userId }: EmbedCodeCardProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [currentMainPageUrl, setCurrentMainPageUrl] = useState(mainPageUrl);
  const [saving, setSaving] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    setCurrentMainPageUrl(mainPageUrl);
  }, [mainPageUrl]);

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const saveMainPageUrl = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('PartnerSettings')
        .upsert({
          partner_id: userId,
          service_category_id: embedCode.category.service_category_id,
          main_page_url: currentMainPageUrl || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'partner_id,service_category_id'
        });

      if (error) throw error;

      toast.success('Main page URL saved successfully');
    } catch (error) {
      console.error('Error saving main page URL:', error);
      toast.error('Failed to save main page URL');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {embedCode.category.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Slug: {embedCode.category.slug}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {embedCode.subdomainUrl && currentMainPageUrl && (
            <a
              href={embedCode.subdomainUrl}
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
            onChange={(e) => setCurrentMainPageUrl(e.target.value)}
            placeholder="https://yourwebsite.com/quote-form"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={saveMainPageUrl}
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
          {embedCode.subdomainUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Globe className="h-4 w-4 mr-2 text-gray-500" />
                  Subdomain Embed Code
                </h4>
                <button
                  onClick={() => copyToClipboard(embedCode.iframeCode!, `subdomain-${embedCode.category.service_category_id}`)}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  {copiedCode === `subdomain-${embedCode.category.service_category_id}` ? (
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
                <div className="text-xs text-gray-500 mb-2">URL: {embedCode.subdomainUrl}</div>
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                  {embedCode.iframeCode}
                </pre>
              </div>
            </div>
          )}

          {/* Custom Domain Embed Code */}
          {embedCode.customDomainUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Globe className="h-4 w-4 mr-2 text-blue-500" />
                  Custom Domain Embed Code
                </h4>
                <button
                  onClick={() => copyToClipboard(embedCode.customDomainIframeCode!, `custom-${embedCode.category.service_category_id}`)}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  {copiedCode === `custom-${embedCode.category.service_category_id}` ? (
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
                <div className="text-xs text-gray-500 mb-2">URL: {embedCode.customDomainUrl}</div>
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                  {embedCode.customDomainIframeCode}
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
    </motion.div>
  );
}
