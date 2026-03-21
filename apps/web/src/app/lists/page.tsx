import type { Metadata } from 'next';

import { fetchUserLists } from '@vinyl/shared/lib/lists';

import { createClient } from '../../lib/supabase/server';
import { ListsClient } from '../../components/ListsClient';

export const metadata: Metadata = { title: 'My Lists | VINYL' };

export default async function ListsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const lists = user
    ? await fetchUserLists(supabase, user.id, true).catch(() => [])
    : [];

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ListsClient initialLists={lists} />
      </div>
    </main>
  );
}
