import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/common/Layout'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { StarField } from './components/common/StarField'
import SeedLab from './pages/SeedLab'
import Configure from './pages/Configure'
import Theater from './pages/Theater'
import Dictionary from './pages/Dictionary'
import Gallery from './pages/Gallery'
import Analytics from './pages/Analytics'
import Arena from './pages/Arena'
import Tournament from './pages/Tournament'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Global ambient star field — fixed behind all pages */}
        <StarField />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<SeedLab />} />
            <Route path="/configure/:presetId" element={<Configure />} />
            <Route path="/theater/:matchId" element={<Theater />} />
            <Route path="/dictionary/:experimentId" element={<Dictionary />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/analytics/:experimentId" element={<Analytics />} />
            <Route path="/arena" element={<Arena />} />
            <Route path="/tournament/:tournamentId" element={<Tournament />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
