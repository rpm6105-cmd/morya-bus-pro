-- ============================================================
-- Morya Bus HRMS Pro — Migration 001: Employee Master (Enterprise)
-- Extends `employees` to carry the full PF & ESIC Employee Master
-- and adds normalized child tables: salary_masters, bank_master, designations.
--
-- Run in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- ------------------------------------------------------------
-- 1. EMPLOYEES — extended columns (all idempotent)
-- ------------------------------------------------------------
alter table employees add column if not exists "driverNumber" text;
alter table employees add column if not exists "maritalStatus" text;
alter table employees add column if not exists "aadhaarName" text;
alter table employees add column if not exists "prevPfAccount" text;
alter table employees add column if not exists "prevPension" text;
alter table employees add column if not exists "prevPfTransfer" text;
alter table employees add column if not exists "prevEsic" text;
alter table employees add column if not exists "basicSalary" numeric;
alter table employees add column if not exists "pfLimit" numeric;
alter table employees add column if not exists "grossSalary" numeric;
alter table employees add column if not exists "remarks" text;
alter table employees add column if not exists "shift" text;
alter table employees add column if not exists "weeklyOff" text;

-- Enforce a single active code per employee master
create unique index if not exists uq_employees_employeeId on employees ("employeeId");

-- ------------------------------------------------------------
-- 2. SALARY MASTERS — per-employee salary components (source of truth
--    for payroll, replaces the old 50/20/10 percentage split)
-- ------------------------------------------------------------
create table if not exists salary_masters (
  "id" text primary key,
  "employeeId" text not null references employees ("id") on delete cascade,
  "effectiveFrom" text not null,              -- 'YYYY-MM'
  "effectiveTo" text,
  "basic" numeric default 0,                  -- Basic + DA (drivers carry combined Basic+DA)
  "da" numeric default 0,
  "hra" numeric default 0,
  "conveyance" numeric default 0,
  "washing" numeric default 0,
  "medical" numeric default 0,
  "otherAllowance" numeric default 0,
  "gross" numeric default 0,
  "perDayDivisor" integer default 30,
  "otRatePerHour" numeric default 86,          -- observed ₹86 / hr in June 2026 sheets
  "source" text,                               -- '9 MTR' | '12 MTR' | 'STAFF'
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create index if not exists idx_salary_masters_emp on salary_masters ("employeeId");
create index if not exists idx_salary_masters_eff on salary_masters ("effectiveFrom");

-- ------------------------------------------------------------
-- 3. BANK MASTER — normalized bank names keyed by IFSC prefix
-- ------------------------------------------------------------
create table if not exists bank_master (
  "code" text primary key,          -- 4-letter IFSC prefix, e.g. 'SBIN'
  "name" text not null,
  "category" text default 'PUBLIC'  -- PUBLIC | PRIVATE | COOPERATIVE | PAYMENTS
);

-- ------------------------------------------------------------
-- 4. DESIGNATIONS — normalized designations by employee category
-- ------------------------------------------------------------
create table if not exists designations (
  "id" text primary key,
  "name" text not null,
  "category" text,                  -- 'DRIVERS' | 'STAFF'
  "sortOrder" integer default 0
);

-- ============================================================
-- Seed: BANK MASTER (IFSC prefix -> canonical name + category)
-- ============================================================
insert into bank_master ("code", "name", "category") values
  ('SBIN', 'STATE BANK OF INDIA', 'PUBLIC'),
  ('MAHB', 'BANK OF MAHARASHTRA', 'PUBLIC'),
  ('BARB', 'BANK OF BARODA', 'PUBLIC'),
  ('UBIN', 'UNION BANK OF INDIA', 'PUBLIC'),
  ('CNRB', 'CANARA BANK', 'PUBLIC'),
  ('BKID', 'BANK OF INDIA', 'PUBLIC'),
  ('HDFC', 'HDFC BANK', 'PRIVATE'),
  ('ABHY', 'ABHYUDAYA CO-OPERATIVE BANK', 'COOPERATIVE'),
  ('ICIC', 'ICICI BANK', 'PRIVATE'),
  ('UTIB', 'AXIS BANK', 'PRIVATE'),
  ('IDIB', 'INDIAN BANK', 'PUBLIC'),
  ('CBIN', 'CENTRAL BANK OF INDIA', 'PUBLIC'),
  ('SVCB', 'SVC CO-OPERATIVE BANK', 'COOPERATIVE'),
  ('MAHG', 'MAHARASHTRA GRAMIN BANK', 'PUBLIC'),
  ('IDFB', 'IDFC FIRST BANK', 'PRIVATE'),
  ('IDBI', 'IDBI BANK', 'PRIVATE'),
  ('KKBK', 'KOTAK MAHINDRA BANK', 'PRIVATE'),
  ('NKGS', 'NKGSB CO-OPERATIVE BANK', 'COOPERATIVE'),
  ('JSBL', 'JANAKALYAN SAHAKARI BANK', 'COOPERATIVE'),
  ('IOBA', 'INDIAN OVERSEAS BANK', 'PUBLIC'),
  ('SRCB', 'SARASWAT CO-OPERATIVE BANK', 'COOPERATIVE'),
  ('ASBL', 'APNA SAHAKARI BANK', 'COOPERATIVE'),
  ('IBKL', 'IDBI BANK', 'PRIVATE')
on conflict ("code") do nothing;

-- ============================================================
-- Seed: DESIGNATIONS
-- ============================================================
insert into designations ("id", "name", "category", "sortOrder") values
  ('desig-001', 'Bus Driver', 'DRIVERS', 10),
  ('desig-002', 'Depot Manager', 'STAFF', 20),
  ('desig-003', 'Staff', 'STAFF', 30)
on conflict ("id") do nothing;

-- ============================================================
-- Seed: DEFAULT SETTINGS (updated — observed payroll rules)
-- ============================================================
insert into system_settings ("key", "value") values
  ('app', '{"pfRate":12,"esicRate":0.75,"tdsThreshold":300000,"tdsRate":5,"maxLopDays":0,"overtimeSettings":{"hourlyRate":50,"fullDayRate":300,"maxHourlyOvertime":4,"maxFullDayOvertime":10},"driverMonthlyIncentive":2000,"attendanceCycle":"CALENDAR","processingMonth":"Jan","processingYear":2026,"perDayDivisor":30,"otRatePerHour":86,"pfCeiling":15000,"esicCeiling":21000,"ptMaleSlab1":7500,"ptMaleSlab2":10000,"ptStandard":200,"ptFeb":300,"mlwf":25,"attendanceIncentiveDays":24,"attendanceIncentiveAmount":2000,"doubleDutyDays":26,"otDayRateMultiplier":1,"foodIncentivePerDay":100}')
on conflict ("key") do nothing;
