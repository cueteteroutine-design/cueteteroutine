-- Enable REPLICA IDENTITY FULL on batches table for complete row data in realtime updates
ALTER TABLE public.batches REPLICA IDENTITY FULL;

-- Add batches table to supabase_realtime publication for realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;