import { useEffect }                       from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BoardPage   from './pages/BoardPage.jsx'
import ManagerPage from './pages/ManagerPage.jsx'
import TestCelebrationPage from './pages/TestCelebrationPage.jsx'
import { soundManager } from './utils/SoundManager.js'

export default function App() {
  useEffect(() => { soundManager.loadAll() }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Navigate to="/board" replace />} />
        <Route path="/board"   element={<BoardPage />} />
        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/test-celebration" element={<TestCelebrationPage />} />
      </Routes>
    </BrowserRouter>
  )
}
