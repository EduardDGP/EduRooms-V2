import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getPerfil, editarPerfil, subirFoto } from '../api/client'
import { Camera, Lock, Mail } from 'lucide-react'

export default function Perfil({ toast }) {
  const { user, refreshUser } = useAuth()
  const [perfil,    setPerfil]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [subiendo,  setSubiendo]  = useState(false)
  const [editando,  setEditando]  = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form,      setForm]      = useState({ nombre:'', apellidos:'', asignatura:'' })
  const [enviando,  setEnviando]  = useState(false)
  const [resetOk,   setResetOk]   = useState(false)
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
      toast('Foto actualizada ', 'success')
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
      toast('Perfil actualizado ✅', 'success')
    } catch (err) { toast(err.message, 'error') }
    finally { setGuardando(false) }
  }

  async function handleSolicitarReset() {
    if (!perfil?.email) return
    setEnviando(true)
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email: perfil.email })
      })
      await res.json()
      setResetOk(true)
      toast('📧 Email enviado — revisa tu bandeja de entrada', 'success')
    } catch (err) { toast(err.message, 'error') }
    finally { setEnviando(false) }
  }

  if (loading || !perfil) return <p style={{ color:'var(--text3)' }}>Cargando perfil...</p>

  const initials = perfil.nombre[0] + perfil.apellidos[0]
  const fecha    = new Date(perfil.created_at).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' })

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px' }}>Mi Perfil</h1>
        {!editando && (
          <button className="btn btn-outline btn-sm" onClick={() => setEditando(true)}>Editar datos</button>
        )}
      </div>

      {/* Foto + nombre */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          <div className="avatar avatar-lg" style={{ cursor:'pointer', position:'relative' }} onClick={() => fileRef.current?.click()} title="Cambiar foto">
            {perfil.foto ? <img src={perfil.foto} alt="foto" /> : <span style={{ fontSize:36, fontWeight:800 }}>{initials}</span>}
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity .2s', fontSize:20 }}
              onMouseEnter={e => e.currentTarget.style.opacity=1}
              onMouseLeave={e => e.currentTarget.style.opacity=0}></div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={handleFoto} />
          <div>
            <div style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px' }}>{perfil.nombre} {perfil.apellidos}</div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'var(--primary-pale)', color:'var(--primary)', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, marginTop:6 }}>
              {perfil.rol === 'director' ? 'Director/a' : perfil.rol === 'jefe_estudios' ? 'Jefe/a de Estudios' : 'Profesor/a'}
            </div>
            <div style={{ marginTop:10, fontSize:13, color:'var(--text3)' }}>
              {subiendo ? 'Subiendo foto...' : 'Haz clic en la foto para cambiarla'}
            </div>
          </div>
        </div>
      </div>

      {/* Info / Edición */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:18, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>Información de la cuenta</span>
          {editando && <button className="btn btn-outline btn-sm" onClick={() => { setEditando(false); setForm({ nombre:perfil.nombre, apellidos:perfil.apellidos, asignatura:perfil.asignatura }) }}>Cancelar</button>}
        </div>

        {editando ? (
          <form onSubmit={handleGuardar}>
            <div className="form-row">
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
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            {[
              { label:'Nombre',             value: perfil.nombre },
              { label:'Apellidos',          value: perfil.apellidos },
              { label:'Correo electrónico', value: perfil.email },
              { label:'Asignatura',         value: perfil.asignatura },
              { label:'Cuenta creada',      value: fecha },
              { label:'Reservas realizadas',value: `${perfil.total_reservas ?? 0} reserva${(perfil.total_reservas ?? 0) !== 1 ? 's' : ''}` },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--text3)', marginBottom:6, display:'block' }}>{f.label}</label>
                <div style={{ fontSize:15, fontWeight:500, color:'var(--text)', padding:'10px 12px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:8 }}>
                  {f.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cambio de contraseña */}
      <div className="card">
        <div style={{ fontWeight:700, fontSize:15, marginBottom:12, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
          Contraseña
        </div>
        {resetOk ? (
          <div style={{ background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:8, padding:'12px 16px', fontSize:14, color:'#065f46', fontWeight:600 }}>
            Te hemos enviado un email a <strong>{perfil.email}</strong> con el enlace para cambiar tu contraseña.
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
            <p style={{ fontSize:14, color:'var(--text3)' }}>
              Recibirás un email con un enlace seguro para establecer una nueva contraseña.
            </p>
            <button className="btn btn-outline btn-sm" onClick={handleSolicitarReset} disabled={enviando} style={{ flexShrink:0 }}>
              {enviando ? 'Enviando...' : 'Cambiar contraseña'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}