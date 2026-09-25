-- Add vacant_weeks column to batches table
ALTER TABLE public.batches 
ADD COLUMN vacant_weeks integer NOT NULL DEFAULT 0;