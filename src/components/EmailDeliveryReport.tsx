import { useState } from "react"
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
import { toast } from "sonner@2.0.3"

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
  "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
  "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"
]

export function EmailDeliveryReport() {
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
          aVal = a.sentAt.getTime()
          bVal = b.sentAt.getTime()
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
    toast.success("Email retry initiated")
  }

  const exportReport = () => {
    toast.success("Report exported successfully")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Sent</Badge>
      case "delivered":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>
      case "opened":
        return <Badge className="bg-emerald-100 text-emerald-800"><Eye className="w-3 h-3 mr-1" />Opened</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      case "bounced":
        return <Badge className="bg-orange-100 text-orange-800"><AlertTriangle className="w-3 h-3 mr-1" />Bounced</Badge>
      case "spam":
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Spam</Badge>
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
          <h2 className="text-xl font-semibold">Email Delivery Report</h2>
          <p className="text-sm text-muted-foreground">
            Track email delivery status, open rates, and troubleshoot failed deliveries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportReport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Total Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.deliveryRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">{stats.delivered} delivered</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              Open Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.openRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">{stats.opened} opened</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              Failed Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed + stats.bounced + stats.spam}</div>
            <div className="text-sm text-muted-foreground">
              {stats.failed} failed, {stats.bounced} bounced, {stats.spam} spam
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Input
                  placeholder="Student, email, job..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year Group</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Year Groups</SelectItem>
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="th">🇹🇭 ไทย</SelectItem>
                  <SelectItem value="zh">🇨🇳 中文</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dateFrom ? format(dateFrom, "MM/dd") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom || undefined}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dateTo ? format(dateTo, "MM/dd") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo || undefined}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} size="sm">Apply</Button>
              <Button variant="outline" onClick={clearFilters} size="sm">Clear</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredRecords.length} of {records.length} email records
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
                    Student
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("parentEmail")}>
                  <div className="flex items-center gap-1">
                    Email
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("jobName")}>
                  <div className="flex items-center gap-1">
                    Job
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("sentAt")}>
                  <div className="flex items-center gap-1">
                    Sent
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("language")}>
                  <div className="flex items-center gap-1">
                    Language
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("retryCount")}>
                  <div className="flex items-center gap-1">
                    Retries
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getSortedRecords(filteredRecords).map((record) => (
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
                      {format(record.sentAt, "MMM dd, HH:mm")}
                    </div>
                    {record.openedAt && (
                      <div className="text-xs text-muted-foreground">
                        Opened: {format(record.openedAt, "MMM dd, HH:mm")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-lg">{getLanguageFlag(record.language)}</span>
                  </TableCell>
                  <TableCell>
                    {record.retryCount > 0 ? (
                      <Badge variant="outline">{record.retryCount} retries</Badge>
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
        </CardContent>
      </Card>

      {/* Record Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Delivery Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about email delivery and engagement
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedRecord.status)}
                    <span className="text-lg">{getLanguageFlag(selectedRecord.language)}</span>
                  </div>
                </div>
                {selectedRecord.retryCount > 0 && (
                  <Badge variant="outline">{selectedRecord.retryCount} retries</Badge>
                )}
              </div>

              <Separator />

              {/* Student & Job Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-medium">Student Information</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Student Name</p>
                      <p className="font-medium">{selectedRecord.studentName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Student ID</p>
                      <p className="font-mono">{selectedRecord.studentId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Year Group</p>
                      <Badge variant="secondary">{selectedRecord.grade}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Family Code</p>
                      <p className="font-mono">{selectedRecord.familyCode}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Email Information</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Recipient Email</p>
                      <p className="font-medium">{selectedRecord.parentEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email Job</p>
                      <p className="font-medium">{selectedRecord.jobName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Template Used</p>
                      <p className="font-medium">{selectedRecord.template}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Language</p>
                      <div className="flex items-center gap-2">
                        <span>{getLanguageFlag(selectedRecord.language)}</span>
                        <span className="capitalize">{selectedRecord.language === "en" ? "English" : selectedRecord.language === "th" ? "Thai" : "Chinese"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Timeline */}
              <div className="space-y-3">
                <h3 className="font-medium">Delivery Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Email Sent</p>
                      <p className="text-sm text-muted-foreground">
                        {format(selectedRecord.sentAt, "MMM dd, yyyy 'at' HH:mm:ss")}
                      </p>
                    </div>
                  </div>

                  {selectedRecord.deliveredAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Email Delivered</p>
                        <p className="text-sm text-muted-foreground">
                          {format(selectedRecord.deliveredAt, "MMM dd, yyyy 'at' HH:mm:ss")}
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
                        <p className="font-medium">Email Opened</p>
                        <p className="text-sm text-muted-foreground">
                          {format(selectedRecord.openedAt, "MMM dd, yyyy 'at' HH:mm:ss")}
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
                        <p className="font-medium">Delivery Failed</p>
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
                    Retry Email
                  </Button>
                )}
                
                <Button variant="outline" onClick={closeRecordModal}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}