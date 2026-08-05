'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/context/StoreContext';
import { 
  MapPin, 
  User, 
  Building2, 
  Plus, 
  ArrowRight, 
  Percent, 
  CircleDollarSign,
  Briefcase,
  History,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../lib/context/AuthContext';
import Tooltip from '../../components/ui/Tooltip';

export default function BranchesPage() {
  const { branches, employees, updateBranch } = useStore();
  const { isAdmin } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const branchEmployees = employees.filter(e => e.branchId === selectedBranchId);

  const handleUpdateIncentive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    updateBranch(selectedBranch);
    setSelectedBranchId(null);
  };

  return (
    <div>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Depot Hub Management</h2>
          <p className="text-muted">Configure branch-level incentives and operational logistics.</p>
        </div>
        <button className="btn btn-primary" onClick={() => toast.error('Creation restricted in Demo')}>
          <Plus size={18} /> New Depot Hub
        </button>
      </header>

      <div className="grid grid-cols-4">
        {branches.map((branch) => {
          const empCount = employees.filter(e => e.branchId === branch.id).length;
          return (
            <div 
              key={branch.id} 
              className="card" 
              style={{ cursor: 'pointer', border: selectedBranchId === branch.id ? '2px solid var(--accent)' : '1px solid var(--border)' }}
              onClick={() => setSelectedBranchId(branch.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '12px', color: 'var(--primary)' }}>
                   <Building2 size={24} />
                </div>
                <div style={{ textAlign: 'right' }}>
                   <span className="tag tag-success" style={{ fontSize: '0.6rem' }}>OPERATIONAL</span>
                   <p className="text-muted" style={{ fontSize: '0.6rem', marginTop: '0.25rem' }}>{branch.id}</p>
                </div>
              </div>

              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{branch.name}</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                    <User size={14} color="var(--text-muted)" /> <span>{branch.manager}</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                    <Briefcase size={14} color="var(--text-muted)" /> <span>{empCount} Personnel</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700 }}>
                    {branch.incentiveType === 'FIXED' ? <CircleDollarSign size={14} /> : <Percent size={14} />} 
                    <span>Incentive: {branch.incentiveType === 'FIXED' ? `₹${branch.incentiveValue}` : `${branch.incentiveValue}%`}</span>
                 </div>
              </div>
              
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: HUB-{branch.id}</span>
                 <ArrowRight size={14} color="var(--text-muted)" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Branch Detail / Incentive Edit Drawer */}
      {selectedBranchId && selectedBranch && (
        <div className="drawer-overlay" onClick={() => setSelectedBranchId(null)}>
           <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
              <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                 <div>
                    <h3 style={{ fontSize: '1.25rem' }}>{selectedBranch.name}</h3>
                    <p className="text-muted">Cluster Logistics & Incentive Hub</p>
                 </div>
                 <Tooltip label="Close">
                  <button style={{ border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setSelectedBranchId(null)} aria-label="Close branch details"><X size={24} /></button>
                 </Tooltip>
              </header>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                 <section className="card" style={{ border: '1px solid var(--accent)', background: 'var(--accent-light)' }}>
                    <h4 style={{ fontSize: '0.875rem', marginBottom: '1.25rem', fontWeight: 800 }}>INCENTIVE CONFIGURATION</h4>
                    <form onSubmit={handleUpdateIncentive} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                       <div>
                          <label className="text-muted" style={{ fontWeight: 700, fontSize: '0.75rem' }}>REWARD TYPE</label>
                          <select 
                             className="input" 
                             disabled={!isAdmin}
                             value={selectedBranch.incentiveType}
                             onChange={(e) => updateBranch({...selectedBranch, incentiveType: e.target.value as any})}
                          >
                             <option value="FIXED">Fixed Amount (₹)</option>
                             <option value="PERCENTAGE">Percentage (%)</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-muted" style={{ fontWeight: 700, fontSize: '0.75rem' }}>VALUE</label>
                          <input 
                             type="number" 
                             className="input" 
                             disabled={!isAdmin}
                             value={selectedBranch.incentiveValue}
                             onChange={(e) => updateBranch({...selectedBranch, incentiveValue: Number(e.target.value)})}
                          />
                       </div>
                       <p className="text-muted" style={{ fontSize: '0.65rem' }}>* {selectedBranch.incentiveType === 'FIXED' ? 'Flat INR' : 'Percentage of base'} added to every employee at this depot hub.</p>
                    </form>
                 </section>

                 <section>
                    <h4 style={{ fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <History size={16} /> Hub Personnel ({branchEmployees.length})
                    </h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                       {branchEmployees.map(e => (
                         <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                               <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{e.name}</p>
                               <p className="text-muted" style={{ fontSize: '0.7rem' }}>{e.department} • {e.id}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                               <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>₹{e.salary.toLocaleString()}</p>
                               <p style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>Base Pay</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </section>

                 <footer style={{ marginTop: 'auto' }}>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSelectedBranchId(null)}>Close Configuration</button>
                 </footer>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
