/**
 * Puxa o relatório Restaurante e Produto Venda pela API do BK Office.
 *
 *   node scripts/sync-vendas-bk.mjs
 *   node scripts/sync-vendas-bk.mjs --inicio=2026-09-25 --fim=2026-09-25
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { sincronizarVendasBk } from '../lib/bkofficeVendas.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function lerEnv(arquivo) {
  const env = {}
  for (const line of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

const arquivo = [
  process.env.ENV_FILE,
  path.join(root, '.env'),
  path.join(root, '..', 'Check_visaodono', 'backend', '.env'),
].find((item) => item && fs.existsSync(item))

if (!arquivo) {
  console.error('Não achei o .env do banco.')
  process.exit(1)
}

const env = { ...lerEnv(arquivo), ...process.env }
const arg = (nome) => {
  const hit = process.argv.find((item) => item.startsWith(`--${nome}=`))
  return hit ? hit.slice(nome.length + 3) : ''
}

const pool = new pg.Pool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: 'meridian_finance',
  port: Number(env.DB_PORT || 5432),
  connectionTimeoutMillis: 10000,
})

try {
  const resultado = await sincronizarVendasBk({
    pool,
    env,
    inicio: arg('inicio'),
    fim: arg('fim'),
  })
  console.log(resultado)
} catch (err) {
  console.error(err.message || err)
  process.exitCode = 1
} finally {
  await pool.end()
}
