import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { CalendarIcon, Search, Download, Filter, Eye, Mail, FileText, ChevronLeft, ChevronRight, X, User, DollarSign, Calendar as CalendarEmoji, Clock, CreditCard, CheckSquare, Square, Send, AlertCircle, CheckCircle, Receipt, Users, ArrowUpDown } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
import { Separator } from "./ui/separator"
import { Checkbox } from "./ui/checkbox"
import { Textarea } from "./ui/textarea"
import { Progress } from "./ui/progress"
import { Label } from "./ui/label"
import { format } from "date-fns"
import { toast } from "sonner"
import { InternalEmailManagement } from "./InternalEmailManagement"

interface Receipt {
  id: string
  receiptNumber: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  amount: number
  paymentMethod: string
  transactionDate: Date
  paymentType: "yearly" | "termly"
  term: string
  status: "issued" | "resent" | "failed"
  downloadCount: number
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

const mockReceipts: Receipt[] = [
  {
    id: "1",
    receiptNumber: "RCP-2025-001234",
    invoiceNumber: "INV-2025-001234",
    studentName: "James Smith",
    studentId: "KC2024001",
    studentGrade: "Year 4",
    amount: 125000,
    paymentMethod: "Credit Card",
    transactionDate: new Date("2025-08-15"),
    paymentType: "yearly",
    term: "2025-2026",
    status: "issued",
    downloadCount: 3
  },
  {
    id: "2",
    receiptNumber: "RCP-2025-001235",
    invoiceNumber: "INV-2025-001235",
    studentName: "Emily Smith",
    studentId: "KC2024002",
    studentGrade: "Reception",
    amount: 42000,
    paymentMethod: "PromptPay",
    transactionDate: new Date("2025-08-14"),
    paymentType: "termly",
    term: "Term 1",
    status: "issued",
    downloadCount: 1
  },
  {
    id: "3",
    receiptNumber: "RCP-2025-001236",
    invoiceNumber: "INV-2025-001236",
    studentName: "Michael Johnson",
    studentId: "KC2024003",
    studentGrade: "Year 7",
    amount: 125000,
    paymentMethod: "Bank Counter",
    transactionDate: new Date("2025-08-13"),
    paymentType: "yearly",
    term: "2025-2026",
    status: "resent",
    downloadCount: 0
  },
  {
    id: "4",
    receiptNumber: "RCP-2025-001237",
    invoiceNumber: "INV-2025-001237",
    studentName: "Sophia Williams",
    studentId: "KC2024004",
    studentGrade: "Year 9",
    amount: 42000,
    paymentMethod: "WeChat Pay",
    transactionDate: new Date("2025-08-12"),
    paymentType: "termly",
    term: "Term 1",
    status: "issued",
    downloadCount: 2
  },
  {
    id: "5",
    receiptNumber: "RCP-2025-001238",
    invoiceNumber: "INV-2025-001238",
    studentName: "Oliver Williams",
    studentId: "KC2024005",
    studentGrade: "Year 6",
    amount: 125000,
    paymentMethod: "Credit Card",
    transactionDate: new Date("2025-08-11"),
    paymentType: "yearly",
    term: "2025-2026",
    status: "failed",
    downloadCount: 0
  }
]

// Add more mock data for pagination testing
for (let i = 6; i <= 120; i++) {
  const student = studentData[i % studentData.length]
  const statuses: ("issued" | "resent" | "failed")[] = ["issued", "resent", "failed"]
  const paymentMethods = ["Credit Card", "PromptPay", "Bank Counter", "WeChat Pay", "Alipay", "Cash"]
  const paymentTypes: ("yearly" | "termly")[] = ["yearly", "termly"]

  mockReceipts.push({
    id: i.toString(),
    receiptNumber: `RCP-2025-${String(1234 + i).padStart(6, '0')}`,
    invoiceNumber: `INV-2025-${String(1234 + i).padStart(6, '0')}`,
    studentName: student.name,
    studentId: student.id,
    studentGrade: student.grade,
    amount: Math.floor(Math.random() * 100000) + 25000,
    paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
    transactionDate: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
    paymentType: paymentTypes[Math.floor(Math.random() * paymentTypes.length)],
    term: Math.random() > 0.5 ? "2025-2026" : `Term ${Math.floor(Math.random() * 3) + 1}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    downloadCount: Math.floor(Math.random() * 10)
  })
}

export function ReceiptPage() {
  const [receipts] = useState<Receipt[]>(mockReceipts)
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>(mockReceipts)
  const [searchTerm, setSearchTerm] = useState("")

  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Modal states
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Bulk resend modal states
  const [isBulkResendModalOpen, setIsBulkResendModalOpen] = useState(false)
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set())
  const [emailTemplate, setEmailTemplate] = useState("default")
  const [customMessage, setCustomMessage] = useState("")
  const [bulkResendStep, setBulkResendStep] = useState<"select" | "configure" | "sending" | "complete">("select")
  const [sendProgress, setSendProgress] = useState(0)
  const [sendResults, setSendResults] = useState<{success: number, failed: number, total: number}>({success: 0, failed: 0, total: 0})

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Grade options for filter
  const gradeOptions = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]

  const applyFilters = () => {
    let filtered = receipts

    if (searchTerm) {
      filtered = filtered.filter(receipt => 
        receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }



    if (paymentTypeFilter !== "all") {
      filtered = filtered.filter(receipt => receipt.paymentType === paymentTypeFilter)
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter(receipt => receipt.studentGrade === gradeFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(receipt => receipt.transactionDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(receipt => receipt.transactionDate <= dateTo)
    }

    setFilteredReceipts(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setSearchTerm("")
    setPaymentTypeFilter("all")
    setGradeFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredReceipts(receipts)
    setCurrentPage(1)
  }

  const downloadReceipt = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt) {
      toast.success(`Receipt ${receipt.receiptNumber} downloaded successfully`)
    }
  }

  const resendReceipt = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt) {
      toast.success(`Receipt resent to ${receipt.studentName}'s parent`)
    }
  }

  const openReceiptDetail = (receipt: Receipt) => {
    setSelectedReceipt(receipt)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedReceipt(null)
  }

  // Bulk resend functions
  const openBulkResendModal = () => {
    setIsBulkResendModalOpen(true)
    setBulkResendStep("select")
    setSelectedReceipts(new Set())
    setCustomMessage("")
    setEmailTemplate("default")
  }

  const closeBulkResendModal = () => {
    setIsBulkResendModalOpen(false)
    setBulkResendStep("select")
    setSelectedReceipts(new Set())
    setSendProgress(0)
    setSendResults({success: 0, failed: 0, total: 0})
  }

  const toggleReceiptSelection = (receiptId: string) => {
    const newSelected = new Set(selectedReceipts)
    if (newSelected.has(receiptId)) {
      newSelected.delete(receiptId)
    } else {
      newSelected.add(receiptId)
    }
    setSelectedReceipts(newSelected)
  }

  const selectAllCurrentPage = () => {
    const newSelected = new Set(selectedReceipts)
    currentPageReceipts.forEach(receipt => {
      newSelected.add(receipt.id)
    })
    setSelectedReceipts(newSelected)
  }

  const selectAllFiltered = () => {
    const newSelected = new Set()
    filteredReceipts.forEach(receipt => {
      newSelected.add(receipt.id)
    })
    setSelectedReceipts(newSelected)
  }

  const clearSelection = () => {
    setSelectedReceipts(new Set())
  }

  const startBulkResend = async () => {
    setBulkResendStep("sending")
    const total = selectedReceipts.size
    setSendResults({success: 0, failed: 0, total})
    
    let success = 0
    let failed = 0
    
    // Simulate sending process
    for (let i = 0; i < total; i++) {
      await new Promise(resolve => setTimeout(resolve, 200)) // Simulate API call
      
      if (Math.random() > 0.1) { // 90% success rate
        success++
      } else {
        failed++
      }
      
      setSendProgress(((i + 1) / total) * 100)
      setSendResults({success, failed, total})
    }
    
    setBulkResendStep("complete")
    toast.success(`Bulk resend completed: ${success} sent, ${failed} failed`)
  }

  const emailTemplates = [
    { value: "default", label: "Default Template", description: "Standard receipt email template" },
    { value: "reminder", label: "Payment Reminder", description: "Template with payment reminder message" },
    { value: "urgent", label: "Urgent Notice", description: "Template for urgent payment notifications" },
    { value: "custom", label: "Custom Message", description: "Use custom message below" }
  ]

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedReceipts = (receiptsToSort: Receipt[]) => {
    if (!sortColumn) return receiptsToSort
    return [...receiptsToSort].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "receiptNumber": aVal = a.receiptNumber; bVal = b.receiptNumber; break
        case "invoiceNumber": aVal = a.invoiceNumber; bVal = b.invoiceNumber; break
        case "studentName": aVal = a.studentName; bVal = b.studentName; break
        case "studentGrade": aVal = a.studentGrade; bVal = b.studentGrade; break
        case "amount": aVal = a.amount; bVal = b.amount; break
        case "paymentMethod": aVal = a.paymentMethod; bVal = b.paymentMethod; break
        case "transactionDate": aVal = a.transactionDate.getTime(); bVal = b.transactionDate.getTime(); break
        case "status": aVal = a.status; bVal = b.status; break
        case "downloadCount": aVal = a.downloadCount; bVal = b.downloadCount; break
        default: return 0
      }
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal)
        return sortDirection === "asc" ? comparison : -comparison
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "issued":
        return <Badge className="bg-green-100 text-green-800">Issued</Badge>
      case "resent":
        return <Badge className="bg-blue-100 text-blue-800">Resent</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Calculate pagination with sorting
  const sortedReceipts = getSortedReceipts(filteredReceipts)
  const totalPages = Math.ceil(sortedReceipts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageReceipts = sortedReceipts.slice(startIndex, endIndex)

  const summaryStats = {
    total: receipts.length,
    issued: receipts.filter(r => r.status === "issued").length,
    resent: receipts.filter(r => r.status === "resent").length,
    failed: receipts.filter(r => r.status === "failed").length,
    totalDownloads: receipts.reduce((sum, r) => sum + r.downloadCount, 0)
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Tuition Receipt Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage receipts and internal email notifications
          </p>
        </div>
      </div>

      <Tabs defaultValue="receipts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Receipt Management
          </TabsTrigger>
          <TabsTrigger value="whitelist" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Internal Email Whitelist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium">Receipt Management</h3>
              <p className="text-sm text-muted-foreground">
                View and download tuition payment receipts
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={openBulkResendModal}
              >
                <Mail className="w-4 h-4" />
                Bulk Resend
              </Button>
              <Button className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export All
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Successfully Issued</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summaryStats.issued}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((summaryStats.issued / summaryStats.total) * 100)}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summaryStats.resent}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summaryStats.failed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalDownloads}</div>
                <p className="text-xs text-muted-foreground">
                  Avg {(summaryStats.totalDownloads / summaryStats.total).toFixed(1)} per receipt
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
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Input
                      placeholder="Receipt, invoice, student name"
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
                      <SelectItem value="issued">Issued</SelectItem>
                      <SelectItem value="resent">Resent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Type</label>
                  <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="termly">Termly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Grade Level</label>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {gradeOptions.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <CalendarIcon className="mr-2 h-4 w-4" />
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
                          <CalendarIcon className="mr-2 h-4 w-4" />
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
              </div>
            </CardContent>
          </Card>

          {/* Results Summary with Selection Info */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredReceipts.length)} of {filteredReceipts.length} receipts
                {filteredReceipts.length !== receipts.length && (
                  <span> (filtered from {receipts.length} total)</span>
                )}
              </p>
              {selectedReceipts.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedReceipts.size} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllFiltered}
                  >
                    Select All ({filteredReceipts.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>

          {/* Receipt Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={currentPageReceipts.length > 0 && currentPageReceipts.every(receipt => selectedReceipts.has(receipt.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllCurrentPage()
                          } else {
                            const newSelected = new Set(selectedReceipts)
                            currentPageReceipts.forEach(receipt => {
                              newSelected.delete(receipt.id)
                            })
                            setSelectedReceipts(newSelected)
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("receiptNumber")}>
                      <div className="flex items-center gap-1">
                        Receipt Number
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceNumber")}>
                      <div className="flex items-center gap-1">
                        Invoice
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
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentMethod")}>
                      <div className="flex items-center gap-1">
                        Payment Method
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                      <div className="flex items-center gap-1">
                        Date
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("downloadCount")}>
                      <div className="flex items-center gap-1">
                        Downloads
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedReceipts.has(receipt.id)}
                          onCheckedChange={() => toggleReceiptSelection(receipt.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {receipt.receiptNumber}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {receipt.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{receipt.studentName}</div>
                          <div className="text-sm text-muted-foreground">{receipt.studentId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{receipt.studentGrade}</Badge>
                      </TableCell>
                      <TableCell>₿{receipt.amount.toLocaleString()}</TableCell>
                      <TableCell>{receipt.paymentMethod}</TableCell>
                      <TableCell>{format(receipt.transactionDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {receipt.downloadCount} times
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openReceiptDetail(receipt)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => downloadReceipt(receipt.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => resendReceipt(receipt.id)}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="whitelist">
          <InternalEmailManagement 
            title="Tuition Receipt Email Whitelist"
            description="Manage internal staff emails who receive tuition receipt notifications"
          />
        </TabsContent>
      </Tabs>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Receipt Details</DialogTitle>
              <DialogDescription>
                View detailed information about receipt {selectedReceipt.receiptNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Receipt Information</h4>
                  <div className="space-y-2 mt-2">
                    <p><span className="font-medium">Receipt Number:</span> {selectedReceipt.receiptNumber}</p>
                    <p><span className="font-medium">Invoice Number:</span> {selectedReceipt.invoiceNumber}</p>
                    <p><span className="font-medium">Status:</span> {getStatusBadge(selectedReceipt.status)}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Student Information</h4>
                  <div className="space-y-2 mt-2">
                    <p><span className="font-medium">Name:</span> {selectedReceipt.studentName}</p>
                    <p><span className="font-medium">ID:</span> {selectedReceipt.studentId}</p>
                    <p><span className="font-medium">Grade:</span> {selectedReceipt.studentGrade}</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Payment Details</h4>
                  <div className="space-y-2 mt-2">
                    <p><span className="font-medium">Amount:</span> ₿{selectedReceipt.amount.toLocaleString()}</p>
                    <p><span className="font-medium">Method:</span> {selectedReceipt.paymentMethod}</p>
                    <p><span className="font-medium">Type:</span> {selectedReceipt.paymentType}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Additional Info</h4>
                  <div className="space-y-2 mt-2">
                    <p><span className="font-medium">Date:</span> {format(selectedReceipt.transactionDate, "MMMM dd, yyyy")}</p>
                    <p><span className="font-medium">Term:</span> {selectedReceipt.term}</p>
                    <p><span className="font-medium">Downloads:</span> {selectedReceipt.downloadCount} times</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => downloadReceipt(selectedReceipt.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={() => resendReceipt(selectedReceipt.id)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend
                </Button>
                <Button onClick={closeModal}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Resend Modal - keeping it simple for now */}
      <Dialog open={isBulkResendModalOpen} onOpenChange={closeBulkResendModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Resend Receipts</DialogTitle>
            <DialogDescription>
              Send receipt emails to selected recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>Feature coming soon: Bulk resend for {selectedReceipts.size} selected receipts</p>
            <div className="flex justify-end">
              <Button onClick={closeBulkResendModal}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}