import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'RentWise — AI-native property operations',
  description: 'The AI operating system for Indian PGs and hostels: rent, occupancy, maintenance and documents — on autopilot.',
  openGraph: {
    title: 'RentWise',
    description: 'Your property, tenants and rent — clearly under control.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'RentWise property management dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RentWise',
    description: 'Your property, tenants and rent — clearly under control.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
