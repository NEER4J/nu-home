'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import CopyButton from './CopyButton';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface CategoryUrlSectionProps {
  slug: string;
  userId: string;
}

export default function CategoryUrlSection({ slug, userId }: CategoryUrlSectionProps) {
  const [url, setUrl] = useState('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function generateUrl() {
      // Get partner's subdomain
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('subdomain')
        .eq('user_id', userId)
        .single();

      if (!profile?.subdomain) return;

      // Get the current hostname
      const isLocalhost = window.location.hostname === 'localhost';
      const mainDomain = isLocalhost ? 'localhost:3000' : process.env.NEXT_PUBLIC_SITE_URL || 'nu-home.com';
      
      // Construct the URL
      const protocol = window.location.protocol;
      const generatedUrl = isLocalhost
        ? `${protocol}//${profile.subdomain}.${mainDomain}/category/${slug}/quote`
        : `${protocol}//${profile.subdomain}.${mainDomain}/category/${slug}/quote`;

      setUrl(generatedUrl);
    }

    generateUrl();
  }, [userId, slug, supabase]);

  if (!url) return null;

  return (
    <div className="flex items-center gap-1">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none"
        title="Open Quote Page"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
      <CopyButton url={url} />
    </div>
  );
} 