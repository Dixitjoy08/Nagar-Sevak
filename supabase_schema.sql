-- SUPABASE DATABASE SCHEMA FOR NAGARSEVAK
-- Copy and run these queries in your Supabase SQL Editor to resolve the missing tables issue.

-- 1. Create the 'users' table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    civic_score INTEGER DEFAULT 0,
    badges TEXT[] DEFAULT '{}'::text[],
    reports_filed INTEGER DEFAULT 0,
    reports_verified INTEGER DEFAULT 0,
    ward TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the 'reports' table
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    severity INTEGER,
    status TEXT NOT NULL,
    location JSONB, -- stores { lat, lng, address, ward, zone }
    jurisdiction JSONB, -- stores { body, department, officer_name, contact, sla_hours, complaint_portal_url }
    image_url TEXT,
    after_image_url TEXT,
    grievance_letter TEXT,
    bilingual_grievance JSONB, -- stores { english, hindi }
    escalation_history JSONB DEFAULT '[]'::jsonb,
    community_verifications JSONB DEFAULT '{"count": 0, "user_ids": []}'::jsonb,
    similar_reports JSONB DEFAULT '[]'::jsonb,
    comments JSONB DEFAULT '[]'::jsonb,
    created_by TEXT,
    visual_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the 'complaints' table (compatibility layer for client-side queries)
CREATE TABLE IF NOT EXISTS public.complaints (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    severity INTEGER,
    status TEXT NOT NULL,
    location TEXT, -- string address or coordinates
    department TEXT,
    priority TEXT,
    reporterEmail TEXT,
    reporterName TEXT,
    upvotes INTEGER DEFAULT 0,
    upvotedBy JSONB DEFAULT '[]'::jsonb,
    createdAt TEXT,
    updatedAt TEXT,
    comments JSONB DEFAULT '[]'::jsonb,
    aiAnalysis JSONB,
    grievance_letter TEXT,
    bilingual_grievance JSONB,
    similar_reports JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    after_image_url TEXT,
    escalation_history JSONB DEFAULT '[]'::jsonb,
    verifiedBy JSONB DEFAULT '[]'::jsonb,
    community_verifications JSONB DEFAULT '{"count": 0, "user_ids": []}'::jsonb,
    created_by TEXT,
    visual_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Create public access policies so the frontend can query and insert reports during testing
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Allow public read reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reports" ON public.reports FOR UPDATE USING (true);

CREATE POLICY "Allow public read complaints" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "Allow public insert complaints" ON public.complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update complaints" ON public.complaints FOR UPDATE USING (true);
