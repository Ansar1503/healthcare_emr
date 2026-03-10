import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_REDIRECTS = {
  super_admin: '/admin',
  receptionist: '/reception',
  doctor: '/doctor',
};

const LoginPage = () => {
  const { login, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Already logged in
  if (isAuthenticated && user) {
    return <Navigate to={ROLE_REDIRECTS[user.role] || '/'} replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);

    if (result.success) {
      navigate(ROLE_REDIRECTS[result.role] || '/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.leftPanel}>
        <div style={styles.brand}>
          <span style={styles.brandIcon}>⚕</span>
          <h1 style={styles.brandName}>MedEMR</h1>
          <p style={styles.brandTagline}>Healthcare Appointment Management</p>
        </div>
        <div style={styles.features}>
          {['Secure role-based access', 'Real-time slot management', 'Complete audit trail', 'Concurrency-safe booking'].map((f) => (
            <div key={f} style={styles.featureItem}>
              <span style={styles.featureCheck}>✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Welcome back</h2>
            <p style={styles.cardSubtitle}>Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@hospital.com"
                style={styles.input}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{ ...styles.input, paddingRight: 48 }}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={styles.demoAccounts}>
            <p style={styles.demoTitle}>Demo Accounts</p>
            {[
              { role: 'Super Admin', email: 'admin@hospital.com', pass: 'Admin@123456' },
              { role: 'Receptionist', email: 'jane.smith@hospital.com', pass: 'Recept@123456' },
              { role: 'Doctor', email: 'sarah.johnson@hospital.com', pass: 'Doctor@123456' },
            ].map((acc) => (
              <button
                key={acc.role}
                style={styles.demoBtn}
                onClick={() => setForm({ email: acc.email, password: acc.pass })}
              >
                <strong>{acc.role}</strong>
                <span style={{ color: '#888', fontSize: 11 }}>{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  leftPanel: {
    flex: 1,
    background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px 48px',
    color: '#fff',
  },
  brand: {
    marginBottom: 48,
  },
  brandIcon: {
    fontSize: 48,
    display: 'block',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 36,
    fontWeight: 800,
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
  },
  brandTagline: {
    fontSize: 16,
    opacity: 0.8,
    margin: 0,
    fontWeight: 400,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 15,
    opacity: 0.9,
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    flexShrink: 0,
  },
  rightPanel: {
    width: 480,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
    background: '#f5f7fb',
  },
  card: {
    width: '100%',
    background: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  cardHeader: {
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1a237e',
    margin: '0 0 6px',
  },
  cardSubtitle: {
    color: '#888',
    margin: 0,
    fontSize: 14,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#444',
  },
  input: {
    padding: '11px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 0,
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#b91c1c',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #1a237e, #1565c0)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    fontFamily: 'inherit',
  },
  demoAccounts: {
    marginTop: 24,
    paddingTop: 20,
    borderTop: '1px solid #eee',
  },
  demoTitle: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 10,
  },
  demoBtn: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    padding: '8px 12px',
    background: '#f9f9f9',
    border: '1px solid #eee',
    borderRadius: 6,
    cursor: 'pointer',
    marginBottom: 6,
    fontSize: 13,
    fontFamily: 'inherit',
    textAlign: 'left',
  },
};

export default LoginPage;
