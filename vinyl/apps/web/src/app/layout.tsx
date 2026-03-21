import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";

import { DARK_PALETTE } from "@vinyl/shared/lib/constants";

import { Sidebar } from "../components/Sidebar";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"]
});

const mobileLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/search", label: "Search" },
  { href: "/user/demo", label: "Profile" }
];

export const metadata: Metadata = {
  title: "VINYL",
  description: "A social music review platform for tracks, albums, artists, lists, and listening diaries."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: DARK_PALETTE.background }}>
      <body className={`${inter.className} vinyl-body`}>
        <div className="vinyl-shell">
          <aside>
            <Sidebar />
          </aside>
          <div className="vinyl-main">
            <main className="vinyl-content">{children}</main>
            <nav className="mobile-nav" aria-label="Mobile">
              {mobileLinks.map((item) => (
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
