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
  subMonths,
  getDay,
  getDaysInMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Download, Upload, Users, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const ATTENDANCE_OPTIONS: { status: AttendanceStatus; label: string; color: string; bgColor: string }[] = [
  { status: 'P', label: 'Present', color: '#166534', bgColor: '#dcfce7' },
  { status: 'A', label: 'Absent/LWP', color: '#991b1b', bgColor: '#fee2e2' },
  { status: 'PL', label: 'Paid Leave', color: '#1e40af', bgColor: '#dbeafe' },
  { status: 'H', label: 'Holiday', color: '#7c3aed', bgColor: '#ede9fe' },
  { status: 'WO', label: 'Week Off', color: '#059669', bgColor: '#a7f3d0' },
  { status: 'LOP', label: 'Loss of Pay', color: '#dc2626', bgColor: '#fecaca' },
];

export default function AttendancePage() {
  const { user, isAdmin, canAccessDepot } = useAuth();
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

  useEffect(() => {
    loadData();
  }, [selectedBranch, user, selectedMonth, selectedYear]);

  const loadData = () => {
    const branchList = dataService.getBranches();
    setBranches(branchList);

    const depotId = isAdmin ? selectedBranch : user?.depotId;
    const empList = dataService.getEmployees(depotId, undefined, selectedMonth, selectedYear);
    setEmployees(empList);

    const attendanceData = dataService.getAttendance() as Attendance;
    setAttendance(attendanceData);
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

  const getStatusOptions = (status: AttendanceStatus | undefined) => {
    return ATTENDANCE_OPTIONS.map(opt => ({
      ...opt,
      selected: opt.status === status
    }));
  };

  const cycleStatus = (dateStr: string, currentStatus?: AttendanceStatus) => {
    const statuses: AttendanceStatus[] = ['P', 'A', 'PL', 'H', 'WO', 'LOP'];
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

  const handleBulkUpdate = () => {
    filteredEmployees.forEach(emp => {
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = getDay(new Date(selectedYear, selectedMonth - 1, d));
        
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
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
    if (!status) return { bgColor: '#f8fafc', color: '#64748b' };
    const opt = ATTENDANCE_OPTIONS.find(o => o.status === status);
    return { bgColor: opt?.bgColor || '#f8fafc', color: opt?.color || '#64748b' };
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

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', margin: 0 }}>Attendance Management</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>
            Mark daily attendance: Present (P), Absent/LWP (A), Paid Leave (PL), Holiday (H), Week Off (WO), LOP
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowBulkModal(true)} style={styles.actionBtn}>
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
        <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} style={{ ...styles.select, minWidth: '250px' }}>
          <option value="">Select Employee</option>
          {filteredEmployees.map(e => (
            <option key={e.id} value={e.id}>{e.employeeId} - {e.name} ({e.subDepotCategory})</option>
          ))}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button onClick={handlePrevMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontWeight: '600', minWidth: '140px', textAlign: 'center' }}>
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={handleNextMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div style={styles.legendCard}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px' }}>Attendance Legend</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {ATTENDANCE_OPTIONS.map(opt => (
            <div key={opt.status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: opt.bgColor, border: `2px solid ${opt.color}` }}></div>
              <span style={{ fontSize: '12px' }}>{opt.label} ({opt.status}) - {opt.color === '#166534' || opt.color === '#1e40af' || opt.color === '#7c3aed' || opt.color === '#059669' ? 'Paid' : 'Unpaid'}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedEmployee && (
        <div className="attendance-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', marginTop: '24px' }}>
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
                const style = getStatusStyle(status as AttendanceStatus);
                
                return (
                  <div 
                    key={dateStr} 
                    style={{ ...styles.calendarDay, background: style.bgColor }}
                    onClick={() => cycleStatus(dateStr, status as AttendanceStatus)}
                  >
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: isToday(day) ? '700' : '400',
                      color: isToday(day) ? '#10b981' : style.color
                    }}>
                      {format(day, 'd')}
                    </span>
                    <span style={{ fontSize: '10px', color: style.color, fontWeight: '600' }}>
                      {status || (isWeekend ? 'WO' : '-')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={styles.profileCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={styles.avatar}>{selectedEmployee.name.charAt(0)}</div>
                <div>
                  <p style={{ fontWeight: '600', margin: 0 }}>{selectedEmployee.name}</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                    {selectedEmployee.employeeId} • {selectedEmployee.subDepotCategory}
                    {selectedEmployee.busCategory ? ` • ${selectedEmployee.busCategory === '8 METER' ? '8M Bus' : '12M Bus'}` : ''}
                  </p>
                </div>
              </div>
              
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', margin: '0 0 12px', textTransform: 'uppercase' }}>
                Monthly Summary - {format(currentDate, 'MMMM yyyy')}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={styles.summaryItem}>
                  <CheckCircle size={16} color="#10b981" />
                  <span>Present</span>
                  <strong>{summary.present}</strong>
                </div>
                <div style={styles.summaryItem}>
                  <Clock size={16} color="#dc2626" />
                  <span>Absent</span>
                  <strong>{summary.absent}</strong>
                </div>
                <div style={styles.summaryItem}>
                  <Calendar size={16} color="#1e40af" />
                  <span>Paid Leave</span>
                  <strong>{summary.paidLeave}</strong>
                </div>
                <div style={styles.summaryItem}>
                  <Calendar size={16} color="#7c3aed" />
                  <span>Holiday</span>
                  <strong>{summary.holiday}</strong>
                </div>
                <div style={styles.summaryItem}>
                  <Users size={16} color="#059669" />
                  <span>Week Off</span>
                  <strong>{summary.weekOff}</strong>
                </div>
                <div style={styles.summaryItem}>
                  <Clock size={16} color="#dc2626" />
                  <span>LOP</span>
                  <strong>{summary.lop}</strong>
                </div>
              </div>

              {selectedEmployee.subDepotCategory === 'DRIVERS' && summary.absent === 0 && summary.lop === 0 && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#dcfce7', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={20} color="#166534" />
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#166534', margin: 0 }}>100% Attendance!</p>
                    <p style={{ fontSize: '11px', color: '#166534', margin: '2px 0 0' }}>Driver incentive eligible</p>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.statusCard}>
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', margin: '0 0 12px', textTransform: 'uppercase' }}>
                Click any date to change status
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {ATTENDANCE_OPTIONS.map(opt => (
                  <div 
                    key={opt.status} 
                    style={{ 
                      padding: '8px 12px', 
                      background: opt.bgColor, 
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: opt.color
                    }}
                  >
                    <span>{opt.label}</span>
                    <span style={{ marginLeft: 'auto' }}>{opt.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedEmployee && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', marginTop: '24px' }}>
          <Users size={48} color="#94a3b8" />
          <p style={{ color: '#64748b', marginTop: '16px' }}>Select an employee to mark attendance</p>
        </div>
      )}

      {showBulkModal && (
        <div style={styles.modalOverlay} onClick={() => setShowBulkModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Bulk Update Attendance</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px' }}>
              Update {filteredEmployees.length} employees for {format(currentDate, 'MMMM yyyy')}
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
  filters: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' },
  select: { padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: '#fff', minWidth: '150px' },
  actionBtn: { padding: '10px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  actionBtnOutline: { padding: '10px 16px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  legendCard: { padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' },
  calendarCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  calendarHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' },
  calendarDayHeader: { textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b', padding: '8px' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' },
  calendarBlank: { background: '#f8fafc', borderRadius: '6px', minHeight: '60px' },
  calendarDay: { borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60px', transition: 'all 0.2s' },
  profileCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '18px' },
  summaryItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' },
  summaryItemStrong: { marginLeft: 'auto', fontWeight: '700' },
  statusCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '400px' },
  cancelBtn: { flex: 1, padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' },
  submitBtn: { flex: 1, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }
};
