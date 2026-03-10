import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorService, slotService } from '../services';
import { useApi } from '../hooks';
import AppLayout from '../components/layout/AppLayout';

const getTodayStr = () => new Date().toISOString().split('T')[0];

const getNext14Days = () => {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const STATUS_COLORS = {
  available: { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32', cursor: 'pointer' },
  booked: { bg: '#fce4ec', border: '#e91e63', text: '#880e4f', cursor: 'not-allowed' },
  break: { bg: '#f5f5f5', border: '#bdbdbd', text: '#9e9e9e', cursor: 'not-allowed' },
  past: { bg: '#f5f5f5', border: '#e0e0e0', text: '#bdbdbd', cursor: 'not-allowed' },
};

const SchedulerPage = () => {
  const navigate = useNavigate();
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedSlot, setSelectedSlot] = useState(null);

  const { data: doctorsData, loading: doctorsLoading } = useApi(
    () => doctorService.getAll({ isActive: true }),
    [],
    true
  );

  const doctors = doctorsData || [];

  const {
    data: slotsData,
    loading: slotsLoading,
    execute: fetchSlots,
  } = useApi(
    () => slotService.getSlots(selectedDoctor, selectedDate),
    [selectedDoctor, selectedDate],
    !!(selectedDoctor && selectedDate)
  );

  const slots = slotsData?.slots || [];
  const stats = slotsData?.stats || {};

  const handleSlotClick = useCallback(
    (slot) => {
      if (!slot.isAvailable) return;
      setSelectedSlot(slot);
    },
    []
  );

  const handleProceed = () => {
    if (!selectedSlot || !selectedDoctor || !selectedDate) return;
    navigate('/reception/book', {
      state: {
        doctorId: selectedDoctor,
        doctorName: slotsData?.doctorName,
        date: selectedDate,
        slot: selectedSlot,
      },
    });
  };

  const dates = useMemo(() => getNext14Days(), []);

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>Appointment Scheduler</h1>
          <p style={styles.subtitle}>Select doctor, date, and available slot</p>
        </div>

        <div style={styles.controls}>
          {/* Doctor Selection */}
          <div style={styles.controlGroup}>
            <label style={styles.label}>Doctor</label>
            <select
              style={styles.select}
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setSelectedSlot(null);
              }}
              disabled={doctorsLoading}
            >
              <option value="">— Select Doctor —</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} · {d.department}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div style={styles.controlGroup}>
            <label style={styles.label}>Date</label>
            <div style={styles.datePills}>
              {dates.slice(0, 7).map((date) => (
                <button
                  key={date}
                  style={{
                    ...styles.datePill,
                    background: selectedDate === date ? '#1a237e' : '#fff',
                    color: selectedDate === date ? '#fff' : '#444',
                    border: selectedDate === date ? '2px solid #1a237e' : '2px solid #e0e0e0',
                  }}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                >
                  <span style={{ fontSize: 11 }}>{formatDate(date)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Slot Grid */}
        {selectedDoctor && (
          <div style={styles.slotSection}>
            {slotsLoading ? (
              <div style={styles.centerMsg}>Loading slots...</div>
            ) : slots.length === 0 ? (
              <div style={styles.centerMsg}>
                {slotsData?.message || 'No slots available for this day.'}
              </div>
            ) : (
              <>
                <div style={styles.statsBar}>
                  <span style={styles.stat}>
                    <span style={{ color: '#4caf50' }}>●</span> Available: {stats.available}
                  </span>
                  <span style={styles.stat}>
                    <span style={{ color: '#e91e63' }}>●</span> Booked: {stats.booked}
                  </span>
                  <span style={styles.stat}>
                    <span style={{ color: '#bdbdbd' }}>●</span> Break/Past: {(stats.break || 0) + (stats.past || 0)}
                  </span>
                  {slotsData && (
                    <span style={styles.doctorInfo}>
                      {slotsData.doctorName} · {slotsData.workingHours?.startTime}–{slotsData.workingHours?.endTime} · {slotsData.slotDuration}min slots
                    </span>
                  )}
                </div>

                <div style={styles.slotGrid}>
                  {slots.map((slot) => {
                    const colors = STATUS_COLORS[slot.status] || STATUS_COLORS.available;
                    const isSelected = selectedSlot?.slotStart === slot.slotStart;

                    return (
                      <button
                        key={slot.slotStart}
                        style={{
                          ...styles.slotBtn,
                          background: isSelected ? '#1a237e' : colors.bg,
                          border: `2px solid ${isSelected ? '#1a237e' : colors.border}`,
                          color: isSelected ? '#fff' : colors.text,
                          cursor: colors.cursor,
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          boxShadow: isSelected ? '0 4px 12px rgba(26,35,126,0.3)' : 'none',
                        }}
                        onClick={() => handleSlotClick(slot)}
                        disabled={!slot.isAvailable}
                        title={slot.status}
                      >
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{slot.slotStart}</span>
                        <span style={{ fontSize: 11, opacity: 0.8 }}>{slot.slotEnd}</span>
                        {slot.status !== 'available' && (
                          <span style={{ fontSize: 10, textTransform: 'capitalize' }}>
                            {slot.status}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Proceed button */}
        {selectedSlot && (
          <div style={styles.proceedBar}>
            <div style={styles.selectedInfo}>
              <strong>Selected:</strong> {slotsData?.doctorName} · {formatDate(selectedDate)} · {selectedSlot.slotStart}–{selectedSlot.slotEnd}
            </div>
            <button style={styles.proceedBtn} onClick={handleProceed}>
              Continue to Booking →
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const styles = {
  page: { maxWidth: 900 },
  header: { marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a237e', margin: 0 },
  subtitle: { color: '#888', margin: '4px 0 0', fontSize: 14 },
  controls: { display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 },
  controlGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: '#444' },
  select: {
    padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, maxWidth: 400, background: '#fff', fontFamily: 'inherit',
  },
  datePills: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  datePill: {
    padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
    fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
  },
  slotSection: {
    background: '#fff', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  centerMsg: { textAlign: 'center', color: '#888', padding: '40px 0', fontSize: 14 },
  statsBar: {
    display: 'flex', gap: 20, marginBottom: 16, alignItems: 'center',
    flexWrap: 'wrap', fontSize: 13,
  },
  stat: { display: 'flex', alignItems: 'center', gap: 6, color: '#555' },
  doctorInfo: { marginLeft: 'auto', color: '#888', fontSize: 12 },
  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
    gap: 10,
  },
  slotBtn: {
    padding: '10px 6px', borderRadius: 8, fontFamily: 'inherit',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    transition: 'all 0.15s',
  },
  proceedBar: {
    marginTop: 20, background: '#1a237e', borderRadius: 10, padding: '16px 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    color: '#fff',
  },
  selectedInfo: { fontSize: 14 },
  proceedBtn: {
    background: '#fff', color: '#1a237e', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
    fontFamily: 'inherit',
  },
};

export default SchedulerPage;
