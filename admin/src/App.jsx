import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ReportsQueuePage from './pages/ReportsQueuePage'
import AllReportsPage from './pages/AllReportsPage'
import UsersPage from './pages/UsersPage'
import Sidebar from './components/Sidebar'

function getToken() { return localStorage.getItem('loom_admin_token') }

function ProtectedLayout() {
  if (!getToken()) return <Navigate to="/login" replace />
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <Routes>
          <Route index element={<Navigate to="/queue" replace />} />
          <Route path="queue" element={<ReportsQueuePage />} />
          <Route path="reports" element={<AllReportsPage />} />
          <Route path="users" element={<UsersPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
