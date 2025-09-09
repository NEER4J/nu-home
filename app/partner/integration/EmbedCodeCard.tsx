'use client';

import { useState } from 'react';
import { Copy, Check, Globe, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

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
}

export default function EmbedCodeCard({ embedCode }: EmbedCodeCardProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
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
          {embedCode.subdomainUrl && (
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

      {!embedCode.subdomainUrl && !embedCode.customDomainUrl && (
        <div className="text-center py-8 text-gray-500">
          <p>No embed codes available. Please set up your subdomain or custom domain in your profile settings.</p>
        </div>
      )}
    </motion.div>
  );
}
