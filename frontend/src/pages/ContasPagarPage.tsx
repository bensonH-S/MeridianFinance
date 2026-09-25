import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
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
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined'
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

const TOM_STATUS: Record<string, { color: string; border: string; bg: string }> = {
  rascunho: { color: '#C5D0D8', border: '#3A4C5A', bg: 'transparent' },
  classificada: { color: '#B7E4C7', border: '#1F8A4C', bg: 'rgba(31,138,76,0.16)' },
  pronta: { color: '#FFD7C2', border: '#C45A28', bg: 'rgba(255,90,10,0.12)' },
  autorizada: { color: '#C5D4E0', border: '#3D5A73', bg: 'transparent' },
  enviada: { color: '#C5D4E0', border: '#3D5A73', bg: 'transparent' },
  paga: { color: '#9DCFB3', border: '#1F6B3A', bg: 'transparent' },
  conciliada: { color: '#9DCFB3', border: '#1F6B3A', bg: 'transparent' },
  bloqueada_duplicata: { color: '#FFB4B4', border: '#E23B3B', bg: 'rgba(226,59,59,0.14)' },
}

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
  const [marcadas, setMarcadas] = useState<string[]>([])
  const [classificando, setClassificando] = useState(false)
  const [fornecedorLote, setFornecedorLote] = useState<Fornecedor | null>(null)
  const [buscaLote, setBuscaLote] = useState('')
  const [hitsLote, setHitsLote] = useState<Fornecedor[]>([])
  const [aplicandoLote, setAplicandoLote] = useState(false)
  const [erroLote, setErroLote] = useState('')

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

  useEffect(() => { setPagina(0); setMarcadas([]) }, [busca, de, ate, loja, filtro])

  const visiveis = linhas.slice(pagina * porPagina, pagina * porPagina + porPagina)
  const idsVisiveis = visiveis.map((e) => e.id)
  const todasMarcadas = idsVisiveis.length > 0 && idsVisiveis.every((id) => marcadas.includes(id))
  const selecionadas = despesas.filter((e) => marcadas.includes(e.id))

  const soma = (pred: (e: Despesa) => boolean) => noPeriodo.filter(pred).reduce((a, e) => a + Number(e.valor), 0)
  const lojas = empresas.filter((e) => e.tipo === 'loja')
  const vencida = soma((e) => aberta(e) && !!e.vencimento && e.vencimento < hoje)

  const alternar = (id: string) => {
    setMarcadas((atual) => atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id])
  }

  const exportar = () => {
    const cabecalho = ['Status', 'Descrição', 'Fornecedor', 'Origem', 'Nota fiscal', 'Forma', 'Vencimento', 'Valor']
    const corpo = selecionadas.map((e) => [
      STATUS[e.status] || e.status,
      e.descricao,
      e.fornecedor || '',
      e.origem,
      e.nf_confirmada ? 'NF confirmada' : 'NF pendente',
      CODIGO[e.forma_pagamento || ''] || '',
      e.vencimento ? e.vencimento.split('-').reverse().join('/') : '',
      String(e.valor).replace('.', ','),
    ])
    const csv = [cabecalho, ...corpo].map((linha) => linha.map((celula) => `"${String(celula).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'contas-a-pagar.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const aplicarLote = async () => {
    if (!fornecedorLote) return
    setAplicandoLote(true)
    setErroLote('')
    try {
      await Promise.all(selecionadas.map((e) => api.atualizarDespesa(e.id, {
        descricao: e.descricao,
        valor: Number(e.valor),
        vencimento: e.vencimento,
        documento_ref: e.documento_ref,
        forma_pagamento: e.forma_pagamento,
        empresa_origem_id: e.origem_id,
        conta_saida_id: e.conta_saida_id,
        plano_conta_id: fornecedorLote.plano_conta_id,
        fornecedor_id: fornecedorLote.id,
        dados_pagamento: e.pagamento,
        competencia: e.competencia,
        status: fornecedorLote.plano_conta_id ? 'classificada' : e.status,
      })))
      setClassificando(false)
      setFornecedorLote(null)
      setBuscaLote('')
      setMarcadas([])
      carregar()
      setAviso(fornecedorLote.plano_conta_id
        ? `${selecionadas.length} despesa${selecionadas.length === 1 ? '' : 's'} classificada${selecionadas.length === 1 ? '' : 's'}.`
        : 'Fornecedor aplicado. Sem plano padrão, o status não mudou.')
    } catch (err) {
      setErroLote(err instanceof Error ? err.message : 'Não classificou')
    } finally {
      setAplicandoLote(false)
    }
  }

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
        <TextField
          select
          size="small"
          label="Loja"
          value={loja}
          onChange={(ev) => { setLoja(ev.target.value); carregar(ev.target.value) }}
          sx={{ minWidth: 200, bgcolor: 'background.paper', '& .MuiOutlinedInput-notchedOutline': { borderColor: loja ? '#FF5A0A' : undefined } }}
        >
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
        <Resumo rotulo="Vencida" valor={brl(vencida)} detalhe="sem pagar" alerta={vencida > 0} />
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

      {marcadas.length > 0 && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 1.5, py: 1, borderRadius: 2, bgcolor: '#101C28', border: '1px solid #1C2A35' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{marcadas.length} selecionada{marcadas.length === 1 ? '' : 's'}</Typography>
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={() => setMarcadas([])}>Limpar</Button>
          <Button size="small" variant="outlined" onClick={exportar}>Exportar</Button>
          <Button size="small" variant="contained" color="secondary" onClick={() => { setFornecedorLote(null); setBuscaLote(''); setHitsLote([]); setClassificando(true) }}>Classificar selecionados</Button>
        </Stack>
      )}

      <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={todasMarcadas}
                  indeterminate={marcadas.some((id) => idsVisiveis.includes(id)) && !todasMarcadas}
                  onChange={() => setMarcadas(todasMarcadas ? marcadas.filter((id) => !idsVisiveis.includes(id)) : [...new Set([...marcadas, ...idsVisiveis])])}
                  slotProps={{ input: { 'aria-label': 'Selecionar página' } }}
                />
              </TableCell>
              {['Status', 'Descrição', 'Origem', 'Nota fiscal', 'Forma de pagamento', 'Código', 'Vencimento', 'Valor', ''].map((h) => (
                <TableCell key={h || 'acao'} align={h === 'Valor' ? 'right' : 'left'}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow><TableCell colSpan={10} sx={{ color: 'text.secondary', py: 4 }}>Nenhuma despesa nesse filtro.</TableCell></TableRow>
            )}
            {visiveis.map((e) => {
              const tom = TOM_STATUS[e.status] || TOM_STATUS.rascunho
              return (
              <TableRow key={e.id} hover selected={marcadas.includes(e.id)}>
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={marcadas.includes(e.id)} onChange={() => alternar(e.id)} slotProps={{ input: { 'aria-label': `Selecionar ${e.descricao}` } }} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={STATUS[e.status] || e.status} variant="outlined" sx={{ height: 22, fontWeight: 500, color: tom.color, borderColor: tom.border, bgcolor: tom.bg }} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{e.descricao}</Typography>
                  {e.fornecedor
                    ? <Typography variant="caption" sx={{ display: 'block', color: '#C3CED6', lineHeight: 1.35 }}>{nota(e)}</Typography>
                    : <Chip size="small" label="Sem fornecedor" variant="outlined" sx={{ mt: 0.5, height: 22, color: '#FFB4B4', borderColor: '#E23B3B', bgcolor: 'rgba(226,59,59,0.14)', fontWeight: 600 }} />}
                </TableCell>
                <TableCell>{e.origem}</TableCell>
                <TableCell>
                  {e.nf_confirmada
                    ? <Chip size="small" icon={<CheckIcon />} label="NF confirmada" sx={{ bgcolor: '#1F8A4C', color: '#fff', fontWeight: 600, '& .MuiChip-icon': { color: '#fff' } }} />
                    : (
                      <Tooltip title="NF pendente">
                        <AttachFileOutlinedIcon aria-label="NF pendente" sx={{ fontSize: 18, color: '#9AABBA', transform: 'rotate(35deg)' }} />
                      </Tooltip>
                    )}
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
              )
            })}
          </TableBody>
        </Table>
        </Box>
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
          sx={{ flexShrink: 0, borderTop: '1px solid #1C2A35', bgcolor: '#101820' }}
        />
      </Paper>

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

      <Dialog open={classificando} onClose={() => { if (!aplicandoLote) setClassificando(false) }} fullWidth maxWidth="xs">
        <DialogTitle>Classificar selecionados</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>{marcadas.length} despesa{marcadas.length === 1 ? '' : 's'}. O fornecedor e o plano padrão valem para todas.</Typography>
          <Autocomplete
            size="small"
            options={hitsLote}
            getOptionLabel={(item) => item.nome}
            filterOptions={(opcoes) => opcoes}
            inputValue={buscaLote}
            value={fornecedorLote}
            onInputChange={(_, texto, motivo) => {
              if (motivo !== 'input') return
              setBuscaLote(texto)
              if (texto.trim().length < 2) { setHitsLote([]); return }
              api.fornecedores(texto.trim()).then(setHitsLote).catch(() => setHitsLote([]))
            }}
            onChange={(_, item) => { setFornecedorLote(item); setBuscaLote(item?.nome || '') }}
            renderInput={(params) => <TextField {...params} label="Fornecedor" placeholder="Buscar" autoFocus />}
            renderOption={(props, item) => (
              <li {...props} key={item.id}>{item.nome}{item.plano ? ` · ${item.plano}` : ''}</li>
            )}
          />
          {fornecedorLote?.plano && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Plano: {fornecedorLote.plano}</Typography>}
          {erroLote && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{erroLote}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClassificando(false)} disabled={aplicandoLote}>Cancelar</Button>
          <Button variant="contained" color="secondary" disabled={!fornecedorLote || aplicandoLote} onClick={aplicarLote}>
            {aplicandoLote ? 'Classificando…' : 'Classificar'}
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

function Resumo({ rotulo, valor, detalhe, alerta = false }: { rotulo: string; valor: string; detalhe: string; alerta?: boolean }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        minWidth: 180,
        flex: 1,
        ...(alerta ? {
          borderColor: '#E23B3B',
          bgcolor: 'rgba(226,59,59,0.08)',
          animation: 'vencida-pulso 2.6s ease-in-out infinite',
          '@keyframes vencida-pulso': {
            '0%, 100%': { boxShadow: '0 0 0 0 rgba(226,59,59,0)' },
            '50%': { boxShadow: '0 0 0 3px rgba(226,59,59,0.35)' },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        } : {}),
      }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 500, color: alerta ? '#FFB4B4' : 'text.secondary' }}>{rotulo}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, color: alerta ? '#FFD6D6' : 'inherit' }}>{valor}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 400, color: alerta ? '#E8A0A0' : 'text.secondary' }}>{detalhe}</Typography>
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
  const [abrindoNota, setAbrindoNota] = useState(false)
  const [abrindoBoleto, setAbrindoBoleto] = useState(false)

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
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              disabled={!inicial?.numero_nf || abrindoNota}
              onClick={async () => {
                if (!inicial) return
                setAbrindoNota(true)
                setErro('')
                try { await api.abrirNota(inicial.id) }
                catch (err) { setErro(err instanceof Error ? err.message : 'Não abriu a nota') }
                finally { setAbrindoNota(false) }
              }}
            >
              {abrindoNota ? 'Abrindo nota…' : 'Ver nota fiscal'}
            </Button>
            <Button
              variant="outlined"
              disabled={!inicial?.numero_nf || abrindoBoleto}
              onClick={async () => {
                if (!inicial) return
                setAbrindoBoleto(true)
                setErro('')
                try { await api.abrirBoleto(inicial.id) }
                catch (err) { setErro(err instanceof Error ? err.message : 'Não abriu o boleto') }
                finally { setAbrindoBoleto(false) }
              }}
            >
              {abrindoBoleto ? 'Abrindo boleto…' : 'Ver boleto'}
            </Button>
          </Stack>
          {erro && <Typography color="error" variant="body2">{erro}</Typography>}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={salvar}>{inicial ? 'Salvar' : 'Criar rascunho'}</Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}
