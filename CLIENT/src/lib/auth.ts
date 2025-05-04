/**
 * Get the authentication token from local storage
 * @returns The authentication token or null if not found
 */
export const getToken = (): string | null => {
  return localStorage.getItem("token")
}

/**
 * Set the authentication token in local storage
 * @param token The token to store
 */
export const setToken = (token: string): void => {
  localStorage.setItem("token", token)
}

/**
 * Remove the authentication token from local storage
 */
export const removeToken = (): void => {
  localStorage.removeItem("token")
}

/**
 * Check if the user is authenticated
 * @returns True if the user has a token, false otherwise
 */
export const isAuthenticated = (): boolean => {
  return !!getToken()
}

/**
 * Debug function to print current user info from local storage
 * @returns The current user info or null if not found
 */
export const debugCurrentUser = (): unknown => {
  const userJson = localStorage.getItem("currentUser")
  if (userJson) {
    try {
      const user = JSON.parse(userJson)
      console.log("Current user from localStorage:", {
        id: user.id,
        username: user.username,
        stringId: String(user.id),
      })
      return user
    } catch (e) {
      console.error("Error parsing user from localStorage:", e)
      return null
    }
  }
  console.log("No user found in localStorage")
  return null
}

// Helper to get current user from localStorage
export const getCurrentUser = (): any => {
  try {
    const userJson = localStorage.getItem("currentUser")
    if (!userJson) return null

    const user = JSON.parse(userJson)

    // Ensure the user object has stringified ID for comparison
    if (user && user.id) {
      user.stringId = String(user.id)
    }

    return user
  } catch (e) {
    console.error("Error parsing current user from localStorage:", e)
    return null
  }
}

export const login = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  try {
    // Perform regular API login
    const response = await apiClient.post("/auth/login", { email, password })
    const { user, token } = response.data.data

    // Store the token and user info
    localStorage.setItem("token", token)
    localStorage.setItem("currentUser", JSON.stringify(user))

    // Also sign in to Supabase if credentials are available
    try {
      // This is optional, you can remove if you don't have Supabase auth set up
      await signInToSupabase(email, password)
    } catch (supabaseError) {
      console.log("Supabase auth failed, but REST API auth succeeded:", supabaseError)
      // Continue even if Supabase auth fails
    }

    return { user, token }
  } catch (error) {
    throw error
  }
}
