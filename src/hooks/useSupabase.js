import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabaseQuery(table, options = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { select = '*', order, limit, filter } = options

  useEffect(() => {
    let query = supabase.from(table).select(select)
    if (filter) query = query.match(filter)
    if (order) query = query.order(order.column, { ascending: order.ascending ?? true })
    if (limit) query = query.limit(limit)

    query.then(({ data, error }) => {
      if (error) setError(error)
      else setData(data ?? [])
      setLoading(false)
    })

    // Suscripción realtime
    const channel = supabase
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        query.then(({ data }) => setData(data ?? []))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [table, select, JSON.stringify(filter)])

  return { data, loading, error }
}
