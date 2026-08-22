import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'RentWise — Property operations made simple',
  description: 'Manage rooms, tenants, deposits and rent collections without spreadsheets.',
  openGraph: {
    title: 'RentWise',
    description: 'Rooms, tenants and rent — in one place.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'RentWise property management dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RentWise',
    description: 'Rooms, tenants and rent — in one place.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
