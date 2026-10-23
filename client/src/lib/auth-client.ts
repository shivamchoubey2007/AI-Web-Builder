import { createAuthClient } from 'better-auth/react'

const baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000'

export const authClient = createAuthClient({
    baseURL,
    fetchOptions: { credentials: 'include' }
})

export const { signIn, signUp, useSession } = authClient
