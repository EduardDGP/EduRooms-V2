import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getContactos, getProfesores, addContacto, getMensajes, enviarMensaje } from '../api/client'

export default function Social({ toast }) {
  const { user } = useAuth()
  const [contactos,   setContactos]   = useState([])
  const [profesores,  setProfesores]  = useState([])
  const [activeChat,  setActiveChat]  = useState(null)  // contacto object
  const [mensajes,    setMensajes]    = useState([])
  const [texto,       setTexto]       = useState('')
  const [addId,       setAddId]       = useState('')
  const [buscar,      setBuscar]      = useState('')
  const [loading,     setLoading]     = useState(true)
  const bottomRef    = useRef(null)
  const activeChatRef = useRef(null)

  // Mantener referencia actualizada del chat activo
  useEffect(() => { activeChatRef.current = activeChat }, [activeChat])

  useEffect(() => { cargar() }, [])
  useEffect(() => { if (activeChat) cargarMensajes(activeChat.id) }, [activeChat])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [mensajes])

  // Polling: mensajes cada 3s, contactos cada 15s
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
      const c = await getContactos()
      setContactos(c)
    } catch (_) {}
  }

  async function cargarMensajes(id) {
    try {
      const msgs = await getMensajes(id)
      setMensajes(msgs)
    } catch (err) { toast(err.message, 'error') }
  }

  async function cargarMensajesSilencioso(id) {
    try {
      const msgs = await getMensajes(id)
      setMensajes(prev => {
        if (prev.length === msgs.length) return prev
        return msgs
      })
    } catch (_) {}
  }

  async function handleAddContacto() {
    if (!addId) return toast('Selecciona un profesor', 'error')
    try {
      await addContacto(Number(addId))
      toast('Contacto añadido ✅', 'success')
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
      // Actualizar último mensaje en contactos
      setContactos(cs => cs.map(c => c.id === activeChat.id ? { ...c, ultimo_mensaje:{ texto, created_at: new Date().toISOString() } } : c))
    } catch (err) { toast(err.message, 'error') }
  }

  // Profesores disponibles para añadir como contacto
  const contactIds = new Set(contactos.map(c => c.id))
  const disponibles = profesores.filter(p => !contactIds.has(p.id))

  const contactosFiltrados = contactos.filter(c =>
    `${c.nombre} ${c.apellidos}`.toLowerCase().includes(buscar.toLowerCase())
  )

  if (loading) return <p style={{ color:'var(--text3)' }}>Cargando...</p>

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:26,fontWeight:800,letterSpacing:'-0.5px' }}>Social</h1>
        <p style={{ color:'var(--text3)',fontSize:14,marginTop:2 }}>Mensajes entre profesores</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, height:'calc(100vh - 180px)' }}>

        {/* Panel izquierdo: contactos */}
        <div className="card" style={{ padding:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontWeight:700,fontSize:15,marginBottom:10 }}>Conversaciones</div>
            <input
              type="text"
              placeholder="Buscar profesor..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              style={{ fontSize:13,padding:'8px 12px',borderRadius:20,border:'1.5px solid var(--border)',width:'100%' }}
            />
          </div>

          {/* Lista de contactos */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {contactosFiltrados.length === 0 && (
              <p style={{ padding:20,textAlign:'center',color:'var(--text3)',fontSize:13 }}>Sin contactos aún.</p>
            )}
            {contactosFiltrados.map(c => (
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
                  <div style={{ position:'absolute',bottom:0,right:0,width:9,height:9,background:'var(--green)',borderRadius:'50%',border:'2px solid #fff' }}></div>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:14,fontWeight:600,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{c.nombre} {c.apellidos}</div>
                  <div style={{ fontSize:12,color:'var(--text3)' }}>{c.asignatura}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Añadir contacto */}
          <div style={{ padding:'14px 18px', borderTop:'1px solid var(--border)', background:'var(--surface)' }}>
            <div style={{ fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8 }}>Añadir contacto</div>
            <select value={addId} onChange={e => setAddId(e.target.value)} style={{ fontSize:13,padding:'8px',marginBottom:8,borderRadius:6,border:'1.5px solid var(--border)',width:'100%' }}>
              <option value="">Seleccionar profesor...</option>
              {disponibles.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} ({p.asignatura})</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" style={{ width:'100%' }} onClick={handleAddContacto}>+ Añadir</button>
          </div>
        </div>

        {/* Panel derecho: chat */}
        <div className="card" style={{ padding:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {!activeChat ? (
            <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,color:'var(--text3)' }}>
              <span style={{ fontSize:52,opacity:.3 }}>💬</span>
              <p style={{ fontSize:15,fontWeight:500 }}>Selecciona una conversación</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12 }}>
                <div className="avatar avatar-md" style={{ fontSize:14 }}>
                  {activeChat.foto ? <img src={activeChat.foto} alt="" /> : activeChat.nombre[0]+activeChat.apellidos[0]}
                </div>
                <div>
                  <div style={{ fontWeight:700,fontSize:15 }}>{activeChat.nombre} {activeChat.apellidos}</div>
                  <div style={{ fontSize:12,color:'var(--green)' }}>● En línea · {activeChat.asignatura}</div>
                </div>
              </div>

              {/* Mensajes */}
              <div style={{ flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:14,background:'var(--surface)' }}>
                {mensajes.length === 0 && (
                  <p style={{ textAlign:'center',color:'var(--text3)',fontSize:13,marginTop:20 }}>Aún no hay mensajes. ¡Empieza la conversación!</p>
                )}
                {mensajes.map(m => {
                  const isOwn = m.de_id === user.id
                  const hora  = new Date(m.created_at + 'Z').toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})
                  return (
                    <div key={m.id} style={{ display:'flex',gap:10,alignItems:'flex-end',flexDirection:isOwn?'row-reverse':'row' }}>
                      {!isOwn && (
                        <div className="avatar avatar-sm" style={{ fontSize:11 }}>
                          {activeChat.nombre[0]+activeChat.apellidos[0]}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize:10,color:'var(--text3)',marginBottom:3,textAlign:isOwn?'right':'left',padding:'0 4px' }}>{hora}</div>
                        <div style={{
                          maxWidth:380,padding:'10px 14px',borderRadius:16,fontSize:14,lineHeight:1.5,
                          ...(isOwn
                            ? { background:'linear-gradient(135deg,var(--primary),var(--primary-l))',color:'#fff',borderBottomRightRadius:4 }
                            : { background:'#fff',border:'1px solid var(--border)',color:'var(--text)',borderBottomLeftRadius:4 })
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
              <form onSubmit={handleEnviar} style={{ padding:'14px 20px',borderTop:'1px solid var(--border)',display:'flex',gap:10,alignItems:'center' }}>
                <input
                  type="text" value={texto} onChange={e => setTexto(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  style={{ flex:1,padding:'10px 16px',borderRadius:50,background:'var(--bg)',border:'1.5px solid var(--border)' }}
                />
                <button type="submit" disabled={!texto.trim()} style={{
                  width:40,height:40,borderRadius:'50%',border:'none',cursor:'pointer',
                  background:'linear-gradient(135deg,var(--primary),var(--primary-l))',
                  color:'#fff',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',
                  transition:'all .18s', flexShrink:0,
                }}>➤</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}