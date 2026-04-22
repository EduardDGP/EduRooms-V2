import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { login as loginApi } from '../api/client'
import { School, DoorOpen, MessageSquare, AlertTriangle, ArrowRight } from 'lucide-react'

export default function Login({ toast }) {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const [form,    setForm]    = useState({ email:'', password:'' })
  const [error,   setError]   = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setPending(false)
    setLoading(true)
    try {
      const data = await loginApi(form)
      login(data.token, data.profesor)
      navigate('/aulas')
    } catch (err) {
      if (err.message.includes('pendiente') || err.message.includes('centro')) setPending(true)
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection: isMobile ? 'column' : 'row', background:'var(--black)' }}>

      {/* Panel izquierdo — solo visible en desktop */}
      {!isMobile && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:48, background:'linear-gradient(145deg, #0a0a0a 0%, #111827 100%)', borderRight:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ maxWidth:360 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:48 }}>
              <div style={{ width:48, height:48, borderRadius:10, background:'#0a0a0a', border:'1.5px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><span style={{ fontSize:22, fontWeight:900, color:'#fff', fontFamily:'Georgia, serif', letterSpacing:'-1px' }}>E</span></div>
              <span style={{ fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>Ex<span style={{ color:'var(--accent)' }}>Rooms</span></span>
            </div>
            <h2 style={{ fontSize:32, fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:16 }}>Gestión de aulas<br/>para el profesorado</h2>
            <p style={{ color:'rgba(255,255,255,.45)', fontSize:15, lineHeight:1.7 }}>Reserva salas especiales, controla salidas al baño y comunícate con el equipo docente.</p>
            <div style={{ marginTop:48, display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { icon:<School size={18} />,        label:'Reserva de aulas por franjas horarias' },
                { icon:<DoorOpen size={18} />,      label:'Control de salidas al baño' },
                { icon:<MessageSquare size={18} />, label:'Mensajería entre profesores' },
              ].map(f => (
                <div key={f.label} style={{ display:'flex', alignItems:'center', gap:12, color:'rgba(255,255,255,.6)', fontSize:14 }}>
                  <span style={{ color:'var(--accent)', display:'flex' }}>{f.icon}</span>{f.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header compacto en móvil */}
      {isMobile && (
        <div style={{ padding:'32px 24px 16px', background:'linear-gradient(145deg, #0a0a0a 0%, #111827 100%)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center' }}>
            <div style={{ width:38, height:38, borderRadius:8, background:'#0a0a0a', border:'1.5px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><span style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:'Georgia, serif', letterSpacing:'-1px' }}>E</span></div>
            <span style={{ fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>Ex<span style={{ color:'var(--accent)' }}>Rooms</span></span>
          </div>
        </div>
      )}

      {/* Panel derecho — formulario */}
      <div style={{
        width: isMobile ? '100%' : 440,
        flex: isMobile ? 1 : 'none',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding: isMobile ? '32px 24px' : 48,
        background:'#fff',
      }}>
        <div style={{ width:'100%', maxWidth:360 }}>
          <div style={{ marginBottom:32 }}>
            <h1 style={{ fontSize:26, fontWeight:800, color:'var(--black)', letterSpacing:'-0.5px' }}>Iniciar sesión</h1>
            <p style={{ color:'var(--text3)', fontSize:14, marginTop:4 }}>Centro Educativo</p>
          </div>

          {pending && (
            <div style={{ background:'#fffbeb', border:'1.5px solid #fcd34d', borderRadius:10, padding:'16px 18px', marginBottom:20 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'#92400e', marginBottom:4 }}>Acceso pendiente</div>
              <p style={{ fontSize:13, color:'#78350f', lineHeight:1.5 }}>
                Tu cuenta o centro está pendiente de aprobación. Si eres director, el equipo de ExRooms revisará tu solicitud en breve.
              </p>
            </div>
          )}

          {error && (
            <div className="error-box" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} placeholder="tu@correo.es" required autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom:24 }}>
              <label>Contraseña</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ background:'var(--black)', color:'#fff', fontSize:15, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {loading ? 'Entrando...' : <>Entrar <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:16, fontSize:14 }}>
            <Link to="/reset-password" style={{ color:'var(--text3)', textDecoration:'none' }}>¿Olvidaste tu contraseña?</Link>
          </p>

          <p style={{ textAlign:'center', marginTop:8, fontSize:14, color:'var(--text3)' }}>
            ¿Primera vez?{' '}
            <Link to="/registro" style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none' }}>Solicitar acceso</Link>
          </p>

          <p style={{ textAlign:'center', marginTop:8, fontSize:14, color:'var(--text3)' }}>
            ¿Has cambiado de centro?{' '}
            <Link to="/cambiar-centro" style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none' }}>Cámbialo aquí</Link>
          </p>
        </div>
      </div>
    </div>
  )
}