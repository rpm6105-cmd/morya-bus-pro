'use client';

import React from 'react';
import { 
  Settings
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div>
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>System Configuration</h2>
        <p className="text-muted">Global settings for Morya Bus Depot HRMS Pro platform.</p>
      </header>

      <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
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
