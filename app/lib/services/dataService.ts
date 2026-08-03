'use client';

import { 
  Employee, Branch, Attendance, PayrollEntry, LeaveRequest, AuditLog, SystemSettings,
  AttendanceRecord, SubDepot, OvertimeEntry, EmployeeDocuments, EmployeeAssignment,
  IncentiveTier, User
} from '../types';
import { calculateTieredIncentive, normalizeAadhaar } from '../utils/incentive';
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
      this.settings = settings ? { ...DEFAULT_SETTINGS, ...JSON.parse(settings) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.error('Failed to load local cache', e);
    }
  }

  private async loadAllFromSupabase() {
    const tableNames = ['branches', 'employees', 'attendance', 'payroll', 'leaves', 'overtime', 'subdepots', 'assignments', 'audit_logs', 'hrms_users'];
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
    for (let i = 0; i < 2; i++) {
      users.push({
        id: `hr-${String(i + 1).padStart(3, '0')}`,
        email: `hr.d${String(i + 1).padStart(3, '0')}@moryabuses.com`,
        password: `hr${String(i + 1).padStart(3, '0')}`,
        name: `HR Manager - Depot ${i + 1}`,
        role: 'HR',
        depotId: `depot-${String(i + 1).padStart(3, '0')}`,
        createdAt: new Date().toISOString(),
        isActive: true
      });
    }
    return users;
  }

  private generateBranches(): Branch[] {
    const cities = [
      { city: 'Mumbai', state: 'Maharashtra' },
      { city: 'Pune', state: 'Maharashtra' }
    ];

    return cities.map((loc, i) => ({
      id: `depot-${String(i + 1).padStart(3, '0')}`,
      name: `${loc.city} Depot`,
      code: `D${String(i + 1).padStart(3, '0')}`,
      manager: `Manager ${i + 1}`,
      managerPhone: `98765${String(43210 + i).padStart(5, '0')}`,
      address: `Depot Area, ${loc.city}`,
      city: loc.city,
      state: loc.state,
      pincode: String(400000 + i * 100),
      incentiveType: 'FIXED' as const,
      incentiveValue: 2000,
      driverMonthlyIncentive: 2000,
      incentiveTiers: [
        { id: 'tier-1', minDays: 24, maxDays: 25, amount: 2000 },
        { id: 'tier-2', minDays: 26, maxDays: 30, amount: 3000 }
      ],
      hourlyOvertimeRate: 50 + (i % 5) * 15,
      fullDayOvertimeRate: 300 + (i % 5) * 75,
      isActive: true,
      subDepots: [],
      createdAt: new Date().toISOString()
    }));
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
      const dept = departments[Math.floor(Math.random() * departments.length)];
      const desig = designations[Math.floor(Math.random() * designations.length)];
      const branchIndex = Math.floor(Math.random() * 2);
      const baseSalary = dept === 'Drivers' ? 18000 + Math.random() * 8000 : 
                        dept === 'Operations' ? 20000 + Math.random() * 15000 :
                        15000 + Math.random() * 25000;
      
      const isDriver = dept === 'Drivers';
      const subDepotCategory = isDriver ? 'DRIVERS' : 'STAFF';

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
        branchId: `depot-${String(branchIndex + 1).padStart(3, '0')}`,
        subDepotCategory,
        salary: Math.round(baseSalary),
        pfEnabled: Math.random() > 0.3,
        pfRegistrationStatus: Math.random() > 0.5 ? 'COMPLETED' : 'PENDING',
        pfUanNumber: Math.random() > 0.3 ? `12${String(Math.floor(Math.random() * 999999999)).padStart(9, '0')}` : undefined,
        esicEnabled: Math.random() > 0.5,
        esicRegistrationStatus: Math.random() > 0.5 ? 'COMPLETED' : 'PENDING',
        esicNumber: Math.random() > 0.5 ? `${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}/${branchIndex + 1}` : undefined,
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
    if (!this.attendance[employeeId]) {
      this.attendance[employeeId] = {};
    }
    this.attendance[employeeId][date] = record;
    this.cache();
    this.persistRows('attendance', [{ ...record, employeeId, date }], ['employeeId', 'date']);
  }

  bulkSetAttendance(records: AttendanceRecord[]) {
    this.ensureData();
    records.forEach(r => {
      if (!this.attendance[r.employeeId]) {
        this.attendance[r.employeeId] = {};
      }
      this.attendance[r.employeeId][r.date] = r;
    });
    this.cache();
    const rows = records.map(r => ({ ...r, employeeId: r.employeeId, date: r.date }));
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      this.persistRows('attendance', rows.slice(i, i + chunkSize), ['employeeId', 'date']);
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
    }
  }

  calculatePayroll(employee: Employee, month: number, year: number) {
    this.ensureData();
    const branch = this.getBranchById(employee.branchId);
    const settings = this.getSettings();
    
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const totalDays = monthEnd.getDate();
    const workingDays = this.getWorkingDays(year, month - 1);
    
    const empAttendance = this.getAttendance(employee.id, month, year) as Record<string, AttendanceRecord>;
    
    let presentDays = 0, paidLeaveDays = 0, holidayDays = 0, weekOffDays = 0, absentDays = 0, lopDays = 0;
    
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = empAttendance[dateStr];
      
      if (!record) {
        absentDays++;
      } else {
        switch (record.status) {
          case 'P': presentDays++; break;
          case 'PL': paidLeaveDays++; break;
          case 'H': holidayDays++; break;
          case 'WO': weekOffDays++; break;
          case 'A':
          case 'LOP': absentDays++; lopDays++; break;
        }
      }
    }

    const basicSalary = Math.round(employee.salary * 0.5);
    const hra = Math.round(employee.salary * 0.2);
    const conveyance = Math.round(employee.salary * 0.1);
    const otherAllowances = employee.salary - basicSalary - hra - conveyance;
    const grossSalary = employee.salary;
    
    const perDaySalary = employee.salary / totalDays;
    const lopDeduction = Math.round(lopDays * perDaySalary);
    
    const overtimeEntries = this.getOvertime(employee.id, month, year).filter(o => o.status === 'APPROVED');
    let overtimeHours = 0;
    let overtimeDays = 0;
    let overtimeAmount = 0;
    
    overtimeEntries.forEach(ot => {
      if (ot.type === 'HOURLY' && ot.hours) {
        overtimeHours += ot.hours;
        if (ot.amount) {
          overtimeAmount += ot.amount;
        } else {
          const rate = ot.rate || settings.overtimeSettings.hourlyRate;
          overtimeAmount += ot.hours * rate;
        }
      } else if (ot.type === 'FULL_DAY') {
        overtimeDays++;
        if (ot.amount) {
          overtimeAmount += ot.amount;
        } else {
          const rate = ot.rate || settings.overtimeSettings.fullDayRate;
          overtimeAmount += rate;
        }
      }
    });

    let driverIncentive = 0;
    if (employee.subDepotCategory === 'DRIVERS' && branch) {
      driverIncentive = calculateTieredIncentive(branch, presentDays, 'DRIVERS');
    }

    const incentive = employee.subDepotCategory === 'DRIVERS'
      ? 0
      : (branch?.incentiveValue || 0);
    const totalEarnings = grossSalary - lopDeduction + overtimeAmount + driverIncentive + incentive;
    
    const pfDeduction = employee.pfEnabled && employee.pfRegistrationStatus === 'COMPLETED' 
      ? Math.round(basicSalary * (settings.pfRate / 100)) 
      : 0;
    const esicDeduction = employee.esicEnabled && employee.esicRegistrationStatus === 'COMPLETED' 
      ? Math.round(totalEarnings * (settings.esicRate / 100)) 
      : 0;
    const tdsDeduction = employee.salary * 12 > settings.tdsThreshold 
      ? Math.round(totalEarnings * (settings.tdsRate / 100)) 
      : 0;
    
    const totalDeductions = pfDeduction + esicDeduction + tdsDeduction + lopDeduction;
    const netSalary = Math.round(totalEarnings - totalDeductions);

    return {
      basicSalary,
      hra,
      conveyance,
      otherAllowances,
      grossSalary,
      presentDays,
      paidLeaveDays,
      holidayDays,
      weekOffDays,
      absentDays,
      lopDays,
      lopDeduction,
      overtimeHours,
      overtimeDays,
      overtimeAmount,
      driverIncentive,
      incentive,
      totalEarnings,
      pfDeduction,
      esicDeduction,
      tdsDeduction,
      otherDeductions: 0,
      totalDeductions,
      netSalary
    };
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
    return newEntry;
  }

  updatePayroll(id: string, updates: Partial<PayrollEntry>): PayrollEntry | null {
    this.ensureData();
    const index = this.payroll.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.payroll[index] = { ...this.payroll[index], ...updates };
    this.cache();
    this.persistRows('payroll', [this.payroll[index]], ['id']);
    return this.payroll[index];
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
    this.users = this.generateDefaultUsers();
    this.settings = { ...DEFAULT_SETTINGS };
    this.cache();
    this.persistRows('branches', this.branches, ['id']);
    this.persistRows('employees', this.employees, ['id']);
    this.persistRows('subdepots', this.subDepots, ['id']);
    this.persistRows('hrms_users', this.users, ['id']);
    this.persistRows('system_settings', [{ key: 'app', value: this.settings }], ['key']);
    ['attendance', 'payroll', 'leaves', 'overtime', 'assignments', 'audit_logs'].forEach(t => this.clearTable(t));
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
