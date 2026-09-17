import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()
const r = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' ORDER BY ordinal_position`)
console.log('contratos cols:', r.rows.map(x=>x.column_name).join(', '))

const r2 = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='arrendatarios' ORDER BY ordinal_position`)
console.log('arrendatarios cols:', r2.rows.map(x=>x.column_name).join(', '))
await c.end()
