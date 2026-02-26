import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { ActivityLogEntry, loadActivityLogs } from "@/lib/activityLog"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ColumnPresets } from "@/utils/tableAlignment"
import { PaginationBar } from "@/components/ui/pagination-bar"

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

const getStatusBadge = (status: ActivityLogEntry["status"]) => {
  switch (status) {
    case "success":
      return <Badge className="bg-green-100 text-green-800">Success</Badge>
    case "warning":
      return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
    case "error":
      return <Badge className="bg-red-100 text-red-800">Error</Badge>
    default:
      return <Badge variant="secondary">-</Badge>
  }
}

export function ActivityLog() {
  const [searchTerm, setSearchTerm] = usePersistedState("activity-log:search", "")
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredLogs = useMemo(() => {
    // Filter out "Viewed" actions
    const logsWithoutViewed = logs.filter(log => !log.action.toLowerCase().startsWith("viewed"))

    if (!searchTerm) return logsWithoutViewed
    const needle = searchTerm.toLowerCase()
    return logsWithoutViewed.filter(log =>
      log.user.toLowerCase().includes(needle) ||
      log.action.toLowerCase().includes(needle) ||
      log.module.toLowerCase().includes(needle) ||
      log.detail.toLowerCase().includes(needle) ||
      log.ip.toLowerCase().includes(needle) ||
      log.device.toLowerCase().includes(needle)
    )
  }, [searchTerm, logs])

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

  useEffect(() => { setCurrentPage(1) }, [searchTerm])

  const totalCount = filteredLogs.length
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Activity Log</h2>
        <p className="text-sm text-muted-foreground">
          Track user actions and system events.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by user, action, or module..."
            className="h-9"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Timestamp - date column, left aligned */}
                <TableHead align="left" className="pl-6">Timestamp</TableHead>
                {/* User - text column, left aligned */}
                <TableHead align="left">User</TableHead>
                {/* Action - text column, left aligned */}
                <TableHead align="left">Action</TableHead>
                {/* Description (Detail) - text column, left aligned */}
                <TableHead align="left">Detail</TableHead>
                {/* IP Address - text column, left aligned */}
                <TableHead align="left">IP</TableHead>
                {/* Status - badge column, center aligned */}
                <TableHead align="center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map(log => (
                <TableRow key={log.id}>
                  {/* Timestamp - date column, left aligned */}
                  <TableCell align="left" className="pl-6">{format(new Date(log.timestamp), "MMM dd, yyyy HH:mm")}</TableCell>
                  {/* User - text column, left aligned */}
                  <TableCell align="left" className="font-medium">{log.user}</TableCell>
                  {/* Action - text column, left aligned */}
                  <TableCell align="left">{log.action}</TableCell>
                  {/* Description (Detail) - text column, left aligned */}
                  <TableCell align="left" className="max-w-[360px] truncate" title={log.detail}>{log.detail}</TableCell>
                  {/* IP Address - text column, left aligned */}
                  <TableCell align="left">{log.ip}</TableCell>
                  {/* Status - badge column, center aligned */}
                  <TableCell align="center">{getStatusBadge(log.status)}</TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No activity logs found.
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
