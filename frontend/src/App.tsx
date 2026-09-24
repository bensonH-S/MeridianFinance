import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './layout/Shell'
import { ContasPagarPage } from './pages/ContasPagarPage'
import { ConfigPage, ConfigDetalhePage } from './pages/ConfigPage'
import { ModuloPage } from './pages/ModuloPage'

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<ContasPagarPage />} />
          <Route path="receber" element={<ModuloPage titulo="Contas a receber" />} />
          <Route path="caixa" element={<ModuloPage titulo="Fechamento de caixa" />} />
          <Route path="movimento" element={<ModuloPage titulo="Contas movimento" />} />
          <Route path="dre" element={<ModuloPage titulo="DRE" />} />
          <Route path="integracoes" element={<ModuloPage titulo="Integrações" />} />
          <Route path="configuracoes" element={<ConfigPage />} />
          <Route path="configuracoes/:secao" element={<ConfigDetalhePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
