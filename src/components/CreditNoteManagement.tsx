import { useState, useEffect, useMemo } from "react"
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
import { Textarea } from "./ui/textarea"
import { Search, Filter, Eye, Plus, Download, Mail, CalendarIcon, DollarSign, FileText, AlertCircle, CheckCircle, Clock, RefreshCw, CreditCard, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useStudents } from "@/contexts/StudentContext"
import { useLanguage } from "@/contexts/LanguageContext"

interface CreditNote {
  id: string
  creditNoteNumber: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  parentName: string
  originalAmount: number
  creditAmount: number
  reason: string
  type: "refund" | "adjustment" | "cancellation" | "discount"
  status: "draft" | "issued" | "applied" | "cancelled"
  issueDate: Date
  dueDate?: Date
  appliedDate?: Date
  issuedBy: string
  approvedBy?: string
  notes: string
}

// localStorage keys
const CREDIT_NOTES_STORAGE_KEY = "creditNotes"
const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"

// Load Credit Notes from localStorage
const loadCreditNotesFromStorage = (): CreditNote[] => {
  try {
    const stored = localStorage.getItem(CREDIT_NOTES_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.map((cn: any) => ({
        ...cn,
        issueDate: new Date(cn.issueDate),
        dueDate: cn.dueDate ? new Date(cn.dueDate) : undefined,
        appliedDate: cn.appliedDate ? new Date(cn.appliedDate) : undefined
      }))
    }
  } catch (error) {
    console.error("Failed to load credit notes:", error)
  }
  return []
}

// Save Credit Notes to localStorage
const saveCreditNotesToStorage = (creditNotes: CreditNote[]) => {
  try {
    localStorage.setItem(CREDIT_NOTES_STORAGE_KEY, JSON.stringify(creditNotes))
  } catch (error) {
    console.error("Failed to save credit notes:", error)
  }
}

// Load Invoices from localStorage
const loadInvoicesFromStorage = () => {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load invoices:", error)
  }
  return []
}

// Generate Credit Note Number
const generateCreditNoteNumber = (existingNotes: CreditNote[]): string => {
  const year = new Date().getFullYear()
  const existingNumbers = existingNotes
    .filter(cn => cn.creditNoteNumber.includes(`CN-${year}`))
    .map(cn => {
      const match = cn.creditNoteNumber.match(/CN-\d{4}-(\d+)/)
      return match ? parseInt(match[1]) : 0
    })
  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
  const nextNumber = (maxNumber + 1).toString().padStart(6, '0')
  return `CN-${year}-${nextNumber}`
}

export function CreditNoteManagement() {
  const { t } = useLanguage()
  const { students } = useStudents()

  // Load credit notes from localStorage
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(() => loadCreditNotesFromStorage())
  const [filteredCreditNotes, setFilteredCreditNotes] = useState<CreditNote[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Load invoices from localStorage
  const [invoices, setInvoices] = useState<any[]>([])

  // Load invoices on mount
  useEffect(() => {
    setInvoices(loadInvoicesFromStorage())
    setFilteredCreditNotes(creditNotes)
  }, [])

  // Update filtered when creditNotes change
  useEffect(() => {
    setFilteredCreditNotes(creditNotes)
  }, [creditNotes])

  // Save credit notes to localStorage when changed
  useEffect(() => {
    if (creditNotes.length > 0) {
      saveCreditNotesToStorage(creditNotes)
    }
  }, [creditNotes])

  // Create new credit note form state
  const [newCreditNote, setNewCreditNote] = useState({
    selectedInvoiceId: "",
    invoiceNumber: "",
    studentName: "",
    studentId: "",
    studentGrade: "",
    parentName: "",
    originalAmount: 0,
    creditAmount: "",
    reason: "",
    type: "refund" as CreditNote["type"],
    notes: ""
  })

  // Get parent name from student context
  const getParentName = (studentId: string): string => {
    const student = students.find(s => s.studentId === studentId || s.id === studentId)
    if (student && student.parents && student.parents.length > 0) {
      const primaryParent = student.parents.find(p => p.isPrimary) || student.parents[0]
      return primaryParent.name
    }
    return "Parent"
  }

  // Handle invoice selection
  const handleInvoiceSelect = (invoiceId: string) => {
    const invoice = invoices.find((inv: any) => inv.id === invoiceId)
    if (invoice) {
      const parentName = getParentName(invoice.studentId)
      setNewCreditNote({
        ...newCreditNote,
        selectedInvoiceId: invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        studentName: invoice.studentName,
        studentId: invoice.studentId,
        studentGrade: invoice.studentGrade,
        parentName: parentName,
        originalAmount: invoice.netAmount || invoice.subtotal || 0
      })
    }
  }

  const applyFilters = () => {
    let filtered = creditNotes

    if (searchTerm) {
      filtered = filtered.filter(cn => 
        cn.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cn.parentName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(cn => cn.status === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(cn => cn.type === typeFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(cn => cn.issueDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(cn => cn.issueDate <= dateTo)
    }

    setFilteredCreditNotes(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setTypeFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredCreditNotes(creditNotes)
  }

  const openCreditNoteDetail = (creditNote: CreditNote) => {
    setSelectedCreditNote(creditNote)
    setIsModalOpen(true)
  }

  const closeCreditNoteModal = () => {
    setIsModalOpen(false)
    setSelectedCreditNote(null)
  }

  const openCreateModal = () => {
    // Reload invoices when opening modal
    setInvoices(loadInvoicesFromStorage())
    setIsCreateModalOpen(true)
    setNewCreditNote({
      selectedInvoiceId: "",
      invoiceNumber: "",
      studentName: "",
      studentId: "",
      studentGrade: "",
      parentName: "",
      originalAmount: 0,
      creditAmount: "",
      reason: "",
      type: "refund",
      notes: ""
    })
  }

  const closeCreateModal = () => {
    setIsCreateModalOpen(false)
  }

  const handleCreateCreditNote = () => {
    if (!newCreditNote.selectedInvoiceId || !newCreditNote.creditAmount || !newCreditNote.reason) {
      toast.error("Please select an invoice and fill in all required fields")
      return
    }

    const creditAmount = parseFloat(newCreditNote.creditAmount)
    if (isNaN(creditAmount) || creditAmount <= 0) {
      toast.error("Please enter a valid credit amount")
      return
    }

    if (creditAmount > newCreditNote.originalAmount) {
      toast.error("Credit amount cannot exceed original invoice amount")
      return
    }

    const newNote: CreditNote = {
      id: Date.now().toString(),
      creditNoteNumber: generateCreditNoteNumber(creditNotes),
      invoiceNumber: newCreditNote.invoiceNumber,
      studentName: newCreditNote.studentName,
      studentId: newCreditNote.studentId,
      studentGrade: newCreditNote.studentGrade,
      parentName: newCreditNote.parentName,
      originalAmount: newCreditNote.originalAmount,
      creditAmount: creditAmount,
      reason: newCreditNote.reason,
      type: newCreditNote.type,
      status: "draft",
      issueDate: new Date(),
      issuedBy: "Finance Team",
      notes: newCreditNote.notes
    }

    setCreditNotes([newNote, ...creditNotes])
    toast.success(`Credit note ${newNote.creditNoteNumber} created successfully`)
    closeCreateModal()
  }

  const downloadCreditNote = (creditNoteId: string) => {
    const creditNote = creditNotes.find(cn => cn.id === creditNoteId)
    if (creditNote) {
      toast.success(`Credit note ${creditNote.creditNoteNumber} downloaded`)
    }
  }

  const sendCreditNote = (creditNoteId: string) => {
    const creditNote = creditNotes.find(cn => cn.id === creditNoteId)
    if (creditNote) {
      toast.success(`Credit note sent to ${creditNote.parentName}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" />Draft</Badge>
      case "issued":
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Issued</Badge>
      case "applied":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Applied</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "refund":
        return <Badge className="bg-purple-100 text-purple-800">Refund</Badge>
      case "adjustment":
        return <Badge className="bg-orange-100 text-orange-800">Adjustment</Badge>
      case "cancellation":
        return <Badge className="bg-red-100 text-red-800">Cancellation</Badge>
      case "discount":
        return <Badge className="bg-green-100 text-green-800">Discount</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
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

  const getSortedCreditNotes = (creditNotes: CreditNote[]) => {
    if (!sortColumn) return creditNotes
    return [...creditNotes].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case "creditNoteNumber":
          aValue = a.creditNoteNumber
          bValue = b.creditNoteNumber
          break
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
        case "creditAmount":
          aValue = a.creditAmount
          bValue = b.creditAmount
          break
        case "type":
          aValue = a.type
          bValue = b.type
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        case "issueDate":
          aValue = a.issueDate.getTime()
          bValue = b.issueDate.getTime()
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

  // Apply sorting to filtered credit notes
  const sortedCreditNotes = getSortedCreditNotes(filteredCreditNotes)

  // Pagination logic
  const totalPages = Math.ceil(sortedCreditNotes.length / pageSize)
  const paginatedCreditNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedCreditNotes.slice(startIndex, startIndex + pageSize)
  }, [sortedCreditNotes, currentPage, pageSize])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeFilter, dateFrom, dateTo, sortColumn, sortDirection])

  const summaryStats = {
    total: creditNotes.length,
    draft: creditNotes.filter(cn => cn.status === "draft").length,
    issued: creditNotes.filter(cn => cn.status === "issued").length,
    applied: creditNotes.filter(cn => cn.status === "applied").length,
    totalAmount: creditNotes.reduce((sum, cn) => sum + cn.creditAmount, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("creditNote.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("creditNote.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            {t("invoice.exportReport")}
          </Button>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t("creditNote.createCreditNote")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("creditNote.totalCreditNotes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("creditNote.draft")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{summaryStats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("creditNote.issued")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.issued}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("creditNote.applied")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.applied}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("creditNote.totalCreditAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₿{summaryStats.totalAmount.toLocaleString()}</div>
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
              <Button onClick={applyFilters} className="h-9">{t("invoice.apply")}</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.search")}</label>
              <Input
                placeholder={t("creditNote.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                  <SelectItem value="draft">{t("creditNote.draft")}</SelectItem>
                  <SelectItem value="issued">{t("creditNote.issued")}</SelectItem>
                  <SelectItem value="applied">{t("creditNote.applied")}</SelectItem>
                  <SelectItem value="cancelled">{t("common.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("invoiceOverview.type")}</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("creditNote.allTypes")}</SelectItem>
                  <SelectItem value="refund">{t("creditNote.refund")}</SelectItem>
                  <SelectItem value="adjustment">{t("creditNote.adjustment")}</SelectItem>
                  <SelectItem value="cancellation">{t("creditNote.cancellation")}</SelectItem>
                  <SelectItem value="discount">{t("creditNote.discount")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Date Range</label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yy") : "From"}
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
                <span className="text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yy") : "To"}
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

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredCreditNotes.length} of {creditNotes.length} credit notes
        </p>
      </div>

      {/* Credit Notes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("creditNoteNumber")}>
                  <div className="flex items-center gap-1">
                    Credit Note Number
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceNumber")}>
                  <div className="flex items-center gap-1">
                    Invoice Reference
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
                    Year Group
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("creditAmount")}>
                  <div className="flex items-center gap-1">
                    Amount
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("type")}>
                  <div className="flex items-center gap-1">
                    Type
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("issueDate")}>
                  <div className="flex items-center gap-1">
                    Issue Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCreditNotes.map((creditNote) => (
                <TableRow key={creditNote.id}>
                  <TableCell className="font-mono text-sm">
                    {creditNote.creditNoteNumber}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {creditNote.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{creditNote.studentName}</div>
                      <div className="text-sm text-muted-foreground">{creditNote.studentId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{creditNote.studentGrade}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-red-600">
                      -₿{creditNote.creditAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of ₿{creditNote.originalAmount.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(creditNote.type)}</TableCell>
                  <TableCell>{getStatusBadge(creditNote.status)}</TableCell>
                  <TableCell>{format(creditNote.issueDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openCreditNoteDetail(creditNote)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => downloadCreditNote(creditNote.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => sendCreditNote(creditNote.id)}
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {sortedCreditNotes.length > 0 && (
            <div className="flex items-center justify-between border-t p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>entries</span>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedCreditNotes.length)} of {sortedCreditNotes.length} credit notes
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Note Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Credit Note Details
            </DialogTitle>
            <DialogDescription>
              View and manage credit note information and processing details
            </DialogDescription>
          </DialogHeader>
          
          {selectedCreditNote && (
            <div className="space-y-6">
              {/* Credit Note Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Credit Note Number</p>
                  <p className="font-mono text-lg font-medium">{selectedCreditNote.creditNoteNumber}</p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedCreditNote.status)}
                  {getTypeBadge(selectedCreditNote.type)}
                </div>
              </div>

              <Separator />

              {/* Student & Invoice Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-medium">Student Information</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Student Name</p>
                      <p className="font-medium">{selectedCreditNote.studentName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Student ID</p>
                      <p className="font-mono">{selectedCreditNote.studentId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Year Group</p>
                      <Badge variant="secondary">{selectedCreditNote.studentGrade}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Parent/Guardian</p>
                      <p className="font-medium">{selectedCreditNote.parentName}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Credit Information</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Related Invoice</p>
                      <p className="font-mono">{selectedCreditNote.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Original Amount</p>
                      <p className="font-medium">₿{selectedCreditNote.originalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Amount</p>
                      <p className="text-xl font-bold text-red-600">-₿{selectedCreditNote.creditAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Credit Details */}
              <div className="space-y-3">
                <h3 className="font-medium">Credit Details</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{selectedCreditNote.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-medium">{format(selectedCreditNote.issueDate, "MMM dd, yyyy")}</p>
                  </div>
                  {selectedCreditNote.dueDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium">{format(selectedCreditNote.dueDate, "MMM dd, yyyy")}</p>
                    </div>
                  )}
                  {selectedCreditNote.appliedDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Applied Date</p>
                      <p className="font-medium">{format(selectedCreditNote.appliedDate, "MMM dd, yyyy")}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Processing Information */}
              <div className="space-y-3">
                <h3 className="font-medium">Processing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Issued By</p>
                    <p className="font-medium">{selectedCreditNote.issuedBy}</p>
                  </div>
                  {selectedCreditNote.approvedBy && (
                    <div>
                      <p className="text-sm text-muted-foreground">Approved By</p>
                      <p className="font-medium">{selectedCreditNote.approvedBy}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedCreditNote.notes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-medium">Notes</h3>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm">{selectedCreditNote.notes}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    downloadCreditNote(selectedCreditNote.id)
                    closeCreditNoteModal()
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    sendCreditNote(selectedCreditNote.id)
                    closeCreditNoteModal()
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send to Parent
                </Button>
                
                <Button variant="ghost" onClick={closeCreditNoteModal}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Credit Note Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Credit Note
            </DialogTitle>
            <DialogDescription>
              Create a new credit note for refunds, adjustments, or cancellations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Invoice Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Invoice *</label>
              <Select
                value={newCreditNote.selectedInvoiceId}
                onValueChange={handleInvoiceSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {invoices.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No invoices found. Create invoices first.
                    </div>
                  ) : (
                    invoices.map((invoice: any) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - {invoice.studentName} - ฿{(invoice.netAmount || invoice.subtotal || 0).toLocaleString()}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-populated Student Info */}
            {newCreditNote.selectedInvoiceId && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Invoice Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Invoice:</span>
                    <span className="ml-2 font-medium">{newCreditNote.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Student:</span>
                    <span className="ml-2 font-medium">{newCreditNote.studentName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Student ID:</span>
                    <span className="ml-2 font-medium">{newCreditNote.studentId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Grade:</span>
                    <span className="ml-2 font-medium">{newCreditNote.studentGrade}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Parent:</span>
                    <span className="ml-2 font-medium">{newCreditNote.parentName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Original Amount:</span>
                    <span className="ml-2 font-medium text-blue-600">฿{newCreditNote.originalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Credit Amount *</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newCreditNote.creditAmount}
                  onChange={(e) => setNewCreditNote({...newCreditNote, creditAmount: e.target.value})}
                  max={newCreditNote.originalAmount}
                />
                {newCreditNote.originalAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Max: ฿{newCreditNote.originalAmount.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Credit Type *</label>
                <Select
                  value={newCreditNote.type}
                  onValueChange={(value: CreditNote["type"]) => setNewCreditNote({...newCreditNote, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="adjustment">Billing Adjustment</SelectItem>
                    <SelectItem value="cancellation">Course Cancellation</SelectItem>
                    <SelectItem value="discount">Discount Applied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason *</label>
              <Input
                placeholder="Enter reason for credit note"
                value={newCreditNote.reason}
                onChange={(e) => setNewCreditNote({...newCreditNote, reason: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes</label>
              <Textarea
                placeholder="Enter any additional notes or comments"
                value={newCreditNote.notes}
                onChange={(e) => setNewCreditNote({...newCreditNote, notes: e.target.value})}
                className="min-h-20"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCreateCreditNote} className="flex-1">
                Create Credit Note
              </Button>
              <Button variant="outline" onClick={closeCreateModal}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}