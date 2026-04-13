'use client';

import { useState } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Bus, Lock, Mail, Eye, EyeOff, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Login successful!');
      router.push('/dashboard');
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  const quickLogin = async (type: 'admin' | 'hr') => {
    setLoading(true);
    if (type === 'admin') {
      const result = await login('admin@moryabuses.com', 'admin123');
      if (result.success) {
        toast.success('Admin login successful!');
        router.push('/dashboard');
      }
    } else {
      const result = await login('hr.D001@moryabuses.com', 'hr001');
      if (result.success) {
        toast.success('HR login successful!');
        router.push('/dashboard');
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel}>
        <div style={styles.brandSection}>
          <div style={styles.logoContainer}>
            <Bus size={48} color="#10b981" />
          </div>
          <h1 style={styles.brandTitle}>HRMS Pro</h1>
          <p style={styles.brandSubtitle}>Morya Bus Services</p>
          <p style={styles.description}>
            Complete HR & Payroll Management System for 30 Depots
          </p>
          <div style={styles.features}>
            <div style={styles.feature}>
              <Shield size={20} color="#10b981" />
              <span>2000+ Employees</span>
            </div>
            <div style={styles.feature}>
              <Bus size={20} color="#10b981" />
              <span>30 Depots</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Welcome Back</h2>
          <p style={styles.formSubtitle}>Sign in to your account</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} color="#64748b" style={styles.inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@moryabuses.com"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} color="#64748b" style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.togglePassword}
                >
                  {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                </button>
              </div>
            </div>

            <button type="submit" style={styles.loginButton} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={styles.divider}>
            <span style={styles.dividerText}>Quick Login</span>
          </div>

          <div style={styles.quickLoginContainer}>
            <button
              onClick={() => quickLogin('admin')}
              style={styles.quickLoginButton}
              disabled={loading}
            >
              <Shield size={18} />
              <span>Admin Access</span>
            </button>
            <button
              onClick={() => quickLogin('hr')}
              style={styles.quickLoginButton}
              disabled={loading}
            >
              <Bus size={18} />
              <span>HR Access (Depot 1)</span>
            </button>
          </div>

          <div style={styles.credentials}>
            <p style={styles.credentialsTitle}>Demo Credentials</p>
            <div style={styles.credentialRow}>
              <span>Admin:</span>
              <code>admin@moryabuses.com / admin123</code>
            </div>
            <div style={styles.credentialRow}>
              <span>HR:</span>
              <code>hr.D001@moryabuses.com / hr001</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  leftPanel: {
    flex: 1,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px'
  },
  brandSection: {
    textAlign: 'center',
    maxWidth: '400px'
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
  brandTitle: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 8px'
  },
  brandSubtitle: {
    fontSize: '18px',
    color: '#10b981',
    margin: '0 0 24px'
  },
  description: {
    fontSize: '16px',
    color: '#94a3b8',
    margin: '0 0 32px',
    lineHeight: 1.6
  },
  features: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center'
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#e2e8f0',
    fontSize: '14px'
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    background: '#f8fafc'
  },
  formContainer: {
    width: '100%',
    maxWidth: '400px'
  },
  formTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 8px'
  },
  formSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 32px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none'
  },
  input: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  togglePassword: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0
  },
  loginButton: {
    padding: '12px',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '32px 0'
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  quickLoginContainer: {
    display: 'flex',
    gap: '12px'
  },
  quickLoginButton: {
    flex: 1,
    padding: '12px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  credentials: {
    marginTop: '32px',
    padding: '16px',
    background: '#f1f5f9',
    borderRadius: '8px'
  },
  credentialsTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    margin: '0 0 12px',
    textTransform: 'uppercase'
  },
  credentialRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#475569',
    marginBottom: '4px'
  }
};
