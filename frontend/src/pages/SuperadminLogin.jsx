import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { AlertTriangle, ArrowRight } from 'lucide-react'

export default function SuperadminLogin() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const [form,    setForm]    = useState({ email:'', password:'' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.profesor.rol !== 'superadmin') throw new Error('Acceso restringido')
      localStorage.setItem('edu_token', data.token)
      navigate('/superadmin')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 16 : 24, fontFamily:'Outfit,sans-serif' }}>
      <div style={{ background:'#111', borderRadius: isMobile ? 14 : 16, padding: isMobile ? '32px 24px' : 40, width:'100%', maxWidth:380, border:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32, flexWrap:'wrap' }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff', fontFamily:'Georgia,serif', flexShrink:0 }}>E</div>
          <span style={{ fontSize:18, fontWeight:800, color:'#fff' }}>Ex<span style={{ color:'#34d399' }}>Rooms</span></span>
          <span style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginLeft:4 }}>Superadmin</span>
        </div>

        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', marginBottom:8 }}>Panel de control</h1>
        <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginBottom:24 }}>Acceso restringido al equipo de ExRooms</p>

        {error && (
          <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#991b1b', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))}
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', color:'#fff', fontFamily:'Outfit,sans-serif', fontSize:14, outline:'none', boxSizing:'border-box' }}
              required autoFocus />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Contraseña</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))}
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', color:'#fff', fontFamily:'Outfit,sans-serif', fontSize:14, outline:'none', boxSizing:'border-box' }}
              required />
          </div>
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px', borderRadius:8, border:'none', background:'#10b981', color:'#fff', fontFamily:'Outfit,sans-serif', fontSize:15, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? 'Entrando...' : <>Entrar <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}