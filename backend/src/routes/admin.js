const express = require('express')
const bcrypt  = require('bcryptjs')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const { getDB } = require('../config/database')
const { verificarToken, soloDirector, soloSuperadmin } = require('../middleware/auth')

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

router.use(verificarToken)

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
// El director crea una cuenta de jefe de estudios
router.post('/jefe-estudios', (req, res) => {
  // Solo el director puede crear jefes de estudios
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
// Info del propio centro
router.get('/centro', soloDirector, (req, res) => {
  const db     = getDB()
  const centro = db.prepare('SELECT * FROM centros WHERE id = ?').get(req.centroId)
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' })
  res.json(centro)
})

// ── PUT /api/admin/promover-jefe/:id ─────────────────────
// El director promueve a un profesor a jefe de estudios
router.put('/promover-jefe/:id', (req, res) => {
  if (req.rol !== 'director') return res.status(403).json({ error: 'Solo el director puede promover jefes de estudios' })
  const db   = getDB()
  const prof = db.prepare('SELECT * FROM profesores WHERE id = ? AND centro_id = ? AND rol = ?').get(req.params.id, req.centroId, 'profesor')
  if (!prof) return res.status(404).json({ error: 'Profesor no encontrado' })
  db.prepare('UPDATE profesores SET rol = ? WHERE id = ?').run('jefe_estudios', req.params.id)
  res.json({ ok: true })
})

// ── PUT /api/admin/degradar-profesor/:id ──────────────────
// El director devuelve a jefe de estudios a profesor
router.put('/degradar-profesor/:id', (req, res) => {
  if (req.rol !== 'director') return res.status(403).json({ error: 'Solo el director puede cambiar roles' })
  const db   = getDB()
  const prof = db.prepare('SELECT * FROM profesores WHERE id = ? AND centro_id = ? AND rol = ?').get(req.params.id, req.centroId, 'jefe_estudios')
  if (!prof) return res.status(404).json({ error: 'Jefe de estudios no encontrado' })
  db.prepare('UPDATE profesores SET rol = ? WHERE id = ?').run('profesor', req.params.id)
  res.json({ ok: true })
})

// ── POST /api/admin/centro/logo ───────────────────────────
// El director sube el logo de su centro
router.post('/centro/logo', soloDirector, upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' })

  const db     = getDB()
  const centro = db.prepare('SELECT logo FROM centros WHERE id = ?').get(req.centroId)

  // Borrar logo anterior si existe
  if (centro?.logo) {
    const oldPath = path.join(UPLOADS_DIR, path.basename(centro.logo))
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }

  const logoUrl = `/uploads/${req.file.filename}`
  db.prepare('UPDATE centros SET logo = ? WHERE id = ?').run(logoUrl, req.centroId)
  res.json({ logo: logoUrl })
})

// ── PUT /api/admin/centro ─────────────────────────────────
// El director edita el nombre de su centro
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