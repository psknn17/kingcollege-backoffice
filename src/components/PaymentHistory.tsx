import { useState } from "react"
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
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
import { CalendarIcon, Search, Download, Filter, Eye, Receipt, CreditCard, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner@2.0.3"
import { StatusFilter, PaymentStatus, getStatusBadge, PaymentChannelFilter, PaymentChannel, getPaymentChannelLabel } from "./StatusFilter"
import { useAcademicYears } from "@/contexts/AcademicYearContext"

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
  status: "paid" | "partial" | "unpaid" | "cancelled" | "overdue"
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
const generateMockPayments = (): PaymentRecord[] => {
  const paymentMethods = ["Credit Card", "PromptPay", "Bank Counter", "WeChat Pay", "Bank Transfer", "Cash"]
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
      invoiceNumber: `INV-2025-${String(i).padStart(6, '0')}`,
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
      parentType: Math.random() > 0.7 ? "external" : "internal",
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

const mockPayments: PaymentRecord[] = generateMockPayments()

interface PaymentHistoryProps {
  type?: "tuition" | "afterschool"
}

export function PaymentHistory({ type = "tuition" }: PaymentHistoryProps) {
  const { academicYears = [] } = useAcademicYears()
  const [payments] = useState<PaymentRecord[]>(mockPayments)
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>(mockPayments)
  const [searchTerm, setSearchTerm] = useState("")
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  // Sorting states
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
        case "paymentChannel":
          aVal = a.paymentChannel
          bVal = b.paymentChannel
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "transactionDate":
          aVal = a.transactionDate.getTime()
          bVal = b.transactionDate.getTime()
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
    : [...new Map(academicYears.flatMap(y => y.terms).map(t => [t.name, t])).values()]

  const applyFilters = () => {
    let filtered = payments

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.studentId.toLowerCase().includes(searchTerm.toLowerCase())
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
    setDateFrom(null)
    setDateTo(null)
    setFilteredPayments(payments)
    setCurrentPage(1)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  const exportData = () => {
    // Helper function to escape CSV values
    const escapeCsvValue = (value: any): string => {
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      // If value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }
    
    // Create metadata section
    const currentDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
    const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)
    
    const metadata = [
      'SISB Schooney Payment History Export',
      `Export Date: ${currentDate}`,
      `Report Type: ${type === 'tuition' ? 'Tuition Management' : 'After School Management'}`,
      `Total Records: ${filteredPayments.length}`,
      `Total Amount: ฿${totalAmount.toLocaleString()}`,
      '',
      'Applied Filters:',
      `- Status: ${statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`,
      `- Term: ${termFilter === 'all' ? 'All Terms' : terms.find(t => t.id === termFilter)?.name || termFilter}`,
      `- Grade Level: ${gradeFilter === 'all' ? 'All Grades' : gradeFilter}`,
      `- Parent Type: ${parentTypeFilter === 'all' ? 'All Parent Types' : parentTypeFilter.charAt(0).toUpperCase() + parentTypeFilter.slice(1)}`,
      `- Date Range: ${dateFrom ? format(dateFrom, 'yyyy-MM-dd') : 'No start date'} to ${dateTo ? format(dateTo, 'yyyy-MM-dd') : 'No end date'}`,
      `- Search Term: ${searchTerm || 'No search applied'}`,
      '',
      '--- Payment Data ---',
      ''
    ]
    
    // Create CSV headers
    const headers = [
      'Invoice Number',
      'Student Name',
      'Student ID',
      'Grade Level',
      'Amount (THB)',
      'Term',
      'Payment Method',
      'Payment Channel',
      'Payer Name',
      'Status',
      'Transaction Date',
      'Reference Number',
      'Due Date',
      'Notes'
    ]

    // Create CSV rows
    const csvRows = [
      ...metadata.map(line => escapeCsvValue(line)),
      headers.join(','), // Header row
      ...filteredPayments.map(payment => [
        escapeCsvValue(payment.invoiceNumber),
        escapeCsvValue(payment.studentName),
        escapeCsvValue(payment.studentId),
        escapeCsvValue(payment.studentGrade),
        escapeCsvValue(payment.amount),
        escapeCsvValue(`Term ${payment.term}`),
        escapeCsvValue(payment.paymentMethod),
        escapeCsvValue(payment.paymentChannel),
        escapeCsvValue(payment.payerName),
        escapeCsvValue(payment.status.charAt(0).toUpperCase() + payment.status.slice(1)),
        escapeCsvValue(format(payment.transactionDate, 'yyyy-MM-dd HH:mm:ss')),
        escapeCsvValue(payment.referenceNumber || ''),
        escapeCsvValue(payment.dueDate ? format(payment.dueDate, 'yyyy-MM-dd') : ''),
        escapeCsvValue(payment.notes || '')
      ].join(','))
    ]
    
    // Create CSV content
    const csvContent = csvRows.join('\n')
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      
      // Generate filename with current date and filter info
      const currentDate = format(new Date(), 'yyyy-MM-dd')
      const termText = termFilter === 'all' ? 'all' : `term${termFilter}`
      const statusText = statusFilter === 'all' ? 'all' : statusFilter
      const gradeText = gradeFilter === 'all' ? 'all-grades' : gradeFilter.replace(/\s+/g, '-').toLowerCase()

      const filename = `payment-history-${type}-${termText}-${statusText}-${gradeText}-${currentDate}.csv`
      link.setAttribute('download', filename)
      
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Show success toast
      toast.success(`Successfully exported ${filteredPayments.length} payment records`, {
        description: `File: ${filename}`,
        duration: 4000,
      })
    } else {
      toast.error("Export failed", {
        description: "Your browser does not support file downloads",
        duration: 4000,
      })
    }
  }


  // Get unique grades for filter dropdown
  const uniqueGrades = Array.from(new Set(payments.map(payment => payment.studentGrade))).sort()

  // Pagination calculations
  const sortedPayments = getSortedPayments(filteredPayments)
  const totalPages = Math.ceil(sortedPayments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPagePayments = sortedPayments.slice(startIndex, endIndex)

  const downloadReceipt = (payment: PaymentRecord) => {
    // In a real app, this would generate and download a PDF receipt
    console.log("Downloading receipt for payment:", payment.invoiceNumber)
    // Create a mock download
    const element = document.createElement('a')
    const content = `Receipt for ${payment.invoiceNumber}\nStudent: ${payment.studentName}\nGrade: ${payment.studentGrade}\nAmount: ₿${payment.amount.toLocaleString()}\nPayer: ${payment.payerName}\nPayment Channel: ${payment.paymentChannel}\nDate: ${format(payment.transactionDate, "MMM dd, yyyy")}`
    const file = new Blob([content], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `receipt-${payment.invoiceNumber}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">
            {type === "tuition" ? "Tuition" : "After School"} Payment History
          </h2>
          <p className="text-sm text-muted-foreground">
            View payment records and transaction details
          </p>
        </div>
        <Button onClick={exportData} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Data
        </Button>
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
                    <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
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
                  {uniqueGrades.map((grade) => (
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
                  <SelectItem value="partial">
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partial</Badge>
                  </SelectItem>
                  <SelectItem value="unpaid">
                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Unpaid</Badge>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Overdue</Badge>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>
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
                      {dateFrom ? format(dateFrom, "dd/MM/yy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom || undefined}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payment records
            {filteredPayments.length < payments.length && ` (filtered from ${payments.length} total)`}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Show:</label>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Total Amount: ₿{filteredPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}
        </div>
      </div>

      {/* Payment Table */}
      <Card>
        <CardContent className="p-0">
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
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("term")}>
                  <div className="flex items-center gap-1">
                    Term
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentChannel")}>
                  <div className="flex items-center gap-1">
                    Channel
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {type === "afterschool" && <TableHead>Parent Type</TableHead>}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPagePayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-sm">
                    {payment.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.studentName}</div>
                      <div className="text-sm text-muted-foreground">{payment.studentId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{payment.studentGrade}</Badge>
                  </TableCell>
                  <TableCell>฿{payment.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Term {payment.term}</Badge>
                  </TableCell>
                  <TableCell>{getPaymentChannelLabel(payment.paymentChannel)}</TableCell>
                  {type === "afterschool" && (
                    <TableCell>
                      <Badge variant={payment.parentType === "external" ? "secondary" : "outline"}>
                        {payment.parentType === "external" ? "External" : "Internal"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>{format(payment.transactionDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell>
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
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Receipt className="w-5 h-5" />
                            Payment Details
                          </DialogTitle>
                          <DialogDescription>
                            Complete payment information for invoice {payment.invoiceNumber}
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
                              {getStatusBadge(payment.status)}
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(payment.transactionDate, "MMM dd, yyyy 'at' HH:mm")}
                              </p>
                            </div>
                          </div>

                          <Separator />

                          {/* Student Information */}
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-medium mb-3">Student Information</h4>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-sm text-muted-foreground">Student Name</p>
                                  <p className="font-medium">{payment.studentName}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Student ID</p>
                                  <p className="font-mono text-sm">{payment.studentId}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Grade Level</p>
                                  <Badge variant="secondary">{payment.studentGrade}</Badge>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium mb-3">Payment Information</h4>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-sm text-muted-foreground">Term</p>
                                  <Badge variant="outline">Term {payment.term}</Badge>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Payment Method</p>
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    <span>{payment.paymentMethod}</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Payment Channel</p>
                                  <p>{payment.paymentChannel}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Payer Name</p>
                                  <p className="font-medium">{payment.payerName}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Due Date</p>
                                  <p>{payment.dueDate ? format(payment.dueDate, "MMM dd, yyyy") : "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Transaction Details */}
                          <div>
                            <h4 className="font-medium mb-3">Transaction Details</h4>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Reference Number</p>
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
                              Download Receipt
                            </Button>
                            
                            <div className="space-x-2">
                              {payment.status === "failed" && (
                                <Button 
                                  onClick={() => console.log("Retry payment for", payment.invoiceNumber)}
                                >
                                  Retry Payment
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
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {/* Show first few pages */}
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map(page => (
              <PaginationItem key={page}>
                <PaginationLink 
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            {/* Show ellipsis if there are many pages */}
            {totalPages > 6 && currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            
            {/* Show current page area if it's in the middle */}
            {currentPage > 3 && currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationLink 
                  onClick={() => setCurrentPage(currentPage)}
                  isActive={true}
                  className="cursor-pointer"
                >
                  {currentPage}
                </PaginationLink>
              </PaginationItem>
            )}
            
            {/* Show last few pages */}
            {totalPages > 3 && (
              <>
                {totalPages > 6 && currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => totalPages - 2 + i).filter(page => page > 3).map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              </>
            )}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}