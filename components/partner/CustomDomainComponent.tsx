'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save, CheckCircle2, AlertCircle, ExternalLink, Copy, Plus, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DomainData {
  subdomain: string | null;
  custom_domain: string | null;
  domain_verified: boolean;
}

interface DomainStatus {
  verified: boolean;
  status: 'pending' | 'verified' | 'error';
  message?: string;
}

export default function CustomDomainComponent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<DomainData>({
    subdomain: null,
    custom_domain: null,
    domain_verified: false,
  });
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isAddingToVercel, setIsAddingToVercel] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isRemovingDomain, setIsRemovingDomain] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadDomainData();
  }, []);

  // Check domain status when custom_domain changes
  useEffect(() => {
    if (data.custom_domain) {
      checkDomainVerificationStatus();
    }
  }, [data.custom_domain]);

  const loadDomainData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('UserProfiles')
        .select('subdomain, custom_domain, domain_verified')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading domain data:', profileError);
      } else if (profile) {
        setData({
          subdomain: profile.subdomain,
          custom_domain: profile.custom_domain,
          domain_verified: profile.domain_verified,
        });
      }
    } catch (error) {
      console.error('Unexpected error loading domain data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDomainData = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('UserProfiles')
        .update({
          subdomain: data.subdomain,
          custom_domain: data.custom_domain,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving domain data:', error);
        throw error;
      }

      toast.success('Domain settings saved successfully!');
    } catch (error) {
      console.error('Unexpected error saving domain data:', error);
      toast.error('Failed to save domain settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSubdomain = (value: string) => {
    setData(prev => ({ ...prev, subdomain: value }));
  };

  const updateCustomDomain = (value: string) => {
    setData(prev => ({ ...prev, custom_domain: value }));
  };

  const checkDomainVerificationStatus = async () => {
    if (!data.custom_domain) return;
    
    setIsCheckingStatus(true);
    try {
      const response = await fetch('/api/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: data.custom_domain })
      });
      
      if (response.ok) {
        const status = await response.json();
        setDomainStatus(status);
        
        // Update the data state to reflect the new verification status
        if (status.verified !== data.domain_verified) {
          setData(prev => ({ ...prev, domain_verified: status.verified }));
          
          if (status.verified) {
            toast.success('Domain verification successful! Your domain is now ready to use.');
          } else {
            toast.error('Domain verification failed. Please check your DNS settings.');
          }
        }
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
    if (!data.custom_domain) return;
    
    setIsAddingToVercel(true);
    try {
      const response = await fetch('/api/domain/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: data.custom_domain })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Domain added to Vercel successfully!');
        // Recheck domain status after adding to Vercel
        setTimeout(() => {
          checkDomainVerificationStatus();
        }, 2000);
      } else {
        toast.error('Failed to add domain to Vercel: ' + result.error);
      }
    } catch (error) {
      toast.error('Error adding domain to Vercel');
    } finally {
      setIsAddingToVercel(false);
    }
  };

  const debugDomain = async () => {
    if (!data.custom_domain) return;
    
    setIsDebugging(true);
    try {
      const response = await fetch('/api/domain/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: data.custom_domain })
      });
      
      const result = await response.json();
      setDebugInfo(result);
    } catch (error) {
      toast.error('Error debugging domain');
    } finally {
      setIsDebugging(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getDnsInstructions = () => {
    if (!data.custom_domain) return null;
    
    const domainParts = data.custom_domain.split('.');
    const isSubdomain = domainParts.length > 2;
    
    return {
      type: 'CNAME',
      name: isSubdomain ? domainParts[0] : '@',
      value: 'aifortrades.co.uk',
      ttl: 'Auto'
    };
  };

  const removeCustomDomain = async () => {
    const confirmed = confirm(
      `Are you sure you want to remove your custom domain "${data.custom_domain}"?\n\n` +
      'This will:\n' +
      '• Remove the custom domain from your account\n' +
      '• Remove the domain from Vercel (if configured)\n' +
      '• Revert to using only your subdomain\n' +
      '• Keep your subdomain working as before\n\n' +
      'Your forms will still be accessible at your subdomain.'
    );
    
    if (confirmed) {
      setIsRemovingDomain(true);
      try {
        const { error } = await supabase
          .from('UserProfiles')
          .update({ custom_domain: null })
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (error) throw error;

        setData(prev => ({ ...prev, custom_domain: null, domain_verified: false }));
        setDomainStatus(null);
        setDebugInfo(null);
        toast.success('Custom domain removed successfully!');
      } catch (error) {
        toast.error('Failed to remove custom domain');
      } finally {
        setIsRemovingDomain(false);
      }
    }
  };

  const dnsInstructions = getDnsInstructions();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading domain settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Subdomain Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Subdomain Configuration</h3>
            <p className="text-sm text-gray-500">Configure your subdomain for easy access to your partner portal</p>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subdomain
              </label>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={data.subdomain || ''}
                  onChange={(e) => updateSubdomain(e.target.value)}
                  className="block w-full min-w-0 flex-1 rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                  placeholder="yourcompany"
                />
                <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                  .aifortrades.co.uk
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Your subdomain will be accessible at: <span className="font-mono text-blue-600">
                  https://{data.subdomain || 'yourcompany'}.aifortrades.co.uk
                </span>
              </p>
            </div>

           
          </div>
        </div>
      </div>

      {/* Custom Domain Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Custom Domain Configuration</h3>
            <p className="text-sm text-gray-500">Configure your own domain for complete branding control</p>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Domain
              </label>
              <input
                type="text"
                value={data.custom_domain || ''}
                onChange={(e) => updateCustomDomain(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="shop.yourdomain.com"
              />
              <p className="text-xs text-gray-500 mt-2">
                Enter your domain (e.g., shop.yourdomain.com or yourdomain.com)
              </p>
            </div>

            {/* DNS Instructions */}
            {data.custom_domain && dnsInstructions && (
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
            {data.custom_domain && (
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

                  </div>
                </div>
                
                {/* Show stored verification status */}
                <div className="mt-3">
                  {data.domain_verified ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      <span className="text-sm font-medium">Domain is verified and ready to use</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <XCircle className="h-5 w-5 mr-2" />
                      <span className="text-sm font-medium">
                        Domain verification failed. Please check your DNS settings and try again.
                      </span>
                    </div>
                  )}
                </div>

                {/* Show real-time status from API check */}
                {domainStatus && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-600 mb-2">Latest check result:</div>
                    {domainStatus.status === 'verified' ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">{domainStatus.message || 'Domain is verified'}</span>
                      </div>
                    ) : domainStatus.status === 'pending' ? (
                      <div className="flex items-center text-yellow-600">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="text-sm font-medium">{domainStatus.message || 'Domain verification in progress'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <XCircle className="h-4 w-4 mr-2" />
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

            {/* Remove Domain Section */}
            {data.custom_domain && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">Remove Custom Domain</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Remove your custom domain and revert to using only the subdomain.
                    </p>
                  </div>
                  <button
                    onClick={removeCustomDomain}
                    disabled={isRemovingDomain}
                    className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRemovingDomain ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Removing...
                      </>
                    ) : (
                      'Remove Domain'
                    )}
                  </button>
                </div>
              </div>
            )}

      

        
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveDomainData}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Domain Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
