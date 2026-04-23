const express = require('express')
const bcrypt  = require('bcryptjs')
const crypto  = require('crypto')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const { getDB } = require('../config/database')
const { verificarToken, soloDirector, soloSuperadmin } = require('../middleware/auth')
const { enviarEmailTraspasoDireccion } = require('../utils/email')

const router = express.Router()
router.use(verificarToken)

// ── Multer para logos de centros ──────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../../uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `logo_centro_${req.centroId}_${Date.now()}${ext}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','image/svg+xml']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Solo imágenes JPG, PNG, WEBP o SVG'))
  }
})

// ── GET /api/admin/pendientes ─────────────────────────────
router.get('/pendientes', soloDirector, (req, res) => {
  const db = getDB()
  const lista = db.prepare(`
    SELECT id, nombre, apellidos, email, asignatura, created_at
    FROM profesores
    WHERE aprobado = 0 AND rol = 'profesor' AND centro_id = ?
    ORDER BY created_at DESC
  `).all(req.centroId)
  res.json(lista)
})

// ── GET /api/admin/profesores ─────────────────────────────
router.get('/profesores', soloDirector, (req, res) => {
  const db = getDB()
  const lista = db.prepare(`
    SELECT id, nombre, apellidos, email, asignatura, rol, aprobado, created_at
    FROM profesores
    WHERE rol IN ('profesor','jefe_estudios') AND centro_id = ?
    ORDER BY aprobado ASC, nombre ASC
  `).all(req.centroId)
  res.json(lista)
})

// ── POST /api/admin/jefe-estudios ─────────────────────────
router.post('/jefe-estudios', (req, res) => {
  if (req.rol !== 'director') return res.status(403).json({ error: 'Solo el director puede crear jefes de estudios' })

  const { nombre, apellidos, email, password, asignatura } = req.body
  if (!nombre || !apellidos || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })
  }

  const db = getDB()
  const existe = db.prepare('SELECT id FROM profesores WHERE email = ?').get(email)
  if (existe) return res.status(409).json({ error: 'Este correo ya está registrado' })

  const hash = bcrypt.hashSync(password, 10)
  db.prepare(`
    INSERT INTO profesores (centro_id, nombre, apellidos, email, password, asignatura, rol, aprobado)
    VALUES (?, ?, ?, ?, ?, ?, 'jefe_estudios', 1)
  `).run(req.centroId, nombre.trim(), apellidos.trim(), email, hash, asignatura?.trim() || 'Jefatura de Estudios')

  res.status(201).json({ ok: true, mensaje: `Cuenta de jefe de estudios creada para ${nombre} ${apellidos}` })
})

// ── PUT /api/admin/aprobar/:id ────────────────────────────
router.put('/aprobar/:id', soloDirector, (req, res) => {
  const db   = getDB()
  const prof = db.prepare('SELECT * FROM profesores WHERE id = ? AND centro_id = ?').get(req.params.id, req.centroId)
  if (!prof) return res.status(404).json({ error: 'Profesor no encontrado' })

  db.prepare('UPDATE profesores SET aprobado = 1 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ── PUT /api/admin/rechazar/:id ───────────────────────────
router.put('/rechazar/:id', soloDirector, (req, res) => {
  const db   = getDB()
  const prof = db.prepare('SELECT * FROM profesores WHERE id = ? AND centro_id = ?').get(req.params.id, req.centroId)
  if (!prof) return res.status(404).json({ error: 'Profesor no encontrado' })

  db.prepare('UPDATE profesores SET aprobado = 2 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ── DELETE /api/admin/profesores/:id ─────────────────────
router.delete('/profesores/:id', soloDirector, (req, res) => {
  const db = getDB()
  db.prepare('DELETE FROM profesores WHERE id = ? AND centro_id = ? AND rol != ?')
    .run(req.params.id, req.centroId, 'director')
  res.json({ ok: true })
})

// ── GET /api/admin/centro ─────────────────────────────────
router.get('/centro', soloDirector, (req, res) => {
  const db     = getDB()
  const centro = db.prepare('SELECT * FROM centros WHERE id = ?').get(req.centroId)
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' })

  // Si hay traspaso pendiente, incluimos los datos del profesor destino
  if (centro.traspaso_destino_id) {
    const destino = db.prepare('SELECT id, nombre, apellidos, email, rol FROM profesores WHERE id = ?').get(centro.traspaso_destino_id)
    centro.traspaso_destino = destino
  }

  res.json(centro)
})

// ── PUT /api/admin/promover-jefe/:id ─────────────────────
router.put('/promover-jefe/:id', (req, res) => {
  if (req.rol !== 'director') return res.status(403).json({ error: 'Solo el director puede promover jefes de estudios' })
  const db   = getDB()
  const prof = db.prepare('SELECT * FROM profesores WHERE id = ? AND centro_id = ? AND rol = ?').get(req.params.id, req.centroId, 'profesor')
  if (!prof) return res.status(404).json({ error: 'Profesor no encontrado' })
  db.prepare('UPDATE profesores SET rol = ? WHERE id = ?').run('jefe_estudios', req.params.id)
  res.json({ ok: true })
})

// ── PUT /api/admin/degradar-profesor/:id ──────────────────
router.put('/degradar-profesor/:id', (req, res) => {
  if (req.rol !== 'director') return res.status(403).json({ error: 'Solo el director puede cambiar roles' })
  const db   = getDB()
  const prof = db.prepare('SELECT * FROM profesores WHERE id = ? AND centro_id = ? AND rol = ?').get(req.params.id, req.centroId, 'jefe_estudios')
  if (!prof) return res.status(404).json({ error: 'Jefe de estudios no encontrado' })
  db.prepare('UPDATE profesores SET rol = ? WHERE id = ?').run('profesor', req.params.id)
  res.json({ ok: true })
})

// ── POST /api/admin/centro/logo ───────────────────────────
router.post('/centro/logo', soloDirector, upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' })

  const db     = getDB()
  const centro = db.prepare('SELECT logo FROM centros WHERE id = ?').get(req.centroId)

  if (centro?.logo) {
    const oldPath = path.join(UPLOADS_DIR, path.basename(centro.logo))
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }

  const logoUrl = `/uploads/${req.file.filename}`
  db.prepare('UPDATE centros SET logo = ? WHERE id = ?').run(logoUrl, req.centroId)
  res.json({ logo: logoUrl })
})

// ── PUT /api/admin/centro ─────────────────────────────────
router.put('/centro', soloDirector, (req, res) => {
  const { nombre, ciudad, provincia } = req.body
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' })

  const db = getDB()
  db.prepare('UPDATE centros SET nombre = ?, ciudad = ?, provincia = ? WHERE id = ?')
    .run(nombre.trim(), ciudad?.trim() || '', provincia?.trim() || '', req.centroId)

  const centro = db.prepare('SELECT * FROM centros WHERE id = ?').get(req.centroId)
  res.json(centro)
})

// ══════════════════════════════════════════════════════════
// TRASPASO DE DIRECCIÓN
// ══════════════════════════════════════════════════════════

// ── GET /api/admin/traspaso ───────────────────────────────
// Ver estado actual del traspaso (si hay pendiente)
router.get('/traspaso', soloDirector, (req, res) => {
  const db     = getDB()
  const centro = db.prepare('SELECT traspaso_token, traspaso_destino_id FROM centros WHERE id = ?').get(req.centroId)

  if (!centro || !centro.traspaso_destino_id) {
    return res.json({ pendiente: false })
  }

  const destino = db.prepare('SELECT id, nombre, apellidos, email, rol FROM profesores WHERE id = ?').get(centro.traspaso_destino_id)

  // Si el destino ya no existe en el centro, auto-limpiar
  if (!destino) {
    db.prepare('UPDATE centros SET traspaso_token = NULL, traspaso_destino_id = NULL WHERE id = ?').run(req.centroId)
    return res.json({ pendiente: false })
  }

  res.json({ pendiente: true, destino })
})

// ── POST /api/admin/traspaso ──────────────────────────────
// Director inicia traspaso a un profesor/jefe
router.post('/traspaso', soloDirector, async (req, res) => {
  const { profesor_id } = req.body
  if (!profesor_id) return res.status(400).json({ error: 'Falta el profesor destino' })

  const db     = getDB()
  const centro = db.prepare('SELECT * FROM centros WHERE id = ?').get(req.centroId)

  // Bloquear si ya hay un traspaso pendiente
  if (centro.traspaso_destino_id) {
    return res.status(409).json({ error: 'Ya hay un traspaso pendiente. Cancélalo antes de iniciar uno nuevo.' })
  }

  // Verificar que el destino es del mismo centro y es profesor/jefe aprobado
  const destino = db.prepare(`
    SELECT * FROM profesores
    WHERE id = ? AND centro_id = ? AND rol IN ('profesor','jefe_estudios') AND aprobado = 1
  `).get(profesor_id, req.centroId)

  if (!destino) {
    return res.status(404).json({ error: 'El profesor destino no es válido (debe ser profesor o jefe de estudios aprobado del mismo centro)' })
  }

  // Director actual (quien hace la solicitud)
  const directorActual = db.prepare('SELECT nombre, apellidos FROM profesores WHERE id = ?').get(req.profesorId)
  const nombreDirectorActual = `${directorActual.nombre} ${directorActual.apellidos}`

  // Generar token y guardar
  const token = crypto.randomBytes(32).toString('hex')
  db.prepare(`
    UPDATE centros
    SET traspaso_token = ?, traspaso_destino_id = ?
    WHERE id = ?
  `).run(token, destino.id, req.centroId)

  // Enviar email al destinatario
  try {
    await enviarEmailTraspasoDireccion({
      email:                   destino.email,
      nombre_destino:          destino.nombre,
      nombre_director_actual:  nombreDirectorActual,
      centro_nombre:           centro.nombre,
      token,
    })
  } catch (err) {
    console.error('Error email traspaso:', err.message)
    // Si falla el email, limpiar el token para que se pueda reintentar
    db.prepare('UPDATE centros SET traspaso_token = NULL, traspaso_destino_id = NULL WHERE id = ?').run(req.centroId)
    return res.status(500).json({ error: 'No se pudo enviar el email. Inténtalo más tarde.' })
  }

  res.json({
    ok: true,
    mensaje: `Se ha enviado un email a ${destino.nombre} ${destino.apellidos}. El traspaso se hará efectivo cuando confirme desde su correo.`,
  })
})

// ── DELETE /api/admin/traspaso ────────────────────────────
// Director cancela traspaso pendiente
router.delete('/traspaso', soloDirector, (req, res) => {
  const db = getDB()
  db.prepare('UPDATE centros SET traspaso_token = NULL, traspaso_destino_id = NULL WHERE id = ?').run(req.centroId)
  res.json({ ok: true, mensaje: 'Traspaso cancelado. El enlace del email ha dejado de funcionar.' })
})

// ══════════════════════════════════════════════════════════
// SUPERADMIN — gestión global de centros
// ══════════════════════════════════════════════════════════

// ── GET /api/admin/superadmin/centros ─────────────────────
router.get('/superadmin/centros', soloSuperadmin, (req, res) => {
  const db = getDB()
  const centros = db.prepare(`
    SELECT c.*, COUNT(p.id) as total_profesores
    FROM centros c
    LEFT JOIN profesores p ON p.centro_id = c.id AND p.rol != 'superadmin'
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all()
  res.json(centros)
})

// ── DELETE /api/admin/superadmin/centros/:id ──────────────
router.delete('/superadmin/centros/:id', soloSuperadmin, (req, res) => {
  const db = getDB()
  db.prepare('DELETE FROM centros WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router