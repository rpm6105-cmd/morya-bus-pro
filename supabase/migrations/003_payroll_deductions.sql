-- 003_payroll_deductions.sql
-- Adds extended payroll columns: washing/medical/food incentive components,
-- per-employee manual deductions (MLWF/refund), day-accounting columns,
-- and earned-component columns used by the reconciliation engine.

alter table payroll
  add column if not exists "washing" numeric default 0,
  add column if not exists "medical" numeric default 0,
  add column if not exists "foodIncentive" numeric default 0,
  add column if not exists "mlwfDeduction" numeric default 0,
  add column if not exists "refundAmount" numeric default 0,
  add column if not exists "totalDays" integer default 0,
  add column if not exists "extraDays" integer default 0,
  add column if not exists "perDay" numeric default 0,
  add column if not exists "earnedBasic" numeric default 0,
  add column if not exists "earnedHra" numeric default 0,
  add column if not exists "earnedConveyance" numeric default 0,
  add column if not exists "earnedAllowances" numeric default 0,
  add column if not exists "earnedGross" numeric default 0;
