'use client';

import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import {
  Users, Building2, Wallet, CalendarCheck, TrendingUp,
  ChevronRight, Bus, UserCheck, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalDepots: 0,
    monthlyPayroll: 0,
    avgSalary: 0,
    pendingLeaves: 0,
    departmentData: [] as { name: string; count: number }[],
    genderData: [] as { name: string; value: number; color: string }[],
    depotData: [] as { name: string; employees: number }[]
  });
  const [recentActivity, setRecentActivity] = useState<{ id: number; action: string; user: string; time: string; icon: typeof Bus; color: string }[]>([]);

  const loadStats = useCallback(() => {
    const branches = dataService.getBranches();
    const employees = isAdmin ? dataService.getEmployees() : dataService.getEmployees(user?.depotId);
    const leaves = dataService.getLeaveRequests(undefined, 'PENDING');

    const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
    const totalSalary = activeEmployees.reduce((sum, e) => sum + e.salary, 0);

    const departments = [...new Set(employees.map(e => e.department))];
    const departmentData = departments.map(dept => ({
      name: dept,
      count: employees.filter(e => e.department === dept && e.status === 'ACTIVE').length
    }));

    const maleCount = employees.filter(e => e.gender === 'MALE').length;
    const femaleCount = employees.filter(e => e.gender === 'FEMALE').length;
    const otherCount = employees.filter(e => e.gender === 'OTHER').length;

    const depotData = branches.slice(0, 10).map(branch => ({
      name: branch.code,
      employees: employees.filter(e => e.branchId === branch.id && e.status === 'ACTIVE').length
    }));

    setStats({
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      totalDepots: isAdmin ? branches.length : 1,
      monthlyPayroll: totalSalary,
      avgSalary: activeEmployees.length > 0 ? totalSalary / activeEmployees.length : 0,
      pendingLeaves: leaves.length,
      departmentData,
      genderData: [
        { name: 'Male', value: maleCount, color: '#3b82f6' },
        { name: 'Female', value: femaleCount, color: '#ec4899' },
        { name: 'Other', value: otherCount, color: '#8b5cf6' }
      ],
      depotData
    });

    setRecentActivity([
      { id: 1, action: 'New employee onboarded', user: 'HR Mumbai', time: '2 hours ago', icon: UserCheck, color: '#10b981' },
      { id: 2, action: 'Payroll processed', user: 'Admin', time: '5 hours ago', icon: Wallet, color: '#3b82f6' },
      { id: 3, action: 'Leave request approved', user: 'HR Pune', time: '6 hours ago', icon: CalendarCheck, color: '#f59e0b' },
      { id: 4, action: 'Attendance marked', user: 'HR Nagpur', time: '8 hours ago', icon: Clock, color: '#6366f1' },
      { id: 5, action: 'New depot added', user: 'Admin', time: '1 day ago', icon: Building2, color: '#8b5cf6' }
    ]);
  }, [user, isAdmin]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statCards = [
    { label: 'Total Employees', value: stats.totalEmployees.toLocaleString(), icon: Users, color: '#3b82f6', trend: '+12%' },
    { label: 'Active Employees', value: stats.activeEmployees.toLocaleString(), icon: UserCheck, color: '#10b981', trend: '+8%' },
    { label: 'Depots', value: stats.totalDepots.toString(), icon: Building2, color: '#8b5cf6', trend: '30' },
    { label: 'Monthly Payroll', value: formatCurrency(stats.monthlyPayroll), icon: Wallet, color: '#f59e0b', trend: '' },
    { label: 'Avg. Salary', value: formatCurrency(stats.avgSalary), icon: TrendingUp, color: '#ec4899', trend: '' },
    { label: 'Pending Leaves', value: stats.pendingLeaves.toString(), icon: Clock, color: '#ef4444', trend: '' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p style={styles.subtitle}>
            {isAdmin ? 'System Administrator Dashboard' : `HR Dashboard - ${user?.depotId?.replace('depot-', 'Depot ')}`}
          </p>
        </div>
        <div style={styles.headerActions}>
          <span style={styles.dateBadge}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div style={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <div key={index} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${stat.color}15` }}>
              <stat.icon size={24} color={stat.color} />
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>{stat.label}</p>
              <p style={styles.statValue}>{stat.value}</p>
            </div>
            {stat.trend && (
              <span style={{ ...styles.statTrend, color: stat.color }}>
                {stat.trend}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Employees by Department</h3>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.departmentData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Employees by Gender</h3>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={styles.legendContainer}>
              {stats.genderData.map((item, index) => (
                <div key={index} style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: item.color }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Top 10 Depots by Employees</h3>
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.depotData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="employees" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div style={styles.bottomGrid}>
        <div style={styles.activityCard}>
          <h3 style={styles.chartTitle}>Recent Activity</h3>
          <div style={styles.activityList}>
            {recentActivity.map((activity, index) => (
              <div key={activity.id} style={styles.activityItem}>
                <div style={{ ...styles.activityIcon, background: `${activity.color}15` }}>
                  <activity.icon size={18} color={activity.color} />
                </div>
                <div style={styles.activityContent}>
                  <p style={styles.activityAction}>{activity.action}</p>
                  <p style={styles.activityMeta}>{activity.user} • {activity.time}</p>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </div>
            ))}
          </div>
        </div>

        <div style={styles.quickActions}>
          <h3 style={styles.chartTitle}>Quick Actions</h3>
          <div style={styles.actionsGrid}>
            <button style={styles.actionButton}>
              <UserCheck size={20} />
              <span>Add Employee</span>
            </button>
            <button style={styles.actionButton}>
              <Wallet size={20} />
              <span>Process Payroll</span>
            </button>
            <button style={styles.actionButton}>
              <CalendarCheck size={20} />
              <span>Approve Leaves</span>
            </button>
            <button style={styles.actionButton}>
              <Bus size={20} />
              <span>View Depots</span>
            </button>
          </div>
        </div>
      </div>
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
    marginBottom: '32px'
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
    gap: '12px',
    alignItems: 'center'
  },
  dateBadge: {
    padding: '8px 16px',
    background: '#f1f5f9',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#64748b'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  statCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'relative'
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statContent: {
    flex: 1
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 4px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#0f172a',
    margin: 0
  },
  statTrend: {
    fontSize: '12px',
    fontWeight: '500',
    position: 'absolute',
    top: '12px',
    right: '12px'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  chartCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 20px'
  },
  chartContainer: {
    position: 'relative'
  },
  legendContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '16px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#64748b'
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  activityCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px'
  },
  activityIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  activityContent: {
    flex: 1
  },
  activityAction: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#0f172a',
    margin: '0 0 2px'
  },
  activityMeta: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0
  },
  quickActions: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#475569',
    fontSize: '13px',
    fontWeight: '500'
  }
};
