'use client';

import { useState, useEffect } from 'react';
import { authService } from '../../lib/services/authService';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { User, Branch } from '../../lib/types';
import {
  UserCog, Plus, Edit2, Trash2, Shield, Search, X, Check, 
  AlertCircle, Key, Users, Mail, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'HR' as 'ADMIN' | 'HR',
    depotId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userList = await authService.getAllUsers();
    setUsers(userList);
    setBranches(dataService.getBranches());
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'HR', depotId: '' });
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      depotId: user.depotId || ''
    });
    setShowModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Please fill all required fields');
      return;
    }

    if (editingUser) {
      const updates: Partial<User> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        depotId: formData.role === 'HR' ? formData.depotId : undefined
      };
      if (formData.password) {
        updates.password = formData.password;
      }
      await authService.updateUser(editingUser.id, updates);
      toast.success('User updated successfully');
    } else {
      if (!formData.password) {
        toast.error('Password is required for new users');
        return;
      }
      await authService.createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        depotId: formData.role === 'HR' ? formData.depotId : undefined,
        isActive: true
      });
      toast.success('User created successfully');
    }

    setShowModal(false);
    loadData();
  };

  const handleToggleStatus = async (userId: string) => {
    await authService.toggleUserStatus(userId);
    toast.success('User status updated');
    loadData();
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Enter new password:');
    if (newPassword) {
      await authService.resetPassword(userId, newPassword);
      toast.success('Password reset successfully');
    }
  };

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <Shield size={48} color="#ef4444" />
          <h2>Access Denied</h2>
          <p>Only administrators can access user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>User Management</h1>
          <p style={styles.subtitle}>{users.length} users (1 Admin + 30 HR)</p>
        </div>
        <button style={styles.addButton} onClick={handleAddUser}>
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div style={styles.filters}>
        <div style={styles.searchBox}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={styles.select}
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="HR">HR</option>
        </select>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <Shield size={24} color="#3b82f6" />
          <div>
            <p style={styles.statValue}>{users.filter(u => u.role === 'ADMIN').length}</p>
            <p style={styles.statLabel}>Administrators</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Users size={24} color="#10b981" />
          <div>
            <p style={styles.statValue}>{users.filter(u => u.role === 'HR').length}</p>
            <p style={styles.statLabel}>HR Managers</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Check size={24} color="#22c55e" />
          <div>
            <p style={styles.statValue}>{users.filter(u => u.isActive).length}</p>
            <p style={styles.statLabel}>Active Users</p>
          </div>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>User</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Depot</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Last Login</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={styles.userCell}>
                    <div style={styles.avatar}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p style={styles.userName}>{user.name}</p>
                      <p style={styles.userId}>{user.id}</p>
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={styles.emailCell}>
                    <Mail size={14} color="#64748b" />
                    {user.email}
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.roleBadge,
                    background: user.role === 'ADMIN' ? '#dbeafe' : '#f0fdf4',
                    color: user.role === 'ADMIN' ? '#1e40af' : '#166534'
                  }}>
                    <Shield size={12} />
                    {user.role}
                  </span>
                </td>
                <td style={styles.td}>
                  {user.role === 'HR' ? (
                    <span style={styles.depotTag}>
                      <Building2 size={12} />
                      {branches.find(b => b.id === user.depotId)?.code || 'Not Assigned'}
                    </span>
                  ) : (
                    <span style={styles.allDepots}>All Depots</span>
                  )}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusBadge,
                    background: user.isActive ? '#dcfce7' : '#fee2e2',
                    color: user.isActive ? '#166534' : '#991b1b'
                  }}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>
                  {user.lastLogin 
                    ? new Date(user.lastLogin).toLocaleDateString('en-IN')
                    : 'Never'}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button onClick={() => handleEditUser(user)} style={styles.actionBtn} title="Edit">
                      <Edit2 size={16} color="#3b82f6" />
                    </button>
                    <button onClick={() => handleToggleStatus(user.id)} style={styles.actionBtn} title="Toggle Status">
                      {user.isActive ? <Trash2 size={16} color="#ef4444" /> : <Check size={16} color="#10b981" />}
                    </button>
                    <button onClick={() => handleResetPassword(user.id)} style={styles.actionBtn} title="Reset Password">
                      <Key size={16} color="#f59e0b" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  placeholder="Enter full name"
                />
              </div>
              <div style={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={styles.input}
                  placeholder="Enter email address"
                />
              </div>
              <div style={styles.formGroup}>
                <label>Password {!editingUser && '*'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={styles.input}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'}
                />
              </div>
              <div style={styles.formGroup}>
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'HR' })}
                  style={styles.select}
                >
                  <option value="HR">HR Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              {formData.role === 'HR' && (
                <div style={styles.formGroup}>
                  <label>Depot *</label>
                  <select
                    value={formData.depotId}
                    onChange={(e) => setFormData({ ...formData, depotId: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">Select Depot</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleSaveUser} style={styles.saveBtn}>
                <Check size={16} />
                {editingUser ? 'Update User' : 'Create User'}
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
  addButton: { padding: '10px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  filters: { display: 'flex', gap: '12px', marginBottom: '20px' },
  searchBox: { flex: 1, maxWidth: '300px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', flex: 1 },
  select: { padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: '#fff', minWidth: '150px' },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px' },
  statCard: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statValue: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  statLabel: { fontSize: '12px', color: '#64748b', margin: 0 },
  tableContainer: { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#475569' },
  userCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px' },
  userName: { fontWeight: '500', color: '#0f172a', margin: 0 },
  userId: { fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' },
  emailCell: { display: 'flex', alignItems: 'center', gap: '6px' },
  roleBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' },
  depotTag: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px', color: '#475569' },
  allDepots: { fontSize: '12px', color: '#64748b' },
  statusBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' },
  actions: { display: 'flex', gap: '8px' },
  actionBtn: { padding: '6px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  accessDenied: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px', textAlign: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '450px', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  modalBody: { padding: '24px' },
  formGroup: { marginBottom: '16px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #e2e8f0' },
  cancelBtn: { padding: '10px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' },
  saveBtn: { padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }
};
