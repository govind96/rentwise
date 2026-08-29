import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'RentWise — Property management for PGs and hostels',
  description: 'Manage rooms, residents, rent, maintenance and documents for Indian PGs and hostels from one owner workspace.',
  icons: { icon: '/rentwise-mark.png', apple: '/rentwise-mark.png' },
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
  const themeScript = `(function(){try{var saved=localStorage.getItem('rentwise-theme');var theme=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch(e){}})()`;
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body>{children}</body></html>;
}
