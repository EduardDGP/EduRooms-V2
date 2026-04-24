import { useState, useEffect } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { getHistorialReservas } from '../../api/client'
import {
  ClipboardList, ChevronDown, Search,
  Monitor, Atom, Dna, FlaskConical, Wrench, Bot, School,
} from 'lucide-react'

const ICONOS = {
  'Informática':             <Monitor size={16} />,
  'Laboratorio de Física':   <Atom size={16} />,
  'Laboratorio de Biología': <Dna size={16} />,
  'Laboratorio de Química':  <FlaskConical size={16} />,
  'Taller de Tecnología':    <Wrench size={16} />,
  'Sala de Robótica':        <Bot size={16} />,
}

export default function HistorialReservas({ toast }) {
  const isMobile = useIsMobile()
  const [reservas,   setReservas]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filtroAula, setFiltroAula] = useState('')
  const [open,       setOpen]       = useState(false)

  useEffect(() => { if (open) cargar() }, [open])

  async function cargar() {
    setLoading(true)
    try { setReservas(await getHistorialReservas()) }
    catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  const filtradas = filtroAula
    ? reservas.filter(r => r.aula_nombre.toLowerCase().includes(filtroAula.toLowerCase()))
    : reservas

  const porFecha = filtradas.reduce((acc, r) => {
    if (!acc[r.fecha]) acc[r.fecha] = []
    acc[r.fecha].push(r)
    return acc
  }, {})

  const fechas = Object.keys(porFecha).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', padding:'13px 20px',
          background: open ? 'var(--primary-pale)' : 'var(--surface)',
          border:'1.5px solid', borderColor: open ? 'var(--primary-l)' : 'var(--border)',
          borderRadius:10, cursor:'pointer', display:'flex',
          alignItems:'center', justifyContent:'space-between', gap:10,
          fontFamily:'Outfit, sans-serif', fontSize:15, fontWeight:700,
          color: open ? 'var(--primary)' : 'var(--text)',
          transition:'all .2s',
        }}
      >
        <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
          <ClipboardList size={16} /> Historial de reservas anteriores
        </span>
        <ChevronDown size={18} style={{ transition:'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>

      {open && (
        <div style={{ marginTop:12 }}>
          {/* Filtro con icono */}
          <div style={{ position:'relative', marginBottom:16 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }} />
            <input
              type="text"
              placeholder="Filtrar por aula..."
              value={filtroAula}
              onChange={e => setFiltroAula(e.target.value)}
              style={{ padding:'9px 14px 9px 34px', borderRadius:8, border:'1.5px solid var(--border)', width:'100%', fontFamily:'Outfit, sans-serif', fontSize:14 }}
            />
          </div>

          {loading ? (
            <p style={{ color:'var(--text3)', fontSize:14 }}>Cargando historial...</p>
          ) : fechas.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text3)' }}>
              <ClipboardList size={36} style={{ opacity:.4, marginBottom:10 }} />
              <p>No hay reservas anteriores registradas.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {fechas.map(fecha => {
                const label = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
                  weekday:'long', day:'numeric', month:'long', year:'numeric'
                })
                return (
                  <div key={fecha}>
                    {/* Fecha cabecera */}
                    <div style={{
                      fontSize:12, fontWeight:700, color:'var(--text3)',
                      textTransform:'uppercase', letterSpacing:'.8px',
                      marginBottom:8, paddingBottom:6,
                      borderBottom:'1px solid var(--border)',
                    }}>
                      {label}
                    </div>

                    {/* Reservas de ese día */}
                    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      {porFecha[fecha].sort((a, b) => a.franja_orden - b.franja_orden).map(r => (
                        <div key={r.id} style={{
                          display:'flex',
                          flexWrap:'wrap',
                          alignItems:'center',
                          gap: isMobile ? 6 : 12,
                          padding: isMobile ? 10 : '10px 14px',
                          borderRadius:8,
                          background:'var(--white)',
                          border:'1px solid var(--border)',
                          fontSize:13,
                        }}>
                          <span style={{ color:'var(--text2)', display:'inline-flex', alignItems:'center', flexShrink:0 }}>
                            {ICONOS[r.aula_tipo] || <School size={16} />}
                          </span>
                          <span style={{
                            fontWeight:700, color:'var(--text)',
                            flex: isMobile ? '1 1 100px' : '0 0 130px',
                            minWidth:0,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>{r.aula_nombre}</span>
                          <span style={{
                            background:'var(--primary-pale)', color:'var(--primary)',
                            padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700,
                            flexShrink:0, whiteSpace:'nowrap',
                          }}>{r.franja_label}</span>
                          <span style={{ fontFamily:'Fira Code, monospace', color:'var(--text3)', fontSize:11, flexShrink:0, whiteSpace:'nowrap' }}>
                            {r.hora_inicio}–{r.hora_fin}
                          </span>
                          {!isMobile && (
                            <span style={{ flex:1, minWidth:0, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {r.asignatura}
                            </span>
                          )}
                          <span style={{
                            color:'var(--text3)', fontSize:12,
                            flexShrink:0,
                            minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                            maxWidth: isMobile ? '100%' : 140,
                          }}>
                            {r.prof_nombre} {r.prof_apellidos}
                          </span>
                          {isMobile && r.asignatura && (
                            <div style={{ flex:'1 0 100%', color:'var(--text2)', fontSize:12, marginTop:2 }}>
                              {r.asignatura}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}