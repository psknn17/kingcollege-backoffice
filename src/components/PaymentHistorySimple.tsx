import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { Download, Search, Filter, Eye, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "@/components/ui/sonner"
import { cn } from "./ui/utils"

interface PaymentRecord {
  id: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  amount: number
  term: string
  paymentMethod: string
  status: "paid" | "partial" | "unpaid" | "cancelled" | "overdue"
  transactionDate: Date
}

// Mock data
const mockPayments: PaymentRecord[] = [
  {
    id: "1",
    invoiceNumber: "INV-2025-000001",
    studentName: "James Smith",
    studentId: "KC2024001",
    studentGrade: "Year 4",
    amount: 42000,
    term: "Term 1",
    paymentMethod: "Credit Card",
    status: "paid",
    transactionDate: new Date("2025-08-15")
  },
  {
    id: "2",
    invoiceNumber: "INV-2025-000002",
    studentName: "Emily Smith",
    studentId: "KC2024002",
    studentGrade: "Reception",
    amount: 42000,
    term: "Term 1",
    paymentMethod: "Bank Transfer",
    status: "paid",
    transactionDate: new Date("2025-08-16")
  },
  {
    id: "3",
    invoiceNumber: "INV-2025-000003",
    studentName: "Michael Johnson",
    studentId: "KC2024003",
    studentGrade: "Year 7",
    amount: 42000,
    term: "Term 1",
    paymentMethod: "Cash",
    status: "partial",
    transactionDate: new Date("2025-08-17")
  }
]

export function PaymentHistorySimple() {
  const { t } = useLanguage()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [yearGroupFilter, setYearGroupFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

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
            .map((inv: any) => ({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              studentName: inv.studentName,
              studentId: inv.studentId,
              studentGrade: inv.studentGrade,
              amount: inv.netAmount || inv.finalAmount || inv.subtotal || 0,
              term: inv.term || "-",
              paymentMethod: inv.paymentMethod || "-",
              status: "paid" as const,
              transactionDate: inv.paidDate ? new Date(inv.paidDate) : new Date()
            }))

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
      payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.studentId.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter
    const matchesYearGroup = yearGroupFilter === "all" || payment.studentGrade === yearGroupFilter
    const matchesTerm = termFilter === "all" || payment.term.includes(termFilter)
    const matchesAcademicYear = academicYearFilter === "all" || true // Would need academic year field
    const matchesPaymentMethod = paymentMethodFilter === "all" || payment.paymentMethod === paymentMethodFilter

    const matchesDateFrom = !dateFrom || payment.transactionDate >= dateFrom
    const matchesDateTo = !dateTo || payment.transactionDate <= dateTo

    return matchesSearch && matchesStatus && matchesYearGroup && matchesTerm && matchesAcademicYear && matchesPaymentMethod && matchesDateFrom && matchesDateTo
  })

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
    console.log("Exporting data...")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("payment.tuitionHistory")}</h2>
          <p className="text-sm text-muted-foreground">{t("payment.viewRecordsDesc")}</p>
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
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => toast.success(t("common.filtersApplied"))}
              >
                {t("common.apply")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setYearGroupFilter("all")
                  setTermFilter("all")
                  setAcademicYearFilter("all")
                  setPaymentMethodFilter("all")
                  setDateFrom(undefined)
                  setDateTo(undefined)
                  toast.success(t("common.filtersCleared"))
                }}
              >
                {t("common.clear")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Search, Status, Year Group */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.search")}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("payment.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("common.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="paid" className="text-green-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      {t("common.paid")}
                    </div>
                  </SelectItem>
                  <SelectItem value="partial" className="text-yellow-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      Partial
                    </div>
                  </SelectItem>
                  <SelectItem value="unpaid" className="text-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                      {t("common.unpaid")}
                    </div>
                  </SelectItem>
                  <SelectItem value="overdue" className="text-orange-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      {t("common.overdue")}
                    </div>
                  </SelectItem>
                  <SelectItem value="cancelled" className="text-red-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      {t("common.cancelled")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year Group */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("student.yearGroup")}</label>
              <Select value={yearGroupFilter} onValueChange={setYearGroupFilter}>
                <SelectTrigger className="h-9">
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
          </div>

          {/* Row 2: Term, Academic Year, Payment Method */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Term */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("payment.term")}</label>
              <Select value={termFilter} onValueChange={setTermFilter}>
                <SelectTrigger className="h-9">
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

            {/* Academic Year */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Academic Year</label>
              <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2025-2026">2025-2026</SelectItem>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                  <SelectItem value="2023-2024">2023-2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("payment.paymentChannel")}</label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cashier-check">Cashier's Cheque</SelectItem>
                  <SelectItem value="qr">QR Payment</SelectItem>
                  <SelectItem value="bank-counter">Bank Counter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Date From, Date To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date From */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.from")}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : <span>Pick a date</span>}
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
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.to")}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : <span>Pick a date</span>}
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
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredPayments.length} of {payments.length} records
        </p>
        <div className="text-sm text-muted-foreground">
          {t("payment.totalAmount")}: ฿{filteredPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
        </div>
      </div>

      {/* Payment Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("payment.invoiceNumber")}</TableHead>
                <TableHead>{t("payment.student")}</TableHead>
                <TableHead>{t("student.yearGroup")}</TableHead>
                <TableHead>{t("common.amount")}</TableHead>
                <TableHead>{t("payment.term")}</TableHead>
                <TableHead>{t("payment.paymentChannel")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
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
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">{payment.invoiceNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.studentName}</div>
                        <div className="text-sm text-muted-foreground">{payment.studentId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100">
                        {payment.studentGrade}
                      </Badge>
                    </TableCell>
                    <TableCell>฿{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-100">
                        {payment.term}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>{format(payment.transactionDate, "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
