'use client';

import { useState } from 'react';
import Link from 'next/link';
import BrandingComponent from '@/components/partner/BrandingComponent';
import IntegrationsComponent from '@/components/partner/IntegrationsComponent';
import PaymentsComponent from '@/components/partner/PaymentsComponent';
import CustomDomainComponent from '@/components/partner/CustomDomainComponent';
import IntegrationComponent from '@/components/partner/IntegrationComponent';

const configurationTabs = [
  { id: 'branding', label: 'Branding' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'payments', label: 'Payments & Finance' },
  { id: 'domain', label: 'Custom Domain' },
  { id: 'integration', label: 'Embed' }
];

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState('branding');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'branding':
        return <BrandingComponent />;
      case 'integrations':
        return <IntegrationsComponent />;
      case 'payments':
        return <PaymentsComponent />;
      case 'domain':
        return <CustomDomainComponent />;
      case 'integration':
        return <IntegrationComponent />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your settings, integrations, and customizations
        </p>
      </div>

      {/* Configuration Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex overflow-x-auto pb-px" aria-label="Tabs">
          {configurationTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="">
        <div className="p-0">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
