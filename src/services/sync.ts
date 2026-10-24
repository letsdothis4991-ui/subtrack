import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { mergeDocs, sameDoc, type SyncDoc } from '../lib/sync';
import { useStore } from '../store';
import { supabase } from './supabase';

type Status = 'signed-out' | 'idle' | 'syncing' | 'error';

interface SyncState {
  status: Status;
  email: string | null;
  lastSynced: string | null;
  error: string | null;
}

export const useSync = create<SyncState>(() => ({ status: 'signed-out', email: null, lastSynced: null, error: null }));

const TABLE = 'user_data';
let running: Promise<void> | null = null;
let again = false;

/** Pull → merge → apply locally → push if the cloud copy is behind. Coalesces overlapping calls. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function syncOnce() {
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getSession();
  const user = auth.session?.user;
  if (!user) {
    useSync.setState({ status: 'signed-out', email: null });
    return;
  }
  useSync.setState({ status: 'syncing', email: user.email ?? null, error: null });
  try {
    const { data, error } = await supabase.from(TABLE).select('doc').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    const remote = (data?.doc as SyncDoc | undefined) ?? null;
    const local = useStore.getState().syncDoc();
    const merged = remote ? mergeDocs(local, remote) : local;
    if (!sameDoc(merged, local)) useStore.getState().applySyncDoc(merged);
    if (!remote || !sameDoc(merged, remote)) {
      const { error: upErr } = await supabase.from(TABLE).upsert({ user_id: user.id, doc: merged, updated_at: new Date().toISOString() });
      if (upErr) throw upErr;
    }
    useSync.setState({ status: 'idle', lastSynced: new Date().toISOString() });
  } catch (e) {
    useSync.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

export async function sendCode(email: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is not configured in this build.');
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(email: string, code: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  if (error) throw error;
  await syncNow();
}

/** Google sign-in redirects the page, so it's offered on the web; the app uses an emailed code. */
export const googleSignInSupported = Platform.OS === 'web';

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
  useSync.setState({ status: 'signed-out', email: null, lastSynced: null });
}

/** Deletes the cloud copy and the account (data on this device stays). */
export async function deleteAccount(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await signOut();
}

export async function accessToken(): Promise<string | null> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token ?? null;
}

/** Keeps the cloud copy up to date: on sign-in, on app foreground, and shortly after each change. */
export function useAutoSync() {
  useEffect(() => {
    if (!supabase) return;
    syncNow();
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') syncNow();
      if (event === 'SIGNED_OUT') useSync.setState({ status: 'signed-out', email: null });
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubStore = useStore.subscribe((s, prev) => {
      if (s.subscriptions === prev.subscriptions && s.categories === prev.categories && s.settings === prev.settings && s.deleted === prev.deleted) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (useSync.getState().status !== 'signed-out') syncNow();
      }, 2500);
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow();
    });
    return () => {
      authSub.subscription.unsubscribe();
      unsubStore();
      appSub.remove();
      clearTimeout(timer);
    };
  }, []);
}
