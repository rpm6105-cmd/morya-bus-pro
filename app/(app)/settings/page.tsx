'use client';

import React from 'react';
import { useStore } from '../../lib/context/StoreContext';
import { 
  Settings, 
  Database, 
  ShieldCheck, 
  MonitorOff, 
  Trash2, 
  RefreshCcw,
  Zap,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const { isDemoMode, setDemoMode, resetData, role, setRole } = useStore();

  return (
    <div>
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>System Configuration</h2>
        <p className="text-muted">Global settings for Morya Bus Depot HRMS Pro platform.</p>
      </header>

      <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
        {/* Environment Control */}
        <div className="card">
           <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <MonitorOff size={20} color="var(--accent)" /> Environment Mode
           </h3>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <div>
                 <p style={{ fontWeight: 800, fontSize: '1rem' }}>Demo Mode</p>
                 <p className="text-muted" style={{ fontSize: '0.75rem' }}>Currently using local storage and mock data.</p>
              </div>
              <div style={{ position: 'relative', width: '50px', height: '24px' }}>
                 <input 
                    type="checkbox" 
                    checked={isDemoMode}
                    onChange={(e) => setDemoMode(e.target.checked)}
                    style={{ cursor: 'pointer', width: '100%', height: '100%', opacity: 0, zIndex: 2, position: 'absolute' }} 
                 />
                 <div style={{ 
                    position: 'absolute', inset: 0, background: isDemoMode ? 'var(--accent)' : '#cbd5e1', 
                    borderRadius: '20px', transition: 'background 0.2s' 
                 }}>
                    <div style={{ 
                       width: '18px', height: '18px', background: 'white', borderRadius: '50%',
                       position: 'absolute', top: '3px', left: isDemoMode ? '29px' : '3px', transition: 'left 0.2s'
                    }}></div>
                 </div>
              </div>
           </div>

           <div style={{ display: 'flex', gap: '1rem', background: 'var(--accent-light)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--accent)' }}>
              <Info size={18} color="#065f46" />
              <p style={{ fontSize: '0.75rem', color: '#065f46' }}>In <strong>Demo Mode</strong>, all PII is mocked and data is local to your browser. Re-sync with production APIs is disabled.</p>
           </div>
        </div>

        {/* Access Control */}
        <div className="card">
           <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <ShieldCheck size={20} color="var(--primary)" /> Role Simulator
           </h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <button 
                className={`btn ${role === 'ADMIN' ? 'btn-primary' : 'btn-outline'}`}
                style={{ height: '60px', justifyContent: 'space-between', padding: '0 1.5rem' }}
                onClick={() => setRole('ADMIN')}
              >
                 <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: 800 }}>Full Administrator</p>
                    <p style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.8 }}>Master access to salary, payroll, and users.</p>
                 </div>
                 {role === 'ADMIN' && <Zap size={18} />}
              </button>
              <button 
                 className={`btn ${role === 'HR' ? 'btn-primary' : 'btn-outline'}`}
                 style={{ height: '60px', justifyContent: 'space-between', padding: '0 1.5rem' }}
                 onClick={() => setRole('HR')}
              >
                 <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: 800 }}>HR Management</p>
                    <p style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.8 }}>Restricted view for PII and salary editing.</p>
                 </div>
                 {role === 'HR' && <Zap size={18} />}
              </button>
           </div>
        </div>

        {/* Database Hygiene */}
        <div className="card" style={{ border: '1px solid #fee2e2' }}>
           <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Database size={20} color="#ef4444" /> Data Management
           </h3>
           <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Permanently purge all local data and reload original demonstration seeds. This action cannot be undone.
           </p>
           <button 
              className="btn btn-primary" 
              style={{ background: '#ef4444', border: 'none', width: '100%', height: '50px' }}
              onClick={() => {
                if(confirm('Are you sure you want to reset all data?')) {
                  resetData();
                }
              }}
           >
              <RefreshCcw size={18} /> Purge & Reset Platform
           </button>
        </div>

        {/* System Info */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', background: 'var(--primary)', color: 'white' }}>
           <Settings size={48} color="var(--accent)" style={{ marginBottom: '1.5rem' }} />
           <p style={{ fontWeight: 800, fontSize: '1.2rem' }}>MORYA HRMS PRO v1.2</p>
           <p style={{ opacity: 0.7, fontSize: '0.75rem', marginTop: '0.5rem' }}>Build ID: 2024.04.04-PRO</p>
           <div style={{ marginTop: '2rem', fontSize: '0.65rem', padding: '0.5rem 1rem', background: 'var(--accent)', borderRadius: '20px', fontWeight: 800 }}>SELLABLE PRODUCT CORE</div>
        </div>
      </div>
    </div>
  );
}
