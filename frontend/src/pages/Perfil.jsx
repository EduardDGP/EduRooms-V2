import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { useConfirm } from '../components/shared/ConfirmDialog'
import { getPerfil, editarPerfil, subirFoto } from '../api/client'
import { Camera, AlertTriangle, LogOut, Mail, CheckCircle2, Clock } from 'lucide-react'

export default function Perfil({ toast }) {
  const { user, refreshUser } = useAuth()
  const isMobile = useIsMobile()
  const confirmar = useConfirm()
  const [perfil,    setPerfil]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [subiendo,  setSubiendo]  = useState(false)
  const [editando,  setEditando]  = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form,      setForm]      = useState({ nombre:'', apellidos:'', asignatura:'' })
  const [enviando,  setEnviando]  = useState(false)
  const [resetOk,   setResetOk]   = useState(false)
  const [abandonando, setAbandonando] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const data = await getPerfil()
      setPerfil(data)
      setForm({ nombre: data.nombre, apellidos: data.apellidos, asignatura: data.asignatura })
    }
    catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  async function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setSubiendo(true)
    try {
      await subirFoto(file)
      await refreshUser()
      await cargar()
      toast('Foto actualizada', 'success')
    } catch (err) { toast(err.message, 'error') }
    finally { setSubiendo(false) }
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      await editarPerfil(form)
      await refreshUser()
      await cargar()
      setEditando(false)
      toast('Perfil actualizado', 'success')
    } catch (err) { toast(err.message, 'error') }
    finally { setGuardando(false) }
  }

  async function handleSolicitarReset() {
    if (!perfil?.email) return
    setEnviando(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email: perfil.email })
      })
      await res.json()
      setResetOk(true)
      toast('Email enviado — revisa tu bandeja de entrada', 'success')
    } catch (err) { toast(err.message, 'error') }
    finally { setEnviando(false) }
  }

  async function handleSolicitarAbandono() {
    const ok = await confirmar({
      title: 'Abandonar este centro',
      message: 'Te enviaremos un email de confirmación. Al confirmar perderás todas tus reservas futuras y guardias pendientes en este centro. Tu cuenta seguirá activa para unirte a otro centro. ¿Continuar?',
      confirmText: 'Enviar email de confirmación',
      cancelText: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return
    setAbandonando(true)
    try {
      const res = await fetch('/api/perfil/solicitar-abandono', {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('edu_token'),
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast(data.mensaje, 'success')
      cargar()
    } catch (err) { toast(err.message, 'error') }
    finally { setAbandonando(false) }
  }

  async function handleCancelarAbandono() {
    const ok = await confirmar({
      title: 'Cancelar solicitud de abandono',
      message: '¿Seguro que quieres cancelar la solicitud? El enlace del email dejará de funcionar.',
      confirmText: 'Sí, cancelar',
      cancelText: 'Volver',
      variant: 'default',
    })
    if (!ok) return
    try {
      const res = await fetch('/api/perfil/cancelar-abandono', {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('edu_token'),
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast(data.mensaje, 'info')
      cargar()
    } catch (err) { toast(err.message, 'error') }
  }

  if (loading || !perfil) return <p style={{ color:'var(--text3)' }}>Cargando perfil...</p>

  const initials = perfil.nombre[0] + perfil.apellidos[0]
  const fecha    = new Date(perfil.created_at).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' })

  // Quién puede abandonar el centro: profesor y jefe de estudios. NO director ni superadmin.
  const puedeAbandonar = ['profesor', 'jefe_estudios'].includes(perfil.rol) && !!perfil.centro_id

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div style={{
        display:'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent:'space-between',
        gap: isMobile ? 12 : 0,
        marginBottom:24,
      }}>
        <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight:800, letterSpacing:'-0.5px' }}>Mi Perfil</h1>
        {!editando && (
          <button className="btn btn-outline btn-sm" onClick={() => setEditando(true)} style={{ flexShrink:0 }}>Editar datos</button>
        )}
      </div>

      {/* Foto + nombre */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{
          display:'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center',
          gap: isMobile ? 16 : 28,
          textAlign: isMobile ? 'center' : 'left',
        }}>
          <div className="avatar avatar-lg" style={{ cursor:'pointer', position:'relative', flexShrink:0 }} onClick={() => fileRef.current?.click()} title="Cambiar foto">
            {perfil.foto ? <img src={perfil.foto} alt="foto" /> : <span style={{ fontSize:36, fontWeight:800 }}>{initials}</span>}
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity .2s', color:'#fff' }}
              onMouseEnter={e => e.currentTarget.style.opacity=1}
              onMouseLeave={e => e.currentTarget.style.opacity=0}>
              <Camera size={20} />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={handleFoto} />
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize: isMobile ? 22 : 26, fontWeight:800, letterSpacing:'-0.5px', wordBreak:'break-word' }}>{perfil.nombre} {perfil.apellidos}</div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'var(--primary-pale)', color:'var(--primary)', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, marginTop:6 }}>
              {perfil.rol === 'director' ? 'Director/a' : perfil.rol === 'jefe_estudios' ? 'Jefe/a de Estudios' : perfil.rol === 'superadmin' ? 'Superadmin' : 'Profesor/a'}
            </div>
            <div style={{ marginTop:10, fontSize:13, color:'var(--text3)', display:'inline-flex', alignItems:'center', gap:6 }}>
              <Camera size={13} /> {subiendo ? 'Subiendo foto...' : 'Haz clic en la foto para cambiarla'}
            </div>
          </div>
        </div>
      </div>

      {/* Info / Edición */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:18, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span>Información de la cuenta</span>
          {editando && <button className="btn btn-outline btn-sm" onClick={() => { setEditando(false); setForm({ nombre:perfil.nombre, apellidos:perfil.apellidos, asignatura:perfil.asignatura }) }}>Cancelar</button>}
        </div>

        {editando ? (
          <form onSubmit={handleGuardar}>
            <div className="form-row" style={ isMobile ? { display:'flex', flexDirection:'column', gap:0 } : undefined }>
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" value={form.nombre} onChange={e => setForm(f => ({...f, nombre:e.target.value}))} required autoFocus />
              </div>
              <div className="form-group">
                <label>Apellidos</label>
                <input type="text" value={form.apellidos} onChange={e => setForm(f => ({...f, apellidos:e.target.value}))} required />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom:24 }}>
              <label>Asignatura</label>
              <input type="text" value={form.asignatura} onChange={e => setForm(f => ({...f, asignatura:e.target.value}))} required />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="submit" className="btn btn-green btn-sm" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:18 }}>
            {[
              { label:'Nombre',             value: perfil.nombre },
              { label:'Apellidos',          value: perfil.apellidos },
              { label:'Correo electrónico', value: perfil.email },
              { label:'Asignatura',         value: perfil.asignatura },
              { label:'Cuenta creada',      value: fecha },
              { label:'Reservas realizadas',value: `${perfil.total_reservas ?? 0} reserva${(perfil.total_reservas ?? 0) !== 1 ? 's' : ''}` },
            ].map(f => (
              <div key={f.label} style={{ minWidth:0 }}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--text3)', marginBottom:6, display:'block' }}>{f.label}</label>
                <div style={{ fontSize:15, fontWeight:500, color:'var(--text)', padding:'10px 12px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:8, wordBreak:'break-word' }}>
                  {f.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cambio de contraseña */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:12, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
          Contraseña
        </div>
        {resetOk ? (
          <div style={{ background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:8, padding:'12px 16px', fontSize:14, color:'#065f46', fontWeight:600, display:'flex', alignItems:'flex-start', gap:8 }}>
            <CheckCircle2 size={16} style={{ flexShrink:0, marginTop:1 }} />
            <span>Te hemos enviado un email a <strong>{perfil.email}</strong> con el enlace para cambiar tu contraseña.</span>
          </div>
        ) : (
          <div style={{
            display:'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent:'space-between',
            gap:12,
          }}>
            <p style={{ fontSize:14, color:'var(--text3)', flex:1 }}>
              Recibirás un email con un enlace seguro para establecer una nueva contraseña.
            </p>
            <button className="btn btn-outline btn-sm" onClick={handleSolicitarReset} disabled={enviando} style={{ flexShrink:0, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Mail size={14} /> {enviando ? 'Enviando...' : 'Cambiar contraseña'}
            </button>
          </div>
        )}
      </div>

      {/* Zona de peligro — solo profe/jefe con centro */}
      {puedeAbandonar && (
        <div className="card" style={{ border:'1.5px solid #fecaca', background:'#fef2f2' }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:12, paddingBottom:12, borderBottom:'1px solid #fecaca', display:'flex', alignItems:'center', gap:8, color:'var(--red)' }}>
            <AlertTriangle size={16} /> Zona de peligro
          </div>

          {perfil.abandono_solicitado ? (
            // Hay solicitud pendiente → email enviado, esperando confirmación
            <div>
              <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'12px 14px', marginBottom:14, fontSize:13, color:'#78350f', display:'flex', gap:8, alignItems:'flex-start' }}>
                <Clock size={16} style={{ flexShrink:0, marginTop:1 }} />
                <span>
                  Has solicitado abandonar el centro. <strong>Revisa tu bandeja de entrada</strong> y haz click en el enlace del email que te hemos enviado a <strong>{perfil.email}</strong> para confirmar.
                </span>
              </div>
              <div style={{
                display:'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                justifyContent:'space-between',
                gap:12,
              }}>
                <p style={{ fontSize:13, color:'var(--text3)', flex:1 }}>
                  ¿Cambias de opinión? Puedes cancelar la solicitud en cualquier momento antes de confirmarla.
                </p>
                <button className="btn btn-outline btn-sm" onClick={handleCancelarAbandono} style={{ flexShrink:0 }}>
                  Cancelar solicitud
                </button>
              </div>
            </div>
          ) : (
            // Sin solicitud → botón para iniciar el proceso
            <div style={{
              display:'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent:'space-between',
              gap:12,
            }}>
              <p style={{ fontSize:13, color:'var(--text2)', flex:1, lineHeight:1.55 }}>
                Si has cambiado de centro educativo, puedes abandonar este y unirte a otro. Se te enviará un email para confirmar la salida — tus reservas futuras y guardias pendientes se borrarán.
              </p>
              <button className="btn btn-danger btn-sm" onClick={handleSolicitarAbandono} disabled={abandonando} style={{ flexShrink:0, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <LogOut size={14} /> {abandonando ? 'Enviando...' : 'Abandonar centro'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}