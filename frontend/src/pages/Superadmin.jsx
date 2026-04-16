import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE = '/api'
const req = (method, path, body) =>
  fetch(BASE + path, {
    method,
    headers: { 'Content-Type':'application/json', Authorization:'Bearer '+localStorage.getItem('edu_token') },
    ...(body ? { body: JSON.stringify(body) } : {})
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d })

const PLAN_CONFIG = {
  pendiente: { bg:'#fffbeb', color:'#92400e', border:'#fcd34d', label:'⏳ Pendiente' },
  pruebas:   { bg:'#ede9fe', color:'#5b21b6', border:'#c4b5fd', label:'🧪 Pruebas'   },
  activo:    { bg:'#d1fae5', color:'#065f46', border:'#6ee7b7', label:'✅ Activo'    },
  bloqueado: { bg:'#fee2e2', color:'#991b1b', border:'#fca5a5', label:'🔒 Bloqueado' },
  rechazado: { bg:'#f1f5f9', color:'#475569', border:'#cbd5e1', label:'❌ Rechazado' },
}

export default function Superadmin() {
  const navigate  = useNavigate()
  const [tab,     setTab]     = useState('pendientes')
  const [centros, setCentros] = useState([])
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('edu_token')
    if (!token) { navigate('/superadmin/login'); return }
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    try {
      const [c, s] = await Promise.all([
        req('GET', '/superadmin/centros'),
        req('GET', '/superadmin/stats'),
      ])
      setCentros(c); setStats(s)
    } catch (err) {
      if (err.message.includes('403') || err.message.includes('Token')) navigate('/superadmin/login')
    }
    finally { setLoading(false) }
  }

  async function aprobar(id, plan) {
    try {
      await req('PUT', `/superadmin/centros/${id}/aprobar`, { plan })
      cargar()
    } catch (err) { alert(err.message) }
  }

  async function rechazar(id) {
    if (!confirm('¿Rechazar este centro?')) return
    try { await req('PUT', `/superadmin/centros/${id}/rechazar`); cargar() }
    catch (err) { alert(err.message) }
  }

  async function bloquear(id) {
    if (!confirm('¿Bloquear este centro?')) return
    try { await req('PUT', `/superadmin/centros/${id}/bloquear`); cargar() }
    catch (err) { alert(err.message) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este centro y todos sus datos? Esta acción es irreversible.')) return
    try { await req('DELETE', `/superadmin/centros/${id}`); cargar() }
    catch (err) { alert(err.message) }
  }

  function logout() {
    localStorage.removeItem('edu_token')
    navigate('/superadmin/login')
  }

  const pendientes = centros.filter(c => c.aprobado === 0)
  const activos    = centros.filter(c => c.aprobado === 1)
  const rechazados = centros.filter(c => c.aprobado === 2)

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', fontFamily:'Outfit,sans-serif' }}>

      {/* Navbar */}
      <nav style={{ background:'#111', borderBottom:'1px solid rgba(255,255,255,.08)', padding:'0 32px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#fff', fontFamily:'Georgia,serif' }}>E</div>
          <span style={{ fontSize:16, fontWeight:800, color:'#fff' }}>Ex<span style={{ color:'#34d399' }}>Rooms</span> <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', fontWeight:400 }}>· Superadmin</span></span>
        </div>
        <button onClick={logout} style={{ background:'transparent', border:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.6)', padding:'7px 16px', borderRadius:8, cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:13 }}>
          Cerrar sesión
        </button>
      </nav>

      <div style={{ padding:'32px', maxWidth:1100, margin:'0 auto' }}>

        {/* Stats */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:28 }}>
            {[
              { label:'Total centros',  value: stats.centros_total,      color:'#fff' },
              { label:'Pendientes',     value: stats.centros_pendientes, color:'#fcd34d' },
              { label:'Activos',        value: stats.centros_activos,    color:'#34d399' },
              { label:'Pruebas',        value: stats.centros_pruebas,    color:'#a78bfa' },
              { label:'De pago',        value: stats.centros_pago,       color:'#34d399' },
              { label:'Profesores',     value: stats.total_profesores,   color:'#60a5fa' },
            ].map(s => (
              <div key={s.label} style={{ background:'#111', borderRadius:10, padding:'16px', border:'1px solid rgba(255,255,255,.08)' }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20, background:'#111', borderRadius:10, padding:4, border:'1px solid rgba(255,255,255,.08)', width:'fit-content' }}>
          {[
            { key:'pendientes', label:`⏳ Pendientes (${pendientes.length})` },
            { key:'activos',    label:`✅ Activos (${activos.length})`       },
            { key:'rechazados', label:`❌ Rechazados (${rechazados.length})` },
            { key:'todos',      label:`📋 Todos (${centros.length})`         },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'8px 16px', borderRadius:7, border:'none', cursor:'pointer',
              fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:700,
              background: tab===t.key ? '#fff' : 'transparent',
              color: tab===t.key ? '#0a0a0a' : 'rgba(255,255,255,.4)',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Lista centros */}
        {loading ? (
          <p style={{ color:'rgba(255,255,255,.4)' }}>Cargando...</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {(tab === 'pendientes' ? pendientes
              : tab === 'activos' ? activos
              : tab === 'rechazados' ? rechazados
              : centros
            ).map(c => {
              const planCfg = PLAN_CONFIG[c.plan] || PLAN_CONFIG.pendiente
              const fecha   = new Date(c.created_at).toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })
              return (
                <div key={c.id} style={{ background:'#111', borderRadius:12, padding:20, border:'1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        {c.logo && <img src={c.logo} alt="" style={{ width:32, height:32, borderRadius:6, objectFit:'contain', background:'#fff', padding:2 }} />}
                        <div>
                          <div style={{ fontWeight:700, fontSize:16, color:'#fff' }}>{c.nombre}</div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>Código: {c.codigo} · {c.ciudad || '—'}</div>
                        </div>
                        <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:planCfg.bg, color:planCfg.color, border:`1px solid ${planCfg.border}` }}>
                          {planCfg.label}
                        </span>
                      </div>

                      <div style={{ display:'flex', gap:16, fontSize:12, color:'rgba(255,255,255,.4)', flexWrap:'wrap' }}>
                        {c.director_nombre && <span>👤 {c.director_nombre} {c.director_apellidos} — {c.director_email}</span>}
                        <span>👥 {c.total_profesores} profesores</span>
                        <span>📅 {fecha}</span>
                        <span>{c.email_verificado ? '✅ Email verificado' : '⏳ Email sin verificar'}</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                      {c.aprobado === 0 && (<>
                        <button onClick={() => aprobar(c.id, 'pruebas')} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#ede9fe', color:'#5b21b6' }}>
                          🧪 Aprobar (pruebas)
                        </button>
                        <button onClick={() => aprobar(c.id, 'activo')} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#d1fae5', color:'#065f46' }}>
                          ✅ Aprobar (pago)
                        </button>
                        <button onClick={() => rechazar(c.id)} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#fee2e2', color:'#991b1b' }}>
                          ❌ Rechazar
                        </button>
                      </>)}
                      {c.aprobado === 1 && c.plan !== 'bloqueado' && (
                        <button onClick={() => bloquear(c.id)} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#fef3c7', color:'#92400e' }}>
                          🔒 Bloquear
                        </button>
                      )}
                      {c.aprobado === 1 && c.plan === 'bloqueado' && (
                        <button onClick={() => aprobar(c.id, 'activo')} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#d1fae5', color:'#065f46' }}>
                          🔓 Desbloquear
                        </button>
                      )}
                      <button onClick={() => eliminar(c.id)} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', cursor:'pointer', background:'transparent', color:'rgba(255,255,255,.4)', fontSize:13 }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {(tab === 'pendientes' && pendientes.length === 0) && (
              <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,.2)' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                <p>No hay solicitudes pendientes</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}