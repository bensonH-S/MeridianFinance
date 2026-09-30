import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import { api, type ConfigBkoffice, type Conta, type Empresa, type Fornecedor, type Plano } from '../api'
import { Barra, cnpjFormatado, PainelLateral, quando, Resumo, Resumos, Secao, Selo, TabelaConfig, Titulo, type Coluna } from '../components/ConfigUi'
import { AcessosBb } from './AcessosBb'

const CARDS = [
  ['empresas', 'Empresas', 'Lojas e holdings. A loja entra com BK.', StorefrontOutlinedIcon],
  ['contas', 'Contas bancárias', 'Caixa, Banco do Brasil e Itaú, com o nome do cadastro.', AccountBalanceOutlinedIcon],
  ['plano', 'Plano de contas', 'Classificação do que é a pagar.', AccountTreeOutlinedIcon],
  ['fornecedores', 'Fornecedores', 'Cadastro financeiro e o plano padrão.', LocalShippingOutlinedIcon],
  ['formas', 'Formas de pagamento', 'Boleto e guia no geral. Folha, cadastro e PIX só no freelancer.', PaymentsOutlinedIcon],
  ['usuarios', 'Usuários', 'Quem prepara e quem autoriza.', PeopleOutlinedIcon],
  ['bkoffice', 'BK Office', 'Usuário, senha e endereço da API que traz as vendas.', HubOutlinedIcon],
  ['bb', 'Banco do Brasil', 'Acesso da API de DDA, um por empresa.', AccountBalanceOutlinedIcon],
] as const

export function ConfigPage() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
      {CARDS.map(([id, titulo, texto, Icon]) => (
        <Paper
          key={id}
          component={Link}
          to={`/configuracoes/${id}`}
          variant="outlined"
          sx={{
            p: 2,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            gap: 1.5,
            alignItems: 'flex-start',
            transition: 'border-color 120ms',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', flexShrink: 0 }}>
            <Icon fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 0.25 }}>{titulo}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{texto}</Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  )
}

export function ConfigDetalhePage() {
  const { secao = '' } = useParams()
  const navigate = useNavigate()

  return (
    <Stack spacing={2} sx={{ height: '100%', minHeight: 0, overflow: 'auto', pb: 2 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/configuracoes')} sx={{ alignSelf: 'flex-start' }}>Voltar</Button>
      {secao === 'empresas' && <Empresas />}
      {secao === 'contas' && <Contas />}
      {secao === 'plano' && <PlanoContas />}
      {secao === 'fornecedores' && <Fornecedores />}
      {secao === 'formas' && <Formas />}
      {secao === 'usuarios' && <Usuarios />}
      {secao === 'bkoffice' && <BkOffice />}
      {secao === 'bb' && <AcessosBb />}
    </Stack>
  )
}

function useBusca<T>(linhas: T[], texto: (linha: T) => string) {
  const [busca, setBusca] = useState('')
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return linhas
    const digitos = termo.replace(/\D/g, '')
    return linhas.filter((l) => {
      const alvo = texto(l).toLowerCase()
      return alvo.includes(termo) || (digitos.length >= 3 && alvo.replace(/\D/g, '').includes(digitos))
    })
  }, [linhas, busca, texto])
  return { busca, setBusca, filtradas }
}

function Erro({ erro }: { erro: string }) {
  return erro ? <Alert severity="error">{erro}</Alert> : null
}

function mensagem(err: unknown) {
  return err instanceof Error ? err.message : 'Não carregou'
}

const textoEmpresa = (e: Empresa) => `${e.apelido} ${e.razao_social} ${e.cnpj || ''}`

function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [erro, setErro] = useState('')
  useEffect(() => { api.empresas().then(setEmpresas).catch((err) => setErro(mensagem(err))) }, [])
  const { busca, setBusca, filtradas } = useBusca(empresas, textoEmpresa)

  const lojas = empresas.filter((e) => e.tipo === 'loja').length
  const colunas: Coluna<Empresa>[] = [
    { titulo: 'Empresa', render: (e) => <Titulo texto={e.apelido} sub={e.razao_social} /> },
    { titulo: 'CNPJ', render: (e) => <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{cnpjFormatado(e.cnpj)}</Box> },
    { titulo: 'Tipo', render: (e) => <Selo texto={e.tipo === 'loja' ? 'Loja' : 'Holding'} tom={e.tipo === 'loja' ? 'neutro' : 'info'} /> },
  ]

  return (
    <Stack spacing={2}>
      <Resumos>
        <Resumo rotulo="Empresas ativas" valor={String(empresas.length)} detalhe="no cadastro do Finance" />
        <Resumo rotulo="Lojas" valor={String(lojas)} detalhe="operação BK" />
        <Resumo rotulo="Holdings" valor={String(empresas.length - lojas)} detalhe="administrativo" />
      </Resumos>
      <Barra busca={busca} onBusca={setBusca} placeholder="Buscar empresa ou CNPJ" />
      <Erro erro={erro} />
      <TabelaConfig colunas={colunas} linhas={filtradas} chave={(e) => e.id} vazio="Nenhuma empresa encontrada." />
    </Stack>
  )
}

const textoConta = (c: Conta) => `${c.nome} ${c.apelido}`

function Contas() {
  const [contas, setContas] = useState<Conta[]>([])
  const [erro, setErro] = useState('')
  useEffect(() => { api.contas().then(setContas).catch((err) => setErro(mensagem(err))) }, [])
  const { busca, setBusca, filtradas } = useBusca(contas, textoConta)

  const dinheiro = contas.filter((c) => c.tipo === 'dinheiro').length
  const colunas: Coluna<Conta>[] = [
    { titulo: 'Conta', render: (c) => <Titulo texto={c.nome} /> },
    { titulo: 'Empresa', render: (c) => c.apelido },
    { titulo: 'Tipo', render: (c) => <Selo texto={c.tipo === 'dinheiro' ? 'Conta dinheiro' : 'Conta corrente'} tom={c.tipo === 'dinheiro' ? 'neutro' : 'info'} /> },
  ]

  return (
    <Stack spacing={2}>
      <Resumos>
        <Resumo rotulo="Contas ativas" valor={String(contas.length)} detalhe="em todas as empresas" />
        <Resumo rotulo="Contas correntes" valor={String(contas.length - dinheiro)} detalhe="Banco do Brasil e Itaú" />
        <Resumo rotulo="Contas dinheiro" valor={String(dinheiro)} detalhe="caixa das lojas" />
      </Resumos>
      <Barra busca={busca} onBusca={setBusca} placeholder="Buscar conta ou empresa" />
      <Erro erro={erro} />
      <TabelaConfig colunas={colunas} linhas={filtradas} chave={(c) => c.id} vazio="Nenhuma conta encontrada." />
    </Stack>
  )
}

const textoPlano = (p: Plano) => p.nome
const LIMITE_PLANO = 200

function PlanoContas() {
  const [plano, setPlano] = useState<Plano[]>([])
  const [erro, setErro] = useState('')
  useEffect(() => { api.plano().then(setPlano).catch((err) => setErro(mensagem(err))) }, [])
  const { busca, setBusca, filtradas } = useBusca(plano, textoPlano)
  const colunas: Coluna<Plano>[] = [{ titulo: 'Plano', render: (p) => <Titulo texto={p.nome} /> }]

  return (
    <Stack spacing={2}>
      <Resumos>
        <Resumo rotulo="Planos a pagar" valor={String(plano.length)} detalhe="ativos para classificação" />
        <Resumo rotulo="Na busca" valor={String(filtradas.length)} detalhe={busca ? `para “${busca}”` : 'sem filtro'} />
      </Resumos>
      <Barra busca={busca} onBusca={setBusca} placeholder="Buscar plano" />
      <Erro erro={erro} />
      <TabelaConfig
        colunas={colunas}
        linhas={filtradas.slice(0, LIMITE_PLANO)}
        chave={(p) => p.id}
        vazio="Nenhum plano encontrado."
        rodape={filtradas.length > LIMITE_PLANO ? `Mostrando ${LIMITE_PLANO} de ${filtradas.length}. Refine a busca.` : undefined}
      />
    </Stack>
  )
}

function Fornecedores() {
  const [busca, setBusca] = useState('')
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    const termo = busca.trim()
    if (termo.length < 2) { setFornecedores([]); return }
    const t = setTimeout(() => {
      api.fornecedores(termo, 100).then(setFornecedores).catch((err) => setErro(mensagem(err)))
    }, 250)
    return () => clearTimeout(t)
  }, [busca])

  const semPlano = fornecedores.filter((f) => !f.plano).length
  const colunas: Coluna<Fornecedor>[] = [
    { titulo: 'Fornecedor', render: (f) => <Titulo texto={f.nome} /> },
    { titulo: 'CPF/CNPJ', render: (f) => <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{cnpjFormatado(f.cpf_cnpj)}</Box> },
    { titulo: 'Plano padrão', render: (f) => (f.plano ? f.plano : <Selo texto="Sem plano" tom="alerta" />) },
  ]

  return (
    <Stack spacing={2}>
      <Resumos>
        <Resumo rotulo="Encontrados" valor={String(fornecedores.length)} detalhe={busca.trim().length >= 2 ? 'na busca atual' : 'digite para buscar'} />
        <Resumo rotulo="Com plano padrão" valor={String(fornecedores.length - semPlano)} detalhe="classificam sozinhos" />
        <Resumo rotulo="Sem plano padrão" valor={String(semPlano)} detalhe="pedem classificação manual" />
      </Resumos>
      <Barra busca={busca} onBusca={setBusca} placeholder="Buscar fornecedor ou CNPJ" />
      <Erro erro={erro} />
      <TabelaConfig
        colunas={colunas}
        linhas={fornecedores}
        chave={(f) => f.id}
        vazio={busca.trim().length < 2 ? 'Digite ao menos 2 letras para buscar.' : 'Nenhum fornecedor encontrado.'}
        rodape={fornecedores.length >= 100 ? 'Mostrando os 100 primeiros. Refine a busca.' : undefined}
      />
    </Stack>
  )
}

type Forma = { id: string; forma: string; uso: 'geral' | 'freelancer'; detalhe: string }

const FORMAS: Forma[] = [
  { id: 'boleto', forma: 'Boleto', uso: 'geral', detalhe: 'Pago pelo código de barras. Pode chegar pelo DDA.' },
  { id: 'guia', forma: 'Guia', uso: 'geral', detalhe: 'Guia de recolhimento.' },
  { id: 'dinheiro', forma: 'Dinheiro', uso: 'geral', detalhe: 'Pago em espécie.' },
  { id: 'online', forma: 'Online', uso: 'geral', detalhe: 'Pago online.' },
  { id: 'folha', forma: 'Folha', uso: 'freelancer', detalhe: 'Pago junto da folha.' },
  { id: 'cadastro', forma: 'Cadastro', uso: 'freelancer', detalhe: 'Pago na conta do cadastro da pessoa, que fica no FreeControl.' },
  { id: 'pix', forma: 'Chave PIX', uso: 'freelancer', detalhe: 'Pago por chave PIX.' },
]

function Formas() {
  const colunas: Coluna<Forma>[] = [
    { titulo: 'Forma', render: (f) => <Titulo texto={f.forma} /> },
    { titulo: 'Uso', render: (f) => <Selo texto={f.uso === 'geral' ? 'Despesa em geral' : 'Freelancer e treinamento'} tom={f.uso === 'geral' ? 'neutro' : 'info'} /> },
    { titulo: 'Como funciona', render: (f) => <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{f.detalhe}</Typography> },
  ]
  const geral = FORMAS.filter((f) => f.uso === 'geral').length

  return (
    <Stack spacing={2}>
      <Resumos>
        <Resumo rotulo="Despesa em geral" valor={String(geral)} detalhe="formas disponíveis" />
        <Resumo rotulo="Freelancer e treinamento" valor={String(FORMAS.length - geral)} detalhe="a pessoa continua no FreeControl" />
      </Resumos>
      <TabelaConfig colunas={colunas} linhas={FORMAS} chave={(f) => f.id} />
    </Stack>
  )
}

type Papel = { id: string; papel: string; quem: string; faz: string; move: boolean }

const PAPEIS: Papel[] = [
  { id: 'ia', papel: 'Assistente', quem: 'IA', faz: 'Lê DDA, notas e vendas e prepara o lançamento com plano sugerido.', move: false },
  { id: 'financeiro', papel: 'Financeiro', quem: 'Equipe financeira', faz: 'Revisa e completa o lançamento, do rascunho até deixar pronto.', move: false },
  { id: 'felipe', papel: 'Autorizador', quem: 'Felipe', faz: 'Autoriza o que está pronto. Sem essa autorização nada segue ao banco.', move: true },
]

function Usuarios() {
  const colunas: Coluna<Papel>[] = [
    { titulo: 'Papel', render: (p) => <Titulo texto={p.papel} sub={p.quem} /> },
    { titulo: 'O que faz', render: (p) => <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{p.faz}</Typography> },
    { titulo: 'Autoriza pagamento', render: (p) => <Selo texto={p.move ? 'Sim' : 'Não'} tom={p.move ? 'ok' : 'neutro'} /> },
  ]

  return (
    <Stack spacing={2}>
      <Resumos>
        <Resumo rotulo="Etapas" valor="3" detalhe="IA prepara, financeiro revisa, Felipe autoriza" />
        <Resumo rotulo="Quem autoriza" valor="1" detalhe="nenhum pagamento sai sem o Felipe" />
      </Resumos>
      <TabelaConfig colunas={colunas} linhas={PAPEIS} chave={(p) => p.id} />
    </Stack>
  )
}

type SyncVendas = { mensagem: string; criado_em: string; ok: boolean } | null

function BkOffice() {
  const [cfg, setCfg] = useState<ConfigBkoffice | null>(null)
  const [sync, setSync] = useState<SyncVendas>(null)
  const [editando, setEditando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const carregar = () => {
    api.configBkoffice().then(setCfg).catch((err) => setErro(mensagem(err)))
    api.vendas(new Date().toLocaleDateString('sv-SE')).then((r) => setSync(r.ultimo_sync)).catch(() => undefined)
  }
  useEffect(carregar, [])

  const configurado = Boolean(cfg?.usuario && cfg?.senha_definida)
  const situacao = !configurado
    ? <Selo texto="Sem acesso" tom="neutro" />
    : sync === null ? <Selo texto="Aguardando coleta" tom="ok" /> : sync.ok ? <Selo texto="Coletando" tom="ok" /> : <Selo texto="Com erro" tom="erro" />

  const colunas: Coluna<ConfigBkoffice>[] = [
    { titulo: 'Integração', render: () => <Titulo texto="BK Office" sub="Vendas das lojas" /> },
    { titulo: 'Usuário', render: (c) => c.usuario || '—' },
    { titulo: 'Setor', render: (c) => c.setor || '—' },
    { titulo: 'Situação', render: () => situacao },
    {
      titulo: 'Última coleta',
      largura: 280,
      render: () => (sync ? (
        <>
          <Typography sx={{ fontSize: 13 }}>{quando(sync.criado_em)}</Typography>
          <Typography sx={{ fontSize: 12, color: sync.ok ? 'text.secondary' : '#FFB4B4', maxWidth: 280 }} noWrap title={sync.mensagem}>{sync.mensagem}</Typography>
        </>
      ) : '—'),
    },
    { titulo: ' ', align: 'right', render: () => <Button size="small" onClick={(ev) => { ev.stopPropagation(); setEditando(true) }}>{configurado ? 'Editar' : 'Configurar'}</Button> },
  ]

  return (
    <Stack spacing={2}>
      <Resumos>
        <Resumo rotulo="Acesso" valor={configurado ? 'Configurado' : 'Pendente'} detalhe="usuário e senha do portal" />
        <Resumo rotulo="Última coleta" valor={sync ? quando(sync.criado_em) : '—'} detalhe={sync ? (sync.ok ? 'sem erro' : 'com erro') : 'nenhuma hoje'} />
        <Resumo rotulo="Frequência" valor="3 min" detalhe="coleta automática" />
      </Resumos>
      <Erro erro={erro} />
      <TabelaConfig colunas={colunas} linhas={cfg ? [cfg] : []} chave={() => 'bkoffice'} vazio="Carregando…" onLinha={() => setEditando(true)} />
      {editando && cfg ? (
        <FormBkoffice
          cfg={cfg}
          onFechar={() => setEditando(false)}
          onSalvo={() => { setEditando(false); setAviso('Acesso do BK Office salvo. A próxima coleta usa esse acesso.'); carregar() }}
        />
      ) : null}
      <Snackbar open={!!aviso} autoHideDuration={3600} onClose={() => setAviso('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setAviso('')} sx={{ bgcolor: '#1F8A4C' }}>{aviso}</Alert>
      </Snackbar>
    </Stack>
  )
}

function FormBkoffice({ cfg, onFechar, onSalvo }: { cfg: ConfigBkoffice; onFechar: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({ usuario: cfg.usuario, senha: '', api: cfg.api, setor: cfg.setor || '1005196' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    setSalvando(true)
    setErro('')
    try {
      await api.salvarBkoffice(form)
      onSalvo()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não salvou')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <PainelLateral
      aberto
      titulo="BK Office"
      subtitulo="Acesso ao portal que traz as vendas"
      onFechar={onFechar}
      rodape={(
        <>
          <Box sx={{ flex: 1 }} />
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="contained" disabled={salvando || !form.usuario} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
        </>
      )}
    >
      <Secao titulo="Login do portal">
        <TextField label="Usuário" size="small" value={form.usuario} onChange={(ev) => setForm({ ...form, usuario: ev.target.value })} />
        <TextField
          label="Senha"
          type="password"
          size="small"
          autoComplete="new-password"
          value={form.senha}
          placeholder={cfg.senha_definida ? '••••••••' : ''}
          onChange={(ev) => setForm({ ...form, senha: ev.target.value })}
          helperText={cfg.senha_definida ? 'Já salva. Preencha só para trocar.' : undefined}
        />
      </Secao>
      <Secao titulo="Endereço">
        <TextField label="API" size="small" value={form.api} onChange={(ev) => setForm({ ...form, api: ev.target.value })} />
        <TextField label="Setor" size="small" value={form.setor} onChange={(ev) => setForm({ ...form, setor: ev.target.value })} />
      </Secao>
      {erro ? <Alert severity="error">{erro}</Alert> : null}
    </PainelLateral>
  )
}
