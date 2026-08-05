'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, 
  Users, 
  Calculator, 
  MapPin, 
  Building2,
  FileText, 
  FileSpreadsheet,
  Settings, 
  UserCircle,
  LogOut,
  Shield,
  Bus,
  BarChart3,
  UserCog,
  Clock,
  Calendar,
  Menu,
  X,
  ClipboardCheck,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../lib/context/AuthContext';
import { dataService } from '../../lib/services/dataService';

const Sidebar = ({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setPendingApprovals(isAdmin ? dataService.getPendingChangeRequests().length : 0);
    };
    updateCount();
    window.addEventListener('hrms-approvals-updated', updateCount);
    return () => window.removeEventListener('hrms-approvals-updated', updateCount);
  }, [isAdmin]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const adminMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Employees', icon: Users, path: '/employees' },
    { name: 'Attendance', icon: Calendar, path: '/attendance' },
    { name: 'Overtime', icon: Clock, path: '/overtime' },
    { name: 'Payroll', icon: Calculator, path: '/payroll' },
    { name: 'Salary Sheet', icon: FileSpreadsheet, path: '/salary-sheet' },
    { name: 'Depots', icon: Building2, path: '/depots' },
    { name: 'Approvals', icon: ClipboardCheck, path: '/approvals' },
    { name: 'Reports', icon: BarChart3, path: '/reports' },
    { name: 'User Management', icon: UserCog, path: '/users' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const hrMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Employees', icon: Users, path: '/employees' },
    { name: 'Attendance', icon: Calendar, path: '/attendance' },
    { name: 'Overtime', icon: Clock, path: '/overtime' },
    { name: 'Salary Sheet', icon: FileSpreadsheet, path: '/salary-sheet' },
    { name: 'My Requests', icon: ClipboardCheck, path: '/approvals' },
    { name: 'Reports', icon: BarChart3, path: '/reports' },
  ];

  const menuItems = isAdmin ? adminMenuItems : hrMenuItems;

  return (
    <>
      {isMobile && (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'fixed',
            top: '12px',
            left: '12px',
            zIndex: 1100,
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: '#0f172a',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {isOpen ? <X size={22} color="#fff" /> : <Menu size={22} color="#fff" />}
        </button>
      )}

      {isMobile && isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
          }}
        />
      )}

      <aside 
        className="sidebar-component"
        style={{
          ...styles.sidebar,
          transform: collapsed && !isMobile ? 'translateX(-260px)' : (isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-260px)') : 'translateX(0)'),
          zIndex: 1050,
          transition: 'transform 0.3s ease',
        }}
      >
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bus size={24} color="#10b981" />
              HRMS <span style={{ color: '#10b981', fontSize: '0.75rem' }}>PRO</span>
            </h1>
            <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', marginTop: '0.25rem' }}>
              MORYA BUS SERVICES
            </p>
          </div>
          {!isMobile && onToggle && (
            <button onClick={onToggle} title="Collapse sidebar" style={styles.collapseBtn}>
              <ChevronLeft size={16} color="#94a3b8" />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <li key={item.name} style={{ marginBottom: '0.25rem' }}>
                  <Link 
                    href={item.path} 
                    style={{
                      ...styles.navLink,
                      background: isActive ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.25), rgba(16, 185, 129, 0.08))' : 'transparent',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      fontWeight: isActive ? 700 : 400,
                      borderLeft: isActive ? '4px solid #10b981' : '4px solid transparent',
                      boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                      textDecoration: 'none',
                    }}
                  >
                    <Icon size={18} style={{ color: isActive ? '#10b981' : 'inherit' }} />
                    {item.name}
                    {item.path === '/approvals' && isAdmin && pendingApprovals > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: '#ef4444',
                        color: '#fff',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        minWidth: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 5px'
                      }}>
                        {pendingApprovals}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem 0' }}>
          <div style={styles.userCard}>
            <div style={styles.userHeader}>
              <div style={styles.userAvatar}>
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div style={styles.userInfo}>
                <p style={styles.userName}>{user?.name?.split(' ')[0] || 'User'}</p>
                <p style={styles.userRole}>
                  <Shield size={10} /> {isAdmin ? 'Administrator' : 'HR Manager'}
                </p>
              </div>
            </div>
            
            {isAdmin ? (
              <div style={styles.depotBadge}>
                <MapPin size={12} />
                <span>All Depots</span>
              </div>
            ) : user?.depotId ? (
              <div style={styles.depotBadge}>
                <MapPin size={12} />
                <span>{dataService.getBranchById(user.depotId)?.name || 'Unknown Depot'}</span>
              </div>
            ) : null}

            <div style={styles.userActions}>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '260px',
    minWidth: '260px',
    height: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    fontSize: '0.875rem',
  },
  userCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '1rem',
  },
  userHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #10b981, #3b82f6)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    margin: 0,
  },
  userRole: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    margin: '2px 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  depotBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: 'rgba(16, 185, 129, 0.15)',
    borderRadius: '4px',
    fontSize: '0.65rem',
    color: '#10b981',
    fontWeight: 500,
    marginBottom: '0.75rem',
  },
  userActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  collapseBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    fontSize: '0.75rem',
    color: '#ef4444',
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default Sidebar;
