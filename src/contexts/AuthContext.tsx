import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  selectRole: (roleId: string) => void
  isAuthenticated: boolean
  needsRoleSelection: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = "authUser"
const USERS_STORAGE_KEY = "users"
const ROLE_SELECTION_KEY = "needsRoleSelection"

const roleNames: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  accountant: "Accountant",
  viewer: "Viewer",
  approver: "Approver"
}

// Default admin user
const DEFAULT_ADMIN = {
  id: "admin-001",
  email: "admin@kingscollege.ac.th",
  password: "admin123",
  name: "System Administrator",
  role: "Administrator"
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false)

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const roleSelectionNeeded = localStorage.getItem(ROLE_SELECTION_KEY)

      if (stored) {
        const userData = JSON.parse(stored)
        setUser(userData)

        // Check if role selection is needed
        if (roleSelectionNeeded === "true") {
          setNeedsRoleSelection(true)
        }
      }
    } catch (error) {
      console.error("Failed to load user:", error)
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(ROLE_SELECTION_KEY)
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Create user without role - will select role next
      const userData: User = {
        id: `user-${Date.now()}`,
        email: email,
        name: email.split('@')[0] || 'User',
        role: '' // Empty until role is selected
      }

      setUser(userData)
      setNeedsRoleSelection(true)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
      localStorage.setItem(ROLE_SELECTION_KEY, "true")
      return true
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const selectRole = (roleId: string) => {
    if (user) {
      const updatedUser = {
        ...user,
        role: roleNames[roleId] || roleId
      }
      setUser(updatedUser)
      setNeedsRoleSelection(false)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser))
      localStorage.removeItem(ROLE_SELECTION_KEY)
    }
  }

  const logout = () => {
    setUser(null)
    setNeedsRoleSelection(false)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ROLE_SELECTION_KEY)
  }

  const isAuthenticated = user !== null && !needsRoleSelection

  return (
    <AuthContext.Provider value={{ user, login, logout, selectRole, isAuthenticated, needsRoleSelection }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
