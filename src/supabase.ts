import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || "https://tfzfipfdymykpndfelaa.supabase.co";
const SUPABASE_ANON_KEY = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmemZpcGZkeW15a3BuZGZlbGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzE1MDEsImV4cCI6MjA5Nzk0NzUwMX0.CFbLMgn5WM_oy38vg01RIzc8d-7Pi_-YEtTjbzQFRhE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
