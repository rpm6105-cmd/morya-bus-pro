'use client';

import React from 'react';
import { Bus } from '../../lib/services/busTrackingService';
import BusCard from './BusCard';

interface BusListProps {
  buses: Bus[];
  onTrackLive: (bus: Bus) => void;
  onViewDetails: (bus: Bus) => void;
}

const BusList: React.FC<BusListProps> = ({ buses, onTrackLive, onViewDetails }) => {
  if (buses.length === 0) {
    return (
      <div style={{ 
        padding: '3rem', 
        textAlign: 'center', 
        background: 'white', 
        borderRadius: '12px', 
        border: '1px dashed var(--border)',
        gridColumn: '1 / -1'
      }}>
        <p style={{ color: '#64748b', fontWeight: 500 }}>No buses found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3" style={{ gap: '1.5rem', width: '100%' }}>
      {buses.map((bus) => (
        <BusCard 
          key={bus.id} 
          bus={bus} 
          onTrackLive={onTrackLive} 
          onViewDetails={onViewDetails} 
        />
      ))}
    </div>
  );
};

export default BusList;
