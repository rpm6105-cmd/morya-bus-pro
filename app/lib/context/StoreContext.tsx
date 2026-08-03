'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee, Branch, AttendanceRecord } from '../types';
import { dataService } from '../services/dataService';
import { toast } from 'react-hot-toast';

type Attendance = Record<string, Record<string, AttendanceRecord>>;

interface StoreContextType {
  employees: Employee[];
  branches: Branch[];
  attendance: Attendance;
  role: 'ADMIN' | 'HR';
  isDemoMode: boolean;
  selectedMonth: number;
  selectedYear: number;
  
  setRole: (role: 'ADMIN' | 'HR') => void;
  setDemoMode: (isDemo: boolean) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  addEmployee: (emp: Employee) => void;
  updateEmployee: (emp: Employee) => void;
  deleteEmployee: (id: string) => void;
  updateBranch: (branch: Branch) => void;
  updateAttendance: (empId: string, date: string, status: string) => void;
  resetData: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [attendance, setAttendance] = useState<Attendance>({});
  const [role, setRole] = useState<'ADMIN' | 'HR'>('ADMIN');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await dataService.initialize();
      if (cancelled) return;
      setEmployees(dataService.getEmployees());
      setBranches(dataService.getBranches());
      const attendanceData = dataService.getAttendance();
      if (typeof attendanceData === 'object' && attendanceData !== null) {
        setAttendance(attendanceData as Attendance);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const addEmployee = (emp: Employee) => {
    dataService.addEmployee(emp);
    setEmployees(dataService.getEmployees());
    toast.success('Employee added successfully');
  };

  const updateEmployee = (emp: Employee) => {
    dataService.updateEmployee(emp.id, emp);
    setEmployees(dataService.getEmployees());
    toast.success('Employee updated');
  };

  const deleteEmployee = (id: string) => {
    if (role !== 'ADMIN') {
      toast.error('HR cannot terminate employees');
      return;
    }
    dataService.terminateEmployee(id);
    setEmployees(dataService.getEmployees());
    toast.success('Employee marked as Terminated (data retained)');
  };

  const updateBranch = (branch: Branch) => {
    const idx = branches.findIndex(b => b.id === branch.id);
    if (idx !== -1) {
      branches[idx] = branch;
      localStorage.setItem('hrms_branches', JSON.stringify(branches));
      setBranches([...branches]);
    }
    toast.success('Branch settings updated');
  };

  const updateAttendance = (empId: string, date: string, status: string) => {
    const record: AttendanceRecord = { employeeId: empId, date, status: status as AttendanceRecord['status'], isPaid: 'PAID' };
    dataService.setAttendance(empId, date, record);
    setAttendance(dataService.getAttendance() as Attendance);
  };

  const resetData = () => {
    dataService.resetAllData();
    window.location.reload();
  };

  return (
    <StoreContext.Provider value={{
      employees,
      branches,
      attendance,
      role,
      isDemoMode,
      selectedMonth,
      selectedYear,
      setRole,
      setDemoMode: (val: boolean) => { setIsDemoMode(val); toast.success(`Demo Mode: ${val ? 'ON' : 'OFF'}`); },
      setSelectedMonth,
      setSelectedYear,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      updateBranch,
      updateAttendance,
      resetData
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
