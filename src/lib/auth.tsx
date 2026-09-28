import type { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Database } from './database.types';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type Profile = Database['public']['Tables']['users']['Row'];

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  /** True until the stored session and the profile row have been loaded. */
  loading: boolean;
  /** True after opening a password-reset link, until a new password is saved. */
  passwordRecovery: boolean;
  refreshProfile: () => Promise<void>;
  finishPasswordRecovery: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

/** Where Supabase sends people back after Google, email confirmation and password reset. */
const redirectTo = () => makeRedirectUri();

/** Turns the tokens in a Supabase redirect URL into a signed-in session. */
async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(params.error_description ?? errorCode);

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return null;

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return { session: data.session, isRecovery: params.type === 'recovery' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const url = Linking.useLinkingURL();
  const userId = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    setProfile(data);
    setProfileLoaded(true);
  }, [userId]);

  useEffect(() => {
    setProfileLoaded(false);
    refreshProfile();
  }, [refreshProfile]);

  // Email-confirmation and password-reset links open the app with tokens in the URL.
  useEffect(() => {
    if (!url) return;
    createSessionFromUrl(url)
      .then((result) => {
        if (result?.isRecovery) setPasswordRecovery(true);
      })
      .catch(() => {});
  }, [url]);

  const value: AuthState = {
    session,
    profile,
    loading: !sessionLoaded || (!!session && !profileLoaded),
    passwordRecovery,
    refreshProfile,
    finishPasswordRecovery: () => setPasswordRecovery(false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/* ── Actions ──────────────────────────────────────────────────────────── */

/** Opens Google in a browser sheet; resolves once the user is signed in (or cancelled). */
export async function signInWithGoogle() {
  const returnUrl = redirectTo();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: returnUrl, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, returnUrl);
  if (result.type === 'success') await createSessionFromUrl(result.url);
}

/** Returns true when Supabase needs the user to confirm their email first. */
export async function signUpWithEmail(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: redirectTo() },
  });
  if (error) throw error;
  return !data.session;
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
  if (error) throw error;
}

/** Adds or changes the password on the signed-in account (works for Google/Apple accounts too). */
export async function setPassword(userId: string, password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  await supabase.from('users').update({ has_password: true }).eq('id', userId);
}

export async function signOut() {
  await supabase.auth.signOut();
}

export const MIN_PASSWORD_LENGTH = 8;
