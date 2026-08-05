import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePRP(view, options = {}) {
  const { select = '*', filters = [], order, limit, single } = options
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      setLoading(true)
      try {
        let q = supabase.from(view).select(select)
        filters.forEach(([col, op, val]) => { q = q.filter(col, op, val) })
        if (order) q = q.order(order.col, { ascending: order.asc ?? true })
        if (limit) q = q.limit(limit)
        if (single) q = q.single()
        const { data: rows, error: err } = await q
        if (!cancelled) {
          if (err) setError(err.message)
          else setData(rows)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, JSON.stringify(filters), order?.col, limit])

  return { data, loading, error }
}
