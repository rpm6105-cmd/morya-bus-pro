'use client';

import { 
  Employee, Branch, Attendance, PayrollEntry, LeaveRequest, AuditLog, SystemSettings,
  AttendanceRecord, SubDepot, OvertimeEntry, EmployeeDocuments, EmployeeAssignment,
  IncentiveTier, User, EmployeeChangeRequest, AppNotification, NotificationType,
  ChangeRequestAction, SalaryMaster, BankMaster, Designation, PayrollDeductionOverride, AttendanceStatus
} from '../types';
import { normalizeAadhaar } from '../utils/incentive';
import { calculatePayroll as payrollCalc } from '../utils/payrollCalc';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const BRANCHES_KEY = 'hrms_branches';
const EMPLOYEES_KEY = 'hrms_employees';
const ATTENDANCE_KEY = 'hrms_attendance';
const PAYROLL_KEY = 'hrms_payroll';
const LEAVES_KEY = 'hrms_leaves';
const AUDIT_KEY = 'hrms_audit';
const SETTINGS_KEY = 'hrms_settings';
const OVERTIME_KEY = 'hrms_overtime';
const SUB_DEPOTS_KEY = 'hrms_subdepots';
const ASSIGNMENTS_KEY = 'hrms_assignments';
const USERS_KEY = 'hrms_users';
const CHANGE_REQUESTS_KEY = 'hrms_change_requests';
const NOTIFICATIONS_KEY = 'hrms_notifications';
const SALARY_MASTERS_KEY = 'hrms_salary_masters';
const BANK_MASTERS_KEY = 'hrms_bank_masters';
const DESIGNATIONS_KEY = 'hrms_designations';

const DEFAULT_SETTINGS: SystemSettings = {
  pfRate: 12,
  esicRate: 0.75,
  tdsThreshold: 300000,
  tdsRate: 5,
  maxLopDays: 0,
  processingMonth: 'Jan',
  processingYear: 2026,
  overtimeSettings: {
    hourlyRate: 50,
    fullDayRate: 300,
    maxHourlyOvertime: 4,
    maxFullDayOvertime: 10
  },
  driverMonthlyIncentive: 2000,
  attendanceCycle: 'CALENDAR'
};

class DataService {
  private isInitialized = false;
  private supabaseStarted = false;
  private branches: Branch[] = [];
  private employees: Employee[] = [];
  private attendance: Attendance = {};
  private payroll: PayrollEntry[] = [];
  private leaves: LeaveRequest[] = [];
  private auditLogs: AuditLog[] = [];
  private overtimeEntries: OvertimeEntry[] = [];
  private subDepots: SubDepot[] = [];
  private assignments: EmployeeAssignment[] = [];
  private users: User[] = [];
  private changeRequests: EmployeeChangeRequest[] = [];
  private notifications: AppNotification[] = [];
  private salaryMasters: SalaryMaster[] = [];
  private bankMasters: BankMaster[] = [];
  private designations: Designation[] = [];
  private settings: SystemSettings = { ...DEFAULT_SETTINGS };

  async initialize(): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      this.loadFromLocalCache();
      this.isInitialized = true;
      return true;
    }
    if (this.supabaseStarted) return true;
    this.supabaseStarted = true;
    try {
      await this.loadAllFromSupabase();
      this.isInitialized = true;
      return true;
    } catch (e) {
      console.error('Supabase initialization failed, using local cache', e);
      this.loadFromLocalCache();
      this.isInitialized = true;
      return false;
    }
  }

  private ensureData() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') return;
    this.loadFromLocalCache();
    this.isInitialized = true;
    if (isSupabaseConfigured() && !this.supabaseStarted) {
      this.supabaseStarted = true;
      this.initialize();
    }
  }

  private loadFromLocalCache() {
    if (typeof window === 'undefined') return;
    try {
      const branches = localStorage.getItem(BRANCHES_KEY);
      const employees = localStorage.getItem(EMPLOYEES_KEY);
      const attendance = localStorage.getItem(ATTENDANCE_KEY);
      const payroll = localStorage.getItem(PAYROLL_KEY);
      const leaves = localStorage.getItem(LEAVES_KEY);
      const audit = localStorage.getItem(AUDIT_KEY);
      const settings = localStorage.getItem(SETTINGS_KEY);
      const overtime = localStorage.getItem(OVERTIME_KEY);
      const subDepots = localStorage.getItem(SUB_DEPOTS_KEY);
      const assignments = localStorage.getItem(ASSIGNMENTS_KEY);
      const users = localStorage.getItem(USERS_KEY);
      const changeRequests = localStorage.getItem(CHANGE_REQUESTS_KEY);
      const notifications = localStorage.getItem(NOTIFICATIONS_KEY);
      const salaryMasters = localStorage.getItem(SALARY_MASTERS_KEY);
      const bankMasters = localStorage.getItem(BANK_MASTERS_KEY);
      const designations = localStorage.getItem(DESIGNATIONS_KEY);

      this.branches = branches ? JSON.parse(branches) : this.generateBranches();
      this.employees = employees ? JSON.parse(employees) : this.generateEmployees();
      this.attendance = attendance ? JSON.parse(attendance) : {};
      this.payroll = payroll ? JSON.parse(payroll) : [];
      this.leaves = leaves ? JSON.parse(leaves) : [];
      this.auditLogs = audit ? JSON.parse(audit) : [];
      this.overtimeEntries = overtime ? JSON.parse(overtime) : [];
      this.subDepots = subDepots ? JSON.parse(subDepots) : this.generateSubDepots();
      this.assignments = assignments ? JSON.parse(assignments) : [];
      this.users = users ? JSON.parse(users) : this.generateDefaultUsers();
      this.changeRequests = changeRequests ? JSON.parse(changeRequests) : [];
      this.notifications = notifications ? JSON.parse(notifications) : [];
      this.salaryMasters = salaryMasters ? JSON.parse(salaryMasters) : [];
      this.bankMasters = bankMasters ? JSON.parse(bankMasters) : [];
      this.designations = designations ? JSON.parse(designations) : [];
      this.settings = settings ? { ...DEFAULT_SETTINGS, ...JSON.parse(settings) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.error('Failed to load local cache', e);
    }
  }

  private async loadAllFromSupabase() {
    const tableNames = ['branches', 'employees', 'attendance', 'payroll', 'leaves', 'overtime', 'subdepots', 'assignments', 'audit_logs', 'hrms_users', 'employee_change_requests', 'notifications', 'salary_masters', 'bank_master', 'designations'];
    const results = await Promise.all(
      tableNames.map(t => supabase.from(t).select('*').limit(100000))
    );

    const data: Record<string, any[]> = {};
    tableNames.forEach((t, i) => {
      if (results[i].error) throw results[i].error;
      data[t] = results[i].data || [];
    });

    this.branches = data.branches;
    this.employees = data.employees;
    this.payroll = data.payroll;
    this.leaves = data.leaves;
    this.auditLogs = data.audit_logs;
    this.overtimeEntries = data.overtime;
    this.subDepots = data.subdepots;
    this.assignments = data.assignments;
    this.users = data.hrms_users;
    this.changeRequests = data.employee_change_requests || [];
    this.notifications = data.notifications || [];
    this.salaryMasters = data.salary_masters || [];
    this.bankMasters = data.bank_master || [];
    this.designations = data.designations || [];

    const attendanceMap: Attendance = {};
    data.attendance.forEach((row: any) => {
      if (!attendanceMap[row.employeeId]) attendanceMap[row.employeeId] = {};
      const { employeeId, date, ...rest } = row;
      attendanceMap[employeeId][date] = { employeeId, date, ...rest } as AttendanceRecord;
    });
    this.attendance = attendanceMap;

    const settingsRows = data.system_settings || [];
    const appSettings = (await this.fetchSettings()) || null;
    this.settings = appSettings ? { ...DEFAULT_SETTINGS, ...appSettings } : { ...DEFAULT_SETTINGS };

    let seeded = false;
    if (this.branches.length === 0) { this.branches = this.generateBranches(); seeded = true; }
    if (this.employees.length === 0) { this.employees = this.generateEmployees(); seeded = true; }
    if (this.subDepots.length === 0) { this.subDepots = this.generateSubDepots(); seeded = true; }
    if (this.users.length === 0) { this.users = this.generateDefaultUsers(); seeded = true; }

    if (seeded) {
      await Promise.all([
        this.persistRows('branches', this.branches, ['id']),
        this.persistRows('employees', this.employees, ['id']),
        this.persistRows('subdepots', this.subDepots, ['id']),
        this.persistRows('hrms_users', this.users, ['id'])
      ]);
    }

    this.cache();
  }

  private async fetchSettings(): Promise<Partial<SystemSettings> | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.from('system_settings').select('*').eq('key', 'app').limit(1);
    if (error) throw error;
    return data?.[0]?.value || null;
  }

  private cache() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(BRANCHES_KEY, JSON.stringify(this.branches));
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(this.employees));
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(this.attendance));
      localStorage.setItem(PAYROLL_KEY, JSON.stringify(this.payroll));
      localStorage.setItem(LEAVES_KEY, JSON.stringify(this.leaves));
      localStorage.setItem(AUDIT_KEY, JSON.stringify(this.auditLogs));
      localStorage.setItem(OVERTIME_KEY, JSON.stringify(this.overtimeEntries));
      localStorage.setItem(SUB_DEPOTS_KEY, JSON.stringify(this.subDepots));
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(this.assignments));
      localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
      localStorage.setItem(CHANGE_REQUESTS_KEY, JSON.stringify(this.changeRequests));
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(this.notifications));
      localStorage.setItem(SALARY_MASTERS_KEY, JSON.stringify(this.salaryMasters));
      localStorage.setItem(BANK_MASTERS_KEY, JSON.stringify(this.bankMasters));
      localStorage.setItem(DESIGNATIONS_KEY, JSON.stringify(this.designations));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to write local cache', e);
    }
  }

  private async persistRows(table: string, rows: any[], conflictColumns?: string[]) {
    if (!isSupabaseConfigured() || rows.length === 0) return;
    try {
      const onConflict = conflictColumns && conflictColumns.length > 0 ? conflictColumns.join(',') : 'id';
      const { error } = await supabase.from(table).upsert(rows, { onConflict });
      if (error) throw error;
    } catch (e) {
      console.error(`Supabase upsert ${table} failed`, e);
    }
  }

  private async persistChangeRequest(req: EmployeeChangeRequest) {
    if (!isSupabaseConfigured()) return;
    try {
      const { error } = await supabase.from('employee_change_requests').upsert([req], { onConflict: 'id' });
      if (error) throw error;
    } catch (e: any) {
      if (e && e.code === 'PGRST204' && typeof e.message === 'string' && e.message.includes("'action'")) {
        const { action, ...withoutAction } = req;
        const { error: retryError } = await supabase.from('employee_change_requests').upsert([withoutAction as any], { onConflict: 'id' });
        if (retryError) console.error('Supabase upsert employee_change_requests (retry) failed', retryError);
        return;
      }
      console.error('Supabase upsert employee_change_requests failed', e);
    }
  }

  private async deleteRows(table: string, column: string, values: any[]) {
    if (!isSupabaseConfigured() || values.length === 0) return;
    try {
      const { error } = await supabase.from(table).delete().in(column, values);
      if (error) throw error;
    } catch (e) {
      console.error(`Supabase delete ${table} failed`, e);
    }
  }

  private async clearTable(table: string) {
    if (!isSupabaseConfigured()) return;
    try {
      const filterCol = table === 'attendance' ? 'employeeId' : 'id';
      const { error } = await supabase.from(table).delete().not(filterCol, 'is', null);
      if (error) throw error;
    } catch (e) {
      console.error(`Supabase clear ${table} failed`, e);
    }
  }

  private generateDefaultUsers(): User[] {
    const users: User[] = [
      {
        id: 'admin-001',
        email: 'admin@moryabuses.com',
        password: 'admin123',
        name: 'System Administrator',
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
        isActive: true
      }
    ];
    users.push({
      id: 'hr-001',
      email: 'hr.d001@moryabuses.com',
      password: 'hr001',
      name: 'HR Manager - Dharavi Depo',
      role: 'HR',
      depotId: 'depot-001',
      createdAt: new Date().toISOString(),
      isActive: true
    });
    return users;
  }

  private generateBranches(): Branch[] {
    return [{
      id: 'depot-001',
      name: 'Dharavi Depo',
      code: 'D01',
      manager: 'Manager 1',
      managerPhone: '9876543210',
      address: 'Dharavi Depot Area, Sion - Dharavi Link Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400017',
      incentiveType: 'FIXED' as const,
      incentiveValue: 2000,
      driverMonthlyIncentive: 2000,
      incentiveTiers: [
        { id: 'tier-1', minDays: 24, maxDays: 25, amount: 2000 },
        { id: 'tier-2', minDays: 26, maxDays: 30, amount: 3000 }
      ],
      hourlyOvertimeRate: 50,
      fullDayOvertimeRate: 300,
      isActive: true,
      subDepots: [],
      createdAt: new Date().toISOString()
    }];
  }

  private generateSubDepots(): SubDepot[] {
    const subDepots: SubDepot[] = [];
    this.branches.forEach((branch, i) => {
      subDepots.push({
        id: `${branch.id}-staff`,
        depotId: branch.id,
        name: 'Office Staff',
        code: `${branch.code}-S`,
        category: 'STAFF',
        isActive: true,
        createdAt: new Date().toISOString()
      });
      subDepots.push({
        id: `${branch.id}-drivers`,
        depotId: branch.id,
        name: 'Drivers',
        code: `${branch.code}-D`,
        category: 'DRIVERS',
        isActive: true,
        createdAt: new Date().toISOString()
      });
    });
    return subDepots;
  }

  private generateEmployees(): Employee[] {
    const firstNames = ['Rajesh', 'Priya', 'Amit', 'Sunita', 'Vikram', 'Anita', 'Suresh', 'Meena', 'Ravi', 'Kavita', 
      'Deepak', 'Lakshmi', 'Sanjay', 'Geeta', 'Naresh', 'Rekha', 'Mohan', 'Asha', 'Ramesh', 'Kiran',
      'Ajay', 'Neha', 'Vijay', 'Pooja', 'Manisha', 'Rohit', 'Swati', 'Pawan', 'Sweta', 'Rahul',
      'Arun', 'Ritu', 'Vikash', 'Nisha', 'Sandeep', 'Anjali', 'Gaurav', 'Shweta', 'Harsh', 'Vicky',
      'Sneha', 'Akash', 'Priyanka', 'Vishal', 'Nikita', 'Rohan', 'Komal', 'Yash', 'Richa', 'Siddharth'];
    const lastNames = ['Sharma', 'Patel', 'Singh', 'Gupta', 'Kumar', 'Verma', 'Yadav', 'Reddy', 'Naik', 'Deshmukh',
      'Jadhav', 'Pawar', 'More', 'Kamble', 'Mane', 'Sawant', 'Chavan', 'Rao', 'Iyer', 'Menon',
      'Nair', 'Krishnan', 'Joshi', 'Kulkarni', 'Bhat', 'Kamath', 'Shetty', 'Pai', 'Maurya', 'Dubey',
      'Tiwari', 'Pandey', 'Mishra', 'Choudhary', 'Khatri', 'Mehta', 'Shah', 'Patil', 'Biradar', 'Hiremath'];
    const departments = ['Office Staff', 'Drivers', 'Operations', 'Maintenance', 'Admin', 'Ticketing', 'Security', 'HR', 'Finance', 'Engineering'];
    const designations = ['Senior Manager', 'Manager', 'Supervisor', 'Senior', 'Junior', 'Trainee', 'Head', 'Lead', 'Executive', 'Officer'];
    const cities = ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Thane', 'Panvel', 'Ahmednagar'];

    const employees: Employee[] = [];

    for (let i = 0; i < 40; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const isDriver = Math.random() < 0.5;
      const nonDriverDepts = departments.filter(d => d !== 'Drivers');
      const dept = isDriver ? 'Drivers' : nonDriverDepts[Math.floor(Math.random() * nonDriverDepts.length)];
      const desig = isDriver ? 'Bus Driver' : designations[Math.floor(Math.random() * designations.length)];
      const baseSalary = dept === 'Drivers' ? 18000 + Math.random() * 8000 : 
                        dept === 'Operations' ? 20000 + Math.random() * 15000 :
                        15000 + Math.random() * 25000;
      
      const subDepotCategory = isDriver ? 'DRIVERS' : 'STAFF';
      const busCategory = isDriver ? (Math.random() > 0.5 ? '9 METER' : '12 METER') : undefined;

      const joiningYear = 2015 + Math.floor(Math.random() * 10);
      const joiningMonth = Math.floor(Math.random() * 12);
      const joiningDay = 1 + Math.floor(Math.random() * 28);

      const dobYear = 1970 + Math.floor(Math.random() * 30);
      const dobMonth = 1 + Math.floor(Math.random() * 12);
      const dobDay = 1 + Math.floor(Math.random() * 28);

      employees.push({
        id: `emp-${String(i + 1).padStart(4, '0')}`,
        employeeId: `MBPL${String(1000 + i).padStart(5, '0')}`,
        masterEmployeeId: `MBPL${String(1000 + i).padStart(5, '0')}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@moryabuses.com`,
        phone: `98765${String(43210 + i).slice(-5)}`,
        department: dept,
        designation: desig,
        branchId: 'depot-001',
        subDepotCategory,
        busCategory,
        salary: Math.round(baseSalary),
        pfEnabled: Math.random() > 0.3,
        pfRegistrationStatus: Math.random() > 0.5 ? 'COMPLETED' : 'PENDING',
        pfUanNumber: Math.random() > 0.3 ? `12${String(Math.floor(Math.random() * 999999999)).padStart(9, '0')}` : undefined,
        esicEnabled: Math.random() > 0.5,
        esicRegistrationStatus: Math.random() > 0.5 ? 'COMPLETED' : 'PENDING',
        esicNumber: Math.random() > 0.5 ? `${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}/1` : undefined,
        bankAccount: `MORYA${String(Math.floor(Math.random() * 99999999999)).padStart(11, '0')}`,
        ifscCode: 'SBIN0XXXXXX',
        panNumber: Math.random() > 0.2 ? `${['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'][Math.floor(Math.random() * 10)]}${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}${['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'][Math.floor(Math.random() * 10)]}` : undefined,
        aadharNumber: Math.random() > 0.1 ? `${String(Math.floor(Math.random() * 9999)).padStart(4, '0')} ${String(Math.floor(Math.random() * 9999)).padStart(4, '0')} ${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}` : undefined,
        joiningDate: `${joiningYear}-${String(joiningMonth).padStart(2, '0')}-${String(joiningDay).padStart(2, '0')}`,
        status: Math.random() > 0.1 ? 'ACTIVE' : Math.random() > 0.5 ? 'INACTIVE' : 'TERMINATED',
        address: `${Math.floor(Math.random() * 999) + 1}, Main Road, ${cities[Math.floor(Math.random() * cities.length)]}`,
        emergencyContact: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastName}`,
        emergencyPhone: `98765${String(54321 + i).slice(-5)}`,
        dateOfBirth: `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`,
        gender: Math.random() > 0.4 ? 'MALE' : Math.random() > 0.5 ? 'FEMALE' : 'OTHER',
        documents: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return employees;
  }

  logAudit(userId: string, action: string, module: string, recordId?: string, oldValue?: any, newValue?: any) {
    this.ensureData();
    const entry: AuditLog = {
      id: `audit-${Date.now()}`,
      userId,
      action,
      module,
      recordId,
      oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
      newValue: newValue ? JSON.stringify(newValue) : undefined,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.push(entry);
    this.cache();
    if (isSupabaseConfigured()) {
      supabase.from('audit_logs').insert(entry).then(r => { if (r.error) console.error('audit insert failed', r.error); });
    }
  }

  getBranches(): Branch[] {
    this.ensureData();
    return this.branches;
  }

  getBranchById(id: string): Branch | undefined {
    this.ensureData();
    return this.branches.find(b => b.id === id);
  }

  addBranch(branch: Omit<Branch, 'id' | 'subDepots' | 'createdAt'>): Branch {
    this.ensureData();
    const newBranch: Branch = {
      ...branch,
      id: `depot-${String(this.branches.length + 1).padStart(3, '0')}`,
      subDepots: [],
      createdAt: new Date().toISOString()
    };
    this.branches.push(newBranch);
    
    this.subDepots.push({
      id: `${newBranch.id}-staff`,
      depotId: newBranch.id,
      name: 'Office Staff',
      code: `${newBranch.code}-S`,
      category: 'STAFF',
      isActive: true,
      createdAt: new Date().toISOString()
    });
    this.subDepots.push({
      id: `${newBranch.id}-drivers`,
      depotId: newBranch.id,
      name: 'Drivers',
      code: `${newBranch.code}-D`,
      category: 'DRIVERS',
      isActive: true,
      createdAt: new Date().toISOString()
    });
    
    this.cache();
    this.persistRows('branches', [newBranch], ['id']);
    this.persistRows('subdepots', this.subDepots.filter(s => s.depotId === newBranch.id), ['id']);
    return newBranch;
  }

  updateBranch(id: string, updates: Partial<Branch>): Branch | null {
    this.ensureData();
    const index = this.branches.findIndex(b => b.id === id);
    if (index === -1) return null;
    this.branches[index] = { ...this.branches[index], ...updates };
    this.cache();
    this.persistRows('branches', [this.branches[index]], ['id']);
    return this.branches[index];
  }

  getSubDepots(depotId?: string): SubDepot[] {
    this.ensureData();
    if (depotId) return this.subDepots.filter(s => s.depotId === depotId);
    return this.subDepots;
  }

  getSubDepotById(id: string): SubDepot | undefined {
    this.ensureData();
    return this.subDepots.find(s => s.id === id);
  }

  getEmployees(depotId?: string, subDepotCategory?: string, month?: number, year?: number): Employee[] {
    this.ensureData();
    let filtered = this.employees;
    
    if (depotId) {
      const baseEmployees = this.employees.filter(e => e.branchId === depotId);
      
      let tempEmployeeIds: string[] = [];
      if (month !== undefined && year !== undefined) {
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        tempEmployeeIds = this.assignments
          .filter(a => a.depotId === depotId && a.startDate <= monthEnd && a.endDate >= monthStart)
          .map(a => a.employeeId);
      } else {
        tempEmployeeIds = [];
      }
      
      const tempEmployees = this.employees.filter(e => tempEmployeeIds.includes(e.id));
      
      const combined = [...baseEmployees];
      tempEmployees.forEach(te => {
        if (!combined.some(e => e.id === te.id)) {
          combined.push(te);
        }
      });
      filtered = combined;
    }
    
    if (subDepotCategory) filtered = filtered.filter(e => e.subDepotCategory === subDepotCategory);
    return filtered;
  }

  getEmployeesByBranch(branchId: string): Employee[] {
    this.ensureData();
    return this.employees.filter(e => e.branchId === branchId);
  }

  getEmployeeById(id: string): Employee | undefined {
    this.ensureData();
    return this.employees.find(e => e.id === id);
  }

  getEmployeeByMasterId(masterId: string): Employee[] {
    this.ensureData();
    return this.employees.filter(e => e.masterEmployeeId === masterId);
  }

  getEmployeeByAadhaar(aadhaar: string): Employee[] {
    this.ensureData();
    const clean = normalizeAadhaar(aadhaar);
    if (!clean) return [];
    return this.employees.filter(e => e.aadharNumber && normalizeAadhaar(e.aadharNumber) === clean);
  }

  getEmployeeStints(masterId: string): Employee[] {
    this.ensureData();
    return this.employees
      .filter(e => e.masterEmployeeId === masterId)
      .sort((a, b) => a.joiningDate.localeCompare(b.joiningDate));
  }

  getEmployeeStats(depotId?: string) {
    this.ensureData();
    const employees = depotId ? this.getEmployeesByBranch(depotId) : this.employees;
    const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
    const drivers = activeEmployees.filter(e => e.subDepotCategory === 'DRIVERS');
    const staff = activeEmployees.filter(e => e.subDepotCategory === 'STAFF');
    
    return {
      total: employees.length,
      active: activeEmployees.length,
      inactive: employees.filter(e => e.status === 'INACTIVE').length,
      terminated: employees.filter(e => e.status === 'TERMINATED').length,
      transferred: employees.filter(e => e.status === 'TRANSFERRED').length,
      drivers: drivers.length,
      staff: staff.length,
      byDepartment: ['Office Staff', 'Drivers', 'Operations', 'Maintenance', 'Admin', 'Ticketing', 'Security', 'HR', 'Finance', 'Engineering'].reduce((acc, dept) => {
        acc[dept] = activeEmployees.filter(e => e.department === dept).length;
        return acc;
      }, {} as Record<string, number>),
      byGender: {
        male: activeEmployees.filter(e => e.gender === 'MALE').length,
        female: activeEmployees.filter(e => e.gender === 'FEMALE').length,
        other: activeEmployees.filter(e => e.gender === 'OTHER').length
      },
      avgSalary: activeEmployees.length > 0 
        ? activeEmployees.reduce((sum, e) => sum + e.salary, 0) / activeEmployees.length 
        : 0,
      pfEnrolled: activeEmployees.filter(e => e.pfEnabled && e.pfRegistrationStatus === 'COMPLETED').length,
      esicEnrolled: activeEmployees.filter(e => e.esicEnabled && e.esicRegistrationStatus === 'COMPLETED').length
    };
  }

  addEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'masterEmployeeId'>, masterEmployeeId?: string): Employee {
    this.ensureData();
    const masterId = masterEmployeeId || `MBPL${String(this.employees.length + 1000).padStart(5, '0')}`;
    const newEmployee: Employee = {
      ...employee,
      id: `emp-${Date.now()}`,
      masterEmployeeId: masterId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.employees.push(newEmployee);
    this.cache();
    this.persistRows('employees', [newEmployee], ['id']);
    return newEmployee;
  }

  updateEmployee(id: string, updates: Partial<Employee>): Employee | null {
    this.ensureData();
    const index = this.employees.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.employees[index] = { 
      ...this.employees[index], 
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.cache();
    this.persistRows('employees', [this.employees[index]], ['id']);
    return this.employees[index];
  }

  // ============================================================
  // SALARY MASTERS
  // ============================================================

  getSalaryMasters(employeeId?: string): SalaryMaster[] {
    this.ensureData();
    if (employeeId) return this.salaryMasters.filter(s => s.employeeId === employeeId);
    return this.salaryMasters;
  }

  getSalaryMasterForEmployee(employeeId: string, effectiveFrom?: string): SalaryMaster | undefined {
    this.ensureData();
    const list = this.salaryMasters.filter(s => s.employeeId === employeeId).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    if (!effectiveFrom) return list[0];
    return list.find(s => s.effectiveFrom <= effectiveFrom && (!s.effectiveTo || s.effectiveTo >= effectiveFrom)) || list[0];
  }

  addSalaryMaster(input: Omit<SalaryMaster, 'id' | 'createdAt' | 'updatedAt'>): SalaryMaster {
    this.ensureData();
    const now = new Date().toISOString();
    const master: SalaryMaster = {
      ...input,
      id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.salaryMasters.push(master);
    this.cache();
    this.persistRows('salary_masters', [master], ['id']);
    return master;
  }

  updateSalaryMaster(id: string, updates: Partial<SalaryMaster>): SalaryMaster | null {
    this.ensureData();
    const index = this.salaryMasters.findIndex(s => s.id === id);
    if (index === -1) return null;
    this.salaryMasters[index] = { ...this.salaryMasters[index], ...updates, updatedAt: new Date().toISOString() };
    this.cache();
    this.persistRows('salary_masters', [this.salaryMasters[index]], ['id']);
    return this.salaryMasters[index];
  }

  bulkUpsertSalaryMasters(rows: Omit<SalaryMaster, 'createdAt' | 'updatedAt'>[]) {
    this.ensureData();
    if (rows.length === 0) return;
    const now = new Date().toISOString();
    const withMeta = rows.map(r => ({ ...r, createdAt: now, updatedAt: now }));
    rows.forEach(r => {
      const existing = this.salaryMasters.findIndex(s => s.employeeId === r.employeeId && s.effectiveFrom === r.effectiveFrom);
      if (existing >= 0) this.salaryMasters[existing] = { ...this.salaryMasters[existing], ...withMeta.find(w => w.id === r.id), updatedAt: now };
      else this.salaryMasters.push(withMeta.find(w => w.id === r.id) as SalaryMaster);
    });
    this.cache();
    this.persistRows('salary_masters', withMeta, ['id']);
  }

  // ============================================================
  // BANK MASTER & DESIGNATIONS
  // ============================================================

  getBankMasters(): BankMaster[] {
    this.ensureData();
    return this.bankMasters;
  }

  getDesignations(category?: string): Designation[] {
    this.ensureData();
    if (category) return this.designations.filter(d => !d.category || d.category === category).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return this.designations.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  transferEmployee(employeeId: string, toDepotId: string, reason?: string, transferDate?: string, userId?: string): Employee | null {
    this.ensureData();
    const index = this.employees.findIndex(e => e.id === employeeId);
    if (index === -1) return null;
    
    const employee = this.employees[index];
    const transfer = {
      fromDepotId: employee.branchId,
      toDepotId,
      transferDate: transferDate ? new Date(transferDate).toISOString() : new Date().toISOString(),
      reason: reason?.trim() || 'Inter-depot transfer',
      status: 'APPROVED' as const
    };
    
    this.employees[index] = {
      ...employee,
      branchId: toDepotId,
      baseDepotId: employee.baseDepotId || employee.branchId,
      transferHistory: [...(employee.transferHistory || []), transfer],
      status: 'ACTIVE',
      updatedAt: new Date().toISOString()
    };
    
    this.cache();
    this.persistRows('employees', [this.employees[index]], ['id']);
    
    if (userId) {
      this.logAudit(userId, 'EMPLOYEE_TRANSFERRED', 'employees', employeeId,
        { fromDepotId: transfer.fromDepotId }, { toDepotId: transfer.toDepotId, reason: transfer.reason, date: transfer.transferDate });
    }
    
    return this.employees[index];
  }

  deleteEmployee(id: string): boolean {
    this.ensureData();
    const index = this.employees.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.employees.splice(index, 1);
    this.cache();
    this.deleteRows('employees', 'id', [id]);
    return true;
  }

  terminateEmployee(id: string, userId?: string): Employee | null {
    this.ensureData();
    const index = this.employees.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.employees[index] = {
      ...this.employees[index],
      status: 'TERMINATED',
      updatedAt: new Date().toISOString()
    };
    this.cache();
    this.persistRows('employees', [this.employees[index]], ['id']);
    if (userId) {
      this.logAudit(userId, 'EMPLOYEE_TERMINATED', 'employees', id,
        { status: 'ACTIVE' }, { status: 'TERMINATED' });
    }
    return this.employees[index];
  }

  getNotifications(userId?: string): AppNotification[] {
    this.ensureData();
    const list = userId ? this.notifications.filter(n => n.userId === userId) : this.notifications;
    return list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getUnreadNotificationCount(userId: string): number {
    this.ensureData();
    return this.notifications.filter(n => n.userId === userId && !n.read).length;
  }

  addNotification(input: { userId: string; title: string; message: string; type?: NotificationType; link?: string }): AppNotification {
    this.ensureData();
    const notification: AppNotification = {
      id: `ntf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type || 'INFO',
      link: input.link,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.push(notification);
    this.cache();
    this.persistRows('notifications', [notification], ['id']);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hrms-notifications-updated'));
    }
    return notification;
  }

  markNotificationRead(id: string) {
    this.ensureData();
    const idx = this.notifications.findIndex(n => n.id === id);
    if (idx === -1) return;
    this.notifications[idx] = { ...this.notifications[idx], read: true };
    this.cache();
    this.persistRows('notifications', [this.notifications[idx]], ['id']);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hrms-notifications-updated'));
    }
  }

  markAllNotificationsRead(userId: string) {
    this.ensureData();
    let changed = false;
    this.notifications = this.notifications.map(n => {
      if (n.userId === userId && !n.read) { changed = true; return { ...n, read: true }; }
      return n;
    });
    if (!changed) return;
    this.cache();
    this.persistRows('notifications', this.notifications.filter(n => n.userId === userId), ['id']);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hrms-notifications-updated'));
    }
  }

  getChangeRequests(userId?: string, role?: string): EmployeeChangeRequest[] {
    this.ensureData();
    let list = this.changeRequests;
    if (role === 'HR') {
      list = list.filter(r => r.requestedBy === userId);
    }
    return list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getPendingChangeRequests(): EmployeeChangeRequest[] {
    this.ensureData();
    return this.changeRequests.filter(r => r.status === 'PENDING').slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createChangeRequest(employee: Employee, changes: Partial<Employee>, user: User, action: ChangeRequestAction = 'UPDATE'): EmployeeChangeRequest | null {
    this.ensureData();
    const changedKeys = (Object.keys(changes) as (keyof Employee)[]).filter(k => {
      const cur = employee[k];
      const next = changes[k];
      return JSON.stringify(cur ?? null) !== JSON.stringify(next ?? null);
    });
    if (changedKeys.length === 0) return null;

    const diff: Partial<Employee> = {} as Partial<Employee>;
    changedKeys.forEach(k => { (diff as any)[k] = (changes as any)[k]; });

    return this.pushChangeRequest({
      employeeId: employee.id,
      employeeName: employee.name,
      summary: changedKeys.join(', '),
      changes: diff,
      action,
      requestedBy: user.id,
      requestedByName: user.name
    });
  }

  requestEmployeeCreate(payload: Partial<Employee>, user: User): EmployeeChangeRequest {
    this.ensureData();
    return this.pushChangeRequest({
      employeeId: '',
      employeeName: payload.name || 'New Employee',
      summary: 'New employee creation',
      changes: payload as Partial<Employee>,
      action: 'CREATE',
      requestedBy: user.id,
      requestedByName: user.name
    });
  }

  requestEmployeeTerminate(employee: Employee, user: User): EmployeeChangeRequest {
    this.ensureData();
    return this.pushChangeRequest({
      employeeId: employee.id,
      employeeName: employee.name,
      summary: 'Termination',
      changes: { status: 'TERMINATED' },
      action: 'TERMINATE',
      requestedBy: user.id,
      requestedByName: user.name
    });
  }

  requestEmployeeTransfer(employee: Employee, toDepotId: string, reason: string, transferDate: string, user: User): EmployeeChangeRequest {
    this.ensureData();
    const transfer = {
      fromDepotId: employee.branchId,
      toDepotId,
      transferDate: transferDate || new Date().toISOString().split('T')[0],
      reason: reason?.trim() || 'Inter-depot transfer',
      status: 'APPROVED' as const
    };
    return this.pushChangeRequest({
      employeeId: employee.id,
      employeeName: employee.name,
      summary: `Transfer to ${toDepotId}`,
      changes: {
        branchId: toDepotId,
        baseDepotId: employee.baseDepotId || employee.branchId,
        transferHistory: [...(employee.transferHistory || []), transfer]
      },
      action: 'TRANSFER',
      requestedBy: user.id,
      requestedByName: user.name
    });
  }

  private pushChangeRequest(input: {
    employeeId: string;
    employeeName: string;
    summary: string;
    changes: Partial<Employee>;
    action: ChangeRequestAction;
    requestedBy: string;
    requestedByName: string;
  }): EmployeeChangeRequest {
    this.ensureData();
    const changes = { ...(input.changes || {}), __action: input.action } as Partial<Employee>;
    const request: EmployeeChangeRequest = {
      id: `cr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      summary: input.summary,
      requestedBy: input.requestedBy,
      requestedByName: input.requestedByName,
      changes,
      action: input.action,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    this.changeRequests.push(request);
    this.cache();
    this.persistChangeRequest(request);

    const admins = this.users.filter(u => u.role === 'ADMIN');
    admins.forEach(admin => {
      this.addNotification({
        userId: admin.id,
        title: 'Employee change pending approval',
        message: `${input.requestedByName} requested ${input.action === 'CREATE' ? 'new employee creation' : input.action === 'TERMINATE' ? 'termination' : input.action === 'TRANSFER' ? 'transfer' : `${Object.keys(input.changes).filter(k => k !== '__action').length} change(s)`} for ${input.employeeName}.`,
        type: 'APPROVAL',
        link: '/approvals'
      });
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hrms-approvals-updated'));
    }
    return request;
  }

  approveChangeRequest(id: string, reviewer: User): EmployeeChangeRequest | null {
    this.ensureData();
    const idx = this.changeRequests.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const request = this.changeRequests[idx];
    if (request.status !== 'PENDING') return request;

    const action: ChangeRequestAction = (request.action as ChangeRequestAction) || (request.changes as any)?.__action || 'UPDATE';
    const applied = { ...(request.changes || {}) } as any;
    delete applied.__action;

    if (action === 'CREATE') {
      const masterEmployeeId = applied.masterEmployeeId;
      delete applied.masterEmployeeId;
      if (masterEmployeeId) {
        this.employees.forEach(prev => {
          if (prev.masterEmployeeId === masterEmployeeId && prev.status === 'ACTIVE') {
            this.updateEmployee(prev.id, { status: 'INACTIVE' });
          }
        });
      }
      this.addEmployee(applied, masterEmployeeId);
    } else {
      this.updateEmployee(request.employeeId, applied);
    }

    this.changeRequests[idx] = {
      ...request,
      status: 'APPROVED',
      reviewedBy: reviewer.id,
      reviewedByName: reviewer.name,
      reviewedAt: new Date().toISOString()
    };
    this.cache();
    this.persistChangeRequest(this.changeRequests[idx]);

    this.addNotification({
      userId: request.requestedBy,
      title: 'Change request approved',
      message: `${action === 'CREATE' ? `${request.employeeName} has been created` : action === 'TERMINATE' ? `${request.employeeName} has been terminated` : action === 'TRANSFER' ? `Transfer for ${request.employeeName} applied` : `Your changes to ${request.employeeName} (${request.summary}) were approved`} by ${reviewer.name}.`,
      type: 'APPROVAL',
      link: '/approvals'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hrms-approvals-updated'));
    }
    return this.changeRequests[idx];
  }

  rejectChangeRequest(id: string, reviewer: User, remarks?: string): EmployeeChangeRequest | null {
    this.ensureData();
    const idx = this.changeRequests.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const request = this.changeRequests[idx];
    if (request.status !== 'PENDING') return request;

    this.changeRequests[idx] = {
      ...request,
      status: 'REJECTED',
      reviewedBy: reviewer.id,
      reviewedByName: reviewer.name,
      reviewedAt: new Date().toISOString(),
      remarks: remarks?.trim()
    };
    this.cache();
    this.persistChangeRequest(this.changeRequests[idx]);

    this.addNotification({
      userId: request.requestedBy,
      title: 'Change request rejected',
      message: `Your changes to ${request.employeeName} (${request.summary}) were rejected by ${reviewer.name}${remarks ? ` — ${remarks}` : ''}.`,
      type: 'APPROVAL',
      link: '/approvals'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hrms-approvals-updated'));
    }
    return this.changeRequests[idx];
  }

  createDepotWithTemplate(input: {
    name: string;
    code: string;
    manager: string;
    managerPhone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  }, templateBranchId?: string): Branch {
    this.ensureData();
    const maxNum = this.branches.reduce((max, b) => {
      const m = b.id.match(/^depot-(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const newId = `depot-${String(maxNum + 1).padStart(3, '0')}`;

    const template = templateBranchId ? this.branches.find(b => b.id === templateBranchId) : undefined;

    const newBranch: Branch = {
      id: newId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      manager: input.manager.trim(),
      managerPhone: input.managerPhone.trim(),
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: input.pincode.trim(),
      incentiveType: template?.incentiveType || 'FIXED',
      incentiveValue: template?.incentiveValue || 2000,
      driverMonthlyIncentive: template?.driverMonthlyIncentive || 2000,
      incentiveTiers: template?.incentiveTiers ? template.incentiveTiers.map(t => ({ ...t, id: `tier-${Date.now()}-${t.id}` })) : [
        { id: 'tier-1', minDays: 24, maxDays: 25, amount: 2000 },
        { id: 'tier-2', minDays: 26, maxDays: 30, amount: 3000 }
      ],
      hourlyOvertimeRate: template?.hourlyOvertimeRate || 50,
      fullDayOvertimeRate: template?.fullDayOvertimeRate || 300,
      isActive: true,
      subDepots: [],
      createdAt: new Date().toISOString()
    };
    this.branches.push(newBranch);

    const newSubDepots: SubDepot[] = [
      {
        id: `${newId}-staff`,
        depotId: newId,
        name: 'Office Staff',
        code: `${newBranch.code}-S`,
        category: 'STAFF',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: `${newId}-drivers`,
        depotId: newId,
        name: 'Drivers',
        code: `${newBranch.code}-D`,
        category: 'DRIVERS',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    this.subDepots.push(...newSubDepots);

    if (template) {
      const templateEmployees = this.employees.filter(e => e.branchId === template.id && e.status === 'ACTIVE');
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const baseNum = this.employees.length + 1000;
      const copied: Employee[] = templateEmployees.map((e, i) => {
        const num = baseNum + i;
        return {
          id: `emp-${now.replace(/\D/g, '').slice(0, 12)}-${i}`,
          employeeId: `MBPL${String(num).padStart(5, '0')}`,
          masterEmployeeId: `MBPL${String(num).padStart(5, '0')}`,
          name: e.name,
          email: null as any,
          phone: null as any,
          department: e.department,
          designation: e.designation,
          branchId: newId,
          subDepotCategory: e.subDepotCategory,
          busCategory: e.busCategory ?? null,
          salary: e.salary,
          pfEnabled: e.pfEnabled,
          pfRegistrationStatus: e.pfRegistrationStatus,
          pfUanNumber: null as any,
          pfMemberId: null as any,
          esicEnabled: e.esicEnabled,
          esicRegistrationStatus: e.esicRegistrationStatus,
          esicNumber: null as any,
          bankAccount: null as any,
          ifscCode: e.ifscCode,
          bankName: e.bankName ?? null,
          panNumber: null as any,
          aadharNumber: null as any,
          joiningDate: today,
          status: 'ACTIVE',
          photoUrl: e.photoUrl ?? null,
          address: e.address,
          city: e.city ?? null,
          state: e.state ?? null,
          pincode: e.pincode ?? null,
          emergencyContact: e.emergencyContact,
          emergencyPhone: e.emergencyPhone,
          dateOfBirth: e.dateOfBirth,
          gender: e.gender,
          documents: e.documents || {},
          transferHistory: null as any,
          baseDepotId: newId,
          createdAt: now,
          updatedAt: now
        } as Employee;
      });
      this.employees.push(...copied);
      this.persistRows('employees', copied, ['id']);
    }

    this.cache();
    this.persistRows('branches', [newBranch], ['id']);
    this.persistRows('subdepots', newSubDepots, ['id']);
    return newBranch;
  }

  getAttendance(employeeId?: string, month?: number, year?: number): Attendance | Record<string, AttendanceRecord> {
    this.ensureData();
    if (employeeId) {
      const empAttendance = this.attendance[employeeId] || {};
      if (month !== undefined && year !== undefined) {
        const filtered: Record<string, AttendanceRecord> = {};
        Object.entries(empAttendance).forEach(([date, record]) => {
          const d = new Date(date);
          if (d.getMonth() + 1 === month && d.getFullYear() === year) {
            filtered[date] = record;
          }
        });
        return filtered;
      }
      return empAttendance;
    }
    return this.attendance;
  }

  setAttendance(employeeId: string, date: string, record: AttendanceRecord) {
    this.ensureData();
    if (this.isAttendanceLocked(date)) return false;
    if (!this.attendance[employeeId]) {
      this.attendance[employeeId] = {};
    }
    this.attendance[employeeId][date] = record;
    this.cache();
    this.persistRows('attendance', [{ ...record, employeeId, date }], ['employeeId', 'date']);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hrms-attendance-updated'));
    }
    return true;
  }

  bulkSetAttendance(records: AttendanceRecord[]) {
    this.ensureData();
    const allowed = records.filter(r => !this.isAttendanceLocked(r.date));
    allowed.forEach(r => {
      if (!this.attendance[r.employeeId]) {
        this.attendance[r.employeeId] = {};
      }
      this.attendance[r.employeeId][r.date] = r;
    });
    this.cache();
    const rows = allowed.map(r => ({ ...r, employeeId: r.employeeId, date: r.date }));
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      this.persistRows('attendance', rows.slice(i, i + chunkSize), ['employeeId', 'date']);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hrms-attendance-updated'));
    }
  }

  isAttendanceLocked(date: string): boolean {
    if (!date || date.length < 10) return false;
    const day = date.slice(0, 10);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (day > todayStr) return true;
    const month = parseInt(day.slice(5, 7), 10);
    const year = parseInt(day.slice(0, 4), 10);
    if (!month || !year) return false;
    return this.isPayrollProcessed(month, year);
  }

  isPayrollProcessed(month: number, year: number): boolean {
    this.ensureData();
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1];
    return this.payroll.some(p => p.month === m && p.year === year && p.status !== 'DRAFT');
  }

  syncFromCache() {
    if (typeof window === 'undefined') return;
    this.loadFromLocalCache();
  }

  async refreshLiveData() {
    if (!isSupabaseConfigured()) return;
    try {
      const [attRes, otRes, payRes, empRes] = await Promise.all([
        supabase.from('attendance').select('*').limit(100000),
        supabase.from('overtime').select('*').limit(100000),
        supabase.from('payroll').select('*').limit(100000),
        supabase.from('employees').select('*').limit(100000),
      ]);
      if (attRes.error) throw attRes.error;
      if (otRes.error) throw otRes.error;
      if (payRes.error) throw payRes.error;
      if (empRes.error) throw empRes.error;

      const attendanceMap: Attendance = { ...this.attendance };
      (attRes.data || []).forEach((row: any) => {
        if (!attendanceMap[row.employeeId]) attendanceMap[row.employeeId] = {};
        const { employeeId, date, ...rest } = row;
        attendanceMap[employeeId][date] = { employeeId, date, ...rest } as AttendanceRecord;
      });
      this.attendance = attendanceMap;
      if (otRes.data) this.overtimeEntries = otRes.data;
      if (payRes.data) this.payroll = payRes.data;
      if (empRes.data) this.employees = empRes.data;
      this.cache();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('hrms-data-refreshed'));
      }
    } catch (e) {
      console.error('Live refresh failed', e);
    }
  }

  getOvertime(employeeId?: string, month?: number, year?: number): OvertimeEntry[] {
    this.ensureData();
    let filtered = this.overtimeEntries;
    if (employeeId) filtered = filtered.filter(o => o.employeeId === employeeId);
    if (month !== undefined && year !== undefined) {
      filtered = filtered.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }
    return filtered;
  }

  addOvertime(entry: Omit<OvertimeEntry, 'id' | 'createdAt'>): OvertimeEntry {
    this.ensureData();
    const newEntry: OvertimeEntry = {
      ...entry,
      id: `ot-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.overtimeEntries.push(newEntry);
    this.cache();
    this.persistRows('overtime', [newEntry], ['id']);
    return newEntry;
  }

  approveOvertime(overtimeId: string, approvedBy: string) {
    this.ensureData();
    const index = this.overtimeEntries.findIndex(o => o.id === overtimeId);
    if (index !== -1) {
      this.overtimeEntries[index] = {
        ...this.overtimeEntries[index],
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date().toISOString()
      };
      this.cache();
      this.persistRows('overtime', [this.overtimeEntries[index]], ['id']);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('hrms-data-refreshed'));
      }
    }
  }

  rejectOvertime(overtimeId: string, rejectedBy: string) {
    this.ensureData();
    const index = this.overtimeEntries.findIndex(o => o.id === overtimeId);
    if (index !== -1) {
      this.overtimeEntries[index] = {
        ...this.overtimeEntries[index],
        status: 'REJECTED',
        approvedBy: rejectedBy,
        approvedAt: new Date().toISOString()
      };
      this.cache();
      this.persistRows('overtime', [this.overtimeEntries[index]], ['id']);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('hrms-data-refreshed'));
      }
    }
  }

  calculatePayroll(employee: Employee, month: number, year: number, deductions?: PayrollDeductionOverride, foodIncentive?: number) {
    this.ensureData();
    const branch = this.getBranchById(employee.branchId);
    const settings = this.getSettings();
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const salaryMaster = this.getSalaryMasterForEmployee(employee.id, monthKey);
    const attendanceRecords = this.getAttendance(employee.id, month, year) as Record<string, AttendanceRecord>;
    const overtimeEntries = this.getOvertime(employee.id, month, year);
    const calc = payrollCalc({
      employee,
      salaryMaster,
      branch,
      attendanceRecords,
      overtimeEntries,
      settings,
      month,
      year,
      deductions,
      foodIncentive,
    });

    return {
      basicSalary: calc.fullBasic,
      hra: calc.fullHra,
      conveyance: calc.fullConveyance,
      washing: calc.fullWashing,
      medical: calc.fullMedical,
      otherAllowances: calc.fullAllowances,
      grossSalary: calc.fullGross,
      presentDays: calc.presentDays,
      paidLeaveDays: calc.paidLeaveDays,
      holidayDays: calc.holidayDays,
      weekOffDays: calc.weekOffDays,
      absentDays: calc.absentDays,
      lopDays: calc.lopDays,
      totalDays: calc.totalDays,
      extraDays: calc.overtimeDays,
      perDay: calc.perDaySalary,
      lopDeduction: calc.lopDeduction,
      overtimeHours: calc.overtimeHours,
      overtimeDays: calc.overtimeDays,
      overtimeType: calc.overtimeHours > 0 ? 'HOURLY' : calc.overtimeDays > 0 ? 'FULL_DAY' : undefined,
      overtimeAmount: calc.overtimeAmount,
      foodIncentive: calc.foodIncentive,
      driverIncentive: calc.driverIncentive,
      incentive: calc.incentive,
      totalEarnings: calc.totalEarnings,
      pfDeduction: calc.pfDeduction,
      esicDeduction: calc.esicDeduction,
      tdsDeduction: calc.tdsDeduction,
      ptDeduction: calc.ptDeduction,
      mlwfDeduction: calc.mlwfDeduction,
      otherDeductions: calc.otherDeductions,
      refundAmount: calc.refundAmount,
      totalDeductions: calc.totalDeductions,
      netSalary: calc.netSalary,
      earnedBasic: calc.earnedBasic,
      earnedHra: calc.earnedHra,
      earnedConveyance: calc.earnedConveyance,
      earnedAllowances: calc.earnedAllowances,
      earnedGross: calc.earnedGross,
    };
  }

  generateAttendanceMonth(month: number, year: number, employees: Employee[]): { created: number; skipped: number } {
    this.ensureData();
    const daysInMonth = new Date(year, month, 0).getDate();
    let created = 0;
    let skipped = 0;
    for (const emp of employees || this.employees) {
      if (emp.status !== 'ACTIVE') { skipped++; continue; }
      const existing = this.attendance[emp.id] || {};
      const monthKeyPrefix = `${year}-${String(month).padStart(2, '0')}`;
      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!existing[date]) {
          const dayOfWeek = new Date(year, month - 1, d).getDay();
          existing[date] = {
            employeeId: emp.id,
            date,
            status: dayOfWeek === 0 ? 'WO' : 'P',
            isPaid: 'PAID',
            depotId: emp.branchId,
          };
          created++;
        }
      }
      this.attendance[emp.id] = existing;
    }
    this.cache();
    const rows: any[] = [];
    for (const emp of (employees || this.employees)) {
      const recs = this.attendance[emp.id] || {};
      Object.values(recs).forEach((r: any) => {
        if (String(r.date).startsWith(`${year}-${String(month).padStart(2, '0')}`)) rows.push({ ...r, employeeId: emp.id });
      });
    }
    for (let i = 0; i < rows.length; i += 500) {
      this.persistRows('attendance', rows.slice(i, i + 500), ['employeeId', 'date']);
    }
    return { created, skipped };
  }

  importAttendance(records: Array<{ employeeId: string; date: string; status: AttendanceStatus; isPaid?: boolean }>): number {
    this.ensureData();
    const rows = records.map(r => {
      const emp = this.employees.find(e => e.id === r.employeeId);
      const paid = r.isPaid !== undefined ? (r.isPaid ? 'PAID' : 'UNPAID') : (['P', 'PL', 'H'].includes(r.status) ? 'PAID' : 'UNPAID');
      const rec: AttendanceRecord = { employeeId: r.employeeId, date: r.date, status: r.status, isPaid: paid, depotId: emp?.branchId };
      if (!this.attendance[r.employeeId]) this.attendance[r.employeeId] = {};
      this.attendance[r.employeeId][r.date] = rec;
      return rec;
    });
    this.cache();
    for (let i = 0; i < rows.length; i += 500) {
      this.persistRows('attendance', rows.slice(i, i + 500), ['employeeId', 'date']);
    }
    return rows.length;
  }

  approvePayroll(id: string, approvedBy: string): PayrollEntry | null {
    this.ensureData();
    const index = this.payroll.findIndex(p => p.id === id);
    if (index === -1) return null;
    const now = new Date().toISOString();
    this.payroll[index] = {
      ...this.payroll[index],
      status: 'APPROVED',
      approvedBy,
      approvedAt: now,
    };
    this.cache();
    this.persistRows('payroll', [this.payroll[index]], ['id']);
    this.notifyPayrollChanged();
    return this.payroll[index];
  }

  markPayrollPaid(id: string): PayrollEntry | null {
    this.ensureData();
    const index = this.payroll.findIndex(p => p.id === id);
    if (index === -1) return null;
    const now = new Date().toISOString();
    this.payroll[index] = {
      ...this.payroll[index],
      status: 'PAID',
      paidAt: now,
    };
    this.cache();
    this.persistRows('payroll', [this.payroll[index]], ['id']);
    this.notifyPayrollChanged();
    return this.payroll[index];
  }

  private getWorkingDays(year: number, month: number): number {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month, d).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
    }
    return workingDays;
  }

  getPayroll(month?: string, year?: number, employeeId?: string): PayrollEntry[] {
    this.ensureData();
    let filtered = this.payroll;
    if (month) filtered = filtered.filter(p => p.month === month);
    if (year) filtered = filtered.filter(p => p.year === year);
    if (employeeId) filtered = filtered.filter(p => p.employeeId === employeeId);
    return filtered;
  }

  getPayrollByBranch(branchId: string, month?: string, year?: number): PayrollEntry[] {
    this.ensureData();
    const branchEmployees = this.getEmployeesByBranch(branchId).map(e => e.id);
    return this.payroll.filter(p => branchEmployees.includes(p.employeeId) && 
      (!month || p.month === month) && (!year || p.year === year));
  }

  addPayroll(entry: Omit<PayrollEntry, 'id'>): PayrollEntry {
    this.ensureData();
    const newEntry: PayrollEntry = {
      ...entry,
      id: `pay-${Date.now()}`
    };
    this.payroll.push(newEntry);
    this.cache();
    this.persistRows('payroll', [newEntry], ['id']);
    this.notifyPayrollChanged();
    return newEntry;
  }

  updatePayroll(id: string, updates: Partial<PayrollEntry>): PayrollEntry | null {
    this.ensureData();
    const index = this.payroll.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.payroll[index] = { ...this.payroll[index], ...updates };
    this.cache();
    this.persistRows('payroll', [this.payroll[index]], ['id']);
    this.notifyPayrollChanged();
    return this.payroll[index];
  }

  private notifyPayrollChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hrms-payroll-updated'));
    }
  }

  getLeaveRequests(employeeId?: string, status?: string): LeaveRequest[] {
    this.ensureData();
    let filtered = this.leaves;
    if (employeeId) filtered = filtered.filter(l => l.employeeId === employeeId);
    if (status) filtered = filtered.filter(l => l.status === status);
    return filtered;
  }

  addLeaveRequest(request: Omit<LeaveRequest, 'id'>): LeaveRequest {
    this.ensureData();
    const newRequest: LeaveRequest = {
      ...request,
      id: `leave-${Date.now()}`
    };
    this.leaves.push(newRequest);
    this.cache();
    this.persistRows('leaves', [newRequest], ['id']);
    return newRequest;
  }

  updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): LeaveRequest | null {
    this.ensureData();
    const index = this.leaves.findIndex(l => l.id === id);
    if (index === -1) return null;
    this.leaves[index] = { ...this.leaves[index], ...updates };
    this.cache();
    this.persistRows('leaves', [this.leaves[index]], ['id']);
    return this.leaves[index];
  }

  getAuditLogs(filters?: { userId?: string; module?: string; from?: string; to?: string }): AuditLog[] {
    this.ensureData();
    let filtered = this.auditLogs;
    if (filters?.userId) filtered = filtered.filter(l => l.userId === filters.userId);
    if (filters?.module) filtered = filtered.filter(l => l.module === filters.module);
    if (filters?.from) filtered = filtered.filter(l => l.timestamp >= filters.from!);
    if (filters?.to) filtered = filtered.filter(l => l.timestamp <= filters.to!);
    return filtered.slice(-500);
  }

  getSettings(): SystemSettings {
    this.ensureData();
    if (!this.settings.overtimeSettings) {
      this.settings.overtimeSettings = {
        hourlyRate: 50,
        fullDayRate: 300,
        maxHourlyOvertime: 4,
        maxFullDayOvertime: 10
      };
    }
    return this.settings;
  }

  updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.ensureData();
    this.settings = { ...this.settings, ...updates };
    this.cache();
    this.persistRows('system_settings', [{ key: 'app', value: this.settings }], ['key']);
    return this.settings;
  }

  resetAllData() {
    this.employees = this.generateEmployees();
    this.branches = this.generateBranches();
    this.subDepots = this.generateSubDepots();
    this.attendance = {};
    this.payroll = [];
    this.leaves = [];
    this.auditLogs = [];
    this.overtimeEntries = [];
    this.assignments = [];
    this.changeRequests = [];
    this.notifications = [];
    this.users = this.generateDefaultUsers();
    this.settings = { ...DEFAULT_SETTINGS };
    this.cache();
    ['attendance', 'payroll', 'leaves', 'overtime', 'assignments', 'audit_logs', 'branches', 'employees', 'subdepots', 'hrms_users', 'employee_change_requests', 'notifications'].forEach(t => this.clearTable(t));
    this.persistRows('branches', this.branches, ['id']);
    this.persistRows('employees', this.employees, ['id']);
    this.persistRows('subdepots', this.subDepots, ['id']);
    this.persistRows('hrms_users', this.users, ['id']);
    this.persistRows('system_settings', [{ key: 'app', value: this.settings }], ['key']);
  }

  getAssignments(employeeId?: string): EmployeeAssignment[] {
    this.ensureData();
    if (employeeId) {
      return this.assignments.filter(a => a.employeeId === employeeId);
    }
    return this.assignments;
  }

  addAssignment(assignment: Omit<EmployeeAssignment, 'id' | 'createdAt'>): EmployeeAssignment {
    this.ensureData();
    const newAssignment: EmployeeAssignment = {
      ...assignment,
      id: `asg-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.assignments.push(newAssignment);
    this.cache();
    this.persistRows('assignments', [newAssignment], ['id']);
    return newAssignment;
  }

  deleteAssignment(id: string): void {
    this.ensureData();
    this.assignments = this.assignments.filter(a => a.id !== id);
    this.cache();
    this.deleteRows('assignments', 'id', [id]);
  }

  getAssignmentForEmployeeOnDate(employeeId: string, date: string): EmployeeAssignment | undefined {
    this.ensureData();
    return this.assignments.find(a => 
      a.employeeId === employeeId && 
      date >= a.startDate && 
      date <= a.endDate
    );
  }

  getUsers(): User[] {
    this.ensureData();
    return this.users;
  }

  setUsers(users: User[]) {
    this.users = users;
    this.cache();
    this.persistRows('hrms_users', users, ['id']);
  }
}

export const dataService = new DataService();
