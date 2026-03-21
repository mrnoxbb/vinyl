'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { fetchUnreadCount } from '@vinyl/shared/lib/notifications';
import { getInitials } from '@vinyl/shared/lib/utils';
import { createClient } from '../lib/supabase/client';

const NAV_LINKS = [
  { href: '/',              label: 'Home' },
  { href: '/search',        label: 'Search' },
  { href: '/explore',       label: 'Explore' },
  { href: '/notifications', label: 'Notifications' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const meta = data.user.user_metadata;
      setUsername(meta?.username ?? data.user.email?.split('@')[0] ?? null);
      setDisplayName(meta?.display_name ?? meta?.username ?? null);
      setAvatarUrl(meta?.avatar_url ?? null);
      fetchUnreadCount(supabase).then(setUnreadCount).catch(() => {});
    });
  }, []);

  // Clear badge when on notifications page
  useEffect(() => {
    if (pathname === '/notifications') setUnreadCount(0);
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = displayName ? getInitials(displayName) : username ? getInitials(username) : '?';

  return (
    <div className="vinyl-sidebar">
      <div className="sidebar-brand">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <h1 style={{ margin: 0, fontSize: '1.85rem', letterSpacing: '0.08em', color: '#fff' }}>VINYL</h1>
        </Link>
      </div>

      <nav className="sidebar-links" aria-label="Primary">
        {NAV_LINKS.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="sidebar-link"
              style={active ? { borderColor: '#E53935', background: 'rgba(229,57,53,0.1)' } : undefined}
            >
              <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {link.label}
                {link.href === '/notifications' && unreadCount > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, borderRadius: 9, background: '#E24B4A', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0 4px' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </strong>
            </Link>
          );
        })}
        {username && (
          <Link
            href={`/user/${username}`}
            className="sidebar-link"
            style={pathname.startsWith('/user/') ? { borderColor: '#E53935', background: 'rgba(229,57,53,0.1)' } : undefined}
          >
            <strong>Profile</strong>
          </Link>
        )}
      </nav>

      {/* User section */}
      {username ? (
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
            {avatarUrl ? <img src={avatarUrl} alt={displayName ?? username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <span style={{ flex: 1, fontSize: '0.875rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName || username}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}
          >
            Log out
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
          <Link href="/login" style={{ flex: 1, textAlign: 'center', padding: '0.6rem', borderRadius: 8, border: '1px solid #2a2a2a', color: '#a0a0a0', fontSize: '0.875rem' }}>
            Sign in
          </Link>
          <Link href="/signup" style={{ flex: 1, textAlign: 'center', padding: '0.6rem', borderRadius: 8, background: '#E53935', color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>
            Sign up
          </Link>
        </div>
      )}
    </div>
  );
}
