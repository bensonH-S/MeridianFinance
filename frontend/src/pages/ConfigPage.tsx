import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import { api, type Conta, type Empresa, type Fornecedor, type Plano } from '../api'

const CARDS = [
  ['empresas', 'Empresas', 'Lojas e holdings. A loja entra com BK.', StorefrontOutlinedIcon],
  ['contas', 'Contas bancárias', 'Caixa, Banco do Brasil e Itaú, com o nome do cadastro.', AccountBalanceOutlinedIcon],
  ['plano', 'Plano de contas', 'Classificação do que é a pagar.', AccountTreeOutlinedIcon],
  ['fornecedores', 'Fornecedores', 'Cadastro financeiro e o plano padrão.', LocalShippingOutlinedIcon],
  ['formas', 'Formas de pagamento', 'Boleto e guia no geral. Folha, cadastro e PIX só no freelancer.', PaymentsOutlinedIcon],
  ['usuarios', 'Usuários', 'Quem prepara e quem autoriza.', PeopleOutlinedIcon],
] as const

export function ConfigPage() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
      {CARDS.map(([id, titulo, texto, Icon]) => (
        <Paper
          key={id}
          component={Link}
          to={`/configuracoes/${id}`}
          variant="outlined"
          sx={{
            p: 2.5,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            gap: 1.5,
            alignItems: 'flex-start',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
          }}
        >
          <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', flexShrink: 0 }}>
            <Icon fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 500, mb: 0.5 }}>{titulo}</Typography>
            <Typography variant="body2" color="text.secondary">{texto}</Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  )
}

export function ConfigDetalhePage() {
  const { secao = '' } = useParams()
  const navigate = useNavigate()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [plano, setPlano] = useState<Plano[]>([])
  const [qPlano, setQPlano] = useState('')
  const [qFor, setQFor] = useState('')
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])

  useEffect(() => {
    if (secao === 'empresas') api.empresas().then(setEmpresas).catch(() => undefined)
    if (secao === 'contas') api.contas().then(setContas).catch(() => undefined)
    if (secao === 'plano') api.plano().then(setPlano).catch(() => undefined)
  }, [secao])

  const planos = plano.filter((p) => p.nome.toLowerCase().includes(qPlano.toLowerCase())).slice(0, 50)

  return (
    <Stack spacing={2}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/configuracoes')} sx={{ alignSelf: 'flex-start' }}>Voltar</Button>
      {secao === 'empresas' && (
        <Tabela headers={['Empresa', 'Tipo', 'Razão social']} rows={empresas.map((e) => [e.apelido, e.tipo === 'loja' ? 'Loja' : 'Holding', e.razao_social])} />
      )}
      {secao === 'contas' && (
        <Tabela headers={['Nome', 'Tipo', 'Empresa']} rows={contas.map((c) => [c.nome, c.tipo === 'dinheiro' ? 'Conta Dinheiro' : 'Conta Corrente', c.apelido])} />
      )}
      {secao === 'plano' && (
        <>
          <TextField size="small" placeholder="Buscar plano" value={qPlano} onChange={(ev) => setQPlano(ev.target.value)} sx={{ maxWidth: 360, bgcolor: 'background.paper' }} />
          <Tabela headers={['Nome']} rows={planos.map((p) => [p.nome])} />
        </>
      )}
      {secao === 'fornecedores' && (
        <>
          <TextField size="small" placeholder="Nome do fornecedor" value={qFor} onChange={async (ev) => {
            const valor = ev.target.value
            setQFor(valor)
            setFornecedores(valor.trim().length < 2 ? [] : await api.fornecedores(valor.trim()))
          }} sx={{ maxWidth: 360, bgcolor: 'background.paper' }} />
          <Tabela headers={['Nome', 'Plano padrão']} rows={fornecedores.map((f) => [f.nome, f.plano || '—'])} />
        </>
      )}
      {secao === 'formas' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2.5 }}><Typography sx={{ fontWeight: 500 }}>Despesa em geral</Typography><Typography variant="body2" color="text.secondary">Boleto, guia, dinheiro e online.</Typography></Paper>
          <Paper variant="outlined" sx={{ p: 2.5 }}><Typography sx={{ fontWeight: 500 }}>Freelancer e treinamento</Typography><Typography variant="body2" color="text.secondary">Folha, cadastro ou chave PIX. O registro da pessoa continua no FreeControl.</Typography></Paper>
        </Box>
      )}
      {secao === 'usuarios' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2.5 }}><Typography sx={{ fontWeight: 500 }}>Financeiro</Typography><Typography variant="body2" color="text.secondary">Prepara o lançamento, do rascunho até deixar pronto.</Typography></Paper>
          <Paper variant="outlined" sx={{ p: 2.5 }}><Typography sx={{ fontWeight: 500 }}>Felipe</Typography><Typography variant="body2" color="text.secondary">Autoriza o que está pronto. Sem essa autorização nada segue ao banco.</Typography></Paper>
        </Box>
      )}
    </Stack>
  )
}

function Tabela({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Table size="small">
        <TableHead><TableRow>{headers.map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {rows.map((row, i) => <TableRow key={i} hover>{row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}</TableRow>)}
        </TableBody>
      </Table>
    </Paper>
  )
}
