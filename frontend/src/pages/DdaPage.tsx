import { useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { api, brl, type LinhaDda } from '../api'

function base64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binario)
}

function dataBr(iso: string) {
  if (!iso) return ''
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function DdaPage() {
  const input = useRef<HTMLInputElement>(null)
  const [linhas, setLinhas] = useState<LinhaDda[]>([])
  const [marcadas, setMarcadas] = useState<boolean[]>([])
  const [lendo, setLendo] = useState(false)
  const [subindo, setSubindo] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const prontas = linhas.filter((linha, indice) => linha.pronto && marcadas[indice])

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setErro('')
    setAviso('')
    setLendo(true)
    try {
      const previa = await api.previaDda(base64(await arquivo.arrayBuffer()))
      setLinhas(previa.linhas)
      setMarcadas(previa.linhas.map((linha) => linha.pronto))
    } catch (err) {
      setLinhas([])
      setMarcadas([])
      setErro(err instanceof Error ? err.message : 'Não leu a planilha')
    } finally {
      setLendo(false)
      if (input.current) input.current.value = ''
    }
  }

  const subir = async () => {
    setSubindo(true)
    setErro('')
    try {
      const resultado = await api.importarDda(prontas)
      setAviso(resultado.criadas === 1 ? '1 boleto importado.' : `${resultado.criadas} boletos importados.`)
      const previa = linhas.map((linha, indice) => (
        linha.pronto && marcadas[indice] ? { ...linha, pronto: false, motivo: 'Já lançado' } : linha
      ))
      setLinhas(previa)
      setMarcadas(previa.map(() => false))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não importou')
    } finally {
      setSubindo(false)
    }
  }

  return (
    <Stack spacing={2} sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
        <Typography sx={{ color: 'text.secondary', fontSize: 14, flex: 1 }}>
          Exporte o DDA no Itaú ou no Banco do Brasil e solte a planilha aqui. Entram os boletos em aberto no CNPJ da empresa.
        </Typography>
        <Button variant="contained" color="secondary" startIcon={<UploadFileOutlinedIcon />} disabled={lendo} onClick={() => input.current?.click()}>
          {lendo ? 'Lendo…' : 'Escolher planilha'}
        </Button>
        <input ref={input} hidden type="file" accept=".xlsx,.xls,.csv" onChange={(ev) => escolher(ev.target.files?.[0])} />
      </Stack>

      {erro && <Alert severity="error">{erro}</Alert>}

      <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Empresa</TableCell>
              <TableCell>Cedente</TableCell>
              <TableCell>Vencimento</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Situação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>Nenhuma planilha carregada.</Box>
                </TableCell>
              </TableRow>
            )}
            {linhas.map((linha, indice) => (
              <TableRow key={`${linha.documento_ref}-${indice}`} hover selected={marcadas[indice]}>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    disabled={!linha.pronto}
                    checked={!!marcadas[indice]}
                    onChange={(ev) => setMarcadas((atual) => atual.map((marcada, i) => i === indice ? ev.target.checked : marcada))}
                  />
                </TableCell>
                <TableCell>{linha.empresa || linha.sacado || '—'}</TableCell>
                <TableCell>{linha.fornecedor || linha.cedente || '—'}</TableCell>
                <TableCell>{dataBr(linha.vencimento)}</TableCell>
                <TableCell align="right">{linha.valor == null ? '—' : brl(linha.valor)}</TableCell>
                <TableCell sx={{ color: linha.pronto ? 'text.primary' : 'warning.main' }}>
                  {linha.pronto ? (linha.fornecedor_id ? 'Pronta' : 'A classificar') : linha.motivo}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button variant="contained" disabled={!prontas.length || subindo} onClick={subir}>
          {subindo ? 'Subindo…' : `Subir ${prontas.length} boleto${prontas.length === 1 ? '' : 's'}`}
        </Button>
      </Stack>

      <Snackbar open={!!aviso} autoHideDuration={3200} onClose={() => setAviso('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setAviso('')} sx={{ bgcolor: '#1F8A4C' }}>{aviso}</Alert>
      </Snackbar>
    </Stack>
  )
}
