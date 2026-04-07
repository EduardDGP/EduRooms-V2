const Database = require('better-sqlite3')
const path     = require('path')
const bcrypt   = require('bcryptjs')

const DB_PATH = process.env.NODE_ENV === 'production' 
  ? '/tmp/edurooms.db' 
  : path.join(__dirname, 'edurooms.db')
let db

function getDB() {
  if (!db) db = new Database(DB_PATH)
  return db
}

function initDB() {
  const db = getDB()
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // ── Tabla: centros ────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS centros (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT    NOT NULL,
      codigo      TEXT    NOT NULL UNIQUE,
      ciudad      TEXT    NOT NULL DEFAULT '',
      provincia   TEXT    NOT NULL DEFAULT '',
      logo        TEXT    DEFAULT NULL,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)

  // ── Tabla: profesores ─────────────────────────────────
  // rol: 'superadmin' | 'director' | 'jefe_estudios' | 'profesor'
  // aprobado: 0 = pendiente, 1 = aprobado, 2 = rechazado
  db.exec(`
    CREATE TABLE IF NOT EXISTS profesores (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id   INTEGER REFERENCES centros(id) ON DELETE CASCADE,
      nombre      TEXT    NOT NULL,
      apellidos   TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      asignatura  TEXT    NOT NULL DEFAULT '',
      foto        TEXT    DEFAULT NULL,
      rol         TEXT    NOT NULL DEFAULT 'profesor',
      aprobado    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)

  // ── Tabla: aulas ──────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS aulas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id   INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
      nombre      TEXT    NOT NULL,
      tipo        TEXT    NOT NULL,
      capacidad   INTEGER NOT NULL DEFAULT 30,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)

  // ── Tabla: reservas ───────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservas (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id    INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
      aula_id      INTEGER NOT NULL REFERENCES aulas(id)      ON DELETE CASCADE,
      profesor_id  INTEGER NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
      asignatura   TEXT    NOT NULL,
      fecha        TEXT    NOT NULL,
      franja_id    TEXT    NOT NULL DEFAULT '',
      franja_label TEXT    NOT NULL DEFAULT '',
      franja_orden INTEGER NOT NULL DEFAULT 0,
      hora_inicio  TEXT    NOT NULL DEFAULT '',
      hora_fin     TEXT    NOT NULL DEFAULT '',
      created_at   TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)

  // ── Tabla: contactos ──────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS contactos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      profesor_id  INTEGER NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
      contacto_id  INTEGER NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
      UNIQUE(profesor_id, contacto_id)
    )
  `)

  // ── Tabla: mensajes ───────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS mensajes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      de_id       INTEGER NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
      para_id     INTEGER NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
      texto       TEXT    NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)

  // ── Tabla: salidas_bano ───────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS salidas_bano (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id      INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
      profesor_id    INTEGER NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
      alumno_nombre  TEXT    NOT NULL,
      alumno_curso   TEXT    NOT NULL,
      fecha          TEXT    NOT NULL,
      hora           TEXT    NOT NULL,
      created_at     TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)

  // ── Tabla: alumnos ───────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS alumnos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id   INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
      apellidos   TEXT    NOT NULL,
      nombre      TEXT    NOT NULL,
      curso       TEXT    NOT NULL,
      grupo       TEXT    NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)

  // ── Tabla: guardias ──────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS guardias (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id     INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
      profesor_id   INTEGER NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
      fecha         TEXT    NOT NULL,
      franja_id     TEXT    NOT NULL,
      franja_label  TEXT    NOT NULL,
      franja_orden  INTEGER NOT NULL DEFAULT 0,
      hora_inicio   TEXT    NOT NULL DEFAULT '',
      hora_fin      TEXT    NOT NULL DEFAULT '',
      curso         TEXT    NOT NULL,
      grupo         TEXT    NOT NULL,
      aula          TEXT    NOT NULL,
      instrucciones TEXT    NOT NULL DEFAULT '',
      cubierta_por  INTEGER REFERENCES profesores(id) ON DELETE SET NULL,
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)

  // ── Tabla: notificaciones ────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS notificaciones (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      centro_id   INTEGER REFERENCES centros(id) ON DELETE CASCADE,
      profesor_id INTEGER NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
      tipo        TEXT    NOT NULL,
      titulo      TEXT    NOT NULL,
      mensaje     TEXT    NOT NULL,
      leida       INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    )
  `)

  // ── Seed: superadmin ─────────────────────────────────
  const superadmin = db.prepare("SELECT id FROM profesores WHERE rol = 'superadmin'").get()
  if (!superadmin) {
    const hash = bcrypt.hashSync('superadmin1234', 10)
    db.prepare(`
      INSERT INTO profesores (centro_id, nombre, apellidos, email, password, asignatura, rol, aprobado)
      VALUES (NULL, 'Super', 'Admin', 'admin@edurooms.es', ?, 'Sistema', 'superadmin', 1)
    `).run(hash)
    console.log('✅  Superadmin creado — admin@edurooms.es / superadmin1234')
  }

  console.log('✅  Base de datos lista en', DB_PATH)
}

module.exports = { getDB, initDB }