import { useState, useMemo } from "react"
import { downloadAsXlsx } from "@/utils/xlsxUtils"
import { useLanguage } from "@/contexts/LanguageContext"
import { usePersistedState } from "@/hooks/usePersistedState"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { Separator } from "./ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import {
  Mail,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  ArrowLeft,
  User,
  Calendar,
  MessageSquare,
  Send,
  ArrowUpDown,
  Eye,
  History,
  ChevronDown
} from "lucide-react"
import { cn } from "@/components/ui/utils"
import { ColumnPresets } from "@/utils/tableAlignment"

interface AttemptRecord {
  attemptNumber: number
  timestamp: string
  status: "pending" | "delivered" | "failed" | "bounced"
  errorMessage?: string
}

interface EmailRecord {
  id: string
  recipientEmail: string
  recipientName: string
  studentName: string
  yearGroup: string
  status: "pending" | "delivered" | "opened" | "failed" | "bounced"
  sentAt: string
  deliveredAt?: string
  openedAt?: string
  failureReason?: string
  attempts: number
  lastAttemptAt: string
  attemptHistory?: AttemptRecord[]
}

// Thai names for mock data generation
const thaiFirstNames = ["Somchai", "Pranee", "Wichai", "Supachai", "Narin", "Sompong", "Malai", "Prasert", "Siriporn", "Thanyarat", "Kittisak", "Napaporn", "Chaiwat", "Suwanna", "Pichit"]
const thaiLastNames = ["Wongsakul", "Srisawat", "Tanaka", "Kittisak", "Prasert", "Suksamran", "Kaewmanee", "Jaidee", "Thanakit", "Wongsiri", "Rattanakul", "Boonsong", "Charoen", "Siriwan", "Phromma"]
const emailDomains = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"]

// Generate mock email history based on job data
const generateMockEmailHistory = (jobData: any): EmailRecord[] => {
  if (!jobData) return []

  const { yearGroup, totalEmails, sentCount, failedCount, status: jobStatus, createdAt } = jobData
  const baseDate = createdAt ? new Date(createdAt) : new Date("2024-01-15T10:30:00Z")

  const records: EmailRecord[] = []

  // Calculate distribution based on job status
  let openedCount = 0
  let deliveredCount = 0
  let pendingCount = 0
  let failedRecords = failedCount || 0
  let bouncedCount = 0

  if (jobStatus === "completed") {
    // 96% success: mostly opened/delivered
    openedCount = Math.floor(totalEmails * 0.4)
    deliveredCount = Math.floor(totalEmails * 0.5)
    failedRecords = Math.max(1, totalEmails - openedCount - deliveredCount - 1)
    bouncedCount = 1
  } else if (jobStatus === "in-progress") {
    // 92% success: some pending
    openedCount = Math.floor(totalEmails * 0.3)
    deliveredCount = Math.floor(totalEmails * 0.5)
    pendingCount = Math.floor(totalEmails * 0.1)
    failedRecords = totalEmails - openedCount - deliveredCount - pendingCount
  } else if (jobStatus === "failed") {
    // 0% success: all failed/bounced
    failedRecords = Math.floor(totalEmails * 0.6)
    bouncedCount = totalEmails - failedRecords
  } else if (jobStatus === "pending") {
    // All pending
    pendingCount = totalEmails
  }

  let idCounter = 1

  // Generate opened records
  for (let i = 0; i < openedCount && idCounter <= totalEmails; i++, idCounter++) {
    const firstName = thaiFirstNames[idCounter % thaiFirstNames.length]
    const lastName = thaiLastNames[idCounter % thaiLastNames.length]
    const parentFirst = thaiFirstNames[(idCounter + 5) % thaiFirstNames.length]
    records.push({
      id: `ER${String(idCounter).padStart(3, '0')}`,
      recipientEmail: `${parentFirst.toLowerCase()}.${lastName.toLowerCase().charAt(0)}@${emailDomains[idCounter % emailDomains.length]}`,
      recipientName: `${parentFirst} ${lastName}`,
      studentName: `${firstName} ${lastName}`,
      yearGroup,
      status: "opened",
      sentAt: baseDate.toISOString(),
      deliveredAt: new Date(baseDate.getTime() + 60000).toISOString(),
      openedAt: new Date(baseDate.getTime() + 3600000 * (1 + Math.random() * 5)).toISOString(),
      attempts: 1,
      lastAttemptAt: baseDate.toISOString()
    })
  }

  // Generate delivered records
  for (let i = 0; i < deliveredCount && idCounter <= totalEmails; i++, idCounter++) {
    const firstName = thaiFirstNames[idCounter % thaiFirstNames.length]
    const lastName = thaiLastNames[idCounter % thaiLastNames.length]
    const parentFirst = thaiFirstNames[(idCounter + 5) % thaiFirstNames.length]
    records.push({
      id: `ER${String(idCounter).padStart(3, '0')}`,
      recipientEmail: `${parentFirst.toLowerCase()}.${lastName.toLowerCase().charAt(0)}@${emailDomains[idCounter % emailDomains.length]}`,
      recipientName: `${parentFirst} ${lastName}`,
      studentName: `${firstName} ${lastName}`,
      yearGroup,
      status: "delivered",
      sentAt: baseDate.toISOString(),
      deliveredAt: new Date(baseDate.getTime() + 60000 + Math.random() * 60000).toISOString(),
      attempts: 1,
      lastAttemptAt: baseDate.toISOString()
    })
  }

  // Generate pending records
  for (let i = 0; i < pendingCount && idCounter <= totalEmails; i++, idCounter++) {
    const firstName = thaiFirstNames[idCounter % thaiFirstNames.length]
    const lastName = thaiLastNames[idCounter % thaiLastNames.length]
    const parentFirst = thaiFirstNames[(idCounter + 5) % thaiFirstNames.length]
    records.push({
      id: `ER${String(idCounter).padStart(3, '0')}`,
      recipientEmail: `${parentFirst.toLowerCase()}.${lastName.toLowerCase().charAt(0)}@${emailDomains[idCounter % emailDomains.length]}`,
      recipientName: `${parentFirst} ${lastName}`,
      studentName: `${firstName} ${lastName}`,
      yearGroup,
      status: "pending",
      sentAt: baseDate.toISOString(),
      attempts: 1,
      lastAttemptAt: baseDate.toISOString()
    })
  }

  // Generate failed records
  const failureReasons = ["Connection timeout", "SMTP server error", "Mailbox full", "Server rejected"]
  for (let i = 0; i < failedRecords && idCounter <= totalEmails; i++, idCounter++) {
    const firstName = thaiFirstNames[idCounter % thaiFirstNames.length]
    const lastName = thaiLastNames[idCounter % thaiLastNames.length]
    const parentFirst = thaiFirstNames[(idCounter + 5) % thaiFirstNames.length]
    const attempts = 2 + Math.floor(Math.random() * 2)
    records.push({
      id: `ER${String(idCounter).padStart(3, '0')}`,
      recipientEmail: `${parentFirst.toLowerCase()}.${lastName.toLowerCase().charAt(0)}@${emailDomains[idCounter % emailDomains.length]}`,
      recipientName: `${parentFirst} ${lastName}`,
      studentName: `${firstName} ${lastName}`,
      yearGroup,
      status: "failed",
      sentAt: baseDate.toISOString(),
      failureReason: failureReasons[i % failureReasons.length],
      attempts,
      lastAttemptAt: new Date(baseDate.getTime() + 900000 * attempts).toISOString(),
      attemptHistory: Array.from({ length: attempts }, (_, j) => ({
        attemptNumber: j + 1,
        timestamp: new Date(baseDate.getTime() + 900000 * j).toISOString(),
        status: "failed" as const,
        errorMessage: failureReasons[i % failureReasons.length]
      }))
    })
  }

  // Generate bounced records
  const bounceReasons = ["Recipient address rejected: User unknown", "Mailbox not found", "Domain does not exist"]
  for (let i = 0; i < bouncedCount && idCounter <= totalEmails; i++, idCounter++) {
    const firstName = thaiFirstNames[idCounter % thaiFirstNames.length]
    const lastName = thaiLastNames[idCounter % thaiLastNames.length]
    const parentFirst = thaiFirstNames[(idCounter + 5) % thaiFirstNames.length]
    records.push({
      id: `ER${String(idCounter).padStart(3, '0')}`,
      recipientEmail: `invalid${idCounter}@nonexistent.com`,
      recipientName: `${parentFirst} ${lastName}`,
      studentName: `${firstName} ${lastName}`,
      yearGroup,
      status: "bounced",
      sentAt: baseDate.toISOString(),
      failureReason: bounceReasons[i % bounceReasons.length],
      attempts: 3,
      lastAttemptAt: new Date(baseDate.getTime() + 2700000).toISOString(),
      attemptHistory: [
        { attemptNumber: 1, timestamp: baseDate.toISOString(), status: "failed" as const, errorMessage: "Connection refused" },
        { attemptNumber: 2, timestamp: new Date(baseDate.getTime() + 900000).toISOString(), status: "failed" as const, errorMessage: "SMTP server not responding" },
        { attemptNumber: 3, timestamp: new Date(baseDate.getTime() + 2700000).toISOString(), status: "bounced" as const, errorMessage: bounceReasons[i % bounceReasons.length] }
      ]
    })
  }

  return records
}

interface EmailHistoryViewProps {
  jobData?: any
  onBack?: () => void
}

export function EmailHistoryView({ jobData, onBack }: EmailHistoryViewProps) {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = usePersistedState("email-history-view:pageSize", 15)
  const itemsPerPage = pageSize
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedRecord, setSelectedRecord] = useState<EmailRecord | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Generate mock data based on job data
  const emailHistory = useMemo(() => generateMockEmailHistory(jobData), [jobData])

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setCurrentPage(1)
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedHistory = (historyToSort: EmailRecord[]) => {
    if (!sortColumn) return historyToSort
    return [...historyToSort].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "recipientName":
          aVal = a.recipientName
          bVal = b.recipientName
          break
        case "recipientEmail":
          aVal = a.recipientEmail
          bVal = b.recipientEmail
          break
        case "studentName":
          aVal = a.studentName
          bVal = b.studentName
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "sentAt":
          aVal = new Date(a.sentAt).getTime()
          bVal = new Date(b.sentAt).getTime()
          break
        case "deliveredAt":
          aVal = a.deliveredAt ? new Date(a.deliveredAt).getTime() : 0
          bVal = b.deliveredAt ? new Date(b.deliveredAt).getTime() : 0
          break
        case "openedAt":
          aVal = a.openedAt ? new Date(a.openedAt).getTime() : 0
          bVal = b.openedAt ? new Date(b.openedAt).getTime() : 0
          break
        case "attempts":
          aVal = a.attempts
          bVal = b.attempts
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "outline"
      case "delivered":
        return "default"
      case "opened":
        return "default"
      case "failed":
        return "destructive"
      case "bounced":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />
      case "delivered":
        return <CheckCircle className="w-4 h-4" />
      case "opened":
        return <MessageSquare className="w-4 h-4" />
      case "failed":
        return <XCircle className="w-4 h-4" />
      case "bounced":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const filteredHistory = emailHistory.filter(record => {
    const matchesSearch = record.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const sortedHistory = getSortedHistory(filteredHistory)
  const totalPages = Math.ceil(sortedHistory.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedHistory = sortedHistory.slice(startIndex, startIndex + itemsPerPage)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusCounts = () => {
    return {
      total: emailHistory.length,
      pending: emailHistory.filter(r => r.status === "pending").length,
      delivered: emailHistory.filter(r => r.status === "delivered").length,
      opened: emailHistory.filter(r => r.status === "opened").length,
      failed: emailHistory.filter(r => r.status === "failed").length,
      bounced: emailHistory.filter(r => r.status === "bounced").length
    }
  }

  const stats = getStatusCounts()

  const handleResend = () => {
    console.log("Resending emails for job:", jobData?.batchId)
    // Implementation for resending failed/bounced emails
  }

  const handleExportCSV = () => {
    const headers = ["Recipient Name", "Recipient Email", "Student Name", "Year Group", "Status", "Sent At", "Attempts"]
    const rows = sortedHistory.map(record => [
      record.recipientName,
      record.recipientEmail,
      record.studentName,
      record.yearGroup,
      record.status,
      record.sentAt,
      String(record.attempts)
    ])
    const filename = `email-history-${jobData?.batchId || "export"}-${new Date().toISOString().split("T")[0]}`
    downloadAsXlsx(headers, rows, filename)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>{t("emailHistory.title")}</h2>
          <p className="text-muted-foreground">
            {t("emailHistory.subtitle")} {jobData?.batchId || t("emailHistory.emailJob")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleResend}>
            <Send className="w-4 h-4 mr-2" />
            {t("emailHistory.resendFailed")}
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            {t("emailHistory.exportHistory")}
          </Button>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {/* Job Summary */}
      {jobData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {t("emailHistory.jobInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">{t("emailHistory.batchId")}</label>
              <p className="font-mono">{jobData.batchId}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("emailHistory.invoiceType")}</label>
              <p className="capitalize">{jobData.invoiceType}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("emailHistory.yearGroup")}</label>
              <p>{jobData.yearGroup}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("emailHistory.totalRecipients")}</label>
              <p>{jobData.totalEmails}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("emailHistory.createdAt")}</label>
              <p>{formatDate(jobData.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("emailHistory.createdBy")}</label>
              <p>{jobData.createdBy}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("common.total")}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("common.pending")}</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("emailHistory.delivered")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("emailHistory.opened")}</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.opened}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("emailHistory.failed")}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("emailHistory.bounced")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bounced}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("emailHistory.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="pl-10 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showFilters && "rotate-180")} />
            </Button>
          </div>
          {showFilters && (<>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("common.status")}</label>
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1) }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                    <SelectItem value="pending">{t("common.pending")}</SelectItem>
                    <SelectItem value="delivered">{t("emailHistory.delivered")}</SelectItem>
                    <SelectItem value="opened">{t("emailHistory.opened")}</SelectItem>
                    <SelectItem value="failed">{t("emailHistory.failed")}</SelectItem>
                    <SelectItem value="bounced">{t("emailHistory.bounced")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
            </div>
          </>)}
        </CardContent>
      </Card>

      {/* Email History Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Recipient - text (left) */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("recipientName")}>
                  <div className="flex items-center gap-1">
                    {t("emailHistory.recipient")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Student - text (left) */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">
                    {t("emailHistory.student")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Status - badge (center) */}
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center justify-center gap-1">
                    {t("common.status")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Sent At - date (left) */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("sentAt")}>
                  <div className="flex items-center gap-1">
                    {t("emailHistory.sentAt")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Delivered At - date (left) */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("deliveredAt")}>
                  <div className="flex items-center gap-1">
                    {t("emailHistory.deliveredAt")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Opened At - date (left) */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("openedAt")}>
                  <div className="flex items-center gap-1">
                    {t("emailHistory.openedAt")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Attempts - number (right) */}
                <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("attempts")}>
                  <div className="flex items-center justify-end gap-1">
                    {t("emailHistory.attempts")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Failure Reason - text (left) */}
                <TableHead align="left">{t("emailHistory.failureReason")}</TableHead>
                {/* Actions - actions (center) */}
                <TableHead align="center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedHistory.map((record) => (
                <TableRow key={record.id}>
                  {/* Recipient - text (left) */}
                  <TableCell align="left">
                    <div>
                      <div className="font-medium">{record.recipientName}</div>
                      <div className="text-sm text-muted-foreground">{record.recipientEmail}</div>
                    </div>
                  </TableCell>
                  {/* Student - text (left) */}
                  <TableCell align="left">
                    <div>
                      <div className="font-medium">{record.studentName}</div>
                      <div className="text-sm text-muted-foreground">{record.yearGroup}</div>
                    </div>
                  </TableCell>
                  {/* Status - badge (center) */}
                  <TableCell align="center">
                    <Badge variant={getStatusBadgeVariant(record.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(record.status)}
                      <span className="capitalize">{record.status}</span>
                    </Badge>
                  </TableCell>
                  {/* Sent At - date (left) */}
                  <TableCell align="left">
                    <div className="text-sm">
                      {formatDate(record.sentAt)}
                    </div>
                  </TableCell>
                  {/* Delivered At - date (left) */}
                  <TableCell align="left">
                    <div className="text-sm">
                      {record.deliveredAt ? formatDate(record.deliveredAt) : "-"}
                    </div>
                  </TableCell>
                  {/* Opened At - date (left) */}
                  <TableCell align="left">
                    <div className="text-sm">
                      {record.openedAt ? formatDate(record.openedAt) : "-"}
                    </div>
                  </TableCell>
                  {/* Attempts - number (right) */}
                  <TableCell align="right">
                    <div className="text-sm">
                      {record.attempts}
                    </div>
                  </TableCell>
                  {/* Failure Reason - text (left) */}
                  <TableCell align="left">
                    <div className="text-sm text-red-600 max-w-[200px]">
                      {record.failureReason || "-"}
                    </div>
                  </TableCell>
                  {/* Actions - actions (center) */}
                  <TableCell align="center">
                    {(record.status === "failed" || record.status === "bounced") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRecord(record)
                          setIsDetailDialogOpen(true)
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {t("emailHistory.viewDetails")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredHistory.length === 0 && (
            <div className="text-center py-8">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3>{t("emailHistory.noRecordsFound")}</h3>
              <p className="text-muted-foreground">
                {t("emailHistory.noRecordsMatchFilter")}
              </p>
            </div>
          )}
        <PaginationBar
          currentPage={currentPage}
          pageSize={itemsPerPage}
          totalCount={sortedHistory.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
        />
        </CardContent>
      </Card>

      {/* Failure Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="w-[90vw] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-6">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              {t("emailHistory.failureDetails")}
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {/* Recipient & Student Info */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("emailHistory.recipient")}</label>
                  <p className="text-base font-semibold">{selectedRecord.recipientName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRecord.recipientEmail}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("emailHistory.student")}</label>
                  <p className="text-base font-semibold">{selectedRecord.studentName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRecord.yearGroup}</p>
                </div>
              </div>

              {/* Current Status Banner */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("emailHistory.currentStatus")}</label>
                      <Badge variant="destructive" className="flex items-center gap-1.5 px-2.5 py-0.5">
                        {selectedRecord.status === "bounced" ? <AlertCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span className="capitalize font-medium">{selectedRecord.status}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-red-700 leading-relaxed">{selectedRecord.failureReason}</p>
                  </div>
                  <div className="flex-shrink-0 text-center px-4 py-2 bg-white rounded-md border border-red-200">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">{t("emailHistory.attempts")}</label>
                    <p className="text-2xl font-bold text-red-600 mt-1">{selectedRecord.attempts}</p>
                  </div>
                </div>
              </div>

              {/* Attempt History */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <label className="text-sm font-semibold">{t("emailHistory.attemptHistory")}</label>
                </div>

                {selectedRecord.attemptHistory && selectedRecord.attemptHistory.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {/* Attempt Number - number (center) */}
                          <TableHead align="center" className="w-16">#</TableHead>
                          {/* Status - badge (center) */}
                          <TableHead align="center" className="w-24">{t("common.status")}</TableHead>
                          {/* Timestamp - date (left) */}
                          <TableHead align="left" className="w-44">{t("common.timestamp")}</TableHead>
                          {/* Error Message - text (left) */}
                          <TableHead align="left">{t("common.errorMessage")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRecord.attemptHistory.map((attempt, index) => (
                          <TableRow key={index}>
                            {/* Attempt Number - number (center) */}
                            <TableCell align="center" className="font-medium">{attempt.attemptNumber}</TableCell>
                            {/* Status - badge (center) */}
                            <TableCell align="center">
                              <Badge
                                variant={attempt.status === "bounced" || attempt.status === "failed" ? "destructive" : "default"}
                                className="capitalize"
                              >
                                {attempt.status}
                              </Badge>
                            </TableCell>
                            {/* Timestamp - date (left) */}
                            <TableCell align="left" className="text-sm text-muted-foreground">
                              {formatDate(attempt.timestamp)}
                            </TableCell>
                            {/* Error Message - text (left) */}
                            <TableCell align="left" className="text-sm text-red-600">
                              {attempt.errorMessage || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground">{t("emailHistory.noAttemptHistory")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              {t("common.close")}
            </Button>
            <Button onClick={() => {
              console.log("Resend to:", selectedRecord?.recipientEmail)
              setIsDetailDialogOpen(false)
            }}>
              <Send className="w-4 h-4 mr-2" />
              {t("emailHistory.resendEmail")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}