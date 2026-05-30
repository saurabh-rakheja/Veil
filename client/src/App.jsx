import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { SearchProvider } from './context/SearchContext'
import { UIProvider } from './context/UIContext'
import { SocketProvider } from './context/SocketContext'
import { NotificationProvider } from './context/NotificationContext'
import ToastContainer from './components/notifications/ToastContainer'
import AuthenticatedLayout from './components/layout/AuthenticatedLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import OnboardingPage from './pages/onboarding/OnboardingPage'
import DiscoveryPage from './pages/discovery/DiscoveryPage'
import ProfileViewPage from './pages/profile/ProfileViewPage'
import HandshakeFlow from './pages/handshake/HandshakeFlow'
import IncomingHandshakePage from './pages/handshake/IncomingHandshakePage'
import PendingRequestsPage from './pages/handshake/PendingRequestsPage'
import MyInvitesPage from './pages/invites/MyInvitesPage'
import SettingsPage from './pages/settings/SettingsPage'
import ChatPage from './pages/chat/ChatPage'
import ChatsPage from './pages/chat/ChatsPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import AboutPage from './pages/static/AboutPage'
import Zone3Gate from './pages/zone3/Zone3Gate'
import Zone3Page from './pages/zone3/Zone3Page'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export default function App() {
  if (!CLERK_KEY) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-0)', color: 'var(--text)',
        fontFamily: 'var(--font-body)', gap: 12, padding: 24, textAlign: 'center',
      }}>
        <span style={{ fontSize: 28, fontFamily: 'var(--font-display)', color: 'var(--teal)' }}>loom</span>
        <p style={{ color: 'var(--danger)', fontSize: 14 }}>
          Missing <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>
            VITE_CLERK_PUBLISHABLE_KEY
          </code>
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-lo)' }}>
          Copy <code>.env.example</code> → <code>.env</code> and add your Clerk key.
        </p>
      </div>
    )
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <BrowserRouter>
        <SearchProvider>
          <UIProvider>
            <SocketProvider>
              <NotificationProvider>
                <Routes>
                  {/* Public */}
                  <Route path="/login"  element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />

                  {/* Protected */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/onboarding" element={<OnboardingPage />} />

                    {/* Full-screen (no sidebar) */}
                    <Route path="/handshake/incoming/:handshakeId" element={<IncomingHandshakePage />} />
                    <Route path="/handshake/:recipientId"          element={<HandshakeFlow />} />
                    <Route path="/chat/:connectionId"              element={<ChatPage />} />
                    <Route path="/zone3/enable"                    element={<Zone3Gate />} />
                    <Route path="/zone3"                           element={<Zone3Page />} />

                    {/* Sidebar layout */}
                    <Route element={<AuthenticatedLayout />}>
                      <Route index                           element={<HomePage />} />
                      <Route path="/discover"                element={<DiscoveryPage />} />
                      <Route path="/chats"                   element={<ChatsPage />} />
                      <Route path="/connections/requests"    element={<PendingRequestsPage />} />
                      <Route path="/notifications"           element={<NotificationsPage />} />
                      <Route path="/profile/:userId"         element={<ProfileViewPage />} />
                      <Route path="/invites"                 element={<MyInvitesPage />} />
                      <Route path="/settings"                element={<SettingsPage />} />
                      <Route path="/about"                   element={<AboutPage />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <ToastContainer />
              </NotificationProvider>
            </SocketProvider>
          </UIProvider>
        </SearchProvider>
      </BrowserRouter>
    </ClerkProvider>
  )
}
