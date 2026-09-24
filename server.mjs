import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const root = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 5080)

function loadMeridianEnv() {
  const candidates = [
    process.env.ENV_FILE,
    path.resolve(root, '.env'),
    path.resolve(root, '..', 'Check_visaodono', 'backend', '.env'),
    '/var/www/app/backend/.env',
    '/var/www/vision-check/backend/.env',
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

const env = loadMeridianEnv()
const pool = new pg.Pool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: 'meridian_finance',
  port: Number(env.DB_PORT || 5432),
  connectionTimeoutMillis: 10000,
})

const FORMAS = new Set(['dinheiro', 'online', 'boleto', 'guia', 'folha', 'cadastro', 'chave_pix'])

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try { resolve(JSON.parse(raw)) } catch (err) { reject(err) }
    })
    req.on('error', reject)
  })
}

async function listarDespesas(empresaId) {
  const params = []
  let where = ''
  if (empresaId) {
    params.push(empresaId)
    where = 'where d.empresa_origem_id = $1'
  }
  const { rows } = await pool.query(`
    select d.id, d.descricao, d.valor::float8 as valor, to_char(d.vencimento, 'YYYY-MM-DD') as vencimento, d.forma_pagamento, d.status,
           d.documento_ref, d.empresa_origem_id as origem_id, eo.apelido as origem, eo.razao_social as origem_razao,
           er.apelido as registrado_em,
           d.fornecedor_id, f.nome as fornecedor, d.plano_conta_id, p.nome as plano,
           d.conta_saida_id, cs.nome as conta_nome, cs.empresa_id as conta_empresa_id,
           coalesce(nullif(d.dados_pagamento, ''), pix.chave_pix) as pagamento
    from despesas d
    join empresas eo on eo.id = d.empresa_origem_id
    left join contas_bancarias cs on cs.id = d.conta_saida_id
    left join empresas ec on ec.id = cs.empresa_id
    left join empresas er on er.id = d.empresa_registro_id
    left join fornecedores f on f.id = d.fornecedor_id
    left join plano_contas p on p.id = d.plano_conta_id
    left join lateral (
      select chave_pix from fornecedor_pagamentos fp
      where fp.fornecedor_id = d.fornecedor_id and fp.meio = 'pix' and chave_pix is not null and chave_pix <> ''
      limit 1
    ) pix on true
    ${where}
    order by d.created_at desc
  `, params)
  return rows
}

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

function servirArquivo(res, file) {
  const ext = path.extname(file).toLowerCase()
  send(res, 200, fs.readFileSync(file), tipos[ext] || 'application/octet-stream')
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (url.pathname === '/financas') url.pathname = '/'
  else if (url.pathname.startsWith('/financas/')) url.pathname = url.pathname.slice('/financas'.length)
  try {
    if (req.method === 'GET' && url.pathname === '/api/despesas') {
      return send(res, 200, JSON.stringify(await listarDespesas(url.searchParams.get('empresa') || '')))
    }
    if (req.method === 'GET' && url.pathname === '/api/empresas') {
      const { rows } = await pool.query(`
        select id, apelido, razao_social, tipo from empresas where ativo order by tipo, apelido
      `)
      return send(res, 200, JSON.stringify(rows))
    }
    if (req.method === 'GET' && url.pathname === '/api/contas') {
      const { rows } = await pool.query(`
        select c.id, c.empresa_id, c.nome, c.tipo, e.apelido
        from contas_bancarias c
        join empresas e on e.id = c.empresa_id
        where c.ativa
        order by c.nome
      `)
      return send(res, 200, JSON.stringify(rows))
    }
    if (req.method === 'GET' && url.pathname === '/api/plano') {
      const { rows } = await pool.query(`
        select id, nome from plano_contas where ativo and tipo = 'a_pagar' order by nome
      `)
      return send(res, 200, JSON.stringify(rows))
    }
    if (req.method === 'GET' && url.pathname === '/api/fornecedores') {
      const q = (url.searchParams.get('q') || '').trim()
      if (q.length < 2) return send(res, 200, '[]')
      const { rows } = await pool.query(`
        select f.id, f.nome, f.plano_conta_id, p.nome as plano
        from fornecedores f
        left join plano_contas p on p.id = f.plano_conta_id
        where f.nome ilike $1
        order by nome
        limit 12
      `, [`%${q}%`])
      return send(res, 200, JSON.stringify(rows))
    }
    if (req.method === 'POST' && url.pathname === '/api/despesas') {
      const body = await readBody(req)
      const valor = Number(body.valor)
      if (!body.descricao || !body.empresa_origem_id || !Number.isFinite(valor) || valor < 0) {
        return send(res, 400, JSON.stringify({ erro: 'Descrição, origem e valor são obrigatórios.' }))
      }
      if (body.forma_pagamento && !FORMAS.has(body.forma_pagamento)) {
        return send(res, 400, JSON.stringify({ erro: 'Forma de pagamento inválida.' }))
      }
      let status = 'rascunho'
      if (body.documento_ref) {
        const dup = await pool.query(`
          select 1 from despesas
          where empresa_origem_id = $1 and documento_ref = $2 and status <> 'cancelada'
          limit 1
        `, [body.empresa_origem_id, body.documento_ref])
        if (dup.rowCount) status = 'bloqueada_duplicata'
      }
      const inserted = await pool.query(`
        insert into despesas (
          descricao, fornecedor_id, empresa_origem_id, empresa_registro_id, conta_saida_id, plano_conta_id,
          documento_ref, competencia, vencimento, valor, forma_pagamento, dados_pagamento, status
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        returning id, status
      `, [
        String(body.descricao).trim(),
        body.fornecedor_id || null,
        body.empresa_origem_id,
        body.empresa_registro_id || null,
        body.conta_saida_id || null,
        body.plano_conta_id || null,
        body.documento_ref || null,
        body.competencia || null,
        body.vencimento || null,
        valor,
        body.forma_pagamento || null,
        body.dados_pagamento ? String(body.dados_pagamento).trim() : null,
        status,
      ])
      return send(res, 201, JSON.stringify(inserted.rows[0]))
    }
    if (req.method === 'PATCH' && url.pathname.startsWith('/api/despesas/')) {
      const id = url.pathname.split('/').pop()
      const body = await readBody(req)
      const valor = Number(body.valor)
      if (!body.descricao || !body.empresa_origem_id || !Number.isFinite(valor) || valor < 0) {
        return send(res, 400, JSON.stringify({ erro: 'Descrição, origem e valor são obrigatórios.' }))
      }
      if (body.forma_pagamento && !FORMAS.has(body.forma_pagamento)) {
        return send(res, 400, JSON.stringify({ erro: 'Forma de pagamento inválida.' }))
      }
      const updated = await pool.query(`
        update despesas set
          descricao = $1, fornecedor_id = $2, empresa_origem_id = $3, conta_saida_id = $4, plano_conta_id = $5,
          documento_ref = $6, vencimento = $7, valor = $8, forma_pagamento = $9, dados_pagamento = $10
        where id = $11
        returning id, status
      `, [
        String(body.descricao).trim(),
        body.fornecedor_id || null,
        body.empresa_origem_id,
        body.conta_saida_id || null,
        body.plano_conta_id || null,
        body.documento_ref || null,
        body.vencimento || null,
        valor,
        body.forma_pagamento || null,
        body.dados_pagamento ? String(body.dados_pagamento).trim() : null,
        id,
      ])
      if (!updated.rowCount) return send(res, 404, JSON.stringify({ erro: 'Despesa não encontrada.' }))
      return send(res, 200, JSON.stringify(updated.rows[0]))
    }
    if (req.method === 'GET' && !url.pathname.startsWith('/api')) {
      const dist = path.join(root, 'frontend', 'dist')
      if (process.env.NODE_ENV === 'production' && fs.existsSync(dist)) {
        const pedido = url.pathname === '/' ? '/index.html' : url.pathname
        const file = path.normalize(path.join(dist, pedido))
        if (file.startsWith(dist) && fs.existsSync(file) && fs.statSync(file).isFile()) {
          return servirArquivo(res, file)
        }
        return servirArquivo(res, path.join(dist, 'index.html'))
      }
      if (url.pathname === '/' || url.pathname === '/index.html') {
        res.writeHead(302, { Location: 'http://127.0.0.1:5176/' })
        res.end()
        return
      }
    }
    if (req.method === 'GET' && url.pathname === '/logo-meridian.png') {
      return send(res, 200, fs.readFileSync(path.join(root, 'mockup', 'logo-meridian.png')), 'image/png')
    }
    send(res, 404, JSON.stringify({ erro: 'Não encontrado' }))
  } catch (err) {
    send(res, 500, JSON.stringify({ erro: 'Falha ao falar com o banco.' }))
    console.error(err.message)
  }
})

pool.query('alter table despesas add column if not exists dados_pagamento text').then(() => {
  server.listen(port, '127.0.0.1', () => {
    console.log(`meridian-finance http://127.0.0.1:${port}`)
  })
}).catch((err) => {
  console.error(err.message)
  process.exit(1)
})
