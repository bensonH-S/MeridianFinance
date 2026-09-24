export type Empresa = { id: string; apelido: string; razao_social: string; tipo: 'loja' | 'holding' }
export type Conta = { id: string; empresa_id: string; nome: string; tipo: string; apelido: string }
export type Plano = { id: string; nome: string }
export type Fornecedor = { id: string; nome: string; plano_conta_id: string | null; plano: string | null }
export type Despesa = {
  id: string
  descricao: string
  valor: number
  vencimento: string | null
  forma_pagamento: string | null
  status: string
  documento_ref: string | null
  origem_id: string
  origem: string
  origem_razao: string
  fornecedor_id: string | null
  fornecedor: string | null
  plano_conta_id: string | null
  plano: string | null
  conta_saida_id: string | null
  conta_nome: string | null
  conta_empresa_id: string | null
  pagamento: string | null
}

const apiRoot = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Falha ao carregar')
  return res.json()
}

export const api = {
  empresas: () => get<Empresa[]>(`${apiRoot}/empresas`),
  contas: () => get<Conta[]>(`${apiRoot}/contas`),
  plano: () => get<Plano[]>(`${apiRoot}/plano`),
  despesas: (empresa?: string) => get<Despesa[]>(`${apiRoot}/despesas${empresa ? `?empresa=${empresa}` : ''}`),
  fornecedores: (q: string) => get<Fornecedor[]>(`${apiRoot}/fornecedores?q=${encodeURIComponent(q)}`),
  criarDespesa: async (body: Record<string, unknown>) => {
    const res = await fetch(`${apiRoot}/despesas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.erro || 'Não salvou')
    return data as { id: string; status: string }
  },
  atualizarDespesa: async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`${apiRoot}/despesas/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.erro || 'Não salvou')
    return data as { id: string; status: string }
  },
}

export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function ehLabor(nome: string) {
  const n = nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
  return n.includes('TREINAMENTO') || n.includes('TEMPORARIA') || n.includes('FREE')
}
