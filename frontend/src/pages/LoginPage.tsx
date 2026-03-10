/**
 * LoginPage.tsx
 *
 * FIXES:
 * 1. Added Zod validation — email format + password required before submitting.
 * 2. BUG: form had no email format validation. A blank email or non-email string
 *    would reach the server and return a generic error.
 * 3. Input border highlights invalid fields on blur (inline validation UX).
 * 4. Error cleared per-field on change, not globally.
 * 5. Loading state disables both inputs, not just the button.
 */
import { useState, type FormEvent, type FocusEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginSchema, validateForm, type LoginFormValues } from '../utils/validation';
import type { UserRole } from '../types';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  super_admin:  '/admin',
  receptionist: '/reception/scheduler',
  doctor:       '/doctor',
};

const DEMO_ACCOUNTS = [
  { role: 'Super Admin',  email: 'admin@hospital.com',         pass: 'Admin@123456' },
  { role: 'Receptionist', email: 'jane.smith@hospital.com',    pass: 'Recept@123456' },
  { role: 'Doctor',       email: 'sarah.johnson@hospital.com', pass: 'Doctor@123456' },
];

const LoginPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState<LoginFormValues>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginFormValues>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (isAuthenticated && user) {
    return <Navigate to={ROLE_REDIRECTS[user.role] ?? '/'} replace />;
  }

  /** Validate a single field on blur */
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const result = loginSchema.shape[name as keyof LoginFormValues].safeParse(value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: result.success ? undefined : result.error.errors[0]?.message,
    }));
  };

  const handleChange = (field: keyof LoginFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear per-field error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setServerError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Full Zod validation before network call
    const errors = validateForm(loginSchema, form);
    if (errors) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);

    if (result.success) {
      navigate(ROLE_REDIRECTS[result.role] ?? '/');
    } else {
      setServerError(result.message);
    }
  };

  const inputStyle = (field: keyof LoginFormValues): React.CSSProperties => ({
    ...s.input,
    borderColor: fieldErrors[field] ? '#e53935' : '#e0e0e0',
  });

  return (
    <div style={s.page}>
      <div style={s.leftPanel}>
        <div style={s.brand}>
          <span style={s.brandIcon}>⚕</span>
          <h1 style={s.brandName}>MedEMR</h1>
          <p style={s.brandTagline}>Healthcare Appointment Management</p>
        </div>
        <div style={s.features}>
          {[
            'Secure role-based access',
            'Real-time slot management',
            'Complete audit trail',
            'Concurrency-safe booking',
          ].map((f) => (
            <div key={f} style={s.featureItem}>
              <span style={s.featureCheck}>✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={s.rightPanel}>
        <div style={s.card}>
          <h2 style={s.cardTitle}>Welcome back</h2>
          <p style={s.cardSubtitle}>Sign in to your account</p>

          <form onSubmit={(e) => void handleSubmit(e)} style={s.form} noValidate>
            {/* Email */}
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                style={inputStyle('email')}
                value={form.email}
                placeholder="your@hospital.com"
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={handleBlur}
                disabled={loading}
                autoComplete="email"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <span id="email-error" style={s.fieldError}>{fieldErrors.email}</span>
              )}
            </div>

            {/* Password */}
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  style={{ ...inputStyle('password'), paddingRight: 48 }}
                  value={form.password}
                  placeholder="••••••••"
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={handleBlur}
                  disabled={loading}
                  autoComplete="current-password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  style={s.eyeBtn}
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {fieldErrors.password && (
                <span id="password-error" style={s.fieldError}>{fieldErrors.password}</span>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div style={s.errorBox} role="alert">
                <span>⚠</span> {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts quick-fill */}
          <div style={s.demoAccounts}>
            <p style={s.demoTitle}>Demo Accounts</p>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                style={s.demoBtn}
                onClick={() => {
                  setForm({ email: acc.email, password: acc.pass });
                  setFieldErrors({});
                  setServerError('');
                }}
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

const s: Record<string, React.CSSProperties> = {
  page:        { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans','Segoe UI',sans-serif" },
  leftPanel:   { flex: 1, background: 'linear-gradient(135deg,#1a237e 0%,#0d47a1 50%,#1565c0 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', color: '#fff' },
  brand:       { marginBottom: 48 },
  brandIcon:   { fontSize: 48, display: 'block', marginBottom: 12 },
  brandName:   { fontSize: 36, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' },
  brandTagline:{ fontSize: 16, opacity: 0.8, margin: 0 },
  features:    { display: 'flex', flexDirection: 'column', gap: 16 },
  featureItem: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, opacity: 0.9 },
  featureCheck:{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 },
  rightPanel:  { width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: '#f5f7fb' },
  card:        { width: '100%', background: '#fff', borderRadius: 16, padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  cardTitle:   { fontSize: 26, fontWeight: 700, color: '#1a237e', margin: '0 0 6px' },
  cardSubtitle:{ color: '#888', margin: '0 0 32px', fontSize: 14 },
  form:        { display: 'flex', flexDirection: 'column', gap: 20 },
  fieldGroup:  { display: 'flex', flexDirection: 'column', gap: 6 },
  label:       { fontSize: 13, fontWeight: 600, color: '#444' },
  input:       { padding: '11px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  fieldError:  { color: '#e53935', fontSize: 12, marginTop: 2 },
  eyeBtn:      { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 },
  errorBox:    { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 },
  submitBtn:   { background: 'linear-gradient(135deg,#1a237e,#1565c0)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' },
  demoAccounts:{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #eee' },
  demoTitle:   { fontSize: 12, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 },
  demoBtn:     { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '8px 12px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: 6, cursor: 'pointer', marginBottom: 6, fontSize: 13, fontFamily: 'inherit', textAlign: 'left' },
};

export default LoginPage;
