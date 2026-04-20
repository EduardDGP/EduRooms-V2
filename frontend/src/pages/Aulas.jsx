import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { getAulas, crearAula, borrarAula, getMisReservas } from '../api/client'
import Modal from '../components/shared/Modal'
import BanoPanel from '../components/Aulas/BanoPanel'
import AulaDetalle from '../components/Aulas/AulaDetalle'
import HistorialReservas from '../components/Aulas/HistorialReservas'
import {
  Monitor, Atom, Dna, FlaskConical, Wrench, Bot,
  User, BookOpen, ArrowRight, Calendar, Plus, Trash2, Search
} from 'lucide-react'

const TIPOS = [
  { value:'Informática',             label:'Informática'             },
  { value:'Laboratorio de Física',   label:'Laboratorio de Física'   },
  { value:'Laboratorio de Biología', label:'Laboratorio de Biología' },
  { value:'Laboratorio de Química',  label:'Laboratorio de Química'  },
  { value:'Taller de Tecnología',    label:'Taller de Tecnología'    },
  { value:'Sala de Robótica',        label:'Sala de Robótica'        },
]

// Icono Lucide por tipo de aula
const ICONOS = {
  'Informática':             <Monitor size={22} />,
  'Laboratorio de Física':   <Atom size={22} />,
  'Laboratorio de Biología': <Dna size={22} />,
  'Laboratorio de Química':  <FlaskConical size={22} />,
  'Taller de Tecnología':    <Wrench size={22} />,
  'Sala de Robótica':        <Bot size={22} />,
}

const COLORES = {
  'Informática':             '#dbeafe',
  'Laboratorio de Física':   '#fef3c7',
  'Laboratorio de Biología': '#d1fae5',
  'Laboratorio de Química':  '#ede9fe',
  'Taller de Tecnología':    '#fee2e2',
  'Sala de Robótica':        '#e0f2fe',
}

const TODAY = new Date().toISOString().split('T')[0]

export default function Aulas({ toast }) {
  const { user }   = useAuth()
  const isMobile   = useIsMobile()
  const [aulas,        setAulas]        = useState([])
  const [reservas,     setReservas]     = useState([])
  const [filtro,       setFiltro]       = useState('all')
  const [loading,      setLoading]      = useState(true)
  const [modalAddAula, setModalAddAula] = useState(false)
  const [aulaDetalle,  setAulaDetalle]  = useState(null)
  const [formAula,     setFormAula]     = useState({ nombre:'', tipo:'Informática', capacidad:'30' })

  useEffect(() => {
    cargar()
    const interval = setInterval(cargar, 60000)
    return () => clearInterval(interval)
  }, [])

  async function cargar() {
    setLoading(true)
    try {
      const [a, r] = await Promise.all([getAulas(), getMisReservas()])
      setAulas(a)
      setReservas(r)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  const aulasFiltradas = aulas.filter(a => {
    if (filtro === 'free') return !a.reserva
    if (filtro === 'busy') return !!a.reserva
    if (filtro === 'info') return a.tipo === 'Informática'
    if (filtro === 'lab')  return a.tipo.startsWith('Laboratorio')
    return true
  })

  async function handleAddAula(e) {
    e.preventDefault()
    try {
      await crearAula({ nombre:formAula.nombre, tipo:formAula.tipo, capacidad:Number(formAula.capacidad) })
      toast('Aula añadida', 'success')
      setModalAddAula(false)
      setFormAula({ nombre:'', tipo:'Informática', capacidad:'30' })
      cargar()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleBorrarAula(id) {
    if (!confirm('¿Eliminar esta aula y sus reservas?')) return
    try {
      await borrarAula(id)
      toast('Aula eliminada', 'info')
      cargar()
    } catch (err) { toast(err.message, 'error') }
  }

  if (loading) return <p style={{ color:'var(--text3)' }}>Cargando aulas...</p>

  return (
    <div>
      {/* Header */}
      <div style={{
        display:'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'flex-start',
        justifyContent:'space-between',
        gap: isMobile ? 12 : 0,
        marginBottom:24,
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight:800, letterSpacing:'-0.5px' }}>Aulas Especiales</h1>
          <p style={{ color:'var(--text3)', fontSize:14, marginTop:2 }}>Haz clic en un aula para ver y reservar franjas horarias</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModalAddAula(true)} style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:6 }}>
          <Plus size={16} /> Añadir Aula
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
        {[
          { key:'all',  label:'Todas'        },
          { key:'free', label:'Libres hoy'   },
          { key:'busy', label:'Ocupadas hoy' },
          { key:'info', label:'Informática'  },
          { key:'lab',  label:'Laboratorio'  },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)} style={{
            padding:'7px 16px', border:'1.5px solid', borderRadius:20,
            fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:600, cursor:'pointer',
            whiteSpace:'nowrap',
            background: filtro===f.key ? 'var(--primary-pale)' : '#fff',
            borderColor: filtro===f.key ? 'var(--primary-l)' : 'var(--border)',
            color: filtro===f.key ? 'var(--primary)' : 'var(--text2)',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Grid de aulas */}
      {aulasFiltradas.length === 0
        ? <p style={{ color:'var(--text3)', padding:'40px 0', textAlign:'center' }}>No hay aulas en esta categoría.</p>
        : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 270px), 1fr))', gap:18 }}>
            {aulasFiltradas.map(aula => {
              const res    = aula.reserva
              const icono  = ICONOS[aula.tipo]  || <Monitor size={22} />
              const color  = COLORES[aula.tipo] || '#f1f5f9'
              const misHoy = reservas.filter(r => r.aula_id === aula.id && r.fecha === TODAY)

              return (
                <div key={aula.id} className="card" style={{ padding:22, cursor:'pointer', transition:'all .2s', minWidth:0 }}
                  onClick={() => setAulaDetalle(aula)}
                  onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:14 }}>
                    <div style={{ width:46, height:46, background:color, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text)', flexShrink:0 }}>
                      {icono}
                    </div>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap', background: res ? 'var(--red-pale)' : 'var(--green-pale)', color: res ? 'var(--red)' : 'var(--green)' }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor' }}></span>
                      {res ? 'Ocupada ahora' : 'Libre ahora'}
                    </span>
                  </div>

                  <div style={{ fontWeight:700, fontSize:16, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{aula.nombre}</div>
                  <div style={{ fontSize:13, color:'var(--text3)', marginBottom:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{aula.tipo} · {aula.capacidad} alumnos</div>

                  {res && (
                    <div style={{ background:'var(--red-pale)', border:'1px solid #fecaca', borderRadius:8, padding:'9px 12px', marginBottom:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700, color:'var(--red)', fontSize:12 }}>
                        <User size={13} /> {res.nombre} {res.apellidos}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text2)', marginTop:4 }}>
                        <BookOpen size={13} /> {res.asignatura} · {res.hora_inicio}–{res.hora_fin}
                      </div>
                    </div>
                  )}

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, flexWrap:'wrap' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'var(--primary)', fontWeight:600 }}>
                      Ver franjas <ArrowRight size={13} />
                    </span>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      {misHoy.length > 0 && (
                        <span style={{ fontSize:11, background:'var(--primary-pale)', color:'var(--primary)', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>
                          {misHoy.length} tuya{misHoy.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button className="btn btn-outline btn-sm"
                        onClick={e => { e.stopPropagation(); handleBorrarAula(aula.id) }}
                        style={{ padding:'6px 8px', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                        title="Eliminar aula"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      {/* Mis reservas de hoy */}
      <div className="card" style={{ marginTop:28 }}>
        <h2 style={{ display:'flex', alignItems:'center', gap:8, fontSize:16, fontWeight:700, marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
          <Calendar size={16} /> Mis Reservas de Hoy
        </h2>
        {reservas.filter(r => r.fecha === TODAY).length === 0
          ? <p style={{ color:'var(--text3)', fontSize:14 }}>No tienes reservas para hoy.</p>
          : reservas.filter(r => r.fecha === TODAY).map(r => (
            <div key={r.id} style={{
              display:'flex',
              flexWrap:'wrap',
              alignItems:'center',
              gap: isMobile ? 8 : 12,
              padding:'11px 0',
              borderBottom:'1px solid var(--border)',
              fontSize:13,
            }}>
              <span style={{ fontWeight:700, width: isMobile ? 'auto' : 130, flexShrink:0 }}>{r.aula_nombre}</span>
              <span style={{ background:'var(--primary-pale)', color:'var(--primary)', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, flexShrink:0 }}>{r.franja_label}</span>
              <span style={{ fontFamily:'Fira Code,monospace', color:'var(--text3)', fontSize:11, flexShrink:0 }}>{r.hora_inicio}–{r.hora_fin}</span>
              <span style={{ flex:1, minWidth:0, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.asignatura}</span>
            </div>
          ))
        }
      </div>

      {/* Historial */}
      <div className="card" style={{ marginTop:16 }}>
        <HistorialReservas toast={toast} />
      </div>

      {/* Baños */}
      <div className="card" style={{ marginTop:16 }}>
        <BanoPanel toast={toast} />
      </div>

      {/* Modal añadir aula */}
      <Modal open={modalAddAula} onClose={() => setModalAddAula(false)} title="Añadir nueva aula">
        <form onSubmit={handleAddAula}>
          <div className="form-group">
            <label>Nombre del aula</label>
            <input type="text" value={formAula.nombre} onChange={e => setFormAula(f => ({...f,nombre:e.target.value}))} placeholder="Ej: Lab. Física 2" required autoFocus />
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select value={formAula.tipo} onChange={e => setFormAula(f => ({...f,tipo:e.target.value}))}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Capacidad (alumnos)</label>
            <input type="number" min="1" max="100" value={formAula.capacidad} onChange={e => setFormAula(f => ({...f,capacidad:e.target.value}))} />
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setModalAddAula(false)}>Cancelar</button>
            <button type="submit" className="btn btn-success btn-sm" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <Plus size={14} /> Añadir aula
            </button>
          </div>
        </form>
      </Modal>

      {/* Detalle aula con franjas */}
      {aulaDetalle && (
        <AulaDetalle
          aula={aulaDetalle}
          onClose={() => setAulaDetalle(null)}
          toast={toast}
          onReservaChange={cargar}
        />
      )}
    </div>
  )
}