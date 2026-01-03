-- Add calendar_attendees column to store participant data from calendar
ALTER TABLE public.recordings ADD COLUMN calendar_attendees jsonb;