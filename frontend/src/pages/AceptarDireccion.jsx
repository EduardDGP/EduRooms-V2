import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, LogIn, Crown } from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'

export default function AceptarDireccion() {
  const [params]  = useSearchParams()
  const isMobile  = useIsMobile()
  const [estado,  setEstado]  = useState('cargando')  // 'cargando' | 'ok' | 'error'
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setEstado('error')
      setMensaje('Enlace no válido. Falta el token.')
      return
    }
    fetch(`/api/auth/aceptar-direccion?token=${token}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) {
          setEstado('error')
          setMensaje(d.error || 'No se pudo procesar el traspaso.')
        } else {
          setEstado('ok')
          setMensaje(d.mensaje || 'Eres el nuevo director del centro.')
        }
      })
      .catch(() => {
        setEstado('error')
        setMensaje('No se pudo conectar con el servidor.')
      })
  }, [])

  const iconos = {
    cargando: <Loader2 size={32} className="spin" />,
    ok:       <Crown size={32} />,
    error:    <XCircle size={32} />,
  }

  const colores = {
    cargando: { bg:'var(--primary-pale)', color:'var(--primary)' },
    ok:       { bg:'#fef3c7',             color:'#b45309'        },
    error:    { bg:'var(--red-pale)',     color:'var(--red)'     },
  }[estado]

  const titulos = {
    cargando: 'Procesando traspaso...',
    ok:       '¡Ya eres director/a!',
    error:    'No se pudo completar',
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 16 : 24 }}>
      <div style={{ background:'#fff', borderRadius: isMobile ? 14 : 20, padding: isMobile ? '36px 24px' : '48px 40px', maxWidth:440, width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>
        <div style={{ width:64, height:64, borderRadius:16, background:colores.bg, color:colores.color, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          {iconos[estado]}
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>{titulos[estado]}</h2>
        <p style={{ color:'var(--text3)', fontSize:15, lineHeight:1.6, marginBottom:28 }}>
          {mensaje || 'Procesando tu solicitud...'}
        </p>

        {estado === 'ok' && (
          <Link to="/login" className="btn btn-primary btn-full" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, textDecoration:'none', textAlign:'center', background:'var(--black)', color:'#fff' }}>
            <LogIn size={16} /> Ir al panel de administración
          </Link>
        )}
        {estado === 'error' && (
          <Link to="/login" className="btn btn-outline btn-full" style={{ display:'block', textDecoration:'none', textAlign:'center' }}>
            Volver al inicio
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