import { useState } from "react"
import { triggerDownload } from "@/utils/downloadUtils"
import { downloadAsXlsx, formatAcademicYear } from "@/utils/xlsxUtils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { CalendarIcon, Search, Download, Filter, Eye, Receipt, CreditCard, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { toast } from "@/components/ui/sonner"
import { StatusFilter, PaymentStatus, getStatusBadge, PaymentChannelFilter, PaymentChannel, getPaymentChannelLabel } from "./StatusFilter"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { ColumnPresets } from "@/utils/tableAlignment"
import { logActivity } from "@/lib/activityLog"

interface PaymentRecord {
  id: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  amount: number
  term: "1" | "2" | "3"
  paymentMethod: string
  paymentChannel: "credit_card" | "wechat_pay" | "alipay" | "qr_payment" | "counter_bank"
  payerName: string
  status: "paid" | "partial" | "unpaid" | "cancelled" | "overdue" | "failed"
  transactionDate: Date
  parentType?: "internal" | "external"
  referenceNumber?: string
  paymentDescription?: string
  dueDate?: Date
  notes?: string
}

// Student data matching StudentContext
const studentData = [
  { id: "KC2024001", name: "James Smith", grade: "Year 4" },
  { id: "KC2024002", name: "Emily Smith", grade: "Reception" },
  { id: "KC2024003", name: "Michael Johnson", grade: "Year 7" },
  { id: "KC2024004", name: "Sophia Williams", grade: "Year 9" },
  { id: "KC2024005", name: "Oliver Williams", grade: "Year 6" },
  { id: "KC2024006", name: "Charlotte Williams", grade: "Year 3" },
  { id: "KC2024007", name: "Lucas Brown", grade: "Year 1" },
  { id: "KC2024008", name: "Mia Brown", grade: "Year 2" },
  { id: "KC2024009", name: "Ethan Davis", grade: "Year 2" },
  { id: "KC2024010", name: "Ava Miller", grade: "Year 1" },
]

// Generate mock payments data with more entries for pagination testing
const generateMockPayments = (t?: any): PaymentRecord[] => {
  // Use translation keys if available, otherwise fallback to English
  const paymentMethods = t ? [
    t("paymentMethod.creditCard"),
    "PromptPay",
    "Bank Counter",
    "WeChat Pay",
    t("paymentMethod.bankTransfer"),
    t("paymentMethod.cash")
  ] : ["Credit Card", "PromptPay", "Bank Counter", "WeChat Pay", "Bank Transfer", "Cash"]
  const paymentChannels: ("credit_card" | "wechat_pay" | "alipay" | "qr_payment" | "counter_bank")[] = ["credit_card", "wechat_pay", "alipay", "qr_payment", "counter_bank"]
  const payerNames = ["Mr. John Smith", "Mrs. Sarah Smith", "Mr. David Johnson", "Mrs. Lisa Johnson", "Mr. Robert Williams", "Mrs. Jennifer Williams", "Mr. Thomas Brown", "Mrs. Emma Brown", "Mr. Andrew Davis", "Mr. Daniel Miller"]
  const statuses: ("paid" | "partial" | "unpaid" | "cancelled" | "overdue")[] = ["paid", "paid", "paid", "partial", "unpaid", "cancelled", "overdue"]
  const termOptions: ("1" | "2" | "3")[] = ["1", "2", "3"]

  const payments: PaymentRecord[] = []

  for (let i = 1; i <= 125; i++) {
    const student = studentData[i % studentData.length]
    const term = termOptions[Math.floor(Math.random() * termOptions.length)]
    const amount = 42000 // Amount per term
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
    const paymentChannel = paymentChannels[Math.floor(Math.random() * paymentChannels.length)]
    const payerName = payerNames[i % payerNames.length]

    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 90))

    payments.push({
      id: i.toString(),
      invoiceNumber: `2025${String(i).padStart(7, '0')}`,
      studentName: student.name,
      studentId: student.id,
      studentGrade: student.grade,
      amount,
      term,
      paymentMethod,
      paymentChannel,
      payerName,
      status,
      transactionDate: date,
      parentType: "internal", // Payment History only shows internal student payments
      referenceNumber: `REF-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      paymentDescription: `Term ${term} tuition fee payment for academic year 2025-2026`,
      dueDate: new Date(date.getTime() + 15 * 24 * 60 * 60 * 1000),
      notes: status === "cancelled" ? "Payment cancelled by parent request" :
        status === "overdue" ? "Payment overdue - reminder sent" :
          status === "unpaid" ? "Payment not yet received" :
            status === "partial" ? "Partial payment received, balance pending" :
              "Payment completed successfully"
    })
  }

  return payments
}

interface PaymentHistoryProps {
  type?: "tuition" | "afterschool"
}

export function PaymentHistory({ type = "tuition" }: PaymentHistoryProps) {
  const { t, language } = useLanguage()
  const locale = language === "th" ? th : enUS
  const { academicYears = [] } = useAcademicYears()
  const [payments] = useState<PaymentRecord[]>(() => generateMockPayments(t))
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>(() => generateMockPayments(t))
  const [searchTerm, setSearchTerm] = useState("")
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [paymentChannelFilter, setPaymentChannelFilter] = useState<string>("all")
  const [amountMin, setAmountMin] = useState<string>("")
  const [amountMax, setAmountMax] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("transactionDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedPayments = (payments: PaymentRecord[]) => {
    if (!sortColumn) return payments

    return [...payments].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case "invoiceNumber":
          aVal = a.invoiceNumber
          bVal = b.invoiceNumber
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
        case "term":
          aVal = a.term
          bVal = b.term
          break
        case "paymentMethod":
          aVal = a.paymentMethod
          bVal = b.paymentMethod
          break
        case "paymentChannel":
          aVal = a.paymentChannel
          bVal = b.paymentChannel
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "transactionDate":
          aVal = a.transactionDate?.getTime() || 0
          bVal = b.transactionDate?.getTime() || 0
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }

  // Get available terms based on selected academic year
  const availableTerms = academicYearFilter !== "all"
    ? (academicYears.find(y => y.id === academicYearFilter)?.terms || [])
    : [...new Map(academicYears.flatMap(y => y.terms).map(t => [t.id, t])).values()]

  const applyFilters = () => {
    let filtered = payments

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.payerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payment.referenceNumber && payment.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(payment => payment.status === statusFilter)
    }

    if (termFilter !== "all") {
      filtered = filtered.filter(payment => payment.term === termFilter)
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter(payment => payment.studentGrade === gradeFilter)
    }

    if (paymentChannelFilter !== "all") {
      filtered = filtered.filter(payment => payment.paymentChannel === paymentChannelFilter)
    }

    if (amountMin) {
      const minAmount = parseFloat(amountMin)
      if (!isNaN(minAmount)) {
        filtered = filtered.filter(payment => payment.amount >= minAmount)
      }
    }

    if (amountMax) {
      const maxAmount = parseFloat(amountMax)
      if (!isNaN(maxAmount)) {
        filtered = filtered.filter(payment => payment.amount <= maxAmount)
      }
    }

    if (dateFrom) {
      filtered = filtered.filter(payment => payment.transactionDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(payment => payment.transactionDate <= dateTo)
    }

    setFilteredPayments(filtered)
    setCurrentPage(1) // Reset to first page when filters are applied
  }

  const clearFilters = () => {
    setSearchTerm("")
    setAcademicYearFilter("all")
    setTermFilter("all")
    setStatusFilter("all")
    setGradeFilter("all")
    setPaymentChannelFilter("all")
    setAmountMin("")
    setAmountMax("")
    setDateFrom(null)
    setDateTo(null)
    setFilteredPayments(payments)
    setCurrentPage(1)
  }

  const exportData = () => {
    // Create data headers
    const headers = [
      'Invoice Number',
      'Student Name',
      'Student ID',
      'Year Group',
      'Amount (THB)',
      'Term',
      t("paymentMethod.label"),
      'Payment Channel',
      'Payer Name',
      'Status',
      'Transaction Date',
      'Reference Number',
      'Due Date',
      'Notes'
    ]

    // Build data rows
    const dataRows = filteredPayments.map(payment => [
      payment.invoiceNumber,
      payment.studentName,
      payment.studentId,
      payment.studentGrade,
      payment.amount,
      `Term ${payment.term}`,
      payment.paymentMethod,
      payment.paymentChannel,
      payment.payerName,
      payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
      format(payment.transactionDate, 'dd/MM/yyyy HH:mm:ss'),
      payment.referenceNumber || '',
      payment.dueDate ? format(payment.dueDate, 'dd/MM/yyyy') : '',
      payment.notes || ''
    ])

    // Generate filename with current date and filter info
    const currentDate = format(new Date(), 'yyyy-MM-dd')
    const termText = termFilter === 'all' ? 'all' : `term${termFilter}`
    const statusText = statusFilter === 'all' ? 'all' : statusFilter
    const gradeText = gradeFilter === 'all' ? 'all-grades' : gradeFilter.replace(/\s+/g, '-').toLowerCase()

    const filename = `payment-history-${type}-${termText}-${statusText}-${gradeText}-${currentDate}`
    downloadAsXlsx(headers, dataRows, filename)

    // Show success toast
    toast.success(`Successfully exported ${filteredPayments.length} payment records`, {
      description: `File: ${filename}.xlsx`,
      duration: 4000,
    })
    logActivity({ action: "Export Excel", module: "Payment History", detail: `Exported ${filteredPayments.length} payment records, File: ${filename}.xlsx` })
  }


  // Get unique grades for filter dropdown
  const uniqueGrades = Array.from(new Set(payments.map(payment => payment.studentGrade))).sort()

  // Pagination calculations
  const sortedPayments = getSortedPayments(filteredPayments)
  const totalPages = Math.ceil(sortedPayments.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPagePayments = sortedPayments.slice(startIndex, endIndex)

  const downloadReceipt = (payment: PaymentRecord) => {
    // In a real app, this would generate and download a PDF receipt
    console.log("Downloading receipt for payment:", payment.invoiceNumber)
    // Create a mock download
    const content = `Receipt for ${payment.invoiceNumber}\nStudent: ${payment.studentName}\nYear Group: ${payment.studentGrade}\nAmount: ₿${payment.amount.toLocaleString()}\nPayer: ${payment.payerName}\nPayment Channel: ${payment.paymentChannel}\nDate: ${format(payment.transactionDate, "dd MMM yyyy", { locale })}`
    triggerDownload(content, `receipt-${payment.invoiceNumber}.txt`, 'text/plain')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            {type === "tuition" ? t("payment.tuitionHistory") : t("payment.afterSchoolHistory")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("payment.viewRecordsDesc")}
          </p>
        </div>
        <Button onClick={exportData} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          {t("payment.exportData")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {t("common.searchAndFilter")}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="h-9">{t("common.apply")}</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
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
                placeholder={t("payment.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Academic Year */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.academicYear")}</label>
              <Select value={academicYearFilter} onValueChange={(value) => {
                setAcademicYearFilter(value)
                setTermFilter("all") // Reset term when year changes
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("common.allYears")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allYears")}</SelectItem>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>{formatAcademicYear(year.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Term */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("payment.term")}</label>
              <Select value={termFilter} onValueChange={setTermFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("payment.allTerms")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("payment.allTerms")}</SelectItem>
                  {availableTerms.map(term => (
                    <SelectItem key={term.name} value={term.id}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Year Group */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("student.yearGroup")}</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("payment.allYearGroups")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("payment.allYearGroups")}</SelectItem>
                  {uniqueGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PaymentStatus)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("common.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="paid" className="text-green-800">
                    <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      {t("common.paid")}
                    </span>
                  </SelectItem>
                  <SelectItem value="partial" className="text-yellow-800">
                    <span className="inline-flex items-center rounded-md bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                      {t("payment.partial")}
                    </span>
                  </SelectItem>
                  <SelectItem value="unpaid" className="text-gray-800">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                      {t("common.unpaid")}
                    </span>
                  </SelectItem>
                  <SelectItem value="overdue" className="text-orange-800">
                    <span className="inline-flex items-center rounded-md bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                      {t("common.overdue")}
                    </span>
                  </SelectItem>
                  <SelectItem value="cancelled" className="text-red-800">
                    <span className="inline-flex items-center rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                      {t("common.cancelled")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Channel */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("payment.paymentChannel")}</label>
              <Select value={paymentChannelFilter} onValueChange={setPaymentChannelFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("payment.allChannels")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("payment.allChannels")}</SelectItem>
                  <SelectItem value="credit_card">{t("paymentChannel.creditCard")}</SelectItem>
                  <SelectItem value="wechat_pay">{t("paymentChannel.wechatPay")}</SelectItem>
                  <SelectItem value="alipay">{t("paymentChannel.alipay")}</SelectItem>
                  <SelectItem value="qr_payment">{t("paymentChannel.qrPayment")}</SelectItem>
                  <SelectItem value="counter_bank">{t("paymentChannel.counterBank")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Amount Min */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("payment.amountMin")}</label>
              <Input
                type="number"
                placeholder="0"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                className="h-9"
                min="0"
              />
            </div>

            {/* Amount Max */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("payment.amountMax")}</label>
              <Input
                type="number"
                placeholder="999999"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                className="h-9"
                min="0"
              />
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("payment.dateRange")}</label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yy", { locale }) : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom || undefined}
                      onSelect={(date) => setDateFrom(date ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yy", { locale }) : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {t("payment.showingRecords", { from: startIndex + 1, to: Math.min(endIndex, filteredPayments.length), total: filteredPayments.length })}
          {filteredPayments.length < payments.length && ` (${t("payment.filteredFrom", { total: payments.length })})`}
        </p>
        <div className="text-sm text-muted-foreground">
          {t("payment.totalAmount")}: ₿{filteredPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}
        </div>
      </div>

      {/* Payment Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Invoice Number - text/left */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceNumber")}>
                  <div className="flex items-center gap-1">
                    {t("payment.invoiceNumber")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Student - text/left */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">
                    {t("payment.student")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Year Group - badge/center */}
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentGrade")}>
                  <div className="flex items-center gap-1 justify-center">
                    {t("student.yearGroup")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Amount - currency/right */}
                <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                  <div className="flex items-center gap-1 justify-end">
                    {t("common.amount")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Term - text/left */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("term")}>
                  <div className="flex items-center gap-1">
                    {t("payment.term")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Payment Method - text/left */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentMethod")}>
                  <div className="flex items-center gap-1">
                    {t("paymentMethod.label")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Payment Channel - text/left */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentChannel")}>
                  <div className="flex items-center gap-1">
                    {t("payment.channel")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Parent Type - badge/center */}
                {type === "afterschool" && <TableHead align="center">{t("receipt.parentType")}</TableHead>}
                {/* Status - badge/center */}
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1 justify-center">
                    {t("common.status")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Transaction Date - date/left */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                  <div className="flex items-center gap-1">
                    {t("common.date")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Actions - actions/center */}
                <TableHead align="center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPagePayments.map((payment) => (
                <TableRow key={payment.id}>
                  {/* Invoice Number - text/left */}
                  <TableCell align="left" className="font-mono text-sm">
                    {payment.invoiceNumber}
                  </TableCell>
                  {/* Student - text/left */}
                  <TableCell align="left">
                    <div>
                      <div className="font-medium">{payment.studentName}</div>
                      <div className="text-sm text-muted-foreground">{payment.studentId}</div>
                    </div>
                  </TableCell>
                  {/* Year Group - badge/center */}
                  <TableCell align="center">
                    <Badge variant="secondary">{payment.studentGrade}</Badge>
                  </TableCell>
                  {/* Amount - currency/right */}
                  <TableCell align="right">฿{payment.amount.toLocaleString()}</TableCell>
                  {/* Term - text/left */}
                  <TableCell align="left">
                    <Badge variant="outline">Term {payment.term}</Badge>
                  </TableCell>
                  {/* Payment Method - text/left */}
                  <TableCell align="left">{payment.paymentMethod}</TableCell>
                  {/* Payment Channel - text/left */}
                  <TableCell align="left">{getPaymentChannelLabel(payment.paymentChannel, t)}</TableCell>
                  {/* Parent Type - badge/center */}
                  {type === "afterschool" && (
                    <TableCell align="center">
                      <Badge variant={payment.parentType === "external" ? "secondary" : "outline"}>
                        {payment.parentType === "external" ? t("common.external") : t("common.internal")}
                      </Badge>
                    </TableCell>
                  )}
                  {/* Status - badge/center */}
                  <TableCell align="center">{getStatusBadge(payment.status, t)}</TableCell>
                  {/* Transaction Date - date/left */}
                  <TableCell align="left">{format(payment.transactionDate, "dd MMM yyyy", { locale })}</TableCell>
                  {/* Actions - actions/center */}
                  <TableCell align="center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl p-6">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Receipt className="w-5 h-5" />
                            {t("payment.paymentDetails")}
                          </DialogTitle>
                          <DialogDescription>
                            {t("payment.completeInfoFor", { invoice: payment.invoiceNumber })}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                          {/* Payment Summary */}
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">₿{payment.amount.toLocaleString()}</h3>
                              <p className="text-sm text-muted-foreground">{payment.paymentDescription}</p>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(payment.status, t)}
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(payment.transactionDate, "dd MMM yyyy 'at' HH:mm", { locale })}
                              </p>
                            </div>
                          </div>

                          <Separator />

                          {/* Student Information */}
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-medium mb-3">{t("payment.studentInformation")}</h4>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-sm text-muted-foreground">{t("payment.studentName")}</p>
                                  <p className="font-medium">{payment.studentName}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">{t("payment.studentId")}</p>
                                  <p className="font-mono text-sm">{payment.studentId}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">{t("student.yearGroup")}</p>
                                  <Badge variant="secondary">{payment.studentGrade}</Badge>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium mb-3">{t("payment.paymentInformation")}</h4>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-sm text-muted-foreground">{t("payment.term")}</p>
                                  <Badge variant="outline">{t("payment.termNum", { num: payment.term })}</Badge>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">{t("payment.paymentMethod")}</p>
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    <span>{payment.paymentMethod}</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">{t("payment.paymentChannel")}</p>
                                  <p>{payment.paymentChannel}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">{t("payment.payerName")}</p>
                                  <p className="font-medium">{payment.payerName}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">{t("payment.dueDate")}</p>
                                  <p>{payment.dueDate ? format(payment.dueDate, "dd MMM yyyy", { locale }) : "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Transaction Details */}
                          <div>
                            <h4 className="font-medium mb-3">{t("payment.transactionDetails")}</h4>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">{t("payment.referenceNumber")}</p>
                                <p className="font-mono text-sm">{payment.referenceNumber || "N/A"}</p>
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          {payment.notes && (
                            <>
                              <Separator />

                            </>
                          )}

                          {/* Action Buttons */}
                          <div className="flex justify-between pt-4">
                            <Button
                              variant="outline"
                              onClick={() => downloadReceipt(payment)}
                              className="flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              {t("payment.downloadReceipt")}
                            </Button>

                            <div className="space-x-2">
                              {payment.status === "failed" && (
                                <Button
                                  onClick={() => console.log("Retry payment for", payment.invoiceNumber)}
                                >
                                  {t("payment.retryPayment")}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <PaginationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={sortedPayments.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
      />
    </div>
  )
}