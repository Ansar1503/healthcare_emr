import { useState, useCallback } from 'react';
import { appointmentService, doctorService } from '../services';
import { useApi } from '../hooks';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';

const getTodayStr = () => new Date().toISOString().split('T')[0];

const STATUS_STYLES = {
  booked: { bg: '#e3f2fd', color: '#1565c0', label: 'Booked' },
  arrived: { bg: '#e8f5e9', color: '#2e7d32', label: 'Arrived' },
  completed: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Completed' },
  cancelled: { bg: '#fce4ec', color: '#880e4f', label: 'Cancelled' },
  no_show: { bg: '#fff3e0', color: '#e65100', label: 'No Show' },
};

const AppointmentsPage = () => {
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState({ date: getTodayStr(), doctorId: '', status: '' });
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState('');

  const { data: doctorsData } = useApi(() => doctorService.getAll(), [], true);
  const doctors = doctorsData || [];

  const {
    data,
    loading,
    execute: refetch,
  } = useApi(
    () => appointmentService.getAll({ ...filters, page, limit: 15 }),
    [filters, page],
    true
  );

  const appointments = data?.appointments || [];
  const pagination = data?.pagination || {};

  const handleFilterChange = useCallback((key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  }, []);

  const handleMarkArrived = async (id) => {
    setActionLoading(id);
    try {
      await appointmentService.markArrived(id);
      refetch();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark as arrived');
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setActionLoading(id);
    try {
      await appointmentService.delete(id);
      refetch();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>Appointments</h1>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <div style={styles.filterItem}>
            <label style={styles.label}>Date</label>
            <input
              type="date"
              style={styles.input}
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
            />
          </div>
          {isAdmin && (
            <div style={styles.filterItem}>
              <label style={styles.label}>Doctor</label>
              <select
                style={styles.input}
                value={filters.doctorId}
                onChange={(e) => handleFilterChange('doctorId', e.target.value)}
              >
                <option value="">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
          <div style={styles.filterItem}>
            <label style={styles.label}>Status</label>
            <select
              style={styles.input}
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_STYLES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <button style={styles.clearBtn} onClick={() => setFilters({ date: getTodayStr(), doctorId: '', status: '' })}>
            Reset
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div style={styles.center}>Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div style={styles.center}>No appointments found for selected filters.</div>
        ) : (
          <>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {['Time', 'Patient', 'Doctor', 'Purpose', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => {
                    const st = STATUS_STYLES[appt.status] || STATUS_STYLES.booked;
                    const isLoading = actionLoading === appt._id;
                    return (
                      <tr key={appt._id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{appt.slotStart}</div>
                          <div style={{ fontSize: 11, color: '#999' }}>{appt.slotEnd}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 600 }}>{appt.patient?.name}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>
                            {appt.patient?.mobile} · {appt.patient?.age}y
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div>{appt.doctor?.name}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>{appt.doctor?.department}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontSize: 13, color: '#555' }}>{appt.purpose || '—'}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            {appt.status === 'booked' && (
                              <button
                                style={styles.arrivedBtn}
                                onClick={() => handleMarkArrived(appt._id)}
                                disabled={isLoading}
                              >
                                {isLoading ? '...' : 'Arrived'}
                              </button>
                            )}
                            {['booked', 'arrived'].includes(appt.status) && (
                              <button
                                style={styles.cancelBtn}
                                onClick={() => handleDelete(appt._id)}
                                disabled={isLoading}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  style={styles.pageBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ←
                </button>
                <span style={styles.pageInfo}>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <button
                  style={styles.pageBtn}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

const styles = {
  page: {},
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#1a237e', margin: 0 },
  filters: {
    display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-end',
    flexWrap: 'wrap', background: '#fff', padding: '16px 20px',
    borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  filterItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#666' },
  input: {
    padding: '8px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit',
  },
  clearBtn: {
    padding: '8px 16px', background: '#f5f5f5', border: '1.5px solid #e0e0e0',
    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', alignSelf: 'flex-end',
  },
  center: { textAlign: 'center', color: '#888', padding: '40px', background: '#fff', borderRadius: 10 },
  tableWrapper: { background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f5f7ff' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e8eaf6' },
  tr: { borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s' },
  td: { padding: '12px 16px', fontSize: 14, verticalAlign: 'middle' },
  badge: { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions: { display: 'flex', gap: 6 },
  arrivedBtn: {
    padding: '5px 12px', background: '#e8f5e9', color: '#2e7d32',
    border: '1px solid #4caf50', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
  },
  cancelBtn: {
    padding: '5px 12px', background: '#fce4ec', color: '#880e4f',
    border: '1px solid #e91e63', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
  },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '16px', marginTop: 8 },
  pageBtn: {
    padding: '6px 14px', background: '#fff', border: '1.5px solid #e0e0e0',
    borderRadius: 6, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
  },
  pageInfo: { fontSize: 13, color: '#666' },
};

export default AppointmentsPage;
