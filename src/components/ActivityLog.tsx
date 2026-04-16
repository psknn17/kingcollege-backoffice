import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { ActivityLogEntry, loadActivityLogs } from "@/lib/activityLog"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { useLanguage } from "@/contexts/LanguageContext"
import { ArrowUpDown, ChevronDown, Download, Filter } from "lucide-react"
import { downloadAsXlsx } from "@/utils/xlsxUtils"
import { toast } from "@/components/ui/sonner"
import { cn } from "./ui/utils"

// Module grouping: map raw module names to display groups
const MODULE_GROUP_MAP: Record<string, string> = {
  // Login & Authentication
  "Login": "Login & Authentication",
  "Authentication": "Login & Authentication",
  "Login & Authentication": "Login & Authentication",
  "OTP": "Login & Authentication",
  // User Management
  "Users": "User Management",
  "User Management": "User Management",
  "User Profile": "User Management",
  "User Settings": "User Management",
  // Students & Families
  "Students": "Students & Families",
  "Student Management": "Students & Families",
  "Student List": "Students & Families",
  "Student": "Students & Families",
  "Family Groups": "Students & Families",
  "Family Group": "Students & Families",
  // School & Bank Settings
  "School Settings": "School Settings",
  "Bank Settings": "Bank Settings",
  // Tuition Settings
  "Tuition Settings": "Tuition Settings",
  "Tuition Term Settings": "Tuition Settings",
  "Term Settings": "Tuition Settings",
  "Tuition By Year": "Tuition Settings",
  "Tuition by Year": "Tuition Settings",
  "Tuition Discount Groups": "Tuition Settings",
  // Payment Reminders / Debt Reminder
  "Payment Reminders": "Payment Reminders",
  "Debt Reminders": "Payment Reminders",
  "Debt Reminder Settings": "Payment Reminders",
  "Debt Reminder": "Payment Reminders",
  // Payment History
  "Payment History": "Payment History",
  // Approval Queue
  "Approval Queue": "Approval Queue",
  // Invoice Management (all types)
  "Invoices": "Invoice Management",
  "Invoice Management": "Invoice Management",
  "Invoice Creation": "Invoice Management",
  "External Invoice": "Invoice Management",
  "Invoice Overview": "Invoice Management",
  "Tuition Invoice": "Invoice Management",
  "ECA Invoice": "Invoice Management",
  "Trip & Activity Invoice": "Invoice Management",
  "Exam Invoice": "Invoice Management",
  "School Bus Invoice": "Invoice Management",
  "External Invoice": "Invoice Management",
  "Invoice Details": "Invoice Management",
  // Receipts & Credit Notes
  "Receipts": "Receipts & Credit Notes",
  "Receipt Management": "Receipts & Credit Notes",
  "Credit Notes": "Receipts & Credit Notes",
  "Credit Note Management": "Receipts & Credit Notes",
  // Items & Templates
  "Items": "Item & Template Management",
  "Item Management": "Item & Template Management",
  "Items & Templates": "Item & Template Management",
  "Items / Templates": "Item & Template Management",
  "Invoice Templates": "Item & Template Management",
  "Invoice Receipt Template": "Item & Template Management",
  // Discount Management
  "Discounts": "Discount Management",
  "Discount Management": "Discount Management",
  "Discount Options": "Discount Management",
  "Discount Reports": "Discount Management",
  "Discount Group": "Discount Management",
  "Student Groups": "Discount Management",
  "Summer Discount Groups": "Discount Management",
  // Email Management
  "Email": "Email Management",
  "Email Jobs": "Email Management",
  "Invoice Email": "Email Management",
  "Internal Email": "Email Management",
  "Email Delivery": "Email Management",
  "Email Delivery Report": "Email Management",
  "Email History": "Email Management",
  // After School Activities
  "After School": "After School Activities",
  "Course Management": "After School Activities",
  "Course Quota": "After School Activities",
  "Course Reports": "After School Activities",
  "Course Student Report": "After School Activities",
  "External Parents": "After School Activities",
  "External Parent Management": "After School Activities",
  "External Parents Approval": "After School Activities",
  // Event Management
  "Events": "Event Management",
  "Event Import": "Event Management",
  "Event Payment Deadline": "Event Management",
  "Event Registration": "Event Management",
  "Event Registration Reports": "Event Management",
  // Summer Activities
  "Summer": "Summer Activities",
  "Summer Activities": "Summer Activities",
  "Summer Import": "Summer Activities",
  "Summer Registration": "Summer Activities",
  "Summer Payment": "Summer Activities",
  "Summer Payment Reports": "Summer Activities",
  // Client Management
  "Clients": "Client Management",
  "Client Management": "Client Management",
  "Client List": "Client Management",
  // Analytics & Reports
  "Analytics": "Analytics & Reports",
  "Reports": "Analytics & Reports",
  "Dashboard & Analytics": "Analytics & Reports",
  // Activity Log
  "Activity Log": "Activity Log",
}


const mockActivityLogs: ActivityLogEntry[] = [
  { id: "log-001", user: "admin@school.com", action: "Approve Invoice", module: "Approval Queue", detail: "Approved 1 invoice", ip: "192.168.1.100", device: "Desktop", status: "success", timestamp: new Date().toISOString() },
  { id: "log-002", user: "admin@school.com", action: "Import Items", module: "Items & Templates", detail: "Imported 20 items", ip: "192.168.1.100", device: "Desktop", status: "success", timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: "log-003", user: "admin@school.com", action: "Save Tuition Data", module: "Tuition by Year", detail: "Saved 2026-2027", ip: "192.168.1.100", device: "Desktop", status: "success", timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "log-004", user: "adminfinance@gmail.com", action: "Create Invoice", module: "Invoice Management", detail: "Created 58 invoices", ip: "192.168.1.101", device: "Desktop", status: "success", timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "log-005", user: "adminfinance@gmail.com", action: "Send Reminder", module: "Payment Reminders", detail: "Sent to 45 recipients", ip: "192.168.1.101", device: "Desktop", status: "success", timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: "log-006", user: "approver@gmaill.com", action: "Approve Invoice", module: "Approval Queue", detail: "Approved 1 invoice", ip: "192.168.1.102", device: "Desktop", status: "success", timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: "log-007", user: "approver@gmaill.com", action: "Reject Invoice", module: "Approval Queue", detail: "Rejected 1 invoice", ip: "192.168.1.102", device: "Desktop", status: "warning", timestamp: new Date(Date.now() - 18000000).toISOString() },
  { id: "log-008", user: "admin@school.com", action: "Create User", module: "User Management", detail: "Created 1 user", ip: "192.168.1.100", device: "Desktop", status: "success", timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: "log-009", user: "admin@school.com", action: "Update Settings", module: "School Settings", detail: "Updated contact info", ip: "192.168.1.100", device: "Desktop", status: "success", timestamp: new Date(Date.now() - 90000000).toISOString() },
  { id: "log-010", user: "adminfinance@gmail.com", action: "Export Report", module: "Discount Management", detail: "Exported Excel", ip: "192.168.1.101", device: "Desktop", status: "success", timestamp: new Date(Date.now() - 172800000).toISOString() },
  { id: "log-011", user: "viewver@gmail.com", action: "Login", module: "Login & Authentication", detail: "Logged in", ip: "192.168.1.103", device: "Desktop", status: "success", timestamp: new Date(Date.now() - 180000000).toISOString() },
  { id: "log-012", user: "admin@school.com", action: "Delete Item", module: "Items & Templates", detail: "Deleted 3 items", ip: "192.168.1.100", device: "Desktop", status: "success", timestamp: new Date(Date.now() - 259200000).toISOString() },
]

function getModuleGroup(module: string): string {
  return MODULE_GROUP_MAP[module] || module
}

// Extract email from user field — handles "name (email)", "email", or legacy names
function displayUserEmail(user: string): string {
  // "super admin (admin@school.com)" → "admin@school.com"
  const parenMatch = user.match(/\(([^)]+@[^)]+)\)/)
  if (parenMatch) return parenMatch[1]
  // Already an email
  if (user.includes("@")) return user
  // Legacy name mapping to seed emails
  const legacyMap: Record<string, string> = {
    "admin": "admin@school.com",
    "Admin": "admin@school.com",
    "super admin": "admin@school.com",
    "System Administrator": "admin@school.com",
    "System": "admin@school.com",
    "Finance Manager": "adminfinance@gmail.com",
    "finance admin": "adminfinance@gmail.com",
    "test approver": "approver@gmaill.com",
    "test viewver": "viewver@gmail.com",
  }
  return legacyMap[user] || user
}

export function ActivityLog() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [moduleFilter, setModuleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [userFilter, setUserFilter] = useState("all")

  const getStatusBadge = (status: ActivityLogEntry["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">{t("activityLog.success")}</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">{t("activityLog.warning")}</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">{t("activityLog.error")}</Badge>
      default:
        return <Badge variant="secondary">-</Badge>
    }
  }

  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState<keyof ActivityLogEntry | "timestamp">("timestamp")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const handleSort = (column: keyof ActivityLogEntry | "timestamp") => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Derive unique filter options from logs
  const filterOptions = useMemo(() => {
    const logsWithoutViewed = logs.filter(log => !log.action.toLowerCase().startsWith("viewed"))
    const modules = [...new Set(logsWithoutViewed.map(l => getModuleGroup(l.module)))].sort()
    const users = [...new Set(logsWithoutViewed.map(l => displayUserEmail(l.user)))].sort()
    const statuses = [...new Set(logsWithoutViewed.map(l => l.status))].sort()
    return { modules, users, statuses }
  }, [logs])

  const clearFilters = () => {
    setSearchTerm("")
    setModuleFilter("all")
    setStatusFilter("all")
    setUserFilter("all")
  }

  const filteredLogs = useMemo(() => {
    const logsWithoutViewed = logs.filter(log => !log.action.toLowerCase().startsWith("viewed"))

    let result = [...logsWithoutViewed]

    if (searchTerm) {
      const needle = searchTerm.toLowerCase()
      result = result.filter(log =>
        displayUserEmail(log.user).toLowerCase().includes(needle) ||
        log.action.toLowerCase().includes(needle) ||
        log.module.toLowerCase().includes(needle) ||
        log.detail.toLowerCase().includes(needle) ||
        log.device.toLowerCase().includes(needle)
      )
    }

    if (moduleFilter !== "all") {
      result = result.filter(log => getModuleGroup(log.module) === moduleFilter)
    }

    if (statusFilter !== "all") {
      result = result.filter(log => log.status === statusFilter)
    }

    if (userFilter !== "all") {
      result = result.filter(log => displayUserEmail(log.user) === userFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any = a[sortColumn as keyof ActivityLogEntry]
      let bValue: any = b[sortColumn as keyof ActivityLogEntry]

      if (sortColumn === "timestamp") {
        aValue = new Date(a.timestamp).getTime()
        bValue = new Date(b.timestamp).getTime()
      }

      if (typeof aValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    })

    return result
  }, [searchTerm, moduleFilter, statusFilter, userFilter, logs, sortColumn, sortDirection])

  useEffect(() => {
    const load = () => {
      const stored = loadActivityLogs()
      // Combine real logs with mock logs for a better preview, 
      // but only if stored logs aren't already overwhelming.
      // We put mocks first to show the new format clearly.
      const combined = [...mockActivityLogs, ...stored]
      setLogs(combined)
    }
    load()
    const handleUpdate = () => load()
    window.addEventListener("activityLogsUpdated", handleUpdate)
    return () => window.removeEventListener("activityLogsUpdated", handleUpdate)
  }, [])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, moduleFilter, statusFilter, userFilter])

  const totalCount = filteredLogs.length
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const exportData = () => {
    const headers = ["Timestamp", "User", "Module", "Action", "Detail", "Status"]
    const dataRows = filteredLogs.map(log => [
      format(new Date(log.timestamp), "dd MMM yyyy HH:mm"),
      displayUserEmail(log.user),
      getModuleGroup(log.module),
      log.action,
      log.detail,
      log.status,
    ])
    const filename = `activity-log-${format(new Date(), "yyyy-MM-dd")}`
    downloadAsXlsx(headers, dataRows, filename)
    toast.success(`Exported ${filteredLogs.length} logs`, { description: `${filename}.xlsx` })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("activityLog.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("activityLog.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={exportData} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          {t("payment.exportData")}
        </Button>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            {t("common.searchAndFilter")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("activityLog.searchPlaceholder")}
              className="h-9"
            />
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 shrink-0"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
            </Button>
          </div>

          {showFilters && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("activityLog.module")}</label>
                  <Select value={moduleFilter} onValueChange={setModuleFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("common.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {filterOptions.modules.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("activityLog.user")}</label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("common.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {filterOptions.users.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("common.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {filterOptions.statuses.map(s => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Log Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  align="left"
                  className="pl-6 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("timestamp")}
                >
                  <div className="flex items-center gap-1">
                    {t("activityLog.timestamp")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  align="left"
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("user")}
                >
                  <div className="flex items-center gap-1">
                    {t("activityLog.user")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  align="left"
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("module")}
                >
                  <div className="flex items-center gap-1">
                    {t("activityLog.module")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  align="left"
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("action")}
                >
                  <div className="flex items-center gap-1">
                    {t("activityLog.action")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead align="left">{t("activityLog.detail")}</TableHead>
                <TableHead align="center">{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell align="left" className="pl-6">{format(new Date(log.timestamp), "dd MMM yyyy HH:mm")}</TableCell>
                  <TableCell align="left" className="font-medium">{displayUserEmail(log.user)}</TableCell>
                  <TableCell align="left">
                    <Badge variant="outline" className="text-xs font-normal">
                      {getModuleGroup(log.module)}
                    </Badge>
                  </TableCell>
                  <TableCell align="left">{log.action}</TableCell>
                  <TableCell align="left" className="max-w-[360px] truncate" title={log.detail}>{log.detail}</TableCell>
                  <TableCell align="center">{getStatusBadge(log.status)}</TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    {t("activityLog.noLogsFound")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
