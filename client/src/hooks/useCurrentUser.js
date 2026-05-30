import { useUser } from '@clerk/clerk-react'

export function useCurrentUser() {
  const { user, isLoaded } = useUser()
  return {
    id: user?.id ?? '',
    username: user?.username ?? user?.firstName ?? user?.primaryEmailAddress?.emailAddress?.split('@')[0] ?? 'you',
    avatarUrl: user?.imageUrl ?? null,
    isLoaded,
  }
}
