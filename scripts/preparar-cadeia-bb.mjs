// Extrai do PFX a cadeia PEM para subir no portal BB (Produção → Cadeia de certificados).
// Uso:
//   node scripts/preparar-cadeia-bb.mjs IMPERADOR
//
// Gera em API BB/certs-upload/{loja}/:
//   01-raiz.crt
//   02-intermediario.crt   (ou 02-, 03- se houver mais de um)
//   99-empresa.crt
//   cadeia-completa.pem   (para "Importar cadeia completa")

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nome = (process.argv[2] || '').trim()
if (!nome) {
  console.error('Uso: node scripts/preparar-cadeia-bb.mjs IMPERADOR')
  process.exit(1)
}

function digitos(valor) {
  return String(valor || '').replace(/\D/g, '')
}

function nomeLoja(texto) {
  return String(texto || '').toUpperCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[\s._-]+/g, '')
}

function acharPfx(filtro) {
  const pasta = path.join(root, 'Certificados')
  const chave = nomeLoja(filtro)
  const docs = digitos(filtro)
  const arquivos = fs.readdirSync(pasta).filter((f) => /\.pfx$/i.test(f) || /\.p12$/i.test(f))
  const hit = arquivos.find((f) => {
    const limpo = nomeLoja(f)
    // Primeira palavra do arquivo = loja (DUQUE ≠ ARQUIDUQUE; POPVAL = POP VAL)
    if (limpo.startsWith(chave) && (limpo.length === chave.length || /[^A-Z0-9]/.test(limpo[chave.length] || ' ') || limpo[chave.length] === 'A' && limpo.startsWith(`${chave}ALVIM`) || limpo.startsWith(`${chave}COMERCIO`))) {
      const resto = limpo.slice(chave.length)
      return resto === '' || resto.startsWith('ALVIM') || resto.startsWith('COMERCIO')
    }
    if (docs.length >= 8 && digitos(f).includes(docs)) return true
    return false
  })
  if (!hit) throw new Error(`PFX não encontrado para ${filtro}`)
  return path.join(pasta, hit)
}

function blocosPem(texto) {
  const re = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g
  return texto.match(re) || []
}

const pfx = acharPfx(nome)
const senha = process.argv[3] || 'Diag2026'
const pastaOut = path.join(
  root,
  'API BB',
  'certs-upload',
  nome.toUpperCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, '-'),
)
fs.mkdirSync(pastaOut, { recursive: true })

const script = path.join(root, 'scripts', '_extrair_pfx.py')
let texto
try {
  texto = execFileSync('py', ['-3', script, pfx, senha], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
} catch {
  texto = execFileSync('python', [script, pfx, senha], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
}

const certs = blocosPem(texto)
if (certs.length < 1) throw new Error('Nenhum certificado no PFX')

// Ordem típica do PFX: folha → intermediários → raiz
const folha = certs[0]
const meio = certs.slice(1, -1)
const raiz = certs.length > 1 ? certs[certs.length - 1] : ''

fs.writeFileSync(path.join(pastaOut, '99-empresa.crt'), `${folha}\n`)
meio.forEach((bloco, i) => {
  fs.writeFileSync(path.join(pastaOut, `${String(i + 2).padStart(2, '0')}-intermediario.crt`), `${bloco}\n`)
})
if (raiz) fs.writeFileSync(path.join(pastaOut, '01-raiz.crt'), `${raiz}\n`)

// Cadeia completa na ordem que o BB costuma aceitar: empresa → intermediários → raiz
const completa = [folha, ...meio, ...(raiz ? [raiz] : [])].join('\n') + '\n'
fs.writeFileSync(path.join(pastaOut, 'cadeia-completa.pem'), completa)

console.log('PFX:', path.basename(pfx))
console.log('Pasta:', pastaOut)
console.log(`Blocos: empresa + ${meio.length} intermediário(s) + ${raiz ? 'raiz' : 'sem raiz'}`)
console.log('')
console.log('No portal BB (Produção → Cadeia de certificados):')
console.log('  1) Preferir "Importar cadeia completa" → cadeia-completa.pem')
console.log('  2) Ou subir um a um:')
console.log('     - Certificado Empresa      → 99-empresa.crt')
meio.forEach((_, i) => {
  console.log(`     - Certificado Intermediário → ${String(i + 2).padStart(2, '0')}-intermediario.crt`)
})
if (raiz) console.log('     - Certificado Raiz          → 01-raiz.crt')
