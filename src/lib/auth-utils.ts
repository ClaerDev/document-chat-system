import { useAuth, useUser } from '@clerk/nextjs'

export interface AuthProps {
  isSignedIn: boolean
  isLoading: boolean
  user: any
  signIn: () => void
  signUp: () => void
}

export function useAuthState(): AuthProps {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()

  const signIn = () => {
    // Use Clerk's built-in redirect to sign-in
    window.location.href = '/sign-in'
  }

  const signUp = () => {
    // Use Clerk's built-in redirect to sign-up
    window.location.href = '/sign-up'
  }

  return {
    isSignedIn: isSignedIn ?? false,
    isLoading: !isLoaded,
    user,
    signIn,
    signUp
  }
}

export function triggerClerkAuth(mode: 'sign-in' | 'sign-up' = 'sign-up') {
  if (mode === 'sign-in') {
    window.location.href = '/sign-in'
  } else {
    window.location.href = '/sign-up'
  }
}