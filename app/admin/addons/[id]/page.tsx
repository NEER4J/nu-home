import { createServerSupabaseClient } from '@/lib/products';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AdminAddonFormWrapper from '@/components/admin/AdminAddonFormWrapper';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAdminAddonPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  
  // Fetch the admin addon
  const { data: adminAddon, error } = await supabase
    .from('AdminAddons')
    .select('*')
    .eq('admin_addon_id', id)
    .single();

  if (error || !adminAddon) {
    notFound();
  }

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
        <h1 className="text-2xl font-semibold text-gray-900">Edit Admin Addon</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update the addon details that will be available to all partners.
        </p>
      </div>
      
      <AdminAddonFormWrapper 
        initialData={adminAddon}
        isEditing={true}
      />
    </div>
  );
}
