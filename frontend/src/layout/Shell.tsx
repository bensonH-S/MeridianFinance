import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'

const grupos = [
  {
    titulo: 'Operação',
    itens: [
      { to: '/', label: 'Contas a pagar', icon: <PaymentsOutlinedIcon /> },
      { to: '/receber', label: 'Contas a receber', icon: <AccountBalanceWalletOutlinedIcon /> },
      { to: '/caixa', label: 'Fechamento de caixa', icon: <PointOfSaleOutlinedIcon /> },
      { to: '/movimento', label: 'Contas movimento', icon: <SwapHorizOutlinedIcon /> },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { to: '/dre', label: 'DRE', icon: <AssessmentOutlinedIcon /> },
      { to: '/integracoes', label: 'Integrações', icon: <HubOutlinedIcon /> },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [{ to: '/configuracoes', label: 'Configuração', icon: <SettingsOutlinedIcon /> }],
  },
]

const titulos: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Contas a pagar',
    subtitle: 'A origem da despesa e a conta que paga podem ser diferentes.',
  },
  '/receber': { title: 'Contas a receber', subtitle: 'Módulo em desenvolvimento.' },
  '/caixa': { title: 'Fechamento de caixa', subtitle: 'Módulo em desenvolvimento.' },
  '/movimento': { title: 'Contas movimento', subtitle: 'Módulo em desenvolvimento.' },
  '/dre': { title: 'DRE', subtitle: 'Módulo em desenvolvimento.' },
  '/integracoes': { title: 'Integrações', subtitle: 'Módulo em desenvolvimento.' },
  '/configuracoes': { title: 'Configuração', subtitle: 'Módulo em desenvolvimento.' },
  '/configuracoes/empresas': { title: 'Empresas', subtitle: 'Lojas e holdings.' },
  '/configuracoes/contas': { title: 'Contas bancárias', subtitle: 'Caixa, Banco do Brasil e Itaú.' },
  '/configuracoes/plano': { title: 'Plano de contas', subtitle: 'Classificação do que é a pagar.' },
  '/configuracoes/fornecedores': { title: 'Fornecedores', subtitle: 'Cadastro financeiro e o plano padrão.' },
  '/configuracoes/formas': { title: 'Formas de pagamento', subtitle: 'Como cada despesa sai.' },
  '/configuracoes/usuarios': { title: 'Usuários', subtitle: 'Quem prepara e quem autoriza.' },
}

export function Shell() {
  const { pathname } = useLocation()
  const pagina = titulos[pathname] ?? { title: 'Meridian Finance', subtitle: '' }

  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: 'background.default', overflow: 'hidden' }}>
      <Box
        component="aside"
        sx={{
          width: 200,
          flexShrink: 0,
          bgcolor: '#060B10',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Box
          sx={{
            height: 64,
            px: 1.5,
            borderBottom: '1px solid #1C2A35',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src={`${import.meta.env.BASE_URL}logo-central.png?v=7`}
            alt="Central GA"
            sx={{ width: '100%', maxHeight: 40, objectFit: 'contain', display: 'block' }}
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
                  color: 'text.disabled',
                }}
              >
                {grupo.titulo}
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
                          color: ativo ? '#fff' : '#B9C5CE',
                          background: ativo ? 'linear-gradient(90deg, rgba(255,90,10,.20), rgba(255,90,10,.06))' : 'transparent',
                          boxShadow: ativo ? 'inset 3px 0 #FF5A0A' : 'none',
                          '&:hover': {
                            background: ativo ? 'linear-gradient(90deg, rgba(255,90,10,.20), rgba(255,90,10,.06))' : 'rgba(255,255,255,0.04)',
                          },
                          '& .MuiSvgIcon-root': {
                            fontSize: 17,
                            color: ativo ? '#FF5A0A' : '#B9C5CE',
                          },
                        }}
                      >
                        {item.icon}
                        {item.label}
                      </Box>
                    )
                  }}
                </NavLink>
              ))}
            </Box>
          ))}
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
            justifyContent: 'space-between',
            gap: 2,
            px: 3,
            borderBottom: '1px solid #1C2A35',
          }}
        >
          <Box>
            <Typography component="h1" sx={{ fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {pagina.title}
            </Typography>
            {pagina.subtitle && (
              <Typography sx={{ fontSize: 13, fontWeight: 400, color: '#8FA0AF', lineHeight: 1.2, mt: 0.25 }}>
                {pagina.subtitle}
              </Typography>
            )}
          </Box>
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.secondary', flexShrink: 0 }}>
            Meridian Finance
          </Typography>
        </Box>
        <Box component="main" sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 3, py: 2.5 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
