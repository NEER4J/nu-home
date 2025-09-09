'use client';

import { useState } from 'react';
import { Settings, Package, Wrench } from 'lucide-react';
import EditCategoryForm from './EditCategoryForm';
import AddonTypesManager from './AddonTypesManager';
import SimplifiedFieldManager from './SimplifiedFieldManager';

type ServiceCategoryTabsProps = {
  category: any;
  categoryId: string;
};

export default function ServiceCategoryTabs({ category, categoryId }: ServiceCategoryTabsProps) {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'addons', label: 'Addon Types', icon: Package },
    { id: 'fields', label: 'Custom Fields', icon: Wrench },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="bg-white sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <EditCategoryForm category={category} />
            </div>
          </div>
        );
      case 'addons':
        return <AddonTypesManager categoryId={categoryId} />;
      case 'fields':
        return <SimplifiedFieldManager categoryId={categoryId} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <IconComponent size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}