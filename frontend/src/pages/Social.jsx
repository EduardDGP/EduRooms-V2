import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { getContactos, getProfesores, addContacto, getMensajes, enviarMensaje } from '../api/client'
import { ArrowLeft, Send, Plus, MessageSquare, Search } from 'lucide-react'

// Devuelve un texto tipo "Activo hace 5 min", "Hace 2h", "Hace 3 días"
function tiempoRelativo(fechaSqlite) {
  if (!fechaSqlite) return 'Sin actividad reciente'

  // SQLite devuelve "YYYY-MM-DD HH:MM:SS" en UTC
  const fecha = new Date(fechaSqlite.replace(' ', 'T') + 'Z')
  const ahora = new Date()
  const diff  = Math.max(0, ahora - fecha)
  const min   = Math.floor(diff / 60000)
  const horas = Math.floor(min / 60)
  const dias  = Math.floor(horas / 24)

  if (min < 2)         return 'Activo ahora'
  if (min < 60)        return `Activo hace ${min} min`
  if (horas < 24)      return `Activo hace ${horas} h`
  if (dias < 7)        return `Activo hace ${dias} ${dias === 1 ? 'día' : 'días'}`
  if (dias < 30)       return `Activo hace ${Math.floor(dias / 7)} sem`
  return 'Inactivo'
}

// "Activo ahora" o "Activo hace 5 min" → considerar conectado (puntito verde)
function estaActivo(fechaSqlite) {
  if (!fechaSqlite) return false
  const fecha = new Date(fechaSqlite.replace(' ', 'T') + 'Z')
  const diff  = Date.now() - fecha.getTime()
  return diff < 5 * 60 * 1000   // 5 minutos
}

export default function Social({ toast }) {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [contactos,   setContactos]   = useState([])
  const [profesores,  setProfesores]  = useState([])
  const [activeChat,  setActiveChat]  = useState(null)
  const [mensajes,    setMensajes]    = useState([])
  const [texto,       setTexto]       = useState('')
  const [addId,       setAddId]       = useState('')
  const [buscar,      setBuscar]      = useState('')
  const [loading,     setLoading]     = useState(true)
  const bottomRef    = useRef(null)
  const activeChatRef = useRef(null)

  useEffect(() => { activeChatRef.current = activeChat }, [activeChat])
  useEffect(() => { cargar() }, [])
  useEffect(() => { if (activeChat) cargarMensajes(activeChat.id) }, [activeChat])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [mensajes])

  useEffect(() => {
    const intervalMensajes = setInterval(() => {
      if (activeChatRef.current) cargarMensajesSilencioso(activeChatRef.current.id)
    }, 3000)
    const intervalContactos = setInterval(() => {
      cargarContactosSilencioso()
    }, 15000)
    return () => {
      clearInterval(intervalMensajes)
      clearInterval(intervalContactos)
    }
  }, [])

  async function cargar() {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([getContactos(), getProfesores()])
      setContactos(c)
      setProfesores(p)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  async function cargarContactosSilencioso() {
    try {
      const data = await getContactos()
      setContactos(data)
      // Refresca también el activeChat para que su "Activo hace X" se actualice
      if (activeChatRef.current) {
        const refreshed = data.find(c => c.id === activeChatRef.current.id)
        if (refreshed) setActiveChat(prev => prev && prev.id === refreshed.id ? { ...prev, ultima_actividad: refreshed.ultima_actividad } : prev)
      }
    } catch (_) {}
  }

  async function cargarMensajes(id) {
    try { setMensajes(await getMensajes(id)) }
    catch (err) { toast(err.message, 'error') }
  }

  async function cargarMensajesSilencioso(id) {
    try {
      const msgs = await getMensajes(id)
      setMensajes(prev => prev.length === msgs.length ? prev : msgs)
    } catch (_) {}
  }

  async function handleAddContacto() {
    if (!addId) return toast('Selecciona un profesor', 'error')
    try {
      await addContacto(Number(addId))
      toast('Contacto añadido', 'success')
      setAddId('')
      cargar()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleEnviar(e) {
    e.preventDefault()
    if (!texto.trim() || !activeChat) return
    try {
      const msg = await enviarMensaje({ para_id: activeChat.id, texto })
      setMensajes(m => [...m, msg])
      setTexto('')
      setContactos(cs => cs.map(c => c.id === activeChat.id ? { ...c, ultimo_mensaje:{ texto, created_at: new Date().toISOString() } } : c))
    } catch (err) { toast(err.message, 'error') }
  }

  const contactIds = new Set(contactos.map(c => c.id))
  const disponibles = profesores.filter(p => !contactIds.has(p.id))
  const contactosFiltrados = contactos.filter(c =>
    `${c.nombre} ${c.apellidos}`.toLowerCase().includes(buscar.toLowerCase())
  )

  if (loading) return <p style={{ color:'var(--text3)' }}>Cargando...</p>

  const mostrarLista = !isMobile || !activeChat
  const mostrarChat  = !isMobile || !!activeChat

  return (
    <div>
      {!isMobile || !activeChat ? (
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight:800, letterSpacing:'-0.5px' }}>Social</h1>
          <p style={{ color:'var(--text3)', fontSize:14, marginTop:2 }}>Mensajes entre profesores</p>
        </div>
      ) : null}

      <div style={{
        display: isMobile ? 'block' : 'grid',
        gridTemplateColumns: isMobile ? undefined : '280px 1fr',
        gap: 20,
        height: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 180px)',
      }}>

        {/* Panel izquierdo: contactos */}
        {mostrarLista && (
          <div className="card" style={{ padding:0, display:'flex', flexDirection:'column', overflow:'hidden', height: isMobile ? '100%' : 'auto' }}>
            <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:15, marginBottom:10 }}>
                <MessageSquare size={16} /> Conversaciones
              </div>
              <div style={{ position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }} />
                <input
                  type="text"
                  placeholder="Buscar profesor..."
                  value={buscar}
                  onChange={e => setBuscar(e.target.value)}
                  style={{ fontSize:13, padding:'8px 12px 8px 32px', borderRadius:20, border:'1.5px solid var(--border)', width:'100%' }}
                />
              </div>
            </div>

            <div style={{ flex:1, overflowY:'auto' }}>
              {contactosFiltrados.length === 0 && (
                <p style={{ padding:20, textAlign:'center', color:'var(--text3)', fontSize:13 }}>Sin contactos aún.</p>
              )}
              {contactosFiltrados.map(c => {
                const activo = estaActivo(c.ultima_actividad)
                return (
                  <div key={c.id} onClick={() => setActiveChat(c)}
                    style={{
                      display:'flex', alignItems:'center', gap:11,
                      padding:'12px 18px', cursor:'pointer',
                      borderBottom:'1px solid rgba(226,232,240,.5)',
                      background: activeChat?.id===c.id ? 'var(--primary-pale)' : 'transparent',
                      transition:'background .15s',
                    }}>
                    <div style={{ position:'relative' }}>
                      <div className="avatar avatar-md" style={{ fontSize:14 }}>
                        {c.foto ? <img src={c.foto} alt="" /> : c.nombre[0]+c.apellidos[0]}
                      </div>
                      {/* Punto verde solo si realmente activo (últimos 5 min) */}
                      {activo && (
                        <div style={{
                          position:'absolute', bottom:0, right:0,
                          width:10, height:10, background:'var(--green)',
                          borderRadius:'50%', border:'2px solid #fff',
                        }}></div>
                      )}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.nombre} {c.apellidos}</div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>{c.asignatura}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ padding:'14px 18px', borderTop:'1px solid var(--border)', background:'var(--surface)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Añadir contacto</div>
              <select value={addId} onChange={e => setAddId(e.target.value)} style={{ fontSize:13, padding:'8px', marginBottom:8, borderRadius:6, border:'1.5px solid var(--border)', width:'100%' }}>
                <option value="">Seleccionar profesor...</option>
                {disponibles.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} ({p.asignatura})</option>
                ))}
              </select>
              <button className="btn btn-primary btn-sm" style={{ width:'100%', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }} onClick={handleAddContacto}>
                <Plus size={14} /> Añadir
              </button>
            </div>
          </div>
        )}

        {/* Panel derecho: chat */}
        {mostrarChat && (
          <div className="card" style={{ padding:0, display:'flex', flexDirection:'column', overflow:'hidden', height: isMobile ? '100%' : 'auto' }}>
            {!activeChat ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'var(--text3)', padding:20, textAlign:'center' }}>
                <MessageSquare size={48} style={{ opacity:.3 }} />
                <p style={{ fontSize:15, fontWeight:500 }}>Selecciona una conversación</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                  {isMobile && (
                    <button onClick={() => setActiveChat(null)} aria-label="Volver" style={{ background:'transparent', border:'none', cursor:'pointer', padding:6, borderRadius:6, color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <ArrowLeft size={20} />
                    </button>
                  )}
                  <div style={{ position:'relative' }}>
                    <div className="avatar avatar-md" style={{ fontSize:14 }}>
                      {activeChat.foto ? <img src={activeChat.foto} alt="" /> : activeChat.nombre[0]+activeChat.apellidos[0]}
                    </div>
                    {estaActivo(activeChat.ultima_actividad) && (
                      <div style={{
                        position:'absolute', bottom:0, right:0,
                        width:10, height:10, background:'var(--green)',
                        borderRadius:'50%', border:'2px solid #fff',
                      }}></div>
                    )}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{activeChat.nombre} {activeChat.apellidos}</div>
                    <div style={{
                      fontSize:12,
                      color: estaActivo(activeChat.ultima_actividad) ? 'var(--green)' : 'var(--text3)',
                    }}>
                      {tiempoRelativo(activeChat.ultima_actividad)} · {activeChat.asignatura}
                    </div>
                  </div>
                </div>

                {/* Mensajes */}
                <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:14, background:'var(--surface)' }}>
                  {mensajes.length === 0 && (
                    <p style={{ textAlign:'center', color:'var(--text3)', fontSize:13, marginTop:20 }}>Aún no hay mensajes. ¡Empieza la conversación!</p>
                  )}
                  {mensajes.map(m => {
                    const isOwn = m.de_id === user.id
                    const hora  = new Date(m.created_at + 'Z').toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})
                    return (
                      <div key={m.id} style={{ display:'flex', gap:10, alignItems:'flex-end', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                        {!isOwn && (
                          <div className="avatar avatar-sm" style={{ fontSize:11, flexShrink:0 }}>
                            {activeChat.nombre[0]+activeChat.apellidos[0]}
                          </div>
                        )}
                        <div style={{ maxWidth:'75%' }}>
                          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3, textAlign: isOwn ? 'right' : 'left', padding:'0 4px' }}>{hora}</div>
                          <div style={{
                            padding:'10px 14px', borderRadius:16, fontSize:14, lineHeight:1.5, wordBreak:'break-word',
                            ...(isOwn
                              ? { background:'linear-gradient(135deg,var(--primary),var(--primary-l))', color:'#fff', borderBottomRightRadius:4 }
                              : { background:'#fff', border:'1px solid var(--border)', color:'var(--text)', borderBottomLeftRadius:4 })
                          }}>
                            {m.texto}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleEnviar} style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center' }}>
                  <input
                    type="text" value={texto} onChange={e => setTexto(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    style={{ flex:1, minWidth:0, padding:'10px 16px', borderRadius:50, background:'var(--bg)', border:'1.5px solid var(--border)' }}
                  />
                  <button type="submit" disabled={!texto.trim()} aria-label="Enviar" style={{
                    width:40, height:40, borderRadius:'50%', border:'none', cursor:'pointer',
                    background:'linear-gradient(135deg,var(--primary),var(--primary-l))',
                    color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all .18s', flexShrink:0, opacity: texto.trim() ? 1 : 0.5,
                  }}>
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}