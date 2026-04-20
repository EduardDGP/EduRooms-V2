import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useEffect, useState } from 'react'
import { getNoLeidas } from '../../api/client'
import { LayoutGrid, Users, Shield, MessageSquare, Bell, User, Settings, LogOut, Menu, X } from 'lucide-react'

const Icons = {
  aulas:   <LayoutGrid size={18} />,
  alumnos: <Users size={18} />,
  social:  <MessageSquare size={18} />,
  perfil:  <User size={18} />,
  admin:   <Settings size={18} />,
  notifs:  <Bell size={18} />,
  guardias:<Shield size={18} />,
  logout:  <LogOut size={16} />,
}

export default function Layout({ toast }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const isAdmin  = ['director','jefe_estudios','superadmin'].includes(user?.rol)
  const [noLeidas, setNoLeidas]       = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    cargarNoLeidas()
    const interval = setInterval(cargarNoLeidas, 30000)
    return () => clearInterval(interval)
  }, [])

  // Cerrar drawer al cambiar de ruta
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (isMobile && sidebarOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isMobile, sidebarOpen])

  async function cargarNoLeidas() {
    try {
      const data = await getNoLeidas()
      setNoLeidas(data.total)
    } catch (err) { /* silencioso */ }
  }

  function handleLogout() { logout(); navigate('/login') }
  const closeSidebar = () => setSidebarOpen(false)

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

  // Sidebar: drawer fijo en móvil / columna estática en desktop
  const sidebarStyle = isMobile
    ? {
        position:'fixed', top:0, left:0, height:'100vh', width:260, zIndex:1000,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform .25s ease',
        background:'#0a0a0a',
        display:'flex', flexDirection:'column',
        borderRight:'1px solid rgba(255,255,255,.06)',
        boxShadow: sidebarOpen ? '6px 0 24px rgba(0,0,0,.4)' : 'none',
      }
    : {
        width:220, flexShrink:0, background:'#0a0a0a',
        display:'flex', flexDirection:'column',
        borderRight:'1px solid rgba(255,255,255,.06)',
        overflow:'hidden',
      }

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg)', overflow:'hidden' }}>

      {/* ── Backdrop (solo móvil con drawer abierto) ──── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
            zIndex:999, backdropFilter:'blur(2px)',
          }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside style={sidebarStyle}>

        {/* Logo + botón cerrar en móvil */}
        <div style={{ padding:'28px 20px 24px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <NavLink to="/aulas" onClick={closeSidebar} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
            {user?.centro_logo ? (
              <img src={user.centro_logo} alt="Logo centro" style={{ width:32, height:32, objectFit:'contain', flexShrink:0, background:'#fff', borderRadius:6, padding:2 }} />
            ) : (
              <div style={{ width:32, height:32, borderRadius:8, background:'#0a0a0a', border:'1.5px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:16, fontWeight:900, color:'#fff', fontFamily:'Georgia, serif', letterSpacing:'-1px' }}>E</span>
              </div>
            )}
            <span style={{ fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-0.5px', fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              Ex<span style={{ color:'var(--accent)' }}>Rooms</span>
            </span>
          </NavLink>

          {isMobile && (
            <button onClick={closeSidebar} aria-label="Cerrar menú"
              style={{ width:32, height:32, border:'none', background:'transparent', color:'rgba(255,255,255,.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, flexShrink:0 }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'16px 12px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.25)', letterSpacing:'1.2px', textTransform:'uppercase', padding:'8px 10px 6px', marginBottom:4 }}>
            Navegación
          </div>
          {navLinks.map(({ to, icon, label, badge }) => (
            <NavLink key={to} to={to}
              onClick={() => {
                if (to === '/notificaciones') setNoLeidas(0)
                closeSidebar()
              }}
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
        <div style={{ padding:'16px 12px', borderTop:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
          <NavLink to="/perfil" onClick={closeSidebar} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10, padding:'10px 10px', borderRadius:8, marginBottom:4, transition:'background .15s' }}
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
      <main style={{
        flex:1, overflowY:'auto',
        padding: isMobile ? '64px 16px 24px' : '36px 40px',
        width: isMobile ? '100%' : 'auto',
      }}>
        {/* Botón hamburguesa (solo móvil) */}
        {isMobile && (
          <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"
            style={{
              position:'fixed', top:12, left:12, zIndex:998,
              width:40, height:40, borderRadius:10,
              border:'1px solid rgba(255,255,255,.08)',
              background:'rgba(10,10,10,.85)', backdropFilter:'blur(10px)',
              color:'#fff', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
            <Menu size={20} />
          </button>
        )}
        <Outlet />
      </main>
    </div>
  )
}