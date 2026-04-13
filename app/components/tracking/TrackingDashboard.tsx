'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { busTrackingService, Bus, BusStatus } from '../../lib/services/busTrackingService';
import BusList from './BusList';
import LiveMapView from './LiveMapView';
import BusDetailView from './BusDetailView';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Plus, 
  Navigation,
  Activity,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const TrackingDashboard = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [filteredBuses, setFilteredBuses] = useState<Bus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BusStatus | 'All'>('All');
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [showMapView, setShowMapView] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and subscribe to live updates
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = busTrackingService.subscribe((updatedBuses) => {
      setBuses(updatedBuses);
      setIsLoading(false);
      
      // Simulated random notifications
      if (Math.random() > 0.95) {
        const randomBus = updatedBuses[Math.floor(Math.random() * updatedBuses.length)];
        const events = [
          { msg: `${randomBus.id} is delayed by 10 mins near ${randomBus.location.name}`, type: 'warning' },
          { msg: `${randomBus.id} has reached its next stop`, type: 'success' },
          { msg: `Shift update: ${randomBus.driver.name} is now active on ${randomBus.id}`, type: 'info' }
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        if (event.type === 'warning') toast.error(event.msg);
        else if (event.type === 'success') toast.success(event.msg);
        else toast(event.msg);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Search and Filter
  useEffect(() => {
    let result = buses;

    if (searchQuery) {
      result = result.filter(bus => 
        bus.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bus.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bus.driver.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(bus => bus.status === statusFilter);
    }

    setFilteredBuses(result);
  }, [searchQuery, statusFilter, buses]);

  const handleAddBus = () => {
    // Replace with real backend API in production
    const routes = ['Express Hub', 'City Direct', 'Central Link'];
    const randomRoute = routes[Math.floor(Math.random() * routes.length)];
    const newBus = busTrackingService.addBus(randomRoute);
    toast.success(`New bus ${newBus.id} added to the fleet!`);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setBuses([...busTrackingService.getBuses()]);
      setIsLoading(false);
      toast.success('Fleet data refreshed');
    }, 500);
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Real-Time Fleet Tracking</h2>
          <p className="text-muted">Monitoring {buses.length} active buses across all routes.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={handleRefresh}
            style={{ 
              background: 'white', border: '1px solid var(--border)', borderRadius: '8px', 
              padding: '0.6rem', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
            }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Refresh</span>
          </button>
          <button 
            onClick={handleAddBus}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} />
            <span style={{ fontWeight: 600 }}>Deploy New Bus</span>
          </button>
        </div>
      </header>

      {/* Control Bar */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.25rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search by Bus ID, Route, or Driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', 
              border: '1px solid var(--border)', fontSize: '0.9rem', outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Filter size={18} color="#94a3b8" />
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            {['All', 'Moving', 'Stopped', 'Delayed'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter as any)}
                style={{
                  padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 700,
                  background: statusFilter === filter ? 'white' : 'transparent',
                  color: statusFilter === filter ? 'var(--primary)' : '#64748b',
                  boxShadow: statusFilter === filter ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderLeft: '1px solid var(--border)', height: '24px', margin: '0 0.5rem' }} />

        <button
          onClick={() => setShowMapView(!showMapView)}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: 700,
            background: showMapView ? 'var(--accent-light)' : 'white',
            color: showMapView ? 'var(--accent)' : '#64748b',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          {showMapView ? <Activity size={16} /> : <MapPin size={16} />}
          {showMapView ? 'HIDE MAP' : 'SHOW MAP'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Map View Section */}
        {showMapView && (
          <div style={{ gridColumn: '1 / -1' }}>
            <LiveMapView buses={filteredBuses} selectedBusId={selectedBus?.id} />
          </div>
        )}

        {/* Bus List Section */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Fleet Overview
            {filteredBuses.length < buses.length && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: '20px' }}>
                Found {filteredBuses.length} results
              </span>
            )}
          </h3>
          <BusList 
            buses={filteredBuses} 
            onTrackLive={(bus) => {
              setSelectedBus(bus);
              setShowMapView(true);
              toast(`Tracking live position for ${bus.id}`);
            }} 
            onViewDetails={setSelectedBus} 
          />
        </div>
      </div>

      {/* Details View Sidebar */}
      {selectedBus && (
        <BusDetailView 
          bus={selectedBus} 
          onClose={() => setSelectedBus(null)} 
        />
      )}

      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TrackingDashboard;
