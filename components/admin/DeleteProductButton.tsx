'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProduct } from '@/lib/products-actions';

export function DeleteProductButton({ 
  productId, 
  productName 
}: { 
  productId: string; 
  productName: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const result = await deleteProduct(productId);
      
      if (result.success) {
        router.refresh();
      } else {
        alert(`Failed to delete product: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button 
      className="text-red-600 hover:text-red-900 disabled:text-red-300"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}