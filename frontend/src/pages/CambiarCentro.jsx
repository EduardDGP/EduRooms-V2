import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { AlertTriangle, ArrowRight, ArrowLeft, School, CheckCircle2 } from 'lucide-react'

const BASE = '/api'
const get  = (url) => fetch(BASE + url).then(r => r.json())
const post = (url, body) => fetch(BASE + url, {
  method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body)
}).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })

export default function CambiarCentro() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const [centros, setCentros] = useState([])
  const [form,    setForm]    = useState({ email:'', password:'', centro_id:'' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    get('/auth/centros').then(data => setCentros(Array.isArray(data) ? data : []))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.centro_id) { setError('Selecciona el nuevo centro'); return }
    setLoading(true)
    try {
      const data = await post('/auth/cambiar-centro', form)
      setMensaje(data.mensaje)
      setSuccess(true)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (success) return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 16 : 24 }}>
      <div style={{ background:'#fff', borderRadius: isMobile ? 14 : 20, padding: isMobile ? '36px 24px' : '48px 40px', maxWidth:440, width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>
        <div style={{ width:64, height:64, borderRadius:16, background:'var(--green-pale)', color:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <CheckCircle2 size={32} />
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>Solicitud enviada</h2>
        <p style={{ color:'var(--text3)', fontSize:15, lineHeight:1.6, marginBottom:28 }}>
          {mensaje}
        </p>
        <Link to="/login" className="btn btn-primary btn-full" style={{ display:'block', textDecoration:'none', textAlign:'center', background:'var(--black)', color:'#fff' }}>
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 16 : 24 }}>
      <div style={{ background:'#fff', borderRadius: isMobile ? 14 : 20, padding: isMobile ? '28px 22px' : 40, maxWidth:480, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <Link to="/login" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:8, background:'#0a0a0a', border:'1.5px solid rgba(0,0,0,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:'Georgia, serif', letterSpacing:'-1px' }}>E</span>
            </div>
            <span style={{ fontSize:20, fontWeight:800, color:'var(--black)', letterSpacing:'-0.5px' }}>Ex<span style={{ color:'var(--primary)' }}>Rooms</span></span>
          </Link>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <School size={20} style={{ color:'var(--primary)' }} />
          <h1 style={{ fontSize:22, fontWeight:800 }}>Cambiar de centro</h1>
        </div>
        <p style={{ color:'var(--text3)', fontSize:14, marginBottom:22 }}>
          Si ya no perteneces a tu antiguo centro, entra con tu cuenta y elige el nuevo.
        </p>

        <div style={{ background:'var(--primary-pale)', border:'1.5px solid #6ee7b7', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'var(--primary-dark)', display:'flex', gap:8, alignItems:'flex-start' }}>
          <AlertTriangle size={16} style={{ flexShrink:0, marginTop:2 }} />
          <span>Tu cuenta quedará pendiente de aprobación del director del nuevo centro. Recibirá un email con tu solicitud.</span>
        </div>

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
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} placeholder="••••••••" required />
          </div>
          <div className="form-group" style={{ marginBottom:24 }}>
            <label>Nuevo centro educativo</label>
            <select value={form.centro_id} onChange={e => setForm(f => ({...f, centro_id:e.target.value}))} required>
              <option value="">— Selecciona tu nuevo centro —</option>
              {centros.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.ciudad ? `(${c.ciudad})` : ''}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-full" disabled={loading} style={{ background:'var(--black)', color:'#fff', fontSize:15, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? 'Enviando solicitud...' : <>Solicitar acceso al nuevo centro <ArrowRight size={16} /></>}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:14 }}>
          <Link to="/login" style={{ color:'var(--text3)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6 }}>
            <ArrowLeft size={14} /> Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}