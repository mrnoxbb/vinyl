import type { Metadata } from 'next';

import { fetchNotifications } from '@vinyl/shared/lib/notifications';

import { createClient } from '../../lib/supabase/server';
import { NotificationsClient } from '../../components/NotificationsClient';

export const metadata: Metadata = { title: 'Notifications | VINYL' };

export default async function NotificationsPage() {
  const supabase = await createClient();

  const [notifResult, userResult] = await Promise.all([
    fetchNotifications(supabase, 50).catch(() => []),
    supabase.auth.getUser(),
  ]);

  // Fetch actor usernames for each notification
  const actorIds = [...new Set(notifResult.map(n => n.actorId).filter(Boolean))] as string[];
  let actorMap: Record<string, { username: string; avatarUrl: string | null; displayName: string }> = {};

  if (actorIds.length > 0) {
    const { data } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .in('id', actorIds);

    for (const row of data ?? []) {
      actorMap[row.id as string] = {
        username: row.username as string,
        displayName: (row.display_name as string | null) ?? (row.username as string),
        avatarUrl: (row.avatar_url as string | null) ?? null,
      };
    }
  }

  const notifications = notifResult.map(n => ({
    ...n,
    actor: n.actorId ? actorMap[n.actorId] ?? null : null,
  }));

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <NotificationsClient
          initialNotifications={notifications}
          currentUserId={userResult.data.user?.id ?? null}
        />
      </div>
    </main>
  );
}
