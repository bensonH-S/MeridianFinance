import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', '007_fechamento_caixa.sql')

const CAMPOS = [
  'dinheiro', 'pix', 'debito', 'credito', 'cart_digital',
  'ifood', 'azul', 'rappi', 'food99', 'despesas_caixa',
]

export async function garantirSchemaCaixa(pool) {
  await pool.query(fs.readFileSync(schemaPath, 'utf8'))
}

function erro(mensagem, status = 400) {
  const falha = new Error(mensagem)
  falha.status = status
  return falha
}

function dinheiro(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

function statusValido(valor) {
  return ['rascunho', 'conferido', 'fechado'].includes(valor) ? valor : 'rascunho'
}

function dataIso(valor) {
  if (!valor) return ''
  if (typeof valor === 'string') return valor.slice(0, 10)
  const y = valor.getUTCFullYear()
  const m = String(valor.getUTCMonth() + 1).padStart(2, '0')
  const d = String(valor.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function linhaPublica(linha) {
  return {
    id: linha.id,
    empresa_id: linha.empresa_id,
    empresa: linha.apelido || linha.razao_social,
    bk_number: linha.bk_number,
    data: dataIso(linha.data),
    dinheiro: Number(linha.dinheiro) || 0,
    pix: Number(linha.pix) || 0,
    debito: Number(linha.debito) || 0,
    credito: Number(linha.credito) || 0,
    cart_digital: Number(linha.cart_digital) || 0,
    ifood: Number(linha.ifood) || 0,
    azul: Number(linha.azul) || 0,
    rappi: Number(linha.rappi) || 0,
    food99: Number(linha.food99) || 0,
    despesas_caixa: Number(linha.despesas_caixa) || 0,
    observacao: linha.observacao || '',
    status: linha.status,
    atualizado_em: linha.atualizado_em,
  }
}

export async function listarFechamentos(pool, { mes, empresaId } = {}) {
  await garantirSchemaCaixa(pool)
  const params = []
  const filtros = []
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    params.push(`${mes}-01`)
    filtros.push(`f.data >= $${params.length}::date and f.data < ($${params.length}::date + interval '1 month')`)
  }
  if (empresaId) {
    params.push(empresaId)
    filtros.push(`f.empresa_id = $${params.length}`)
  }
  const where = filtros.length ? `where ${filtros.join(' and ')}` : ''
  const { rows } = await pool.query(`
    select f.*, e.apelido, e.razao_social, e.bk_number
    from fechamento_caixa f
    join empresas e on e.id = f.empresa_id
    ${where}
    order by f.data desc, e.apelido
  `, params)
  return rows.map(linhaPublica)
}

export async function mesFechamentos(pool, { mes, empresaId }) {
  await garantirSchemaCaixa(pool)
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) throw erro('Informe o mês no formato AAAA-MM.')
  if (!empresaId) throw erro('Informe a loja.')

  const empresa = (await pool.query(`
    select id, apelido, razao_social, bk_number, tipo
    from empresas where id = $1 and ativo
  `, [empresaId])).rows[0]
  if (!empresa) throw erro('Loja não encontrada.', 404)
  if (empresa.tipo !== 'loja') throw erro('Só loja fecha caixa.')

  const inicio = `${mes}-01`
  const { rows } = await pool.query(`
    select f.*, e.apelido, e.razao_social, e.bk_number
    from fechamento_caixa f
    join empresas e on e.id = f.empresa_id
    where f.empresa_id = $1
      and f.data >= $2::date
      and f.data < ($2::date + interval '1 month')
    order by f.data
  `, [empresaId, inicio])

  const porDia = new Map(rows.map((linha) => {
    const pub = linhaPublica(linha)
    return [Number(pub.data.slice(8, 10)), pub]
  }))

  const [ano, mesNum] = mes.split('-').map(Number)
  const ultimo = new Date(ano, mesNum, 0).getDate()
  const dias = []
  for (let dia = 1; dia <= ultimo; dia += 1) {
    const salvo = porDia.get(dia)
    const data = `${mes}-${String(dia).padStart(2, '0')}`
    dias.push(salvo || {
      id: null,
      empresa_id: empresa.id,
      empresa: empresa.apelido || empresa.razao_social,
      bk_number: empresa.bk_number,
      data,
      dinheiro: 0,
      pix: 0,
      debito: 0,
      credito: 0,
      cart_digital: 0,
      ifood: 0,
      azul: 0,
      rappi: 0,
      food99: 0,
      despesas_caixa: 0,
      observacao: '',
      status: 'rascunho',
      atualizado_em: null,
    })
  }

  const preenchidos = dias.filter((d) => d.id)
  const totais = CAMPOS.reduce((acc, campo) => {
    acc[campo] = Math.round(preenchidos.reduce((s, d) => s + (Number(d[campo]) || 0), 0) * 100) / 100
    return acc
  }, {})

  return {
    empresa: {
      id: empresa.id,
      apelido: empresa.apelido || empresa.razao_social,
      bk_number: empresa.bk_number,
    },
    mes,
    dias,
    totais,
    resumo: {
      dias_com_movimento: preenchidos.length,
      conferidos: preenchidos.filter((d) => d.status === 'conferido' || d.status === 'fechado').length,
      fechados: preenchidos.filter((d) => d.status === 'fechado').length,
      dinheiro_pix: Math.round((totais.dinheiro + totais.pix) * 100) / 100,
    },
  }
}

export async function salvarFechamento(pool, body) {
  await garantirSchemaCaixa(pool)
  const empresaId = String(body.empresa_id || '').trim()
  const data = String(body.data || '').trim()
  if (!empresaId || !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw erro('Informe a loja e a data.')

  const empresa = (await pool.query(`select id, tipo from empresas where id = $1 and ativo`, [empresaId])).rows[0]
  if (!empresa) throw erro('Loja não encontrada.', 404)
  if (empresa.tipo !== 'loja') throw erro('Só loja fecha caixa.')

  const atual = (await pool.query(`select status from fechamento_caixa where empresa_id = $1 and data = $2`, [empresaId, data])).rows[0]
  if (atual?.status === 'fechado') throw erro('Esse dia já está fechado.')

  const status = statusValido(body.status)
  if (status === 'fechado' && (dinheiro(body.dinheiro) + dinheiro(body.pix) <= 0) && !body.forcar) {
    // permitir fechar zerado só se forçar; senão conferido ok
  }

  const valores = Object.fromEntries(CAMPOS.map((campo) => [campo, dinheiro(body[campo])]))
  const observacao = String(body.observacao || '').trim().slice(0, 2000)

  const { rows } = await pool.query(`
    insert into fechamento_caixa (
      empresa_id, data, dinheiro, pix, debito, credito, cart_digital,
      ifood, azul, rappi, food99, despesas_caixa, observacao, status, atualizado_em
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now()
    )
    on conflict (empresa_id, data) do update set
      dinheiro = excluded.dinheiro,
      pix = excluded.pix,
      debito = excluded.debito,
      credito = excluded.credito,
      cart_digital = excluded.cart_digital,
      ifood = excluded.ifood,
      azul = excluded.azul,
      rappi = excluded.rappi,
      food99 = excluded.food99,
      despesas_caixa = excluded.despesas_caixa,
      observacao = excluded.observacao,
      status = excluded.status,
      atualizado_em = now()
    returning id
  `, [
    empresaId, data,
    valores.dinheiro, valores.pix, valores.debito, valores.credito, valores.cart_digital,
    valores.ifood, valores.azul, valores.rappi, valores.food99, valores.despesas_caixa,
    observacao, status,
  ])

  const completo = (await pool.query(`
    select f.*, e.apelido, e.razao_social, e.bk_number
    from fechamento_caixa f
    join empresas e on e.id = f.empresa_id
    where f.id = $1
  `, [rows[0].id])).rows[0]
  return linhaPublica(completo)
}
