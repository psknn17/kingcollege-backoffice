import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { ActivityLogEntry, loadActivityLogs } from "@/lib/activityLog"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { useLanguage } from "@/contexts/LanguageContext"
import { ArrowUpDown } from "lucide-react"

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


const mockActivityLogs: ActivityLogEntry[] = [
  {
    id: "log-001",
    user: "Admin",
    action: "Approved invoice 202603001",
    module: "Invoices",
    detail: "Approval Status: wait -> approved",
    ip: "192.168.1.100",
    device: "Desktop",
    status: "success",
    timestamp: new Date().toISOString()
  },
  {
    id: "log-002",
    user: "System",
    action: "Import",
    module: "Items & Templates",
    detail: "Imported 20 items (15 items updated with prices from Tuition by Year) successfully for tuition: [Tuition fee - Term 1 / Nursery, Tuition fee - Term 2 / Year 1... and 15 more]",
    ip: "127.0.0.1",
    device: "Background Service",
    status: "success",
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "log-003",
    user: "Admin",
    action: "Save Tuition Data",
    module: "Tuition by Year",
    detail: "Saved tuition data for academic year 2026-2027, Grand Total: 5,450,000",
    ip: "192.168.1.100",
    device: "Desktop",
    status: "success",
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: "log-004",
    user: "Finance Manager",
    action: "Delete",
    module: "Items & Templates",
    detail: "Bulk deleted 5 items: [TUI005, TUI006, wsss... and 2 more]",
    ip: "192.168.1.101",
    device: "Laptop",
    status: "success",
    timestamp: new Date(Date.now() - 86400000).toISOString()
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

  const filteredLogs = useMemo(() => {
    const logsWithoutViewed = logs.filter(log => !log.action.toLowerCase().startsWith("viewed"))

    let result = [...logsWithoutViewed]

    if (searchTerm) {
      const needle = searchTerm.toLowerCase()
      result = result.filter(log =>
        log.user.toLowerCase().includes(needle) ||
        log.action.toLowerCase().includes(needle) ||
        log.module.toLowerCase().includes(needle) ||
        log.detail.toLowerCase().includes(needle) ||
        log.ip.toLowerCase().includes(needle) ||
        log.device.toLowerCase().includes(needle)
      )
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
  }, [searchTerm, logs, sortColumn, sortDirection])

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

  useEffect(() => { setCurrentPage(1) }, [searchTerm])

  const totalCount = filteredLogs.length
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6 font-sans" style={{ fontFamily: "'Lato', sans-serif" }}>
      <div className="bg-white p-4 md:p-8 rounded-2xl border border-gray-100 shadow-sm mb-6 bg-gradient-to-r from-white to-gray-50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{t("activityLog.title")}</h2>
            <p className="text-base text-muted-foreground mt-1">
              {t("activityLog.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Search + Module Filter */}
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
          </div>
        </CardHeader>
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
                <TableHead
                  align="left"
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("ip")}
                >
                  <div className="flex items-center gap-1">
                    {t("activityLog.ip")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead align="center">{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell align="left" className="pl-6">{format(new Date(log.timestamp), "dd MMM yyyy HH:mm")}</TableCell>
                  <TableCell align="left" className="font-medium">{log.user}</TableCell>
                  <TableCell align="left">
                    <Badge variant="outline" className="text-xs font-normal">
                      {getModuleGroup(log.module)}
                    </Badge>
                  </TableCell>
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
    </div>
  )
}
