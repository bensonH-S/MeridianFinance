import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { sincronizarDocumentos } from '../lib/syncDocumentos.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dias = Number(process.argv.find((arg) => arg.startsWith('--dias='))?.slice(7) || 60)

function loadEnv() {
  const candidatos = [
    process.env.ENV_FILE,
    path.join(root, '.env'),
    path.resolve(root, '..', 'Check_visaodono', 'backend', '.env'),
    '/var/www/app/backend/.env',
    '/var/www/vision-check/backend/.env',
  ].filter(Boolean)
  const file = candidatos.find((item) => fs.existsSync(item))
  if (!file) throw new Error('Arquivo de ambiente não encontrado.')
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

const env = loadEnv()
const pool = new pg.Pool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: 'meridian_finance',
  port: Number(env.DB_PORT || 5432),
})
const operacional = new pg.Pool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME || 'vision_check',
  port: Number(env.DB_PORT || 5432),
})

try {
  const resumo = await sincronizarDocumentos({ root, env, pool, operacional, dias })
  console.log(JSON.stringify(resumo))
} finally {
  await pool.end()
  await operacional.end()
}
