'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  url: string;
}

export default function CopyButton({ url }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none transition-colors"
      title={copied ? 'Copied!' : 'Copy URL'}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
} 