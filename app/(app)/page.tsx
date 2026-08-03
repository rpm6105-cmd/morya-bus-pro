'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/context/AuthContext';
import { Bus, Shield, Users, Building2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div style={styles.container}>
      <div style={styles.loadingContent}>
        <div style={styles.logoContainer}>
          <Bus size={48} color="#10b981" />
        </div>
        <h1 style={styles.title}>HRMS Pro</h1>
        <p style={styles.subtitle}>Morya Bus Services</p>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>

      <div style={styles.features}>
        <div style={styles.featureCard}>
          <Users size={32} color="#3b82f6" />
          <h3>40+ Employees</h3>
          <p>Manage workforce across all locations</p>
        </div>
        <div style={styles.featureCard}>
          <Building2 size={32} color="#10b981" />
          <h3>2 Depots</h3>
          <p>Centralized depot management</p>
        </div>
        <div style={styles.featureCard}>
          <Shield size={32} color="#8b5cf6" />
          <h3>Role-based Access</h3>
          <p>1 Admin + 30 HR managers</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '40px',
    textAlign: 'center'
  },
  loadingContent: {
    marginBottom: '60px'
  },
  logoContainer: {
    width: '80px',
    height: '80px',
    background: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px'
  },
  title: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 8px'
  },
  subtitle: {
    fontSize: '18px',
    color: '#10b981',
    margin: '0 0 32px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  },
  features: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  featureCard: {
    padding: '24px',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    width: '200px',
    textAlign: 'center'
  }
};
