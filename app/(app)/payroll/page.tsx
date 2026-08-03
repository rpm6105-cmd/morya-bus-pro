'use client';

import { useState, useEffect } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { Employee, PayrollEntry, OvertimeType } from '../../lib/types';
import { calculatePayroll as calcPayroll } from '../../lib/utils/payrollCalc';
import {
  Calculator, Download, DollarSign, Users, TrendingUp,
  ChevronLeft, ChevronRight, FileText, Printer, CreditCard, Clock, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function PayrollPage() {
  const { user, isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toLocaleString('default', { month: 'short' });
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
  const [showPayslip, setShowPayslip] = useState(false);

  const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(selectedMonth) + 1;
  const years = [2024, 2025, 2026];

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, user]);

  const loadData = () => {
    const depotId = isAdmin ? undefined : user?.depotId;
    setEmployees(dataService.getEmployees(depotId));
    const entries = isAdmin 
      ? dataService.getPayroll(selectedMonth, selectedYear)
      : dataService.getPayrollByBranch(user?.depotId || '', selectedMonth, selectedYear);
    setPayrollEntries(entries);
  };

  const calculatePayroll = (emp: Employee) => {
    const calc = calcPayroll({
      employee: emp,
      branch: dataService.getBranchById(emp.branchId),
      attendanceRecords: dataService.getAttendance(emp.id, monthIndex, selectedYear) as Record<string, any>,
      overtimeEntries: dataService.getOvertime(emp.id, monthIndex, selectedYear),
      settings: dataService.getSettings(),
      month: monthIndex,
      year: selectedYear,
    });

    return {
      basicSalary: calc.fullBasic,
      hra: calc.fullHra,
      conveyance: calc.fullConveyance,
      otherAllowances: calc.fullAllowances,
      grossSalary: calc.fullGross,
      presentDays: calc.presentDays,
      paidLeaveDays: calc.paidLeaveDays,
      holidayDays: calc.holidayDays,
      weekOffDays: calc.weekOffDays,
      absentDays: calc.absentDays,
      lopDays: calc.lopDays,
      lopDeduction: calc.lopDeduction,
      overtimeHours: calc.overtimeHours,
      overtimeDays: calc.overtimeDays,
      overtimeType: calc.overtimeHours > 0 ? 'HOURLY' : calc.overtimeDays > 0 ? 'FULL_DAY' : undefined,
      overtimeAmount: calc.overtimeAmount,
      driverIncentive: calc.driverIncentive,
      incentive: calc.incentive,
      totalEarnings: calc.totalEarnings,
      pfDeduction: calc.pfDeduction,
      esicDeduction: calc.esicDeduction,
      tdsDeduction: calc.tdsDeduction,
      ptDeduction: calc.ptDeduction,
      otherDeductions: 0,
      totalDeductions: calc.totalDeductions,
      netSalary: calc.netSalary,
      earnedBasic: calc.earnedBasic,
      earnedHra: calc.earnedHra,
      earnedConveyance: calc.earnedConveyance,
      earnedAllowances: calc.earnedAllowances,
      earnedGross: calc.earnedGross,
    };
  };

  const processPayroll = async () => {
    setProcessing(true);

    const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
    const daysInMonth = new Date(selectedYear, monthIndex, 0).getDate();
    const incomplete: { name: string; count: number }[] = [];
    for (const emp of activeEmployees) {
      const att = dataService.getAttendance(emp.id, monthIndex, selectedYear) as Record<string, any>;
      let unmarked = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${String(monthIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = new Date(selectedYear, monthIndex - 1, d).getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        if (!att[dateStr]) unmarked++;
      }
      if (unmarked > 0) incomplete.push({ name: emp.name, count: unmarked });
    }

    if (incomplete.length > 0) {
      const names = incomplete.slice(0, 5).map(x => `• ${x.name} (${x.count} unmarked)`).join('\n');
      const more = incomplete.length > 5 ? `\n...and ${incomplete.length - 5} more` : '';
      const proceed = confirm(
        `Attendance is incomplete for ${incomplete.length} employee(s).\n\n${names}${more}\n\nPayroll will be calculated only from the recorded attendance. Continue processing?`
      );
      if (!proceed) {
        setProcessing(false);
        return;
      }
    }

    for (const emp of activeEmployees) {
      const existingEntry = payrollEntries.find(p => p.employeeId === emp.id);
      if (!existingEntry || existingEntry.status === 'DRAFT') {
        const payroll = calculatePayroll(emp);
        const entry: Omit<PayrollEntry, 'id'> = {
          employeeId: emp.id,
          month: selectedMonth,
          year: selectedYear,
          depotId: emp.branchId,
          ...payroll,
          overtimeType: payroll.overtimeType as OvertimeType | undefined,
          status: 'PROCESSED',
          processedBy: user?.id || 'system',
          processedAt: new Date().toISOString()
        };
        dataService.addPayroll(entry);
      }
    }

    setProcessing(false);
    toast.success(`Payroll processed for ${employees.filter(e => e.status === 'ACTIVE').length} employees`);
    loadData();
  };

  const getCalcForEntry = (entry: PayrollEntry) => {
    const emp = employees.find(e => e.id === entry.employeeId);
    if (!emp) return null;
    return calcPayroll({
      employee: emp,
      branch: dataService.getBranchById(emp.branchId),
      attendanceRecords: dataService.getAttendance(emp.id, monthIndex, selectedYear) as Record<string, any>,
      overtimeEntries: dataService.getOvertime(emp.id, monthIndex, selectedYear),
      settings: dataService.getSettings(),
      month: monthIndex,
      year: selectedYear,
    });
  };

  const generatePayslip = (entry: PayrollEntry) => {
    const emp = employees.find(e => e.id === entry.employeeId);
    const branch = dataService.getBranchById(emp?.branchId || '');
    if (!emp) return;
    const calc = getCalcForEntry(entry);
    if (!calc) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const M = 15;
    const innerW = W - M * 2;

    const NAVY: [number, number, number] = [15, 76, 129];
    const LIGHT: [number, number, number] = [245, 247, 251];
    const DARK: [number, number, number] = [31, 41, 55];
    const GRAY: [number, number, number] = [100, 116, 139];
    const BORDER: [number, number, number] = [221, 228, 235];

    const fmtDate = (d?: string) => {
      if (!d) return 'N/A';
      const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d);
      if (isNaN(dt.getTime())) return 'N/A';
      const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getMonth()];
      return `${String(dt.getDate()).padStart(2, '0')}-${mon}-${dt.getFullYear()}`;
    };
    const maskAccount = (acct?: string) => (acct && acct.length > 4 ? `XXXXXX${acct.slice(-4)}` : (acct || 'N/A'));

    const payDate = new Date(selectedYear, monthIndex, 0);
    const payDateStr = fmtDate(`${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}-${String(payDate.getDate()).padStart(2, '0')}`);

    const drawCell = (x: number, y: number, w: number, h: number, text: string, opts: { bold?: boolean; align?: 'left' | 'center' | 'right'; color?: [number, number, number]; size?: number; bg?: [number, number, number] } = {}) => {
      if (opts.bg) {
        doc.setFillColor(...opts.bg);
        doc.rect(x, y, w, h, 'F');
      }
      doc.setDrawColor(...BORDER);
      doc.rect(x, y, w, h, 'S');
      doc.setTextColor(...(opts.color || DARK));
      doc.setFontSize(opts.size || 9);
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.text(text, opts.align === 'right' ? x + w - 5 : x + 5, y + h / 2 + 1.5, { align: opts.align || 'left' });
    };

    // Header band
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 42, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(M + 9, 17, 9, 'F');
    doc.setTextColor(...NAVY);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('MB', M + 9, 20, { align: 'center' });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MORYA BUS SERVICES', M + 23, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(branch ? `${branch.name}, ${branch.city}, ${branch.state}` : 'Morya Bus Services', M + 23, 21);
    doc.text('www.moryabuses.com', M + 23, 27);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('PAY SLIP', W - M, 17, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Salary Month : ${selectedMonth} ${selectedYear}`, W - M, 25, { align: 'right' });

    // Employee details grid
    const details: [string, string, string, string][] = [
      ['Employee Name', emp.name, 'Employee ID', emp.employeeId],
      ['Department', emp.department, 'Designation', emp.designation],
      ['Date of Joining', fmtDate(emp.joiningDate), 'Pay Date', payDateStr],
      ['Bank', emp.bankName || 'N/A', 'Account No.', maskAccount(emp.bankAccount)],
      ['PAN', emp.panNumber || 'N/A', 'UAN', emp.pfUanNumber || 'N/A'],
    ];
    const cellH = 10;
    let y = 50;
    const col1LabelX = M, col1LabelW = 32, col1ValueW = 58, col2LabelW = 32, col2ValueW = 58;
    details.forEach(([l1, v1, l2, v2]) => {
      drawCell(col1LabelX, y, col1LabelW, cellH, l1, { bold: true, color: GRAY, bg: LIGHT });
      drawCell(col1LabelX + col1LabelW, y, col1ValueW, cellH, v1);
      drawCell(col1LabelX + col1LabelW + col1ValueW, y, col2LabelW, cellH, l2, { bold: true, color: GRAY, bg: LIGHT });
      drawCell(col1LabelX + col1LabelW + col1ValueW + col2LabelW, y, col2ValueW, cellH, v2);
      y += cellH;
    });
    y += 6;

    // Earnings vs Deductions table
    const earningsData: [string, number][] = [
      ['Basic Salary', calc.earnedBasic],
      ['House Rent Allowance', calc.earnedHra],
      ['Conveyance Allowance', calc.earnedConveyance],
      ['Other Allowances', calc.earnedAllowances],
    ];
    if (calc.incentive > 0) earningsData.push(['Incentive', calc.incentive]);
    if (calc.driverIncentive > 0) earningsData.push(['Driver Incentive', calc.driverIncentive]);
    if (calc.overtimeAmount > 0) earningsData.push([`Overtime (${calc.overtimeHours}h/${calc.overtimeDays}d)`, calc.overtimeAmount]);

    const deductionsData: [string, number][] = [];
    if (calc.pfDeduction > 0) deductionsData.push(['Provident Fund', calc.pfDeduction]);
    if (calc.ptDeduction > 0) deductionsData.push(['Professional Tax', calc.ptDeduction]);
    if (calc.esicDeduction > 0) deductionsData.push(['ESIC', calc.esicDeduction]);
    if (calc.tdsDeduction > 0) deductionsData.push(['Income Tax', calc.tdsDeduction]);
    if (calc.lopDeduction > 0) deductionsData.push(['LOP Deduction', calc.lopDeduction]);
    if (calc.otherDeductions > 0) deductionsData.push(['Other Deductions', calc.otherDeductions]);

    const rowCount = Math.max(earningsData.length, deductionsData.length);
    const rowH = 9;

    const eLabelW = 58, eValueW = 32, dLabelW = 58, dValueW = 32;
    drawCell(M, y, eLabelW, rowH + 3, 'Earnings', { bold: true, size: 10, bg: LIGHT });
    drawCell(M + eLabelW, y, eValueW, rowH + 3, 'Amount', { bold: true, size: 10, bg: LIGHT, align: 'right' });
    drawCell(M + eLabelW + eValueW, y, dLabelW, rowH + 3, 'Deductions', { bold: true, size: 10, bg: LIGHT });
    drawCell(M + eLabelW + eValueW + dLabelW, y, dValueW, rowH + 3, 'Amount', { bold: true, size: 10, bg: LIGHT, align: 'right' });
    y += rowH + 3;

    for (let i = 0; i < rowCount; i++) {
      if (i < earningsData.length) {
        const [label, value] = earningsData[i];
        drawCell(M, y, eLabelW, rowH, label);
        drawCell(M + eLabelW, y, eValueW, rowH, `₹${Number(value).toLocaleString()}`, { align: 'right' });
      } else {
        drawCell(M, y, eLabelW, rowH, '');
        drawCell(M + eLabelW, y, eValueW, rowH, '');
      }
      if (i < deductionsData.length) {
        const [label, value] = deductionsData[i];
        drawCell(M + eLabelW + eValueW, y, dLabelW, rowH, label);
        drawCell(M + eLabelW + eValueW + dLabelW, y, dValueW, rowH, `₹${Number(value).toLocaleString()}`, { align: 'right' });
      } else {
        drawCell(M + eLabelW + eValueW, y, dLabelW, rowH, '');
        drawCell(M + eLabelW + eValueW + dLabelW, y, dValueW, rowH, '');
      }
      y += rowH;
    }

    const footBg: [number, number, number] = [250, 250, 250];
    drawCell(M, y, eLabelW, rowH, 'Gross Earnings', { bold: true, bg: footBg });
    drawCell(M + eLabelW, y, eValueW, rowH, `₹${calc.totalEarnings.toLocaleString()}`, { bold: true, bg: footBg, align: 'right' });
    drawCell(M + eLabelW + eValueW, y, dLabelW, rowH, 'Total Deductions', { bold: true, bg: footBg });
    drawCell(M + eLabelW + eValueW + dLabelW, y, dValueW, rowH, `₹${calc.totalDeductions.toLocaleString()}`, { bold: true, bg: footBg, align: 'right' });
    y += rowH + 12;

    // Net pay bar
    doc.setFillColor(...NAVY);
    doc.roundedRect(M, y, innerW, 26, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAY', M + 10, y + 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rupees ${numberToWords(calc.netSalary)} Only`, M + 10, y + 19);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${calc.netSalary.toLocaleString()}`, W - M - 10, y + 15, { align: 'right' });
    y += 26 + 22;

    // Signatures
    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.4);
    doc.line(W / 2 - 55, y + 12, W / 2 - 5, y + 12);
    doc.line(W / 2 + 5, y + 12, W / 2 + 55, y + 12);
    doc.setLineWidth(0.2);
    doc.setTextColor(...GRAY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Employer Signature', W / 2 - 30, y + 20, { align: 'center' });
    doc.text('Employee Signature', W / 2 + 30, y + 20, { align: 'center' });

    // Footer
    const footerY = y + 34;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(M, footerY, W - M, footerY);
    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.text('This is a computer-generated payslip and does not require a physical signature.', W / 2, footerY + 6, { align: 'center' });
    doc.text('Morya Bus Services - HRMS Pro | www.moryabuses.com', W / 2, footerY + 12, { align: 'center' });

    doc.save(`Payslip_${emp.employeeId}_${selectedMonth}_${selectedYear}.pdf`);
    toast.success('Payslip generated');
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
  };

  const stats = {
    totalEmployees: employees.filter(e => e.status === 'ACTIVE').length,
    totalGross: payrollEntries.reduce((sum, p) => sum + p.grossSalary, 0),
    totalOT: payrollEntries.reduce((sum, p) => sum + (p.overtimeAmount || 0), 0),
    totalDeductions: payrollEntries.reduce((sum, p) => sum + p.totalDeductions, 0),
    totalNet: payrollEntries.reduce((sum, p) => sum + p.netSalary, 0)
  };

  const chartData = employees.slice(0, 10).map(emp => {
    const entry = payrollEntries.find(p => p.employeeId === emp.id);
    return {
      name: emp.name.split(' ')[0],
      gross: entry?.grossSalary || 0,
      net: entry?.netSalary || 0,
      ot: entry?.overtimeAmount || 0
    };
  });

  if (!isAdmin) {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <ShieldAlert size={32} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '16px 0 8px' }}>Admin Only</h2>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
            Payroll processing is restricted to the Administrator. HR can view the processed results in the Salary Sheet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Payroll Management</h1>
          <p style={styles.subtitle}>Process and manage employee salaries with overtime</p>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.monthSelector}>
            <button onClick={() => {
              const idx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(selectedMonth);
              if (idx > 0) setSelectedMonth(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][idx - 1]);
              else { setSelectedMonth('Dec'); setSelectedYear(selectedYear - 1); }
            }} style={styles.navBtn}>
              <ChevronLeft size={16} />
            </button>
            <span style={styles.monthLabel}>{selectedMonth} {selectedYear}</span>
            <button onClick={() => {
              const idx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(selectedMonth);
              if (idx < 11) setSelectedMonth(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][idx + 1]);
              else { setSelectedMonth('Jan'); setSelectedYear(selectedYear + 1); }
            }} style={styles.navBtn}>
              <ChevronRight size={16} />
            </button>
          </div>
          <button style={styles.exportBtn} onClick={() => {
            const data = payrollEntries.map(p => {
              const emp = employees.find(e => e.id === p.employeeId);
              return {
                'Employee ID': emp?.employeeId,
                'Name': emp?.name,
                'Basic': p.basicSalary,
                'HRA': p.hra,
                'Gross': p.grossSalary,
                'Overtime': p.overtimeAmount,
                'PF': p.pfDeduction,
                'ESIC': p.esicDeduction,
                'TDS': p.tdsDeduction,
                'Net': p.netSalary
              };
            });
            const headers = Object.keys(data[0] || {}).join(',');
            const csv = headers + '\n' + data.map(row => Object.values(row).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payroll_${selectedMonth}_${selectedYear}.csv`;
            a.click();
            toast.success('Payroll CSV exported');
          }}>
            <Download size={16} />
            Export
          </button>
          <button 
            style={styles.processBtn} 
            onClick={processPayroll}
            disabled={processing}
          >
            <Calculator size={16} />
            {processing ? 'Processing...' : 'Process Payroll'}
          </button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#dbeafe' }}>
            <Users size={24} color="#3b82f6" />
          </div>
          <div>
            <p style={styles.statLabel}>Total Employees</p>
            <p style={styles.statValue}>{stats.totalEmployees}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#dcfce7' }}>
            <DollarSign size={24} color="#10b981" />
          </div>
          <div>
            <p style={styles.statLabel}>Total Gross</p>
            <p style={styles.statValue}>₹{stats.totalGross.toLocaleString()}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#fef3c7' }}>
            <Clock size={24} color="#f59e0b" />
          </div>
          <div>
            <p style={styles.statLabel}>Total Overtime</p>
            <p style={styles.statValue}>₹{stats.totalOT.toLocaleString()}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#fee2e2' }}>
            <TrendingUp size={24} color="#ef4444" />
          </div>
          <div>
            <p style={styles.statLabel}>Total Deductions</p>
            <p style={styles.statValue}>₹{stats.totalDeductions.toLocaleString()}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#f0fdf4' }}>
            <Calculator size={24} color="#10b981" />
          </div>
          <div>
            <p style={styles.statLabel}>Total Net Pay</p>
            <p style={styles.statValue}>₹{stats.totalNet.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div style={styles.chartSection}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Earnings Comparison (Top 10)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
              <Bar dataKey="gross" fill="#3b82f6" name="Gross" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ot" fill="#f59e0b" name="Overtime" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" fill="#10b981" name="Net" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <div style={styles.tableHeader}>
          <h3>Payroll Entries</h3>
          <span style={styles.countBadge}>{payrollEntries.length} entries</span>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Basic</th>
              <th style={styles.th}>HRA</th>
              <th style={styles.th}>Gross</th>
              <th style={styles.th}>Overtime</th>
              <th style={styles.th}>Deductions</th>
              <th style={styles.th}>Net Salary</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payrollEntries.slice(0, 50).map((entry, index) => {
              const emp = employees.find(e => e.id === entry.employeeId);
              if (!emp) return null;
              return (
                <tr key={`${entry.id}-${index}`} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.empCell}>
                      <div style={styles.avatar}>{emp.name.charAt(0)}</div>
                      <div>
                        <p style={styles.empName}>{emp.name}</p>
                        <p style={styles.empId}>{emp.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>₹{entry.basicSalary.toLocaleString()}</td>
                  <td style={styles.td}>₹{entry.hra.toLocaleString()}</td>
                  <td style={styles.td}>₹{entry.grossSalary.toLocaleString()}</td>
                  <td style={styles.td}>
                    {entry.overtimeAmount > 0 && (
                      <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                        ₹{entry.overtimeAmount.toLocaleString()}
                      </span>
                    )}
                    {entry.overtimeAmount === 0 && <span style={{ color: '#94a3b8' }}>-</span>}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.deduction}>-₹{entry.totalDeductions.toLocaleString()}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.netSalary}>₹{entry.netSalary.toLocaleString()}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      background: entry.status === 'PAID' ? '#dcfce7' : entry.status === 'APPROVED' ? '#dbeafe' : '#fef3c7',
                      color: entry.status === 'PAID' ? '#166534' : entry.status === 'APPROVED' ? '#1e40af' : '#92400e'
                    }}>
                      {entry.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button onClick={() => generatePayslip(entry)} style={styles.actionBtn} title="Generate Payslip">
                        <FileText size={16} color="#10b981" />
                      </button>
                      <button onClick={() => { setSelectedEntry(entry); setShowPayslip(true); }} style={styles.actionBtn} title="View Details">
                        <Printer size={16} color="#3b82f6" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {payrollEntries.length === 0 && (
          <div style={styles.emptyState}>
            <Calculator size={48} color="#94a3b8" />
            <p>No payroll entries for {selectedMonth} {selectedYear}</p>
            <button style={styles.emptyBtn} onClick={processPayroll}>
              Process Payroll Now
            </button>
          </div>
        )}
      </div>

      {showPayslip && selectedEntry && (() => {
        const previewCalc = getCalcForEntry(selectedEntry);
        if (!previewCalc) return null;
        const previewEmp = employees.find(e => e.id === selectedEntry.employeeId);
        const previewBranch = dataService.getBranchById(previewEmp?.branchId || '');
        const fmtD = (d?: string) => {
          if (!d) return 'N/A';
          const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d);
          if (isNaN(dt.getTime())) return 'N/A';
          const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getMonth()];
          return `${String(dt.getDate()).padStart(2, '0')}-${mon}-${dt.getFullYear()}`;
        };
        const maskAcct = (a?: string) => (a && a.length > 4 ? `XXXXXX${a.slice(-4)}` : (a || 'N/A'));
        const pPayDate = new Date(selectedYear, monthIndex, 0);
        const pPayDateStr = fmtD(`${pPayDate.getFullYear()}-${String(pPayDate.getMonth() + 1).padStart(2, '0')}-${String(pPayDate.getDate()).padStart(2, '0')}`);

        const previewEarnings: [string, number][] = [
          ['Basic Salary', previewCalc.earnedBasic],
          ['House Rent Allowance', previewCalc.earnedHra],
          ['Conveyance Allowance', previewCalc.earnedConveyance],
          ['Other Allowances', previewCalc.earnedAllowances],
        ];
        if (previewCalc.incentive > 0) previewEarnings.push(['Incentive', previewCalc.incentive]);
        if (previewCalc.driverIncentive > 0) previewEarnings.push(['Driver Incentive', previewCalc.driverIncentive]);
        if (previewCalc.overtimeAmount > 0) previewEarnings.push([`Overtime (${previewCalc.overtimeHours}h/${previewCalc.overtimeDays}d)`, previewCalc.overtimeAmount]);

        const previewDeductions: [string, number][] = [];
        if (previewCalc.pfDeduction > 0) previewDeductions.push(['Provident Fund', previewCalc.pfDeduction]);
        if (previewCalc.ptDeduction > 0) previewDeductions.push(['Professional Tax', previewCalc.ptDeduction]);
        if (previewCalc.esicDeduction > 0) previewDeductions.push(['ESIC', previewCalc.esicDeduction]);
        if (previewCalc.tdsDeduction > 0) previewDeductions.push(['Income Tax', previewCalc.tdsDeduction]);
        if (previewCalc.lopDeduction > 0) previewDeductions.push(['LOP Deduction', previewCalc.lopDeduction]);
        if (previewCalc.otherDeductions > 0) previewDeductions.push(['Other Deductions', previewCalc.otherDeductions]);

        const previewRowCount = Math.max(previewEarnings.length, previewDeductions.length);

        return (
        <div style={styles.modalOverlay} onClick={() => setShowPayslip(false)}>
          <div style={{ ...styles.modal, maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Payslip Preview</h2>
              <button onClick={() => setShowPayslip(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.payslipPreview}>
              <div style={styles.payslipHeader}>
                <div style={styles.payslipHeaderLeft}>
                  <div style={styles.payslipLogo}>MB</div>
                  <div>
                    <div style={styles.payslipCompany}>MORYA BUS SERVICES</div>
                    <div style={styles.payslipSub}>{previewBranch ? `${previewBranch.name}, ${previewBranch.city}, ${previewBranch.state}` : 'Morya Bus Services'}</div>
                    <div style={styles.payslipSub}>www.moryabuses.com</div>
                  </div>
                </div>
                <div style={styles.payslipHeaderRight}>
                  <div style={styles.payslipTitle}>PAY SLIP</div>
                  <div style={styles.payslipMonth}>Salary Month : {selectedMonth} {selectedYear}</div>
                </div>
              </div>

              <table style={styles.payslipTable}>
                <tbody>
                  <tr>
                    <td style={styles.psLabel}>Employee Name</td>
                    <td style={styles.psValue}>{previewEmp?.name || 'N/A'}</td>
                    <td style={styles.psLabel}>Employee ID</td>
                    <td style={styles.psValue}>{previewEmp?.employeeId || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={styles.psLabel}>Department</td>
                    <td style={styles.psValue}>{previewEmp?.department || 'N/A'}</td>
                    <td style={styles.psLabel}>Designation</td>
                    <td style={styles.psValue}>{previewEmp?.designation || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={styles.psLabel}>Date of Joining</td>
                    <td style={styles.psValue}>{fmtD(previewEmp?.joiningDate)}</td>
                    <td style={styles.psLabel}>Pay Date</td>
                    <td style={styles.psValue}>{pPayDateStr}</td>
                  </tr>
                  <tr>
                    <td style={styles.psLabel}>Bank</td>
                    <td style={styles.psValue}>{previewEmp?.bankName || 'N/A'}</td>
                    <td style={styles.psLabel}>Account No.</td>
                    <td style={styles.psValue}>{maskAcct(previewEmp?.bankAccount)}</td>
                  </tr>
                  <tr>
                    <td style={styles.psLabel}>PAN</td>
                    <td style={styles.psValue}>{previewEmp?.panNumber || 'N/A'}</td>
                    <td style={styles.psLabel}>UAN</td>
                    <td style={styles.psValue}>{previewEmp?.pfUanNumber || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>

              <table style={styles.payslipTable}>
                <thead>
                  <tr>
                    <th style={styles.psTh}>Earnings</th>
                    <th style={styles.psTh}>Amount</th>
                    <th style={styles.psTh}>Deductions</th>
                    <th style={styles.psTh}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: previewRowCount }).map((_, i) => (
                    <tr key={i}>
                      <td style={styles.psTd}>{i < previewEarnings.length ? previewEarnings[i][0] : ''}</td>
                      <td style={styles.psTdRight}>{i < previewEarnings.length ? `₹${previewEarnings[i][1].toLocaleString()}` : ''}</td>
                      <td style={styles.psTd}>{i < previewDeductions.length ? previewDeductions[i][0] : ''}</td>
                      <td style={styles.psTdRight}>{i < previewDeductions.length ? `₹${previewDeductions[i][1].toLocaleString()}` : ''}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={styles.psFoot}>Gross Earnings</td>
                    <td style={styles.psFootRight}>₹{previewCalc.totalEarnings.toLocaleString()}</td>
                    <td style={styles.psFoot}>Total Deductions</td>
                    <td style={styles.psFootRight}>₹{previewCalc.totalDeductions.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div style={styles.netPayBar}>
                <div>
                  <div style={styles.netPayLabel}>NET PAY</div>
                  <div style={styles.netPayWords}>Rupees {numberToWords(previewCalc.netSalary)} Only</div>
                </div>
                <div style={styles.netPayAmt}>₹{previewCalc.netSalary.toLocaleString()}</div>
              </div>

              <div style={styles.signatures}>
                <div style={styles.signBox}>
                  <div style={styles.signLine} />
                  <span>Employer Signature</span>
                </div>
                <div style={styles.signBox}>
                  <div style={styles.signLine} />
                  <span>Employee Signature</span>
                </div>
              </div>

              <div style={styles.payslipFooter}>
                This is a computer-generated payslip and does not require a physical signature.
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => generatePayslip(selectedEntry)} style={styles.downloadBtn}>
                <Download size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
  headerActions: { display: 'flex', gap: '12px', alignItems: 'center' },
  monthSelector: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' },
  navBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  monthLabel: { fontSize: '14px', fontWeight: '600', minWidth: '100px', textAlign: 'center' },
  exportBtn: { padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  processBtn: { padding: '10px 16px', background: '#10b981', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { background: '#fff', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statIcon: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '13px', color: '#64748b', margin: '0 0 4px' },
  statValue: { fontSize: '24px', fontWeight: '600', color: '#0f172a', margin: 0 },
  chartSection: { marginBottom: '24px' },
  chartCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  chartTitle: { fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px' },
  tableContainer: { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' },
  countBadge: { fontSize: '12px', padding: '4px 10px', background: '#f1f5f9', borderRadius: '12px', color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#475569' },
  empCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '13px' },
  empName: { fontWeight: '500', color: '#0f172a', margin: 0 },
  empId: { fontSize: '12px', color: '#94a3b8', margin: 0 },
  deduction: { color: '#ef4444' },
  netSalary: { fontWeight: '600', color: '#10b981' },
  statusBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' },
  actions: { display: 'flex', gap: '8px' },
  actionBtn: { padding: '6px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyState: { padding: '60px 20px', textAlign: 'center' },
  emptyBtn: { marginTop: '16px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' },
  payslipPreview: { padding: '24px' },
  payslipHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0F4C81', color: '#fff', borderRadius: '8px', padding: '20px 24px', marginBottom: '16px' },
  payslipHeaderLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  payslipLogo: { width: '46px', height: '46px', borderRadius: '50%', background: '#fff', color: '#0F4C81', fontWeight: '700', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  payslipCompany: { fontSize: '20px', fontWeight: '700', letterSpacing: '0.5px' },
  payslipSub: { fontSize: '12px', opacity: '0.9', marginTop: '2px' },
  payslipHeaderRight: { textAlign: 'right' },
  payslipTitle: { fontSize: '30px', fontWeight: '700', letterSpacing: '1px' },
  payslipMonth: { fontSize: '13px', marginTop: '4px' },
  payslipTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' },
  psLabel: { padding: '8px 10px', background: '#f5f7fb', color: '#64748b', fontWeight: '600', border: '1px solid #dde4eb', width: '25%' },
  psValue: { padding: '8px 10px', color: '#1f2937', border: '1px solid #dde4eb', width: '25%' },
  psTh: { padding: '10px', textAlign: 'left', background: '#f5f7fb', color: '#0f172a', fontWeight: '600', border: '1px solid #dde4eb', fontSize: '13px' },
  psTd: { padding: '8px 10px', border: '1px solid #dde4eb', color: '#1f2937' },
  psTdRight: { padding: '8px 10px', border: '1px solid #dde4eb', textAlign: 'right', color: '#1f2937' },
  psFoot: { padding: '8px 10px', border: '1px solid #dde4eb', fontWeight: '700', background: '#fafafa', color: '#0f172a' },
  psFootRight: { padding: '8px 10px', border: '1px solid #dde4eb', fontWeight: '700', textAlign: 'right', background: '#fafafa', color: '#0f172a' },
  netPayBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0F4C81', color: '#fff', borderRadius: '6px', padding: '16px 20px', margin: '16px 0 24px' },
  netPayLabel: { fontSize: '16px', fontWeight: '700' },
  netPayWords: { fontSize: '12px', marginTop: '4px', opacity: '0.95' },
  netPayAmt: { fontSize: '26px', fontWeight: '700' },
  signatures: { display: 'flex', justifyContent: 'space-around', padding: '0 20px', marginBottom: '24px' },
  signBox: { textAlign: 'center', width: '200px', fontSize: '12px', color: '#475569' },
  signLine: { borderTop: '1px solid #334155', marginBottom: '8px' },
  payslipFooter: { textAlign: 'center', color: '#94a3b8', fontSize: '11px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' },
  modalFooter: { padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' },
  downloadBtn: { padding: '10px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }
};
