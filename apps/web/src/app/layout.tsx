import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';

import { Sidebar } from '../components/Sidebar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VINYL',
  description: 'A social music review platform. Rate, review, and discover music together.',
};

const MOBILE_LINKS = [
  { href: '/',       label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/explore',label: 'Explore' },
  { href: '/user',   label: 'Profile' },
];

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" style={{ backgroundColor: '#0a0a0a' }}>
      <body className={`${inter.className} vinyl-body`}>
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
