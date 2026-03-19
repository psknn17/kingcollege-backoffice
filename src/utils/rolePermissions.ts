// Role-based menu access configuration

export const rolePermissions = {
  super_admin: {
    name: "Admin",
    sections: ["general", "tuition", "eca", "tripActivity", "exam", "schoolBus", "externalInvoice", "discount", "userManagement", "studentManagement", "report", "analytics"],
    menuItems: [] as string[], // Empty means ALL items within allowed sections
    excludedMenuItems: [] as string[]
  },
  admin_accountant: {
    name: "Finance Admin",
    sections: ["general", "tuition", "eca", "tripActivity", "exam", "schoolBus", "externalInvoice", "discount", "studentManagement", "report", "analytics"],
    menuItems: [],
    excludedMenuItems: ["approval-queue"]
  },
  viewer: {
    name: "Viewver",
    sections: ["general", "report", "analytics"],
    menuItems: ["tuition-dashboard", "analytics-dashboard", "discount-reports"] // Can view dashboard/analytics/reports only
  },
  approver: {
    name: "Approver",
    sections: ["general", "userManagement"],
    menuItems: ["approval-queue"]
  },
}

export function canAccessSection(userRole: string, section: string): boolean {
  const normalizedRole = normalizeRoleName(userRole)
  const permissions = rolePermissions[normalizedRole as keyof typeof rolePermissions]

  if (!permissions) return false

  return permissions.sections.includes(section)
}

export function canAccessMenuItem(userRole: string, menuItemId: string): boolean {
  const normalizedRole = normalizeRoleName(userRole)
  const permissions = rolePermissions[normalizedRole as keyof typeof rolePermissions]

  if (!permissions) return false

  // Check exclusions first
  const rolePermissionsAny = permissions as any
  if (rolePermissionsAny.excludedMenuItems && rolePermissionsAny.excludedMenuItems.includes(menuItemId)) {
    return false
  }

  // If menuItems is empty, user has access to all items in their allowed sections
  if (permissions.menuItems.length === 0) return true

  // Otherwise check if item is in the allowed list
  return (permissions.menuItems as string[]).includes(menuItemId)
}

export function getAccessibleMenuItems(userRole: string, section: string, items: any[]): any[] {
  const normalizedRole = normalizeRoleName(userRole)
  const permissions = rolePermissions[normalizedRole as keyof typeof rolePermissions]

  if (!permissions) return []

  // Check if user can access this section at all
  if (!permissions.sections.includes(section)) return []

  // Apply exclusions if any
  const rolePermissionsAny = permissions as any
  let accessibleItems = items
  if (rolePermissionsAny.excludedMenuItems) {
    accessibleItems = accessibleItems.filter(item => !rolePermissionsAny.excludedMenuItems.includes(item.id))
  }

  // If menuItems is empty, return all (filtered by exclusions) items in section
  if (permissions.menuItems.length === 0) return accessibleItems

  // Filter items based on allowed menuItems
  return accessibleItems.filter(item => (permissions.menuItems as string[]).includes(item.id))
}

function normalizeRoleName(role: string): string {
  // Convert role display names back to IDs
  const roleMap: Record<string, string> = {
    "Admin": "super_admin",
    "admin": "super_admin",
    "AdminAccountant": "admin_accountant",
    "Finance Admin": "admin_accountant",
    "Viewver": "viewer",
    "Approvalver": "approver",
    "Approver": "approver",
  }

  return roleMap[role] || role.toLowerCase().replace(/[\/\s]/g, '_')
}

// Check if user can perform edit/add/delete actions (read-only check)
export function canPerformActions(userRole: string | undefined): boolean {
  if (!userRole) return false

  const normalizedRole = normalizeRoleName(userRole)

  // Viewer role can only view, cannot perform any actions
  return normalizedRole !== "viewer"
}

// Check if user is viewer (convenience function)
export function isViewerRole(userRole: string | undefined): boolean {
  if (!userRole) return false
  return normalizeRoleName(userRole) === "viewer"
}
