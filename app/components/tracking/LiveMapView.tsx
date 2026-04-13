'use client';

import React, { useMemo } from 'react';
import { Bus } from '../../lib/services/busTrackingService';
import { Navigation, MapPin } from 'lucide-react';

interface LiveMapViewProps {
  buses: Bus[];
  selectedBusId?: string;
}

const LiveMapView: React.FC<LiveMapViewProps> = ({ buses, selectedBusId }) => {
  // Simulate a map coordinate space (normalized 0-100)
  // In a real app, this would be a Google Maps or Mapbox component
  
  const mapBuses = useMemo(() => {
    return buses.map(bus => {
      // Normalize lat/lng to a 0-100 range for the demo box
      // Using Mumbai-ish coordinates as reference
      const latMin = 18.9; 
      const latMax = 21.2;
      const lngMin = 72.8;
      const lngMax = 79.2;

      const x = ((bus.location.lng - lngMin) / (lngMax - lngMin)) * 100;
      const y = 100 - ((bus.location.lat - latMin) / (latMax - latMin)) * 100;

      return {
        ...bus,
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y))
      };
    });
  }, [buses]);

  return (
    <div className="card" style={{ 
      height: '400px', 
      background: '#f1f5f9', 
      position: 'relative', 
      overflow: 'hidden',
      border: '1px solid var(--border)',
      backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
      backgroundSize: '20px 20px'
    }}>
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10 }}>
        <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', boxShadow: 'var(--shadow)', fontSize: '0.75rem', fontWeight: 600 }}>
          Live Fleet Visualization
        </div>
      </div>

      {/* Grid lines or abstract map features */}
      <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
        {/* Abstract road simulation */}
        <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '4px', background: '#e2e8f0' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, width: '4px', height: '100%', background: '#e2e8f0' }} />
      </div>

      {mapBuses.map((bus) => {
        const isSelected = bus.id === selectedBusId;
        const color = bus.status === 'Moving' ? '#10b981' : bus.status === 'Delayed' ? '#f59e0b' : '#64748b';
        
        return (
          <div 
            key={bus.id}
            style={{
              position: 'absolute',
              left: `${bus.x}%`,
              top: `${bus.y}%`,
              transform: 'translate(-50%, -50%)',
              transition: 'all 3s linear',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: isSelected ? 20 : 10
            }}
          >
            <div style={{
              background: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.6rem',
              fontWeight: 800,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              border: isSelected ? `2px solid ${color}` : '1px solid #e2e8f0'
            }}>
              {bus.id}
            </div>
            
            <div style={{
              width: isSelected ? '24px' : '16px',
              height: isSelected ? '24px' : '16px',
              background: color,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: `0 0 10px ${color}50`,
              animation: bus.status === 'Moving' ? 'pulse 2s infinite' : 'none'
            }}>
              <Navigation size={isSelected ? 14 : 10} style={{ transform: 'rotate(45deg)' }} />
            </div>

            {isSelected && (
              <div style={{
                position: 'absolute',
                top: '100%',
                marginTop: '4px',
                background: 'rgba(15, 23, 42, 0.9)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.65rem',
                whiteSpace: 'nowrap'
              }}>
                {bus.speed} km/h • {bus.location.name}
              </div>
            )}
          </div>
        );
      })}

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Map Legend */}
      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'white', padding: '0.5rem', borderRadius: '8px', boxShadow: 'var(--shadow)', display: 'flex', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> MOVING
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> DELAYED
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} /> STOPPED
        </div>
      </div>
    </div>
  );
};

export default LiveMapView;
