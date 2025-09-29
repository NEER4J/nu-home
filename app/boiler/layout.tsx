import { Inter } from 'next/font/google';
import Header from '@/components/category-commons/header';
import Footer from '@/components/category-commons/footer';
import { PartnerCodeWrapper } from '@/components/PartnerCodeWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Boiler Services | Quote AI',
  description: 'Get expert boiler installation, repair, and maintenance services. Compare quotes from trusted local engineers.',
};

export default function BoilerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer hideOnPages={['/quote']} />
      <PartnerCodeWrapper />
    </div>
  );
}
