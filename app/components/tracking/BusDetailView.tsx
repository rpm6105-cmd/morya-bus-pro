'use client';

import React from 'react';
import { Bus } from '../../lib/services/busTrackingService';
import { 
  X, 
  MapPin, 
  User, 
  Phone, 
  Star, 
  Navigation, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  History
} from 'lucide-react';

interface BusDetailViewProps {
  bus: Bus;
  onClose: () => void;
}

const BusDetailView: React.FC<BusDetailViewProps> = ({ bus, onClose }) => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      right: 0, 
      width: '450px', 
      height: '100vh', 
      background: 'white', 
      boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', 
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <div style={{ 
        padding: '1.5rem', 
        borderBottom: '1px solid var(--border)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'var(--primary)',
        color: 'white'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{bus.id} Details</h2>
          <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>{bus.routeName}</p>
        </div>
        <button 
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '0.5rem', color: 'white', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {/* Real-time Status Banner */}
        <div style={{ 
          background: bus.status === 'Moving' ? '#ecfdf5' : bus.status === 'Delayed' ? '#fffbeb' : '#f8fafc',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: `1px solid ${bus.status === 'Moving' ? '#10b981' : bus.status === 'Delayed' ? '#f59e0b' : '#64748b'}30`
        }}>
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Current Status</p>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: 800, 
              color: bus.status === 'Moving' ? '#10b981' : bus.status === 'Delayed' ? '#f59e0b' : '#64748b' 
            }}>
              {bus.status}
            </h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Speed</p>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{bus.speed} km/h</h3>
          </div>
        </div>

        {/* Driver Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--accent)" /> Driver Information
          </h4>
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <User size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{bus.driver.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={12} /> {bus.driver.phone}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={12} fill="#f59e0b" color="#f59e0b" /> {bus.driver.rating}
                </span>
              </div>
            </div>
            <div style={{ background: '#10b98115', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
              VERIFIED
            </div>
          </div>
        </div>

        {/* Route Timeline */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={18} color="var(--primary)" /> Route Progress
          </h4>
          <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
            <div style={{ position: 'absolute', left: '4px', top: '10px', bottom: '10px', width: '2px', background: '#e2e8f0' }} />
            
            {bus.routeDetails?.stops.map((stop, index) => (
              <div key={stop.id} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '-20px', 
                  top: '4px', 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  background: stop.isCompleted ? '#10b981' : 'white',
                  border: `2px solid ${stop.isCompleted ? '#10b981' : '#cbd5e1'}`,
                  zIndex: 2
                }} />
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: stop.isCompleted ? 'var(--text)' : '#64748b' }}>{stop.name}</p>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {stop.isCompleted ? 'Completed' : `Estimated: ${stop.eta}`}
                  </p>
                </div>
              </div>
            ))}

            {!bus.routeDetails && (
              <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                Full route stop data is pending for this temporary route.
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', marginBottom: '0.5rem' }}>
              <Clock size={14} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>ETA</span>
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 800 }}>{bus.eta}</p>
          </div>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', marginBottom: '0.5rem' }}>
              <History size={14} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Last Update</span>
            </div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              {new Date(bus.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: '#f8fafc' }}>
        <button 
          className="btn btn-primary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          onClick={() => alert('Feature coming soon: Direct Driver Alert')}
        >
          <ShieldCheck size={18} />
          Emergency Contact
        </button>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default BusDetailView;
