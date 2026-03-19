import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from './components/layout/Sidebar'
import { ApiKeyProvider, useApiKey } from './context/ApiKeyContext'
import { ApiKeyModal } from './components/ApiKeyModal'

// Lazy load de páginas — solo se cargan cuando el usuario navega a ellas
const Overview = lazy(() => import('./pages/Overview'))
const Datasets = lazy(() => import('./pages/Datasets'))
const Operadores = lazy(() => import('./pages/Operadores'))
const Mapa = lazy(() => import('./pages/Mapa'))
const GtfsViewer = lazy(() => import('./pages/GtfsViewer'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min en caché
      gcTime: 10 * 60 * 1000,         // 10 min en memoria
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Cargando...</span>
      </div>
    </div>
  )
}

function AppShell() {
  const { apiKey } = useApiKey()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Si no hay key, mostrar modal bloqueante
  if (!apiKey) return <ApiKeyModal />

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Overview onMenuToggle={() => setSidebarOpen(true)} />} />
            <Route path="/datasets" element={<Datasets onMenuToggle={() => setSidebarOpen(true)} />} />
            <Route path="/operadores" element={<Operadores onMenuToggle={() => setSidebarOpen(true)} />} />
            <Route path="/mapa" element={<Mapa onMenuToggle={() => setSidebarOpen(true)} />} />
            <Route path="/gtfs" element={<GtfsViewer onMenuToggle={() => setSidebarOpen(true)} />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ApiKeyProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </QueryClientProvider>
    </ApiKeyProvider>
  )
}
