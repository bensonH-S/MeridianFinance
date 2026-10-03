import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Drawer from '@mui/material/Drawer'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { api, brl, type Empresa, type FechamentoDia, type MesFechamento } from '../api'
import { usePrefs } from '../prefs'

function mesAtual() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date()).slice(0, 7)
}

function hojeIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function dinheiroTexto(valor: number) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function lerDinheiro(texto: string) {
  const limpo = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

const TOM_CLARO: Record<string, { color: string; border: string; bg: string }> = {
  rascunho: { color: '#DC2626', border: 'rgba(220,38,38,0.55)', bg: 'rgba(220,38,38,0.06)' },
  conferido: { color: '#1D4ED8', border: 'rgba(59,130,246,0.45)', bg: 'rgba(59,130,246,0.08)' },
  fechado: { color: '#047857', border: 'rgba(16,185,129,0.45)', bg: 'rgba(16,185,129,0.08)' },
}

const TOM_ESCURO: Record<string, { color: string; border: string; bg: string }> = {
  rascunho: { color: '#FCA5A5', border: 'rgba(248,113,113,0.55)', bg: 'rgba(248,113,113,0.12)' },
  conferido: { color: '#93C5FD', border: 'rgba(96,165,250,0.5)', bg: 'rgba(96,165,250,0.14)' },
  fechado: { color: '#6EE7B7', border: 'rgba(52,211,153,0.45)', bg: 'rgba(52,211,153,0.14)' },
}

const ROTULO: Record<string, [string, string]> = {
  rascunho: ['Pendente', 'Pending'],
  conferido: ['Conferido', 'Checked'],
  fechado: ['Fechado', 'Closed'],
}

function totalDia(d: FechamentoDia) {
  return Math.round((d.dinheiro + d.pix + d.debito + d.credito + d.cart_digital + d.ifood + d.azul + d.rappi + d.food99) * 100) / 100
}

function gate(d: FechamentoDia) {
  return Math.round((d.dinheiro + d.pix) * 100) / 100
}

function cartoes(d: FechamentoDia) {
  return Math.round((d.debito + d.credito + d.cart_digital) * 100) / 100
}

function gradeMes(mes: string, dias: FechamentoDia[], empresaId: string, empresa: string, bk: string | null) {
  const [ano, mesNum] = mes.split('-').map(Number)
  const primeiro = new Date(ano, mesNum - 1, 1)
  const inicio = primeiro.getDay()
  const total = new Date(ano, mesNum, 0).getDate()
  const porDia = new Map(dias.map((d) => [Number(d.data.slice(8, 10)), d]))
  const celulas: Array<FechamentoDia | null> = []
  for (let i = 0; i < inicio; i += 1) celulas.push(null)
  for (let dia = 1; dia <= total; dia += 1) {
    const data = `${mes}-${String(dia).padStart(2, '0')}`
    celulas.push(porDia.get(dia) || {
      id: null,
      empresa_id: empresaId,
      empresa,
      bk_number: bk,
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
  while (celulas.length % 7 !== 0) celulas.push(null)
  const semanas: Array<Array<FechamentoDia | null>> = []
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7))
  return semanas
}

function LinhaResumo({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', py: 0.6 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cor, flexShrink: 0 }} />
      <Typography sx={{ flex: 1, fontSize: 13, color: 'text.secondary' }}>{rotulo}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{valor}</Typography>
    </Stack>
  )
}

function Metrica({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: alerta ? 'error.main' : 'text.secondary' }}>{rotulo}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: alerta ? 'error.main' : 'text.primary', lineHeight: 1.25 }}>
        {valor}
      </Typography>
    </Box>
  )
}

export function FechamentoCaixaPage() {
  const { t, modo, idioma } = usePrefs()
  const escuro = modo === 'escuro'
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [mes, setMes] = useState(mesAtual)
  const [mesDados, setMesDados] = useState<MesFechamento | null>(null)
  const [selecionado, setSelecionado] = useState<FechamentoDia | null>(null)
  const [editando, setEditando] = useState<FechamentoDia | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const lojas = useMemo(() => empresas.filter((e) => e.tipo === 'loja'), [empresas])
  const hoje = hojeIso()

  useEffect(() => {
    api.empresas().then((lista) => {
      setEmpresas(lista)
      const loja = lista.find((e) => e.tipo === 'loja')
      if (loja) setEmpresaId((atual) => atual || loja.id)
    }).catch((err: unknown) => setErro(err instanceof Error ? err.message : t('Não carregou as lojas', 'Could not load stores')))
  }, [])

  const carregar = () => {
    if (!empresaId || !mes) return
    api.caixaMes(mes, empresaId)
      .then((dados) => {
        setMesDados(dados)
        setErro('')
        setSelecionado((atual) => {
          if (!atual) {
            const doDia = dados.dias.find((d) => d.data === hoje) || dados.dias[0] || null
            return doDia
          }
          return dados.dias.find((d) => d.data === atual.data) || atual
        })
      })
      .catch((err: unknown) => setErro(err instanceof Error ? err.message : t('Não carregou o fechamento', 'Could not load cash closing')))
  }

  useEffect(() => { carregar() }, [empresaId, mes])

  const dias = mesDados?.dias ?? []
  const lojaAtual = lojas.find((l) => l.id === empresaId)
  const semanas = useMemo(
    () => gradeMes(mes, dias, empresaId, lojaAtual?.apelido || lojaAtual?.razao_social || '', mesDados?.empresa.bk_number ?? null),
    [mes, dias, empresaId, lojaAtual, mesDados],
  )
  const resumo = mesDados?.resumo
  const tomMap = escuro ? TOM_ESCURO : TOM_CLARO
  const diasSemana = idioma === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const diaPainel = selecionado || semanas.flat().find((d) => d?.data === hoje) || null
  const pendentes = Math.max(0, (resumo?.dias_com_movimento ?? 0) - (resumo?.conferidos ?? 0) - (resumo?.fechados ?? 0))
  const dataPainel = diaPainel
    ? new Date(`${diaPainel.data}T12:00:00`).toLocaleDateString(idioma === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  const abrirDia = (dia: FechamentoDia) => {
    setSelecionado(dia)
  }

  return (
    <Stack spacing={2} sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
        <TextField
          select
          size="small"
          label={t('Loja', 'Store')}
          value={empresaId}
          onChange={(ev) => setEmpresaId(ev.target.value)}
          sx={{ minWidth: 220, bgcolor: 'background.paper' }}
        >
          {lojas.map((e) => <MenuItem key={e.id} value={e.id}>{e.apelido || e.razao_social}</MenuItem>)}
        </TextField>
        <TextField size="small" label={t('Mês', 'Month')} type="month" value={mes} onChange={(ev) => setMes(ev.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170, bgcolor: 'background.paper' }} />
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          disabled={!diaPainel}
          onClick={() => diaPainel && setEditando(diaPainel)}
        >
          {t('Fechar caixa', 'Close cash')}
        </Button>
      </Stack>

      {erro ? <Alert severity="error" onClose={() => setErro('')}>{erro}</Alert> : null}

      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid', borderColor: 'divider' }}>
            {diasSemana.map((nome) => (
              <Box key={nome} sx={{ px: 1.25, py: 1, borderRight: '1px solid', borderColor: 'divider', '&:last-child': { borderRight: 0 } }}>
                <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>{nome}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', gridTemplateRows: `repeat(${Math.max(semanas.length, 1)}, minmax(92px, 1fr))` }}>
            {semanas.map((semana, si) => (
              <Box key={si} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 }, minHeight: 92 }}>
                {semana.map((dia, di) => {
                  if (!dia) {
                    return (
                      <Box
                        key={`vazio-${si}-${di}`}
                        sx={{
                          borderRight: '1px solid',
                          borderColor: 'divider',
                          bgcolor: escuro ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
                          '&:last-child': { borderRight: 0 },
                        }}
                      />
                    )
                  }
                  const status = dia.id ? dia.status : 'rascunho'
                  const tom = tomMap[status] || tomMap.rascunho
                  const rotulo = ROTULO[status] || ROTULO.rascunho
                  const valor = totalDia(dia)
                  const ehHoje = dia.data === hoje
                  const ativo = diaPainel?.data === dia.data
                  const temLancamento = Boolean(dia.id)
                  return (
                    <Box
                      key={dia.data}
                      onClick={() => abrirDia(dia)}
                      onDoubleClick={() => setEditando(dia)}
                      sx={{
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        px: 1.25,
                        py: 1,
                        cursor: 'pointer',
                        bgcolor: ativo
                          ? (escuro ? 'rgba(27,110,243,0.18)' : 'rgba(219,234,254,0.9)')
                          : ehHoje
                            ? (escuro ? 'rgba(250,204,21,0.12)' : 'rgba(254,249,195,0.85)')
                            : 'transparent',
                        transition: 'background-color 120ms',
                        '&:hover': {
                          bgcolor: ativo
                            ? (escuro ? 'rgba(27,110,243,0.22)' : 'rgba(191,219,254,0.95)')
                            : (escuro ? 'rgba(255,255,255,0.04)' : 'rgba(248,250,252,1)'),
                        },
                        '&:last-child': { borderRight: 0 },
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 92,
                      }}
                    >
                      <Typography sx={{ alignSelf: 'flex-end', fontSize: 13, fontWeight: 500, color: 'text.secondary', lineHeight: 1 }}>
                        {Number(dia.data.slice(8, 10))}
                      </Typography>
                      {temLancamento ? (
                        <Box sx={{ mt: 0.75 }}>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.2 }}>
                            {t('Total', 'Total')}
                          </Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1.25 }}>
                            {brl(valor)}
                          </Typography>
                          <Chip
                            size="small"
                            label={idioma === 'en' ? rotulo[1] : rotulo[0]}
                            variant="outlined"
                            sx={{
                              mt: 0.75,
                              height: 22,
                              fontSize: 11,
                              fontWeight: 500,
                              color: tom.color,
                              borderColor: tom.border,
                              bgcolor: tom.bg,
                            }}
                          />
                        </Box>
                      ) : null}
                    </Box>
                  )
                })}
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>
              {t('Resumo do dia', 'Day summary')}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>
              {lojaAtual?.apelido || lojaAtual?.razao_social || '—'}
              {dataPainel ? ` · ${dataPainel}` : ''}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Metrica rotulo={t('Total', 'Total')} valor={brl(diaPainel ? totalDia(diaPainel) : 0)} />
            <Metrica rotulo={t('Dinheiro + PIX', 'Cash + PIX')} valor={brl(diaPainel ? gate(diaPainel) : 0)} />
            <Metrica rotulo={t('Dias pendentes', 'Pending days')} valor={String(pendentes)} alerta={pendentes > 0} />
            <Metrica rotulo={t('Conferidos', 'Checked')} valor={String(resumo?.conferidos ?? 0)} />
          </Box>

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('Por modalidade', 'By method')}
            </Typography>
            <LinhaResumo cor="#3B82F6" rotulo={t('Dinheiro', 'Cash')} valor={brl(diaPainel?.dinheiro ?? 0)} />
            <LinhaResumo cor="#0EA5E9" rotulo="PIX" valor={brl(diaPainel?.pix ?? 0)} />
            <LinhaResumo cor="#6366F1" rotulo={t('Cartões', 'Cards')} valor={brl(diaPainel ? cartoes(diaPainel) : 0)} />
            <LinhaResumo cor="#F59E0B" rotulo="iFood" valor={brl(diaPainel?.ifood ?? 0)} />
            <LinhaResumo cor="#94A3B8" rotulo={t('Despesas', 'Expenses')} valor={brl(diaPainel?.despesas_caixa ?? 0)} />
          </Box>

          <Box sx={{ mt: 'auto', pt: 1 }}>
            {diaPainel?.id ? (
              <Chip
                size="small"
                label={idioma === 'en' ? (ROTULO[diaPainel.status]?.[1] || 'Draft') : (ROTULO[diaPainel.status]?.[0] || 'Pendente')}
                variant="outlined"
                sx={{
                  mb: 1.5,
                  color: (tomMap[diaPainel.status] || tomMap.rascunho).color,
                  borderColor: (tomMap[diaPainel.status] || tomMap.rascunho).border,
                  bgcolor: (tomMap[diaPainel.status] || tomMap.rascunho).bg,
                }}
              />
            ) : (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
                {t('Sem lançamento neste dia.', 'No entry on this day.')}
              </Typography>
            )}
            <Button fullWidth variant="contained" disabled={!diaPainel} onClick={() => diaPainel && setEditando(diaPainel)}>
              {diaPainel?.id ? t('Editar dia', 'Edit day') : t('Lançar dia', 'Post day')}
            </Button>
          </Box>
        </Paper>
      </Box>

      {editando ? (
        <FormDia
          dia={editando}
          onFechar={() => setEditando(null)}
          onSalvo={(mensagem) => {
            const data = editando.data
            setEditando(null)
            setAviso(mensagem)
            api.caixaMes(mes, empresaId).then((dados) => {
              setMesDados(dados)
              setSelecionado(dados.dias.find((d) => d.data === data) || null)
            }).catch(() => carregar())
          }}
        />
      ) : null}

      <Snackbar open={!!aviso} autoHideDuration={3200} onClose={() => setAviso('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setAviso('')}>{aviso}</Alert>
      </Snackbar>
    </Stack>
  )
}

function FormDia({ dia, onFechar, onSalvo }: { dia: FechamentoDia; onFechar: () => void; onSalvo: (mensagem: string) => void }) {
  const { t, idioma } = usePrefs()
  const [dinheiro, setDinheiro] = useState(dinheiroTexto(dia.dinheiro))
  const [pix, setPix] = useState(dinheiroTexto(dia.pix))
  const [debito, setDebito] = useState(dinheiroTexto(dia.debito))
  const [credito, setCredito] = useState(dinheiroTexto(dia.credito))
  const [cartDigital, setCartDigital] = useState(dinheiroTexto(dia.cart_digital))
  const [ifood, setIfood] = useState(dinheiroTexto(dia.ifood))
  const [despesas, setDespesas] = useState(dinheiroTexto(dia.despesas_caixa))
  const [observacao, setObservacao] = useState(dia.observacao || '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const fechado = dia.status === 'fechado'
  const dataBr = new Date(`${dia.data}T12:00:00`).toLocaleDateString(idioma === 'en' ? 'en-US' : 'pt-BR')

  const salvar = async () => {
    setErro('')
    setSalvando(true)
    try {
      await api.salvarCaixa({
        empresa_id: dia.empresa_id,
        data: dia.data,
        dinheiro: lerDinheiro(dinheiro),
        pix: lerDinheiro(pix),
        debito: lerDinheiro(debito),
        credito: lerDinheiro(credito),
        cart_digital: lerDinheiro(cartDigital),
        ifood: lerDinheiro(ifood),
        azul: dia.azul,
        rappi: dia.rappi,
        food99: dia.food99,
        despesas_caixa: lerDinheiro(despesas),
        observacao,
        status: fechado ? 'fechado' : 'conferido',
      })
      onSalvo(t('Caixa salvo.', 'Cash closing saved.'))
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('Não salvou', 'Could not save'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Drawer anchor="right" open onClose={onFechar} slotProps={{ paper: { sx: { width: 420 } } }}>
      <Stack spacing={1.5} sx={{ p: 3, overflow: 'auto' }}>
        <Typography variant="h6">{t('Fechar caixa', 'Close cash')}</Typography>
        <Typography variant="body2" color="text.secondary">{dia.empresa} · {dataBr}</Typography>
        <TextField label={t('Dinheiro', 'Cash')} size="small" value={dinheiro} disabled={fechado} onChange={(ev) => setDinheiro(ev.target.value)} />
        <TextField label={t('PIX bancário', 'Bank PIX')} size="small" value={pix} disabled={fechado} onChange={(ev) => setPix(ev.target.value)} />
        <TextField label={t('Débito', 'Debit')} size="small" value={debito} disabled={fechado} onChange={(ev) => setDebito(ev.target.value)} />
        <TextField label={t('Crédito', 'Credit')} size="small" value={credito} disabled={fechado} onChange={(ev) => setCredito(ev.target.value)} />
        <TextField label={t('Cartão digital', 'Digital card')} size="small" value={cartDigital} disabled={fechado} onChange={(ev) => setCartDigital(ev.target.value)} />
        <TextField label="iFood" size="small" value={ifood} disabled={fechado} onChange={(ev) => setIfood(ev.target.value)} />
        <TextField label={t('Despesas', 'Expenses')} size="small" value={despesas} disabled={fechado} onChange={(ev) => setDespesas(ev.target.value)} />
        <TextField label={t('Observação', 'Note')} size="small" multiline minRows={2} value={observacao} disabled={fechado} onChange={(ev) => setObservacao(ev.target.value)} />
        {fechado ? <Alert severity="info">{t('Dia fechado. Só consulta.', 'Day closed. View only.')}</Alert> : null}
        {erro ? <Alert severity="error">{erro}</Alert> : null}
        <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
          <Button onClick={onFechar}>{t('Cancelar', 'Cancel')}</Button>
          <Box sx={{ flex: 1 }} />
          {!fechado ? (
            <Button variant="contained" disabled={salvando} onClick={salvar}>
              {salvando ? t('Salvando…', 'Saving…') : t('Salvar', 'Save')}
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Drawer>
  )
}
