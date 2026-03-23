const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

// ── Configuración de Multer ───────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../../uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    // Nombre: foto_<profesorId>_<timestamp>.ext
    cb(null, `foto_${req.profesorId}_${Date.now()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB máximo
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'))
  }
})

// ── POST /api/perfil/foto ─────────────────────────────────
router.post('/foto', upload.single('foto'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' })

  const db = getDB()
  const fotoUrl = `/uploads/${req.file.filename}`

  // Borrar foto anterior si existe
  const prof = db.prepare('SELECT foto FROM profesores WHERE id = ?').get(req.profesorId)
  if (prof?.foto) {
    const oldPath = path.join(UPLOADS_DIR, path.basename(prof.foto))
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }

  db.prepare('UPDATE profesores SET foto = ? WHERE id = ?').run(fotoUrl, req.profesorId)
  res.json({ foto: fotoUrl })
})

// ── GET /api/perfil ───────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDB()
  const prof = db.prepare(
    'SELECT id, nombre, apellidos, email, asignatura, foto, created_at FROM profesores WHERE id = ?'
  ).get(req.profesorId)

  if (!prof) return res.status(404).json({ error: 'Profesor no encontrado' })

  // Añadir conteo de reservas
  const reservas = db.prepare(
    'SELECT COUNT(*) as total FROM reservas WHERE profesor_id = ?'
  ).get(req.profesorId)

  res.json({ ...prof, total_reservas: reservas.total })
})

module.exports = router

// ── PUT /api/perfil ───────────────────────────────────────
// Editar nombre, apellidos, asignatura
router.put('/', (req, res) => {
  const { nombre, apellidos, asignatura } = req.body
  if (!nombre?.trim() || !apellidos?.trim() || !asignatura?.trim()) {
    return res.status(400).json({ error: 'Nombre, apellidos y asignatura son obligatorios' })
  }
  const db = getDB()
  db.prepare('UPDATE profesores SET nombre = ?, apellidos = ?, asignatura = ? WHERE id = ?')
    .run(nombre.trim(), apellidos.trim(), asignatura.trim(), req.profesorId)

  const prof = db.prepare(
    'SELECT id, nombre, apellidos, email, asignatura, foto, rol, aprobado, created_at FROM profesores WHERE id = ?'
  ).get(req.profesorId)
  res.json(prof)
})