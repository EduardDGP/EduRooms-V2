const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

// ── GET /api/notificaciones ───────────────────────────────
// Mis notificaciones de los últimos 7 días
router.get('/', (req, res) => {
  const db = getDB()
  const desde = new Date()
  desde.setDate(desde.getDate() - 7)
  const desdeStr = desde.toISOString().split('T')[0]

  const notifs = db.prepare(`
    SELECT * FROM notificaciones
    WHERE profesor_id = ? AND DATE(created_at) >= ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.profesorId, desdeStr)

  res.json(notifs)
})

// ── GET /api/notificaciones/no-leidas ─────────────────────
router.get('/no-leidas', (req, res) => {
  const db = getDB()
  const n = db.prepare(
    'SELECT COUNT(*) as total FROM notificaciones WHERE profesor_id = ? AND leida = 0'
  ).get(req.profesorId)
  res.json({ total: n.total })
})

// ── PUT /api/notificaciones/leer-todas ───────────────────
router.put('/leer-todas', (req, res) => {
  const db = getDB()
  db.prepare('UPDATE notificaciones SET leida = 1 WHERE profesor_id = ?').run(req.profesorId)
  res.json({ ok: true })
})

// ── POST /api/notificaciones/crear ───────────────────────
// Uso interno: crear notificación para todos los profesores (excepto el que la genera)
router.post('/crear', (req, res) => {
  const { tipo, titulo, mensaje, excluir_id } = req.body
  if (!tipo || !titulo || !mensaje) {
    return res.status(400).json({ error: 'tipo, titulo y mensaje son obligatorios' })
  }
  const db = getDB()

  // Obtener todos los profesores aprobados
  const profesores = db.prepare(
    "SELECT id FROM profesores WHERE aprobado = 1 AND id != ?"
  ).all(excluir_id || req.profesorId)

  const ins = db.prepare(
    'INSERT INTO notificaciones (profesor_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?)'
  )
  const insertAll = db.transaction((profs) => {
    for (const p of profs) ins.run(p.id, tipo, titulo, mensaje)
  })
  insertAll(profesores)

  res.json({ ok: true, enviadas: profesores.length })
})

// ── POST /api/notificaciones/crear-para ──────────────────
// Crear notificación para un profesor específico (mensajes directos)
router.post('/crear-para', (req, res) => {
  const { para_id, tipo, titulo, mensaje } = req.body
  if (!para_id || !tipo || !titulo || !mensaje) {
    return res.status(400).json({ error: 'Faltan campos' })
  }
  const db = getDB()
  db.prepare(
    'INSERT INTO notificaciones (profesor_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?)'
  ).run(para_id, tipo, titulo, mensaje)
  res.json({ ok: true })
})

module.exports = router