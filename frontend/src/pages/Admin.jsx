import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const BASE = '/api'
const req = (method, path, body) =>
  fetch(BASE + path, {
    method,
    headers: { 'Content-Type':'application/json', Authorization:'Bearer '+localStorage.getItem('edu_token') },
    ...(body ? { body: JSON.stringify(body) } : {})
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d })

export default function Admin({ toast }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab,          setTab]          = useState('pendientes')
  const [pendientes,   setPendientes]   = useState([])
  const [profesores,   setProfesores]   = useState([])
  const [centro,       setCentro]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [subiendoLogo, setSubiendoLogo] = useState(false)

  useEffect(() => {
    if (!user || !['director','jefe_estudios','superadmin'].includes(user.rol)) { navigate('/aulas'); return }
    cargar()
  }, [user])

  async function cargar() {
    setLoading(true)
    try {
      const [p, a, c] = await Promise.all([
        req('GET', '/admin/pendientes'),
        req('GET', '/admin/profesores'),
        req('GET', '/admin/centro'),
      ])
      setPendientes(p); setProfesores(a); setCentro(c)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  async function aprobar(id, nombre) {
    try { await req('PUT', `/admin/aprobar/${id}`); toast(`✅ ${nombre} aprobado/a`, 'success'); cargar() }
    catch (err) { toast(err.message, 'error') }
  }

  async function rechazar(id, nombre) {
    if (!confirm(`¿Rechazar la cuenta de ${nombre}?`)) return
    try { await req('PUT', `/admin/rechazar/${id}`); toast('Cuenta rechazada', 'info'); cargar() }
    catch (err) { toast(err.message, 'error') }
  }

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar permanentemente la cuenta de ${nombre}?`)) return
    try { await req('DELETE', `/admin/profesores/${id}`); toast('Cuenta eliminada', 'info'); cargar() }
    catch (err) { toast(err.message, 'error') }
  }

  async function promoverJefe(id, nombre) {
    if (!confirm(`¿Hacer a ${nombre} Jefe/a de Estudios? Tendrá acceso al panel de administración.`)) return
    try { await req('PUT', `/admin/promover-jefe/${id}`); toast(`👔 ${nombre} es ahora Jefe/a de Estudios`, 'success'); cargar() }
    catch (err) { toast(err.message, 'error') }
  }

  async function degradarProfesor(id, nombre) {
    if (!confirm(`¿Quitar el rol de Jefe de Estudios a ${nombre}?`)) return
    try { await req('PUT', `/admin/degradar-profesor/${id}`); toast(`${nombre} vuelve a ser profesor/a`, 'info'); cargar() }
    catch (err) { toast(err.message, 'error') }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setSubiendoLogo(true)
    try {
      const form = new FormData()
      form.append('logo', file)
      const res  = await fetch('/api/admin/centro/logo', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('edu_token') },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast('Logo actualizado ✅', 'success')
      cargar()
    } catch (err) { toast(err.message, 'error') }
    finally { setSubiendoLogo(false) }
  }

  const aprobados  = profesores.filter(p => p.aprobado === 1)
  const rechazados = profesores.filter(p => p.aprobado === 2)
  const jefes      = profesores.filter(p => p.rol === 'jefe_estudios')

  if (loading) return <p style={{ color:'var(--text3)' }}>Cargando panel...</p>

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px' }}>Panel de Administración</h1>
        <p style={{ color:'var(--text3)', fontSize:14, marginTop:2 }}>Gestión de cuentas del profesorado</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Pendientes', value:pendientes.length, color:'#f59e0b',       pale:'#fffbeb',            icon:'⏳' },
          { label:'Aprobados',  value:aprobados.length,  color:'var(--primary)', pale:'var(--primary-pale)', icon:'✅' },
          { label:'Rechazados', value:rechazados.length, color:'var(--red)',     pale:'var(--red-pale)',     icon:'❌' },
          { label:'Jefes Est.', value:jefes.length,      color:'#7c3aed',       pale:'#ede9fe',            icon:'👔' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:18 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:s.pale, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--white)', borderRadius:10, padding:5, border:'1.5px solid var(--border)', width:'fit-content' }}>
        {[
          { key:'pendientes', label:`⏳ Pendientes (${pendientes.length})` },
          { key:'aprobados',  label:`✅ Aprobados (${aprobados.length})`   },
          { key:'rechazados', label:`❌ Rechazados (${rechazados.length})` },
          { key:'jefes',      label:`👔 Jefes Est. (${jefes.length})`      },
          { key:'centro',     label:`🏫 Mi Centro`                         },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'8px 16px', borderRadius:7, border:'none', cursor:'pointer',
            fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:700,
            background: tab===t.key ? 'var(--black)' : 'transparent',
            color: tab===t.key ? '#fff' : 'var(--text3)', transition:'all .18s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Pendientes */}
      {tab === 'pendientes' && (
        pendientes.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text3)' }}>
            <div style={{ fontSize:48, opacity:.3, marginBottom:12 }}>✅</div>
            <p style={{ fontSize:16, fontWeight:600 }}>No hay cuentas pendientes</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {pendientes.map(p => (
              <div key={p.id} className="card" style={{ display:'flex', alignItems:'center', gap:16, padding:20 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,var(--primary),var(--accent))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#fff', flexShrink:0 }}>
                  {p.nombre[0]}{p.apellidos[0]}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:16 }}>{p.nombre} {p.apellidos}</div>
                  <div style={{ fontSize:13, color:'var(--text3)' }}>✉️ {p.email} · 📚 {p.asignatura}</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-green btn-sm" onClick={() => aprobar(p.id, `${p.nombre} ${p.apellidos}`)}>✅ Aprobar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => rechazar(p.id, `${p.nombre} ${p.apellidos}`)}>❌ Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Aprobados */}
      {tab === 'aprobados' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {aprobados.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text3)' }}>
              <div style={{ fontSize:48, opacity:.3, marginBottom:12 }}>👥</div>
              <p>No hay profesores aprobados todavía.</p>
            </div>
          ) : aprobados.map(p => (
            <div key={p.id} className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:18 }}>
              <div style={{ width:42, height:42, borderRadius:10, background:'var(--primary-pale)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'var(--primary)', flexShrink:0 }}>
                {p.nombre[0]}{p.apellidos[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{p.nombre} {p.apellidos}</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>✉️ {p.email} · 📚 {p.asignatura}</div>
              </div>
              <span style={{ padding:'4px 11px', borderRadius:20, fontSize:11, fontWeight:700, background:'var(--green-pale)', color:'var(--primary-dark)', border:'1px solid #6ee7b7' }}>✅ Activo</span>
              <div style={{ display:'flex', gap:6 }}>
                {user?.rol === 'director' && (
                  <button className="btn btn-outline btn-sm" onClick={() => promoverJefe(p.id, `${p.nombre} ${p.apellidos}`)} style={{ color:'#7c3aed', borderColor:'#c4b5fd' }} title="Hacer Jefe de Estudios">👔 Jefe</button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => rechazar(p.id, p.nombre)}>Suspender</button>
                <button className="btn btn-outline btn-sm" onClick={() => eliminar(p.id, p.nombre)} style={{ color:'var(--red)', borderColor:'#fecaca' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rechazados */}
      {tab === 'rechazados' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {rechazados.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text3)' }}>
              <div style={{ fontSize:48, opacity:.3, marginBottom:12 }}>🚫</div>
              <p>No hay cuentas rechazadas.</p>
            </div>
          ) : rechazados.map(p => (
            <div key={p.id} className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:18, opacity:.8 }}>
              <div style={{ width:42, height:42, borderRadius:10, background:'var(--red-pale)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'var(--red)', flexShrink:0 }}>
                {p.nombre[0]}{p.apellidos[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{p.nombre} {p.apellidos}</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>✉️ {p.email}</div>
              </div>
              <span style={{ padding:'4px 11px', borderRadius:20, fontSize:11, fontWeight:700, background:'var(--red-pale)', color:'var(--red)', border:'1px solid #fecaca' }}>❌ Rechazado</span>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-green btn-sm" onClick={() => aprobar(p.id, p.nombre)}>Aprobar</button>
                <button className="btn btn-outline btn-sm" onClick={() => eliminar(p.id, p.nombre)} style={{ color:'var(--red)', borderColor:'#fecaca' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Jefes de estudios */}
      {tab === 'jefes' && (
        <div>
          {jefes.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text3)' }}>
              <div style={{ fontSize:48, opacity:.3, marginBottom:12 }}>👔</div>
              <p style={{ fontSize:16, fontWeight:600 }}>No hay jefes de estudios</p>
              <p style={{ fontSize:14, marginTop:8, color:'var(--text3)' }}>Aprueba una cuenta de profesor y usa el botón 👔 Jefe para promoverlo.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {jefes.map(p => (
                <div key={p.id} className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:18 }}>
                  <div style={{ width:42, height:42, borderRadius:10, background:'#ede9fe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#7c3aed', flexShrink:0 }}>
                    {p.nombre[0]}{p.apellidos[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>{p.nombre} {p.apellidos}</div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>✉️ {p.email} · 📚 {p.asignatura}</div>
                  </div>
                  <span style={{ padding:'4px 11px', borderRadius:20, fontSize:11, fontWeight:700, background:'#ede9fe', color:'#7c3aed', border:'1px solid #c4b5fd' }}>👔 Jefe de Estudios</span>
                  {user?.rol === 'director' && (
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => degradarProfesor(p.id, p.nombre)}>↓ Profesor</button>
                      <button className="btn btn-outline btn-sm" onClick={() => eliminar(p.id, p.nombre)} style={{ color:'var(--red)', borderColor:'#fecaca' }}>🗑️</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mi Centro */}
      {tab === 'centro' && (
        <div className="card" style={{ maxWidth:560 }}>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:20, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
            🏫 Información del centro
          </div>

          {centro ? (
            <>
              {/* Logo */}
              <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:24 }}>
                <div style={{ width:80, height:80, borderRadius:12, background:'var(--bg)', border:'1.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                  {centro.logo
                    ? <img src={centro.logo} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }} />
                    : <span style={{ fontSize:32, fontWeight:900, color:'var(--text3)', fontFamily:'Georgia, serif' }}>E</span>
                  }
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:6 }}>Logo del centro</div>
                  <p style={{ fontSize:13, color:'var(--text3)', marginBottom:10 }}>Aparecerá en el sidebar para todos los profesores del centro.</p>
                  <label style={{ display:'inline-block', cursor:'pointer' }}>
                    <span className="btn btn-outline btn-sm" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                      {subiendoLogo ? '⏳ Subiendo...' : '📁 Cambiar logo'}
                    </span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" style={{ display:'none' }} onChange={handleLogoUpload} disabled={subiendoLogo} />
                  </label>
                </div>
              </div>

              {/* Info */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {[
                  { label:'Nombre',   value: centro.nombre          },
                  { label:'Código',   value: centro.codigo          },
                  { label:'Ciudad',   value: centro.ciudad   || '—' },
                  { label:'Provincia',value: centro.provincia|| '—' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--text3)', marginBottom:6, display:'block' }}>{f.label}</label>
                    <div style={{ fontSize:14, fontWeight:500, padding:'9px 12px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:8 }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color:'var(--text3)' }}>Cargando info del centro...</p>
          )}
        </div>
      )}
    </div>
  )
}