// app/admin/service-categories/new/page.tsx
import Link from 'next/link';
import NewCategoryForm from '@/components/admin/NewCategoryForm';

export const metadata = {
  title: 'Add New Service Category | Nu-Home Admin',
  description: 'Create a new service category'
};

export default function NewCategoryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Add New Service Category</h1>
        <Link
          href="/admin/service-categories"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg 
            className="h-5 w-5 mr-2 -ml-1" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Categories
        </Link>
      </div>
      
      <div className="bg-white  overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <NewCategoryForm />
        </div>
      </div>
    </div>
  );
}