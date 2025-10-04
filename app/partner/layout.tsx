"use client";

import '../globals.css';
import { Inter } from 'next/font/google';
import { Home, Package, Grid, Blocks, Tag, Gift, Mail, Settings2, UserRound, Settings, Megaphone, Star } from 'lucide-react';
import Loader from '@/components/Loader';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

// Navigation items for partner sidebar
const partnerNavItems = [
  { href: '/partner', label: 'Dashboard', icon: Home },
  { href: '/partner/my-products', label: 'Products', icon: Package, section: 'Products & Addons' },
  { href: '/partner/addons', label: 'Addons', icon: Blocks },
  { href: '/partner/admin-products', label: 'Products Catalogue', icon: Tag },
  { href: '/partner/admin-addons', label: 'Addons Catalogue', icon: Gift },
  { href: '/partner/highlights', label: 'Announcements', icon: Megaphone, section: 'Marketing' },
  { href: '/partner/key-points', label: 'Key Points', icon: Star, section: 'Marketing' },
  { href: '/partner/leads', label: 'Leads', icon: UserRound, section: 'Leads' },
  { href: '/partner/category-access', label: 'Services', icon: Grid, section: 'Account' },
  { href: '/partner/notifications', label: 'Emails', icon: Mail },
  { href: '/partner/configuration', label: 'Service Configuration', icon: Settings2 },
  { href: '/partner/settings', label: 'Settings', icon: Settings },
];

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        navItems={partnerNavItems}
        showProfile={true}
        profileType="partner"
      />

      {/* Main content */}
      <div className="md:ml-60">
        {/* Main content area */}
        <main className="flex-1 p-0 relative"> 
          {children}
          {/* Content area loader - set minDisplayTime to 2000ms for testing, 0 for normal operation */}
          <Loader minDisplayTime={0} />
        </main>
      </div>
    </div>
  );
} 