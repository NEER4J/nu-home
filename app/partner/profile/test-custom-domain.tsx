'use client';

import { useState } from 'react';

export default function TestCustomDomain() {
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDomainVerification = async () => {
    if (!domain) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({ error: 'Failed to test domain' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-medium mb-4">Test Domain Verification</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Domain to test:
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="shop.clientdomain.com"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        
        <button
          onClick={testDomainVerification}
          disabled={loading || !domain}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Domain'}
        </button>
        
        {status && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <pre className="text-sm">{JSON.stringify(status, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
