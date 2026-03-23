import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Card, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { ActivityLogEntry, loadActivityLogs } from "@/lib/activityLog"
import { usePersistedState } from "@/hooks/usePersistedState"
import { useAuth } from "@/contexts/AuthContext"
import { Search, Filter, Calendar, Clock, ChevronDown, Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { Button } from "./ui/button"
import { cn } from "./ui/utils"
import { ColumnPresets } from "@/utils/tableAlignment"
import { PaginationBar } from "./ui/pagination-bar"

export function UserActivity() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filterModule, setFilterModule] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [activityLogs, setActivityLogs] = usePersistedState<ActivityLogEntry[]>("user-activity-logs", [])

  useEffect(() => {
    const logs = loadActivityLogs()
    setActivityLogs(logs)
  }, [])

  // Filter activities for current user only (match by name or email)
  const userActivities = useMemo(() => {
    if (!user) return []
    const matchValues = [user.name, user.email].filter(Boolean).map(v => v.toLowerCase())
    return activityLogs.filter(log => {
      const logUser = log.user.toLowerCase()
      return matchValues.some(v => v === logUser || logUser.includes(v))
    })
  }, [activityLogs, user])

  const filteredLogs = useMemo(() => {
    return userActivities.filter(log => {
      const matchesSearch =
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.detail.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesModule = filterModule === "all" || log.module === filterModule
      const matchesStatus = filterStatus === "all" || log.status === filterStatus

      return matchesSearch && matchesModule && matchesStatus
    })
  }, [userActivities, searchQuery, filterModule, filterStatus])

  const modules = useMemo(() => {
    const uniqueModules = new Set(userActivities.map(log => log.module))
    return Array.from(uniqueModules)
  }, [userActivities])

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return format(date, "dd MMM yyyy HH:mm:ss")
    } catch {
      return timestamp
    }
  }

  const getRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

      if (diffInSeconds < 60) return "Just now"
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
      return format(date, "dd MMM yyyy")
    } catch {
      return ""
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">My Activity</h2>
          <p className="text-sm text-muted-foreground">View your recent actions and activity history</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Activities</p>
            </div>
            <p className="text-2xl font-bold">{userActivities.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Success</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{userActivities.filter(log => log.status === "success").length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{userActivities.filter(log => log.status === "warning").length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{userActivities.filter(log => log.status === "error").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search + Filters Toggle */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showFilters && "rotate-180")} />
            </Button>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (<>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => { setSearchQuery(""); setFilterModule("all"); setFilterStatus("all"); }} className="h-9">Clear Filters</Button>
            </div>
          </>)}
        </CardContent>
      </Card>

      {/* Activity Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Timestamp - date column, left aligned */}
                  <TableHead align="left" className="w-[180px]">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Timestamp
                  </TableHead>
                  {/* Action - text column, left aligned */}
                  <TableHead align="left">Action</TableHead>
                  {/* Module - text column, left aligned */}
                  <TableHead align="left" className="w-[150px]">Module</TableHead>
                  {/* Status - badge column, center aligned */}
                  <TableHead align="center" className="w-[120px]">Status</TableHead>
                  {/* Details - text column, left aligned */}
                  <TableHead align="left">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No activities found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      {/* Timestamp - date column, left aligned */}
                      <TableCell align="left" className="font-mono text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          <span className="text-gray-400">
                            {getRelativeTime(log.timestamp)}
                          </span>
                        </div>
                      </TableCell>
                      {/* Action - text column, left aligned */}
                      <TableCell align="left" className="font-medium">{log.action}</TableCell>
                      {/* Module - text column, left aligned */}
                      <TableCell align="left">
                        <Badge variant="outline" className="font-medium">
                          {log.module}
                        </Badge>
                      </TableCell>
                      {/* Status - badge column, center aligned */}
                      <TableCell align="center">
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      {/* Details - text column, left aligned */}
                      <TableCell align="left" className="text-sm text-gray-600 max-w-md truncate">
                        {log.detail}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4">
            <PaginationBar
              currentPage={currentPage}
              pageSize={pageSize}
              totalCount={filteredLogs.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
