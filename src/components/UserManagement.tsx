import { useState, useMemo, useEffect } from "react"
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
import { usePersistedState } from "@/hooks/usePersistedState"
import { Search, Filter, Plus, Edit, Trash2, Shield, UserCheck, UserX, RotateCcw, Eye, EyeOff, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { ColumnPresets } from "@/utils/tableAlignment"

type UserRole = "admin" | "approver" | "accounting" | "viewer"
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
  role: UserRole
  status: UserStatus
  permissions: string[]
  createdAt: Date
  lastLogin: Date | null
}

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
  admin: allPermissions.map(p => p.id),
  approver: [
    "tuition_view", "tuition_edit",
    "afterschool_view", "afterschool_approve",
    "event_view",
    "summer_view",
    "discount_view", "discount_approve",
    "invoice_view", "invoice_approve",
  ],
  accounting: [
    "tuition_view", "tuition_edit",
    "afterschool_view",
    "event_view",
    "summer_view",
    "discount_view", "discount_edit",
    "invoice_view", "invoice_create", "invoice_edit",
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
    role: "admin",
    status: "active",
    permissions: roleDefaultPermissions.admin,
    createdAt: new Date("2024-01-01"),
    lastLogin: new Date("2025-12-10"),
  },
  {
    id: "2",
    username: "john.smith",
    email: "john.smith@school.com",
    firstName: "John",
    lastName: "Smith",
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
    role: "accounting",
    status: "active",
    permissions: roleDefaultPermissions.accounting,
    createdAt: new Date("2024-06-01"),
    lastLogin: new Date("2025-12-08"),
  },
  {
    id: "4",
    username: "mike.viewer",
    email: "mike@school.com",
    firstName: "Mike",
    lastName: "Wilson",
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

  const [users, setUsers] = useState<User[]>(mockUsers)
  const [filteredUsers, setFilteredUsers] = useState<User[]>(mockUsers)
  const [searchTerm, setSearchTerm] = usePersistedState("user-management:search", "")
  const [roleFilter, setRoleFilter] = usePersistedState("user-management:roleFilter", "all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortColumn, setSortColumn] = usePersistedState<string>("user-management:sortColumn", "")
  const [sortDirection, setSortDirection] = usePersistedState<"asc" | "desc">("user-management:sortDirection", "asc")

  // Pagination states
  const [currentPage, setCurrentPage] = usePersistedState("user-management:page", 1)
  const [pageSize, setPageSize] = usePersistedState("user-management:pageSize", 10)

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
          aVal = a.role
          bVal = b.role
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

  // Pagination logic
  const sortedUsers = useMemo(() => getSortedUsers(filteredUsers), [filteredUsers, sortColumn, sortDirection])
  const totalPages = Math.ceil(sortedUsers.length / pageSize)
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedUsers.slice(startIndex, startIndex + pageSize)
  }, [sortedUsers, currentPage, pageSize])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

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
      filtered = filtered.filter(user => user.role === roleFilter)
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
      role: "viewer",
      status: "active",
    })
    setSelectedPermissions([])
    setShowPassword(false)
  }

  const performCreateUser = () => {
    if (!formData.username || !formData.email || !formData.firstName || !formData.lastName || !formData.password) {
      toast.error("Please fill in all required fields")
      return
    }

    const newUser: User = {
      id: String(Date.now()),
      username: formData.username,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      status: formData.status,
      permissions: selectedPermissions.length > 0 ? selectedPermissions : roleDefaultPermissions[formData.role],
      createdAt: new Date(),
      lastLogin: null,
    }

    setUsers([...users, newUser])
    setFilteredUsers([...users, newUser])
    setIsCreateDialogOpen(false)
    resetForm()
    toast.success(`User ${newUser.username} created successfully`)
  }

  const handleCreateUser = () => {
    addConfirmDialog.confirm(() => {
      performCreateUser()
    })
  }

  const performEditUser = () => {
    if (!selectedUser) return

    const updatedUsers = users.map(user => {
      if (user.id === selectedUser.id) {
        return {
          ...user,
          username: formData.username,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          status: formData.status,
        }
      }
      return user
    })

    setUsers(updatedUsers)
    setFilteredUsers(updatedUsers)
    setIsEditDialogOpen(false)
    resetForm()
    toast.success(`User ${formData.username} updated successfully`)
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
      role: user.role,
      status: user.status,
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
        return { ...user, status: newStatus as UserStatus }
      }
      return user
    })
    setUsers(updatedUsers)
    setFilteredUsers(updatedUsers)
  }

  const handleRoleChange = (role: UserRole) => {
    setFormData({ ...formData, role })
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
      case "admin":
        return <Badge className="bg-purple-100 text-purple-800">{t("role.admin")}</Badge>
      case "approver":
        return <Badge className="bg-blue-100 text-blue-800">{t("role.approver")}</Badge>
      case "accounting":
        return <Badge className="bg-green-100 text-green-800">{t("role.accounting")}</Badge>
      case "viewer":
        return <Badge className="bg-gray-100 text-gray-800">{t("role.viewer")}</Badge>
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
    admin: users.filter(u => u.role === "admin").length,
    approver: users.filter(u => u.role === "approver").length,
    accounting: users.filter(u => u.role === "accounting").length,
    viewer: users.filter(u => u.role === "viewer").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("users.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("users.subtitle")}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summaryStats.admin}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approvers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.approver}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accounting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.accounting}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Viewer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{summaryStats.viewer}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add User Button */}
      <div className="flex justify-end">
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
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with role and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
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
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value: UserRole) => handleRoleChange(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t("role.admin")}</SelectItem>
                      <SelectItem value="approver">{t("role.approver")}</SelectItem>
                      <SelectItem value="accounting">{t("role.accounting")}</SelectItem>
                      <SelectItem value="viewer">{t("role.viewer")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: UserStatus) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>


            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleCreateUser}>{t("common.createUser")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              Search & Filter
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
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Input
                  placeholder="Username, email, name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">{t("role.admin")}</SelectItem>
                  <SelectItem value="approver">{t("role.approver")}</SelectItem>
                  <SelectItem value="accounting">{t("role.accounting")}</SelectItem>
                  <SelectItem value="viewer">{t("role.viewer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
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
                  <TableCell align="center">{getRoleBadge(user.role)}</TableCell>
                  {/* Status Badge - CENTER aligned */}
                  <TableCell align="center">{getStatusBadge(user.status)}</TableCell>
                  {/* Created Date - LEFT aligned */}
                  <TableCell align="left">{format(user.createdAt, "MMM dd, yyyy")}</TableCell>
                  {/* Last Login Date - LEFT aligned */}
                  <TableCell align="left">
                    {user.lastLogin ? format(user.lastLogin, "MMM dd, yyyy") : "-"}
                  </TableCell>
                  {/* Actions - CENTER aligned */}
                  <TableCell align="center">
                    <div className="flex gap-1 justify-center">

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(user)}
                        disabled={!userCanEdit}
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleUserStatus(user.id)}
                        disabled={!userCanEdit}
                        title={user.status === "active" ? "Deactivate User" : "Activate User"}
                      >
                        {user.status === "active" ? (
                          <UserX className="w-4 h-4 text-orange-600" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                      {user.role !== "admin" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(user)}
                          disabled={!userCanEdit}
                          title="Delete User"
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
          {sortedUsers.length > 0 && (
            <div className="flex items-center justify-between border-t p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t("common.show")}</span>
                <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>{t("common.entries")}</span>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedUsers.length)} of {sortedUsers.length} users
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="approver">Approver</SelectItem>
                    <SelectItem value="accounting">Accounting</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value: UserStatus) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <DialogTitle>Manage Permissions - {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Customize permissions for this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPermissions(allPermissions.map(p => p.id))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPermissions([])}
              >
                Clear All
              </Button>
              {selectedUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPermissions(roleDefaultPermissions[selectedUser.role])}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset to Role Default
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
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.firstName} {selectedUser?.lastName}? This action cannot be undone.
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
