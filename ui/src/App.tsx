import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/common/Layout'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import Theater from './pages/Theater'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Theater />} />
            {/* Phase 4+: <Route path="/seedlab" element={<SeedLab />} /> */}
            {/* Phase 5+: <Route path="/gallery" element={<Gallery />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
