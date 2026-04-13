'use client';

import { useState, useEffect } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { Employee, Branch } from '../../lib/types';
import {
  BarChart3, Download, Filter, Calendar, TrendingUp, Users,
  DollarSign, Building2, FileText, PieChart, CalendarDays
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const { user, isAdmin } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedBranch]);

  const loadData = () => {
    const branchList = dataService.getBranches();
    setBranches(branchList);

    const empList = isAdmin 
      ? dataService.getEmployees(selectedBranch || undefined)
      : dataService.getEmployees(user?.depotId);
    setEmployees(empList);
  };

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE');

  const departmentData = [...new Set(employees.map(e => e.department))].map(dept => ({
    name: dept,
    active: employees.filter(e => e.department === dept && e.status === 'ACTIVE').length,
    inactive: employees.filter(e => e.department === dept && e.status !== 'ACTIVE').length
  }));

  const genderData = [
    { name: 'Male', value: employees.filter(e => e.gender === 'MALE').length, color: '#3b82f6' },
    { name: 'Female', value: employees.filter(e => e.gender === 'FEMALE').length, color: '#ec4899' },
    { name: 'Other', value: employees.filter(e => e.gender === 'OTHER').length, color: '#8b5cf6' }
  ];

  const salaryRanges = [
    { range: '0-15K', count: employees.filter(e => e.salary < 15000).length },
    { range: '15-25K', count: employees.filter(e => e.salary >= 15000 && e.salary < 25000).length },
    { range: '25-40K', count: employees.filter(e => e.salary >= 25000 && e.salary < 40000).length },
    { range: '40K+', count: employees.filter(e => e.salary >= 40000).length }
  ];

  const branchPerformance = branches.slice(0, 10).map(branch => ({
    name: branch.code,
    employees: employees.filter(e => e.branchId === branch.id && e.status === 'ACTIVE').length,
    avgSalary: employees.filter(e => e.branchId === branch.id && e.status === 'ACTIVE').length > 0 
      ? Math.round(employees.filter(e => e.branchId === branch.id && e.status === 'ACTIVE').reduce((sum, e) => sum + e.salary, 0) / 
        employees.filter(e => e.branchId === branch.id && e.status === 'ACTIVE').length)
      : 0
  }));

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: activeEmployees.length,
    avgSalary: activeEmployees.length > 0 
      ? Math.round(activeEmployees.reduce((sum, e) => sum + e.salary, 0) / activeEmployees.length)
      : 0,
    totalMonthlyPayroll: activeEmployees.reduce((sum, e) => sum + e.salary, 0),
    pfEnabled: activeEmployees.filter(e => e.pfEnabled).length,
    esicEnabled: activeEmployees.filter(e => e.esicEnabled).length
  };

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      filters: { branch: selectedBranch || 'All', isAdmin },
      summary: stats,
      departmentBreakdown: departmentData,
      genderBreakdown: genderData,
      salaryRanges,
      employees: activeEmployees.map(e => ({
        id: e.employeeId,
        name: e.name,
        department: e.department,
        designation: e.designation,
        salary: e.salary,
        branch: branches.find(b => b.id === e.branchId)?.name || ''
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HR_Report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Report exported successfully');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Reports & Analytics</h1>
          <p style={styles.subtitle}>Comprehensive workforce insights</p>
        </div>
        <div style={styles.headerActions}>
          {isAdmin && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={styles.select}
            >
              <option value="">All Depots</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          )}
          <button style={styles.exportBtn} onClick={exportReport}>
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#dbeafe' }}>
            <Users size={24} color="#3b82f6" />
          </div>
          <div>
            <p style={styles.statLabel}>Total Employees</p>
            <p style={styles.statValue}>{stats.totalEmployees.toLocaleString()}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#dcfce7' }}>
            <Users size={24} color="#10b981" />
          </div>
          <div>
            <p style={styles.statLabel}>Active Employees</p>
            <p style={styles.statValue}>{stats.activeEmployees.toLocaleString()}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#fef3c7' }}>
            <DollarSign size={24} color="#f59e0b" />
          </div>
          <div>
            <p style={styles.statLabel}>Avg. Salary</p>
            <p style={styles.statValue}>₹{(stats.avgSalary / 1000).toFixed(1)}K</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#fce7f3' }}>
            <TrendingUp size={24} color="#ec4899" />
          </div>
          <div>
            <p style={styles.statLabel}>Monthly Payroll</p>
            <p style={styles.statValue}>₹{(stats.totalMonthlyPayroll / 100000).toFixed(1)}L</p>
          </div>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            <BarChart3 size={18} />
            Employees by Department
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={departmentData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="active" fill="#10b981" name="Active" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inactive" fill="#94a3b8" name="Inactive" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            <PieChart size={18} />
            Gender Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <RePieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            {genderData.map((item, index) => (
              <div key={index} style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: item.color }} />
                <span>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            <Building2 size={18} />
            Salary Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salaryRanges}>
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            <Building2 size={18} />
            Top 10 Depots by Employees
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={branchPerformance} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
              <Tooltip />
              <Bar dataKey="employees" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.summarySection}>
        <h3 style={styles.sectionTitle}>
          <FileText size={18} />
          Compliance Summary
        </h3>
        <div style={styles.complianceGrid}>
          <div style={styles.complianceCard}>
            <h4>PF Enrolled</h4>
            <div style={styles.progressBar}>
              <div 
                style={{ 
                  ...styles.progress, 
                  width: `${(stats.pfEnabled / stats.activeEmployees) * 100}%`,
                  background: '#10b981'
                }} 
              />
            </div>
            <p>{stats.pfEnabled} / {stats.activeEmployees} employees</p>
            <span style={styles.percentage}>{Math.round((stats.pfEnabled / stats.activeEmployees) * 100)}%</span>
          </div>
          <div style={styles.complianceCard}>
            <h4>ESIC Enrolled</h4>
            <div style={styles.progressBar}>
              <div 
                style={{ 
                  ...styles.progress, 
                  width: `${(stats.esicEnabled / stats.activeEmployees) * 100}%`,
                  background: '#3b82f6'
                }} 
              />
            </div>
            <p>{stats.esicEnabled} / {stats.activeEmployees} employees</p>
            <span style={styles.percentage}>{Math.round((stats.esicEnabled / stats.activeEmployees) * 100)}%</span>
          </div>
        </div>
      </div>

      <div style={styles.tableSection}>
        <h3 style={styles.sectionTitle}>
          <CalendarDays size={18} />
          Department Breakdown
        </h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Active</th>
              <th style={styles.th}>Inactive</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Avg. Salary</th>
            </tr>
          </thead>
          <tbody>
            {departmentData.map((dept, index) => {
              const deptEmployees = employees.filter(e => e.department === dept.name);
              const avgSalary = deptEmployees.filter(e => e.status === 'ACTIVE').length > 0
                ? Math.round(deptEmployees.filter(e => e.status === 'ACTIVE').reduce((sum, e) => sum + e.salary, 0) / 
                    deptEmployees.filter(e => e.status === 'ACTIVE').length)
                : 0;
              return (
                <tr key={index} style={styles.tr}>
                  <td style={styles.td}>{dept.name}</td>
                  <td style={styles.td}>{dept.active}</td>
                  <td style={styles.td}>{dept.inactive}</td>
                  <td style={styles.td}>{dept.active + dept.inactive}</td>
                  <td style={styles.td}>₹{(avgSalary / 1000).toFixed(1)}K</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
  headerActions: { display: 'flex', gap: '12px' },
  select: { padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: '#fff' },
  exportBtn: { padding: '10px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { background: '#fff', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statIcon: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '13px', color: '#64748b', margin: '0 0 4px' },
  statValue: { fontSize: '24px', fontWeight: '600', color: '#0f172a', margin: 0 },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '24px' },
  chartCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  chartTitle: { fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' },
  legend: { display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
  summarySection: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' },
  sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' },
  complianceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  complianceCard: { padding: '16px', background: '#f8fafc', borderRadius: '8px' },
  progressBar: { height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px', overflow: 'hidden' },
  progress: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
  percentage: { fontSize: '20px', fontWeight: '700', color: '#10b981' },
  tableSection: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#475569' }
};
