import { useState } from 'react';
import { appointmentService } from '../services';
import { useApi } from '../hooks';
import AppLayout from '../components/layout/AppLayout';

const getTodayStr = () => new Date().toISOString().split('T')[0];

const STATUS_STYLES = {
  booked: { bg: '#e3f2fd', color: '#1565c0' },
  arrived: { bg: '#e8f5e9', color: '#2e7d32' },
  completed: { bg: '#f3e5f5', color: '#6a1b9a' },
  cancelled: { bg: '#fce4ec', color: '#880e4f' },
};

const DoctorDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  const { data, loading } = useApi(
    () => appointmentService.getAll({ date: selectedDate }),
    [selectedDate],
    true
  );

  const appointments = data?.appointments || [];
  const stats = {
    total: appointments.length,
    booked: appointments.filter((a) => a.status === 'booked').length,
    arrived: appointments.filter((a) => a.status === 'arrived').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
  };

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Schedule</h1>
            <p style={styles.subtitle}>Your appointment schedule</p>
          </div>
          <input
            type="date"
            style={styles.datePicker}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          {[
            { label: 'Total', value: stats.total, color: '#1a237e', bg: '#e8eaf6' },
            { label: 'Pending', value: stats.booked, color: '#1565c0', bg: '#e3f2fd' },
            { label: 'Arrived', value: stats.arrived, color: '#2e7d32', bg: '#e8f5e9' },
            { label: 'Completed', value: stats.completed, color: '#6a1b9a', bg: '#f3e5f5' },
          ].map((s) => (
            <div key={s.label} style={{ ...styles.statCard, background: s.bg }}>
              <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Schedule */}
        {loading ? (
          <div style={styles.center}>Loading schedule...</div>
        ) : appointments.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📅</div>
            <p>No appointments scheduled for {selectedDate}</p>
          </div>
        ) : (
          <div style={styles.timeline}>
            {appointments.map((appt, idx) => {
              const st = STATUS_STYLES[appt.status] || STATUS_STYLES.booked;
              return (
                <div key={appt._id} style={styles.timelineItem}>
                  <div style={styles.timeCol}>
                    <div style={styles.timeSlot}>{appt.slotStart}</div>
                    <div style={styles.timeLine} />
                  </div>
                  <div style={styles.apptCard}>
                    <div style={styles.apptHeader}>
                      <div>
                        <div style={styles.patientName}>{appt.patient?.name}</div>
                        <div style={styles.patientMeta}>
                          {appt.patient?.age}y · {appt.patient?.gender} · {appt.patient?.mobile}
                        </div>
                      </div>
                      <span style={{ ...styles.badge, background: st.bg, color: st.color }}>
                        {appt.status}
                      </span>
                    </div>
                    {appt.purpose && (
                      <div style={styles.purpose}>
                        <strong>Purpose:</strong> {appt.purpose}
                      </div>
                    )}
                    {appt.notes && (
                      <div style={styles.notes}>{appt.notes}</div>
                    )}
                    <div style={styles.timeRange}>
                      {appt.slotStart} – {appt.slotEnd}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const styles = {
  page: { maxWidth: 800 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#1a237e', margin: 0 },
  subtitle: { color: '#888', margin: '4px 0 0', fontSize: 14 },
  datePicker: {
    padding: '9px 14px', border: '1.5px solid #e0e0e0',
    borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
  },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 },
  statCard: { borderRadius: 10, padding: '16px 20px', textAlign: 'center' },
  statValue: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: 13, color: '#666', marginTop: 4 },
  center: { textAlign: 'center', color: '#888', padding: '40px', background: '#fff', borderRadius: 10 },
  emptyState: {
    textAlign: 'center', color: '#999', padding: '60px',
    background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  timeline: { display: 'flex', flexDirection: 'column', gap: 0 },
  timelineItem: { display: 'flex', gap: 16, marginBottom: 4 },
  timeCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 60, flexShrink: 0 },
  timeSlot: { fontSize: 13, fontWeight: 700, color: '#1a237e', marginBottom: 6 },
  timeLine: { width: 2, flex: 1, background: '#e8eaf6', minHeight: 20 },
  apptCard: {
    flex: 1, background: '#fff', borderRadius: 10, padding: '14px 18px',
    marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    border: '1px solid #f0f0f0',
  },
  apptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  patientName: { fontWeight: 700, fontSize: 15, color: '#222' },
  patientMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' },
  purpose: { fontSize: 13, color: '#555', marginBottom: 4 },
  notes: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  timeRange: { fontSize: 11, color: '#aaa', marginTop: 8 },
};

export default DoctorDashboard;
