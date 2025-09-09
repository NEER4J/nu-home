'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { updateProfile } from './actions';
import { useState } from 'react';

interface PartnerTier {
  tier_id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

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
  domain_verified: boolean;
  privacy_policy: string | null;
  terms_conditions: string | null;
  tier?: PartnerTier;
}

interface ProfileFormProps {
  profile: UserProfile;
  tiers: PartnerTier[];
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="ml-3 inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-75"
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
          Saving...
        </>
      ) : (
        'Save Changes'
      )}
    </button>
  );
}

export default function ProfileForm({ profile, tiers }: ProfileFormProps) {
  const [state, formAction] = useFormState(updateProfile, null);
  const [logoUrl, setLogoUrl] = useState(profile.logo_url || '');

  return (
    <form action={formAction} className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow sm:rounded-lg">
      {/* Success Message */}
      {state?.success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{state.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {state && !state.success && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{state.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">Company Information</h3>
          <p className="mt-1 text-sm text-gray-500">
            This information will be displayed publicly so be careful what you share.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          {/* Company Name */}
          <div className="sm:col-span-4">
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="company_name"
                id="company_name"
                defaultValue={profile.company_name}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          {/* Contact Person */}
          <div className="sm:col-span-4">
            <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700">
              Contact Person
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="contact_person"
                id="contact_person"
                defaultValue={profile.contact_person}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="sm:col-span-3">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <div className="mt-1">
              <input
                type="tel"
                name="phone"
                id="phone"
                defaultValue={profile.phone || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          {/* Website */}
          <div className="sm:col-span-3">
            <label htmlFor="website_url" className="block text-sm font-medium text-gray-700">
              Website
            </label>
            <div className="mt-1">
              <input
                type="url"
                name="website_url"
                id="website_url"
                defaultValue={profile.website_url || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Address */}
          <div className="sm:col-span-6">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <div className="mt-1">
              <textarea
                name="address"
                id="address"
                rows={3}
                defaultValue={profile.address || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          {/* Postcode */}
          <div className="sm:col-span-2">
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-700">
              Postcode
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="postcode"
                id="postcode"
                defaultValue={profile.postcode}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          {/* Subdomain */}
          <div className="sm:col-span-4">
            <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700">
              Subdomain
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                name="subdomain"
                id="subdomain"
                defaultValue={profile.subdomain || ''}
                className="block w-full min-w-0 flex-1 rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                .aifortrades.co.uk
              </span>
            </div>
          </div>

          {/* Business Description */}
          <div className="sm:col-span-6">
            <label htmlFor="business_description" className="block text-sm font-medium text-gray-700">
              Business Description
            </label>
            <div className="mt-1">
              <textarea
                name="business_description"
                id="business_description"
                rows={4}
                defaultValue={profile.business_description || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
              <p className="mt-2 text-sm text-gray-500">
                Brief description of your business that will be displayed on your profile.
              </p>
            </div>
          </div>

          {/* Partner Tier */}
          {tiers.length > 0 && (
            <div className="sm:col-span-3">
              <label htmlFor="tier_id" className="block text-sm font-medium text-gray-700">
                Partner Tier
              </label>
              <div className="mt-1">
                <select
                  name="tier_id"
                  id="tier_id"
                  defaultValue={profile.tier_id || ''}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                >
                  <option value="">Select a tier</option>
                  {tiers.map((tier) => (
                    <option key={tier.tier_id} value={tier.tier_id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="sm:col-span-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500">Status:</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                ${profile.status === 'active' ? 'bg-green-100 text-green-800' :
                  profile.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'}`}>
                {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Company Logo */}
      <div className="pt-8">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">Company Logo</h3>
          <p className="mt-1 text-sm text-gray-500">
            Enter the URL of your company logo. This will be displayed in the header and on your profile.
          </p>
        </div>
        
        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          {/* Logo URL Input */}
          <div className="sm:col-span-4">
            <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700">
              Logo URL
            </label>
            <div className="mt-1">
              <input
                type="url"
                name="logo_url"
                id="logo_url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Supported formats: PNG, JPG, SVG. Recommended size: 200x200px or larger.
            </p>
          </div>

          {/* Logo Preview */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Preview
            </label>
            <div className="mt-1 flex items-center justify-center w-32 h-32 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display: flex');
                  }}
                />
              ) : null}
              <div className={`flex flex-col items-center justify-center text-gray-400 ${logoUrl ? 'hidden' : ''}`}>
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span className="text-xs mt-1">Logo preview</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Documents */}
      <div className="pt-8">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">Legal Documents</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your privacy policy and terms & conditions that will be displayed on your website.
          </p>
        </div>
        
        <div className="mt-6 space-y-6">
          {/* Privacy Policy */}
          <div>
            <label htmlFor="privacy_policy" className="block text-sm font-medium text-gray-700">
              Privacy Policy URL
            </label>
            <div className="mt-1">
              <input
                type="url"
                name="privacy_policy"
                id="privacy_policy"
                defaultValue={profile.privacy_policy || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                placeholder="https://example.com/privacy-policy"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Link to your privacy policy page that explains how you collect, use, and protect user data.
            </p>
          </div>

          {/* Terms & Conditions */}
          <div>
            <label htmlFor="terms_conditions" className="block text-sm font-medium text-gray-700">
              Terms & Conditions URL
            </label>
            <div className="mt-1">
              <input
                type="url"
                name="terms_conditions"
                id="terms_conditions"
                defaultValue={profile.terms_conditions || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                placeholder="https://example.com/terms-conditions"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Link to your terms & conditions page that includes your service terms and legal agreements.
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="pt-5">
        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
} 