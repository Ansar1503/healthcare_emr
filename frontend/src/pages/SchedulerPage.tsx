import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doctorService, slotService } from "../services";
import { useApi } from "../hooks";
import AppLayout from "../components/layout/AppLayout";
import type { IDoctor, ISlot, ISlotPageData, IBookingNavState } from "../types";

const getTodayLocal = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatDate = (dateStr: string): string =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const STATUS_COLORS: Record<string, React.CSSProperties> = {
  available: {
    background: "#e8f5e9",
    borderColor: "#4caf50",
    color: "#2e7d32",
    cursor: "pointer",
  },
  booked: {
    background: "#fce4ec",
    borderColor: "#e91e63",
    color: "#880e4f",
    cursor: "not-allowed",
  },
  break: {
    background: "#f5f5f5",
    borderColor: "#bdbdbd",
    color: "#9e9e9e",
    cursor: "not-allowed",
  },
  past: {
    background: "#f5f5f5",
    borderColor: "#e0e0e0",
    color: "#bdbdbd",
    cursor: "not-allowed",
  },
};

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  booked: "Booked",
  break: "Break",
  past: "Past",
};

const SchedulerPage = () => {
  const navigate = useNavigate();
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());
  const [selectedSlot, setSelectedSlot] = useState<ISlot | null>(null);
  const [validationMsg, setValidationMsg] = useState("");

  const { data: doctorsRaw } = useApi<IDoctor[]>(
    () => doctorService.getAll({ isActive: true }),
    [],
    true,
  );
  const doctors = doctorsRaw ?? [];

  const fetchSlots = useCallback(
    () => slotService.getSlots(selectedDoctor, selectedDate),
    [selectedDoctor, selectedDate],
  );

  const {
    data: slotsData,
    loading: slotsLoading,
    error: slotsError,
  } = useApi<ISlotPageData>(
    fetchSlots,
    [selectedDoctor, selectedDate],
    !!(selectedDoctor && selectedDate),
  );

  const slots = slotsData?.slots ?? [];
  const stats = slotsData?.stats;

  const dates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }),
    [],
  );

  const handleSlotClick = useCallback((slot: ISlot) => {
    if (!slot.isAvailable) return;
    setSelectedSlot(slot);
    setValidationMsg("");
  }, []);

  const handleProceed = () => {
    if (!selectedDoctor) {
      setValidationMsg("Please select a doctor");
      return;
    }
    if (!selectedSlot) {
      setValidationMsg("Please select an available slot");
      return;
    }

    const state: IBookingNavState = {
      doctorId: selectedDoctor,
      doctorName: slotsData?.doctorName ?? "",
      date: selectedDate,
      slot: selectedSlot,
    };
    navigate("/reception/book", { state });
  };

  return (
    <AppLayout>
      <div style={s.page}>
        <h1 style={s.title}>Appointment Scheduler</h1>
        <p style={s.subtitle}>
          Select doctor, date, and an available time slot
        </p>

        <div style={s.controls}>
          <div style={s.fg}>
            <label style={s.label}>Doctor *</label>
            <select
              style={s.select}
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setSelectedSlot(null);
                setValidationMsg("");
              }}
            >
              <option value="">— Select Doctor —</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} · {d.department}
                </option>
              ))}
            </select>
          </div>

          <div style={s.fg}>
            <label style={s.label}>Date</label>
            <div style={s.datePills}>
              {dates.map((date) => (
                <button
                  key={date}
                  type="button"
                  style={{
                    ...s.datePill,
                    background: selectedDate === date ? "#1a237e" : "#fff",
                    color: selectedDate === date ? "#fff" : "#444",
                    border: `2px solid ${selectedDate === date ? "#1a237e" : "#e0e0e0"}`,
                  }}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                >
                  {formatDate(date)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedDoctor && (
          <div style={s.slotsSection}>
            <div style={s.slotsHeader}>
              <h3 style={s.slotsTitle}>
                {slotsData?.doctorName ?? ""} — {formatDate(selectedDate)}
              </h3>
              {stats && (
                <div style={s.statsRow}>
                  {[
                    {
                      label: "Available",
                      count: stats.available,
                      color: "#2e7d32",
                    },
                    { label: "Booked", count: stats.booked, color: "#880e4f" },
                    { label: "Break", count: stats.break, color: "#9e9e9e" },
                    { label: "Past", count: stats.past, color: "#bdbdbd" },
                  ].map(({ label, count, color }) => (
                    <span key={label} style={{ ...s.statBadge, color }}>
                      {count} {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {slotsLoading && <p style={s.loadingMsg}>Loading slots…</p>}

            {slotsError && <div style={s.errorBox}>⚠ {slotsError}</div>}

            {!slotsLoading && !slotsError && slots.length === 0 && (
              <div style={s.emptySlots}>
                {slotsData?.message ?? "No slots available for this day."}
              </div>
            )}

            <div style={s.slotsGrid}>
              {slots.map((slot) => {
                const isSelected = selectedSlot?.slotStart === slot.slotStart;
                const colorStyle = STATUS_COLORS[slot.status] ?? {};
                return (
                  <button
                    key={slot.slotStart}
                    type="button"
                    onClick={() => handleSlotClick(slot)}
                    disabled={!slot.isAvailable}
                    aria-label={`${slot.slotStart} – ${slot.slotEnd} (${STATUS_LABELS[slot.status]})`}
                    style={{
                      ...s.slotBtn,
                      ...colorStyle,
                      outline: isSelected ? "3px solid #1a237e" : "none",
                      outlineOffset: isSelected ? 2 : 0,
                      opacity: slot.status === "past" ? 0.5 : 1,
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>{slot.slotStart}</strong>
                    <span style={{ fontSize: 11 }}>
                      {STATUS_LABELS[slot.status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={s.actionBar}>
          {selectedSlot && (
            <div style={s.selectedInfo}>
              <span style={s.selectedLabel}>Selected:</span>
              <strong>
                {selectedSlot.slotStart} – {selectedSlot.slotEnd}
              </strong>
              {slotsData?.doctorName && (
                <span style={{ color: "#666" }}> · {slotsData.doctorName}</span>
              )}
            </div>
          )}

          {validationMsg && (
            <span style={{ color: "#e53935", fontSize: 13 }}>
              {validationMsg}
            </span>
          )}

          <button
            type="button"
            onClick={handleProceed}
            style={{
              ...s.proceedBtn,
              opacity: !selectedSlot || !selectedDoctor ? 0.5 : 1,
            }}
            disabled={!selectedSlot || !selectedDoctor}
          >
            Proceed to Booking →
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: {},
  title: { fontSize: 22, fontWeight: 700, color: "#1a237e", margin: "0 0 4px" },
  subtitle: { color: "#888", margin: "0 0 24px", fontSize: 14 },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    marginBottom: 28,
  },
  fg: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: "#444" },
  select: {
    padding: "10px 14px",
    border: "1.5px solid #e0e0e0",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    background: "#fff",
  },
  datePills: { display: "flex", gap: 8, flexWrap: "wrap" },
  datePill: {
    padding: "7px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  slotsSection: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginBottom: 20,
  },
  slotsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },
  slotsTitle: { fontSize: 16, fontWeight: 700, color: "#333", margin: 0 },
  statsRow: { display: "flex", gap: 16 },
  statBadge: { fontSize: 12, fontWeight: 600 },
  slotsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
    gap: 8,
  },
  slotBtn: {
    padding: "10px 6px",
    borderRadius: 8,
    border: "1.5px solid",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    fontFamily: "inherit",
    transition: "outline 0.1s",
  },
  loadingMsg: { color: "#888", fontSize: 14, padding: "20px 0" },
  emptySlots: {
    color: "#888",
    fontSize: 14,
    padding: "20px 0",
    textAlign: "center",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#b91c1c",
    fontSize: 13,
    marginBottom: 12,
  },
  actionBar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#fff",
    borderRadius: 12,
    padding: "16px 20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  selectedInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    fontSize: 14,
  },
  selectedLabel: { fontSize: 12, color: "#888", fontWeight: 600 },
  proceedBtn: {
    padding: "11px 28px",
    background: "#1a237e",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

export default SchedulerPage;
