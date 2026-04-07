import { useState, useEffect, useMemo } from "react"
import { downloadAsXlsx, formatAcademicYear } from "@/utils/xlsxUtils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { cn } from "./ui/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Filter, Mail, CalendarIcon, History, Users, CheckCircle, TrendingUp, Eye, FileText, Send, Download, MoreVertical, Search, X, AlertCircle, ChevronDown, ArrowUpDown } from "lucide-react"
import { PaginationBar } from "./ui/pagination-bar"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "@/components/ui/sonner"
import { logActivity } from "@/lib/activityLog"
import { useSchoolSettings } from "@/hooks/useSchoolSettings"
import { usePersistedState } from "@/hooks/usePersistedState"
import { format } from "date-fns"

const mockHistory = [
  {
    id: "h1",
    sentDate: "2026-01-20",
    subject: "Tuition Fee Receipt - Academic Year 2025/2026",
    academicYear: "2025/2026",
    term: "Term 1",
    recipients: 145,
    status: "sent"
  },
  {
    id: "h2",
    sentDate: "2026-01-15",
    subject: "Tuition Invoice - Academic Year 2025/2026",
    academicYear: "2025/2026",
    term: "Term 1",
    recipients: 89,
    status: "sent"
  },
  {
    id: "h3",
    sentDate: "2026-01-10",
    subject: "ECA Registration Confirmation & Receipt",
    academicYear: "2025/2026",
    term: "Term 1",
    recipients: 67,
    status: "sent"
  },
  {
    id: "h4",
    sentDate: "2025-12-20",
    subject: "Tuition Payment Reminder",
    academicYear: "2025/2026",
    term: "Term 1",
    recipients: 152,
    status: "sent"
  },
  {
    id: "h5",
    sentDate: "2025-12-15",
    subject: "School Bus Fee Receipt",
    academicYear: "2025/2026",
    term: "Term 1",
    recipients: 98,
    status: "sent"
  }
]

const loadEmailHistoryFromStorage = () => {
  try {
    const stored = localStorage.getItem("emailReminderHistory")
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load email history:", error)
  }
  return []
}

const formatDisplayDate = (dateString: string) => {
  const date = new Date(dateString)
  return format(date, 'd MMMM yyyy')
}

const generateMockRecipients = (count: number, subject: string) => {
  const mockNames = [
    "John Smith", "Mary Johnson", "Robert Williams", "Patricia Brown", "Michael Jones",
    "Jennifer Garcia", "William Martinez", "Linda Rodriguez", "David Lee", "Barbara Wilson",
    "Richard Anderson", "Susan Thomas", "Joseph Taylor", "Jessica Moore", "Thomas Jackson"
  ]
  const failureReasons = [
    "Invalid email address",
    "Mailbox full",
    "Email server rejected",
    "Recipient blocked sender",
    "Domain not found",
    "Connection timeout",
    "Spam filter blocked"
  ]
  const recipients = []
  for (let i = 0; i < count; i++) {
    const name = mockNames[i % mockNames.length]
    const status = Math.random() > 0.05 ? "delivered" : "failed"
    const recipient: any = {
      id: `recipient-${i}`,
      name: `${name} (${i + 1})`,
      email: `parent${i + 1}@example.com`,
      studentName: `Student ${i + 1}`,
      status
    }
    if (status === "failed") {
      recipient.failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)]
    }
    recipients.push(recipient)
  }
  return recipients
}

export function EmailHistory() {
  const { t } = useLanguage()
  const schoolSettings = useSchoolSettings()
  const [historySearch, setHistorySearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [detailsDialog, setDetailsDialog] = useState<any>(null)
  const [recipientsDialog, setRecipientsDialog] = useState<any>(null)
  const [resendDialog, setResendDialog] = useState<any>(null)
  const [allHistory, setAllHistory] = useState<any[]>([])
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [dateFromOpen, setDateFromOpen] = useState(false)
  const [dateToOpen, setDateToOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Sorting state
  const [sortKey, setSortKey] = useState<string>("sentDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  useEffect(() => {
    const loadHistory = () => {
      const storedHistory = loadEmailHistoryFromStorage()
      setAllHistory([...storedHistory, ...mockHistory])
    }

    loadHistory()

    const interval = setInterval(loadHistory, 2000)
    window.addEventListener("emailReminderHistoryUpdated", loadHistory)

    return () => {
      clearInterval(interval)
      window.removeEventListener("emailReminderHistoryUpdated", loadHistory)
    }
  }, [])

  // Get unique academic years and terms from data
  const academicYearOptions = useMemo(() => {
    const years = new Set(allHistory.map(item => item.academicYear).filter(Boolean))
    return Array.from(years).sort()
  }, [allHistory])

  const termOptions = useMemo(() => {
    const terms = new Set(allHistory.map(item => item.term).filter(Boolean))
    return Array.from(terms).sort()
  }, [allHistory])

  const clearFilters = () => {
    setHistorySearch("")
    setAcademicYearFilter("all")
    setTermFilter("all")
    setStatusFilter("all")
    setDateFrom(undefined)
    setDateTo(undefined)
    setCurrentPage(1)
  }

  const filterHistory = (item: any) => {
    if (historySearch) {
      const search = historySearch.toLowerCase()
      const matchesSearch = (
        item.subject.toLowerCase().includes(search) ||
        item.academicYear.toLowerCase().includes(search) ||
        item.term.toLowerCase().includes(search)
      )
      if (!matchesSearch) return false
    }

    if (academicYearFilter !== "all" && item.academicYear !== academicYearFilter) return false
    if (termFilter !== "all" && item.term !== termFilter) return false
    if (statusFilter !== "all" && item.status !== statusFilter) return false

    if (dateFrom || dateTo) {
      const itemDate = new Date(item.sentDate)
      if (dateFrom && itemDate < dateFrom) return false
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        if (itemDate > endOfDay) return false
      }
    }

    return true
  }

  const handleViewDetails = (historyItem: any) => {
    setDetailsDialog(historyItem)
  }

  const handleViewRecipients = (historyItem: any) => {
    const recipients = generateMockRecipients(historyItem.recipients, historyItem.subject)
    setRecipientsDialog({ ...historyItem, recipientList: recipients })
  }

  const handleResendReminder = (historyItem: any) => {
    const recipients = generateMockRecipients(historyItem.recipients, historyItem.subject)
    const failedCount = recipients.filter(r => r.status === "failed").length

    setResendDialog({
      ...historyItem,
      failedCount,
      totalCount: historyItem.recipients
    })
  }

  const executeResend = (historyItem: any, resendType: 'failed' | 'all') => {
    const recipientCount = resendType === 'failed' ? historyItem.failedCount : historyItem.totalCount

    const newEntry = {
      id: `resend-${Date.now()}`,
      sentDate: new Date().toISOString().split('T')[0],
      subject: historyItem.subject,
      academicYear: historyItem.academicYear,
      term: historyItem.term,
      recipients: recipientCount,
      status: "sent",
      message: historyItem.message
    }

    try {
      const existingHistory = localStorage.getItem("emailReminderHistory")
      const history = existingHistory ? JSON.parse(existingHistory) : []
      history.unshift(newEntry)
      localStorage.setItem("emailReminderHistory", JSON.stringify(history))

      setAllHistory([newEntry, ...allHistory])
    } catch (error) {
      console.error("Failed to save resend history:", error)
    }

    setResendDialog(null)

    const message = resendType === 'failed'
      ? `Resent to ${recipientCount} failed recipients`
      : `Resent to all ${recipientCount} recipients`

    toast.success(message, {
      description: `Subject: ${historyItem.subject}`
    })
  }

  const handleDownloadReport = (historyItem: any) => {
    const recipients = generateMockRecipients(historyItem.recipients, historyItem.subject)
    const headers = ["No.", "Parent Name", "Email", "Student Name", "Status", "Failure Reason"]
    const rows = recipients.map((r: any, idx: number) => [
      idx + 1,
      r.name,
      r.email,
      r.studentName,
      r.status,
      r.failureReason || ''
    ])

    downloadAsXlsx(headers, rows, `email-report-${historyItem.id}-${new Date().toISOString().split('T')[0]}`)

    toast.success("Report downloaded successfully", {
      description: `${historyItem.recipients} recipients exported to Excel`
    })
    logActivity({ action: "Download Report", module: "Email History", detail: `Downloaded report for "${historyItem.subject}" — ${historyItem.recipients} recipients` })
  }

  const filteredHistory = allHistory.filter(filterHistory)

  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]

      if (sortKey === "sentDate") {
        aVal = new Date(a.sentDate).getTime()
        bVal = new Date(b.sentDate).getTime()
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredHistory, sortKey, sortDirection])

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedHistory.slice(start, start + pageSize)
  }, [sortedHistory, currentPage, pageSize])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">Email History</h2>
          <p className="text-sm text-muted-foreground">
            View all emails sent to parents and students
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Email Jobs</p>
            </div>
            <p className="text-2xl font-bold">{allHistory.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Send className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Emails Dispatched</p>
            </div>
            <p className="text-2xl font-bold">
              {allHistory.reduce((sum, item) => sum + item.recipients, 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Delivery Success Rate</p>
            </div>
            <p className="text-2xl font-bold">98.5%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search + Filters Toggle */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {academicYearOptions.map(year => (
                    <SelectItem key={year} value={year}>{formatAcademicYear(year)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={termFilter} onValueChange={setTermFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  {termOptions.map(term => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal h-9", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setDateFromOpen(false) }} />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">→</span>
                <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal h-9", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setDateToOpen(false) }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
            </div>
          </>)}

        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("sentDate")} align="left">
                    <div className="flex items-center gap-1">
                      {t("common.date")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("subject")} align="left">
                    <div className="flex items-center gap-1">
                      Subject
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("academicYear")} align="left">
                    <div className="flex items-center gap-1">
                      {t("common.academicYear")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("term")} align="left">
                    <div className="flex items-center gap-1">
                      {t("common.term")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("recipients")} align="right">
                    <div className="flex items-center justify-end gap-1">
                      Recipients
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead align="center">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No emails found</p>
                      <p className="text-xs mt-1">Try adjusting your search or filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell align="left" className="font-medium">{formatDisplayDate(item.sentDate)}</TableCell>
                      <TableCell align="left">{item.subject}</TableCell>
                      <TableCell align="left">{formatAcademicYear(item.academicYear)}</TableCell>
                      <TableCell align="left">{item.term}</TableCell>
                      <TableCell align="right" className="font-semibold">{item.recipients}</TableCell>
                      <TableCell align="center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewDetails(item)} className="cursor-pointer">
                              <Eye className="w-4 h-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewRecipients(item)} className="cursor-pointer">
                              <Users className="w-4 h-4" />
                              View Delivery Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleResendReminder(item)} className="cursor-pointer">
                              <Send className="w-4 h-4" />
                              Resend
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadReport(item)} className="cursor-pointer">
                              <Download className="w-4 h-4" />
                              Export Excel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              totalCount={filteredHistory.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detailsDialog} onOpenChange={() => setDetailsDialog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Eye className="w-6 h-6" />
              Email Details
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Complete information about this reminder email
            </DialogDescription>
          </DialogHeader>
          {detailsDialog && (
            <div className="space-y-10 px-6 py-4">
              <div className="border-b pb-4">
                <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                <p className="text-xl font-semibold mt-1">{detailsDialog.subject}</p>
              </div>

              <div className="grid grid-cols-3 gap-8">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Sent Date</Label>
                  <p className="text-base font-medium mt-1">{formatDisplayDate(detailsDialog.sentDate)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Academic Year</Label>
                  <p className="text-base font-medium mt-1">{formatAcademicYear(detailsDialog.academicYear)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Term</Label>
                  <p className="text-base font-medium mt-1">{detailsDialog.term}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Recipients</Label>
                  <p className="text-lg font-semibold mt-1">{detailsDialog.recipients} parents/students</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-600 text-white">
                      <CheckCircle className="w-4 h-4" />
                      {detailsDialog.status.charAt(0).toUpperCase() + detailsDialog.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Message Preview</Label>
                <div className="mt-2 p-6 bg-muted rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                  {detailsDialog.message ? (
                    <>{detailsDialog.message}</>
                  ) : (
                    <>
                      <p>Dear Parent,</p>
                      <p className="mt-3">
                        This is an official communication regarding: {detailsDialog.subject}.
                        Please review the attached documents or information below for further details.
                      </p>
                      <p className="mt-3">
                        Academic Year: {formatAcademicYear(detailsDialog.academicYear)}<br />
                        Term: {detailsDialog.term}
                      </p>
                      <p className="mt-3">
                        If you have any questions, please contact our office.
                      </p>
                      <p className="mt-3">
                        Best regards,<br />
                        {schoolSettings.schoolName}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!recipientsDialog} onOpenChange={() => setRecipientsDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="w-6 h-6" />
              Delivery Report
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {recipientsDialog?.recipients} recipients for "{recipientsDialog?.subject}"
            </DialogDescription>
          </DialogHeader>
          {recipientsDialog && (
            <div className="space-y-4 px-6 py-4">
              <div className="overflow-y-auto max-h-[50vh]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-semibold text-sm">No.</th>
                      <th className="text-left p-3 font-semibold text-sm">Parent Name</th>
                      <th className="text-left p-3 font-semibold text-sm">Email</th>
                      <th className="text-left p-3 font-semibold text-sm">Student Name</th>
                      <th className="text-center p-3 font-semibold text-sm">Status</th>
                      <th className="text-left p-3 font-semibold text-sm">Failure Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipientsDialog.recipientList.map((recipient: any, idx: number) => (
                      <tr key={recipient.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-sm">{idx + 1}</td>
                        <td className="p-3 text-sm font-medium">{recipient.name}</td>
                        <td className="p-3 text-sm text-muted-foreground">{recipient.email}</td>
                        <td className="p-3 text-sm">{recipient.studentName}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            recipient.status === "delivered"
                              ? "bg-green-600 text-white"
                              : "bg-red-600 text-white"
                          }`} style={{ opacity: 1, backgroundColor: recipient.status === "delivered" ? "#16a34a" : "#dc2626" }}>
                            {recipient.status === "delivered" ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            {recipient.status === "delivered" ? "Sent" : recipient.status?.charAt(0).toUpperCase() + recipient.status?.slice(1)}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          {recipient.status === "failed" && recipient.failureReason ? (
                            <span className="text-red-600 text-xs font-medium" style={{ color: "#dc2626" }}>{recipient.failureReason}</span>
                          ) : recipient.status === "delivered" ? (
                            <span className="text-muted-foreground text-xs">-</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!resendDialog} onOpenChange={() => setResendDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Send className="w-6 h-6" />
              Resend Email
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Choose who should receive this email
            </DialogDescription>
          </DialogHeader>
          {resendDialog && (
            <div className="px-6 py-4 space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold">{resendDialog.subject}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatAcademicYear(resendDialog.academicYear)} • {resendDialog.term}
                </p>
              </div>

              {resendDialog.failedCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">
                      {resendDialog.failedCount} recipients did not receive this email
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      You can resend to failed recipients only or to everyone
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {resendDialog.failedCount > 0 && (
                  <Button
                    onClick={() => executeResend(resendDialog, 'failed')}
                    className="w-full justify-start"
                    variant="default"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Resend to Failed Only ({resendDialog.failedCount} recipients)
                  </Button>
                )}
                <Button
                  onClick={() => executeResend(resendDialog, 'all')}
                  className="w-full justify-start"
                  variant={resendDialog.failedCount > 0 ? "outline" : "default"}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Resend to All Recipients ({resendDialog.totalCount} recipients)
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="px-6 pb-6">
            <Button onClick={() => setResendDialog(null)} variant="ghost">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
