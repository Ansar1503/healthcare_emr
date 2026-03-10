/**
 * AppointmentsPage.tsx
 *
 * FIXES:
 * 1. BUG: getTodayStr() uses toISOString() — same UTC date bug. Fixed with local date.
 * 2. BUG: window.confirm() and window.alert() are blocking — replaced with inline
 *    confirm state and toast-style error display.
 * 3. PERFORMANCE: useApi called with inline object literal in deps — caused infinite
 *    re-fetch loop. filters object is now stable through controlled comparison.
 * 4. UX: action errors now display inline beneath the appointment row, not via alert().
 * 5. UX: Added a "Clear Filters" button so users can reset without refreshing.
 * 6. BUG: Page wasn't reset to 1 when date filter changed.
 */
import { useState, useCallback } from 'react';
import { appointmentService, doctorService } from '../services';
import { useApi } from '../hooks';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import type { IAppointment, IDoctor, AppointmentStatus, IPaginatedData } from '../types';

/** FIX: local date, not UTC */
const getTodayLocal = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

interface StatusStyle { bg: string; color: string; label: string }
const STATUS_STYLES: Record<AppointmentStatus, StatusStyle> = {
  booked:    { bg: '#e3f2fd', color: '#1565c0', label: 'Booked' },
  arrived:   { bg: '#e8f5e9', color: '#2e7d32', label: 'Arrived' },
  completed: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Completed' },
  cancelled: { bg: '#fce4ec', color: '#880e4f', label: 'Cancelled' },
  no_show:   { bg: '#fff3e0', color: '#e65100', label: 'No Show' },
};

export const AppointmentsPage = () => {
  const { isAdmin } = useAuth();

  const [dateFilter, setDateFilter]       = useState(getTodayLocal());
  const [doctorFilter, setDoctorFilter]   = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [page, setPage]                   = useState(1);

  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError]     = useState('');
  const [confirmCancelId, setConfirmCancelId] = useState(''); // FIX: inline confirm

  const { data: doctorsRaw } = useApi<IDoctor[]>(() => doctorService.getAll(), [], true);
  const doctors = doctorsRaw ?? [];

  // FIX: stable deps — primitives, not objects
  const { data, loading, execute: refetch } = useApi<IPaginatedData<IAppointment>>(
    () =>
      appointmentService.getAll({
        date:     dateFilter || undefined,
        doctorId: doctorFilter || undefined,
        status:   statusFilter || undefined,
        page,
        limit: 15,
      }),
    [dateFilter, doctorFilter, statusFilter, page],
    true
  );

  const appointments = data?.data ?? [];
  const pagination   = data?.pagination;

  const handleFilterChange = useCallback((key: string, val: string) => {
    if (key === 'date')     setDateFilter(val);
    if (key === 'doctorId') setDoctorFilter(val);
    if (key === 'status')   setStatusFilter(val);
    setPage(1); // reset page on any filter change
    setActionError('');
  }, []);

  const clearFilters = () => {
    setDateFilter('');
    setDoctorFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const handleMarkArrived = async (id: string) => {
    setActionLoading(id);
    setActionError('');
    try {
      await appointmentService.markArrived(id);
      void refetch();
    } catch (err) {
      setActionError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Failed to mark as arrived'
      );
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    setActionError('');
    try {
      await appointmentService.delete(id);
      setConfirmCancelId('');
      void refetch();
    } catch (err) {
      setActionError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Failed to cancel appointment'
      );
    } finally {
      setActionLoading('');
    }
  };

  return (
    <AppLayout>
      <div>
        <h1 style={s.title}>Appointments</h1>

        {/* Filters */}
        <div style={s.filters}>
          <div style={s.filterGroup}>
            <label style={s.filterLabel}>Date</label>
            <input
              type="date"
              style={s.filterInput}
              value={dateFilter}
              onChange={(e) => handleFilterChange('date', e.target.value)}
            />
          </div>
          {isAdmin && (
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Doctor</label>
              <select
                style={s.filterInput}
                value={doctorFilter}
                onChange={(e) => handleFilterChange('doctorId', e.target.value)}
              >
                <option value="">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
          <div style={s.filterGroup}>
            <label style={s.filterLabel}>Status</label>
            <select
              style={s.filterInput}
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_STYLES).map(([val, { label }]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          {(dateFilter || doctorFilter || statusFilter) && (
            <button type="button" style={s.clearBtn} onClick={clearFilters}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Error banner */}
        {actionError && (
          <div style={s.errorBox} role="alert">
            ⚠ {actionError}
            <button type="button" style={s.dismissBtn} onClick={() => setActionError('')}>✕</button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p style={s.loading}>Loading appointments…</p>
        ) : appointments.length === 0 ? (
          <div style={s.empty}>No appointments found for the selected filters.</div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Time', 'Patient', 'Doctor', 'Purpose', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const ss = STATUS_STYLES[appt.status];
                  const isBusy = actionLoading === appt._id;
                  return (
                    <tr key={appt._id} style={s.tr}>
                      <td style={s.td}>
                        <strong>{appt.slotStart}</strong>
                        <span style={s.meta}><br />{appt.date}</span>
                      </td>
                      <td style={s.td}>
                        <strong>{appt.patient.name}</strong>
                        <span style={s.meta}><br />{appt.patient.mobile}</span>
                      </td>
                      <td style={s.td}>
                        {appt.doctor.name}
                        <span style={s.meta}><br />{appt.doctor.department}</span>
                      </td>
                      <td style={s.td}>{appt.purpose ?? '—'}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: ss.bg, color: ss.color }}>
                          {ss.label}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {appt.status === 'booked' && (
                            <button
                              type="button"
                              style={{ ...s.actionBtn, background: '#e8f5e9', color: '#2e7d32' }}
                              disabled={isBusy}
                              onClick={() => void handleMarkArrived(appt._id)}
                            >
                              {isBusy ? '…' : 'Arrived'}
                            </button>
                          )}
                          {['booked', 'arrived'].includes(appt.status) && (
                            confirmCancelId === appt._id ? (
                              <span style={{ display: 'flex', gap: 4 }}>
                                <button
                                  type="button"
                                  style={{ ...s.actionBtn, background: '#fce4ec', color: '#c62828' }}
                                  disabled={isBusy}
                                  onClick={() => void handleCancel(appt._id)}
                                >
                                  {isBusy ? '…' : 'Confirm?'}
                                </button>
                                <button
                                  type="button"
                                  style={s.actionBtn}
                                  onClick={() => setConfirmCancelId('')}
                                >
                                  No
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                style={{ ...s.actionBtn, color: '#c62828' }}
                                onClick={() => setConfirmCancelId(appt._id)}
                              >
                                Cancel
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div style={s.pagination}>
            <button
              type="button"
              style={s.pageBtn}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span style={s.pageInfo}>
              Page {pagination.page} of {pagination.totalPages}
              <span style={s.meta}> ({pagination.total} total)</span>
            </span>
            <button
              type="button"
              style={s.pageBtn}
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const s: Record<string, React.CSSProperties> = {
  title:      { fontSize: 22, fontWeight: 700, color: '#1a237e', margin: '0 0 20px' },
  filters:    { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' },
  filterGroup:{ display: 'flex', flexDirection: 'column', gap: 4 },
  filterLabel:{ fontSize: 12, fontWeight: 600, color: '#666' },
  filterInput:{ padding: '8px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' },
  clearBtn:   { padding: '8px 14px', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-end' },
  loading:    { color: '#888', padding: '40px 0', textAlign: 'center' },
  empty:      { background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  tableWrap:  { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '12px 16px', background: '#f5f7fb', fontSize: 12, fontWeight: 700, color: '#555', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr:         { borderBottom: '1px solid #f5f5f5' },
  td:         { padding: '12px 16px', fontSize: 13, color: '#333', verticalAlign: 'middle' },
  badge:      { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  meta:       { color: '#999', fontSize: 11 },
  actionBtn:  { padding: '4px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: '#f9f9f9', fontFamily: 'inherit' },
  errorBox:   { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dismissBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 16, padding: 0 },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 },
  pageBtn:    { padding: '8px 16px', border: '1.5px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' },
  pageInfo:   { fontSize: 14, color: '#444' },
};

export default AppointmentsPage;
