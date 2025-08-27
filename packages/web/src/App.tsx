import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from './contexts/FirebaseAuthContext'
import useActiveUsers from './hooks/useActiveUsers'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import VehiclesPage from './pages/VehiclesPage'
import KioskPage from './pages/KioskPage'
import QueuePage from './pages/QueuePage'
import TeacherPage from './pages/TeacherPage'
import SubscriptionPage from './pages/SubscriptionPage'
import SubscriptionManagementPage from './pages/SubscriptionManagementPage'
import { MyAccountPage } from './pages/MyAccountPage'
import AuthCallback from './pages/AuthCallback'
import Layout from './components/Layout'

function App() {
  const { user, isLoading } = useAuth()
  
  // Initialize active user tracking (this will start tracking when user is logged in)
  useActiveUsers()

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/my-account" element={<MyAccountPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/admin/subscriptions" element={<SubscriptionManagementPage />} />
        {(user.role === 'teacher' || user.role === 'admin') && (
          <Route path="/teacher" element={<TeacherPage />} />
        )}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App