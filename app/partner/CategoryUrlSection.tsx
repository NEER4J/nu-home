'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface CategoryUrlSectionProps {
  slug: string;
  userId: string;
}

function CopyButton({ url }: { url: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <button
      onClick={copyToClipboard}
      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none"
      title="Copy URL"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
      </svg>
    </button>
  );
}

export default function CategoryUrlSection({ slug, userId }: CategoryUrlSectionProps) {
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Get the base URL from the window location in the client
    const protocol = window.location.protocol;
    const host = window.location.host;
    setBaseUrl(`${protocol}//${host}`);
  }, []);

  const url = `${baseUrl}/category/${slug}/quote`;

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