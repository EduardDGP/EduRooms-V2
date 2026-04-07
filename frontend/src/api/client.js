const BASE = 'https://edurooms-v2.onrender.com/api'

export const getToken    = () => localStorage.getItem('edu_token')
export const setToken    = (t) => localStorage.setItem('edu_token', t)
export const removeToken = () => localStorage.removeItem('edu_token')

function headers(extra = {}) {
  const token = getToken()
  return { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}), ...extra }
}

async function req(method, url, body) {
  const opts = { method, headers: headers() }
  if (body) opts.body = JSON.stringify(body)
  const res  = await fetch(BASE + url, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error desconocido')
  return data
}

// ── Auth ──────────────────────────────────────────────────
export const login       = (body) => req('POST', '/auth/login',   body)
export const register    = (body) => req('POST', '/auth/registro', body)
export const getMe       = ()     => req('GET',  '/auth/me')
export const getCentros  = ()     => req('GET',  '/auth/centros')

// ── Aulas ─────────────────────────────────────────────────
export const getAulas   = ()     => req('GET',    '/aulas')
export const crearAula  = (body) => req('POST',   '/aulas', body)
export const borrarAula = (id)   => req('DELETE', `/aulas/${id}`)

// ── Reservas ──────────────────────────────────────────────
export const getMisReservas       = ()             => req('GET',    '/reservas')
export const getHistorialReservas = ()             => req('GET',    '/reservas/historial')
export const getReservasAula      = (id, fecha)    => req('GET',    `/reservas/aula/${id}${fecha ? `?fecha=${fecha}` : ''}`)
export const crearReserva         = (body)         => req('POST',   '/reservas', body)
export const cancelarReserva      = (id)           => req('DELETE', `/reservas/${id}`)

// ── Social ────────────────────────────────────────────────
export const getProfesores    = ()           => req('GET',    '/social/profesores')
export const getContactos     = ()           => req('GET',    '/social/contactos')
export const addContacto      = (id)         => req('POST',   '/social/contactos', { contacto_id: id })
export const eliminarContacto = (id)         => req('DELETE', `/social/contactos/${id}`)
export const getMensajes      = (contactoId) => req('GET',    `/social/mensajes/${contactoId}`)
export const enviarMensaje    = (body)       => req('POST',   '/social/mensajes', body)

// ── Perfil ────────────────────────────────────────────────
export const getPerfil    = ()     => req('GET', '/perfil')
export const editarPerfil = (body) => req('PUT', '/perfil', body)

// ── Notificaciones ────────────────────────────────────────
export const getNotificaciones = ()  => req('GET', '/notificaciones')
export const getNoLeidas       = ()  => req('GET', '/notificaciones/no-leidas')
export const leerTodasNotifs   = ()  => req('PUT', '/notificaciones/leer-todas')

// ── Baño ──────────────────────────────────────────────────
export const getSalidasBano  = ()          => req('GET',    '/bano')
export const getHistorialBano= ()          => req('GET',    '/bano/historial')
export const registrarSalida = (body)      => req('POST',   '/bano', body)
export const editarSalida    = (id, body)  => req('PUT',    `/bano/${id}`, body)
export const borrarSalida    = (id)        => req('DELETE', `/bano/${id}`)

// ── Alumnos ───────────────────────────────────────────────
export const getCursos       = ()             => req('GET',    '/alumnos/cursos')
export const getAlumnos      = (curso, grupo) => req('GET',    `/alumnos?curso=${encodeURIComponent(curso)}&grupo=${encodeURIComponent(grupo)}`)
export const importarAlumnos = (body)         => req('POST',   '/alumnos/importar', body)
export const borrarGrupo     = (curso, grupo) => req('DELETE', `/alumnos/grupo?curso=${encodeURIComponent(curso)}&grupo=${encodeURIComponent(grupo)}`)

// ── Guardias ──────────────────────────────────────────────
export const getGuardias       = ()     => req('GET',    '/guardias')
export const getGuardiasHoy    = ()     => req('GET',    '/guardias/hoy')
export const crearGuardia      = (body) => req('POST',   '/guardias', body)
export const cubrirGuardia     = (id)   => req('POST',   `/guardias/${id}/cubrir`)
export const cancelarCobertura = (id)   => req('DELETE', `/guardias/${id}/cubrir`)
export const eliminarGuardia   = (id)   => req('DELETE', `/guardias/${id}`)

export async function subirFoto(file) {
  const form = new FormData()
  form.append('foto', file)
  const res  = await fetch(BASE + '/perfil/foto', { method:'POST', headers:{ Authorization:`Bearer ${getToken()}` }, body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error subiendo foto')
  return data
}