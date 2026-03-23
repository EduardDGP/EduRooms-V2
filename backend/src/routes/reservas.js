const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

// ── GET /api/reservas ─────────────────────────────────────
// Mis reservas (todas, para historial)
router.get('/', (req, res) => {
  const db = getDB()
  const reservas = db.prepare(`
    SELECT r.*, a.nombre as aula_nombre, a.tipo as aula_tipo
    FROM reservas r
    JOIN aulas a ON a.id = r.aula_id
    WHERE r.profesor_id = ?
    ORDER BY r.fecha DESC, r.franja_orden
  `).all(req.profesorId)
  res.json(reservas)
})

// ── GET /api/reservas/aula/:aulaId ────────────────────────
// Todas las reservas de un aula, opcionalmente filtradas por fecha
router.get('/aula/:aulaId', (req, res) => {
  const db = getDB()
  const { fecha } = req.query

  let query = `
    SELECT r.*, p.nombre, p.apellidos, p.asignatura as prof_asignatura
    FROM reservas r
    JOIN profesores p ON p.id = r.profesor_id
    WHERE r.aula_id = ?
  `
  const params = [req.params.aulaId]

  if (fecha) {
    query += ' AND r.fecha = ?'
    params.push(fecha)
  }

  query += ' ORDER BY r.fecha DESC, r.franja_orden'
  res.json(db.prepare(query).all(...params))
})

// ── GET /api/reservas/historial ───────────────────────────
// Historial global de todas las reservas (todos los profesores)
router.get('/historial', (req, res) => {
  const db = getDB()
  const reservas = db.prepare(`
    SELECT r.*, a.nombre as aula_nombre, a.tipo as aula_tipo,
           p.nombre as prof_nombre, p.apellidos as prof_apellidos
    FROM reservas r
    JOIN aulas a ON a.id = r.aula_id
    JOIN profesores p ON p.id = r.profesor_id
    ORDER BY r.fecha DESC, r.franja_orden
    LIMIT 300
  `).all()
  res.json(reservas)
})

// ── POST /api/reservas ────────────────────────────────────
router.post('/', (req, res) => {
  const { aula_id, asignatura, fecha, franja_id, franja_label, franja_orden, hora_inicio, hora_fin } = req.body

  if (!aula_id || !asignatura || !fecha || !franja_id) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })
  }

  // No permitir reservas en fechas pasadas
  const hoy = new Date().toISOString().split('T')[0]
  if (fecha < hoy) {
    return res.status(400).json({ error: 'No puedes reservar en una fecha pasada' })
  }

  const db = getDB()

  const conflicto = db.prepare(`
    SELECT id FROM reservas WHERE aula_id = ? AND fecha = ? AND franja_id = ?
  `).get(aula_id, fecha, franja_id)

  if (conflicto) {
    return res.status(409).json({ error: 'Esta franja ya está reservada en esa fecha' })
  }

  const result = db.prepare(`
    INSERT INTO reservas (aula_id, profesor_id, asignatura, fecha, franja_id, franja_label, franja_orden, hora_inicio, hora_fin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(aula_id, req.profesorId, asignatura, fecha, franja_id, franja_label, franja_orden || 0, hora_inicio, hora_fin)

  const reserva = db.prepare(`
    SELECT r.*, a.nombre as aula_nombre, p.nombre as prof_nombre, p.apellidos as prof_apellidos
    FROM reservas r
    JOIN aulas a ON a.id = r.aula_id
    JOIN profesores p ON p.id = r.profesor_id
    WHERE r.id = ?
  `).get(result.lastInsertRowid)

  // Notificar a todos los profesores excepto al que hizo la reserva
  const fechaLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })
  const profesores = db.prepare("SELECT id FROM profesores WHERE aprobado = 1 AND id != ?").all(req.profesorId)
  const insNotif = db.prepare('INSERT INTO notificaciones (profesor_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?)')
  const notifTx = db.transaction((profs) => {
    for (const p of profs) {
      insNotif.run(p.id, 'reserva',
        `Nueva reserva — ${reserva.aula_nombre}`,
        `${reserva.prof_nombre} ${reserva.prof_apellidos} ha reservado ${reserva.aula_nombre} el ${fechaLabel} (${franja_label})`
      )
    }
  })
  notifTx(profesores)

  res.status(201).json(reserva)
})

// ── DELETE /api/reservas/:id ──────────────────────────────
router.delete('/:id', (req, res) => {
  const db = getDB()
  const reserva = db.prepare('SELECT * FROM reservas WHERE id = ?').get(req.params.id)

  if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' })
  if (reserva.profesor_id !== req.profesorId) {
    return res.status(403).json({ error: 'No puedes cancelar una reserva de otro profesor' })
  }

  db.prepare('DELETE FROM reservas WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router