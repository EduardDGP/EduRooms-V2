import { useState, useEffect } from 'react'

/**
 * Carga las franjas horarias del centro del usuario logado.
 * Devuelve TODAS las franjas (incluidas las no reservables).
 * Si quieres solo las reservables, filtra por `reservable === 1`.
 */
export function useFranjas() {
  const [franjas, setFranjas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelado = false
    fetch('/api/franjas', {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('edu_token') }
    })
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Error cargando franjas')
        return data
      })
      .then(data => { if (!cancelado) setFranjas(Array.isArray(data) ? data : []) })
      .catch(err => { if (!cancelado) setError(err.message) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [])

  return { franjas, loading, error }
}