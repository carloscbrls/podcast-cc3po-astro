/**
 * Public client config for the podcast site's native forms.
 * The anon key is public by design (it ships in every fleet site's HTML);
 * what protects the data is Row Level Security — anon may INSERT only,
 * verified 2026-11-24 (see the Podcast Shift Change build note).
 */
export const SUPABASE_URL = 'https://cdrcgmdvepxwsbqaifxv.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_dNkzT9Le1oI0oSIZ9U_QFQ_6o4P6jIY';
