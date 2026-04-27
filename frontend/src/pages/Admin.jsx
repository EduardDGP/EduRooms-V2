import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { useConfirm } from '../components/shared/ConfirmDialog'
import { Clock, Users, XCircle, Briefcase, Building2, CheckCircle2, UserCheck, UserX, Trash2, Upload, AlertTriangle, Mail, BookOpen, Ban, ShieldCheck, Crown, Send, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EditorHorario from '../components/Admin/EditorHorario'

const BASE = '/api'
const req = (method, path, body) =>
  fetch(BASE + path, {
    method,
    headers: { 'Content-Type':'application/json', Authorization:'Bearer '+localStorage.getItem('edu_token') },
    ...(body ? { body: JSON.stringify(body) } : {})
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d })

export default function Admin({ toast }) {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()
  const confirmar  = useConfirm()
  const [tab,          setTab]          = useState('pendientes')
  const [pendientes,   setPendientes]   = useState([])
  const [profesores,   setProfesores]   = useState([])
  const [centro,       setCentro]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [solicitandoBaja, setSolicitandoBaja] = useState(false) 
  const [traspaso,     setTraspaso]     = useState({ pendiente: false })
  const [selTraspaso,  setSelTraspaso]  = useState('')
  const [iniciandoTraspaso, setIniciandoTraspaso] = useState(false)
  

  useEffect(() => {
    if (!user || !['director','jefe_estudios','superadmin'].includes(user.rol)) { navigate('/aulas'); return }
    cargar()
  }, [user])

  async function cargar() {
    setLoading(true)
    try {
      const [p, a, c, t] = await Promise.all([
        req('GET', '/admin/pendientes'),
        req('GET', '/admin/profesores'),
        req('GET', '/admin/centro'),
        req('GET', '/admin/traspaso').catch(() => ({ pendiente: false })),
      ])
      setPendientes(p); setProfesores(a); setCentro(c); setTraspaso(t)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  async function aprobar(id, nombre) {
    try { await req('PUT', `/admin/aprobar/${id}`); toast(`${nombre} aprobado/a`, 'success'); cargar() }
    catch (err) { toast(err.message, 'error') }
  }

  async function rechazar(id, nombre) {
    const ok = await confirmar({
      title: 'Rechazar cuenta',
      message: `¿Seguro que quieres rechazar la cuenta de ${nombre}?`,
      confirmText: 'Rechazar',
      variant: 'danger',
    })
    if (!ok) return
    try { await req('PUT', `/admin/rechazar/${id}`); toast('Cuenta rechazada', 'info'); cargar() }
    catch (err) { toast(err.message, 'error') }
  }

  async function eliminar(id, nombre) {
    const ok = await confirmar({
      title: 'Eliminar cuenta',
      message: `¿Eliminar permanentemente la cuenta de ${nombre}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try { await req('DELETE', `/admin/profesores/${id}`); toast('Cuenta eliminada', 'info'); cargar() }
    catch (err) { toast(err.message, 'error') }
  }

  async function promoverJefe(id, nombre) {
    const ok = await confirmar({
      title: 'Promover a Jefe de Estudios',
      message: `¿Hacer a ${nombre} Jefe/a de Estudios? Tendrá acceso al panel de administración.`,
      confirmText: 'Promover',
      variant: 'default',
    })
    if (!ok) return
    try { await req('PUT', `/admin/promover-jefe/${id}`); toast(`${nombre} es ahora Jefe/a de Estudios`, 'success'); cargar() }
    catch (err) { toast(err.message, 'error') }
  }

  async function degradarProfesor(id, nombre) {
    const ok = await confirmar({
      title: 'Quitar rol de Jefe',
      message: `¿Quitar el rol de Jefe de Estudios a ${nombre}?`,
      confirmText: 'Quitar rol',
      variant: 'danger',
    })
    if (!ok) return
    try { await req('PUT', `/admin/degradar-profesor/${id}`); toast(`${nombre} vuelve a ser profesor/a`, 'info'); cargar() }
    catch (err) { toast(err.message, 'error') }
  }

  async function handleSolicitarBaja() {
    const ok = await confirmar({
      title: 'Solicitar baja del centro',
      message: '¿Seguro que quieres solicitar la baja? Recibirás un email para confirmarla.',
      confirmText: 'Solicitar baja',
      variant: 'danger',
    })
    if (!ok) return
    setSolicitandoBaja(true)
    try {
      const data = await req('POST', '/admin/solicitar-baja')
      toast(data.mensaje, 'success')
      cargar()
    } catch (err) { toast(err.message, 'error') }
    finally { setSolicitandoBaja(false) }
  }
  
  async function handleIniciarTraspaso() {
  if (!selTraspaso) { toast('Selecciona un profesor', 'error'); return }

  const destino = profesores.find(p => p.id === Number(selTraspaso))
  if (!destino) return

  const ok = await confirmar({
    title: 'Traspasar dirección',
    message: `¿Traspasar la dirección a ${destino.nombre} ${destino.apellidos}? Le enviaremos un email para que confirme. Si acepta, tú pasarás a ser profesor y él/ella será el nuevo director.`,
    confirmText: 'Enviar email',
    cancelText: 'Cancelar',
    variant: 'danger',
  })
  if (!ok) return

  setIniciandoTraspaso(true)
  try {
    const data = await req('POST', '/admin/traspaso', { profesor_id: Number(selTraspaso) })
    toast(data.mensaje, 'success')
    setSelTraspaso('')
    cargar()
  } catch (err) { toast(err.message, 'error') }
  finally { setIniciandoTraspaso(false) }
  }

  async function handleCancelarTraspaso() {
    const ok = await confirmar({
      title: 'Cancelar traspaso',
      message: '¿Cancelar la solicitud de traspaso? El enlace del email dejará de funcionar.',
      confirmText: 'Sí, cancelar',
      cancelText: 'Volver',
      variant: 'default',
    })
    if (!ok) return

    try {
      const data = await req('DELETE', '/admin/traspaso')
      toast(data.mensaje, 'info')
      cargar()
    } catch (err) { toast(err.message, 'error') }
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
      toast('Logo actualizado', 'success')
      cargar()
    } catch (err) { toast(err.message, 'error') }
    finally { setSubiendoLogo(false) }
  }

  const aprobados  = profesores.filter(p => p.aprobado === 1)
  const rechazados = profesores.filter(p => p.aprobado === 2)
  const jefes      = profesores.filter(p => p.rol === 'jefe_estudios')

  if (loading) return <p style={{ color:'var(--text3)' }}>Cargando panel...</p>

  const stats = [
    { key:'pendientes', label:'Pendientes', value:pendientes.length, color:'#f59e0b',       pale:'#fffbeb',             icon:<Clock size={18} /> },
    { key:'aprobados',  label:'Aprobados',  value:aprobados.length,  color:'var(--primary)', pale:'var(--primary-pale)', icon:<CheckCircle2 size={18} /> },
    { key:'rechazados', label:'Rechazados', value:rechazados.length, color:'var(--red)',     pale:'var(--red-pale)',     icon:<XCircle size={18} /> },
    { key:'jefes',      label:'Jefes Est.', value:jefes.length,      color:'#7c3aed',       pale:'#ede9fe',              icon:<Briefcase size={18} /> },
  ]

  const tabs = [
    { key:'pendientes', label:`Pendientes (${pendientes.length})` },
    { key:'aprobados',  label:`Aprobados (${aprobados.length})`   },
    { key:'rechazados', label:`Rechazados (${rechazados.length})` },
    { key:'jefes',      label:`Jefes Est. (${jefes.length})`      },
    { key:'centro',     label:`Mi Centro`                         },
    { key:'horario',    label:`Horario`                           },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight:800, letterSpacing:'-0.5px' }}>Panel de Administración</h1>
        <p style={{ color:'var(--text3)', fontSize:14, marginTop:2 }}>Gestión de cuentas del profesorado</p>
      </div>

      {/* Stats — 2x2 en móvil, 4 en desktop */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {stats.map(s => (
          <div key={s.label} onClick={() => setTab(s.key)}
            className="card"
            style={{ display:'flex', alignItems:'center', gap:12, padding: isMobile ? 14 : 18, cursor:'pointer', border: tab===s.key ? `1.5px solid ${s.color}` : undefined }}>
            <div style={{ width:40, height:40, borderRadius:10, background:s.pale, color:s.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{s.icon}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize: isMobile ? 22 : 26, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs — select en móvil, pills en desktop */}
      {isMobile ? (
        <select value={tab} onChange={e => setTab(e.target.value)} style={{
          width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid var(--border)',
          background:'#fff', fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:600,
          marginBottom:20,
        }}>
          {tabs.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      ) : (
        <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--white)', borderRadius:10, padding:5, border:'1.5px solid var(--border)', width:'fit-content', maxWidth:'100%', overflowX:'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'8px 16px', borderRadius:7, border:'none', cursor:'pointer',
              fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:700, whiteSpace:'nowrap',
              background: tab===t.key ? 'var(--black)' : 'transparent',
              color: tab===t.key ? '#fff' : 'var(--text3)', transition:'all .18s',
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Pendientes */}
      {tab === 'pendientes' && (
        pendientes.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text3)' }}>
            <CheckCircle2 size={48} style={{ opacity:.3, marginBottom:12 }} />
            <p style={{ fontSize:16, fontWeight:600 }}>No hay cuentas pendientes</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {pendientes.map(p => <ProfCard key={p.id} prof={p} isMobile={isMobile} variant="pending"
              onAprobar={() => aprobar(p.id, `${p.nombre} ${p.apellidos}`)}
              onRechazar={() => rechazar(p.id, `${p.nombre} ${p.apellidos}`)} />)}
          </div>
        )
      )}

      {/* Aprobados */}
      {tab === 'aprobados' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {aprobados.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text3)' }}>
              <Users size={48} style={{ opacity:.3, marginBottom:12 }} />
              <p>No hay profesores aprobados todavía.</p>
            </div>
          ) : aprobados.map(p => (
            <ProfCard key={p.id} prof={p} isMobile={isMobile} variant="approved"
              isDirector={user?.rol === 'director'}
              onPromover={() => promoverJefe(p.id, `${p.nombre} ${p.apellidos}`)}
              onSuspender={() => rechazar(p.id, p.nombre)}
              onEliminar={() => eliminar(p.id, p.nombre)}
            />
          ))}
        </div>
      )}

      {/* Rechazados */}
      {tab === 'rechazados' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {rechazados.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text3)' }}>
              <Ban size={48} style={{ opacity:.3, marginBottom:12 }} />
              <p>No hay cuentas rechazadas.</p>
            </div>
          ) : rechazados.map(p => (
            <ProfCard key={p.id} prof={p} isMobile={isMobile} variant="rejected"
              onAprobar={() => aprobar(p.id, p.nombre)}
              onEliminar={() => eliminar(p.id, p.nombre)}
            />
          ))}
        </div>
      )}

      {/* Jefes */}
      {tab === 'jefes' && (
        <div>
          {jefes.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text3)' }}>
              <Briefcase size={48} style={{ opacity:.3, marginBottom:12 }} />
              <p style={{ fontSize:16, fontWeight:600 }}>No hay jefes de estudios</p>
              <p style={{ fontSize:14, marginTop:8, color:'var(--text3)' }}>Aprueba una cuenta de profesor y usa el botón Jefe para promoverlo.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {jefes.map(p => (
                <ProfCard key={p.id} prof={p} isMobile={isMobile} variant="chief"
                  isDirector={user?.rol === 'director'}
                  onDegradar={() => degradarProfesor(p.id, p.nombre)}
                  onEliminar={() => eliminar(p.id, p.nombre)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mi Centro */}
      {tab === 'centro' && (
        <div className="card" style={{ maxWidth:560 }}>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:20, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <Building2 size={16} /> Información del centro
          </div>

          {centro ? (
            <>
              {/* Logo */}
              <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 14 : 20, marginBottom:24 }}>
                <div style={{ width:80, height:80, borderRadius:12, background:'var(--bg)', border:'1.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                  {centro.logo
                    ? <img src={centro.logo} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }} />
                    : <span style={{ fontSize:32, fontWeight:900, color:'var(--text3)', fontFamily:'Georgia, serif' }}>E</span>
                  }
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:6 }}>Logo del centro</div>
                  <p style={{ fontSize:13, color:'var(--text3)', marginBottom:10 }}>Aparecerá en el sidebar para todos los profesores del centro.</p>
                  <label style={{ display:'inline-block', cursor:'pointer' }}>
                    <span className="btn btn-outline btn-sm" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                      <Upload size={14} /> {subiendoLogo ? 'Subiendo...' : 'Cambiar logo'}
                    </span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" style={{ display:'none' }} onChange={handleLogoUpload} disabled={subiendoLogo} />
                  </label>
                </div>
              </div>

              {/* Info */}
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
                {[
                  { label:'Nombre',    value: centro.nombre          },
                  { label:'Código',    value: centro.codigo          },
                  { label:'Ciudad',    value: centro.ciudad    || '—' },
                  { label:'Provincia', value: centro.provincia || '—' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--text3)', marginBottom:6, display:'block' }}>{f.label}</label>
                    <div style={{ fontSize:14, fontWeight:500, padding:'9px 12px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:8 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Zona de director — Traspaso de dirección + Zona de peligro */}
              {user?.rol === 'director' && (
                <>
                  {/* Traspaso de dirección */}
                  <div style={{ marginTop:24, paddingTop:20, borderTop:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'#b45309', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:12 }}>
                      <Crown size={13} /> Traspasar dirección
                    </div>

                    {traspaso.pendiente ? (
                      <div>
                        <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'12px 14px', marginBottom:14, fontSize:13, color:'#78350f', display:'flex', gap:8, alignItems:'flex-start' }}>
                          <Send size={16} style={{ flexShrink:0, marginTop:1 }} />
                          <span>
                            Traspaso pendiente de confirmación por <strong>{traspaso.destino?.nombre} {traspaso.destino?.apellidos}</strong>. Cuando acepte desde su email, se harán efectivos los cambios.
                          </span>
                        </div>
                        <div style={{
                          display:'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          alignItems: isMobile ? 'stretch' : 'center',
                          justifyContent:'space-between',
                          gap:12,
                        }}>
                          <p style={{ fontSize:13, color:'var(--text3)', flex:1 }}>
                            ¿Cambias de opinión? Puedes cancelar la solicitud mientras no haya sido aceptada.
                          </p>
                          <button className="btn btn-outline btn-sm" onClick={handleCancelarTraspaso} style={{ flexShrink:0 }}>
                            Cancelar traspaso
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:12, lineHeight:1.55 }}>
                          Si vas a dejar la dirección del centro, puedes traspasarla a otro profesor o jefe de estudios. Se le enviará un email para confirmar. Cuando acepte, tú pasarás a ser profesor y él/ella será el nuevo director.
                        </p>
                        <div style={{
                          display:'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          gap:10, alignItems: isMobile ? 'stretch' : 'center',
                        }}>
                          <select value={selTraspaso} onChange={e => setSelTraspaso(e.target.value)}
                            style={{ flex:1, padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'#fff', fontFamily:'Outfit,sans-serif', fontSize:14 }}>
                            <option value="">— Selecciona al nuevo director —</option>
                            {profesores
                              .filter(p => p.aprobado === 1 && ['profesor','jefe_estudios'].includes(p.rol))
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre} {p.apellidos} {p.rol === 'jefe_estudios' ? '(Jefe/a de Estudios)' : ''}
                                </option>
                              ))}
                          </select>
                          <button className="btn btn-primary btn-sm" onClick={handleIniciarTraspaso} disabled={iniciandoTraspaso || !selTraspaso}
                            style={{ flexShrink:0, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                            <Send size={14} /> {iniciandoTraspaso ? 'Enviando...' : 'Iniciar traspaso'}
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Horario del centro */}
                    {tab === 'horario' && (
                      <div className="card" style={{ maxWidth: 760 }}>
                        <EditorHorario toast={toast} />
                      </div>
                    )}
                  </div>    

                  {/* Zona de peligro (baja del centro) */}
                  <div style={{ marginTop:24, paddingTop:20, borderTop:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'var(--red)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>
                      <AlertTriangle size={13} /> Zona de peligro
                    </div>
                    {centro.baja_solicitada ? (
                      <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'12px 16px', fontSize:13, color:'#991b1b' }}>
                        Tu baja ha sido confirmada. Tu centro seguirá activo hasta el final del período actual.
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent:'space-between', gap:12 }}>
                        <p style={{ fontSize:13, color:'var(--text3)', flex:1 }}>
                          Al darte de baja recibirás un email de confirmación. Tu centro seguirá activo hasta el final del período pagado.
                        </p>
                        <button className="btn btn-danger btn-sm" style={{ flexShrink:0 }} onClick={handleSolicitarBaja} disabled={solicitandoBaja}>
                          {solicitandoBaja ? 'Enviando...' : 'Solicitar baja'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <p style={{ color:'var(--text3)' }}>Cargando info del centro...</p>
          )}
        </div>
      )}
    </div>
  )
}

// ───── Componente tarjeta de profesor ─────
function ProfCard({ prof, isMobile, variant, isDirector, onAprobar, onRechazar, onPromover, onSuspender, onEliminar, onDegradar }) {
  const palettes = {
    pending:  { bg:'linear-gradient(135deg,var(--primary),var(--accent))', color:'#fff' },
    approved: { bg:'var(--primary-pale)', color:'var(--primary)' },
    rejected: { bg:'var(--red-pale)', color:'var(--red)' },
    chief:    { bg:'#ede9fe', color:'#7c3aed' },
  }
  const pal = palettes[variant]
  const initials = prof.nombre[0] + prof.apellidos[0]

  const badge = {
    approved: { label:'Activo',           bg:'var(--green-pale)', color:'var(--primary-dark)', border:'#6ee7b7' },
    rejected: { label:'Rechazado',        bg:'var(--red-pale)',   color:'var(--red)',          border:'#fecaca' },
    chief:    { label:'Jefe de Estudios', bg:'#ede9fe',           color:'#7c3aed',             border:'#c4b5fd' },
  }[variant]

  return (
    <div className="card" style={{
      display:'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: isMobile ? 12 : 14,
      padding: isMobile ? 16 : 18,
      opacity: variant === 'rejected' ? .85 : 1,
    }}>
      {/* Identidad */}
      <div style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0 }}>
        <div style={{ width:42, height:42, borderRadius:10, background:pal.bg, color:pal.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, flexShrink:0 }}>
          {initials}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{prof.nombre} {prof.apellidos}</div>
          <div style={{ fontSize:12, color:'var(--text3)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%' }}>
              <Mail size={11} /> <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{prof.email}</span>
            </span>
            {prof.asignatura && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                <BookOpen size={11} /> {prof.asignatura}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Badge de estado (solo en aprobados/rechazados/jefes) */}
      {badge && (
        <span style={{
          padding:'4px 11px', borderRadius:20, fontSize:11, fontWeight:700,
          background:badge.bg, color:badge.color, border:`1px solid ${badge.border}`,
          alignSelf: isMobile ? 'flex-start' : 'center', flexShrink:0,
        }}>{badge.label}</span>
      )}

      {/* Acciones */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
        {variant === 'pending' && (
          <>
            <button className="btn btn-green btn-sm" onClick={onAprobar} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <UserCheck size={14} /> Aprobar
            </button>
            <button className="btn btn-danger btn-sm" onClick={onRechazar} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <UserX size={14} /> Rechazar
            </button>
          </>
        )}
        {variant === 'approved' && (
          <>
            {isDirector && (
              <button className="btn btn-outline btn-sm" onClick={onPromover} title="Hacer Jefe de Estudios"
                style={{ color:'#7c3aed', borderColor:'#c4b5fd', display:'inline-flex', alignItems:'center', gap:6 }}>
                <Briefcase size={14} /> Jefe
              </button>
            )}
            <button className="btn btn-danger btn-sm" onClick={onSuspender} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <Ban size={14} /> Suspender
            </button>
            <button className="btn btn-outline btn-sm" onClick={onEliminar} title="Eliminar cuenta"
              style={{ color:'var(--red)', borderColor:'#fecaca', display:'inline-flex', alignItems:'center', gap:6 }}>
              <Trash2 size={14} />
            </button>
          </>
        )}
        {variant === 'rejected' && (
          <>
            <button className="btn btn-green btn-sm" onClick={onAprobar} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <UserCheck size={14} /> Aprobar
            </button>
            <button className="btn btn-outline btn-sm" onClick={onEliminar} title="Eliminar cuenta"
              style={{ color:'var(--red)', borderColor:'#fecaca', display:'inline-flex', alignItems:'center', gap:6 }}>
              <Trash2 size={14} />
            </button>
          </>
        )}
        {variant === 'chief' && isDirector && (
          <>
            <button className="btn btn-outline btn-sm" onClick={onDegradar} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <ShieldCheck size={14} /> Quitar rol
            </button>
            <button className="btn btn-outline btn-sm" onClick={onEliminar} title="Eliminar cuenta"
              style={{ color:'var(--red)', borderColor:'#fecaca', display:'inline-flex', alignItems:'center', gap:6 }}>
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}