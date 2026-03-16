-- ============================================================
-- Order Attachments — Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create order_attachments table
CREATE TABLE IF NOT EXISTS public.order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,           -- MIME type e.g. image/jpeg, application/pdf
  file_size INTEGER,                  -- bytes
  storage_path TEXT NOT NULL,         -- Supabase Storage path
  public_url TEXT,                    -- Public URL for display
  label TEXT,                         -- Optional label e.g. "Quotation", "Design Drawing"
  status_context TEXT,                -- Which status update this was attached to (optional)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachments viewable by authenticated users"
  ON public.order_attachments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert attachments"
  ON public.order_attachments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete own attachments"
  ON public.order_attachments FOR DELETE
  TO authenticated USING (auth.uid() = uploaded_by);

-- ============================================================
-- Supabase Storage Setup (run via Supabase Dashboard or API)
-- Create a bucket named: order-attachments
-- Set it to PUBLIC so thumbnails can be displayed
-- ============================================================

-- Storage bucket policy (run in SQL editor):
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-attachments', 'order-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'order-attachments');

CREATE POLICY "Public can view attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'order-attachments');

CREATE POLICY "Authenticated users can delete own attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'order-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

