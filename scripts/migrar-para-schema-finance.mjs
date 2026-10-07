/**
 * Migra objetos de meridian_finance (public) → vision_check.finance
 * Uso: node scripts/migrar-para-schema-finance.mjs
 * Requer schema finance já criado (migration 191 no Check_visaodono).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { execFileSync } from 'node:child_process'

const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '..')

function loadEnv() {
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASS) {
    return {
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_PASS: process.env.DB_PASS,
      DB_NAME: process.env.DB_NAME || 'vision_check',
      DB_PORT: process.env.DB_PORT,
      DB_SSL: process.env.DB_SSL,
    }
  }
  const candidates = [
    process.env.ENV_FILE,
    path.resolve(repo, '.env'),
    path.resolve(repo, '..', 'Check_visaodono', 'backend', '.env'),
    path.resolve(repo, '..', 'Check_visaodono', '.env'),
  ].filter(Boolean)
  const file = candidates.find((item) => fs.existsSync(item))
  if (!file) throw new Error('Arquivo de ambiente do banco não encontrado.')
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

const env = loadEnv()
const common = {
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASS,
  port: Number(env.DB_PORT || 5432),
  ssl: env.DB_SSL === 'true' || env.DB_SSL === '1' ? { rejectUnauthorized: false } : undefined,
}
const origemNome = process.env.FINANCE_SOURCE_DB || 'meridian_finance'
const destinoNome = env.DB_NAME || 'vision_check'

async function main() {
  const origem = new pg.Pool({ ...common, database: origemNome })
  const destino = new pg.Pool({ ...common, database: destinoNome })

  await destino.query('CREATE SCHEMA IF NOT EXISTS finance')

  const { rows: tabelas } = await origem.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)

  if (!tabelas.length) {
    console.log(`[migrate] Nenhuma tabela em ${origemNome}.public — nada a copiar.`)
    await origem.end()
    await destino.end()
    return
  }

  console.log(`[migrate] ${origemNome} → ${destinoNome}.finance (${tabelas.length} tabelas)`)

  // Dump + restore via pg_dump/pg_restore se disponíveis; senão copia tabela a tabela.
  try {
    const dump = execFileSync(
      'pg_dump',
      [
        '-h', common.host,
        '-p', String(common.port),
        '-U', common.user,
        '-d', origemNome,
        '--schema=public',
        '--no-owner',
        '--no-acl',
        '--format=plain',
      ],
      {
        env: { ...process.env, PGPASSWORD: common.password },
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
      },
    )
    const rewritten = dump
      .replace(/^SET search_path = public.*$/gim, 'SET search_path = finance, public;')
      .replace(/\bpublic\./g, 'finance.')
      .replace(/CREATE SCHEMA public;?/gi, '')
      .replace(/ALTER SCHEMA public OWNER TO [^;]+;/gi, '')

    await destino.query('SET search_path TO finance, public')
    // Drop existing finance tables (idempotent re-run)
    for (const { tablename } of tabelas) {
      await destino.query(`DROP TABLE IF EXISTS finance.${quoteIdent(tablename)} CASCADE`)
    }
    await destino.query(rewritten)
    console.log('[migrate] Cutover via pg_dump concluído.')
  } catch (err) {
    console.warn(`[migrate] pg_dump indisponível (${err.message}). Copiando linha a linha…`)
    await copiarLinhaALinha(origem, destino, tabelas.map((t) => t.tablename))
  }

  await origem.end()
  await destino.end()
  console.log('[migrate] OK. Aponte o pool Finance para vision_check + search_path=finance,public.')
  console.log('[migrate] Depois de validar, desligue o database meridian_finance.')
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`
}

async function copiarLinhaALinha(origem, destino, nomes) {
  // Ordem aproximada por FKs internas — cria estrutura a partir do dump lógico
  for (const nome of nomes) {
    const { rows: cols } = await origem.query(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [nome],
    )
    if (!cols.length) continue
    const colDefs = cols
      .map((c) => `${quoteIdent(c.column_name)} ${tipoSql(c)}`)
      .join(', ')
    await destino.query(`DROP TABLE IF EXISTS finance.${quoteIdent(nome)} CASCADE`)
    await destino.query(`CREATE TABLE finance.${quoteIdent(nome)} (${colDefs})`)
    const { rows } = await origem.query(`SELECT * FROM ${quoteIdent(nome)}`)
    if (!rows.length) {
      console.log(`  · ${nome}: 0 linhas`)
      continue
    }
    const keys = Object.keys(rows[0])
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
    const insert = `INSERT INTO finance.${quoteIdent(nome)} (${keys.map(quoteIdent).join(', ')}) VALUES (${placeholders})`
    for (const row of rows) {
      await destino.query(
        insert,
        keys.map((k) => serializarValor(row[k])),
      )
    }
    console.log(`  · ${nome}: ${rows.length} linhas`)
  }
}

/** pg devolve json/jsonb como objeto; INSERT tipado precisa de string JSON válida. */
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

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
