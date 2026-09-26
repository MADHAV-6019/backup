import { createClient } from '@supabase/supabase-js';



const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;

export function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabase() {
  if (!supabase && isSupabaseConfigured()) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabase;
}

export async function sendOTP(email) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.auth.signInWithOtp({ 
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return data;
}

export async function signUpEmailPassword(email, password, displayName = '') {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  
  const options = {};
  if (displayName) {
    options.data = { display_name: displayName };
  }

  const { data, error } = await sb.auth.signUp({ 
    email, 
    password,
    options
  });
  if (error) throw error;
  return data;
}

export async function signInEmailPassword(email, password) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function verifyOTP(email, token, type = 'signup') {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.auth.verifyOtp({
    email,
    token,
    type,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session || null;
}

export async function getUser() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data?.user || null;
}

export function onAuthChange(callback) {
  const sb = getSupabase();
  if (!sb) return { unsubscribe: () => {} };
  const { data } = sb.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription;
}

export async function saveUserData(userId, key, data) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from('user_data')
    .upsert({ user_id: userId, data_key: key, data_value: data }, { onConflict: 'user_id,data_key' });
  if (error) console.warn('[Supabase] Save failed:', error.message);
}

export async function loadUserData(userId, key) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('user_data')
    .select('data_value')
    .eq('user_id', userId)
    .eq('data_key', key)
    .single();
  if (error) return null;
  return data?.data_value || null;
}

export async function updateUserProfile(userId, profile) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from('user_profiles')
    .upsert({ user_id: userId, ...profile }, { onConflict: 'user_id' });
  if (error) console.warn('[Supabase] Profile update failed:', error.message);
}

export async function getUserProfile(userId) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data;
}
