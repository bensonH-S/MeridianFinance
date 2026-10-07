/**
 * Completa tabelas que faltaram no cutover linha a linha (após falha parcial).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '..')

function loadEnv() {
  const candidates = [
    path.resolve(repo, '.env'),
    path.resolve(repo, '..', 'Check_visaodono', 'backend', '.env'),
  ]
  const file = candidates.find((item) => fs.existsSync(item))
  if (!file) throw new Error('env não encontrado')
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`
}

function serializarValor(v) {
  if (v == null) return v
  if (typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return JSON.stringify(v)
  }
  return v
}

function tipoSql(c) {
  if (c.udt_name === 'uuid') return 'uuid'
  if (c.udt_name === 'bytea') return 'bytea'
  if (c.udt_name === 'jsonb') return 'jsonb'
  if (c.udt_name === 'json') return 'json'
  if (c.udt_name === 'bool') return 'boolean'
  if (c.udt_name === 'int4') return 'integer'
  if (c.udt_name === 'int8') return 'bigint'
  if (c.udt_name === 'numeric') return 'numeric'
  if (c.udt_name === 'text') return 'text'
  if (c.udt_name === 'timestamptz') return 'timestamptz'
  if (c.udt_name === 'timestamp') return 'timestamp'
  if (c.udt_name === 'date') return 'date'
  return c.data_type
}

const env = loadEnv()
const common = {
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASS,
  port: Number(env.DB_PORT || 5432),
  ssl: env.DB_SSL === 'true' || env.DB_SSL === '1' ? { rejectUnauthorized: false } : undefined,
}

const origem = new pg.Pool({ ...common, database: 'meridian_finance' })
const destino = new pg.Pool({ ...common, database: env.DB_NAME || 'vision_check' })

const { rows: origemTabs } = await origem.query(`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`)
const { rows: destTabs } = await destino.query(`
  SELECT tablename FROM pg_tables WHERE schemaname = 'finance' ORDER BY tablename
`)
const tem = new Set(destTabs.map((r) => r.tablename))
const faltam = origemTabs.map((r) => r.tablename).filter((n) => !tem.has(n))
console.log('[completar] faltam:', faltam.join(', ') || '(nenhuma)')

for (const nome of faltam) {
  const { rows: cols } = await origem.query(
    `SELECT column_name, data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [nome],
  )
  const colDefs = cols.map((c) => `${quoteIdent(c.column_name)} ${tipoSql(c)}`).join(', ')
  await destino.query(`DROP TABLE IF EXISTS finance.${quoteIdent(nome)} CASCADE`)
  await destino.query(`CREATE TABLE finance.${quoteIdent(nome)} (${colDefs})`)
  const { rows } = await origem.query(`SELECT * FROM ${quoteIdent(nome)}`)
  if (!rows.length) {
    console.log(`  · ${nome}: 0`)
    continue
  }
  const keys = Object.keys(rows[0])
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
  const insert = `INSERT INTO finance.${quoteIdent(nome)} (${keys.map(quoteIdent).join(', ')}) VALUES (${placeholders})`
  for (const row of rows) {
    await destino.query(insert, keys.map((k) => serializarValor(row[k])))
  }
  console.log(`  · ${nome}: ${rows.length}`)
}

await origem.end()
await destino.end()
console.log('[completar] OK')
