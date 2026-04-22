const express = require('express')
const bcrypt  = require('bcryptjs')
const crypto  = require('crypto')
const { getDB } = require('../config/database')
const { generarToken, verificarToken } = require('../middleware/auth')
const { enviarEmailVerificacion, enviarEmailResetPassword, enviarEmailNuevoProfesorEnCentro } = require('../utils/email')

const router = express.Router()

// ── GET /api/auth/verificar-centro ───────────────────────
router.get('/verificar-centro', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token requerido' })

  const db     = getDB()
  const centro = db.prepare('SELECT * FROM centros WHERE token_verificacion = ?').get(token)
  if (!centro) return res.status(404).json({ error: 'Token inválido o ya usado' })

  db.prepare('UPDATE centros SET email_verificado = 1, token_verificacion = NULL WHERE id = ?').run(centro.id)
  res.json({ ok: true, mensaje: 'Email verificado correctamente. El equipo de ExRooms revisará tu solicitud en breve.' })
})

// ── POST /api/auth/forgot-password ───────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email requerido' })

  const db      = getDB()
  const profesor = db.prepare('SELECT * FROM profesores WHERE email = ?').get(email)

  // Siempre respondemos igual para no revelar si el email existe
  if (!profesor) return res.json({ ok: true, mensaje: 'Si el email existe recibirás un enlace en breve.' })

  // Borrar tokens anteriores
  db.prepare('DELETE FROM password_resets WHERE profesor_id = ?').run(profesor.id)

  // Crear nuevo token — expira en 1 hora
  const token     = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 3600000).toISOString()
  db.prepare('INSERT INTO password_resets (profesor_id, token, expires_at) VALUES (?, ?, ?)').run(profesor.id, token, expiresAt)

  try {
    await enviarEmailResetPassword({ email: profesor.email, nombre: profesor.nombre, token })
  } catch (err) { console.error('Error enviando email reset:', err.message) }

  res.json({ ok: true, mensaje: 'Si el email existe recibirás un enlace en breve.' })
})

// ── POST /api/auth/reset-password ────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Token y contraseña son obligatorios' })
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })

  const db    = getDB()
  const reset = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').get(token)

  if (!reset) return res.status(400).json({ error: 'Enlace inválido o ya usado' })
  if (new Date(reset.expires_at) < new Date()) return res.status(400).json({ error: 'El enlace ha expirado. Solicita uno nuevo.' })

  const hash = bcrypt.hashSync(password, 10)
  db.prepare('UPDATE profesores SET password = ? WHERE id = ?').run(hash, reset.profesor_id)
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(reset.id)

  res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente.' })
})

// ── GET /api/auth/centros ─────────────────────────────────
// Lista de centros disponibles para el registro de profesores
router.get('/centros', (req, res) => {
  const db = getDB()
  const centros = db.prepare(
    'SELECT id, nombre, codigo, ciudad, provincia FROM centros ORDER BY nombre'
  ).all()
  res.json(centros)
})

// ── POST /api/auth/centro ─────────────────────────────────
// El director registra su centro y su cuenta a la vez
router.post('/centro', async (req, res) => {
  const { centro_nombre, centro_codigo, centro_ciudad, centro_provincia,
          nombre, apellidos, email, password } = req.body

  if (!centro_nombre || !centro_codigo || !nombre || !apellidos || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })
  }

  const db = getDB()

  // Verificar que el código del centro no existe
  const existeCodigo = db.prepare('SELECT id FROM centros WHERE codigo = ?').get(centro_codigo.toUpperCase())
  if (existeCodigo) return res.status(409).json({ error: 'Ya existe un centro con ese código' })

  // Verificar que el email no existe
  const existeEmail = db.prepare('SELECT id FROM profesores WHERE email = ?').get(email)
  if (existeEmail) return res.status(409).json({ error: 'Este correo ya está registrado' })

  // Crear centro — queda pendiente hasta aprobación del superadmin
  const centroResult = db.prepare(
    'INSERT INTO centros (nombre, codigo, ciudad, provincia, plan, aprobado) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(centro_nombre.trim(), centro_codigo.toUpperCase().trim(), centro_ciudad?.trim() || '', centro_provincia?.trim() || '', 'pendiente', 0)

  const centroId = centroResult.lastInsertRowid

  // Crear cuenta director — aprobada pero bloqueada hasta que el centro sea aprobado
  const hash = bcrypt.hashSync(password, 10)
  db.prepare(`
    INSERT INTO profesores (centro_id, nombre, apellidos, email, password, asignatura, rol, aprobado)
    VALUES (?, ?, ?, ?, ?, 'Dirección', 'director', 1)
  `).run(centroId, nombre.trim(), apellidos.trim(), email, hash)

  // No generamos token — el centro queda pendiente
  // Generar token de verificación
  const tokenVerif = crypto.randomBytes(32).toString('hex')
  db.prepare('UPDATE centros SET token_verificacion = ? WHERE id = ?').run(tokenVerif, centroId)

  // Enviar email de verificación
  try {
    await enviarEmailVerificacion({ email, nombre: nombre.trim(), centro_nombre: centro_nombre.trim(), token: tokenVerif })
  } catch (err) {
    console.error('Error enviando email:', err.message)
  }

  res.status(201).json({ pendiente: true, mensaje: 'Solicitud enviada. Revisa tu email para verificar tu cuenta.' })
})

// ── POST /api/auth/registro ───────────────────────────────
router.post('/registro', (req, res) => {
  const { nombre, apellidos, email, password, asignatura, centro_id } = req.body

  if (!nombre || !apellidos || !email || !password || !asignatura || !centro_id) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })
  }

  const db = getDB()

  const centro = db.prepare('SELECT id FROM centros WHERE id = ?').get(centro_id)
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' })

  const existe = db.prepare('SELECT id FROM profesores WHERE email = ?').get(email)
  if (existe) return res.status(409).json({ error: 'Este correo ya está registrado' })

  const hash = bcrypt.hashSync(password, 10)
  db.prepare(`
    INSERT INTO profesores (centro_id, nombre, apellidos, email, password, asignatura, rol, aprobado)
    VALUES (?, ?, ?, ?, ?, ?, 'profesor', 0)
  `).run(centro_id, nombre, apellidos, email, hash, asignatura)

  res.status(201).json({ pendiente: true, mensaje: 'Cuenta creada. Espera a que el director apruebe tu acceso.' })
})

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' })

  const db      = getDB()
  const profesor = db.prepare('SELECT * FROM profesores WHERE email = ?').get(email)
  if (!profesor) return res.status(401).json({ error: 'Credenciales incorrectas' })

  const ok = bcrypt.compareSync(password, profesor.password)
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' })

  if (profesor.aprobado === 0)
    return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por el director.' })
  if (profesor.aprobado === 2)
    return res.status(403).json({ error: 'Tu cuenta ha sido rechazada. Contacta con el director.' })

  // Comprobar que el centro está aprobado (excepto superadmin)
  if (profesor.rol !== 'superadmin' && profesor.centro_id) {
    const centro = db.prepare('SELECT aprobado, plan FROM centros WHERE id = ?').get(profesor.centro_id)
    if (!centro || centro.aprobado === 0)
      return res.status(403).json({ error: 'Tu centro está pendiente de aprobación por el equipo de ExRooms.' })
    if (centro.aprobado === 2)
      return res.status(403).json({ error: 'Tu centro ha sido rechazado. Contacta con el equipo de ExRooms.' })
    if (centro.plan === 'bloqueado')
      return res.status(403).json({ error: 'La suscripción de tu centro ha expirado. Contacta con el equipo de ExRooms.' })
  }

  const token = generarToken(profesor)
  const { password: _, ...safe } = profesor
  res.json({ token, profesor: safe })
})

// ── GET /api/auth/me ──────────────────────────────────────
router.get('/me', verificarToken, (req, res) => {
  const db      = getDB()
  const profesor = db.prepare(`
    SELECT p.id, p.nombre, p.apellidos, p.email, p.asignatura, p.foto,
           p.rol, p.aprobado, p.centro_id, p.created_at,
           c.nombre as centro_nombre, c.codigo as centro_codigo, c.logo as centro_logo
    FROM profesores p
    LEFT JOIN centros c ON c.id = p.centro_id
    WHERE p.id = ?
  `).get(req.profesorId)
  if (!profesor) return res.status(404).json({ error: 'No encontrado' })
  res.json(profesor)
})
// ── GET /api/auth/confirmar-abandono ─────────────────────
// El profe pincha en el link del email y ejecuta el abandono
router.get('/confirmar-abandono', (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token requerido' })

  const db       = getDB()
  const profesor = db.prepare('SELECT * FROM profesores WHERE abandono_token = ?').get(token)
  if (!profesor) return res.status(404).json({ error: 'Token inválido o ya usado' })

  // Director no puede abandonar — extra check de seguridad
  if (profesor.rol === 'director') {
    return res.status(403).json({ error: 'Un director no puede abandonar el centro. Debes transferir antes el rol.' })
  }

  const hoy = new Date().toISOString().split('T')[0]

  // Borrar reservas futuras (las pasadas se quedan como historial)
  db.prepare('DELETE FROM reservas WHERE profesor_id = ? AND fecha >= ?').run(profesor.id, hoy)

  // Borrar guardias propias no cubiertas (las cubiertas por otros se mantienen para el compañero)
  db.prepare('DELETE FROM guardias WHERE profesor_id = ? AND cubierta_por IS NULL').run(profesor.id)

  // Si estaba cubriendo guardias de otros, liberarlas
  db.prepare('UPDATE guardias SET cubierta_por = NULL WHERE cubierta_por = ?').run(profesor.id)

  // Desvincular del centro y limpiar token + estado
  db.prepare(`
    UPDATE profesores
    SET centro_id = NULL,
        abandono_token = NULL,
        abandono_solicitado = 0,
        rol = 'profesor',
        aprobado = 0
    WHERE id = ?
  `).run(profesor.id)

  res.json({ ok: true, mensaje: 'Has abandonado el centro. Inicia sesión y elige tu nuevo centro desde la opción "¿Has cambiado de centro?".' })
})

// ── POST /api/auth/cambiar-centro ────────────────────────
// El profe (sin centro) hace login + elige nuevo centro
router.post('/cambiar-centro', async (req, res) => {
  const { email, password, centro_id } = req.body
  if (!email || !password || !centro_id) {
    return res.status(400).json({ error: 'Email, contraseña y centro son obligatorios' })
  }

  const db       = getDB()
  const profesor = db.prepare('SELECT * FROM profesores WHERE email = ?').get(email)
  if (!profesor) return res.status(401).json({ error: 'Credenciales incorrectas' })

  const ok = bcrypt.compareSync(password, profesor.password)
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' })

  // Solo permitimos cambio si NO tiene centro asignado
  if (profesor.centro_id) {
    return res.status(403).json({ error: 'Ya perteneces a un centro. Primero debes abandonarlo desde tu perfil.' })
  }

  // Verificar centro destino
  const centro = db.prepare('SELECT * FROM centros WHERE id = ?').get(centro_id)
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' })
  if (centro.aprobado !== 1) return res.status(403).json({ error: 'Ese centro no está disponible' })

  // Actualizar: vincular al nuevo centro como pendiente de aprobación
  db.prepare(`
    UPDATE profesores
    SET centro_id = ?,
        aprobado = 0,
        rol = 'profesor'
    WHERE id = ?
  `).run(centro_id, profesor.id)

  // Notificar al director del centro destino
  try {
    const director = db.prepare(`
      SELECT email, nombre FROM profesores
      WHERE centro_id = ? AND rol = 'director' AND aprobado = 1
      LIMIT 1
    `).get(centro_id)

    if (director) {
      await enviarEmailNuevoProfesorEnCentro({
        email: director.email,
        nombre_director: director.nombre,
        nombre_profesor: `${profesor.nombre} ${profesor.apellidos}`,
        centro_nombre: centro.nombre,
      })
    }
  } catch (err) { console.error('Error email nuevo profesor:', err.message) }

  res.json({
    ok: true,
    mensaje: `Solicitud enviada a ${centro.nombre}. El director recibirá un email para aprobarte.`,
  })
})

module.exports = router