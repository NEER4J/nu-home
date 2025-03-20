// app/partner/categories/request/page.tsx
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { ArrowLeft, InfoIcon } from 'lucide-react';
import { requestCategoryAccess } from '@/app/actions';
import { FormMessage, Message } from '@/components/form-message';

export const metadata = {
  title: 'Request Category Access | Partner Portal',
  description: 'Request access to additional service categories',
};

export default async function RequestCategoryPage({
  searchParams
}: {
  searchParams: Promise<Message>;
}) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null; // Handle in layout
  }
  
  // Get available service categories
  const { data: allCategories } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  // Get categories this partner already has access to or pending
  const { data: partnerCategories } = await supabase
    .from('UserCategoryAccess')
    .select('service_category_id, status')
    .eq('user_id', user.id)
    .not('status', 'eq', 'rejected');
  
  // Filter out categories the partner already has access to
  const existingCategoryIds = partnerCategories?.map(c => c.service_category_id) || [];
  const availableCategories = allCategories?.filter(c => !existingCategoryIds.includes(c.service_category_id)) || [];
  
  // Check if partner has a primary category already
  const hasPrimaryCategory = partnerCategories?.some(c => c.status === 'approved') || false;
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/partner/categories"
          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Categories
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Request Category Access</h1>
        <p className="mt-2 text-gray-600">
          Request access to offer products and services in additional categories
        </p>
      </div>
      
      {/* Request Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        {availableCategories.length > 0 ? (
          <form action={requestCategoryAccess}>
            <input type="hidden" name="user_id" value={user.id} />
            
            <div className="mb-6">
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                Select Category
              </label>
              <select
                id="category_id"
                name="category_id"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- Select a service category --</option>
                {availableCategories.map((category) => (
                  <option key={category.service_category_id} value={category.service_category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Choose a category you want to offer products and services in
              </p>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  id="is_primary"
                  name="is_primary"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={hasPrimaryCategory}
                />
                <label htmlFor="is_primary" className="ml-2 block text-sm text-gray-700">
                  Set as primary category
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {hasPrimaryCategory 
                  ? "You already have a primary category. If you need to change it, please contact support."
                  : "The primary category will be displayed first and used as your main business category"
                }
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md flex mb-6">
              <InfoIcon className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Request will need approval</p>
                <p>Your request will be reviewed by our team. You'll be notified when it's approved or rejected.</p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Link
                href="/partner/categories"
                className="mr-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Submit Request
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <InfoIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No categories available</h3>
            <p className="mt-1 text-sm text-gray-500">
              You've already requested access to all available categories.
            </p>
            <Link
              href="/partner/categories"
              className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Categories
            </Link>
          </div>
        )}
        
        <FormMessage message={resolvedParams} />
      </div>
    </div>
  );
}