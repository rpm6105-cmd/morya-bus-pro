import { Employee, Branch, AttendanceRecord, OvertimeEntry, SystemSettings } from '../types';
import { calculateTieredIncentive } from './incentive';

export interface AttendanceSummary {
  presentDays: number;
  absentDays: number;
  paidLeaveDays: number;
  holidayDays: number;
  weekOffDays: number;
  lopDays: number;
}

export interface PayrollCalcResult {
  fullBasic: number;
  fullHra: number;
  fullConveyance: number;
  fullAllowances: number;
  fullGross: number;
  earnedBasic: number;
  earnedHra: number;
  earnedConveyance: number;
  earnedAllowances: number;
  earnedGross: number;
  presentDays: number;
  paidLeaveDays: number;
  holidayDays: number;
  weekOffDays: number;
  absentDays: number;
  lopDays: number;
  daysInMonth: number;
  effectiveDays: number;
  overtimeHours: number;
  overtimeDays: number;
  overtimeAmount: number;
  driverIncentive: number;
  incentive: number;
  totalEarnings: number;
  lopDeduction: number;
  pfDeduction: number;
  esicDeduction: number;
  tdsDeduction: number;
  ptDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  perDaySalary: number;
}

const round = (n: number) => Math.round(Number(n || 0) * 100) / 100;
const ceil = (n: number) => Math.ceil(Number(n || 0));

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
      case 'A': absentDays++; lopDays++; break;
      case 'LOP': lopDays++; break;
      case 'PL': paidLeaveDays++; break;
      case 'H': holidayDays++; break;
      case 'WO': weekOffDays++; break;
    }
  });

  return { presentDays, absentDays, paidLeaveDays, holidayDays, weekOffDays, lopDays };
}

export function calculateOvertimeAmount(
  overtimeEntries: OvertimeEntry[],
  settings: SystemSettings
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
        amount += ot.amount || (ot.rate || settings.overtimeSettings.fullDayRate);
      }
    });

  return { hours, days, amount: round(amount) };
}

export function calculatePF(pfEnabled: boolean, fullBasic: number, earnedBasic: number): number {
  if (!pfEnabled || earnedBasic <= 0) return 0;
  if (fullBasic < 15000) return Math.round(earnedBasic * 0.12);
  if (earnedBasic < 12000) return Math.round(earnedBasic * 0.12);
  return 1800;
}

export function calculateESIC(
  esicEnabled: boolean,
  salary: number,
  fullConveyance: number,
  earnedGross: number
): number {
  if (!esicEnabled) return 0;
  const fixedWage = salary - fullConveyance;
  if (fixedWage > 21000) return 0;
  const earnedConveyance = salary > 0 ? (fullConveyance / salary) * earnedGross : 0;
  const esicWage = Math.max(0, earnedGross - earnedConveyance);
  if (esicWage <= 0) return 0;
  return ceil(esicWage * 0.0075);
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
  branch?: Branch;
  attendanceRecords: Record<string, AttendanceRecord>;
  overtimeEntries?: OvertimeEntry[];
  settings: SystemSettings;
  month: number;
  year: number;
}

export function calculatePayroll({
  employee,
  branch,
  attendanceRecords,
  overtimeEntries = [],
  settings,
  month,
  year,
}: PayrollInput): PayrollCalcResult {
  const salary = employee.salary;
  const daysInMonth = new Date(year, month, 0).getDate();
  const perDaySalary = salary / daysInMonth;

  const summary = summarizeAttendance(attendanceRecords, month, year);

  const split = splitSalary(salary);

  let effectiveDays = daysInMonth;
  let proRataDeduction = 0;
  if (employee.joiningDate) {
    const joining = new Date(employee.joiningDate);
    const joiningMonth = joining.getMonth() + 1;
    const joiningYear = joining.getFullYear();
    if (joiningYear === year && joiningMonth === month) {
      effectiveDays = daysInMonth - joining.getDate() + 1;
      proRataDeduction = perDaySalary * (daysInMonth - effectiveDays);
    }
  }

  const lopDeduction = perDaySalary * summary.lopDays;
  const earnedGross = Math.max(0, salary - lopDeduction - proRataDeduction);

  const ratio = salary > 0 ? earnedGross / salary : 0;
  const earnedBasic = Math.round(split.basic * ratio);
  const earnedHra = Math.round(split.hra * ratio);
  const earnedConveyance = Math.round(split.conveyance * ratio);
  const earnedAllowances = Math.round(split.allowances * ratio);

  const ot = calculateOvertimeAmount(overtimeEntries, settings);

  const driverIncentive = employee.subDepotCategory === 'DRIVERS'
    ? calculateTieredIncentive(branch, summary.presentDays, 'DRIVERS')
    : 0;
  const incentive = employee.subDepotCategory === 'DRIVERS'
    ? 0
    : (branch?.incentiveType === 'PERCENTAGE'
        ? Math.round(salary * ((branch?.incentiveValue || 0) / 100))
        : (branch?.incentiveValue || 0));

  const totalEarnings = Math.round(earnedGross + ot.amount + driverIncentive + incentive);

  const pfEnabled = employee.pfEnabled && employee.pfRegistrationStatus === 'COMPLETED';
  const pfDeduction = calculatePF(pfEnabled, split.basic, earnedBasic);

  const esicEnabled = employee.esicEnabled && employee.esicRegistrationStatus === 'COMPLETED';
  const esicDeduction = calculateESIC(esicEnabled, salary, split.conveyance, totalEarnings);

  const tdsDeduction = salary * 12 > settings.tdsThreshold
    ? Math.round(totalEarnings * (settings.tdsRate / 100))
    : 0;

  const ptDeduction = calculatePT(totalEarnings, month, employee.gender);

  const totalDeductions = pfDeduction + esicDeduction + tdsDeduction + ptDeduction + Math.round(lopDeduction);
  const netSalary = Math.round(totalEarnings - totalDeductions);

  return {
    fullBasic: split.basic,
    fullHra: split.hra,
    fullConveyance: split.conveyance,
    fullAllowances: split.allowances,
    fullGross: split.gross,
    earnedBasic,
    earnedHra,
    earnedConveyance,
    earnedAllowances,
    earnedGross: Math.round(earnedGross),
    presentDays: summary.presentDays,
    paidLeaveDays: summary.paidLeaveDays,
    holidayDays: summary.holidayDays,
    weekOffDays: summary.weekOffDays,
    absentDays: summary.absentDays,
    lopDays: summary.lopDays,
    daysInMonth,
    effectiveDays,
    overtimeHours: ot.hours,
    overtimeDays: ot.days,
    overtimeAmount: ot.amount,
    driverIncentive,
    incentive,
    totalEarnings,
    lopDeduction: Math.round(lopDeduction),
    pfDeduction,
    esicDeduction,
    tdsDeduction,
    ptDeduction,
    otherDeductions: 0,
    totalDeductions,
    netSalary,
    perDaySalary: round(perDaySalary),
  };
}
