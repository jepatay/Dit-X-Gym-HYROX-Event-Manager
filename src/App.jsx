import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EventEditor from './pages/EventEditor'
import CheckIn from './pages/CheckIn'
import QRPage from './pages/QRPage'
import StartList from './pages/StartList'
import Results from './pages/Results'
import Leaderboard from './pages/Leaderboard'
import PublicEventPage from './pages/PublicEventPage'
import Settings from './pages/Settings'
import TVDisplay from './pages/TVDisplay'
import StartDisplay from './pages/StartDisplay'
import AdminPage from './pages/AdminPage'

function ProtectedRoute({ children }) {
  const user = useAuth()
  if (user === undefined) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/e/:slug" element={<PublicEventPage />} />
      <Route path="/event/:id/leaderboard" element={<Leaderboard />} />
      <Route path="/event/:id/tv" element={<TVDisplay />} />
      <Route path="/event/:id/start" element={<StartDisplay />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/event/new" element={<ProtectedRoute><EventEditor /></ProtectedRoute>} />
      <Route path="/event/:id" element={<ProtectedRoute><EventEditor /></ProtectedRoute>} />
      <Route path="/event/:id/checkin" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
      <Route path="/event/:id/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/event/:id/qr" element={<ProtectedRoute><QRPage /></ProtectedRoute>} />
      <Route path="/event/:id/startlist" element={<ProtectedRoute><StartList /></ProtectedRoute>} />
      <Route path="/event/:id/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
