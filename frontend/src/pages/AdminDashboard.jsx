import { useState } from 'react';
import { doctorService, userService } from '../services';
import { useApi } from '../hooks';
import AppLayout from '../components/layout/AppLayout';

const DEPARTMENTS = [
  'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics',
  'Gynecology', 'Neurology', 'Dermatology', 'Ophthalmology', 'ENT',
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('doctors');
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [showReceptionForm, setShowReceptionForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [doctorForm, setDoctorForm] = useState({
    name: '', department: '', specialization: '', slotDuration: 15,
    workingHours: { startTime: '09:00', endTime: '17:00' },
    email: '', password: '',
  });

  const [receptionForm, setReceptionForm] = useState({ name: '', email: '', password: '' });

  const { data: doctorsData, execute: refetchDoctors } = useApi(() => doctorService.getAll({ isActive: undefined }), [], true);
  const { data: usersData, execute: refetchUsers } = useApi(() => userService.getAll({ role: 'receptionist' }), [], true);

  const doctors = doctorsData || [];
  const receptionists = usersData || [];

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await doctorService.create(doctorForm);
      setShowDoctorForm(false);
      setDoctorForm({ name: '', department: '', specialization: '', slotDuration: 15, workingHours: { startTime: '09:00', endTime: '17:00' }, email: '', password: '' });
      refetchDoctors();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create doctor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReception = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await userService.createReceptionist(receptionForm);
      setShowReceptionForm(false);
      setReceptionForm({ name: '', email: '', password: '' });
      refetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create receptionist');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>Manage doctors and receptionists</p>
          </div>
        </div>

        <div style={styles.tabs}>
          {[
            { key: 'doctors', label: `Doctors (${doctors.length})` },
            { key: 'receptionists', label: `Receptionists (${receptionists.length})` },
          ].map((t) => (
            <button
              key={t.key}
              style={{
                ...styles.tab,
                borderBottom: activeTab === t.key ? '3px solid #1a237e' : '3px solid transparent',
                color: activeTab === t.key ? '#1a237e' : '#888',
                fontWeight: activeTab === t.key ? 700 : 500,
              }}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'doctors' && (
          <div>
            <div style={styles.sectionHeader}>
              <span style={styles.count}>{doctors.length} doctors</span>
              <button style={styles.addBtn} onClick={() => setShowDoctorForm(!showDoctorForm)}>
                + Add Doctor
              </button>
            </div>

            {showDoctorForm && (
              <form onSubmit={handleCreateDoctor} style={styles.form}>
                <h3 style={styles.formTitle}>New Doctor</h3>
                <div style={styles.formGrid}>
                  {[
                    { label: 'Full Name *', key: 'name', type: 'text' },
                    { label: 'Slot Duration (min)', key: 'slotDuration', type: 'number' },
                    { label: 'Login Email *', key: 'email', type: 'email' },
                    { label: 'Password *', key: 'password', type: 'password' },
                    { label: 'Specialization', key: 'specialization', type: 'text' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label style={styles.label}>{f.label}</label>
                      <input
                        style={styles.input}
                        type={f.type}
                        value={doctorForm[f.key] || ''}
                        onChange={(e) => setDoctorForm({ ...doctorForm, [f.key]: f.type === 'number' ? +e.target.value : e.target.value })}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={styles.label}>Department *</label>
                    <select
                      style={styles.input}
                      value={doctorForm.department}
                      onChange={(e) => setDoctorForm({ ...doctorForm, department: e.target.value })}
                    >
                      <option value="">Select department</option>
                      {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                {formError && <div style={styles.error}>{formError}</div>}
                <div style={styles.formActions}>
                  <button type="submit" style={styles.submitBtn} disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Doctor'}
                  </button>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowDoctorForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div style={styles.grid}>
              {doctors.map((d) => (
                <div key={d._id} style={styles.card}>
                  <div style={styles.cardAvatar}>{d.name.charAt(0)}</div>
                  <div>
                    <div style={styles.cardName}>{d.name}</div>
                    <div style={styles.cardDept}>{d.department}</div>
                    {d.specialization && <div style={styles.cardSpec}>{d.specialization}</div>}
                    <div style={styles.cardMeta}>{d.slotDuration}min slots · {d.workingHours?.startTime}–{d.workingHours?.endTime}</div>
                    <span style={{ ...styles.activeBadge, background: d.isActive ? '#e8f5e9' : '#fce4ec', color: d.isActive ? '#2e7d32' : '#b71c1c' }}>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'receptionists' && (
          <div>
            <div style={styles.sectionHeader}>
              <span style={styles.count}>{receptionists.length} receptionists</span>
              <button style={styles.addBtn} onClick={() => setShowReceptionForm(!showReceptionForm)}>
                + Add Receptionist
              </button>
            </div>

            {showReceptionForm && (
              <form onSubmit={handleCreateReception} style={styles.form}>
                <h3 style={styles.formTitle}>New Receptionist</h3>
                <div style={styles.formGrid}>
                  {[
                    { label: 'Full Name *', key: 'name', type: 'text' },
                    { label: 'Email *', key: 'email', type: 'email' },
                    { label: 'Password *', key: 'password', type: 'password' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label style={styles.label}>{f.label}</label>
                      <input
                        style={styles.input}
                        type={f.type}
                        value={receptionForm[f.key]}
                        onChange={(e) => setReceptionForm({ ...receptionForm, [f.key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                {formError && <div style={styles.error}>{formError}</div>}
                <div style={styles.formActions}>
                  <button type="submit" style={styles.submitBtn} disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Receptionist'}
                  </button>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowReceptionForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div style={styles.grid}>
              {receptionists.map((u) => (
                <div key={u._id} style={styles.card}>
                  <div style={{ ...styles.cardAvatar, background: '#388e3c' }}>{u.name.charAt(0)}</div>
                  <div>
                    <div style={styles.cardName}>{u.name}</div>
                    <div style={styles.cardDept}>{u.email}</div>
                    <span style={{ ...styles.activeBadge, background: u.isActive ? '#e8f5e9' : '#fce4ec', color: u.isActive ? '#2e7d32' : '#b71c1c' }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const styles = {
  page: {},
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#1a237e', margin: 0 },
  subtitle: { color: '#888', margin: '4px 0 0', fontSize: 14 },
  tabs: { display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #e0e0e0' },
  tab: {
    padding: '10px 20px', background: 'none', border: 'none',
    cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', transition: 'all 0.15s',
  },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  count: { color: '#888', fontSize: 14 },
  addBtn: {
    padding: '8px 20px', background: '#1a237e', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
  },
  form: {
    background: '#fff', borderRadius: 12, padding: '24px', marginBottom: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8eaf6',
  },
  formTitle: { fontSize: 16, fontWeight: 700, color: '#333', margin: '0 0 16px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  label: { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 },
  input: {
    width: '100%', padding: '9px 12px', border: '1.5px solid #e0e0e0',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  error: { color: '#b91c1c', fontSize: 13, marginTop: 12 },
  formActions: { display: 'flex', gap: 10, marginTop: 16 },
  submitBtn: {
    padding: '9px 24px', background: '#1a237e', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
  },
  cancelBtn: {
    padding: '9px 20px', background: '#f5f5f5', color: '#555',
    border: '1.5px solid #e0e0e0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  card: {
    background: '#fff', borderRadius: 12, padding: '16px 20px',
    display: 'flex', gap: 14, alignItems: 'flex-start',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
  },
  cardAvatar: {
    width: 44, height: 44, borderRadius: '50%', background: '#1a237e',
    color: '#fff', fontSize: 18, fontWeight: 700, display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardName: { fontWeight: 700, fontSize: 15, color: '#222' },
  cardDept: { color: '#1565c0', fontSize: 13, marginTop: 2 },
  cardSpec: { color: '#888', fontSize: 12, fontStyle: 'italic', marginTop: 1 },
  cardMeta: { color: '#999', fontSize: 12, marginTop: 4 },
  activeBadge: {
    display: 'inline-block', fontSize: 11, fontWeight: 700,
    padding: '2px 8px', borderRadius: 20, marginTop: 6,
  },
};

export default AdminDashboard;
