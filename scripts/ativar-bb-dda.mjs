// Grava acesso BB de produção e dispara a coleta de uma loja.
// Uso (API local no ar — npm run local):
//   node scripts/ativar-bb-dda.mjs IMPERADOR
//   node scripts/ativar-bb-dda.mjs LORD
//
// Credenciais: API BB/Credenciais/credenciais-{LOJA}.txt
// Certificado: pasta Certificados/*.pfx (senha Diag2026)

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const api = 'http://127.0.0.1:5080/api'
const filtro = (process.argv[2] || '').trim()
if (!filtro) {
  console.error('Uso: node scripts/ativar-bb-dda.mjs IMPERADOR')
  process.exit(1)
}

function digitos(valor) {
  return String(valor || '').replace(/\D/g, '')
}

function acharArquivoCredencial(nome) {
  const chave = nome.trim().toUpperCase().normalize('NFD').replace(/\p{M}/gu, '')
  const pasta = path.join(root, 'API BB', 'Credenciais')
  const legado = [
    path.join(root, 'API BB', `credenciais-${chave}.txt`),
    path.join(root, 'API BB', 'credenciais-dda-rei.txt'),
  ]
  if (process.argv[3]) return path.resolve(root, process.argv[3])
  if (fs.existsSync(pasta)) {
    const arquivos = fs.readdirSync(pasta).filter((f) => f.toLowerCase().endsWith('.txt'))
    const hit = arquivos.find((f) => {
      const base = f.replace(/^credenciais-/i, '').replace(/\.txt$/i, '')
      const limpo = base.toUpperCase().normalize('NFD').replace(/\p{M}/gu, '')
      return limpo === chave
    })
    if (hit) return path.join(pasta, hit)
  }
  return legado.find((p) => fs.existsSync(p)) || ''
}

function acharPfx(cnpj) {
  const pasta = path.join(root, 'Certificados')
  if (!fs.existsSync(pasta)) return ''
  const chave = digitos(cnpj)
  const nome = fs.readdirSync(pasta).find((item) => {
    const baixo = item.toLowerCase()
    if (!baixo.endsWith('.pfx') && !baixo.endsWith('.p12')) return false
    const docs = digitos(item)
    return docs === chave || docs.includes(chave)
  })
  return nome ? path.join(pasta, nome) : ''
}

function extrairPem(pfxPath, senha) {
  if (!pfxPath) return null
  // PFX ICP-Brasil (RC2) — OpenSSL 3 do Git falha sem legacy.dll; Python cryptography lê.
  const script = path.join(root, 'scripts', '_extrair_pfx.py')
  const runners = [
    ['py', ['-3', script, pfxPath, senha]],
    ['python', [script, pfxPath, senha]],
  ]
  for (const [bin, args] of runners) {
    try {
      const texto = execFileSync(bin, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
      const marca = '-----BEGIN PRIVATE KEY-----'
      const i = texto.indexOf(marca)
      if (i < 0) continue
      const cert = texto.slice(0, i).trim() + '\n'
      const key = texto.slice(i).trim() + '\n'
      if (!cert.includes('BEGIN CERTIFICATE')) continue
      return { cert_pem: cert, key_pem: key }
    } catch {
      /* tenta próximo */
    }
  }
  return null
}

function lerCredenciais(caminho) {
  const dados = {}
  for (const linha of fs.readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    if (!linha || linha.startsWith('#') || !linha.includes('=')) continue
    const i = linha.indexOf('=')
    dados[linha.slice(0, i).trim()] = linha.slice(i + 1).trim()
  }
  const secret = dados.clientSecret || dados.client_secret || ''
  let ambiente = 'producao'
  try {
    const payload = JSON.parse(Buffer.from(secret.split('.')[1], 'base64url').toString('utf8'))
    if (payload.ambiente === 'homologacao') ambiente = 'homologacao'
  } catch {
    /* ignore */
  }
  return {
    ambiente,
    client_id: dados.clientID || dados.client_id || '',
    client_secret: secret,
    app_key: dados.appKey || dados.app_key || '',
    cert_pass: dados.certPass || dados.cert_pass || 'Diag2026',
    ativo: true,
  }
}

async function json(url, opts) {
  const res = await fetch(url, opts)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.erro || `HTTP ${res.status}`)
  return body
}

const arquivo = acharArquivoCredencial(filtro)
if (!arquivo || !fs.existsSync(arquivo)) {
  console.error('Arquivo de credenciais não encontrado para', filtro)
  process.exit(1)
}

const body = lerCredenciais(arquivo)
if (!body.client_id || !body.client_secret || !body.app_key) {
  console.error('Credenciais incompletas em', path.basename(arquivo))
  process.exit(1)
}

function nomeLoja(texto) {
  return String(texto || '').toUpperCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[\s._-]+/g, '')
}

const acessos = await json(`${api}/config/bb`)
const chave = nomeLoja(filtro)
const candidatos = acessos.filter((a) => {
  const apelido = nomeLoja(a.empresa)
  const razao = nomeLoja(a.razao_social)
  return apelido === chave || apelido.startsWith(`${chave}ALVIM`) || razao.startsWith(chave)
}).sort((a, b) => nomeLoja(a.empresa).length - nomeLoja(b.empresa).length)

if (!candidatos.length) {
  console.error('Nenhuma empresa bateu com o filtro. Empresas:')
  for (const a of acessos.slice(0, 40)) console.error('-', a.empresa)
  process.exit(1)
}

const alvo = candidatos[0]
const pfx = acharPfx(alvo.cnpj)
if (pfx) {
  const pem = extrairPem(pfx, body.cert_pass)
  if (pem) {
    body.cert_pem = pem.cert_pem
    body.key_pem = pem.key_pem
    console.log('A1:', path.basename(pfx), '→ PEM')
  } else {
    console.log('A1:', path.basename(pfx), '(PEM não extraído; tenta PFX na coleta)')
  }
} else {
  console.log('Aviso: sem PFX na pasta Certificados para', alvo.empresa)
}

console.log('Empresa:', alvo.empresa)
console.log('Arquivo:', path.basename(arquivo))
console.log('Ambiente:', body.ambiente)

await json(`${api}/config/bb/${alvo.empresa_id}`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})
console.log('Acesso gravado.')

await json(`${api}/config/bb/coletar`, { method: 'POST' })
console.log('Coleta disparada. Aguardando…')
await new Promise((r) => setTimeout(r, 18000))

const depois = (await json(`${api}/config/bb`)).find((a) => a.empresa_id === alvo.empresa_id)
console.log('Situação:', depois?.ultimo_ok === true ? 'ok' : depois?.ultimo_ok === false ? 'erro' : 'sem status')
console.log('Mensagem:', depois?.ultima_mensagem || '—')
console.log('Títulos: http://127.0.0.1:5176/')
