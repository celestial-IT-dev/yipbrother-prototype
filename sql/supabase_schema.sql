-- ============================================================
-- Operation Management System - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('sales', 'admin', 'engineer', 'designer', 'qa_qc')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          COALESCE(NEW.raw_user_meta_data->>'role', 'sales'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,

  -- Customer Info
  customer_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  company_name TEXT,

  -- Vehicle Info
  vehicle_reg TEXT,
  chassis_number TEXT,
  vehicle_model TEXT,
  vehicle_type TEXT,

  -- Manufacturing
  body_type TEXT,
  dimensions TEXT,
  special_requirements TEXT,
  production_notes TEXT,

  -- Ownership
  salesperson_id UUID REFERENCES public.profiles(id),

  -- Status
  current_status TEXT NOT NULL DEFAULT 'Draft',

  -- Dates
  target_completion_date DATE,
  estimated_completion_date DATE,
  actual_completion_date DATE,

  -- Milestone Dates
  customer_confirmation_date DATE,
  engineering_release_date DATE,
  materials_ready_date DATE,
  production_start_date DATE,
  inspection_date DATE,
  sign_off_date DATE,

  -- Financial
  initial_payment_status TEXT DEFAULT 'Unpaid',
  final_payment_status TEXT DEFAULT 'Unpaid',
  invoice_reference TEXT,
  payment_remarks TEXT,

  -- Delivery
  delivery_method TEXT,
  delivery_remarks TEXT,

  -- Meta
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Order Status History table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Profiles: authenticated users can read all, update own
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

-- Orders: authenticated users can read all, insert and update own
CREATE POLICY "Orders are viewable by authenticated users"
  ON public.orders FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated USING (auth.uid() IS NOT NULL);

-- Status History: authenticated users can read all, insert
CREATE POLICY "History is viewable by authenticated users"
  ON public.order_status_history FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert history"
  ON public.order_status_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Sample test users (run after creating users in Auth dashboard)
-- Replace UUIDs with actual user IDs from Supabase Auth
-- ============================================================

-- Example: Manually insert profiles after creating users in Auth
-- INSERT INTO public.profiles (id, full_name, role) VALUES
--   ('user-uuid-here', 'Ahmad Sales', 'sales'),
--   ('user-uuid-here', 'Siti Admin', 'admin'),
--   ('user-uuid-here', 'Raju Engineer', 'engineer'),
--   ('user-uuid-here', 'Wei Designer', 'designer'),
--   ('user-uuid-here', 'Kumar QA', 'qa_qc');

