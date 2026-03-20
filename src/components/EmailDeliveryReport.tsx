import { useState, useMemo } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import {
  Search,
  Filter,
  Eye,
  Download,
  RefreshCw,
  CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Mail,
  Users,
  Loader2,
  FileText,
  ArrowUpDown
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { logActivity } from "@/lib/activityLog"
import { PaginationBar } from "./ui/pagination-bar"

interface EmailDeliveryRecord {
  id: string
  jobId: string
  jobName: string
  studentName: string
  studentId: string
  grade: string
  familyCode: string
  parentEmail: string
  status: "sent" | "delivered" | "opened" | "failed" | "bounced" | "spam"
  sentAt: Date
  deliveredAt?: Date
  openedAt?: Date
  failureReason?: string
  retryCount: number
  template: string
  language: "en" | "th" | "zh"
}

interface DeliveryStats {
  total: number
  sent: number
  delivered: number
  opened: number
  failed: number
  bounced: number
  spam: number
  openRate: number
  deliveryRate: number
}

const mockDeliveryRecords: EmailDeliveryRecord[] = [
  {
    id: "1",
    jobId: "job-001",
    jobName: "All Students - Term 2 Invoices",
    studentName: "John Smith",
    studentId: "ST001234",
    grade: "Year 10",
    familyCode: "FAM001",
    parentEmail: "robert.smith@email.com",
    status: "opened",
    sentAt: new Date("2025-08-20T09:15:00"),
    deliveredAt: new Date("2025-08-20T09:15:30"),
    openedAt: new Date("2025-08-20T14:22:00"),
    retryCount: 0,
    template: "Standard Invoice Email (English)",
    language: "en"
  },
  {
    id: "2",
    jobId: "job-001",
    jobName: "All Students - Term 2 Invoices",
    studentName: "Sarah Wilson",
    studentId: "ST001235",
    grade: "Year 7",
    familyCode: "FAM002",
    parentEmail: "michael.wilson@email.com",
    status: "delivered",
    sentAt: new Date("2025-08-20T09:15:00"),
    deliveredAt: new Date("2025-08-20T09:15:45"),
    retryCount: 0,
    template: "Standard Invoice Email (English)",
    language: "en"
  },
  {
    id: "3",
    jobId: "job-001",
    jobName: "All Students - Term 2 Invoices",
    studentName: "นายสมชาย ใจดี",
    studentId: "ST001236",
    grade: "Year 8",
    familyCode: "FAM003",
    parentEmail: "somchai.jaidee@email.com",
    status: "opened",
    sentAt: new Date("2025-08-20T09:16:00"),
    deliveredAt: new Date("2025-08-20T09:16:20"),
    openedAt: new Date("2025-08-20T16:45:00"),
    retryCount: 0,
    template: "Standard Invoice Email (Thai)",
    language: "th"
  },
  {
    id: "4",
    jobId: "job-001",
    jobName: "All Students - Term 2 Invoices",
    studentName: "李小明",
    studentId: "ST001237",
    grade: "Year 9",
    familyCode: "FAM004",
    parentEmail: "invalid-email@nonexistent.domain",
    status: "failed",
    sentAt: new Date("2025-08-20T09:16:30"),
    failureReason: "Domain not found",
    retryCount: 3,
    template: "Standard Invoice Email (Chinese)",
    language: "zh"
  },
  {
    id: "5",
    jobId: "job-002",
    jobName: "Year 10-12 Additional Fees",
    studentName: "Emma Davis",
    studentId: "ST001238",
    grade: "Year 11",
    familyCode: "FAM005",
    parentEmail: "david.davis@email.com",
    status: "bounced",
    sentAt: new Date("2025-08-25T14:35:00"),
    failureReason: "Mailbox full",
    retryCount: 2,
    template: "Standard Invoice Email (English)",
    language: "en"
  },
  {
    id: "6",
    jobId: "job-002",
    jobName: "Year 10-12 Additional Fees",
    studentName: "Tom Brown",
    studentId: "ST001239",
    grade: "Year 12",
    familyCode: "FAM006",
    parentEmail: "jane.brown@email.com",
    status: "spam",
    sentAt: new Date("2025-08-25T14:35:15"),
    deliveredAt: new Date("2025-08-25T14:35:20"),
    failureReason: "Marked as spam by recipient",
    retryCount: 1,
    template: "Standard Invoice Email (English)",
    language: "en"
  }
]

const grades = [
  "Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
  "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"
]

export function EmailDeliveryReport() {
  const { t } = useLanguage()
  const [records] = useState<EmailDeliveryRecord[]>(mockDeliveryRecords)
  const [filteredRecords, setFilteredRecords] = useState<EmailDeliveryRecord[]>(mockDeliveryRecords)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [languageFilter, setLanguageFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<EmailDeliveryRecord | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedRecords = (recordsToSort: EmailDeliveryRecord[]) => {
    if (!sortColumn) return recordsToSort
    return [...recordsToSort].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "studentName":
          aVal = a.studentName
          bVal = b.studentName
          break
        case "parentEmail":
          aVal = a.parentEmail
          bVal = b.parentEmail
          break
        case "jobName":
          aVal = a.jobName
          bVal = b.jobName
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "sentAt":
          aVal = a.sentAt?.getTime() || 0
          bVal = b.sentAt?.getTime() || 0
          break
        case "language":
          aVal = a.language
          bVal = b.language
          break
        case "retryCount":
          aVal = a.retryCount
          bVal = b.retryCount
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

  const sortedRecords = useMemo(() => getSortedRecords(filteredRecords), [filteredRecords, sortColumn, sortDirection])

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedRecords.slice(start, start + pageSize)
  }, [sortedRecords, currentPage, pageSize])

  const applyFilters = () => {
    let filtered = records

    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.familyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.parentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.jobName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(record => record.status === statusFilter)
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter(record => record.grade === gradeFilter)
    }

    if (languageFilter !== "all") {
      filtered = filtered.filter(record => record.language === languageFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(record => record.sentAt >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(record => record.sentAt <= dateTo)
    }

    setFilteredRecords(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setGradeFilter("all")
    setLanguageFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredRecords(records)
  }

  const openRecordDetail = (record: EmailDeliveryRecord) => {
    setSelectedRecord(record)
    setIsModalOpen(true)
  }

  const closeRecordModal = () => {
    setIsModalOpen(false)
    setSelectedRecord(null)
  }

  const retryFailedEmail = (recordId: string) => {
    toast.success(t("email.retryInitiated"))
    logActivity({ action: "Retry Email", module: "Email Delivery Report", detail: `Retried failed email for record ID: ${recordId}` })
  }

  const exportReport = () => {
    toast.success(t("email.reportExported"))
    logActivity({ action: "Export Report", module: "Email Delivery Report", detail: `Exported email delivery report with ${filteredRecords.length} records` })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />{t("email.status.sent")}</Badge>
      case "delivered":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t("email.status.delivered")}</Badge>
      case "opened":
        return <Badge className="bg-emerald-100 text-emerald-800"><Eye className="w-3 h-3 mr-1" />{t("email.status.opened")}</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />{t("email.status.failed")}</Badge>
      case "bounced":
        return <Badge className="bg-orange-100 text-orange-800"><AlertTriangle className="w-3 h-3 mr-1" />{t("email.status.bounced")}</Badge>
      case "spam":
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />{t("email.status.spam")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getLanguageFlag = (language: string) => {
    switch (language) {
      case "en":
        return "🇺🇸"
      case "th":
        return "🇹🇭"
      case "zh":
        return "🇨🇳"
      default:
        return "🌐"
    }
  }

  const calculateStats = (records: EmailDeliveryRecord[]): DeliveryStats => {
    const total = records.length
    const sent = records.filter(r => r.status === "sent").length
    const delivered = records.filter(r => ["delivered", "opened"].includes(r.status)).length
    const opened = records.filter(r => r.status === "opened").length
    const failed = records.filter(r => r.status === "failed").length
    const bounced = records.filter(r => r.status === "bounced").length
    const spam = records.filter(r => r.status === "spam").length

    return {
      total,
      sent,
      delivered,
      opened,
      failed,
      bounced,
      spam,
      openRate: total > 0 ? (opened / total) * 100 : 0,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0
    }
  }

  const stats = calculateStats(filteredRecords)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("email.deliveryReport")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("email.deliveryReportDesc")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportReport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            {t("email.exportReport")}
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("email.totalEmails")}</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("email.deliveryRate")}</p>
            <p className="text-2xl font-bold text-green-600">{stats.deliveryRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("email.openRate")}</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.openRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("email.failedEmails")}</p>
            <p className="text-2xl font-bold text-red-600">{stats.failed + stats.bounced + stats.spam}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t("common.searchAndFilter")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("common.search")}</label>
              <div className="relative">
                <Input
                  placeholder={t("email.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("common.status")}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="sent">{t("email.status.sent")}</SelectItem>
                  <SelectItem value="delivered">{t("email.status.delivered")}</SelectItem>
                  <SelectItem value="opened">{t("email.status.opened")}</SelectItem>
                  <SelectItem value="failed">{t("email.status.failed")}</SelectItem>
                  <SelectItem value="bounced">{t("email.status.bounced")}</SelectItem>
                  <SelectItem value="spam">{t("email.status.spam")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("student.yearGroup")}</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("payment.allYearGroups")}</SelectItem>
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("email.language")}</label>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("email.allLanguages")}</SelectItem>
                  <SelectItem value="en">{t("email.languageEnglish")}</SelectItem>
                  <SelectItem value="th">{t("email.languageThai")}</SelectItem>
                  <SelectItem value="zh">{t("email.languageChinese")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("payment.dateRange")}</label>
              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dateFrom ? format(dateFrom, "dd/MM") : t("common.from")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom || undefined}
                      onSelect={(date) => setDateFrom(date ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dateTo ? format(dateTo, "dd/MM") : t("common.to")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo || undefined}
                      onSelect={(date) => setDateTo(date ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} size="sm">{t("common.apply")}</Button>
              <Button variant="outline" onClick={clearFilters} size="sm">{t("common.clear")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {t("email.showingRecords", { showing: filteredRecords.length, total: records.length })}
        </p>
      </div>

      {/* Email Records Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">
                    {t("email.student")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("parentEmail")}>
                  <div className="flex items-center gap-1">
                    {t("email.email")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("jobName")}>
                  <div className="flex items-center gap-1">
                    {t("email.job")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    {t("common.status")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("sentAt")}>
                  <div className="flex items-center gap-1">
                    {t("email.status.sent")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("language")}>
                  <div className="flex items-center gap-1">
                    {t("email.language")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("retryCount")}>
                  <div className="flex items-center gap-1">
                    {t("email.retries")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{record.studentName}</div>
                      <div className="text-sm text-muted-foreground">
                        {record.studentId} • {record.grade} • {record.familyCode}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{record.parentEmail}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium truncate max-w-32" title={record.jobName}>
                        {record.jobName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(record.sentAt, "dd MMM HH:mm")}
                    </div>
                    {record.openedAt && (
                      <div className="text-xs text-muted-foreground">
                        {t("email.status.opened")}: {format(record.openedAt, "dd MMM HH:mm")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-lg">{getLanguageFlag(record.language)}</span>
                  </TableCell>
                  <TableCell>
                    {record.retryCount > 0 ? (
                      <Badge variant="outline">{record.retryCount} {t("email.retries").toLowerCase()}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openRecordDetail(record)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {["failed", "bounced"].includes(record.status) && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => retryFailedEmail(record.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={sortedRecords.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </CardContent>
      </Card>

      {/* Record Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {t("email.deliveryDetails")}
            </DialogTitle>
            <DialogDescription>
              {t("email.deliveryDetailsDesc")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("email.deliveryStatus")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedRecord.status)}
                    <span className="text-lg">{getLanguageFlag(selectedRecord.language)}</span>
                  </div>
                </div>
                {selectedRecord.retryCount > 0 && (
                  <Badge variant="outline">{selectedRecord.retryCount} {t("email.retries").toLowerCase()}</Badge>
                )}
              </div>

              <Separator />

              {/* Student & Job Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-medium">{t("email.studentInformation")}</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("email.studentName")}</p>
                      <p className="font-medium">{selectedRecord.studentName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("email.studentId")}</p>
                      <p className="font-mono">{selectedRecord.studentId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("student.yearGroup")}</p>
                      <Badge variant="secondary">{selectedRecord.grade}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("email.familyCode")}</p>
                      <p className="font-mono">{selectedRecord.familyCode}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">{t("email.emailInformation")}</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("email.recipientEmail")}</p>
                      <p className="font-medium">{selectedRecord.parentEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("email.emailJob")}</p>
                      <p className="font-medium">{selectedRecord.jobName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("email.templateUsed")}</p>
                      <p className="font-medium">{selectedRecord.template}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("email.language")}</p>
                      <div className="flex items-center gap-2">
                        <span>{getLanguageFlag(selectedRecord.language)}</span>
                        <span className="capitalize">{selectedRecord.language === "en" ? t("email.english") : selectedRecord.language === "th" ? t("email.thai") : t("email.chinese")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Timeline */}
              <div className="space-y-3">
                <h3 className="font-medium">{t("email.deliveryTimeline")}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{t("email.emailSent")}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(selectedRecord.sentAt, "dd MMM yyyy 'at' HH:mm:ss")}
                      </p>
                    </div>
                  </div>

                  {selectedRecord.deliveredAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{t("email.emailDelivered")}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(selectedRecord.deliveredAt, "dd MMM yyyy 'at' HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedRecord.openedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Eye className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">{t("email.emailOpened")}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(selectedRecord.openedAt, "dd MMM yyyy 'at' HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedRecord.status === "failed" && selectedRecord.failureReason && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">{t("email.deliveryFailed")}</p>
                        <p className="text-sm text-muted-foreground">{selectedRecord.failureReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {["failed", "bounced"].includes(selectedRecord.status) && (
                  <Button
                    onClick={() => {
                      retryFailedEmail(selectedRecord.id)
                      closeRecordModal()
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t("email.retryEmail")}
                  </Button>
                )}

                <Button variant="outline" onClick={closeRecordModal}>
                  {t("common.close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}