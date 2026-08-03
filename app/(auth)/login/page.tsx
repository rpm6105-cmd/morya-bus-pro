'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Bus, Lock, Mail, Eye, EyeOff, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  const s = isMobile ? mobileStyles : desktopStyles;

  return (
    <div style={s.container}>
      <div style={s.brandPanel}>
        <div>
          <div style={s.logoWrap}>
            <Bus size={isMobile ? 32 : 48} color="#10b981" />
          </div>
          <h1 style={s.brandTitle}>HRMS Pro</h1>
          <p style={s.brandSub}>Morya Bus Services</p>
          <p style={s.desc}>
            Complete HR & Payroll Management System for Multi-Depot Operations
          </p>
          <div style={s.features}>
            <div style={s.feature}><Shield size={16} color="#10b981" /><span>40+ Employees</span></div>
            <div style={s.feature}><Bus size={16} color="#10b981" /><span>1 Depot</span></div>
          </div>
        </div>
      </div>

      <div style={s.formPanel}>
        <div style={s.formInner}>
          <h2 style={s.formTitle}>Welcome Back</h2>
          <p style={s.formSub}>Sign in to your account</p>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <div style={s.inputWrap}>
                <Mail size={18} color="#64748b" style={s.inputIcon} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@moryabuses.com" style={s.input} />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Password</label>
              <div style={s.inputWrap}>
                <Lock size={18} color="#64748b" style={s.inputIcon} />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" style={s.input} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.toggle}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <button type="submit" style={s.loginBtn} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={s.divider}><span style={s.dividerText}>Quick Login</span></div>

          <div style={s.quickBtns}>
            <button onClick={() => quickLogin('admin')} style={s.quickBtn} disabled={loading}>
              <Shield size={16} /> Admin
            </button>
            <button onClick={() => quickLogin('hr')} style={s.quickBtn} disabled={loading}>
              <Bus size={16} /> HR (Depot 1)
            </button>
          </div>

          <div style={s.creds}>
            <p style={s.credsTitle}>Demo Credentials</p>
            <div style={s.credRow}><span>Admin:</span><code>admin@moryabuses.com / admin123</code></div>
            <div style={s.credRow}><span>HR:</span><code>hr.D001@moryabuses.com / hr001</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const desktopStyles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' },
  brandPanel: { flex: 1, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' },
  logoWrap: { width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' },
  brandTitle: { fontSize: '36px', fontWeight: 700, color: '#fff', margin: '0 0 8px', textAlign: 'center' },
  brandSub: { fontSize: '18px', color: '#10b981', margin: '0 0 24px', textAlign: 'center' },
  desc: { fontSize: '16px', color: '#94a3b8', margin: '0 0 32px', lineHeight: 1.6, textAlign: 'center' },
  features: { display: 'flex', gap: '24px', justifyContent: 'center' },
  feature: { display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '14px' },
  formPanel: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#f8fafc' },
  formInner: { width: '100%', maxWidth: '400px' },
  formTitle: { fontSize: '28px', fontWeight: 600, color: '#0f172a', margin: '0 0 8px' },
  formSub: { fontSize: '14px', color: '#64748b', margin: '0 0 32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: 500, color: '#374151' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '12px', pointerEvents: 'none' },
  input: { width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  toggle: { position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b' },
  loginBtn: { padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 500, cursor: 'pointer' },
  divider: { display: 'flex', alignItems: 'center', margin: '32px 0' },
  dividerText: { flex: 1, textAlign: 'center', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' },
  quickBtns: { display: 'flex', gap: '12px' },
  quickBtn: { flex: 1, padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  creds: { marginTop: '32px', padding: '16px', background: '#f1f5f9', borderRadius: '8px' },
  credsTitle: { fontSize: '12px', fontWeight: 600, color: '#64748b', margin: '0 0 12px', textTransform: 'uppercase' },
  credRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', marginBottom: '4px' },
};

const mobileStyles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' },
  brandPanel: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' },
  logoWrap: { width: '56px', height: '56px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  brandTitle: { fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 4px', textAlign: 'center' },
  brandSub: { fontSize: '14px', color: '#10b981', margin: '0 0 12px', textAlign: 'center' },
  desc: { fontSize: '13px', color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.5, textAlign: 'center' },
  features: { display: 'flex', gap: '16px', justifyContent: 'center' },
  feature: { display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', fontSize: '12px' },
  formPanel: { flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', background: '#f8fafc' },
  formInner: { width: '100%', maxWidth: '400px' },
  formTitle: { fontSize: '22px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' },
  formSub: { fontSize: '13px', color: '#64748b', margin: '0 0 24px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '12px', pointerEvents: 'none' },
  input: { width: '100%', padding: '14px 12px 14px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', outline: 'none' },
  toggle: { position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b' },
  loginBtn: { padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },
  divider: { display: 'flex', alignItems: 'center', margin: '24px 0' },
  dividerText: { flex: 1, textAlign: 'center', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' },
  quickBtns: { display: 'flex', gap: '8px' },
  quickBtn: { flex: 1, padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  creds: { marginTop: '24px', padding: '12px', background: '#f1f5f9', borderRadius: '8px' },
  credsTitle: { fontSize: '11px', fontWeight: 600, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase' },
  credRow: { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: '#475569', marginBottom: '4px' },
};
