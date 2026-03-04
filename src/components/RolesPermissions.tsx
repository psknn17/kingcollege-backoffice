import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog"
import { Badge } from "./ui/badge"
import { Checkbox } from "./ui/checkbox"
import { Textarea } from "./ui/textarea"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { usePersistedState } from "@/hooks/usePersistedState"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  Users,
  Eye,
  Lock,
  CheckCircle2,
  XCircle,
  ArrowUpDown
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"

// Permission modules and actions
const permissionModules = [
  {
    id: "students",
    name: "Students",
    description: "Student records management",
    actions: ["view", "create", "edit", "delete"]
  },
  {
    id: "families",
    name: "Family",
    description: "Family groups management",
    actions: ["view", "create", "edit", "delete"]
  },
  {
    id: "tuition",
    name: "Tuition",
    description: "Tuition fees and payments",
    actions: ["view", "create", "edit", "delete"]
  },
  {
    id: "invoices",
    name: "Invoices",
    description: "Invoice management",
    actions: ["view", "create", "edit", "delete", "send_email", "download"]
  },
  {
    id: "payments",
    name: "Payments",
    description: "Payment processing",
    actions: ["view", "create", "edit", "void"]
  },
  {
    id: "discounts",
    name: "Discounts",
    description: "Discount management",
    actions: ["view", "create", "edit", "delete"]
  },
  {
    id: "afterschool",
    name: "After School",
    description: "ECA programs",
    actions: ["view", "create", "edit", "delete"]
  },
  {
    id: "events",
    name: "Events",
    description: "Events and trips",
    actions: ["view", "create", "edit", "delete"]
  },
  {
    id: "reports",
    name: "Reports",
    description: "View and export reports",
    actions: ["view", "export"]
  },
  {
    id: "settings",
    name: "Settings",
    description: "System settings",
    actions: ["view", "manage"]
  },
  {
    id: "users",
    name: "Users",
    description: "User account management",
    actions: ["view", "create", "edit", "delete"]
  },
  {
    id: "roles",
    name: "Roles",
    description: "Roles and permissions",
    actions: ["view", "create", "edit", "delete"]
  }
]

const actionLabels: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  send_email: "Send Email",
  download: "Download",
  void: "Void",
  export: "Export",
  manage: "Manage"
}

interface Permission {
  moduleId: string
  actions: string[]
}

interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isSystem: boolean // System roles cannot be deleted
  userCount: number
  createdAt: Date
  updatedAt: Date
}

// Sample roles data
const initialRoles: Role[] = [
  {
    id: "role_superadmin",
    name: "Admin",
    description: "Full system access with all permissions",
    permissions: permissionModules.map(m => ({ moduleId: m.id, actions: m.actions })),
    isSystem: true,
    userCount: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },
  {
    id: "role_admin_accountant",
    name: "Finance Admin",
    description: "Administrative and financial operations - full access to invoices, payments, settings, and reports",
    permissions: permissionModules
      .filter(m => m.id !== "roles")
      .map(m => ({ moduleId: m.id, actions: m.actions })),
    isSystem: true,
    userCount: 5,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },
  {
    id: "role_viewer",
    name: "Viewver",
    description: "Read-only access to reports",
    permissions: [
      { moduleId: "reports", actions: ["view"] }
    ],
    isSystem: false,
    userCount: 5,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01")
  }
]

const emptyRole: Omit<Role, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  description: "",
  permissions: [],
  isSystem: false,
  userCount: 0
}

export function RolesPermissions() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)

  // Confirmation dialog hooks
  const saveConfirmDialog = useConfirmDialog()
  const addConfirmDialog = useConfirmDialog()

  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [searchTerm, setSearchTerm] = usePersistedState("roles-permissions:search", "")
  const [expandedModules, setExpandedModules] = usePersistedState<string[]>("roles-permissions:expandedModules", [])
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedRoles = (rolesToSort: Role[]) => {
    if (!sortColumn) return rolesToSort
    return [...rolesToSort].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "name":
          aVal = a.name
          bVal = b.name
          break
        case "description":
          aVal = a.description
          bVal = b.description
          break
        case "permissions":
          aVal = countPermissions(a)
          bVal = countPermissions(b)
          break
        case "userCount":
          aVal = a.userCount
          bVal = b.userCount
          break
        case "type":
          aVal = a.isSystem ? 0 : 1
          bVal = b.isSystem ? 0 : 1
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

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState<Omit<Role, "id" | "createdAt" | "updatedAt">>(emptyRole)

  // Filter roles
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Permission helpers
  const hasPermission = (moduleId: string, action: string): boolean => {
    const perm = formData.permissions.find(p => p.moduleId === moduleId)
    return perm ? perm.actions.includes(action) : false
  }

  const togglePermission = (moduleId: string, action: string) => {
    setFormData(prev => {
      const existingPerm = prev.permissions.find(p => p.moduleId === moduleId)

      if (existingPerm) {
        const hasAction = existingPerm.actions.includes(action)
        if (hasAction) {
          // Remove action
          const newActions = existingPerm.actions.filter(a => a !== action)
          if (newActions.length === 0) {
            // Remove entire module if no actions left
            return {
              ...prev,
              permissions: prev.permissions.filter(p => p.moduleId !== moduleId)
            }
          }
          return {
            ...prev,
            permissions: prev.permissions.map(p =>
              p.moduleId === moduleId ? { ...p, actions: newActions } : p
            )
          }
        } else {
          // Add action
          return {
            ...prev,
            permissions: prev.permissions.map(p =>
              p.moduleId === moduleId ? { ...p, actions: [...p.actions, action] } : p
            )
          }
        }
      } else {
        // Add new module with action
        return {
          ...prev,
          permissions: [...prev.permissions, { moduleId, actions: [action] }]
        }
      }
    })
  }

  const toggleAllModuleActions = (moduleId: string) => {
    const module = permissionModules.find(m => m.id === moduleId)
    if (!module) return

    const existingPerm = formData.permissions.find(p => p.moduleId === moduleId)
    const hasAllActions = existingPerm && existingPerm.actions.length === module.actions.length

    if (hasAllActions) {
      // Remove all
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p.moduleId !== moduleId)
      }))
    } else {
      // Add all
      setFormData(prev => {
        const filtered = prev.permissions.filter(p => p.moduleId !== moduleId)
        return {
          ...prev,
          permissions: [...filtered, { moduleId, actions: [...module.actions] }]
        }
      })
    }
  }

  const selectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: permissionModules.map(m => ({ moduleId: m.id, actions: [...m.actions] }))
    }))
  }

  const clearAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }))
  }

  // Dialog handlers
  const handleAddRole = () => {
    setFormData(emptyRole)
    setIsAddDialogOpen(true)
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => ({ ...p, actions: [...p.actions] })),
      isSystem: role.isSystem,
      userCount: role.userCount
    })
    setIsEditDialogOpen(true)
  }

  const handleViewRole = (role: Role) => {
    setSelectedRole(role)
    setIsViewDialogOpen(true)
  }

  const handleDeleteRole = (role: Role) => {
    if (role.isSystem) {
      toast.error("System roles cannot be deleted")
      return
    }
    if (role.userCount > 0) {
      toast.error(`Cannot delete role with ${role.userCount} assigned users`)
      return
    }
    setSelectedRole(role)
    setIsDeleteDialogOpen(true)
  }

  const performSaveNewRole = () => {
    if (!formData.name.trim()) {
      toast.error("Role name is required")
      return
    }

    if (roles.some(r => r.name.toLowerCase() === formData.name.toLowerCase())) {
      toast.error("Role name already exists")
      return
    }

    const now = new Date()
    const newRole: Role = {
      id: `role_${Date.now()}`,
      ...formData,
      createdAt: now,
      updatedAt: now
    }

    setRoles(prev => [...prev, newRole])
    setIsAddDialogOpen(false)
    toast.success(`Role "${formData.name}" created`)
  }

  const handleSaveNewRole = () => {
    addConfirmDialog.confirm(() => {
      performSaveNewRole()
    })
  }

  const performSaveEditRole = () => {
    if (!selectedRole) return

    if (!formData.name.trim()) {
      toast.error("Role name is required")
      return
    }

    if (roles.some(r => r.id !== selectedRole.id && r.name.toLowerCase() === formData.name.toLowerCase())) {
      toast.error("Role name already exists")
      return
    }

    setRoles(prev =>
      prev.map(r =>
        r.id === selectedRole.id
          ? { ...r, ...formData, updatedAt: new Date() }
          : r
      )
    )
    setIsEditDialogOpen(false)
    toast.success(`Role "${formData.name}" updated`)
  }

  const handleSaveEditRole = () => {
    saveConfirmDialog.confirm(() => {
      performSaveEditRole()
    })
  }

  const handleConfirmDelete = () => {
    if (!selectedRole) return

    setRoles(prev => prev.filter(r => r.id !== selectedRole.id))
    setIsDeleteDialogOpen(false)
    toast.success(`Role "${selectedRole.name}" deleted`)
  }

  // Count permissions for a role
  const countPermissions = (role: Role): number => {
    return role.permissions.reduce((sum, p) => sum + p.actions.length, 0)
  }

  // Permission matrix component
  const PermissionMatrix = ({ readOnly = false }: { readOnly?: boolean }) => (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAllPermissions}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearAllPermissions}>
            <XCircle className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px]">{t("table.module")}</TableHead>
              <TableHead className="text-center">{t("table.view")}</TableHead>
              <TableHead className="text-center">{t("table.create")}</TableHead>
              <TableHead className="text-center">{t("table.edit")}</TableHead>
              <TableHead className="text-center">{t("common.delete")}</TableHead>
              <TableHead className="text-center">{t("table.other")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissionModules.map(module => {
              const existingPerm = readOnly
                ? selectedRole?.permissions.find(p => p.moduleId === module.id)
                : formData.permissions.find(p => p.moduleId === module.id)
              const hasAllActions = existingPerm && existingPerm.actions.length === module.actions.length

              const standardActions = ["view", "create", "edit", "delete"]
              const otherActions = module.actions.filter(a => !standardActions.includes(a))

              return (
                <TableRow key={module.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!readOnly && (
                        <Checkbox
                          checked={hasAllActions}
                          onCheckedChange={() => toggleAllModuleActions(module.id)}
                        />
                      )}
                      <div>
                        <p className="font-medium">{module.name}</p>
                        <p className="text-xs text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  {standardActions.map(action => (
                    <TableCell key={action} className="text-center">
                      {module.actions.includes(action) ? (
                        readOnly ? (
                          existingPerm?.actions.includes(action) ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <Checkbox
                            checked={hasPermission(module.id, action)}
                            onCheckedChange={() => togglePermission(module.id, action)}
                          />
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    {otherActions.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {otherActions.map(action => (
                          <div key={action} className="flex items-center gap-1">
                            {readOnly ? (
                              existingPerm?.actions.includes(action) ? (
                                <Badge variant="secondary" className="text-xs">
                                  {actionLabels[action]}
                                </Badge>
                              ) : null
                            ) : (
                              <label className="flex items-center gap-1 text-xs cursor-pointer">
                                <Checkbox
                                  checked={hasPermission(module.id, action)}
                                  onCheckedChange={() => togglePermission(module.id, action)}
                                />
                                {actionLabels[action]}
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("roles.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("roles.subtitle")}</p>
        </div>
        <Button onClick={handleAddRole} disabled={!userCanEdit}>
          <Plus className="w-4 h-4 mr-2" />
          {t("roles.addRole")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roles.length}</p>
                <p className="text-muted-foreground text-sm">Total Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roles.reduce((sum, r) => sum + r.userCount, 0)}</p>
                <p className="text-muted-foreground text-sm">Users Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Lock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roles.filter(r => r.isSystem).length}</p>
                <p className="text-muted-foreground text-sm">System Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{permissionModules.length}</p>
                <p className="text-muted-foreground text-sm">Permission Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Roles</CardTitle>
          <CardDescription>Click on a role to view or edit its permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className=""
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1">
                    Role Name
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("description")}>
                  <div className="flex items-center gap-1">
                    Description
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort("permissions")}>
                  <div className="flex items-center justify-center gap-1">
                    Permissions
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort("userCount")}>
                  <div className="flex items-center justify-center gap-1">
                    Users
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort("type")}>
                  <div className="flex items-center justify-center gap-1">
                    Type
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No roles found
                  </TableCell>
                </TableRow>
              ) : (
                getSortedRoles(filteredRoles).map(role => (
                  <TableRow key={role.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewRole(role)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{role.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {role.description}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{countPermissions(role)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{role.userCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {role.isSystem ? (
                        <Badge className="bg-blue-100 text-blue-800">System</Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleViewRole(role)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditRole(role)} disabled={!userCanEdit}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={role.isSystem || role.userCount > 0 ? "text-muted-foreground" : "text-destructive"}
                          onClick={() => handleDeleteRole(role)}
                          disabled={!userCanEdit || role.isSystem || role.userCount > 0}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Define a new role with specific permissions</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Finance Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this role"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <PermissionMatrix />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewRole} disabled={!userCanEdit}>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <DialogTitle className="text-xl">Edit Role</DialogTitle>
            <DialogDescription>Modify role settings and permissions</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Role Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">Role Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Finance Manager"
                  disabled={selectedRole?.isSystem}
                  className="h-10"
                />
                {selectedRole?.isSystem && (
                  <p className="text-xs text-muted-foreground">System role names cannot be changed</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm font-medium">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this role"
                  className="h-10"
                />
              </div>
            </div>

            {/* Permissions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Permissions</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllPermissions} className="h-8 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAllPermissions} className="h-8 text-xs">
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[220px] py-3 pl-4">{t("table.module")}</TableHead>
                      <TableHead className="text-center w-[80px] py-3">{t("table.view")}</TableHead>
                      <TableHead className="text-center w-[80px] py-3">{t("table.create")}</TableHead>
                      <TableHead className="text-center w-[80px] py-3">{t("table.edit")}</TableHead>
                      <TableHead className="text-center w-[80px] py-3">{t("common.delete")}</TableHead>
                      <TableHead className="text-center py-3 pr-4">{t("table.other")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissionModules.map((module, index) => {
                      const existingPerm = formData.permissions.find(p => p.moduleId === module.id)
                      const hasAllActions = existingPerm && existingPerm.actions.length === module.actions.length

                      const standardActions = ["view", "create", "edit", "delete"]
                      const otherActions = module.actions.filter(a => !standardActions.includes(a))

                      return (
                        <TableRow key={module.id} className={index % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                          <TableCell className="py-3 pl-4">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={hasAllActions}
                                onCheckedChange={() => toggleAllModuleActions(module.id)}
                                className="h-4 w-4"
                              />
                              <div>
                                <p className="font-medium text-sm">{module.name}</p>
                                <p className="text-xs text-muted-foreground">{module.description}</p>
                              </div>
                            </div>
                          </TableCell>
                          {standardActions.map(action => (
                            <TableCell key={action} className="text-center py-3">
                              {module.actions.includes(action) ? (
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={hasPermission(module.id, action)}
                                    onCheckedChange={() => togglePermission(module.id, action)}
                                    className="h-4 w-4"
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground/50">-</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-center py-3 pr-4">
                            {otherActions.length > 0 ? (
                              <div className="flex flex-col gap-1.5 items-start">
                                {otherActions.map(action => (
                                  <label key={action} className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground">
                                    <Checkbox
                                      checked={hasPermission(module.id, action)}
                                      onCheckedChange={() => togglePermission(module.id, action)}
                                      className="h-3.5 w-3.5"
                                    />
                                    <span className="text-muted-foreground">{actionLabels[action]}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditRole}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Role Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {selectedRole?.name}
              {selectedRole?.isSystem && (
                <Badge className="bg-blue-100 text-blue-800 ml-2">System</Badge>
              )}
            </DialogTitle>
            <DialogDescription>{selectedRole?.description}</DialogDescription>
          </DialogHeader>

          {selectedRole && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Permissions</p>
                  <p className="text-2xl font-bold">{countPermissions(selectedRole)}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Assigned Users</p>
                  <p className="text-2xl font-bold">{selectedRole.userCount}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Modules Access</p>
                  <p className="text-2xl font-bold">{selectedRole.permissions.length}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Permission Details</Label>
                <PermissionMatrix readOnly />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false)
                if (selectedRole) handleEditRole(selectedRole)
              }}
              disabled={!userCanEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete the role <strong>{selectedRole?.name}</strong>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Role Confirmation Dialog */}
      <ConfirmDialog
        open={saveConfirmDialog.isOpen}
        onOpenChange={saveConfirmDialog.setIsOpen}
        onConfirm={saveConfirmDialog.handleConfirm}
        titleKey="confirmDialog.editTitle"
        descriptionKey="confirmDialog.editDescription"
        confirmTextKey="common.save"
      />

      {/* Add Role Confirmation Dialog */}
      <ConfirmDialog
        open={addConfirmDialog.isOpen}
        onOpenChange={addConfirmDialog.setIsOpen}
        onConfirm={addConfirmDialog.handleConfirm}
        titleKey="confirmDialog.createTitle"
        descriptionKey="confirmDialog.createDescription"
        confirmTextKey="common.create"
      />
    </div>
  )
}
