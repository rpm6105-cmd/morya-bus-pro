'use client';

import React from 'react';
import { Bus, BusStatus } from '../../lib/services/busTrackingService';
import { 
  MapPin, 
  User, 
  Clock, 
  ArrowRight, 
  Navigation, 
  Eye,
  AlertCircle,
  CheckCircle2,
  Activity
} from 'lucide-react';

interface BusCardProps {
  bus: Bus;
  onTrackLive: (bus: Bus) => void;
  onViewDetails: (bus: Bus) => void;
}

const BusCard: React.FC<BusCardProps> = ({ bus, onTrackLive, onViewDetails }) => {
  const getStatusConfig = (status: BusStatus) => {
    switch (status) {
      case 'Moving':
        return { color: '#10b981', bg: '#ecfdf5', icon: Activity };
      case 'Delayed':
        return { color: '#f59e0b', bg: '#fffbeb', icon: AlertCircle };
      case 'Stopped':
        return { color: '#64748b', bg: '#f8fafc', icon: CheckCircle2 };
      default:
        return { color: '#64748b', bg: '#f8fafc', icon: CheckCircle2 };
    }
  };

  const statusConfig = getStatusConfig(bus.status);

  return (
    <div className="card" style={{ 
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: bus.status === 'Moving' ? '1px solid #10b98130' : '1px solid var(--border)',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{bus.id}</h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{bus.routeName}</p>
        </div>
        <div style={{ 
          background: statusConfig.bg, 
          color: statusConfig.color, 
          padding: '4px 10px', 
          borderRadius: '20px', 
          fontSize: '0.7rem', 
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <statusConfig.icon size={12} />
          {bus.status.toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ color: 'var(--accent)', background: 'var(--accent-light)', padding: '6px', borderRadius: '8px' }}>
            <User size={16} />
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Driver</p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{bus.driver.name}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ color: 'var(--primary)', background: '#f1f5f9', padding: '6px', borderRadius: '8px' }}>
            <MapPin size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Current Location</p>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bus.location.name || `${bus.location.lat.toFixed(4)}, ${bus.location.lng.toFixed(4)}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#64748b" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ETA: {bus.eta}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Navigation size={14} color="#64748b" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{bus.speed} km/h</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button 
          onClick={() => onTrackLive(bus)}
          className="btn btn-primary"
          style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            fontSize: '0.8rem',
            padding: '0.6rem'
          }}
        >
          <Activity size={14} />
          Track Live
        </button>
        <button 
          onClick={() => onViewDetails(bus)}
          style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            fontSize: '0.8rem',
            padding: '0.6rem',
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          <Eye size={14} />
          Details
        </button>
      </div>
    </div>
  );
};

export default BusCard;
