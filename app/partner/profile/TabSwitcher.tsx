'use client';

import { useState } from 'react';
import ProfileForm from './ProfileForm';
import CustomDomainForm from './CustomDomainForm';

interface UserProfile {
  profile_id: string;
  user_id: string;
  company_name: string;
  contact_person: string;
  address: string | null;
  phone: string | null;
  postcode: string;
  status: string;
  verification_data: any;
  business_description: string | null;
  website_url: string | null;
  logo_url: string | null;
  tier_id: string | null;
  role: string;
  subdomain: string | null;
  custom_domain?: string | null;
}

interface PartnerTier {
  tier_id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

interface TabSwitcherProps {
  profile: UserProfile;
  tiers: PartnerTier[];
}

export default function TabSwitcher({ profile, tiers }: TabSwitcherProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'custom-domain'>('profile');

  const tabs = [
    { id: 'profile', name: 'Profile' },
    { id: 'custom-domain', name: 'Custom Domain' }
  ] as const;

  return (
    <>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'profile' && (
          <ProfileForm profile={profile} tiers={tiers} />
        )}
        
        {activeTab === 'custom-domain' && (
          <CustomDomainForm profile={profile} />
        )}
      </div>
    </>
  );
}
