import { createContext, useContext, useState, useCallback } from 'react'
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react'

// ─── Contexto ─────────────────────────────────────────
const ConfirmContext = createContext(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return ctx
}

// ─── Provider ─────────────────────────────────────────
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  // state: { title, message, confirmText, cancelText, variant, resolve }

  const confirm = useCallback((opts) => {
    return new Promise(resolve => {
      setState({
        title:       opts.title       || 'Confirmar',
        message:     opts.message     || '¿Estás seguro?',
        confirmText: opts.confirmText || 'Confirmar',
        cancelText:  opts.cancelText  || 'Cancelar',
        variant:     opts.variant     || 'default', // 'default' | 'danger' | 'success'
        resolve,
      })
    })
  }, [])

  const close = (result) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && <ConfirmDialog {...state} onConfirm={() => close(true)} onCancel={() => close(false)} />}
    </ConfirmContext.Provider>
  )
}

// ─── Componente visual ────────────────────────────────
function ConfirmDialog({ title, message, confirmText, cancelText, variant, onConfirm, onCancel }) {
  // Colores e iconos por variante
  const styles = {
    default: { icon: <Info size={22} />,          color:'var(--primary)', bg:'var(--primary-pale)', btn:'btn-primary' },
    danger:  { icon: <AlertTriangle size={22} />, color:'var(--red)',     bg:'var(--red-pale)',     btn:'btn-danger'  },
    success: { icon: <CheckCircle2 size={22} />,  color:'var(--green)',   bg:'var(--green-pale)',   btn:'btn-success' },
  }[variant] || { icon: <Info size={22} />, color:'var(--primary)', bg:'var(--primary-pale)', btn:'btn-primary' }

  return (
    <div
      onClick={onCancel}
      style={{
        position:'fixed', inset:0, zIndex:2000,
        background:'rgba(0,0,0,.55)', backdropFilter:'blur(3px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:16, animation:'fadeIn .15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        style={{
          background:'#fff', borderRadius:14, maxWidth:420, width:'100%',
          boxShadow:'0 20px 60px rgba(0,0,0,.3)',
          overflow:'hidden', animation:'popIn .18s ease',
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'22px 22px 14px' }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:styles.bg, color:styles.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {styles.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)', margin:0, marginBottom:4 }}>{title}</h3>
            <p style={{ fontSize:14, color:'var(--text2)', margin:0, lineHeight:1.45 }}>{message}</p>
          </div>
          <button onClick={onCancel} aria-label="Cerrar" style={{
            width:28, height:28, border:'none', background:'transparent',
            color:'var(--text3)', cursor:'pointer', borderRadius:6,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', padding:'12px 22px 20px' }}>
          <button className="btn btn-outline btn-sm" onClick={onCancel}>{cancelText}</button>
          <button className={`btn ${styles.btn} btn-sm`} onClick={onConfirm} autoFocus>{confirmText}</button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes popIn  { from { opacity:0; transform:scale(.94) } to { opacity:1; transform:scale(1) } }
      `}</style>
    </div>
  )
}