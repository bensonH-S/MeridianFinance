import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { api } from '../api'
import { theme } from '../theme'
import { temaEscuro } from '../temaEscuro'
import { temaPagar } from '../temaPagar'
import { usePrefs } from '../prefs'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'

const grupos = [
  {
    titulo: ['Operação', 'Operations'],
    itens: [
      { to: '/', label: ['Contas a pagar', 'Accounts payable'], icon: <PaymentsOutlinedIcon /> },
      { to: '/receber', label: ['Contas a receber', 'Accounts receivable'], icon: <AccountBalanceWalletOutlinedIcon /> },
      { to: '/caixa', label: ['Fechamento de caixa', 'Cash closing'], icon: <PointOfSaleOutlinedIcon /> },
      { to: '/movimento', label: ['Contas movimento', 'Cash movement'], icon: <SwapHorizOutlinedIcon /> },
    ],
  },
  {
    titulo: ['Gestão', 'Management'],
    itens: [
      { to: '/vendas', label: ['Vendas', 'Sales'], icon: <StorefrontOutlinedIcon /> },
      { to: '/dre', label: ['DRE', 'P&L'], icon: <AssessmentOutlinedIcon /> },
      { to: '/integracoes', label: ['Integrações', 'Integrations'], icon: <HubOutlinedIcon /> },
    ],
  },
  {
    titulo: ['Sistema', 'System'],
    itens: [{ to: '/configuracoes', label: ['Configuração', 'Settings'], icon: <SettingsOutlinedIcon /> }],
  },
]

const titulos: Record<string, [string, string, string, string]> = {
  '/': ['Contas a pagar', 'Accounts payable', 'A origem da despesa e a conta que paga podem ser diferentes.', 'The expense source and the paying account can differ.'],
  '/receber': ['Contas a receber', 'Accounts receivable', 'Módulo em desenvolvimento.', 'Module in progress.'],
  '/caixa': ['Fechamento de caixa', 'Cash closing', 'Conferência do dia por loja: dinheiro, PIX e cartões.', 'Daily store closing: cash, PIX and cards.'],
  '/movimento': ['Contas movimento', 'Cash movement', 'Módulo em desenvolvimento.', 'Module in progress.'],
  '/vendas': ['Vendas', 'Sales', 'Entra sozinha, a cada poucos minutos.', 'Comes in on its own, every few minutes.'],
  '/dre': ['DRE', 'P&L', 'Módulo em desenvolvimento.', 'Module in progress.'],
  '/integracoes': ['Integrações', 'Integrations', 'Boletos do DDA no nome das empresas.', 'DDA boletos in the company name.'],
  '/configuracoes': ['Configuração', 'Settings', 'Cadastros e os acessos das APIs.', 'Records and API access.'],
  '/configuracoes/bkoffice': ['BK Office', 'BK Office', 'Usuário e endereço usados para trazer as vendas.', 'User and address used to pull sales.'],
  '/configuracoes/itau': ['Itaú', 'Itaú', 'Caixa postal da VAN para o retorno de DDA.', 'VAN mailbox for the DDA return file.'],
  '/configuracoes/bb': ['Banco do Brasil', 'Banco do Brasil', 'Credenciais da API de DDA.', 'DDA API credentials.'],
  '/configuracoes/empresas': ['Empresas', 'Companies', 'Lojas e holdings.', 'Stores and holdings.'],
  '/configuracoes/contas': ['Contas bancárias', 'Bank accounts', 'Caixa, Banco do Brasil e Itaú.', 'Cash, Banco do Brasil and Itaú.'],
  '/configuracoes/plano': ['Plano de contas', 'Chart of accounts', 'Classificação do que é a pagar.', 'How payables are classified.'],
  '/configuracoes/fornecedores': ['Fornecedores', 'Suppliers', 'Cadastro financeiro e o plano padrão.', 'Financial record and default account.'],
  '/configuracoes/formas': ['Formas de pagamento', 'Payment methods', 'Como cada despesa sai.', 'How each expense is paid.'],
  '/configuracoes/usuarios': ['Usuários', 'Users', 'Quem prepara e quem autoriza.', 'Who prepares and who authorizes.'],
}

export function Shell() {
  const { pathname } = useLocation()
  const { modo, setModo, idioma, setIdioma, t } = usePrefs()
  const escuro = modo === 'escuro'
  const pagar = pathname === '/'
  const texto = titulos[pathname]
  const pagina = texto
    ? { title: idioma === 'en' ? texto[1] : texto[0], subtitle: idioma === 'en' ? texto[3] : texto[2] }
    : { title: 'Azimut', subtitle: '' }
  const [sessao, setSessao] = useState({ versao: '…', nome: 'Felipe', papel: 'Autoriza' })

  useEffect(() => {
    api.sistema()
      .then((data) => setSessao({ versao: data.versao, nome: data.usuario.nome, papel: data.usuario.papel }))
      .catch(() => setSessao((atual) => ({ ...atual, versao: 'dev' })))
  }, [])

  return (
    <ThemeProvider theme={escuro ? temaEscuro : pagar ? temaPagar : theme}>
    <Box className={escuro ? 'tema-escuro' : pagar ? 'tema-pagar' : undefined} sx={{ display: 'flex', height: '100%', bgcolor: 'background.default', overflow: 'hidden' }}>
      <Box
        component="aside"
        sx={{
          width: 232,
          flexShrink: 0,
          bgcolor: 'var(--ga-sidebar-bg)',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Box sx={{ px: 1.25, pt: 1.75, pb: 0.75 }}>
          <Box
            component="img"
            src={`${import.meta.env.BASE_URL}logo-azimut.png?v=5`}
            alt="Azimut"
            sx={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </Box>

        <Box component="nav" sx={{ flex: 1, px: 1.25, py: 1.75, overflowY: 'auto' }}>
          {grupos.map((grupo, index) => (
            <Box key={grupo.titulo} sx={{ mt: index === 0 ? 0 : 2.5 }}>
              <Typography
                sx={{
                  px: 1,
                  mb: 1,
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: 'var(--ga-sidebar-muted)',
                }}
              >
                {idioma === 'en' ? grupo.titulo[1] : grupo.titulo[0]}
              </Typography>
              {grupo.itens.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} style={{ textDecoration: 'none' }}>
                  {({ isActive }) => {
                    const ativo = isActive || (item.to !== '/' && pathname.startsWith(item.to))
                    return (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.25,
                          py: 0.75,
                          mb: 0.375,
                          borderRadius: '8px',
                          fontSize: 13,
                          fontWeight: 500,
                          color: ativo ? 'var(--ga-sidebar-active-text)' : 'var(--ga-text-primary)',
                          bgcolor: ativo ? 'var(--ga-sidebar-active-bg)' : 'transparent',
                          borderLeft: '3px solid',
                          borderColor: ativo ? 'var(--ga-sidebar-active-border)' : 'transparent',
                          '&:hover': {
                            bgcolor: ativo ? 'var(--ga-sidebar-active-bg)' : 'var(--ga-sidebar-hover)',
                          },
                          '& .MuiSvgIcon-root': {
                            fontSize: 17,
                            color: ativo ? 'var(--ga-sidebar-active-icon)' : 'var(--ga-text-primary)',
                          },
                        }}
                      >
                        {item.icon}
                        {idioma === 'en' ? item.label[1] : item.label[0]}
                      </Box>
                    )
                  }}
                </NavLink>
              ))}
            </Box>
          ))}
        </Box>
        <Box sx={{ px: 1.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            aria-hidden
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'var(--ga-sidebar-active-bg)',
              color: 'var(--ga-sidebar-active-text)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {sessao.nome.slice(0, 1)}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: 'var(--ga-sidebar-text)' }} noWrap>{sessao.nome}</Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--ga-sidebar-muted)', lineHeight: 1.2 }} noWrap>
              {(idioma === 'en' ? ({ Autoriza: 'Authorizes', Prepara: 'Prepares' } as Record<string, string>)[sessao.papel] : null) || sessao.papel} · {sessao.versao}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          component="header"
          sx={{
            height: 64,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h1" sx={{ fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {pagina.title}
            </Typography>
            {pagina.subtitle && (
              <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'text.secondary', lineHeight: 1.2, mt: 0.25 }}>
                {pagina.subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              {(['pt', 'en'] as const).map((opcao) => (
                <Box
                  key={opcao}
                  component="button"
                  type="button"
                  onClick={() => setIdioma(opcao)}
                  sx={{
                    border: 0,
                    cursor: 'pointer',
                    px: 1,
                    py: 0.4,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    color: idioma === opcao ? 'primary.contrastText' : 'text.secondary',
                    bgcolor: idioma === opcao ? 'primary.main' : 'transparent',
                  }}
                >
                  {opcao.toUpperCase()}
                </Box>
              ))}
            </Box>
            <Tooltip title={escuro ? t('Tema claro', 'Light theme') : t('Tema escuro', 'Dark theme')}>
              <IconButton size="small" aria-label={escuro ? 'Light theme' : 'Dark theme'} onClick={() => setModo(escuro ? 'claro' : 'escuro')} sx={{ color: 'text.secondary' }}>
                {escuro ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box component="main" sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', px: 3, py: 2.5 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
    </ThemeProvider>
  )
}
