import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getReservasAula, crearReserva, cancelarReserva } from '../../api/client'
import { FRANJAS_RESERVABLES } from '../../config/franjas'
import Modal from '../shared/Modal'

const TODAY = new Date().toISOString().split('T')[0]

export default function AulaDetalle({ aula, onClose, toast, onReservaChange }) {
  const { user } = useAuth()
  const [fecha,     setFecha]     = useState(TODAY)
  const [reservas,  setReservas]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [modal,     setModal]     = useState(null)  // franja object
  const [asignatura,setAsignatura]= useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [fecha, aula.id])

  async function cargar() {
    setLoading(true)
    try {
      const data = await getReservasAula(aula.id, fecha)
      setReservas(data)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  // Mapa franja_id → reserva
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
      toast(`Reserva confirmada — ${modal.label} 📅`, 'success')
      setModal(null)
      setAsignatura('')
      cargar()
      onReservaChange?.()
    } catch (err) { toast(err.message, 'error') }
    finally { setGuardando(false) }
  }

  async function handleCancelar(reservaId) {
    if (!confirm('¿Cancelar esta reserva?')) return
    try {
      await cancelarReserva(reservaId)
      toast('Reserva cancelada', 'info')
      cargar()
      onReservaChange?.()
    } catch (err) { toast(err.message, 'error') }
  }

  // Navegar días — no permite ir a días pasados
  function cambiarDia(delta) {
    const d = new Date(fecha)
    d.setDate(d.getDate() + delta)
    const nueva = d.toISOString().split('T')[0]
    if (nueva >= TODAY) setFecha(nueva)
  }

  const esPasado = fecha < TODAY

  const fechaLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const EMOJIS = { Informática:'💻','Laboratorio de Física':'⚗️','Laboratorio de Biología':'🧬','Laboratorio de Química':'🧪','Taller de Tecnología':'🔧','Sala de Robótica':'🤖' }
  const COLORES = { Informática:'#dbeafe','Laboratorio de Física':'#fef3c7','Laboratorio de Biología':'#d1fae5','Laboratorio de Química':'#ede9fe','Taller de Tecnología':'#fee2e2','Sala de Robótica':'#e0f2fe' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: 580, maxWidth: '96vw',
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,.18)',
        animation: 'modalIn .2s ease',
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '22px 28px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, fontSize: 24,
            background: COLORES[aula.tipo] || '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{EMOJIS[aula.tipo] || '🏫'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{aula.nombre}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>{aula.tipo} · {aula.capacidad} alumnos</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: 'var(--text3)', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Selector de fecha */}
        <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => cambiarDia(-1)} disabled={fecha <= TODAY} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, width: 34, height: 34, cursor: fecha <= TODAY ? 'not-allowed' : 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: fecha <= TODAY ? .3 : 1 }}>‹</button>
          <input
            type="date"
            value={fecha}
            min={TODAY}
            onChange={e => { if (e.target.value >= TODAY) setFecha(e.target.value) }}
            style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 14, borderRadius: 8, border: '1.5px solid var(--border)', padding: '7px 12px' }}
          />
          <button onClick={() => cambiarDia(1)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          <button onClick={() => setFecha(TODAY)} style={{
            padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--border)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', background: fecha === TODAY ? 'var(--primary-pale)' : '#fff',
            color: fecha === TODAY ? 'var(--primary)' : 'var(--text2)',
          }}>Hoy</button>
        </div>

        {/* Fecha label */}
        <div style={{ padding: '10px 28px 4px', fontSize: 13, color: 'var(--text3)', textTransform: 'capitalize' }}>
          {fechaLabel}
        </div>

        {/* Franjas */}
        <div style={{ padding: '12px 28px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <p style={{ color: 'var(--text3)', fontSize: 14, padding: 20 }}>Cargando...</p>
          ) : (
            FRANJAS_RESERVABLES.map(franja => {
              const res    = reservaMap[franja.id]
              const isMine = res && res.profesor_id === user.id
              const libre  = !res

              return (
                <div key={franja.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 10,
                  border: `1.5px solid ${libre ? 'var(--border)' : isMine ? '#bfdbfe' : '#fecaca'}`,
                  background: libre ? 'var(--surface)' : isMine ? '#eff6ff' : '#fff5f5',
                  transition: 'all .15s',
                }}>
                  {/* Franja info */}
                  <div style={{ width: 90, flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{franja.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'Fira Code, monospace' }}>
                      {franja.inicio}–{franja.fin}
                    </div>
                  </div>

                  {/* Estado */}
                  <div style={{ flex: 1 }}>
                    {libre ? (
                      <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>● Disponible</span>
                    ) : (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isMine ? 'var(--primary)' : 'var(--red)' }}>
                          {isMine ? '● Tu reserva' : `● ${res.nombre} ${res.apellidos}`}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{res.asignatura}</div>
                      </div>
                    )}
                  </div>

                  {/* Acción */}
                  {libre && (
                    <button className="btn btn-primary btn-sm" disabled={esPasado} onClick={() => {
                      if (esPasado) return
                      setModal(franja)
                      setAsignatura(user.asignatura + ' — ')
                    }} style={{ opacity: esPasado ? .4 : 1, cursor: esPasado ? 'not-allowed' : 'pointer' }}>
                      {esPasado ? 'Pasado' : 'Reservar'}
                    </button>
                  )}
                  {isMine && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleCancelar(res.id)}>
                      Cancelar
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal reservar franja */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={`Reservar — ${modal?.label} (${modal?.inicio}–${modal?.fin})`}>
        <form onSubmit={handleReservar}>
          <div style={{ background: 'var(--primary-pale)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: 'var(--primary)' }}>
            📅 {fechaLabel} · {aula.nombre}
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
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={guardando}>
              {guardando ? 'Reservando...' : 'Confirmar reserva'}
            </button>
          </div>
        </form>
      </Modal>

      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  )
}