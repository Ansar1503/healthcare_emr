import { useState, useCallback, useRef, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { patientService, appointmentService } from "../services";
import AppLayout from "../components/layout/AppLayout";
import {
  createPatientSchema,
  bookingFormSchema,
  validateForm,
  type CreatePatientFormValues,
  type BookingFormValues,
} from "../utils/validation";
import type { IPatient, IBookingNavState } from "../types";

type Tab = "search" | "new";

const EMPTY_NEW_PATIENT: CreatePatientFormValues = {
  name: "",
  mobile: "",
  age: "",
  gender: "" as CreatePatientFormValues["gender"],
  bloodGroup: "",
};

const BookingPage = () => {
  const { state } = useLocation() as { state: IBookingNavState | null };
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
  const [newPatient, setNewPatient] =
    useState<CreatePatientFormValues>(EMPTY_NEW_PATIENT);
  const [newPatientErrors, setNewPatientErrors] = useState<
    Partial<CreatePatientFormValues>
  >({});

  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingErrors, setBookingErrors] = useState<
    Partial<BookingFormValues>
  >({});

  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [success, setSuccess] = useState(false);
  const [bookedPatientName, setBookedPatientName] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await patientService.search(q.trim());
      setSearchResults(data.data?.data ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void handleSearch(q), 300);
  };

  const handleTabSwitch = (t: Tab) => {
    setTab(t);
    setSelectedPatient(null);
    setSearchResults([]);
    setSearchQuery("");
    setNewPatient(EMPTY_NEW_PATIENT);
    setNewPatientErrors({});
    setBookingError("");
  };

  const handleBooking = async (e: FormEvent) => {
    e.preventDefault();

    const bErrors = validateForm(bookingFormSchema, { purpose, notes });
    if (bErrors) {
      setBookingErrors(bErrors);
      return;
    }

    setBookingError("");
    let patientId = selectedPatient?._id ?? "";

    if (tab === "new") {
      const pErrors = validateForm(createPatientSchema, newPatient);
      if (pErrors) {
        setNewPatientErrors(pErrors);
        return;
      }

      try {
        const { data } = await patientService.create({
          ...newPatient,
          age: Number(newPatient.age),
        });
        patientId = data.data!._id;
      } catch (err) {
        const e = err as {
          response?: {
            status?: number;
            data?: { message?: string; data?: IPatient };
          };
        };
        if (e.response?.status === 409 && e.response.data?.data?._id) {
          patientId = e.response.data.data._id;
        } else {
          setBookingError(
            e.response?.data?.message ?? "Failed to create patient",
          );
          return;
        }
      }
    }

    if (!patientId) {
      setBookingError("Please select or create a patient before booking");
      return;
    }

    if (!state) return;

    setBooking(true);
    try {
      await appointmentService.create({
        doctorId: state.doctorId,
        patientId,
        date: state.date,
        slotStart: state.slot.slotStart,
        purpose: purpose || undefined,
        notes: notes || undefined,
      });
      setBookedPatientName(selectedPatient?.name ?? newPatient.name);
      setSuccess(true);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setBookingError(
        e.response?.data?.message ??
          "Booking failed. The slot may already be taken.",
      );
    } finally {
      setBooking(false);
    }
  };

  if (!state) {
    return (
      <AppLayout>
        <div style={s.emptyState}>
          <p>No slot selected.</p>
          <button
            style={s.btnPrimary}
            onClick={() => navigate("/reception/scheduler")}
          >
            Go to Scheduler
          </button>
        </div>
      </AppLayout>
    );
  }

  if (success) {
    return (
      <AppLayout>
        <div style={s.successCard}>
          <div style={s.successIcon}>✓</div>
          <h2 style={s.successTitle}>Appointment Booked!</h2>
          <div style={s.successDetails}>
            <p>
              <strong>Doctor:</strong> {state.doctorName}
            </p>
            <p>
              <strong>Date:</strong> {state.date}
            </p>
            <p>
              <strong>Time:</strong> {state.slot.slotStart} –{" "}
              {state.slot.slotEnd}
            </p>
            <p>
              <strong>Patient:</strong> {bookedPatientName}
            </p>
          </div>
          <div style={s.successActions}>
            <button
              style={s.btnPrimary}
              onClick={() => navigate("/reception/appointments")}
            >
              View Appointments
            </button>
            <button
              style={s.btnSecondary}
              onClick={() => navigate("/reception/scheduler")}
            >
              Book Another
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={s.page}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          ← Back to Scheduler
        </button>
        <h1 style={s.title}>Book Appointment</h1>

        <div style={s.slotSummary}>
          {[
            ["Doctor", state.doctorName],
            ["Date", state.date],
            ["Time", `${state.slot.slotStart} – ${state.slot.slotEnd}`],
          ].map(([label, val]) => (
            <div key={label} style={s.slotItem}>
              <span style={s.slotLabel}>{label}</span>
              <strong>{val}</strong>
            </div>
          ))}
        </div>

        <form onSubmit={(e) => void handleBooking(e)}>
          <div style={s.twoCol}>
            <div style={s.section}>
              <h3 style={s.sectionTitle}>Patient</h3>

              <div style={s.tabs}>
                {(["search", "new"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    style={{
                      ...s.tab,
                      background: tab === t ? "#1a237e" : "#f5f5f5",
                      color: tab === t ? "#fff" : "#555",
                    }}
                    onClick={() => handleTabSwitch(t)}
                  >
                    {t === "search" ? "🔍 Search Existing" : "+ New Patient"}
                  </button>
                ))}
              </div>

              {tab === "search" ? (
                <div>
                  <input
                    style={s.input}
                    placeholder="Search by name or mobile number…"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                  {searching && <p style={s.hint}>Searching…</p>}
                  <div style={s.searchResults}>
                    {searchResults.map((p) => (
                      <div
                        key={p._id}
                        style={{
                          ...s.patientCard,
                          border: `2px solid ${selectedPatient?._id === p._id ? "#1a237e" : "#e0e0e0"}`,
                          background:
                            selectedPatient?._id === p._id ? "#e8eaf6" : "#fff",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setSelectedPatient(p);
                          setBookingError("");
                        }}
                      >
                        <strong>{p.name}</strong>
                        <span style={s.patientMeta}>
                          {p.mobile} · {p.age}y · {p.gender}
                        </span>
                      </div>
                    ))}
                    {searchQuery.trim().length >= 2 &&
                      !searching &&
                      searchResults.length === 0 && (
                        <p style={s.hint}>
                          No patients found. Try the "New Patient" tab.
                        </p>
                      )}
                  </div>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <div>
                    <label style={s.label}>Full Name *</label>
                    <input
                      style={{
                        ...s.input,
                        borderColor: newPatientErrors.name
                          ? "#e53935"
                          : "#e0e0e0",
                      }}
                      value={newPatient.name}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, name: e.target.value })
                      }
                    />
                    {newPatientErrors.name && (
                      <span style={s.fieldError}>{newPatientErrors.name}</span>
                    )}
                  </div>
                  <div>
                    <label style={s.label}>Mobile Number *</label>
                    <input
                      style={{
                        ...s.input,
                        borderColor: newPatientErrors.mobile
                          ? "#e53935"
                          : "#e0e0e0",
                      }}
                      type="tel"
                      value={newPatient.mobile}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, mobile: e.target.value })
                      }
                    />
                    {newPatientErrors.mobile && (
                      <span style={s.fieldError}>
                        {newPatientErrors.mobile}
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={s.label}>Age *</label>
                    <input
                      style={{
                        ...s.input,
                        borderColor: newPatientErrors.age
                          ? "#e53935"
                          : "#e0e0e0",
                      }}
                      type="number"
                      min={0}
                      max={150}
                      value={newPatient.age}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, age: e.target.value })
                      }
                    />
                    {newPatientErrors.age && (
                      <span style={s.fieldError}>{newPatientErrors.age}</span>
                    )}
                  </div>
                  <div>
                    <label style={s.label}>Gender *</label>
                    <select
                      style={{
                        ...s.input,
                        borderColor: newPatientErrors.gender
                          ? "#e53935"
                          : "#e0e0e0",
                      }}
                      value={newPatient.gender}
                      onChange={(e) =>
                        setNewPatient({
                          ...newPatient,
                          gender: e.target
                            .value as CreatePatientFormValues["gender"],
                        })
                      }
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {newPatientErrors.gender && (
                      <span style={s.fieldError}>
                        {newPatientErrors.gender}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={s.section}>
              <h3 style={s.sectionTitle}>Appointment Details</h3>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Purpose of Visit</label>
                <input
                  style={{
                    ...s.input,
                    borderColor: bookingErrors.purpose ? "#e53935" : "#e0e0e0",
                  }}
                  placeholder="e.g. Fever, Checkup, Follow-up…"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
                {bookingErrors.purpose && (
                  <span style={s.fieldError}>{bookingErrors.purpose}</span>
                )}
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Notes</label>
                <textarea
                  style={{ ...s.input, height: 90, resize: "vertical" }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {bookingError && (
                <div style={s.errorBox} role="alert">
                  ⚠ {bookingError}
                </div>
              )}

              <button
                type="submit"
                style={{ ...s.bookBtn, opacity: booking ? 0.7 : 1 }}
                disabled={booking}
              >
                {booking ? "Booking…" : "✓ Confirm Appointment"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900 },
  emptyState: { textAlign: "center", padding: 60, color: "#888" },
  backBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#1a237e",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 16,
    padding: 0,
    fontFamily: "inherit",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1a237e",
    margin: "0 0 20px",
  },
  slotSummary: {
    display: "flex",
    gap: 24,
    background: "#e8eaf6",
    borderRadius: 10,
    padding: "14px 20px",
    marginBottom: 24,
    flexWrap: "wrap",
  },
  slotItem: { display: "flex", flexDirection: "column", gap: 2 },
  slotLabel: {
    fontSize: 11,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  section: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#333",
    margin: "0 0 16px",
  },
  tabs: { display: "flex", gap: 8, marginBottom: 14 },
  tab: {
    flex: 1,
    padding: "8px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    border: "1.5px solid #e0e0e0",
    borderRadius: 8,
    fontSize: 13,
    boxSizing: "border-box",
    fontFamily: "inherit",
    outline: "none",
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#555",
    display: "block",
    marginBottom: 4,
  },
  fieldError: {
    color: "#e53935",
    fontSize: 12,
    display: "block",
    marginTop: 3,
  },
  hint: { color: "#999", fontSize: 12, margin: "6px 0" },
  searchResults: {
    maxHeight: 200,
    overflowY: "auto",
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  patientCard: {
    padding: "10px 14px",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  patientMeta: { fontSize: 12, color: "#888" },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#b91c1c",
    fontSize: 13,
    marginBottom: 12,
  },
  bookBtn: {
    width: "100%",
    padding: "12px",
    background: "#1a237e",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  successCard: {
    maxWidth: 440,
    margin: "60px auto",
    background: "#fff",
    borderRadius: 16,
    padding: "48px 40px",
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#4caf50",
    color: "#fff",
    fontSize: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1a237e",
    margin: "0 0 16px",
  },
  successDetails: {
    textAlign: "left",
    background: "#f5f7ff",
    borderRadius: 10,
    padding: "16px",
    marginBottom: 24,
  },
  successActions: { display: "flex", gap: 12 },
  btnPrimary: {
    flex: 1,
    padding: "11px",
    background: "#1a237e",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnSecondary: {
    flex: 1,
    padding: "11px",
    background: "#f5f5f5",
    color: "#333",
    border: "1.5px solid #e0e0e0",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

export default BookingPage;
