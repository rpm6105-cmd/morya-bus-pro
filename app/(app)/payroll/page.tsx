'use client';

import { useState, useEffect } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { Employee, PayrollEntry, OvertimeType } from '../../lib/types';
import { calculateTieredIncentive } from '../../lib/utils/incentive';
import {
  Calculator, Download, DollarSign, Users, TrendingUp,
  ChevronLeft, ChevronRight, FileText, Printer, CreditCard, Clock
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
    const basic = Math.round(emp.salary * 0.5);
    const hra = Math.round(emp.salary * 0.2);
    const conveyance = Math.round(emp.salary * 0.1);
    const otherAllowances = emp.salary - basic - hra - conveyance;
    const grossSalary = emp.salary;
    
    const attendance = dataService.getAttendance(emp.id, monthIndex, selectedYear) as Record<string, any>;
    let presentDays = 0, absentDays = 0, paidLeaveDays = 0, holidayDays = 0, weekOffDays = 0, lopDays = 0;
    
    Object.values(attendance).forEach(record => {
      switch (record.status) {
        case 'P': presentDays++; break;
        case 'A': absentDays++; lopDays++; break;
        case 'LOP': lopDays++; break;
        case 'PL': paidLeaveDays++; break;
        case 'H': holidayDays++; break;
        case 'WO': weekOffDays++; break;
      }
    });

    const perDaySalary = emp.salary / 30;
    const lopDeduction = Math.round(lopDays * perDaySalary);
    
    const overtimeEntries = dataService.getOvertime(emp.id, monthIndex, selectedYear);
    const approvedOT = overtimeEntries.filter(o => o.status === 'APPROVED');
    
    const settings = dataService.getSettings();
    let overtimeHours = 0;
    let overtimeDays = 0;
    let overtimeAmount = 0;
    approvedOT.forEach(ot => {
      if (ot.type === 'HOURLY' && ot.hours) {
        overtimeHours += ot.hours;
        overtimeAmount += ot.amount || (ot.hours * (ot.rate || settings.overtimeSettings.hourlyRate));
      } else if (ot.type === 'FULL_DAY') {
        overtimeDays++;
        overtimeAmount += ot.amount || (ot.rate || settings.overtimeSettings.fullDayRate);
      }
    });
    
    const branch = dataService.getBranchById(emp.branchId);
    const driverIncentive = emp.subDepotCategory === 'DRIVERS'
      ? calculateTieredIncentive(branch, presentDays, 'DRIVERS')
      : 0;
    const incentive = emp.subDepotCategory === 'DRIVERS'
      ? 0
      : (branch?.incentiveType === 'PERCENTAGE'
          ? Math.round(emp.salary * ((branch?.incentiveValue || 0) / 100))
          : (branch?.incentiveValue || 0));
    
    const totalEarnings = grossSalary - lopDeduction + incentive + overtimeAmount + driverIncentive;
    
    const pfDeduction = emp.pfEnabled && emp.pfRegistrationStatus === 'COMPLETED' ? Math.round(basic * 0.12) : 0;
    const esicDeduction = emp.esicEnabled && emp.esicRegistrationStatus === 'COMPLETED' ? Math.round(totalEarnings * 0.0075) : 0;
    const tdsDeduction = emp.salary * 12 > 300000 ? Math.round(totalEarnings * 0.05) : 0;
    
    const totalDeductions = pfDeduction + esicDeduction + tdsDeduction + lopDeduction;
    const netSalary = totalEarnings - totalDeductions;

    return {
      basicSalary: basic,
      hra,
      conveyance,
      otherAllowances,
      grossSalary,
      presentDays,
      paidLeaveDays,
      holidayDays,
      weekOffDays,
      absentDays,
      lopDays,
      lopDeduction,
      overtimeHours,
      overtimeDays,
      overtimeType: overtimeHours > 0 ? 'HOURLY' : overtimeDays > 0 ? 'FULL_DAY' : undefined,
      overtimeAmount,
      driverIncentive,
      incentive,
      totalEarnings,
      pfDeduction,
      esicDeduction,
      tdsDeduction,
      otherDeductions: 0,
      totalDeductions,
      netSalary
    };
  };

  const processPayroll = async () => {
    setProcessing(true);
    
    for (const emp of employees.filter(e => e.status === 'ACTIVE')) {
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

  const generatePayslip = (entry: PayrollEntry) => {
    const emp = employees.find(e => e.id === entry.employeeId);
    const branch = dataService.getBranchById(emp?.branchId || '');
    if (!emp) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('MORYA BUS SERVICES', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('HRMS Pro - Salary Slip', pageWidth / 2, 32, { align: 'center' });
    
    doc.setFillColor(249, 250, 251);
    doc.rect(0, 45, pageWidth, 25, 'F');
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text(`Pay Period: ${selectedMonth} ${selectedYear}`, 15, 55);
    doc.text(`Processed: ${new Date().toLocaleDateString()}`, pageWidth - 15, 55, { align: 'right' });
    doc.text(`Doc No: MBS/${selectedYear}/${entry.id?.slice(-6).toUpperCase() || '000000'}`, 15, 63);
    doc.text(`Status: ${entry.status}`, pageWidth - 15, 63, { align: 'right' });
    
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 75, pageWidth - 20, 50, 3, 3, 'F');
    
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    
    const col1X = 15;
    const col2X = 110;
    
    doc.text('EMPLOYEE DETAILS', col1X, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    doc.text('Name:', col1X, 95);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.name, col1X + 25, 95);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Employee ID:', col1X, 102);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.employeeId, col1X + 30, 102);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Department:', col1X, 109);
    doc.setFont('helvetica', 'bold');
    doc.text(`${emp.department} (${emp.subDepotCategory})`, col1X + 30, 109);
    
    doc.text('Designation:', col1X, 116);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.designation, col1X + 30, 116);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Bank A/C:', col2X, 95);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.bankAccount, col2X + 25, 95);
    
    doc.setFont('helvetica', 'normal');
    doc.text('IFSC:', col2X, 102);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.ifscCode, col2X + 25, 102);
    
    doc.setFont('helvetica', 'normal');
    doc.text('UAN:', col2X, 109);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.pfUanNumber || 'N/A', col2X + 25, 109);
    
    doc.setFont('helvetica', 'normal');
    doc.text('ESIC:', col2X, 116);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.esicNumber || 'N/A', col2X + 25, 116);
    
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(10, 130, pageWidth - 20, 80, 3, 3, 'F');
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('ATTENDANCE & EARNINGS', 15, 138);
    
    const attendanceData = [
      ['Present Days', entry.presentDays.toString()],
      ['Paid Leave', entry.paidLeaveDays.toString()],
      ['Holidays', entry.holidayDays.toString()],
      ['Week Off', entry.weekOffDays.toString()],
      ['Absent/LOP', `${entry.absentDays}/${entry.lopDays}`],
    ];
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let yPos = 148;
    attendanceData.forEach(([label, value]) => {
      doc.text(label + ':', 15, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(value, 45, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 7;
    });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(75, 138, 75, 205);
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('EARNINGS BREAKUP', 80, 138);
    
    const earningsData = [
      ['Basic Salary', entry.basicSalary],
      ['HRA', entry.hra],
      ['Conveyance', entry.conveyance],
      ['Other Allowances', entry.otherAllowances],
      ['Gross Salary', entry.grossSalary],
    ];
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    yPos = 148;
    earningsData.forEach(([label, value]) => {
      const isBold = label === 'Gross Salary';
      if (isBold) doc.setFont('helvetica', 'bold');
      doc.text(label + ':', 80, yPos);
      doc.text(`₹${Number(value).toLocaleString()}`, 140, yPos);
      if (isBold) doc.setFont('helvetica', 'normal');
      yPos += 7;
    });
    
    doc.line(75, 138, 75, 205);
    doc.line(150, 138, 150, 205);
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BONUS & INCENTIVES', 155, 138);
    
    const bonusData = [
      ['Incentive', entry.incentive],
      ['Driver Incentive', entry.driverIncentive],
      ['Overtime Amount', entry.overtimeAmount],
    ];
    
    if ((entry.overtimeHours || 0) > 0 || (entry.overtimeDays || 0) > 0) {
      bonusData.push([`OT (${entry.overtimeHours || 0}h / ${entry.overtimeDays || 0}d)`, entry.overtimeAmount]);
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    yPos = 148;
    bonusData.forEach(([label, value]) => {
      if (Number(value) > 0) {
        doc.text(label + ':', 155, yPos);
        doc.setTextColor(16, 185, 129);
        doc.text(`₹${Number(value).toLocaleString()}`, pageWidth - 15, yPos, { align: 'right' });
        doc.setTextColor(100, 116, 139);
        yPos += 7;
      }
    });
    
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(10, 215, pageWidth - 20, 45, 3, 3, 'F');
    
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DEDUCTIONS', 15, 223);
    
    const deductionsData = [
      ['PF Deduction (12%)', entry.pfDeduction],
      ['ESIC Deduction (0.75%)', entry.esicDeduction],
      ['TDS Deduction', entry.tdsDeduction],
      ['LOP Deduction', entry.lopDeduction],
    ];
    
    doc.setFont('helvetica', 'normal');
    yPos = 232;
    deductionsData.forEach(([label, value]) => {
      if (Number(value) > 0) {
        doc.text(label + ':', 15, yPos);
        doc.setTextColor(239, 68, 68);
        doc.text(`-₹${Number(value).toLocaleString()}`, 70, yPos);
        doc.setTextColor(31, 41, 55);
        yPos += 7;
      }
    });
    
    doc.setTextColor(31, 41, 55);
    doc.text('Total Deductions:', 15, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(`-₹${entry.totalDeductions.toLocaleString()}`, 70, yPos);
    
    doc.setTextColor(31, 41, 55);
    doc.text('Total Earnings:', 155, yPos - 7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`₹${entry.totalEarnings.toLocaleString()}`, pageWidth - 15, yPos - 7, { align: 'right' });
    
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(10, 265, pageWidth - 20, 30, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAY', 15, 278);
    
    doc.setFontSize(20);
    const netSalaryText = `₹${entry.netSalary.toLocaleString()}`;
    doc.text(netSalaryText, pageWidth - 15, 280, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const netWords = numberToWords(entry.netSalary);
    doc.text(`Rupees: ${netWords} Only`, 15, 288);
    
    doc.setFillColor(249, 250, 251);
    doc.rect(0, 300, pageWidth, 50, 'F');
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text('Authorised Signatory', pageWidth / 2, 320, { align: 'center' });
    doc.text('This is a computer-generated document. No signature required.', pageWidth / 2, 330, { align: 'center' });
    doc.text('Morya Bus Services - HRMS Pro | www.moryabuses.com', pageWidth / 2, 340, { align: 'center' });

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

      {showPayslip && selectedEntry && (
        <div style={styles.modalOverlay} onClick={() => setShowPayslip(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Payslip Preview</h2>
              <button onClick={() => setShowPayslip(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.payslipPreview}>
              <div style={styles.payslipHeader}>
                <h3>MORYA BUS SERVICES</h3>
                <p>Salary Slip - {selectedMonth} {selectedYear}</p>
              </div>
              <div style={styles.payslipBody}>
                <div className="payslip-section">
                  <h4>ATTENDANCE</h4>
                  <div style={styles.salaryRow}><span>Present Days</span><span>{selectedEntry.presentDays}</span></div>
                  <div style={styles.salaryRow}><span>Paid Leave</span><span>{selectedEntry.paidLeaveDays}</span></div>
                  <div style={styles.salaryRow}><span>Holidays</span><span>{selectedEntry.holidayDays}</span></div>
                  <div style={styles.salaryRow}><span>Week Off</span><span>{selectedEntry.weekOffDays}</span></div>
                  <div style={styles.salaryRow}><span>Absent/LOP</span><span>{selectedEntry.absentDays}/{selectedEntry.lopDays}</span></div>
                </div>
                <div className="payslip-section">
                  <h4>EARNINGS</h4>
                  <div style={styles.salaryRow}><span>Basic Salary</span><span>₹{selectedEntry.basicSalary.toLocaleString()}</span></div>
                  <div style={styles.salaryRow}><span>HRA</span><span>₹{selectedEntry.hra.toLocaleString()}</span></div>
                  <div style={styles.salaryRow}><span>Conveyance</span><span>₹{selectedEntry.conveyance.toLocaleString()}</span></div>
                  <div style={styles.salaryRow}><span>Other Allowances</span><span>₹{selectedEntry.otherAllowances.toLocaleString()}</span></div>
                  <div style={{ ...styles.salaryRow, fontWeight: 'bold', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                    <span>Gross Salary</span><span>₹{selectedEntry.grossSalary.toLocaleString()}</span>
                  </div>
                </div>
                <div className="payslip-section">
                  <h4>BONUS & INCENTIVES</h4>
                  <div style={styles.salaryRow}><span>Incentive</span><span style={{ color: '#10b981' }}>₹{selectedEntry.incentive.toLocaleString()}</span></div>
                  {selectedEntry.driverIncentive > 0 && (
                    <div style={styles.salaryRow}><span>Driver Incentive</span><span style={{ color: '#10b981' }}>₹{selectedEntry.driverIncentive.toLocaleString()}</span></div>
                  )}
                  {selectedEntry.overtimeAmount > 0 && (
                    <div style={styles.salaryRow}><span>Overtime ({selectedEntry.overtimeHours || 0}h)</span><span style={{ color: '#10b981' }}>₹{selectedEntry.overtimeAmount.toLocaleString()}</span></div>
                  )}
                </div>
                <div className="payslip-section">
                  <h4>DEDUCTIONS</h4>
                  <div style={styles.salaryRow}><span>PF (12%)</span><span style={{ color: '#ef4444' }}>-₹{selectedEntry.pfDeduction.toLocaleString()}</span></div>
                  <div style={styles.salaryRow}><span>ESIC (0.75%)</span><span style={{ color: '#ef4444' }}>-₹{selectedEntry.esicDeduction.toLocaleString()}</span></div>
                  {selectedEntry.tdsDeduction > 0 && (
                    <div style={styles.salaryRow}><span>TDS</span><span style={{ color: '#ef4444' }}>-₹{selectedEntry.tdsDeduction.toLocaleString()}</span></div>
                  )}
                  {selectedEntry.lopDeduction > 0 && (
                    <div style={styles.salaryRow}><span>LOP</span><span style={{ color: '#ef4444' }}>-₹{selectedEntry.lopDeduction.toLocaleString()}</span></div>
                  )}
                  <div style={{ ...styles.salaryRow, fontWeight: 'bold', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                    <span>Total Deductions</span><span style={{ color: '#ef4444' }}>-₹{selectedEntry.totalDeductions.toLocaleString()}</span>
                  </div>
                </div>
                <div style={styles.netPaySection}>
                  <span>NET PAY</span>
                  <span style={styles.netPayAmount}>₹{selectedEntry.netSalary.toLocaleString()}</span>
                </div>
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
      )}
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
  payslipHeader: { textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #0f172a' },
  payslipBody: {},
  payslipSection: { marginBottom: '20px' },
  salaryRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' },
  netPaySection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f0fdf4', borderRadius: '8px', marginTop: '16px' },
  netPayAmount: { fontSize: '24px', fontWeight: '700', color: '#10b981' },
  modalFooter: { padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' },
  downloadBtn: { padding: '10px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }
};
