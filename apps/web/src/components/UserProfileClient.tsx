'use client';

import { useState } from 'react';
import Link from 'next/link';

import type { Review } from '@vinyl/shared/types/review';
import type { UserList } from '@vinyl/shared/lib/lists';
import type { Badge } from '@vinyl/shared/lib/gamification';
import { followUser, unfollowUser } from '@vinyl/shared/lib/notifications';
import { getInitials, timeAgo } from '@vinyl/shared/lib/utils';

import { createClient } from '../lib/supabase/client';
import { HalfStarDisplay } from './HalfStarDisplay';
import { ReviewCard } from './ReviewCard';

type Profile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: string;
  reviewStreak: number;
  isCriticVerified: boolean;
};

type BadgeDef = {
  icon: string;
  label: string;
  bg: string;
  border: string;
  color: string;
  description: string;
};

const BADGE_DEFS: Record<string, BadgeDef> = {
  streak_7:       { icon: '🔥', label: '7-Day Streak',   bg: '#2D1A00', border: '#BA7517', color: '#BA7517', description: 'Reviewed music 7 days in a row' },
  streak_30:      { icon: '🔥', label: '30-Day Streak',  bg: '#2D1A00', border: '#EF9F27', color: '#EF9F27', description: 'Reviewed music 30 days in a row' },
  streak_100:     { icon: '🔥', label: '100-Day Streak', bg: '#2D1A00', border: '#FAC775', color: '#FAC775', description: 'Reviewed music 100 days in a row' },
  first_review:   { icon: '⭐', label: 'First Review',   bg: '#1A1A2E', border: '#534AB7', color: '#7F77DD', description: 'Posted your first review' },
  reviews_100:    { icon: '📝', label: '100 Reviews',    bg: '#1A1A2E', border: '#534AB7', color: '#AFA9EC', description: 'Posted 100 reviews' },
  helpful_critic: { icon: '👍', label: 'Helpful Critic', bg: '#0a1f1a', border: '#1D9E75', color: '#1D9E75', description: 'Received 50+ helpful votes' },
};

type Props = {
  profile: Profile;
  followCounts: { followers: number; following: number };
  initialReviews: Review[];
  initialLists: UserList[];
  badges: Badge[];
  isOwnProfile: boolean;
  initialFollowing: boolean;
  currentUserId: string | null;
};

const LEVEL_COLORS: Record<string, string> = {
  Listener: '#666',
  Critic: '#38bdf8',
  Connoisseur: '#534AB7',
  Legend: '#BA7517',
};

type Tab = 'reviews' | 'lists';
type Filter = 'all' | 'track' | 'album' | 'artist';

export function UserProfileClient({
  profile,
  followCounts,
  initialReviews,
  initialLists,
  badges,
  isOwnProfile,
  initialFollowing,
  currentUserId,
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(followCounts.followers);
  const [followLoading, setFollowLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('reviews');
  const [filter, setFilter] = useState<Filter>('all');
  const [reviews, setReviews] = useState(initialReviews);

  const initials = getInitials(profile.displayName);
  const levelColor = LEVEL_COLORS[profile.level] ?? '#666';

  const filteredReviews = filter === 'all'
    ? reviews
    : reviews.filter(r => r.kind === filter);

  async function handleFollow() {
    if (!currentUserId) return;
    setFollowLoading(true);
    const supabase = createClient();
    try {
      if (following) {
        await unfollowUser(supabase, profile.id);
        setFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      } else {
        await followUser(supabase, profile.id);
        setFollowing(true);
        setFollowerCount(c => c + 1);
      }
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  }

  function handleReviewDeleted(id: string) {
    setReviews(prev => prev.filter(r => r.id !== id));
  }

  function handleReviewEdited(updated: Review) {
    setReviews(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  return (
    <>
      {/* Profile header */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8 mb-8 shadow-cinematic relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E53935]/5 rounded-full blur-[80px] -mr-10 -mt-20 pointer-events-none" />
        
        <div className="relative flex items-start gap-6 mb-6">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-full flex-shrink-0 flex items-center justify-center text-3xl font-playfair font-bold text-white overflow-hidden border-2 border-[#1a1a1a] shadow-lg shadow-black/50"
            style={{ background: profile.avatarUrl ? 'transparent' : '#111' }}
          >
            {profile.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
              : initials}
          </div>

          <div className="flex-1 min-w-0 flex flex-col pt-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-3xl font-playfair font-bold text-white tracking-tight leading-none">{profile.displayName}</h1>
              {profile.isCriticVerified && (
                <span className="text-[0.65rem] font-mono tracking-widest uppercase bg-[#E53935]/10 text-[#E53935] px-2 py-0.5 rounded border border-[#E53935]/20">Critic</span>
              )}
            </div>
            <p className="text-[#888] font-outfit text-sm">@{profile.username}</p>
            <span
              className="inline-block mt-3 text-[0.65rem] font-mono tracking-widest uppercase px-2.5 py-1 rounded"
              style={{ background: `${levelColor}15`, border: `1px solid ${levelColor}30`, color: levelColor }}
            >
              {profile.level}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex-shrink-0 pt-2 z-10">
            {isOwnProfile ? (
              <button className="button py-1.5 px-4 text-sm font-outfit">
                Edit Profile
              </button>
            ) : currentUserId ? (
              <button
                className={`button py-1.5 px-4 text-sm font-outfit ${
                  following
                    ? 'border border-white/10 text-[#a0a0a0] hover:border-[#E53935] hover:text-[#E53935]'
                    : 'button-primary'
                }`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-6 sm:gap-8 border-t border-white/5 pt-6 relative z-10">
          {[
            { label: 'Reviews', value: reviews.length },
            { label: 'Followers', value: followerCount },
            { label: 'Following', value: followCounts.following },
          ].map(s => (
            <div key={s.label} className="flex flex-col">
              <span className="font-playfair text-2xl font-bold text-white mb-0.5">{s.value}</span>
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#666]">{s.label}</span>
            </div>
          ))}
          {profile.reviewStreak > 0 && (
            <div className="flex flex-col border-l border-white/10 pl-8 ml-auto text-right">
              <span className="font-playfair text-2xl font-bold text-[#E53935] mb-0.5">{profile.reviewStreak}</span>
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#E53935]/60 block w-full">Day Streak 🔥</span>
            </div>
          )}
        </div>

        {/* Badge shelf */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#1a1a1a]">
            {badges.map(badge => {
              const def = BADGE_DEFS[badge.badgeType];
              if (!def) return null;
              return (
                <span
                  key={badge.id}
                  title={def.description}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 9999,
                    background: def.bg, border: `1px solid ${def.border}`,
                    color: def.color, fontSize: '0.75rem', fontWeight: 500,
                    cursor: 'default',
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>{def.icon}</span>
                  {def.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/5 mb-8">
        {(['reviews', 'lists'] as Tab[]).map(t => (
          <button
            key={t}
            className={`pb-3 font-outfit text-sm tracking-wide transition-colors relative ${
              tab === t
                ? 'text-white font-medium'
                : 'text-[#666] hover:text-[#a0a0a0]'
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'reviews' ? `Reviews (${reviews.length})` : `Lists (${initialLists.length})`}
            {tab === t && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E53935]" />}
          </button>
        ))}
      </div>

      {/* Reviews tab */}
      {tab === 'reviews' && (
        <>
          {/* Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'track', 'album', 'artist'] as Filter[]).map(f => (
              <button
                key={f}
                className={`text-sm px-3 py-1 rounded-lg capitalize transition-colors ${
                  filter === f
                    ? 'bg-[#534AB7] text-white'
                    : 'text-[#a0a0a0] hover:text-white border border-[#2a2a2a]'
                }`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f + 's'}
              </button>
            ))}
          </div>

          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#a0a0a0]">No reviews yet</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1">
              {filteredReviews.map(r => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  currentUserId={currentUserId}
                  onDeleted={handleReviewDeleted}
                  onEdited={handleReviewEdited}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Lists tab */}
      {tab === 'lists' && (
        <>
          {initialLists.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#a0a0a0]">No public lists yet</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {initialLists.map(list => (
                <div key={list.id} className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-white text-sm font-semibold leading-tight">{list.title}</h3>
                    {isOwnProfile && !list.isPublic && (
                      <span className="text-xs text-[#666] bg-[#1a1a1a] px-1.5 py-0.5 rounded flex-shrink-0">Private</span>
                    )}
                  </div>
                  {list.description && (
                    <p className="text-[#a0a0a0] text-xs mt-1 line-clamp-2">{list.description}</p>
                  )}
                  <p className="text-[#666] text-xs mt-2">{timeAgo(list.updatedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
