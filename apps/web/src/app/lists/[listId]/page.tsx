import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { fetchListDetail } from '@vinyl/shared/lib/lists';

import { createClient } from '../../../lib/supabase/server';
import { ListDetailClient } from '../../../components/ListDetailClient';

type Props = { params: { listId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const list = await fetchListDetail(supabase, params.listId).catch(() => null);
  if (!list) return { title: 'List | VINYL' };
  return {
    title: `${list.title} — VINYL`,
    description: `A curated list of ${list.items.length} music items`,
  };
}

export default async function ListDetailPage({ params }: Props) {
  const supabase = await createClient();

  const [list, userResult] = await Promise.all([
    fetchListDetail(supabase, params.listId).catch(() => null),
    supabase.auth.getUser(),
  ]);

  if (!list) notFound();

  const currentUserId = userResult.data.user?.id ?? null;

  // Private lists are only accessible by the owner
  if (!list.isPublic && currentUserId !== list.userId) notFound();

  const isOwner = currentUserId === list.userId;

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ListDetailClient list={list} isOwner={isOwner} />
      </div>
    </main>
  );
}
