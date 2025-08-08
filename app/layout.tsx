// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { createClient } from '@/utils/supabase/server';
import Loader from '@/components/Loader';
import { Metadata } from 'next';
import MainHeader from '@/components/MainHeader';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nu-Home',
  description: 'Home services and products',
  metadataBase: new URL('http://localhost:3000'),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col h-screen bg-gray-50">
          {/* Main content */}
          <div className="flex-1 flex flex-col">
            <MainHeader isLoggedIn={isLoggedIn} />

            {/* Main content area */}
            <main className="">
              <Loader />
              {children}
            </main>
           
          </div>
        </div>
    
      </body>
    </html>
  );
}