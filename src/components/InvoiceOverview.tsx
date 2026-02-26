import { useState, useMemo, useEffect } from "react"
import { downloadAsXlsx, formatAcademicYear } from "@/utils/xlsxUtils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { CalendarIcon, Search, Download, Filter, Eye, Send, AlertTriangle, X, User, FileText, Calendar as CalendarEmoji, DollarSign, Clock, MessageSquare, RefreshCw, ArrowUpDown } from "lucide-react"
import { StatusFilter, PaymentStatus, getStatusBadge, PaymentChannelFilter, PaymentChannel, getPaymentChannelLabel } from "./StatusFilter"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { format } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { toast } from "@/components/ui/sonner"
import { useStudents } from "@/contexts/StudentContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"

interface Invoice {
  id: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  amount: number
  dueDate: Date
  issueDate?: Date | null
  status: "paid" | "partial" | "unpaid" | "cancelled" | "overdue" | "sent" | "pending"
  term: string
  paymentType: "yearly" | "termly"
  paymentChannel?: "credit_card" | "wechat_pay" | "alipay" | "qr_payment" | "counter_bank"
  remindersSent: number
  invoiceType?: "student" | "external"
}

// localStorage key for created invoices (same as InvoiceCreation)
const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"

// Load created invoices from localStorage
const loadCreatedInvoicesFromStorage = (onlyInternal: boolean = false): Invoice[] => {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) {
      const savedInvoices = JSON.parse(stored)
      let invoices = savedInvoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        studentName: inv.studentName,
        studentId: inv.studentId,
        studentGrade: inv.studentGrade,
        amount: inv.netAmount || inv.subtotal,
        dueDate: new Date(inv.dueDate),
        issueDate: inv.issueDate ? new Date(inv.issueDate) : null,
        status: inv.status === "sent" ? "unpaid" : inv.status,
        term: inv.term,
        paymentType: inv.paymentType || "termly",
        paymentChannel: inv.paymentChannel,
        remindersSent: inv.remindersSent || 0,
        invoiceType: inv.invoiceType || (inv.studentId === "EXTERNAL" ? "external" : "student")
      }))

      // Filter out external invoices if onlyInternal is true
      if (onlyInternal) {
        invoices = invoices.filter((inv: Invoice) =>
          inv.invoiceType !== "external" && inv.studentId !== "EXTERNAL"
        )
      }

      return invoices
    }
  } catch (error) {
    console.error("Failed to load created invoices:", error)
  }
  return []
}

interface InvoiceOverviewProps {
  showOnlyInternal?: boolean // If true, only show internal student invoices
}

export function InvoiceOverview({ showOnlyInternal = false }: InvoiceOverviewProps) {
  const { t, language } = useLanguage()
  const locale = language === "th" ? th : enUS
  const { students } = useStudents()
  const { academicYears = [] } = useAcademicYears()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)

  // Load invoices from localStorage immediately (not waiting for useEffect)
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadCreatedInvoicesFromStorage(showOnlyInternal))
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Reload invoices when refreshTrigger changes or on mount
  useEffect(() => {
    const storedInvoices = loadCreatedInvoicesFromStorage(showOnlyInternal)
    setInvoices(storedInvoices)
  }, [refreshTrigger, showOnlyInternal])

  // Listen for storage changes and custom events
  useEffect(() => {
    const loadInvoices = () => {
      const storedInvoices = loadCreatedInvoicesFromStorage(showOnlyInternal)
      setInvoices(storedInvoices)
    }

    // Listen for storage changes (in case invoices are created in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CREATED_INVOICES_STORAGE_KEY) {
        loadInvoices()
      }
    }

    // Listen for custom event when invoices are created (same tab)
    const handleInvoicesUpdated = () => {
      loadInvoices()
    }

    // Listen for visibility change (when user switches back to this tab/page)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadInvoices()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('invoicesUpdated', handleInvoicesUpdated)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('invoicesUpdated', handleInvoicesUpdated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [dueDateFrom, setDueDateFrom] = useState<Date | null>(null)
  const [dueDateTo, setDueDateTo] = useState<Date | null>(null)

  // Get available terms based on selected academic year
  const availableTerms = academicYearFilter !== "all"
    ? (academicYears.find(y => y.id === academicYearFilter)?.terms || [])
    : [...new Map(academicYears.flatMap(y => y.terms).map(t => [t.name, t])).values()]
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Grade options for filter
  const gradeOptions = ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]

  // Initialize filteredInvoices when invoices change
  useEffect(() => {
    setFilteredInvoices(invoices)
  }, [invoices])

  const applyFilters = () => {
    let filtered = invoices

    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (academicYearFilter !== "all") {
      filtered = filtered.filter(invoice => invoice.term?.includes(academicYearFilter))
    }

    if (termFilter !== "all") {
      filtered = filtered.filter(invoice => invoice.term?.includes(termFilter))
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter(invoice => invoice.studentGrade === gradeFilter)
    }

    if (dueDateFrom) {
      filtered = filtered.filter(invoice => invoice.dueDate >= dueDateFrom)
    }

    if (dueDateTo) {
      filtered = filtered.filter(invoice => invoice.dueDate <= dueDateTo)
    }

    setFilteredInvoices(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setSearchTerm("")
    setAcademicYearFilter("all")
    setTermFilter("all")
    setStatusFilter("all")
    setGradeFilter("all")
    setDueDateFrom(null)
    setDueDateTo(null)
    setFilteredInvoices(invoices)
    setCurrentPage(1)
  }

  const sendReminder = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      // Update reminders sent count in a real app
      toast.success(t("invoiceOverview.reminderSent").replace("{name}", invoice.studentName))
    }
  }

  const downloadInvoice = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      // Generate Excel content for the invoice
      const headers = ["Field", "Value"]
      const rows: (string | number)[][] = [
        ["Invoice Number", invoice.invoiceNumber],
        ["Student Name", invoice.studentName],
        ["Student ID", invoice.studentId],
        ["Year Group", invoice.studentGrade],
        ["Amount", invoice.amount],
        ["Due Date", format(invoice.dueDate, "dd/MM/yyyy")],
        ["Issue Date", invoice.issueDate ? format(invoice.issueDate, "dd/MM/yyyy") : "Pending"],
        ["Status", invoice.status],
        ["Term", invoice.term],
        ["Payment Type", invoice.paymentType],
        ["Reminders Sent", invoice.remindersSent],
      ]

      downloadAsXlsx(headers, rows, `${invoice.invoiceNumber}_invoice`)

      toast.success(t("invoiceOverview.invoiceDownloaded").replace("{number}", invoice.invoiceNumber))
    }
  }

  const openInvoiceDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedInvoice(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">{t("common.paid")}</Badge>
      case "unpaid":
        return <Badge className="bg-blue-100 text-blue-800">{t("common.unpaid")}</Badge>
      case "sent":
        return <Badge className="bg-purple-100 text-purple-800">{t("common.sent")}</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">{t("common.pending")}</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">{t("common.overdue")}</Badge>
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800">{t("common.cancelled")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Sorting functions
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedInvoices = (invoices: Invoice[]) => {
    if (!sortColumn) return invoices
    return [...invoices].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case "invoiceNumber":
          aValue = a.invoiceNumber
          bValue = b.invoiceNumber
          break
        case "studentName":
          aValue = a.studentName
          bValue = b.studentName
          break
        case "studentGrade":
          aValue = a.studentGrade
          bValue = b.studentGrade
          break
        case "amount":
          aValue = a.amount
          bValue = b.amount
          break
        case "dueDate":
          aValue = a.dueDate?.getTime() || 0
          bValue = b.dueDate?.getTime() || 0
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        case "paymentType":
          aValue = a.paymentType
          bValue = b.paymentType
          break
        case "paymentChannel":
          aValue = a.paymentChannel || ""
          bValue = b.paymentChannel || ""
          break
        case "remindersSent":
          aValue = a.remindersSent
          bValue = b.remindersSent
          break
        default:
          return 0
      }

      if (typeof aValue === "string") {
        const comparison = aValue.localeCompare(bValue)
        return sortDirection === "asc" ? comparison : -comparison
      } else {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }
    })
  }

  // Calculate pagination with sorting
  const sortedInvoices = getSortedInvoices(filteredInvoices)
  const totalPages = Math.ceil(sortedInvoices.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPageInvoices = sortedInvoices.slice(startIndex, endIndex)

  const summaryStats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === "paid").length,
    unpaid: invoices.filter(i => i.status === "unpaid").length,
    overdue: invoices.filter(i => i.status === "overdue").length,
    totalAmount: invoices.reduce((sum, i) => sum + i.amount, 0),
    unpaidAmount: invoices.filter(i => i.status === "unpaid" || i.status === "overdue").reduce((sum, i) => sum + i.amount, 0)
  }

  // Manual refresh function
  const refreshInvoices = () => {
    const storedInvoices = loadCreatedInvoicesFromStorage()
    setInvoices(storedInvoices)
    toast.success(t("invoiceOverview.listRefreshed"))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("invoiceOverview.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("invoiceOverview.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshInvoices} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {t("common.refresh")}
          </Button>
          <Button className="flex items-center gap-2" disabled={!userCanEdit}>
            <Download className="w-4 h-4" />
            {t("invoice.exportReport")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("invoiceOverview.totalInvoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {t("invoiceOverview.totalValue")}: {summaryStats.totalAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("invoiceOverview.paidInvoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.paid}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((summaryStats.paid / summaryStats.total) * 100)}% {t("invoiceOverview.ofTotal")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("invoiceOverview.unpaidInvoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.unpaid}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => i.status === "unpaid").reduce((sum, i) => sum + i.amount, 0).toLocaleString()} {t("common.pending").toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("invoiceOverview.overdueInvoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => i.status === "overdue").reduce((sum, i) => sum + i.amount, 0).toLocaleString()} {t("common.overdue").toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {t("invoiceOverview.searchFilter")}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="h-9" disabled={!userCanEdit}>{t("common.apply")}</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9" disabled={!userCanEdit}>{t("common.clear")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.search")}</label>
              <Input
                placeholder={t("invoiceOverview.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
                disabled={!userCanEdit}
              />
            </div>

            {/* Academic Year */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("invoice.academicYear")}</label>
              <Select value={academicYearFilter} onValueChange={(value) => {
                setAcademicYearFilter(value)
                setTermFilter("all") // Reset term when year changes
              }} disabled={!userCanEdit}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("invoice.allYears")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("invoice.allYears")}</SelectItem>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>{formatAcademicYear(year.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Term */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("invoice.term")}</label>
              <Select value={termFilter} onValueChange={setTermFilter} disabled={!userCanEdit}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("invoice.allTerms")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("invoice.allTerms")}</SelectItem>
                  {availableTerms.map(term => (
                    <SelectItem key={term.name} value={term.name}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Year Group */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("invoice.yearGroup")}</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter} disabled={!userCanEdit}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("invoice.allYearGroups")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("invoice.allYearGroups")}</SelectItem>
                  {gradeOptions.map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PaymentStatus)} disabled={!userCanEdit}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("invoice.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                  <SelectItem value="paid">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t("common.paid")}</Badge>
                  </SelectItem>
                  <SelectItem value="unpaid">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{t("common.unpaid")}</Badge>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t("common.overdue")}</Badge>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{t("common.cancelled")}</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("invoice.dateRange")}</label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal" disabled={!userCanEdit}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDateFrom ? format(dueDateFrom, "dd/MM/yy", { locale }) : t("date.from")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDateFrom || undefined}
                      onSelect={(date) => setDueDateFrom(date ?? null)}
                      initialFocus
                      disabled={!userCanEdit}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal" disabled={!userCanEdit}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDateTo ? format(dueDateTo, "dd/MM/yy", { locale }) : t("date.to")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDateTo || undefined}
                      onSelect={(date) => setDueDateTo(date ?? null)}
                      initialFocus
                      disabled={!userCanEdit}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {invoices.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {t("invoiceOverview.showing")} {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} {t("invoiceOverview.of")} {filteredInvoices.length} {t("invoiceOverview.invoices")}
            {filteredInvoices.length !== invoices.length && (
              <span> ({t("invoiceOverview.filteredFrom")} {invoices.length} {t("invoiceOverview.total")})</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("invoiceOverview.page")} {currentPage} {t("invoiceOverview.of")} {totalPages}
            </span>
          </div>
        </div>
      )}

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">{t("invoiceOverview.noInvoicesYet")}</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {t("invoiceOverview.noInvoicesDescription")}
              </p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceNumber")}>
                  <div className="flex items-center gap-1">
                    {t("invoice.invoiceNumber")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">
                    {t("invoice.student")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentGrade")}>
                  <div className="flex items-center gap-1">
                    {t("invoice.yearGroup")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                  <div className="flex items-center gap-1">
                    {t("common.amount")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("dueDate")}>
                  <div className="flex items-center gap-1">
                    {t("invoice.dueDate")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    {t("common.status")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentType")}>
                  <div className="flex items-center gap-1">
                    {t("invoiceOverview.type")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentChannel")}>
                  <div className="flex items-center gap-1">
                    {t("invoiceOverview.channel")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("remindersSent")}>
                  <div className="flex items-center gap-1">
                    {t("invoiceOverview.reminders")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPageInvoices.map((invoice) => {
                const daysUntilDue = getDaysUntilDue(invoice.dueDate)
                const isUrgent = daysUntilDue <= 7 && invoice.status === "unpaid"
                
                return (
                  <TableRow key={invoice.id} className={isUrgent ? "bg-red-50" : ""}>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoiceNumber}
                      {isUrgent && <AlertTriangle className="w-4 h-4 text-red-500 inline ml-2" />}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.studentName}</div>
                        <div className="text-sm text-muted-foreground">{invoice.studentId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{invoice.studentGrade}</Badge>
                    </TableCell>
                    <TableCell>{invoice.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div>
                        <div>{format(invoice.dueDate, "MMM dd, yyyy", { locale })}</div>
                        {invoice.status === "unpaid" && (
                          <div className={`text-sm ${daysUntilDue < 0 ? "text-red-600" : daysUntilDue <= 7 ? "text-orange-600" : "text-muted-foreground"}`}>
                            {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} ${t("invoiceOverview.daysOverdue")}` : `${daysUntilDue} ${t("invoiceOverview.daysLeft")}`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.paymentType === "yearly" ? "default" : "outline"}>
                        {invoice.paymentType === "yearly" ? t("invoiceOverview.yearly") : t("invoiceOverview.termly")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.paymentChannel ? getPaymentChannelLabel(invoice.paymentChannel, t) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {invoice.remindersSent} {t("invoiceOverview.sent")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openInvoiceDetail(invoice)}
                          title={t("invoiceOverview.viewDetails")}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadInvoice(invoice.id)}
                          title={t("invoiceOverview.downloadInvoice")}
                          disabled={!userCanEdit}
                        >
                          <Download className="w-4 h-4 text-blue-600" />
                        </Button>

                        {(invoice.status === "unpaid" || invoice.status === "overdue") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => sendReminder(invoice.id)}
                            title={t("invoiceOverview.sendReminder")}
                            disabled={!userCanEdit}
                          >
                            <Send className="w-4 h-4 text-purple-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <PaginationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={sortedInvoices.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
      />

      {/* Invoice Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t("invoiceOverview.invoiceDetails")}
            </DialogTitle>
            <DialogDescription>
              {t("invoiceOverview.viewInvoiceInfo")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Number and Status */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("invoice.invoiceNumber")}</p>
                  <p className="font-mono text-lg font-medium">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedInvoice.status)}
                  <Badge variant={selectedInvoice.paymentType === "yearly" ? "default" : "outline"}>
                    {selectedInvoice.paymentType === "yearly" ? t("invoiceOverview.yearly") : t("invoiceOverview.termly")}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Student Information */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium">
                  <User className="w-4 h-4" />
                  {t("invoiceOverview.studentInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("invoiceOverview.fullName")}</p>
                    <p className="font-medium">{selectedInvoice.studentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("invoice.studentId")}</p>
                    <p className="font-mono">{selectedInvoice.studentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("invoice.yearGroup")}</p>
                    <Badge variant="secondary">{selectedInvoice.studentGrade}</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Information */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium">
                  <DollarSign className="w-4 h-4" />
                  {t("invoiceOverview.financialDetails")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("invoiceOverview.amountDue")}</p>
                    <p className="text-2xl font-bold">{selectedInvoice.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("invoiceOverview.academicTerm")}</p>
                    <p className="font-medium">{selectedInvoice.term}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Date Information */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium">
                  <CalendarEmoji className="w-4 h-4" />
                  {t("invoiceOverview.importantDates")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("invoice.issueDate")}</p>
                    <p className="font-medium">{selectedInvoice.issueDate ? format(selectedInvoice.issueDate, "MMM dd, yyyy", { locale }) : "Pending Approval"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("invoice.dueDate")}</p>
                    <div>
                      <p className="font-medium">{format(selectedInvoice.dueDate, "MMM dd, yyyy", { locale })}</p>
                      {selectedInvoice.status === "unpaid" && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {(() => {
                            const daysUntilDue = getDaysUntilDue(selectedInvoice.dueDate)
                            return (
                              <span className={`text-xs ${daysUntilDue < 0 ? "text-red-600" : daysUntilDue <= 7 ? "text-orange-600" : "text-muted-foreground"}`}>
                                {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} ${t("invoiceOverview.daysOverdue")}` : `${daysUntilDue} ${t("invoiceOverview.daysRemaining")}`}
                              </span>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Communication History */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium">
                  <MessageSquare className="w-4 h-4" />
                  {t("invoiceOverview.communicationHistory")}
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t("invoiceOverview.paymentRemindersSent")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("invoiceOverview.totalRemindersDescription")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {selectedInvoice.remindersSent}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1"
                  onClick={() => {
                    toast.success(t("invoiceOverview.downloadSuccess"))
                    closeModal()
                  }}
                  disabled={!userCanEdit}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t("invoiceOverview.downloadInvoice")}
                </Button>

                {(selectedInvoice.status === "unpaid" || selectedInvoice.status === "overdue") && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      sendReminder(selectedInvoice.id)
                      closeModal()
                    }}
                    disabled={!userCanEdit}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {t("invoiceOverview.sendReminder")}
                  </Button>
                )}

                <Button variant="ghost" onClick={closeModal}>
                  <X className="w-4 h-4 mr-2" />
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