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
export type BusCategory = '9 METER' | '12 METER';
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

export type MaritalStatus = 'MARRIED' | 'UNMARRIED' | 'UNKNOWN';

export interface SalaryMaster {
  id: string;
  employeeId: string;
  effectiveFrom: string; // 'YYYY-MM'
  effectiveTo?: string;
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  washing: number;
  medical: number;
  otherAllowance: number;
  gross: number;
  perDayDivisor: number;
  otRatePerHour: number;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankMaster {
  code: string; // IFSC prefix
  name: string;
  category?: 'PUBLIC' | 'PRIVATE' | 'COOPERATIVE' | 'PAYMENTS';
}

export interface Designation {
  id: string;
  name: string;
  category?: SubDepotCategory;
  sortOrder?: number;
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
  busCategory?: BusCategory;
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
  driverNumber?: string;
  fatherName?: string;
  maritalStatus?: MaritalStatus;
  aadhaarName?: string;
  prevPfAccount?: string;
  prevPension?: string;
  prevPfTransfer?: string;
  prevEsic?: string;
  basicSalary?: number;
  pfLimit?: number;
  grossSalary?: number;
  remarks?: string;
  shift?: string;
  weeklyOff?: string;
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

export interface IncentiveTier {
  id: string;
  minDays: number;
  maxDays: number;
  amount: number;
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
  incentiveTiers?: IncentiveTier[];
  hourlyOvertimeRate?: number;
  fullDayOvertimeRate?: number;
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
  depotId?: string;
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
  depotId?: string;
  createdBy?: string;
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
  depotId?: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  washing?: number;
  medical?: number;
  otherAllowances: number;
  grossSalary: number;
  presentDays: number;
  paidLeaveDays: number;
  holidayDays: number;
  weekOffDays: number;
  absentDays: number;
  lopDays: number;
  totalDays?: number;
  extraDays?: number;
  perDay?: number;
  lopDeduction: number;
  overtimeHours?: number;
  overtimeDays?: number;
  overtimeType?: OvertimeType;
  overtimeAmount: number;
  foodIncentive?: number;
  driverIncentive: number;
  incentive: number;
  totalEarnings: number;
  pfDeduction: number;
  esicDeduction: number;
  tdsDeduction: number;
  ptDeduction: number;
  mlwfDeduction?: number;
  otherDeductions: number;
  loanDeduction?: number;
  advanceDeduction?: number;
  refundAmount?: number;
  totalDeductions: number;
  netSalary: number;
  status: 'DRAFT' | 'PROCESSED' | 'APPROVED' | 'PAID';
  processedBy: string;
  processedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface PayrollDeductionOverride {
  pf: number;
  esic: number;
  pt: number;
  mlwf: number;
  other: number;
  refund: number;
}

export interface EmployeeLoan {
  id: string;
  employeeId: string;
  loanDate: string;
  totalAmount: number;
  monthlyRecovery: number;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface LoanRecovery {
  id: string;
  loanId: string;
  amount: number;
  month: string;
  year: number;
  payrollId?: string;
}

export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  advanceDate: string;
  totalAmount: number;
  monthlyAdjustment: number;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface AdvanceAdjustment {
  id: string;
  advanceId: string;
  amount: number;
  month: string;
  year: number;
  payrollId?: string;
}

export interface LoanAdvanceSummary {
  loanBalance: number;
  loanMonthly: number;
  advanceBalance: number;
  advanceMonthly: number;
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

export interface EmployeeAssignment {
  id: string;
  employeeId: string;
  depotId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  createdAt: string;
}

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ChangeRequestAction = 'CREATE' | 'UPDATE' | 'TERMINATE' | 'TRANSFER';

export interface EmployeeChangeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  summary: string;
  requestedBy: string;
  requestedByName: string;
  changes: Partial<Employee>;
  status: ChangeRequestStatus;
  action?: ChangeRequestAction;
  createdAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  remarks?: string;
}

export type NotificationType = 'INFO' | 'APPROVAL' | 'DUPLICATE' | 'SYSTEM';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  read: boolean;
  createdAt: string;
}
