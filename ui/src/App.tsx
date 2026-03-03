import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Layout } from './components/common/Layout'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { StarField } from './components/common/StarField'
import { NoiseOverlay } from './components/common/NoiseOverlay'

// Route-level code splitting: each page only loads when first visited.
// Vite splits these into separate chunks at build time.
const SeedLab        = lazy(() => import('./pages/SeedLab'))
const Configure      = lazy(() => import('./pages/Configure'))
const Theater        = lazy(() => import('./pages/Theater'))
const Dictionary     = lazy(() => import('./pages/Dictionary'))
const Gallery        = lazy(() => import('./pages/Gallery'))
const Analytics      = lazy(() => import('./pages/Analytics'))
const Arena          = lazy(() => import('./pages/Arena'))
const Tournament     = lazy(() => import('./pages/Tournament'))
const Settings       = lazy(() => import('./pages/Settings'))
const Tournaments    = lazy(() => import('./pages/Tournaments'))
const RPGHub         = lazy(() => import('./pages/RPGHub'))
const Campaign       = lazy(() => import('./pages/Campaign'))
const RPGTheater     = lazy(() => import('./components/theater/RPGTheater'))
const BranchTree     = lazy(() => import('./pages/BranchTree'))
const Documentary    = lazy(() => import('./pages/Documentary'))
const ReplicationGroup = lazy(() => import('./pages/ReplicationGroup'))
const Help           = lazy(() => import('./pages/Help'))
const Compare        = lazy(() => import('./pages/Compare'))

/** Minimal Babel-themed fallback shown during chunk loading */
function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <span className="font-mono text-xs text-text-dim animate-pulse tracking-widest">
        loading&hellip;
      </span>
    </div>
  )
}

/** Map current route to a neural network connection tint color */
function routeTint(pathname: string): string {
  if (pathname.startsWith('/gallery') || pathname.startsWith('/analytics')) {
    return '6,182,212'    // cyan -- archive / data
  }
  if (pathname.startsWith('/arena') || pathname.startsWith('/tournament')) {
    return '245,158,11'   // amber -- competition
  }
  if (pathname.startsWith('/rpg') || pathname.startsWith('/campaign')) {
    return '16,185,129'    // emerald -- RPG mode
  }
  if (pathname.startsWith('/theater') || pathname.startsWith('/tree') || pathname.startsWith('/documentary')) {
    return '139,92,246'   // purple -- live experiment / branch tree / documentary
  }
  if (pathname.startsWith('/compare')) {
    return '139,92,246'   // purple -- comparison view
  }
  return '139,92,246'     // default -- purple
}

/**
 * Inner app shell -- must be inside <BrowserRouter> to use useLocation.
 * Passes route-aware tint to the StarField background.
 */
function AppInner() {
  const location = useLocation()

  return (
    <>
      {/* Neural network background -- route-aware tint color */}
      <StarField tintColor={routeTint(location.pathname)} />
      {/* Film grain texture */}
      <NoiseOverlay />
      <Suspense fallback={<PageFallback />}>
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
            <Route path="/tournaments"                element={<Tournaments />} />
            <Route path="/rpg-hub"                    element={<RPGHub />} />
            <Route path="/campaign/:presetId"         element={<Campaign />} />
            <Route path="/rpg/:matchId"               element={<RPGTheater />} />
            <Route path="/tree/:experimentId"         element={<BranchTree />} />
            <Route path="/documentary/:experimentId"  element={<Documentary />} />
            <Route path="/replication/:groupId"       element={<ReplicationGroup />} />
            <Route path="/help"                       element={<Help />} />
            <Route path="/compare/:experimentId"      element={<Compare />} />
            <Route path="*" element={
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <h1 className="font-display text-2xl text-text-primary tracking-widest">404</h1>
                <p className="font-mono text-sm text-text-dim">Page not found</p>
                <a href="/" className="font-mono text-xs text-accent hover:underline">Back to Seed Lab</a>
              </div>
            } />
          </Route>
        </Routes>
      </Suspense>
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
