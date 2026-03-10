import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { patientService, appointmentService } from '../services';
import { useDebounce } from '../hooks';
import AppLayout from '../components/layout/AppLayout';

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingState = location.state;

  const [tab, setTab] = useState('search'); // 'search' | 'new'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [newPatient, setNewPatient] = useState({
    name: '', mobile: '', age: '', gender: '', bloodGroup: '', address: '',
  });

  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!bookingState) {
    return (
      <AppLayout>
        <div style={styles.noState}>
          <p>No slot selected. <a href="/reception/scheduler">Go back to scheduler</a></p>
        </div>
      </AppLayout>
    );
  }

  const { doctorId, doctorName, date, slot } = bookingState;

  const handleSearch = useCallback(async (q) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await patientService.search(q);
      setSearchResults(data.data?.patients || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const debouncedSearch = useCallback(
    (() => {
      let timer;
      return (q) => {
        clearTimeout(timer);
        timer = setTimeout(() => handleSearch(q), 300);
      };
    })(),
    [handleSearch]
  );

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    debouncedSearch(q);
  };

  const handleBooking = async () => {
    setBookingError('');

    let patientId = selectedPatient?._id;

    // Create new patient if needed
    if (tab === 'new') {
      if (!newPatient.name || !newPatient.mobile || !newPatient.age || !newPatient.gender) {
        setBookingError('Please fill all required patient fields');
        return;
      }
      try {
        const { data } = await patientService.create(newPatient);
        patientId = data.data._id;
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to create patient';
        // If duplicate, use existing patient
        if (err.response?.status === 409) {
          patientId = err.response.data.data?._id;
          if (!patientId) { setBookingError(msg); return; }
        } else {
          setBookingError(msg); return;
        }
      }
    }

    if (!patientId) {
      setBookingError('Please select or create a patient');
      return;
    }

    setBooking(true);
    try {
      await appointmentService.create({
        doctorId,
        patientId,
        date,
        slotStart: slot.slotStart,
        purpose,
        notes,
      });
      setSuccess(true);
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Booking failed. The slot may have been taken.');
    } finally {
      setBooking(false);
    }
  };

  if (success) {
    return (
      <AppLayout>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.successTitle}>Appointment Booked!</h2>
          <div style={styles.successDetails}>
            <p><strong>Doctor:</strong> {doctorName}</p>
            <p><strong>Date:</strong> {date}</p>
            <p><strong>Time:</strong> {slot.slotStart} – {slot.slotEnd}</p>
            <p><strong>Patient:</strong> {selectedPatient?.name || newPatient.name}</p>
          </div>
          <div style={styles.successActions}>
            <button style={styles.btnPrimary} onClick={() => navigate('/reception/appointments')}>
              View Appointments
            </button>
            <button style={styles.btnSecondary} onClick={() => navigate('/reception/scheduler')}>
              Book Another
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>← Back to Scheduler</button>

        <h1 style={styles.title}>Book Appointment</h1>

        {/* Slot Summary */}
        <div style={styles.slotSummary}>
          <div style={styles.slotItem}><span style={styles.slotLabel}>Doctor</span><strong>{doctorName}</strong></div>
          <div style={styles.slotItem}><span style={styles.slotLabel}>Date</span><strong>{date}</strong></div>
          <div style={styles.slotItem}><span style={styles.slotLabel}>Time</span><strong>{slot.slotStart} – {slot.slotEnd}</strong></div>
        </div>

        <div style={styles.twoCol}>
          {/* Patient Section */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Patient</h3>

            <div style={styles.tabs}>
              {['search', 'new'].map((t) => (
                <button
                  key={t}
                  style={{
                    ...styles.tab,
                    background: tab === t ? '#1a237e' : '#f5f5f5',
                    color: tab === t ? '#fff' : '#555',
                  }}
                  onClick={() => { setTab(t); setSelectedPatient(null); }}
                >
                  {t === 'search' ? '🔍 Search Existing' : '+ New Patient'}
                </button>
              ))}
            </div>

            {tab === 'search' ? (
              <div>
                <input
                  style={styles.input}
                  placeholder="Search by name or mobile..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                {searching && <p style={styles.hint}>Searching...</p>}
                <div style={styles.searchResults}>
                  {searchResults.map((p) => (
                    <div
                      key={p._id}
                      style={{
                        ...styles.patientCard,
                        border: selectedPatient?._id === p._id
                          ? '2px solid #1a237e'
                          : '2px solid #e0e0e0',
                        background: selectedPatient?._id === p._id ? '#e8eaf6' : '#fff',
                      }}
                      onClick={() => setSelectedPatient(p)}
                    >
                      <strong>{p.name}</strong>
                      <span style={styles.patientMeta}>{p.mobile} · {p.age}y · {p.gender}</span>
                    </div>
                  ))}
                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <p style={styles.hint}>No patients found. Try creating a new one.</p>
                  )}
                </div>
              </div>
            ) : (
              <div style={styles.newPatientForm}>
                {[
                  { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Patient full name' },
                  { label: 'Mobile *', key: 'mobile', type: 'tel', placeholder: '10-digit mobile number' },
                  { label: 'Age *', key: 'age', type: 'number', placeholder: 'Age in years' },
                ].map((f) => (
                  <div key={f.key} style={styles.fieldGroup}>
                    <label style={styles.label}>{f.label}</label>
                    <input
                      style={styles.input}
                      type={f.type}
                      placeholder={f.placeholder}
                      value={newPatient[f.key]}
                      onChange={(e) => setNewPatient({ ...newPatient, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Gender *</label>
                  <select
                    style={styles.input}
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Blood Group</label>
                  <select
                    style={styles.input}
                    value={newPatient.bloodGroup}
                    onChange={(e) => setNewPatient({ ...newPatient, bloodGroup: e.target.value })}
                  >
                    <option value="">Unknown</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Appointment Details</h3>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Purpose of Visit</label>
              <input
                style={styles.input}
                placeholder="e.g. Fever, Checkup, Follow-up..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Notes</label>
              <textarea
                style={{ ...styles.input, height: 100, resize: 'vertical' }}
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {bookingError && (
              <div style={styles.errorBox}>⚠ {bookingError}</div>
            )}

            <button
              style={{
                ...styles.bookBtn,
                opacity: booking ? 0.7 : 1,
                cursor: booking ? 'not-allowed' : 'pointer',
              }}
              onClick={handleBooking}
              disabled={booking}
            >
              {booking ? 'Booking...' : '✓ Confirm Appointment'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

const styles = {
  page: { maxWidth: 900 },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#1a237e',
    fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 0,
  },
  title: { fontSize: 22, fontWeight: 700, color: '#1a237e', margin: '0 0 20px' },
  slotSummary: {
    display: 'flex', gap: 24, background: '#e8eaf6', borderRadius: 10,
    padding: '14px 20px', marginBottom: 24, flexWrap: 'wrap',
  },
  slotItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  slotLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  section: { background: '#fff', borderRadius: 12, padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#333', margin: '0 0 16px' },
  tabs: { display: 'flex', gap: 8, marginBottom: 14 },
  tab: {
    flex: 1, padding: '8px', borderRadius: 8, border: 'none',
    cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
  },
  input: {
    width: '100%', padding: '9px 12px', border: '1.5px solid #e0e0e0',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
    outline: 'none',
  },
  hint: { color: '#999', fontSize: 12, margin: '6px 0' },
  searchResults: { maxHeight: 200, overflowY: 'auto', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 },
  patientCard: {
    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 3, transition: 'all 0.1s',
  },
  patientMeta: { fontSize: 12, color: '#888' },
  newPatientForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, fontWeight: 600, color: '#555' },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
    padding: '10px 14px', color: '#b91c1c', fontSize: 13, marginTop: 8,
  },
  bookBtn: {
    width: '100%', marginTop: 12, padding: '12px', background: '#1a237e',
    color: '#fff', border: 'none', borderRadius: 8, fontSize: 15,
    fontWeight: 700, fontFamily: 'inherit',
  },
  successCard: {
    maxWidth: 440, margin: '60px auto', background: '#fff', borderRadius: 16,
    padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  successIcon: {
    width: 64, height: 64, borderRadius: '50%', background: '#4caf50',
    color: '#fff', fontSize: 28, display: 'flex', alignItems: 'center',
    justifyContent: 'center', margin: '0 auto 20px',
  },
  successTitle: { fontSize: 22, fontWeight: 700, color: '#1a237e', margin: '0 0 16px' },
  successDetails: { textAlign: 'left', background: '#f5f7ff', borderRadius: 10, padding: '16px', marginBottom: 24 },
  successActions: { display: 'flex', gap: 12 },
  btnPrimary: {
    flex: 1, padding: '11px', background: '#1a237e', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnSecondary: {
    flex: 1, padding: '11px', background: '#f5f5f5', color: '#333',
    border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  noState: { padding: 40, textAlign: 'center', color: '#888' },
};

export default BookingPage;
