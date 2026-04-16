import { useState, useEffect } from 'react'
import { getNotificaciones, leerTodasNotifs } from '../api/client'
import { useNavigate } from 'react-router-dom'

const TIPO_CONFIG = {
  reserva: { icon:'🏛️', color:'var(--primary)', bg:'var(--primary-pale)' },
  mensaje: { icon:'💬', color:'#7c3aed',         bg:'#ede9fe' },
}

function agruparPorFecha(notifs) {
  const hoy   = new Date().toISOString().split('T')[0]
  const ayer  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
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
  const navigate = useNavigate()

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
      // Marcar todas como leídas al abrir
      await leerTodasNotifs()
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  const agrupadas = agruparPorFecha(notifs)

  return (
    <div style={{ maxWidth:680, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px' }}>Notificaciones</h1>
          <p style={{ color:'var(--text3)', fontSize:14, marginTop:2 }}>Últimos 7 días</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color:'var(--text3)' }}>Cargando...</p>
      ) : notifs.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'60px 24px', color:'var(--text3)' }}>
          <div style={{ fontSize:48, opacity:.2, marginBottom:16 }}>🔔</div>
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
                  const cfg = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.reserva
                  const hora = n.created_at.split(' ')[1]?.slice(0,5) || ''
                  return (
                    <div key={n.id} style={{
                      display:'flex', alignItems:'flex-start', gap:14,
                      padding:'14px 16px', borderRadius:10,
                      background: n.leida ? 'var(--white)' : 'var(--surface)',
                      border:`1.5px solid ${n.leida ? 'var(--border)' : cfg.color + '33'}`,
                      cursor: n.tipo === 'mensaje' ? 'pointer' : 'default',
                      transition:'all .15s',
                    }}
                    onClick={() => { if (n.tipo === 'mensaje') navigate('/social') }}
                    onMouseEnter={e => { if (n.tipo==='mensaje') e.currentTarget.style.borderColor=cfg.color }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = n.leida ? 'var(--border)' : cfg.color + '33' }}
                    >
                      <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{n.titulo}</span>
                          <span style={{ fontSize:11, color:'var(--text3)', flexShrink:0, marginLeft:12 }}>{hora}</span>
                        </div>
                        <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5 }}>{n.mensaje}</p>
                      </div>
                      {!n.leida && (
                        <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, flexShrink:0, marginTop:5 }}></div>
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