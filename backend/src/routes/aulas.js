const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

// ── GET /api/aulas ────────────────────────────────────────
router.get('/', (req, res) => {
  const db   = getDB()
  const hoy  = new Date().toISOString().split('T')[0]
  const hora = new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit', hour12:false })

  const aulas = db.prepare(`
    SELECT a.*,
      (SELECT r.id FROM reservas r
       WHERE r.aula_id = a.id AND r.fecha = ? AND r.hora_inicio <= ? AND r.hora_fin > ?
       LIMIT 1) as reserva_id
    FROM aulas a
    WHERE a.centro_id = ?
    ORDER BY a.nombre
  `).all(hoy, hora, hora, req.centroId)

  const result = aulas.map(a => {
    if (!a.reserva_id) return { ...a, reserva: null }
    const reserva = db.prepare(`
      SELECT r.*, p.nombre, p.apellidos
      FROM reservas r JOIN profesores p ON p.id = r.profesor_id
      WHERE r.id = ?
    `).get(a.reserva_id)
    return { ...a, reserva }
  })

  res.json(result)
})

// ── POST /api/aulas ───────────────────────────────────────
router.post('/', (req, res) => {
  const { nombre, tipo, capacidad } = req.body
  if (!nombre || !tipo) return res.status(400).json({ error: 'Nombre y tipo son obligatorios' })

  const db = getDB()
  const result = db.prepare(
    'INSERT INTO aulas (centro_id, nombre, tipo, capacidad) VALUES (?, ?, ?, ?)'
  ).run(req.centroId, nombre, tipo, capacidad || 30)

  const aula = db.prepare('SELECT * FROM aulas WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(aula)
})

// ── DELETE /api/aulas/:id ─────────────────────────────────
router.delete('/:id', (req, res) => {
  const db   = getDB()
  const aula = db.prepare('SELECT * FROM aulas WHERE id = ? AND centro_id = ?').get(req.params.id, req.centroId)
  if (!aula) return res.status(404).json({ error: 'Aula no encontrada' })

  db.prepare('DELETE FROM aulas WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router