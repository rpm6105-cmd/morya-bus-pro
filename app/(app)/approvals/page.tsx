'use client';

import { useState, useEffect } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { EmployeeChangeRequest } from '../../lib/types';
import {
  Check, X, Clock, CheckCircle2, XCircle, ShieldCheck, History, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  department: 'Department',
  designation: 'Designation',
  branchId: 'Depot',
  salary: 'Monthly Salary',
  bankAccount: 'Bank Account',
  ifscCode: 'IFSC Code',
  panNumber: 'PAN Number',
  aadharNumber: 'Aadhaar Number',
  joiningDate: 'Joining Date',
  status: 'Status',
  address: 'Address',
  emergencyContact: 'Emergency Contact',
  emergencyPhone: 'Emergency Phone',
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  busCategory: 'Bus Category',
  employeeId: 'Employee ID'
};

const formatValue = (value: any): string => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'number') return `₹${value.toLocaleString()}`;
  return String(value);
};

export default function ApprovalsPage() {
  const { user, isAdmin } = useAuth();
  const [requests, setRequests] = useState<EmployeeChangeRequest[]>([]);

  const loadRequests = () => {
    setRequests(dataService.getChangeRequests(user?.id, user?.role));
  };

  useEffect(() => {
    loadRequests();
  }, [user?.id, user?.role]);

  useEffect(() => {
    const onUpdate = () => loadRequests();
    window.addEventListener('hrms-approvals-updated', onUpdate);
    return () => window.removeEventListener('hrms-approvals-updated', onUpdate);
  }, [user?.id, user?.role]);

  const pending = requests.filter(r => r.status === 'PENDING');
  const history = requests.filter(r => r.status !== 'PENDING');

  const handleApprove = (req: EmployeeChangeRequest) => {
    if (confirm(`Approve ${req.changes ? Object.keys(req.changes).length : 0} change(s) for ${req.employeeName}?\n\nThe changes will be applied to the employee automatically.`)) {
      if (user) {
        dataService.approveChangeRequest(req.id, user);
        toast.success('Changes approved and applied to employee');
        loadRequests();
      }
    }
  };

  const handleReject = (req: EmployeeChangeRequest) => {
    const remarks = prompt(`Reject the changes for ${req.employeeName}? (Optional remarks)`) ?? '';
    if (remarks === null) return;
    if (user) {
      dataService.rejectChangeRequest(req.id, user, remarks);
      toast.success('Change request rejected');
      loadRequests();
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') return { bg: '#dcfce7', color: '#166534', icon: CheckCircle2, label: 'Approved' };
    if (status === 'REJECTED') return { bg: '#fee2e2', color: '#991b1b', icon: XCircle, label: 'Rejected' };
    return { bg: '#fef3c7', color: '#92400e', icon: Clock, label: 'Pending' };
  };

  const renderDiff = (req: EmployeeChangeRequest) => {
    const employee = dataService.getEmployeeById(req.employeeId);
    return (
      <div style={{ overflowX: 'auto', marginTop: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '6px 8px' }}>Field</th>
              <th style={{ padding: '6px 8px' }}>Current Value</th>
              <th style={{ padding: '6px 8px' }}>Requested Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(req.changes || {}).filter(([key]) => key !== 'masterEmployeeId' && key !== '__action').map(([key, value]) => {
              const oldValue = (employee as any)?.[key];
              const display = (v: any) => key === 'branchId' ? (dataService.getBranchById(String(v))?.name || formatValue(v)) : formatValue(v);
              return (
                <tr key={key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', fontWeight: '600', color: '#334155' }}>{FIELD_LABELS[key] || key}</td>
                  <td style={{ padding: '8px', color: '#64748b' }}>{display(oldValue)}</td>
                  <td style={{ padding: '8px', color: '#166534', fontWeight: '600' }}>{display(value)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCard = (req: EmployeeChangeRequest) => {
    const badge = getStatusBadge(req.status);
    const BadgeIcon = badge.icon;
    return (
      <div key={req.id} style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
              {req.employeeName}
            </h3>
            <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>
              Requested by <strong>{req.requestedByName}</strong> · {new Date(req.createdAt).toLocaleString('en-IN')}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#475569' }}>
              Fields: <strong>{req.summary}</strong>
            </p>
          </div>
          <span style={{ ...styles.statusBadge, background: badge.bg, color: badge.color }}>
            <BadgeIcon size={12} />
            {badge.label}
          </span>
        </div>

        {renderDiff(req)}

        {req.status === 'REJECTED' && req.remarks && (
          <div style={{ marginTop: '12px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#991b1b' }}>
            <strong>Remarks:</strong> {req.remarks}
          </div>
        )}
        {req.status === 'APPROVED' && (
          <p style={{ marginTop: '10px', fontSize: '12px', color: '#166534' }}>
            Reviewed by {req.reviewedByName} on {req.reviewedAt ? new Date(req.reviewedAt).toLocaleString('en-IN') : ''}
          </p>
        )}

        {req.status === 'PENDING' && isAdmin && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={() => handleApprove(req)} style={styles.approveBtn}>
              <Check size={14} />
              Approve & Apply
            </button>
            <button onClick={() => handleReject(req)} style={styles.rejectBtn}>
              <X size={14} />
              Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{isAdmin ? 'Approvals' : 'My Change Requests'}</h1>
          <p style={styles.subtitle}>
            {isAdmin
              ? 'Review and approve employee changes requested by HR. Approved changes are applied automatically.'
              : 'Changes you requested are applied automatically once approved by the Admin.'}
          </p>
        </div>
      </div>

      {isAdmin && (
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <Clock size={20} color="#d97706" />
            <div>
              <p style={styles.statValue}>{pending.length}</p>
              <p style={styles.statLabel}>Pending Approvals</p>
            </div>
          </div>
          <div style={styles.statBox}>
            <CheckCircle2 size={20} color="#10b981" />
            <div>
              <p style={styles.statValue}>{history.filter(r => r.status === 'APPROVED').length}</p>
              <p style={styles.statLabel}>Approved</p>
            </div>
          </div>
          <div style={styles.statBox}>
            <XCircle size={20} color="#ef4444" />
            <div>
              <p style={styles.statValue}>{history.filter(r => r.status === 'REJECTED').length}</p>
              <p style={styles.statLabel}>Rejected</p>
            </div>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', marginTop: '24px' }}>
          <ShieldCheck size={48} color="#94a3b8" />
          <p style={{ color: '#64748b', marginTop: '16px' }}>
            {isAdmin ? 'No change requests yet. HR edits will appear here for approval.' : 'You have not submitted any change requests.'}
          </p>
        </div>
      ) : (
        <>
          {isAdmin && pending.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h2 style={styles.sectionTitle}>
                <Clock size={16} color="#d97706" /> Pending ({pending.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pending.map(renderCard)}
              </div>
            </div>
          )}
          <div>
            <h2 style={styles.sectionTitle}>
              <History size={16} color="#64748b" /> {isAdmin ? 'History' : 'Request History'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(isAdmin ? history : requests).length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Nothing here yet.</p>
              ) : (
                (isAdmin ? history : requests).map(renderCard)
              )}
            </div>
          </div>
        </>
      )}

      {!isAdmin && pending.length > 0 && (
        <div style={{ marginTop: '20px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={14} />
          You have {pending.length} request(s) awaiting Admin approval.
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px' },
  statBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statValue: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  statLabel: { fontSize: '12px', color: '#64748b', margin: 0 },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 12px' },
  card: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  approveBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  rejectBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }
};
