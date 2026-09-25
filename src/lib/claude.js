// Todas las llamadas a Claude API van vía Netlify Functions — nunca desde el frontend directamente
import { supabase } from './supabase'

// El Agente Operativo consulta datos reales con el JWT de la sesión: la
// function aplica la misma RLS que el usuario tiene en pantalla.
export const chatOperativo = async (messages, context = '', fichas = {}) => {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/.netlify/functions/chat-operativo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ messages, context, fichas }),
  })
  if (!res.ok) throw new Error('Error en Agente Operativo')
  const data = await res.json()
  // { content, propuestas } — propuestas son acciones que el usuario debe confirmar
  return { content: data.content ?? data.reply ?? data.text ?? JSON.stringify(data), propuestas: data.propuestas || [] }
}

export const chatAnalitico = async (messages, dataSummary = {}) => {
  const res = await fetch('/.netlify/functions/chat-analitico', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, data_summary: dataSummary }),
  })
  if (!res.ok) throw new Error('Error en Agente Analítico')
  const data = await res.json()
  return data.content ?? data.reply ?? data.text ?? JSON.stringify(data)
}
