'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { HelpCircle, MessageCircle, PhoneCall } from 'lucide-react'
import { useOnClickOutside } from '@/hooks/use-click-outside'
import { resolvePartnerByHost, type PartnerProfile } from '@/lib/partner'
import { PartnerCodeInjection } from '@/components/PartnerCodeInjection'

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showHelp, setShowHelp] = useState(false)
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null)
  const [partnerSettings, setPartnerSettings] = useState<{
    header_code?: string;
    body_code?: string;
    footer_code?: string;
  } | null>(null)
  const helpButtonRef = useRef<HTMLDivElement>(null!)
  const supabase = createClientComponentClient()

  useOnClickOutside(helpButtonRef, () => setShowHelp(false))

  useEffect(() => {
    async function fetchPartnerProfile() {
      try {
        // Get the hostname from window location
        const hostname = window.location.hostname

        if (hostname && hostname !== 'localhost') {
          const partner = await resolvePartnerByHost(supabase, hostname)
          if (partner) {
            setPartnerProfile(partner)
            
            // Fetch partner settings for code injection
            const { data: profile, error } = await supabase
              .from('UserProfiles')
              .select('header_code, body_code, footer_code')
              .eq('user_id', partner.user_id)
              .single();
            
            if (!error && profile) {
              setPartnerSettings({
                header_code: profile.header_code || '',
                body_code: profile.body_code || '',
                footer_code: profile.footer_code || '',
              });
            }
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
      }
    }

    fetchPartnerProfile()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="w-full max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-blue-600 font-semibold text-xl">
                {partnerProfile?.company_name || 'Quote AI'}
              </span>
            </Link>

            {/* Help Button */}
            <div ref={helpButtonRef} className="relative">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-full hover:bg-gray-800"
              >
                <HelpCircle size={20} />
                <span>Help</span>
              </button>

              {/* Help Dropdown */}
              {showHelp && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="p-3 space-y-3">
                    {/* Request callback */}
                    <a href="#" className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group transition-colors">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <PhoneCall className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">We'll call you</div>
                        <div className="font-medium text-gray-900">Request callback</div>
                      </div>
                    </a>

                    {/* Phone number */}
                    {partnerProfile?.phone && (
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">Speak to our team</div>
                        <a
                          href={`tel:${partnerProfile.phone}`}
                          className="font-medium text-gray-900 text-base hover:text-blue-600"
                        >
                          {partnerProfile.phone}
                        </a>
                        <div className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                          <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                          Lines are open
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Add padding-top to account for fixed header */}
      <main className="pt-16">
        {children}
      </main>
      
      {/* Partner Code Injection */}
      {partnerSettings && (
        <PartnerCodeInjection
          headerCode={partnerSettings.header_code}
          bodyCode={partnerSettings.body_code}
          footerCode={partnerSettings.footer_code}
        />
      )}
    </div>
  )
} 