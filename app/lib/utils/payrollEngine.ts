import { Employee, Branch, Attendance, AttendanceRecord } from '../types';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface PayrollResult {
  baseSalary: number;
  lopDeduction: number;
  incentive: number;
  pf: number;
  esic: number;
  gross: number;
  deductions: number;
  net: number;
}

export const calculatePayroll = (
  employee: Employee, 
  branch: Branch, 
  attendance: Attendance, 
  month: number, 
  year: number
): PayrollResult => {
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = monthEnd.getDate();
  
  // Get attendance records for this month
  const empAttendance = attendance[employee.id] || {};
  
  let lopDays = 0;
  
  // Only count LOP from the attendance calendar
  Object.entries(empAttendance).forEach(([date, record]) => {
    const d = new Date(date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      if (record.status === 'LOP') lopDays++;
    }
  });

  const baseSalary = employee.salary;
  const salaryPerDay = baseSalary / daysInMonth;
  const lopDeduction = salaryPerDay * lopDays;

  // Calculate Incentive based on branch
  let incentive = 0;
  if (branch.incentiveType === 'FIXED') {
    incentive = branch.incentiveValue;
  } else {
    incentive = (baseSalary * branch.incentiveValue) / 100;
  }

  const grossBeforeDeductions = baseSalary + incentive - lopDeduction;
  
  const pf = employee.pfEnabled ? (baseSalary * 0.12) : 0;
  const esic = employee.esicEnabled ? (baseSalary * 0.0075) : 0;

  const totalDeductions = pf + esic + lopDeduction;
  const netSalary = baseSalary + incentive - totalDeductions;

  return {
    baseSalary,
    lopDeduction,
    incentive,
    pf,
    esic,
    gross: baseSalary + incentive,
    deductions: totalDeductions,
    net: netSalary
  };
};
