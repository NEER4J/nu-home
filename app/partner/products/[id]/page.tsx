'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { PartnerProductForm } from '@/components/Partner/PartnerProductForm';
import { Product } from '@/types/product.types';
import { useRouter } from 'next/navigation';

export default function EditPartnerProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Handle not logged in state - redirect will happen in layout
          return;
        }
        
        setUserId(user.id);
        
        // Fetch the product
        const { data: productData, error: productError } = await supabase
          .from('Products')
          .select('*')
          .eq('product_id', params.id)
          .eq('partner_id', user.id)
          .single();
        
        if (productError) {
          throw new Error('Failed to load product or product not found');
        }
        
        if (!productData) {
          throw new Error('Product not found');
        }
        
        setProduct(productData as Product);
      } catch (error) {
        console.error('Error loading product:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [params.id]);
  
  const handleDelete = async () => {
    if (!product) return;
    
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('Products')
        .delete()
        .eq('product_id', product.product_id)
        .eq('partner_id', userId);  // Ensure partner can only delete their own products

      if (error) {
        throw error;
      }

      router.push('/partner/products?success=Product successfully deleted');
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product');
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <Link
            href="/partner/products"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Products
          </Link>
        </div>
      </div>
    );
  }
  
  if (!userId || !product) {
    return null; // Will be handled by layout or already showing error
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/partner/products"
          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Products
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
            <p className="mt-2 text-gray-600">
              Update your product listing details
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-colors"
          >
            Delete Product
          </button>
        </div>
      </div>
      
      {/* Product Form */}
      <PartnerProductForm userId={userId} product={product} isEditing={true} />
    </div>
  );
}