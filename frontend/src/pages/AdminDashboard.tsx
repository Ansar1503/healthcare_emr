/**
 * AdminDashboard.tsx
 *
 * FIXES:
 * 1. Added Zod validation for both Doctor creation and Receptionist creation forms.
 * 2. BUG: Doctor form was missing half the department options (only 9 listed,
 *    backend has 15). Fixed to match backend enum exactly.
 * 3. BUG: slotDuration from the form was a string (from <select>) but the API
 *    expects a number. Added coercion.
 * 4. BUG: No field-level error display — all errors went to a single formError.
 *    Now displays per-field errors under each input.
 * 5. UX: Form cleared and modal closed only on success, not on every submit attempt.
 * 6. ACCESSIBILITY: Form labels are now linked to inputs via htmlFor/id.
 */
import { useState, type FormEvent } from 'react';
import { doctorService, userService } from '../services';
import { useApi } from '../hooks';
import AppLayout from '../components/layout/AppLayout';
import {
  createDoctorSchema,
  createReceptionistSchema,
  validateForm,
  type CreateDoctorFormValues,
  type CreateReceptionistFormValues,
} from '../utils/validation';
import type { IDoctor, IUser } from '../types';

type Tab = 'doctors' | 'receptionists';

const DEPARTMENTS = [
  'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology',
  'Neurology', 'Dermatology', 'Ophthalmology', 'ENT', 'Psychiatry',
  'Radiology', 'Oncology', 'Urology', 'Nephrology', 'Gastroenterology',
];

const EMPTY_DOCTOR: CreateDoctorFormValues = {
  name: '', department: '', specialization: '', slotDuration: 15, email: '', password: '',
};

const EMPTY_RECEPTIONIST: CreateReceptionistFormValues = {
  name: '', email: '', password: '',
};

const AdminDashboard = () => {
  const [tab, setTab] = useState<Tab>('doctors');
  const [showDoctorForm, setShowDoctorForm]       = useState(false);
  const [showReceptionForm, setShowReceptionForm] = useState(false);
  const [submitting, setSubmitting]               = useState(false);

  const [df, setDf]     = useState<CreateDoctorFormValues>(EMPTY_DOCTOR);
  const [dfErrors, setDfErrors] = useState<Partial<CreateDoctorFormValues>>({});

  const [rf, setRf]     = useState<CreateReceptionistFormValues>(EMPTY_RECEPTIONIST);
  const [rfErrors, setRfErrors] = useState<Partial<CreateReceptionistFormValues>>({});

  const [serverError, setServerError] = useState('');

  const { data: doctorsRaw, execute: refetchDoctors } = useApi<IDoctor[]>(
    () => doctorService.getAll(), [], true
  );
  const { data: usersRaw, execute: refetchUsers } = useApi<IUser[]>(
    () => userService.getAll({ role: 'receptionist' }), [], true
  );
  const doctors      = doctorsRaw ?? [];
  const receptionists = usersRaw ?? [];

  const handleCreateDoctor = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    // FIX: coerce slotDuration to number before validating
    const payload = { ...df, slotDuration: Number(df.slotDuration) };
    const errors = validateForm(createDoctorSchema, payload);
    if (errors) { setDfErrors(errors); return; }

    setSubmitting(true);
    try {
      await doctorService.create(payload);
      setShowDoctorForm(false);
      setDf(EMPTY_DOCTOR);
      setDfErrors({});
      void refetchDoctors();
    } catch (err) {
      setServerError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to create doctor'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReception = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    const errors = validateForm(createReceptionistSchema, rf);
    if (errors) { setRfErrors(errors); return; }

    setSubmitting(true);
    try {
      await userService.createReceptionist(rf);
      setShowReceptionForm(false);
      setRf(EMPTY_RECEPTIONIST);
      setRfErrors({});
      void refetchUsers();
    } catch (err) {
      setServerError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to create receptionist'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      await userService.toggleActive(userId);
      void refetchUsers();
    } catch (err) {
      alert(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Action failed'
      );
    }
  };

  return (
    <AppLayout>
      <div>
        <h1 style={s.title}>Administration</h1>

        {/* Tabs */}
        <div style={s.tabs}>
          {(['doctors', 'receptionists'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                ...s.tab,
                background: tab === t ? '#1a237e' : '#f5f5f5',
                color: tab === t ? '#fff' : '#555',
              }}
            >
              {t === 'doctors' ? '👨‍⚕️ Doctors' : '🧑‍💼 Receptionists'}
            </button>
          ))}
        </div>

        {/* ── Doctors tab ── */}
        {tab === 'doctors' && (
          <section>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Doctors ({doctors.length})</h2>
              <button
                type="button"
                style={s.btnPrimary}
                onClick={() => { setShowDoctorForm(true); setServerError(''); setDfErrors({}); }}
              >
                + Add Doctor
              </button>
            </div>

            {showDoctorForm && (
              <div style={s.formCard}>
                <h3 style={s.formTitle}>New Doctor Account</h3>
                {serverError && <div style={s.errorBox} role="alert">⚠ {serverError}</div>}
                <form onSubmit={(e) => void handleCreateDoctor(e)} style={s.formGrid} noValidate>
                  <Field label="Full Name *" id="d-name" error={dfErrors.name}>
                    <input id="d-name" style={fieldStyle(dfErrors.name)} value={df.name}
                      onChange={(e) => setDf({ ...df, name: e.target.value })} />
                  </Field>
                  <Field label="Department *" id="d-dept" error={dfErrors.department}>
                    <select id="d-dept" style={fieldStyle(dfErrors.department)} value={df.department}
                      onChange={(e) => setDf({ ...df, department: e.target.value })}>
                      <option value="">— Select —</option>
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </Field>
                  <Field label="Specialization" id="d-spec">
                    <input id="d-spec" style={s.input} value={df.specialization ?? ''}
                      onChange={(e) => setDf({ ...df, specialization: e.target.value })} />
                  </Field>
                  <Field label="Slot Duration (min)" id="d-slot" error={String(dfErrors.slotDuration ?? '')}>
                    <select id="d-slot" style={s.input} value={df.slotDuration}
                      onChange={(e) => setDf({ ...df, slotDuration: Number(e.target.value) })}>
                      {[10, 15, 20, 30, 45, 60].map((v) => <option key={v} value={v}>{v} min</option>)}
                    </select>
                  </Field>
                  <Field label="Login Email *" id="d-email" error={dfErrors.email}>
                    <input id="d-email" type="email" style={fieldStyle(dfErrors.email)} value={df.email}
                      onChange={(e) => setDf({ ...df, email: e.target.value })} />
                  </Field>
                  <Field label="Password *" id="d-pass" error={dfErrors.password}>
                    <input id="d-pass" type="password" style={fieldStyle(dfErrors.password)} value={df.password}
                      onChange={(e) => setDf({ ...df, password: e.target.value })} />
                  </Field>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 8 }}>
                    <button type="submit" style={s.btnPrimary} disabled={submitting}>
                      {submitting ? 'Creating…' : 'Create Doctor'}
                    </button>
                    <button type="button" style={s.btnSecondary}
                      onClick={() => { setShowDoctorForm(false); setDfErrors({}); setServerError(''); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={s.table}>
              {doctors.map((d) => (
                <div key={d._id} style={s.tableRow}>
                  <div>
                    <strong>{d.name}</strong>
                    <span style={s.meta}> · {d.department}</span>
                    {d.specialization && <span style={s.meta}> · {d.specialization}</span>}
                  </div>
                  <div style={s.rowRight}>
                    <span style={{ ...s.badge, background: d.isActive ? '#e8f5e9' : '#fce4ec', color: d.isActive ? '#2e7d32' : '#c62828' }}>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span style={s.meta}>{d.slotDuration}min slots</span>
                  </div>
                </div>
              ))}
              {doctors.length === 0 && <p style={s.empty}>No doctors yet.</p>}
            </div>
          </section>
        )}

        {/* ── Receptionists tab ── */}
        {tab === 'receptionists' && (
          <section>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Receptionists ({receptionists.length})</h2>
              <button
                type="button"
                style={s.btnPrimary}
                onClick={() => { setShowReceptionForm(true); setServerError(''); setRfErrors({}); }}
              >
                + Add Receptionist
              </button>
            </div>

            {showReceptionForm && (
              <div style={s.formCard}>
                <h3 style={s.formTitle}>New Receptionist Account</h3>
                {serverError && <div style={s.errorBox} role="alert">⚠ {serverError}</div>}
                <form onSubmit={(e) => void handleCreateReception(e)} style={s.formGrid} noValidate>
                  <Field label="Full Name *" id="r-name" error={rfErrors.name}>
                    <input id="r-name" style={fieldStyle(rfErrors.name)} value={rf.name}
                      onChange={(e) => setRf({ ...rf, name: e.target.value })} />
                  </Field>
                  <Field label="Email *" id="r-email" error={rfErrors.email}>
                    <input id="r-email" type="email" style={fieldStyle(rfErrors.email)} value={rf.email}
                      onChange={(e) => setRf({ ...rf, email: e.target.value })} />
                  </Field>
                  <Field label="Password *" id="r-pass" error={rfErrors.password}>
                    <input id="r-pass" type="password" style={fieldStyle(rfErrors.password)} value={rf.password}
                      onChange={(e) => setRf({ ...rf, password: e.target.value })} />
                  </Field>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 8 }}>
                    <button type="submit" style={s.btnPrimary} disabled={submitting}>
                      {submitting ? 'Creating…' : 'Create Receptionist'}
                    </button>
                    <button type="button" style={s.btnSecondary}
                      onClick={() => { setShowReceptionForm(false); setRfErrors({}); setServerError(''); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={s.table}>
              {receptionists.map((u) => (
                <div key={u.id} style={s.tableRow}>
                  <div>
                    <strong>{u.name}</strong>
                    <span style={s.meta}> · {u.email}</span>
                  </div>
                  <div style={s.rowRight}>
                    <span style={{ ...s.badge, background: u.isActive ? '#e8f5e9' : '#fce4ec', color: u.isActive ? '#2e7d32' : '#c62828' }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button style={s.btnXs} onClick={() => void handleToggleActive(u.id)}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
              {receptionists.length === 0 && <p style={s.empty}>No receptionists yet.</p>}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

/** Small reusable field wrapper for label + input + error */
const Field = ({
  label, id, error, children,
}: { label: string; id: string; error?: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }} htmlFor={id}>{label}</label>
    {children}
    {error && <span style={{ color: '#e53935', fontSize: 12 }}>{error}</span>}
  </div>
);

const fieldStyle = (error?: string): React.CSSProperties => ({
  padding: '9px 12px', border: `1.5px solid ${error ? '#e53935' : '#e0e0e0'}`,
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
});

const s: Record<string, React.CSSProperties> = {
  title:        { fontSize: 22, fontWeight: 700, color: '#1a237e', margin: '0 0 20px' },
  tabs:         { display: 'flex', gap: 8, marginBottom: 24 },
  tab:          { padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' },
  sectionHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#333', margin: 0 },
  formCard:     { background: '#f9f9ff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '20px', marginBottom: 20 },
  formTitle:    { fontSize: 15, fontWeight: 700, color: '#1a237e', margin: '0 0 16px' },
  formGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' },
  input:        { padding: '9px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' },
  errorBox:     { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 13, marginBottom: 12 },
  table:        { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  tableRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f5f5f5' },
  rowRight:     { display: 'flex', alignItems: 'center', gap: 12 },
  badge:        { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  meta:         { color: '#888', fontSize: 13 },
  empty:        { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: 14 },
  btnPrimary:   { padding: '9px 18px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  btnSecondary: { padding: '9px 18px', background: '#f5f5f5', color: '#333', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnXs:        { padding: '4px 10px', background: '#f5f5f5', color: '#444', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
};

export default AdminDashboard;
