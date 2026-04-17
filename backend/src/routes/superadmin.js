const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken, soloSuperadmin } = require('../middleware/auth')
const { enviarEmailAprobacion, enviarEmailRechazo } = require('../utils/email')

const router = express.Router()
router.use(verificarToken, soloSuperadmin)

// ── GET /api/superadmin/centros ───────────────────────────
// Todos los centros con sus estadísticas
router.get('/centros', (req, res) => {
  const db = getDB()
  const centros = db.prepare(`
    SELECT c.*,
           COUNT(DISTINCT p.id) as total_profesores,
           p_dir.nombre as director_nombre,
           p_dir.apellidos as director_apellidos,
           p_dir.email as director_email
    FROM centros c
    LEFT JOIN profesores p ON p.centro_id = c.id AND p.rol != 'superadmin'
    LEFT JOIN profesores p_dir ON p_dir.centro_id = c.id AND p_dir.rol = 'director'
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all()
  res.json(centros)
})

// ── GET /api/superadmin/stats ─────────────────────────────
router.get('/stats', (req, res) => {
  const db = getDB()
  const centros_total      = db.prepare("SELECT COUNT(*) as n FROM centros").get().n
  const centros_pendientes = db.prepare("SELECT COUNT(*) as n FROM centros WHERE aprobado = 0").get().n
  const centros_activos    = db.prepare("SELECT COUNT(*) as n FROM centros WHERE aprobado = 1").get().n
  const centros_pruebas    = db.prepare("SELECT COUNT(*) as n FROM centros WHERE plan = 'pruebas'").get().n
  const centros_pago       = db.prepare("SELECT COUNT(*) as n FROM centros WHERE plan = 'activo'").get().n
  const total_profesores   = db.prepare("SELECT COUNT(*) as n FROM profesores WHERE rol NOT IN ('superadmin','director')").get().n
  const total_reservas     = db.prepare("SELECT COUNT(*) as n FROM reservas").get().n
  const total_guardias     = db.prepare("SELECT COUNT(*) as n FROM guardias").get().n
  const total_mensajes     = db.prepare("SELECT COUNT(*) as n FROM mensajes").get().n

  res.json({ centros_total, centros_pendientes, centros_activos, centros_pruebas, centros_pago, total_profesores, total_reservas, total_guardias, total_mensajes })
})

// ── GET /api/superadmin/actividad ─────────────────────────
router.get('/actividad', (req, res) => {
  const db = getDB()

  const ultimas_reservas = db.prepare(`
    SELECT r.created_at, r.asignatura, r.fecha, r.franja_label,
           a.nombre as aula_nombre, c.nombre as centro_nombre,
           p.nombre as prof_nombre, p.apellidos as prof_apellidos
    FROM reservas r
    JOIN aulas a ON a.id = r.aula_id
    JOIN centros c ON c.id = r.centro_id
    JOIN profesores p ON p.id = r.profesor_id
    ORDER BY r.created_at DESC LIMIT 10
  `).all()

  const ultimas_guardias = db.prepare(`
    SELECT g.created_at, g.fecha, g.franja_label, g.curso, g.grupo,
           c.nombre as centro_nombre,
           p.nombre as prof_nombre, p.apellidos as prof_apellidos
    FROM guardias g
    JOIN centros c ON c.id = g.centro_id
    JOIN profesores p ON p.id = g.profesor_id
    ORDER BY g.created_at DESC LIMIT 10
  `).all()

  const ultimos_mensajes = db.prepare(`
    SELECT m.created_at, m.texto,
           p1.nombre as de_nombre, p1.apellidos as de_apellidos,
           p2.nombre as para_nombre, p2.apellidos as para_apellidos,
           c.nombre as centro_nombre
    FROM mensajes m
    JOIN profesores p1 ON p1.id = m.de_id
    JOIN profesores p2 ON p2.id = m.para_id
    LEFT JOIN centros c ON c.id = p1.centro_id
    ORDER BY m.created_at DESC LIMIT 10
  `).all()

  const ultimos_accesos = db.prepare(`
    SELECT p.nombre, p.apellidos, p.email, p.rol,
           c.nombre as centro_nombre, p.created_at
    FROM profesores p
    LEFT JOIN centros c ON c.id = p.centro_id
    WHERE p.rol = 'director'
    ORDER BY p.created_at DESC LIMIT 10
  `).all()

  const stats_por_centro = db.prepare(`
    SELECT c.nombre, c.plan, c.aprobado,
           COUNT(DISTINCT p.id) as profesores,
           COUNT(DISTINCT r.id) as reservas,
           COUNT(DISTINCT g.id) as guardias
    FROM centros c
    LEFT JOIN profesores p ON p.centro_id = c.id AND p.rol NOT IN ('superadmin','director')
    LEFT JOIN reservas r ON r.centro_id = c.id
    LEFT JOIN guardias g ON g.centro_id = c.id
    WHERE c.aprobado = 1
    GROUP BY c.id
    ORDER BY reservas DESC
  `).all()

  res.json({ ultimas_reservas, ultimas_guardias, ultimos_mensajes, ultimos_accesos, stats_por_centro })
})

// ── PUT /api/superadmin/centros/:id/aprobar ───────────────
router.put('/centros/:id/aprobar', async (req, res) => {
  const { plan } = req.body  // 'pruebas' o 'activo'
  if (!['pruebas','activo'].includes(plan))
    return res.status(400).json({ error: 'Plan debe ser "pruebas" o "activo"' })

  const db = getDB()
  const centro = db.prepare('SELECT * FROM centros WHERE id = ?').get(req.params.id)
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' })

  db.prepare('UPDATE centros SET aprobado = 1, plan = ? WHERE id = ?').run(plan, req.params.id)

  // Enviar email al director
  const director = db.prepare("SELECT nombre, apellidos, email FROM profesores WHERE centro_id = ? AND rol = 'director'").get(req.params.id)
  if (director) {
    try {
      await enviarEmailAprobacion({ email: director.email, nombre: director.nombre, centro_nombre: centro.nombre, plan })
    } catch (err) { console.error('Error email aprobación:', err.message) }
  }

  res.json({ ok: true, mensaje: `Centro aprobado con plan ${plan}` })
})

// ── PUT /api/superadmin/centros/:id/rechazar ──────────────
router.put('/centros/:id/rechazar', async (req, res) => {
  const db = getDB()
  const centro = db.prepare('SELECT * FROM centros WHERE id = ?').get(req.params.id)
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' })

  db.prepare('UPDATE centros SET aprobado = 2, plan = ? WHERE id = ?').run('rechazado', req.params.id)

  // Enviar email al director
  const director = db.prepare("SELECT nombre, apellidos, email FROM profesores WHERE centro_id = ? AND rol = 'director'").get(req.params.id)
  if (director) {
    try {
      await enviarEmailRechazo({ email: director.email, nombre: director.nombre, centro_nombre: centro.nombre })
    } catch (err) { console.error('Error email rechazo:', err.message) }
  }

  res.json({ ok: true })
})

// ── PUT /api/superadmin/centros/:id/bloquear ─────────────
router.put('/centros/:id/bloquear', (req, res) => {
  const db = getDB()
  db.prepare('UPDATE centros SET plan = ? WHERE id = ?').run('bloqueado', req.params.id)
  res.json({ ok: true })
})

// ── DELETE /api/superadmin/centros/:id ───────────────────
router.delete('/centros/:id', (req, res) => {
  const db = getDB()
  db.prepare('DELETE FROM centros WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router