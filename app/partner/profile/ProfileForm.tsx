'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { updateProfile } from './actions';

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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                .yourdomain.com
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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

      {/* Logo Upload - To be implemented */}
      <div className="pt-8">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">Company Logo</h3>
          <p className="mt-1 text-sm text-gray-500">
            Coming soon: Upload your company logo.
          </p>
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