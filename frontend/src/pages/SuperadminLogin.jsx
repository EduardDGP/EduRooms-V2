import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SuperadminLogin() {
  const navigate  = useNavigate()
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
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif' }}>
      <div style={{ background:'#111', borderRadius:16, padding:'40px', width:380, border:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff', fontFamily:'Georgia,serif' }}>E</div>
          <span style={{ fontSize:18, fontWeight:800, color:'#fff' }}>Ex<span style={{ color:'#34d399' }}>Rooms</span></span>
          <span style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginLeft:4 }}>Superadmin</span>
        </div>

        <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', marginBottom:8 }}>Panel de control</h1>
        <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginBottom:24 }}>Acceso restringido al equipo de ExRooms</p>

        {error && (
          <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#991b1b', marginBottom:16 }}>
            ⚠️ {error}
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
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px', borderRadius:8, border:'none', background:'#10b981', color:'#fff', fontFamily:'Outfit,sans-serif', fontSize:15, fontWeight:700, cursor:'pointer' }}>
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>
      </div>
    </div>
  )
}