import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Layout } from './components/common/Layout'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { StarField } from './components/common/StarField'
import { NoiseOverlay } from './components/common/NoiseOverlay'
import SeedLab from './pages/SeedLab'
import Configure from './pages/Configure'
import Theater from './pages/Theater'
import Dictionary from './pages/Dictionary'
import Gallery from './pages/Gallery'
import Analytics from './pages/Analytics'
import Arena from './pages/Arena'
import Tournament from './pages/Tournament'
import Settings from './pages/Settings'

/** Map current route to a neural network connection tint color */
function routeTint(pathname: string): string {
  if (pathname.startsWith('/gallery') || pathname.startsWith('/analytics')) {
    return '6,182,212'    // cyan — archive / data
  }
  if (pathname.startsWith('/arena') || pathname.startsWith('/tournament')) {
    return '245,158,11'   // amber — competition
  }
  if (pathname.startsWith('/theater')) {
    return '139,92,246'   // purple — live experiment
  }
  return '139,92,246'     // default — purple
}

/**
 * Inner app shell — must be inside <BrowserRouter> to use useLocation.
 * Passes route-aware tint to the StarField background.
 */
function AppInner() {
  const location = useLocation()

  return (
    <>
      {/* Neural network background — route-aware tint color */}
      <StarField tintColor={routeTint(location.pathname)} />
      {/* Film grain texture */}
      <NoiseOverlay />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"                           element={<SeedLab />} />
          <Route path="/configure/:presetId"        element={<Configure />} />
          <Route path="/theater/:matchId"           element={<Theater />} />
          <Route path="/dictionary/:experimentId"   element={<Dictionary />} />
          <Route path="/gallery"                    element={<Gallery />} />
          <Route path="/analytics/:experimentId"    element={<Analytics />} />
          <Route path="/arena"                      element={<Arena />} />
          <Route path="/tournament/:tournamentId"   element={<Tournament />} />
          <Route path="/settings"                   element={<Settings />} />
        </Route>
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
