import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AdminAddonFormWrapper from '@/components/admin/AdminAddonFormWrapper';

export default function NewAdminAddonPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/addons"
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Addons
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Create New Admin Addon</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new addon that will be available to all partners in the catalog.
        </p>
      </div>
      
      <AdminAddonFormWrapper />
    </div>
  );
}
