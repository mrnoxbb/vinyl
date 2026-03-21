import type { Metadata } from 'next';

import { fetchDiaryEntries } from '@vinyl/shared/lib/diary';

import { createClient } from '../../lib/supabase/server';
import { DiaryClient } from '../../components/DiaryClient';

export const metadata: Metadata = { title: 'Diary | VINYL' };

export default async function DiaryPage() {
  const supabase = await createClient();
  const entries = await fetchDiaryEntries(supabase).catch(() => []);

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <DiaryClient initialEntries={entries} />
      </div>
    </main>
  );
}
