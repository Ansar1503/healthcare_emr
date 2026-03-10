// DoctorDashboard.tsx
import { useState } from 'react';
import { appointmentService } from '../services';
import { useApi } from '../hooks';
import AppLayout from '../components/layout/AppLayout';
import type { IAppointment, AppointmentStatus, IPaginatedData } from '../types';

const getTodayStr = (): string => new Date().toISOString().split('T')[0]!;

interface StatusStyle { bg: string; color: string }
const ST: Record<AppointmentStatus, StatusStyle> = {
  booked:    { bg:'#e3f2fd', color:'#1565c0' },
  arrived:   { bg:'#e8f5e9', color:'#2e7d32' },
  completed: { bg:'#f3e5f5', color:'#6a1b9a' },
  cancelled: { bg:'#fce4ec', color:'#880e4f' },
  no_show:   { bg:'#fff3e0', color:'#e65100' },
};

export const DoctorDashboard = () => {
  const [date, setDate] = useState(getTodayStr());

  const { data, loading } = useApi<IPaginatedData<IAppointment>>(
    () => appointmentService.getAll({ date }),
    [date],
    true
  );

  const appointments = data?.data ?? [];
  const stats = {
    total:     appointments.length,
    booked:    appointments.filter((a) => a.status === 'booked').length,
    arrived:   appointments.filter((a) => a.status === 'arrived').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:800 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <h1 style={s.title}>My Schedule</h1>
            <p style={s.sub}>Your appointment schedule</p>
          </div>
          <input type="date" style={s.datePicker} value={date}
            onChange={(e) => setDate(e.target.value)} />
        </div>

        <div style={s.statsGrid}>
          {([
            ['Total', stats.total, '#1a237e', '#e8eaf6'],
            ['Pending', stats.booked, '#1565c0', '#e3f2fd'],
            ['Arrived', stats.arrived, '#2e7d32', '#e8f5e9'],
            ['Completed', stats.completed, '#6a1b9a', '#f3e5f5'],
          ] as [string, number, string, string][]).map(([label, val, color, bg]) => (
            <div key={label} style={{ ...s.statCard, background:bg }}>
              <div style={{ ...s.statVal, color }}>{val}</div>
              <div style={s.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        {loading ? <div style={s.center}>Loading…</div>
          : appointments.length === 0 ? (
            <div style={s.empty}><div style={{ fontSize:40, marginBottom:12 }}>📅</div>
              <p>No appointments for {date}</p></div>
          ) : (
            <div>
              {appointments.map((appt) => {
                const st = ST[appt.status];
                return (
                  <div key={appt._id} style={s.timelineItem}>
                    <div style={s.timeCol}>
                      <div style={s.timeSlot}>{appt.slotStart}</div>
                      <div style={s.timeLine} />
                    </div>
                    <div style={s.apptCard}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:15 }}>{appt.patient.name}</div>
                          <div style={{ fontSize:12, color:'#888' }}>{appt.patient.age}y · {appt.patient.gender} · {appt.patient.mobile}</div>
                        </div>
                        <span style={{ ...s.badge, background:st.bg, color:st.color }}>{appt.status}</span>
                      </div>
                      {appt.purpose && <div style={{ fontSize:13, color:'#555' }}><strong>Purpose:</strong> {appt.purpose}</div>}
                      {appt.notes && <div style={{ fontSize:12, color:'#888', fontStyle:'italic' }}>{appt.notes}</div>}
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

const s: Record<string, React.CSSProperties> = {
  title:       { fontSize:22, fontWeight:700, color:'#1a237e', margin:0 },
  sub:         { color:'#888', margin:'4px 0 0', fontSize:14 },
  datePicker:  { padding:'9px 14px', border:'1.5px solid #e0e0e0', borderRadius:8, fontSize:14, fontFamily:'inherit' },
  statsGrid:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 },
  statCard:    { borderRadius:10, padding:'16px 20px', textAlign:'center' },
  statVal:     { fontSize:28, fontWeight:800, lineHeight:1 },
  statLabel:   { fontSize:13, color:'#666', marginTop:4 },
  center:      { textAlign:'center', color:'#888', padding:'40px', background:'#fff', borderRadius:10 },
  empty:       { textAlign:'center', color:'#999', padding:'60px', background:'#fff', borderRadius:12, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' },
  timelineItem:{ display:'flex', gap:16, marginBottom:4 },
  timeCol:     { display:'flex', flexDirection:'column', alignItems:'center', width:60, flexShrink:0 },
  timeSlot:    { fontSize:13, fontWeight:700, color:'#1a237e', marginBottom:6 },
  timeLine:    { width:2, flex:1, background:'#e8eaf6', minHeight:20 },
  apptCard:    { flex:1, background:'#fff', borderRadius:10, padding:'14px 18px', marginBottom:10, boxShadow:'0 2px 10px rgba(0,0,0,0.06)', border:'1px solid #f0f0f0' },
  badge:       { padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, textTransform:'capitalize', height:'fit-content' },
};

export default DoctorDashboard;
