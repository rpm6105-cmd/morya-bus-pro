'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { Employee, OvertimeEntry, OvertimeType } from '../../lib/types';
import { format } from 'date-fns';
import { Clock, Plus, CheckCircle, XCircle, Calendar, DollarSign, Building2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OvertimePage() {
  const { user, isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOtType, setNewOtType] = useState<OvertimeType>('HOURLY');
  const [newOtHours, setNewOtHours] = useState<number>(1);
  const [newOtRate, setNewOtRate] = useState<number>(0);
  const [newOtAmount, setNewOtAmount] = useState<number>(0);
  const [newOtReason, setNewOtReason] = useState('');
  const [newOtDate, setNewOtDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [settings, setSettings] = useState<any>({ overtimeSettings: { hourlyRate: 50, fullDayRate: 300, maxHourlyOvertime: 4, maxFullDayOvertime: 10 } });
  const [activeDepotInfo, setActiveDepotInfo] = useState<{ id: string; name: string; isTemp: boolean } | null>(null);

  useEffect(() => {
    loadData();
    setSettings(dataService.getSettings());
  }, [selectedBranch, user, selectedMonth, selectedYear]);

  const loadData = () => {
    const branchList = dataService.getBranches();
    setBranches(branchList);

    const depotId = isAdmin ? selectedBranch : user?.depotId;
    const empList = dataService.getEmployees(depotId);
    setEmployees(empList.filter(e => e.status === 'ACTIVE'));

    const otEntries = dataService.getOvertime(undefined, selectedMonth, selectedYear);
    setOvertimeEntries(otEntries);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'ACTIVE');
  }, [employees]);

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);

  useEffect(() => {
    if (!selectedEmployee || !newOtDate) return;

    const assignment = dataService.getAssignmentForEmployeeOnDate(selectedEmployee.id, newOtDate);
    const activeBranchId = assignment ? assignment.depotId : selectedEmployee.branchId;
    const activeBranch = branches.find(b => b.id === activeBranchId);

    if (activeBranch) {
      setActiveDepotInfo({
        id: activeBranch.id,
        name: activeBranch.name,
        isTemp: !!assignment
      });

      const hourlyRate = activeBranch.hourlyOvertimeRate !== undefined ? activeBranch.hourlyOvertimeRate : settings.overtimeSettings.hourlyRate;
      const fullDayRate = activeBranch.fullDayOvertimeRate !== undefined ? activeBranch.fullDayOvertimeRate : settings.overtimeSettings.fullDayRate;
      
      const rate = newOtType === 'HOURLY' ? hourlyRate : fullDayRate;
      setNewOtRate(rate);
      setNewOtAmount(newOtType === 'HOURLY' ? newOtHours * rate : rate);
    }
  }, [selectedEmployee, newOtDate, newOtType, newOtHours, branches, settings]);

  const empOvertime = selectedEmpId 
    ? overtimeEntries.filter(o => o.employeeId === selectedEmpId)
    : overtimeEntries;

  const pendingCount = empOvertime.filter(o => o.status === 'PENDING').length;
  const approvedCount = empOvertime.filter(o => o.status === 'APPROVED').length;

  const totalApprovedHours = empOvertime
    .filter(o => o.status === 'APPROVED')
    .reduce((sum, o) => sum + (o.type === 'HOURLY' && o.hours ? o.hours : o.type === 'FULL_DAY' ? 8 : 0), 0);

  const totalApprovedAmount = empOvertime
    .filter(o => o.status === 'APPROVED')
    .reduce((sum, o) => sum + (o.amount || 0), 0);

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

  const handleAddOvertime = () => {
    if (!selectedEmpId || !newOtDate || !newOtReason.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    if (newOtType === 'HOURLY' && (newOtHours < 1 || newOtHours > settings.overtimeSettings.maxHourlyOvertime)) {
      toast.error(`Hours must be between 1 and ${settings.overtimeSettings.maxHourlyOvertime}`);
      return;
    }

    if (newOtAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    dataService.addOvertime({
      employeeId: selectedEmpId,
      date: newOtDate,
      type: newOtType,
      hours: newOtType === 'HOURLY' ? newOtHours : undefined,
      rate: newOtRate,
      amount: newOtAmount,
      depotId: activeDepotInfo?.id || selectedEmployee?.branchId,
      reason: newOtReason.trim(),
      status: 'PENDING'
    });

    loadData();
    setShowAddModal(false);
    setNewOtReason('');
    setNewOtHours(1);
    setNewOtAmount(0);
    setNewOtRate(0);
    toast.success('Overtime entry added');
  };

  const handleApprove = (otId: string) => {
    dataService.approveOvertime(otId, user?.id || 'admin');
    loadData();
    toast.success('Overtime approved');
  };

  const handleReject = (otId: string) => {
    const entries = dataService.getOvertime();
    const entry = entries.find(o => o.id === otId);
    if (entry) {
      dataService.addOvertime({
        ...entry,
        id: otId,
        status: 'REJECTED'
      } as any);
      const allEntries = dataService.getOvertime();
      const idx = allEntries.findIndex(o => o.id === otId);
      if (idx !== -1) {
        allEntries[idx] = { ...allEntries[idx], status: 'REJECTED' };
      }
    }
    loadData();
    toast.success('Overtime rejected');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#dcfce7', color: '#166534', icon: CheckCircle };
      case 'REJECTED':
        return { bg: '#fee2e2', color: '#991b1b', icon: XCircle };
      default:
        return { bg: '#fef3c7', color: '#92400e', icon: Clock };
    }
  };

  const employeeWiseSummary = useMemo(() => {
    return filteredEmployees.map(emp => {
      const empOT = overtimeEntries.filter(o => o.employeeId === emp.id && o.status === 'APPROVED');
      const empBranch = branches.find(b => b.id === emp.branchId);
      const totalHours = empOT.reduce((sum, o) => sum + (o.type === 'HOURLY' && o.hours ? o.hours : o.type === 'FULL_DAY' ? 8 : 0), 0);
      const totalAmount = empOT.reduce((sum, o) => sum + (o.amount || 0), 0);
      return {
        ...emp,
        branchName: empBranch?.name || 'Unknown',
        totalEntries: empOT.length,
        totalHours,
        totalAmount
      };
    }).filter(e => e.totalEntries > 0).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredEmployees, overtimeEntries, branches]);

  const depotWiseSummary = useMemo(() => {
    const summary: Record<string, { name: string; totalEmployees: number; totalEntries: number; totalHours: number; totalAmount: number }> = {};
    
    branches.filter(b => isAdmin ? !selectedBranch || b.id === selectedBranch : b.id === user?.depotId).forEach(branch => {
      const branchEmployees = filteredEmployees.filter(e => e.branchId === branch.id);
      const branchOT = overtimeEntries.filter(o => 
        branchEmployees.some(e => e.id === o.employeeId) && o.status === 'APPROVED'
      );
      summary[branch.id] = {
        name: branch.name,
        totalEmployees: branchEmployees.length,
        totalEntries: branchOT.length,
        totalHours: branchOT.reduce((sum, o) => sum + (o.type === 'HOURLY' && o.hours ? o.hours : o.type === 'FULL_DAY' ? 8 : 0), 0),
        totalAmount: branchOT.reduce((sum, o) => sum + (o.amount || 0), 0)
      };
    });
    
    return Object.entries(summary).map(([id, data]) => ({ id, ...data }));
  }, [branches, filteredEmployees, overtimeEntries, isAdmin, selectedBranch, user]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', margin: 0 }}>
            {isAdmin ? 'Overtime Management' : 'Overtime Entry'}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>
            {isAdmin ? 'View and approve overtime across all depots' : 'Enter overtime hours and amount'}
          </p>
        </div>
        {!isAdmin && selectedEmpId && (
          <button onClick={() => setShowAddModal(true)} style={styles.actionBtn}>
            <Plus size={16} />
            Add Overtime
          </button>
        )}
      </div>

      <div style={styles.filters}>
        {isAdmin && (
          <>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} style={styles.select}>
              <option value="">All Depots</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} style={{ ...styles.select, minWidth: '250px' }}>
              <option value="">All Employees</option>
              {filteredEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.employeeId} - {e.name}</option>
              ))}
            </select>
          </>
        )}
        {!isAdmin && (
          <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} style={{ ...styles.select, minWidth: '250px' }}>
            <option value="">Select Employee</option>
            {filteredEmployees.map(e => (
              <option key={e.id} value={e.id}>{e.employeeId} - {e.name}</option>
            ))}
          </select>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button onClick={handlePrevMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>←</button>
          <span style={{ fontWeight: '600', minWidth: '140px', textAlign: 'center' }}>
            {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')}
          </span>
          <button onClick={handleNextMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>→</button>
        </div>
      </div>

      {isAdmin && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} />
            Depot-wise Overtime Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {depotWiseSummary.map(depot => (
              <div key={depot.id} style={styles.depotCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>{depot.name}</h4>
                  <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                    {depot.totalEmployees} emp
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px' }}>Entries</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{depot.totalEntries}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px' }}>Hours</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{depot.totalHours}h</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px' }}>Total Amount</p>
                    <p style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#10b981' }}>₹{depot.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && employeeWiseSummary.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} />
            Employee-wise Overtime Details
          </h3>
          <div style={styles.tableCard}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Depot</th>
                  <th style={styles.th}>Entries</th>
                  <th style={styles.th}>Hours</th>
                  <th style={styles.th}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {employeeWiseSummary.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={styles.miniAvatar}>{emp.name.charAt(0)}</div>
                        <div>
                          <p style={{ fontWeight: '500', margin: 0 }}>{emp.name}</p>
                          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{emp.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>{emp.branchName}</td>
                    <td style={styles.td}>{emp.totalEntries}</td>
                    <td style={styles.td}>{emp.totalHours}h</td>
                    <td style={{ ...styles.td, fontWeight: '600', color: '#10b981' }}>₹{emp.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={styles.statCard}>
          <Clock size={24} color="#f59e0b" />
          <div>
            <p style={styles.statValue}>{empOvertime.length}</p>
            <p style={styles.statLabel}>Total Entries</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={24} color="#f59e0b" />
          <div>
            <p style={styles.statValue}>{pendingCount}</p>
            <p style={styles.statLabel}>Pending</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <CheckCircle size={24} color="#10b981" />
          <div>
            <p style={styles.statValue}>{approvedCount}</p>
            <p style={styles.statLabel}>Approved</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={24} color="#3b82f6" />
          <div>
            <p style={styles.statValue}>{totalApprovedHours}h</p>
            <p style={styles.statLabel}>Total Hours</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <DollarSign size={24} color="#10b981" />
          <div>
            <p style={styles.statValue}>₹{totalApprovedAmount.toLocaleString()}</p>
            <p style={styles.statLabel}>Total Amount</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr' : '1fr 350px', gap: '24px' }}>
        <div style={styles.tableCard}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>Overtime Entries</h3>
          {empOvertime.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <Clock size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
              <p>No overtime entries for this period</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Hours/Days</th>
                    <th style={styles.th}>Rate</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Status</th>
                    {isAdmin && <th style={styles.th}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {empOvertime.map(entry => {
                    const emp = employees.find(e => e.id === entry.employeeId);
                    const badge = getStatusBadge(entry.status);
                    const BadgeIcon = badge.icon;
                    const calculatedAmount = entry.amount || (
                      entry.type === 'HOURLY' && entry.hours 
                        ? entry.hours * (entry.rate || settings.overtimeSettings.hourlyRate)
                        : entry.type === 'FULL_DAY' 
                          ? (entry.rate || settings.overtimeSettings.fullDayRate) 
                          : 0
                    );
                    const rateDisplay = entry.rate 
                      ? `₹${entry.rate}/${entry.type === 'HOURLY' ? 'hr' : 'day'}` 
                      : (entry.type === 'HOURLY' ? `₹${settings.overtimeSettings.hourlyRate}/hr` : `₹${settings.overtimeSettings.fullDayRate}/day`);

                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={styles.miniAvatar}>{emp?.name?.charAt(0) || '?'}</div>
                            <div>
                              <p style={{ fontWeight: '500', margin: 0 }}>{emp?.name || 'Unknown'}</p>
                              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                                {emp?.employeeId} • {branches.find(b => b.id === (entry.depotId || emp?.branchId))?.name || 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>{format(new Date(entry.date), 'dd MMM yyyy')}</td>
                        <td style={styles.td}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: entry.type === 'HOURLY' ? '#dbeafe' : '#ede9fe',
                            color: entry.type === 'HOURLY' ? '#1e40af' : '#7c3aed'
                          }}>
                            {entry.type === 'HOURLY' ? 'HOURLY' : 'FULL DAY'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {entry.type === 'HOURLY' ? `${entry.hours || 0}h` : '1 day'}
                        </td>
                        <td style={styles.td}>
                          {rateDisplay}
                        </td>
                        <td style={{ ...styles.td, fontWeight: '600', color: '#10b981' }}>₹{calculatedAmount.toLocaleString()}</td>
                        <td style={styles.td}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: badge.bg,
                            color: badge.color
                          }}>
                            <BadgeIcon size={12} />
                            {entry.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={styles.td}>
                            {entry.status === 'PENDING' && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button 
                                  onClick={() => handleApprove(entry.id)} 
                                  style={{ ...styles.iconBtn, background: '#dcfce7', color: '#166534' }}
                                >
                                  <CheckCircle size={14} />
                                </button>
                                <button 
                                  onClick={() => handleReject(entry.id)} 
                                  style={{ ...styles.iconBtn, background: '#fee2e2', color: '#991b1b' }}
                                >
                                  <XCircle size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isAdmin && (
          <div style={styles.settingsCard}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              Rate Reference
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={styles.settingsRow}>
                <span style={styles.settingsLabel}>Hourly Rate</span>
                <span style={styles.settingsValue}>₹{settings.overtimeSettings.hourlyRate}/hr</span>
              </div>
              <div style={styles.settingsRow}>
                <span style={styles.settingsLabel}>Full Day Rate</span>
                <span style={styles.settingsValue}>₹{settings.overtimeSettings.fullDayRate}/day</span>
              </div>
              <div style={styles.settingsRow}>
                <span style={styles.settingsLabel}>Max Hourly OT</span>
                <span style={styles.settingsValue}>{settings.overtimeSettings.maxHourlyOvertime} hrs/day</span>
              </div>
            </div>

            {selectedEmployee && (
              <>
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600' }}>Selected Employee</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={styles.avatar}>{selectedEmployee.name.charAt(0)}</div>
                    <div>
                      <p style={{ fontWeight: '600', margin: 0 }}>{selectedEmployee.name}</p>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                        {selectedEmployee.employeeId} • {selectedEmployee.subDepotCategory}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowAddModal(true)} style={{ ...styles.actionBtn, width: '100%' }}>
                    <Plus size={16} />
                    Add Overtime Entry
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showAddModal && selectedEmployee && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px' }}>Add Overtime Entry</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={styles.avatar}>{selectedEmployee.name.charAt(0)}</div>
              <div>
                <p style={{ fontWeight: '600', margin: 0 }}>{selectedEmployee.name}</p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>{selectedEmployee.employeeId}</p>
              </div>
            </div>

            {activeDepotInfo && (
              <div style={{ marginBottom: '16px', padding: '10px', background: activeDepotInfo.isTemp ? '#fffbeb' : '#f0fdf4', border: activeDepotInfo.isTemp ? '1px solid #fef3c7' : '1px solid #dcfce7', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: activeDepotInfo.isTemp ? '#b45309' : '#15803d' }}>
                  Work Location: {activeDepotInfo.name} {activeDepotInfo.isTemp ? '(Temporary Assignment)' : '(Base Depot)'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                  Applicable Rates: ₹{(branches.find(b => b.id === activeDepotInfo.id)?.hourlyOvertimeRate) || settings.overtimeSettings.hourlyRate}/hr • ₹{(branches.find(b => b.id === activeDepotInfo.id)?.fullDayOvertimeRate) || settings.overtimeSettings.fullDayRate}/day
                </p>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Date</label>
              <input 
                type="date" 
                value={newOtDate} 
                onChange={e => setNewOtDate(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Overtime Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={() => { setNewOtType('HOURLY'); setNewOtRate(settings.overtimeSettings.hourlyRate); }}
                  style={{ 
                    ...styles.typeBtn,
                    background: newOtType === 'HOURLY' ? '#dbeafe' : '#f1f5f9',
                    color: newOtType === 'HOURLY' ? '#1e40af' : '#64748b',
                    border: newOtType === 'HOURLY' ? '2px solid #1e40af' : '2px solid transparent'
                  }}
                >
                  <Clock size={16} />
                  Hourly
                </button>
                <button 
                  type="button"
                  onClick={() => { setNewOtType('FULL_DAY'); setNewOtRate(settings.overtimeSettings.fullDayRate); }}
                  style={{ 
                    ...styles.typeBtn,
                    background: newOtType === 'FULL_DAY' ? '#ede9fe' : '#f1f5f9',
                    color: newOtType === 'FULL_DAY' ? '#7c3aed' : '#64748b',
                    border: newOtType === 'FULL_DAY' ? '2px solid #7c3aed' : '2px solid transparent'
                  }}
                >
                  <Calendar size={16} />
                  Full Day
                </button>
              </div>
            </div>

            {newOtType === 'HOURLY' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Hours (Max: {settings.overtimeSettings.maxHourlyOvertime})</label>
                <input 
                  type="number" 
                  min="1" 
                  max={settings.overtimeSettings.maxHourlyOvertime}
                  value={newOtHours}
                  onChange={e => {
                    const hrs = Number(e.target.value);
                    setNewOtHours(hrs);
                    setNewOtAmount(hrs * newOtRate);
                  }}
                  style={styles.input}
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Rate (₹ per hour/day)</label>
              <input 
                type="number" 
                min="0"
                value={newOtRate}
                onChange={e => {
                  const rate = Number(e.target.value);
                  setNewOtRate(rate);
                  setNewOtAmount(newOtType === 'HOURLY' ? newOtHours * rate : rate);
                }}
                style={styles.input}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Total Amount (₹)</label>
              <input 
                type="number" 
                min="0"
                value={newOtAmount}
                onChange={e => {
                  setNewOtAmount(Number(e.target.value));
                  if (newOtType === 'HOURLY' && newOtHours > 0) {
                    setNewOtRate(Math.round(newOtAmount / newOtHours));
                  } else {
                    setNewOtRate(newOtAmount);
                  }
                }}
                style={styles.input}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={styles.label}>Reason</label>
              <textarea 
                value={newOtReason}
                onChange={e => setNewOtReason(e.target.value)}
                placeholder="Enter reason for overtime..."
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowAddModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleAddOvertime} style={styles.submitBtn}>Add Entry</button>
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
  statCard: { background: '#fff', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statValue: { fontSize: '24px', fontWeight: '700', margin: 0, color: '#0f172a' },
  statLabel: { fontSize: '12px', color: '#64748b', margin: 0 },
  depotCard: { background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  tableCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  th: { textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  td: { padding: '12px 8px', fontSize: '14px' },
  miniAvatar: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '18px' },
  iconBtn: { width: '28px', height: '28px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  settingsCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content' },
  settingsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' },
  settingsLabel: { fontSize: '13px', color: '#64748b' },
  settingsValue: { fontSize: '14px', fontWeight: '600', color: '#0f172a' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '450px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  typeBtn: { flex: 1, padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' },
  cancelBtn: { flex: 1, padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' },
  submitBtn: { flex: 1, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }
};
