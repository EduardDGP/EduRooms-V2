const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken, soloSuperadmin } = require('../middleware/auth')

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
  const centros_total    = db.prepare("SELECT COUNT(*) as n FROM centros").get().n
  const centros_pendientes = db.prepare("SELECT COUNT(*) as n FROM centros WHERE aprobado = 0").get().n
  const centros_activos  = db.prepare("SELECT COUNT(*) as n FROM centros WHERE aprobado = 1").get().n
  const centros_pruebas  = db.prepare("SELECT COUNT(*) as n FROM centros WHERE plan = 'pruebas'").get().n
  const centros_pago     = db.prepare("SELECT COUNT(*) as n FROM centros WHERE plan = 'activo'").get().n
  const total_profesores = db.prepare("SELECT COUNT(*) as n FROM profesores WHERE rol NOT IN ('superadmin','director')").get().n

  res.json({ centros_total, centros_pendientes, centros_activos, centros_pruebas, centros_pago, total_profesores })
})

// ── PUT /api/superadmin/centros/:id/aprobar ───────────────
router.put('/centros/:id/aprobar', (req, res) => {
  const { plan } = req.body  // 'pruebas' o 'activo'
  if (!['pruebas','activo'].includes(plan))
    return res.status(400).json({ error: 'Plan debe ser "pruebas" o "activo"' })

  const db = getDB()
  const centro = db.prepare('SELECT * FROM centros WHERE id = ?').get(req.params.id)
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' })

  db.prepare('UPDATE centros SET aprobado = 1, plan = ? WHERE id = ?').run(plan, req.params.id)
  res.json({ ok: true, mensaje: `Centro aprobado con plan ${plan}` })
})

// ── PUT /api/superadmin/centros/:id/rechazar ──────────────
router.put('/centros/:id/rechazar', (req, res) => {
  const db = getDB()
  const centro = db.prepare('SELECT * FROM centros WHERE id = ?').get(req.params.id)
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' })

  db.prepare('UPDATE centros SET aprobado = 2, plan = ? WHERE id = ?').run('rechazado', req.params.id)
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