'use client';

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { CheckCircle2, XCircle, Loader2, ExternalLink, Copy, Plus } from 'lucide-react';
import { updateCustomDomain, checkDomainStatus } from './actions';

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

interface CustomDomainFormProps {
  profile: UserProfile;
}

interface DomainStatus {
  verified: boolean;
  status: 'pending' | 'verified' | 'error';
  message?: string;
}

export default function CustomDomainForm({ profile }: CustomDomainFormProps) {
  const [state, formAction] = useFormState(updateCustomDomain, null);
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isAddingToVercel, setIsAddingToVercel] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Check domain status when component mounts or custom_domain changes
  useEffect(() => {
    if (profile.custom_domain) {
      checkDomainVerificationStatus();
    }
  }, [profile.custom_domain]);

  const checkDomainVerificationStatus = async () => {
    if (!profile.custom_domain) return;
    
    setIsCheckingStatus(true);
    try {
      const response = await fetch('/api/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: profile.custom_domain })
      });
      
      if (response.ok) {
        const status = await response.json();
        setDomainStatus(status);
      } else {
        setDomainStatus({ verified: false, status: 'error', message: 'Failed to check domain status' });
      }
    } catch (error) {
      setDomainStatus({ verified: false, status: 'error', message: 'Error checking domain status' });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const addDomainToVercel = async () => {
    if (!profile.custom_domain) return;
    
    setIsAddingToVercel(true);
    try {
      const response = await fetch('/api/domain/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: profile.custom_domain })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Recheck domain status after adding to Vercel
        setTimeout(() => {
          checkDomainVerificationStatus();
        }, 2000);
      } else {
        console.error('Failed to add domain to Vercel:', result.error);
      }
    } catch (error) {
      console.error('Error adding domain to Vercel:', error);
    } finally {
      setIsAddingToVercel(false);
    }
  };

  const debugDomain = async () => {
    if (!profile.custom_domain) return;
    
    setIsDebugging(true);
    try {
      const response = await fetch('/api/domain/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: profile.custom_domain })
      });
      
      const result = await response.json();
      setDebugInfo(result);
    } catch (error) {
      console.error('Error debugging domain:', error);
    } finally {
      setIsDebugging(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getDnsInstructions = () => {
    if (!profile.custom_domain) return null;
    
    const domainParts = profile.custom_domain.split('.');
    const isSubdomain = domainParts.length > 2;
    
    return {
      type: 'CNAME',
      name: isSubdomain ? domainParts[0] : '@',
      value: 'aifortrades.co.uk',
      ttl: 'Auto'
    };
  };

  const dnsInstructions = getDnsInstructions();

  return (
    <div className="space-y-8 divide-y divide-gray-200 bg-white p-8 shadow sm:rounded-lg">
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
              <XCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{state.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">Custom Domain</h3>
          <p className="mt-1 text-sm text-gray-500">
            Set up your own domain to replace the subdomain. Your forms will be accessible at your custom domain.
          </p>
        </div>

        <form action={formAction} className="space-y-6">
          <div>
            <label htmlFor="custom_domain" className="block text-sm font-medium text-gray-700">
              Custom Domain
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="custom_domain"
                id="custom_domain"
                defaultValue={profile.custom_domain || ''}
                placeholder="shop.yourdomain.com"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter your domain (e.g., shop.yourdomain.com or yourdomain.com)
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Domain
            </button>
          </div>
        </form>

        {/* DNS Instructions */}
        {profile.custom_domain && dnsInstructions && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">DNS Configuration</h4>
            <p className="text-sm text-gray-600 mb-4">
              Add the following DNS record to your domain provider to point your domain to our servers:
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Type:</span>
                <span className="text-sm text-gray-900">{dnsInstructions.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Name:</span>
                <span className="text-sm text-gray-900">{dnsInstructions.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Value:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900">{dnsInstructions.value}</span>
                  <button
                    onClick={() => copyToClipboard(dnsInstructions.value)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">TTL:</span>
                <span className="text-sm text-gray-900">{dnsInstructions.ttl}</span>
              </div>
            </div>
          </div>
        )}

        {/* Domain Status */}
        {profile.custom_domain && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">Domain Status</h4>
              <div className="flex space-x-2">
                <button
                  onClick={checkDomainVerificationStatus}
                  disabled={isCheckingStatus}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isCheckingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  Check Status
                </button>
                
                {domainStatus?.status === 'error' && domainStatus.message?.includes('not found in Vercel') && (
                  <button
                    onClick={addDomainToVercel}
                    disabled={isAddingToVercel}
                    className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isAddingToVercel ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1" />
                    )}
                    Add to Vercel
                  </button>
                )}

                <button
                  onClick={debugDomain}
                  disabled={isDebugging}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  {isDebugging ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  Debug
                </button>
              </div>
            </div>
            
            {domainStatus && (
              <div className="mt-3">
                {domainStatus.status === 'verified' ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Domain is verified and ready to use</span>
                  </div>
                ) : domainStatus.status === 'pending' ? (
                  <div className="flex items-center text-yellow-600">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    <span className="text-sm font-medium">Domain verification in progress</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <XCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">
                      {domainStatus.message || 'Domain verification failed'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Debug Information */}
            {debugInfo && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Debug Information</h5>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Domain:</strong> {debugInfo.domain}</div>
                  <div><strong>Vercel Status:</strong> {debugInfo.vercelResponse.status}</div>
                  <div><strong>Configured:</strong> {String(debugInfo.analysis.configured)}</div>
                  <div><strong>Has Verification:</strong> {String(debugInfo.analysis.hasVerification)}</div>
                  <div><strong>Verification Status:</strong> {debugInfo.analysis.verificationStatus || 'N/A'}</div>
                  <div><strong>Should Be Verified:</strong> {String(debugInfo.analysis.shouldBeVerified)}</div>
                </div>
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">Raw Vercel Response</summary>
                  <pre className="mt-1 text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-40">
                    {JSON.stringify(debugInfo.vercelResponse.data, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Current Subdomain Info */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-2">Current Subdomain</h4>
          <p className="text-sm text-gray-600">
            Your current subdomain: <span className="font-mono text-gray-900">{profile.subdomain}.aifortrades.co.uk</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            This will continue to work alongside your custom domain once configured.
          </p>
        </div>
      </div>
    </div>
  );
}
