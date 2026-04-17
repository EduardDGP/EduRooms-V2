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

function formatFecha(str) {
  if (!str) return '—'
  return new Date(str + 'Z').toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

export default function Superadmin() {
  const navigate   = useNavigate()
  const [tab,      setTab]      = useState('pendientes')
  const [centros,  setCentros]  = useState([])
  const [stats,    setStats]    = useState(null)
  const [actividad,setActividad]= useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('edu_token')
    if (!token) { navigate('/superadmin/login'); return }
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    try {
      const [c, s, a] = await Promise.all([
        req('GET', '/superadmin/centros'),
        req('GET', '/superadmin/stats'),
        req('GET', '/superadmin/actividad'),
      ])
      setCentros(c); setStats(s); setActividad(a)
    } catch (err) {
      if (err.message.includes('403') || err.message.includes('Token')) navigate('/superadmin/login')
    }
    finally { setLoading(false) }
  }

  async function enviarEnlacePago(id) {
    try {
      const data = await req('POST', '/stripe/crear-sesion', { centro_id: id })
      // Copiar al portapapeles
      await navigator.clipboard.writeText(data.url)
      alert(`✅ Enlace copiado al portapapeles:\n\n${data.url}\n\nEnvíaselo al director del centro.`)
    } catch (err) { alert('Error: ' + err.message) }
  }

  async function aprobar(id, plan) {
    try { await req('PUT', `/superadmin/centros/${id}/aprobar`, { plan }); cargar() }
    catch (err) { alert(err.message) }
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
  function logout() { localStorage.removeItem('edu_token'); navigate('/superadmin/login') }

  const pendientes = centros.filter(c => c.aprobado === 0)
  const activos    = centros.filter(c => c.aprobado === 1)
  const rechazados = centros.filter(c => c.aprobado === 2)

  const s = (style) => ({ fontFamily:'Outfit,sans-serif', ...style })

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

      <div style={{ padding:'32px', maxWidth:1200, margin:'0 auto' }}>

        {/* Stats globales */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:10, marginBottom:28 }}>
            {[
              { label:'Centros',     value: stats.centros_total,      color:'#fff'    },
              { label:'Pendientes',  value: stats.centros_pendientes, color:'#fcd34d' },
              { label:'Activos',     value: stats.centros_activos,    color:'#34d399' },
              { label:'Pruebas',     value: stats.centros_pruebas,    color:'#a78bfa' },
              { label:'De pago',     value: stats.centros_pago,       color:'#34d399' },
              { label:'Profesores',  value: stats.total_profesores,   color:'#60a5fa' },
              { label:'Reservas',    value: stats.total_reservas,     color:'#f472b6' },
              { label:'Guardias',    value: stats.total_guardias,     color:'#fb923c' },
              { label:'Mensajes',    value: stats.total_mensajes,     color:'#4ade80' },
            ].map(s => (
              <div key={s.label} style={{ background:'#111', borderRadius:10, padding:'14px', border:'1px solid rgba(255,255,255,.08)', textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20, background:'#111', borderRadius:10, padding:4, border:'1px solid rgba(255,255,255,.08)', width:'fit-content', flexWrap:'wrap' }}>
          {[
            { key:'pendientes', label:`⏳ Pendientes (${pendientes.length})` },
            { key:'activos',    label:`✅ Activos (${activos.length})`       },
            { key:'rechazados', label:`❌ Rechazados (${rechazados.length})` },
            { key:'todos',      label:`📋 Todos (${centros.length})`         },
            { key:'actividad',  label:`📊 Actividad`                         },
            { key:'estadisticas',label:`🏆 Por centro`                       },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'8px 14px', borderRadius:7, border:'none', cursor:'pointer',
              fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700,
              background: tab===t.key ? '#fff' : 'transparent',
              color: tab===t.key ? '#0a0a0a' : 'rgba(255,255,255,.4)',
            }}>{t.label}</button>
          ))}
        </div>

        {loading ? <p style={{ color:'rgba(255,255,255,.4)' }}>Cargando...</p> : (
          <>
            {/* Lista centros */}
            {['pendientes','activos','rechazados','todos'].includes(tab) && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {(tab==='pendientes' ? pendientes : tab==='activos' ? activos : tab==='rechazados' ? rechazados : centros).map(c => {
                  const planCfg = PLAN_CONFIG[c.plan] || PLAN_CONFIG.pendiente
                  const fecha   = new Date(c.created_at + 'Z').toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })
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
                        <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                          {c.aprobado === 0 && (<>
                            <button onClick={() => aprobar(c.id,'pruebas')} style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#ede9fe', color:'#5b21b6' }}>🧪 Pruebas</button>
                            <button onClick={() => enviarEnlacePago(c.id)} style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#d1fae5', color:'#065f46' }}>💳 Enviar enlace de pago</button>
                            <button onClick={() => rechazar(c.id)} style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#fee2e2', color:'#991b1b' }}>❌ Rechazar</button>
                          </>)}
                          {c.aprobado === 1 && c.plan !== 'bloqueado' && (
                            <button onClick={() => bloquear(c.id)} style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#fef3c7', color:'#92400e' }}>🔒 Bloquear</button>
                          )}
                          {c.aprobado === 1 && c.plan === 'bloqueado' && (
                            <button onClick={() => aprobar(c.id,'activo')} style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#d1fae5', color:'#065f46' }}>🔓 Desbloquear</button>
                          )}
                          {c.aprobado === 2 && (
                            <button onClick={() => aprobar(c.id,'pruebas')} style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:700, background:'#ede9fe', color:'#5b21b6' }}>🔄 Reactivar</button>
                          )}
                          <button onClick={() => eliminar(c.id)} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', cursor:'pointer', background:'transparent', color:'rgba(255,255,255,.4)', fontSize:13 }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {tab === 'pendientes' && pendientes.length === 0 && (
                  <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,.2)' }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                    <p>No hay solicitudes pendientes</p>
                  </div>
                )}
              </div>
            )}

            {/* Actividad reciente */}
            {tab === 'actividad' && actividad && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                {/* Últimas reservas */}
                <div style={{ background:'#111', borderRadius:12, padding:20, border:'1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#fff', marginBottom:14 }}>📅 Últimas reservas</div>
                  {actividad.ultimas_reservas.length === 0 ? <p style={{ color:'rgba(255,255,255,.3)', fontSize:13 }}>Sin reservas</p> :
                  actividad.ultimas_reservas.map((r, i) => (
                    <div key={i} style={{ padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.06)', fontSize:12 }}>
                      <div style={{ color:'#fff', fontWeight:600 }}>{r.prof_nombre} {r.prof_apellidos} → {r.aula_nombre}</div>
                      <div style={{ color:'rgba(255,255,255,.4)', marginTop:2 }}>{r.centro_nombre} · {r.fecha} {r.franja_label} · {formatFecha(r.created_at)}</div>
                    </div>
                  ))}
                </div>

                {/* Últimas guardias */}
                <div style={{ background:'#111', borderRadius:12, padding:20, border:'1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#fff', marginBottom:14 }}>🛡️ Últimas guardias</div>
                  {actividad.ultimas_guardias.length === 0 ? <p style={{ color:'rgba(255,255,255,.3)', fontSize:13 }}>Sin guardias</p> :
                  actividad.ultimas_guardias.map((g, i) => (
                    <div key={i} style={{ padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.06)', fontSize:12 }}>
                      <div style={{ color:'#fff', fontWeight:600 }}>{g.prof_nombre} {g.prof_apellidos} · {g.curso} {g.grupo}</div>
                      <div style={{ color:'rgba(255,255,255,.4)', marginTop:2 }}>{g.centro_nombre} · {g.fecha} {g.franja_label} · {formatFecha(g.created_at)}</div>
                    </div>
                  ))}
                </div>

                {/* Últimos mensajes */}
                <div style={{ background:'#111', borderRadius:12, padding:20, border:'1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#fff', marginBottom:14 }}>💬 Últimos mensajes</div>
                  {actividad.ultimos_mensajes.length === 0 ? <p style={{ color:'rgba(255,255,255,.3)', fontSize:13 }}>Sin mensajes</p> :
                  actividad.ultimos_mensajes.map((m, i) => (
                    <div key={i} style={{ padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.06)', fontSize:12 }}>
                      <div style={{ color:'#fff', fontWeight:600 }}>{m.de_nombre} {m.de_apellidos} → {m.para_nombre} {m.para_apellidos}</div>
                      <div style={{ color:'rgba(255,255,255,.4)', marginTop:2 }}>{m.centro_nombre} · {m.texto?.slice(0,50)}{m.texto?.length > 50 ? '...' : ''} · {formatFecha(m.created_at)}</div>
                    </div>
                  ))}
                </div>

                {/* Últimos directores registrados */}
                <div style={{ background:'#111', borderRadius:12, padding:20, border:'1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#fff', marginBottom:14 }}>🏫 Últimos directores registrados</div>
                  {actividad.ultimos_accesos.length === 0 ? <p style={{ color:'rgba(255,255,255,.3)', fontSize:13 }}>Sin registros</p> :
                  actividad.ultimos_accesos.map((a, i) => (
                    <div key={i} style={{ padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.06)', fontSize:12 }}>
                      <div style={{ color:'#fff', fontWeight:600 }}>{a.nombre} {a.apellidos}</div>
                      <div style={{ color:'rgba(255,255,255,.4)', marginTop:2 }}>{a.centro_nombre} · {a.email} · {formatFecha(a.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estadísticas por centro */}
            {tab === 'estadisticas' && actividad && (
              <div style={{ background:'#111', borderRadius:12, border:'1px solid rgba(255,255,255,.08)', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 100px 80px 80px 80px', padding:'12px 20px', background:'rgba(255,255,255,.05)', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.5px', gap:10 }}>
                  <span>Centro</span><span>Plan</span><span>Profesores</span><span>Reservas</span><span>Guardias</span>
                </div>
                {actividad.stats_por_centro.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,.3)' }}>No hay centros activos</div>
                ) : actividad.stats_por_centro.map((c, i) => {
                  const planCfg = PLAN_CONFIG[c.plan] || PLAN_CONFIG.pendiente
                  return (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 100px 80px 80px 80px', padding:'14px 20px', gap:10, alignItems:'center', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ color:'#fff', fontWeight:600, fontSize:14 }}>{c.nombre}</div>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:planCfg.bg, color:planCfg.color, border:`1px solid ${planCfg.border}`, textAlign:'center' }}>{planCfg.label}</span>
                      <div style={{ color:'#60a5fa', fontWeight:700, fontSize:16, textAlign:'center' }}>{c.profesores}</div>
                      <div style={{ color:'#f472b6', fontWeight:700, fontSize:16, textAlign:'center' }}>{c.reservas}</div>
                      <div style={{ color:'#fb923c', fontWeight:700, fontSize:16, textAlign:'center' }}>{c.guardias}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}