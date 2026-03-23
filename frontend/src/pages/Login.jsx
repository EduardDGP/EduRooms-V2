import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { login as loginApi } from '../api/client'


//Filtro de aprobacion de cuentas tras el registro
export default function Login({ toast }) {
  const { login } = useAuth()
  const navigate    = useNavigate()
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
      // Detectar si es cuenta pendiente o rechazada
      if (err.message.includes('pendiente')) setPending(true)
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'var(--black)' }}>
      {/* Panel izquierdo */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:48, background:'linear-gradient(145deg, #0a0a0a 0%, #111827 100%)', borderRight:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth:360 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:48 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#fff' }}>E</div>
            <span style={{ fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>Edu<span style={{ color:'var(--accent)' }}>Rooms</span></span>
          </div>
          <h2 style={{ fontSize:32, fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:16 }}>Gestión de aulas<br/>para el profesorado</h2>
          <p style={{ color:'rgba(255,255,255,.45)', fontSize:15, lineHeight:1.7 }}>Reserva salas especiales, controla salidas al baño y comunícate con el equipo docente.</p>
          <div style={{ marginTop:48, display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { icon:'🏛️', label:'Reserva de aulas por franjas horarias' },
              { icon:'🚻', label:'Control de salidas al baño' },
              { icon:'💬', label:'Mensajería entre profesores' },
            ].map(f => (
              <div key={f.label} style={{ display:'flex', alignItems:'center', gap:12, color:'rgba(255,255,255,.6)', fontSize:14 }}>
                <span style={{ fontSize:18 }}>{f.icon}</span>{f.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ width:440, display:'flex', alignItems:'center', justifyContent:'center', padding:48, background:'#fff' }}>
        <div style={{ width:'100%', maxWidth:360 }}>
          <div style={{ marginBottom:32 }}>
            <h1 style={{ fontSize:26, fontWeight:800, color:'var(--black)', letterSpacing:'-0.5px' }}>Iniciar sesión</h1>
            <p style={{ color:'var(--text3)', fontSize:14, marginTop:4 }}>Centro Educativo</p>
          </div>

          {/* Mensaje cuenta pendiente */}
          {pending && (
            <div style={{ background:'#fffbeb', border:'1.5px solid #fcd34d', borderRadius:10, padding:'16px 18px', marginBottom:20 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'#92400e', marginBottom:4 }}>⏳ Cuenta pendiente de aprobación</div>
              <p style={{ fontSize:13, color:'#78350f', lineHeight:1.5 }}>
                Tu solicitud está siendo revisada por el director del centro. Recibirás acceso en cuanto sea aprobada.
              </p>
            </div>
          )}

          {error && <div className="error-box">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} placeholder="tu@correo.es" required autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom:24 }}>
              <label>Contraseña</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ background:'var(--black)', color:'#fff', fontSize:15 }}>
              {loading ? 'Entrando...' : 'Entrar →'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:24, fontSize:14, color:'var(--text3)' }}>
            ¿Primera vez?{' '}
            <Link to="/registro" style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none' }}>Solicitar acceso</Link>
          </p>

          <div style={{ marginTop:40, padding:'16px', background:'var(--bg)', borderRadius:10, border:'1.5px solid var(--border)' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Acceso director</div>
            <div style={{ fontSize:12, color:'var(--text2)', fontFamily:'Fira Code, monospace' }}>
              director@edurooms.es<br/>director1234
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}