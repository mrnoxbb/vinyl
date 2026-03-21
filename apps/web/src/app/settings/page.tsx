'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '../../lib/supabase/client';

type NotifSettings = {
  newFollower: boolean;
  reviewLiked: boolean;
  reviewCommented: boolean;
};

function Toast({ message, color = '#1D9E75', onDone }: { message: string; color?: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, background: '#111111', border: `1px solid ${color}`, color, borderRadius: 12, padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500 }}>
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [notifSettings, setNotifSettings] = useState<NotifSettings | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [toastColor, setToastColor] = useState('#1D9E75');

  function showToast(msg: string, color = '#1D9E75') {
    setToast(msg);
    setToastColor(color);
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      setEmail(user.email ?? '');

      // Load profile from users table
      const { data } = await supabase
        .from('users')
        .select('username, display_name')
        .eq('id', user.id)
        .single();
      if (data) {
        setUsername(data.username as string ?? '');
        setDisplayName((data.display_name as string | null) ?? '');
      }

      // Load notification settings
      const { data: ns } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (ns) {
        setNotifSettings({
          newFollower: Boolean(ns.new_follower),
          reviewLiked: Boolean(ns.review_liked),
          reviewCommented: Boolean(ns.review_commented),
        });
      } else {
        // Create default row if not exists
        await supabase
          .from('notification_settings')
          .insert({ user_id: user.id, new_follower: true, review_liked: true, review_commented: true });
        setNotifSettings({ newFollower: true, reviewLiked: true, reviewCommented: true });
      }
    });
  }, [router]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setProfileError('');

    const usernameRe = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRe.test(username)) {
      setProfileError('Username must be 3–20 characters: letters, numbers, underscores only.');
      return;
    }

    setProfileLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('users')
      .update({ username: username.trim(), display_name: displayName.trim() || null })
      .eq('id', userId);
    setProfileLoading(false);

    if (error) {
      setProfileError(error.message.includes('duplicate') || error.message.includes('unique')
        ? 'That username is already taken.'
        : error.message);
      return;
    }
    showToast('Profile updated');
  }

  async function handleNotifToggle(key: keyof NotifSettings) {
    if (!userId || !notifSettings) return;
    const newVal = !notifSettings[key];
    setNotifSettings(prev => prev ? { ...prev, [key]: newVal } : prev);
    const colMap: Record<keyof NotifSettings, string> = {
      newFollower: 'new_follower',
      reviewLiked: 'review_liked',
      reviewCommented: 'review_commented',
    };
    const supabase = createClient();
    await supabase
      .from('notification_settings')
      .update({ [colMap[key]]: newVal })
      .eq('user_id', userId);
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    setDeleteLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeleteLoading(false); return; }

    const { error } = await supabase.functions.invoke('delete-account', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) {
      setDeleteError(error.message || 'Failed to delete account.');
      setDeleteLoading(false);
      return;
    }
    await supabase.auth.signOut();
    router.push('/signup');
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        {/* Profile */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
          <form onSubmit={handleSaveProfile}>
            <div className="mb-4">
              <label className="block text-[#a0a0a0] text-sm mb-1.5">Display name</label>
              <input
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:border-[#534AB7] focus:outline-none placeholder:text-[#666666]"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-[#a0a0a0] text-sm mb-1.5">Username</label>
              <input
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:border-[#534AB7] focus:outline-none placeholder:text-[#666666]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
              />
              <p className="text-[#666666] text-xs mt-1">3–20 chars, letters, numbers, underscores</p>
            </div>
            {profileError && <p className="text-[#E24B4A] text-sm mb-3">{profileError}</p>}
            <button
              type="submit"
              disabled={profileLoading}
              className="bg-[#534AB7] text-white rounded-lg px-4 py-2 hover:bg-[#4a42a3] transition-colors font-medium text-sm"
            >
              {profileLoading ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Account */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <div className="mb-4">
            <label className="block text-[#a0a0a0] text-sm mb-1.5">Email address</label>
            <p className="text-white text-sm">{email}</p>
          </div>
          <a href="/forgot-password" className="text-[#534AB7] text-sm hover:text-[#7F77DD] transition-colors">
            Change password →
          </a>
        </div>

        {/* Notifications */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
          {notifSettings && (
            <div className="flex flex-col gap-4">
              {([
                { key: 'newFollower', label: 'New follower notifications' },
                { key: 'reviewLiked', label: 'Review liked notifications' },
                { key: 'reviewCommented', label: 'Comment notifications' },
              ] as { key: keyof NotifSettings; label: string }[]).map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-[#a0a0a0]">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifSettings[key]}
                    onClick={() => handleNotifToggle(key)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: notifSettings[key] ? '#534AB7' : '#2a2a2a',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3, left: notifSettings[key] ? 23 : 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-[#111111] border rounded-xl p-6" style={{ borderColor: 'rgba(226,75,74,0.3)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#E24B4A' }}>Danger zone</h2>
          <p className="text-[#a0a0a0] text-sm mb-4">Permanently delete your account and all associated data.</p>
          <button
            onClick={() => setDeleteOpen(true)}
            className="border border-[#E24B4A] text-[#E24B4A] rounded-lg px-4 py-2 hover:bg-[#E24B4A] hover:text-white transition-colors text-sm"
          >
            Delete account
          </button>
        </div>
      </div>

      {/* Delete confirm dialog */}
      {deleteOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111111', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 }}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Delete your account?</h3>
            <p style={{ color: '#a0a0a0', fontSize: '0.875rem', marginBottom: 20 }}>
              This will permanently delete all your reviews, lists, diary entries, and profile. This cannot be undone.
            </p>
            {deleteError && <p style={{ color: '#E24B4A', fontSize: '0.875rem', marginBottom: 12 }}>{deleteError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setDeleteOpen(false); setDeleteError(''); }}
                className="border border-[#2a2a2a] text-[#a0a0a0] rounded-lg px-4 py-2 text-sm hover:text-white transition-colors flex-1"
                disabled={deleteLoading}
              >Cancel</button>
              <button
                onClick={handleDeleteAccount}
                className="border border-[#E24B4A] text-[#E24B4A] rounded-lg px-4 py-2 text-sm hover:bg-[#E24B4A] hover:text-white transition-colors flex-1"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting…' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} color={toastColor} onDone={() => setToast(null)} />}
    </main>
  );
}
