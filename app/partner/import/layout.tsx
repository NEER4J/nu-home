import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Import Products - Partner Dashboard',
  description: 'Import products from your WordPress site',
};

export default function ImportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 