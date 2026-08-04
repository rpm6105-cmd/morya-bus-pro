import { Employee, AttendanceRecord, OvertimeEntry, SystemSettings, SalaryMaster, PayrollDeductionOverride } from '../types';
import { calculateTieredIncentive } from './incentive';

export interface AttendanceSummary {
  presentDays: number;
  absentDays: number;
  paidLeaveDays: number;
  holidayDays: number;
  weekOffDays: number;
  lopDays: number;
  totalDays: number;
}

export interface PayrollCalcResult {
  fullBasic: number;
  fullDa: number;
  fullHra: number;
  fullConveyance: number;
  fullWashing: number;
  fullMedical: number;
  fullAllowances: number;
  fullGross: number;
  earnedBasic: number;
  earnedDa: number;
  earnedHra: number;
  earnedConveyance: number;
  earnedWashing: number;
  earnedMedical: number;
  earnedAllowances: number;
  earnedGross: number;
  presentDays: number;
  paidLeaveDays: number;
  holidayDays: number;
  weekOffDays: number;
  absentDays: number;
  lopDays: number;
  totalDays: number;
  daysInMonth: number;
  effectiveDays: number;
  perDaySalary: number;
  overtimeHours: number;
  overtimeDays: number;
  overtimeAmount: number;
  foodIncentive: number;
  driverIncentive: number;
  incentive: number;
  totalEarnings: number;
  lopDeduction: number;
  pfDeduction: number;
  esicDeduction: number;
  tdsDeduction: number;
  ptDeduction: number;
  mlwfDeduction: number;
  otherDeductions: number;
  loanDeduction: number;
  advanceDeduction: number;
  refundAmount: number;
  totalDeductions: number;
  netSalary: number;
}

const round = (n: number) => Math.round(Number(n || 0) * 100) / 100;
const ceil2 = (n: number) => Math.ceil(Number(n || 0) * 100) / 100;

export const DEFAULT_PER_DAY_DIVISOR = 30;
export const DEFAULT_OT_RATE = 86;
export const STAFF_OT_RATE = 108.33;
export const MLWF_AMOUNT = 25;
export const FOOD_INCENTIVE_PER_DAY = 100;

export function splitSalary(salary: number) {
  const basic = Math.round(salary * 0.5);
  const hra = Math.round(salary * 0.2);
  const conveyance = Math.round(salary * 0.1);
  const allowances = salary - basic - hra - conveyance;
  return { basic, hra, conveyance, allowances, gross: salary };
}

export function summarizeAttendance(
  attendanceRecords: Record<string, AttendanceRecord>,
  month: number,
  year: number
): AttendanceSummary {
  let presentDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let holidayDays = 0;
  let weekOffDays = 0;
  let lopDays = 0;

  Object.values(attendanceRecords || {}).forEach(record => {
    const d = new Date(record.date);
    if (d.getMonth() + 1 !== month || d.getFullYear() !== year) return;
    switch (record.status) {
      case 'P': presentDays++; break;
      case 'A': absentDays++; break;
      case 'LOP': lopDays++; break;
      case 'PL': paidLeaveDays++; break;
      case 'H': holidayDays++; break;
      case 'WO': weekOffDays++; break;
    }
  });

  const totalDays = presentDays + paidLeaveDays + holidayDays + weekOffDays;

  return { presentDays, absentDays, paidLeaveDays, holidayDays, weekOffDays, lopDays, totalDays };
}

export function calculateOvertimeAmount(
  overtimeEntries: OvertimeEntry[],
  settings: SystemSettings,
  perDaySalary: number
): { hours: number; days: number; amount: number } {
  let hours = 0;
  let days = 0;
  let amount = 0;

  (overtimeEntries || [])
    .filter(o => o.status === 'APPROVED')
    .forEach(ot => {
      if (ot.type === 'HOURLY' && ot.hours) {
        hours += ot.hours;
        amount += ot.amount || (ot.hours * (ot.rate || settings.overtimeSettings.hourlyRate));
      } else if (ot.type === 'FULL_DAY') {
        days++;
        amount += ot.amount || (ot.rate || perDaySalary);
      }
    });

  return { hours, days, amount: round(amount) };
}

export function calculatePF(pfEnabled: boolean, earnedBasic: number): number {
  if (!pfEnabled || earnedBasic <= 0) return 0;
  if (earnedBasic >= 15000) return 1800;
  return Math.round(earnedBasic * 0.12);
}

export function calculateESIC(esicEnabled: boolean, earnedBasic: number): number {
  if (!esicEnabled || earnedBasic <= 0) return 0;
  if (earnedBasic > 21000) return 0;
  return ceil2(earnedBasic * 0.0075);
}

export function calculatePT(gross: number, month: number, gender: string): number {
  const g = (gender || 'male').toLowerCase();
  const feb = month === 2;
  if (g === 'female') {
    if (gross <= 25000) return 0;
    return feb ? 300 : 200;
  }
  if (gross <= 7500) return 0;
  if (gross <= 10000) return 175;
  return feb ? 300 : 200;
}

export interface PayrollInput {
  employee: Employee;
  salaryMaster?: SalaryMaster | null;
  branch?: any;
  attendanceRecords: Record<string, AttendanceRecord>;
  overtimeEntries?: OvertimeEntry[];
  settings: SystemSettings;
  month: number;
  year: number;
  deductions?: PayrollDeductionOverride;
  foodIncentive?: number;
  loanDeduction?: number;
  advanceDeduction?: number;
}

export function calculatePayroll({
  employee,
  salaryMaster,
  branch,
  attendanceRecords,
  overtimeEntries = [],
  settings,
  month,
  year,
  deductions,
  foodIncentive,
  loanDeduction,
  advanceDeduction,
}: PayrollInput): PayrollCalcResult {
  const summary = summarizeAttendance(attendanceRecords, month, year);
  const daysInMonth = new Date(year, month, 0).getDate();
  const divisor = salaryMaster?.perDayDivisor || DEFAULT_PER_DAY_DIVISOR;
  const totalDays = salaryMaster ? summary.totalDays : Math.max(0, daysInMonth - summary.lopDays);

  const full = {
    basic: salaryMaster?.basic || 0,
    da: salaryMaster?.da || 0,
    hra: salaryMaster?.hra || 0,
    conveyance: salaryMaster?.conveyance || 0,
    washing: salaryMaster?.washing || 0,
    medical: salaryMaster?.medical || 0,
    other: salaryMaster?.otherAllowance || 0,
    gross: salaryMaster?.gross || employee.salary || 0,
  };

  const perDaySalary = divisor > 0 ? full.gross / divisor : 0;
  const ratio = divisor > 0 ? totalDays / divisor : 0;

  const earned = {
    basic: Math.round(full.basic * ratio),
    da: Math.round(full.da * ratio),
    hra: Math.round(full.hra * ratio),
    conveyance: Math.round(full.conveyance * ratio),
    washing: Math.round(full.washing * ratio),
    medical: Math.round(full.medical * ratio),
    other: Math.round(full.other * ratio),
  };
  const earnedGross = earned.basic + earned.da + earned.hra + earned.conveyance + earned.washing + earned.medical + earned.other;

  const ot = calculateOvertimeAmount(overtimeEntries, settings, perDaySalary);
  const extraDays = ot.days;
  const food = foodIncentive !== undefined ? foodIncentive : (extraDays * FOOD_INCENTIVE_PER_DAY);
  const otRate = salaryMaster?.otRatePerHour || (employee.subDepotCategory === 'STAFF' ? STAFF_OT_RATE : DEFAULT_OT_RATE);

  const driverIncentive = employee.subDepotCategory === 'DRIVERS'
    ? calculateTieredIncentive(branch, summary.presentDays, 'DRIVERS')
    : 0;
  const incentive = employee.subDepotCategory === 'DRIVERS'
    ? 0
    : (branch?.incentiveType === 'PERCENTAGE'
        ? Math.round(full.gross * ((branch?.incentiveValue || 0) / 100))
        : (branch?.incentiveValue || 0));

  const totalEarnings = Math.round(earnedGross + ot.amount + food + driverIncentive + incentive);

  const pfEnabled = employee.pfEnabled && employee.pfRegistrationStatus === 'COMPLETED';
  const esicEnabled = employee.esicEnabled && employee.esicRegistrationStatus === 'COMPLETED';

  const pfDeduction = deductions ? deductions.pf : calculatePF(pfEnabled, earned.basic);
  const esicDeduction = deductions ? deductions.esic : calculateESIC(esicEnabled, earned.basic);
  const ptDeduction = deductions ? deductions.pt : calculatePT(totalEarnings, month, employee.gender);
  const mlwfDeduction = deductions ? deductions.mlwf : (pfEnabled ? MLWF_AMOUNT : 0);
  const otherDeductions = deductions ? deductions.other : 0;
  const refundAmount = deductions ? deductions.refund : 0;
  const tdsDeduction = 0;
  const loanD = Math.max(0, loanDeduction || 0);
  const advanceD = Math.max(0, advanceDeduction || 0);

  const totalDeductions = pfDeduction + esicDeduction + tdsDeduction + ptDeduction + mlwfDeduction + otherDeductions + loanD + advanceD;
  const netSalary = Math.round(totalEarnings - totalDeductions + refundAmount);

  return {
    fullBasic: full.basic,
    fullDa: full.da,
    fullHra: full.hra,
    fullConveyance: full.conveyance,
    fullWashing: full.washing,
    fullMedical: full.medical,
    fullAllowances: full.other,
    fullGross: full.gross,
    earnedBasic: earned.basic,
    earnedDa: earned.da,
    earnedHra: earned.hra,
    earnedConveyance: earned.conveyance,
    earnedWashing: earned.washing,
    earnedMedical: earned.medical,
    earnedAllowances: earned.other,
    earnedGross,
    presentDays: summary.presentDays,
    paidLeaveDays: summary.paidLeaveDays,
    holidayDays: summary.holidayDays,
    weekOffDays: summary.weekOffDays,
    absentDays: summary.absentDays,
    lopDays: summary.lopDays,
    totalDays,
    daysInMonth,
    effectiveDays: daysInMonth,
    perDaySalary: round(perDaySalary),
    overtimeHours: ot.hours,
    overtimeDays: extraDays,
    overtimeAmount: ot.amount,
    foodIncentive: food,
    driverIncentive,
    incentive,
    totalEarnings,
    lopDeduction: 0,
    pfDeduction,
    esicDeduction,
    tdsDeduction,
    ptDeduction,
    mlwfDeduction,
    otherDeductions,
    loanDeduction: loanD,
    advanceDeduction: advanceD,
    refundAmount,
    totalDeductions,
    netSalary,
  };
}
