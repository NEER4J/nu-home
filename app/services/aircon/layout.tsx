import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function AirconLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerComponentClient({ cookies })
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const subdomain = host.split('.')[0]

  // Fetch partner profile
  const { data: profile } = await supabase
    .from('UserProfiles')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (!profile) {
    redirect('/not-found')
  }

  // Fetch service category
  const { data: category } = await supabase
    .from('ServiceCategories')
    .select('*')
    .eq('slug', 'aircon')
    .single()

  if (!category) {
    redirect('/not-found')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
} 