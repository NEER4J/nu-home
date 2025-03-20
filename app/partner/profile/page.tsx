'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, UserCircle, Mail, Phone, MapPin, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PartnerProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    postcode: '',
  });
  const [email, setEmail] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Will be handled by layout
          return;
        }

        setUserId(user.id);
        setEmail(user.email || '');
        
        // Get partner profile
        const { data: profileData, error } = await supabase
          .from('UserProfiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }
        
        if (profileData) {
          setProfile({
            company_name: profileData.company_name || '',
            contact_person: profileData.contact_person || '',
            phone: profileData.phone || '',
            postcode: profileData.postcode || '',
          });
          setAccountStatus(profileData.status);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setFormError(null);
      setFormSuccess(null);
      
      // Validate
      if (!profile.company_name) {
        setFormError('Company name is required');
        setSaving(false);
        return;
      }
      
      if (!profile.contact_person) {
        setFormError('Contact person name is required');
        setSaving(false);
        return;
      }
      
      const supabase = createClient();
      
      // Update profile
      const { error } = await supabase
        .from('UserProfiles')
        .update({
          company_name: profile.company_name,
          contact_person: profile.contact_person,
          phone: profile.phone,
          postcode: profile.postcode,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      setFormSuccess('Profile updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      setFormError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-2 text-gray-600">
          Update your business information and contact details
        </p>
      </div>
      
      {/* Profile Form */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Account Information</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {/* Show success message */}
          {formSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p>{formSuccess}</p>
            </div>
          )}
          
          {/* Show error message */}
          {formError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p>{formError}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="bg-gray-50 focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Email cannot be changed. Contact support if you need to update your email.
              </p>
            </div>
            
            {/* Account Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Status
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircle className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={accountStatus}
                  readOnly
                  className={`focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 ${
                    accountStatus === 'active' 
                      ? 'bg-green-50 text-green-700' 
                      : accountStatus === 'pending' 
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-red-50 text-red-700'
                  }`}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {accountStatus === 'pending' 
                  ? 'Your account is pending approval from an administrator.' 
                  : accountStatus === 'active'
                    ? 'Your account is active and in good standing.'
                    : 'Your account has been suspended. Please contact support.'}
              </p>
            </div>
            
            {/* Company Name */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={profile.company_name}
                  onChange={handleChange}
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3"
                  placeholder="Your Company Name"
                />
              </div>
            </div>
            
            {/* Contact Person */}
            <div>
              <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={profile.contact_person}
                  onChange={handleChange}
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3"
                  placeholder="Full Name"
                />
              </div>
            </div>
            
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3"
                  placeholder="Your Phone Number"
                />
              </div>
            </div>
            
            {/* Postcode */}
            <div>
              <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                Postcode
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="postcode"
                  name="postcode"
                  value={profile.postcode}
                  onChange={handleChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3"
                  placeholder="Your Business Postcode"
                />
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    
    </div>
  );
}