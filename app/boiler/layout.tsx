import { Inter } from 'next/font/google';
import Header from '@/components/category-commons/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Boiler Services | Nu-Home',
  description: 'Get expert boiler installation, repair, and maintenance services. Compare quotes from trusted local engineers.',
};

export default function BoilerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        {children}
      </main>
    </div>
  );
}
