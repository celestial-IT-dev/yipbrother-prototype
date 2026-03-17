-- ============================================================
-- Add Production Engineer Role
-- Migration to add 'production_engineer' role to the system
-- ============================================================

-- 1. Update the profiles table CHECK constraint to include production_engineer role
ALTER TABLE public.profiles
DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('sales', 'admin', 'engineer', 'designer', 'production_engineer', 'qa_qc'));

-- ============================================================
-- Done! 
-- New 'production_engineer' role is now available in the system.
-- Users can be assigned this role when creating profiles.
-- ============================================================
