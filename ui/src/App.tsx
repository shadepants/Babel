import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/common/Layout'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import SeedLab from './pages/SeedLab'
import Configure from './pages/Configure'
import Theater from './pages/Theater'
import Dictionary from './pages/Dictionary'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<SeedLab />} />
            <Route path="/configure/:presetId" element={<Configure />} />
            <Route path="/theater/:matchId" element={<Theater />} />
            <Route path="/dictionary/:experimentId" element={<Dictionary />} />
            <Route path="/settings" element={<Settings />} />
            {/* Phase 5+: <Route path="/gallery" element={<Gallery />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
