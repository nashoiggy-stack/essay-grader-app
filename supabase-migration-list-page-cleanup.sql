-- Phase: list-page + cloud-storage migration
--
-- Adds two missing columns to user_profiles so every piece of user state
-- lives in Supabase under the cloud-storage wrapper. Before this, the
-- profile-overrides and dashboard-layout keys were per-device only.
--
-- Additive + idempotent. Run in Supabase Dashboard → SQL Editor.
-- Existing rows get NULL for both columns; the cloud-storage layer
-- handles missing values cleanly.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS profile_overrides JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dashboard_layout TEXT DEFAULT NULL;

-- Expected shapes:
--   profile_overrides: an object map { fieldName -> userOverrideValue }.
--     Mirrors the legacy localStorage key 'admitedge-profile-overrides'.
--   dashboard_layout: free-form string (e.g. 'compact' | 'expanded').
--     Mirrors 'admitedge-profile-layout'.
