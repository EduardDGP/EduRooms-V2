import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getSalidasBano, getHistorialBano, registrarSalida, editarSalida, borrarSalida, getCursos, getAlumnos } from '../../api/client'
import Modal from '../shared/Modal'

function getBadge(veces) {
  if (!veces || veces === 0) return null
  if (veces <= 2) return { bg:'#d1fae5', color:'#065f46', border:'#6ee7b7' }
  if (veces <= 4) return { bg:'#ffedd5', color:'#9a3412', border:'#fed7aa' }
  return { bg:'#fee2e2', color:'#991b1b', border:'#fca5a5' }
}

// Formatea hora UTC a hora local del dispositivo
function formatHora(horaStr) {
  if (!horaStr) return ''
  // Si es solo HH:MM (sin fecha), construir fecha UTC de hoy
  if (horaStr.length === 5) {
    const hoy = new Date().toISOString().split('T')[0]
    return new Date(`${hoy}T${horaStr}:00Z`).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })
  }
  return new Date(horaStr + 'Z').toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })
}

export default function BanoPanel({ toast }) {
  const { user } = useAuth()
  const [salidas,   setSalidas]   = useState([])
  const [historial, setHistorial] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [histOpen,  setHistOpen]  = useState(false)
  const [histLoad,  setHistLoad]  = useState(false)

  const [cursos,     setCursos]     = useState([])
  const [alumnos,    setAlumnos]    = useState([])
  const [loadAlum,   setLoadAlum]   = useState(false)

  const [modal,     setModal]     = useState(false)
  const [selCurso,  setSelCurso]  = useState('')
  const [selGrupo,  setSelGrupo]  = useState('')
  const [selAlumno, setSelAlumno] = useState(null)
  const [manualNombre, setManualNombre] = useState('')
  const [modoManual,   setModoManual]   = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [editModal, setEditModal] = useState(null)
  const [editForm,  setEditForm]  = useState({ alumno_nombre:'', alumno_curso:'' })
  const [editando,  setEditando]  = useState(false)

  useEffect(() => {
    cargar()
    cargarCursos()
    const interval = setInterval(cargar, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selCurso && selGrupo) cargarAlumnos()
    else setAlumnos([])
    setSelAlumno(null)
  }, [selCurso, selGrupo])

  useEffect(() => { if (histOpen && historial.length === 0) cargarHistorial() }, [histOpen])

  async function cargar() {
    setLoading(true)
    try { setSalidas(await getSalidasBano()) }
    catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  async function cargarCursos() {
    try { setCursos(await getCursos()) }
    catch (err) { console.error(err) }
  }

  async function cargarAlumnos() {
    setLoadAlum(true)
    try { setAlumnos(await getAlumnos(selCurso, selGrupo)) }
    catch (err) { toast(err.message, 'error') }
    finally { setLoadAlum(false) }
  }

  async function cargarHistorial() {
    setHistLoad(true)
    try { setHistorial(await getHistorialBano()) }
    catch (err) { toast(err.message, 'error') }
    finally { setHistLoad(false) }
  }

  const cursosUnicos    = [...new Set(cursos.map(c => c.curso))]
  const gruposDelCurso  = cursos.filter(c => c.curso === selCurso).map(c => c.grupo)

  const vecesHoy = salidas.reduce((acc, s) => {
    const key = s.alumno_nombre
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  async function handleRegistrar(e) {
    e.preventDefault()
    const nombreFinal = modoManual
      ? manualNombre.trim()
      : selAlumno ? `${selAlumno.apellidos}, ${selAlumno.nombre}` : ''
    const cursoFinal = modoManual
      ? (selCurso && selGrupo ? `${selCurso} ${selGrupo}` : manualNombre)
      : `${selCurso} ${selGrupo}`
    if (!nombreFinal) { toast('Selecciona o escribe un alumno', 'error'); return }
    setGuardando(true)
    try {
      const nueva = await registrarSalida({ alumno_nombre: nombreFinal, alumno_curso: cursoFinal })
      setSalidas(s => [nueva, ...s])
      toast(`✅ ${nombreFinal} autorizado/a al baño`, 'success')
      setModal(false)
      setSelAlumno(null)
      setManualNombre('')
    } catch (err) { toast(err.message, 'error') }
    finally { setGuardando(false) }
  }

  async function handleEditar(e) {
    e.preventDefault()
    setEditando(true)
    try {
      const actualizada = await editarSalida(editModal.id, editForm)
      setSalidas(s => s.map(x => x.id === actualizada.id ? actualizada : x))
      toast('Registro actualizado ✅', 'success')
      setEditModal(null)
    } catch (err) { toast(err.message, 'error') }
    finally { setEditando(false) }
  }

  async function handleBorrar(id) {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await borrarSalida(id)
      setSalidas(s => s.filter(x => x.id !== id))
      toast('Registro eliminado', 'info')
    } catch (err) { toast(err.message, 'error') }
  }

  const histPorFecha = historial.reduce((acc, s) => {
    if (!acc[s.fecha]) acc[s.fecha] = []
    acc[s.fecha].push(s)
    return acc
  }, {})
  const histFechas = Object.keys(histPorFecha).sort((a, b) => b.localeCompare(a))

  const porCurso = salidas.reduce((acc, s) => {
    acc[s.alumno_curso] = (acc[s.alumno_curso] || 0) + 1
    return acc
  }, {})

  const horaActual = new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })

  return (
    <div>
      {/* Cabecera */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:'#e0f2fe', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center' }}>🚻</div>
          <div>
            <div style={{ fontWeight:700, fontSize:17 }}>Control de Baños</div>
            <div style={{ fontSize:13, color:'var(--text3)' }}>
              {new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })}
            </div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Autorizar alumno</button>
      </div>

      {/* Resumen */}
      {salidas.length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
          <div style={{ padding:'6px 14px', borderRadius:20, background:'#e0f2fe', color:'#0369a1', fontSize:13, fontWeight:700 }}>
            {salidas.length} salida{salidas.length !== 1 ? 's' : ''} hoy
          </div>
          {Object.entries(porCurso).map(([curso, n]) => (
            <div key={curso} style={{ padding:'6px 12px', borderRadius:20, background:'var(--bg)', border:'1px solid var(--border)', fontSize:12, fontWeight:600, color:'var(--text2)' }}>
              {curso}: {n}
            </div>
          ))}
        </div>
      )}

      {/* Leyenda */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ fontSize:11, color:'var(--text3)', alignSelf:'center', fontWeight:600 }}>Veces hoy:</div>
        {[
          { label:'1-2 veces', bg:'#d1fae5', color:'#065f46', border:'#6ee7b7' },
          { label:'3-4 veces', bg:'#ffedd5', color:'#9a3412', border:'#fed7aa' },
          { label:'5+ veces',  bg:'#fee2e2', color:'#991b1b', border:'#fca5a5' },
        ].map(l => (
          <div key={l.label} style={{ padding:'3px 10px', borderRadius:20, background:l.bg, color:l.color, border:`1px solid ${l.border}`, fontSize:11, fontWeight:700 }}>
            {l.label}
          </div>
        ))}
      </div>

      {/* Tabla hoy */}
      {loading ? (
        <p style={{ color:'var(--text3)', fontSize:14 }}>Cargando...</p>
      ) : salidas.length === 0 ? (
        <div style={{ textAlign:'center', padding:28, color:'var(--text3)', background:'var(--surface)', borderRadius:10, border:'1.5px dashed var(--border)' }}>
          <div style={{ fontSize:32, opacity:.4, marginBottom:8 }}>🚻</div>
          <p style={{ fontSize:14 }}>No hay salidas registradas hoy</p>
        </div>
      ) : (
        <div style={{ background:'var(--white)', borderRadius:10, border:'1.5px solid var(--border)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 140px 70px 160px 76px', padding:'9px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', gap:10 }}>
            <span>Alumno</span><span>Curso</span><span>Hora</span><span>Autorizado por</span><span></span>
          </div>
          {salidas.map((s, i) => {
            const esMio = s.profesor_id === user.id
            const veces = vecesHoy[s.alumno_nombre] || 0
            const badge = getBadge(veces)
            return (
              <div key={s.id} style={{ display:'grid', gridTemplateColumns:'1fr 140px 70px 160px 76px', padding:'11px 16px', gap:10, alignItems:'center', borderBottom: i < salidas.length-1 ? '1px solid var(--border)' : 'none', background: badge ? badge.bg + '33' : 'transparent' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background: badge ? badge.bg : '#e0f2fe', color: badge ? badge.color : '#0369a1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, border: badge ? `1.5px solid ${badge.border}` : 'none' }}>
                    {veces > 1 ? `${veces}x` : s.alumno_nombre[0].toUpperCase()}
                  </div>
                  <span style={{ fontWeight:600, fontSize:14 }}>{s.alumno_nombre}</span>
                  {badge && veces > 1 && (
                    <span style={{ padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:800, background:badge.bg, color:badge.color, border:`1px solid ${badge.border}` }}>
                      {veces}x hoy
                    </span>
                  )}
                </div>
                <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:20, background:'var(--primary-pale)', color:'var(--primary)', fontSize:12, fontWeight:700 }}>{s.alumno_curso}</span>
                <span style={{ fontFamily:'Fira Code, monospace', fontSize:13, fontWeight:600 }}>{formatHora(s.hora)}</span>
                <span style={{ fontSize:12, color:'var(--text2)' }}>👤 {s.prof_nombre} {s.prof_apellidos}</span>
                <div style={{ display:'flex', gap:4 }}>
                  {esMio && (<>
                    <button onClick={() => { setEditModal(s); setEditForm({ alumno_nombre:s.alumno_nombre, alumno_curso:s.alumno_curso }) }}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:5, borderRadius:6, fontSize:15, color:'var(--text3)' }}
                      title="Editar">✏️</button>
                    <button onClick={() => handleBorrar(s.id)}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:5, borderRadius:6, fontSize:15, color:'var(--text3)' }}
                      title="Eliminar">🗑️</button>
                  </>)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Historial */}
      <div style={{ marginTop:20 }}>
        <button onClick={() => setHistOpen(o => !o)} style={{ width:'100%', padding:'13px 18px', background: histOpen ? 'var(--primary-pale)' : 'var(--surface)', border:'1.5px solid', borderColor: histOpen ? 'var(--primary-l)' : 'var(--border)', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:700, color: histOpen ? 'var(--primary)' : 'var(--text)', transition:'all .2s' }}>
          <span>📅 Historial de días anteriores</span>
          <span style={{ fontSize:18, transition:'transform .2s', transform: histOpen ? 'rotate(180deg)' : 'rotate(0)' }}>⌄</span>
        </button>
        {histOpen && (
          <div style={{ marginTop:12 }}>
            {histLoad ? <p style={{ color:'var(--text3)', fontSize:14 }}>Cargando...</p>
            : histFechas.length === 0 ? (
              <div style={{ textAlign:'center', padding:28, color:'var(--text3)' }}>
                <div style={{ fontSize:32, opacity:.4, marginBottom:8 }}>📅</div>
                <p>No hay registros de días anteriores.</p>
              </div>
            ) : histFechas.map(fecha => {
              const label = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
              const grupo = histPorFecha[fecha]
              return (
                <div key={fecha} style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:8, paddingBottom:6, borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
                    <span>{label}</span><span>{grupo.length} salida{grupo.length!==1?'s':''}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {grupo.map(s => (
                      <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:8, background:'var(--white)', border:'1px solid var(--border)', fontSize:13 }}>
                        <div style={{ width:26, height:26, borderRadius:'50%', background:'#f1f5f9', color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{s.alumno_nombre[0]}</div>
                        <span style={{ fontWeight:600, flex:1 }}>{s.alumno_nombre}</span>
                        <span style={{ background:'var(--bg)', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:600, color:'var(--text2)' }}>{s.alumno_curso}</span>
                        <span style={{ fontFamily:'Fira Code,monospace', color:'var(--text3)', fontSize:11 }}>{formatHora(s.hora)}</span>
                        <span style={{ fontSize:12, color:'var(--text3)' }}>👤 {s.prof_nombre} {s.prof_apellidos}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal registrar */}
      <Modal open={modal} onClose={() => { setModal(false); setSelAlumno(null); setModoManual(false) }} title="🚻 Autorizar salida al baño">
        <form onSubmit={handleRegistrar}>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <button type="button" onClick={() => setModoManual(false)} style={{ flex:1, padding:'8px', borderRadius:8, border:'1.5px solid', borderColor: !modoManual ? 'var(--primary)' : 'var(--border)', background: !modoManual ? 'var(--primary-pale)' : '#fff', color: !modoManual ? 'var(--primary)' : 'var(--text2)', fontFamily:'Outfit,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              📋 Elegir de lista
            </button>
            <button type="button" onClick={() => setModoManual(true)} style={{ flex:1, padding:'8px', borderRadius:8, border:'1.5px solid', borderColor: modoManual ? 'var(--primary)' : 'var(--border)', background: modoManual ? 'var(--primary-pale)' : '#fff', color: modoManual ? 'var(--primary)' : 'var(--text2)', fontFamily:'Outfit,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              ✏️ Escribir manual
            </button>
          </div>

          {modoManual ? (
            <>
              <div className="form-group">
                <label>Nombre del alumno</label>
                <input type="text" value={manualNombre} onChange={e => setManualNombre(e.target.value)} placeholder="Ej: García López, Carlos" required autoFocus />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group">
                  <label>Curso</label>
                  <input type="text" value={selCurso} onChange={e => setSelCurso(e.target.value)} placeholder="Ej: 1º ESO" />
                </div>
                <div className="form-group">
                  <label>Grupo</label>
                  <input type="text" value={selGrupo} onChange={e => setSelGrupo(e.target.value.toUpperCase())} placeholder="Ej: A" maxLength={3} />
                </div>
              </div>
            </>
          ) : (
            <>
              {cursos.length === 0 ? (
                <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'12px 14px', marginBottom:16, fontSize:13, color:'#92400e' }}>
                  ⚠️ No hay alumnos cargados. Ve a la sección <strong>Alumnos</strong> e importa un Excel primero.
                </div>
              ) : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                    <div className="form-group" style={{ marginBottom:0 }}>
                      <label>Curso</label>
                      <select value={selCurso} onChange={e => { setSelCurso(e.target.value); setSelGrupo('') }} required>
                        <option value="">— Curso —</option>
                        {cursosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom:0 }}>
                      <label>Grupo</label>
                      <select value={selGrupo} onChange={e => setSelGrupo(e.target.value)} required disabled={!selCurso}>
                        <option value="">— Grupo —</option>
                        {gruposDelCurso.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  {selCurso && selGrupo && (
                    <div className="form-group">
                      <label>Alumno</label>
                      {loadAlum ? <p style={{ fontSize:13, color:'var(--text3)' }}>Cargando...</p> : (
                        <div style={{ maxHeight:200, overflowY:'auto', border:'1.5px solid var(--border)', borderRadius:8, background:'var(--bg)' }}>
                          {alumnos.length === 0 ? (
                            <p style={{ padding:14, fontSize:13, color:'var(--text3)' }}>No hay alumnos en este grupo.</p>
                          ) : alumnos.map(a => {
                            const nombre = `${a.apellidos}, ${a.nombre}`
                            const veces = vecesHoy[nombre] || 0
                            const badge = getBadge(veces)
                            const isSelected = selAlumno?.id === a.id
                            return (
                              <div key={a.id} onClick={() => setSelAlumno(a)} style={{
                                padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between',
                                borderBottom:'1px solid var(--border)',
                                background: isSelected ? 'var(--primary-pale)' : badge ? badge.bg + '55' : 'transparent',
                              }}>
                                <div style={{ fontWeight: isSelected ? 700 : 600, fontSize:13, color: isSelected ? 'var(--primary)' : 'var(--text)' }}>
                                  {a.apellidos}, {a.nombre}
                                </div>
                                {veces > 0 && badge && (
                                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:800, background:badge.bg, color:badge.color, border:`1px solid ${badge.border}`, flexShrink:0 }}>
                                    {veces}x hoy
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div style={{ background:'var(--primary-pale)', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', marginBottom:20, marginTop:8, fontSize:13, color:'var(--primary)', display:'flex', gap:8 }}>
            🕐 Hora actual: <strong>{horaActual}</strong>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setModal(false); setSelAlumno(null); setModoManual(false) }}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={guardando || (!modoManual && !selAlumno)}>
              {guardando ? 'Registrando...' : 'Autorizar y registrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="✏️ Editar registro de baño">
        <form onSubmit={handleEditar}>
          <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#92400e' }}>
            ⚠️ Solo puedes editar registros del día de hoy.
          </div>
          <div className="form-group">
            <label>Nombre del alumno</label>
            <input type="text" value={editForm.alumno_nombre} onChange={e => setEditForm(f => ({...f, alumno_nombre:e.target.value}))} required autoFocus />
          </div>
          <div className="form-group">
            <label>Curso</label>
            <input type="text" value={editForm.alumno_curso} onChange={e => setEditForm(f => ({...f, alumno_curso:e.target.value}))} required />
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditModal(null)}>Cancelar</button>
            <button type="submit" className="btn btn-success btn-sm" disabled={editando}>{editando ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}