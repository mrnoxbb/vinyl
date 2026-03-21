import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Outfit, Playfair_Display, JetBrains_Mono } from 'next/font/google';

import { Sidebar } from '../components/Sidebar';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'VINYL',
  description: 'A social music review platform. Dark. Cinematic. Emotional.',
};

const MOBILE_LINKS = [
  { href: '/',       label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/explore',label: 'Explore' },
  { href: '/user',   label: 'Profile' },
];

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${playfair.variable} ${mono.variable} font-outfit text-text-primary vinyl-body antialiased`}>
        <div className="vinyl-shell">
          <aside>
            <Sidebar />
          </aside>
          <div className="vinyl-main">
            <main className="vinyl-content">{children}</main>
            <nav className="mobile-nav" aria-label="Mobile">
              {MOBILE_LINKS.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </body>
    </html>
  );
}
