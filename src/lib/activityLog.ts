export type ActivityLogStatus = "success" | "warning" | "error"

export type ActivityLogEntry = {
  id: string
  user: string
  action: string
  module: string
  detail: string
  ip: string
  device: string
  status: ActivityLogStatus
  timestamp: string
}

const ACTIVITY_LOG_KEY = "activityLogs"
const DEFAULT_IP = "192.168.1.100"

const getCurrentUser = () => {
  try {
    const authUserRaw = localStorage.getItem("authUser")
    if (authUserRaw) {
      const authUser = JSON.parse(authUserRaw)
      if (authUser.email) return authUser.email
      if (authUser.name) return authUser.name
    }
    return (
      localStorage.getItem("currentUser") ||
      localStorage.getItem("username") ||
      "Admin"
    )
  } catch {
    return "Admin"
  }
}

const getMockIp = () => {
  try {
    return localStorage.getItem("mockIp") || DEFAULT_IP
  } catch {
    return DEFAULT_IP
  }
}

const getDevice = () => {
  try {
    return navigator.userAgent || "Unknown Device"
  } catch {
    return "Unknown Device"
  }
}

export const logActivity = (params: {
  action: string
  module: string
  detail?: string
  status?: ActivityLogStatus
  user?: string
  ip?: string
  device?: string
}) => {
  try {
    const entry: ActivityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user: params.user || getCurrentUser(),
      action: params.action,
      module: params.module,
      detail: params.detail || "-",
      ip: params.ip || getMockIp(),
      device: params.device || getDevice(),
      status: params.status || "success",
      timestamp: new Date().toISOString()
    }
    const stored = localStorage.getItem(ACTIVITY_LOG_KEY)
    const logs = stored ? JSON.parse(stored) : []
    logs.unshift(entry)
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logs.slice(0, 500)))
    window.dispatchEvent(new CustomEvent("activityLogsUpdated"))
  } catch (error) {
    console.error("Failed to write activity log:", error)
  }
}

export const loadActivityLogs = (): ActivityLogEntry[] => {
  try {
    const stored = localStorage.getItem(ACTIVITY_LOG_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error("Failed to load activity logs:", error)
    return []
  }
}
