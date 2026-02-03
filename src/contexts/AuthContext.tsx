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
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = "authUser"
const USERS_STORAGE_KEY = "users"

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

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const userData = JSON.parse(stored)
        setUser(userData)
      }
    } catch (error) {
      console.error("Failed to load user:", error)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Check default admin
      if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
        const userData: User = {
          id: DEFAULT_ADMIN.id,
          email: DEFAULT_ADMIN.email,
          name: DEFAULT_ADMIN.name,
          role: DEFAULT_ADMIN.role
        }
        setUser(userData)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
        return true
      }

      // Check users from User Management
      const storedUsers = localStorage.getItem(USERS_STORAGE_KEY)
      if (storedUsers) {
        const users = JSON.parse(storedUsers)
        const foundUser = users.find(
          (u: any) => u.email === email && u.password === password
        )

        if (foundUser) {
          const userData: User = {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role
          }
          setUser(userData)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
          return true
        }
      }

      return false
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const isAuthenticated = user !== null

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
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
