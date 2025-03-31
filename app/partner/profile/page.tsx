import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ProfileForm from './ProfileForm';

export default async function PartnerProfilePage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('UserProfiles')
    .select(`
      *,
      tier:tier_id (
        name,
        tier_id
      )
    `)
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    redirect('/auth/login');
  }

  // Get available tiers for dropdown
  const { data: tiers } = await supabase
    .from('PartnerTiers')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Partner Profile
            </h2>
          </div>
        </div>

        {/* Profile Form */}
        <div className="mt-8">
          <ProfileForm profile={profile} tiers={tiers || []} />
        </div>
      </div>
    </div>
  );
} 