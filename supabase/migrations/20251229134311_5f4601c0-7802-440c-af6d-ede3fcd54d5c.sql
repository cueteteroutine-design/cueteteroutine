-- Add level and term columns to courses table
ALTER TABLE public.courses
ADD COLUMN level integer,
ADD COLUMN term integer;

-- Add a comment to explain the columns
COMMENT ON COLUMN public.courses.level IS 'Academic level (1, 2, 3, 4, etc.)';
COMMENT ON COLUMN public.courses.term IS 'Term number within the level (1 or 2)';