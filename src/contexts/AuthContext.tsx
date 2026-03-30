import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface User {
  id: string
  email: string
  name: string
  role: string
  approverInvoiceTypes?: string[]
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  selectRole: (roleId: string) => void
  updateProfile: (data: { name?: string; email?: string; phone?: string }) => void
  isAuthenticated: boolean
  needsRoleSelection: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = "authUser"
const USERS_STORAGE_KEY = "users"
const ROLE_SELECTION_KEY = "needsRoleSelection"

// Display names for roles (for UI only)
const roleDisplayNames: Record<string, string> = {
  super_admin: "SuperAdmin",
  admin_accountant: "Finance Admin",
  admin: "SuperAdmin",
  accountant: "Accountant",
  viewer: "Viewver",
  approver: "Approver"
}

// Migration map: old display names -> new role IDs
const roleMigrationMap: Record<string, string> = {
  "Admin": "super_admin",
  "SuperAdmin": "super_admin",
  "AdminAccountant": "admin_accountant",
  "Finance Admin": "admin_accountant",
  "Approvalver": "approver",
  "Approver": "approver",
  "Viewver": "viewer",
  "Accountant": "accountant"
}

// Helper function to migrate old role display names to role IDs
function migrateRole(role: string): string {
  // If it's already a role ID (contains underscore or is lowercase), return as is
  if (role.includes('_') || role === role.toLowerCase()) {
    return role
  }
  // Otherwise, migrate from old display name to role ID
  return roleMigrationMap[role] || role
}

// Default admin user
const DEFAULT_ADMIN = {
  id: "admin-001",
  email: "admin@kingscollege.ac.th",
  password: "admin123",
  name: "System Administrator",
  role: "Administrator"
}

// Default seed users
const SEED_USERS = [
  { id: "seed-001", email: "admin@school.com", firstName: "super", lastName: "admin", role: "super_admin", roles: ["super_admin"], password: "1", status: "active", createdAt: new Date().toISOString() },
  { id: "seed-002", email: "adminfinance@gmail.com", firstName: "finance", lastName: "admin", role: "admin_accountant", roles: ["admin_accountant"], password: "1", status: "active", createdAt: new Date().toISOString() },
  { id: "seed-003", email: "approver@gmaill.com", firstName: "test", lastName: "approver", role: "approver", roles: ["approver"], password: "1", status: "active", createdAt: new Date().toISOString() },
  { id: "seed-004", email: "viewver@gmail.com", firstName: "test", lastName: "viewver", role: "viewer", roles: ["viewer"], password: "1", status: "active", createdAt: new Date().toISOString() },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount and on updates
  useEffect(() => {
    const handleUserUpdate = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const roleSelectionNeeded = localStorage.getItem(ROLE_SELECTION_KEY)

        if (stored) {
          const userData = JSON.parse(stored)

          // Migrate old role display names to role IDs
          if (userData.role) {
            const migratedRole = migrateRole(userData.role)
            if (migratedRole !== userData.role) {
              userData.role = migratedRole
              safeSaveToStorage(STORAGE_KEY, JSON.stringify(userData))
            }
          }

          setUser(userData)

          // Check if role selection is needed
          if (roleSelectionNeeded === "true") {
            setNeedsRoleSelection(true)
          } else {
            setNeedsRoleSelection(false)
          }
        } else {
          setUser(null)
          setNeedsRoleSelection(false)
        }
      } catch (error) {
        console.error("Failed to load user:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // Seed default users into localStorage if not present
    try {
      const existingUsers = localStorage.getItem(USERS_STORAGE_KEY)
      const usersList: any[] = existingUsers ? JSON.parse(existingUsers) : []
      let updated = false
      for (const seed of SEED_USERS) {
        if (!usersList.some((u: any) => u.email.toLowerCase() === seed.email.toLowerCase())) {
          usersList.push(seed)
          updated = true
        }
      }
      if (updated) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList))
      }
    } catch (e) {
      console.error("Failed to seed default users:", e)
    }

    handleUserUpdate()

    // Save current path before refresh to allow restoration
    const handleBeforeUnload = () => {
      if (window.location.pathname !== '/login') {
        localStorage.setItem('lastPath', window.location.pathname + window.location.search)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    window.addEventListener(STORAGE_KEY + "Updated", handleUserUpdate)
    window.addEventListener("authUserUpdated", handleUserUpdate)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener(STORAGE_KEY + "Updated", handleUserUpdate)
      window.removeEventListener("authUserUpdated", handleUserUpdate)
    }
  }, [])

  const safeSaveToStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      // If quota exceeded, clear large non-essential data and retry
      console.warn("localStorage quota exceeded, clearing large data...")
      const keysToRemove = ["students_v1600", "families_v1600", "emailReminderHistory", "invoiceEmailLogs"]
      keysToRemove.forEach(k => { try { localStorage.removeItem(k) } catch {} })
      try {
        localStorage.setItem(key, value)
      } catch {
        console.error("Still unable to save to localStorage after cleanup")
      }
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Check for Default Admin
       console.log('check 1',DEFAULT_ADMIN)
      if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
        const adminUser: User = {
          id: DEFAULT_ADMIN.id,
          email: DEFAULT_ADMIN.email,
          name: DEFAULT_ADMIN.name,
          role: "super_admin"
        }
        setUser(adminUser)
        setNeedsRoleSelection(false)
        safeSaveToStorage(STORAGE_KEY, JSON.stringify(adminUser))
        localStorage.removeItem(ROLE_SELECTION_KEY)
        return { success: true }
      }

      // 2. Check for created users in localStorage
      const usersStored = localStorage.getItem(USERS_STORAGE_KEY)
      console.log('check 2',usersStored)
      if (usersStored) {
        const usersList = JSON.parse(usersStored)
        const matchedUser = usersList.find((u: any) => u.email.toLowerCase() === email.toLowerCase())

        console.log('check 4')
        if (matchedUser) {
          console.log('check 5')
          if (matchedUser.password && matchedUser.password !== password) {
            return { success: false, error: "Invalid password" }
          }

          console.log('check 6')
          if (matchedUser.status !== "active") {
            return { success: false, error: "Account is not active" }
          }

          const role = Array.isArray(matchedUser.roles) ? matchedUser.roles[0] : (matchedUser.role || "viewer")
          
          const userData: User = {
            id: matchedUser.id,
            email: matchedUser.email,
            name: `${matchedUser.firstName} ${matchedUser.lastName}`,
            role: role,
            approverInvoiceTypes: role === "approver" ? matchedUser.approverInvoiceTypes : undefined
          }

          console.log('check 7',userData)
          setUser(userData)
          setNeedsRoleSelection(false)
          safeSaveToStorage(STORAGE_KEY, JSON.stringify(userData))
          localStorage.removeItem(ROLE_SELECTION_KEY)
          return { success: true }
        }
      }

      console.log('check 3')
      return { success: false, error: "User not found" }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, error: "Authentication failed" }
    }
  }

  const selectRole = (roleId: string) => {
    if (user) {
      // Try to find the user settings from the users list in localStorage
      let invoiceTypes: string[] | undefined = undefined
      try {
        const usersStored = localStorage.getItem(USERS_STORAGE_KEY)
        if (usersStored) {
          const usersList = JSON.parse(usersStored)
          const matchedUser = usersList.find((u: any) => u.email === user.email)
          if (matchedUser && matchedUser.approverInvoiceTypes) {
            invoiceTypes = matchedUser.approverInvoiceTypes
          }
        }
      } catch (e) {
        console.error("Failed to load user settings during selection", e)
      }

      const updatedUser: User = {
        ...user,
        role: roleId,
        approverInvoiceTypes: roleId === "approver" ? invoiceTypes : undefined
      }
      setUser(updatedUser)
      setNeedsRoleSelection(false)
      safeSaveToStorage(STORAGE_KEY, JSON.stringify(updatedUser))
      localStorage.removeItem(ROLE_SELECTION_KEY)
    }
  }

  const updateProfile = (data: { name?: string; email?: string; phone?: string }) => {
    if (user) {
      const updatedUser = { ...user, ...data }
      setUser(updatedUser)
      safeSaveToStorage(STORAGE_KEY, JSON.stringify(updatedUser))

      // Also update the users list so it persists across logins
      try {
        const usersStored = localStorage.getItem(USERS_STORAGE_KEY)
        if (usersStored) {
          const usersList = JSON.parse(usersStored)
          const idx = usersList.findIndex((u: any) => u.id === user.id || u.email === user.email)
          if (idx !== -1) {
            if (data.name) {
              const nameParts = data.name.split(' ')
              usersList[idx].firstName = nameParts[0] || ""
              usersList[idx].lastName = nameParts.slice(1).join(' ') || ""
            }
            if (data.email) usersList[idx].email = data.email
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList))
          }
        }
      } catch (e) {
        console.error("Failed to update users list:", e)
      }
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
    <AuthContext.Provider value={{ user, login, logout, selectRole, updateProfile, isAuthenticated, needsRoleSelection, isLoading }}>
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

// Helper function to get display name from role ID
export function getRoleDisplayName(roleId: string): string {
  return roleDisplayNames[roleId] || roleId
}
