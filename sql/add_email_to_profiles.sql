-- ============================================================
-- Add email column to profiles table
-- Run this SQL in your Supabase SQL Editor after the main schema
-- ============================================================

-- Add email column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Populate email from auth.users for existing users
UPDATE public.profiles
SET email = (SELECT email FROM auth.users WHERE auth.users.id = profiles.id)
WHERE email IS NULL;

-- Update the trigger to automatically capture email from auth.users on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          COALESCE(NEW.raw_user_meta_data->>'role', 'sales'),
          NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
