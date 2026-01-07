import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { useDiscountOptions } from "@/contexts/DiscountOptionsContext"
import { useStudents } from "@/contexts/StudentContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Textarea } from "./ui/textarea"
import { SearchInput } from "./ui/advanced-filter"
import { EmptySearchResults, EmptyDataState } from "./ui/states"
import { Search, Filter, Eye, Plus, Download, Mail, CalendarIcon, DollarSign, FileText, AlertCircle, CheckCircle, Clock, RefreshCw, Trash2, Edit, X, Upload, Users, User, FileSpreadsheet, RotateCcw, ArrowUpDown, ChevronLeft, ChevronRight, GraduationCap, Building } from "lucide-react"
import { ViewModal } from "./ViewModal"
import { format } from "date-fns"
import { toast } from "sonner"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { SCHOOL_INFO, BANK_DETAILS, BILL_PAYMENT, INVOICE_NOTES, numberToWords, formatCurrency, getAcademicYear } from "@/lib/invoiceUtils"
import SchoolLogo from "@/assets/Logo.png"

interface Invoice {
  id: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  parentName: string
  parentEmail: string
  totalAmount: number
  discountAmount: number
  finalAmount: number
  status: "draft" | "pending_approval" | "approved" | "rejected" | "sent" | "paid" | "overdue" | "cancelled"
  issueDate: Date
  dueDate: Date
  paidDate?: Date
  issuedBy: string
  items: InvoiceItem[]
  notes: string
  // External invoice fields
  invoiceType?: "student" | "external"
  recipientName?: string
  recipientAddress?: string
  eventName?: string
  // Approval fields
  approvedBy?: string
  approvedAt?: Date
  rejectedReason?: string
  // Academic info
  term?: string
  academicYear?: string
}

interface InvoiceItem {
  id: string
  description: string
  amount: number
  discountPercent: number
  discountedAmount: number
}

interface PreCreatedItem {
  id: string
  name: string
  description: string
  amount: number
  category: string
  isActive: boolean
  applicableGrades: string[]
}

interface InvoiceTemplate {
  id: string
  name: string
  grade: string
  items: Omit<InvoiceItem, 'id'>[]
  isDefault: boolean
}

// localStorage key for created invoices (same as InvoiceCreation)
const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"
const STUDENT_GROUPS_STORAGE_KEY = "studentGroups"

// Helper function to get student group discounts
const getStudentGroupDiscounts = (studentId: string): { name: string; discountType: string; discountPercentage: number; fixedAmount: number }[] => {
  try {
    const stored = localStorage.getItem(STUDENT_GROUPS_STORAGE_KEY)
    if (!stored) return []

    const groups = JSON.parse(stored)
    return groups
      .filter((group: any) => group.students?.some((s: any) => s.studentId === studentId || s.id === studentId))
      .map((group: any) => ({
        name: group.name,
        discountType: group.discountType || "percentage",
        discountPercentage: group.discountPercentage || 0,
        fixedAmount: group.fixedAmount || 0
      }))
  } catch (error) {
    console.error("Failed to get student group discounts:", error)
    return []
  }
}

// Load created invoices from localStorage
const loadCreatedInvoicesFromStorage = (): Invoice[] => {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) {
      const savedInvoices = JSON.parse(stored)
      return savedInvoices.map((inv: any) => {
        // Handle empty or invalid dates
        const issueDate = inv.issueDate ? new Date(inv.issueDate) : new Date()
        const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days from now

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          studentName: inv.studentName || inv.recipientName || "Unknown",
          studentId: inv.studentId,
          studentGrade: inv.studentGrade || "-",
          parentName: inv.parentName || inv.recipientName || "Parent",
          parentEmail: inv.parentEmail || "",
          totalAmount: inv.subtotal ?? 0,
          discountAmount: inv.totalDiscount ?? 0,
          finalAmount: inv.netAmount ?? inv.subtotal ?? 0,
          status: (inv.status === "pending" ? "draft" : inv.status) as "draft" | "sent" | "paid" | "overdue" | "cancelled",
          issueDate: isNaN(issueDate.getTime()) ? new Date() : issueDate,
          dueDate: isNaN(dueDate.getTime()) ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : dueDate,
          issuedBy: "System",
          items: (inv.items || []).map((item: any, idx: number) => ({
            id: String(idx + 1),
            description: item.name || item.description,
            amount: item.amount,
            discountPercent: 0,
            discountedAmount: item.amount
          })),
          notes: inv.notes || "",
          // External invoice fields
          invoiceType: inv.invoiceType,
          recipientName: inv.recipientName,
          recipientAddress: inv.recipientAddress,
          eventName: inv.eventName,
          // Academic info
          term: inv.term || "",
          academicYear: inv.academicYear || ""
        }
      })
    }
  } catch (error) {
    console.error("Failed to load created invoices:", error)
  }
  return []
}

const mockTemplates: InvoiceTemplate[] = [
  {
    id: "1",
    name: "Standard Year 10",
    grade: "Year 10",
    isDefault: true,
    items: [
      {
        description: "Swimming Program",
        amount: 80000,
        discountPercent: 0,
        discountedAmount: 80000
      },
      {
        description: "Advanced Mathematics",
        amount: 50000,
        discountPercent: 0,
        discountedAmount: 50000
      },
      {
        description: "Science Laboratory",
        amount: 30000,
        discountPercent: 0,
        discountedAmount: 30000
      }
    ]
  },
  {
    id: "2",
    name: "Standard Year 7",
    grade: "Year 7",
    isDefault: true,
    items: [
      {
        description: "Art & Craft Program",
        amount: 42000,
        discountPercent: 0,
        discountedAmount: 42000
      },
      {
        description: "Basic Computer Skills",
        amount: 25000,
        discountPercent: 0,
        discountedAmount: 25000
      }
    ]
  }
]

const grades = [
  "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
  "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"
]

const mockStudents = [
  { id: "ST001234", name: "John Smith", grade: "Year 10", parentName: "Robert Smith", email: "robert.smith@email.com" },
  { id: "ST001235", name: "Sarah Wilson", grade: "Year 7", parentName: "Michael Wilson", email: "michael.wilson@email.com" },
  { id: "ST001236", name: "Mike Johnson", grade: "Year 12", parentName: "Lisa Johnson", email: "lisa.johnson@email.com" },
  { id: "ST001237", name: "Emma Davis", grade: "Year 3", parentName: "David Davis", email: "david.davis@email.com" },
  { id: "ST001238", name: "Tom Brown", grade: "Year 10", parentName: "Jane Brown", email: "jane.brown@email.com" },
  { id: "ST001239", name: "Lisa Chen", grade: "Year 10", parentName: "David Chen", email: "david.chen@email.com" },
  { id: "ST001240", name: "Mark Taylor", grade: "Year 10", parentName: "Susan Taylor", email: "susan.taylor@email.com" },
  { id: "ST001241", name: "Anna Martinez", grade: "Year 7", parentName: "Carlos Martinez", email: "carlos.martinez@email.com" },
  { id: "ST001242", name: "Peter Lee", grade: "Year 7", parentName: "Michelle Lee", email: "michelle.lee@email.com" },
]

const mockPreCreatedItems: PreCreatedItem[] = [
  {
    id: "item-001",
    name: "Swimming Program Fee",
    description: "Swimming lessons and pool maintenance fee",
    amount: 80000,
    category: "Sports & Activities",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-002",
    name: "Advanced Mathematics",
    description: "Additional mathematics tutoring program",
    amount: 50000,
    category: "Academic Programs",
    isActive: true,
    applicableGrades: ["Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-003",
    name: "Science Laboratory Fee",
    description: "Laboratory equipment and materials fee",
    amount: 30000,
    category: "Academic Programs",
    isActive: true,
    applicableGrades: ["Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-004",
    name: "Art & Craft Program",
    description: "Art supplies and craft materials",
    amount: 42000,
    category: "Creative Arts",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7"]
  },
  {
    id: "item-005",
    name: "Music Lessons",
    description: "Individual and group music instruction",
    amount: 35000,
    category: "Creative Arts",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10"]
  },
  {
    id: "item-006",
    name: "Computer Programming",
    description: "Introduction to coding and programming",
    amount: 45000,
    category: "Technology",
    isActive: true,
    applicableGrades: ["Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-007",
    name: "Field Trip Allowance",
    description: "Educational excursions and field studies",
    amount: 25000,
    category: "Educational Activities",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-008",
    name: "Uniform & Textbooks",
    description: "School uniform and required textbooks",
    amount: 15000,
    category: "School Supplies",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  }
]

interface InvoiceManagementProps {
  onNavigateToSubPage: (subPage: string) => void
  onNavigateToView?: (type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template", data: any) => void
}

export function InvoiceManagement({ onNavigateToSubPage, onNavigateToView }: InvoiceManagementProps) {
  const { t } = useLanguage()
  // Discount Options context for late payment calculations
  const { getLatePaymentSettings, getRegistrationFees, getSiblingDiscountPercentage } = useDiscountOptions()
  const { academicYears = [] } = useAcademicYears()
  const { students, getSiblingDiscount, checkFeePrivilegeEligibility } = useStudents()

  // Load invoices from localStorage
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadCreatedInvoicesFromStorage())
  const [templates, setTemplates] = useState<InvoiceTemplate[]>(mockTemplates)
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(() => loadCreatedInvoicesFromStorage())
  const [searchTerm, setSearchTerm] = useState("")
  const [academicYearFilter, setAcademicYearFilter] = useState("2024-2025")
  const [termFilter, setTermFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Invoice type tab state
  const [invoiceTypeTab, setInvoiceTypeTab] = useState<"student" | "external">("student")

  // Get available terms based on selected academic year
  const availableTerms = academicYearFilter !== "all"
    ? (academicYears.find(y => y.id === academicYearFilter)?.terms || [])
    : [...new Map(academicYears.flatMap(y => y.terms).map(t => [t.name, t])).values()]

  // Reload invoices from localStorage
  const reloadInvoices = () => {
    const loaded = loadCreatedInvoicesFromStorage()
    setInvoices(loaded)
    setFilteredInvoices(loaded)
  }

  // Listen for invoice updates
  useEffect(() => {
    const handleInvoicesUpdated = () => {
      reloadInvoices()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadInvoices()
      }
    }

    window.addEventListener('invoicesUpdated', handleInvoicesUpdated)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('invoicesUpdated', handleInvoicesUpdated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Re-apply filters when tab changes
  useEffect(() => {
    applyFilters(invoiceTypeTab)
  }, [invoiceTypeTab, invoices])

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewModalData, setViewModalData] = useState<any>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingDueDate, setEditingDueDate] = useState<Date | undefined>(undefined)
  const [editingNotes, setEditingNotes] = useState("")

  // Import Excel state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)

  // Create invoice state
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null)

  // Student selection state
  const [studentSelectionType, setStudentSelectionType] = useState<"individual" | "csv" | "all">("individual")
  const [searchStudentTerm, setSearchStudentTerm] = useState("")
  const [selectedStudents, setSelectedStudents] = useState<any[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvStudents, setCsvStudents] = useState<any[]>([])

  // Item selection state
  const [availableItems, setAvailableItems] = useState<PreCreatedItem[]>([])
  const [selectedItems, setSelectedItems] = useState<PreCreatedItem[]>([])

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)
  const [newItem, setNewItem] = useState({
    description: "",
    amount: "",
    discountPercent: ""
  })

  // Approval dialog state
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [selectedInvoiceForApproval, setSelectedInvoiceForApproval] = useState<Invoice | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve")

  const applyFilters = (tabType?: "student" | "external") => {
    const currentTab = tabType || invoiceTypeTab
    let filtered = invoices

    // Filter by invoice type tab
    if (currentTab === "external") {
      filtered = filtered.filter(inv => inv.invoiceType === "external" || inv.studentId === "EXTERNAL")
    } else {
      filtered = filtered.filter(inv => inv.invoiceType !== "external" && inv.studentId !== "EXTERNAL")
    }

    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.parentName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(inv => inv.status === statusFilter)
    }

    if (gradeFilter !== "all" && currentTab === "student") {
      filtered = filtered.filter(inv => inv.studentGrade === gradeFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(inv => inv.issueDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(inv => inv.issueDate <= dateTo)
    }

    setFilteredInvoices(filtered)
    setCurrentPage(1)
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredInvoices.length / pageSize)
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredInvoices.slice(startIndex, startIndex + pageSize)
  }, [filteredInvoices, currentPage, pageSize])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setAcademicYearFilter("2024-2025")
    setTermFilter("all")
    setStatusFilter("all")
    setGradeFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredInvoices(invoices)
    setCurrentPage(1)
  }

  const openInvoiceDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsModalOpen(true)
  }

  const openViewModal = (invoice: Invoice) => {
    const modalData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentName: invoice.studentName,
      studentId: invoice.studentId,
      grade: invoice.studentGrade,
      parentEmail: invoice.parentEmail,
      amount: invoice.finalAmount,
      total: invoice.finalAmount,
      status: invoice.status,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      category: "Invoice",
      academicYear: "2024-2025",
      items: invoice.items.map(item => ({
        name: item.description,
        description: item.description,
        amount: item.discountedAmount,
        quantity: 1
      })),
      student: {
        name: invoice.studentName,
        id: invoice.studentId,
        grade: invoice.studentGrade,
        parentEmail: invoice.parentEmail,
        parentName: invoice.parentName
      }
    }

    // Use new navigation instead of modal
    if (onNavigateToView) {
      onNavigateToView("invoice", modalData)
    } else {
      // Fallback to modal if navigation function not provided
      setViewModalData(modalData)
      setIsViewModalOpen(true)
    }
  }

  const handleEditInvoice = (data: any) => {
    setIsViewModalOpen(false)
    // Open edit modal or navigate to edit page
    toast.success("Edit functionality would be implemented here")
  }

  const handleDownloadInvoice = (data: any) => {
    toast.success(`Downloading invoice ${data.invoiceNumber}...`)
    // Implement download logic
  }

  const handlePrintInvoice = (data: any) => {
    toast.success(`Printing invoice ${data.invoiceNumber}...`)
    // Implement print logic
  }

  const closeInvoiceModal = () => {
    setIsModalOpen(false)
    setSelectedInvoice(null)
  }

  const openCreateModal = () => {
    setIsCreateModalOpen(true)
    resetCreateForm()
  }

  const closeCreateModal = () => {
    setIsCreateModalOpen(false)
    resetCreateForm()
  }

  const openEditModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setEditingDueDate(invoice.dueDate)
    setEditingNotes(invoice.notes || "")
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedInvoice(null)
    setEditingDueDate(undefined)
    setEditingNotes("")
  }

  const saveEditedInvoice = () => {
    if (!selectedInvoice || !editingDueDate) return

    const updatedInvoices = invoices.map(inv =>
      inv.id === selectedInvoice.id
        ? { ...inv, dueDate: editingDueDate, notes: editingNotes }
        : inv
    )
    setInvoices(updatedInvoices)

    // Update localStorage
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        const savedInvoices = JSON.parse(stored)
        const updatedSavedInvoices = savedInvoices.map((inv: any) =>
          inv.id === selectedInvoice.id
            ? { ...inv, dueDate: editingDueDate.toISOString().split('T')[0], notes: editingNotes }
            : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to save edited invoice:", error)
    }

    toast.success(`Invoice ${selectedInvoice.invoiceNumber} saved`)
    closeEditModal()
  }

  const saveAndSendInvoice = () => {
    if (!selectedInvoice || !editingDueDate) return

    const updatedInvoices = invoices.map(inv =>
      inv.id === selectedInvoice.id
        ? { ...inv, dueDate: editingDueDate, notes: editingNotes, status: "sent" as const }
        : inv
    )
    setInvoices(updatedInvoices)

    // Update localStorage
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        const savedInvoices = JSON.parse(stored)
        const updatedSavedInvoices = savedInvoices.map((inv: any) =>
          inv.id === selectedInvoice.id
            ? { ...inv, dueDate: editingDueDate.toISOString().split('T')[0], notes: editingNotes, status: "sent" }
            : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to save and send invoice:", error)
    }

    toast.success(`Invoice ${selectedInvoice.invoiceNumber} saved and sent to ${selectedInvoice.parentEmail}`)
    closeEditModal()
  }

  const deleteInvoice = () => {
    if (!selectedInvoice) return

    // Remove from state
    const updatedInvoices = invoices.filter(inv => inv.id !== selectedInvoice.id)
    setInvoices(updatedInvoices)

    // Remove from localStorage
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        const savedInvoices = JSON.parse(stored)
        const updatedSavedInvoices = savedInvoices.filter((inv: any) => inv.id !== selectedInvoice.id)
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to delete invoice:", error)
    }

    toast.success(`Invoice ${selectedInvoice.invoiceNumber} deleted`)
    closeEditModal()
  }

  const resetCreateForm = () => {
    setSelectedGrade("")
    setSelectedTemplate(null)
    setStudentSelectionType("individual")
    setSearchStudentTerm("")
    setSelectedStudents([])
    setCsvFile(null)
    setCsvStudents([])
    setAvailableItems([])
    setSelectedItems([])
  }

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade)
    setSelectedStudents([])
    setCsvStudents([])
    setCsvFile(null)
    setSelectedItems([])

    // Filter available items for this grade
    const gradeItems = mockPreCreatedItems.filter(item =>
      item.isActive && item.applicableGrades.includes(grade)
    )
    setAvailableItems(gradeItems)
  }

  const filteredStudents = mockStudents.filter(student =>
    (student.id.toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
      student.name.toLowerCase().includes(searchStudentTerm.toLowerCase())) &&
    student.grade === selectedGrade &&
    !selectedStudents.find(s => s.id === student.id)
  )

  const handleIndividualStudentSelect = (student: any) => {
    setSelectedStudents([...selectedStudents, student])
    setSearchStudentTerm("")
  }

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId))
  }

  const handleSelectAllStudents = () => {
    const gradeStudents = mockStudents.filter(s => s.grade === selectedGrade)
    setSelectedStudents(gradeStudents)
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
      // Simulate CSV parsing
      const mockCsvData = [
        { id: "ST001301", name: "CSV Student 1", grade: selectedGrade, parentName: "Parent 1", email: "parent1@email.com" },
        { id: "ST001302", name: "CSV Student 2", grade: selectedGrade, parentName: "Parent 2", email: "parent2@email.com" },
        { id: "ST001303", name: "CSV Student 3", grade: selectedGrade, parentName: "Parent 3", email: "parent3@email.com" },
      ]
      setCsvStudents(mockCsvData)
      setSelectedStudents(mockCsvData)
      toast.success(`Loaded ${mockCsvData.length} students from CSV`)
    }
  }

  const handleItemSelect = (item: PreCreatedItem) => {
    if (!selectedItems.find(i => i.id === item.id)) {
      setSelectedItems([...selectedItems, item])
    }
  }

  const handleItemRemove = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== itemId))
  }

  const openAddItemModal = () => {
    setNewItem({ description: "", amount: "", discountPercent: "" })
    setIsAddItemModalOpen(true)
  }

  const closeAddItemModal = () => {
    setIsAddItemModalOpen(false)
  }

  const handleAddItem = () => {
    if (!newItem.description || !newItem.amount) {
      toast.error("Please fill in required fields")
      return
    }

    const amount = parseFloat(newItem.amount)
    const discountPercent = parseFloat(newItem.discountPercent || "0")
    const discountedAmount = amount * (1 - discountPercent / 100)

    const item: InvoiceItem = {
      id: (invoiceItems.length + 1).toString(),
      description: newItem.description,
      amount,
      discountPercent,
      discountedAmount
    }

    setInvoiceItems([...invoiceItems, item])
    closeAddItemModal()
    toast.success("Item added successfully")
  }

  const removeItem = (itemId: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== itemId))
    toast.success("Item removed")
  }

  const updateItemDiscount = (itemId: string, discountPercent: number) => {
    setInvoiceItems(invoiceItems.map(item => {
      if (item.id === itemId) {
        const discountedAmount = item.amount * (1 - discountPercent / 100)
        return { ...item, discountPercent, discountedAmount }
      }
      return item
    }))
  }

  const calculateTotals = () => {
    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.amount, 0)
    const finalAmount = invoiceItems.reduce((sum, item) => sum + item.discountedAmount, 0)
    const discountAmount = totalAmount - finalAmount
    return { totalAmount, finalAmount, discountAmount }
  }

  const handleCreateInvoice = () => {
    if (selectedStudents.length === 0 || selectedItems.length === 0) {
      toast.error("Please select students and items")
      return
    }

    const totalItems = selectedItems.reduce((sum, item) => sum + item.amount, 0)

    toast.success(`Created ${selectedStudents.length} invoices with ${selectedItems.length} items each - Total per invoice: ₿${totalItems.toLocaleString()}`)
    closeCreateModal()
  }

  const sendInvoice = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      // Update invoice status to "sent"
      const updatedInvoices = invoices.map(inv =>
        inv.id === invoiceId ? { ...inv, status: "sent" as const } : inv
      )
      setInvoices(updatedInvoices)

      // Update localStorage
      try {
        const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
        if (stored) {
          const savedInvoices = JSON.parse(stored)
          const updatedSavedInvoices = savedInvoices.map((inv: any) =>
            inv.id === invoiceId ? { ...inv, status: "sent" } : inv
          )
          localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
        }
      } catch (error) {
        console.error("Failed to update invoice status in localStorage:", error)
      }

      toast.success(`Invoice ${invoice.invoiceNumber} sent to ${invoice.parentEmail}`)
    }
  }

  const downloadInvoice = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      toast.success(`Invoice ${invoice.invoiceNumber} downloaded`)
    }
  }

  // Approval handlers
  const handleApproveInvoice = (invoice: Invoice) => {
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoice.id
        ? {
          ...inv,
          status: "approved" as const,
          approvedBy: "Admin",
          approvedAt: new Date()
        }
        : inv
    )
    setInvoices(updatedInvoices)

    // Update localStorage
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        const savedInvoices = JSON.parse(stored)
        const updatedSavedInvoices = savedInvoices.map((inv: any) =>
          inv.id === invoice.id
            ? {
              ...inv,
              status: "approved",
              approvedBy: "Admin",
              approvedAt: new Date().toISOString()
            }
            : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to update invoice approval in localStorage:", error)
    }

    toast.success(`Invoice ${invoice.invoiceNumber} has been approved`)
    setIsApprovalDialogOpen(false)
    setSelectedInvoiceForApproval(null)
  }

  const handleRejectInvoice = (invoice: Invoice, reason: string) => {
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoice.id
        ? {
          ...inv,
          status: "rejected" as const,
          rejectedReason: reason
        }
        : inv
    )
    setInvoices(updatedInvoices)

    // Update localStorage
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        const savedInvoices = JSON.parse(stored)
        const updatedSavedInvoices = savedInvoices.map((inv: any) =>
          inv.id === invoice.id
            ? {
              ...inv,
              status: "rejected",
              rejectedReason: reason
            }
            : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to update invoice rejection in localStorage:", error)
    }

    toast.success(`Invoice ${invoice.invoiceNumber} has been rejected`)
    setIsApprovalDialogOpen(false)
    setSelectedInvoiceForApproval(null)
    setRejectionReason("")
  }

  const openApprovalDialog = (invoice: Invoice, action: "approve" | "reject") => {
    setSelectedInvoiceForApproval(invoice)
    setApprovalAction(action)
    setRejectionReason("")
    setIsApprovalDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" />{t("common.draft")}</Badge>
      case "pending_approval":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />{t("invoice.pendingApproval")}</Badge>
      case "approved":
        return <Badge className="bg-purple-100 text-purple-800"><CheckCircle className="w-3 h-3 mr-1" />{t("common.approved")}</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800"><X className="w-3 h-3 mr-1" />{t("common.rejected")}</Badge>
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800"><Mail className="w-3 h-3 mr-1" />{t("common.sent")}</Badge>
      case "paid":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t("common.paid")}</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />{t("common.overdue")}</Badge>
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800"><X className="w-3 h-3 mr-1" />{t("common.cancelled")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Filter invoices based on active tab
  const tabFilteredInvoices = invoices.filter(inv => {
    if (invoiceTypeTab === "external") {
      return inv.invoiceType === "external" || inv.studentId === "EXTERNAL"
    } else {
      return inv.invoiceType !== "external" && inv.studentId !== "EXTERNAL"
    }
  })

  const summaryStats = {
    total: tabFilteredInvoices.length,
    draft: tabFilteredInvoices.filter(inv => inv.status === "draft").length,
    pendingApproval: tabFilteredInvoices.filter(inv => inv.status === "pending_approval").length,
    approved: tabFilteredInvoices.filter(inv => inv.status === "approved").length,
    rejected: tabFilteredInvoices.filter(inv => inv.status === "rejected").length,
    sent: tabFilteredInvoices.filter(inv => inv.status === "sent").length,
    paid: tabFilteredInvoices.filter(inv => inv.status === "paid").length,
    overdue: tabFilteredInvoices.filter(inv => inv.status === "overdue").length,
    totalAmount: tabFilteredInvoices.reduce((sum, inv) => sum + inv.finalAmount, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("invoice.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("invoice.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => { reloadInvoices(); toast.success(t("invoice.refreshed")) }}>
            <RefreshCw className="w-4 h-4" />
            {t("common.refresh")}
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="w-4 h-4" />
            {t("invoice.importExcel")}
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            {t("invoice.exportReport")}
          </Button>
          <Button onClick={() => onNavigateToSubPage('invoice-creation')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t("invoice.createInvoice")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("invoice.totalInvoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("invoice.pendingApproval")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summaryStats.pendingApproval}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("common.approved")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summaryStats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("common.sent")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("common.paid")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.paid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("common.overdue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.overdue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("invoice.totalAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{summaryStats.totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Type Tabs */}
      <Tabs value={invoiceTypeTab} onValueChange={(value) => setInvoiceTypeTab(value as "student" | "external")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="student" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            {t("invoice.studentInvoices")}
          </TabsTrigger>
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            {t("invoice.externalInvoices")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="w-4 h-4" />
                  {t("invoice.searchFilter")}
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={applyFilters} className="h-9">{t("invoice.apply")}</Button>
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
                  <SearchInput
                    placeholder={t("invoice.searchPlaceholder")}
                    value={searchTerm}
                    onChange={setSearchTerm}
                    className="h-9"
                  />
                </div>

                {/* Academic Year */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("invoice.academicYear")}</label>
                  <Select value={academicYearFilter} onValueChange={(value) => {
                    setAcademicYearFilter(value)
                    setTermFilter("all") // Reset term when year changes
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allYears")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allYears")}</SelectItem>
                      {academicYears.map(year => (
                        <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Term */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("invoice.term")}</label>
                  <Select value={termFilter} onValueChange={setTermFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allTerms")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allTerms")}</SelectItem>
                      {availableTerms.map(term => (
                        <SelectItem key={term.id} value={term.name}>{term.name}</SelectItem>
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
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allYearGroups")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allYearGroups")}</SelectItem>
                      {grades.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                      <SelectItem value="pending_approval">
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{t("invoice.pendingApproval")}</Badge>
                      </SelectItem>
                      <SelectItem value="approved">
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">{t("common.approved")}</Badge>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t("common.rejected")}</Badge>
                      </SelectItem>
                      <SelectItem value="draft">
                        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{t("common.draft")}</Badge>
                      </SelectItem>
                      <SelectItem value="sent">
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{t("common.sent")}</Badge>
                      </SelectItem>
                      <SelectItem value="paid">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t("common.paid")}</Badge>
                      </SelectItem>
                      <SelectItem value="overdue">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t("common.overdue")}</Badge>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">{t("common.cancelled")}</Badge>
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
                        <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "dd/MM/yy") : t("date.from")}
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
                          {dateTo ? format(dateTo, "dd/MM/yy") : t("date.to")}
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
            <p className="text-sm text-muted-foreground">
              {t("invoice.show")} {filteredInvoices.length} / {invoices.length} {t("invoice.entries")}
            </p>
          </div>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoice.invoiceNumber")}</TableHead>
                    <TableHead>{t("invoice.student")}</TableHead>
                    <TableHead>{t("invoice.yearGroup")}</TableHead>
                    <TableHead>{t("common.amount")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("invoice.issueDate")}</TableHead>
                    <TableHead>{t("invoice.dueDate")}</TableHead>
                    <TableHead className="text-center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">
                        {invoice.invoiceNumber}
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
                      <TableCell>
                        <div className="font-medium">
                          ₿{invoice.finalAmount.toLocaleString()}
                        </div>
                        {invoice.discountAmount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Discount: ₿{invoice.discountAmount.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{format(invoice.issueDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{format(invoice.dueDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              // Open Modal (view only)
                              setSelectedInvoice(invoice)
                              setIsModalOpen(true)
                            }}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={invoice.status !== "draft"}
                            className={invoice.status !== "draft" ? "opacity-30 cursor-not-allowed" : ""}
                            onClick={() => {
                              if (invoice.status !== "draft") return
                              // Navigate to full page (can edit)
                              if (onNavigateToView) {
                                const invoiceData = {
                                  ...invoice,
                                  invoiceNumber: invoice.invoiceNumber,
                                  studentName: invoice.studentName,
                                  studentId: invoice.studentId,
                                  grade: invoice.studentGrade,
                                  parentEmail: invoice.parentEmail,
                                  amount: invoice.finalAmount,
                                  total: invoice.finalAmount,
                                  status: invoice.status,
                                  issueDate: invoice.issueDate.toISOString(),
                                  dueDate: invoice.dueDate.toISOString(),
                                  items: invoice.items.map(item => ({
                                    name: item.description,
                                    description: item.description,
                                    quantity: 1,
                                    amount: item.discountedAmount
                                  })),
                                  invoiceType: "student",
                                  viewOnly: false  // Can edit
                                }
                                onNavigateToView("invoice", invoiceData)
                              } else {
                                setSelectedInvoice(invoice)
                                setIsEditModalOpen(true)
                              }
                            }}
                            title={invoice.status === "draft" ? "Edit" : "Cannot edit (not draft)"}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadInvoice(invoice.id)}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => sendInvoice(invoice.id)}
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          {invoice.status === "pending_approval" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => openApprovalDialog(invoice, "approve")}
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openApprovalDialog(invoice, "reject")}
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {filteredInvoices.length > 0 && (
                <div className="flex items-center justify-between border-t p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t("invoice.show")}</span>
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
                    <span>{t("invoice.entries")}</span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {t("invoice.show")} {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredInvoices.length)} / {filteredInvoices.length} {t("invoice.entries")}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t("invoice.previous")}
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
                      {t("invoice.next")}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* External Invoice Tab */}
        <TabsContent value="external" className="space-y-4">
          {/* Filters for External */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="w-4 h-4" />
                  {t("invoice.searchFilter")}
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={() => applyFilters("external")} className="h-9">{t("invoice.apply")}</Button>
                  <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("common.search")}</label>
                  <SearchInput
                    placeholder={t("invoice.searchPlaceholder")}
                    value={searchTerm}
                    onChange={setSearchTerm}
                    className="h-9"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                      <SelectItem value="pending_approval">
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{t("invoice.pendingApproval")}</Badge>
                      </SelectItem>
                      <SelectItem value="approved">
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">{t("common.approved")}</Badge>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t("common.rejected")}</Badge>
                      </SelectItem>
                      <SelectItem value="draft">{t("common.draft")}</SelectItem>
                      <SelectItem value="sent">{t("common.sent")}</SelectItem>
                      <SelectItem value="paid">{t("common.paid")}</SelectItem>
                      <SelectItem value="overdue">{t("common.overdue")}</SelectItem>
                      <SelectItem value="cancelled">{t("common.cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("invoice.fromDate")}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-start font-normal">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dateFrom ? format(dateFrom, "PP") : t("invoice.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dateFrom || undefined} onSelect={(date) => setDateFrom(date || null)} />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date To */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">{t("invoice.toDate")}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-start font-normal">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dateTo ? format(dateTo, "PP") : t("invoice.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dateTo || undefined} onSelect={(date) => setDateTo(date || null)} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* External Invoice Table */}
          <Card>
            <CardContent className="pt-6">
              {filteredInvoices.length === 0 ? (
                <EmptyDataState
                  title={t("invoice.noExternalInvoices")}
                  description={t("invoice.createExternalDesc")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("invoice.invoiceNumber")}</TableHead>
                      <TableHead>{t("invoice.recipient")}</TableHead>
                      <TableHead>{t("invoice.event")}</TableHead>
                      <TableHead>{t("common.amount")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>{t("invoice.issueDate")}</TableHead>
                      <TableHead>{t("invoice.dueDate")}</TableHead>
                      <TableHead className="text-center">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.recipientName || invoice.studentName}</div>
                            <div className="text-sm text-muted-foreground">{invoice.parentEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{invoice.eventName || "-"}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">฿{invoice.finalAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            invoice.status === "paid" ? "default" :
                              invoice.status === "sent" ? "secondary" :
                                invoice.status === "draft" ? "outline" :
                                  invoice.status === "overdue" ? "destructive" : "outline"
                          }>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(invoice.issueDate, "MMM dd, yyyy")}</TableCell>
                        <TableCell>{format(invoice.dueDate, "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Open Modal (view only)
                                setSelectedInvoice(invoice)
                                setIsModalOpen(true)
                              }}
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={invoice.status !== "draft"}
                              className={invoice.status !== "draft" ? "opacity-30 cursor-not-allowed" : ""}
                              onClick={() => {
                                if (invoice.status !== "draft") return
                                // Navigate to full page (can edit)
                                if (onNavigateToView) {
                                  const invoiceData = {
                                    ...invoice,
                                    invoiceNumber: invoice.invoiceNumber,
                                    studentName: invoice.recipientName || invoice.studentName,
                                    studentId: invoice.studentId,
                                    grade: invoice.studentGrade,
                                    parentEmail: invoice.parentEmail,
                                    amount: invoice.finalAmount,
                                    total: invoice.finalAmount,
                                    status: invoice.status,
                                    issueDate: invoice.issueDate.toISOString(),
                                    dueDate: invoice.dueDate.toISOString(),
                                    items: invoice.items.map(item => ({
                                      name: item.description,
                                      description: item.description,
                                      quantity: 1,
                                      amount: item.discountedAmount
                                    })),
                                    // External invoice specific fields
                                    invoiceType: invoice.invoiceType || "external",
                                    recipientName: invoice.recipientName,
                                    recipientAddress: invoice.recipientAddress,
                                    eventName: invoice.eventName,
                                    viewOnly: false  // Can edit
                                  }
                                  onNavigateToView("invoice", invoiceData)
                                } else {
                                  setSelectedInvoice(invoice)
                                  setIsEditModalOpen(true)
                                }
                              }}
                              title={invoice.status === "draft" ? "Edit" : "Cannot edit (not draft)"}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadInvoice(invoice.id)}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendInvoice(invoice.id)}
                              title="Send Email"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                            {invoice.status === "pending_approval" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => openApprovalDialog(invoice, "approve")}
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => openApprovalDialog(invoice, "reject")}
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination for External */}
              {filteredInvoices.length > 0 && (
                <div className="flex items-center justify-between border-t p-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t("invoice.show")}</span>
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
                    <span>{t("invoice.entries")}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("invoice.show")} {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredInvoices.length)} / {filteredInvoices.length} {t("invoice.entries")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t("invoice.previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {t("invoice.next")}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[75vh] overflow-y-auto p-6">
          {selectedInvoice && (
            <div className="bg-white">
              {/* School Header */}
              <div className="text-center pt-6 pb-4 border-b">
                <img
                  src={SchoolLogo}
                  alt="King's College International School Bangkok"
                  style={{ height: '120px', margin: '0 auto 12px auto', display: 'block' }}
                />
                <h2 className="text-sm font-semibold tracking-wide text-gray-800">KING'S COLLEGE INTERNATIONAL SCHOOL BANGKOK</h2>
                <p className="text-xs text-gray-500 mt-1">727 Ratchadapisek Road, Bang Phongphang, Yannawa, Bangkok 10120, Thailand</p>
                <p className="text-xs text-gray-500">+66 (0) 2481 9955, finance@kingsbangkok.ac.th, www.kingsbangkok.ac.th</p>
              </div>

              {/* Invoice Title */}
              <div className="text-center py-4">
                <h1 className="text-2xl font-bold tracking-wider">INVOICE</h1>
                <Badge variant="outline" className="mt-2">
                  <Eye className="w-3 h-3 mr-1" />
                  View Only
                </Badge>
              </div>

              {/* Student & Invoice Info */}
              <div className="px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-300">
                  {/* Left - Student/Recipient Info */}
                  <div className="p-6 pr-8">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                      {selectedInvoice.invoiceType === "external" || selectedInvoice.studentId === "EXTERNAL"
                        ? "Recipient Information"
                        : "Student Information"}
                    </h3>
                    <div className="space-y-3">
                      {selectedInvoice.invoiceType === "external" || selectedInvoice.studentId === "EXTERNAL" ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Recipient Name</span>
                            <span className="text-sm font-medium text-gray-800">{selectedInvoice.recipientName || selectedInvoice.studentName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Email</span>
                            <span className="text-sm font-medium text-gray-800">{selectedInvoice.parentEmail}</span>
                          </div>
                          {selectedInvoice.recipientAddress && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">Address</span>
                              <span className="text-sm font-medium text-gray-800">{selectedInvoice.recipientAddress}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Student ID</span>
                            <span className="text-sm font-medium text-gray-800">{selectedInvoice.studentId}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Student Name</span>
                            <span className="text-sm font-medium text-gray-800">{selectedInvoice.studentName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Year Group</span>
                            <span className="text-sm font-medium text-gray-800">{selectedInvoice.studentGrade}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Contact Name</span>
                            <span className="text-sm font-medium text-gray-800">{selectedInvoice.parentName}</span>
                          </div>
                          {/* New Student Indicator - if Application/Registration fees exist */}
                          {selectedInvoice.items.some(item =>
                            item.description.toLowerCase().includes('application') ||
                            item.description.toLowerCase().includes('registration fee') ||
                            item.description.toLowerCase().includes('security deposit')
                          ) && (
                              <div className="flex justify-between items-center pt-2 border-t mt-2">
                                <span className="text-sm text-gray-500">Status</span>
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                                  New Student
                                </Badge>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                  {/* Right - Invoice Info */}
                  <div className="p-6 pl-8">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Invoice Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Invoice No.</span>
                        <span className="text-sm font-medium text-gray-800">{selectedInvoice.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Invoice Date</span>
                        <span className="text-sm font-medium text-gray-800">{format(selectedInvoice.issueDate, "dd MMM yyyy")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Due Date</span>
                        <span className="text-sm font-medium text-red-600">{format(selectedInvoice.dueDate, "dd MMM yyyy")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {selectedInvoice.invoiceType === "external" || selectedInvoice.studentId === "EXTERNAL"
                            ? "Event"
                            : "School Year"}
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {selectedInvoice.invoiceType === "external" || selectedInvoice.studentId === "EXTERNAL"
                            ? (selectedInvoice.eventName || "-")
                            : getAcademicYear(selectedInvoice.issueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="px-8 pb-6">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="py-3 px-4 text-left font-semibold w-12">No.</th>
                        <th className="py-3 px-4 text-left font-semibold">Description</th>
                        <th className="py-3 px-4 text-right font-semibold w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => {
                        const isRegistrationFee =
                          item.description.toLowerCase().includes('application') ||
                          item.description.toLowerCase().includes('registration fee') ||
                          item.description.toLowerCase().includes('security deposit')
                        return (
                          <tr key={item.id} className={`border-b last:border-b-0 ${isRegistrationFee ? 'bg-amber-50' : ''}`}>
                            <td className="py-3 px-4 align-top text-gray-600">{index + 1}</td>
                            <td className="py-3 px-4 align-top" style={{ wordBreak: 'break-word' }}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{item.description}</span>
                                {isRegistrationFee && (
                                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                    New Student Fee
                                  </Badge>
                                )}
                              </div>
                              {item.discountPercent > 0 && (
                                <span className="text-gray-400 text-xs">(-{item.discountPercent}%)</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-medium whitespace-nowrap align-top">
                              {formatCurrency(item.discountedAmount)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {/* Subtotal, Discounts, Late Fee, Total */}
                  {(() => {
                    // Calculate subtotal (sum of all items before discounts)
                    const subtotal = selectedInvoice.items.reduce((sum, item) => sum + item.amount, 0)

                    // Find student from context
                    const student = students.find(s =>
                      s.studentId === selectedInvoice.studentId ||
                      s.id === selectedInvoice.studentId ||
                      `${s.firstName} ${s.lastName}` === selectedInvoice.studentName
                    )

                    const discountLines: { name: string; amount: number; percent?: number }[] = []

                    // 1. Sibling discount
                    if (student && student.childOrder >= 2 && selectedInvoice.invoiceType !== "external" && selectedInvoice.studentId !== "EXTERNAL") {
                      const siblingPercent = getSiblingDiscount(student)
                      if (siblingPercent > 0) {
                        const siblingAmount = Math.round(subtotal * siblingPercent / 100)
                        discountLines.push({
                          name: `Sibling Discount (Child #${student.childOrder})`,
                          amount: siblingAmount,
                          percent: siblingPercent
                        })
                      }
                    }

                    // 2. Registration Fee Waiver - check if any item has waiver
                    const registrationFeeWaiver = selectedInvoice.items
                      .filter(item => item.description.toLowerCase().includes('registration') && item.discountPercent > 0)
                      .reduce((sum, item) => sum + (item.amount - item.discountedAmount), 0)
                    if (registrationFeeWaiver > 0) {
                      discountLines.push({
                        name: "Registration Fee Waiver",
                        amount: registrationFeeWaiver
                      })
                    }

                    // 3. Student group discounts
                    if (selectedInvoice.invoiceType !== "external" && selectedInvoice.studentId !== "EXTERNAL") {
                      const groupDiscounts = getStudentGroupDiscounts(selectedInvoice.studentId)
                      groupDiscounts.forEach(group => {
                        const groupAmount = group.discountType === "percentage"
                          ? Math.round(subtotal * group.discountPercentage / 100)
                          : group.fixedAmount
                        discountLines.push({
                          name: group.name,
                          amount: groupAmount,
                          percent: group.discountType === "percentage" ? group.discountPercentage : undefined
                        })
                      })
                    }

                    // 4. Fee Waiver Program (฿75,000/term for eligible students)
                    if (student && selectedInvoice.invoiceType !== "external" && selectedInvoice.studentId !== "EXTERNAL") {
                      const feeWaiverEligibility = checkFeePrivilegeEligibility(
                        student,
                        student.academicYear || selectedInvoice.academicYear,
                        student.enrollmentTerm || "term1"
                      )
                      if (feeWaiverEligibility.eligible && feeWaiverEligibility.creditPerTerm) {
                        discountLines.push({
                          name: `Fee Waiver Program`,
                          amount: feeWaiverEligibility.creditPerTerm
                        })
                      }
                    }

                    // 5. Staff Child (50%)
                    if (student && student.notes?.toLowerCase().includes('staff')) {
                      const staffAmount = Math.round(subtotal * 50 / 100)
                      discountLines.push({
                        name: "Staff Child Discount",
                        amount: staffAmount,
                        percent: 50
                      })
                    }

                    // 6. Scholarship
                    if (student && student.notes?.toLowerCase().includes('scholarship')) {
                      const scholarshipAmount = subtotal // 100% scholarship
                      discountLines.push({
                        name: "Scholarship",
                        amount: scholarshipAmount,
                        percent: 100
                      })
                    }

                    // 7. Early Bird (5%)
                    if (student && student.notes?.toLowerCase().includes('early bird')) {
                      const earlyBirdAmount = Math.round(subtotal * 5 / 100)
                      discountLines.push({
                        name: "Early Bird Discount",
                        amount: earlyBirdAmount,
                        percent: 5
                      })
                    }

                    // Get registration fees from saved invoice data (new students)
                    const savedRegistrationFees = (selectedInvoice as any).registrationFees || []
                    const savedIdCharges = (selectedInvoice as any).idCharges || 0
                    const isNewStudent = (selectedInvoice as any).isNewStudent || savedRegistrationFees.length > 0
                    const registrationFeesTotal = savedRegistrationFees.reduce((sum: number, fee: any) => sum + fee.amount, 0)

                    // Calculate late fee (1.5% if overdue)
                    const today = new Date()
                    const dueDate = new Date(selectedInvoice.dueDate)
                    const isOverdue = today > dueDate && selectedInvoice.status !== "paid"
                    const lateFeePercent = 1.5
                    const lateFeeAmount = isOverdue ? Math.round(subtotal * lateFeePercent / 100) : 0

                    // Calculate total discounts
                    const totalDiscounts = discountLines.reduce((sum, d) => sum + d.amount, 0)

                    // Calculate subtotal before ID Charges
                    const subtotalBeforeIdCharges = subtotal - totalDiscounts + registrationFeesTotal + lateFeeAmount

                    // Use saved ID Charges or calculate if not saved
                    const idCharges = savedIdCharges > 0 ? savedIdCharges : Math.round(subtotalBeforeIdCharges * 0.03)

                    // Final total
                    const finalTotal = subtotalBeforeIdCharges + idCharges

                    // Separate discounts: Fee Waiver Program vs others
                    const feeWaiverDiscount = discountLines.find(d => d.name.includes('Fee Waiver Program'))
                    const otherDiscounts = discountLines.filter(d => !d.name.includes('Fee Waiver Program'))

                    // Find specific registration fees
                    const applicationFee = savedRegistrationFees.find((f: any) => f.name.includes('Application Fee'))
                    const registrationFee = savedRegistrationFees.find((f: any) => f.name.includes('Registration Fee') && !f.name.includes('Application'))
                    const securityDeposit = savedRegistrationFees.find((f: any) => f.name.includes('Security Deposit'))

                    // Check for Security Deposit Fee Waiver (stored separately or calculate)
                    const savedSecurityDepositWaiver = (selectedInvoice as any).securityDepositWaiver || 0

                    return (
                      <div className="border-t">
                        {/* 1. Other Discounts (NOT Fee Waiver Program) - Green */}
                        {otherDiscounts.map((discount, idx) => (
                          <div key={idx} className="flex justify-between items-center px-4 py-2 border-t">
                            <span className="text-sm text-green-600">
                              {discount.name} {discount.percent ? `(${discount.percent}%)` : ''}
                            </span>
                            <span className="text-sm font-medium text-green-600">
                              -{formatCurrency(discount.amount)}
                            </span>
                          </div>
                        ))}

                        {/* 2. Application Fee - Orange */}
                        {applicationFee && (
                          <div className="flex justify-between items-center px-4 py-2 border-t">
                            <span className="text-sm text-orange-600">{applicationFee.name}</span>
                            <span className="text-sm font-medium text-orange-600">+{formatCurrency(applicationFee.amount)}</span>
                          </div>
                        )}

                        {/* 3. Registration Fee - Orange */}
                        {registrationFee && (
                          <div className="flex justify-between items-center px-4 py-2 border-t">
                            <span className="text-sm text-orange-600">{registrationFee.name}</span>
                            <span className="text-sm font-medium text-orange-600">+{formatCurrency(registrationFee.amount)}</span>
                          </div>
                        )}

                        {/* 4. Registration Fee Waiver (Fee Waiver Program) - Green */}
                        {feeWaiverDiscount && (
                          <div className="flex justify-between items-center px-4 py-2 border-t">
                            <span className="text-sm text-green-600">
                              Registration Fee Waiver (฿{feeWaiverDiscount.amount.toLocaleString()}/term)
                            </span>
                            <span className="text-sm font-medium text-green-600">
                              -{formatCurrency(feeWaiverDiscount.amount)}
                            </span>
                          </div>
                        )}

                        {/* 5. Security Deposit - Orange */}
                        {securityDeposit && (
                          <div className="flex justify-between items-center px-4 py-2 border-t">
                            <span className="text-sm text-orange-600">{securityDeposit.name}</span>
                            <span className="text-sm font-medium text-orange-600">+{formatCurrency(securityDeposit.amount)}</span>
                          </div>
                        )}

                        {/* 6. Security Deposit Fee Waiver - Green */}
                        {savedSecurityDepositWaiver > 0 && (
                          <div className="flex justify-between items-center px-4 py-2 border-t">
                            <span className="text-sm text-green-600">Security Deposit Fee Waiver</span>
                            <span className="text-sm font-medium text-green-600">-{formatCurrency(savedSecurityDepositWaiver)}</span>
                          </div>
                        )}

                        {/* 7. ID Charges (Purple, 3%) */}
                        {idCharges > 0 && (
                          <div className="flex justify-between items-center px-4 py-2 border-t">
                            <span className="text-sm text-purple-600">
                              ID Charges (3%)
                            </span>
                            <span className="text-sm font-medium text-purple-600">
                              +{formatCurrency(idCharges)}
                            </span>
                          </div>
                        )}

                        {/* 8. Late Fee (Red) */}
                        {lateFeeAmount > 0 && (
                          <div className="flex justify-between items-center px-4 py-2 border-t">
                            <span className="text-sm text-red-600">
                              Late Payment Fee ({lateFeePercent}%)
                            </span>
                            <span className="text-sm font-medium text-red-600">
                              +{formatCurrency(lateFeeAmount)}
                            </span>
                          </div>
                        )}

                        {/* Amount in Words + Total */}
                        <div className="border-t bg-gray-50 p-4">
                          <div className="text-xs text-gray-500 mb-2">{numberToWords(finalTotal)}</div>
                          <div className="flex justify-between items-center font-bold text-base">
                            <span>TOTAL</span>
                            <span>{formatCurrency(finalTotal)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Payment Methods Preview */}
              <div className="px-8 pb-6">
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Payment methods: </span>
                  <span className="text-gray-500">Credit Card, PromptPay, Bank Counter, WeChat Pay, Alipay, Cash</span>
                </p>
              </div>

              {/* Action Buttons - View Only */}
              <div className="flex items-center justify-end px-8 py-4 border-t bg-gray-50">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={closeInvoiceModal}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      sendInvoice(selectedInvoice.id)
                      closeInvoiceModal()
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Invoice Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Invoice
            </DialogTitle>
            <DialogDescription>
              Create an invoice using templates or custom items for students
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: Select Grade */}
            <div className="space-y-3">
              <h3 className="font-medium">1. Select Grade</h3>
              <Select value={selectedGrade} onValueChange={handleGradeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose grade level" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Items */}
            {selectedGrade && (
              <div className="space-y-4">
                <h3 className="font-medium">2. Select Items</h3>

                {/* Available Items */}
                <div className="space-y-3">
                  <label className="font-medium">Available Items for {selectedGrade}</label>
                  <div className="grid grid-cols-1 gap-3">
                    {availableItems.map((item) => {
                      const isSelected = selectedItems.find(i => i.id === item.id)
                      return (
                        <Card
                          key={item.id}
                          className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                          onClick={() => isSelected ? handleItemRemove(item.id) : handleItemSelect(item)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{item.name}</h4>
                                  <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                <div className="flex items-center gap-4">
                                  <p className="font-medium text-lg">₿{item.amount.toLocaleString()}</p>
                                  <Badge variant="secondary" className="text-xs">
                                    {item.applicableGrades.length} grades
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center">
                                {isSelected ? (
                                  <CheckCircle className="w-5 h-5 text-primary" />
                                ) : (
                                  <Plus className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Items Summary */}
                {selectedItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="font-medium">Selected Items ({selectedItems.length})</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedItems([])}
                      >
                        Clear All
                      </Button>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">{item.description}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.category}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                ₿{item.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleItemRemove(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Items Summary */}
                      <div className="p-4 bg-muted/50 border-t">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total Items:</span>
                            <span>{selectedItems.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Students:</span>
                            <span>{selectedStudents.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Amount per Student:</span>
                            <span>₿{selectedItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-medium text-lg">
                            <span>Total Amount:</span>
                            <span>₿{(selectedItems.reduce((sum, item) => sum + item.amount, 0) * selectedStudents.length).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {availableItems.length === 0 && (
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No items available for this grade</p>
                    <p className="text-sm text-muted-foreground">Please select a different grade or contact admin to add items</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Students */}
            {selectedItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium">3. Select Students</h3>

                {/* Selection Type */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className={`cursor-pointer transition-all ${studentSelectionType === "individual" ? "ring-2 ring-primary" : ""}`}>
                    <CardContent className="p-4" onClick={() => setStudentSelectionType("individual")}>
                      <div className="flex items-center justify-center mb-2">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <h4 className="font-medium text-center text-sm">Individual</h4>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Select specific students
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${studentSelectionType === "csv" ? "ring-2 ring-primary" : ""}`}>
                    <CardContent className="p-4" onClick={() => setStudentSelectionType("csv")}>
                      <div className="flex items-center justify-center mb-2">
                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="font-medium text-center text-sm">CSV Upload</h4>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Upload student list
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${studentSelectionType === "all" ? "ring-2 ring-primary" : ""}`}>
                    <CardContent className="p-4" onClick={() => setStudentSelectionType("all")}>
                      <div className="flex items-center justify-center mb-2">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <h4 className="font-medium text-center text-sm">All Students</h4>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Select entire grade
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Individual Selection */}
                {studentSelectionType === "individual" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        placeholder="Search by Student ID or name"
                        value={searchStudentTerm}
                        onChange={(e) => setSearchStudentTerm(e.target.value)}
                        className=""
                      />
                    </div>

                    {searchStudentTerm && (
                      <div className="border rounded-lg max-h-48 overflow-y-auto">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((student) => (
                            <div
                              key={student.id}
                              className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                              onClick={() => handleIndividualStudentSelect(student)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{student.name}</p>
                                  <p className="text-sm text-muted-foreground">{student.id}</p>
                                </div>
                                <Badge variant="secondary">{student.grade}</Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-muted-foreground">
                            No students found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* CSV Upload */}
                {studentSelectionType === "csv" && (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">Upload CSV file with student information</p>
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="max-w-xs mx-auto"
                      />
                    </div>
                    {csvFile && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-700">
                          <span className="font-medium">File uploaded:</span> {csvFile.name}
                        </p>
                        <p className="text-sm text-green-600">Loaded {csvStudents.length} students</p>
                      </div>
                    )}
                  </div>
                )}

                {/* All Students */}
                {studentSelectionType === "all" && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-blue-700 mb-2">
                        Select all students in {selectedGrade}
                      </p>
                      <p className="text-sm text-blue-600 mb-3">
                        {mockStudents.filter(s => s.grade === selectedGrade).length} students will be selected
                      </p>
                      <Button onClick={handleSelectAllStudents} size="sm">
                        Select All Students
                      </Button>
                    </div>
                  </div>
                )}

                {/* Selected Students Display */}
                {selectedStudents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-medium">Selected Students ({selectedStudents.length})</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStudents([])}
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                          <div>
                            <span className="font-medium">{student.name}</span>
                            <span className="text-muted-foreground ml-2">({student.id})</span>
                          </div>
                          {studentSelectionType === "individual" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveStudent(student.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Create Invoice */}
            {selectedStudents.length > 0 && selectedItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium">4. Create Invoice</h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Invoice Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700">Grade: <span className="font-medium">{selectedGrade}</span></p>
                      <p className="text-blue-700">Students: <span className="font-medium">{selectedStudents.length}</span></p>
                      <p className="text-blue-700">Items per Invoice: <span className="font-medium">{selectedItems.length}</span></p>
                    </div>
                    <div>
                      <p className="text-blue-700">Amount per Student: <span className="font-medium">₿{selectedItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span></p>
                      <p className="text-blue-700">Total Amount: <span className="font-medium">₿{(selectedItems.reduce((sum, item) => sum + item.amount, 0) * selectedStudents.length).toLocaleString()}</span></p>
                      <p className="text-blue-700">Invoices to Create: <span className="font-medium">{selectedStudents.length}</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleCreateInvoice}
                    className="flex-1"
                  >
                    Create {selectedStudents.length} Invoice{selectedStudents.length > 1 ? 's' : ''}
                  </Button>
                  <Button variant="outline" onClick={closeCreateModal}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons when not all steps completed */}
            {(selectedStudents.length === 0 || selectedItems.length === 0) && (
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCreateInvoice}
                  disabled={selectedStudents.length === 0 || selectedItems.length === 0}
                  className="flex-1"
                >
                  Create Invoice
                </Button>
                <Button variant="outline" onClick={closeCreateModal}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Modal */}
      <Dialog open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Add Invoice Item</DialogTitle>
            <DialogDescription>
              Add a new item to the invoice with optional discount
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <Input
                placeholder="Item description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₿) *</label>
              <Input
                type="number"
                placeholder="0"
                value={newItem.amount}
                onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Discount Percentage</label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                max="100"
                value={newItem.discountPercent}
                onChange={(e) => setNewItem({ ...newItem, discountPercent: e.target.value })}
              />
            </div>

            {newItem.amount && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>Original Amount:</span>
                  <span>₿{parseFloat(newItem.amount || "0").toLocaleString()}</span>
                </div>
                {newItem.discountPercent && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Discount ({newItem.discountPercent}%):</span>
                      <span className="text-red-600">
                        -₿{(parseFloat(newItem.amount || "0") * parseFloat(newItem.discountPercent || "0") / 100).toLocaleString()}
                      </span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-medium">
                      <span>Final Amount:</span>
                      <span>
                        ₿{(parseFloat(newItem.amount || "0") * (1 - parseFloat(newItem.discountPercent || "0") / 100)).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleAddItem} className="flex-1">
              Add Item
            </Button>
            <Button variant="outline" onClick={closeAddItemModal}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Modal - View Only (No Edit) */}
      <ViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        type="invoice"
        data={viewModalData}
        onDownload={handleDownloadInvoice}
        onPrint={handlePrintInvoice}
      />

      {/* Import Excel Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import Invoices from Excel
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file (.xlsx, .xls) or CSV file to import multiple invoices at once
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!importFile ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Upload Excel File</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop your file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImportFile(file)
                        // Mock preview data
                        setImportPreview([
                          { studentId: "ST001", studentName: "John Smith", grade: "Year 10", amount: 450000 },
                          { studentId: "ST002", studentName: "Emma Johnson", grade: "Year 8", amount: 420000 },
                          { studentId: "ST003", studentName: "Michael Brown", grade: "Year 12", amount: 480000 },
                        ])
                      }
                    }}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload">
                    <Button variant="outline" className="cursor-pointer" asChild>
                      <span>Select File</span>
                    </Button>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium">{importFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImportFile(null)
                      setImportPreview([])
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {importPreview.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Preview ({importPreview.length} invoices found)</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Student ID</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Year Group</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.map((row, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{row.studentId}</TableCell>
                              <TableCell>{row.studentName}</TableCell>
                              <TableCell>{row.grade}</TableCell>
                              <TableCell className="text-right">฿{row.amount.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Required Columns</h4>
              <p className="text-sm text-blue-700">
                Your Excel file should contain the following columns: Student ID, Student Name, Grade, Parent Name, Parent Email, Amount, Due Date
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsImportDialogOpen(false)
                setImportFile(null)
                setImportPreview([])
              }}>
                Cancel
              </Button>
              <Button
                disabled={!importFile || isImporting}
                onClick={() => {
                  setIsImporting(true)
                  setTimeout(() => {
                    toast.success(`Successfully imported ${importPreview.length} invoices`)
                    setIsImporting(false)
                    setIsImportDialogOpen(false)
                    setImportFile(null)
                    setImportPreview([])
                  }, 1500)
                }}
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {importPreview.length} Invoices
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Draft Invoice Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[75vh] overflow-y-auto p-6">
          {selectedInvoice && (
            <div className="bg-white">
              {/* School Header */}
              <div className="text-center pt-6 pb-4 border-b">
                <img
                  src={SchoolLogo}
                  alt="King's College International School Bangkok"
                  style={{ height: '120px', margin: '0 auto 12px auto', display: 'block' }}
                />
                <h2 className="text-sm font-semibold tracking-wide text-gray-800">KING'S COLLEGE INTERNATIONAL SCHOOL BANGKOK</h2>
                <p className="text-xs text-gray-500 mt-1">727 Ratchadapisek Road, Bang Phongphang, Yannawa, Bangkok 10120, Thailand</p>
                <p className="text-xs text-gray-500">+66 (0) 2481 9955, finance@kingsbangkok.ac.th, www.kingsbangkok.ac.th</p>
              </div>

              {/* Invoice Title */}
              <div className="text-center py-4">
                <h1 className="text-2xl font-bold tracking-wider">INVOICE</h1>
                <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700 border-blue-300">
                  <Edit className="w-3 h-3 mr-1" />
                  Edit Mode
                </Badge>
              </div>

              {/* Student & Invoice Info */}
              <div className="px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-300">
                  {/* Left - Student Info */}
                  <div className="p-6 pr-8">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Student Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Student ID</span>
                        <span className="text-sm font-medium text-gray-800">{selectedInvoice.studentId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Student Name</span>
                        <span className="text-sm font-medium text-gray-800">{selectedInvoice.studentName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Year Group</span>
                        <span className="text-sm font-medium text-gray-800">{selectedInvoice.studentGrade}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Contact Name</span>
                        <span className="text-sm font-medium text-gray-800">{selectedInvoice.parentName}</span>
                      </div>
                    </div>
                  </div>
                  {/* Right - Invoice Info */}
                  <div className="p-6 pl-8">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Invoice Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Invoice No.</span>
                        <span className="text-sm font-medium text-gray-800">{selectedInvoice.invoiceNumber.replace('INV-', '')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Invoice Date</span>
                        <span className="text-sm font-medium text-gray-800">{format(selectedInvoice.issueDate, "dd MMM yyyy")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Due Date</span>
                        <span className="text-sm font-medium text-red-600">{format(selectedInvoice.dueDate, "dd MMM yyyy")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">School Year</span>
                        <span className="text-sm font-medium text-gray-800">{getAcademicYear(selectedInvoice.issueDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discounts Section */}
              <div className="px-8">
                {(() => {
                  // Find student from context
                  const student = students.find(s =>
                    s.studentId === selectedInvoice.studentId ||
                    s.id === selectedInvoice.studentId ||
                    `${s.firstName} ${s.lastName}` === selectedInvoice.studentName
                  )

                  const discounts: { name: string; value: string; color: string }[] = []

                  // Get sibling discount
                  if (student && student.childOrder >= 2) {
                    const siblingPercent = getSiblingDiscount(student)
                    if (siblingPercent > 0) {
                      discounts.push({
                        name: `Sibling (Child #${student.childOrder})`,
                        value: `${siblingPercent}%`,
                        color: "bg-blue-100 text-blue-800"
                      })
                    }
                  }

                  // Get student group discounts
                  const groupDiscounts = getStudentGroupDiscounts(selectedInvoice.studentId)
                  groupDiscounts.forEach(group => {
                    discounts.push({
                      name: group.name,
                      value: group.discountType === "percentage"
                        ? `${group.discountPercentage}%`
                        : `฿${group.fixedAmount.toLocaleString()}`,
                      color: "bg-purple-100 text-purple-800"
                    })
                  })

                  // Fee Waiver Program
                  if (student) {
                    const feeWaiverEligibility = checkFeePrivilegeEligibility(
                      student,
                      student.academicYear || selectedInvoice.academicYear,
                      student.enrollmentTerm || "term1"
                    )
                    if (feeWaiverEligibility.eligible && feeWaiverEligibility.creditPerTerm) {
                      discounts.push({
                        name: "Fee Waiver Program",
                        value: `฿${feeWaiverEligibility.creditPerTerm.toLocaleString()}/term`,
                        color: "bg-indigo-100 text-indigo-800"
                      })
                    }
                  }

                  // Staff Child
                  if (student?.notes?.toLowerCase().includes('staff')) {
                    discounts.push({
                      name: "Staff Child",
                      value: "50%",
                      color: "bg-cyan-100 text-cyan-800"
                    })
                  }

                  // Scholarship
                  if (student?.notes?.toLowerCase().includes('scholarship')) {
                    discounts.push({
                      name: "Scholarship",
                      value: "100%",
                      color: "bg-amber-100 text-amber-800"
                    })
                  }

                  // Early Bird
                  if (student?.notes?.toLowerCase().includes('early bird')) {
                    discounts.push({
                      name: "Early Bird",
                      value: "5%",
                      color: "bg-orange-100 text-orange-800"
                    })
                  }

                  if (discounts.length === 0) return null

                  return (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-2">Discounts Applied:</p>
                      <div className="flex flex-wrap gap-2">
                        {discounts.map((discount, idx) => (
                          <Badge key={idx} className={`${discount.color}`}>
                            {discount.name} {discount.value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Invoice Items Table */}
              <div className="px-8 pb-6">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="py-3 px-4 text-left font-semibold w-12">No.</th>
                        <th className="py-3 px-4 text-left font-semibold">Description</th>
                        <th className="py-3 px-4 text-right font-semibold w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={item.id} className="border-b last:border-b-0">
                          <td className="py-3 px-4 align-top text-gray-600">{index + 1}</td>
                          <td className="py-3 px-4 align-top" style={{ wordBreak: 'break-word' }}>
                            {item.description}
                            {item.discountPercent > 0 && (
                              <span className="text-gray-400 text-xs ml-2">(-{item.discountPercent}%)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-medium whitespace-nowrap align-top">
                            {formatCurrency(item.discountedAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Amount in Words + Total */}
                  <div className="border-t bg-gray-50 p-4">
                    <div className="text-xs text-gray-500 mb-2">{numberToWords(selectedInvoice.finalAmount)}</div>
                    <div className="flex justify-between items-center font-bold text-base">
                      <span>TOTAL</span>
                      <span>{formatCurrency(selectedInvoice.finalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes (View Only) */}
              {selectedInvoice.notes && (
                <div className="px-8 pb-4">
                  <label className="text-sm font-medium block mb-2">Notes</label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Payment Methods Preview */}
              <div className="px-8 pb-6">
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Payment methods: </span>
                  <span className="text-gray-500">Credit Card, PromptPay, Bank Counter, WeChat Pay, Alipay, Cash</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between px-8 py-4 border-t bg-gray-50">
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={deleteInvoice}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={closeEditModal}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Navigate to invoice creation page with edit data
                      closeEditModal()
                      onNavigateToSubPage("invoice-creation", {
                        editInvoice: selectedInvoice,
                        invoiceType: selectedInvoice.invoiceType || (selectedInvoice.studentId === "EXTERNAL" ? "external" : "student")
                      })
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Invoice
                  </Button>
                  <Button onClick={saveAndSendInvoice}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-6">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? t("invoice.confirmApproval") : t("invoice.confirmRejection")}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? t("invoice.confirmApprovalMessage")
                : t("invoice.confirmRejectionMessage")}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoiceForApproval && (
            <div className="bg-gray-50 rounded-md p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">{t("invoice.invoiceNumber")}</span>
                <span className="font-medium text-right">{selectedInvoiceForApproval.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{(selectedInvoiceForApproval.invoiceType === 'external' || selectedInvoiceForApproval.studentId === 'EXTERNAL' || selectedInvoiceForApproval.term === "External") ? t("invoice.recipient") : t("invoice.student")}</span>
                <span className="font-medium text-right">{selectedInvoiceForApproval.studentName}</span>
              </div>
              {!(selectedInvoiceForApproval.invoiceType === 'external' || selectedInvoiceForApproval.studentId === 'EXTERNAL' || selectedInvoiceForApproval.term === "External") && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("invoice.grade")}</span>
                  <span className="font-medium text-right">{selectedInvoiceForApproval.studentGrade}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{(selectedInvoiceForApproval.invoiceType === 'external' || selectedInvoiceForApproval.studentId === 'EXTERNAL' || selectedInvoiceForApproval.term === "External") ? t("invoice.eventName") : t("invoice.term")}</span>
                <span className="font-medium text-right">
                  {(selectedInvoiceForApproval.invoiceType === 'external' || selectedInvoiceForApproval.studentId === 'EXTERNAL' || selectedInvoiceForApproval.term === "External")
                    ? (selectedInvoiceForApproval.eventName || selectedInvoiceForApproval.term || "-")
                    : (selectedInvoiceForApproval.term || "-")}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-gray-500">{t("common.amount")}</span>
                <span className="font-semibold text-green-600">฿{selectedInvoiceForApproval.finalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {approvalAction === "reject" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("invoice.rejectedReason")} <span className="text-red-500">*</span></label>
              <Textarea
                placeholder={t("invoice.rejectionReasonPlaceholder")}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              className="transition-all duration-200"
              style={{
                height: '38px',
                padding: '0 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                color: '#64748b',
                cursor: 'pointer'
              }}
              onClick={() => setIsApprovalDialogOpen(false)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              {t("common.cancel")}
            </button>

            {approvalAction === "approve" && (
              <button
                type="button"
                className="transition-all duration-200"
                style={{
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onClick={() => selectedInvoiceForApproval && handleApproveInvoice(selectedInvoiceForApproval)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
              >
                <CheckCircle className="w-4 h-4" />
                {t("common.approve")}
              </button>
            )}

            {approvalAction === "reject" && (
              <button
                type="button"
                className="transition-all duration-200"
                style={{
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: 'none',
                  backgroundColor: rejectionReason.trim() ? '#dc2626' : '#fca5a5',
                  color: 'white',
                  cursor: rejectionReason.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: rejectionReason.trim() ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
                onClick={() => rejectionReason.trim() && selectedInvoiceForApproval && handleRejectInvoice(selectedInvoiceForApproval, rejectionReason)}
                disabled={!rejectionReason.trim()}
                onMouseEnter={(e) => rejectionReason.trim() && (e.currentTarget.style.backgroundColor = '#b91c1c')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = rejectionReason.trim() ? '#dc2626' : '#fca5a5')}
              >
                <X className="w-4 h-4" />
                {t("common.reject")}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}