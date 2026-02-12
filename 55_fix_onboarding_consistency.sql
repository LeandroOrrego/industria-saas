-- FIX ONBOARDING CONSISTENCY
-- Existing users who joined before the React fix might have organization_id set but onboarding_completed = false.
-- This script ensures anyone who belongs to an organization is considered "Onboarded" (skips company creation).

UPDATE public.profiles
SET onboarding_completed = TRUE
WHERE organization_id IS NOT NULL 
  AND onboarding_completed IS NOT TRUE;
