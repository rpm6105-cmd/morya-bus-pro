'use client';

import { useState, useEffect } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { Employee, Branch } from '../../lib/types';
import {
  Search, Filter, Plus, ChevronDown, ChevronUp, Edit2, Trash2, 
  Eye, Download, X, User, Mail, Phone, MapPin, Calendar,
  Briefcase, Building2, CreditCard, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';

export default function EmployeesPage() {
  const { user, isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortField, setSortField] = useState<keyof Employee>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const itemsPerPage = 20;

  useEffect(() => {
    loadData();
  }, [selectedBranch, user]);

  useEffect(() => {
    filterAndSortEmployees();
  }, [employees, searchTerm, selectedDept, selectedStatus, sortField, sortOrder, currentPage]);

  const loadData = () => {
    const branchList = dataService.getBranches();
    setBranches(branchList);

    const depotId = isAdmin ? selectedBranch : user?.depotId;
    const empList = dataService.getEmployees(depotId);
    setEmployees(empList);
  };

  const filterAndSortEmployees = () => {
    let filtered = [...employees];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(term) ||
        emp.employeeId.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term) ||
        emp.phone.includes(term)
      );
    }

    if (selectedDept) {
      filtered = filtered.filter(emp => emp.department === selectedDept);
    }

    if (selectedStatus) {
      filtered = filtered.filter(emp => emp.status === selectedStatus);
    }

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredEmployees(filtered);
  };

  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const departments = [...new Set(employees.map(e => e.department))];

  const handleViewEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowDetailModal(true);
  };

  const handleDeleteEmployee = (emp: Employee) => {
    if (confirm(`Are you sure you want to delete ${emp.name}?`)) {
      dataService.deleteEmployee(emp.id);
      toast.success('Employee deleted successfully');
      loadData();
    }
  };

  const handleExportCSV = () => {
    const data = filteredEmployees.map(emp => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Email': emp.email,
      'Phone': emp.phone,
      'Department': emp.department,
      'Designation': emp.designation,
      'Branch': branches.find(b => b.id === emp.branchId)?.name || '',
      'Salary': emp.salary,
      'Joining Date': emp.joiningDate,
      'Status': emp.status
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const generateOfferLetter = (emp: Employee) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('MORYA BUS SERVICES', 105, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.text('HR & Payroll Management System', 105, 40, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Offer Letter', 105, 60, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 20, 80);
    doc.text(`To: ${emp.name}`, 20, 95);
    doc.text(`${emp.address}`, 20, 102);
    
    doc.text(`Dear ${emp.name},`, 20, 120);
    
    const offerText = `We are pleased to offer you the position of ${emp.designation} in our ${emp.department} department. Your appointment will be at our ${branches.find(b => b.id === emp.branchId)?.name || 'company'} depot.`;
    const lines = doc.splitTextToSize(offerText, 170);
    doc.text(lines, 20, 135);
    
    doc.text(`Compensation: INR ${emp.salary.toLocaleString()} per month`, 20, 165);
    doc.text(`Joining Date: ${emp.joiningDate}`, 20, 175);
    
    doc.text('Congratulations and welcome aboard!', 20, 200);
    doc.text('For Morya Bus Services', 20, 240);
    doc.text('HR Department', 20, 248);
    
    doc.save(`OfferLetter_${emp.employeeId}.pdf`);
    toast.success('Offer letter generated');
  };

  const SortIcon = ({ field }: { field: keyof Employee }) => {
    if (sortField !== field) return <ChevronDown size={14} color="#94a3b8" />;
    return sortOrder === 'asc' ? <ChevronUp size={14} color="#10b981" /> : <ChevronDown size={14} color="#10b981" />;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Employees</h1>
          <p style={styles.subtitle}>{filteredEmployees.length} employees found</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.exportButton} onClick={handleExportCSV}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div style={styles.filters}>
        <div style={styles.searchContainer}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search by name, ID, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          style={styles.select}
          disabled={!isAdmin}
        >
          <option value="">All Depots</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          style={styles.select}
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={styles.select}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>
                <button onClick={() => handleSort('employeeId')} style={styles.sortButton}>
                  Employee ID <SortIcon field="employeeId" />
                </button>
              </th>
              <th style={styles.th}>
                <button onClick={() => handleSort('name')} style={styles.sortButton}>
                  Name <SortIcon field="name" />
                </button>
              </th>
              <th style={styles.th}>
                <button onClick={() => handleSort('department')} style={styles.sortButton}>
                  Department <SortIcon field="department" />
                </button>
              </th>
              <th style={styles.th}>
                <button onClick={() => handleSort('designation')} style={styles.sortButton}>
                  Designation <SortIcon field="designation" />
                </button>
              </th>
              <th style={styles.th}>Branch</th>
              <th style={styles.th}>
                <button onClick={() => handleSort('salary')} style={styles.sortButton}>
                  Salary <SortIcon field="salary" />
                </button>
              </th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map((emp) => (
              <tr key={emp.id} style={styles.tr}>
                <td style={styles.td}>
                  <span style={styles.employeeId}>{emp.employeeId}</span>
                </td>
                <td style={styles.td}>
                  <div style={styles.employeeCell}>
                    <div style={styles.avatar}>
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <p style={styles.employeeName}>{emp.name}</p>
                      <p style={styles.employeeEmail}>{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td style={styles.td}>{emp.department}</td>
                <td style={styles.td}>{emp.designation}</td>
                <td style={styles.td}>
                  {branches.find(b => b.id === emp.branchId)?.code || '-'}
                </td>
                <td style={styles.td}>
                  ₹{emp.salary.toLocaleString()}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusBadge,
                    background: emp.status === 'ACTIVE' ? '#dcfce7' :
                               emp.status === 'INACTIVE' ? '#fef3c7' : '#fee2e2',
                    color: emp.status === 'ACTIVE' ? '#166534' :
                           emp.status === 'INACTIVE' ? '#92400e' : '#991b1b'
                  }}>
                    {emp.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button onClick={() => handleViewEmployee(emp)} style={styles.actionBtn} title="View">
                      <Eye size={16} color="#64748b" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDeleteEmployee(emp)} style={styles.actionBtn} title="Delete">
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                    )}
                    <button onClick={() => generateOfferLetter(emp)} style={styles.actionBtn} title="Offer Letter">
                      <FileText size={16} color="#10b981" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.pagination}>
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={styles.pageBtn}
        >
          Previous
        </button>
        <span style={styles.pageInfo}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={styles.pageBtn}
        >
          Next
        </button>
      </div>

      {showDetailModal && selectedEmployee && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Employee Details</h2>
              <button onClick={() => setShowDetailModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.detailSection}>
                <div style={styles.detailRow}>
                  <User size={18} color="#64748b" />
                  <div>
                    <label>Full Name</label>
                    <p>{selectedEmployee.name}</p>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <Briefcase size={18} color="#64748b" />
                  <div>
                    <label>Employee ID</label>
                    <p>{selectedEmployee.employeeId}</p>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <Mail size={18} color="#64748b" />
                  <div>
                    <label>Email</label>
                    <p>{selectedEmployee.email}</p>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <Phone size={18} color="#64748b" />
                  <div>
                    <label>Phone</label>
                    <p>{selectedEmployee.phone}</p>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <Building2 size={18} color="#64748b" />
                  <div>
                    <label>Branch</label>
                    <p>{branches.find(b => b.id === selectedEmployee.branchId)?.name}</p>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <Calendar size={18} color="#64748b" />
                  <div>
                    <label>Joining Date</label>
                    <p>{selectedEmployee.joiningDate}</p>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <CreditCard size={18} color="#64748b" />
                  <div>
                    <label>Salary</label>
                    <p>₹{selectedEmployee.salary.toLocaleString()}/month</p>
                  </div>
                </div>
              </div>
              <div style={styles.detailSection}>
                <h4 style={styles.sectionTitle}>Bank & Compliance Details</h4>
                <div style={styles.bankGrid}>
                  <div><label>Bank A/C</label><p>{selectedEmployee.bankAccount}</p></div>
                  <div><label>IFSC</label><p>{selectedEmployee.ifscCode}</p></div>
                  <div><label>PAN</label><p>{selectedEmployee.panNumber || 'N/A'}</p></div>
                  <div><label>UAN</label><p>{selectedEmployee.pfUanNumber || 'N/A'}</p></div>
                  <div><label>ESIC</label><p>{selectedEmployee.esicNumber || 'N/A'}</p></div>
                  <div><label>PF Enabled</label><p>{selectedEmployee.pfEnabled ? 'Yes' : 'No'}</p></div>
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => generateOfferLetter(selectedEmployee)} style={styles.generateBtn}>
                <FileText size={16} />
                Generate Offer Letter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 4px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  exportButton: {
    padding: '10px 16px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  searchContainer: {
    flex: 1,
    minWidth: '250px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 40px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  },
  select: {
    padding: '10px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
    minWidth: '150px'
  },
  tableContainer: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  sortButton: {
    background: 'none',
    border: 'none',
    font: 'inherit',
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.2s'
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#475569'
  },
  employeeId: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#64748b'
  },
  employeeCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #10b981, #3b82f6)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px'
  },
  employeeName: {
    fontWeight: '500',
    color: '#0f172a',
    margin: '0 0 2px'
  },
  employeeEmail: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  actionBtn: {
    padding: '6px',
    background: 'none',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '20px'
  },
  pageBtn: {
    padding: '8px 16px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  pageInfo: {
    fontSize: '14px',
    color: '#64748b'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px'
  },
  modalBody: {
    padding: '24px'
  },
  detailSection: {
    marginBottom: '24px'
  },
  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 12px'
  },
  bankGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  generateBtn: {
    padding: '10px 16px',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};
