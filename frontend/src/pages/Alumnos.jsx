import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { getCursos, getAlumnos, importarAlumnos, borrarGrupo } from '../api/client'

const CURSOS_ORDEN = ['1º ESO','2º ESO','3º ESO','4º ESO','1º Bach','2º Bach','FP Básica','CFGM','CFGS']

// ── Parser usando xlsx ────────────────────────────────────
// Lee la hoja tal como aparece visualmente
// Columna 0: Apellidos, Nombre  (ej: "Álvarez Litón, Pablo")
// Columna 1: Grupo              (ej: "1º ESO C")
function parsearRayuela(buffer) {
  const wb   = XLSX.read(buffer, { type: 'array' })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const agrupado = {}

  for (const row of rows) {
    const col0 = String(row[0] || '').trim()
    const col1 = String(row[1] || '').trim()

    // La fila de alumno tiene "Apellidos, Nombre" en col0
    // y el grupo "Xº ESO Y" en col1
    if (!col0.includes(',')) continue

    // Extraer letra del grupo desde col1: "1º ESO C" → "C"
    const grupoMatch = col1.match(/([A-Z])\s*$/)
    if (!grupoMatch) continue

    const grupo     = grupoMatch[1].toUpperCase()
    const partes    = col0.split(',')
    const apellidos = partes[0].trim()
    const nombre    = partes.slice(1).join(',').trim()

    if (!apellidos || !nombre) continue
    if (!agrupado[grupo]) agrupado[grupo] = []
    agrupado[grupo].push({ apellidos, nombre })
  }

  return agrupado
}

export default function Alumnos({ toast }) {
  const [cursos,      setCursos]      = useState([])
  const [selCurso,    setSelCurso]    = useState(null)
  const [selGrupo,    setSelGrupo]    = useState(null)
  const [alumnos,     setAlumnos]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [loadingList, setLoadingList] = useState(false)
  const [showImport,  setShowImport]  = useState(false)
  const [impCurso,    setImpCurso]    = useState('')
  const [resumen,     setResumen]     = useState({})
  const [importando,  setImportando]  = useState(false)
  const fileRef = useRef()

  useEffect(() => { cargarCursos() }, [])
  useEffect(() => { if (selCurso && selGrupo) cargarAlumnos() }, [selCurso, selGrupo])

  async function cargarCursos() {
    setLoading(true)
    try { setCursos(await getCursos()) }
    catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  async function cargarAlumnos() {
    setLoadingList(true)
    try { setAlumnos(await getAlumnos(selCurso, selGrupo)) }
    catch (err) { toast(err.message, 'error') }
    finally { setLoadingList(false) }
  }

  const cursosAgrupados = cursos.reduce((acc, c) => {
    if (!acc[c.curso]) acc[c.curso] = []
    acc[c.curso].push(c)
    return acc
  }, {})

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const buffer = await file.arrayBuffer()
      const grupos = parsearRayuela(buffer)
      const total  = Object.values(grupos).reduce((s, a) => s + a.length, 0)

      if (total === 0) {
        toast('No se detectaron alumnos. ¿Es el archivo exportado de Rayuela?', 'error')
        return
      }

      setResumen(grupos)
      toast(`✅ ${total} alumnos detectados en grupos: ${Object.keys(grupos).sort().join(', ')}`, 'success')
    } catch (err) {
      toast('Error al leer el archivo: ' + err.message, 'error')
    }
  }

  async function handleImportar(e) {
    e.preventDefault()
    if (!impCurso) { toast('Elige el curso', 'error'); return }
    if (Object.keys(resumen).length === 0) { toast('Carga un Excel primero', 'error'); return }
    setImportando(true)
    try {
      for (const [grupo, alums] of Object.entries(resumen)) {
        await importarAlumnos({ curso: impCurso, grupo, alumnos: alums })
      }
      const total  = Object.values(resumen).reduce((s, a) => s + a.length, 0)
      const grupos = Object.keys(resumen).sort().join(', ')
      toast(`✅ ${total} alumnos importados en ${impCurso} — Grupos: ${grupos}`, 'success')
      setShowImport(false); setResumen({}); setImpCurso('')
      if (fileRef.current) fileRef.current.value = ''
      cargarCursos()
    } catch (err) { toast(err.message, 'error') }
    finally { setImportando(false) }
  }

  async function handleBorrarGrupo(curso, grupo) {
    if (!confirm(`¿Eliminar todos los alumnos de ${curso} ${grupo}?`)) return
    try {
      await borrarGrupo(curso, grupo)
      toast(`Grupo ${curso} ${grupo} eliminado`, 'info')
      if (selCurso === curso && selGrupo === grupo) { setSelCurso(null); setSelGrupo(null); setAlumnos([]) }
      cargarCursos()
    } catch (err) { toast(err.message, 'error') }
  }

  const totalAlumnos = Object.values(resumen).reduce((s, a) => s + a.length, 0)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px' }}>Alumnos</h1>
          <p style={{ color:'var(--text3)', fontSize:14, marginTop:2 }}>Gestiona los listados por curso y grupo</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowImport(true)}>📥 Importar Excel</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20 }}>
        <div className="card" style={{ padding:16, alignSelf:'start' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:12 }}>Cursos y grupos</div>
          {loading ? <p style={{ color:'var(--text3)', fontSize:13 }}>Cargando...</p>
          : cursos.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text3)' }}>
              <div style={{ fontSize:32, opacity:.3, marginBottom:8 }}>📚</div>
              <p style={{ fontSize:13 }}>No hay alumnos.<br/>Importa un Excel.</p>
            </div>
          ) : Object.entries(cursosAgrupados)
              .sort(([a],[b]) => { const ia=CURSOS_ORDEN.indexOf(a),ib=CURSOS_ORDEN.indexOf(b); return (ia===-1?99:ia)-(ib===-1?99:ib) })
              .map(([curso, grupos]) => (
            <div key={curso} style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:6, padding:'4px 8px', background:'var(--bg)', borderRadius:6 }}>{curso}</div>
              {grupos.sort((a,b)=>a.grupo.localeCompare(b.grupo)).map(g => (
                <div key={g.grupo} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:8, marginBottom:3, cursor:'pointer', background: selCurso===curso&&selGrupo===g.grupo?'var(--primary-pale)':'transparent', border:'1.5px solid', borderColor: selCurso===curso&&selGrupo===g.grupo?'var(--primary-l)':'transparent', transition:'all .15s' }}
                  onClick={() => { setSelCurso(curso); setSelGrupo(g.grupo) }}>
                  <div>
                    <span style={{ fontWeight:700, fontSize:14, color: selCurso===curso&&selGrupo===g.grupo?'var(--primary)':'var(--text)' }}>Grupo {g.grupo}</span>
                    <span style={{ fontSize:12, color:'var(--text3)', marginLeft:8 }}>{g.total} alumnos</span>
                  </div>
                  <button onClick={e=>{e.stopPropagation();handleBorrarGrupo(curso,g.grupo)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--text3)', padding:3, borderRadius:4, opacity:.5 }}
                    onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='.5'}>🗑️</button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="card">
          {!selCurso ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
              <div style={{ fontSize:48, opacity:.2, marginBottom:12 }}>👥</div>
              <p style={{ fontSize:15, fontWeight:600 }}>Selecciona un grupo</p>
              <p style={{ fontSize:13, marginTop:6 }}>Haz clic en un grupo de la izquierda.</p>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>
                <div>
                  <h2 style={{ fontSize:18, fontWeight:800 }}>{selCurso} — Grupo {selGrupo}</h2>
                  <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>{alumnos.length} alumnos</p>
                </div>
              </div>
              {loadingList ? <p style={{ color:'var(--text3)' }}>Cargando...</p> : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:8 }}>
                  {alumnos.map(a => (
                    <div key={a.id} style={{ padding:'10px 14px', borderRadius:8, background:'var(--surface)', border:'1.5px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--primary-pale)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>
                        {a.nombre[0]}{a.apellidos[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{a.apellidos}</div>
                        <div style={{ fontSize:12, color:'var(--text3)' }}>{a.nombre}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showImport && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)' }}
          onClick={e => { if(e.target===e.currentTarget){setShowImport(false);setResumen({})} }}>
          <div style={{ background:'#fff', borderRadius:20, width:600, maxWidth:'96vw', maxHeight:'90vh', overflow:'auto', boxShadow:'0 8px 40px rgba(0,0,0,.25)' }}>
            <div style={{ padding:'24px 28px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:800 }}>📥 Importar Excel de alumnos</h2>
                <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>Formato Rayuela — grupos detectados automáticamente</p>
              </div>
              <button onClick={() => {setShowImport(false);setResumen({})}} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--text3)' }}>×</button>
            </div>

            <form onSubmit={handleImportar} style={{ padding:'24px 28px' }}>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>1. Selecciona el archivo Excel</label>
                <input type="file" accept=".xls,.xlsx" ref={fileRef} onChange={handleFileChange}
                  style={{ padding:'12px', border:'1.5px dashed var(--border)', borderRadius:8, background:'var(--bg)', width:'100%', cursor:'pointer', fontSize:13 }} />
              </div>

              <div className="form-group" style={{ marginBottom:20 }}>
                <label>2. ¿De qué curso es este Excel?</label>
                <select value={impCurso} onChange={e => setImpCurso(e.target.value)} required>
                  <option value="">— Selecciona el curso —</option>
                  {CURSOS_ORDEN.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {Object.keys(resumen).length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:12 }}>
                    3. Grupos detectados — {totalAlumnos} alumnos en total
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {Object.entries(resumen).sort(([a],[b])=>a.localeCompare(b)).map(([grupo, alums]) => (
                      <div key={grupo} style={{ border:'1.5px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                        <div style={{ padding:'10px 14px', background:'var(--primary-pale)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontWeight:700, color:'var(--primary)', fontSize:14 }}>Grupo {grupo}</span>
                          <span style={{ fontSize:12, color:'var(--primary)', fontWeight:600 }}>{alums.length} alumnos</span>
                        </div>
                        <div style={{ maxHeight:130, overflowY:'auto', background:'var(--bg)' }}>
                          {alums.map((a, i) => (
                            <div key={i} style={{ padding:'6px 14px', borderBottom:'1px solid var(--border)', fontSize:12, display:'flex', gap:8 }}>
                              <span style={{ fontWeight:600, flex:1 }}>{a.apellidos}</span>
                              <span style={{ color:'var(--text2)' }}>{a.nombre}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalAlumnos > 0 && (
                <div style={{ background:'var(--primary-pale)', border:'1px solid #6ee7b7', borderRadius:8, padding:'10px 14px', marginBottom:20, fontSize:13, color:'var(--primary-dark)' }}>
                  ⚠️ Si ya hay alumnos en alguno de esos grupos, serán reemplazados.
                </div>
              )}

              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => {setShowImport(false);setResumen({})}}>Cancelar</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={importando || totalAlumnos===0 || !impCurso}>
                  {importando ? 'Importando...' : totalAlumnos > 0 ? `Importar ${totalAlumnos} alumnos en ${Object.keys(resumen).length} grupos` : 'Carga un Excel primero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}