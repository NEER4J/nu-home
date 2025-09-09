'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface IframeNavigationTrackerProps {
  categorySlug: string;
}

export default function IframeNavigationTracker({ categorySlug }: IframeNavigationTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only run in iframe context
    if (window.self === window.top) {
      return;
    }

    // Function to notify parent window of navigation
    const notifyParentOfNavigation = () => {
      try {
        const currentUrl = window.location.href;
        
        // Send message to parent window
        window.parent.postMessage({
          type: 'iframe-navigation',
          url: currentUrl,
          categorySlug: categorySlug,
          timestamp: new Date().toISOString()
        }, '*');
        
        console.log('Notified parent of iframe navigation:', currentUrl);
      } catch (error) {
        console.warn('Failed to notify parent of navigation:', error);
      }
    };

    // Notify parent on initial load
    notifyParentOfNavigation();

    // Listen for URL changes (for client-side navigation)
    const handleUrlChange = () => {
      // Small delay to ensure URL has updated
      setTimeout(notifyParentOfNavigation, 100);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);

    // For Next.js router events, we'll use a MutationObserver to detect DOM changes
    // that might indicate navigation
    const observer = new MutationObserver((mutations) => {
      // Check if the URL has changed
      const currentUrl = window.location.href;
      if (currentUrl !== (window as any).lastNotifiedUrl) {
        (window as any).lastNotifiedUrl = currentUrl;
        handleUrlChange();
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Store initial URL
    (window as any).lastNotifiedUrl = window.location.href;

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      observer.disconnect();
    };
  }, [pathname, searchParams, categorySlug]);

  // This component doesn't render anything
  return null;
}
