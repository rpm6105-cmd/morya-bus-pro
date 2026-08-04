-- ============================================================
-- Morya Bus HRMS Pro — Migration 002: Bank Name + Bus Category fix
-- 1. Adds employees."bankName" (source: "MEMBER BANK A/C NAME" col
--    in the PF & ESIC Employee Master workbook).
-- 2. Corrects the bus category: the 9 MTR sheet drivers were
--    stored as '8 METER' but belong to '9 METER'.
--
-- Run in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

alter table employees add column if not exists "bankName" text;

update employees set "busCategory" = '9 METER' where "busCategory" = '8 METER';
