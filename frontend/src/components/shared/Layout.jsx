import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useEffect, useState } from 'react'
import { getNoLeidas } from '../../api/client'

const Icons = {
  aulas:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  alumnos: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  social:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  perfil:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  admin:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
  notifs:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  guardias:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
}

export default function Layout({ toast }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isDirector = user?.rol === 'director'
  const isAdmin    = ['director','jefe_estudios','superadmin'].includes(user?.rol)
  const [noLeidas, setNoLeidas] = useState(0)

  useEffect(() => {
    cargarNoLeidas()
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarNoLeidas, 30000)
    return () => clearInterval(interval)
  }, [])

  async function cargarNoLeidas() {
    try {
      const data = await getNoLeidas()
      setNoLeidas(data.total)
    } catch (err) { /* silencioso */ }
  }

  function handleLogout() { logout(); navigate('/login') }

  const initials = user ? user.nombre[0] + user.apellidos[0] : '?'
  const fotoSrc  = user?.foto ? user.foto : null

  const navLinks = [
    { to:'/aulas',          icon: Icons.aulas,    label:'Aulas'           },
    { to:'/alumnos',        icon: Icons.alumnos,  label:'Alumnos'         },
    { to:'/guardias',       icon: Icons.guardias, label:'Guardias'        },
    { to:'/social',         icon: Icons.social,   label:'Social'          },
    { to:'/notificaciones', icon: Icons.notifs,   label:'Notificaciones', badge: noLeidas },
    { to:'/perfil',         icon: Icons.perfil,   label:'Perfil'          },
  ]
  if (isAdmin) navLinks.push({ to:'/admin', icon: Icons.admin, label:'Admin' })

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg)', overflow:'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside style={{ width:220, flexShrink:0, background:'#0a0a0a', display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,.06)', overflow:'hidden' }}>

        {/* Logo */}
        <div style={{ padding:'28px 20px 24px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <NavLink to="/aulas" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
            {user?.centro_logo ? (
              <img src={user.centro_logo} alt="Logo centro" style={{ width:32, height:32, objectFit:'contain', flexShrink:0, background:'#fff', borderRadius:6, padding:2 }} />
            ) : (
              <div style={{ width:32, height:32, borderRadius:8, background:'#0a0a0a', border:'1.5px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:16, fontWeight:900, color:'#fff', fontFamily:'Georgia, serif', letterSpacing:'-1px' }}>E</span>
              </div>
            )}
            <span style={{ fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-0.5px', fontFamily:'Outfit,sans-serif' }}>
              Ex<span style={{ color:'var(--accent)' }}>Rooms</span>
            </span>
          </NavLink>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'16px 12px', display:'flex', flexDirection:'column', gap:2 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.25)', letterSpacing:'1.2px', textTransform:'uppercase', padding:'8px 10px 6px', marginBottom:4 }}>
            Navegación
          </div>
          {navLinks.map(({ to, icon, label, badge }) => (
            <NavLink key={to} to={to}
              onClick={() => { if (to === '/notificaciones') setNoLeidas(0) }}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 12px', borderRadius:8, textDecoration:'none',
                fontFamily:'Outfit,sans-serif', fontSize:13.5, fontWeight: isActive ? 600 : 400,
                background: isActive ? 'rgba(255,255,255,.08)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,.45)',
                borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                transition:'all .15s',
                position:'relative',
              })}>
              <span style={{ flexShrink:0, display:'flex' }}>{icon}</span>
              <span style={{ flex:1 }}>{label}</span>
              {badge > 0 && (
                <span style={{ background:'var(--red)', color:'#fff', fontSize:10, fontWeight:800, padding:'2px 6px', borderRadius:20, minWidth:18, textAlign:'center', lineHeight:'16px' }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding:'16px 12px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
          <NavLink to="/perfil" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10, padding:'10px 10px', borderRadius:8, marginBottom:4, transition:'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <div className="avatar avatar-sm" style={{ flexShrink:0 }}>
              {fotoSrc ? <img src={fotoSrc} alt="" /> : initials}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {user?.nombre} {user?.apellidos}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:1 }}>
                {user?.rol === 'director' ? 'Director/a' : user?.rol === 'jefe_estudios' ? 'Jefe/a de Estudios' : user?.rol === 'superadmin' ? 'Superadmin' : user?.asignatura}
              </div>
            </div>
          </NavLink>

          <button onClick={handleLogout} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:400, color:'rgba(255,255,255,.35)', transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.12)'; e.currentTarget.style.color='#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,.35)' }}>
            {Icons.logout} Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido ───────────────────────────────────── */}
      <main style={{ flex:1, overflowY:'auto', padding:'36px 40px' }}>
        <Outlet />
      </main>
    </div>
  )
}