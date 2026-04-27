import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useConfirm } from '../shared/ConfirmDialog'
import { getReservasAula, crearReserva, cancelarReserva } from '../../api/client'
import { FRANJAS_RESERVABLES } from '../../config/franjas'
import Modal from '../shared/Modal'
import {
  X, ChevronLeft, ChevronRight, Calendar,
  Monitor, Atom, Dna, FlaskConical, Wrench, Bot, School,
} from 'lucide-react'
import { todayISO, toLocalISO } from '../../utils/fecha'

const TODAY = todayISO()

const ICONOS = {
  'Informática':             <Monitor size={24} />,
  'Laboratorio de Física':   <Atom size={24} />,
  'Laboratorio de Biología': <Dna size={24} />,
  'Laboratorio de Química':  <FlaskConical size={24} />,
  'Taller de Tecnología':    <Wrench size={24} />,
  'Sala de Robótica':        <Bot size={24} />,
}
const COLORES = {
  'Informática':             '#dbeafe',
  'Laboratorio de Física':   '#fef3c7',
  'Laboratorio de Biología': '#d1fae5',
  'Laboratorio de Química':  '#ede9fe',
  'Taller de Tecnología':    '#fee2e2',
  'Sala de Robótica':        '#e0f2fe',
}

export default function AulaDetalle({ aula, onClose, toast, onReservaChange }) {
  const { user }   = useAuth()
  const isMobile   = useIsMobile()
  const confirmar  = useConfirm()
  const [fecha,     setFecha]     = useState(TODAY)
  const [reservas,  setReservas]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [modal,     setModal]     = useState(null)
  const [asignatura,setAsignatura]= useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [fecha, aula.id])

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function cargar() {
    setLoading(true)
    try {
      const data = await getReservasAula(aula.id, fecha)
      setReservas(data)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  const reservaMap = {}
  reservas.forEach(r => { reservaMap[r.franja_id] = r })

  async function handleReservar(e) {
    e.preventDefault()
    if (!modal) return
    setGuardando(true)
    try {
      await crearReserva({
        aula_id:      aula.id,
        asignatura,
        fecha,
        franja_id:    modal.id,
        franja_label: modal.label,
        franja_orden: modal.orden,
        hora_inicio:  modal.inicio,
        hora_fin:     modal.fin,
      })
      toast(`Reserva confirmada — ${modal.label}`, 'success')
      setModal(null)
      setAsignatura('')
      cargar()
      onReservaChange?.()
    } catch (err) { toast(err.message, 'error') }
    finally { setGuardando(false) }
  }

  async function handleCancelar(reservaId, franjaLabel) {
    const ok = await confirmar({
      title: 'Cancelar reserva',
      message: `¿Seguro que quieres cancelar tu reserva de ${franjaLabel}? El aula quedará disponible para otros profesores.`,
      confirmText: 'Sí, cancelar',
      cancelText: 'Volver',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await cancelarReserva(reservaId)
      toast('Reserva cancelada', 'info')
      cargar()
      onReservaChange?.()
    } catch (err) { toast(err.message, 'error') }
  }

  function cambiarDia(delta) {
    const d = new Date(fecha + 'T12:00:00')   // mediodía local para evitar líos de zona
    d.setDate(d.getDate() + delta)
    const nueva = toLocalISO(d)
    if (nueva >= TODAY) setFecha(nueva)
  }

  const esPasado = fecha < TODAY
  const fechaLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const icono = ICONOS[aula.tipo] || <School size={24} />

  // Estilos del contenedor según dispositivo
  const containerStyle = isMobile
    ? {
        position:'fixed', inset:0, background:'#fff',
        display:'flex', flexDirection:'column',
        zIndex:1000,
        animation:'slideUp .25s ease',
      }
    : {
        position:'fixed', inset:0, background:'rgba(15,23,42,.55)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:1000, backdropFilter:'blur(4px)',
      }

  const panelStyle = isMobile
    ? { background:'#fff', display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }
    : {
        background:'#fff', borderRadius:20, width:580, maxWidth:'96vw',
        maxHeight:'90vh', overflow:'auto',
        boxShadow:'0 8px 40px rgba(0,0,0,.18)',
        animation:'modalIn .2s ease',
      }

  return (
    <div style={containerStyle}
      onClick={e => {
        if (!isMobile && e.target === e.currentTarget) onClose()
      }}>
      <div style={panelStyle}>

        {/* Cabecera */}
        <div style={{
          padding: isMobile ? '16px 18px 14px' : '22px 28px 18px',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:12,
          flexShrink:0,
        }}>
          {isMobile ? (
            <button onClick={onClose} aria-label="Volver"
              style={{ background:'transparent', border:'none', cursor:'pointer', padding:6, borderRadius:8, color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <ChevronLeft size={22} />
            </button>
          ) : null}

          <div style={{
            width: isMobile ? 40 : 48,
            height: isMobile ? 40 : 48,
            borderRadius:12,
            background: COLORES[aula.tipo] || '#f1f5f9',
            color:'var(--text)',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0,
          }}>
            {icono}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize: isMobile ? 16 : 18, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{aula.nombre}</div>
            <div style={{ fontSize:13, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {aula.tipo} · {aula.capacidad} alumnos
            </div>
          </div>

          {!isMobile && (
            <button onClick={onClose} aria-label="Cerrar"
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:4, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Selector de fecha */}
        <div style={{
          padding: isMobile ? '14px 16px' : '16px 28px',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:8,
          flexShrink:0,
        }}>
          <button onClick={() => cambiarDia(-1)} disabled={fecha <= TODAY}
            aria-label="Día anterior"
            style={{ background:'none', border:'1.5px solid var(--border)', borderRadius:8, width:36, height:36, cursor: fecha <= TODAY ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: fecha <= TODAY ? .3 : 1, flexShrink:0 }}>
            <ChevronLeft size={16} />
          </button>

          <input
            type="date"
            value={fecha}
            min={TODAY}
            onChange={e => { if (e.target.value >= TODAY) setFecha(e.target.value) }}
            style={{ flex:1, minWidth:0, textAlign:'center', fontWeight:600, fontSize:14, borderRadius:8, border:'1.5px solid var(--border)', padding:'8px 10px' }}
          />

          <button onClick={() => cambiarDia(1)}
            aria-label="Día siguiente"
            style={{ background:'none', border:'1.5px solid var(--border)', borderRadius:8, width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ChevronRight size={16} />
          </button>

          <button onClick={() => setFecha(TODAY)} style={{
            padding:'8px 14px', borderRadius:8, border:'1.5px solid var(--border)',
            fontSize:12, fontWeight:600, cursor:'pointer',
            background: fecha === TODAY ? 'var(--primary-pale)' : '#fff',
            color: fecha === TODAY ? 'var(--primary)' : 'var(--text2)',
            flexShrink:0, whiteSpace:'nowrap',
          }}>Hoy</button>
        </div>

        {/* Fecha label */}
        <div style={{
          padding: isMobile ? '10px 16px 4px' : '10px 28px 4px',
          fontSize:13, color:'var(--text3)', textTransform:'capitalize',
          display:'flex', alignItems:'center', gap:6,
          flexShrink:0,
        }}>
          <Calendar size={13} /> {fechaLabel}
        </div>

        {/* Franjas */}
        <div style={{
          padding: isMobile ? '12px 16px 28px' : '12px 28px 28px',
          display:'flex', flexDirection:'column', gap:10,
          flex: isMobile ? 1 : 'none',
          overflowY: isMobile ? 'auto' : 'visible',
        }}>
          {loading ? (
            <p style={{ color:'var(--text3)', fontSize:14, padding:20 }}>Cargando...</p>
          ) : (
            FRANJAS_RESERVABLES.map(franja => {
              const res    = reservaMap[franja.id]
              const isMine = res && res.profesor_id === user.id
              const libre  = !res

              return (
                <div key={franja.id} style={{
                  display:'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: isMobile ? 10 : 14,
                  padding: isMobile ? 14 : '14px 16px',
                  borderRadius:10,
                  border:`1.5px solid ${libre ? 'var(--border)' : isMine ? '#bfdbfe' : '#fecaca'}`,
                  background: libre ? 'var(--surface)' : isMine ? '#eff6ff' : '#fff5f5',
                  transition:'all .15s',
                }}>
                  {/* Fila superior en móvil, todo en línea en desktop */}
                  <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:0, flex:1 }}>
                    <div style={{ width:80, flexShrink:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{franja.label}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'Fira Code, monospace' }}>
                        {franja.inicio}–{franja.fin}
                      </div>
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      {libre ? (
                        <span style={{ fontSize:13, color:'var(--green)', fontWeight:600 }}>● Disponible</span>
                      ) : (
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color: isMine ? 'var(--primary)' : 'var(--red)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {isMine ? '● Tu reserva' : `● ${res.nombre} ${res.apellidos}`}
                          </div>
                          <div style={{ fontSize:12, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{res.asignatura}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón de acción — a ancho completo en móvil, al lado en desktop */}
                  {(libre || isMine) && (
                    <div style={{ flexShrink:0, width: isMobile ? '100%' : 'auto' }}>
                      {libre && (
                        <button className="btn btn-primary btn-sm" disabled={esPasado}
                          onClick={() => {
                            if (esPasado) return
                            setModal(franja)
                            setAsignatura(user.asignatura + ' — ')
                          }}
                          style={{ opacity: esPasado ? .4 : 1, cursor: esPasado ? 'not-allowed' : 'pointer', width: isMobile ? '100%' : 'auto' }}>
                          {esPasado ? 'Pasado' : 'Reservar'}
                        </button>
                      )}
                      {isMine && (
                        <button className="btn btn-danger btn-sm"
                          onClick={() => handleCancelar(res.id, franja.label)}
                          style={{ width: isMobile ? '100%' : 'auto' }}>
                          Cancelar reserva
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal reservar franja */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal ? `Reservar — ${modal.label} (${modal.inicio}–${modal.fin})` : ''}>
        <form onSubmit={handleReservar}>
          <div style={{ background:'var(--primary-pale)', borderRadius:8, padding:'10px 14px', marginBottom:18, fontSize:13, color:'var(--primary)', display:'flex', alignItems:'center', gap:8 }}>
            <Calendar size={14} /> <span style={{ textTransform:'capitalize' }}>{fechaLabel}</span> · {aula.nombre}
          </div>
          <div className="form-group">
            <label>Asignatura / Motivo</label>
            <input
              type="text"
              value={asignatura}
              onChange={e => setAsignatura(e.target.value)}
              placeholder="Ej: Física — Prácticas de laboratorio"
              required autoFocus
            />
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20, flexWrap:'wrap' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={guardando}>
              {guardando ? 'Reservando...' : 'Confirmar reserva'}
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
      `}</style>
    </div>
  )
}