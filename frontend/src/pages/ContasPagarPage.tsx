import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { api, brl, type Despesa, type Empresa, type Fornecedor } from '../api'

const STATUS: Record<string, string> = {
  rascunho: 'A classificar', classificada: 'Classificada', pronta: 'Para autorizar', autorizada: 'Autorizada',
  enviada: 'Enviada', paga: 'Paga', conciliada: 'Conciliada', bloqueada_duplicata: 'Duplicata',
}
const CODIGO: Record<string, string> = {
  folha: 'Folha', cadastro: 'Cadastro', chave_pix: 'Chave PIX',
  boleto: 'Boleto', guia: 'Guia', dinheiro: 'Dinheiro', online: 'Online',
}
const FILTROS = ['Todas', 'Para autorizar', 'Vencidas', 'NF confirmada'] as const

const aberta = (e: Despesa) => !['paga', 'conciliada', 'cancelada'].includes(e.status)
const hoje = new Date().toISOString().slice(0, 10)

function dataLocal(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

function periodoAtual() {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 1) % 7))
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 7)
  return { de: dataLocal(inicio), ate: dataLocal(fim) }
}

export function ContasPagarPage() {
  const navigate = useNavigate()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loja, setLoja] = useState('')
  const [busca, setBusca] = useState('')
  const [de, setDe] = useState(() => periodoAtual().de)
  const [ate, setAte] = useState(() => periodoAtual().ate)
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>('Todas')
  const [pagina, setPagina] = useState(0)
  const [porPagina, setPorPagina] = useState(20)
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<Despesa | null>(null)
  const [excluir, setExcluir] = useState<Despesa | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [aviso, setAviso] = useState('')
  const [erroExcluir, setErroExcluir] = useState('')

  const carregar = (empresa = loja) => api.despesas(empresa || undefined).then(setDespesas).catch(() => setDespesas([]))

  useEffect(() => {
    api.empresas().then(setEmpresas).catch(() => undefined)
    carregar('')
  }, [])

  const noPeriodo = useMemo(() => despesas.filter((e) => {
    const semana = e.competencia || e.vencimento
    if (!semana) return !de && !ate
    if (de && semana < de) return false
    if (ate && semana > ate) return false
    return true
  }), [despesas, de, ate])

  const linhas = useMemo(() => noPeriodo.filter((e) => {
    const texto = `${e.descricao} ${e.fornecedor ?? ''} ${e.origem} ${e.plano ?? ''}`.toLowerCase()
    if (busca && !texto.includes(busca.toLowerCase())) return false
    if (filtro === 'Para autorizar') return e.status === 'pronta'
    if (filtro === 'Vencidas') return aberta(e) && !!e.vencimento && e.vencimento < hoje
    if (filtro === 'NF confirmada') return e.nf_confirmada
    return true
  }), [noPeriodo, busca, filtro])

  useEffect(() => { setPagina(0) }, [busca, de, ate, loja, filtro])

  const visiveis = linhas.slice(pagina * porPagina, pagina * porPagina + porPagina)

  const soma = (pred: (e: Despesa) => boolean) => noPeriodo.filter(pred).reduce((a, e) => a + Number(e.valor), 0)
  const lojas = empresas.filter((e) => e.tipo === 'loja')

  const nota = (e: Despesa) => {
    const doc = e.documento_ref && !e.documento_ref.startsWith('BANCO-') && !e.documento_ref.startsWith('DDA|') && e.documento_ref.length <= 20
      ? `NF ${e.documento_ref}` : ''
    return [e.fornecedor, e.plano, doc].filter(Boolean).join(' · ')
  }

  return (
    <Stack spacing={2} sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
        <TextField size="small" placeholder="Buscar lançamento" value={busca} onChange={(ev) => setBusca(ev.target.value)} sx={{ minWidth: 280, bgcolor: 'background.paper' }} />
        <TextField size="small" label="De" type="date" value={de} onChange={(ev) => setDe(ev.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150, bgcolor: 'background.paper' }} />
        <TextField size="small" label="Até" type="date" value={ate} onChange={(ev) => setAte(ev.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150, bgcolor: 'background.paper' }} />
        <TextField select size="small" label="Loja" value={loja} onChange={(ev) => { setLoja(ev.target.value); carregar(ev.target.value) }} sx={{ minWidth: 180, bgcolor: 'background.paper' }}>
          <MenuItem value="">Todas as lojas</MenuItem>
          {lojas.map((e) => <MenuItem key={e.id} value={e.id}>{e.apelido}</MenuItem>)}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={() => navigate('/integracoes')}>Importar DDA</Button>
        <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => setAberto(true)}>Nova despesa</Button>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
        <Resumo rotulo="A pagar" valor={brl(soma(aberta))} detalhe={`${noPeriodo.filter(aberta).length} em aberto`} />
        <Resumo rotulo="Pago" valor={brl(soma((e) => e.status === 'paga' || e.status === 'conciliada'))} detalhe="já baixadas" />
        <Resumo rotulo="Para autorizar" valor={brl(soma((e) => e.status === 'pronta'))} detalhe="aguardando o Felipe" />
        <Resumo rotulo="Vencida" valor={brl(soma((e) => aberta(e) && !!e.vencimento && e.vencimento < hoje))} detalhe="sem pagar" />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {FILTROS.map((item) => (
          <Chip
            key={item}
            label={CODIGO[item] || item}
            variant="outlined"
            onClick={() => { setFiltro(item); setPagina(0) }}
            sx={{
              bgcolor: filtro === item ? 'rgba(255, 90, 10, 0.12)' : '#0D161F',
              borderColor: filtro === item ? '#FF5A0A' : '#1C2A35',
              color: filtro === item ? '#fff' : '#C2CDD5',
            }}
          />
        ))}
      </Stack>

      <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {['Status', 'Descrição', 'Origem', 'Nota fiscal', 'Forma de pagamento', 'Código', 'Vencimento', 'Valor', ''].map((h) => (
                <TableCell key={h || 'acao'} align={h === 'Valor' ? 'right' : 'left'}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow><TableCell colSpan={9} sx={{ color: 'text.secondary', py: 4 }}>Nenhuma despesa nesse filtro.</TableCell></TableRow>
            )}
            {visiveis.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell>
                  <Chip size="small" label={STATUS[e.status] || e.status} variant="outlined" sx={{ color: 'text.secondary', borderColor: 'divider' }} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 400 }}>{e.descricao}</Typography>
                  {e.fornecedor
                    ? <Typography variant="caption" color="text.secondary">{nota(e)}</Typography>
                    : <Chip size="small" label="Sem fornecedor" variant="outlined" sx={{ mt: 0.5, height: 22, color: '#E8A87C', borderColor: '#6B4A32', fontWeight: 500 }} />}
                </TableCell>
                <TableCell>{e.origem}</TableCell>
                <TableCell>
                  {e.nf_confirmada
                    ? <Chip size="small" icon={<CheckIcon />} label="NF confirmada" sx={{ bgcolor: '#1F8A4C', color: '#fff', fontWeight: 600, '& .MuiChip-icon': { color: '#fff' } }} />
                    : <Chip size="small" label="NF pendente" variant="outlined" sx={{ color: 'text.secondary', borderColor: 'divider' }} />}
                </TableCell>
                <TableCell>{CODIGO[e.forma_pagamento || ''] || '—'}</TableCell>
                <TableCell><Codigo forma={e.forma_pagamento} pagamento={e.pagamento} /></TableCell>
                <TableCell sx={{ color: aberta(e) && e.vencimento && e.vencimento < hoje ? 'error.main' : 'inherit' }}>
                  {e.vencimento ? e.vencimento.split('-').reverse().join('/') : '—'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{brl(Number(e.valor))}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => setEditando(e)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}>Abrir</Button>
                  <Button size="small" onClick={() => { setErroExcluir(''); setExcluir(e) }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'transparent' } }}>Excluir</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <TablePagination
        component="div"
        count={linhas.length}
        page={pagina}
        onPageChange={(_, nova) => setPagina(nova)}
        rowsPerPage={porPagina}
        onRowsPerPageChange={(ev) => { setPorPagina(Number(ev.target.value)); setPagina(0) }}
        rowsPerPageOptions={[20, 50, 100]}
        labelRowsPerPage="Por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        sx={{ flexShrink: 0, borderTop: '1px solid #1C2A35' }}
      />

      <Dialog open={!!excluir} onClose={() => { if (!excluindo) setExcluir(null) }}>
        <DialogTitle>Deseja excluir?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{excluir?.descricao}</Typography>
          {erroExcluir && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{erroExcluir}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExcluir(null)} disabled={excluindo}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={excluindo}
            onClick={async () => {
              if (!excluir) return
              setExcluindo(true)
              try {
                await api.excluirDespesa(excluir.id)
                setExcluir(null)
                carregar()
                setAviso('Despesa excluída.')
              } catch (err) {
                setErroExcluir(err instanceof Error ? err.message : 'Não excluiu')
              } finally {
                setExcluindo(false)
              }
            }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <DespesaForm
        aberto={aberto || !!editando}
        inicial={editando}
        empresas={empresas}
        onFechar={() => { setAberto(false); setEditando(null) }}
        onSalvou={(mensagem) => { setAberto(false); setEditando(null); carregar(); setAviso(mensagem) }}
      />
      <Snackbar open={!!aviso} autoHideDuration={3200} onClose={() => setAviso('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setAviso('')} sx={{ bgcolor: '#1F8A4C' }}>{aviso}</Alert>
      </Snackbar>
    </Stack>
  )
}

function Codigo({ forma, pagamento }: { forma: string | null; pagamento: string | null }) {
  const texto = (pagamento || '').trim()
  if (forma === 'folha' || texto.toLowerCase() === 'folha') return <Typography sx={{ fontSize: 13 }}>—</Typography>
  if ((forma === 'chave_pix' || forma === 'boleto') && texto) return <Copia texto={texto} />
  return <Typography sx={{ fontSize: 13 }}>—</Typography>
}

function Copia({ texto }: { texto: string }) {
  const curto = texto.length > 22 ? `${texto.slice(0, 22)}…` : texto
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{curto}</Typography>
      <IconButton size="small" aria-label="Copiar para pagar" onClick={() => navigator.clipboard.writeText(texto)}>
        <ContentCopyIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Stack>
  )
}

function Resumo({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.5, minWidth: 180, flex: 1 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.secondary' }}>{rotulo}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{valor}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 400, color: 'text.secondary' }}>{detalhe}</Typography>
    </Paper>
  )
}

const lista = { listbox: { sx: { maxHeight: 240, fontSize: 14 } } }

function aoDigitarValor(bruto: string) {
  const s = bruto.replace(/[^\d,]/g, '')
  const [a, b] = s.split(',')
  const inteiro = (a || '').replace(/^0+(?=\d)/, '')
  const grupo = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (!s) return ''
  if (s.includes(',')) return `R$ ${grupo || '0'},${(b || '').slice(0, 2)}`
  return `R$ ${grupo}`
}

function parseMoeda(texto: string) {
  const limpo = texto.replace(/[^\d,]/g, '').replace(/\./g, '').replace(',', '.')
  return Number(limpo)
}

function DespesaForm({ aberto, inicial, empresas, onFechar, onSalvou }: {
  aberto: boolean
  inicial: Despesa | null
  empresas: Empresa[]
  onFechar: () => void
  onSalvou: (mensagem: string) => void
}) {
  const lojas = empresas.filter((e) => e.tipo === 'loja')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [documento, setDocumento] = useState('')
  const [origem, setOrigem] = useState('')
  const [conta, setConta] = useState('')
  const [planoId, setPlanoId] = useState('')
  const [forma, setForma] = useState('boleto')
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null)
  const [buscaFor, setBuscaFor] = useState('')
  const [hits, setHits] = useState<Fornecedor[]>([])
  const [pagamento, setPagamento] = useState('')
  const [erro, setErro] = useState('')

  const pedeCodigo = forma === 'boleto' || forma === 'chave_pix'

  useEffect(() => {
    if (!aberto) return
    setErro('')
    setHits([])
    if (!inicial) {
      setDescricao(''); setValor(''); setVencimento(''); setDocumento('')
      setOrigem(empresas.find((e) => e.tipo === 'loja')?.id || '')
      setConta(''); setPlanoId(''); setForma('boleto')
      setFornecedor(null); setBuscaFor(''); setPagamento('')
      return
    }
    setDescricao(inicial.descricao)
    setValor(brl(Number(inicial.valor)))
    setVencimento(inicial.vencimento || '')
    setDocumento(inicial.documento_ref || '')
    setOrigem(inicial.origem_id)
    setConta(inicial.conta_saida_id || '')
    setPlanoId(inicial.plano_conta_id || '')
    setForma(inicial.forma_pagamento || 'boleto')
    setFornecedor(inicial.fornecedor_id ? { id: inicial.fornecedor_id, nome: inicial.fornecedor || '', plano_conta_id: inicial.plano_conta_id, plano: inicial.plano } : null)
    setBuscaFor(inicial.fornecedor || '')
    setPagamento(inicial.pagamento || '')
  }, [aberto, inicial, empresas])

  const buscar = async (q: string) => {
    setBuscaFor(q)
    if (q.trim().length < 2) { setHits([]); return }
    setHits(await api.fornecedores(q.trim()))
  }

  const escolherFornecedor = (item: Fornecedor | null) => {
    setFornecedor(item)
    setBuscaFor(item?.nome || '')
    setPlanoId(item?.plano_conta_id || '')
    setHits([])
  }

  const salvar = async () => {
    try {
      setErro('')
      const numero = parseMoeda(valor)
      const corpo = {
        descricao: descricao.trim(),
        valor: numero,
        vencimento: vencimento || null,
        documento_ref: documento.trim() || null,
        forma_pagamento: forma,
        empresa_origem_id: origem,
        conta_saida_id: conta || null,
        plano_conta_id: fornecedor?.plano_conta_id || planoId || null,
        fornecedor_id: fornecedor?.id || null,
        dados_pagamento: pedeCodigo ? pagamento.trim() || null : null,
      }
      if (inicial) await api.atualizarDespesa(inicial.id, corpo)
      else await api.criarDespesa(corpo)
      onSalvou(inicial ? 'Despesa atualizada.' : 'Despesa cadastrada.')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não salvou')
    }
  }

  return (
    <Drawer anchor="right" open={aberto} onClose={onFechar} slotProps={{ paper: { sx: { width: 420 } } }}>
      <Stack spacing={1.5} sx={{ p: 3, overflow: 'auto' }}>
        <Typography variant="h6">{inicial ? 'Editar despesa' : 'Nova despesa'}</Typography>
          <TextField label="Descrição" size="small" value={descricao} onChange={(ev) => setDescricao(ev.target.value)} />
          <TextField
            label="Valor"
            size="small"
            value={valor}
            placeholder="R$ 0,00"
            onChange={(ev) => setValor(aoDigitarValor(ev.target.value))}
            onBlur={() => setValor((atual) => atual && Number.isFinite(parseMoeda(atual)) ? brl(parseMoeda(atual)) : '')}
          />
          <TextField label="Vencimento" size="small" type="date" value={vencimento} onChange={(ev) => setVencimento(ev.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Documento" size="small" value={documento} onChange={(ev) => setDocumento(ev.target.value)} />
          <Autocomplete
            size="small"
            options={lojas}
            getOptionLabel={(e) => e.apelido}
            value={lojas.find((e) => e.id === origem) || null}
            onChange={(_, item) => setOrigem(item?.id || '')}
            slotProps={lista}
            renderInput={(params) => <TextField {...params} label="Loja" />}
          />
          <Autocomplete
            size="small"
            options={hits}
            getOptionLabel={(item) => item.nome}
            filterOptions={(opcoes) => opcoes}
            inputValue={buscaFor}
            value={fornecedor}
            onInputChange={(_, texto, motivo) => { if (motivo === 'input') buscar(texto) }}
            onChange={(_, item) => escolherFornecedor(item)}
            slotProps={lista}
            renderInput={(params) => <TextField {...params} label="Fornecedor" placeholder="Buscar" />}
            renderOption={(props, item) => (
              <li {...props} key={item.id}>{item.nome}{item.plano ? ` · ${item.plano}` : ''}</li>
            )}
          />
          {fornecedor?.plano && <Typography variant="body2" color="text.secondary">Plano de contas: {fornecedor.plano}</Typography>}
          <TextField select label="Forma de pagamento" size="small" value={forma} onChange={(ev) => setForma(ev.target.value)}>
            {Object.entries(CODIGO).map(([id, nome]) => <MenuItem key={id} value={id}>{nome}</MenuItem>)}
          </TextField>
          {pedeCodigo && (
            <TextField
              label={forma === 'boleto' ? 'Código de barras do boleto' : 'Chave PIX'}
              size="small"
              value={pagamento}
              onChange={(ev) => setPagamento(ev.target.value)}
              placeholder="Para copiar na hora de pagar"
            />
          )}
          {erro && <Typography color="error" variant="body2">{erro}</Typography>}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={salvar}>{inicial ? 'Salvar' : 'Criar rascunho'}</Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}
