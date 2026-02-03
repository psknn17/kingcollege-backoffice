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
import { Checkbox } from "./ui/checkbox"
import { Search, Filter, Eye, Plus, Download, Mail, Calendar as CalendarIcon, DollarSign, FileText, AlertCircle, CheckCircle, Clock, RefreshCw, Trash2, Edit, X, Upload, Users, User, FileSpreadsheet, RotateCcw, ArrowUpDown, ChevronLeft, ChevronRight, GraduationCap, Building } from "lucide-react"
import { ViewModal } from "./ViewModal"
import { format } from "date-fns"
import { toast } from "sonner"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { SCHOOL_INFO, BANK_DETAILS, BILL_PAYMENT, INVOICE_NOTES, numberToWords, formatCurrency, getAcademicYear } from "@/lib/invoiceUtils"
import { downloadInvoicePDF } from "@/lib/invoicePDF"
import SchoolLogo from "@/assets/Logo.png"
import { logActivity } from "@/lib/activityLog"

type ApprovalStatus = "wait" | "approved" | "rejected"

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
  approvalStatus?: ApprovalStatus
  issueDate?: Date | null
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
  // Category for filtering by menu type
  category?: "tuition" | "eca" | "trip" | "exam" | "bus" | "external"
  // Approval fields
  approvedBy?: string
  approvedAt?: Date
  rejectedReason?: string
  rejectedAt?: string
  rejectedBy?: string
  // Cancellation fields
  cancelledAt?: string
  cancelReason?: string
  cancelledBy?: string
  // Payment fields
  paymentMethod?: string
  paymentProofs?: { name: string; dataUrl: string }[]
  // Email fields
  emailSentAt?: Date
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
  notes?: string  // Optional notes field for additional item details
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

// Helper function to check if invoice can be edited (not yet approved)
const canEditInvoice = (_status: string, approvalStatus?: ApprovalStatus): boolean => {
  // Allow editing only when approval is wait.
  return approvalStatus === "wait"
}

// Helper function to get student group discounts based on category
const getStudentGroupDiscounts = (studentId: string, category: string): { name: string; discountType: string; discountPercentage: number; fixedAmount: number }[] => {
  try {
    // No discounts for ECA, Trip, Exam, and External invoices
    if (category === "eca" || category === "trip" || category === "exam" || category === "external") {
      return []
    }

    // Get storage key based on category
    const storageKey = `studentGroups_${category}`
    const stored = localStorage.getItem(storageKey)
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
        // Handle empty or invalid dates - parse as local time to avoid timezone issues
        let issueDate: Date | null = null
        if (inv.issueDate) {
          if (inv.issueDate.includes('-')) {
            const [year, month, day] = inv.issueDate.split('-').map(Number)
            issueDate = new Date(year, month - 1, day)
          } else {
            issueDate = new Date(inv.issueDate)
          }
        }

        let dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        if (inv.dueDate) {
          if (inv.dueDate.includes('-')) {
            const [year, month, day] = inv.dueDate.split('-').map(Number)
            dueDate = new Date(year, month - 1, day)
          } else {
            dueDate = new Date(inv.dueDate)
          }
        }

        const approvalStatus: ApprovalStatus = inv.approvalStatus
          ?? (inv.status === "approved"
            ? "approved"
            : inv.status === "rejected"
              ? "rejected"
              : "wait")

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
          approvalStatus,
          issueDate: issueDate && !isNaN(issueDate.getTime()) ? issueDate : null,
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
          // Category for filtering
          category: inv.category,
          // Academic info
          term: inv.term || "",
          academicYear: inv.academicYear || "",
          paymentMethod: inv.paymentMethod,
          paymentProofs: inv.paymentProofs,
          // Cancellation info
          cancelledAt: inv.cancelledAt,
          cancelReason: inv.cancelReason,
          cancelledBy: inv.cancelledBy,
          // Rejection info
          rejectedAt: inv.rejectedAt,
          rejectedReason: inv.rejectedReason,
          rejectedBy: inv.rejectedBy
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
  onNavigateToSubPage: (subPage: string, params?: any) => void
  onNavigateToView?: (type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template", data: any) => void
  showTypeTabs?: boolean // Control whether to show Student/External tabs (default: false for sub-pages)
  defaultTab?: "student" | "external" // Which tab to show when tabs are hidden (default: "student")
  category?: "tuition" | "eca" | "trip" | "exam" | "bus" | "external" // Filter invoices by category/menu type
}

export function InvoiceManagement({
  onNavigateToSubPage,
  onNavigateToView,
  showTypeTabs = false,  // Default to false (no tabs for sub-pages)
  defaultTab = "student", // Default to student invoices when tabs are hidden
  category // Filter invoices by category/menu type
}: InvoiceManagementProps) {
  const { t } = useLanguage()
  // Discount Options context for late payment calculations
  const { getLatePaymentSettings, getRegistrationFees, getSiblingDiscountPercentage } = useDiscountOptions()
  const { academicYears = [] } = useAcademicYears()
  const { students, getSiblingDiscount, checkFeePrivilegeEligibility } = useStudents()

  // Load invoices from localStorage
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadCreatedInvoicesFromStorage())
  const [templates, setTemplates] = useState<InvoiceTemplate[]>(mockTemplates)
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(() => loadCreatedInvoicesFromStorage())
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [isExportingAll, setIsExportingAll] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null)
  const [sortKey, setSortKey] = useState<
    | "invoiceNumber"
    | "studentName"
    | "studentGrade"
    | "finalAmount"
    | "invoiceStatus"
    | "emailStatus"
    | "paymentStatus"
    | "eventName"
    | "issueDate"
    | "dueDate"
    | null
  >(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Invoice type tab state
  const [invoiceTypeTab, setInvoiceTypeTab] = useState<"student" | "external">(defaultTab)

  // Get available terms based on selected academic year
  const availableTerms = academicYearFilter !== "all"
    ? (academicYears.find(y => y.id === academicYearFilter)?.terms || [])
    : [...new Map(academicYears.flatMap(y => y.terms).map(t => [t.name, t])).values()]

  const getApprovalStatus = (invoice: Invoice): ApprovalStatus => (
    invoice.approvalStatus
    ?? (invoice.status === "approved"
      ? "approved"
      : invoice.status === "rejected"
        ? "rejected"
        : "wait")
  )

  // Reload invoices from localStorage
  const reloadInvoices = () => {
    const loaded = loadCreatedInvoicesFromStorage()
    setInvoices(loaded)
    // Don't set filteredInvoices directly - let the useEffect apply filters
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

  // Re-apply filters when tab or category changes
  useEffect(() => {
    applyFilters(invoiceTypeTab)
  }, [invoiceTypeTab, invoices, category])

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewModalData, setViewModalData] = useState<any>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingDueDate, setEditingDueDate] = useState<Date | undefined>(undefined)
  const [editingNotes, setEditingNotes] = useState("")
  const [editingItems, setEditingItems] = useState<InvoiceItem[]>([])
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false)

  // External invoice preview dialog state
  const [isExternalPreviewOpen, setIsExternalPreviewOpen] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)

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
  const [isEmailDetailDialogOpen, setIsEmailDetailDialogOpen] = useState(false)
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null)
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false)
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentFiles, setPaymentFiles] = useState<File[]>([])
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [edcBank, setEdcBank] = useState("")
  const [edcAccountNumber, setEdcAccountNumber] = useState("")
  const [isSendEmailConfirmOpen, setIsSendEmailConfirmOpen] = useState(false)
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null)

  // Add Items dialog state
  const [isAddItemsDialogOpen, setIsAddItemsDialogOpen] = useState(false)
  const [itemSearchQuery, setItemSearchQuery] = useState("")

  const applyFilters = (tabType?: "student" | "external") => {
    const currentTab = tabType || invoiceTypeTab
    let filtered = invoices

    // Filter by category first (if provided)
    if (category) {
      filtered = filtered.filter(inv => inv.category === category)
    }

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
      filtered = filtered.filter(inv => {
        const emailStatus = getEmailStatus(inv)
        if (statusFilter === "wait") return emailStatus === "wait"
        if (statusFilter === "sent") return emailStatus === "sent"
        if (statusFilter === "unsent") return emailStatus === "unsent"
        return true
      })
    }

    if (invoiceStatusFilter !== "all") {
      filtered = filtered.filter(inv => {
        const approvalStatus = getApprovalStatus(inv)
        if (invoiceStatusFilter === "wait") return approvalStatus === "wait"
        if (invoiceStatusFilter === "approved") return approvalStatus === "approved"
        if (invoiceStatusFilter === "rejected") return approvalStatus === "rejected"
        return true
      })
    }

    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter(inv => {
        const paymentStatus = getPaymentStatus(inv)
        if (paymentStatusFilter === "unpaid") return paymentStatus === "unpaid"
        if (paymentStatusFilter === "paid") return paymentStatus === "paid"
        if (paymentStatusFilter === "overdue") return paymentStatus === "overdue"
        return true
      })
    }

    if (gradeFilter !== "all" && currentTab === "student") {
      filtered = filtered.filter(inv => inv.studentGrade === gradeFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(inv => inv.issueDate && inv.issueDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(inv => inv.issueDate && inv.issueDate <= dateTo)
    }

    setFilteredInvoices(filtered)
    setCurrentPage(1)
  }

  const handleSort = (key: NonNullable<typeof sortKey>) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortHeader = (label: string, key: NonNullable<typeof sortKey>) => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className="flex items-center gap-1 font-medium text-left"
    >
      <span>{label}</span>
      <ArrowUpDown
        className={`h-3 w-3 ${sortKey === key ? "text-foreground" : "text-muted-foreground"}`}
      />
    </button>
  )

  // Pagination logic
  const totalPages = Math.ceil(filteredInvoices.length / pageSize)
  const sortedInvoices = useMemo(() => {
    if (!sortKey) return filteredInvoices
    const sorted = [...filteredInvoices]
    const direction = sortDirection === "asc" ? 1 : -1
    const invoiceStatusOrder: Record<ApprovalStatus, number> = { wait: 0, approved: 1, rejected: 2 }
    const paymentStatusOrder: Record<"unpaid" | "paid" | "overdue", number> = { unpaid: 0, paid: 1, overdue: 2 }
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "invoiceNumber":
          return (a.invoiceNumber || "").localeCompare(b.invoiceNumber || "") * direction
        case "studentName":
          return (a.studentName || "").localeCompare(b.studentName || "") * direction
        case "studentGrade":
          return (a.studentGrade || "").localeCompare(b.studentGrade || "") * direction
        case "finalAmount":
          return ((a.finalAmount || 0) - (b.finalAmount || 0)) * direction
        case "invoiceStatus":
          return (invoiceStatusOrder[getApprovalStatus(a)] - invoiceStatusOrder[getApprovalStatus(b)]) * direction
        case "emailStatus":
          return (a.status || "").localeCompare(b.status || "") * direction
        case "paymentStatus":
          return (paymentStatusOrder[getPaymentStatus(a)] - paymentStatusOrder[getPaymentStatus(b)]) * direction
        case "eventName":
          return (a.eventName || "").localeCompare(b.eventName || "") * direction
        case "issueDate":
          return ((a.issueDate?.getTime() || 0) - (b.issueDate?.getTime() || 0)) * direction
        case "dueDate":
          return (a.dueDate.getTime() - b.dueDate.getTime()) * direction
        default:
          return 0
      }
    })
    return sorted
  }, [filteredInvoices, sortKey, sortDirection])

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedInvoices.slice(startIndex, startIndex + pageSize)
  }, [sortedInvoices, currentPage, pageSize])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setAcademicYearFilter("all")
    setTermFilter("all")
    setStatusFilter("all")
    setInvoiceStatusFilter("all")
    setPaymentStatusFilter("all")
    setGradeFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredInvoices(invoices)
    setCurrentPage(1)
  }

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoiceIds)
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId)
    } else {
      newSelected.add(invoiceId)
    }
    setSelectedInvoiceIds(newSelected)
  }

  const selectAllCurrentPage = (pageInvoices: Invoice[]) => {
    const newSelected = new Set(selectedInvoiceIds)
    pageInvoices.forEach(invoice => {
      newSelected.add(invoice.id)
    })
    setSelectedInvoiceIds(newSelected)
  }

  const openInvoiceDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsModalOpen(true)
  }

  const openViewModal = (invoice: Invoice) => {
    console.log('[InvoiceManagement] Opening view modal for invoice:', {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      cancelReason: invoice.cancelReason,
      cancelledBy: invoice.cancelledBy,
      cancelledAt: invoice.cancelledAt
    })

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
      approvalStatus: invoice.approvalStatus,
      cancelReason: invoice.cancelReason,
      cancelledBy: invoice.cancelledBy,
      cancelledAt: invoice.cancelledAt,
      issueDate: invoice.issueDate ? invoice.issueDate.toISOString() : null,
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

    console.log('[InvoiceManagement] modalData being passed:', {
      status: modalData.status,
      cancelReason: modalData.cancelReason,
      cancelledBy: modalData.cancelledBy,
      cancelledAt: modalData.cancelledAt
    })

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

    // Find the original invoice from the invoices array
    const invoice = invoices.find(inv => inv.id === data.id)
    if (!invoice) {
      toast.error("Invoice not found")
      return
    }

    // Check if it's an external invoice
    if (invoice.invoiceType === "external" || invoice.studentId === "EXTERNAL") {
      // Navigate to ExternalInvoiceCreation for editing
      const editInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.recipientName || invoice.studentName,
        contactName: invoice.parentName,
        address: invoice.recipientAddress || "",
        invoiceDate: invoice.issueDate ? invoice.issueDate.toISOString() : new Date().toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        items: invoice.items.map(item => ({
          itemId: item.id,
          description: item.description,
          details: item.notes || "",
          amount: item.discountedAmount
        })),
        status: invoice.status
      }
      onNavigateToSubPage?.("external-invoice-creation", { editInvoice })
    } else {
      // Navigate to InvoiceCreation for editing student invoice
      const editInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        studentName: invoice.studentName,
        studentId: invoice.studentId,
        studentGrade: invoice.studentGrade,
        parentName: invoice.parentName,
        parentEmail: invoice.parentEmail,
        totalAmount: invoice.totalAmount,
        discountAmount: invoice.discountAmount,
        finalAmount: invoice.finalAmount,
        status: invoice.status,
        issueDate: invoice.issueDate ? invoice.issueDate.toISOString() : null,
        dueDate: invoice.dueDate.toISOString(),
        items: invoice.items.map(item => ({
          id: item.id,
          name: item.description,
          description: item.description,
          category: "Tuition",
          quantity: 1,
          amount: item.discountedAmount
        })),
        category: invoice.category || category,
        term: invoice.term,
        academicYear: invoice.academicYear
      }
      // Navigate to invoice-creation page with edit data
      onNavigateToSubPage?.("invoice-creation", { editInvoice, category: invoice.category || category })
    }
  }

  const handleDownloadInvoice = (data: any) => {
    toast.success(`Downloading invoice ${data.invoiceNumber}...`)
    // Implement download logic
  }

  const handlePrintInvoice = (data: any) => {
    toast.success(`Printing invoice ${data.invoiceNumber}...`)
    // Implement print logic
  }

  // Handle saving invoice from inline edit in ViewModal
  const handleSaveInvoiceFromModal = (editedData: any) => {
    if (!editedData?.id) return

    // Calculate total from items
    const totalAmount = editedData.items?.reduce((sum: number, item: any) =>
      sum + (Number(item.discountedAmount) || Number(item.amount) || 0), 0) || 0

    // Update the invoice in state
    setInvoices(prev => prev.map(inv => {
      if (inv.id === editedData.id) {
        return {
          ...inv,
          studentName: editedData.studentName || inv.studentName,
          studentId: editedData.studentId || inv.studentId,
          studentGrade: editedData.grade || editedData.studentGrade || inv.studentGrade,
          parentEmail: editedData.parentEmail || inv.parentEmail,
          dueDate: editedData.dueDate ? new Date(editedData.dueDate) : inv.dueDate,
          items: editedData.items?.map((item: any, idx: number) => ({
            id: item.id || String(idx + 1),
            description: item.name || item.description,
            amount: Number(item.amount) || 0,
            discountPercent: item.discountPercent || 0,
            discountedAmount: Number(item.discountedAmount) || Number(item.amount) || 0
          })) || inv.items,
          totalAmount: totalAmount,
          finalAmount: totalAmount
        }
      }
      return inv
    }))

    // Also update in localStorage
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        const savedInvoices = JSON.parse(stored)
        const updatedSavedInvoices = savedInvoices.map((inv: any) => {
          if (inv.id === editedData.id) {
            return {
              ...inv,
              studentName: editedData.studentName || inv.studentName,
              studentId: editedData.studentId || inv.studentId,
              studentGrade: editedData.grade || editedData.studentGrade || inv.studentGrade,
              parentEmail: editedData.parentEmail || inv.parentEmail,
              dueDate: editedData.dueDate || inv.dueDate,
              items: editedData.items?.map((item: any) => ({
                ...item,
                name: item.name || item.description,
                description: item.name || item.description,
                amount: Number(item.discountedAmount) || Number(item.amount) || 0
              })) || inv.items,
              subtotal: totalAmount,
              netAmount: totalAmount
            }
          }
          return inv
        })
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to save invoice to localStorage:", error)
    }

    // Update viewModalData to reflect changes
    setViewModalData(editedData)

    toast.success(`Invoice ${editedData.invoiceNumber || editedData.id} saved successfully`)
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
    setEditingItems(invoice.items.map(item => ({ ...item }))) // Create a copy of items
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedInvoice(null)
    setEditingDueDate(undefined)
    setEditingItems([])
    setEditingNotes("")
  }

  const saveEditedInvoice = () => {
    if (!selectedInvoice || !editingDueDate) return
    const previousInvoice = selectedInvoice

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
            ? { ...inv, dueDate: format(editingDueDate, 'yyyy-MM-dd'), notes: editingNotes }
            : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to save edited invoice:", error)
    }

    toast.success(`Invoice ${selectedInvoice.invoiceNumber} saved`)
    const changes = [] as Array<{ field: string; from: string; to: string }>
    if (format(previousInvoice.dueDate, "yyyy-MM-dd") !== format(editingDueDate, "yyyy-MM-dd")) {
      changes.push({
        field: "Due Date",
        from: format(previousInvoice.dueDate, "yyyy-MM-dd"),
        to: format(editingDueDate, "yyyy-MM-dd")
      })
    }
    if ((previousInvoice.notes || "") !== editingNotes) {
      changes.push({
        field: "Notes",
        from: previousInvoice.notes || "-",
        to: editingNotes || "-"
      })
    }
    logActivity({
      action: `Updated invoice ${selectedInvoice.invoiceNumber}`,
      module: "Invoices",
      detail: formatChanges(changes)
    })
    closeEditModal()
  }

  const saveAndSendInvoice = () => {
    if (!selectedInvoice || !editingDueDate) return

    // Check if invoice is approved before sending
    if (getApprovalStatus(selectedInvoice) !== "approved") {
      toast.error(`Cannot send email. Invoice ${selectedInvoice.invoiceNumber} must be approved first.`)
      return
    }

    // Check if invoice is cancelled
    if (selectedInvoice.status === "cancelled") {
      toast.error(`Cannot send email. Invoice ${selectedInvoice.invoiceNumber} has been cancelled.`)
      return
    }

    const previousInvoice = selectedInvoice
    const emailSentAt = new Date().toISOString()
    console.log('[saveAndSendInvoice] Sending email at:', emailSentAt, new Date(emailSentAt))

    const updatedInvoices = invoices.map(inv =>
      inv.id === selectedInvoice.id
        ? { ...inv, dueDate: editingDueDate, notes: editingNotes, status: "sent" as const, emailSentAt }
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
            ? { ...inv, dueDate: format(editingDueDate, 'yyyy-MM-dd'), notes: editingNotes, status: "sent", emailSentAt }
            : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to save and send invoice:", error)
    }

    toast.success(`Invoice ${selectedInvoice.invoiceNumber} saved and sent to ${selectedInvoice.parentEmail}`)
    const changes = [] as Array<{ field: string; from: string; to: string }>
    if (format(previousInvoice.dueDate, "yyyy-MM-dd") !== format(editingDueDate, "yyyy-MM-dd")) {
      changes.push({
        field: "Due Date",
        from: format(previousInvoice.dueDate, "yyyy-MM-dd"),
        to: format(editingDueDate, "yyyy-MM-dd")
      })
    }
    if ((previousInvoice.notes || "") !== editingNotes) {
      changes.push({
        field: "Notes",
        from: previousInvoice.notes || "-",
        to: editingNotes || "-"
      })
    }
    logActivity({
      action: `Saved and sent invoice ${selectedInvoice.invoiceNumber}`,
      module: "Invoices",
      detail: formatChanges(changes)
    })
    closeEditModal()
  }

  const handleSaveChanges = () => {
    if (!selectedInvoice) return
    const previousItems = selectedInvoice.items

    // Update invoice with edited items
    const updatedInvoice = {
      ...selectedInvoice,
      items: editingItems
    }

    // Update in state
    const updatedInvoices = invoices.map(inv =>
      inv.id === selectedInvoice.id ? updatedInvoice : inv
    )
    setInvoices(updatedInvoices)

    // Update in localStorage
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        const savedInvoices = JSON.parse(stored)
        const updatedSavedInvoices = savedInvoices.map((inv: any) =>
          inv.id === selectedInvoice.id ? { ...inv, items: editingItems } : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to save changes:", error)
    }

    toast.success("Invoice updated successfully")
    logActivity({
      action: `Updated invoice ${selectedInvoice.invoiceNumber}`,
      module: "Invoices",
      detail: `Items updated (${previousItems.length} → ${editingItems.length})`
    })
    setIsConfirmSaveOpen(false)
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
    logActivity({
      action: `Deleted invoice ${selectedInvoice.invoiceNumber}`,
      module: "Invoices",
      detail: `Invoice removed by user`
    })
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

    toast.success(`Created ${selectedStudents.length} invoices with ${selectedItems.length} items each - Total per invoice: ${totalItems.toLocaleString()}`)
    logActivity({
      action: "Created invoices",
      module: "Invoices",
      detail: `Students: ${selectedStudents.length}, Items per invoice: ${selectedItems.length}, Total per invoice: ${totalItems.toLocaleString()}`
    })
    closeCreateModal()
  }

  const openSendEmailConfirm = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (!invoice) return

    // Check if invoice is approved before sending
    if (getApprovalStatus(invoice) !== "approved") {
      toast.error(`Cannot send email. Invoice ${invoice.invoiceNumber} must be approved first.`)
      return
    }

    // Check if invoice is cancelled
    if (invoice.status === "cancelled") {
      toast.error(`Cannot send email. Invoice ${invoice.invoiceNumber} has been cancelled.`)
      return
    }

    // Open confirmation dialog
    setInvoiceToSend(invoice)
    setIsSendEmailConfirmOpen(true)
  }

  const sendInvoice = () => {
    if (!invoiceToSend) return

    // Update invoice status to "sent" and record email sent timestamp
    const emailSentAt = new Date().toISOString()
    console.log('[sendInvoice] Sending email at:', emailSentAt, new Date(emailSentAt))
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoiceToSend.id ? { ...inv, status: "sent" as const, emailSentAt } : inv
    )
    setInvoices(updatedInvoices)

    // Update localStorage
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        const savedInvoices = JSON.parse(stored)
        const updatedSavedInvoices = savedInvoices.map((inv: any) =>
          inv.id === invoiceToSend.id ? { ...inv, status: "sent", emailSentAt } : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to update invoice status in localStorage:", error)
    }

    toast.success(`Invoice ${invoiceToSend.invoiceNumber} sent to ${invoiceToSend.parentEmail}`)
    logActivity({
      action: `Sent invoice email ${invoiceToSend.invoiceNumber}`,
      module: "Invoices",
      detail: `Recipient: ${invoiceToSend.parentEmail}`
    })

    // Close dialog and reset
    setIsSendEmailConfirmOpen(false)
    setInvoiceToSend(null)
  }

  const downloadInvoiceData = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (!invoice) return
    const resolvedCategory = category ?? invoice.category ?? ""

    const escapeCsvValue = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value)
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    }

    const headerRows: string[][] = [
      ["Invoice Number", invoice.invoiceNumber],
      ["Student Name", invoice.studentName],
      ["Student ID", invoice.studentId],
      ["Year Group", invoice.studentGrade],
      ["Parent Name", invoice.parentName],
      ["Parent Email", invoice.parentEmail],
      ["Recipient Name", invoice.recipientName || ""],
      ["Recipient Address", invoice.recipientAddress || ""],
      ["Event Name", invoice.eventName || ""],
      ["Category", resolvedCategory],
      ["Academic Year", invoice.academicYear || ""],
      ["Term", invoice.term || ""],
      ["Status", invoice.status],
      ["Issue Date", invoice.issueDate ? format(invoice.issueDate, "yyyy-MM-dd") : "Pending"],
      ["Due Date", format(invoice.dueDate, "yyyy-MM-dd")],
      ["Total Amount", invoice.totalAmount],
      ["Discount Amount", invoice.discountAmount],
      ["Final Amount", invoice.finalAmount],
      ["Notes", invoice.notes || ""]
    ]

    const itemHeader = ["Item ID", "Description", "Amount", "Discount %", "Discounted Amount", "Notes"]
    const itemRows = invoice.items.map(item => [
      item.id,
      item.description,
      item.amount,
      item.discountPercent,
      item.discountedAmount,
      item.notes || ""
    ])

    const csvRows = [
      ["Field", "Value"],
      ...headerRows,
      [""],
      ["Items"],
      itemHeader,
      ...itemRows
    ]

    const csvContent = csvRows
      .map(row => row.map(escapeCsvValue).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${invoice.invoiceNumber || invoice.id}_data.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Invoice ${invoice.invoiceNumber} data downloaded`)
  }

  const exportInvoiceReport = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export")
      return
    }

    const escapeCsvValue = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value)
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    }

    const headers = [
      "Invoice Number",
      "Student Name",
      "Student ID",
      "Year Group",
      "Parent Name",
      "Parent Email",
      "Category",
      "Academic Year",
      "Term",
      "Status",
      "Issue Date",
      "Due Date",
      "Total Amount",
      "Discount Amount",
      "Final Amount"
    ]

    const rows = filteredInvoices.map(inv => ([
      inv.invoiceNumber,
      inv.studentName,
      inv.studentId,
      inv.studentGrade,
      inv.parentName,
      inv.parentEmail,
      category ?? inv.category ?? "",
      inv.academicYear || "",
      inv.term || "",
      inv.status,
      inv.issueDate ? format(inv.issueDate, "yyyy-MM-dd") : "Pending",
      format(inv.dueDate, "yyyy-MM-dd"),
      inv.totalAmount,
      inv.discountAmount,
      inv.finalAmount
    ]))

    const csvContent = [headers, ...rows]
      .map(row => row.map(escapeCsvValue).join(","))
      .join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `invoice-report-${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${filteredInvoices.length} invoices`)
  }

  const exportAllInvoicesZip = async () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export")
      return
    }

    try {
      setIsExportingAll(true)
      const [{ default: JSZip }, { jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jszip"),
        import("jspdf"),
        import("html2canvas")
      ])

      const zip = new JSZip()

      const escapeHtml = (value: unknown) => {
        const text = value === null || value === undefined ? "" : String(value)
        return text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      }

      const buildInvoicePreviewElement = (invoice: Invoice) => {
        const itemsRows = invoice.items.map(item => `
          <tr>
            <td style="padding:6px 8px; border:1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
            <td style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right;">${item.amount.toLocaleString()}</td>
            <td style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right;">${item.discountPercent || 0}%</td>
            <td style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right;">${item.discountedAmount.toLocaleString()}</td>
          </tr>
        `).join("")

        const container = document.createElement("div")
        container.style.width = "794px"
        container.style.padding = "24px"
        container.style.background = "white"
        container.style.color = "#111827"
        container.style.fontFamily = "Arial, sans-serif"
        container.style.fontSize = "12px"
        container.style.boxSizing = "border-box"

        container.innerHTML = `
          <div style="text-align:center; border-bottom:1px solid #d1d5db; padding-bottom:12px; margin-bottom:12px;">
            <img src="${SchoolLogo}" style="height:80px; margin:0 auto 8px; display:block;" alt="School Logo" />
            <div style="font-size:12px; color:#6b7280;">${escapeHtml(SCHOOL_INFO.address)}</div>
            <div style="font-size:12px; color:#6b7280;">${escapeHtml(SCHOOL_INFO.phone)}, ${escapeHtml(SCHOOL_INFO.email)}, ${escapeHtml(SCHOOL_INFO.website)}</div>
            <div style="margin-top:8px; font-size:18px; font-weight:700; letter-spacing:2px;">INVOICE</div>
          </div>

          <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
            <tr>
              <td style="width:50%; vertical-align:top; padding-right:12px;">
                <table style="width:100%; border-collapse:collapse;">
                  <tr><td style="padding:4px 0; width:120px;">Student ID</td><td style="padding:4px 0;">${escapeHtml(invoice.studentId)}</td></tr>
                  <tr><td style="padding:4px 0;">Student Name</td><td style="padding:4px 0;">${escapeHtml(invoice.studentName)}</td></tr>
                  <tr><td style="padding:4px 0;">Year Group</td><td style="padding:4px 0;">${escapeHtml(invoice.studentGrade)}</td></tr>
                  <tr><td style="padding:4px 0;">Parent Name</td><td style="padding:4px 0;">${escapeHtml(invoice.parentName)}</td></tr>
                  <tr><td style="padding:4px 0;">Parent Email</td><td style="padding:4px 0;">${escapeHtml(invoice.parentEmail)}</td></tr>
                </table>
              </td>
              <td style="width:50%; vertical-align:top; padding-left:12px;">
                <table style="width:100%; border-collapse:collapse;">
                  <tr><td style="padding:4px 0; width:120px;">Invoice No.</td><td style="padding:4px 0;">${escapeHtml(invoice.invoiceNumber)}</td></tr>
                  <tr><td style="padding:4px 0;">Issue Date</td><td style="padding:4px 0;">${escapeHtml(invoice.issueDate ? format(invoice.issueDate, "yyyy-MM-dd") : "Pending")}</td></tr>
                  <tr><td style="padding:4px 0;">Due Date</td><td style="padding:4px 0;">${escapeHtml(format(invoice.dueDate, "yyyy-MM-dd"))}</td></tr>
                  <tr><td style="padding:4px 0;">Status</td><td style="padding:4px 0;">${escapeHtml(invoice.status)}</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:6px 8px; border:1px solid #e5e7eb; text-align:left;">Description</th>
                <th style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right;">Amount</th>
                <th style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right;">Discount %</th>
                <th style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right;">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
              <tr>
                <td colspan="3" style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right; font-weight:700;">Total</td>
                <td style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right; font-weight:700;">${invoice.finalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div style="font-size:11px; color:#374151;">
            <div style="font-weight:700; margin-bottom:4px;">Notes</div>
            <div>${escapeHtml(INVOICE_NOTES.bankTransferInstruction)}</div>
          </div>
        `

        container.style.position = "fixed"
        container.style.left = "-10000px"
        container.style.top = "0"
        return container
      }

      const waitForImages = async (container: HTMLElement) => {
        const images = Array.from(container.querySelectorAll("img"))
        await Promise.all(images.map(img => {
          if (img.complete) return Promise.resolve()
          return new Promise<void>(resolve => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
        }))
      }

      const total = filteredInvoices.length
      setExportProgress({ current: 0, total })

      for (let index = 0; index < filteredInvoices.length; index += 1) {
        const invoice = filteredInvoices[index]
        setExportProgress({ current: index + 1, total })

        const container = buildInvoicePreviewElement(invoice)
        document.body.appendChild(container)

        await waitForImages(container)
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff"
        })
        document.body.removeChild(container)

        const doc = new jsPDF({ unit: "pt", format: "a4" })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 24
        const imgWidth = pageWidth - margin * 2
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        const imgData = canvas.toDataURL("image/png")

        let heightLeft = imgHeight
        let position = margin
        doc.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight)
        heightLeft -= (pageHeight - margin * 2)

        while (heightLeft > 0) {
          doc.addPage()
          position = margin - (imgHeight - heightLeft)
          doc.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight)
          heightLeft -= (pageHeight - margin * 2)
        }

        const safeName = (invoice.invoiceNumber || invoice.id)
          .replace(/[^a-zA-Z0-9-_]/g, "_")
        const pdfBlob = doc.output("blob")
        zip.file(`${safeName}.pdf`, pdfBlob)

        await new Promise(resolve => setTimeout(resolve, 0))
      }

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `invoices-export-${format(new Date(), "yyyyMMdd_HHmmss")}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Exported ${filteredInvoices.length} invoices`)
    } catch (error) {
      console.error("Failed to export invoices:", error)
      toast.error("Failed to export invoices")
    } finally {
      setIsExportingAll(false)
      setExportProgress(null)
    }
  }

  const downloadInterfaceTemplate = () => {
    const headers = [
      "Student ID",
      "Student Name",
      "Grade",
      "Parent Name",
      "Parent Email",
      "Amount",
      "Due Date"
    ]
    const sampleRow = [
      "ST001",
      "John Doe",
      "Year 1",
      "Parent Name",
      "parent@email.com",
      "450000",
      "2026-01-31"
    ]
    const csv = [headers.join(","), sampleRow.join(",")].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "invoice_interface_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadInvoice = (invoiceId: string) => {
    downloadInvoiceData(invoiceId)
  }

  const downloadSingleInvoicePDF = async (invoice: Invoice) => {
    if (!invoice) {
      toast.error("No invoice to download")
      return
    }

    try {
      setIsDownloadingPDF(true)

      // Calculate additional details for PDF (same logic as preview)
      const isNonDiscountableInvoice = invoice.category === "bus"
      const student = students.find(s => s.id === invoice.studentId)

      // Calculate discounts
      const discountLines: Array<{ name: string; amount: number; percent?: number }> = []
      const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0)

      // Add all discount types (same as preview)
      if (!isNonDiscountableInvoice && invoice.invoiceType !== "external" && invoice.studentId !== "EXTERNAL") {
        // 1. Sibling discount
        const siblingCount = students.filter(s =>
          s.parentEmail?.toLowerCase() === student?.parentEmail?.toLowerCase() &&
          s.id !== invoice.studentId
        ).length
        if (siblingCount > 0) {
          const siblingPercent = Math.min(siblingCount * 5, 20)
          const siblingAmount = Math.round(subtotal * siblingPercent / 100)
          if (siblingAmount > 0) {
            discountLines.push({
              name: `Sibling Discount (${siblingCount} sibling${siblingCount > 1 ? 's' : ''})`,
              amount: siblingAmount,
              percent: siblingPercent
            })
          }
        }

        // 2. Student group discounts
        const invoiceCategory = invoice.category || category
        const groupDiscounts = getStudentGroupDiscounts(invoice.studentId, invoiceCategory)
        groupDiscounts.forEach(group => {
          const groupAmount = group.discountType === "percentage"
            ? Math.round(subtotal * group.discountPercentage / 100)
            : group.fixedAmount
          if (groupAmount > 0) {
            discountLines.push({
              name: group.name,
              amount: groupAmount,
              percent: group.discountType === "percentage" ? group.discountPercentage : undefined
            })
          }
        })

        // 3. Fee Waiver Program
        if (student) {
          const feeWaiverEligibility = checkFeePrivilegeEligibility(
            student,
            student.academicYear || invoice.academicYear,
            student.enrollmentTerm || "term1"
          )
          if (feeWaiverEligibility.eligible && feeWaiverEligibility.creditPerTerm) {
            discountLines.push({
              name: `Registration Fee Waiver (${feeWaiverEligibility.creditPerTerm.toLocaleString()}/term)`,
              amount: feeWaiverEligibility.creditPerTerm
            })
          }
        }

        // 4. Staff Child discount
        if (student && student.notes?.toLowerCase().includes('staff')) {
          const staffAmount = Math.round(subtotal * 50 / 100)
          if (staffAmount > 0) {
            discountLines.push({
              name: "Staff Child Discount",
              amount: staffAmount,
              percent: 50
            })
          }
        }

        // 5. Scholarship
        if (student && student.notes?.toLowerCase().includes('scholarship')) {
          discountLines.push({
            name: "Scholarship",
            amount: subtotal,
            percent: 100
          })
        }

        // 6. Early Bird discount
        if (student && student.notes?.toLowerCase().includes('early bird')) {
          const earlyBirdAmount = Math.round(subtotal * 5 / 100)
          if (earlyBirdAmount > 0) {
            discountLines.push({
              name: "Early Bird Discount",
              amount: earlyBirdAmount,
              percent: 5
            })
          }
        }
      }

      // Calculate late fee
      const today = new Date()
      const dueDate = new Date(invoice.dueDate)
      const isOverdue = today > dueDate && invoice.status !== "paid"
      const lateFeePercent = 1.5
      const lateFeeAmount = isOverdue ? Math.round(subtotal * lateFeePercent / 100) : 0

      // ID Charges removed - no longer applicable
      const totalDiscounts = discountLines.reduce((sum, d) => sum + d.amount, 0)
      const registrationFeesTotal = (invoice as any).registrationFees?.reduce((sum: number, fee: any) => sum + fee.amount, 0) || 0

      // Prepare invoice with additional details
      const invoiceWithDetails = {
        ...invoice,
        discounts: discountLines.length > 0 ? discountLines : undefined,
        registrationFees: (invoice as any).registrationFees || undefined,
        securityDepositWaiver: (invoice as any).securityDepositWaiver || undefined,
        lateFee: lateFeeAmount > 0 ? { amount: lateFeeAmount, percent: lateFeePercent } : undefined
      }

      await downloadInvoicePDF(invoiceWithDetails)
      toast.success("Invoice PDF downloaded successfully")
    } catch (error) {
      console.error("Failed to download invoice PDF:", error)
      toast.error("Failed to download invoice PDF")
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  // Generate proper invoice number (INV-YYYYMM-XXXX format)
  const generateInvoiceNumber = (studentId: string) => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    // Use last 4 characters of student ID
    const idSuffix = studentId.slice(-4)
    return `INV-${year}${month}-${idSuffix}`
  }

  const displayInvoiceNumber = (invoiceNumber: string | undefined) => {
    if (!invoiceNumber || invoiceNumber.startsWith("DRAFT-")) {
      return ""
    }
    return invoiceNumber
  }

  // Approval handlers
  const handleApproveInvoice = (invoice: Invoice) => {
    // Generate proper invoice number if it's a draft number
    const needsNewInvoiceNumber = !invoice.invoiceNumber || invoice.invoiceNumber.startsWith('DRAFT-')
    const finalInvoiceNumber = needsNewInvoiceNumber
      ? generateInvoiceNumber(invoice.studentId)
      : invoice.invoiceNumber

    const approvalDate = new Date()

    const updatedInvoices = invoices.map(inv =>
      inv.id === invoice.id
        ? {
          ...inv,
          invoiceNumber: finalInvoiceNumber,
          approvalStatus: "approved",
          approvedBy: "Admin",
          approvedAt: approvalDate,
          issueDate: approvalDate
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
              invoiceNumber: finalInvoiceNumber,
              approvalStatus: "approved",
              approvedBy: "Admin",
              approvedAt: approvalDate.toISOString(),
              issueDate: approvalDate.toISOString().split('T')[0]
            }
            : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to update invoice approval in localStorage:", error)
    }

    toast.success(`Invoice ${finalInvoiceNumber} has been approved`)
    logActivity({
      action: `Approved invoice ${finalInvoiceNumber}`,
      module: "Invoices",
      detail: "Approval Status: wait → approved"
    })
    setIsApprovalDialogOpen(false)
    setSelectedInvoiceForApproval(null)
  }

  const handleRejectInvoice = (invoice: Invoice, reason: string) => {
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoice.id
        ? {
          ...inv,
          approvalStatus: "rejected",
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
              approvalStatus: "rejected",
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
    logActivity({
      action: `Rejected invoice ${invoice.invoiceNumber}`,
      module: "Invoices",
      detail: `Approval Status: wait → rejected; Reason: ${reason}`
    })
    setIsApprovalDialogOpen(false)
    setSelectedInvoiceForApproval(null)
    setRejectionReason("")
  }

  // Cancel invoice handler
  const handleCancelInvoice = (invoiceData: any, reason: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceData.id)
    if (!invoice) return

    const cancelledDate = new Date()
    console.log('[handleCancelInvoice] Cancelling invoice:', {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      reason: reason,
      cancelledAt: cancelledDate.toISOString(),
      cancelledBy: "Admin"
    })

    const updatedInvoices = invoices.map(inv =>
      inv.id === invoice.id
        ? {
            ...inv,
            status: "cancelled" as const,
            cancelReason: reason,
            cancelledAt: cancelledDate,
            cancelledBy: "Admin"
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
                status: "cancelled",
                cancelReason: reason,
                cancelledAt: new Date().toISOString(),
                cancelledBy: "Admin"
              }
            : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to update invoice cancellation in localStorage:", error)
    }

    toast.success(`Invoice ${displayInvoiceNumber(invoice.invoiceNumber)} has been cancelled`)
    logActivity({
      action: `Cancelled invoice ${displayInvoiceNumber(invoice.invoiceNumber)}`,
      module: "Invoices",
      detail: `Status: approved → cancelled; Reason: ${reason}`
    })

    // Trigger custom event for cross-component sync
    window.dispatchEvent(new CustomEvent("invoicesUpdated"))
  }

  const handleViewEmailDetails = (invoice: Invoice) => {
    setSelectedInvoiceForEmail(invoice)
    setIsEmailDetailDialogOpen(true)
  }

  const openMarkPaidDialog = (invoice: Invoice) => {
    setMarkPaidInvoice(invoice)
    setPaymentMethod("")
    setPaymentFiles([])
    setIsMarkPaidOpen(true)
  }

  const readFileAsDataUrl = (file: File): Promise<{ name: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result || "") })
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  const confirmMarkPaid = async () => {
    if (!markPaidInvoice) return
    if (!paymentMethod) {
      toast.error("Please select a payment method")
      return
    }
    if (paymentMethod === "edc" && !edcBank) {
      toast.error("Please select a bank for EDC payment")
      return
    }
    if (paymentMethod === "edc" && !edcAccountNumber.trim()) {
      toast.error("Please enter account number for EDC payment")
      return
    }
    if (paymentFiles.length === 0) {
      toast.error("Please upload at least 1 proof image (JPG/PNG)")
      return
    }

    setIsSavingPayment(true)
    try {
      const proofs = await Promise.all(paymentFiles.map(readFileAsDataUrl))
      const paidAt = new Date()
      const isPartial = paymentMethod === "partial"

      const paymentMethodDetail = paymentMethod === "edc"
        ? `EDC - ${edcBank} (${edcAccountNumber})`
        : paymentMethod

      const updatedInvoices = invoices.map(inv =>
        inv.id === markPaidInvoice.id
          ? {
              ...inv,
              status: isPartial ? inv.status : ("paid" as const),
              paidDate: isPartial ? inv.paidDate : paidAt,
              paymentMethod: paymentMethodDetail,
              paymentProofs: proofs
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
            inv.id === markPaidInvoice.id
              ? {
                  ...inv,
                  status: isPartial ? inv.status : "paid",
                  paidDate: isPartial ? inv.paidDate : paidAt.toISOString(),
                  paymentMethod: paymentMethodDetail,
                  paymentProofs: proofs
                }
              : inv
          )
          localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
        }
      } catch (error) {
        console.error("Failed to update paid status in localStorage:", error)
      }

      // Save payment record
      try {
        const paymentKey = "paymentRecords"
        const storedPayments = localStorage.getItem(paymentKey)
        const payments = storedPayments ? JSON.parse(storedPayments) : []
        const paymentRecord = {
          id: `payment-${markPaidInvoice.id}`,
          invoiceId: markPaidInvoice.id,
          invoiceNumber: markPaidInvoice.invoiceNumber,
          studentName: markPaidInvoice.studentName,
          studentId: markPaidInvoice.studentId,
          studentGrade: markPaidInvoice.studentGrade,
          amount: markPaidInvoice.finalAmount,
          term: markPaidInvoice.term || "-",
          paymentMethod: paymentMethodDetail,
          status: isPartial ? "partial" : "paid",
          transactionDate: paidAt.toISOString(),
          paymentProofs: proofs
        }
        const existingIndex = payments.findIndex((p: any) =>
          p.invoiceId === markPaidInvoice.id || p.invoiceNumber === markPaidInvoice.invoiceNumber
        )
        if (existingIndex >= 0) {
          payments[existingIndex] = paymentRecord
        } else {
          payments.push(paymentRecord)
        }
        localStorage.setItem(paymentKey, JSON.stringify(payments))
        window.dispatchEvent(new CustomEvent("paymentsUpdated"))
      } catch (error) {
        console.error("Failed to save payment record:", error)
      }

      // Auto-generate receipt if not partial payment
      if (!isPartial) {
        try {
          // Determine receipt storage key and prefix based on category
          let receiptStorageKey = ""
          let receiptPrefix = ""

          const category = markPaidInvoice.category
          if (category === "eca") {
            receiptStorageKey = "receiptRecords_eca"
            receiptPrefix = "ECA"
          } else if (category === "trip") {
            receiptStorageKey = "receiptRecords_trip"
            receiptPrefix = "TRP"
          } else if (category === "exam") {
            receiptStorageKey = "receiptRecords_event"
            receiptPrefix = "EXM"
          } else if (category === "bus") {
            receiptStorageKey = "receiptRecords_summer"
            receiptPrefix = "BUS"
          } else if (category === "external") {
            receiptStorageKey = "receiptRecords_external"
            receiptPrefix = "EXT"
          } else {
            // For tuition and other categories, use general receipt storage
            receiptStorageKey = "receiptRecords_tuition"
            receiptPrefix = "TUI"
          }

          // Get existing receipts
          const storedReceipts = localStorage.getItem(receiptStorageKey)
          const receipts = storedReceipts ? JSON.parse(storedReceipts) : []

          // Generate receipt number
          const now = new Date()
          const yearMonth = format(now, "yyMM")
          const nextNumber = receipts.length + 1
          const receiptNo = `${receiptPrefix}-${yearMonth}-${String(nextNumber).padStart(4, "0")}`

          // Create receipt record
          const receiptRecord = {
            id: `receipt-${markPaidInvoice.id}`,
            receiptNo: receiptNo,
            receiptDate: paidAt.toISOString(),
            clientType: markPaidInvoice.invoiceType === "external" ? "external" : "internal",
            clientNo: markPaidInvoice.studentId,
            clientName: markPaidInvoice.parentName || markPaidInvoice.studentName,
            contactName: markPaidInvoice.studentName,
            yearGroup: markPaidInvoice.studentGrade,
            schoolYear: markPaidInvoice.term || "",
            totalAmount: markPaidInvoice.finalAmount,
            paymentMethod: paymentMethodDetail,
            status: "generated",
            createdAt: paidAt.toISOString(),
            invoices: [
              {
                id: markPaidInvoice.id,
                invoiceNo: markPaidInvoice.invoiceNumber,
                invoiceDate: markPaidInvoice.issueDate
                  ? (typeof markPaidInvoice.issueDate === 'string'
                    ? markPaidInvoice.issueDate
                    : markPaidInvoice.issueDate.toISOString())
                  : new Date().toISOString(),
                invoiceAmount: markPaidInvoice.finalAmount,
                receivedAmount: markPaidInvoice.finalAmount,
                outstandingAmount: 0
              }
            ]
          }

          // Add receipt to storage
          receipts.push(receiptRecord)
          localStorage.setItem(receiptStorageKey, JSON.stringify(receipts))

          console.log(`Auto-generated receipt: ${receiptNo}`)
        } catch (error) {
          console.error("Failed to auto-generate receipt:", error)
          // Don't show error to user, receipt generation is secondary
        }
      }

      window.dispatchEvent(new CustomEvent("invoicesUpdated"))
      logActivity({
        action: `${isPartial ? "Recorded partial payment" : "Marked invoice as paid"} ${markPaidInvoice.invoiceNumber}`,
        module: "Invoices",
        detail: `Payment Method: ${paymentMethodDetail}, Proofs: ${proofs.length}`
      })
      toast.success(isPartial ? "Saved partial payment" : "Marked invoice as paid and receipt generated")
      setIsMarkPaidOpen(false)
      setMarkPaidInvoice(null)
      setPaymentMethod("")
      setPaymentFiles([])
      setEdcBank("")
      setEdcAccountNumber("")
    } catch (error) {
      console.error("Failed to mark paid:", error)
      toast.error("Failed to mark invoice as paid")
    } finally {
      setIsSavingPayment(false)
    }
  }

  const openApprovalDialog = (invoice: Invoice, action: "approve" | "reject") => {
    setSelectedInvoiceForApproval(invoice)
    setApprovalAction(action)
    setRejectionReason("")
    setIsApprovalDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "wait":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Wait</Badge>
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800"><Mail className="w-3 h-3 mr-1" />Sent</Badge>
      case "cancelled":
        return <span className="text-muted-foreground text-sm">—</span>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getEmailStatus = (invoice: Invoice): "wait" | "sent" | "cancelled" => {
    // If invoice is cancelled, return special status
    if (invoice.status === "cancelled") return "cancelled"
    // If invoice is paid, check if email was actually sent
    if (invoice.status === "paid") {
      // If email was never sent, show "-" (use cancelled status to display dash)
      if (!invoice.emailSentAt) return "cancelled"
      // If email was sent before payment, show "sent"
      return "sent"
    }
    // If status is sent, email has been sent
    if (invoice.status === "sent") return "sent"
    // Otherwise, email hasn't been sent yet, show "wait"
    return "wait"
  }

  const getPaymentStatus = (invoice: Invoice): "unpaid" | "paid" | "overdue" => {
    if (invoice.status === "paid") return "paid"
    if (invoice.status === "overdue") return "overdue"
    return "unpaid"
  }

  const getPaymentStatusBadge = (status: "unpaid" | "paid" | "overdue") => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
      case "unpaid":
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unpaid</Badge>
    }
  }

  const formatChanges = (changes: Array<{ field: string; from: string; to: string }>) => {
    if (changes.length === 0) return "No changes"
    return changes.map(change => `${change.field}: "${change.from}" → "${change.to}"`).join("; ")
  }

  const getInvoiceStatusBadge = (approvalStatus: ApprovalStatus) => {
    switch (approvalStatus) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approve</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Reject</Badge>
      case "wait":
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Wait</Badge>
    }
  }

  // Filter invoices based on active tab and category
  const tabFilteredInvoices = invoices.filter(inv => {
    // First filter by tab (external vs student)
    if (invoiceTypeTab === "external") {
      if (!(inv.invoiceType === "external" || inv.studentId === "EXTERNAL")) {
        return false
      }
    } else {
      if (inv.invoiceType === "external" || inv.studentId === "EXTERNAL") {
        return false
      }
    }

    // Then filter by category if provided
    if (category) {
      // Map category to invoiceType for proper filtering
      if (category === "tuition") {
        return inv.category === "tuition" || inv.invoiceType === "student" || (!inv.category && !inv.invoiceType)
      } else if (category === "external") {
        return inv.category === "external" || inv.invoiceType === "external" || inv.studentId === "EXTERNAL"
      } else {
        // For eca, trip, exam, bus - match exact category
        return inv.category === category
      }
    }

    return true
  })

  const summaryStats = {
    total: tabFilteredInvoices.length,
    draft: tabFilteredInvoices.filter(inv => inv.status === "draft").length,
    pendingApproval: tabFilteredInvoices.filter(inv => getApprovalStatus(inv) === "wait").length,
    approved: tabFilteredInvoices.filter(inv => getApprovalStatus(inv) === "approved").length,
    rejected: tabFilteredInvoices.filter(inv => getApprovalStatus(inv) === "rejected").length,
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
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={downloadInterfaceTemplate}
          >
            <Download className="w-4 h-4" />
            Download Interface File
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={exportAllInvoicesZip}
            disabled={isExportingAll}
          >
            <Download className="w-4 h-4" />
            {isExportingAll
              ? `${t("invoice.exporting")} ${exportProgress?.current ?? 0}/${exportProgress?.total ?? 0}`
              : t("invoice.exportAll")}
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={exportInvoiceReport}>
            <Download className="w-4 h-4" />
            {t("invoice.exportReport")}
          </Button>
          <Button onClick={() => onNavigateToSubPage(category === 'external' ? 'external-invoice-creation' : 'invoice-creation', { category, invoiceType: category === 'tuition' ? 'student' : category })} className="flex items-center gap-2">
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
            <div className="text-2xl font-bold">{summaryStats.totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Type Tabs */}
      <Tabs value={invoiceTypeTab} onValueChange={(value) => setInvoiceTypeTab(value as "student" | "external")} className="w-full">
        {showTypeTabs && (
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
        )}

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

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                {/* Approval Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Approval Status</label>
                  <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                      <SelectItem value="wait">
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Wait</Badge>
                      </SelectItem>
                      <SelectItem value="approved">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approve</Badge>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Reject</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">E-mail Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                      <SelectItem value="wait">
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Wait</Badge>
                      </SelectItem>
                      <SelectItem value="sent">
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Invoice Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Invoice Status</label>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                      <SelectItem value="unpaid">
                        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Unpaid</Badge>
                      </SelectItem>
                      <SelectItem value="paid">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
                      </SelectItem>
                      <SelectItem value="overdue">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={paginatedInvoices.length > 0 && paginatedInvoices.every(invoice => selectedInvoiceIds.has(invoice.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllCurrentPage(paginatedInvoices)
                          } else {
                            const newSelected = new Set(selectedInvoiceIds)
                            paginatedInvoices.forEach(invoice => {
                              newSelected.delete(invoice.id)
                            })
                            setSelectedInvoiceIds(newSelected)
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>{renderSortHeader(t("invoice.invoiceNumber"), "invoiceNumber")}</TableHead>
                    <TableHead>{renderSortHeader(t("invoice.student"), "studentName")}</TableHead>
                    <TableHead>{renderSortHeader(t("invoice.yearGroup"), "studentGrade")}</TableHead>
                    <TableHead>{renderSortHeader(t("common.amount"), "finalAmount")}</TableHead>
                    <TableHead>{renderSortHeader("Approval Status", "invoiceStatus")}</TableHead>
                    <TableHead>{renderSortHeader("E-mail Status", "emailStatus")}</TableHead>
                    <TableHead>{renderSortHeader("Invoice Status", "paymentStatus")}</TableHead>
                    <TableHead>{renderSortHeader(t("invoice.issueDate"), "issueDate")}</TableHead>
                    <TableHead>{renderSortHeader(t("invoice.dueDate"), "dueDate")}</TableHead>
                    <TableHead className="text-center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvoiceIds.has(invoice.id)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {displayInvoiceNumber(invoice.invoiceNumber)}
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
                          {invoice.finalAmount.toLocaleString()}
                        </div>
                        {invoice.discountAmount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Discount: {invoice.discountAmount.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getInvoiceStatusBadge(getApprovalStatus(invoice))}</TableCell>
                      <TableCell
                        className={getEmailStatus(invoice) === "sent" ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
                        onClick={getEmailStatus(invoice) === "sent" ? () => handleViewEmailDetails(invoice) : undefined}
                      >
                        {getStatusBadge(getEmailStatus(invoice))}
                      </TableCell>
                      <TableCell>
                        {invoice.status === "cancelled" ? (
                          <Badge className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>
                        ) : (
                          getPaymentStatusBadge(getPaymentStatus(invoice))
                        )}
                      </TableCell>
                      <TableCell>{invoice.issueDate ? format(invoice.issueDate, "MMM dd, yyyy") : "-"}</TableCell>
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
                            disabled={!canEditInvoice(invoice.status, getApprovalStatus(invoice))}
                            className={!canEditInvoice(invoice.status, getApprovalStatus(invoice)) ? "opacity-30 cursor-not-allowed" : ""}
                            onClick={() => {
                              if (!canEditInvoice(invoice.status, getApprovalStatus(invoice))) return
                              // Navigate to invoice-creation page for editing
                              const editInvoice = {
                                id: invoice.id,
                                invoiceNumber: invoice.invoiceNumber,
                                studentName: invoice.studentName,
                                studentId: invoice.studentId,
                                studentGrade: invoice.studentGrade,
                                parentName: invoice.parentName,
                                parentEmail: invoice.parentEmail,
                                totalAmount: invoice.totalAmount,
                                discountAmount: invoice.discountAmount,
                                finalAmount: invoice.finalAmount,
                                status: invoice.status,
                                approvalStatus: getApprovalStatus(invoice),
                                issueDate: invoice.issueDate ? invoice.issueDate.toISOString() : null,
                                dueDate: invoice.dueDate.toISOString(),
                                items: invoice.items.map(item => ({
                                  id: item.id,
                                  name: item.description,
                                  description: item.description,
                                  category: "Tuition",
                                  quantity: 1,
                                  amount: item.discountedAmount
                                })),
                                category: invoice.category || category,
                                term: invoice.term,
                                academicYear: invoice.academicYear
                              }
                              onNavigateToSubPage?.("invoice-creation", { editInvoice, category: invoice.category || category })
                            }}
                            title={canEditInvoice(invoice.status, getApprovalStatus(invoice)) ? "Edit" : "Cannot edit (already approved)"}
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
                          {getApprovalStatus(invoice) === "approved" && invoice.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openSendEmailConfirm(invoice.id)}
                              title="Send Email"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                          {getApprovalStatus(invoice) === "approved" && invoice.status !== "paid" && invoice.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => openMarkPaidDialog(invoice)}
                              title="Mark Paid"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
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
              {/* Row 1 */}
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

                {/* Approval Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Approval Status</label>
                  <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                      <SelectItem value="wait">
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Wait</Badge>
                      </SelectItem>
                      <SelectItem value="approved">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approve</Badge>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Reject</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* E-mail Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">E-mail Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                      <SelectItem value="wait">
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Wait</Badge>
                      </SelectItem>
                      <SelectItem value="sent">
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Invoice Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Invoice Status</label>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("invoice.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                      <SelectItem value="unpaid">
                        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Unpaid</Badge>
                      </SelectItem>
                      <SelectItem value="paid">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
                      </SelectItem>
                      <SelectItem value="overdue">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <TableHead className="w-12">
                        <Checkbox
                          checked={paginatedInvoices.length > 0 && paginatedInvoices.every(invoice => selectedInvoiceIds.has(invoice.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllCurrentPage(paginatedInvoices)
                            } else {
                              const newSelected = new Set(selectedInvoiceIds)
                              paginatedInvoices.forEach(invoice => {
                                newSelected.delete(invoice.id)
                              })
                              setSelectedInvoiceIds(newSelected)
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>{renderSortHeader(t("invoice.invoiceNumber"), "invoiceNumber")}</TableHead>
                      <TableHead>{renderSortHeader(t("invoice.recipient"), "studentName")}</TableHead>
                      <TableHead>{renderSortHeader(t("invoice.event"), "eventName")}</TableHead>
                      <TableHead>{renderSortHeader(t("common.amount"), "finalAmount")}</TableHead>
                      <TableHead>{renderSortHeader("Approval Status", "invoiceStatus")}</TableHead>
                      <TableHead>{renderSortHeader("E-mail Status", "emailStatus")}</TableHead>
                      <TableHead>{renderSortHeader("Invoice Status", "paymentStatus")}</TableHead>
                      <TableHead>{renderSortHeader(t("invoice.issueDate"), "issueDate")}</TableHead>
                      <TableHead>{renderSortHeader(t("invoice.dueDate"), "dueDate")}</TableHead>
                      <TableHead className="text-center">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoiceIds.has(invoice.id)}
                            onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {displayInvoiceNumber(invoice.invoiceNumber)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.recipientName || invoice.studentName}</div>
                            <div className="text-sm text-muted-foreground">{invoice.parentEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{invoice.eventName || "-"}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{invoice.finalAmount.toLocaleString()}</TableCell>
                        <TableCell>{getInvoiceStatusBadge(getApprovalStatus(invoice))}</TableCell>
                        <TableCell
                          className={getEmailStatus(invoice) === "sent" ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
                          onClick={getEmailStatus(invoice) === "sent" ? () => handleViewEmailDetails(invoice) : undefined}
                        >
                          {getStatusBadge(getEmailStatus(invoice))}
                        </TableCell>
                        <TableCell>
                        {invoice.status === "cancelled" ? (
                          <Badge className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>
                        ) : (
                          getPaymentStatusBadge(getPaymentStatus(invoice))
                        )}
                      </TableCell>
                        <TableCell>{invoice.issueDate ? format(invoice.issueDate, "MMM dd, yyyy") : "-"}</TableCell>
                        <TableCell>{format(invoice.dueDate, "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Open external preview dialog
                                setSelectedInvoice(invoice)
                                setIsExternalPreviewOpen(true)
                              }}
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canEditInvoice(invoice.status, getApprovalStatus(invoice))}
                              className={!canEditInvoice(invoice.status, getApprovalStatus(invoice)) ? "opacity-30 cursor-not-allowed" : ""}
                              onClick={() => {
                                if (!canEditInvoice(invoice.status, getApprovalStatus(invoice))) return
                                // Navigate to ExternalInvoiceCreation for editing
                                const editInvoice = {
                                  id: invoice.id,
                                  invoiceNumber: invoice.invoiceNumber,
                                  clientName: invoice.recipientName || invoice.studentName,
                                  contactName: invoice.parentName,
                                  address: invoice.recipientAddress || "",
                                  invoiceDate: invoice.issueDate ? invoice.issueDate.toISOString() : new Date().toISOString(),
                                  dueDate: invoice.dueDate.toISOString(),
                                  items: invoice.items.map(item => ({
                                    itemId: item.id,
                                    description: item.description,
                                    details: item.notes || "",
                                    amount: item.discountedAmount
                                  })),
                                  status: invoice.status,
                                  approvalStatus: getApprovalStatus(invoice)
                                }
                                onNavigateToSubPage("external-invoice-creation", { editInvoice })
                              }}
                              title={canEditInvoice(invoice.status, getApprovalStatus(invoice)) ? "Edit" : "Cannot edit (already approved)"}
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
                            {getApprovalStatus(invoice) === "approved" && invoice.status !== "cancelled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openSendEmailConfirm(invoice.id)}
                                title="Send Email"
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                            )}
                            {getApprovalStatus(invoice) === "approved" && invoice.status !== "paid" && invoice.status !== "cancelled" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => openMarkPaidDialog(invoice)}
                                title="Mark Paid"
                              >
                                <DollarSign className="w-4 h-4" />
                              </Button>
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
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] p-0 flex flex-col">
          {selectedInvoice && (
            <div className="flex flex-col h-full">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
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
                        <span className="text-sm font-medium text-gray-800">
                          {(selectedInvoice.status === 'sent' || getApprovalStatus(selectedInvoice) === 'approved')
                            ? selectedInvoice.invoiceNumber
                            : 'Pending Approval'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Invoice Date</span>
                        <span className="text-sm font-medium text-gray-800">{selectedInvoice.issueDate ? format(selectedInvoice.issueDate, "dd MMM yyyy") : "Pending Approval"}</span>
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
                            : (selectedInvoice.issueDate ? getAcademicYear(selectedInvoice.issueDate) : "-")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cancellation Information - Full Width */}
                {selectedInvoice.status === "cancelled" && (
                  <div className="my-6 bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800 mb-1">Invoice Cancelled</p>
                        <p className="text-sm text-red-700">
                          <span className="font-medium">Reason:</span> {selectedInvoice.cancelReason || "No reason recorded"}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {selectedInvoice.cancelledBy && <>Cancelled by {selectedInvoice.cancelledBy}</>}
                          {selectedInvoice.cancelledAt ? (
                            <>
                              {selectedInvoice.cancelledBy && <> on </>}
                              {new Date(selectedInvoice.cancelledAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })} at {new Date(selectedInvoice.cancelledAt).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}
                            </>
                          ) : (
                            "Date and time not recorded"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Information - Full Width */}
                {selectedInvoice.approvalStatus === "rejected" && (
                  <div className="my-6 bg-orange-50 border border-orange-200 rounded-md p-4">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-800 mb-1">Invoice Rejected</p>
                        <p className="text-sm text-orange-700">
                          <span className="font-medium">Reason:</span> {selectedInvoice.rejectedReason || "No reason recorded"}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          {selectedInvoice.rejectedBy && <>Rejected by {selectedInvoice.rejectedBy}</>}
                          {selectedInvoice.rejectedAt ? (
                            <>
                              {selectedInvoice.rejectedBy && <> on </>}
                              {new Date(selectedInvoice.rejectedAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })} at {new Date(selectedInvoice.rejectedAt).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}
                            </>
                          ) : (
                            "Date and time not recorded"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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

                    // Skip all discounts for ECA, Trip & Activity, Exam, and Bus invoices
                    const isNonDiscountableInvoice = selectedInvoice.invoiceType === "eca" ||
                                                      selectedInvoice.invoiceType === "afterschool" ||
                                                      selectedInvoice.invoiceType === "trip" ||
                                                      selectedInvoice.invoiceType === "exam" ||
                                                      selectedInvoice.invoiceType === "bus" ||
                                                      selectedInvoice.category === "eca" ||
                                                      selectedInvoice.category === "trip" ||
                                                      selectedInvoice.category === "exam" ||
                                                      selectedInvoice.category === "bus"

                    // 1. Sibling discount
                    if (!isNonDiscountableInvoice && student && student.childOrder >= 2 && selectedInvoice.invoiceType !== "external" && selectedInvoice.studentId !== "EXTERNAL") {
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
                    if (!isNonDiscountableInvoice) {
                      const registrationFeeWaiver = selectedInvoice.items
                        .filter(item => item.description.toLowerCase().includes('registration') && item.discountPercent > 0)
                        .reduce((sum, item) => sum + (item.amount - item.discountedAmount), 0)
                      if (registrationFeeWaiver > 0) {
                        discountLines.push({
                          name: "Registration Fee Waiver",
                          amount: registrationFeeWaiver
                        })
                      }
                    }

                    // 3. Student group discounts
                    if (!isNonDiscountableInvoice && selectedInvoice.invoiceType !== "external" && selectedInvoice.studentId !== "EXTERNAL") {
                      const invoiceCategory = selectedInvoice.category || category
                      const groupDiscounts = getStudentGroupDiscounts(selectedInvoice.studentId, invoiceCategory)
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

                    // 4. Fee Waiver Program (75,000/term for eligible students)
                    if (!isNonDiscountableInvoice && student && selectedInvoice.invoiceType !== "external" && selectedInvoice.studentId !== "EXTERNAL") {
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
                    if (!isNonDiscountableInvoice && student && student.notes?.toLowerCase().includes('staff')) {
                      const staffAmount = Math.round(subtotal * 50 / 100)
                      discountLines.push({
                        name: "Staff Child Discount",
                        amount: staffAmount,
                        percent: 50
                      })
                    }

                    // 6. Scholarship
                    if (!isNonDiscountableInvoice && student && student.notes?.toLowerCase().includes('scholarship')) {
                      const scholarshipAmount = subtotal // 100% scholarship
                      discountLines.push({
                        name: "Scholarship",
                        amount: scholarshipAmount,
                        percent: 100
                      })
                    }

                    // 7. Early Bird (5%)
                    if (!isNonDiscountableInvoice && student && student.notes?.toLowerCase().includes('early bird')) {
                      const earlyBirdAmount = Math.round(subtotal * 5 / 100)
                      discountLines.push({
                        name: "Early Bird Discount",
                        amount: earlyBirdAmount,
                        percent: 5
                      })
                    }

                    // Get registration fees from saved invoice data (new students)
                    const savedRegistrationFees = (selectedInvoice as any).registrationFees || []
                    const isNewStudent = (selectedInvoice as any).isNewStudent || savedRegistrationFees.length > 0
                    const registrationFeesTotal = savedRegistrationFees.reduce((sum: number, fee: any) => sum + fee.amount, 0)

                    // Calculate late fee (1.5% if overdue)
                    const today = new Date()
                    const dueDate = new Date(selectedInvoice.dueDate)
                    const isOverdue = today > dueDate && selectedInvoice.status !== "paid"
                    const lateFeePercent = 1.5
                    const lateFeeAmount = isOverdue ? Math.round(subtotal * lateFeePercent / 100) : 0

                    // Calculate total discounts
                    let totalDiscounts = discountLines.reduce((sum, d) => sum + d.amount, 0)

                    // Cap total discounts at subtotal to prevent negative amounts
                    if (totalDiscounts > subtotal) {
                      totalDiscounts = subtotal
                    }

                    // Final total (ID Charges removed)
                    const finalTotal = subtotal - totalDiscounts + registrationFeesTotal + lateFeeAmount

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
                              Registration Fee Waiver ({feeWaiverDiscount.amount.toLocaleString()}/term)
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

                        {/* 7. Late Fee (Red) */}
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
            </div>

            {/* Action Buttons - Sticky Footer */}
            <div className="flex items-center justify-end px-8 py-4 border-t bg-gray-50 shrink-0">
              <div className="flex gap-3">
                <Button variant="outline" onClick={closeInvoiceModal}>
                  Close
                </Button>
                <Button
                  onClick={() => selectedInvoice && downloadSingleInvoicePDF(selectedInvoice)}
                  disabled={isDownloadingPDF}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isDownloadingPDF ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </Button>
                {(() => {
                  const shouldShowCancelButton = getApprovalStatus(selectedInvoice) === "approved" && selectedInvoice.status !== "cancelled"
                  console.log('[Cancel Button] Visibility check:', {
                    approvalStatus: getApprovalStatus(selectedInvoice),
                    invoiceStatus: selectedInvoice.status,
                    shouldShow: shouldShowCancelButton
                  })
                  return shouldShowCancelButton ? (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const modalData = {
                          id: selectedInvoice.id,
                          invoiceNumber: selectedInvoice.invoiceNumber,
                          studentName: selectedInvoice.studentName,
                          status: selectedInvoice.status
                        }
                        // Open cancel dialog
                        const reason = prompt("Please specify the reason for cancellation:")
                        if (reason && reason.trim()) {
                          handleCancelInvoice(modalData, reason.trim())
                          closeInvoiceModal()
                        }
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel Invoice
                    </Button>
                  ) : null
                })()}
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Available Items ({availableItems.length})</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddItemsDialogOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add More Items
                    </Button>
                  </div>
                  <div className="space-y-0 border rounded-lg">
                    {availableItems.slice(0, 5).map((item, index) => {
                      const isSelected = selectedItems.find(i => i.id === item.id)
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                            index !== 0 ? 'border-t' : ''
                          } ${isSelected ? 'bg-primary/5' : ''}`}
                          onClick={() => isSelected ? handleItemRemove(item.id) : handleItemSelect(item)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{item.name}</span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  item.category === "Tuition" ? "border-blue-300 text-blue-700" :
                                  item.category === "ECA" ? "border-green-300 text-green-700" :
                                  item.category === "Trip & Other Activity" ? "border-orange-300 text-orange-700" :
                                  item.category === "School Bus" ? "border-purple-300 text-purple-700" :
                                  "border-gray-300 text-gray-700"
                                }`}
                              >
                                {item.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{item.description}</p>
                            <p className="font-medium">{item.amount.toLocaleString()}</p>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            {isSelected ? (
                              <CheckCircle className="w-5 h-5 text-primary" />
                            ) : (
                              <Plus className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {availableItems.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Showing 5 of {availableItems.length} items. Click "+ Add More Items" to see all.
                    </p>
                  )}
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
                                {item.amount.toLocaleString()}
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
                            <span>{selectedItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-medium text-lg">
                            <span>Total Amount:</span>
                            <span>{(selectedItems.reduce((sum, item) => sum + item.amount, 0) * selectedStudents.length).toLocaleString()}</span>
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
                      <p className="text-blue-700">Amount per Student: <span className="font-medium">{selectedItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span></p>
                      <p className="text-blue-700">Total Amount: <span className="font-medium">{(selectedItems.reduce((sum, item) => sum + item.amount, 0) * selectedStudents.length).toLocaleString()}</span></p>
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
              <label className="text-sm font-medium">Amount *</label>
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
                  <span>{parseFloat(newItem.amount || "0").toLocaleString()}</span>
                </div>
                {newItem.discountPercent && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Discount ({newItem.discountPercent}%):</span>
                      <span className="text-red-600">
                        -{(parseFloat(newItem.amount || "0") * parseFloat(newItem.discountPercent || "0") / 100).toLocaleString()}
                      </span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-medium">
                      <span>Final Amount:</span>
                      <span>
                        {(parseFloat(newItem.amount || "0") * (1 - parseFloat(newItem.discountPercent || "0") / 100)).toLocaleString()}
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

      {/* Add More Items Dialog */}
      <Dialog open={isAddItemsDialogOpen} onOpenChange={setIsAddItemsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add More Items
            </DialogTitle>
            <DialogDescription>
              Search and select items to add to the invoice
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name or description..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Items List */}
            <div className="max-h-[50vh] overflow-y-auto border rounded-lg">
              {availableItems
                .filter(item =>
                  item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                  item.description.toLowerCase().includes(itemSearchQuery.toLowerCase())
                )
                .map((item, index) => {
                  const isSelected = selectedItems.find(i => i.id === item.id)
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        index !== 0 ? 'border-t' : ''
                      } ${isSelected ? 'bg-primary/5' : ''}`}
                      onClick={() => isSelected ? handleItemRemove(item.id) : handleItemSelect(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{item.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              item.category === "Tuition" ? "border-blue-300 text-blue-700" :
                              item.category === "ECA" ? "border-green-300 text-green-700" :
                              item.category === "Trip & Other Activity" ? "border-orange-300 text-orange-700" :
                              item.category === "School Bus" ? "border-purple-300 text-purple-700" :
                              "border-gray-300 text-gray-700"
                            }`}
                          >
                            {item.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{item.description}</p>
                        <p className="font-medium text-sm">{item.amount.toLocaleString()}</p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        {isSelected ? (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        ) : (
                          <Plus className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  )
                })}
              {availableItems.filter(item =>
                item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(itemSearchQuery.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No items found</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal - With Edit capability for non-approved invoices */}
      <ViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        type="invoice"
        data={viewModalData}
        onSave={handleSaveInvoiceFromModal}
        onDownload={handleDownloadInvoice}
        onPrint={handlePrintInvoice}
        onCancel={handleCancelInvoice}
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
                              <TableCell className="text-right">{row.amount.toLocaleString()}</TableCell>
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

      {/* Mark Paid Dialog */}
      <Dialog open={isMarkPaidOpen} onOpenChange={setIsMarkPaidOpen}>
        <DialogContent className="p-6" style={{ width: "50vw", maxWidth: "600px" }}>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Upload payment proof (JPG/PNG) and select a payment method.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier-check">Cashier&apos;s cheque</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="edc">EDC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* EDC Details - Show only when EDC is selected */}
            {paymentMethod === "edc" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Bank</label>
                  <Select value={edcBank} onValueChange={setEdcBank}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kasikorn">Kasikorn</SelectItem>
                      <SelectItem value="UOB">UOB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Account Number</label>
                  <input
                    type="text"
                    value={edcAccountNumber}
                    onChange={(e) => setEdcAccountNumber(e.target.value)}
                    placeholder="Enter account number"
                    className="w-full h-9 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Proof (JPG/PNG)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setPaymentFiles(files)
                  }}
                  className="hidden"
                  id="payment-proof-upload"
                />
                <label htmlFor="payment-proof-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>Browse</span>
                  </Button>
                </label>
                <span className="text-sm text-muted-foreground">
                  {paymentFiles.length > 0 ? `${paymentFiles.length} file(s) selected` : "No file chosen"}
                </span>
              </div>
              {paymentFiles.length > 0 && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  {paymentFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`}>{file.name}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMarkPaidOpen(false)
                setMarkPaidInvoice(null)
                setPaymentMethod("")
                setPaymentFiles([])
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmMarkPaid} disabled={isSavingPayment}>
              {isSavingPayment ? "Saving..." : "Confirm Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Draft Invoice Modal - Professional SaaS Design */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden p-0 flex flex-col">
          {selectedInvoice && (
            <>
              {/* Header Section */}
              <div className="flex-shrink-0 bg-white border-b px-8 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Edit Invoice</h2>
                    <p className="text-sm text-gray-500 mt-1">{displayInvoiceNumber(selectedInvoice.invoiceNumber)}</p>
                  </div>
                  <Badge variant={selectedInvoice.status === 'draft' ? 'secondary' : 'default'} className="text-sm px-4 py-1.5">
                    {selectedInvoice.status === 'draft' ? 'Draft' : 'Pending Approval'}
                  </Badge>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-gray-50">
                {/* 2-Column Layout: Student/Parent Info & Invoice Details */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Student Information Card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Student Information</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-500">Student ID</span>
                        <span className="text-sm font-medium text-gray-900 text-right">{selectedInvoice.studentId}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-500">Name</span>
                        <span className="text-sm font-medium text-gray-900 text-right">{selectedInvoice.studentName}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-500">Year Group</span>
                        <span className="text-sm font-medium text-gray-900 text-right">{selectedInvoice.studentGrade}</span>
                      </div>
                    </div>
                  </div>

                  {/* Parent Information Card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Parent Information</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-500">Contact Name</span>
                        <span className="text-sm font-medium text-gray-900 text-right">{selectedInvoice.parentName}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-500">Email</span>
                        <span className="text-sm font-medium text-gray-900 text-right break-all">{selectedInvoice.parentEmail}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Details Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">Invoice Details</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500 mb-1">Invoice Date</span>
                      <span className="text-sm font-medium text-gray-900">{format(selectedInvoice.issueDate, "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500 mb-1">Due Date</span>
                      <Input
                        type="date"
                        value={editingDueDate ? format(editingDueDate, "yyyy-MM-dd") : format(selectedInvoice.dueDate, "yyyy-MM-dd")}
                        onChange={(e) => {
                          if (e.target.value) {
                            // Parse date correctly to avoid timezone issues
                            const [year, month, day] = e.target.value.split('-').map(Number)
                            setEditingDueDate(new Date(year, month - 1, day))
                          } else {
                            setEditingDueDate(undefined)
                          }
                        }}
                        className="h-9 text-red-600 font-medium"
                        min={format(new Date(), "yyyy-MM-dd")}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500 mb-1">Academic Year</span>
                      <span className="text-sm font-medium text-gray-900">{selectedInvoice.issueDate ? getAcademicYear(selectedInvoice.issueDate) : "-"}</span>
                    </div>
                    {selectedInvoice.term && (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500 mb-1">Term</span>
                        <span className="text-sm font-medium text-gray-900">{selectedInvoice.term}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Discounts Applied */}
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
                  const invoiceCategory = selectedInvoice.category || category
                  const groupDiscounts = getStudentGroupDiscounts(selectedInvoice.studentId, invoiceCategory)
                  groupDiscounts.forEach(group => {
                    discounts.push({
                      name: group.name,
                      value: group.discountType === "percentage"
                        ? `${group.discountPercentage}%`
                        : `${group.fixedAmount.toLocaleString()}`,
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
                        value: `${feeWaiverEligibility.creditPerTerm.toLocaleString()}/term`,
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
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <p className="text-sm font-medium text-gray-900 mb-3">Discounts Applied</p>
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

                {/* Invoice Items */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="border-b bg-gray-50 px-5 py-3">
                    <h3 className="text-base font-semibold text-gray-900">Invoice Items</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left text-sm font-medium text-gray-500 px-5 py-3 w-12">#</th>
                          <th className="text-left text-sm font-medium text-gray-500 px-5 py-3">Description & Notes</th>
                          <th className="text-right text-sm font-medium text-gray-500 px-5 py-3 w-32">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {editingItems.map((item, index) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-5 py-4 text-sm text-gray-500 align-top">{index + 1}</td>
                            <td className="px-5 py-4">
                              <div className="text-sm font-medium text-gray-900 mb-1.5">
                                {item.description}
                                {item.discountPercent > 0 && (
                                  <span className="text-gray-400 text-xs ml-2">(-{item.discountPercent}%)</span>
                                )}
                              </div>
                              <Input
                                value={item.notes || ''}
                                onChange={(e) => {
                                  const newItems = [...editingItems]
                                  newItems[index] = { ...item, notes: e.target.value }
                                  setEditingItems(newItems)
                                }}
                                placeholder="Add notes (optional)"
                                className="h-8 text-xs bg-gray-50 border-gray-200 focus:bg-white mt-1.5"
                              />
                            </td>
                            <td className="px-5 py-4 text-right text-sm font-medium text-gray-900 whitespace-nowrap align-top">
                              {formatCurrency(item.discountedAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t bg-gray-50 px-5 py-4">
                    <div className="text-xs text-gray-500 mb-2 italic">{numberToWords(selectedInvoice.finalAmount)}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">TOTAL</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(selectedInvoice.finalAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Invoice Notes */}
                {selectedInvoice.notes && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Invoice Notes</h3>
                    <p className="text-sm text-gray-600">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-t bg-white">
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
                    onClick={() => setIsConfirmSaveOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={saveAndSendInvoice}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </div>
            </>
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
                <span className="font-medium text-right">{displayInvoiceNumber(selectedInvoiceForApproval.invoiceNumber)}</span>
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
                <span className="font-semibold text-green-600">{selectedInvoiceForApproval.finalAmount.toLocaleString()}</span>
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

      {/* Save Confirmation Dialog */}
      <Dialog open={isConfirmSaveOpen} onOpenChange={setIsConfirmSaveOpen}>
        <DialogContent className="sm:max-w-[450px] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Save Changes</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Are you sure you want to save the changes to this invoice?
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Number</span>
                <span className="font-medium">{displayInvoiceNumber(selectedInvoice.invoiceNumber)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Student</span>
                <span className="font-medium">{selectedInvoice.studentName}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-semibold text-green-600">{selectedInvoice.finalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsConfirmSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* External Invoice Preview Dialog */}
      <Dialog open={isExternalPreviewOpen} onOpenChange={setIsExternalPreviewOpen}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>Preview of the external invoice</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="bg-white text-black p-8 max-w-[794px] mx-auto" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
              {/* School Header */}
              <div className="text-center mb-2">
                <img src={SchoolLogo} alt="School Logo" className="mx-auto mb-1" style={{ height: '180px' }} />
                <p className="text-xs font-bold tracking-wider">KING'S COLLEGE INTERNATIONAL SCHOOL</p>
                <p className="text-[10px] text-gray-600 tracking-wide">BANGKOK</p>
                <p className="text-[9px] text-gray-500 mt-1">{SCHOOL_INFO.address}</p>
                <p className="text-[9px] text-gray-500">{SCHOOL_INFO.phone}, {SCHOOL_INFO.email}, {SCHOOL_INFO.website}</p>
              </div>

              {/* Invoice Title */}
              <h1 className="font-black text-center my-6" style={{ fontSize: '32px' }}>INVOICE</h1>

              {/* Client & Invoice Info */}
              <div className="border border-black p-4 mb-6" style={{ fontSize: '12px' }}>
                <div className="flex justify-between">
                  {/* Left side - Client Info */}
                  <table>
                    <tbody>
                      <tr>
                        <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Client no.</td>
                        <td className="py-1">000000</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Client name</td>
                        <td className="py-1">{selectedInvoice.recipientName || selectedInvoice.studentName}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Contact name</td>
                        <td className="py-1">{selectedInvoice.parentName || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold align-top" style={{ paddingRight: '24px' }}>Address</td>
                        <td className="py-1 whitespace-pre-line">{selectedInvoice.recipientAddress || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                  {/* Right side - Invoice Info */}
                  <table>
                    <tbody>
                      <tr>
                        <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Invoice no.</td>
                        <td className="py-1">
                          {(selectedInvoice.status === 'sent' || getApprovalStatus(selectedInvoice) === 'approved')
                            ? (displayInvoiceNumber(selectedInvoice.invoiceNumber) || "-")
                            : "Pending Approval"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Invoice date</td>
                        <td className="py-1">{selectedInvoice.issueDate ? format(selectedInvoice.issueDate, 'd MMMM yyyy') : 'Pending Approval'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Due date</td>
                        <td className="py-1">{format(selectedInvoice.dueDate, 'd MMMM yyyy')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border border-black mb-6" style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr className="border-b border-black">
                    <th className="py-2 px-4 text-center font-bold border-r border-black">Description</th>
                    <th className="py-2 px-4 text-center font-bold" style={{ width: '100px' }}>Amount<br/>(THB)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="py-3 px-4 align-top border-r border-black">
                        <div>{item.description}</div>
                        {item.notes && (
                          <div className="text-gray-600">{item.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right align-top">
                        {item.discountedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="border-t border-black">
                    <td className="py-3 px-4 border-r border-black">
                      <div className="flex justify-between items-center">
                        <span>{numberToWords(selectedInvoice.finalAmount)}</span>
                        <span className="font-bold">Total</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {selectedInvoice.finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Payment Methods */}
              <div className="mb-6" style={{ fontSize: '10px', lineHeight: '1.5' }}>
                <p className="font-bold mb-2">Payment methods</p>
                <div className="space-y-2">
                  <div className="flex">
                    <span className="mr-2">-</span>
                    <div>
                      <span className="font-bold">Cheque:</span> Cheques must be made payable to King's College International School Bangkok and marked A/C Payee Only. Please deliver cheques to the Finance & Accounting Department.
                    </div>
                  </div>
                  <div className="flex">
                    <span className="mr-2">-</span>
                    <div>
                      <span className="font-bold">Bank transfer:</span> Further bank details are shown below. Kindly email your name and invoice number to {SCHOOL_INFO.email}, with the proof of payment attached on the completion of the transfer process. Please ensure that your payment covers all bank charges.
                      <table className="mt-2 ml-6">
                        <tbody>
                          <tr><td className="pr-6 py-0.5">Account name</td><td>{BANK_DETAILS.accountName}</td></tr>
                          <tr><td className="pr-6 py-0.5">Account number</td><td>{BANK_DETAILS.accountNumber}</td></tr>
                          <tr><td className="pr-6 py-0.5">Bank name</td><td>{BANK_DETAILS.bankName}</td></tr>
                          <tr><td className="pr-6 py-0.5">Branch</td><td>{BANK_DETAILS.branch}</td></tr>
                          <tr><td className="pr-6 py-0.5">Swift code</td><td>KASITHBK</td></tr>
                          <tr><td className="pr-6 py-0.5">Bank address</td><td>1 Soi Rat Burana 27/1, Rat Burana Road, Bangkok 10140</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex">
                    <span className="mr-2">-</span>
                    <div className="flex-1">
                      <span className="font-bold">Bill Payment via Mobile Banking, Internet Banking, ATM or at Bank Counter:</span> Please use the QR code provided below to scan for payment. Kindly note that bank charges will apply to payments made via ATM or at the bank counter.
                      <div className="flex justify-between items-start mt-2">
                        <table className="ml-6">
                          <tbody>
                            <tr><td className="pr-6 py-0.5">Biller ID no.</td><td>099-4-00259063-3</td></tr>
                            <tr><td className="pr-6 py-0.5">Reference no. (Ref 1)</td><td>700002</td></tr>
                            <tr><td className="pr-6 py-0.5">Reference no. (Ref 2)</td><td>
                              {(selectedInvoice.status === 'sent' || getApprovalStatus(selectedInvoice) === 'approved')
                                ? (displayInvoiceNumber(selectedInvoice.invoiceNumber) || "-")
                                : "-"}
                            </td></tr>
                          </tbody>
                        </table>
                        {/* QR Code */}
                        <div className="w-16 h-16 border border-black flex items-center justify-center bg-gray-100">
                          <span className="text-[8px] text-gray-500">QR</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between mt-8 px-8">
                <div className="text-center">
                  <p className="mb-4" style={{ fontSize: '10px' }}>Thananchaya Chalorkpunrattana</p>
                  <div className="border-t border-black w-40 mx-auto"></div>
                  <p className="mt-1" style={{ fontSize: '10px' }}>Prepared by</p>
                </div>
                <div className="text-center">
                  <p className="mb-4" style={{ fontSize: '10px' }}>Porntip Jarusintrangkul</p>
                  <div className="border-t border-black w-40 mx-auto"></div>
                  <p className="mt-1" style={{ fontSize: '10px' }}>Authorised officer</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 p-4 border-t">
            <Button variant="outline" onClick={() => setIsExternalPreviewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => selectedInvoice && downloadSingleInvoicePDF(selectedInvoice)}
              disabled={isDownloadingPDF}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isDownloadingPDF ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Detail Dialog */}
      <Dialog open={isEmailDetailDialogOpen} onOpenChange={setIsEmailDetailDialogOpen}>
        <DialogContent className="p-0 gap-0" style={{ width: "50vw", maxWidth: "600px" }}>
          {/* Header */}
          <DialogHeader className="px-8 pt-5 pb-4 border-b bg-white">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Mail className="w-4 h-4 text-foreground" />
              E-mail Status Details
            </DialogTitle>
          </DialogHeader>

          {selectedInvoiceForEmail && (() => {
            // Get display date for email sent - ONLY use emailSentAt (actual send time)
            const emailStatus = getEmailStatus(selectedInvoiceForEmail)
            const displayEmailDate = selectedInvoiceForEmail.emailSentAt
            console.log('[Email Status Modal] Invoice:', selectedInvoiceForEmail.invoiceNumber, 'emailSentAt:', selectedInvoiceForEmail.emailSentAt, 'Status:', emailStatus)

            return (
              <div className="px-8 pt-6 pb-6">
                {/* Main Information - Flat Style */}
                <div className="grid grid-cols-3 gap-8 mb-6 pb-4 border-b">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Invoice Number</p>
                    <p className="text-base font-bold text-foreground">{displayInvoiceNumber(selectedInvoiceForEmail.invoiceNumber)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Student Name</p>
                    <p className="text-base font-bold text-foreground">{selectedInvoiceForEmail.studentName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email Status</p>
                    <div className="mt-1">
                      {getStatusBadge(emailStatus)}
                    </div>
                  </div>
                </div>

                {/* Email Sent Success - Clean Card */}
                {displayEmailDate && emailStatus === "sent" && (
                  <div className="rounded-xl border-2 border-green-500 bg-white p-6">
                    <div className="mb-4">
                      <h4 className="font-bold text-foreground text-lg mb-1">Email Sent Successfully</h4>
                      <p className="text-sm text-green-700">Invoice email has been delivered to the recipient</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-50">
                          <CalendarIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Date</p>
                          <p className="text-sm font-bold text-foreground">
                            {format(new Date(displayEmailDate), "EEEE, MMMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-50">
                          <Clock className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Time</p>
                          <p className="text-sm font-bold text-foreground">
                            {format(new Date(displayEmailDate), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Approval - Info Card */}
                {emailStatus === "wait" && (
                  <div className="rounded-xl border-2 border-yellow-500 bg-white p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-yellow-50">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground text-base mb-1">Pending Approval</p>
                        <p className="text-sm text-muted-foreground">
                          Email will be sent after invoice approval.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Not Sent Yet - Neutral Card */}
                {emailStatus === "unsent" && (
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-slate-50">
                        <Mail className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground text-base mb-1">Not Sent Yet</p>
                        <p className="text-sm text-muted-foreground">
                          Email has not been sent to the recipient.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Footer */}
          <DialogFooter className="px-8 py-4 border-t bg-white">
            <div className="flex justify-end w-full">
              <Button
                variant="outline"
                onClick={() => setIsEmailDetailDialogOpen(false)}
                className="px-6"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Confirmation Dialog */}
      <Dialog open={isSendEmailConfirmOpen} onOpenChange={setIsSendEmailConfirmOpen}>
        <DialogContent className="p-6" style={{ width: "50vw", maxWidth: "600px" }}>
          <DialogHeader>
            <DialogTitle>Confirm Send Email</DialogTitle>
            <DialogDescription>
              Are you sure you want to send invoice email?
            </DialogDescription>
          </DialogHeader>
          {invoiceToSend && (
            <div className="py-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-medium">{invoiceToSend.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-medium">{invoiceToSend.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Send to:</span>
                  <span className="font-medium">{invoiceToSend.parentEmail}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSendEmailConfirmOpen(false)
                setInvoiceToSend(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={sendInvoice}>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
