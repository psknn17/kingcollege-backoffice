// Role-based menu access configuration

export const rolePermissions = {
  super_admin: {
    name: "Super Admin",
    sections: ["tuition", "eca", "events", "summer", "discount", "userManagement"],
    menuItems: [] // Empty means ALL items within allowed sections
  },
  admin: {
    name: "Admin",
    sections: ["tuition", "eca", "events", "summer", "discount"],
    menuItems: [] // All items except userManagement section
  },
  accountant: {
    name: "Accountant",
    sections: ["tuition", "eca", "events", "summer", "discount"],
    menuItems: [] // Empty means ALL items within allowed sections
  },
  viewer: {
    name: "Viewer",
    sections: [],
    menuItems: [
      // Only reports
      "discount-reports"
    ]
  },
  approver: {
    name: "Approver",
    sections: ["userManagement"],
    menuItems: [
      // Only approval queue
      "approval-queue"
    ]
  }
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

  // If menuItems is empty, user has access to all items in their allowed sections
  if (permissions.menuItems.length === 0) return true

  // Otherwise check if item is in the allowed list
  return permissions.menuItems.includes(menuItemId)
}

export function getAccessibleMenuItems(userRole: string, section: string, items: any[]): any[] {
  const normalizedRole = normalizeRoleName(userRole)
  const permissions = rolePermissions[normalizedRole as keyof typeof rolePermissions]

  if (!permissions) return []

  // Check if user can access this section at all
  if (!permissions.sections.includes(section)) return []

  // If menuItems is empty, return all items in section
  if (permissions.menuItems.length === 0) return items

  // Filter items based on allowed menuItems
  return items.filter(item => permissions.menuItems.includes(item.id))
}

function normalizeRoleName(role: string): string {
  // Convert role display names back to IDs
  const roleMap: Record<string, string> = {
    "Super Admin": "super_admin",
    "Admin": "admin",
    "Accountant": "accountant",
    "Viewer": "viewer",
    "Approver": "approver"
  }

  return roleMap[role] || role.toLowerCase().replace(/ /g, '_')
}
