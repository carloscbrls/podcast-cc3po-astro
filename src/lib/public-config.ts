/**
 * Public client config for the podcast site's native forms.
 * The anon key is public by design (it ships in every fleet site's HTML);
 * what protects the data is Row Level Security — anon may INSERT only,
 * verified 2026-11-24 (see the Podcast Shift Change build note).
 */
export const SUPABASE_URL = 'https://cdrcgmdvepxwsbqaifxv.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkcmNnbWR2ZXB4d3NicWFpZnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDY4MDksImV4cCI6MjA4OTA4MjgwOX0.pKWLWvsSimTOMkpaXKKrLJESrQEMUayUU1c9ANzr1Dc';
