import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'The Singular Choice — Luxury Concierge',
  description: 'Experiencias de viaje de lujo a medida. Tu portal privado, tu asesor personal, tu historia única.',
  keywords: ['luxury travel', 'concierge', 'viajes de lujo', 'portal privado', 'the singular choice'],
  authors: [{ name: 'The Singular Choice' }],
  openGraph: {
    title: 'The Singular Choice — Luxury Concierge',
    description: 'No vendemos viajes. Diseñamos historias irrepetibles.',
    type: 'website',
    locale: 'es_ES',
    siteName: 'The Singular Choice',
  },
  icons: {
    icon: '/Emblema-TSC.png',
    apple: '/Emblema-TSC.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}