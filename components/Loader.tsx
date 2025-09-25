'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface LoaderProps {
  minDisplayTime?: number; // in milliseconds, 0 means no minimum
}

const Loader: React.FC<LoaderProps> = ({ minDisplayTime = 0 }) => {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const loadingStartTime = useRef<number | null>(null);
  const minTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const hideLoader = () => {
      if (minDisplayTime === 0) {
        setLoading(false);
        return;
      }

      if (loadingStartTime.current) {
        const elapsedTime = Date.now() - loadingStartTime.current;
        const remainingTime = minDisplayTime - elapsedTime;

        if (remainingTime > 0) {
          minTimerRef.current = setTimeout(() => {
            setLoading(false);
            loadingStartTime.current = null;
          }, remainingTime);
        } else {
          setLoading(false);
          loadingStartTime.current = null;
        }
      } else {
        setLoading(false);
      }
    };

    // Clear any existing timer
    if (minTimerRef.current) {
      clearTimeout(minTimerRef.current);
      minTimerRef.current = null;
    }

    hideLoader();
  }, [pathname, minDisplayTime]);

  useEffect(() => {
    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && !link.href.startsWith('#') && !link.href.includes('mailto:') && !link.href.includes('tel:')) {
        // Check if it's an internal link that will actually navigate
        const url = new URL(link.href);
        if (url.origin === window.location.origin && url.pathname !== pathname) {
          // Only trigger for actual navigation links, not buttons or form elements
          const isNavigationLink = link.getAttribute('data-navigation') !== 'false' && 
                                 !link.closest('form') && 
                                 !link.closest('[data-no-navigation]') &&
                                 !target.closest('button') &&
                                 !target.closest('form') &&
                                 link.getAttribute('role') !== 'button';
          
          if (isNavigationLink) {
            loadingStartTime.current = Date.now();
            setLoading(true);
          }
        }
      }
    };

    document.addEventListener('click', handleLinkClick);

    return () => {
      document.removeEventListener('click', handleLinkClick);
    };
  }, [pathname]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (minTimerRef.current) {
        clearTimeout(minTimerRef.current);
      }
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50 md:left-[235px] top-[65px]">
      <div className="flex flex-col items-center space-y-4">
        <div className="loader"></div>
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
      <style jsx>{`
        .loader {
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Loader;
