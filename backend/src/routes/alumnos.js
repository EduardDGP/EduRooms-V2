const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

router.get('/', (req, res) => {
  const db = getDB()
  const { curso, grupo } = req.query
  let query = 'SELECT * FROM alumnos WHERE centro_id = ?'
  const params = [req.centroId]
  if (curso) { query += ' AND curso = ?'; params.push(curso) }
  if (grupo) { query += ' AND grupo = ?'; params.push(grupo) }
  query += ' ORDER BY apellidos, nombre'
  res.json(db.prepare(query).all(...params))
})

router.get('/cursos', (req, res) => {
  const db = getDB()
  const lista = db.prepare(`
    SELECT curso, grupo, COUNT(*) as total FROM alumnos
    WHERE centro_id = ? GROUP BY curso, grupo ORDER BY curso, grupo
  `).all(req.centroId)
  res.json(lista)
})

router.post('/importar', (req, res) => {
  const { curso, grupo, alumnos } = req.body
  if (!curso || !grupo || !Array.isArray(alumnos) || alumnos.length === 0)
    return res.status(400).json({ error: 'Curso, grupo y lista son obligatorios' })

  const db = getDB()
  db.prepare('DELETE FROM alumnos WHERE curso = ? AND grupo = ? AND centro_id = ?').run(curso, grupo, req.centroId)

  const ins = db.prepare('INSERT INTO alumnos (centro_id, apellidos, nombre, curso, grupo) VALUES (?, ?, ?, ?, ?)')
  const tx  = db.transaction(lista => {
    for (const a of lista) {
      if (a.apellidos?.trim() && a.nombre?.trim()) ins.run(req.centroId, a.apellidos.trim(), a.nombre.trim(), curso, grupo)
    }
  })
  tx(alumnos)

  const total = db.prepare('SELECT COUNT(*) as n FROM alumnos WHERE curso = ? AND grupo = ? AND centro_id = ?').get(curso, grupo, req.centroId)
  res.status(201).json({ ok: true, importados: total.n })
})

router.delete('/grupo', (req, res) => {
  const { curso, grupo } = req.query
  if (!curso || !grupo) return res.status(400).json({ error: 'Curso y grupo requeridos' })
  const db = getDB()
  db.prepare('DELETE FROM alumnos WHERE curso = ? AND grupo = ? AND centro_id = ?').run(curso, grupo, req.centroId)
  res.json({ ok: true })
})

module.exports = router