-- Add credit column to courses table
ALTER TABLE public.courses
ADD COLUMN credit numeric(3, 1) DEFAULT 3.0;