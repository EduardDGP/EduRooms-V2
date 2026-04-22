import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useToast } from './hooks/useToast'
import Login            from './pages/Login'
import Register         from './pages/Register'
import Layout           from './components/shared/Layout'
import Aulas            from './pages/Aulas'
import Social           from './pages/Social'
import Perfil           from './pages/Perfil'
import Admin            from './pages/Admin'
import Alumnos          from './pages/Alumnos'
import Notificaciones   from './pages/Notificaciones'
import Guardias         from './pages/Guardias'
import Superadmin       from './pages/Superadmin'
import SuperadminLogin  from './pages/SuperadminLogin'
import VerificarCentro  from './pages/VerificarCentro'
import ResetPassword    from './pages/ResetPassword'
import ConfirmarBaja    from './pages/ConfirmarBaja'
import ConfirmarAbandono from './pages/ConfirmarAbandono'
import CambiarCentro    from './pages/CambiarCentro'
import Landing          from './pages/Landing'
import Toast            from './components/shared/Toast'

function RootRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to="/aulas" replace /> : <Navigate to="/bienvenida" replace />
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16, background:'var(--black)' }}>
      <div style={{ width:40, height:40, borderRadius:10, background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#fff' }}>E</div>
      <div style={{ fontSize:14, color:'rgba(255,255,255,.5)' }}>Cargando...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/aulas" replace /> : children
}

function AppInner() {
  const { toasts, showToast } = useToast()
  return (
    <>
      <Routes>
      <Route path="/"                  element={<RootRedirect />} />
      <Route path="/bienvenida"        element={<Landing />} />
      <Route path="/login"             element={<PublicRoute><Login toast={showToast} /></PublicRoute>} />
      <Route path="/registro"          element={<PublicRoute><Register toast={showToast} /></PublicRoute>} />
      <Route path="/cambiar-centro"    element={<PublicRoute><CambiarCentro /></PublicRoute>} />
      <Route path="/confirmar-abandono" element={<ConfirmarAbandono />} />
      <Route path="/superadmin/login"  element={<SuperadminLogin />} />
      <Route path="/superadmin"        element={<Superadmin />} />
      <Route path="/verificar-centro"  element={<VerificarCentro />} />
      <Route path="/reset-password"    element={<ResetPassword />} />
      <Route path="/confirmar-baja"    element={<ConfirmarBaja />} />
      <Route element={<PrivateRoute><Layout toast={showToast} /></PrivateRoute>}>
        <Route path="aulas"          element={<Aulas          toast={showToast} />} />
        <Route path="social"         element={<Social         toast={showToast} />} />
        <Route path="perfil"         element={<Perfil         toast={showToast} />} />
        <Route path="admin"          element={<Admin          toast={showToast} />} />
        <Route path="alumnos"        element={<Alumnos        toast={showToast} />} />
        <Route path="notificaciones" element={<Notificaciones toast={showToast} />} />
        <Route path="guardias"       element={<Guardias       toast={showToast} />} />
      </Route>
      </Routes>
      <Toast toasts={toasts} />
    </>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}