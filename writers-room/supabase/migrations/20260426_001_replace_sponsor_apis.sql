-- Phase 1: Rename flock_model → model in agents table
ALTER TABLE public.agents ADD COLUMN model text;
UPDATE public.agents SET model = flock_model;
ALTER TABLE public.agents ALTER COLUMN model SET NOT NULL;
UPDATE public.agents SET model = 'gpt-4o-mini' WHERE is_default = true;
ALTER TABLE public.agents DROP COLUMN flock_model;
