import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const BASE = '/api'
const get  = (url) => fetch(BASE + url).then(r => r.json())
const post = (url, body) => fetch(BASE + url, {
  method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body)
}).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })

export default function Register({ toast }) {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [modo,    setModo]    = useState('profesor')  // 'profesor' | 'centro'
  const [centros, setCentros] = useState([])
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Formulario profesor
  const [formProf, setFormProf] = useState({ nombre:'', apellidos:'', email:'', password:'', asignatura:'', centro_id:'' })
  // Formulario director + centro
  const [formDir, setFormDir] = useState({ centro_nombre:'', centro_codigo:'', centro_ciudad:'', centro_provincia:'', nombre:'', apellidos:'', email:'', password:'' })

  useEffect(() => {
    get('/auth/centros').then(data => setCentros(Array.isArray(data) ? data : []))
  }, [])

  async function handleProfesor(e) {
    e.preventDefault()
    setError('')
    if (formProf.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (!formProf.centro_id) { setError('Selecciona un centro educativo'); return }
    setLoading(true)
    try {
      await post('/auth/registro', formProf)
      setSuccess(true)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleDirector(e) {
    e.preventDefault()
    setError('')
    if (formDir.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      const data = await post('/auth/centro', formDir)
      // El centro queda pendiente de aprobación
      setSuccess(true)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (success) return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'48px 40px', maxWidth:440, width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>
        <div style={{ width:64, height:64, borderRadius:16, background:'var(--green-pale)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 20px' }}>⏳</div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>Solicitud enviada</h2>
        <p style={{ color:'var(--text3)', fontSize:15, lineHeight:1.6, marginBottom:28 }}>
          {modo === 'centro'
            ? <>Tu solicitud de registro del centro está siendo revisada por el equipo de <strong>ExRooms</strong>. Te contactaremos en breve.</>
            : <>Tu cuenta está <strong>pendiente de aprobación</strong> por el director del centro.<br/><br/>Recibirás acceso una vez que sea aprobada.</>
          }
        </p>
        <Link to="/login" className="btn btn-primary btn-full" style={{ display:'block', textDecoration:'none', textAlign:'center', background:'var(--black)', color:'#fff' }}>
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'40px', maxWidth:520, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
          <Link to="/login" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:8, background:'#0a0a0a', border:'1.5px solid rgba(0,0,0,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><span style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:'Georgia, serif', letterSpacing:'-1px' }}>E</span></div>
            <span style={{ fontSize:20, fontWeight:800, color:'var(--black)', letterSpacing:'-0.5px' }}>Ex<span style={{ color:'var(--primary)' }}>Rooms</span></span>
          </Link>
        </div>

        <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Crear cuenta</h1>

        {/* Selector de modo */}
        <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--bg)', borderRadius:10, padding:4, border:'1.5px solid var(--border)' }}>
          {[
            { key:'profesor', label:'👨‍🏫 Soy profesor' },
            { key:'centro',   label:'🏫 Registrar centro' },
          ].map(m => (
            <button key={m.key} onClick={() => { setModo(m.key); setError('') }} style={{
              flex:1, padding:'9px', borderRadius:7, border:'none', cursor:'pointer',
              fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:700,
              background: modo===m.key ? 'var(--black)' : 'transparent',
              color: modo===m.key ? '#fff' : 'var(--text3)',
              transition:'all .18s',
            }}>{m.label}</button>
          ))}
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}

        {/* Formulario profesor */}
        {modo === 'profesor' && (
          <form onSubmit={handleProfesor}>
            <div style={{ background:'var(--primary-pale)', border:'1.5px solid #6ee7b7', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'var(--primary-dark)' }}>
              ℹ️ Tu cuenta necesitará aprobación del director antes de poder acceder.
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" value={formProf.nombre} onChange={e => setFormProf(f => ({...f, nombre:e.target.value}))} required autoFocus />
              </div>
              <div className="form-group">
                <label>Apellidos</label>
                <input type="text" value={formProf.apellidos} onChange={e => setFormProf(f => ({...f, apellidos:e.target.value}))} required />
              </div>
            </div>
            <div className="form-group">
              <label>Centro educativo</label>
              <select value={formProf.centro_id} onChange={e => setFormProf(f => ({...f, centro_id:e.target.value}))} required>
                <option value="">— Selecciona tu centro —</option>
                {centros.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.ciudad ? `(${c.ciudad})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" value={formProf.email} onChange={e => setFormProf(f => ({...f, email:e.target.value}))} required />
            </div>
            <div className="form-group">
              <label>Asignatura</label>
              <input type="text" value={formProf.asignatura} onChange={e => setFormProf(f => ({...f, asignatura:e.target.value}))} placeholder="Ej: Física y Química" required />
            </div>
            <div className="form-group" style={{ marginBottom:24 }}>
              <label>Contraseña</label>
              <input type="password" value={formProf.password} onChange={e => setFormProf(f => ({...f, password:e.target.value}))} required minLength={6} />
            </div>
            <button type="submit" className="btn btn-full" disabled={loading} style={{ background:'var(--black)', color:'#fff', fontSize:15, fontWeight:700 }}>
              {loading ? 'Enviando...' : 'Solicitar acceso →'}
            </button>
          </form>
        )}

        {/* Formulario director + centro */}
        {modo === 'centro' && (
          <form onSubmit={handleDirector}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:12 }}>Datos del centro</div>
            <div className="form-group">
              <label>Nombre del centro</label>
              <input type="text" value={formDir.centro_nombre} onChange={e => setFormDir(f => ({...f, centro_nombre:e.target.value}))} placeholder="Ej: IES Ejemplo" required autoFocus />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Código identificador</label>
                <input type="text" value={formDir.centro_codigo} onChange={e => setFormDir(f => ({...f, centro_codigo:e.target.value.toUpperCase()}))} placeholder="Ej: IESEJ01" required maxLength={20} />
              </div>
              <div className="form-group">
                <label>Ciudad</label>
                <input type="text" value={formDir.centro_ciudad} onChange={e => setFormDir(f => ({...f, centro_ciudad:e.target.value}))} placeholder="Ej: Badajoz" />
              </div>
            </div>

            <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', margin:'16px 0 12px' }}>Tu cuenta (director)</div>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" value={formDir.nombre} onChange={e => setFormDir(f => ({...f, nombre:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Apellidos</label>
                <input type="text" value={formDir.apellidos} onChange={e => setFormDir(f => ({...f, apellidos:e.target.value}))} required />
              </div>
            </div>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" value={formDir.email} onChange={e => setFormDir(f => ({...f, email:e.target.value}))} required />
            </div>
            <div className="form-group" style={{ marginBottom:24 }}>
              <label>Contraseña</label>
              <input type="password" value={formDir.password} onChange={e => setFormDir(f => ({...f, password:e.target.value}))} required minLength={6} />
            </div>
            <button type="submit" className="btn btn-full" disabled={loading} style={{ background:'var(--black)', color:'#fff', fontSize:15, fontWeight:700 }}>
              {loading ? 'Creando centro...' : 'Registrar centro →'}
            </button>
          </form>
        )}

        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--text3)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none' }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}