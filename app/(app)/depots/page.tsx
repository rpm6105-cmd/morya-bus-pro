'use client';

import { useState, useEffect } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { Branch, IncentiveTier } from '../../lib/types';
import {
  Building2, MapPin, Phone, Mail, Users, TrendingUp, Edit2,
  X, Check, Search, Filter, Plus, Trash2, Award, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import Tooltip from '../../components/ui/Tooltip';

export default function DepotsPage() {
  const { user, isAdmin } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIncentive, setEditingIncentive] = useState(false);
  const [incentiveType, setIncentiveType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [incentiveValue, setIncentiveValue] = useState(0);
  const [incentiveTiers, setIncentiveTiers] = useState<IncentiveTier[]>([]);
  const [hourlyOvertimeRate, setHourlyOvertimeRate] = useState(0);
  const [fullDayOvertimeRate, setFullDayOvertimeRate] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    manager: '',
    managerPhone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [templateBranchId, setTemplateBranchId] = useState('');

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = () => {
    setBranches(dataService.getBranches());
  };

  const openCreateModal = () => {
    setCreateForm({
      name: '',
      code: '',
      manager: '',
      managerPhone: '',
      address: '',
      city: '',
      state: '',
      pincode: ''
    });
    setTemplateBranchId('');
    setShowCreateModal(true);
  };

  const handleCreateDepot = () => {
    if (!createForm.name.trim()) return toast.error('Depot name is required');
    if (!createForm.code.trim()) return toast.error('Depot code is required');
    if (!createForm.city.trim()) return toast.error('City is required');

    const branch = dataService.createDepotWithTemplate(createForm, templateBranchId || undefined);
    if (templateBranchId) {
      const template = branches.find(b => b.id === templateBranchId);
      toast.success(`Depot "${branch.name}" created. Copied structure & salary setup from ${template?.name || 'template'}.`);
    } else {
      toast.success(`Depot "${branch.name}" created with default setup.`);
    }
    setShowCreateModal(false);
    loadBranches();
  };

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmployeeCount = (branchId: string) => {
    return dataService.getEmployeesByBranch(branchId).filter(e => e.status === 'ACTIVE').length;
  };

  const getTotalSalary = (branchId: string) => {
    return dataService.getEmployeesByBranch(branchId)
      .filter(e => e.status === 'ACTIVE')
      .reduce((sum, e) => sum + e.salary, 0);
  };

  const handleUpdateIncentive = () => {
    if (!selectedBranch) return;
    
    const validTiers = incentiveTiers
      .filter(t => t.minDays > 0 && t.maxDays >= t.minDays && t.amount > 0)
      .sort((a, b) => a.minDays - b.minDays);
    
    const updatedBranch = {
      ...selectedBranch,
      incentiveType,
      incentiveValue,
      incentiveTiers: validTiers,
      hourlyOvertimeRate: hourlyOvertimeRate || undefined,
      fullDayOvertimeRate: fullDayOvertimeRate || undefined
    };
    
    const allBranches = dataService.getBranches();
    const idx = allBranches.findIndex(b => b.id === selectedBranch.id);
    if (idx !== -1) {
      allBranches[idx] = updatedBranch;
      localStorage.setItem('hrms_branches', JSON.stringify(allBranches));
      setBranches(allBranches);
      setSelectedBranch(updatedBranch);
      setEditingIncentive(false);
      toast.success('Incentive and Overtime rates updated successfully');
    }
  };

  const handleUpdateTier = (id: string, field: keyof IncentiveTier, value: number) => {
    setIncentiveTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleAddTier = () => {
    const maxId = incentiveTiers.reduce((max, t) => {
      const num = parseInt(t.id.replace('tier-', '')) || 0;
      return Math.max(max, num);
    }, 0);
    setIncentiveTiers(prev => [...prev, { id: `tier-${maxId + 1}`, minDays: 24, maxDays: 26, amount: 2000 }]);
  };

  const handleRemoveTier = (id: string) => {
    setIncentiveTiers(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Depot Management</h1>
          <p style={styles.subtitle}>{branches.length} depots across India</p>
        </div>
        <div style={styles.searchBox}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search depots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        {isAdmin && (
          <button onClick={openCreateModal} style={styles.createBtn}>
            <Plus size={16} />
            Create Depot
          </button>
        )}
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <Building2 size={20} color="#3b82f6" />
          <div>
            <p style={styles.statValue}>{branches.length}</p>
            <p style={styles.statLabel}>Total Depots</p>
          </div>
        </div>
        <div style={styles.statBox}>
          <Users size={20} color="#10b981" />
          <div>
            <p style={styles.statValue}>
              {branches.reduce((sum, b) => sum + getEmployeeCount(b.id), 0).toLocaleString()}
            </p>
            <p style={styles.statLabel}>Total Employees</p>
          </div>
        </div>
        <div style={styles.statBox}>
          <TrendingUp size={20} color="#f59e0b" />
          <div>
            <p style={styles.statValue}>
              ₹{(branches.reduce((sum, b) => sum + getTotalSalary(b.id), 0) / 10000000).toFixed(1)}Cr
            </p>
            <p style={styles.statLabel}>Monthly Payroll</p>
          </div>
        </div>
      </div>

      <div style={styles.depotGrid}>
        {filteredBranches.map((branch) => {
          const empCount = getEmployeeCount(branch.id);
          const totalSalary = getTotalSalary(branch.id);
          
          return (
            <div
              key={branch.id}
              style={{
                ...styles.depotCard,
                border: selectedBranch?.id === branch.id ? '2px solid #10b981' : '1px solid #e2e8f0'
              }}
              onClick={() => setSelectedBranch(branch)}
            >
              <div style={styles.depotHeader}>
                <div style={styles.depotIcon}>
                  <Building2 size={24} color="#10b981" />
                </div>
                <div>
                  <h3 style={styles.depotName}>{branch.name}</h3>
                  <p style={styles.depotCode}>{branch.code}</p>
                </div>
                <span style={styles.statusBadge}>Active</span>
              </div>

              <div style={styles.depotDetails}>
                <div style={styles.detailRow}>
                  <MapPin size={14} color="#64748b" />
                  <span>{branch.city}, {branch.state}</span>
                </div>
                <div style={styles.detailRow}>
                  <Users size={14} color="#64748b" />
                  <span>{empCount} employees</span>
                </div>
                <div style={styles.detailRow}>
                  <Phone size={14} color="#64748b" />
                  <span>{branch.managerPhone}</span>
                </div>
              </div>

              <div style={styles.depotFooter}>
                <div style={styles.incentiveBox}>
                  <span style={styles.incentiveLabel}>Incentive</span>
                  <span style={styles.incentiveValue}>
                    {branch.incentiveType === 'FIXED' 
                      ? `₹${branch.incentiveValue}` 
                      : `${branch.incentiveValue}%`}
                  </span>
                </div>
                <div style={styles.salaryBox}>
                  <span style={styles.salaryLabel}>Monthly</span>
                  <span style={styles.salaryValue}>₹{(totalSalary / 100000).toFixed(1)}L</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedBranch && (
        <div style={styles.modalOverlay} onClick={() => { setSelectedBranch(null); setEditingIncentive(false); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>{selectedBranch.name}</h2>
              <Tooltip label="Close">
                <button onClick={() => { setSelectedBranch(null); setEditingIncentive(false); }} style={styles.closeBtn} aria-label="Close">
                  <X size={20} />
                </button>
              </Tooltip>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.detailGrid}>
                <div>
                  <label style={styles.detailItemLabel}>Depot Code</label>
                  <p style={styles.detailItemText}>{selectedBranch.code}</p>
                </div>
                <div>
                  <label style={styles.detailItemLabel}>Manager</label>
                  <p style={styles.detailItemText}>{selectedBranch.manager}</p>
                </div>
                <div>
                  <label style={styles.detailItemLabel}>Phone</label>
                  <p style={styles.detailItemText}>{selectedBranch.managerPhone}</p>
                </div>
                <div>
                  <label style={styles.detailItemLabel}>Location</label>
                  <p style={styles.detailItemText}>{selectedBranch.city}, {selectedBranch.state}</p>
                </div>
                <div>
                  <label style={styles.detailItemLabel}>Pincode</label>
                  <p style={styles.detailItemText}>{selectedBranch.pincode}</p>
                </div>
                <div>
                  <label style={styles.detailItemLabel}>Active Employees</label>
                  <p style={styles.detailItemText}>{getEmployeeCount(selectedBranch.id)}</p>
                </div>
              </div>

              {isAdmin && (
                <div style={styles.incentiveSection}>
                  <h4>Incentive Configuration</h4>
                  {editingIncentive ? (
                    <div style={styles.editForm}>
                      <div style={styles.formRow}>
                        <label>Incentive Type</label>
                        <select
                          value={incentiveType}
                          onChange={(e) => setIncentiveType(e.target.value as 'FIXED' | 'PERCENTAGE')}
                          style={styles.select}
                        >
                          <option value="FIXED">Fixed Amount (₹)</option>
                          <option value="PERCENTAGE">Percentage (%)</option>
                        </select>
                      </div>
                      <div style={styles.formRow}>
                        <label>Incentive Value</label>
                        <input
                          type="number"
                          value={incentiveValue}
                          onChange={(e) => setIncentiveValue(Number(e.target.value))}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formRow}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                          Attendance Incentive Tiers (Drivers) — ₹
                        </label>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px' }}>
                          Driver incentive is paid based on present days in the month. Configure per-depot slabs.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {incentiveTiers.map((tier) => (
                            <div key={tier.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="number"
                                min={1}
                                max={31}
                                placeholder="Min days"
                                value={tier.minDays}
                                onChange={(e) => handleUpdateTier(tier.id, 'minDays', Number(e.target.value))}
                                style={styles.input}
                                title="Minimum present days"
                              />
                              <input
                                type="number"
                                min={1}
                                max={31}
                                placeholder="Max days"
                                value={tier.maxDays}
                                onChange={(e) => handleUpdateTier(tier.id, 'maxDays', Number(e.target.value))}
                                style={styles.input}
                                title="Maximum present days"
                              />
                              <input
                                type="number"
                                min={0}
                                placeholder="₹ Amount"
                                value={tier.amount}
                                onChange={(e) => handleUpdateTier(tier.id, 'amount', Number(e.target.value))}
                                style={styles.input}
                                title="Incentive amount"
                              />
                              <Tooltip label="Remove Tier">
                                <button onClick={() => handleRemoveTier(tier.id)} style={styles.tierDeleteBtn} aria-label={`Remove ${tier.minDays}-${tier.maxDays} days tier`}>
                                  <Trash2 size={14} color="#ef4444" />
                                </button>
                              </Tooltip>
                            </div>
                          ))}
                          <button onClick={handleAddTier} style={styles.tierAddBtn}>
                            <Plus size={14} />
                            Add Tier
                          </button>
                        </div>
                      </div>
                      <div style={styles.formRow}>
                        <label>Hourly Overtime Rate (₹)</label>
                        <input
                          type="number"
                          value={hourlyOvertimeRate}
                          onChange={(e) => setHourlyOvertimeRate(Number(e.target.value))}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formRow}>
                        <label>Full Day Overtime Rate (₹)</label>
                        <input
                          type="number"
                          value={fullDayOvertimeRate}
                          onChange={(e) => setFullDayOvertimeRate(Number(e.target.value))}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formActions}>
                        <button onClick={() => setEditingIncentive(false)} style={styles.cancelBtn}>
                          Cancel
                        </button>
                        <button onClick={handleUpdateIncentive} style={styles.saveBtn}>
                          <Check size={16} />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.incentiveDisplay}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Incentive</span>
                            <span style={styles.currentIncentive}>
                              {selectedBranch.incentiveType === 'FIXED' 
                                ? `₹${selectedBranch.incentiveValue}` 
                                : `${selectedBranch.incentiveValue}%`}
                            </span>
                            <span style={styles.incentiveType}>
                              ({selectedBranch.incentiveType === 'FIXED' ? 'Per Employee' : 'of Basic'})
                            </span>
                          </div>
                          <button onClick={() => {
                            setEditingIncentive(true);
                            setIncentiveType(selectedBranch.incentiveType);
                            setIncentiveValue(selectedBranch.incentiveValue);
                            setIncentiveTiers(selectedBranch.incentiveTiers?.length
                              ? selectedBranch.incentiveTiers
                              : [
                                  { id: 'tier-1', minDays: 24, maxDays: 25, amount: 2000 },
                                  { id: 'tier-2', minDays: 26, maxDays: 30, amount: 3000 }
                                ]);
                            setHourlyOvertimeRate(selectedBranch.hourlyOvertimeRate || 50);
                            setFullDayOvertimeRate(selectedBranch.fullDayOvertimeRate || 300);
                          }} style={styles.editBtn}>
                            <Edit2 size={14} />
                            Edit
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '24px', marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Hourly Overtime</span>
                            <span style={{ fontSize: '16px', fontWeight: '600', color: '#334155' }}>
                              ₹{selectedBranch.hourlyOvertimeRate || 50}/hr
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Full Day Overtime</span>
                            <span style={{ fontSize: '16px', fontWeight: '600', color: '#334155' }}>
                              ₹{selectedBranch.fullDayOvertimeRate || 300}/day
                            </span>
                          </div>
                        </div>
                        {(selectedBranch.incentiveTiers?.length || 0) > 0 && (
                          <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', marginBottom: '6px' }}>
                              <Award size={12} /> Driver Attendance Tiers
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {selectedBranch.incentiveTiers!.slice().sort((a, b) => a.minDays - b.minDays).map(tier => (
                                <div key={tier.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                  <span style={{ color: '#475569' }}>
                                    {tier.minDays}-{tier.maxDays} days present
                                  </span>
                                  <span style={{ fontWeight: '600', color: '#10b981' }}>₹{tier.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0 }}>Create New Depot</h2>
              <Tooltip label="Close">
                <button onClick={() => setShowCreateModal(false)} style={styles.closeBtn} aria-label="Close">
                  <X size={20} />
                </button>
              </Tooltip>
            </div>
            <div style={styles.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={styles.formRow}>
                  <label>Depot Name *</label>
                  <input style={styles.input} value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. Andheri Depot" />
                </div>
                <div style={styles.formRow}>
                  <label>Depot Code *</label>
                  <input style={styles.input} value={createForm.code} onChange={e => setCreateForm({ ...createForm, code: e.target.value })} placeholder="e.g. D02" />
                </div>
                <div style={styles.formRow}>
                  <label>City *</label>
                  <input style={styles.input} value={createForm.city} onChange={e => setCreateForm({ ...createForm, city: e.target.value })} placeholder="e.g. Mumbai" />
                </div>
                <div style={styles.formRow}>
                  <label>State</label>
                  <input style={styles.input} value={createForm.state} onChange={e => setCreateForm({ ...createForm, state: e.target.value })} placeholder="e.g. Maharashtra" />
                </div>
                <div style={styles.formRow}>
                  <label>Address</label>
                  <input style={styles.input} value={createForm.address} onChange={e => setCreateForm({ ...createForm, address: e.target.value })} placeholder="Depot address" />
                </div>
                <div style={styles.formRow}>
                  <label>Pincode</label>
                  <input style={styles.input} value={createForm.pincode} onChange={e => setCreateForm({ ...createForm, pincode: e.target.value })} placeholder="e.g. 400058" />
                </div>
                <div style={styles.formRow}>
                  <label>Manager</label>
                  <input style={styles.input} value={createForm.manager} onChange={e => setCreateForm({ ...createForm, manager: e.target.value })} placeholder="Manager name" />
                </div>
                <div style={styles.formRow}>
                  <label>Manager Phone</label>
                  <input style={styles.input} value={createForm.managerPhone} onChange={e => setCreateForm({ ...createForm, managerPhone: e.target.value })} placeholder="10-digit mobile" inputMode="numeric" />
                </div>
              </div>

              <div style={{ ...styles.formRow, marginTop: '16px', padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: '#166534' }}>
                  <Copy size={14} /> Copy structure from an existing depot
                </label>
                <p style={{ fontSize: '12px', color: '#166534', margin: '6px 0 10px' }}>
                  Copies incentive tiers, overtime rates, salary setup and the active employee roster (salaries, departments, designations). Historical attendance is not carried over.
                </p>
                <select
                  style={{ ...styles.select, width: '100%' }}
                  value={templateBranchId}
                  onChange={e => setTemplateBranchId(e.target.value)}
                >
                  <option value="">-- Empty depot (default setup only) --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={() => setShowCreateModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button onClick={handleCreateDepot} style={styles.saveBtn}>
                  <Plus size={16} />
                  Create Depot
                </button>
              </div>
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
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '200px' },
  createBtn: { padding: '10px 16px', background: '#10b981', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px' },
  statBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statValue: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  statLabel: { fontSize: '12px', color: '#64748b', margin: 0 },
  depotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  depotCard: { background: '#fff', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  depotHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  depotIcon: { width: '48px', height: '48px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  depotName: { fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 },
  depotCode: { fontSize: '12px', color: '#64748b', margin: '2px 0 0' },
  statusBadge: { marginLeft: 'auto', padding: '4px 8px', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '11px', fontWeight: '500' },
  depotDetails: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  detailRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' },
  depotFooter: { display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' },
  incentiveBox: { flex: 1, padding: '12px', background: '#f8fafc', borderRadius: '8px' },
  incentiveLabel: { fontSize: '11px', color: '#64748b', display: 'block' },
  incentiveValue: { fontSize: '18px', fontWeight: '700', color: '#10b981' },
  salaryBox: { flex: 1, padding: '12px', background: '#f8fafc', borderRadius: '8px' },
  salaryLabel: { fontSize: '11px', color: '#64748b', display: 'block' },
  salaryValue: { fontSize: '18px', fontWeight: '700', color: '#3b82f6' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  modalBody: { padding: '24px' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' },
  detailItemLabel: { fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  detailItemText: { fontSize: '14px', fontWeight: '500', color: '#0f172a', margin: 0 },
  incentiveSection: { padding: '16px', background: '#f8fafc', borderRadius: '8px' },
  incentiveDisplay: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  currentIncentive: { fontSize: '24px', fontWeight: '700', color: '#10b981' },
  incentiveType: { fontSize: '12px', color: '#64748b', marginLeft: '8px' },
  editBtn: { display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  editForm: { display: 'flex', flexDirection: 'column', gap: '12px' },
  formRow: { display: 'flex', flexDirection: 'column', gap: '4px' },
  select: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' },
  input: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' },
  formActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' },
  saveBtn: { padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  tierAddBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', background: '#ecfdf5', color: '#047857', border: '1px dashed #10b981', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  tierDeleteBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};
