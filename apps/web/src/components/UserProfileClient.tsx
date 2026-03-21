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
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-xl font-bold text-white overflow-hidden"
            style={{ background: profile.avatarUrl ? 'transparent' : '#534AB7' }}
          >
            {profile.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
              : initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{profile.displayName}</h1>
              {profile.isCriticVerified && (
                <span className="text-xs bg-[#1D9E75]/20 text-[#1D9E75] px-2 py-0.5 rounded-full">✓ Critic</span>
              )}
            </div>
            <p className="text-[#a0a0a0] text-sm">@{profile.username}</p>
            <span
              className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: `${levelColor}22`, color: levelColor }}
            >
              {profile.level}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex-shrink-0">
            {isOwnProfile ? (
              <button className="border border-[#534AB7] text-[#534AB7] rounded-lg px-4 py-2 text-sm hover:bg-[#534AB7] hover:text-white transition-colors">
                Edit Profile
              </button>
            ) : currentUserId ? (
              <button
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  following
                    ? 'border border-[#2a2a2a] text-[#a0a0a0] hover:border-[#E24B4A] hover:text-[#E24B4A]'
                    : 'bg-[#534AB7] text-white hover:bg-[#4a42a3]'
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
        <div className="flex gap-6 text-center">
          {[
            { label: 'Reviews', value: reviews.length },
            { label: 'Followers', value: followerCount },
            { label: 'Following', value: followCounts.following },
          ].map(s => (
            <div key={s.label}>
              <p className="text-white font-bold text-lg leading-tight">{s.value}</p>
              <p className="text-[#a0a0a0] text-xs">{s.label}</p>
            </div>
          ))}
          {profile.reviewStreak > 0 && (
            <div>
              <p className="text-white font-bold text-lg leading-tight">🔥 {profile.reviewStreak}</p>
              <p className="text-[#a0a0a0] text-xs">Day streak</p>
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
      <div className="flex border-b border-[#2a2a2a] mb-6">
        {(['reviews', 'lists'] as Tab[]).map(t => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-[#534AB7] text-white'
                : 'border-transparent text-[#a0a0a0] hover:text-white'
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'reviews' ? `Reviews (${reviews.length})` : `Lists (${initialLists.length})`}
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
