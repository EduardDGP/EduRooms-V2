import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { AlertTriangle, Mail, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'

export default function ResetPassword() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const token     = params.get('token')
  const [paso,    setPaso]    = useState(token ? 'nueva' : 'solicitar')
  const [email,   setEmail]   = useState('')
  const [password,setPassword]= useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error,   setError]   = useState('')

  async function handleSolicitar(e) {
    e.preventDefault()
    setError(''); setMensaje('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMensaje(data.mensaje)
      setPaso('enviado')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPaso('hecho')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 16 : 24, fontFamily:'Outfit,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius: isMobile ? 14 : 20, padding: isMobile ? '32px 24px' : '48px 40px', maxWidth:420, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: isMobile ? 24 : 32 }}>
          <div style={{ width:38, height:38, borderRadius:8, background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:18, fontWeight:900, color:'#fff', fontFamily:'Georgia,serif' }}>E</span>
          </div>
          <span style={{ fontSize:20, fontWeight:800, color:'var(--black)' }}>Ex<span style={{ color:'var(--primary)' }}>Rooms</span></span>
        </div>

        {/* Solicitar enlace */}
        {paso === 'solicitar' && (
          <>
            <h1 style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>¿Olvidaste tu contraseña?</h1>
            <p style={{ color:'var(--text3)', fontSize:14, marginBottom:24 }}>Introduce tu email y te enviaremos un enlace para restablecerla.</p>
            {error && (
              <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#991b1b', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <AlertTriangle size={15} /> {error}
              </div>
            )}
            <form onSubmit={handleSolicitar}>
              <div className="form-group">
                <label>Correo electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="tu@email.com" />
              </div>
              <button type="submit" disabled={loading} className="btn btn-full" style={{ background:'var(--black)', color:'#fff', fontSize:15, fontWeight:700, marginBottom:16, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading ? 'Enviando...' : <>Enviar enlace <ArrowRight size={16} /></>}
              </button>
            </form>
            <Link to="/login" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', textAlign:'center', fontSize:14, color:'var(--text3)', textDecoration:'none' }}>
              <ArrowLeft size={14} /> Volver al inicio de sesión
            </Link>
          </>
        )}

        {/* Email enviado */}
        {paso === 'enviado' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:16, background:'#d1fae5', color:'#065f46', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <Mail size={32} />
            </div>
            <h2 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>Revisa tu email</h2>
            <p style={{ color:'var(--text3)', fontSize:15, lineHeight:1.6, marginBottom:28 }}>{mensaje}</p>
            <Link to="/login" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', background:'var(--black)', color:'#fff', padding:'12px 24px', borderRadius:8, textDecoration:'none', fontWeight:700, fontSize:15 }}>
              Volver al inicio <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Nueva contraseña */}
        {paso === 'nueva' && (
          <>
            <h1 style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>Nueva contraseña</h1>
            <p style={{ color:'var(--text3)', fontSize:14, marginBottom:24 }}>Elige una contraseña segura de al menos 6 caracteres.</p>
            {error && (
              <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#991b1b', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <AlertTriangle size={15} /> {error}
              </div>
            )}
            <form onSubmit={handleReset}>
              <div className="form-group">
                <label>Nueva contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoFocus />
              </div>
              <div className="form-group" style={{ marginBottom:24 }}>
                <label>Confirmar contraseña</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
              </div>
              <button type="submit" disabled={loading} className="btn btn-full" style={{ background:'var(--black)', color:'#fff', fontSize:15, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading ? 'Guardando...' : <>Guardar contraseña <ArrowRight size={16} /></>}
              </button>
            </form>
          </>
        )}

        {/* Contraseña cambiada */}
        {paso === 'hecho' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:16, background:'#d1fae5', color:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>Contraseña actualizada</h2>
            <p style={{ color:'var(--text3)', fontSize:15, lineHeight:1.6, marginBottom:28 }}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <Link to="/login" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', background:'var(--black)', color:'#fff', padding:'12px 24px', borderRadius:8, textDecoration:'none', fontWeight:700, fontSize:15 }}>
              Iniciar sesión <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}