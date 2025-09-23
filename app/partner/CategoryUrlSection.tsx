'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import CopyButton from './CopyButton';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface CategoryUrlSectionProps {
  slug: string;
  userId: string;
}

interface UrlInfo {
  url: string;
  type: 'subdomain' | 'custom';
  label: string;
}

export default function CategoryUrlSection({ slug, userId }: CategoryUrlSectionProps) {
  const [urls, setUrls] = useState<UrlInfo[]>([]);
  const [customDomainVerified, setCustomDomainVerified] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function generateUrls() {
      // Get partner's profile data
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('subdomain, custom_domain')
        .eq('user_id', userId)
        .single();

      if (!profile) return;

      const urlList: UrlInfo[] = [];

      // Generate subdomain URL
      if (profile.subdomain) {
        const isLocalhost = window.location.hostname === 'localhost';
        const mainDomain = isLocalhost ? 'localhost:3000' : process.env.NEXT_PUBLIC_SITE_URL || 'aifortrades.co.uk';
        const protocol = window.location.protocol;
        const subdomainUrl = isLocalhost
          ? `${protocol}//${profile.subdomain}.${mainDomain}/${slug}/quote`
          : `${protocol}//${profile.subdomain}.${mainDomain}/${slug}/quote`;
        
        urlList.push({
          url: subdomainUrl,
          type: 'subdomain',
          label: `${profile.subdomain}.${mainDomain.split(':')[0]}`
        });
      }

      // Check custom domain verification and generate custom domain URL
      if (profile.custom_domain) {
        try {
          const domainCheckResponse = await fetch('/api/domain/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: profile.custom_domain })
          });
          
          if (domainCheckResponse.ok) {
            const domainStatus = await domainCheckResponse.json();
            if (domainStatus.verified) {
              setCustomDomainVerified(true);
              const protocol = window.location.protocol;
              const customDomainUrl = `${protocol}//${profile.custom_domain}/${slug}/quote`;
              
              urlList.push({
                url: customDomainUrl,
                type: 'custom',
                label: profile.custom_domain
              });
            }
          }
        } catch (error) {
          console.error('Error checking domain verification status:', error);
        }
      }

      setUrls(urlList);
    }

    generateUrls();
  }, [userId, slug]);

  if (urls.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {urls.map((urlInfo, index) => (
        <div key={index} className="flex items-center gap-1">
          <a
            href={urlInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none"
            title={`Open Quote Page on ${urlInfo.label}`}
          >
            {urlInfo.type === 'custom' ? (
              <Globe className="h-4 w-4" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
          </a>
          <CopyButton url={urlInfo.url} />
        </div>
      ))}
    </div>
  );
} 