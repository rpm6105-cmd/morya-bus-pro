-- Morya Bus HRMS Pro — Loan & Advance Module
-- Run in Supabase Dashboard -> SQL Editor -> New query

-- ============================================================
-- EMPLOYEE LOANS
-- ============================================================
create table if not exists employee_loans (
  "id" text primary key,
  "employeeId" text not null,
  "loanDate" text,
  "totalAmount" numeric default 0,
  "monthlyRecovery" numeric default 0,
  "description" text,
  "isActive" boolean default true,
  "createdAt" text
);

create index if not exists idx_employee_loans_emp on employee_loans ("employeeId");

create table if not exists loan_recoveries (
  "id" text primary key,
  "loanId" text not null,
  "amount" numeric default 0,
  "month" text,
  "year" integer,
  "payrollId" text
);

create index if not exists idx_loan_recoveries_loan on loan_recoveries ("loanId");
create index if not exists idx_loan_recoveries_payroll on loan_recoveries ("payrollId");

-- ============================================================
-- EMPLOYEE ADVANCES
-- ============================================================
create table if not exists employee_advances (
  "id" text primary key,
  "employeeId" text not null,
  "advanceDate" text,
  "totalAmount" numeric default 0,
  "monthlyAdjustment" numeric default 0,
  "description" text,
  "isActive" boolean default true,
  "createdAt" text
);

create index if not exists idx_employee_advances_emp on employee_advances ("employeeId");

create table if not exists advance_adjustments (
  "id" text primary key,
  "advanceId" text not null,
  "amount" numeric default 0,
  "month" text,
  "year" integer,
  "payrollId" text
);

create index if not exists idx_advance_adjustments_adv on advance_adjustments ("advanceId");
create index if not exists idx_advance_adjustments_payroll on advance_adjustments ("payrollId");

-- ============================================================
-- PAYROLL — loan/advance deduction columns
-- ============================================================
alter table payroll add column if not exists "loanDeduction" numeric default 0;
alter table payroll add column if not exists "advanceDeduction" numeric default 0;
