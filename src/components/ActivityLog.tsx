import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { ActivityLogEntry, loadActivityLogs } from "@/lib/activityLog"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { useLanguage } from "@/contexts/LanguageContext"
import { ChevronDown, ChevronRight, List, LayoutGrid } from "lucide-react"

// Module grouping: map raw module names to display groups
const MODULE_GROUP_MAP: Record<string, string> = {
  "Login": "Login & Authentication",
  "Authentication": "Login & Authentication",
  "OTP": "Login & Authentication",
  "Users": "User Management",
  "User Management": "User Management",
  "User Profile": "User Management",
  "User Settings": "User Management",
  "Students": "Students & Families",
  "Student Management": "Students & Families",
  "Family Groups": "Students & Families",
  "School Settings": "School Settings",
  "Bank Settings": "Bank Settings",
  "Tuition Settings": "Tuition Settings",
  "Tuition Term Settings": "Tuition Settings",
  "Tuition By Year": "Tuition Settings",
  "Tuition Discount Groups": "Tuition Settings",
  "Payment Reminders": "Payment Reminders",
  "Debt Reminders": "Payment Reminders",
  "Debt Reminder Settings": "Payment Reminders",
  "Payment History": "Payment History",
  "Invoices": "Invoice Management",
  "Invoice Management": "Invoice Management",
  "Invoice Creation": "Invoice Management",
  "External Invoice": "Invoice Management",
  "Invoice Overview": "Invoice Management",
  "Approval Queue": "Approval Queue",
  "Receipts": "Receipts & Credit Notes",
  "Receipt Management": "Receipts & Credit Notes",
  "Credit Notes": "Receipts & Credit Notes",
  "Credit Note Management": "Receipts & Credit Notes",
  "Items": "Item & Template Management",
  "Item Management": "Item & Template Management",
  "Invoice Templates": "Item & Template Management",
  "Invoice Receipt Template": "Item & Template Management",
  "Email": "Email Management",
  "Email Jobs": "Email Management",
  "Invoice Email": "Email Management",
  "Internal Email": "Email Management",
  "Email Delivery": "Email Management",
  "Email History": "Email Management",
  "Discounts": "Discount Management",
  "Discount Management": "Discount Management",
  "Discount Options": "Discount Management",
  "Discount Reports": "Discount Management",
  "Summer Discount Groups": "Discount Management",
  "After School": "After School Activities",
  "Course Management": "After School Activities",
  "Course Quota": "After School Activities",
  "Course Reports": "After School Activities",
  "External Parents": "After School Activities",
  "External Parent Management": "After School Activities",
  "External Parents Approval": "After School Activities",
  "Events": "Event Management",
  "Event Import": "Event Management",
  "Event Payment Deadline": "Event Management",
  "Event Registration": "Event Management",
  "Summer": "Summer Activities",
  "Summer Activities": "Summer Activities",
  "Summer Import": "Summer Activities",
  "Summer Registration": "Summer Activities",
  "Summer Payment": "Summer Activities",
  "Clients": "Client Management",
  "Client Management": "Client Management",
  "Analytics": "Analytics & Reports",
  "Reports": "Analytics & Reports",
}

// Preferred display order
const MODULE_GROUP_ORDER = [
  "Login & Authentication",
  "User Management",
  "School Settings",
  "Bank Settings",
  "Students & Families",
  "Tuition Settings",
  "Payment Reminders",
  "Payment History",
  "Invoice Management",
  "Approval Queue",
  "Receipts & Credit Notes",
  "Item & Template Management",
  "Email Management",
  "Discount Management",
  "After School Activities",
  "Event Management",
  "Summer Activities",
  "Client Management",
  "Analytics & Reports",
]

const mockActivityLogs: ActivityLogEntry[] = [
  {
    id: "log-001",
    user: "Admin",
    action: "Approved invoice 20250000001",
    module: "Invoices",
    detail: "Approval Status: wait -> approved",
    ip: "192.168.1.100",
    device: "Mock Device",
    status: "success",
    timestamp: new Date("2026-01-27T10:15:00").toISOString()
  },
  {
    id: "log-002",
    user: "Finance Manager",
    action: "Rejected invoice 20250000001",
    module: "Invoices",
    detail: "Reason: Missing document",
    ip: "192.168.1.101",
    device: "Mock Device",
    status: "warning",
    timestamp: new Date("2026-01-27T11:05:00").toISOString()
  },
  {
    id: "log-003",
    user: "Admin",
    action: "Created invoices",
    module: "Invoices",
    detail: "Submitted 3 invoice(s) for approval",
    ip: "192.168.1.100",
    device: "Mock Device",
    status: "success",
    timestamp: new Date("2026-01-27T11:20:00").toISOString()
  },
  {
    id: "log-004",
    user: "Admin",
    action: "Updated invoice 20250000001",
    module: "Invoices",
    detail: "Due Date: \"2026-01-15\" → \"2026-01-30\"; Notes: \"-\" → \"Updated payment date\"",
    ip: "192.168.1.100",
    device: "Mock Device",
    status: "success",
    timestamp: new Date("2026-01-27T11:45:00").toISOString()
  },
  {
    id: "log-005",
    user: "Admin",
    action: "Approved invoice 20250000001",
    module: "Approval Queue",
    detail: "Approval Status: wait → approved",
    ip: "192.168.1.100",
    device: "Mock Device",
    status: "success",
    timestamp: new Date("2026-01-27T12:05:00").toISOString()
  }
]

function getModuleGroup(module: string): string {
  return MODULE_GROUP_MAP[module] || module
}

export function ActivityLog() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("flat")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [groupFilter, setGroupFilter] = useState<string>("all")

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

  const filteredLogs = useMemo(() => {
    const logsWithoutViewed = logs.filter(log => !log.action.toLowerCase().startsWith("viewed"))

    let filtered = logsWithoutViewed
    if (searchTerm) {
      const needle = searchTerm.toLowerCase()
      filtered = filtered.filter(log =>
        log.user.toLowerCase().includes(needle) ||
        log.action.toLowerCase().includes(needle) ||
        log.module.toLowerCase().includes(needle) ||
        log.detail.toLowerCase().includes(needle) ||
        log.ip.toLowerCase().includes(needle) ||
        log.device.toLowerCase().includes(needle)
      )
    }

    if (viewMode === "grouped" && groupFilter !== "all") {
      filtered = filtered.filter(log => getModuleGroup(log.module) === groupFilter)
    }

    return filtered
  }, [searchTerm, logs, viewMode, groupFilter])

  // Grouped logs by module
  const groupedLogs = useMemo(() => {
    const groups: Record<string, ActivityLogEntry[]> = {}
    for (const log of filteredLogs) {
      const group = getModuleGroup(log.module)
      if (!groups[group]) groups[group] = []
      groups[group].push(log)
    }

    // Sort by preferred order
    const sorted = MODULE_GROUP_ORDER
      .filter(g => groups[g])
      .map(g => ({ group: g, logs: groups[g] }))

    // Add any groups not in the predefined order
    const remaining = Object.keys(groups).filter(g => !MODULE_GROUP_ORDER.includes(g))
    for (const g of remaining.sort()) {
      sorted.push({ group: g, logs: groups[g] })
    }

    return sorted
  }, [filteredLogs])

  // Available group names for filter dropdown
  const availableGroups = useMemo(() => {
    const allLogs = logs.filter(log => !log.action.toLowerCase().startsWith("viewed"))
    const groups = new Set<string>()
    for (const log of allLogs) {
      groups.add(getModuleGroup(log.module))
    }
    return MODULE_GROUP_ORDER.filter(g => groups.has(g)).concat(
      [...groups].filter(g => !MODULE_GROUP_ORDER.includes(g)).sort()
    )
  }, [logs])

  useEffect(() => {
    const load = () => {
      const stored = loadActivityLogs()
      setLogs(stored.length > 0 ? stored : mockActivityLogs)
    }
    load()
    const handleUpdate = () => load()
    window.addEventListener("activityLogsUpdated", handleUpdate)
    return () => window.removeEventListener("activityLogsUpdated", handleUpdate)
  }, [])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, groupFilter])

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const expandAll = () => {
    setExpandedGroups(new Set(groupedLogs.map(g => g.group)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const totalCount = filteredLogs.length
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t("activityLog.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("activityLog.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "flat" ? "default" : "outline"}
              size="sm"
              onClick={() => { setViewMode("flat"); setGroupFilter("all") }}
              className="gap-1.5"
            >
              <List className="h-4 w-4" />
              All Logs
            </Button>
            <Button
              variant={viewMode === "grouped" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grouped")}
              className="gap-1.5"
            >
              <LayoutGrid className="h-4 w-4" />
              By Module
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <CardTitle className="text-base mb-2">{t("activityLog.search")}</CardTitle>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("activityLog.searchPlaceholder")}
                className="h-9"
              />
            </div>
            {viewMode === "grouped" && (
              <div className="flex-shrink-0">
                <CardTitle className="text-base mb-2">Filter Module</CardTitle>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All Modules ({availableGroups.length})</option>
                  {availableGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {viewMode === "flat" ? (
        /* ===== FLAT VIEW (original) ===== */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead align="left" className="pl-6">{t("activityLog.timestamp")}</TableHead>
                  <TableHead align="left">{t("activityLog.user")}</TableHead>
                  <TableHead align="left">{t("activityLog.module")}</TableHead>
                  <TableHead align="left">{t("activityLog.action")}</TableHead>
                  <TableHead align="left">{t("activityLog.detail")}</TableHead>
                  <TableHead align="left">{t("activityLog.ip")}</TableHead>
                  <TableHead align="center">{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell align="left" className="pl-6">{format(new Date(log.timestamp), "dd MMM yyyy HH:mm")}</TableCell>
                    <TableCell align="left" className="font-medium">{log.user}</TableCell>
                    <TableCell align="left">{log.module}</TableCell>
                    <TableCell align="left">{log.action}</TableCell>
                    <TableCell align="left" className="max-w-[360px] truncate" title={log.detail}>{log.detail}</TableCell>
                    <TableCell align="left">{log.ip}</TableCell>
                    <TableCell align="center">{getStatusBadge(log.status)}</TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
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
      ) : (
        /* ===== GROUPED VIEW ===== */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {groupedLogs.length} module{groupedLogs.length !== 1 ? "s" : ""} &middot; {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
            </div>
          </div>

          {groupedLogs.map(({ group, logs: groupLogs }) => {
            const isExpanded = expandedGroups.has(group)
            return (
              <Card key={group}>
                <div
                  className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleGroup(group)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h3 className="font-semibold text-sm">{group}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {groupLogs.length} log{groupLogs.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {groupLogs.filter(l => l.status === "success").length > 0 && (
                      <span className="text-green-600">{groupLogs.filter(l => l.status === "success").length} success</span>
                    )}
                    {groupLogs.filter(l => l.status === "warning").length > 0 && (
                      <span className="text-yellow-600">{groupLogs.filter(l => l.status === "warning").length} warning</span>
                    )}
                    {groupLogs.filter(l => l.status === "error").length > 0 && (
                      <span className="text-red-600">{groupLogs.filter(l => l.status === "error").length} error</span>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <CardContent className="p-0 border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead align="left" className="pl-6">{t("activityLog.timestamp")}</TableHead>
                          <TableHead align="left">{t("activityLog.user")}</TableHead>
                          <TableHead align="left">{t("activityLog.action")}</TableHead>
                          <TableHead align="left">{t("activityLog.detail")}</TableHead>
                          <TableHead align="center">{t("common.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupLogs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell align="left" className="pl-6 whitespace-nowrap">{format(new Date(log.timestamp), "dd MMM yyyy HH:mm")}</TableCell>
                            <TableCell align="left" className="font-medium">{log.user}</TableCell>
                            <TableCell align="left">{log.action}</TableCell>
                            <TableCell align="left" className="max-w-[400px] truncate" title={log.detail}>{log.detail}</TableCell>
                            <TableCell align="center">{getStatusBadge(log.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {groupedLogs.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t("activityLog.noLogsFound")}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
