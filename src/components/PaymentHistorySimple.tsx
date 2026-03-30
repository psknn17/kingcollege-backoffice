import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Download, Search, Filter, Eye, CalendarIcon, X, ArrowUpDown, ChevronDown } from "lucide-react"
import { PaginationBar } from "./ui/pagination-bar"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "@/components/ui/sonner"
import { downloadAsXlsx } from "@/utils/xlsxUtils"
import { cn } from "./ui/utils"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ColumnPresets } from "@/utils/tableAlignment"
import { logActivity } from "@/lib/activityLog"

interface PaymentRecord {
  id: string
  invoiceNumber: string
  referenceOrder: string
  studentName: string
  studentId: string
  studentGrade: string
  email: string
  amount: number
  term: string
  paymentMethod: string
  module: string // tuition, eca, trip, exam, bus, external
  status: "paid"
  transactionDate: Date
  paymentProofs?: { name: string; dataUrl: string }[]
}

// Mock data
const mockPayments: PaymentRecord[] = [
  {
    id: "1",
    invoiceNumber: "20250000001",
    referenceOrder: "REF-KC2024001-20250815093425",
    studentName: "James Smith",
    studentId: "KC2024001",
    studentGrade: "Year 4",
    email: "james.parent@email.com",
    amount: 42000,
    term: "Term 1",
    paymentMethod: "Credit Card",
    module: "tuition",
    status: "paid",
    transactionDate: new Date("2025-08-15T09:34:25")
  },
  {
    id: "2",
    invoiceNumber: "20250000001",
    referenceOrder: "REF-KC2024002-20250816101530",
    studentName: "Emily Smith",
    studentId: "KC2024002",
    studentGrade: "Reception",
    email: "emily.parent@email.com",
    amount: 42000,
    term: "Term 1",
    paymentMethod: "Bank Transfer",
    module: "eca",
    status: "paid",
    transactionDate: new Date("2025-08-16T10:15:30")
  },
  {
    id: "3",
    invoiceNumber: "20250000001",
    referenceOrder: "REF-KC2024003-20250817143022",
    studentName: "Michael Johnson",
    studentId: "KC2024003",
    studentGrade: "Year 7",
    email: "michael.parent@email.com",
    amount: 42000,
    term: "Term 1",
    paymentMethod: "Thai QR",
    module: "tuition",
    status: "paid" as const,
    transactionDate: new Date("2025-08-17T14:30:22")
  }
]

export function PaymentHistorySimple() {
  const { t } = useLanguage()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [yearGroupFilter, setYearGroupFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [viewingPaymentProof, setViewingPaymentProof] = useState<PaymentRecord | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState<string>("transactionDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [showFilters, setShowFilters] = useState(false)


  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Normalize payment method to match PAYMENT_SOURCES
  const normalizePaymentMethod = (method: string): string => {
    if (!method || method === "-") return "-"
    const m = method.toLowerCase().trim()
    if (m.startsWith("edc")) return "EDC"
    if (m.includes("credit") && m.includes("card")) return "Credit Card"
    if (m.includes("bank") && m.includes("transfer")) return "Bank Transfer"
    if (m.includes("bank") && m.includes("counter")) return "Cashier's cheque"
    if (m.includes("wechat")) return "Thai QR"
    if (m.includes("promptpay")) return "Thai QR"
    if (m.includes("thai") && m.includes("qr")) return "Thai QR"
    if (m.includes("qr")) return "Thai QR"
    if (m.includes("cashier")) return "Cashier's cheque"
    if (m.includes("cash")) return "Cashier's cheque"
    if (m.includes("credit note")) return "Credit Note"
    // Return as-is if it already matches a valid source
    const validSources = ["Cashier's cheque", "Bank Transfer", "Thai QR", "Credit Card", "EDC"]
    const found = validSources.find(s => s.toLowerCase() === m)
    return found || method
  }

  useEffect(() => {
    const loadPayments = () => {
      try {
        // Load from invoices instead of paymentRecords
        const stored = localStorage.getItem("createdInvoices")
        if (stored) {
          const invoices = JSON.parse(stored)
          // Filter only paid invoices and transform to PaymentRecord format
          const paidInvoices = invoices
            .filter((inv: any) => inv.status === "paid")
            .map((inv: any) => {
              const paidDate = inv.paidDate ? new Date(inv.paidDate) : new Date()
              const refTimestamp = format(paidDate, "yyyyMMddHHmmss")
              return {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                referenceOrder: `REF-${inv.studentId || "NA"}-${refTimestamp}`,
                studentName: inv.studentName,
                studentId: inv.studentId,
                studentGrade: inv.studentGrade,
                email: inv.parentEmail || "-",
                amount: inv.netAmount || inv.finalAmount || inv.subtotal || 0,
                term: inv.term || "-",
                paymentMethod: normalizePaymentMethod(inv.paymentMethod || "-"),
                module: inv.category || inv.invoiceType || "tuition",
                status: "paid" as const,
                transactionDate: paidDate,
                paymentProofs: inv.paymentProofs || []
              }
            })

          if (paidInvoices.length > 0) {
            setPayments(paidInvoices)
            return
          }
        }
      } catch (error) {
        console.error("Failed to load invoices:", error)
      }
      setPayments(mockPayments)
    }

    loadPayments()
    const handleInvoicesUpdated = () => loadPayments()
    window.addEventListener("invoicesUpdated", handleInvoicesUpdated)
    return () => window.removeEventListener("invoicesUpdated", handleInvoicesUpdated)
  }, [])

  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.referenceOrder.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesYearGroup = yearGroupFilter === "all" || payment.studentGrade === yearGroupFilter
    const matchesTerm = termFilter === "all" || payment.term.includes(termFilter)
    const matchesAcademicYear = academicYearFilter === "all" || true // Would need academic year field
    const matchesPaymentMethod = paymentMethodFilter === "all" || payment.paymentMethod === paymentMethodFilter
    const matchesModule = moduleFilter === "all" || payment.module === moduleFilter

    const matchesDateFrom = !dateFrom || payment.transactionDate >= dateFrom
    const matchesDateTo = !dateTo || payment.transactionDate <= dateTo

    return matchesSearch && matchesYearGroup && matchesTerm && matchesAcademicYear && matchesPaymentMethod && matchesModule && matchesDateFrom && matchesDateTo
  })

  const sortedPayments = useMemo(() => {
    if (!sortColumn) return filteredPayments
    return [...filteredPayments].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "transactionDate":
          aVal = a.transactionDate?.getTime() || 0
          bVal = b.transactionDate?.getTime() || 0
          break
        case "referenceOrder":
          aVal = a.referenceOrder
          bVal = b.referenceOrder
          break
        case "studentName":
          aVal = a.studentName
          bVal = b.studentName
          break
        case "studentGrade":
          aVal = a.studentGrade
          bVal = b.studentGrade
          break
        case "amount":
          aVal = a.amount
          bVal = b.amount
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "paymentMethod":
          aVal = a.paymentMethod
          bVal = b.paymentMethod
          break
        case "email":
          aVal = a.email
          bVal = b.email
          break
        case "module":
          aVal = a.module
          bVal = b.module
          break
        default:
          return 0
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredPayments, sortColumn, sortDirection])

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedPayments.slice(start, start + pageSize)
  }, [sortedPayments, currentPage, pageSize])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string; border: string; label: string }> = {
      paid: {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-200",
        label: t("common.paid")
      },
      partial: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-200",
        label: "Partial"
      },
      unpaid: {
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-200",
        label: t("common.unpaid")
      },
      overdue: {
        bg: "bg-orange-100",
        text: "text-orange-800",
        border: "border-orange-200",
        label: t("common.overdue")
      },
      cancelled: {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-200",
        label: t("common.cancelled")
      }
    }

    const variant = variants[status] || variants.paid
    return (
      <Badge className={`${variant.bg} ${variant.text} ${variant.border} border hover:${variant.bg}`}>
        {variant.label}
      </Badge>
    )
  }

  const exportData = () => {
    if (filteredPayments.length === 0) {
      toast.error("No data to export")
      return
    }

    const headers = [
      "Timestamp",
      "Reference Order",
      "Student Name",
      "Student ID",
      "Year Group",
      "Amount (THB)",
      "Term",
      "Module",
      "Payment Method",
      "Email"
    ]

    const dataRows = filteredPayments.map(payment => [
      format(payment.transactionDate, "dd-MM-yyyy HH:mm:ss"),
      payment.referenceOrder || "",
      payment.studentName,
      payment.studentId,
      payment.studentGrade,
      payment.amount,
      payment.term,
      ({ tuition: "Tuition Invoice", eca: "ECA Invoice", trip: "Trip & Activity Invoice", exam: "Exam Invoice", bus: "School Bus Invoice", external: "External Invoice", student: "Tuition Invoice", afterschool: "ECA Invoice", event: "Trip & Activity Invoice", summer: "Summer Activities" } as Record<string, string>)[payment.module] || payment.module || "Tuition Invoice",
      payment.paymentMethod,
      payment.email || ""
    ])

    const currentDate = format(new Date(), "yyyy-MM-dd")
    const filename = `payment-history-${currentDate}`
    downloadAsXlsx(headers, dataRows, filename)

    toast.success(`Exported ${filteredPayments.length} records`, {
      description: `File: ${filename}.xlsx`,
      duration: 4000,
    })
    logActivity({ action: "Export Excel", module: "Payment History", detail: `Exported ${filteredPayments.length} payment records, File: ${filename}.xlsx` })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">Payment History</h2>
          <p className="text-sm text-muted-foreground">View payment records and transaction details</p>
        </div>
        <Button variant="outline" onClick={exportData} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          {t("payment.exportData")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Always visible: Search + Filters toggle */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Student ID/Email/Reference No."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showFilters && "rotate-180")} />
            </Button>
          </div>

          {/* Collapsible filter dropdowns */}
          {showFilters && (
            <>
              {/* All filters in a single 3-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Academic Year */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Academic Year</label>
                  <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                    <SelectTrigger className="h-9">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="2025/2026">2025/2026</SelectItem>
                      <SelectItem value="2024/2025">2024/2025</SelectItem>
                      <SelectItem value="2023-2024">2023-2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Term */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("payment.term")}</label>
                  <Select value={termFilter} onValueChange={setTermFilter}>
                    <SelectTrigger className="h-9">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Terms</SelectItem>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Group */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("student.yearGroup")}</label>
                  <Select value={yearGroupFilter} onValueChange={setYearGroupFilter}>
                    <SelectTrigger className="h-9">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Year Groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Year Groups</SelectItem>
                      <SelectItem value="Pre-Nursery">Pre-Nursery</SelectItem>
                      <SelectItem value="Nursery">Nursery</SelectItem>
                      <SelectItem value="Reception">Reception</SelectItem>
                      <SelectItem value="Year 1">Year 1</SelectItem>
                      <SelectItem value="Year 2">Year 2</SelectItem>
                      <SelectItem value="Year 3">Year 3</SelectItem>
                      <SelectItem value="Year 4">Year 4</SelectItem>
                      <SelectItem value="Year 5">Year 5</SelectItem>
                      <SelectItem value="Year 6">Year 6</SelectItem>
                      <SelectItem value="Year 7">Year 7</SelectItem>
                      <SelectItem value="Year 8">Year 8</SelectItem>
                      <SelectItem value="Year 9">Year 9</SelectItem>
                      <SelectItem value="Year 10">Year 10</SelectItem>
                      <SelectItem value="Year 11">Year 11</SelectItem>
                      <SelectItem value="Year 12">Year 12</SelectItem>
                      <SelectItem value="Year 13">Year 13</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Module */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Module</label>
                  <Select value={moduleFilter} onValueChange={setModuleFilter}>
                    <SelectTrigger className="h-9">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Modules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      <SelectItem value="tuition">Tuition Invoice</SelectItem>
                      <SelectItem value="eca">ECA Invoice</SelectItem>
                      <SelectItem value="trip">Trip & Activity Invoice</SelectItem>
                      <SelectItem value="exam">Exam Invoice</SelectItem>
                      <SelectItem value="bus">School Bus Invoice</SelectItem>
                      <SelectItem value="external">External Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("payment.paymentChannel")}</label>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger className="h-9">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="Cashier's cheque">Cashier's cheque</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Thai QR">Thai QR</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="EDC">EDC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("receipt.transactionDate")}</label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 h-9 justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "dd/MM/yy") : <span>{t("date.from")}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground text-sm">--</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 h-9 justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "dd/MM/yy") : <span>{t("date.to")}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Clear button */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setYearGroupFilter("all")
                    setTermFilter("all")
                    setAcademicYearFilter("all")
                    setPaymentMethodFilter("all")
                    setModuleFilter("all")
                    setDateFrom(undefined)
                    setDateTo(undefined)
                    toast.success(t("common.filtersCleared"))
                  }}
                >
                  {t("common.clear")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                  <div className="flex items-center gap-1">Timestamp <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("referenceOrder")}>
                  <div className="flex items-center gap-1">Reference Order <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">{t("payment.student")} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentGrade")}>
                  <div className="flex items-center gap-1 justify-center">{t("student.yearGroup")} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                  <div className="flex items-center gap-1 justify-end">{t("common.amount")} (THB) <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("module")}>
                  <div className="flex items-center gap-1 justify-center">Module <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentMethod")}>
                  <div className="flex items-center gap-1">Method <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("email")}>
                  <div className="flex items-center gap-1">Email <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead align="center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    {/* Date alignment */}
                    <TableCell align="left" className="text-sm">{format(payment.transactionDate, "dd-MM-yyyy HH:mm:ss")}</TableCell>
                    {/* Text/ID alignment */}
                    <TableCell align="left" className="font-mono text-sm">{payment.referenceOrder}</TableCell>
                    {/* Text alignment */}
                    <TableCell align="left">
                      <div>
                        <div className="font-medium">{payment.studentName}</div>
                        <div className="text-sm text-muted-foreground">{payment.studentId}</div>
                      </div>
                    </TableCell>
                    {/* Badge alignment */}
                    <TableCell align="center">
                      <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100">
                        {payment.studentGrade}
                      </Badge>
                    </TableCell>
                    {/* Currency alignment */}
                    <TableCell align="right">{payment.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    {/* Module badge alignment */}
                    <TableCell align="center">
                      {(() => {
                        const moduleLabels: Record<string, { label: string; bg: string; color: string }> = {
                          tuition: { label: "Tuition Invoice", bg: "#dbeafe", color: "#1e40af" },
                          eca: { label: "ECA Invoice", bg: "#f3e8ff", color: "#6b21a8" },
                          trip: { label: "Trip & Activity Invoice", bg: "#ffedd5", color: "#9a3412" },
                          exam: { label: "Exam Invoice", bg: "#cffafe", color: "#155e75" },
                          bus: { label: "School Bus Invoice", bg: "#fef3c7", color: "#92400e" },
                          external: { label: "External Invoice", bg: "#f3f4f6", color: "#1f2937" },
                          student: { label: "Tuition Invoice", bg: "#dbeafe", color: "#1e40af" },
                          afterschool: { label: "ECA Invoice", bg: "#f3e8ff", color: "#6b21a8" },
                          event: { label: "Trip & Activity Invoice", bg: "#ffedd5", color: "#9a3412" },
                          summer: { label: "Summer Activities", bg: "#dcfce7", color: "#166534" },
                        }
                        const m = moduleLabels[payment.module] || { label: payment.module || "-", bg: "#f3f4f6", color: "#1f2937" }
                        return <Badge style={{ backgroundColor: m.bg, color: m.color, border: "none" }}>{m.label}</Badge>
                      })()}
                    </TableCell>
                    {/* Text alignment */}
                    <TableCell align="left">{payment.paymentMethod}</TableCell>
                    {/* Text alignment */}
                    <TableCell align="left" className="text-sm">{payment.email}</TableCell>
                    {/* Actions alignment */}
                    <TableCell align="center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingPaymentProof(payment)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={sortedPayments.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </CardContent>
      </Card>

      {/* Payment Proof Viewer Dialog */}
      <Dialog open={!!viewingPaymentProof} onOpenChange={() => setViewingPaymentProof(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-8">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl">Payment Details - {viewingPaymentProof?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 px-2">
            {/* Payment Details Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Student</span>
                    <span className="font-medium">{viewingPaymentProof?.studentName}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Student ID</span>
                    <span className="font-medium">{viewingPaymentProof?.studentId}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Year Group</span>
                    <span className="font-medium">{viewingPaymentProof?.studentGrade}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Module</span>
                    <span className="font-medium">{({ tuition: "Tuition Invoice", eca: "ECA Invoice", trip: "Trip & Activity Invoice", exam: "Exam Invoice", bus: "School Bus Invoice", external: "External Invoice", student: "Tuition Invoice", afterschool: "ECA Invoice", event: "Trip & Activity Invoice", summer: "Summer Activities" } as Record<string, string>)[viewingPaymentProof?.module || ""] || viewingPaymentProof?.module || "-"}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Amount</span>
                    <span className="font-medium text-lg text-green-600">฿{viewingPaymentProof?.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Payment Method</span>
                    <span className="font-medium">{viewingPaymentProof?.paymentMethod}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Transaction Date</span>
                    <span className="font-medium">{viewingPaymentProof?.transactionDate && format(viewingPaymentProof.transactionDate, "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Reference Order</span>
                    <span className="font-medium font-mono text-sm">{viewingPaymentProof?.referenceOrder}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Term</span>
                    <span className="font-medium">{viewingPaymentProof?.term}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Email</span>
                    <span className="font-medium">{viewingPaymentProof?.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Proof Images */}
            <div>
              <h4 className="font-semibold mb-4 text-base">Payment Proof Images</h4>
              {viewingPaymentProof?.paymentProofs && viewingPaymentProof.paymentProofs.length > 0 ? (
                <div className="space-y-6">
                  {viewingPaymentProof.paymentProofs.map((proof, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-medium text-sm">{proof.name}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a
                              href={proof.dataUrl}
                              download={proof.name}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        </div>
                        <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                          <img
                            src={proof.dataUrl}
                            alt={`Payment proof ${index + 1}`}
                            className="max-w-xl w-full h-auto rounded border shadow-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No payment proof images available</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
