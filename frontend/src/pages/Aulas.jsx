import { useConfirm } from '../components/shared/ConfirmDialog'
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
  User, BookOpen, Calendar, Plus, Trash2, Clock,
} from 'lucide-react'
import { todayISO } from '../utils/fecha'

const TODAY = todayISO()

const TIPOS = [
  { value:'Informática',             label:'Informática'             },
  { value:'Laboratorio de Física',   label:'Laboratorio de Física'   },
  { value:'Laboratorio de Biología', label:'Laboratorio de Biología' },
  { value:'Laboratorio de Química',  label:'Laboratorio de Química'  },
  { value:'Taller de Tecnología',    label:'Taller de Tecnología'    },
  { value:'Sala de Robótica',        label:'Sala de Robótica'        },
]

// Iconos Lucide por tipo
const ICONOS = {
  'Informática':             <Monitor size={22} />,
  'Laboratorio de Física':   <Atom size={22} />,
  'Laboratorio de Biología': <Dna size={22} />,
  'Laboratorio de Química':  <FlaskConical size={22} />,
  'Taller de Tecnología':    <Wrench size={22} />,
  'Sala de Robótica':        <Bot size={22} />,
}

// Paleta por tipo: cápsula del icono + barra superior de la card
const PALETAS = {
  'Informática':             { bg:'#E6F1FB', fg:'#185FA5', accent:'#378ADD' },
  'Laboratorio de Física':   { bg:'#FAEEDA', fg:'#854F0B', accent:'#EF9F27' },
  'Laboratorio de Biología': { bg:'#E1F5EE', fg:'#0F6E56', accent:'#10b981' },
  'Laboratorio de Química':  { bg:'#EEEDFE', fg:'#534AB7', accent:'#7F77DD' },
  'Taller de Tecnología':    { bg:'#FCEBEB', fg:'#A32D2D', accent:'#E24B4A' },
  'Sala de Robótica':        { bg:'#E6F1FB', fg:'#0C447C', accent:'#185FA5' },
}

const PALETA_DEFAULT = { bg:'#F1EFE8', fg:'#5F5E5A', accent:'#888780' }

export default function Aulas({ toast }) {
  const { user }   = useAuth()
  const isMobile   = useIsMobile()
  const puedeAnadir = ['director', 'jefe_estudios'].includes(user?.rol)
  const confirmar  = useConfirm()
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

  const totalLibres = aulas.filter(a => !a.reserva).length
  const totalOcup   = aulas.length - totalLibres

  // Próxima reserva del profe (hoy)
  const reservasHoy = reservas.filter(r => r.fecha === TODAY)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  const ahora       = new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit', hour12:false })
  const proximaReserva = reservasHoy.find(r => r.hora_fin > ahora)

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

  async function handleBorrarAula(id, nombre) {
    const ok = await confirmar({
      title: 'Eliminar aula',
      message: `¿Seguro que quieres eliminar "${nombre}"? Se borrarán también todas sus reservas.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await borrarAula(id)
      toast('Aula eliminada', 'info')
      cargar()
    } catch (err) { toast(err.message, 'error') }
  }

  if (loading) return <p style={{ color:'var(--text3)' }}>Cargando aulas...</p>

  const filtros = [
    { key:'all',  label:`Todas (${aulas.length})`     },
    { key:'free', label:`Libres (${totalLibres})`     },
    { key:'busy', label:`Ocupadas (${totalOcup})`     },
    { key:'info', label:'Informática'                 },
    { key:'lab',  label:'Laboratorios'                },
  ]

  return (
    <div>
      {/* ──────── HERO CARD ──────── */}
      <div style={{
        background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 65%)',
        borderRadius: 18,
        padding: isMobile ? '20px 22px' : '26px 30px',
        border: '1px solid var(--border)',
        marginBottom: 18,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'flex-end',
        justifyContent: 'space-between',
        gap: isMobile ? 18 : 16,
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 26 : 30, fontWeight:700, letterSpacing:'-0.6px', lineHeight:1.05 }}>Aulas</h1>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
            <span className={totalLibres > 0 ? 'dot-live' : 'dot-static'}
              style={totalLibres === 0 ? { background:'var(--text3)' } : undefined}></span>
            <p style={{ color:'var(--text3)', fontSize:14, margin:0 }}>
              {totalLibres > 0
                ? `${totalLibres} ${totalLibres === 1 ? 'aula disponible ahora' : 'aulas disponibles ahora'}`
                : 'Todas ocupadas en este momento'}
            </p>
          </div>
        </div>

        <div style={{
          display:'flex',
          gap: isMobile ? 18 : 28,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.6px', fontWeight:700, marginBottom:4 }}>Mis reservas hoy</div>
            <div style={{ fontSize:22, fontWeight:600, color:'var(--text)', lineHeight:1 }}>{reservasHoy.length}</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.6px', fontWeight:700, marginBottom:4 }}>Total aulas</div>
            <div style={{ fontSize:22, fontWeight:600, color:'var(--text)', lineHeight:1 }}>{aulas.length}</div>
          </div>
          {puedeAnadir && (
            <button className="btn btn-primary btn-sm" onClick={() => setModalAddAula(true)}
              style={{ flexShrink:0, alignSelf: isMobile ? 'stretch' : 'flex-end' }}>
              <Plus size={15} /> Añadir aula
            </button>
          )}
        </div>
      </div>

      {/* ──────── FILTROS PILL ──────── */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom: 18, overflowX: isMobile ? 'auto' : 'visible' }}>
        {filtros.map(f => {
          const activo = filtro === f.key
          return (
            <button key={f.key} onClick={() => setFiltro(f.key)} style={{
              padding:'7px 14px',
              border:'none',
              borderRadius: 999,
              fontFamily:'Outfit,sans-serif',
              fontSize:13,
              fontWeight: activo ? 600 : 500,
              cursor:'pointer',
              whiteSpace:'nowrap',
              background: activo ? 'var(--black)'  : 'transparent',
              color:      activo ? '#fff'          : 'var(--text3)',
              transition:'all .18s',
            }}
            onMouseEnter={e => { if (!activo) e.currentTarget.style.background = 'rgba(0,0,0,.04)' }}
            onMouseLeave={e => { if (!activo) e.currentTarget.style.background = 'transparent' }}
            >{f.label}</button>
          )
        })}
      </div>

      {/* ──────── GRID DE AULAS ──────── */}
      {aulasFiltradas.length === 0 ? (
        <div style={{ textAlign:'center', padding:'56px 20px', color:'var(--text3)' }}>
          <p style={{ fontSize:14 }}>No hay aulas en esta categoría.</p>
        </div>
      ) : (
        <div style={{
          display:'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
          gap: 12,
          marginBottom: 28,
        }}>
          {aulasFiltradas.map((aula, idx) => {
            const res     = aula.reserva
            const ocupada = !!res
            const icono   = ICONOS[aula.tipo]  || <Monitor size={22} />
            const paleta  = PALETAS[aula.tipo] || PALETA_DEFAULT
            const misHoy  = reservas.filter(r => r.aula_id === aula.id && r.fecha === TODAY)

            return (
              <AulaCard
                key={aula.id}
                aula={aula}
                ocupada={ocupada}
                res={res}
                icono={icono}
                paleta={paleta}
                misHoy={misHoy}
                puedeAnadir={puedeAnadir}
                onClick={() => setAulaDetalle(aula)}
                onBorrar={() => handleBorrarAula(aula.id, aula.nombre)}
                indexAnim={idx}
              />
            )
          })}
        </div>
      )}

      {/* ──────── MINI STATS DE TU DÍA ──────── */}
      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 12,
        marginBottom: 28,
      }}>
        <MiniStat
          label="Tu próxima clase"
          icon={<Clock size={14} />}
          value={proximaReserva
            ? `${proximaReserva.aula_nombre} · ${proximaReserva.hora_inicio}`
            : 'Sin más reservas hoy'
          }
          highlight={!!proximaReserva}
        />
        <MiniStat
          label="Reservas totales hoy"
          icon={<Calendar size={14} />}
          value={`${reservasHoy.length} reserva${reservasHoy.length !== 1 ? 's' : ''}`}
        />
      </div>

      {/* ──────── MIS RESERVAS HOY ──────── */}
      <section style={{ marginBottom: 22 }}>
        <SectionHeader icon={<Calendar size={15} />} title="Mis reservas de hoy" />
        <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          {reservasHoy.length === 0 ? (
            <p style={{ color:'var(--text3)', fontSize:14, padding:'16px 20px' }}>No tienes reservas para hoy.</p>
          ) : reservasHoy.map((r, i, arr) => (
            <div key={r.id} style={{
              display:'flex',
              flexWrap:'wrap',
              alignItems:'center',
              gap: isMobile ? 8 : 12,
              padding: isMobile ? '12px 14px' : '13px 18px',
              fontSize:13,
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontWeight:600, width: isMobile ? 'auto' : 130, flexShrink:0 }}>{r.aula_nombre}</span>
              <span style={{ background:'var(--primary-pale)', color:'var(--primary-dark)', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:600, flexShrink:0 }}>{r.franja_label}</span>
              <span style={{ fontFamily:'Fira Code,monospace', color:'var(--text3)', fontSize:11, flexShrink:0 }}>{r.hora_inicio}–{r.hora_fin}</span>
              <span style={{ flex:1, minWidth:0, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.asignatura}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ──────── HISTORIAL ──────── */}
      <section style={{ marginBottom: 22 }}>
        <HistorialReservas toast={toast} />
      </section>

      {/* ──────── BAÑOS ──────── */}
      <section style={{ marginBottom: 22 }}>
        <BanoPanel toast={toast} />
      </section>

      {/* ──────── MODAL AÑADIR ──────── */}
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
            <button type="submit" className="btn btn-success btn-sm">
              <Plus size={14} /> Añadir aula
            </button>
          </div>
        </form>
      </Modal>

      {/* ──────── DETALLE AULA ──────── */}
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

/* ============== Tarjeta de aula ============== */
function AulaCard({ aula, ocupada, res, icono, paleta, misHoy, puedeAnadir, onClick, onBorrar, indexAnim }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={ocupada ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position:'relative',
        background:'var(--white)',
        border:'1px solid var(--border)',
        borderRadius: 14,
        padding: 18,
        cursor: ocupada ? 'default' : 'pointer',
        opacity: ocupada ? 0.72 : 1,
        transform: hover && !ocupada ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hover && !ocupada
          ? '0 10px 28px rgba(5,150,105,.10), 0 2px 6px rgba(0,0,0,.04)'
          : '0 1px 2px rgba(0,0,0,.02)',
        transition:'transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s, opacity .15s',
        animation: 'fadeInUp .35s ease both',
        animationDelay: `${Math.min(indexAnim * 30, 250)}ms`,
        minWidth: 0,
        display:'flex', flexDirection:'column', gap:14,
        overflow:'hidden',
      }}
    >
      {/* Barra superior de color (acento) */}
      <div style={{
        position:'absolute',
        top:0, left:0, right:0,
        height:3,
        background: paleta.accent,
        opacity: ocupada ? 0.45 : 1,
      }} />

      {/* Cabecera: icono + nombre + papelera */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginTop: 4 }}>
        <div style={{
          width:44, height:44, borderRadius:12,
          background: paleta.bg, color: paleta.fg,
          display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
          filter: ocupada ? 'saturate(.55)' : 'none',
        }}>
          {icono}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:600, letterSpacing:'-0.2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {aula.nombre}
          </div>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {aula.tipo} · {aula.capacidad} alumnos
          </div>
        </div>
        {puedeAnadir && (
          <button
            onClick={e => { e.stopPropagation(); onBorrar() }}
            aria-label="Eliminar aula"
            style={{
              border:'none', background:'transparent', cursor:'pointer',
              color:'var(--text3)', padding:6, borderRadius:6,
              display:'flex', alignItems:'center', justifyContent:'center',
              opacity: hover ? 1 : 0.4,
              transition:'opacity .15s, color .15s, background .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--red)'; e.currentTarget.style.background='var(--red-pale)' }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--text3)'; e.currentTarget.style.background='transparent' }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Estado footer */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, minWidth:0 }}>
        {ocupada ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1 }}>
              <div className="dot-static" style={{ background:'var(--text3)' }}></div>
              <div style={{ minWidth:0, overflow:'hidden' }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {res.nombre} {res.apellidos}
                </div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  <BookOpen size={10} style={{ display:'inline', verticalAlign:'-1px', marginRight:3 }} />
                  {res.asignatura}
                </div>
              </div>
            </div>
            <span style={{ fontSize:11, color:'var(--text3)', flexShrink:0, fontFamily:'Fira Code,monospace' }}>
              hasta {res.hora_fin}
            </span>
          </>
        ) : (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div className="dot-live"></div>
              <span style={{ fontSize:12.5, fontWeight:600, color:'var(--primary-dark)' }}>Libre ahora</span>
            </div>
            {misHoy.length > 0 && (
              <span style={{
                fontSize:11, fontWeight:600,
                background:'var(--primary-pale)', color:'var(--primary-dark)',
                padding:'3px 9px', borderRadius:20,
                whiteSpace:'nowrap',
              }}>
                {misHoy.length} {misHoy.length === 1 ? 'tuya' : 'tuyas'}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ============== Mini stat tipo "Apple" ============== */
function MiniStat({ label, value, icon, highlight }) {
  return (
    <div style={{
      background: highlight ? '#ECFDF5' : 'var(--surface)',
      border: `1px solid ${highlight ? '#86EFAC' : 'var(--border)'}`,
      borderRadius: 12,
      padding: '14px 16px',
      transition:'background .2s',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '.6px',
        marginBottom: 5,
        display:'flex', alignItems:'center', gap:6,
      }}>
        {icon} {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 600,
        color: highlight ? 'var(--primary-dark)' : 'var(--text)',
      }}>
        {value}
      </div>
    </div>
  )
}

/* ============== Cabecera de sección ============== */
function SectionHeader({ icon, title }) {
  return (
    <div style={{
      display:'flex',
      alignItems:'center',
      gap:8,
      marginBottom:12,
      color:'var(--text3)',
    }}>
      {icon}
      <h2 style={{ fontSize:14, fontWeight:600, color:'var(--text2)', letterSpacing:'.2px', margin:0 }}>{title}</h2>
    </div>
  )
}