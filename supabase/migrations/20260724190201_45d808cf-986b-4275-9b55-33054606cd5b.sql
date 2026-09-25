-- Role column on admin_users
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS role text;
UPDATE public.admin_users SET role = 'admin' WHERE role IS NULL;
ALTER TABLE public.admin_users ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.admin_users ALTER COLUMN role SET DEFAULT 'coadmin';
DO $$ BEGIN
  ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin','coadmin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Batch assignment table for co-admins
CREATE TABLE IF NOT EXISTS public.admin_batch_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_id, batch_id)
);

GRANT ALL ON public.admin_batch_assignments TO service_role;

ALTER TABLE public.admin_batch_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "no direct access to admin_batch_assignments"
    ON public.admin_batch_assignments FOR ALL
    USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS admin_batch_assignments_admin_idx
  ON public.admin_batch_assignments(admin_id);
CREATE INDEX IF NOT EXISTS admin_batch_assignments_batch_idx
  ON public.admin_batch_assignments(batch_id);