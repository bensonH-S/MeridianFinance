// Puxa DDA produção do REI.
// Uso: node scripts/testar-bb-dda.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { listarBoletosBb } from '../lib/bbDda.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arquivo = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'API BB', 'credenciais-dda-rei.txt')

function ler(caminho) {
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
  const certLeaf = path.join(certDir, 'rei.crt')
  const keyPath = path.join(certDir, 'rei.key')
  const temPem = fs.existsSync(certLeaf) && fs.existsSync(keyPath)
  return {
    ambiente,
    client_id: dados.clientID || dados.client_id || '',
    client_secret: secret,
    app_key: dados.appKey || dados.app_key || '',
    empresa: 'REI',
    cnpj: '26075154000136',
    cert_pass: dados.certPass || dados.cert_pass || 'Diag2026',
    cert_pem: temPem ? fs.readFileSync(certLeaf, 'utf8') : '',
    key_pem: temPem ? fs.readFileSync(keyPath, 'utf8') : '',
  }
}

const config = ler(arquivo)
console.log('Arquivo:', path.basename(arquivo))
console.log('Ambiente:', config.ambiente)
console.log('App key:', config.app_key.slice(0, 8) + '…')
console.log('TLS:', config.cert_pem ? 'PEM folha' : (config.cert_pass ? 'PFX pasta' : 'sem cert'))

try {
  const linhas = await listarBoletosBb(config)
  console.log(`OK: ${linhas.length} boleto(s)`)
  for (const item of linhas.slice(0, 15)) {
    console.log(`- ${item.vencimento || '?'}  R$ ${String(item.valor ?? '?').padStart(10)}  ${item.cedente || item.cnpj_cedente || '—'}`)
  }
  if (linhas.length > 15) console.log(`… +${linhas.length - 15}`)
} catch (err) {
  console.error('Falha:', err.message || err)
  process.exit(1)
}
