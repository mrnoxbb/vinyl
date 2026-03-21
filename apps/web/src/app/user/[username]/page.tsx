import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { fetchUserReviews } from '@vinyl/shared/lib/reviews';
import { fetchUserLists } from '@vinyl/shared/lib/lists';
import { getFollowCounts, isFollowing } from '@vinyl/shared/lib/notifications';

import { createClient } from '../../../lib/supabase/server';
import { UserProfileClient } from '../../../components/UserProfileClient';

type Props = { params: { username: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('display_name, avatar_url')
    .eq('username', params.username)
    .maybeSingle();

  if (!data) return { title: 'VINYL' };

  const displayName = (data.display_name as string | null) ?? params.username;
  const title = `@${params.username} — VINYL`;
  const description = `${displayName}'s music reviews on VINYL`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: data.avatar_url ? [{ url: data.avatar_url as string }] : [],
    },
    twitter: { card: 'summary' },
  };
}

export default async function UserPage({ params }: Props) {
  const supabase = await createClient();

  const { data: profileRow } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, level, review_streak, is_critic_verified, created_at')
    .eq('username', params.username)
    .maybeSingle();

  if (!profileRow) notFound();

  const profileId = profileRow.id as string;

  const [followCounts, reviews, lists, authResult] = await Promise.all([
    getFollowCounts(supabase, profileId).catch(() => ({ followers: 0, following: 0 })),
    fetchUserReviews(supabase, profileId).catch(() => []),
    fetchUserLists(supabase, profileId, false).catch(() => []),
    supabase.auth.getUser(),
  ]);

  const currentUser = authResult.data.user;
  const isOwnProfile = currentUser?.id === profileId;
  const followingAlready = currentUser && !isOwnProfile
    ? await isFollowing(supabase, currentUser.id, profileId).catch(() => false)
    : false;

  const profile = {
    id: profileId,
    username: profileRow.username as string,
    displayName: (profileRow.display_name as string | null) ?? (profileRow.username as string),
    avatarUrl: (profileRow.avatar_url as string | null) ?? null,
    level: (profileRow.level as string) ?? 'Listener',
    reviewStreak: Number(profileRow.review_streak ?? 0),
    isCriticVerified: Boolean(profileRow.is_critic_verified),
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <UserProfileClient
          profile={profile}
          followCounts={followCounts}
          initialReviews={reviews}
          initialLists={lists}
          isOwnProfile={isOwnProfile}
          initialFollowing={followingAlready}
          currentUserId={currentUser?.id ?? null}
        />
      </div>
    </main>
  );
}
