-- ============================================================
-- Morya Bus HRMS Pro — Migration 004: Employee father name
-- Adds employees."fatherName" for the Employee Master import
-- (source: "FATHER / HUSBAND NAME" col in the master CSV).
--
-- Run in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

alter table employees add column if not exists "fatherName" text;
