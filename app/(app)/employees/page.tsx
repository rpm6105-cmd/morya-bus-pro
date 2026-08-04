'use client';

import { useState, useEffect } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { Employee, Branch, EmployeeAssignment } from '../../lib/types';
import {
  Search, Filter, Plus, ChevronDown, ChevronUp, Edit2, Trash2, 
  Eye, Download, X, User, Mail, Phone, MapPin, Calendar,
  Briefcase, Building2, CreditCard, FileText, Award, AlertTriangle,
  ArrowLeftRight, History, ShieldCheck, Bus, UserX, UploadCloud, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import { normalizeAadhaar, formatAadhaar, isValidAadhaar } from '../../lib/utils/incentive';
import { parseEmployeeMasterWorkbook, buildEmployeePayload, ImportResult } from '../../lib/import/employeeImport';

export default function EmployeesPage() {
  const { user, isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedBusCategory, setSelectedBusCategory] = useState('');
  const [sortField, setSortField] = useState<keyof Employee>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [assignDepotId, setAssignDepotId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignEndDate, setAssignEndDate] = useState('');
  const [assignReason, setAssignReason] = useState('Employee shortage');
  const itemsPerPage = 20;

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [aadhaarMatches, setAadhaarMatches] = useState<Employee[]>([]);
  const [rejoinChoice, setRejoinChoice] = useState<'REJOIN' | 'NEW' | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importStats, setImportStats] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    aadharNumber: '',
    dateOfBirth: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    department: 'Drivers',
    busCategory: '' as '' | '8 METER' | '12 METER',
    designation: '',
    branchId: '',
    salary: 18000,
    bankAccount: '',
    ifscCode: '',
    panNumber: '',
    joiningDate: new Date().toISOString().split('T')[0],
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    status: 'ACTIVE' as Employee['status'],
    driverNumber: '',
    fatherName: '',
    maritalStatus: 'UNKNOWN' as 'MARRIED' | 'UNMARRIED' | 'UNKNOWN',
    aadhaarName: '',
    basicSalary: 0,
    pfLimit: 0,
    grossSalary: 0,
    prevPfAccount: '',
    prevPension: '',
    prevPfTransfer: '',
    prevEsic: '',
    remarks: ''
  });

  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferToDepotId, setTransferToDepotId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferReason, setTransferReason] = useState('');
  const [stints, setStints] = useState<Employee[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedBranch, user]);

  useEffect(() => {
    filterAndSortEmployees();
  }, [employees, searchTerm, selectedDept, selectedStatus, selectedBusCategory, sortField, sortOrder, currentPage]);

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
        emp.phone.includes(term) ||
        (emp.aadharNumber && normalizeAadhaar(emp.aadharNumber).includes(normalizeAadhaar(searchTerm)))
      );
    }

    if (selectedDept) {
      filtered = filtered.filter(emp => emp.department === selectedDept);
    }

    if (selectedStatus) {
      filtered = filtered.filter(emp => emp.status === selectedStatus);
    }

    if (selectedBusCategory) {
      filtered = filtered.filter(emp => emp.busCategory === selectedBusCategory);
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
    setAssignments(dataService.getAssignments(emp.id));
    setStints(dataService.getEmployeeStints(emp.masterEmployeeId));
    setShowAddAssignment(false);
    setShowTransferForm(false);
    setTransferToDepotId('');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setTransferReason('');
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setAadhaarMatches([]);
    setRejoinChoice(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      aadharNumber: '',
      dateOfBirth: '',
      gender: 'MALE',
      department: 'Drivers',
      busCategory: '',
      designation: '',
      branchId: branches[0]?.id || '',
      salary: 18000,
      bankAccount: '',
      ifscCode: '',
      panNumber: '',
      joiningDate: new Date().toISOString().split('T')[0],
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
      status: 'ACTIVE',
      driverNumber: '',
      fatherName: '',
      maritalStatus: 'UNKNOWN' as 'MARRIED' | 'UNMARRIED' | 'UNKNOWN',
      aadhaarName: '',
      basicSalary: 0,
      pfLimit: 0,
      grossSalary: 0,
      prevPfAccount: '',
      prevPension: '',
      prevPfTransfer: '',
      prevEsic: '',
      remarks: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setAadhaarMatches([]);
    setRejoinChoice(null);
    setForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      aadharNumber: emp.aadharNumber || '',
      dateOfBirth: emp.dateOfBirth,
      gender: emp.gender,
      department: emp.department,
      busCategory: emp.busCategory || '',
      designation: emp.designation,
      branchId: emp.branchId,
      salary: emp.salary,
      bankAccount: emp.bankAccount,
      ifscCode: emp.ifscCode,
      panNumber: emp.panNumber || '',
      joiningDate: emp.joiningDate,
      address: emp.address,
      emergencyContact: emp.emergencyContact,
      emergencyPhone: emp.emergencyPhone,
      status: emp.status,
      driverNumber: emp.driverNumber || '',
      fatherName: emp.fatherName || '',
      maritalStatus: (emp.maritalStatus || 'UNKNOWN') as 'MARRIED' | 'UNMARRIED' | 'UNKNOWN',
      aadhaarName: emp.aadhaarName || '',
      basicSalary: emp.basicSalary || 0,
      pfLimit: emp.pfLimit || 0,
      grossSalary: emp.grossSalary || 0,
      prevPfAccount: emp.prevPfAccount || '',
      prevPension: emp.prevPension || '',
      prevPfTransfer: emp.prevPfTransfer || '',
      prevEsic: emp.prevEsic || '',
      remarks: emp.remarks || ''
    });
    setShowAddModal(true);
  };

  const handleSaveEmployee = () => {
    if (!form.name.trim()) return toast.error('Employee name is required');
    if (!isValidAadhaar(form.aadharNumber)) return toast.error('Aadhaar number is required and must be 12 digits');
    if (!form.branchId) return toast.error('Please select a depot');
    if (!form.salary || form.salary <= 0) return toast.error('Salary must be greater than zero');
    if (!form.joiningDate) return toast.error('Joining date is required');

    const matches = dataService.getEmployeeByAadhaar(form.aadharNumber)
      .filter(e => e.id !== editingEmployee?.id);

    if (matches.length > 0 && !rejoinChoice) {
      setAadhaarMatches(matches);
      setRejoinChoice(null);
      toast.error(`Duplicate entry: Aadhaar already exists for ${matches.length} record(s)`);
      return;
    }

    const subDepotCategory: 'DRIVERS' | 'STAFF' = form.department === 'Drivers' ? 'DRIVERS' : 'STAFF';

    const nextEmployeeId = editingEmployee?.employeeId
      || `MBPL${String(dataService.getEmployees().length + 1001).padStart(5, '0')}`;

    const payload = {
      employeeId: nextEmployeeId,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department: form.department,
      designation: form.designation.trim() || form.department,
      branchId: form.branchId,
      subDepotCategory,
      busCategory: (form.busCategory as '8 METER' | '12 METER') || editingEmployee?.busCategory,
      salary: form.salary,
      pfEnabled: editingEmployee?.pfEnabled ?? true,
      pfRegistrationStatus: editingEmployee?.pfRegistrationStatus ?? 'PENDING' as const,
      pfUanNumber: editingEmployee?.pfUanNumber,
      esicEnabled: editingEmployee?.esicEnabled ?? false,
      esicRegistrationStatus: editingEmployee?.esicRegistrationStatus ?? 'PENDING' as const,
      esicNumber: editingEmployee?.esicNumber,
      bankAccount: form.bankAccount.trim(),
      ifscCode: form.ifscCode.trim(),
      bankName: editingEmployee?.bankName,
      panNumber: form.panNumber.trim() || undefined,
      aadharNumber: formatAadhaar(form.aadharNumber),
      joiningDate: form.joiningDate,
      status: form.status,
      address: form.address.trim(),
      emergencyContact: form.emergencyContact.trim(),
      emergencyPhone: form.emergencyPhone.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      documents: editingEmployee?.documents || {},
      transferHistory: editingEmployee?.transferHistory,
      baseDepotId: editingEmployee?.baseDepotId,
      pfMemberId: editingEmployee?.pfMemberId,
      photoUrl: editingEmployee?.photoUrl,
      city: editingEmployee?.city,
      state: editingEmployee?.state,
      pincode: editingEmployee?.pincode,
      driverNumber: form.driverNumber,
      fatherName: form.fatherName,
      maritalStatus: form.maritalStatus,
      aadhaarName: form.aadhaarName,
      basicSalary: form.basicSalary,
      pfLimit: form.pfLimit,
      grossSalary: form.grossSalary,
      prevPfAccount: form.prevPfAccount,
      prevPension: form.prevPension,
      prevPfTransfer: form.prevPfTransfer,
      prevEsic: form.prevEsic,
      remarks: form.remarks
    };

    if (editingEmployee) {
      const finalPayload = { ...payload, employeeId: editingEmployee.employeeId };
      if (isAdmin) {
        dataService.updateEmployee(editingEmployee.id, finalPayload);
        toast.success('Employee updated successfully');
      } else if (user) {
        const req = dataService.createChangeRequest(editingEmployee, finalPayload, user);
        if (!req) {
          toast.error('No changes detected to submit');
          setShowAddModal(false);
          loadData();
          return;
        }
        toast.success('Changes submitted for Admin approval. Employee will be updated once approved.');
      }
    } else {
      const masterEmployeeId = rejoinChoice === 'REJOIN' && aadhaarMatches.length > 0
        ? aadhaarMatches[0].masterEmployeeId
        : undefined;

      if (isAdmin) {
        const emp = dataService.addEmployee(payload as any, masterEmployeeId);
        if (masterEmployeeId && aadhaarMatches.length > 0) {
          aadhaarMatches.forEach(m => {
            if (m.status === 'ACTIVE') {
              dataService.updateEmployee(m.id, { status: 'INACTIVE' });
            }
          });
          toast.success(`Employee rejoined successfully. Linked to ${aadhaarMatches[0].name}'s record (${aadhaarMatches.length + 1} total stints)`);
        } else {
          toast.success('Employee created successfully');
        }
      } else if (user) {
        dataService.requestEmployeeCreate({ ...payload, masterEmployeeId } as any, user);
        toast.success('New employee submitted for Admin approval. Employee will be created once approved.');
      }
    }

    setShowAddModal(false);
    loadData();
  };

  const handleTransfer = () => {
    if (!selectedEmployee) return;
    if (!transferToDepotId) return toast.error('Please select a destination depot');
    if (transferToDepotId === selectedEmployee.branchId) return toast.error('Employee is already in that depot');
    if (!transferDate) return toast.error('Please select a transfer date');

    if (isAdmin) {
      dataService.transferEmployee(selectedEmployee.id, transferToDepotId, transferReason, transferDate, user?.id);
      const updated = dataService.getEmployeeById(selectedEmployee.id);
      if (updated) {
        setSelectedEmployee(updated);
        setStints(dataService.getEmployeeStints(updated.masterEmployeeId));
      }
      toast.success(`Employee transferred to ${branches.find(b => b.id === transferToDepotId)?.name}`);
    } else if (user) {
      dataService.requestEmployeeTransfer(selectedEmployee, transferToDepotId, transferReason, transferDate, user);
      toast.success('Transfer submitted for Admin approval. Employee will be moved once approved.');
    }
    setShowTransferForm(false);
    setTransferToDepotId('');
    setTransferReason('');
    loadData();
  };

  const handleAddAssignment = () => {
    if (!selectedEmployee) return;
    if (!assignDepotId || !assignStartDate || !assignEndDate) {
      toast.error('Please fill all assignment fields');
      return;
    }
    if (assignStartDate > assignEndDate) {
      toast.error('Start date cannot be after end date');
      return;
    }

    dataService.addAssignment({
      employeeId: selectedEmployee.id,
      depotId: assignDepotId,
      startDate: assignStartDate,
      endDate: assignEndDate,
      reason: assignReason.trim()
    });

    toast.success('Temporary assignment added successfully');
    setAssignments(dataService.getAssignments(selectedEmployee.id));
    setShowAddAssignment(false);
    setAssignDepotId('');
    setAssignStartDate('');
    setAssignEndDate('');
    setAssignReason('Employee shortage');
  };

  const handleDeleteAssignment = (asgId: string) => {
    if (confirm('Are you sure you want to delete this temporary assignment?')) {
      dataService.deleteAssignment(asgId);
      toast.success('Assignment deleted');
      if (selectedEmployee) {
        setAssignments(dataService.getAssignments(selectedEmployee.id));
      }
    }
  };

  const handleTerminateEmployee = (emp: Employee) => {
    if (confirm(`Mark ${emp.name} as TERMINATED?\n\nTheir record will be retained and marked Terminated — data is never deleted.`)) {
      if (isAdmin) {
        dataService.terminateEmployee(emp.id, user?.id);
        toast.success(`${emp.name} marked as Terminated. Data retained.`);
      } else if (user) {
        dataService.requestEmployeeTerminate(emp, user);
        toast.success(`Termination for ${emp.name} submitted for Admin approval.`);
      }
      loadData();
    }
  };

  const handleExportCSV = () => {
    const data = filteredEmployees.map(emp => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Email': emp.email,
      'Phone': emp.phone,
      'Aadhaar': emp.aadharNumber || '',
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

  const handleImportFile = async (file: File) => {
    setImportStatus('parsing');
    setImportError('');
    setImportResult(null);
    setImportStats(null);
    setImportFileName(file.name);
    try {
      const result = await parseEmployeeMasterWorkbook(file);
      setImportResult(result);
      setImportStatus('done');
      if (result.employees.length === 0) {
        setImportError('No employee rows found in the selected workbook.');
      }
    } catch (err) {
      setImportStatus('error');
      setImportError(err instanceof Error ? err.message : 'Failed to parse the workbook. Please ensure it is a valid Excel (.xlsx) file.');
    }
  };

  const handleRunImport = () => {
    if (!importResult || !isAdmin) return;
    const validIssues = new Set(importResult.issues.map(i => i.employeeId));
    const valid = importResult.employees.filter(e => e.employeeId && !validIssues.has(e.employeeId));
    const byCode = new Map(employees.map(e => [e.employeeId, e]));
    let created = 0, updated = 0, skipped = 0;
    const defaultBranchId = branches[0]?.id || '';
    for (const emp of valid) {
      const existing = byCode.get(emp.employeeId);
      if (existing) {
        dataService.updateEmployee(existing.id, buildEmployeePayload(emp, existing.branchId) as any);
        updated++;
      } else {
        dataService.addEmployee(buildEmployeePayload(emp, defaultBranchId) as any);
        created++;
      }
    }
    skipped = importResult.employees.length - valid.length;
    setImportStats({ created, updated, skipped });
    toast.success(`Import complete: ${created} created, ${updated} updated, ${skipped} skipped (validation issues)`);
    loadData();
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
          <button style={styles.addButton} onClick={openAddModal}>
            <Plus size={16} />
            {isAdmin ? 'Add Employee' : 'Request New Employee'}
          </button>
          <button style={styles.exportButton} onClick={handleExportCSV}>
            <Download size={16} />
            Export CSV
          </button>
          <button style={styles.exportButton} onClick={() => setShowImportModal(true)}>
            <UploadCloud size={16} />
            Import Excel
          </button>
        </div>
      </div>

      <div style={styles.filters}>
        <div style={styles.searchContainer}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search by name, ID, email, phone, Aadhaar..."
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
          <option value="TRANSFERRED">Transferred</option>
        </select>

        <select
          value={selectedBusCategory}
          onChange={(e) => setSelectedBusCategory(e.target.value)}
          style={styles.select}
        >
          <option value="">All Bus Categories</option>
          <option value="8 METER">8 Meter Bus</option>
          <option value="12 METER">12 Meter Bus</option>
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
                <button onClick={() => handleSort('busCategory')} style={styles.sortButton}>
                  Bus Category <SortIcon field="busCategory" />
                </button>
              </th>
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
                  {emp.busCategory ? (
                    <span style={{
                      ...styles.statusBadge,
                      background: emp.busCategory === '8 METER' ? '#dbeafe' : '#fef3c7',
                      color: emp.busCategory === '8 METER' ? '#1e40af' : '#92400e'
                    }}>
                      {emp.busCategory === '8 METER' ? '8M Bus' : '12M Bus'}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>-</span>
                  )}
                </td>
                <td style={styles.td}>
                  ₹{emp.salary.toLocaleString()}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusBadge,
                    background: emp.status === 'ACTIVE' ? '#dcfce7' :
                               emp.status === 'TRANSFERRED' ? '#dbeafe' :
                               emp.status === 'INACTIVE' ? '#fef3c7' : '#fee2e2',
                    color: emp.status === 'ACTIVE' ? '#166534' :
                           emp.status === 'TRANSFERRED' ? '#1e40af' :
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
                    <button onClick={() => openEditModal(emp)} style={styles.actionBtn} title={isAdmin ? 'Edit' : 'Request Changes'}>
                      <Edit2 size={16} color="#3b82f6" />
                    </button>
                    <button onClick={() => handleTerminateEmployee(emp)} style={styles.actionBtn} title={isAdmin ? 'Terminate (data retained)' : 'Request Termination (Admin approval)'}>
                      <UserX size={16} color="#ef4444" />
                    </button>
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
                  <ShieldCheck size={18} color="#64748b" />
                  <div>
                    <label>Aadhaar Number</label>
                    <p>{selectedEmployee.aadharNumber ? selectedEmployee.aadharNumber : 'N/A'}</p>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <Calendar size={18} color="#64748b" />
                  <div>
                    <label>Date of Birth</label>
                    <p>{selectedEmployee.dateOfBirth}</p>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <User size={18} color="#64748b" />
                  <div>
                    <label>Gender</label>
                    <p>{selectedEmployee.gender}</p>
                  </div>
                </div>
                <div style={styles.detailRow}>
                  <Briefcase size={18} color="#64748b" />
                  <div>
                    <label>Department / Designation</label>
                    <p>{selectedEmployee.department} · {selectedEmployee.designation}</p>
                  </div>
                </div>
                {selectedEmployee.busCategory && (
                  <div style={styles.detailRow}>
                    <Bus size={18} color="#f59e0b" />
                    <div>
                      <label>Bus Category</label>
                      <p>{selectedEmployee.busCategory === '8 METER' ? '8 Meter Bus' : '12 Meter Bus'}</p>
                    </div>
                  </div>
                )}
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
                  <div><label>Driver No.</label><p>{selectedEmployee.driverNumber || 'N/A'}</p></div>
                  <div><label>Father&apos;s Name</label><p>{selectedEmployee.fatherName || 'N/A'}</p></div>
                  <div><label>Marital Status</label><p>{selectedEmployee.maritalStatus ? selectedEmployee.maritalStatus.charAt(0) + selectedEmployee.maritalStatus.slice(1).toLowerCase() : 'N/A'}</p></div>
                  <div><label>Name on Aadhaar</label><p>{selectedEmployee.aadhaarName || 'N/A'}</p></div>
                  <div><label>Basic Salary</label><p>{selectedEmployee.basicSalary ? `₹${selectedEmployee.basicSalary.toLocaleString()}` : 'N/A'}</p></div>
                  <div><label>Gross Salary</label><p>{selectedEmployee.grossSalary ? `₹${selectedEmployee.grossSalary.toLocaleString()}` : 'N/A'}</p></div>
                  {selectedEmployee.prevPfAccount && <div><label>Prev PF A/c</label><p>{selectedEmployee.prevPfAccount}</p></div>}
                  {selectedEmployee.prevPension && <div><label>Prev Pension</label><p>{selectedEmployee.prevPension}</p></div>}
                  {selectedEmployee.prevPfTransfer && <div><label>Prev PF Transfer</label><p>{selectedEmployee.prevPfTransfer}</p></div>}
                  {selectedEmployee.prevEsic && <div><label>Prev ESIC</label><p>{selectedEmployee.prevEsic}</p></div>}
                </div>
              </div>
              
              <div style={{ ...styles.detailSection, borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={styles.sectionTitle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <History size={14} color="#3b82f6" /> Employment History / Stints
                    </span>
                  </h4>
                </div>
                {stints.length <= 1 ? (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>No previous stints. This is the first record for this person.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '6px 4px' }}>Stint</th>
                          <th style={{ padding: '6px 4px' }}>Employee ID</th>
                          <th style={{ padding: '6px 4px' }}>Depot</th>
                          <th style={{ padding: '6px 4px' }}>Joining</th>
                          <th style={{ padding: '6px 4px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stints.map((stint, idx) => (
                          <tr key={stint.id} style={{ borderBottom: '1px solid #f1f5f9', background: stint.id === selectedEmployee.id ? '#f0fdf4' : undefined }}>
                            <td style={{ padding: '6px 4px', fontWeight: '600', color: stint.id === selectedEmployee.id ? '#166534' : '#475569' }}>
                              {idx + 1}{stint.id === selectedEmployee.id ? ' (current)' : ''}
                            </td>
                            <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{stint.employeeId}</td>
                            <td style={{ padding: '6px 4px' }}>{branches.find(b => b.id === stint.branchId)?.name || stint.branchId}</td>
                            <td style={{ padding: '6px 4px' }}>{stint.joiningDate}</td>
                            <td style={{ padding: '6px 4px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: '600',
                                background: stint.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                                color: stint.status === 'ACTIVE' ? '#166534' : '#64748b'
                              }}>{stint.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ ...styles.detailSection, borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={styles.sectionTitle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ArrowLeftRight size={14} color="#10b981" /> Depot Transfers
                    </span>
                  </h4>
                  <button
                    onClick={() => setShowTransferForm(!showTransferForm)}
                    style={{
                      background: showTransferForm ? '#f1f5f9' : '#10b981',
                      color: showTransferForm ? '#334155' : 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={12} />
                    {showTransferForm ? 'Hide Form' : isAdmin ? 'Transfer to Depot' : 'Request Transfer'}
                  </button>
                </div>

                {showTransferForm && (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Destination Depot</label>
                        <select
                          value={transferToDepotId}
                          onChange={e => setTransferToDepotId(e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                        >
                          <option value="">Select Depot...</option>
                          {branches.filter(b => b.id !== selectedEmployee.branchId).map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Transfer Date</label>
                        <input
                          type="date"
                          value={transferDate}
                          onChange={e => setTransferDate(e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Reason</label>
                      <input
                        type="text"
                        value={transferReason}
                        onChange={e => setTransferReason(e.target.value)}
                        placeholder="e.g. Route reallocation, staff shortage"
                        style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <button
                      onClick={handleTransfer}
                      style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', marginTop: '4px' }}
                    >
                      Confirm Transfer
                    </button>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                      Historical attendance and payroll will remain recorded under {branches.find(b => b.id === selectedEmployee.branchId)?.name || 'the old depot'}.
                    </p>
                  </div>
                )}

                {(selectedEmployee.transferHistory?.length || 0) === 0 ? (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>No inter-depot transfers logged</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '6px 4px' }}>From</th>
                          <th style={{ padding: '6px 4px' }}>To</th>
                          <th style={{ padding: '6px 4px' }}>Date</th>
                          <th style={{ padding: '6px 4px' }}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEmployee.transferHistory!.map((t, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 4px', fontWeight: '500' }}>{branches.find(b => b.id === t.fromDepotId)?.name || t.fromDepotId}</td>
                            <td style={{ padding: '6px 4px', fontWeight: '500', color: '#10b981' }}>{branches.find(b => b.id === t.toDepotId)?.name || t.toDepotId}</td>
                            <td style={{ padding: '6px 4px', color: '#475569' }}>{new Date(t.transferDate).toLocaleDateString('en-IN')}</td>
                            <td style={{ padding: '6px 4px', color: '#64748b' }}>{t.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ ...styles.detailSection, borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={styles.sectionTitle}>Temporary Depot Assignments</h4>
                  <button 
                    onClick={() => {
                      setShowAddAssignment(!showAddAssignment);
                      setAssignDepotId('');
                    }} 
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={12} />
                    {showAddAssignment ? 'Hide Form' : 'Add Assignment'}
                  </button>
                </div>

                {showAddAssignment && (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Temporary Depot</label>
                        <select
                          value={assignDepotId}
                          onChange={e => setAssignDepotId(e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                        >
                          <option value="">Select Depot...</option>
                          {branches.filter(b => b.id !== selectedEmployee.branchId).map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Reason</label>
                        <input
                          type="text"
                          value={assignReason}
                          onChange={e => setAssignReason(e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Start Date</label>
                        <input
                          type="date"
                          value={assignStartDate}
                          onChange={e => setAssignStartDate(e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>End Date</label>
                        <input
                          type="date"
                          value={assignEndDate}
                          onChange={e => setAssignEndDate(e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAddAssignment} 
                      style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', marginTop: '4px' }}
                    >
                      Save Temporary Assignment
                    </button>
                  </div>
                )}

                {assignments.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>No temporary assignments logged</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '6px 4px' }}>Depot</th>
                          <th style={{ padding: '6px 4px' }}>Period</th>
                          <th style={{ padding: '6px 4px' }}>Reason</th>
                          <th style={{ padding: '6px 4px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map(asg => {
                          const depot = branches.find(b => b.id === asg.depotId);
                          return (
                            <tr key={asg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 4px', fontWeight: '500' }}>{depot?.name || 'Unknown'}</td>
                              <td style={{ padding: '6px 4px', color: '#475569' }}>
                                {new Date(asg.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(asg.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </td>
                              <td style={{ padding: '6px 4px', color: '#64748b' }}>{asg.reason}</td>
                              <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                                <button 
                                  onClick={() => handleDeleteAssignment(asg.id)} 
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                  title="Delete Assignment"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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

      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>{editingEmployee ? `Edit Employee — ${editingEmployee.name}` : isAdmin ? 'Add New Employee' : 'Request New Employee'}</h2>
              <button onClick={() => setShowAddModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              {editingEmployee && !isAdmin && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                  You are requesting changes to this employee. Admin approval is required before the changes take effect.
                </div>
              )}
              {!editingEmployee && !isAdmin && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                  This new employee will be submitted to Admin for approval before being created.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Full Name *</label>
                  <input style={styles.fieldInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Employee full name" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Father&apos;s Name</label>
                  <input style={styles.fieldInput} value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })} placeholder="Father / spouse name" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Aadhaar Number * (12 digits)</label>
                  <input
                    style={{ ...styles.fieldInput, ...(form.aadharNumber && !isValidAadhaar(form.aadharNumber) ? { borderColor: '#ef4444' } : {}) }}
                    value={form.aadharNumber}
                    onChange={e => setForm({ ...form, aadharNumber: e.target.value.replace(/[^\d\s]/g, '') })}
                    placeholder="0000 0000 0000"
                    inputMode="numeric"
                  />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Email</label>
                  <input style={styles.fieldInput} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Phone</label>
                  <input style={styles.fieldInput} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" inputMode="numeric" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Date of Birth</label>
                  <input style={styles.fieldInput} type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Gender</label>
                  <select style={styles.fieldInput} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as any })}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Marital Status</label>
                  <select style={styles.fieldInput} value={form.maritalStatus} onChange={e => setForm({ ...form, maritalStatus: e.target.value as any })}>
                    <option value="UNKNOWN">--</option>
                    <option value="MARRIED">Married</option>
                    <option value="UNMARRIED">Unmarried</option>
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Department</label>
                  <select style={styles.fieldInput} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    {['Drivers', 'Office Staff', 'Operations', 'Maintenance', 'Admin', 'Ticketing', 'Security', 'HR', 'Finance', 'Engineering'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Designation</label>
                  <input style={styles.fieldInput} value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder={form.department === 'Drivers' ? 'Driver' : 'Role title'} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Driver No.</label>
                  <input style={styles.fieldInput} value={form.driverNumber} onChange={e => setForm({ ...form, driverNumber: e.target.value })} placeholder="Driver badge number" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Depot *</label>
                  <select style={styles.fieldInput} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>
                    <option value="">Select Depot...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Monthly Salary (₹) *</label>
                  <input style={styles.fieldInput} type="number" value={form.salary} onChange={e => setForm({ ...form, salary: Number(e.target.value) })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Joining Date *</label>
                  <input style={styles.fieldInput} type="date" value={form.joiningDate} onChange={e => setForm({ ...form, joiningDate: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Status</label>
                  <select style={styles.fieldInput} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Employee['status'] })}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Bank Account</label>
                  <input style={styles.fieldInput} value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>IFSC Code</label>
                  <input style={styles.fieldInput} value={form.ifscCode} onChange={e => setForm({ ...form, ifscCode: e.target.value })} placeholder="SBIN0000000" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>PAN Number</label>
                  <input style={styles.fieldInput} value={form.panNumber} onChange={e => setForm({ ...form, panNumber: e.target.value })} placeholder="ABCDE1234F" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Emergency Contact</label>
                  <input style={styles.fieldInput} value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Name" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Emergency Phone</label>
                  <input style={styles.fieldInput} value={form.emergencyPhone} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} inputMode="numeric" />
                </div>
                <div style={{ ...styles.fieldGroup, gridColumn: '1 / -1' }}>
                  <label style={styles.fieldLabel}>Address</label>
                  <input style={styles.fieldInput} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Residential address" />
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>PF &amp; ESIC Master</h4>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Name on Aadhaar</label>
                  <input style={styles.fieldInput} value={form.aadhaarName} onChange={e => setForm({ ...form, aadhaarName: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Basic Salary (₹)</label>
                  <input style={styles.fieldInput} type="number" value={form.basicSalary || ''} onChange={e => setForm({ ...form, basicSalary: Number(e.target.value) })} placeholder="Basic component" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>PF Limit (₹)</label>
                  <input style={styles.fieldInput} type="number" value={form.pfLimit || ''} onChange={e => setForm({ ...form, pfLimit: Number(e.target.value) })} placeholder="15000" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Gross Salary (₹)</label>
                  <input style={styles.fieldInput} type="number" value={form.grossSalary || ''} onChange={e => setForm({ ...form, grossSalary: Number(e.target.value) })} placeholder="Total gross" />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Previous PF A/c No.</label>
                  <input style={styles.fieldInput} value={form.prevPfAccount} onChange={e => setForm({ ...form, prevPfAccount: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Previous Pension</label>
                  <input style={styles.fieldInput} value={form.prevPension} onChange={e => setForm({ ...form, prevPension: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Previous PF Transfer</label>
                  <input style={styles.fieldInput} value={form.prevPfTransfer} onChange={e => setForm({ ...form, prevPfTransfer: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Previous ESIC No.</label>
                  <input style={styles.fieldInput} value={form.prevEsic} onChange={e => setForm({ ...form, prevEsic: e.target.value })} />
                </div>
                <div style={{ ...styles.fieldGroup, gridColumn: '1 / -1' }}>
                  <label style={styles.fieldLabel}>Remarks</label>
                  <input style={styles.fieldInput} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
                </div>
              </div>

              {aadhaarMatches.length > 0 && !rejoinChoice && (
                <div style={{ marginTop: '16px', padding: '14px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <AlertTriangle size={18} color="#d97706" />
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                      Aadhaar already exists in the system
                    </h4>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#78350f' }}>
                    This Aadhaar belongs to:
                  </p>
                  {aadhaarMatches.map(m => (
                    <div key={m.id} style={{ fontSize: '13px', color: '#78350f', padding: '4px 0', borderBottom: '1px solid #fde68a' }}>
                      <strong>{m.name}</strong> — {m.employeeId} · {branches.find(b => b.id === m.branchId)?.name || m.branchId} · <span style={{ textTransform: 'capitalize' }}>{m.status.toLowerCase()}</span>
                    </div>
                  ))}
                  <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#78350f' }}>
                    Is this person rejoining? {editingEmployee ? 'Aadhaar cannot be duplicated across employees.' : 'If they left and are now joining at a different depot, choose "Rejoin" to link this stint to their previous records.'}
                  </p>
                  {!editingEmployee && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={() => setRejoinChoice('REJOIN')}
                        style={{ padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Create as Rejoin (link history)
                      </button>
                      <button
                        onClick={() => setRejoinChoice('NEW')}
                        style={{ padding: '8px 14px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Create as New Employee
                      </button>
                    </div>
                  )}
                  {editingEmployee && (
                    <button
                      onClick={() => setRejoinChoice('NEW')}
                      style={{ marginTop: '12px', padding: '8px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      I confirm this Aadhaar is correct
                    </button>
                  )}
                </div>
              )}

              {rejoinChoice === 'REJOIN' && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={16} />
                    Will be linked as a new stint under {aadhaarMatches[0]?.name}. Any previous active stint will be marked inactive.
                  </p>
                </div>
              )}

              {form.department === 'Drivers' && (
                <>
                  <div style={{ marginTop: '14px' }}>
                    <label style={styles.fieldLabel}>BUS CATEGORY</label>
                    <select style={styles.fieldInput} value={form.busCategory} onChange={e => setForm({ ...form, busCategory: e.target.value as '' | '8 METER' | '12 METER' })}>
                      <option value="">-- Select Bus Category --</option>
                      <option value="8 METER">8 Meter Bus</option>
                      <option value="12 METER">12 Meter Bus</option>
                    </select>
                  </div>
                  <div style={{ marginTop: '14px', padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '12px', color: '#1e40af' }}>
                    Driver incentive will be applied automatically at payroll based on this depot's attendance tiers (24/26 days structure).
                  </div>
                </>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowAddModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleSaveEmployee} style={styles.generateBtn}>
                <Plus size={16} />
                {editingEmployee ? (isAdmin ? 'Save Changes' : 'Submit Changes for Approval') : isAdmin ? 'Save Employee' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Import Employee Master (Excel)</h2>
              <button onClick={() => setShowImportModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              {!isAdmin && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                  Only Admin can import employees. Please contact your Admin.
                </div>
              )}

              {importStatus === 'idle' && (
                <div>
                  <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px' }}>
                    Upload the <strong>Morya Employee details for PF &amp; ESIC</strong> workbook. All three sheets (MTPL 9MTR, KM 12MTR, Staff List Dharavi) are parsed, validated, and rows with valid codes are imported or updated.
                  </p>
                  <label
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                      padding: '32px 16px', border: '2px dashed #cbd5e1', borderRadius: '10px',
                      cursor: 'pointer', background: '#f8fafc'
                    }}
                  >
                    <FileSpreadsheet size={36} color="#3b82f6" />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Click to select the .xlsx file</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Morya Employee details for PF &amp; ESIC - Dharavi Depot.xlsx</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImportFile(f);
                      }}
                    />
                  </label>
                </div>
              )}

              {importStatus === 'parsing' && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: '13px' }}>
                  Parsing <strong>{importFileName}</strong> ...
                </div>
              )}

              {importStatus === 'error' && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#b91c1c' }}>
                  {importError}
                </div>
              )}

              {importStatus === 'done' && importResult && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    {importResult.summary.map(s => (
                      <div key={s.sheet} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>{s.sheet}</div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{s.total}</div>
                        <div style={{ fontSize: '11px', color: s.withIssues ? '#b91c1c' : '#16a34a' }}>
                          {s.ok} valid{s.withIssues ? `, ${s.withIssues} issues` : ''}
                        </div>
                      </div>
                    ))}
                  </div>

                  {importStats ? (
                    <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '8px', fontSize: '13px', color: '#065f46', marginBottom: '16px' }}>
                      Import complete: <strong>{importStats.created}</strong> created, <strong>{importStats.updated}</strong> updated, <strong>{importStats.skipped}</strong> skipped.
                    </div>
                  ) : (
                    <div style={{ marginBottom: '16px' }}>
                      <button onClick={handleRunImport} style={styles.generateBtn}>
                        <UploadCloud size={16} />
                        Import {importResult.employees.length - importResult.issues.length} employees
                      </button>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '8px 0 0' }}>
                        Existing codes are updated; new codes are created. Rows flagged below are skipped.
                      </p>
                    </div>
                  )}

                  {importResult.issues.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '600', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} /> {importResult.issues.length} rows need manual review
                      </h4>
                      <div style={{ maxHeight: '220px', overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#64748b' }}>
                              <th style={{ padding: '8px' }}>Sheet</th>
                              <th style={{ padding: '8px' }}>Row</th>
                              <th style={{ padding: '8px' }}>Employee</th>
                              <th style={{ padding: '8px' }}>Issues</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.issues.map((iss, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '6px 8px' }}>{iss.sheet}</td>
                                <td style={{ padding: '6px 8px' }}>{iss.rowNumber}</td>
                                <td style={{ padding: '6px 8px' }}><strong>{iss.name}</strong><br /><span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{iss.employeeId || '(no code)'}</span></td>
                                <td style={{ padding: '6px 8px', color: '#b91c1c' }}>{iss.issues.map(x => x.message).join('; ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {importResult.duplicateIds.length > 0 && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                      <strong>Duplicate codes detected:</strong>{' '}
                      {importResult.duplicateIds.map(d => `${d.employeeId} (${d.sheets.length}×)`).join(', ')}.
                      Only the first occurrence will be applied.
                    </div>
                  )}
                </div>
              )}

              <div style={styles.modalFooter}>
                <button onClick={() => setShowImportModal(false)} style={styles.cancelBtn}>
                  Close
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
  addButton: {
    padding: '10px 16px',
    background: '#10b981',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569'
  },
  fieldInput: {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none'
  },
  cancelBtn: {
    padding: '10px 16px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    cursor: 'pointer'
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
    overflow: 'auto'
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
