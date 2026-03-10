import { type ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: 'Dashboard', path: '/admin', icon: '⬡' },
    { label: 'Doctors', path: '/admin/doctors', icon: '👨‍⚕️' },
    { label: 'Receptionists', path: '/admin/receptionists', icon: '👤' },
    { label: 'All Appointments', path: '/admin/appointments', icon: '📋' },
  ],
  receptionist: [
    { label: 'Dashboard', path: '/reception', icon: '⬡' },
    { label: 'Schedule', path: '/reception/scheduler', icon: '📅' },
    { label: 'Appointments', path: '/reception/appointments', icon: '📋' },
  ],
  doctor: [
    { label: 'My Schedule', path: '/doctor', icon: '📅' },
    { label: 'Today', path: '/doctor/today', icon: '⏰' },
  ],
};

interface RoleBadge { label: string; color: string }
const ROLE_BADGES: Record<UserRole, RoleBadge> = {
  super_admin: { label: 'Admin',     color: '#e53935' },
  doctor:      { label: 'Doctor',    color: '#1976d2' },
  receptionist:{ label: 'Reception', color: '#388e3c' },
};

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const items: NavItem[] = user ? (NAV_ITEMS[user.role] ?? []) : [];
  const badge: RoleBadge = user ? ROLE_BADGES[user.role] : { label: '', color: '#666' };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={s.wrapper}>
      <aside style={{ ...s.sidebar, width: open ? 240 : 64 }}>
        <div style={s.sidebarHeader}>
          {open && (
            <div style={s.logo}>
              <span style={s.logoIcon}>⚕</span>
              <span style={s.logoText}>MedEMR</span>
            </div>
          )}
          <button style={s.toggleBtn} onClick={() => setOpen((v) => !v)}>
            {open ? '◀' : '▶'}
          </button>
        </div>

        <nav style={s.nav}>
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split('/').length <= 2}
              style={({ isActive }) => ({
                ...s.navLink,
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
              })}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {open && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.userInfo}>
            <div style={{ ...s.roleBadge, background: badge.color }}>{badge.label}</div>
            {open && <div style={s.userName}>{user?.name}</div>}
          </div>
          <button style={s.logoutBtn} onClick={() => void handleLogout()}>
            {open ? '↩ Logout' : '↩'}
          </button>
        </div>
      </aside>

      <main style={s.main}>{children}</main>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  wrapper:       { display:'flex', height:'100vh', overflow:'hidden', background:'#f5f7fb', fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  sidebar:       { background:'linear-gradient(180deg,#1a237e 0%,#283593 100%)', display:'flex', flexDirection:'column', transition:'width 0.25s ease', overflow:'hidden', flexShrink:0, boxShadow:'4px 0 20px rgba(0,0,0,0.15)' },
  sidebarHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 16px', borderBottom:'1px solid rgba(255,255,255,0.1)' },
  logo:          { display:'flex', alignItems:'center', gap:10 },
  logoIcon:      { fontSize:24 },
  logoText:      { color:'#fff', fontWeight:700, fontSize:18, letterSpacing:'0.5px' },
  toggleBtn:     { background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', cursor:'pointer', width:28, height:28, borderRadius:6, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' },
  nav:           { flex:1, padding:'12px 0', overflowY:'auto' },
  navLink:       { display:'flex', alignItems:'center', gap:12, padding:'12px 20px', color:'rgba(255,255,255,0.85)', textDecoration:'none', fontSize:14, fontWeight:500, whiteSpace:'nowrap' },
  navIcon:       { fontSize:18, flexShrink:0, width:24, textAlign:'center' },
  sidebarFooter: { padding:'16px', borderTop:'1px solid rgba(255,255,255,0.1)' },
  userInfo:      { marginBottom:10 },
  roleBadge:     { display:'inline-block', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 },
  userName:      { color:'rgba(255,255,255,0.9)', fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  logoutBtn:     { width:'100%', padding:'8px 12px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, color:'rgba(255,255,255,0.85)', cursor:'pointer', fontSize:13, fontWeight:500 },
  main:          { flex:1, overflow:'auto', padding:'24px' },
};

export default AppLayout;
