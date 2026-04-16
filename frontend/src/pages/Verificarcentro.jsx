import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export default function VerificarCentro() {
  const [params]  = useSearchParams()
  const [estado,  setEstado]  = useState('cargando') // cargando | ok | error
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setEstado('error'); setMensaje('Token no encontrado'); return }

    fetch(`/api/auth/verificar-centro?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) { setEstado('ok'); setMensaje(data.mensaje) }
        else { setEstado('error'); setMensaje(data.error) }
      })
      .catch(() => { setEstado('error'); setMensaje('Error al verificar') })
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Outfit,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'48px 40px', maxWidth:440, width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>
        {estado === 'cargando' && (
          <>
            <div style={{ fontSize:48, marginBottom:16 }}>⏳</div>
            <h2 style={{ fontSize:20, fontWeight:800 }}>Verificando...</h2>
          </>
        )}
        {estado === 'ok' && (
          <>
            <div style={{ width:64, height:64, borderRadius:16, background:'#d1fae5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 20px' }}>✅</div>
            <h2 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>Email verificado</h2>
            <p style={{ color:'#555', fontSize:15, lineHeight:1.6, marginBottom:28 }}>{mensaje}</p>
            <Link to="/login" style={{ display:'block', background:'#0a0a0a', color:'#fff', padding:'12px 24px', borderRadius:8, textDecoration:'none', fontWeight:700, fontSize:15 }}>
              Volver al inicio →
            </Link>
          </>
        )}
        {estado === 'error' && (
          <>
            <div style={{ width:64, height:64, borderRadius:16, background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 20px' }}>❌</div>
            <h2 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>Error de verificación</h2>
            <p style={{ color:'#555', fontSize:15, lineHeight:1.6, marginBottom:28 }}>{mensaje}</p>
            <Link to="/login" style={{ display:'block', background:'#0a0a0a', color:'#fff', padding:'12px 24px', borderRadius:8, textDecoration:'none', fontWeight:700, fontSize:15 }}>
              Volver al inicio →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}