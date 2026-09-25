-- Add group column to schedule_slots for sessional classes
ALTER TABLE public.schedule_slots 
ADD COLUMN group_name text DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.schedule_slots.group_name IS 'Group for sessional classes: G1, G2, or G1_G2';