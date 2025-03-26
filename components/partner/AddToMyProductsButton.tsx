'use client';

import { PlusCircle } from 'lucide-react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface AddToMyProductsButtonProps {
  productId: string;
  onAdd: (productId: string) => Promise<{ success?: boolean; error?: string }>;
}

export default function AddToMyProductsButton({ productId, onAdd }: AddToMyProductsButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const handleClick = () => {
    startTransition(async () => {
      const result = await onAdd(productId);
      if (result.error) {
        // Check if it's an authentication error
        if (result.error.includes('authentication') || 
            result.error.includes('logged in') || 
            result.error.includes('session')) {
          alert('Session expired. The page will refresh to restore your session.');
          // Force a hard refresh to renew the session
          window.location.href = window.location.pathname;
        } else {
          alert(result.error);
        }
      } else if (result.success) {
        // Refresh the page to show the updated product list
        router.refresh();
        window.location.reload();
      }
    });
  };
  
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70"
    >
      {isPending ? (
        <span className="animate-pulse">Adding...</span>
      ) : (
        <>
          <PlusCircle className="mr-1.5 h-4 w-4" />
          Add to My Products
        </>
      )}
    </button>
  );
} 