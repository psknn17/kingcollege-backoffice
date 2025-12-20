import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { CalendarIcon, Search, Download, Filter, Eye, Send, AlertTriangle, ChevronLeft, ChevronRight, X, User, FileText, Calendar as CalendarEmoji, DollarSign, Clock, MessageSquare, RefreshCw, ArrowUpDown } from "lucide-react"
import { StatusFilter, PaymentStatus, getStatusBadge, PaymentChannelFilter, PaymentChannel, getPaymentChannelLabel } from "./StatusFilter"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { format } from "date-fns"
import { toast } from "sonner"
import { useStudents } from "@/contexts/StudentContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"

interface Invoice {
  id: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  amount: number
  dueDate: Date
  issueDate: Date
  status: "paid" | "partial" | "unpaid" | "cancelled" | "overdue" | "sent" | "pending"
  term: string
  paymentType: "yearly" | "termly"
  paymentChannel?: "credit_card" | "wechat_pay" | "alipay" | "qr_payment" | "counter_bank"
  remindersSent: number
}

// localStorage key for created invoices (same as InvoiceCreation)
const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"

// Load created invoices from localStorage
const loadCreatedInvoicesFromStorage = (): Invoice[] => {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) {
      const savedInvoices = JSON.parse(stored)
      return savedInvoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        studentName: inv.studentName,
        studentId: inv.studentId,
        studentGrade: inv.studentGrade,
        amount: inv.netAmount || inv.subtotal,
        dueDate: new Date(inv.dueDate),
        issueDate: new Date(inv.issueDate),
        status: inv.status === "sent" ? "unpaid" : inv.status,
        term: inv.term,
        paymentType: inv.paymentType || "termly",
        paymentChannel: inv.paymentChannel,
        remindersSent: inv.remindersSent || 0
      }))
    }
  } catch (error) {
    console.error("Failed to load created invoices:", error)
  }
  return []
}

export function InvoiceOverview() {
  const { students } = useStudents()
  const { academicYears = [] } = useAcademicYears()

  // Load invoices from localStorage immediately (not waiting for useEffect)
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadCreatedInvoicesFromStorage())
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Reload invoices when refreshTrigger changes or on mount
  useEffect(() => {
    const storedInvoices = loadCreatedInvoicesFromStorage()
    setInvoices(storedInvoices)
  }, [refreshTrigger])

  // Listen for storage changes and custom events
  useEffect(() => {
    const loadInvoices = () => {
      const storedInvoices = loadCreatedInvoicesFromStorage()
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
  const itemsPerPage = 50

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Grade options for filter
  const gradeOptions = ["Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]

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
      toast.success(`Reminder sent to ${invoice.studentName}'s parent`)
    }
  }

  const downloadInvoice = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      // Generate CSV content for the invoice
      const csvContent = [
        "Field,Value",
        `Invoice Number,${invoice.invoiceNumber}`,
        `Student Name,${invoice.studentName}`,
        `Student ID,${invoice.studentId}`,
        `Grade,${invoice.studentGrade}`,
        `Amount,${invoice.amount}`,
        `Due Date,${format(invoice.dueDate, "yyyy-MM-dd")}`,
        `Issue Date,${format(invoice.issueDate, "yyyy-MM-dd")}`,
        `Status,${invoice.status}`,
        `Term,${invoice.term}`,
        `Payment Type,${invoice.paymentType}`,
        `Reminders Sent,${invoice.remindersSent}`,
      ].join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.invoiceNumber}_invoice.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success(`Invoice ${invoice.invoiceNumber} downloaded`)
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
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case "unpaid":
        return <Badge className="bg-blue-100 text-blue-800">Unpaid</Badge>
      case "sent":
        return <Badge className="bg-purple-100 text-purple-800">Sent</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>
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
          aValue = a.dueDate.getTime()
          bValue = b.dueDate.getTime()
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
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageInvoices = sortedInvoices.slice(startIndex, endIndex)

  const summaryStats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === "paid").length,
    unpaid: invoices.filter(i => i.status === "unpaid").length,
    overdue: invoices.filter(i => i.status === "overdue").length,
    totalAmount: invoices.reduce((sum, i) => sum + i.amount, 0),
    unpaidAmount: invoices.filter(i => i.status === "unpaid" || i.status === "overdue").reduce((sum, i) => sum + i.amount, 0)
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // Manual refresh function
  const refreshInvoices = () => {
    const storedInvoices = loadCreatedInvoicesFromStorage()
    setInvoices(storedInvoices)
    toast.success("Invoice list refreshed")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Invoice Overview</h2>
          <p className="text-sm text-muted-foreground">
            Manage all invoices and track payment status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshInvoices} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Total value: ₿{summaryStats.totalAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.paid}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((summaryStats.paid / summaryStats.total) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.unpaid}</div>
            <p className="text-xs text-muted-foreground">
              ₿{invoices.filter(i => i.status === "unpaid").reduce((sum, i) => sum + i.amount, 0).toLocaleString()} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              ₿{invoices.filter(i => i.status === "overdue").reduce((sum, i) => sum + i.amount, 0).toLocaleString()} overdue
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
              Search & Filter
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="h-9">Apply</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9">Clear</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Search</label>
              <Input
                placeholder="Invoice, student, parent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Academic Year */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Academic Year</label>
              <Select value={academicYearFilter} onValueChange={(value) => {
                setAcademicYearFilter(value)
                setTermFilter("all") // Reset term when year changes
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Term */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Term</label>
              <Select value={termFilter} onValueChange={setTermFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  {availableTerms.map(term => (
                    <SelectItem key={term.id} value={term.name}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Grade */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Grade</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {gradeOptions.map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PaymentStatus)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
                  </SelectItem>
                  <SelectItem value="unpaid">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Unpaid</Badge>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Cancelled</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Date Range</label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDateFrom ? format(dueDateFrom, "dd/MM/yy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDateFrom || undefined}
                      onSelect={setDueDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDateTo ? format(dueDateTo, "dd/MM/yy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDateTo || undefined}
                      onSelect={setDueDateTo}
                      initialFocus
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
            Showing {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length} invoices
            {filteredInvoices.length !== invoices.length && (
              <span> (filtered from {invoices.length} total)</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
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
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No invoices yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Invoices created from the "Create Invoice" page will appear here. Go to Invoice Management → Create Invoice to create new invoices.
              </p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceNumber")}>
                  <div className="flex items-center gap-1">
                    Invoice Number
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">
                    Student
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentGrade")}>
                  <div className="flex items-center gap-1">
                    Grade
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                  <div className="flex items-center gap-1">
                    Amount
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("dueDate")}>
                  <div className="flex items-center gap-1">
                    Due Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentType")}>
                  <div className="flex items-center gap-1">
                    Type
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentChannel")}>
                  <div className="flex items-center gap-1">
                    Channel
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("remindersSent")}>
                  <div className="flex items-center gap-1">
                    Reminders
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
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
                    <TableCell>₿{invoice.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div>
                        <div>{format(invoice.dueDate, "MMM dd, yyyy")}</div>
                        {invoice.status === "unpaid" && (
                          <div className={`text-sm ${daysUntilDue < 0 ? "text-red-600" : daysUntilDue <= 7 ? "text-orange-600" : "text-muted-foreground"}`}>
                            {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.paymentType === "yearly" ? "default" : "outline"}>
                        {invoice.paymentType === "yearly" ? "Yearly" : "Termly"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.paymentChannel ? getPaymentChannelLabel(invoice.paymentChannel) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {invoice.remindersSent} sent
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openInvoiceDetail(invoice)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => downloadInvoice(invoice.id)}
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4 text-blue-600" />
                        </Button>

                        {(invoice.status === "unpaid" || invoice.status === "overdue") && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => sendReminder(invoice.id)}
                            title="Send Reminder"
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => goToPage(currentPage - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {/* First page */}
              {currentPage > 2 && (
                <>
                  <PaginationItem>
                    <PaginationLink onClick={() => goToPage(1)} className="cursor-pointer">
                      1
                    </PaginationLink>
                  </PaginationItem>
                  {currentPage > 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                </>
              )}
              
              {/* Previous page */}
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink onClick={() => goToPage(currentPage - 1)} className="cursor-pointer">
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Current page */}
              <PaginationItem>
                <PaginationLink isActive>
                  {currentPage}
                </PaginationLink>
              </PaginationItem>
              
              {/* Next page */}
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLink onClick={() => goToPage(currentPage + 1)} className="cursor-pointer">
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Last page */}
              {currentPage < totalPages - 1 && (
                <>
                  {currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink onClick={() => goToPage(totalPages)} className="cursor-pointer">
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => goToPage(currentPage + 1)}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Go to page:</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value)
                if (page >= 1 && page <= totalPages) {
                  goToPage(page)
                }
              }}
              className="w-16 h-8"
            />
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Details
            </DialogTitle>
            <DialogDescription>
              View complete invoice information, payment status, and send reminders
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Number and Status */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-mono text-lg font-medium">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedInvoice.status)}
                  <Badge variant={selectedInvoice.paymentType === "yearly" ? "default" : "outline"}>
                    {selectedInvoice.paymentType === "yearly" ? "Yearly" : "Termly"}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Student Information */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium">
                  <User className="w-4 h-4" />
                  Student Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selectedInvoice.studentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Student ID</p>
                    <p className="font-mono">{selectedInvoice.studentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Grade Level</p>
                    <Badge variant="secondary">{selectedInvoice.studentGrade}</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Information */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium">
                  <DollarSign className="w-4 h-4" />
                  Financial Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Amount Due</p>
                    <p className="text-2xl font-bold">₿{selectedInvoice.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Academic Term</p>
                    <p className="font-medium">{selectedInvoice.term}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Date Information */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium">
                  <CalendarEmoji className="w-4 h-4" />
                  Important Dates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-medium">{format(selectedInvoice.issueDate, "MMM dd, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <div>
                      <p className="font-medium">{format(selectedInvoice.dueDate, "MMM dd, yyyy")}</p>
                      {selectedInvoice.status === "unpaid" && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {(() => {
                            const daysUntilDue = getDaysUntilDue(selectedInvoice.dueDate)
                            return (
                              <span className={`text-xs ${daysUntilDue < 0 ? "text-red-600" : daysUntilDue <= 7 ? "text-orange-600" : "text-muted-foreground"}`}>
                                {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days remaining`}
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
                  Communication History
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Payment Reminders Sent</p>
                      <p className="text-sm text-muted-foreground">
                        Total reminders sent to parent/guardian
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
                    toast.success("Invoice downloaded successfully")
                    closeModal()
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
                
                {(selectedInvoice.status === "unpaid" || selectedInvoice.status === "overdue") && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      sendReminder(selectedInvoice.id)
                      closeModal()
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                )}
                
                <Button variant="ghost" onClick={closeModal}>
                  <X className="w-4 h-4 mr-2" />
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