"use client";

import '.././globals.css';
import { Inter } from 'next/font/google';
import { Home, ClipboardList, Layers, User, MapPin } from 'lucide-react';
import Loader from '@/components/Loader';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

// Navigation items for admin sidebar
const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/form-questions', label: 'Form Questions', icon: ClipboardList, section: 'Content Management' },
  { href: '/admin/service-categories', label: 'Categories', icon: Layers },
  { href: '/admin/category-requests', label: 'Service Category Requests', icon: ClipboardList },
  { href: '/admin/products', label: 'Products', icon: Layers, section: 'Products & Addons' },
  { href: '/admin/addons', label: 'Addons', icon: Layers },
  { href: '/admin/partners', label: 'Partners', icon: User, section: 'User Management' },
  { href: '/admin/field-mappings', label: 'Field Mappings', icon: MapPin, section: 'Configuration' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        navItems={adminNavItems}
        showProfile={true}
        profileType="admin"
      />

      {/* Main content */}
      <div className="md:ml-60">
        {/* Main content area */}
        <main className="flex-1 p-0 relative">
          {children}
          {/* Content area loader */}
          <Loader minDisplayTime={0} />
        </main>
      </div>
    </div>
  );
}