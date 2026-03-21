'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { NotificationRecord } from '@vinyl/shared/lib/notifications';
import { markAllNotificationsRead } from '@vinyl/shared/lib/notifications';
import { getInitials, timeAgo } from '@vinyl/shared/lib/utils';

import { createClient } from '../lib/supabase/client';

type Actor = { username: string; displayName: string; avatarUrl: string | null };
type NotifWithActor = NotificationRecord & { actor: Actor | null };

type Props = {
  initialNotifications: NotifWithActor[];
  currentUserId: string | null;
};

function notifText(n: NotifWithActor): string {
  const name = n.actor?.displayName ?? n.actor?.username ?? 'Someone';
  if (n.type === 'follow') return `${name} followed you`;
  if (n.type === 'like') return `${name} liked your review`;
  if (n.type === 'comment') return `${name} commented on your review`;
  return `${name} interacted with your content`;
}

function notifHref(n: NotifWithActor): string {
  if (n.type === 'follow' && n.actor) return `/user/${n.actor.username}`;
  if (n.reviewId && n.reviewType) return `/item/${n.reviewId}?type=${n.reviewType}`;
  return '/notifications';
}

export function NotificationsClient({ initialNotifications, currentUserId }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [marking, setMarking] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark all read on mount
  useEffect(() => {
    if (!currentUserId || unreadCount === 0) return;
    const supabase = createClient();
    markAllNotificationsRead(supabase)
      .then(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))))
      .catch(() => {});
  }, []);

  async function handleMarkAll() {
    setMarking(true);
    const supabase = createClient();
    try {
      await markAllNotificationsRead(supabase);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // ignore
    } finally {
      setMarking(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        {unreadCount > 0 && (
          <button
            className="text-sm text-[#534AB7] hover:text-[#7F77DD] transition-colors"
            onClick={handleMarkAll}
            disabled={marking}
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#a0a0a0] text-base mb-2">No notifications yet</p>
          <p className="text-[#666] text-sm">
            When someone follows you or likes your review, it will appear here
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {notifications.map(n => {
            const initials = n.actor
              ? getInitials(n.actor.displayName || n.actor.username)
              : '?';

            return (
              <a
                key={n.id}
                href={notifHref(n)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-[#111] ${
                  !n.read ? 'bg-[#534AB7]/5' : ''
                }`}
              >
                {/* Unread dot */}
                <div className="w-2 h-2 flex-shrink-0">
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-[#534AB7]" />
                  )}
                </div>

                {/* Actor avatar */}
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                  style={{ background: n.actor?.avatarUrl ? 'transparent' : '#534AB7' }}
                >
                  {n.actor?.avatarUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={n.actor.avatarUrl} alt={n.actor.displayName} className="w-full h-full object-cover" />
                    : initials}
                </div>

                <p className="flex-1 text-sm text-[#a0a0a0] leading-snug">
                  <span className="text-white font-medium">
                    {n.actor?.displayName ?? n.actor?.username ?? 'Someone'}
                  </span>{' '}
                  {notifText(n).replace((n.actor?.displayName ?? n.actor?.username ?? 'Someone') + ' ', '')}
                </p>

                <span className="text-[#666] text-xs flex-shrink-0">{timeAgo(n.createdAt)}</span>
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
