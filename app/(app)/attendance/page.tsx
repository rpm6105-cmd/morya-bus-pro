'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { Employee, Attendance, AttendanceRecord, AttendanceStatus, ATTENDANCE_STATUS_MAP } from '../../lib/types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  addMonths,
  getDay,
  getDaysInMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Download, Upload, Users, CheckCircle, Clock, TrendingUp, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import Tooltip from '../../components/ui/Tooltip';

const ATTENDANCE_OPTIONS: { status: AttendanceStatus; label: string; color: string; bgColor: string; gradient: string }[] = [
  { status: 'P', label: 'Present', color: '#059669', bgColor: '#ecfdf5', gradient: 'linear-gradient(145deg, #a7f3d0, #d1fae5)' },
  { status: 'A', label: 'Absent', color: '#dc2626', bgColor: '#fef2f2', gradient: 'linear-gradient(145deg, #fecaca, #fee2e2)' },
  { status: 'PL', label: 'Paid Leave', color: '#2563eb', bgColor: '#eff6ff', gradient: 'linear-gradient(145deg, #bfdbfe, #dbeafe)' },
  { status: 'H', label: 'Holiday', color: '#7c3aed', bgColor: '#f5f3ff', gradient: 'linear-gradient(145deg, #ddd6fe, #ede9fe)' },
  { status: 'WO', label: 'Week Off', color: '#0d9488', bgColor: '#f0fdfa', gradient: 'linear-gradient(145deg, #99f6e4, #ccfbf1)' },
  { status: 'LOP', label: 'LOP', color: '#e11d48', bgColor: '#fff1f2', gradient: 'linear-gradient(145deg, #fecdd3, #ffe4e6)' },
];

export default function AttendancePage() {
  const { user, isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendance, setAttendance] = useState<Attendance>({});
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('P');
  const [hoveredDate, setHoveredDate] = useState('');

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const payrollLocked = dataService.isPayrollProcessed(selectedMonth, selectedYear);

  useEffect(() => {
    loadData();
  }, [selectedBranch, user, selectedMonth, selectedYear]);

  useEffect(() => {
    const reload = () => loadData();
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('hrms_')) {
        dataService.syncFromCache();
        reload();
      }
    };
    window.addEventListener('hrms-attendance-updated', reload);
    window.addEventListener('hrms-payroll-updated', reload);
    window.addEventListener('hrms-data-refreshed', reload);
    window.addEventListener('storage', onStorage);
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') dataService.refreshLiveData();
    }, 8000);
    return () => {
      window.removeEventListener('hrms-attendance-updated', reload);
      window.removeEventListener('hrms-payroll-updated', reload);
      window.removeEventListener('hrms-data-refreshed', reload);
      window.removeEventListener('storage', onStorage);
      clearInterval(t);
    };
  }, [selectedBranch, user, selectedMonth, selectedYear]);

  const loadData = () => {
    const branchList = dataService.getBranches();
    setBranches(branchList);

    const depotId = isAdmin ? selectedBranch : user?.depotId;
    const empList = dataService.getEmployees(depotId, undefined, selectedMonth, selectedYear);
    setEmployees(empList);

    const attendanceData = dataService.getAttendance() as Attendance;
    setAttendance({ ...attendanceData });
  };

  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(e => e.status === 'ACTIVE');
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(e => e.subDepotCategory === selectedCategory);
    }
    return filtered;
  }, [employees, selectedCategory]);

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);
  const empAttendance = attendance[selectedEmpId] || {};

  const currentDate = new Date(selectedYear, selectedMonth - 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalDays = getDaysInMonth(currentDate);

  const startDay = getDay(monthStart);
  const blanks = Array(startDay).fill(null);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const cycleStatus = (dateStr: string, currentStatus?: AttendanceStatus) => {
    if (payrollLocked) {
      toast.error('Attendance is locked. Payroll has already been processed for this month.');
      return;
    }
    if (dateStr > todayStr) {
      toast.error('Cannot mark attendance for future dates.');
      return;
    }

    const statuses: AttendanceStatus[] = ['P', 'A', 'LOP'];
    const currentIdx = currentStatus ? statuses.indexOf(currentStatus) : -1;
    const nextIdx = (currentIdx + 1) % statuses.length;
    const newStatus = statuses[nextIdx];

    const record: AttendanceRecord = {
      employeeId: selectedEmpId,
      date: dateStr,
      status: newStatus,
      isPaid: ATTENDANCE_STATUS_MAP[newStatus].paid,
      depotId: isAdmin ? selectedBranch : user?.depotId
    };

    dataService.setAttendance(selectedEmpId, dateStr, record);
    loadData();
    toast.success(`Marked as ${ATTENDANCE_STATUS_MAP[newStatus].label}`);
  };

  const autoGenerate = () => {
    if (payrollLocked) {
      toast.error('Attendance is locked. Payroll has already been processed for this month.');
      return;
    }
    const active = filteredEmployees.filter(e => e.status === 'ACTIVE');
    if (active.length === 0) {
      toast.error('No active employees found for the current filters.');
      return;
    }
    const ok = confirm(
      `Generate default attendance for ${active.length} employees for ${format(currentDate, 'MMMM yyyy')}?\n\n• Weekdays → Present (P)\n• Sundays → Week Off (WO)\n\nOnly unmarked dates will be filled.`
    );
    if (!ok) return;
    const res = dataService.generateAttendanceMonth(selectedMonth, selectedYear, active);
    loadData();
    toast.success(`Auto-generated ${res.created} day-records for ${active.length} employees`);
  };

  const handleBulkUpdate = () => {
    if (payrollLocked) {
      toast.error('Attendance is locked. Payroll has already been processed for this month.');
      return;
    }

    filteredEmployees.forEach(emp => {
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = getDay(new Date(selectedYear, selectedMonth - 1, d));
        
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        if (dateStr > todayStr) continue;
        
        const record: AttendanceRecord = {
          employeeId: emp.id,
          date: dateStr,
          status: bulkStatus,
          isPaid: ATTENDANCE_STATUS_MAP[bulkStatus].paid,
          depotId: isAdmin ? selectedBranch : user?.depotId
        };
        dataService.setAttendance(emp.id, dateStr, record);
      }
    });
    
    loadData();
    setShowBulkModal(false);
    toast.success(`Bulk updated ${filteredEmployees.length} employees to ${ATTENDANCE_STATUS_MAP[bulkStatus].label}`);
  };

  const calculateMonthlySummary = () => {
    let present = 0, absent = 0, paidLeave = 0, holiday = 0, weekOff = 0, lop = 0;

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = empAttendance[dateStr];
      
      if (!record) {
        const dayOfWeek = getDay(new Date(selectedYear, selectedMonth - 1, d));
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekOff++;
        } else {
          absent++;
        }
      } else {
        switch (record.status) {
          case 'P': present++; break;
          case 'A': absent++; break;
          case 'PL': paidLeave++; break;
          case 'H': holiday++; break;
          case 'WO': weekOff++; break;
          case 'LOP': lop++; break;
        }
      }
    }

    return { present, absent, paidLeave, holiday, weekOff, lop };
  };

  const summary = calculateMonthlySummary();

  const getStatusStyle = (status: AttendanceStatus | undefined) => {
    if (!status) return { bgColor: '#ffffff', color: '#64748b', gradient: 'none' };
    const opt = ATTENDANCE_OPTIONS.find(o => o.status === status);
    return { bgColor: opt?.bgColor || '#ffffff', color: opt?.color || '#64748b', gradient: opt?.gradient || 'none' };
  };

  const exportAttendance = () => {
    const data = filteredEmployees.map(emp => {
      const empAtt = attendance[emp.id] || {};
      const row: any = { 'Employee ID': emp.employeeId, 'Name': emp.name, 'Category': emp.subDepotCategory };
      
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        row[dateStr] = empAtt[dateStr]?.status || '-';
      }
      
      return row;
    });

    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    toast.success('Attendance exported');
  };

  const statCards = [
    { key: 'present', label: 'Present', value: summary.present, color: '#059669', bg: '#ecfdf5', icon: CheckCircle },
    { key: 'absent', label: 'Absent', value: summary.absent, color: '#dc2626', bg: '#fef2f2', icon: Clock },
    { key: 'lop', label: 'LOP', value: summary.lop, color: '#e11d48', bg: '#fff1f2', icon: Clock },
    { key: 'paidLeave', label: 'Paid Leave', value: summary.paidLeave, color: '#2563eb', bg: '#eff6ff', icon: Calendar },
    { key: 'holiday', label: 'Holiday', value: summary.holiday, color: '#7c3aed', bg: '#f5f3ff', icon: Calendar },
    { key: 'weekOff', label: 'Week Off', value: summary.weekOff, color: '#0d9488', bg: '#f0fdfa', icon: TrendingUp },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Attendance</h1>
          <p style={styles.subtitle}>
            Manual attendance — click a date to cycle Present (P) → Absent (A) → LOP
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={styles.monthNav}>
            <Tooltip label="Previous Month">
              <button onClick={handlePrevMonth} style={styles.monthNavBtn} aria-label="Previous Month">
                <ChevronLeft size={18} color="#475569" />
              </button>
            </Tooltip>
            <span style={{ fontWeight: '700', minWidth: '130px', textAlign: 'center', fontSize: '14px', color: '#0f172a' }}>
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Tooltip label="Next Month">
              <button onClick={handleNextMonth} style={styles.monthNavBtn} aria-label="Next Month">
                <ChevronRight size={18} color="#475569" />
              </button>
            </Tooltip>
          </div>
          <button onClick={autoGenerate} style={payrollLocked ? { ...styles.actionBtnOutline, opacity: 0.5, cursor: 'not-allowed' } : styles.actionBtnOutline} disabled={payrollLocked}>
            <Calendar size={16} />
            Auto-Generate
          </button>
          <button onClick={() => setShowBulkModal(true)} style={payrollLocked ? { ...styles.actionBtn, opacity: 0.5, cursor: 'not-allowed' } : styles.actionBtn} disabled={payrollLocked}>
            <Upload size={16} />
            Bulk Update
          </button>
          <button onClick={exportAttendance} style={styles.actionBtnOutline}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div style={styles.filters}>
        {isAdmin && (
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} style={styles.select}>
            <option value="">All Depots</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={styles.select}>
          <option value="ALL">All Categories</option>
          <option value="STAFF">Office Staff</option>
          <option value="DRIVERS">Drivers</option>
        </select>
        <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} style={{ ...styles.select, minWidth: '260px', flex: 1 }}>
          <option value="">Select Employee</option>
          {filteredEmployees.map(e => (
            <option key={e.id} value={e.id}>{e.employeeId} - {e.name} ({e.subDepotCategory})</option>
          ))}
        </select>
      </div>

      {selectedEmployee && (
        <>
          {payrollLocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', padding: '12px 16px', borderRadius: '12px', marginTop: '16px', fontSize: '13px', fontWeight: '600' }}>
              <Lock size={16} />
              This month's attendance is locked — payroll has already been processed. No changes allowed.
            </div>
          )}

          <div style={styles.statsRow}>
            {statCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.key} style={{ ...styles.statCard, background: card.bg }}>
                  <div style={{ ...styles.statIcon, background: card.color }}>
                    <Icon size={18} color="#fff" />
                  </div>
                  <div>
                    <p style={{ ...styles.statValue, color: card.color }}>{card.value}</p>
                    <p style={styles.statLabel}>{card.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', marginTop: '24px' }}>
            <div style={styles.calendarCard}>
              <div style={styles.calendarHeader}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={styles.calendarDayHeader}>{d}</div>
                ))}
              </div>
              <div style={styles.calendarGrid}>
                {blanks.map((_, i) => <div key={`b-${i}`} style={styles.calendarBlank}></div>)}
                {monthDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const record = empAttendance[dateStr];
                  const dayOfWeek = getDay(day);
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const status = record?.status;
                  const opt = status ? ATTENDANCE_OPTIONS.find(o => o.status === status) : undefined;
                  const isHovered = hoveredDate === dateStr;
                  const isFuture = dateStr > todayStr;
                  const isLocked = payrollLocked;

                  return (
                    <div
                      key={dateStr}
                      title={`${format(day, 'd MMM yyyy')}${opt ? ` — ${opt.label}` : ' — click to mark'}${isFuture ? ' (future date)' : ''}${isLocked ? ' (locked)' : ''}`}
                      onMouseEnter={() => setHoveredDate(dateStr)}
                      onMouseLeave={() => setHoveredDate('')}
                      onClick={() => cycleStatus(dateStr, status as AttendanceStatus)}
                      style={{
                        ...styles.calendarDay,
                        background: opt ? opt.gradient : (isWeekend ? '#f1f5f9' : '#ffffff'),
                        border: isToday(day)
                          ? `2px solid #10b981`
                          : opt
                            ? `1.5px solid ${opt.color}40`
                            : '1px solid #e2e8f0',
                        boxShadow: isHovered ? '0 6px 16px rgba(15,23,42,0.12)' : '0 1px 2px rgba(15,23,42,0.04)',
                        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                        cursor: (isLocked || isFuture) ? 'not-allowed' : 'pointer',
                        opacity: isFuture ? 0.45 : 1,
                        filter: isLocked ? 'grayscale(0.4)' : 'none',
                      }}
                    >
                      <span style={{
                        fontSize: '13px',
                        fontWeight: isToday(day) ? '800' : '500',
                        color: isToday(day) ? '#059669' : (opt?.color || '#334155'),
                      }}>
                        {format(day, 'd')}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: opt?.color || '#94a3b8',
                        background: opt ? '#ffffffb3' : 'transparent',
                        padding: '2px 8px',
                        borderRadius: '8px',
                      }}>
                        {opt ? opt.label : (isWeekend ? 'WO' : '—')}
                      </span>
                      {isToday(day) && (
                        <span style={styles.todayTag}>Today</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={styles.profileCard}>
                <div style={styles.profileHeader}>
                  <div style={styles.avatar}>{selectedEmployee.name.charAt(0)}</div>
                  <div>
                    <p style={{ fontWeight: '700', margin: 0, color: '#0f172a' }}>{selectedEmployee.name}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                      {selectedEmployee.employeeId} • {selectedEmployee.subDepotCategory}
                      {selectedEmployee.busCategory ? ` • ${selectedEmployee.busCategory === '9 METER' ? '9M Bus' : '12M Bus'}` : ''}
                    </p>
                  </div>
                </div>

                <div style={styles.progressWrap}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                    <span>Attendance — {format(currentDate, 'MMMM yyyy')}</span>
                    <strong style={{ color: '#059669' }}>
                      {Math.round((summary.present / totalDays) * 100)}%
                    </strong>
                  </div>
                  <div style={styles.progressTrack}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${(summary.present / totalDays) * 100}%`,
                    }} />
                  </div>
                </div>

                {selectedEmployee.subDepotCategory === 'DRIVERS' && summary.absent === 0 && summary.lop === 0 && (
                  <div style={styles.incentiveBadge}>
                    <CheckCircle size={16} color="#059669" />
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: '700', color: '#065f46', margin: 0 }}>100% Attendance!</p>
                      <p style={{ fontSize: '11px', color: '#065f46', margin: '2px 0 0' }}>Driver incentive eligible</p>
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.legendCard}>
                <h4 style={styles.legendTitle}>Click a date to mark</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ATTENDANCE_OPTIONS.map(opt => (
                    <div key={opt.status} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '7px', background: opt.gradient, border: `1.5px solid ${opt.color}55` }}></div>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#334155' }}>{opt.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', color: opt.color, background: opt.bgColor, padding: '2px 8px', borderRadius: '6px' }}>
                        {opt.status}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '12px 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  Day click cycles: <strong>Present → Absent → LOP</strong>. Future dates are disabled. Attendance locks once payroll is processed for the month.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {!selectedEmployee && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', marginTop: '24px', border: '1px dashed #e2e8f0' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Users size={32} color="#fff" />
          </div>
          <p style={{ color: '#64748b', marginTop: '16px', fontWeight: '500' }}>Select an employee to mark attendance</p>
        </div>
      )}

      {showBulkModal && (
        <div style={styles.modalOverlay} onClick={() => setShowBulkModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px' }}>Bulk Update Attendance</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              Update {filteredEmployees.length} employees for {format(currentDate, 'MMMM yyyy')} (weekdays only)
            </p>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as AttendanceStatus)} style={styles.select}>
              {ATTENDANCE_OPTIONS.map(opt => (
                <option key={opt.status} value={opt.status}>{opt.label} ({opt.status})</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setShowBulkModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleBulkUpdate} style={styles.submitBtn}>Update All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  monthNavBtn: { border: 'none', background: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionBtn: { padding: '10px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(16,185,129,0.25)' },
  actionBtnOutline: { padding: '10px 16px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  filters: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' },
  select: { padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#fff', minWidth: '150px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '4px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.04)' },
  statIcon: { width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statValue: { fontSize: '22px', fontWeight: '800', margin: 0, lineHeight: 1.1 },
  statLabel: { fontSize: '11px', color: '#64748b', margin: '2px 0 0', fontWeight: '500' },
  calendarCard: { background: '#fff', borderRadius: '18px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  calendarHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '8px' },
  calendarDayHeader: { textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', padding: '6px' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' },
  calendarBlank: { background: '#fafafa', borderRadius: '12px', minHeight: '72px' },
  calendarDay: { borderRadius: '12px', padding: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '72px', transition: 'transform 0.15s ease, box-shadow 0.15s ease', position: 'relative' },
  todayTag: { position: 'absolute', top: '4px', right: '6px', fontSize: '8px', fontWeight: '800', color: '#fff', background: '#10b981', padding: '1px 6px', borderRadius: '8px' },
  profileCard: { background: '#fff', borderRadius: '18px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  profileHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '18px' },
  progressWrap: { marginBottom: '12px' },
  progressTrack: { height: '8px', borderRadius: '6px', background: '#f1f5f9', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '6px', background: 'linear-gradient(90deg, #10b981, #34d399)', transition: 'width 0.4s ease' },
  incentiveBadge: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' },
  legendCard: { background: '#fff', borderRadius: '18px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  legendTitle: { fontSize: '12px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.03em' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  cancelBtn: { flex: 1, padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', color: '#475569' },
  submitBtn: { flex: 1, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }
};
