const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://postgres.kusuoxwzdxfuybvyiakg:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
})

async function run() {
  await client.connect()
  console.log('Conectado')

  await client.query(`
    ALTER TABLE public.er_mensual
      ADD COLUMN IF NOT EXISTS proy_rsf       NUMERIC(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS proy_penaliz   NUMERIC(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS proy_iva       NUMERIC(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS real_iva_mes   NUMERIC(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS real_iva_otros NUMERIC(14,2) DEFAULT 0
  `)
  console.log('Columnas agregadas')

  await client.query(`NOTIFY pgrst, 'reload schema'`)
  await client.end()
  console.log('Listo')
}

run().catch(e => { console.error(e); process.exit(1) })
