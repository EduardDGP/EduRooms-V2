const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

const UPLOADS_DIR = path.join(__dirname, '../../uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => cb(null, `foto_${req.profesorId}_${Date.now()}${path.extname(file.originalname)}`)
})
const upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  ['image/jpeg','image/png','image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Solo JPG, PNG o WEBP'))
}})

router.get('/', (req, res) => {
  const db   = getDB()
  const prof = db.prepare('SELECT id, centro_id, nombre, apellidos, email, asignatura, foto, rol, created_at FROM profesores WHERE id = ?').get(req.profesorId)
  if (!prof) return res.status(404).json({ error: 'Profesor no encontrado' })
  const reservas = db.prepare('SELECT COUNT(*) as total FROM reservas WHERE profesor_id = ?').get(req.profesorId)
  res.json({ ...prof, total_reservas: reservas.total })
})

router.put('/', (req, res) => {
  const { nombre, apellidos, asignatura } = req.body
  if (!nombre?.trim() || !apellidos?.trim() || !asignatura?.trim())
    return res.status(400).json({ error: 'Nombre, apellidos y asignatura son obligatorios' })
  const db = getDB()
  db.prepare('UPDATE profesores SET nombre = ?, apellidos = ?, asignatura = ? WHERE id = ?').run(nombre.trim(), apellidos.trim(), asignatura.trim(), req.profesorId)
  const prof = db.prepare('SELECT id, centro_id, nombre, apellidos, email, asignatura, foto, rol, aprobado, created_at FROM profesores WHERE id = ?').get(req.profesorId)
  res.json(prof)
})

router.post('/foto', upload.single('foto'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' })
  const db      = getDB()
  const fotoUrl = `/uploads/${req.file.filename}`
  const prof    = db.prepare('SELECT foto FROM profesores WHERE id = ?').get(req.profesorId)
  if (prof?.foto) {
    const oldPath = path.join(UPLOADS_DIR, path.basename(prof.foto))
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }
  db.prepare('UPDATE profesores SET foto = ? WHERE id = ?').run(fotoUrl, req.profesorId)
  res.json({ foto: fotoUrl })
})

module.exports = router

// ── PUT /api/perfil/password ──────────────────────────────
const bcrypt = require('bcryptjs')
router.put('/password', (req, res) => {
  const { password_actual, password_nuevo } = req.body
  if (!password_actual || !password_nuevo)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })
  if (password_nuevo.length < 6)
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })

  const db      = getDB()
  const profesor = db.prepare('SELECT * FROM profesores WHERE id = ?').get(req.profesorId)
  if (!profesor) return res.status(404).json({ error: 'Usuario no encontrado' })

  const ok = bcrypt.compareSync(password_actual, profesor.password)
  if (!ok) return res.status(401).json({ error: 'La contraseña actual es incorrecta' })

  const hash = bcrypt.hashSync(password_nuevo, 10)
  db.prepare('UPDATE profesores SET password = ? WHERE id = ?').run(hash, req.profesorId)
  res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' })
})