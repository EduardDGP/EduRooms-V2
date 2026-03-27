import { useState } from 'react'
import { Link } from 'react-router-dom'
import { registro } from '../api/client'

export default function Register({ toast }) {
  const [form,    setForm]    = useState({ nombre:'', apellidos:'', email:'', password:'', asignatura:'' })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = field => e => setForm(f => ({...f, [field]:e.target.value}))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      await registro(form)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'48px 40px', maxWidth:440, width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>
        <div style={{ width:64, height:64, borderRadius:16, background:'var(--green-pale)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 20px' }}>⏳</div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>Solicitud enviada</h2>
        <p style={{ color:'var(--text3)', fontSize:15, lineHeight:1.6, marginBottom:28 }}>
          Tu cuenta está <strong>pendiente de aprobación</strong> por el director del centro.<br/><br/>
          Una vez aprobada podrás iniciar sesión con normalidad.
        </p>
        <Link to="/login" style={{ display:'block', padding:'13px', background:'var(--black)', color:'#fff', borderRadius:8, textDecoration:'none', fontWeight:700, fontSize:15, textAlign:'center' }}>
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, maxWidth:480, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
          <img src="/logo.png" alt="Logo" style={{ width:38, height:38, objectFit:'contain', flexShrink:0, background:'#fff', borderRadius:6, padding:2 }} />
          <span style={{ fontSize:20, fontWeight:800, color:'var(--black)', letterSpacing:'-0.5px' }}>Edu<span style={{ color:'var(--primary)' }}>Rooms</span></span>
        </div>

        <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Solicitar acceso</h1>
        <p style={{ color:'var(--text3)', fontSize:14, marginBottom:20 }}>El director aprobará tu cuenta antes de que puedas entrar.</p>

        <div style={{ background:'var(--primary-pale)', border:'1.5px solid #6ee7b7', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'var(--primary-dark)', display:'flex', gap:10 }}>
          <span>ℹ️</span>
          <span>Solo el profesorado del centro puede registrarse. Tu cuenta quedará pendiente hasta que el director la apruebe.</span>
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" value={form.nombre} onChange={set('nombre')} placeholder="Ej: Ana" required autoFocus />
            </div>
            <div className="form-group">
              <label>Apellidos</label>
              <input type="text" value={form.apellidos} onChange={set('apellidos')} placeholder="Ej: García López" required />
            </div>
          </div>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="tu@correo.es" required />
          </div>
          <div className="form-group">
            <label>Asignatura principal</label>
            <input type="text" value={form.asignatura} onChange={set('asignatura')} placeholder="Ej: Física y Química" required />
          </div>
          <div className="form-group" style={{ marginBottom:24 }}>
            <label>Contraseña (mínimo 6 caracteres)</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required minLength={6} />
          </div>
          <button type="submit" className="btn btn-full" disabled={loading} style={{ background:'var(--black)', color:'#fff', fontSize:15, fontWeight:700, borderRadius:8 }}>
            {loading ? 'Enviando...' : 'Enviar solicitud →'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--text3)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none' }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}