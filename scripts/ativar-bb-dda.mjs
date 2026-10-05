// Grava o acesso BB de produção (REI) e dispara a coleta.
// Uso (com a API local no ar — npm run local):
//   node scripts/ativar-bb-dda.mjs
//   node scripts/ativar-bb-dda.mjs REI
//   node scripts/ativar-bb-dda.mjs REI "API BB/credenciais-dda-rei.txt"

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const api = 'http://127.0.0.1:5080/api'
const filtro = (process.argv[2] || 'REI').trim().toLowerCase()
const arquivo = path.resolve(root, process.argv[3] || path.join('API BB', 'credenciais-dda-rei.txt'))

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
  const certDir = path.join(root, 'API BB', 'certs-rei')
  const crt = path.join(certDir, 'rei.crt')
  const key = path.join(certDir, 'rei.key')
  const body = {
    ambiente,
    client_id: dados.clientID || dados.client_id || '',
    client_secret: secret,
    app_key: dados.appKey || dados.app_key || '',
    cert_pass: dados.certPass || dados.cert_pass || 'Diag2026',
    ativo: true,
  }
  if (fs.existsSync(crt) && fs.existsSync(key)) {
    body.cert_pem = fs.readFileSync(crt, 'utf8')
    body.key_pem = fs.readFileSync(key, 'utf8')
  }
  return body
}

async function json(url, opts) {
  const res = await fetch(url, opts)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.erro || `HTTP ${res.status}`)
  return body
}

if (!fs.existsSync(arquivo)) {
  console.error('Arquivo de credenciais não encontrado:', arquivo)
  process.exit(1)
}

const body = lerCredenciais(arquivo)
if (!body.client_id || !body.client_secret || !body.app_key) {
  console.error('Credenciais incompletas.')
  process.exit(1)
}

const acessos = await json(`${api}/config/bb`)
const candidatos = acessos.filter((a) => {
  const texto = `${a.empresa} ${a.razao_social} ${a.cnpj || ''}`
  return texto.toLowerCase().includes(filtro)
})

if (!candidatos.length) {
  console.error('Nenhuma empresa bateu com o filtro. Empresas:')
  for (const a of acessos.slice(0, 40)) console.error('-', a.empresa)
  process.exit(1)
}

const alvo = candidatos[0]
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
await new Promise((r) => setTimeout(r, 12000))

const depois = (await json(`${api}/config/bb`)).find((a) => a.empresa_id === alvo.empresa_id)
console.log('Situação:', depois?.ultimo_ok === true ? 'ok' : depois?.ultimo_ok === false ? 'erro' : 'sem status')
console.log('Mensagem:', depois?.ultima_mensagem || '—')
console.log('Títulos em Contas a pagar: http://127.0.0.1:5176/')
