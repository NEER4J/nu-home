'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmbedCodeCard from './EmbedCodeCard';

interface EmbedCode {
  category: {
    service_category_id: string;
    name: string;
    slug: string;
  };
  subdomainUrl: string | null;
  customDomainUrl: string | null;
  iframeCode: string | null;
  customDomainIframeCode: string | null;
}

interface IntegrationTabsProps {
  embedCodes: EmbedCode[];
}

export default function IntegrationTabs({ embedCodes }: IntegrationTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (embedCodes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          You need to have approved category access to generate embed codes.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
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
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <EmbedCodeCard embedCode={embedCodes[activeTab]} />
        </motion.div>
      </AnimatePresence>

      {/* Tab Indicator */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        Showing {activeTab + 1} of {embedCodes.length} categories
      </div>
    </div>
  );
}
