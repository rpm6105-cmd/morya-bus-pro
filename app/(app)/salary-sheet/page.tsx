'use client';

import { useState, useEffect } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { Employee, PayrollEntry } from '../../lib/types';
import ExcelJS from 'exceljs';
import {
  Calculator, Download, Printer, ChevronLeft, ChevronRight, FileSpreadsheet, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import Tooltip from '../../components/ui/Tooltip';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function SalarySheetPage() {
  const { user, isAdmin } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toLocaleString('default', { month: 'short' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<PayrollEntry[]>([]);
  const [exporting, setExporting] = useState(false);

  const monthIndex = MONTHS.indexOf(selectedMonth) + 1;
  const monthLabel = FULL_MONTHS[monthIndex - 1];

  const loadRows = () => {
    const entries = isAdmin
      ? dataService.getPayroll(selectedMonth, selectedYear)
      : dataService.getPayrollByBranch(user?.depotId || '', selectedMonth, selectedYear);
    const processed = entries.filter(p => p.status !== 'DRAFT');
    const sorted = processed.sort((a, b) => {
      const na = dataService.getEmployeeById(a.employeeId)?.name || '';
      const nb = dataService.getEmployeeById(b.employeeId)?.name || '';
      return na.localeCompare(nb);
    });
    setRows(sorted);
  };

  useEffect(() => {
    loadRows();
  }, [selectedMonth, selectedYear, user?.depotId, isAdmin]);

  useEffect(() => {
    const onUpdate = () => loadRows();
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('hrms_')) {
        dataService.syncFromCache();
        onUpdate();
      }
    };
    window.addEventListener('hrms-payroll-updated', onUpdate);
    window.addEventListener('hrms-data-refreshed', onUpdate);
    window.addEventListener('storage', onStorage);
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') dataService.refreshLiveData();
    }, 10000);
    return () => {
      window.removeEventListener('hrms-payroll-updated', onUpdate);
      window.removeEventListener('hrms-data-refreshed', onUpdate);
      window.removeEventListener('storage', onStorage);
      clearInterval(t);
    };
  }, [selectedMonth, selectedYear, user?.depotId, isAdmin]);

  const exportExcel = async () => {
    if (rows.length === 0) return;
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Morya Bus Services HRMS';
      wb.created = new Date();
      const ws = wb.addWorksheet(`Salary Sheet ${monthLabel} ${selectedYear}`);

      const C = {
        headerBg: 'FF101828',
        attendBg: 'FF1D4ED8',
        masterBg: 'FF6B21A8',
        earnedBg: 'FF027A48',
        deductBg: 'FFB42318',
        netBg: 'FFEA6A05',
        white: 'FFFFFFFF',
        border: 'FFD0D5DD',
      };

      const fill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });
      const font = (argb: string, bold = true, size = 9) => ({ bold, color: { argb }, size, name: 'Arial' as const });
      const bord = {
        top: { style: 'thin' as const, color: { argb: C.border } },
        left: { style: 'thin' as const, color: { argb: C.border } },
        bottom: { style: 'thin' as const, color: { argb: C.border } },
        right: { style: 'thin' as const, color: { argb: C.border } },
      };

      const COLS = [
        { h: 'SR NO', s: 'info', w: 6 },
        { h: 'NAME', s: 'info', w: 22 },
        { h: 'PRESENT', s: 'attend', w: 8, isNum: true },
        { h: 'ABSENT', s: 'attend', w: 8, isNum: true },
        { h: 'OT\nHOURS', s: 'attend', w: 8, isNum: true },
        { h: 'BASIC', s: 'master', w: 10, isCurrency: true },
        { h: 'HRA', s: 'master', w: 9, isCurrency: true },
        { h: 'CONVEYANCE', s: 'master', w: 10, isCurrency: true },
        { h: 'OTHER\nALLOW', s: 'master', w: 10, isCurrency: true },
        { h: 'GROSS\nSALARY', s: 'master', w: 11, isCurrency: true },
        { h: 'BASIC', s: 'earned', w: 10, isCurrency: true },
        { h: 'HRA', s: 'earned', w: 9, isCurrency: true },
        { h: 'CONVEYANCE', s: 'earned', w: 10, isCurrency: true },
        { h: 'OTHER\nALLOW', s: 'earned', w: 10, isCurrency: true },
        { h: 'OT\nPAY', s: 'earned', w: 10, isCurrency: true },
        { h: 'INCENTIVE', s: 'earned', w: 10, isCurrency: true },
        { h: 'GROSS\nEARNED', s: 'earned', w: 11, isCurrency: true },
        { h: 'PF', s: 'deduct', w: 9, isCurrency: true },
        { h: 'ESIC', s: 'deduct', w: 9, isCurrency: true },
        { h: 'PT', s: 'deduct', w: 7, isCurrency: true },
        { h: 'TDS', s: 'deduct', w: 8, isCurrency: true },
        { h: 'TOTAL\nDED', s: 'deduct', w: 11, isCurrency: true },
        { h: 'NET\nSALARY', s: 'net', w: 12, isCurrency: true },
      ];

      const NCOLS = COLS.length;
      const lastCol = ws.getColumn(NCOLS).letter;

      const sectionColor: Record<string, string> = {
        info: C.headerBg, attend: C.attendBg, master: C.masterBg,
        earned: C.earnedBg, deduct: C.deductBg, net: C.netBg,
      };

      ws.mergeCells(`A1:${lastCol}1`);
      const r1 = ws.getCell('A1');
      r1.value = 'MORYA BUS SERVICES PVT. LTD.';
      r1.font = { bold: true, size: 13, name: 'Arial', color: { argb: 'FF101828' } };
      r1.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 22;

      ws.mergeCells(`A2:${lastCol}2`);
      const r2 = ws.getCell('A2');
      r2.value = `SALARY SHEET — ${monthLabel.toUpperCase()} ${selectedYear}`;
      r2.font = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFEA6A05' } };
      r2.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 18;

      const groups = [
        { label: 'EMPLOYEE INFO', from: 1, to: 2, color: C.headerBg },
        { label: 'ATTENDANCE', from: 3, to: 5, color: C.attendBg },
        { label: 'MASTER SALARY', from: 6, to: 10, color: C.masterBg },
        { label: 'MONTHLY EARNING', from: 11, to: 17, color: C.earnedBg },
        { label: 'DEDUCTIONS', from: 18, to: 22, color: C.deductBg },
        { label: 'NET', from: 23, to: 23, color: C.netBg },
      ];

      const letter = (n: number) => {
        let l = '';
        while (n > 0) {
          const r = (n - 1) % 26;
          l = String.fromCharCode(65 + r) + l;
          n = Math.floor((n - 1) / 26);
        }
        return l;
      };
      groups.forEach(g => {
        ws.mergeCells(`${letter(g.from)}3:${letter(g.to)}3`);
        const cell = ws.getCell(`${letter(g.from)}3`);
        cell.value = g.label;
        cell.fill = fill(g.color);
        cell.font = font(C.white, true, 9);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = bord;
      });
      ws.getRow(3).height = 16;

      const headerRow = ws.addRow(COLS.map(c => c.h));
      headerRow.eachCell((cell, colNum) => {
        const col = COLS[colNum - 1];
        cell.fill = fill(sectionColor[col.s]);
        cell.font = font(C.white, true, 8);
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = bord;
      });
      ws.getRow(4).height = 30;

      COLS.forEach((col, i) => { ws.getColumn(i + 1).width = col.w; });

      const totals = new Array(NCOLS).fill(0);

      rows.forEach((r, idx) => {
        const emp = dataService.getEmployeeById(r.employeeId);
        const isEven = idx % 2 === 0;
        const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

        const earnedCTC = r.totalEarnings - r.overtimeAmount - r.incentive - r.driverIncentive;
        const ratio = r.grossSalary > 0 ? earnedCTC / r.grossSalary : 0;

        const rowData = [
          idx + 1,
          emp?.name || '—',
          r.presentDays,
          r.lopDays,
          r.overtimeHours || 0,
          r.basicSalary, r.hra, r.conveyance, r.otherAllowances, r.grossSalary,
          Math.round(r.basicSalary * ratio),
          Math.round(r.hra * ratio),
          Math.round(r.conveyance * ratio),
          Math.round(r.otherAllowances * ratio),
          r.overtimeAmount,
          r.incentive + r.driverIncentive,
          r.totalEarnings,
          r.pfDeduction, r.esicDeduction, r.ptDeduction, r.tdsDeduction, r.totalDeductions,
          r.netSalary,
        ];

        const row = ws.addRow(rowData);
        row.eachCell((cell, colNum) => {
          const col = COLS[colNum - 1];
          cell.border = bord;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          cell.font = { color: { argb: 'FF344054' }, size: 9, name: 'Arial' };

          if (col.isCurrency) {
            cell.numFmt = '#,##0.00';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            totals[colNum - 1] += Number(cell.value) || 0;
          } else if (col.isNum) {
            cell.numFmt = '#,##0.##';
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            totals[colNum - 1] += Number(cell.value) || 0;
          } else {
            cell.alignment = { vertical: 'middle', wrapText: colNum === 2 };
          }

          if (colNum === 17) cell.font = { bold: true, color: { argb: 'FF027A48' }, size: 9, name: 'Arial' };
          if (colNum === 22) cell.font = { bold: true, color: { argb: 'FFB42318' }, size: 9, name: 'Arial' };
          if (colNum === 23) cell.font = { bold: true, color: { argb: 'FFEA6A05' }, size: 9, name: 'Arial' };
          if (colNum === 10) cell.font = { bold: true, color: { argb: 'FF6B21A8' }, size: 9, name: 'Arial' };
        });
        row.height = 18;
      });

      const totalRowData = COLS.map((col, i) => {
        if (i === 0) return 'TOTAL';
        if (i === 1) return `${rows.length} Employees`;
        if (col.isCurrency || col.isNum) return totals[i];
        return '';
      });

      const totalRow = ws.addRow(totalRowData);
      totalRow.eachCell((cell, colNum) => {
        const col = COLS[colNum - 1];
        cell.fill = fill(C.headerBg);
        cell.font = font(C.white, true, 9);
        cell.border = bord;
        if (col.isCurrency) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (col.isNum) {
          cell.numFmt = '#,##0.##';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        if (colNum === 17) cell.font = font('FF6EE7B7', true, 9);
        if (colNum === 23) cell.font = font('FFFED7AA', true, 9);
      });
      totalRow.height = 20;

      ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 4 }];

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SalarySheet_${monthLabel}_${selectedYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Salary sheet exported as XLSX');
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    }
    setExporting(false);
  };

  const totals = rows.reduce((acc, r) => {
    acc.present += r.presentDays;
    acc.gross += r.grossSalary;
    acc.earned += r.totalEarnings;
    acc.ot += r.overtimeAmount;
    acc.pf += r.pfDeduction;
    acc.esic += r.esicDeduction;
    acc.pt += r.ptDeduction;
    acc.tds += r.tdsDeduction;
    acc.deductions += r.totalDeductions;
    acc.net += r.netSalary;
    return acc;
  }, { present: 0, gross: 0, earned: 0, ot: 0, pf: 0, esic: 0, pt: 0, tds: 0, deductions: 0, net: 0 });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Salary Sheet</h1>
          <p style={styles.subtitle}>Generate monthly salary sheet for all employees</p>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.monthSelector}>
            <Tooltip label="Previous Month">
              <button onClick={() => {
                const idx = MONTHS.indexOf(selectedMonth);
                if (idx > 0) setSelectedMonth(MONTHS[idx - 1]);
                else { setSelectedMonth('Dec'); setSelectedYear(selectedYear - 1); }
              }} style={styles.navBtn} aria-label="Previous Month">
                <ChevronLeft size={16} />
              </button>
            </Tooltip>
            <span style={styles.monthLabel}>{selectedMonth} {selectedYear}</span>
            <Tooltip label="Next Month">
              <button onClick={() => {
                const idx = MONTHS.indexOf(selectedMonth);
                if (idx < 11) setSelectedMonth(MONTHS[idx + 1]);
                else { setSelectedMonth('Jan'); setSelectedYear(selectedYear + 1); }
              }} style={styles.navBtn} aria-label="Next Month">
                <ChevronRight size={16} />
              </button>
            </Tooltip>
          </div>
          <button style={styles.exportBtn} onClick={exportExcel} disabled={rows.length === 0 || exporting}>
            <FileSpreadsheet size={16} />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button style={styles.printBtn} onClick={() => window.print()} disabled={rows.length === 0}>
            <Printer size={16} />
            Print
          </button>
          <div style={styles.autoBadge}>
            Auto-generated from processed payroll
          </div>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#dbeafe' }}>
            <Users size={24} color="#3b82f6" />
          </div>
          <div>
            <p style={styles.statLabel}>Employees</p>
            <p style={styles.statValue}>{rows.length}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#dcfce7' }}>
            <Download size={24} color="#10b981" />
          </div>
          <div>
            <p style={styles.statLabel}>Total Gross</p>
            <p style={styles.statValue}>₹{totals.gross.toLocaleString()}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#fef3c7' }}>
            <Calculator size={24} color="#f59e0b" />
          </div>
          <div>
            <p style={styles.statLabel}>Total Overtime</p>
            <p style={styles.statValue}>₹{totals.ot.toLocaleString()}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#fee2e2' }}>
            <Calculator size={24} color="#ef4444" />
          </div>
          <div>
            <p style={styles.statLabel}>Total Deductions</p>
            <p style={styles.statValue}>₹{totals.deductions.toLocaleString()}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#f0fdf4' }}>
            <Calculator size={24} color="#10b981" />
          </div>
          <div>
            <p style={styles.statLabel}>Net Payable</p>
            <p style={styles.statValue}>₹{totals.net.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <div style={styles.tableHeader}>
          <h3>Salary Sheet - {monthLabel} {selectedYear}</h3>
          <span style={styles.countBadge}>
            {rows.length > 0 ? `${rows.length} employees • from processed payroll` : 'No processed payroll for this month'}
          </span>
        </div>

        {rows.length === 0 ? (
          <div style={styles.emptyState}>
            <FileSpreadsheet size={48} color="#94a3b8" />
            <p>No salary sheet for {selectedMonth} {selectedYear}</p>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0 0' }}>
              The salary sheet is generated automatically once the Admin processes payroll for this month.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Depot</th>
                  <th style={styles.th}>Present</th>
                  <th style={styles.th}>LOP</th>
                  <th style={styles.th}>OT Hrs</th>
                  <th style={styles.th}>Basic</th>
                  <th style={styles.th}>HRA</th>
                  <th style={styles.th}>Gross</th>
                  <th style={styles.th}>OT Pay</th>
                  <th style={styles.th}>Incentive</th>
                  <th style={styles.th}>Earned</th>
                  <th style={styles.th}>PF</th>
                  <th style={styles.th}>ESIC</th>
                  <th style={styles.th}>PT</th>
                  <th style={styles.th}>TDS</th>
                  <th style={styles.th}>Deductions</th>
                  <th style={styles.th}>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const emp = dataService.getEmployeeById(r.employeeId);
                  const branch = dataService.getBranchById(r.depotId || '');
                  const earned = r.totalEarnings - r.overtimeAmount - r.incentive - r.driverIncentive;
                  const ratio = r.grossSalary > 0 ? earned / r.grossSalary : 0;
                  return (
                    <tr key={r.id || idx} style={styles.tr}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}>
                        <div style={styles.empCell}>
                          <div style={styles.avatar}>{(emp?.name || '?').charAt(0)}</div>
                          <div>
                            <p style={styles.empName}>{emp?.name || 'Unknown'}</p>
                            <p style={styles.empId}>{emp?.employeeId || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>{branch?.code || ''}</td>
                      <td style={styles.td}>{r.presentDays}</td>
                      <td style={styles.td}>{r.lopDays > 0 ? <span style={{ color: '#ef4444' }}>{r.lopDays}</span> : 0}</td>
                      <td style={styles.td}>{r.overtimeHours || 0}</td>
                      <td style={styles.td}>₹{r.basicSalary.toLocaleString()}</td>
                      <td style={styles.td}>₹{r.hra.toLocaleString()}</td>
                      <td style={styles.td}>₹{r.grossSalary.toLocaleString()}</td>
                      <td style={styles.td}>{r.overtimeAmount > 0 ? `₹${r.overtimeAmount.toLocaleString()}` : '-'}</td>
                      <td style={styles.td}>{r.incentive + r.driverIncentive > 0 ? `₹${(r.incentive + r.driverIncentive).toLocaleString()}` : '-'}</td>
                      <td style={{ ...styles.td, fontWeight: 600, color: '#10b981' }}>₹{r.totalEarnings.toLocaleString()}</td>
                      <td style={styles.td}>₹{r.pfDeduction.toLocaleString()}</td>
                      <td style={styles.td}>{r.esicDeduction > 0 ? `₹${r.esicDeduction.toLocaleString()}` : '-'}</td>
                      <td style={styles.td}>{r.ptDeduction > 0 ? `₹${r.ptDeduction.toLocaleString()}` : '-'}</td>
                      <td style={styles.td}>{r.tdsDeduction > 0 ? `₹${r.tdsDeduction.toLocaleString()}` : '-'}</td>
                      <td style={{ ...styles.td, color: '#ef4444' }}>-₹{r.totalDeductions.toLocaleString()}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>₹{r.netSalary.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={styles.totalRow}>
                  <td style={styles.totalTd}></td>
                  <td style={styles.totalTd}><strong>TOTAL</strong></td>
                  <td style={styles.totalTd}></td>
                  <td style={styles.totalTd}>{totals.present}</td>
                  <td style={styles.totalTd}></td>
                  <td style={styles.totalTd}></td>
                  <td style={styles.totalTd}>₹{totals.gross.toLocaleString()}</td>
                  <td style={styles.totalTd}></td>
                  <td style={styles.totalTd}></td>
                  <td style={styles.totalTd}>₹{totals.ot.toLocaleString()}</td>
                  <td style={styles.totalTd}></td>
                  <td style={styles.totalTd}>₹{totals.earned.toLocaleString()}</td>
                  <td style={styles.totalTd}>₹{totals.pf.toLocaleString()}</td>
                  <td style={styles.totalTd}>₹{totals.esic.toLocaleString()}</td>
                  <td style={styles.totalTd}>₹{totals.pt.toLocaleString()}</td>
                  <td style={styles.totalTd}>₹{totals.tds.toLocaleString()}</td>
                  <td style={styles.totalTd}>₹{totals.deductions.toLocaleString()}</td>
                  <td style={styles.totalTd}>₹{totals.net.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '1500px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: '28px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
  headerActions: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  monthSelector: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' },
  navBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  monthLabel: { fontSize: '14px', fontWeight: '600', minWidth: '100px', textAlign: 'center' },
  exportBtn: { padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  printBtn: { padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  autoBadge: { padding: '10px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' },
  processBtn: { padding: '10px 16px', background: '#10b981', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { background: '#fff', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statIcon: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '13px', color: '#64748b', margin: '0 0 4px' },
  statValue: { fontSize: '24px', fontWeight: '600', color: '#0f172a', margin: 0 },
  tableContainer: { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' },
  countBadge: { fontSize: '12px', padding: '4px 10px', background: '#f1f5f9', borderRadius: '12px', color: '#64748b' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '1200px' },
  th: { padding: '12px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 10px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' },
  empCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px' },
  empName: { fontWeight: '500', color: '#0f172a', margin: 0 },
  empId: { fontSize: '11px', color: '#94a3b8', margin: 0 },
  totalRow: { background: '#0f172a', color: '#fff' },
  totalTd: { padding: '14px 10px', fontSize: '13px', color: '#fff', whiteSpace: 'nowrap' },
  emptyState: { padding: '60px 20px', textAlign: 'center' },
  emptyBtn: { marginTop: '16px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
};
