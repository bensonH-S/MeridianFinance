import XLSX from 'xlsx'

function texto(valor) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim()
}

function normalizar(valor) {
  return texto(valor).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function digitos(valor) {
  return texto(valor).replace(/\D/g, '')
}

function dataLocal(data) {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}

export function competenciaDe(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const data = new Date(ano, mes - 1, dia)
  data.setDate(data.getDate() - ((data.getDay() + 1) % 7))
  return dataLocal(data)
}

function dataIso(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return dataLocal(new Date(valor.getFullYear(), valor.getMonth(), valor.getDate()))
  }
  if (typeof valor === 'number' && valor > 20000 && valor < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(valor) * 86400000)
    return utc.toISOString().slice(0, 10)
  }
  const bruto = texto(valor)
  const br = bruto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
  const iso = bruto.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return ''
}

function valorNumero(valor) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return Math.round(valor * 100) / 100
  const bruto = texto(valor)
  if (!bruto) return null
  const limpo = bruto.replace(/[R$\s]/g, '')
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const numero = Number(normal)
  if (!Number.isFinite(numero) || numero < 0) return null
  return Math.round(numero * 100) / 100
}

const REGRAS = [
  ['cnpj_sacado', /(cnpj|cpf).*(pagador|sacado)|(pagador|sacado).*(cnpj|cpf)/],
  ['cnpj_cedente', /(cnpj|cpf).*(benefici|cedente|favorecido)|(benefici|cedente|favorecido).*(cnpj|cpf)/],
  ['sacado', /\b(pagador|sacado)\b/],
  ['cedente', /\b(beneficiario|cedente|favorecido)\b/],
  ['vencimento', /^venc$|vencimento/],
  ['valor', /^a pagar$|^valor( do (titulo|boleto|documento|nominal))?$/],
  ['codigo', /linha digitavel|codigo de barras|cod(igo)? barras/],
  ['situacao', /situacao|status/],
  ['documento', /^n doc$|seu numero|numero do documento|^documento$|^nf$/],
]

function rotulo(valor) {
  return normalizar(valor).replace(/[^a-z0-9]+/g, ' ').trim()
}

function contaDoArquivo(grade) {
  const textoGrade = grade.slice(0, 15).map((celulas) => (Array.isArray(celulas) ? texto(celulas[0]) : '')).join('\n')
  const cnpj = textoGrade.match(/CPF\/CNPJ:\s*([0-9./-]+)/i)
  const nome = textoGrade.match(/Nome da empresa:\s*(.+)/i)
  return {
    cnpj_sacado: cnpj ? digitos(cnpj[1]) : '',
    sacado: nome ? nome[1].trim() : '',
  }
}

function mapaColunas(cabecalho) {
  const mapa = {}
  const nomes = cabecalho.map((celula) => rotulo(celula))
  nomes.forEach((nome, indice) => {
    if (!nome || Object.values(mapa).includes(indice)) return
    const regra = REGRAS.find(([campo, regex]) => !(campo in mapa) && regex.test(nome))
    if (regra) mapa[regra[0]] = indice
  })
  const cnpjs = nomes
    .map((nome, indice) => ({ nome, indice }))
    .filter((item) => /^(cpf|cnpj|cpf cnpj)$/.test(item.nome) && !Object.values(mapa).includes(item.indice))
  for (const item of cnpjs) {
    const anterior = nomes[item.indice - 1] || ''
    if (!('cnpj_cedente' in mapa) && /benefici|cedente|favorecido/.test(anterior)) mapa.cnpj_cedente = item.indice
    else if (!('cnpj_sacado' in mapa) && /pagador|sacado/.test(anterior)) mapa.cnpj_sacado = item.indice
    else if (!('cnpj_cedente' in mapa)) mapa.cnpj_cedente = item.indice
    else if (!('cnpj_sacado' in mapa)) mapa.cnpj_sacado = item.indice
  }
  return mapa
}

function linhaDe(celulas, mapa) {
  const pegar = (campo) => (campo in mapa ? celulas[mapa[campo]] : '')
  const vencimento = dataIso(pegar('vencimento'))
  const valor = valorNumero(pegar('valor'))
  const codigo = texto(pegar('codigo'))
  const cedente = texto(pegar('cedente'))
  const sacado = texto(pegar('sacado'))
  if (!vencimento && valor == null && !cedente && !sacado && !codigo) return null
  return {
    cedente,
    cnpj_cedente: digitos(pegar('cnpj_cedente')),
    sacado,
    cnpj_sacado: digitos(pegar('cnpj_sacado')),
    vencimento,
    valor,
    codigo,
    situacao: texto(pegar('situacao')),
    documento: texto(pegar('documento')),
  }
}

export function lerPlanilha(buffer) {
  const amostra = buffer.subarray(0, 240).toString('latin1')
  if (/^(001|033|104|237|341|756)\d{4}/.test(amostra.trim()) && amostra.length >= 240) {
    throw new Error('Arquivo CNAB. Exporte a planilha de DDA do Itaú ou do Banco do Brasil.')
  }
  const livro = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const linhas = []
  for (const nome of livro.SheetNames) {
    const grade = XLSX.utils.sheet_to_json(livro.Sheets[nome], { header: 1, raw: true, defval: '' })
    const conta = contaDoArquivo(grade)
    let mapa = null
    for (const celulas of grade) {
      if (!Array.isArray(celulas) || celulas.every((item) => texto(item) === '')) continue
      if (!mapa) {
        const candidato = mapaColunas(celulas)
        if ('vencimento' in candidato && 'valor' in candidato) {
          mapa = candidato
          continue
        }
      }
      if (!mapa) continue
      const linha = linhaDe(celulas, mapa)
      if (!linha) continue
      if (!linha.cnpj_sacado && conta.cnpj_sacado) linha.cnpj_sacado = conta.cnpj_sacado
      if (!linha.sacado && conta.sacado) linha.sacado = conta.sacado
      linhas.push(linha)
    }
    if (linhas.length) break
  }
  if (!linhas.length) {
    throw new Error('Não achei vencimento e valor nessa planilha. Use a exportação de DDA do banco.')
  }
  return linhas
}

function chaveDocumento(linha) {
  const codigo = digitos(linha.codigo)
  if (codigo.length >= 44) return codigo
  if (linha.documento && linha.documento.length <= 40) return linha.documento
  return `DDA|${linha.cnpj_sacado}|${linha.cnpj_cedente}|${linha.vencimento}|${linha.valor}`
}

function pago(situacao) {
  const nome = normalizar(situacao)
  if (!nome) return false
  return /pago|liquid|baixad|cancel/.test(nome)
}

function acharEmpresa(linha, empresas) {
  const cnpj = linha.cnpj_sacado
  if (cnpj) {
    const porCnpj = empresas.find((empresa) => digitos(empresa.cnpj) === cnpj)
    if (porCnpj) return porCnpj
  }
  const nome = normalizar(linha.sacado)
  if (!nome) return null
  return empresas.find((empresa) => {
    const apelido = normalizar(empresa.apelido)
    const razao = normalizar(empresa.razao_social)
    return nome === apelido || nome === razao || (apelido && nome.includes(apelido)) || (razao && nome.includes(razao))
  }) || null
}

function acharFornecedor(linha, fornecedores) {
  const cnpj = linha.cnpj_cedente
  if (cnpj) {
    const porCnpj = fornecedores.find((fornecedor) => digitos(fornecedor.cpf_cnpj) === cnpj)
    if (porCnpj) return porCnpj
  }
  const nome = normalizar(linha.cedente)
  if (nome.length < 2) return null
  return fornecedores.find((fornecedor) => normalizar(fornecedor.nome) === nome) || null
}

export function classificar(linhas, { empresas, fornecedores, existentes }) {
  const vistos = new Set(existentes)
  return linhas.map((linha) => {
    const empresa = acharEmpresa(linha, empresas)
    const fornecedor = acharFornecedor(linha, fornecedores)
    const documento = chaveDocumento(linha)
    let motivo = ''
    if (pago(linha.situacao)) motivo = 'Pago ou baixado'
    else if (linha.valor == null || !linha.vencimento) motivo = 'Sem valor ou vencimento'
    else if (!empresa) motivo = 'Empresa não encontrada'
    else if (vistos.has(`${empresa.id}|${documento}`)) motivo = 'Já lançado'
    const pronto = !motivo
    if (pronto) vistos.add(`${empresa.id}|${documento}`)
    return {
      ...linha,
      documento_ref: documento,
      competencia: linha.vencimento ? competenciaDe(linha.vencimento) : '',
      empresa_id: empresa?.id || null,
      empresa: empresa?.apelido || '',
      fornecedor_id: fornecedor?.id || null,
      fornecedor: fornecedor?.nome || linha.cedente,
      plano_conta_id: fornecedor?.plano_conta_id || null,
      pronto,
      motivo,
    }
  })
}
