import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Sugerencias del catálogo único para inputs de proveedor en texto libre
 * (`<input list={id}>`). El texto se liga al catálogo en la base por trigger.
 */
export default function DatalistProveedores({ id = 'dl-proveedores' }) {
  const [nombres, setNombres] = useState([])
  useEffect(() => {
    supabase.from('cat_proveedores').select('nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setNombres((data || []).map(p => p.nombre)))
  }, [])
  return <datalist id={id}>{nombres.map(n => <option key={n} value={n} />)}</datalist>
}
