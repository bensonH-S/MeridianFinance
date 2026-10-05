// Sobe a aplicação local apontando para o Postgres de produção (meridian_finance).
// Lê DB_* do .env desta pasta ou de ../Check_visaodono/backend/.env
//
// Uso, na raiz do repositório:
//   npm run local
//   npm run prod
//
// Tela: http://127.0.0.1:5176/
// API:  http://127.0.0.1:5080/

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const candidatos = [
  process.env.ENV_FILE,
  path.resolve(root, '.env'),
  path.resolve(root, '..', 'Check_visaodono', 'backend', '.env'),
].filter(Boolean)
const arquivo = candidatos.find((item) => fs.existsSync(item))
if (!arquivo) {
  console.error('Não achei o .env do banco. Coloque um em .env ou em Check_visaodono/backend/.env.')
  process.exit(1)
}
const env = lerEnv(arquivo)
if (!env.DB_HOST || !env.DB_USER) {
  console.error(`O arquivo ${arquivo} não tem DB_HOST/DB_USER.`)
  process.exit(1)
}

function portaLivre(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port }, () => {
      socket.end()
      resolve(false)
    })
    socket.on('error', () => resolve(true))
  })
}

const envServidor = { ...process.env, PORT: '5080' }
// Limpa DB_* do shell para o server.mjs ler o .env de produção.
delete envServidor.DB_HOST
delete envServidor.DB_USER
delete envServidor.DB_PASS
delete envServidor.DB_NAME
delete envServidor.DB_PORT
delete envServidor.ENV_FILE

if (!(await portaLivre(5080))) {
  console.error('A porta 5080 já está em uso. Encerre o processo anterior e rode de novo.')
  process.exit(1)
}

const servidor = spawn(process.execPath, ['server.mjs'], {
  cwd: root,
  env: envServidor,
  stdio: 'inherit',
})

let vite = null
if (await portaLivre(5176)) {
  const viteBin = path.join(root, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js')
  if (!fs.existsSync(viteBin)) {
    console.error('Vite não encontrado em frontend/node_modules. Rode: npm install --prefix frontend')
    servidor.kill()
    process.exit(1)
  }
  vite = spawn(process.execPath, [viteBin], {
    cwd: path.join(root, 'frontend'),
    stdio: 'inherit',
  })
} else {
  console.log('Vite já está em :5176 — reaproveitando.')
}

console.log('')
console.log('Meridian Finance · local + banco produção')
console.log('Tela  http://127.0.0.1:5176/')
console.log('API   http://127.0.0.1:5080/')
console.log(`Banco ${env.DB_HOST}:${env.DB_PORT || 5432} / meridian_finance`)
console.log(`Env   ${arquivo}`)
console.log('')
console.log('DDA BB: depois de subir, rode  node scripts/ativar-bb-dda.mjs REI')
console.log('')

function encerrar() {
  servidor.kill()
  vite?.kill()
  process.exit(0)
}

process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)
servidor.on('exit', (code) => {
  if (code) process.exit(code)
})
