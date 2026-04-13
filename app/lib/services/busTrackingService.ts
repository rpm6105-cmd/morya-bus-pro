/**
 * Bus Tracking Service
 * 
 * This service manages real-time simulation of bus positions, statuses, and updates.
 * In a production environment, this would be replaced by WebSocket connections
 * or a real-time GPS gateway (e.g., Azure Maps, Google Cloud Tracks, or custom GPS API).
 */

export type BusStatus = 'Moving' | 'Stopped' | 'Delayed';

export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface Stop {
  id: string;
  name: string;
  isCompleted: boolean;
  eta?: string;
}

export interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  stops: Stop[];
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
}

export interface Bus {
  id: string;
  routeName: string;
  routeId: string;
  driverId: string;
  driver: Driver;
  status: BusStatus;
  location: Location;
  destination: string;
  eta: string;
  speed: number; // km/h
  lastUpdated: string;
  routeDetails?: Route;
}

const MOCK_DRIVERS: Driver[] = [
  { id: 'D1', name: 'Rajesh Kumar', phone: '+91 98765-43210', rating: 4.8 },
  { id: 'D2', name: 'Suresh Patil', phone: '+91 87654-32109', rating: 4.5 },
  { id: 'D3', name: 'Amit Singh', phone: '+91 76543-21098', rating: 4.9 },
  { id: 'D4', name: 'Vikram Mehta', phone: '+91 91234-56789', rating: 4.2 },
  { id: 'D5', name: 'Pankaj Deshmukh', phone: '+91 82345-67890', rating: 4.7 }
];

const MOCK_ROUTES: Route[] = [
  { 
    id: 'R1', 
    name: 'North Corridor Exp', 
    origin: 'Central Station', 
    destination: 'North Terminal',
    stops: [
      { id: 'S1', name: 'Central Station', isCompleted: true },
      { id: 'S2', name: 'Market Square', isCompleted: true },
      { id: 'S3', name: 'Industrial Hub', isCompleted: false, eta: '10:15 AM' },
      { id: 'S4', name: 'North Terminal', isCompleted: false, eta: '10:45 AM' }
    ]
  },
  { 
    id: 'R2', 
    name: 'Seaside Link', 
    origin: 'Beach Road', 
    destination: 'City Port',
    stops: [
      { id: 'S5', name: 'Beach Road', isCompleted: true },
      { id: 'S6', name: 'Cruise Terminal', isCompleted: false, eta: '11:20 AM' },
      { id: 'S7', name: 'City Port', isCompleted: false, eta: '11:50 AM' }
    ]
  }
];

class BusTrackingService {
  private buses: Bus[] = [];
  private listeners: ((buses: Bus[]) => void)[] = [];
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeBuses();
  }

  private initializeBuses() {
    this.buses = [
      {
        id: 'MB-101',
        routeName: 'North Corridor Exp',
        routeId: 'R1',
        driverId: 'D1',
        driver: MOCK_DRIVERS[0],
        status: 'Moving',
        location: { lat: 19.0330, lng: 73.0297, name: 'Market Square' },
        destination: 'North Terminal',
        eta: '12 mins',
        speed: 45,
        lastUpdated: new Date().toISOString(),
        routeDetails: MOCK_ROUTES[0]
      },
      {
        id: 'MB-202',
        routeName: 'Seaside Link',
        routeId: 'R2',
        driverId: 'D2',
        driver: MOCK_DRIVERS[1],
        status: 'Stopped',
        location: { lat: 18.9218, lng: 72.8347, name: 'Gateway Plaza' },
        destination: 'City Port',
        eta: '25 mins',
        speed: 0,
        lastUpdated: new Date().toISOString(),
        routeDetails: MOCK_ROUTES[1]
      },
      {
        id: 'MB-305',
        routeName: 'Nagpur Connect',
        routeId: 'R3',
        driverId: 'D3',
        driver: MOCK_DRIVERS[2],
        status: 'Delayed',
        location: { lat: 21.1458, lng: 79.0882, name: 'Orange City Crossing' },
        destination: 'Nagpur Central Depot',
        eta: '45 mins',
        speed: 38,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'MB-440',
        routeName: 'Airport Shuttle',
        routeId: 'R4',
        driverId: 'D4',
        driver: MOCK_DRIVERS[3],
        status: 'Moving',
        location: { lat: 19.0896, lng: 72.8656, name: 'Terminal 2 Entry' },
        destination: 'Inter-State Terminal',
        eta: '8 mins',
        speed: 55,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'MB-510',
        routeName: 'South Hub Loop',
        routeId: 'R5',
        driverId: 'D5',
        driver: MOCK_DRIVERS[4],
        status: 'Moving',
        location: { lat: 18.9750, lng: 72.8258, name: 'Heritage Circle' },
        destination: 'South Depot',
        eta: '15 mins',
        speed: 42,
        lastUpdated: new Date().toISOString()
      }
    ];
  }

  // مستقبل: Replace with real GPS API / WebSocket service
  public subscribe(callback: (buses: Bus[]) => void) {
    this.listeners.push(callback);
    callback(this.buses);

    if (!this.interval) {
      this.startSimulation();
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      if (this.listeners.length === 0 && this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    };
  }

  private startSimulation() {
    this.interval = setInterval(() => {
      this.buses = this.buses.map(bus => {
        if (bus.status === 'Stopped') {
          // 10% chance to start moving
          if (Math.random() > 0.9) {
            return {
              ...bus,
              status: 'Moving',
              speed: 20 + Math.floor(Math.random() * 30),
              lastUpdated: new Date().toISOString()
            };
          }
          return bus;
        }

        // Small random movement simulation
        const latChange = (Math.random() - 0.5) * 0.001;
        const lngChange = (Math.random() - 0.5) * 0.001;
        
        // 5% chance to change status
        let newStatus: BusStatus = bus.status;
        let newSpeed = bus.speed;
        
        const rand = Math.random();
        if (rand > 0.95) {
          newStatus = 'Stopped';
          newSpeed = 0;
        } else if (rand > 0.90) {
          newStatus = 'Delayed';
          newSpeed = 15 + Math.floor(Math.random() * 10);
        } else if (bus.status === 'Delayed' && rand < 0.1) {
          newStatus = 'Moving';
          newSpeed = 35 + Math.floor(Math.random() * 15);
        }

        return {
          ...bus,
          status: newStatus,
          speed: newSpeed,
          location: {
            ...bus.location,
            lat: bus.location.lat + latChange,
            lng: bus.location.lng + lngChange
          },
          lastUpdated: new Date().toISOString(),
          eta: `${Math.max(2, parseInt(bus.eta) + (Math.random() > 0.5 ? 1 : -1))} mins`
        };
      });

      this.listeners.forEach(l => l(this.buses));
    }, 3000);
  }

  public getBuses() {
    return this.buses;
  }

  public getBusById(id: string) {
    return this.buses.find(b => b.id === id);
  }

  // Demo only: Add a mock bus
  public addBus(routeName: string) {
    const id = `MB-${Math.floor(100 + Math.random() * 900)}`;
    const newBus: Bus = {
      id,
      routeName,
      routeId: 'RX',
      driverId: 'D1',
      driver: MOCK_DRIVERS[0],
      status: 'Moving',
      location: { lat: 19.0760, lng: 72.8777, name: 'New Entry Point' },
      destination: 'Central Transit',
      eta: '20 mins',
      speed: 40,
      lastUpdated: new Date().toISOString()
    };
    this.buses = [...this.buses, newBus];
    this.listeners.forEach(l => l(this.buses));
    return newBus;
  }
}

export const busTrackingService = new BusTrackingService();
