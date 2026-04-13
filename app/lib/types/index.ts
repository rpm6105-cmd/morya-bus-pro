export type UserRole = 'ADMIN' | 'HR';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  depotId?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export type SubDepotCategory = 'STAFF' | 'DRIVERS';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'TRANSFERRED';
export type PfRegistrationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type EsicRegistrationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface EmployeeDocuments {
  aadharCard?: string;
  aadharCardNumber?: string;
  panCard?: string;
  panCardNumber?: string;
  bankPassbook?: string;
  photo?: string;
  experienceLetter?: string;
  appointmentLetter?: string;
  otherDocuments?: { name: string; url: string }[];
}

export interface EmployeeTransfer {
  fromDepotId: string;
  toDepotId: string;
  transferDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Employee {
  id: string;
  employeeId: string;
  masterEmployeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  branchId: string;
  subDepotCategory: SubDepotCategory;
  salary: number;
  pfEnabled: boolean;
  pfRegistrationStatus: PfRegistrationStatus;
  pfUanNumber?: string;
  pfMemberId?: string;
  esicEnabled: boolean;
  esicRegistrationStatus: EsicRegistrationStatus;
  esicNumber?: string;
  bankAccount: string;
  ifscCode: string;
  bankName?: string;
  panNumber?: string;
  aadharNumber?: string;
  joiningDate: string;
  status: EmployeeStatus;
  photoUrl?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyContact: string;
  emergencyPhone: string;
  dateOfBirth: string;
  gender: Gender;
  documents: EmployeeDocuments;
  transferHistory?: EmployeeTransfer[];
  baseDepotId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubDepot {
  id: string;
  depotId: string;
  name: string;
  code: string;
  category: SubDepotCategory;
  managerId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  manager: string;
  managerPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  incentiveType: 'FIXED' | 'PERCENTAGE';
  incentiveValue: number;
  driverMonthlyIncentive: number;
  isActive: boolean;
  subDepots: SubDepot[];
  createdAt: string;
}

export type AttendanceStatus = 'P' | 'A' | 'PL' | 'H' | 'WO' | 'LOP';
export type AttendanceStatusLabel = 'Present' | 'Absent/LWP' | 'Paid Leave' | 'Holiday' | 'Week Off' | 'LOP';
export type AttendancePaidStatus = 'PAID' | 'UNPAID';

export interface AttendanceRecord {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  inTime?: string;
  outTime?: string;
  remarks?: string;
  isPaid: AttendancePaidStatus;
}

export interface Attendance {
  [empId: string]: {
    [date: string]: AttendanceRecord;
  };
}

export type OvertimeType = 'HOURLY' | 'FULL_DAY';

export interface OvertimeEntry {
  id: string;
  employeeId: string;
  date: string;
  type: OvertimeType;
  hours?: number;
  rate?: number;
  amount?: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface OvertimeSettings {
  hourlyRate: number;
  fullDayRate: number;
  maxHourlyOvertime: number;
  maxFullDayOvertime: number;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  basicSalary: number;
  hra: number;
  conveyance: number;
  otherAllowances: number;
  grossSalary: number;
  presentDays: number;
  paidLeaveDays: number;
  holidayDays: number;
  weekOffDays: number;
  absentDays: number;
  lopDays: number;
  lopDeduction: number;
  overtimeHours?: number;
  overtimeDays?: number;
  overtimeType?: OvertimeType;
  overtimeAmount: number;
  driverIncentive: number;
  incentive: number;
  totalEarnings: number;
  pfDeduction: number;
  esicDeduction: number;
  tdsDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: 'DRAFT' | 'PROCESSED' | 'APPROVED' | 'PAID';
  processedBy: string;
  processedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: 'SICK_LEAVE' | 'PAID_LEAVE' | 'CASUAL_LEAVE' | 'MATERNITY_LEAVE' | 'PATERNITY_LEAVE' | 'LOSS_OF_PAY';
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt: string;
  processedBy?: string;
  processedAt?: string;
  remarks?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  module: string;
  recordId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface SystemSettings {
  pfRate: number;
  esicRate: number;
  tdsThreshold: number;
  tdsRate: number;
  maxLopDays: number;
  processingMonth: string;
  processingYear: number;
  overtimeSettings: OvertimeSettings;
  driverMonthlyIncentive: number;
  attendanceCycle: 'CALENDAR' | 'CUSTOM';
  attendanceCycleStart?: string;
}

export const ATTENDANCE_STATUS_MAP: Record<AttendanceStatus, { label: string; paid: AttendancePaidStatus; short: string }> = {
  'P': { label: 'Present', paid: 'PAID', short: 'P' },
  'A': { label: 'Absent/LWP', paid: 'UNPAID', short: 'A' },
  'PL': { label: 'Paid Leave', paid: 'PAID', short: 'PL' },
  'H': { label: 'Holiday', paid: 'PAID', short: 'H' },
  'WO': { label: 'Week Off', paid: 'PAID', short: 'WO' },
  'LOP': { label: 'Loss of Pay', paid: 'UNPAID', short: 'LOP' },
};
