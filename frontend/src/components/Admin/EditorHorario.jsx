import { useState, useEffect } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useConfirm } from '../shared/ConfirmDialog'
import { Clock, Plus, Trash2, GripVertical, AlertTriangle, Save } from 'lucide-react'

const BASE = '/api'
const req = (method, path, body) =>
  fetch(BASE + path, {
    method,
    headers: { 'Content-Type':'application/json', Authorization:'Bearer '+localStorage.getItem('edu_token') },
    ...(body ? { body: JSON.stringify(body) } : {})
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d })

export default function EditorHorario({ toast }) {
  const isMobile  = useIsMobile()
  const confirmar = useConfirm()
  const [franjas,   setFranjas]   = useState([])
  const [original,  setOriginal]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const data = await req('GET', '/admin/franjas')
      setFranjas(data)
      setOriginal(JSON.stringify(data))
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  function actualizar(idx, campo, valor) {
    setFranjas(f => f.map((item, i) => i === idx ? { ...item, [campo]: valor } : item))
  }

  function añadirFranja() {
    const ultima = franjas[franjas.length - 1]
    const inicio = ultima?.hora_fin || '08:00'
    const fin    = sumar30min(inicio)
    setFranjas(f => [...f, {
      id: 'new-' + Date.now(),
      orden: f.length + 1,
      label: `${f.length + 1}ª hora`,
      hora_inicio: inicio,
      hora_fin: fin,
      reservable: 1,
    }])
  }

  function eliminarFranja(idx) {
    if (franjas.length === 1) {
      toast('Debe haber al menos una franja', 'error')
      return
    }
    setFranjas(f => f.filter((_, i) => i !== idx))
  }

  function sumar30min(hora) {
    const [h, m] = hora.split(':').map(Number)
    const total  = h * 60 + m + 30
    const nh = Math.floor(total / 60) % 24
    const nm = total % 60
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
  }

  function validarLocal() {
    if (franjas.length === 0) return 'Debe haber al menos una franja'
    for (let i = 0; i < franjas.length; i++) {
      const f = franjas[i]
      if (!f.label?.trim()) return `Franja ${i+1}: nombre obligatorio`
      if (!/^\d{2}:\d{2}$/.test(f.hora_inicio)) return `Franja ${i+1}: hora de inicio inválida`
      if (!/^\d{2}:\d{2}$/.test(f.hora_fin))    return `Franja ${i+1}: hora de fin inválida`
      if (f.hora_fin <= f.hora_inicio) return `Franja "${f.label}": la hora de fin debe ser posterior al inicio`
    }
    const ordenadas = [...franjas].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i].hora_inicio < ordenadas[i-1].hora_fin) {
        return `Las franjas "${ordenadas[i-1].label}" y "${ordenadas[i].label}" se solapan`
      }
    }
    return null
  }

  async function handleGuardar() {
    const error = validarLocal()
    if (error) { toast(error, 'error'); return }

    // Comprobar impacto en reservas/guardias futuras
    let impacto = { reservas_futuras: 0, guardias_futuras: 0 }
    try {
      impacto = await req('GET', '/admin/franjas/preview-impacto')
    } catch (err) { /* ignoramos, no es crítico */ }

    const total = impacto.reservas_futuras + impacto.guardias_futuras
    if (total > 0) {
      const ok = await confirmar({
        title: 'Aviso: hay actividad futura programada',
        message: `Hay ${impacto.reservas_futuras} reserva(s) y ${impacto.guardias_futuras} guardia(s) futuras hechas con el horario actual. Las que ya están guardadas no se modificarán, pero si los profesores intentan cancelarlas o crear nuevas verán las franjas nuevas. ¿Continuar?`,
        confirmText: 'Sí, guardar',
        cancelText: 'Cancelar',
        variant: 'default',
      })
      if (!ok) return
    }

    setGuardando(true)
    try {
      const data = await req('PUT', '/admin/franjas', { franjas })
      setFranjas(data.franjas)
      setOriginal(JSON.stringify(data.franjas))
      toast(data.mensaje, 'success')
    } catch (err) { toast(err.message, 'error') }
    finally { setGuardando(false) }
  }

  function handleResetear() {
    setFranjas(JSON.parse(original))
    toast('Cambios descartados', 'info')
  }

  const haCambios = JSON.stringify(franjas) !== original

  if (loading) return <p style={{ color:'var(--text3)' }}>Cargando horario...</p>

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:16, fontWeight:700, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
          <Clock size={16} /> Horario del centro
        </h2>
        <p style={{ fontSize:13, color:'var(--text3)' }}>
          Configura las franjas horarias en las que tu centro tiene clases. El switch al final de cada franja controla si los profesores pueden reservar aulas en esa hora.
        </p>
      </div>

      {/* Lista de franjas */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {franjas.map((f, idx) => (
          <FranjaRow
            key={f.id ?? idx}
            franja={f}
            isMobile={isMobile}
            onChange={(campo, valor) => actualizar(idx, campo, valor)}
            onDelete={() => eliminarFranja(idx)}
            disabled={franjas.length === 1}
          />
        ))}
      </div>

      {/* Añadir franja */}
      <button
        onClick={añadirFranja}
        style={{
          marginTop:10, width:'100%',
          padding:'12px',
          border:'1.5px dashed var(--border)',
          borderRadius:10,
          background:'transparent',
          color:'var(--text3)',
          cursor:'pointer',
          fontFamily:'Outfit,sans-serif',
          fontSize:13, fontWeight:600,
          display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
          transition:'all .18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor='var(--primary-l)'; e.currentTarget.style.color='var(--primary)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text3)' }}
      >
        <Plus size={15} /> Añadir franja
      </button>

      {/* Footer con acciones */}
      <div style={{
        marginTop:20,
        paddingTop:16,
        borderTop:'1px solid var(--border)',
        display:'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent:'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap:10,
      }}>
        <div style={{ fontSize:12, color:'var(--text3)', display:'flex', alignItems:'center', gap:6 }}>
          {haCambios ? (
            <><AlertTriangle size={13} style={{ color:'var(--orange)' }} /> Tienes cambios sin guardar</>
          ) : (
            <span style={{ opacity:.6 }}>{franjas.length} franja{franjas.length !== 1 ? 's' : ''} · {franjas.filter(f => f.reservable).length} reservable{franjas.filter(f => f.reservable).length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          {haCambios && (
            <button className="btn btn-outline btn-sm" onClick={handleResetear} disabled={guardando}>
              Descartar
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleGuardar}
            disabled={guardando || !haCambios}
            style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
            <Save size={14} /> {guardando ? 'Guardando...' : 'Guardar horario'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ───── Subcomponente: una fila de franja ─────
function FranjaRow({ franja, isMobile, onChange, onDelete, disabled }) {
  const reservable = !!franja.reservable

  return (
    <div style={{
      display:'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: isMobile ? 8 : 10,
      padding: isMobile ? 12 : '10px 14px',
      borderRadius:10,
      background: reservable ? 'var(--white)' : 'var(--surface)',
      border:`1.5px solid ${reservable ? 'var(--border)' : 'var(--border)'}`,
      opacity: reservable ? 1 : 0.75,
      transition:'opacity .18s, background .18s',
    }}>
      {/* Drag handle (visual, sin función real por ahora) */}
      {!isMobile && (
        <div style={{ color:'var(--text3)', flexShrink:0, opacity:.4 }} title="Arrastrar para reordenar (próximamente)">
          <GripVertical size={14} />
        </div>
      )}

      {/* Nombre */}
      <input
        type="text"
        value={franja.label}
        onChange={e => onChange('label', e.target.value)}
        placeholder="Ej: 1ª hora"
        style={{
          flex: isMobile ? '1 1 100%' : '0 1 140px',
          padding:'7px 10px',
          fontSize:13,
          fontWeight: reservable ? 600 : 500,
        }}
      />

      {/* Horas */}
      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        <input
          type="time"
          value={franja.hora_inicio}
          onChange={e => onChange('hora_inicio', e.target.value)}
          style={{ width:100, padding:'7px 8px', fontSize:13 }}
        />
        <span style={{ color:'var(--text3)', fontSize:13 }}>→</span>
        <input
          type="time"
          value={franja.hora_fin}
          onChange={e => onChange('hora_fin', e.target.value)}
          style={{ width:100, padding:'7px 8px', fontSize:13 }}
        />
      </div>

      {/* Switch + delete */}
      <div style={{
        display:'flex',
        alignItems:'center',
        gap:10,
        marginLeft: isMobile ? 0 : 'auto',
        flexShrink:0,
        justifyContent: isMobile ? 'space-between' : 'flex-end',
      }}>
        <label style={{ display:'inline-flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, fontWeight:600, color: reservable ? 'var(--primary-dark)' : 'var(--text3)' }}>
          <Switch checked={reservable} onChange={v => onChange('reservable', v ? 1 : 0)} />
          <span>{reservable ? 'Reservable' : 'No reservable'}</span>
        </label>

        <button
          onClick={onDelete}
          disabled={disabled}
          aria-label="Eliminar franja"
          style={{
            border:'none', background:'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: disabled ? 'var(--border)' : 'var(--text3)',
            padding:6, borderRadius:6,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'color .15s, background .15s',
          }}
          onMouseEnter={e => { if (!disabled) { e.currentTarget.style.color='var(--red)'; e.currentTarget.style.background='var(--red-pale)' } }}
          onMouseLeave={e => { e.currentTarget.style.color = disabled ? 'var(--border)' : 'var(--text3)'; e.currentTarget.style.background='transparent' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ───── Switch toggle ─────
function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position:'relative',
        width:36, height:20,
        borderRadius:999,
        border:'none',
        background: checked ? 'var(--primary)' : '#d1d5db',
        cursor:'pointer',
        padding:0,
        flexShrink:0,
        transition:'background .2s',
      }}
    >
      <span style={{
        position:'absolute',
        top:2, left:checked ? 18 : 2,
        width:16, height:16,
        background:'#fff',
        borderRadius:'50%',
        transition:'left .2s',
        boxShadow:'0 1px 3px rgba(0,0,0,.2)',
      }} />
    </button>
  )
}