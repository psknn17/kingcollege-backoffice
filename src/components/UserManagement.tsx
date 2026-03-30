import { useState, useMemo, useEffect } from "react"
import { usePersistedState } from "@/hooks/usePersistedState"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Label } from "./ui/label"
import { Checkbox } from "./ui/checkbox"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { Search, Filter, Plus, Edit, Trash2, Shield, UserCheck, UserX, RotateCcw, Eye, EyeOff, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { ColumnPresets } from "@/utils/tableAlignment"
import { logActivity } from "@/lib/activityLog"

type UserRole = "super_admin" | "admin_accountant" | "viewer" | "approver"
type UserStatus = "active" | "inactive" | "suspended"

interface Permission {
  id: string
  name: string
  description: string
  module: string
}

interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  roles: UserRole[]
  role: UserRole // Added for 1-to-1 transition
  status: UserStatus
  permissions: string[]
  createdAt: Date
  lastLogin: Date | null
  approverInvoiceTypes?: string[]
}

const INVOICE_CATEGORIES = [
  { id: "tuition", label: "Tuition Invoice" },
  { id: "eca", label: "ECA Invoice" },
  { id: "trip", label: "Trip & Activity Invoice" },
  { id: "exam", label: "Exam Invoice" },
  { id: "school_bus", label: "School Bus Invoice" },
  { id: "external", label: "External Invoice" },
]

// Permission definitions with translation keys
const permissionDefs = [
  // Tuition Management
  { id: "tuition_view", nameKey: "permission.viewTuition", descKey: "permissionDesc.viewTuition", moduleKey: "permissionModule.tuition" },
  { id: "tuition_edit", nameKey: "permission.editTuition", descKey: "permissionDesc.editTuition", moduleKey: "permissionModule.tuition" },
  { id: "tuition_delete", nameKey: "permission.deleteTuition", descKey: "permissionDesc.deleteTuition", moduleKey: "permissionModule.tuition" },

  // After School
  { id: "afterschool_view", nameKey: "permission.viewAfterSchool", descKey: "permissionDesc.viewAfterSchool", moduleKey: "permissionModule.afterSchool" },
  { id: "afterschool_edit", nameKey: "permission.editAfterSchool", descKey: "permissionDesc.editAfterSchool", moduleKey: "permissionModule.afterSchool" },
  { id: "afterschool_approve", nameKey: "permission.approveRegistrations", descKey: "permissionDesc.approveRegistrations", moduleKey: "permissionModule.afterSchool" },

  // Events
  { id: "event_view", nameKey: "permission.viewEvents", descKey: "permissionDesc.viewEvents", moduleKey: "permissionModule.events" },
  { id: "event_edit", nameKey: "permission.editEvents", descKey: "permissionDesc.editEvents", moduleKey: "permissionModule.events" },
  { id: "event_import", nameKey: "permission.importEvents", descKey: "permissionDesc.importEvents", moduleKey: "permissionModule.events" },

  // Summer Activities
  { id: "summer_view", nameKey: "permission.viewSummerActivities", descKey: "permissionDesc.viewSummerActivities", moduleKey: "permissionModule.summer" },
  { id: "summer_edit", nameKey: "permission.editSummerActivities", descKey: "permissionDesc.editSummerActivities", moduleKey: "permissionModule.summer" },

  // Discounts
  { id: "discount_view", nameKey: "permission.viewDiscounts", descKey: "permissionDesc.viewDiscounts", moduleKey: "permissionModule.discounts" },
  { id: "discount_edit", nameKey: "permission.editDiscounts", descKey: "permissionDesc.editDiscounts", moduleKey: "permissionModule.discounts" },
  { id: "discount_approve", nameKey: "permission.approveDiscounts", descKey: "permissionDesc.approveDiscounts", moduleKey: "permissionModule.discounts" },

  // Invoices
  { id: "invoice_view", nameKey: "permission.viewInvoices", descKey: "permissionDesc.viewInvoices", moduleKey: "permissionModule.invoices" },
  { id: "invoice_create", nameKey: "permission.createInvoices", descKey: "permissionDesc.createInvoices", moduleKey: "permissionModule.invoices" },
  { id: "invoice_edit", nameKey: "permission.editInvoices", descKey: "permissionDesc.editInvoices", moduleKey: "permissionModule.invoices" },
  { id: "invoice_delete", nameKey: "permission.deleteInvoices", descKey: "permissionDesc.deleteInvoices", moduleKey: "permissionModule.invoices" },
  { id: "invoice_approve", nameKey: "permission.approveInvoices", descKey: "permissionDesc.approveInvoices", moduleKey: "permissionModule.invoices" },

  // User Management
  { id: "user_view", nameKey: "permission.viewUsers", descKey: "permissionDesc.viewUsers", moduleKey: "permissionModule.users" },
  { id: "user_create", nameKey: "permission.createUsers", descKey: "permissionDesc.createUsers", moduleKey: "permissionModule.users" },
  { id: "user_edit", nameKey: "permission.editUsers", descKey: "permissionDesc.editUsers", moduleKey: "permissionModule.users" },
  { id: "user_delete", nameKey: "permission.deleteUsers", descKey: "permissionDesc.deleteUsers", moduleKey: "permissionModule.users" },
  { id: "user_permissions", nameKey: "permission.managePermissions", descKey: "permissionDesc.managePermissions", moduleKey: "permissionModule.users" },
]

// Helper function to get translated permissions
const getTranslatedPermissions = (t: (key: string) => string): Permission[] => {
  return permissionDefs.map(def => ({
    id: def.id,
    name: t(def.nameKey),
    description: t(def.descKey),
    module: t(def.moduleKey),
  }))
}

// Dummy allPermissions for backward compatibility (will be replaced at runtime)
const allPermissions: Permission[] = permissionDefs.map(def => ({
  id: def.id,
  name: def.nameKey,
  description: def.descKey,
  module: def.moduleKey,
}))

const roleDefaultPermissions: Record<UserRole, string[]> = {
  super_admin: allPermissions.map(p => p.id),
  admin_accountant: [
    "tuition_view", "tuition_edit",
    "afterschool_view", "afterschool_approve",
    "event_view", "event_edit", "event_import",
    "summer_view", "summer_edit",
    "discount_view", "discount_edit", "discount_approve",
    "invoice_view", "invoice_create", "invoice_edit", "invoice_approve",
    "user_view",
  ],
  approver: [
    "tuition_view",
    "afterschool_view", "afterschool_approve",
    "event_view",
    "summer_view",
    "discount_view", "discount_approve",
    "invoice_view", "invoice_approve",
  ],
  viewer: [
    "tuition_view",
    "afterschool_view",
    "event_view",
    "summer_view",
    "discount_view",
    "invoice_view",
  ],
}

const mockUsers: User[] = [
  {
    id: "1",
    username: "admin",
    email: "admin@school.com",
    firstName: "System",
    lastName: "Administrator",
    roles: ["super_admin"],
    role: "super_admin",
    status: "active",
    permissions: roleDefaultPermissions.super_admin,
    createdAt: new Date("2024-01-01"),
    lastLogin: new Date("2025-12-10"),
  },
  {
    id: "2",
    username: "john.smith",
    email: "john.smith@school.com",
    firstName: "John",
    lastName: "Smith",
    roles: ["approver"],
    role: "approver",
    status: "active",
    permissions: roleDefaultPermissions.approver,
    createdAt: new Date("2024-03-15"),
    lastLogin: new Date("2025-12-09"),
  },
  {
    id: "3",
    username: "sarah.acc",
    email: "sarah@school.com",
    firstName: "Sarah",
    lastName: "Johnson",
    roles: ["admin_accountant"],
    role: "admin_accountant",
    status: "active",
    permissions: roleDefaultPermissions.admin_accountant,
    createdAt: new Date("2024-06-01"),
    lastLogin: new Date("2025-12-08"),
  },
  {
    id: "4",
    username: "mike.viewer",
    email: "mike@school.com",
    firstName: "Mike",
    lastName: "Wilson",
    roles: ["viewer"],
    role: "viewer",
    status: "inactive",
    permissions: roleDefaultPermissions.viewer,
    createdAt: new Date("2024-09-01"),
    lastLogin: null,
  },
]

export function UserManagement() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)

  // Confirmation dialog hooks
  const addConfirmDialog = useConfirmDialog()
  const editConfirmDialog = useConfirmDialog()

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem("users")
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.map((u: any) => ({
          ...u,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          lastLogin: u.lastLogin ? new Date(u.lastLogin) : null,
        }))
      }
    } catch {}
    return mockUsers
  })
  const [filteredUsers, setFilteredUsers] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem("users")
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.map((u: any) => ({
          ...u,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          lastLogin: u.lastLogin ? new Date(u.lastLogin) : null,
        }))
      }
    } catch {}
    return mockUsers
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedUsers = (usersToSort: User[]) => {
    if (!sortColumn) return usersToSort
    return [...usersToSort].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "name":
          aVal = `${a.firstName} ${a.lastName}`
          bVal = `${b.firstName} ${b.lastName}`
          break
        case "username":
          aVal = a.username
          bVal = b.username
          break
        case "role":
          aVal = a.roles.join(", ")
          bVal = b.roles.join(", ")
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "permissions":
          aVal = a.permissions.length
          bVal = b.permissions.length
          break
        case "createdAt":
          aVal = a.createdAt?.getTime() || 0
          bVal = b.createdAt?.getTime() || 0
          break
        case "lastLogin":
          aVal = a.lastLogin ? a.lastLogin.getTime() : 0
          bVal = b.lastLogin ? b.lastLogin.getTime() : 0
          break
        default:
          return 0
      }
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal)
        return sortDirection === "asc" ? comparison : -comparison
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  // Persist users to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users))
  }, [users])

  // Pagination logic
  const sortedUsers = useMemo(() => getSortedUsers(filteredUsers), [filteredUsers, sortColumn, sortDirection])
  const totalPages = Math.ceil(sortedUsers.length / pageSize)
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedUsers.slice(startIndex, startIndex + pageSize)
  }, [sortedUsers, currentPage, pageSize])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter, statusFilter, sortColumn, sortDirection])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const [showPassword, setShowPassword] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "viewer" as UserRole,
    status: "active" as UserStatus,
    approverInvoiceTypes: [] as string[],
  })
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const applyFilters = () => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.roles.includes(roleFilter as UserRole))
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(user => user.status === statusFilter)
    }

    setFilteredUsers(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setRoleFilter("all")
    setStatusFilter("all")
    setFilteredUsers(users)
  }

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      role: "viewer" as UserRole,
      status: "active" as UserStatus,
      approverInvoiceTypes: [],
    })
    setSelectedPermissions([])
    setShowPassword(false)
  }

  const performCreateUser = () => {
    if (!formData.username || !formData.email || !formData.firstName || !formData.lastName || !formData.password) {
      toast.error("Please fill in all required fields")
      return
    }
    if (formData.role === "approver" && formData.approverInvoiceTypes.length === 0) {
      toast.error("Please select at least one invoice type for Approver")
      return
    }

    const mergedDefaultPermissions = roleDefaultPermissions[formData.role] || []

    const newUser: User = {
      id: String(Date.now()),
      username: formData.username,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      roles: [formData.role],
      role: formData.role,
      status: formData.status,
      permissions: roleDefaultPermissions[formData.role],
      createdAt: new Date(),
      lastLogin: null,
      approverInvoiceTypes: formData.role === "approver" ? formData.approverInvoiceTypes : undefined,
    }

    setUsers([...users, newUser])
    setFilteredUsers([...users, newUser])
    setIsCreateDialogOpen(false)
    resetForm()
    toast.success(`User ${newUser.username} created successfully`)
    logActivity({
      action: "Created user",
      module: "User Management",
      detail: `Username: ${newUser.username}, Role: ${newUser.roles.join(", ")}`
    })
  }

  const handleCreateUser = () => {
    addConfirmDialog.confirm(() => {
      performCreateUser()
    })
  }

  const performEditUser = () => {
    if (!selectedUser) return
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.username.trim() || !formData.email.trim()) {
      toast.error("Please fill in all required fields")
      return
    }
    if (formData.role === "approver" && formData.approverInvoiceTypes.length === 0) {
      toast.error("Please select at least one invoice type for Approver")
      return
    }

    const updatedUsers = users.map(user => {
      if (user.id === selectedUser.id) {
        return {
          ...user,
          username: formData.username,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          roles: [formData.role],
          role: formData.role,
          status: formData.status,
          approverInvoiceTypes: formData.role === "approver" ? formData.approverInvoiceTypes : undefined,
        }
      }
      return user
    })

    setUsers(updatedUsers)
    setFilteredUsers(updatedUsers)

    // Sync with current user session if the edited user is the current user
    if (user?.email === formData.email || user?.name === formData.username) {
      const storedAuthUser = localStorage.getItem("authUser")
      if (storedAuthUser) {
        const authUserData = JSON.parse(storedAuthUser)
        const updatedAuthUser = {
          ...authUserData,
          role: formData.role,
          approverInvoiceTypes: formData.role === "approver" ? formData.approverInvoiceTypes : undefined
        }
        localStorage.setItem("authUser", JSON.stringify(updatedAuthUser))
        // Window location reload or state update would be better, but standard for this project seems to be storage events
        window.dispatchEvent(new CustomEvent("authUserUpdated"))
      }
    }

    setIsEditDialogOpen(false)
    resetForm()
    toast.success(`User ${formData.username} updated successfully`)
    logActivity({
      action: "Updated user",
      module: "User Management",
      detail: `Username: ${formData.username}, Role: ${formData.role}`
    })
  }

  const handleEditUser = () => {
    editConfirmDialog.confirm(() => {
      performEditUser()
    })
  }

  const handleDeleteUser = () => {
    if (!selectedUser) return

    const updatedUsers = users.filter(user => user.id !== selectedUser.id)
    setUsers(updatedUsers)
    setFilteredUsers(updatedUsers)
    setIsDeleteDialogOpen(false)
    toast.success(`User ${selectedUser.username} deleted successfully`)
    logActivity({
      action: "Deleted user",
      module: "User Management",
      detail: `Username: ${selectedUser.username}`
    })
    setSelectedUser(null)
  }

  const handleSavePermissions = () => {
    if (!selectedUser) return

    const updatedUsers = users.map(user => {
      if (user.id === selectedUser.id) {
        return {
          ...user,
          permissions: selectedPermissions,
        }
      }
      return user
    })

    setUsers(updatedUsers)
    setFilteredUsers(updatedUsers)
    setIsPermissionDialogOpen(false)
    toast.success(`Permissions updated for ${selectedUser.username}`)
    logActivity({
      action: "Updated user permissions",
      module: "User Management",
      detail: `Username: ${selectedUser.username}, Permissions count: ${selectedPermissions.length}`
    })
    setSelectedUser(null)
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: "",
      role: user.role || user.roles[0],
      status: user.status,
      approverInvoiceTypes: user.approverInvoiceTypes || [],
    })
    setIsEditDialogOpen(true)
  }

  const openPermissionDialog = (user: User) => {
    setSelectedUser(user)
    setSelectedPermissions([...user.permissions])
    setIsPermissionDialogOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const toggleUserStatus = (userId: string) => {
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        const newStatus = user.status === "active" ? "inactive" : "active"
        toast.success(`User ${user.username} is now ${newStatus}`)
        logActivity({
          action: "Toggled user status",
          module: "User Management",
          detail: `Username: ${user.username} -> ${newStatus}`
        })
      }
      return user
    })
    setUsers(updatedUsers)
    setFilteredUsers(updatedUsers)
  }

  const handleRoleChange = (role: UserRole) => {
    setFormData({ ...formData, role: role, approverInvoiceTypes: role === "approver" ? formData.approverInvoiceTypes : [] })
    setSelectedPermissions(roleDefaultPermissions[role])
  }

  const togglePermission = (permissionId: string) => {
    if (selectedPermissions.includes(permissionId)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permissionId))
    } else {
      setSelectedPermissions([...selectedPermissions, permissionId])
    }
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return <Badge className="bg-purple-100 text-purple-800">SuperAdmin</Badge>
      case "admin_accountant":
        return <Badge className="bg-green-100 text-green-800">Finance Admin</Badge>
      case "approver":
        return <Badge className="bg-blue-100 text-blue-800">Approver</Badge>
      case "viewer":
        return <Badge className="bg-gray-100 text-gray-800">View</Badge>
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">{t("users.active")}</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">{t("users.inactive")}</Badge>
      case "suspended":
        return <Badge className="bg-red-100 text-red-800">{t("users.suspended")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const translatedPermissions = getTranslatedPermissions(t)
  const groupedPermissions = translatedPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = []
    }
    acc[perm.module].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  const summaryStats = {
    total: users.length,
    active: users.filter(u => u.status === "active").length,
    super_admin: users.filter(u => u.roles.includes("super_admin")).length,
    admin_accountant: users.filter(u => u.roles.includes("admin_accountant")).length,
    approver: users.filter(u => u.roles.includes("approver")).length,
    viewer: users.filter(u => u.roles.includes("viewer")).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("users.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("users.subtitle")}
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="flex items-center gap-2"
              disabled={!userCanEdit}
              onClick={() => {
                resetForm()
                setSelectedPermissions(roleDefaultPermissions.viewer)
              }}
            >
              <Plus className="w-4 h-4" />
              {t("userManagement.addUser")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle>{t("userManagement.createNewUser")}</DialogTitle>
              <DialogDescription>
                {t("userManagement.createNewUserDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("userManagement.firstNameLabel")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder={t("userManagement.enterFirstName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("userManagement.lastNameLabel")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder={t("userManagement.enterLastName")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t("userManagement.usernameLabel")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder={t("userManagement.enterUsername")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("userManagement.emailLabel")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t("userManagement.enterEmail")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("userManagement.passwordLabel")} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={t("userManagement.enterPassword")}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("userManagement.rolesLabel")}</Label>
                  <Select
                    value={formData.role}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">{t("userManagement.superAdmin")}</SelectItem>
                      <SelectItem value="admin_accountant">{t("userManagement.financeAdmin")}</SelectItem>
                      <SelectItem value="approver">{t("userManagement.approver")}</SelectItem>
                      <SelectItem value="viewer">{t("userManagement.viewer")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{t("userManagement.statusFormLabel")}</Label>
                  <Select value={formData.status} onValueChange={(value: UserStatus) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("userManagement.active")}</SelectItem>
                      <SelectItem value="inactive">{t("userManagement.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.role === "approver" && (
                <div className="space-y-2">
                  <Label>{t("userManagement.invoiceCategories")}</Label>
                  <p className="text-xs text-muted-foreground text-red-500">* Please select at least 1 category</p>
                  <div className="grid grid-cols-2 gap-2 border rounded-md p-3 bg-muted/20">
                    {INVOICE_CATEGORIES.map(({ id, label }) => (
                      <div key={id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`create-cat-${id}`}
                          checked={formData.approverInvoiceTypes.includes(id)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...formData.approverInvoiceTypes, id]
                              : formData.approverInvoiceTypes.filter(c => c !== id)
                            setFormData({ ...formData, approverInvoiceTypes: next })
                          }}
                        />
                        <Label htmlFor={`create-cat-${id}`} className="text-sm cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleCreateUser}>{t("common.createUser")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("userManagement.totalUsers")}</p>
            <p className="text-2xl font-bold">{summaryStats.total}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("userManagement.activeUsers")}</p>
            <p className="text-2xl font-bold">{summaryStats.active}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("userManagement.superAdmin")}</p>
            <p className="text-2xl font-bold">{summaryStats.super_admin}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("userManagement.financeAdmin")}</p>
            <p className="text-2xl font-bold">{summaryStats.admin_accountant}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("userManagement.approver")}</p>
            <p className="text-2xl font-bold">{summaryStats.approver}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("userManagement.viewer")}</p>
            <p className="text-2xl font-bold">{summaryStats.viewer}</p>
          </CardContent>
        </Card>
      </div>


      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {t("userManagement.searchAndFilter")}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="h-9">{t("common.apply")}</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("userManagement.searchLabel")}</label>
              <div className="relative">
                <Input
                  placeholder={t("userManagement.searchUsersPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("userManagement.roleLabel")}</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t("userManagement.allRoles")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("userManagement.allRoles")}</SelectItem>
                  <SelectItem value="super_admin">{t("userManagement.superAdmin")}</SelectItem>
                  <SelectItem value="admin_accountant">{t("userManagement.financeAdmin")}</SelectItem>
                  <SelectItem value="approver">{t("userManagement.approver")}</SelectItem>
                  <SelectItem value="viewer">{t("userManagement.viewer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("userManagement.statusLabel")}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("userManagement.allStatus")}</SelectItem>
                  <SelectItem value="active">{t("userManagement.active")}</SelectItem>
                  <SelectItem value="inactive">{t("userManagement.inactive")}</SelectItem>
                  <SelectItem value="suspended">{t("userManagement.suspended")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {t("userManagement.showingCount").replace("{filtered}", String(filteredUsers.length)).replace("{total}", String(users.length))}
        </p>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {/* User (Name + Email) - LEFT aligned */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1">
                    {t("table.user")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Username - LEFT aligned */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("username")}>
                  <div className="flex items-center gap-1">
                    {t("table.username")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Role Badge - CENTER aligned */}
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("role")}>
                  <div className="flex items-center justify-center gap-1">
                    {t("table.role")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Status Badge - CENTER aligned */}
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center justify-center gap-1">
                    {t("table.status")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Created Date - LEFT aligned */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("createdAt")}>
                  <div className="flex items-center gap-1">
                    {t("table.created")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Last Login Date - LEFT aligned */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("lastLogin")}>
                  <div className="flex items-center gap-1">
                    {t("table.lastLogin")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Actions - CENTER aligned */}
                <TableHead align="center">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  {/* User (Name + Email) - LEFT aligned */}
                  <TableCell align="left">
                    <div>
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  {/* Username - LEFT aligned */}
                  <TableCell align="left">{user.username}</TableCell>
                  {/* Role Badge - CENTER aligned */}
                  <TableCell align="center">{getRoleBadge(user.role || user.roles[0])}</TableCell>
                  {/* Status Badge - CENTER aligned */}
                  <TableCell align="center">{getStatusBadge(user.status)}</TableCell>
                  {/* Created Date - LEFT aligned */}
                  <TableCell align="left">{user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy") : "-"}</TableCell>
                  {/* Last Login Date - LEFT aligned */}
                  <TableCell align="left">
                    {user.lastLogin ? format(new Date(user.lastLogin), "dd MMM yyyy") : "-"}
                  </TableCell>
                  {/* Actions - CENTER aligned */}
                  <TableCell align="center">
                    <div className="flex gap-1 justify-center">

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(user)}
                        disabled={!userCanEdit}
                        title={t("userManagement.editUserTooltip")}
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleUserStatus(user.id)}
                        disabled={!userCanEdit}
                        title={user.status === "active" ? t("userManagement.deactivateUser") : t("userManagement.activateUser")}
                      >
                        {user.status === "active" ? (
                          <UserX className="w-4 h-4 text-orange-600" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                      {!user.roles.includes("super_admin") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(user)}
                          disabled={!userCanEdit}
                          title={t("userManagement.deleteUserTooltip")}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={sortedUsers.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{t("userManagement.editUserTitle")}</DialogTitle>
            <DialogDescription>
              {t("userManagement.updateUserInfo")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">{t("userManagement.firstNameEditLabel")}</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">{t("userManagement.lastNameEditLabel")}</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-username">{t("userManagement.usernameEditLabel")}</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">{t("userManagement.emailEditLabel")}</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>{t("userManagement.rolesLabel")}</Label>
                <Select
                  value={formData.role}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">{t("userManagement.superAdmin")}</SelectItem>
                    <SelectItem value="admin_accountant">{t("userManagement.financeAdmin")}</SelectItem>
                    <SelectItem value="approver">{t("userManagement.approver")}</SelectItem>
                    <SelectItem value="viewer">{t("userManagement.viewer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">{t("userManagement.statusFormLabel")}</Label>
                <Select value={formData.status} onValueChange={(value: UserStatus) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("userManagement.active")}</SelectItem>
                    <SelectItem value="inactive">{t("userManagement.inactive")}</SelectItem>
                    <SelectItem value="suspended">{t("userManagement.suspended")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.role === "approver" && (
              <div className="space-y-2">
                <Label>{t("userManagement.invoiceCategories")}</Label>
                <p className="text-xs text-muted-foreground text-red-500">* Please select at least 1 category (If not selected, items will not appear in the Approval Queue)</p>
                <div className="grid grid-cols-2 gap-2 border rounded-md p-3 bg-muted/20">
                  {INVOICE_CATEGORIES.map(({ id, label }) => (
                    <div key={id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-cat-${id}`}
                        checked={formData.approverInvoiceTypes.includes(id)}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...formData.approverInvoiceTypes, id]
                            : formData.approverInvoiceTypes.filter(c => c !== id)
                          setFormData({ ...formData, approverInvoiceTypes: next })
                        }}
                      />
                      <Label htmlFor={`edit-cat-${id}`} className="text-sm cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleEditUser}>{t("common.saveChanges")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>{t("userManagement.managePermissions").replace("{username}", selectedUser?.username ?? "")}</DialogTitle>
            <DialogDescription>
              {t("userManagement.customizePermissions")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPermissions(allPermissions.map(p => p.id))}
              >
                {t("userManagement.selectAll")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPermissions([])}
              >
                {t("userManagement.clearAll")}
              </Button>
              {selectedUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPermissions(Array.from(new Set(selectedUser.roles.flatMap(r => roleDefaultPermissions[r] || []))))}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t("userManagement.resetToDefault")}
                </Button>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-6">
              {Object.entries(groupedPermissions).map(([module, permissions]) => (
                <div key={module} className="space-y-2">
                  <h4 className="font-medium text-sm border-b pb-1">{module}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {permissions.map(permission => (
                      <div key={permission.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`perm-${permission.id}`}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <div>
                          <label
                            htmlFor={`perm-${permission.id}`}
                            className="text-sm cursor-pointer font-medium"
                          >
                            {permission.name}
                          </label>
                          <p className="text-xs text-muted-foreground">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSavePermissions}>{t("common.savePermissions")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{t("userManagement.deleteUserTitle")}</DialogTitle>
            <DialogDescription>
              {t("userManagement.deleteUserDesc").replace("{name}", `${selectedUser?.firstName ?? ""} ${selectedUser?.lastName ?? ""}`.trim())}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>{t("common.delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Confirmation Dialog */}
      <ConfirmDialog
        open={addConfirmDialog.isOpen}
        onOpenChange={addConfirmDialog.setIsOpen}
        onConfirm={addConfirmDialog.handleConfirm}
        titleKey="confirmDialog.createTitle"
        descriptionKey="confirmDialog.createDescription"
        confirmTextKey="common.create"
      />

      {/* Edit User Confirmation Dialog */}
      <ConfirmDialog
        open={editConfirmDialog.isOpen}
        onOpenChange={editConfirmDialog.setIsOpen}
        onConfirm={editConfirmDialog.handleConfirm}
        titleKey="confirmDialog.editTitle"
        descriptionKey="confirmDialog.editDescription"
        confirmTextKey="common.save"
      />
    </div>
  )
}
