import fs from 'node:fs'
import path from 'node:path'
import SftpClient from 'ssh2-sftp-client'

function texto(valor) {
  return String(valor ?? '').trim()
}

export function configSfg(env = process.env) {
  const host = texto(env.ITAU_SFG_HOST)
  const username = texto(env.ITAU_SFG_USER)
  const password = texto(env.ITAU_SFG_PASSWORD)
  const keyPath = texto(env.ITAU_SFG_KEY)
  const privateKey = keyPath && fs.existsSync(keyPath) ? fs.readFileSync(keyPath) : null
  if (!host || !username || (!password && !privateKey)) return null
  return {
    host,
    port: Number(env.ITAU_SFG_PORT || 22),
    username,
    password: password || undefined,
    privateKey: privateKey || undefined,
    passphrase: texto(env.ITAU_SFG_PASSPHRASE) || undefined,
    readyTimeout: 20000,
    produto: texto(env.ITAU_SFG_PRODUTO),
    pasta: texto(env.ITAU_SFG_PASTA),
  }
}

export function raizesSfg(config) {
  if (config.pasta) return config.pasta.split(',').map((item) => item.trim()).filter(Boolean)
  const sufixo = config.produto ? `/${config.produto}` : ''
  return [
    `/RETORNO/PROD${sufixo}`,
    `/RECEIVED${sufixo}`,
    `/mailbox/${config.username}/RETORNO/PROD${sufixo}`,
    `/mailbox/${config.username}/RECEIVED${sufixo}`,
  ]
}

async function listarArquivos(client, pasta, produto) {
  let lista
  try {
    lista = await client.list(pasta)
  } catch (err) {
    return { ok: false, arquivos: [], erro: err.message || 'pasta indisponível' }
  }
  const arquivos = []
  for (const item of lista) {
    if (item.name === '.' || item.name === '..') continue
    if (item.type === 'd') {
      if (produto && item.name !== produto) continue
      let dentro = []
      try {
        dentro = await client.list(`${pasta}/${item.name}`)
      } catch {
        dentro = []
      }
      for (const arquivo of dentro) {
        if (arquivo.type === 'd' || arquivo.name === '.' || arquivo.name === '..') continue
        arquivos.push({ pasta: `${pasta}/${item.name}`, nome: arquivo.name })
      }
      continue
    }
    arquivos.push({ pasta, nome: item.name })
  }
  return { ok: true, arquivos }
}

export async function baixarRetornos(config, destino, jaBaixados = new Set()) {
  const client = new SftpClient()
  const baixados = []
  try {
    await client.connect(config)
    const vistos = new Set(jaBaixados)
    const falhas = []
    let abriu = false
    for (const raiz of raizesSfg(config)) {
      const lista = await listarArquivos(client, raiz, config.produto)
      if (!lista.ok) {
        falhas.push(raiz)
        continue
      }
      abriu = true
      for (const arquivo of lista.arquivos) {
        const remoto = `${arquivo.pasta}/${arquivo.nome}`
        if (vistos.has(remoto)) continue
        vistos.add(remoto)
        const buffer = await client.get(remoto)
        const conteudo = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
        fs.mkdirSync(destino, { recursive: true })
        const local = path.join(destino, `${Date.now()}-${arquivo.nome.replace(/[^\w.-]+/g, '_')}`)
        fs.writeFileSync(local, conteudo)
        baixados.push({ remoto, nome: arquivo.nome, local, conteudo })
      }
    }
    if (!abriu) {
      throw new Error(`Nenhuma pasta de retorno abriu na VAN (${falhas.join(', ')}).`)
    }
  } finally {
    await client.end().catch(() => {})
  }
  return baixados
}
