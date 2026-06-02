import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

const ONBOARDING_PATH = '/onboarding'

export default function ProtectedRoute() {
  const { isLoaded, isSignedIn, user } = useUser()
  const location = useLocation()

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0A0612',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '2px solid #2D2450',
          borderTop: '2px solid #7C3AED',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: 16, fontFamily: 'serif', fontSize: 18, color: '#6B5FA6' }}>loom</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Onboarding completion is the source of truth in Clerk publicMetadata, set
  // by the backend when the final onboarding step is finished. We read it
  // directly here instead of fetching /consent-profile, which previously caused
  // a redirect loop (a freshly-completed user kept being sent back to onboarding
  // while the backend read raced behind the just-saved state).
  const onboardingComplete = user?.publicMetadata?.onboardingComplete === true

  if (!onboardingComplete) {
    // Let the user actually reach onboarding (to finish it) and settings
    // (e.g. to delete their account) without bouncing.
    const allowed = [ONBOARDING_PATH, '/settings'].some(p => location.pathname.startsWith(p))
    if (allowed) return <Outlet />
    return <Navigate to={ONBOARDING_PATH} replace />
  }

  return <Outlet />
}
