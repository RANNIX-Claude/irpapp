// Todas las llamadas a Claude API van vía Netlify Functions — nunca desde el frontend directamente

export const chatOperativo = async (messages, context = '') => {
  const res = await fetch('/.netlify/functions/chat-operativo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  })
  if (!res.ok) throw new Error('Error en Agente Operativo')
  return res.json()
}

export const chatAnalitico = async (messages, dataSummary = {}) => {
  const res = await fetch('/.netlify/functions/chat-analitico', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, data_summary: dataSummary }),
  })
  if (!res.ok) throw new Error('Error en Agente Analítico')
  return res.json()
}
