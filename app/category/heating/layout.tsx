import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function HeatingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const subdomain = host.split('.')[0]

  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Fetch partner profile based on subdomain
  const { data: partnerProfile, error: profileError } = await supabase
    .from('UserProfiles')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (profileError || !partnerProfile) {
    redirect('/404')
  }

  // Fetch service category for heating
  const { data: category, error: categoryError } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', 'heating')
    .single()

  if (categoryError || !category) {
    redirect('/404')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
} 