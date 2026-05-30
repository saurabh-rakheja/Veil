import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

const ONBOARDING_PATH = '/onboarding'

export default function ProtectedRoute() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth()
  const location = useLocation()

  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      setStatus('unauth')
      return
    }

    const currentPath = location.pathname
    const skipPaths = ['/onboarding', '/settings']
    if (skipPaths.some(p => currentPath.startsWith(p))) {
      setStatus('ok')
      return
    }

    let cancelled = false

    const checkProfile = async () => {
      try {
        const token = await getToken()
        if (!token) {
          if (!cancelled) setStatus('ok')
          return
        }

        const res = await fetch(
          `/api/consent-profile?t=${Date.now()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }
        )

        if (!res.ok) {
          if (!cancelled) setStatus('ok')
          return
        }

        const data = await res.json()
        console.log('[ProtectedRoute]', {
          path: currentPath,
          exists: data.exists,
          isComplete: data.profile?.isComplete,
        })

        if (cancelled) return

        if (!data.exists || data.profile?.isComplete !== true) {
          setStatus('onboarding')
          return
        }

        setStatus('ok')
      } catch (err) {
        console.error('[ProtectedRoute] error:', err)
        if (!cancelled) setStatus('ok')
      }
    }

    checkProfile()
    return () => { cancelled = true }

    // location.pathname intentionally omitted — re-running on every navigation
    // causes loops. Path is read at execution time via currentPath.
    // /settings and /onboarding skip the check entirely.
  }, [isLoaded, isSignedIn, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
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

  if (status === 'unauth') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (status === 'onboarding') {
    // Already at onboarding — render it directly instead of looping through Navigate
    if (location.pathname === ONBOARDING_PATH) return <Outlet />
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
