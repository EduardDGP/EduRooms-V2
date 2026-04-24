import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { Hand, XCircle, Loader2, ArrowRight } from 'lucide-react'

export default function ConfirmarBaja() {
  const [params]  = useSearchParams()
  const isMobile  = useIsMobile()
  const [estado,  setEstado]  = useState('cargando')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setEstado('error'); setMensaje('Token no encontrado'); return }

    fetch(`/api/admin/confirmar-baja?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) { setEstado('ok'); setMensaje(data.mensaje) }
        else { setEstado('error'); setMensaje(data.error) }
      })
      .catch(() => { setEstado('error'); setMensaje('Error al confirmar la baja') })
  }, [])

  const iconos = {
    cargando: <Loader2 size={32} className="spin" />,
    ok:       <Hand size={32} />,
    error:    <XCircle size={32} />,
  }
  const colores = {
    cargando: { bg:'var(--primary-pale)', color:'var(--primary)' },
    ok:       { bg:'var(--red-pale)',     color:'var(--red)'     },
    error:    { bg:'var(--red-pale)',     color:'var(--red)'     },
  }[estado]
  const titulos = {
    cargando: 'Procesando...',
    ok:       'Baja confirmada',
    error:    'Error',
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 16 : 24, fontFamily:'Outfit,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius: isMobile ? 14 : 20, padding: isMobile ? '36px 24px' : '48px 40px', maxWidth:440, width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:32 }}>
          <div style={{ width:38, height:38, borderRadius:8, background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:'Georgia,serif' }}>E</span>
          </div>
          <span style={{ fontSize:20, fontWeight:800, color:'var(--black)' }}>Ex<span style={{ color:'var(--primary)' }}>Rooms</span></span>
        </div>

        <div style={{ width:64, height:64, borderRadius:16, background:colores.bg, color:colores.color, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          {iconos[estado]}
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>{titulos[estado]}</h2>
        {mensaje && (
          <p style={{ color:'var(--text3)', fontSize:15, lineHeight:1.6, marginBottom:28 }}>{mensaje}</p>
        )}
        {estado !== 'cargando' && (
          <Link to="/login" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', background:'var(--black)', color:'#fff', padding:'12px 24px', borderRadius:8, textDecoration:'none', fontWeight:700, fontSize:15 }}>
            Volver al inicio <ArrowRight size={16} />
          </Link>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}