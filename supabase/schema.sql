-- Morya Bus HRMS Pro — Supabase Schema
-- Run this in Supabase Dashboard -> SQL Editor -> New query

-- ============================================================
-- BRANCHES (Depots)
-- ============================================================
create table if not exists branches (
  "id" text primary key,
  "name" text not null,
  "code" text not null,
  "manager" text,
  "managerPhone" text,
  "address" text,
  "city" text,
  "state" text,
  "pincode" text,
  "incentiveType" text default 'FIXED',
  "incentiveValue" numeric default 0,
  "driverMonthlyIncentive" numeric default 0,
  "incentiveTiers" jsonb default '[]',
  "hourlyOvertimeRate" numeric,
  "fullDayOvertimeRate" numeric,
  "isActive" boolean default true,
  "subDepots" jsonb default '[]',
  "createdAt" timestamptz default now()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
create table if not exists employees (
  "id" text primary key,
  "employeeId" text not null,
  "masterEmployeeId" text not null,
  "name" text not null,
  "email" text,
  "phone" text,
  "department" text,
  "designation" text,
  "branchId" text,
  "subDepotCategory" text,
  "busCategory" text,
  "salary" numeric default 0,
  "pfEnabled" boolean default false,
  "pfRegistrationStatus" text default 'PENDING',
  "pfUanNumber" text,
  "pfMemberId" text,
  "esicEnabled" boolean default false,
  "esicRegistrationStatus" text default 'PENDING',
  "esicNumber" text,
  "bankAccount" text,
  "ifscCode" text,
  "bankName" text,
  "panNumber" text,
  "aadharNumber" text,
  "joiningDate" text,
  "status" text default 'ACTIVE',
  "photoUrl" text,
  "address" text,
  "city" text,
  "state" text,
  "pincode" text,
  "emergencyContact" text,
  "emergencyPhone" text,
  "dateOfBirth" text,
  "gender" text,
  "documents" jsonb default '{}',
  "transferHistory" jsonb default '[]',
  "baseDepotId" text,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create index if not exists idx_employees_branch on employees ("branchId");
create index if not exists idx_employees_master on employees ("masterEmployeeId");
create index if not exists idx_employees_aadhar on employees ("aadharNumber");

-- ============================================================
-- ATTENDANCE
-- ============================================================
create table if not exists attendance (
  "employeeId" text not null,
  "date" text not null,
  "status" text not null,
  "inTime" text,
  "outTime" text,
  "remarks" text,
  "isPaid" text,
  "depotId" text,
  primary key ("employeeId", "date")
);

create index if not exists idx_attendance_date on attendance ("date");
create index if not exists idx_attendance_depot on attendance ("depotId");

-- ============================================================
-- PAYROLL
-- ============================================================
create table if not exists payroll (
  "id" text primary key,
  "employeeId" text not null,
  "month" text not null,
  "year" integer not null,
  "depotId" text,
  "basicSalary" numeric default 0,
  "hra" numeric default 0,
  "conveyance" numeric default 0,
  "otherAllowances" numeric default 0,
  "grossSalary" numeric default 0,
  "presentDays" integer default 0,
  "paidLeaveDays" integer default 0,
  "holidayDays" integer default 0,
  "weekOffDays" integer default 0,
  "absentDays" integer default 0,
  "lopDays" integer default 0,
  "lopDeduction" numeric default 0,
  "overtimeHours" numeric,
  "overtimeDays" numeric,
  "overtimeType" text,
  "overtimeAmount" numeric default 0,
  "driverIncentive" numeric default 0,
  "incentive" numeric default 0,
  "totalEarnings" numeric default 0,
  "pfDeduction" numeric default 0,
  "esicDeduction" numeric default 0,
  "tdsDeduction" numeric default 0,
  "ptDeduction" numeric default 0,
  "otherDeductions" numeric default 0,
  "totalDeductions" numeric default 0,
  "netSalary" numeric default 0,
  "status" text default 'DRAFT',
  "processedBy" text,
  "processedAt" text,
  "approvedBy" text,
  "approvedAt" text,
  "paidAt" text
);

create index if not exists idx_payroll_emp on payroll ("employeeId");
create index if not exists idx_payroll_month on payroll ("month", "year");

-- ============================================================
-- LEAVES
-- ============================================================
create table if not exists leaves (
  "id" text primary key,
  "employeeId" text not null,
  "leaveType" text,
  "fromDate" text,
  "toDate" text,
  "totalDays" numeric default 0,
  "reason" text,
  "status" text default 'PENDING',
  "appliedAt" text,
  "processedBy" text,
  "processedAt" text,
  "remarks" text
);

-- ============================================================
-- OVERTIME
-- ============================================================
create table if not exists overtime (
  "id" text primary key,
  "employeeId" text not null,
  "date" text,
  "type" text,
  "hours" numeric,
  "rate" numeric,
  "amount" numeric,
  "depotId" text,
  "createdBy" text,
  "reason" text,
  "status" text default 'PENDING',
  "approvedBy" text,
  "approvedAt" text,
  "createdAt" text
);

-- ============================================================
-- SUB DEPOTS
-- ============================================================
create table if not exists subdepots (
  "id" text primary key,
  "depotId" text not null,
  "name" text,
  "code" text,
  "category" text,
  "managerId" text,
  "isActive" boolean default true,
  "createdAt" text
);

-- ============================================================
-- ASSIGNMENTS (temporary cross-depot duty)
-- ============================================================
create table if not exists assignments (
  "id" text primary key,
  "employeeId" text not null,
  "depotId" text,
  "startDate" text,
  "endDate" text,
  "reason" text,
  "createdAt" text
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table if not exists audit_logs (
  "id" text primary key,
  "userId" text,
  "action" text,
  "module" text,
  "recordId" text,
  "oldValue" text,
  "newValue" text,
  "ipAddress" text,
  "timestamp" timestamptz default now()
);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
create table if not exists system_settings (
  "key" text primary key,
  "value" jsonb
);

-- ============================================================
-- HRMS USERS
-- ============================================================
create table if not exists hrms_users (
  "id" text primary key,
  "email" text unique not null,
  "password" text not null,
  "name" text,
  "role" text,
  "depotId" text,
  "createdAt" text,
  "lastLogin" text,
  "isActive" boolean default true
);

-- ============================================================
-- Seed default settings
-- ============================================================
insert into system_settings ("key", "value") values
  ('app', '{"pfRate":12,"esicRate":0.75,"tdsThreshold":300000,"tdsRate":5,"maxLopDays":0,"overtimeSettings":{"hourlyRate":50,"fullDayRate":300,"maxHourlyOvertime":4,"maxFullDayOvertime":10},"driverMonthlyIncentive":2000,"attendanceCycle":"CALENDAR","processingMonth":"Jan","processingYear":2026}')
on conflict ("key") do nothing;
