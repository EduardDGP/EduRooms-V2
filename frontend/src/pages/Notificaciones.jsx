import { useState, useEffect } from 'react'
import { getNotificaciones, leerTodasNotifs } from '../api/client'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { Bell, MessageSquare, Calendar, Shield } from 'lucide-react'

const TIPO_CONFIG = {
  reserva: { icon: <Calendar size={18}/>,       color:'var(--primary)', bg:'var(--primary-pale)' },
  mensaje: { icon: <MessageSquare size={18}/>,  color:'#7c3aed',        bg:'#ede9fe' },
  guardia: { icon: <Shield size={18}/>,         color:'#f59e0b',        bg:'#fffbeb' },
}

function agruparPorFecha(notifs) {
  const hoy  = new Date().toISOString().split('T')[0]
  const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  return notifs.reduce((acc, n) => {
    const fecha = n.created_at.split(' ')[0] || n.created_at.split('T')[0]
    const label = fecha === hoy ? 'Hoy' : fecha === ayer ? 'Ayer'
      : new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })
    if (!acc[label]) acc[label] = []
    acc[label].push(n)
    return acc
  }, {})
}

export default function Notificaciones({ toast }) {
  const [notifs,  setNotifs]  = useState([])
  const [loading, setLoading] = useState(true)
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()

  useEffect(() => {
    cargar()
    const interval = setInterval(cargar, 30000)
    return () => clearInterval(interval)
  }, [])

  async function cargar() {
    setLoading(true)
    try {
      const data = await getNotificaciones()
      setNotifs(data)
      await leerTodasNotifs()
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  const agrupadas = agruparPorFecha(notifs)

  return (
    <div style={{ maxWidth:680, margin:'0 auto' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight:800, letterSpacing:'-0.5px' }}>Notificaciones</h1>
        <p style={{ color:'var(--text3)', fontSize:14, marginTop:2 }}>Últimos 7 días</p>
      </div>

      {loading ? (
        <p style={{ color:'var(--text3)' }}>Cargando...</p>
      ) : notifs.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'60px 24px', color:'var(--text3)' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
            <Bell size={48} style={{ opacity:.2, color:'var(--text3)' }} />
          </div>
          <p style={{ fontSize:16, fontWeight:600 }}>Sin notificaciones</p>
          <p style={{ fontSize:14, marginTop:6 }}>Aquí aparecerán las reservas y mensajes de tus compañeros.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
          {Object.entries(agrupadas).map(([fecha, lista]) => (
            <div key={fecha}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:10, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>
                {fecha}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {lista.map(n => {
                  const cfg  = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.reserva
                  const hora = new Date(n.created_at + 'Z').toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })
                  return (
                    <div key={n.id} style={{
                      display:'flex', alignItems:'flex-start', gap:12,
                      padding: isMobile ? '12px 14px' : '14px 16px', borderRadius:10,
                      background: n.leida ? 'var(--white)' : 'var(--surface)',
                      border:`1.5px solid ${n.leida ? 'var(--border)' : cfg.color + '33'}`,
                      cursor: n.tipo === 'mensaje' ? 'pointer' : 'default',
                      transition:'all .15s',
                      minWidth:0,
                    }}
                    onClick={() => { if (n.tipo === 'mensaje') navigate('/social') }}
                    onMouseEnter={e => { if (n.tipo==='mensaje') e.currentTarget.style.borderColor = cfg.color }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = n.leida ? 'var(--border)' : cfg.color + '33' }}
                    >
                      <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, color:cfg.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{
                          display:'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          alignItems: isMobile ? 'flex-start' : 'center',
                          justifyContent: isMobile ? 'flex-start' : 'space-between',
                          gap: isMobile ? 2 : 8,
                          marginBottom:3,
                        }}>
                          <span style={{ fontWeight:700, fontSize:14, color:'var(--text)', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap' }}>
                            {n.titulo}
                          </span>
                          <span style={{ fontSize:11, color:'var(--text3)', flexShrink:0, whiteSpace:'nowrap' }}>{hora}</span>
                        </div>
                        <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5, wordBreak:'break-word' }}>{n.mensaje}</p>
                      </div>
                      {!n.leida && (
                        <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, flexShrink:0, marginTop:10 }}></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}