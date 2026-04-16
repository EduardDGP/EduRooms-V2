import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getGuardias, crearGuardia, cubrirGuardia, cancelarCobertura, eliminarGuardia } from '../api/client'
import { FRANJAS_RESERVABLES } from '../config/franjas'
import Modal from '../components/shared/Modal'

const CURSOS = ['1º ESO','2º ESO','3º ESO','4º ESO','1º Bach','2º Bach','FP Básica','CFGM','CFGS']
const GRUPOS = ['A','B','C','D','E']
const TODAY  = new Date().toISOString().split('T')[0]

function EstadoBadge({ guardia, userId }) {
  if (guardia.cubierta_por) {
    const esMiCobertura = guardia.cubierta_por === userId
    return (
      <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:'#d1fae5', color:'#065f46', border:'1px solid #6ee7b7' }}>
        ✅ Cubierta{esMiCobertura ? ' (por ti)' : ` por ${guardia.cubierta_por_nombre} ${guardia.cubierta_por_apellidos}`}
      </span>
    )
  }
  const fechaPasada = guardia.fecha < TODAY
  if (fechaPasada) {
    return <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:'#f1f5f9', color:'#64748b', border:'1px solid #e2e8f0' }}>Sin cubrir</span>
  }
  return <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:'#fef3c7', color:'#92400e', border:'1px solid #fcd34d' }}>⏳ Pendiente</span>
}

export default function Guardias({ toast }) {
  const { user }    = useAuth()
  const [guardias,  setGuardias]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filtro,    setFiltro]    = useState('pendientes')
  const [modal,     setModal]     = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form,      setForm]      = useState({
    fecha: TODAY, franja_id:'', curso:'', grupo:'A', aula:'', instrucciones:''
  })

  useEffect(() => {
    cargar()
    const interval = setInterval(cargar, 60000)
    return () => clearInterval(interval)
  }, [])

  async function cargar() {
    setLoading(true)
    try { setGuardias(await getGuardias()) }
    catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  async function handleCrear(e) {
    e.preventDefault()
    const franja = FRANJAS_RESERVABLES.find(f => f.id === form.franja_id)
    if (!franja) { toast('Selecciona una franja horaria', 'error'); return }
    setGuardando(true)
    try {
      await crearGuardia({
        ...form,
        franja_label: franja.label,
        franja_orden: franja.orden,
        hora_inicio:  franja.inicio,
        hora_fin:     franja.fin,
      })
      toast('Guardia registrada — tus compañeros han sido notificados 📢', 'success')
      setModal(false)
      setForm({ fecha:TODAY, franja_id:'', curso:'', grupo:'A', aula:'', instrucciones:'' })
      cargar()
    } catch (err) { toast(err.message, 'error') }
    finally { setGuardando(false) }
  }

  async function handleCubrir(id) {
    try {
      await cubrirGuardia(id)
      toast('Te has apuntado para cubrir la guardia ✅', 'success')
      cargar()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleCancelarCobertura(id) {
    if (!confirm('¿Cancelar tu cobertura de esta guardia?')) return
    try {
      await cancelarCobertura(id)
      toast('Cobertura cancelada', 'info')
      cargar()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar esta guardia?')) return
    try {
      await eliminarGuardia(id)
      toast('Guardia eliminada', 'info')
      cargar()
    } catch (err) { toast(err.message, 'error') }
  }

  // Filtros
  const guardiasFiltradas = guardias.filter(g => {
    if (filtro === 'pendientes') return !g.cubierta_por && g.fecha >= TODAY
    if (filtro === 'mias')       return g.profesor_id === user.id
    if (filtro === 'hoy')        return g.fecha === TODAY
    return true
  })

  // Contar pendientes para badge
  const pendientes = guardias.filter(g => !g.cubierta_por && g.fecha >= TODAY && g.profesor_id !== user.id).length

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px' }}>Guardias</h1>
          <p style={{ color:'var(--text3)', fontSize:14, marginTop:2 }}>
            {pendientes > 0
              ? <span style={{ color:'var(--orange)', fontWeight:600 }}>⚠️ {pendientes} guardia{pendientes!==1?'s':''} pendiente{pendientes!==1?'s':''} de cubrir</span>
              : 'Gestión de ausencias del profesorado'}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Registrar ausencia</button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:24, background:'var(--white)', borderRadius:10, padding:5, border:'1.5px solid var(--border)', width:'fit-content' }}>
        {[
          { key:'pendientes', label:'⏳ Pendientes' },
          { key:'hoy',        label:'📅 Hoy'        },
          { key:'mias',       label:'👤 Mis guardias'},
          { key:'todas',      label:'📋 Todas'       },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)} style={{
            padding:'8px 16px', borderRadius:7, border:'none', cursor:'pointer',
            fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:700,
            background: filtro===f.key ? 'var(--black)' : 'transparent',
            color: filtro===f.key ? '#fff' : 'var(--text3)',
            transition:'all .18s',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Lista de guardias */}
      {loading ? (
        <p style={{ color:'var(--text3)' }}>Cargando...</p>
      ) : guardiasFiltradas.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'60px 24px', color:'var(--text3)' }}>
          <div style={{ fontSize:48, opacity:.2, marginBottom:12 }}>🛡️</div>
          <p style={{ fontSize:16, fontWeight:600 }}>No hay guardias en esta categoría</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {guardiasFiltradas.map(g => {
            const esMia         = g.profesor_id === user.id
            const esMiCobertura = g.cubierta_por === user.id
            const puedeCubrir   = !g.cubierta_por && !esMia && g.fecha >= TODAY
            const fechaLabel    = new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })

            return (
              <div key={g.id} className="card" style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
                  <div style={{ flex:1 }}>
                    {/* Cabecera */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
                      <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>
                        👤 {g.prof_nombre} {g.prof_apellidos}
                        {esMia && <span style={{ marginLeft:8, fontSize:11, background:'var(--primary-pale)', color:'var(--primary)', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>Tu guardia</span>}
                      </div>
                      <EstadoBadge guardia={g} userId={user.id} />
                    </div>

                    {/* Detalles en grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:10, marginBottom: g.instrucciones ? 14 : 0 }}>
                      {[
                        { icon:'📅', label:'Fecha',  value: fechaLabel },
                        { icon:'⏰', label:'Franja', value: `${g.franja_label} (${g.hora_inicio}–${g.hora_fin})` },
                        { icon:'🏫', label:'Grupo',  value: `${g.curso} ${g.grupo}` },
                        { icon:'📍', label:'Aula',   value: g.aula },
                      ].map(d => (
                        <div key={d.label} style={{ background:'var(--surface)', borderRadius:8, padding:'8px 12px', border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3 }}>{d.icon} {d.label}</div>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{d.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Instrucciones */}
                    {g.instrucciones && (
                      <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#78350f' }}>
                        <span style={{ fontWeight:700 }}>📝 Instrucciones: </span>{g.instrucciones}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
                    {puedeCubrir && (
                      <button className="btn btn-green btn-sm" onClick={() => handleCubrir(g.id)}>
                        🙋 Cubrir guardia
                      </button>
                    )}
                    {esMiCobertura && (
                      <button className="btn btn-outline btn-sm" onClick={() => handleCancelarCobertura(g.id)}>
                        Cancelar cobertura
                      </button>
                    )}
                    {esMia && (
                      <button className="btn btn-outline btn-sm" onClick={() => handleEliminar(g.id)} style={{ color:'var(--red)', borderColor:'#fecaca' }}>
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear guardia */}
      <Modal open={modal} onClose={() => setModal(false)} title="🛡️ Registrar ausencia">
        <form onSubmit={handleCrear}>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" value={form.fecha} min={TODAY}
                onChange={e => setForm(f => ({...f, fecha:e.target.value}))} required />
            </div>
            <div className="form-group">
              <label>Franja horaria</label>
              <select value={form.franja_id} onChange={e => setForm(f => ({...f, franja_id:e.target.value}))} required>
                <option value="">— Selecciona —</option>
                {FRANJAS_RESERVABLES.map(f => (
                  <option key={f.id} value={f.id}>{f.label} ({f.inicio}–{f.fin})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Curso</label>
              <select value={form.curso} onChange={e => setForm(f => ({...f, curso:e.target.value}))} required>
                <option value="">— Curso —</option>
                {CURSOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Grupo</label>
              <select value={form.grupo} onChange={e => setForm(f => ({...f, grupo:e.target.value}))}>
                {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Aula donde están los alumnos</label>
            <input type="text" value={form.aula} onChange={e => setForm(f => ({...f, aula:e.target.value}))}
              placeholder="Ej: Aula 12, Aula Informática 1..." required />
          </div>

          <div className="form-group">
            <label>Instrucciones para los alumnos (opcional)</label>
            <textarea value={form.instrucciones} onChange={e => setForm(f => ({...f, instrucciones:e.target.value}))}
              placeholder="Ej: Continuar con los ejercicios del tema 4, páginas 82-85..."
              rows={3} style={{ resize:'vertical' }} />
          </div>

          <div style={{ background:'var(--primary-pale)', border:'1px solid #6ee7b7', borderRadius:8, padding:'10px 14px', marginBottom:20, fontSize:13, color:'var(--primary-dark)' }}>
            📢 Todos los profesores recibirán una notificación para cubrir tu guardia.
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={guardando}>
              {guardando ? 'Registrando...' : 'Registrar ausencia'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}