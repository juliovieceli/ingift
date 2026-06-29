import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LayoutLanding } from '@/funcionalidades/landing/LayoutLanding'
import { PaginaInicial } from '@/funcionalidades/landing/PaginaInicial'
import { PaginaPortfolio } from '@/funcionalidades/landing/PaginaPortfolio'

const LayoutAuth = lazy(() =>
  import('@/funcionalidades/admin/LayoutAuth').then((m) => ({ default: m.LayoutAuth }))
)
const PaginaLogin = lazy(() =>
  import('@/funcionalidades/admin/PaginaLogin').then((m) => ({ default: m.PaginaLogin }))
)
const LayoutAdmin = lazy(() =>
  import('@/funcionalidades/admin/LayoutAdmin').then((m) => ({ default: m.LayoutAdmin }))
)
const PaginaDashboard = lazy(() =>
  import('@/funcionalidades/admin/PaginaDashboard').then((m) => ({ default: m.PaginaDashboard }))
)
const PaginaClientes = lazy(() =>
  import('@/funcionalidades/admin/PaginaClientes').then((m) => ({ default: m.PaginaClientes }))
)
const PaginaOrcamentos = lazy(() =>
  import('@/funcionalidades/admin/PaginaOrcamentos').then((m) => ({ default: m.PaginaOrcamentos }))
)
const PaginaDetalheOrcamento = lazy(() =>
  import('@/funcionalidades/admin/PaginaDetalheOrcamento').then((m) => ({ default: m.PaginaDetalheOrcamento }))
)
const PaginaEstoque = lazy(() =>
  import('@/funcionalidades/admin/PaginaEstoque').then((m) => ({ default: m.PaginaEstoque }))
)
const PaginaMovimentacoes = lazy(() =>
  import('@/funcionalidades/admin/PaginaMovimentacoes').then((m) => ({ default: m.PaginaMovimentacoes }))
)
const PaginaImpressoras = lazy(() =>
  import('@/funcionalidades/admin/PaginaImpressoras').then((m) => ({ default: m.PaginaImpressoras }))
)
const PaginaConfiguracoes = lazy(() =>
  import('@/funcionalidades/admin/PaginaConfiguracoes').then((m) => ({ default: m.PaginaConfiguracoes }))
)
const PaginaCms = lazy(() =>
  import('@/funcionalidades/cms/PaginaCms').then((m) => ({ default: m.PaginaCms }))
)
const PaginaFinanceiro = lazy(() =>
  import('@/funcionalidades/admin/PaginaFinanceiro').then((m) => ({ default: m.PaginaFinanceiro }))
)

const qc = new QueryClient()

function Carregando() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-[var(--texto-muted)]">
      Carregando...
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<LayoutLanding />}>
            <Route index element={<PaginaInicial />} />
            <Route path="portfolio" element={<PaginaPortfolio />} />
          </Route>
          <Route
            element={
              <Suspense fallback={<Carregando />}>
                <LayoutAuth />
              </Suspense>
            }
          >
            <Route path="/admin/login" element={<Suspense fallback={<Carregando />}><PaginaLogin /></Suspense>} />
            <Route
              path="/admin"
              element={
                <Suspense fallback={<Carregando />}>
                  <LayoutAdmin />
                </Suspense>
              }
            >
              <Route
                index
                element={
                  <Suspense fallback={<Carregando />}>
                    <PaginaDashboard />
                  </Suspense>
                }
              />
              <Route path="clientes" element={<Suspense fallback={<Carregando />}><PaginaClientes /></Suspense>} />
              <Route path="orcamentos" element={<Suspense fallback={<Carregando />}><PaginaOrcamentos /></Suspense>} />
              <Route path="orcamentos/:id" element={<Suspense fallback={<Carregando />}><PaginaDetalheOrcamento /></Suspense>} />
              <Route path="cms" element={<Suspense fallback={<Carregando />}><PaginaCms /></Suspense>} />
              <Route path="estoque" element={<Suspense fallback={<Carregando />}><PaginaEstoque /></Suspense>} />
              <Route path="movimentacoes" element={<Suspense fallback={<Carregando />}><PaginaMovimentacoes /></Suspense>} />
              <Route path="impressoras" element={<Suspense fallback={<Carregando />}><PaginaImpressoras /></Suspense>} />
              <Route path="configuracoes" element={<Suspense fallback={<Carregando />}><PaginaConfiguracoes /></Suspense>} />
              <Route path="financeiro" element={<Suspense fallback={<Carregando />}><PaginaFinanceiro /></Suspense>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
