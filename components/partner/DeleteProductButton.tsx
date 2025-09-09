'use client';

import { X } from 'lucide-react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deletePartnerProduct } from '@/app/partner/actions';

interface DeleteProductButtonProps {
  productId: string;
}

export default function DeleteProductButton({ productId }: DeleteProductButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this product?')) {
      startTransition(async () => {
        const formData = new FormData();
        formData.append('productId', productId);
        const result = await deletePartnerProduct(formData);
        
        if (result?.error) {
          // Check if it's an authentication error
          if (result.error.includes('authentication') || 
              result.error.includes('logged in') || 
              result.error.includes('session')) {
            alert('Session expired. The page will refresh to restore your session.');
            // Force a hard refresh to renew the session
            window.location.href = window.location.pathname;
          } else {
            alert(`Error: ${result.error}`);
          }
        } else if (result?.success) {
          // Refresh the page to show the updated product list
          router.refresh();
        }
      });
    }
  };
  
  return (
    <button 
      type="button"
      onClick={handleDelete}
      className="text-red-600 hover:text-red-800"
      disabled={isPending}
    >
      <X className={`h-4 w-4 ${isPending ? 'opacity-50' : ''}`} />
    </button>
  );
} 