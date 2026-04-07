import { useState, useMemo, useEffect, useCallback } from "react"
import { getCreditNotesByFamily, applyCreditNotes } from "@/services/creditNoteService"
import { triggerDownload } from "@/utils/downloadUtils"
import { downloadAsXlsx, formatAcademicYear } from "@/utils/xlsxUtils"
import { cn } from "./ui/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { useDiscountOptions } from "@/contexts/DiscountOptionsContext"
import { useStudents } from "@/contexts/StudentContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Textarea } from "./ui/textarea"
import { SearchInput } from "./ui/advanced-filter"
import { EmptySearchResults, EmptyDataState, EmptyState } from "./ui/states"
import { Checkbox } from "./ui/checkbox"
import { Search, Filter, Eye, Plus, Download, Mail, Calendar as CalendarIcon, DollarSign, FileText, AlertCircle, CheckCircle, Clock, RefreshCw, Trash2, Edit, X, Upload, Users, User, FileSpreadsheet, RotateCcw, ArrowUpDown, ChevronLeft, ChevronRight, ChevronDown, GraduationCap, Building, MoreVertical, History } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { ViewModal } from "./ViewModal"
import { format } from "date-fns"
import { toast } from "sonner"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { BANKS, PAYMENT_SOURCES } from "@/constants/paymentConstants"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { useSchoolSettings } from "@/hooks/useSchoolSettings"
import { SCHOOL_INFO, BANK_DETAILS, BILL_PAYMENT, INVOICE_NOTES, numberToWords, formatCurrency, getAcademicYear, generateNextInvoiceNumber } from "@/lib/invoiceUtils"
import { parseTuitionItemName } from "@/utils/itemAutoCreate"
import { downloadInvoicePDF } from "@/lib/invoicePDF"
import { ColumnPresets } from "@/utils/tableAlignment"
import SchoolLogo from "@/assets/Logo.png"
import { logActivity } from "@/lib/activityLog"
import { usePersistedState } from "@/hooks/usePersistedState"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { EditTemplateDialog } from "./InvoiceReceiptTemplate"
import { migrateTemplates, saveTemplates, type EmailTemplate } from "@/utils/emailTemplateUtils"
import { maskAccountNumber } from "./BankSettings"
import * as XLSX from "xlsx"

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
  rejectedAt?: Date
  rejectedBy?: string
  // Cancellation fields
  cancelledAt?: Date
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
  // Import fields
  adultIdNo?: string
  receiveAccountNo?: string
  // Discount breakdown
  discounts?: Array<{ name: string; amount: number; percentage?: number }>
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

// Email log entry interface
interface EmailLogEntry {
  id: string
  invoiceId: string
  invoiceNumber: string
  recipientEmail: string
  recipientName: string
  sentAt: string
  sentBy: string
  status: "sent" | "failed"
}

// localStorage key for created invoices (same as InvoiceCreation)
const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"
const EMAIL_LOGS_STORAGE_KEY = "invoiceEmailLogs"

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

    // Get storage key based on category - must match the actual storage keys used by each discount group component
    // TuitionDiscountGroups → "studentGroups", SummerDiscountGroups → "summerDiscountGroups", others → "studentGroups_${category}"
    const storageKey = category === "tuition"
      ? "studentGroups"
      : category === "summer"
        ? "summerDiscountGroups"
        : `studentGroups_${category}`
    const stored = localStorage.getItem(storageKey)
    if (!stored) return []

    const groups = JSON.parse(stored)
    return groups
      .filter((group: any) => {
        // Skip inactive groups
        if (group.isActive === false) return false
        // Student must be in group AND not inactive
        return group.students?.some((s: any) =>
          (s.studentId === studentId || s.id === studentId) && s.isActive !== false
        )
      })
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
        // Parse date as LOCAL time - handles "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ"
        const parseLocalDate = (val: any): Date | null => {
          if (!val) return null
          const isoMatch = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
          if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]))
          const d = new Date(val)
          return isNaN(d.getTime()) ? null : d
        }
        const issueDate = parseLocalDate(inv.issueDate)
        const dueDate = parseLocalDate(inv.dueDate) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

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
          totalAmount: inv.subtotal ?? inv.totalAmount ?? 0,
          discountAmount: inv.totalDiscount ?? inv.discountAmount ?? 0,
          finalAmount: inv.netAmount ?? inv.finalAmount ?? inv.subtotal ?? inv.totalAmount ?? 0,
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
            discountedAmount: item.amount,
            itemCode: item.itemCode || item.financeCode || "",
            nominalCode: item.nominalCode || "",
            notes: item.notes || ""
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
          rejectedBy: inv.rejectedBy,
          // Discount breakdown
          discounts: inv.discounts || [],
          // Family/parent info
          adultIdNo: inv.adultIdNo || "",
          // Bank account GL code (stored at mark-as-paid time)
          receiveAccountNo: inv.receiveAccountNo || "",
          // Email fields — must be restored so getEmailStatus works after reload
          emailSentAt: inv.emailSentAt ? new Date(inv.emailSentAt) : undefined,
          paidDate: inv.paidDate ? new Date(inv.paidDate) : undefined,
          approvedAt: inv.approvedAt ? new Date(inv.approvedAt) : undefined,
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
  "Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
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

interface CreditNoteRecord {
  id: string
  creditNoteNumber: string
  studentName: string
  studentId: string
  familyCode?: string
  amount: number
  remainingBalance?: number
  reason: string
  status: "issued" | "pending" | "cancelled" | "used" | "partial"
  issueDate: string
}

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
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const schoolSettings = useSchoolSettings()
  // Discount Options context for calculations
  const { getRegistrationFees, getSiblingDiscountPercentage } = useDiscountOptions()
  const { academicYears = [] } = useAcademicYears()
  const { students, families, getSiblingDiscount } = useStudents()

  // Load invoices from localStorage
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadCreatedInvoicesFromStorage())
  const [templates, setTemplates] = useState<InvoiceTemplate[]>(mockTemplates)
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(() => loadCreatedInvoicesFromStorage())
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [academicYearFilter, setAcademicYearFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [dueDateFrom, setDueDateFrom] = useState<Date | null>(null)
  const [dueDateTo, setDueDateTo] = useState<Date | null>(null)
  const [isExportingAll, setIsExportingAll] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templateToEdit, setTemplateToEdit] = useState<EmailTemplate | null>(null)
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null)
  const [isImportInterfaceUploadOpen, setIsImportInterfaceUploadOpen] = useState(false)
  const [isImportInterfaceOpen, setIsImportInterfaceOpen] = useState(false)
  const [importInterfaceRows, setImportInterfaceRows] = useState<Record<string, string>[]>([])
  const [importInterfaceError, setImportInterfaceError] = useState("")
  const [showImportDuplicateConfirm, setShowImportDuplicateConfirm] = useState(false)
  const [sortKey, setSortKey] = usePersistedState<
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
    | "academicYear"
    | "term"
    | null
  >("invoice-management:sortKey", "invoiceNumber")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Invoice type tab state (unique key per category to avoid conflicts)
  const [invoiceTypeTab, setInvoiceTypeTab] = usePersistedState<"student" | "external">(`invoice-management:invoiceTypeTab:${category || 'default'}`, defaultTab || "student")

  // Confirm dialog for delete operations
  const deleteConfirmDialog = useConfirmDialog()

  // Get available terms based on selected academic year
  const availableTerms = academicYearFilter !== "all"
    ? (academicYears.find(y => y.id === academicYearFilter)?.terms || [])
    : [...new Map(academicYears.flatMap(y => y.terms).map(t => [t.name, t])).values()]

  // Get the effective display amount: finalAmount if > 0, else recalculate from items
  const getDisplayAmount = (invoice: Invoice): number => {
    if (invoice.finalAmount && invoice.finalAmount > 0) return invoice.finalAmount
    if (invoice.items && invoice.items.length > 0) {
      return invoice.items.reduce((sum, item) => sum + (item.discountedAmount ?? item.amount ?? 0), 0)
    }
    return 0
  }

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

  // Re-apply filters reactively when any filter state changes
  useEffect(() => {
    applyFilters(invoiceTypeTab)
  }, [invoiceTypeTab, invoices, category, searchTerm, academicYearFilter, termFilter, statusFilter, invoiceStatusFilter, paymentStatusFilter, gradeFilter, dateFrom, dateTo, dueDateFrom, dueDateTo])

  // Load email logs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(EMAIL_LOGS_STORAGE_KEY)
      if (stored) {
        setEmailLogs(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Failed to load email logs:", error)
    }
  }, [])

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
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReasonInput, setCancelReasonInput] = useState("")
  const [cancelTargetData, setCancelTargetData] = useState<any>(null)

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
  const [studentSelectionType, setStudentSelectionType] = useState<"individual" | "excel" | "all">("individual")
  const [searchStudentTerm, setSearchStudentTerm] = useState("")
  const [selectedStudents, setSelectedStudents] = useState<any[]>([])
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelStudents, setExcelStudents] = useState<any[]>([])

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
  const [markPaidInvoices, setMarkPaidInvoices] = useState<Invoice[]>([])
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentFiles, setPaymentFiles] = useState<File[]>([])
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [edcBank, setEdcBank] = useState("")
  const [edcAccountNumber, setEdcAccountNumber] = useState("")
  const [edcAmount, setEdcAmount] = useState<string>("")
  const [ccFeePercent, setCcFeePercent] = useState<string>("")
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>("")

  // Auto-deselect CNs when EDC amount covers the full invoice
  useEffect(() => {
    if (paymentMethod === "EDC") {
      const edcAmt = parseFloat(edcAmount) || 0
      const invoiceAmt = markPaidInvoice?.finalAmount ?? 0
      if (edcAmt >= invoiceAmt) {
        setSelectedCNIdsForPaid(new Set())
      }
    }
  }, [edcAmount, paymentMethod, markPaidInvoice])
  const [selectedGlAccount, setSelectedGlAccount] = useState("")
  const [bankAccounts] = usePersistedState<any[]>("bankAccounts", [])
  const [availableCNsForPaid, setAvailableCNsForPaid] = useState<CreditNoteRecord[]>([])
  const [selectedCNIdsForPaid, setSelectedCNIdsForPaid] = useState<Set<string>>(new Set())
  const [isSendEmailConfirmOpen, setIsSendEmailConfirmOpen] = useState(false)
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null)

  // Email history state
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([])
  const [isEmailHistoryOpen, setIsEmailHistoryOpen] = useState(false)
  const [selectedInvoiceForEmailHistory, setSelectedInvoiceForEmailHistory] = useState<Invoice | null>(null)

  // Add Items dialog state
  const [isAddItemsDialogOpen, setIsAddItemsDialogOpen] = useState(false)
  const [itemSearchQuery, setItemSearchQuery] = useState("")

  // Bulk Change Due Date state
  const [isBulkChangeDueDateOpen, setIsBulkChangeDueDateOpen] = useState(false)
  const [bulkNewDueDate, setBulkNewDueDate] = useState<Date | undefined>(undefined)

  const handleBulkChangeDueDate = () => {
    if (!bulkNewDueDate) {
      toast.error("Please select a new due date")
      return
    }

    const updatedInvoices = invoices.map(inv => {
      if (selectedInvoiceIds.has(inv.id)) {
        if (inv.status !== "paid" && inv.status !== "cancelled") {
          return { ...inv, dueDate: bulkNewDueDate }
        }
      }
      return inv
    })

    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) {
      try {
        const savedInvoices = JSON.parse(stored)
        const newSaved = savedInvoices.map((inv: any) => {
          if (selectedInvoiceIds.has(inv.id)) {
            if (inv.status !== "paid" && inv.status !== "cancelled") {
              return { ...inv, dueDate: bulkNewDueDate.toISOString() }
            }
          }
          return inv
        })
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(newSaved))
      } catch (e) {
        console.error("Failed to update bulk due dates in storage", e)
      }
    }

    setInvoices(updatedInvoices)
    toast.success(`Updated due date for selected invoices`)
    setIsBulkChangeDueDateOpen(false)
    setBulkNewDueDate(undefined)
    setSelectedInvoiceIds(new Set())
  }

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

    if (academicYearFilter !== "all") {
      filtered = filtered.filter(inv => inv.academicYear === academicYearFilter)
    }

    if (termFilter !== "all") {
      filtered = filtered.filter(inv => inv.term === termFilter)
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
        if (paymentStatusFilter === "partial") return paymentStatus === "partial"
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

    if (dueDateFrom) {
      filtered = filtered.filter(inv => inv.dueDate && new Date(inv.dueDate) >= dueDateFrom)
    }

    if (dueDateTo) {
      filtered = filtered.filter(inv => inv.dueDate && new Date(inv.dueDate) <= dueDateTo)
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

  const renderSortHeader = (label: string, key: NonNullable<typeof sortKey>, align?: "left" | "center" | "right") => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className={`flex items-center gap-1 font-medium ${align === "center" ? "justify-center w-full" : align === "right" ? "justify-end w-full" : "text-left"}`}
    >
      <span>{label}</span>
      <ArrowUpDown
        className={`h-3 w-3 ${sortKey === key ? "text-foreground" : "text-muted-foreground"}`}
      />
    </button>
  )

  const getPaymentStatus = (invoice: Invoice): "unpaid" | "paid" | "partial" | "overdue" => {
    if (invoice.status === "paid") return "paid"
    if (invoice.paymentMethod === "Partial" || invoice.status === ("partial" as any) || (invoice as any).partialPaidAmount > 0) return "partial"
    if (invoice.paidDate) return "paid"
    const category = invoice.category || "tuition"
    let receiptStorageKey = ""
    if (category === "eca") receiptStorageKey = "receiptRecords_eca"
    else if (category === "trip") receiptStorageKey = "receiptRecords_trip"
    else if (category === "exam") receiptStorageKey = "receiptRecords_event"
    else if (category === "bus") receiptStorageKey = "receiptRecords_summer"
    else if (category === "external") receiptStorageKey = "receiptRecords_external"
    else receiptStorageKey = "receiptRecords_tuition"
    try {
      const storedReceipts = localStorage.getItem(receiptStorageKey)
      if (storedReceipts) {
        const receipts = JSON.parse(storedReceipts)
        const hasReceipt = receipts.some((receipt: any) =>
          receipt.invoices?.some((inv: any) => inv.id === invoice.id || inv.invoiceNo === invoice.invoiceNumber)
        )
        if (hasReceipt) return "paid"
      }
    } catch (error) {
      console.error("Error checking receipt status:", error)
    }
    if (invoice.status === "overdue") return "overdue"
    const now = new Date()
    const dueDate = invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate)
    if (dueDate < now && getApprovalStatus(invoice) !== "wait") {
      return "overdue"
    }
    return "unpaid"
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredInvoices.length / pageSize)
  const sortedInvoices = useMemo(() => {
    if (!sortKey) return [...filteredInvoices].reverse()
    const sorted = [...filteredInvoices]
    const direction = sortDirection === "asc" ? 1 : -1
    const invoiceStatusOrder: Record<ApprovalStatus, number> = { wait: 0, approved: 1, rejected: 2 }
    const paymentStatusOrder: Record<"unpaid" | "paid" | "partial" | "overdue", number> = { unpaid: 0, partial: 1, paid: 2, overdue: 3 }
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
          return ((invoiceStatusOrder[getApprovalStatus(a)] || 0) - (invoiceStatusOrder[getApprovalStatus(b)] || 0)) * direction
        case "emailStatus":
          return (a.status || "").localeCompare(b.status || "") * direction
        case "paymentStatus":
          return ((paymentStatusOrder[getPaymentStatus(a)] || 0) - (paymentStatusOrder[getPaymentStatus(b)] || 0)) * direction
        case "eventName":
          return (a.eventName || "").localeCompare(b.eventName || "") * direction
        case "issueDate":
          return ((a.issueDate?.getTime() || 0) - (b.issueDate?.getTime() || 0)) * direction
        case "dueDate":
          return ((a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)) * direction
        case "academicYear":
          return (a.academicYear || "").localeCompare(b.academicYear || "") * direction
        case "term":
          return (a.term || "").localeCompare(b.term || "") * direction
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
    setDueDateFrom(null)
    setDueDateTo(null)
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
    const modalData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentName: invoice.studentName,
      studentId: invoice.studentId,
      grade: invoice.studentGrade,
      parentName: invoice.parentName,
      parentEmail: invoice.parentEmail,
      amount: invoice.finalAmount,
      total: invoice.finalAmount,
      subtotal: invoice.totalAmount,
      discounts: invoice.discounts || [],
      status: invoice.status,
      approvalStatus: invoice.approvalStatus,
      cancelReason: invoice.cancelReason,
      cancelledBy: invoice.cancelledBy,
      cancelledAt: invoice.cancelledAt,
      issueDate: invoice.issueDate ? invoice.issueDate.toISOString() : null,
      dueDate: invoice.dueDate.toISOString(),
      term: invoice.term,
      category: "Invoice",
      academicYear: "2024/2025",
      items: invoice.items.map(item => ({
        name: item.description,
        description: item.description,
        amount: item.amount,
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


    const updatedInvoices = invoices.map(inv =>
      inv.id === selectedInvoice.id
        ? { ...inv, dueDate: editingDueDate, notes: editingNotes, status: "sent" as const, emailSentAt: new Date() }
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

  const performDelete = () => {
    if (!selectedInvoice) return
    if (getApprovalStatus(selectedInvoice) !== "wait") {
      toast.error("Only invoices with 'Wait' approval status can be deleted")
      return
    }

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
  }

  const deleteInvoice = () => {
    if (!selectedInvoice) return
    deleteConfirmDialog.confirm(performDelete)
    closeEditModal()
  }

  const handleBulkDelete = () => {
    if (selectedInvoiceIds.size === 0) return

    // Only delete draft invoices
    const idsToDelete = Array.from(selectedInvoiceIds).filter(id => {
      const inv = invoices.find(i => i.id === id)
      return inv && getApprovalStatus(inv) === "wait"
    })
    if (idsToDelete.length === 0) {
      toast.error("Only invoices with 'Wait' approval status can be deleted")
      return
    }
    const deletedNumbers = invoices.filter(inv => idsToDelete.includes(inv.id)).map(inv => inv.invoiceNumber)

    // Remove from state
    const updatedInvoices = invoices.filter(inv => !idsToDelete.includes(inv.id))
    setInvoices(updatedInvoices)

    // Remove from localStorage
    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      if (stored) {
        const savedInvoices = JSON.parse(stored)
        const updatedSaved = savedInvoices.filter((inv: any) => !idsToDelete.includes(inv.id))
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSaved))
      }
    } catch (error) {
      console.error("Failed to bulk delete invoices:", error)
    }

    setSelectedInvoiceIds(new Set())
    toast.success(`Deleted ${idsToDelete.length} invoices`)
    logActivity({
      action: `Bulk deleted ${idsToDelete.length} invoices`,
      module: "Invoices",
      detail: `Invoices: ${deletedNumbers.join(", ")}`
    })
  }

  const handleBulkMarkPaid = async () => {
    const selectedInvoices = invoices.filter(inv => selectedInvoiceIds.has(inv.id))
    
    // All must be approved/sent and not paid
    const canPay = selectedInvoices.filter(inv => 
      (inv.status === "approved" || inv.status === "sent" || getApprovalStatus(inv) === "approved") && 
      inv.status !== "paid" && 
      inv.status !== "cancelled"
    )
    
    if (canPay.length === 0) {
      toast.error("No payable invoices selected. Only approved or sent invoices can be marked as paid.")
      return
    }

    if (canPay.length < selectedInvoices.length) {
      toast.warning(`Only ${canPay.length} of ${selectedInvoices.length} selected invoices can be marked as paid.`)
    }

    // Use first invoice as reference
    const refInvoice = canPay[0]
    setMarkPaidInvoice(refInvoice)
    // Sorting will be done in confirmMarkPaid based on CN ownership
    setMarkPaidInvoices(canPay)

    setPaymentMethod("")
    setPaymentFiles([])
    setSelectedCNIdsForPaid(new Set())
    setEdcAmount("")
    setCcFeePercent("")

    // Credit Notes match logic — fetch CNs for ALL students in selected invoices (same family)
    const isExternalInvoice = refInvoice.invoiceType === "external" || refInvoice.studentId === "EXTERNAL" || refInvoice.category === "external"
    let cns: CreditNoteRecord[] = []
    if (isExternalInvoice) {
      setAvailableCNsForPaid([])
      setIsMarkPaidOpen(true)
      return
    }
    try {
      const stored = localStorage.getItem("creditNotesRecords")
      if (stored) {
        const raw: any[] = JSON.parse(stored)
        // Collect all family codes and student identifiers from selected invoices
        const allFamilyCodes = new Set<string>()
        const allStudentIds = new Set<string>()
        const allStudentNames = new Set<string>()
        canPay.forEach(inv => {
          if (inv.adultIdNo) allFamilyCodes.add(inv.adultIdNo.trim().toLowerCase())
          if (inv.studentId) allStudentIds.add(inv.studentId.trim().toLowerCase())
          if (inv.studentName) allStudentNames.add(inv.studentName.trim().toLowerCase())
        })

        cns = raw
          .filter(cn => {
            const rawStatus = (cn.status || "").toLowerCase()
            if (rawStatus === "applied" || rawStatus === "cancelled" || rawStatus === "used") return false
            const cnFamilyCode = (cn.parentName || cn.familyCode || "").trim().toLowerCase()
            const cnStudentId = (cn.studentId || "").trim().toLowerCase()
            const cnStudentName = (cn.studentName || "").trim().toLowerCase()
            // Match CN if it belongs to any student in the selected invoices or same family
            return (
              (cnFamilyCode && [...allFamilyCodes].some(fc => fc === cnFamilyCode)) ||
              (cnStudentId && [...allStudentIds].some(sid => sid === cnStudentId || sid === cnFamilyCode)) ||
              (cnStudentId && [...allFamilyCodes].some(fc => fc === cnStudentId)) ||
              (cnStudentName && [...allStudentNames].some(sn => sn === cnStudentName))
            )
          })
          .map(cn => ({
            id: String(cn.id),
            creditNoteNumber: cn.creditNoteNumber || "",
            studentName: cn.studentName || "",
            studentId: cn.studentId || "",
            familyCode: cn.parentName || cn.familyCode || "",
            amount: cn.creditAmount ?? cn.amount ?? 0,
            remainingBalance: cn.remainingBalance,
            reason: cn.reason || "",
            status: "issued" as const,
            issueDate: cn.issueDate ? String(cn.issueDate) : new Date().toISOString(),
          }))
      }
    } catch {
      cns = await getCreditNotesByFamily(
        refInvoice.adultIdNo || refInvoice.studentId,
        refInvoice.studentId,
        refInvoice.studentName
      ) as CreditNoteRecord[]
    }
    setAvailableCNsForPaid(cns)
    setIsMarkPaidOpen(true)
  }


  const resetCreateForm = () => {
    setSelectedGrade("")
    setSelectedTemplate(null)
    setStudentSelectionType("individual")
    setSearchStudentTerm("")
    setSelectedStudents([])
    setExcelFile(null)
    setExcelStudents([])
    setAvailableItems([])
    setSelectedItems([])
  }

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade)
    setSelectedStudents([])
    setExcelStudents([])
    setExcelFile(null)
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

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setExcelFile(file)
      // Simulate Excel parsing
      const mockExcelData = [
        { id: "ST001301", name: "Excel Student 1", grade: selectedGrade, parentName: "Parent 1", email: "parent1@email.com" },
        { id: "ST001302", name: "Excel Student 2", grade: selectedGrade, parentName: "Parent 2", email: "parent2@email.com" },
        { id: "ST001303", name: "Excel Student 3", grade: selectedGrade, parentName: "Parent 3", email: "parent3@email.com" },
      ]
      setExcelStudents(mockExcelData)
      setSelectedStudents(mockExcelData)
      toast.success(`Loaded ${mockExcelData.length} students from Excel`)
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
    const studentNames = selectedStudents.map(s => s.name || s.studentName)
    logActivity({
      action: "Created invoices",
      module: "Invoices",
      detail: `Created ${selectedStudents.length} invoices for: ${studentNames.slice(0, 10).join(", ")}${studentNames.length > 10 ? ` and ${studentNames.length - 10} more` : ""}, Items per invoice: ${selectedItems.length}, Total per invoice: ${totalItems.toLocaleString()}`
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

    const updatedInvoices = invoices.map(inv =>
      inv.id === invoiceToSend.id ? { ...inv, status: "sent" as const, emailSentAt: new Date() } : inv
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

    // Save email log entry
    const newEmailLog: EmailLogEntry = {
      id: `email-${Date.now()}`,
      invoiceId: invoiceToSend.id,
      invoiceNumber: invoiceToSend.invoiceNumber,
      recipientEmail: invoiceToSend.parentEmail,
      recipientName: invoiceToSend.parentName,
      sentAt: emailSentAt,
      sentBy: "System",
      status: "sent"
    }
    const updatedEmailLogs = [...emailLogs, newEmailLog]
    setEmailLogs(updatedEmailLogs)
    try {
      localStorage.setItem(EMAIL_LOGS_STORAGE_KEY, JSON.stringify(updatedEmailLogs))
      
      // Update central Email History
      const historyData = localStorage.getItem("emailReminderHistory")
      const history = historyData ? JSON.parse(historyData) : []
      const centralEntry = {
        id: `invoice-email-${Date.now()}`,
        sentDate: new Date().toISOString().split("T")[0],
        subject: `Invoice: ${invoiceToSend.invoiceNumber}`,
        academicYear: invoiceToSend.academicYear || "-",
        term: invoiceToSend.term || "-",
        recipients: 1,
        status: "sent",
        message: `Invoice: ${invoiceToSend.invoiceNumber}\nStudent: ${invoiceToSend.studentName}\nID: ${invoiceToSend.studentId}\nAmount: ฿${invoiceToSend.finalAmount.toLocaleString()}`
      }
      history.unshift(centralEntry)
      localStorage.setItem("emailReminderHistory", JSON.stringify(history))
      window.dispatchEvent(new CustomEvent("emailReminderHistoryUpdated"))
    } catch (error) {
      console.error("Failed to save email log:", error)
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

  // Get email logs for a specific invoice
  const getInvoiceEmailLogs = (invoiceId: string): EmailLogEntry[] => {
    return emailLogs.filter(log => log.invoiceId === invoiceId)
  }

  // Open email history dialog
  const openEmailHistory = (invoice: Invoice) => {
    setSelectedInvoiceForEmailHistory(invoice)
    setIsEmailHistoryOpen(true)
  }

  const downloadInvoiceData = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (!invoice) return
    const resolvedCategory = category ?? invoice.category ?? ""

    const infoHeaders = ["Field", "Value"]
    const infoRows: (string | number)[][] = [
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
      ["Academic Year", formatAcademicYear(invoice.academicYear) || ""],
      ["Term", invoice.term || ""],
      ["Status", invoice.status],
      ["Issue Date", invoice.issueDate ? format(invoice.issueDate, "dd/MM/yyyy") : "Pending"],
      ["Due Date", format(invoice.dueDate, "dd/MM/yyyy")],
      ["Total Amount", invoice.totalAmount],
      ["Discount Amount", invoice.discountAmount],
      ["Final Amount", invoice.finalAmount],
      ["Notes", invoice.notes || ""]
    ]

    const itemHeaders = ["Item ID", "Description", "Amount", "Discount %", "Discounted Amount", "Notes"]
    const itemRows = invoice.items.map(item => [
      item.id,
      item.description,
      item.amount,
      item.discountPercent,
      item.discountedAmount,
      item.notes || ""
    ])

    // Build combined sheet: info block + blank row + items block
    const allRows: (string | number)[][] = [
      ...infoRows,
      [""],
      ["Items"],
      itemHeaders,
      ...itemRows
    ]

    downloadAsXlsx(infoHeaders, allRows, `${invoice.invoiceNumber || invoice.id}_data`)

    toast.success(`Invoice ${invoice.invoiceNumber} data downloaded`)
  }

  const exportInvoiceReport = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export")
      return
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
      formatAcademicYear(inv.academicYear) || "",
      inv.term || "",
      inv.status,
      inv.issueDate ? format(inv.issueDate, "dd/MM/yyyy") : "Pending",
      format(inv.dueDate, "dd/MM/yyyy"),
      inv.totalAmount,
      inv.discountAmount,
      inv.finalAmount
    ]))

    downloadAsXlsx(headers, rows, `invoice-report-${format(new Date(), "yyyyMMdd_HHmmss")}`)

    toast.success(`Exported ${filteredInvoices.length} invoices`)
  }

  // ดึงราคา tuition จาก TuitionByYear data
  const getTuitionPriceFromYearData = (
    description: string,
    yearGroup: string,
    schoolTerm: string,
    schoolYear: string
  ): number | null => {
    try {
      const stored = localStorage.getItem("tuitionByYearData")
      if (!stored) return null
      const tuitionData = JSON.parse(stored)

      // Parse gradeId & termField: use Description FIRST (primary for tuition items), fallback to columns
      const parsedFromDesc = parseTuitionItemName(description)
      let gradeId: string | null = parsedFromDesc.gradeId
      let termField: string | null = parsedFromDesc.term ? `term${parsedFromDesc.term}Amount` : null

      // Fallback to YearGroup column if description parsing didn't yield gradeId
      if (!gradeId) {
        const yg = yearGroup.toLowerCase().trim()
        if (yg === "nursery") gradeId = "nursery"
        else if (yg === "pre-nursery" || yg === "pre nursery") gradeId = "pre-nursery"
        else if (yg === "reception") gradeId = "reception"
        else {
          const m = yearGroup.match(/Year\s*(\d+)/i)
          if (m) gradeId = `year${m[1]}`
        }
      }

      if (!gradeId) return null

      // Fallback to SchoolTerm column if description parsing didn't yield termField
      if (!termField) {
        const termMatch = schoolTerm.match(/Term\s*(\d)/i)
        if (termMatch) {
          const n = parseInt(termMatch[1])
          if (n >= 1 && n <= 3) termField = `term${n}Amount`
        }
      }

      if (!termField) return null

      // Normalize school year format: always use "/" for comparison
      const normalizeYear = (y: string) => y.replace(/-/g, "/").replace(/\s/g, "")
      const normalizedInput = normalizeYear(schoolYear)

      const tryYearData = (data: any[]): number | null => {
        const gradeRow = data.find((g: any) => g.id === gradeId)
        if (!gradeRow) return null
        const price = gradeRow[termField!]
        return typeof price === "number" && price > 0 ? price : null
      }

      // Try matching any stored year whose normalized form matches
      const allYears = Object.keys(tuitionData).sort((a, b) => b.localeCompare(a))

      // First pass: exact or normalized match
      for (const yr of allYears) {
        if (normalizeYear(yr) === normalizedInput) {
          const price = tryYearData(tuitionData[yr] || [])
          if (price !== null) return price
        }
      }

      // Second pass: fallback search all years (most recent first)
      for (const yr of allYears) {
        const price = tryYearData(tuitionData[yr] || [])
        if (price !== null) return price
      }

      return null
    } catch {
      return null
    }
  }

  const handleImportInterfaceFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const nameLower = file.name.toLowerCase()
    const isXlsx = nameLower.endsWith(".xlsx") || nameLower.endsWith(".xls")
    const isCsv = nameLower.endsWith(".csv")

    if (!isXlsx && !isCsv) {
      toast.error("Please upload an Excel (.xlsx) file")
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    if (isXlsx) {
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string
          const wb = XLSX.read(data, { type: "binary", cellDates: false })
          const ws = wb.Sheets[wb.SheetNames[0]]
          // Get all rows as arrays (raw values, no date conversion)
          const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false })
          parseInterfaceRows(allRows)
        } catch {
          setImportInterfaceError("Failed to read Excel file")
          setIsImportInterfaceOpen(true)
        }
      }
      reader.readAsBinaryString(file)
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = []
          let current = "", inQuotes = false
          for (const char of line) {
            if (char === '"') { inQuotes = !inQuotes }
            else if (char === ',' && !inQuotes) { result.push(current.trim()); current = "" }
            else { current += char }
          }
          result.push(current.trim())
          return result
        }
        const allRows: string[][] = lines.map(l => parseCSVLine(l).map(v => v.replace(/^"|"$/g, "").trim()))
        parseInterfaceRows(allRows)
      }
      reader.readAsText(file)
    }
    event.target.value = ""
  }

  const parseInterfaceRows = (allRows: any[][]) => {
    const required = ["PupilID", "DocumentNo", "Description", "Amount"]

    // Find the header row - it's the first row that contains "PupilID"
    let headerRowIdx = -1
    for (let i = 0; i < Math.min(allRows.length, 5); i++) {
      const row = allRows[i].map((v: any) => String(v ?? "").trim())
      if (row.includes("PupilID")) {
        headerRowIdx = i
        break
      }
    }

    if (headerRowIdx === -1) {
      setImportInterfaceError(`Missing required columns: ${required.join(", ")}`)
      setIsImportInterfaceOpen(true)
      return
    }

    const headers = allRows[headerRowIdx].map((v: any) => String(v ?? "").trim())

    const missing = required.filter(r => !headers.includes(r))
    if (missing.length > 0) {
      setImportInterfaceError(`Missing required columns: ${missing.join(", ")}`)
      setIsImportInterfaceOpen(true)
      return
    }

    // Group rows by PupilID for auto-generating DocumentNo
    const generatedDocNos: Record<string, string> = {}

    const rows = allRows.slice(headerRowIdx + 1)
      .map(rawRow => {
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = String(rawRow[i] ?? "").trim() })
        return row
      })
      .filter(row => row["PupilID"])
      .map(row => {
        // Auto-generate DocumentNo if missing - group same PupilID into one invoice
        if (!row["DocumentNo"]) {
          if (!generatedDocNos[row["PupilID"]]) {
            generatedDocNos[row["PupilID"]] = `IMP-${row["PupilID"]}-${Date.now()}`
          }
          row["DocumentNo"] = generatedDocNos[row["PupilID"]]
        }

        // SYNC: If this is a tuition item (or in tuition category), check if Master Tuition Price exists and override the row amount
        // This ensures the preview table shows what will ACTUALLY be used (Master price takes precedence)
        const masterPrice = getTuitionPriceFromYearData(
          row["Description"] || "",
          row["YearGroup"] || "",
          row["SchoolTerm"] || "",
          row["SchoolYear"] || ""
        )
        if (masterPrice !== null) {
          row["Amount"] = masterPrice.toString()
        }

        return row
      })

    setImportInterfaceRows(rows)
    setImportInterfaceError("")
    setIsImportInterfaceOpen(true)
  }

  const performImportInterface = () => {
    if (importInterfaceRows.length === 0) return

    const parseDate = (dateStr: string): Date => {
      if (!dateStr) return new Date()
      // Handle Excel serial dates (e.g. "46070")
      const serial = Number(dateStr)
      if (!isNaN(serial) && serial > 40000 && serial < 60000 && String(serial) === String(dateStr).trim()) {
        return new Date((serial - 25569) * 86400 * 1000)
      }
      // Handle ISO strings (YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const d = new Date(dateStr)
        if (!isNaN(d.getTime())) return d
      }
      // Handle D/M/YY, DD/MM/YYYY, MM/DD/YYYY
      const parts = dateStr.split(/[\/\-\.]/)
      if (parts.length === 3) {
        const p0 = parseInt(parts[0])
        const p1 = parseInt(parts[1])
        let p2 = parseInt(parts[2])
        // YYYY/MM/DD
        if (p0 > 1000) return new Date(p0, p1 - 1, p2)
        // Handle 2-digit year in last position
        if (p2 < 100) p2 += p2 < 50 ? 2000 : 1900
        // DD/MM/YYYY: first part > 12 → must be day
        if (p0 > 12) return new Date(p2, p1 - 1, p0)
        // MM/DD/YYYY: second part > 12 → must be day
        if (p1 > 12) return new Date(p2, p0 - 1, p1)
        // Ambiguous (both ≤ 12): default DD/MM/YYYY (Thai/UK convention)
        return new Date(p2, p1 - 1, p0)
      }
      return new Date(dateStr)
    }

    // Group rows by DocumentNo
    const grouped: Record<string, Record<string, string>[]> = {}
    importInterfaceRows.forEach(row => {
      const docNo = row["DocumentNo"]
      if (!grouped[docNo]) grouped[docNo] = []
      grouped[docNo].push(row)
    })

    // Load catalog items first — needed for item code resolution when FinanceCode is missing
    const getItemStorageKey = (cat: string) => {
      const keyMap: Record<string, string> = {
        afterschool: "afterschoolItems", eca: "ecaItems", event: "eventItems",
        summer: "summerItems", external: "externalItems", trip: "tripItems",
        exam: "examItems", bus: "busItems", tuition: "invoiceItems"
      }
      return keyMap[cat] || "invoiceItems"
    }
    const itemsStorageKey = getItemStorageKey(category || "tuition")
    let catalogItems: any[] = []
    try {
      const stored = localStorage.getItem(itemsStorageKey)
      catalogItems = stored ? JSON.parse(stored) : []
    } catch { catalogItems = [] }

    // Resolve item code: use FinanceCode if present, otherwise look up by Description in catalog
    const resolveItemCode = (row: Record<string, string>): string => {
      if (row["FinanceCode"]) return row["FinanceCode"]
      const desc = (row["Description"] || "").trim().toLowerCase()
      if (!desc) return ""
      return catalogItems.find((it: any) =>
        (it.name || "").toLowerCase().trim() === desc ||
        (it.description || "").toLowerCase().trim() === desc
      )?.itemCode || ""
    }

    let skippedNoStudent = 0
    let skippedNoItems = 0
    let newItemsAdded = 0
    const inactiveStudentWarnings: string[] = []

    const statusLabels: Record<string, string> = {
      graduated: "Graduated",
      withdrawn: "Withdrawn",
      on_leave: "On Leave",
      inactive: "Inactive"
    }

    const newInvoices: Invoice[] = Object.entries(grouped).map(([docNo, rows]) => {
      const first = rows[0]

      // ── External invoice path (Clientname / Contact name / address columns) ──
      if (category === "external") {
        const clientName = first["Clientname"] || first["ClientName"] || first["Client Name"] || ""
        if (!clientName) {
          skippedNoStudent++
          return null
        }

        const validRows = rows.filter(row => !!resolveItemCode(row))
        const items: InvoiceItem[] = validRows
          .sort((a, b) => parseInt(a["InvoiceLineItem"] || "0") - parseInt(b["InvoiceLineItem"] || "0"))
          .map(row => {
            const rawAmt = row["Amount"]
            const amt = typeof rawAmt === "number" ? rawAmt : (parseFloat(String(rawAmt ?? "").replace(/,/g, "")) || 0)
            const desc = row["Description"] || ""
            return {
              id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              description: desc,
              amount: amt,
              discountPercent: 0,
              discountedAmount: amt,
              notes: resolveItemCode(row)
            }
          })

        if (items.length === 0) {
          skippedNoItems++
          return null
        }

        const totalAmount = items.reduce((sum, i) => sum + i.amount, 0)
        const issueDateRaw = first["InvoiceDate"] || first["DocumentDate"] || first["Date"]
        const issueDate = issueDateRaw ? parseDate(issueDateRaw) : null
        const dueDate = first["DueDate"] ? parseDate(first["DueDate"]) : (issueDate ? new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

        return {
          id: `${getAcademicYear(new Date()).split('/')[0]}DRAFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          invoiceNumber: docNo,
          studentName: clientName,
          studentId: "EXTERNAL",
          studentGrade: "-",
          parentName: first["Contact name"] || first["ContactName"] || "",
          parentEmail: "",
          totalAmount,
          discountAmount: 0,
          finalAmount: totalAmount,
          status: "pending_approval" as const,
          approvalStatus: "wait" as const,
          issueDate,
          dueDate,
          issuedBy: "Import",
          items,
          discounts: [],
          notes: "",
          term: "",
          academicYear: "",
          category: "external" as const,
          adultIdNo: first["AdultIDNo"] || "",
          clientName,
          contactName: first["Contact name"] || first["ContactName"] || "",
          address: first["address"] || first["Address"] || "",
          recipientName: clientName,
          recipientAddress: first["address"] || first["Address"] || "",
          invoiceType: "external" as const
        }
      }

      // ── Internal / student invoice path ──
      const pupilId = first["PupilID"] || ""
      const student = students.find(s => s.studentId === pupilId || s.id === pupilId)

      // Skip invoice if student not found in system
      if (!student) {
        skippedNoStudent++
        return null
      }

      // Warn if student is not active
      if (student.status && student.status !== "active") {
        const statusLabel = statusLabels[student.status] || student.status
        inactiveStudentWarnings.push(`${student.firstName} ${student.lastName} (${pupilId}) — Status: ${statusLabel}`)
        skippedNoStudent++
        return null
      }

      const studentFamily = families.find(f => f.id === student?.familyId)

      // Only include rows that have FinanceCode OR matching item in catalog (by Description)
      const validRows = rows.filter(row => !!resolveItemCode(row))

      const items: InvoiceItem[] = validRows
        .sort((a, b) => parseInt(a["InvoiceLineItem"] || "0") - parseInt(b["InvoiceLineItem"] || "0"))
        .map(row => {
          const rawAmt = row["Amount"]
          const csvAmt = typeof rawAmt === "number" ? rawAmt : (parseFloat(String(rawAmt ?? "").replace(/,/g, "")) || 0)
          const desc = row["Description"] || ""
          const tuitionPrice = getTuitionPriceFromYearData(desc, row["YearGroup"] || "", row["SchoolTerm"] || "", row["SchoolYear"] || "")
          const amt = tuitionPrice ?? csvAmt
          return {
            id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: desc,
            amount: amt,
            discountPercent: 0,
            discountedAmount: amt,
            notes: resolveItemCode(row)
          }
        })

      // Skip invoice if no valid items after filtering
      if (items.length === 0) {
        skippedNoItems++
        return null
      }

      const totalAmount = items.reduce((sum, i) => sum + i.amount, 0)

      // Calculate and store student group discounts at import time (checks isActive)
      const invoiceCategory = (category || "tuition") as string
      const groupDiscountsAtImport = getStudentGroupDiscounts(pupilId, invoiceCategory)
      const storedDiscounts = groupDiscountsAtImport.map(g => ({
        name: g.name,
        amount: g.discountType === "percentage"
          ? Math.round(totalAmount * g.discountPercentage / 100)
          : g.fixedAmount,
        percentage: g.discountType === "percentage" ? g.discountPercentage : undefined
      })).filter(d => d.amount > 0)

      const issueDateRaw = first["DocumentDate"] || first["Date"] || first["InvoiceDate"]
      const issueDate = issueDateRaw ? parseDate(issueDateRaw) : null
      const dueDate = first["DueDate"] ? parseDate(first["DueDate"]) : (issueDate ? new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

      return {
        id: `${getAcademicYear(new Date()).split('/')[0]}DRAFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        invoiceNumber: docNo,
        studentName: `${student.firstName} ${student.lastName}`,
        studentId: pupilId,
        studentGrade: first["YearGroup"] || "",
        parentName: "",
        parentEmail: student?.parents?.find((p: any) => p.isPrimary)?.email || "",
        totalAmount,
        discountAmount: 0,
        finalAmount: totalAmount,
        status: "pending_approval" as const,
        approvalStatus: "wait" as const,
        issueDate,
        dueDate,
        issuedBy: "Import",
        items,
        discounts: storedDiscounts,
        notes: "",
        term: first["SchoolTerm"] || "",
        academicYear: first["SchoolYear"] || "",
        category: invoiceCategory as "tuition" | "eca" | "trip" | "exam" | "bus" | "external",
        adultIdNo: studentFamily?.familyCode || first["AdultIDNo"] || ""
      }
    }).filter(Boolean) as Invoice[]

    // Auto-create or update items in ItemManagement catalog (only when FinanceCode present)
    let catalogChanged = false

    importInterfaceRows.forEach(row => {
      const pupilId = row["PupilID"] || ""
      const student = students.find(s => s.studentId === pupilId || s.id === pupilId)
      if (!student && category !== "external") return // Skip rows for unknown students (internal only)
      if (!row["FinanceCode"]) return // Skip rows without item code (FinanceCode)

      const desc = (row["Description"] || "").trim()
      if (!desc) return

      const rawAmt = row["Amount"]
      const amt = typeof rawAmt === "number" ? rawAmt : (parseFloat(String(rawAmt ?? "").replace(/,/g, "")) || 0)

      // 1. Update/Sync Item Management Catalog
      const existingItemIndex = catalogItems.findIndex((item: any) =>
        (item.name || "").toLowerCase().trim() === desc.toLowerCase() ||
        (item.description || "").toLowerCase().trim() === desc.toLowerCase()
      )

      if (existingItemIndex !== -1) {
        if (catalogItems[existingItemIndex].amount !== amt) {
          catalogItems[existingItemIndex].amount = amt
          catalogChanged = true
        }
      } else {
        catalogItems.push({
          id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemCode: row["FinanceCode"] || `AUTO-${Date.now()}`,
          name: desc,
          description: desc,
          amount: amt,
          nominalCode: row["NominalCode"] || "",
          documentType: row["Type"] || "SI",
          isActive: true,
          applicableGrades: [],
          category: category || "tuition"
        })
        catalogChanged = true
        newItemsAdded++
      }
    })

    if (catalogChanged) {
      try {
        localStorage.setItem(itemsStorageKey, JSON.stringify(catalogItems))
      } catch (e) {
        console.error("Failed to update item catalog:", e)
      }
    }

    try {
      const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
      const existing = stored ? JSON.parse(stored) : []
      // Serialize dates as local "YYYY-MM-DD" strings to avoid UTC timezone offset shifting the date
      const serializeDate = (d: Date | null | undefined) => d ? format(d, "yyyy-MM-dd") : null
      const serializedInvoices = newInvoices.map(inv => ({
        ...inv,
        dueDate: serializeDate(inv.dueDate),
        issueDate: serializeDate(inv.issueDate),
      }))
      localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify([...existing, ...serializedInvoices]))
    } catch (e) {
      console.error("Failed to save imported invoices:", e)
    }

    reloadInvoices()
    setIsImportInterfaceOpen(false)
    setImportInterfaceRows([])

    const itemNote = newItemsAdded > 0 ? ` (auto-created ${newItemsAdded} item${newItemsAdded > 1 ? "s" : ""})` : ""
    const skippedParts = [
      skippedNoStudent > 0 ? `${skippedNoStudent} รายการไม่พบนักเรียน/สถานะไม่ active` : "",
      skippedNoItems > 0 ? `${skippedNoItems} รายการไม่มี Item Code` : ""
    ].filter(Boolean).join(", ")
    const skippedNote = skippedParts ? ` — ข้ามไป: ${skippedParts}` : ""

    if (newInvoices.length === 0) {
      toast.error(`ไม่มี invoice ที่นำเข้าได้${skippedNote}`)
    } else {
      toast.success(`Imported ${newInvoices.length} invoice${newInvoices.length > 1 ? "s" : ""} successfully${itemNote}${skippedNote}`)
    }

    // Show individual warnings for inactive students
    if (inactiveStudentWarnings.length > 0) {
      setTimeout(() => {
        inactiveStudentWarnings.forEach(msg => {
          toast.warning(`ข้ามรายการ: ${msg}`)
        })
      }, 500)
    }

    const invoiceNums = newInvoices.map(inv => inv.invoiceNumber)
    logActivity({
      action: `Imported ${newInvoices.length} invoices from interface Excel`,
      module: "Invoice Management",
      detail: `Invoice numbers: ${invoiceNums.slice(0, 10).join(", ")}${invoiceNums.length > 10 ? ` and ${invoiceNums.length - 10} more` : ""}${itemNote}`
    })
    window.dispatchEvent(new CustomEvent("invoicesUpdated"))
  }

  const exportAllInvoicesZip = async () => {
    const invoicesToExport = selectedInvoiceIds.size > 0
      ? filteredInvoices.filter(inv => selectedInvoiceIds.has(inv.id))
      : []

    if (invoicesToExport.length === 0) {
      toast.error("Please select invoices to export")
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
            <td style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right;">฿${item.amount.toLocaleString()}</td>
            <td style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right;">${item.discountPercent || 0}%</td>
            <td style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right;">฿${item.discountedAmount.toLocaleString()}</td>
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
            <div style="margin-top:8px; font-size:72px; font-weight:700; letter-spacing:2px;">INVOICE</div>
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
                  <tr><td style="padding:4px 0;">Issue Date</td><td style="padding:4px 0;">${escapeHtml(invoice.issueDate ? format(invoice.issueDate, "dd/MM/yyyy") : "Pending")}</td></tr>
                  <tr><td style="padding:4px 0;">Due Date</td><td style="padding:4px 0;">${escapeHtml(format(invoice.dueDate, "dd/MM/yyyy"))}</td></tr>
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
                <td style="padding:6px 8px; border:1px solid #e5e7eb; text-align:right; font-weight:700;">฿${getDisplayAmount(invoice).toLocaleString()}</td>
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

      const total = invoicesToExport.length
      setExportProgress({ current: 0, total })

      for (let index = 0; index < invoicesToExport.length; index += 1) {
        const invoice = invoicesToExport[index]
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
      triggerDownload(zipBlob, `invoices-export-${format(new Date(), "yyyyMMdd_HHmmss")}.zip`, "application/zip")

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
    if (category === "external") {
      // External invoice template — exact columns from external interface file
      const headers = [
        "Clientname",
        "Contact name",
        "address",
        "AdultIDNo",
        "NominalCode",
        "Type",
        "DocumentNo",
        "InvoiceDate",
        "DueDate",
        "FinanceCode",
        "Description",
        "InvoiceLineItem",
        "Amount"
      ]
      const sampleRow = [
        "Company ABC Co., Ltd.",  // Clientname
        "Mr. John Smith",         // Contact name
        "123 Main Street, Bangkok", // address
        "A001",                   // AdultIDNo
        "4110003",                // NominalCode
        "SI",                     // Type
        "20260000001",            // DocumentNo
        "15/01/2026",             // InvoiceDate (dd/MM/yyyy)
        "31/01/2026",             // DueDate (dd/MM/yyyy)
        "EXT-001",                // FinanceCode
        "Service Fee",            // Description
        "1",                      // InvoiceLineItem
        "50000"                   // Amount
      ]
      downloadAsXlsx(headers, [sampleRow], "external_invoice_template")
      return
    }
    const headers = [
      "PupilID",
      "AdultIDNo",
      "NominalCode",
      "Type",
      "DocumentNo",
      "InvoiceDate",
      "DueDate",
      "SchoolYear",
      "YearGroup",
      "SchoolTerm",
      "FinanceCode",
      "Description",
      "InvoiceLineItem",
      "Amount"
    ]
    const sampleRow = [
      "ST001",              // PupilID
      "A001",               // AdultIDNo
      "4110003",            // NominalCode
      "SI",                 // Type (Sales Invoice)
      "20250000001",            // DocumentNo
      "15/01/2026",         // InvoiceDate
      "31/01/2026",         // DueDate
      "2024/2025",          // SchoolYear
      "Year 1",             // YearGroup
      "Term 2",             // SchoolTerm
      "TUI-T2",             // FinanceCode
      "Tuition Fee - Term 2", // Description
      "Term 2 tuition payment for academic year", // InvoiceLineItem
      "130000"              // Amount
    ]
    downloadAsXlsx(headers, [sampleRow], "invoice_interface_template")
  }

  const downloadInterfaceFile = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export")
      return
    }

    const headers = [
      "PupilID",
      "AdultIDNo",
      "NominalCode",
      "Type",
      "DocumentNo",
      "InvoiceDate",
      "DueDate",
      "SchoolYear",
      "YearGroup",
      "SchoolTerm",
      "FinanceCode",
      "Description",
      "InvoiceLineItem",
      "Amount"
    ]

    const rows: string[][] = []

    // Load ItemManagement catalog for itemCode lookup by description (fallback when itemCode not stored on item)
    const loadCatalogForCategory = (cat: string) => {
      try {
        const key = cat === "afterschool" ? "afterschoolItems"
          : cat === "event" ? "eventItems"
            : cat === "summer" ? "summerItems"
              : cat === "external" ? "externalItems"
                : cat === "eca" ? "ecaItems"
                  : cat === "trip" ? "tripItems"
                    : cat === "exam" ? "examItems"
                      : cat === "bus" ? "busItems"
                        : "invoiceItems" // tuition / student / default
        const stored = localStorage.getItem(key)
        return stored ? JSON.parse(stored) : []
      } catch { return [] }
    }

    filteredInvoices.forEach(invoice => {
      // Get student data
      const student = students.find(s => s.id === invoice.studentId || s.studentId === invoice.studentId)
      const family = families.find(f => f.id === student?.familyId)
      const pupilID = invoice.studentId || ""
      const adultIDNo = family?.familyCode || invoice.adultIdNo || ""
      const schoolYear = (invoice.academicYear || getAcademicYear(invoice.issueDate || new Date())).replace(/-/g, "/")
      const yearGroup = invoice.studentGrade || ""
      const rawTerm = invoice.term || ""
      // Extract only "Term X" part — strip academic year prefix (e.g. "2024/2025 - Term 1" → "Term 1")
      const termMatch = rawTerm.match(/Term\s*\d+/i)
      const schoolTerm = termMatch ? termMatch[0] : rawTerm
      const invoiceDate = invoice.issueDate ? format(new Date(invoice.issueDate), "dd/MM/yyyy") : ""
      const dueDate = format(new Date(invoice.dueDate), "dd/MM/yyyy")

      // Load catalog for this invoice's category (for fallback itemCode lookup)
      const catalog = loadCatalogForCategory(invoice.category || category || "tuition")

      // DocumentNo is only filled if the invoice is approved
      const isApproved = getApprovalStatus(invoice) === "approved"
      const documentNo = isApproved ? invoice.invoiceNumber : ""

      // For each line item in the invoice, create a separate row
      let lineCounter = 0
      invoice.items.forEach((item) => {
        lineCounter++
        // Get item details - try to extract from item or use defaults
        const itemData = item as any // Cast to any to access potential itemCode/nominalCode fields
        // Resolve FinanceCode and NominalCode:
        // 1. Catalog lookup by description (primary - always use ItemManagement itemCode/nominalCode)
        // 2. Stored itemCode/financeCode/notes (fallback for items not in catalog)
        const description = item.description || itemData.name || ""
        const catalogItem = catalog.find((ci: any) =>
          (ci.name || "").toLowerCase() === description.toLowerCase() ||
          (ci.description || "").toLowerCase() === description.toLowerCase()
        )
        const storedItemCode = itemData.itemCode || itemData.financeCode || item.notes || ""
        const financeCode = catalogItem?.itemCode || storedItemCode || ""
        const nominalCode = catalogItem?.nominalCode || itemData.nominalCode || "4110000"
        const amount = Math.round(item.discountedAmount ?? item.amount).toString()
        const documentType = itemData.documentType || "SI" // Default to Sales Invoice

        rows.push([
          pupilID,
          adultIDNo,
          nominalCode,
          documentType,
          documentNo,
          invoiceDate,
          dueDate,
          schoolYear,
          yearGroup,
          schoolTerm,
          financeCode,
          description,
          lineCounter.toString(),
          amount
        ])
      })

      // Calculate discounts dynamically (same logic as invoice detail view)
      const subtotalForDiscounts = invoice.totalAmount || invoice.items.reduce((sum, item) => sum + item.amount, 0)
      const isNonDiscountableInvoice =
        invoice.category === "eca" || invoice.category === "trip" || invoice.category === "exam"

      const dynamicDiscounts: { name: string; amount: number; percentage?: number }[] = []

      if (!isNonDiscountableInvoice && invoice.invoiceType !== "external" && invoice.studentId !== "EXTERNAL") {
        // 1. Sibling discount
        if (student && student.childOrder >= 2) {
          const siblingPercent = getSiblingDiscount(student)
          if (siblingPercent > 0) {
            const siblingAmount = Math.round(subtotalForDiscounts * siblingPercent / 100)
            if (siblingAmount > 0) dynamicDiscounts.push({ name: `Sibling Discount`, amount: siblingAmount, percentage: siblingPercent })
          }
        }

        // 2. Student group discounts - use stored invoice.discounts (set at creation time)
        // Never recalculate from current group state for existing invoices
        ; (invoice.discounts || [])
          .filter(d => !/sibling|staff child|^scholarship$|early bird/i.test(d.name))
          .forEach(d => {
            if (d.amount > 0) dynamicDiscounts.push({ name: d.name, amount: d.amount, percentage: d.percentage })
          })

        // 3. Staff Child (50%)
        if (student && student.notes?.toLowerCase().includes('staff')) {
          const staffAmount = Math.round(subtotalForDiscounts * 50 / 100)
          if (staffAmount > 0) dynamicDiscounts.push({ name: "Staff Child Discount", amount: staffAmount, percentage: 50 })
        }

        // 4. Scholarship
        if (student && student.notes?.toLowerCase().includes('scholarship')) {
          dynamicDiscounts.push({ name: "Scholarship", amount: subtotalForDiscounts, percentage: 100 })
        }

        // 5. Early Bird (5%)
        if (student && student.notes?.toLowerCase().includes('early bird')) {
          const earlyBirdAmount = Math.round(subtotalForDiscounts * 5 / 100)
          if (earlyBirdAmount > 0) dynamicDiscounts.push({ name: "Early Bird Discount", amount: earlyBirdAmount, percentage: 5 })
        }
      }

      // Add discount rows (negative amounts)
      dynamicDiscounts.forEach((disc) => {
        lineCounter++
        const discCatalogItem = catalog.find((ci: any) =>
          (ci.name || "").toLowerCase() === (disc.name || "").toLowerCase() ||
          (ci.description || "").toLowerCase() === (disc.name || "").toLowerCase()
        )
        const discFinanceCode = discCatalogItem?.itemCode || ""
        const discAmount = (-Math.round(disc.amount)).toString()

        rows.push([
          pupilID,
          adultIDNo,
          "",
          "SI",
          documentNo,
          invoiceDate,
          dueDate,
          schoolYear,
          yearGroup,
          schoolTerm,
          discFinanceCode,
          disc.name || "Discount",
          lineCounter.toString(),
          discAmount
        ])
      })
    })

    // Download as Excel
    const timestamp = format(new Date(), "yyyyMMdd_HHmmss")
    downloadAsXlsx(headers, rows, `invoice_interface_${timestamp}`)

    toast.success(`Exported ${rows.length} line items from ${filteredInvoices.length} invoice${filteredInvoices.length > 1 ? 's' : ''}`)
  }

  const downloadPaymentReceiptInterface = () => {
    const headers = [
      "Receipt no.",
      "Customer no.",
      "Type",
      "RV no. series",
      "Receive date",
      "Payment method",
      "Sell-to-customer No.",
      "Receive Account no.",
      "Year group",
      "School year",
      "Invoice no.",
      "Amount"
    ]

    // Read directly from localStorage to avoid stale React state
    const rawInvoicesFromStorage: any[] = (() => {
      try {
        const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
      } catch { return [] }
    })()

    // Filter paid invoices directly from raw localStorage data
    const paidInvoices = rawInvoicesFromStorage.filter((inv: any) =>
      inv.status === "paid" || !!inv.paidDate
    )
    if (paidInvoices.length === 0) {
      toast.error("No paid invoices to export")
      return
    }

    // Load all receipt records from localStorage to look up receiptNo
    const receiptStorageKeys = [
      "receiptRecords_tuition", "receiptRecords_eca", "receiptRecords_trip",
      "receiptRecords_event", "receiptRecords_external", "receiptRecords_summer"
    ]
    const allReceipts: any[] = []
    receiptStorageKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key)
        if (stored) allReceipts.push(...JSON.parse(stored))
      } catch { /* ignore */ }
    })

    // Use bankAccounts from state, fallback to localStorage if empty
    // Note: usePersistedState stores with prefix "kingscollege_backoffice_"
    let allBankAccounts: any[] = bankAccounts || []
    if (!allBankAccounts.length) {
      try {
        const stored = localStorage.getItem("kingscollege_backoffice_bankAccounts")
        if (stored) allBankAccounts = JSON.parse(stored)
      } catch { /* ignore */ }
    }

    const mapPaymentMethod = (method: string): string => {
      if (!method) return ""
      const m = method.toLowerCase()
      if (m.includes("bank transfer") || m === "bank") return "Bank"
      if (m.startsWith("edc") || m.includes("pos") || m.includes("qr") || m.includes("credit card")) return "POS (QR/CC)"
      if (m.includes("cheque") || m.includes("check")) return "Cheque"
      if (m.includes("cash")) return "Cash"
      return method
    }

    // Get GL account from BankSettings by matching payment method
    const getReceiveAccountNo = (paymentMethod: string): string => {
      if (!paymentMethod) return ""
      const m = paymentMethod.toLowerCase()
      let matchedAccount: any = null

      if (m.startsWith("edc")) {
        // "EDC - BankName (accountNumber)" — match by bank name and account number
        const edcMatch = paymentMethod.match(/EDC\s*-\s*(.+?)\s*\((.+?)\)/)
        if (edcMatch) {
          const [, bankName, accountNumber] = edcMatch
          matchedAccount = allBankAccounts.find(acc =>
            acc.paymentSource === "EDC" &&
            acc.bankName === bankName.trim() &&
            acc.accountNumber === accountNumber.trim() &&
            acc.isActive
          )
        }
        // Fallback: any active EDC account
        if (!matchedAccount) {
          matchedAccount = allBankAccounts.find(acc => acc.paymentSource === "EDC" && acc.isActive)
        }
      } else if (m.includes("bank transfer")) {
        matchedAccount = allBankAccounts.find(acc => acc.paymentSource === "Bank Transfer" && acc.isActive)
      } else if (m.includes("cheque")) {
        matchedAccount = allBankAccounts.find(acc => acc.paymentSource === "Cashier's cheque" && acc.isActive)
      }

      return matchedAccount?.glAccount || matchedAccount?.accountNumber || ""
    }

    const rows: (string | number)[][] = []

    paidInvoices.forEach((inv: any) => {
      const studentIdStr = String(inv.studentId || "").trim()

      // adultIdNo comes directly from raw localStorage — no state fallback needed
      const adultIDNo = String(inv.adultIdNo || "").trim()

      // Find receipt record for this invoice
      const receiptRecord = allReceipts.find((r: any) =>
        r.invoices?.some((ri: any) => ri.invoiceNo === inv.invoiceNumber || ri.id === inv.id)
      )
      const receiptNo = receiptRecord?.receiptNo || ""

      const receiveDate = inv.paidDate ? format(new Date(inv.paidDate), "dd/MM/yyyy") : ""
      const paymentMethod = mapPaymentMethod(inv.paymentMethod || "")
      const schoolYear = (inv.academicYear || "").replace(/-/g, "/")
      const yearGroup = inv.studentGrade || ""

      // Get Receive Account no.: use stored value first, then lookup from BankSettings
      const receiveAccountNo = inv.receiveAccountNo || getReceiveAccountNo(inv.paymentMethod || "")

      rows.push([
        receiptNo,
        adultIDNo,
        "CASHRCPT",
        "AR-RV",
        receiveDate,
        paymentMethod,
        studentIdStr,
        receiveAccountNo,
        yearGroup,
        schoolYear,
        inv.invoiceNumber || "",
        inv.finalAmount || 0
      ])
    })

    const timestamp = format(new Date(), "yyyyMMdd_HHmmss")
    downloadAsXlsx(headers, rows, `payment_receipt_interface_${timestamp}`)
    toast.success(`Exported ${rows.length} payment receipt${rows.length !== 1 ? 's' : ''}`)
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
          s.familyId === student?.familyId &&
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

        // 2. Student group discounts - use stored invoice.discounts (set at creation time)
        // Never recalculate from current group state for existing invoices
        ; (invoice.discounts || [])
          .filter(d => !/sibling|staff child|^scholarship$|early bird/i.test(d.name))
          .forEach(d => {
            discountLines.push({ name: d.name, amount: d.amount, percent: d.percentage })
          })

        // 3. Staff Child discount
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
      const lateFeeAmount = 0
      const lateFeePercent = 0

      // ID Charges removed - no longer applicable
      const totalDiscounts = discountLines.reduce((sum, d) => sum + d.amount, 0)
      const registrationFeesTotal = (invoice as any).registrationFees?.reduce((sum: number, fee: any) => sum + fee.amount, 0) || 0

      // Prepare invoice with additional details
      const invoiceWithDetails = {
        ...invoice,
        discounts: discountLines.length > 0 ? discountLines : undefined,
        registrationFees: (invoice as any).registrationFees || undefined,
        lateFee: undefined
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

  // Generate proper invoice number based on academic year and running number
  const generateInvoiceNumber = (academicYear: string | undefined) => {
    return generateNextInvoiceNumber(academicYear)
  }

  const displayInvoiceNumber = (invoiceNumber: string | undefined, approvalStatus?: ApprovalStatus) => {
    if (!invoiceNumber || invoiceNumber.includes("DRAFT-") || invoiceNumber.startsWith("IMP-")) {
      return ""
    }
    if (approvalStatus === "rejected") {
      return ""
    }
    return invoiceNumber
  }

  // Approval handlers
  const handleApproveInvoice = (invoice: Invoice) => {
    // Generate proper invoice number if it's a draft number
    const needsNewInvoiceNumber = !invoice.invoiceNumber || invoice.invoiceNumber.startsWith('DRAFT-') || invoice.invoiceNumber.startsWith('IMP-')
    const finalInvoiceNumber = needsNewInvoiceNumber
      ? generateInvoiceNumber(invoice.studentId)
      : invoice.invoiceNumber

    const approvalDate = new Date()
    const emailSentAt = approvalDate.toISOString()

    const updatedInvoices = invoices.map(inv =>
      inv.id === invoice.id
        ? {
          ...inv,
          invoiceNumber: finalInvoiceNumber,
          approvalStatus: "approved" as ApprovalStatus,
          approvedBy: user?.name || "Admin",
          approvedAt: approvalDate,
          issueDate: approvalDate,
          status: "sent" as const,
          emailSentAt: approvalDate
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
              approvalStatus: "approved" as ApprovalStatus,
              approvedBy: user?.name || "Admin",
              approvedAt: emailSentAt,
              issueDate: approvalDate.toISOString().split('T')[0],
              status: "sent",
              emailSentAt
            }
            : inv
        )
        localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedSavedInvoices))
      }
    } catch (error) {
      console.error("Failed to update invoice approval in localStorage:", error)
    }

    applyFilters()
    window.dispatchEvent(new CustomEvent("invoicesUpdated"))
    toast.success(`Invoice ${finalInvoiceNumber} approved & email sent`)
    logActivity({
      action: `Approved invoice ${finalInvoiceNumber}`,
      module: "Invoices",
      detail: "Approval Status: wait → approved, Email: sent immediately"
    })
    setIsApprovalDialogOpen(false)
    setSelectedInvoiceForApproval(null)
  }

  const handleRejectInvoice = (invoice: Invoice, reason: string) => {
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoice.id
        ? {
          ...inv,
          approvalStatus: "rejected" as ApprovalStatus,
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
              approvalStatus: "rejected" as ApprovalStatus,
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

    toast.success(`Invoice ${displayInvoiceNumber(invoice.invoiceNumber, getApprovalStatus(invoice))} has been cancelled`)
    logActivity({
      action: `Cancelled invoice ${displayInvoiceNumber(invoice.invoiceNumber, getApprovalStatus(invoice))}`,
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

  const openMarkPaidDialog = useCallback(async (invoice: Invoice) => {
    setMarkPaidInvoice(invoice)
    setPaymentMethod("")
    setPaymentFiles([])
    setSelectedCNIdsForPaid(new Set())
    setEdcAmount("")
    setCcFeePercent("")

    // Credit Notes are not applicable for external invoices
    const isExternalInvoice = invoice.invoiceType === "external" || invoice.studentId === "EXTERNAL" || invoice.category === "external"

    // Read credit notes directly from localStorage and match permissively
    let cns: CreditNoteRecord[] = []
    if (isExternalInvoice) {
      setAvailableCNsForPaid([])
      setIsMarkPaidOpen(true)
      return
    }
    try {
      const stored = localStorage.getItem("creditNotesRecords")
      if (stored) {
        const raw: any[] = JSON.parse(stored)
        const fCode = (invoice.adultIdNo || "").trim().toLowerCase()
        const sId = (invoice.studentId || "").trim().toLowerCase()
        const sName = (invoice.studentName || "").trim().toLowerCase()

        cns = raw
          .filter(cn => {
            const rawStatus = (cn.status || "").toLowerCase()
            if (rawStatus === "applied" || rawStatus === "cancelled" || rawStatus === "used") return false

            const cnFamilyCode = (cn.parentName || cn.familyCode || "").trim().toLowerCase()
            const cnStudentId = (cn.studentId || "").trim().toLowerCase()
            const cnStudentName = (cn.studentName || "").trim().toLowerCase()

            return (
              (fCode && (cnFamilyCode === fCode || cnStudentId === fCode)) ||
              (sId && (cnStudentId === sId || cnFamilyCode === sId)) ||
              (sName && cnStudentName === sName)
            )
          })
          .map(cn => ({
            id: String(cn.id),
            creditNoteNumber: cn.creditNoteNumber || "",
            studentName: cn.studentName || "",
            studentId: cn.studentId || "",
            familyCode: cn.parentName || cn.familyCode || "",
            amount: cn.creditAmount ?? cn.amount ?? 0,
            remainingBalance: cn.remainingBalance,
            reason: cn.reason || "",
            status: "issued" as const,
            issueDate: cn.issueDate ? String(cn.issueDate) : new Date().toISOString(),
          }))
      }
    } catch {
      // fallback to service layer
      cns = await getCreditNotesByFamily(
        invoice.adultIdNo || invoice.studentId,
        invoice.studentId,
        invoice.studentName
      ) as CreditNoteRecord[]
    }
    setAvailableCNsForPaid(cns)
    setIsMarkPaidOpen(true)
  }, [])

  const readFileAsDataUrl = (file: File): Promise<{ name: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result || "") })
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  const confirmMarkPaid = async () => {
    const invoicesToPay = markPaidInvoices.length > 0 ? markPaidInvoices : (markPaidInvoice ? [markPaidInvoice] : [])
    if (invoicesToPay.length === 0) return

    const totalFinalAmount = invoicesToPay.reduce((sum, inv) => sum + (inv.finalAmount || 0), 0)

    // Compute how much CNs cover (Total pool)
    const totalCNPool = [...selectedCNIdsForPaid].reduce((sum, id) => {
      const cn = availableCNsForPaid.find(c => c.id === id)
      return sum + (cn ? (cn.remainingBalance ?? cn.amount) : 0)
    }, 0)
    
    // We can't use more CN than the total invoice amount
    const usedCNPool = Math.min(totalCNPool, totalFinalAmount)
    const netPayableTotal = Math.max(0, totalFinalAmount - usedCNPool)

    if (netPayableTotal > 0 && !paymentMethod) {
      toast.error("Please select a payment method")
      return
    }
    if (netPayableTotal > 0 && paymentMethod === "EDC" && !edcBank) {
      toast.error("Please select a bank account for EDC payment")
      return
    }
    if (netPayableTotal > 0 && paymentMethod === "EDC" && !edcAmount) {
      toast.error("Please enter EDC Amount")
      return
    }
    if (netPayableTotal > 0 && paymentMethod === "EDC" && !ccFeePercent) {
      toast.error("Please enter Transaction Fee (%)")
      return
    }

    // EDC-specific computed values (fee calculated from net payable after CN)
    const _edcAmt = paymentMethod === "EDC" ? (parseFloat(edcAmount) || 0) : 0
    const _ccFeePct = paymentMethod === "EDC" ? (parseFloat(ccFeePercent) || 0) : 0
    const _ccFee = parseFloat((netPayableTotal * _ccFeePct / 100).toFixed(2))
    const _totalToPay = netPayableTotal + _ccFee
    const _overpayment = paymentMethod === "EDC" ? Math.max(0, _edcAmt - _totalToPay) : 0

    setIsSavingPayment(true)
    try {
      const proofs = await Promise.all(paymentFiles.map(readFileAsDataUrl))
      const paidAt = new Date()
      const onlineMethods = ["Thai QR", "Credit Card"]
      const enteredPayAmt = onlineMethods.includes(paymentMethod) ? 0 : (parseFloat(paymentAmountInput) || 0)
      const isPartialByAmount = !["EDC", ...onlineMethods].includes(paymentMethod) && enteredPayAmt > 0 && enteredPayAmt < netPayableTotal
      const isPartial = paymentMethod === "Partial" || isPartialByAmount
      
      const _edcAmt = paymentMethod === "EDC" ? (parseFloat(edcAmount) || 0) : 0
      const _ccFeePct = paymentMethod === "EDC" ? (parseFloat(ccFeePercent) || 0) : 0
      const _ccFeeTotal = parseFloat((netPayableTotal * _ccFeePct / 100).toFixed(2))
      const _totalToPayFull = netPayableTotal + _ccFeeTotal

      const paymentMethodDetailBase = netPayableTotal === 0
        ? "Credit Note"
        : paymentMethod === "EDC"
          ? `EDC - ${edcBank} (${edcAccountNumber})`
          : paymentMethod

      // Sort invoices: CN owner's invoices first, then siblings (same family)
      // This ensures credit notes are applied to the student they belong to before others
      const selectedCNStudentIds = new Set(
        [...selectedCNIdsForPaid]
          .map(id => availableCNsForPaid.find(c => c.id === id)?.studentId?.trim().toLowerCase())
          .filter(Boolean) as string[]
      )
      const sortedInvoices = [...invoicesToPay].sort((a, b) => {
        const aIsCNOwner = selectedCNStudentIds.has((a.studentId || "").trim().toLowerCase()) ? 1 : 0
        const bIsCNOwner = selectedCNStudentIds.has((b.studentId || "").trim().toLowerCase()) ? 1 : 0
        // CN owners first, then by amount DESC
        if (bIsCNOwner !== aIsCNOwner) return bIsCNOwner - aIsCNOwner
        return (b.finalAmount || 0) - (a.finalAmount || 0)
      })
      let cnPoolRemaining = usedCNPool
      
      const invoiceStatusUpdates: Record<string, Partial<Invoice>> = {}
      
      for (const inv of sortedInvoices) {
        const cnForThis = Math.min(inv.finalAmount || 0, cnPoolRemaining)
        cnPoolRemaining -= cnForThis
        const netForThis = (inv.finalAmount || 0) - cnForThis
        
        // EDC specific for this invoice portion if needed, but usually we just say same method
        const paymentMethodDetail = cnForThis > 0 && netForThis === 0 
           ? "Credit Note" 
           : paymentMethodDetailBase

        const actualPaidAmount = isPartialByAmount ? (enteredPayAmt + cnForThis) : (inv.finalAmount || 0)

        invoiceStatusUpdates[inv.id] = {
           status: isPartial ? ("sent" as const) : ("paid" as const),
           paidDate: isPartial ? inv.paidDate : paidAt,
           paymentMethod: paymentMethodDetail,
           receiveAccountNo: selectedGlAccount,
           paymentProofs: proofs,
           ...(isPartialByAmount ? { partialPaidAmount: (((inv as any).partialPaidAmount || 0) + enteredPayAmt + cnForThis) } : {}),
        }

        // Save payment record
        try {
          const paymentKey = "paymentRecords"
          const storedPayments = localStorage.getItem(paymentKey)
          const payments = storedPayments ? JSON.parse(storedPayments) : []
          const paymentRecord = {
            id: `payment-${inv.id}-${Date.now()}`,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            studentName: inv.studentName,
            studentId: inv.studentId,
            studentGrade: inv.studentGrade,
            amount: actualPaidAmount,
            term: inv.term || "-",
            paymentMethod: paymentMethodDetail,
            status: isPartial ? "partial" : "paid",
            transactionDate: paidAt.toISOString(),
            paymentProofs: proofs
          }
          const existingIndex = payments.findIndex((p: any) => p.invoiceId === inv.id || p.invoiceNumber === inv.invoiceNumber)
          if (existingIndex >= 0) payments[existingIndex] = paymentRecord
          else payments.push(paymentRecord)
          localStorage.setItem(paymentKey, JSON.stringify(payments))
        } catch (e) { console.error(e) }

        // Generate receipt
        if (!isPartial) {
          try {
            let receiptStorageKey = ""
            let receiptPrefix = ""
            const category = inv.category
            if (category === "eca") { receiptStorageKey = "receiptRecords_eca"; receiptPrefix = "ECA"; }
            else if (category === "trip") { receiptStorageKey = "receiptRecords_trip"; receiptPrefix = "TRP"; }
            else if (category === "exam") { receiptStorageKey = "receiptRecords_event"; receiptPrefix = "EXM"; }
            else if (category === "bus") { receiptStorageKey = "receiptRecords_summer"; receiptPrefix = "BUS"; }
            else if (category === "external") { receiptStorageKey = "receiptRecords_external"; receiptPrefix = "EXT"; }
            else { receiptStorageKey = "receiptRecords_tuition"; receiptPrefix = "TUI"; }

            const storedReceipts = localStorage.getItem(receiptStorageKey)
            const receipts = storedReceipts ? JSON.parse(storedReceipts) : []

            const academicYearStr = inv.academicYear || ""
            const acYearStart = academicYearStr.match(/(\d{4})/)?.[1] || new Date().getFullYear().toString()
            const runningKey = `receipt_running_no_${acYearStart}`
            const currentRunning = parseInt(localStorage.getItem(runningKey) || "0", 10)
            const nextRunning = currentRunning + 1
            localStorage.setItem(runningKey, nextRunning.toString())
            const receiptNo = `R${acYearStart}-${String(nextRunning).padStart(5, "0")}`

            const receiptRecord = {
              id: `receipt-${inv.id}`,
              receiptNo: receiptNo,
              receiptDate: paidAt.toISOString(),
              clientType: inv.invoiceType === "external" ? "external" : "internal",
              clientNo: inv.studentId,
              clientName: inv.parentName || inv.studentName,
              contactName: inv.studentName,
              yearGroup: inv.studentGrade,
              schoolYear: (inv.academicYear && inv.term) ? `${inv.academicYear} - ${inv.term}` : (inv.academicYear || inv.term || ""),
              academicYear: inv.academicYear || "",
              term: inv.term || "",
              totalAmount: netForThis, // Total received cash
              creditNoteTotal: cnForThis,
              paymentMethod: paymentMethodDetail,
              status: "generated",
              createdAt: paidAt.toISOString(),
              invoices: [{
                id: inv.id,
                invoiceNo: inv.invoiceNumber,
                invoiceAmount: inv.finalAmount || 0,
                receivedAmount: inv.finalAmount || 0,
                cnDeduction: cnForThis
              }]
            }
            receipts.push(receiptRecord)
            localStorage.setItem(receiptStorageKey, JSON.stringify(receipts))
          } catch (e) { console.error(e) }
        }

        // Apply Credit Notes if used for this invoice
        if (cnForThis > 0 && selectedCNIdsForPaid.size > 0) {
          try {
            // Distribute the cnForThis across selected CNs (simplification for localStorage service)
            let remainingToApply = cnForThis
            const payloads = [...selectedCNIdsForPaid].map(id => {
              const cn = availableCNsForPaid.find(c => c.id === id)
              const cnBalance = cn?.remainingBalance ?? cn?.amount ?? 0
              const toApply = Math.min(cnBalance, remainingToApply)
              remainingToApply = Math.max(0, remainingToApply - toApply)
              if (toApply <= 0) return null
              return {
                creditNoteId: id,
                invoiceId: inv.invoiceNumber,
                appliedAmount: toApply,
                appliedBy: "staff" as const,
              }
            }).filter(p => p !== null) as any[]
            
            if (payloads.length > 0) {
              await applyCreditNotes(payloads)
              window.dispatchEvent(new CustomEvent("creditNotesUpdated"))
            }
          } catch (e) { console.error("Failed to update credit notes:", e) }
        }

        // Auto-create Credit Note for EDC overpayment (only for the last invoice if bulk, or distributed)
        // Usually overpayment happens on the total transaction. 
        // For simplicity, we handle it once if it's the last invoice in the sorted list.
        if (inv.id === sortedInvoices[sortedInvoices.length - 1].id && _overpayment > 0) {
          try {
            const cnNumber = `CN-OVP-${Date.now()}`
            const newCN = {
              id: `cn-${Date.now()}`,
              creditNoteNumber: cnNumber,
              studentName: inv.studentName,
              studentId: inv.studentId,
              studentGrade: inv.studentGrade || "",
              academicYear: inv.academicYear || "",
              term: inv.term || "",
              invoiceNumber: inv.invoiceNumber,
              parentName: inv.adultIdNo || "",
              familyCode: inv.adultIdNo || "",
              creditAmount: _overpayment,
              amount: _overpayment,
              remainingBalance: _overpayment,
              reason: `EDC Overpayment`,
              status: "issued",
              issueDate: new Date().toISOString(),
            }
            const storedCNs = localStorage.getItem("creditNotesRecords")
            const existingCNs = storedCNs ? JSON.parse(storedCNs) : []
            existingCNs.unshift(newCN)
            localStorage.setItem("creditNotesRecords", JSON.stringify(existingCNs))
            toast.info(`Credit Note ${cnNumber} (฿${_overpayment.toLocaleString()}) created for EDC overpayment`)
          } catch (e) { console.error("Failed to create overpayment credit note:", e) }
        }
      }

      window.dispatchEvent(new CustomEvent("invoicesUpdated"))
      window.dispatchEvent(new CustomEvent("paymentsUpdated"))

      // Log activity for the bulk or single action
      const invoiceNumbersLog = invoicesToPay.map(inv => inv.invoiceNumber).join(", ")
      logActivity({
        action: `${isPartial ? "Recorded partial payment" : "Marked invoice as paid"} for ${invoicesToPay.length} invoice(s): ${invoiceNumbersLog}`,
        module: "Invoices",
        detail: `Payment Method: ${paymentMethodDetailBase}, Proofs: ${proofs.length}${selectedCNIdsForPaid.size > 0 ? `, Credit Notes applied: ${selectedCNIdsForPaid.size}` : ""}${_overpayment > 0 ? `, EDC Overpayment: ฿${_overpayment}` : ""}`
      })

      toast.success(isPartial ? "Saved partial payment" : "Marked invoice(s) as paid and receipt(s) generated")
      
      // Cleanup states
      setIsMarkPaidOpen(false)
      setMarkPaidInvoice(null)
      setMarkPaidInvoices([])
      setPaymentMethod("")
      setPaymentFiles([])
      setAvailableCNsForPaid([])
      setSelectedCNIdsForPaid(new Set())
      setEdcAmount("")
      setCcFeePercent("")
      setPaymentAmountInput("")
      setEdcBank("")
      setEdcAccountNumber("")
      setSelectedGlAccount("")
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
    }
  }

  const getEmailStatus = (invoice: Invoice): "wait" | "sent" => {
    // Approved = email sent automatically
    if (getApprovalStatus(invoice) === "approved" || invoice.emailSentAt || invoice.status === "sent") {
      return "sent"
    }
    return "wait"
  }

  const getPaymentStatusBadge = (status: "unpaid" | "paid" | "partial" | "overdue") => {
    switch (status) {
      case "paid":
        return <Badge style={{ backgroundColor: "#dcfce7", color: "#166534", border: "none" }}>Paid</Badge>
      case "partial":
        return <Badge style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "none" }}>Partial</Badge>
      case "overdue":
        return <Badge style={{ backgroundColor: "#fee2e2", color: "#991b1b", border: "none" }}>Overdue</Badge>
      case "unpaid":
      default:
        return <Badge style={{ backgroundColor: "#f3f4f6", color: "#1f2937", border: "none" }}>Unpaid</Badge>
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
    draft: tabFilteredInvoices.filter(inv => getApprovalStatus(inv) === "wait").length,
    pendingApproval: tabFilteredInvoices.filter(inv => getApprovalStatus(inv) === "wait").length,
    approved: tabFilteredInvoices.filter(inv => getApprovalStatus(inv) === "approved").length,
    rejected: tabFilteredInvoices.filter(inv => getApprovalStatus(inv) === "rejected").length,
    sent: tabFilteredInvoices.filter(inv => getEmailStatus(inv) === "sent").length,
    partial: tabFilteredInvoices.filter(inv => getPaymentStatus(inv) === "partial").length,
    paid: tabFilteredInvoices.filter(inv => getPaymentStatus(inv) === "paid").length,
    overdue: tabFilteredInvoices.filter(inv => getPaymentStatus(inv) === "overdue").length,
    totalAmount: tabFilteredInvoices.reduce((sum, inv) => sum + inv.finalAmount, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            {category === "tuition" ? t("menu.tuitionInvoices") :
             category === "eca" ? t("menu.ecaInvoices") :
             category === "trip" ? t("menu.tripInvoices") :
             category === "exam" ? t("menu.examInvoices") :
             category === "bus" ? t("menu.busInvoices") :
             category === "external" ? t("menu.externalInvoices") :
             t("invoice.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("invoice.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={downloadInterfaceFile}
          >
            <Download className="w-4 h-4" />
            Export Interface File
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setIsImportInterfaceUploadOpen(true)}
            disabled={!userCanEdit}
          >
            <Upload className="w-4 h-4" />
            Import Interface File
          </Button>
          <input
            id="import-interface-input"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportInterfaceFile}
          />
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={exportAllInvoicesZip}
            disabled={isExportingAll || selectedInvoiceIds.size === 0}
          >
            <Download className="w-4 h-4" />
            {isExportingAll
              ? `${t("invoice.exporting")} ${exportProgress?.current ?? 0}/${exportProgress?.total ?? 0}`
              : selectedInvoiceIds.size > 0
                ? `Export PDF (${selectedInvoiceIds.size})`
                : "Export PDF"}
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              const allTpl = migrateTemplates()
              const inv = allTpl.filter(t => t.type === "invoice")
              setTemplateToEdit(inv.find(t => t.isDefault) || inv[0] || null)
              setIsTemplateModalOpen(true)
            }}
          >
            <FileText className="w-4 h-4" />
            Invoice Email Template
          </Button>
          <Button
            onClick={() => onNavigateToSubPage(category === 'external' ? 'external-invoice-creation' : 'invoice-creation', { category, invoiceType: category === 'tuition' ? 'student' : category })}
            className="flex items-center gap-2"
            disabled={!userCanEdit}
          >
            <Plus className="w-4 h-4" />
            {t("invoice.createInvoice")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("invoice.totalInvoices")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.total}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("invoice.pendingApproval")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.pendingApproval}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("common.approved")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.approved}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Email</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.sent}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Partial</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#d97706" }}>{summaryStats.partial}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("common.paid")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.paid}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("common.overdue")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.overdue}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("invoice.totalAmount")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.totalAmount.toLocaleString()}</p>
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
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t("invoice.searchPlaceholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9" />
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showFilters && "rotate-180")} />
                </Button>
              </div>
              {showFilters && (<>
              {category === "external" ? (
                <>
                  {/* External Filters: Approval Status | Email Status | Invoice Status | Issue Date | Due Date */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Approval Status</label>
                      <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("invoice.allStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                          <SelectItem value="wait"><Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Wait</Badge></SelectItem>
                          <SelectItem value="approved"><Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approve</Badge></SelectItem>
                          <SelectItem value="rejected"><Badge className="bg-red-100 text-red-800 hover:bg-red-100">Reject</Badge></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Email Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("invoice.allStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                          <SelectItem value="wait"><Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Wait</Badge></SelectItem>
                          <SelectItem value="sent"><Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent</Badge></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Invoice Status</label>
                      <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("invoice.allStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                          <SelectItem value="unpaid"><Badge style={{ backgroundColor: "#f3f4f6", color: "#1f2937", border: "none" }}>Unpaid</Badge></SelectItem>
                          <SelectItem value="partial"><Badge style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "none" }}>Partial</Badge></SelectItem>
                          <SelectItem value="paid"><Badge style={{ backgroundColor: "#dcfce7", color: "#166534", border: "none" }}>Paid</Badge></SelectItem>
                          <SelectItem value="overdue"><Badge style={{ backgroundColor: "#fee2e2", color: "#991b1b", border: "none" }}>Overdue</Badge></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("invoice.issueDate")}</label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateFrom ? format(dateFrom, "dd/MM/yy") : t("date.from")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dateFrom || undefined} onSelect={(date) => setDateFrom(date || null)} initialFocus />
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
                            <Calendar mode="single" selected={dateTo || undefined} onSelect={(date) => setDateTo(date || null)} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("invoice.dueDate")}</label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dueDateFrom ? format(dueDateFrom, "dd/MM/yy") : t("date.from")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dueDateFrom || undefined} onSelect={(date) => setDueDateFrom(date || null)} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <span className="text-muted-foreground">→</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dueDateTo ? format(dueDateTo, "dd/MM/yy") : t("date.to")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dueDateTo || undefined} onSelect={(date) => setDueDateTo(date || null)} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Internal Filters: Academic Year | Term | Year Group | Approval Status | Email Status | Invoice Status | Issue Date | Due Date */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("invoice.academicYear")}</label>
                      <Select value={academicYearFilter} onValueChange={(value) => {
                        setAcademicYearFilter(value)
                        setTermFilter("all")
                      }}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
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
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("invoice.term")}</label>
                      <Select value={termFilter} onValueChange={setTermFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("invoice.allTerms")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("invoice.allTerms")}</SelectItem>
                          {availableTerms.map(term => {
                            const termMatch = term.name.match(/Term\s*\d+/i)
                            const termLabel = termMatch ? termMatch[0] : term.name
                            return <SelectItem key={term.name} value={term.name}>{termLabel}</SelectItem>
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("invoice.yearGroup")}</label>
                      <Select value={gradeFilter} onValueChange={setGradeFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
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
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Approval Status</label>
                      <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("invoice.allStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                          <SelectItem value="wait"><Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Wait</Badge></SelectItem>
                          <SelectItem value="approved"><Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approve</Badge></SelectItem>
                          <SelectItem value="rejected"><Badge className="bg-red-100 text-red-800 hover:bg-red-100">Reject</Badge></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Email Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("invoice.allStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                          <SelectItem value="wait"><Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Wait</Badge></SelectItem>
                          <SelectItem value="sent"><Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent</Badge></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Invoice Status</label>
                      <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                        <SelectTrigger className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder={t("invoice.allStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                          <SelectItem value="unpaid"><Badge style={{ backgroundColor: "#f3f4f6", color: "#1f2937", border: "none" }}>Unpaid</Badge></SelectItem>
                          <SelectItem value="partial"><Badge style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "none" }}>Partial</Badge></SelectItem>
                          <SelectItem value="paid"><Badge style={{ backgroundColor: "#dcfce7", color: "#166534", border: "none" }}>Paid</Badge></SelectItem>
                          <SelectItem value="overdue"><Badge style={{ backgroundColor: "#fee2e2", color: "#991b1b", border: "none" }}>Overdue</Badge></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("invoice.issueDate")}</label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateFrom ? format(dateFrom, "dd/MM/yy") : t("date.from")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dateFrom || undefined} onSelect={(date) => setDateFrom(date || null)} initialFocus />
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
                            <Calendar mode="single" selected={dateTo || undefined} onSelect={(date) => setDateTo(date || null)} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("invoice.dueDate")}</label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dueDateFrom ? format(dueDateFrom, "dd/MM/yy") : t("date.from")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dueDateFrom || undefined} onSelect={(date) => setDueDateFrom(date || null)} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <span className="text-muted-foreground">→</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dueDateTo ? format(dueDateTo, "dd/MM/yy") : t("date.to")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dueDateTo || undefined} onSelect={(date) => setDueDateTo(date || null)} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
              </div>
              </>)}
            </CardContent>
          </Card>


          {/* Bulk Action Bar */}
          {selectedInvoiceIds.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-800">
                {selectedInvoiceIds.size} item{selectedInvoiceIds.size > 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                {(() => {
                  const selectedInvoices = invoices.filter(inv => selectedInvoiceIds.has(inv.id))
                  const allApprovedAndSent = selectedInvoices.length > 0 && selectedInvoices.every(inv => inv.status === 'sent')
                  const allDraft = selectedInvoices.length > 0 && selectedInvoices.every(inv => getApprovalStatus(inv) === 'wait' && inv.status !== 'sent')
                  
                  return (
                    <>
                      {allApprovedAndSent && (
                        <Button
                          size="sm"
                          onClick={handleBulkMarkPaid}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md px-4"
                          style={{ backgroundColor: '#16a34a', color: '#ffffff', opacity: 1, border: 'none' }}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                      {allDraft && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!userCanEdit}
                          onClick={() => deleteConfirmDialog.confirm(() => handleBulkDelete())}
                          style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete Selected
                        </Button>
                      )}
                    </>
                  )
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInvoiceIds(new Set())}
                  className="text-blue-800 hover:bg-blue-100"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Checkbox - CENTER */}
                    <TableHead align="center" className="w-12">
                      <Checkbox
                        checked={paginatedInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").length > 0 && paginatedInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").every(invoice => selectedInvoiceIds.has(invoice.id))}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedInvoiceIds)
                          const payableOrDraft = paginatedInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled")
                          if (checked) {
                            payableOrDraft.forEach(invoice => newSelected.add(invoice.id))
                          } else {
                            payableOrDraft.forEach(invoice => newSelected.delete(invoice.id))
                          }
                          setSelectedInvoiceIds(newSelected)
                        }}
                        disabled={paginatedInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").length === 0}
                      />
                    </TableHead>
                    {/* Invoice Number - LEFT */}
                    <TableHead align="left">{renderSortHeader(t("invoice.invoiceNumber"), "invoiceNumber")}</TableHead>
                    {/* Student / Client - LEFT */}
                    <TableHead align="left">{renderSortHeader(category === "external" ? "Client" : t("invoice.student"), "studentName")}</TableHead>
                    {/* Year Group - CENTER (hidden for external) */}
                    {category !== "external" && (
                      <TableHead align="center">{renderSortHeader(t("invoice.yearGroup"), "studentGrade", "center")}</TableHead>
                    )}
                    {/* Academic Year - LEFT (hidden for external) */}
                    {category !== "external" && (
                      <TableHead align="left">{renderSortHeader(t("invoice.academicYear"), "academicYear")}</TableHead>
                    )}
                    {/* Term - LEFT (hidden for external) */}
                    {category !== "external" && (
                      <TableHead align="left">{renderSortHeader(t("invoice.term"), "term")}</TableHead>
                    )}
                    {/* Amount - RIGHT */}
                    <TableHead align="right">{renderSortHeader(t("common.amount"), "finalAmount", "right")}</TableHead>
                    {/* Approval Status - CENTER */}
                    <TableHead align="center">{renderSortHeader("Approval Status", "invoiceStatus", "center")}</TableHead>
                    {/* Email Status - CENTER */}
                    <TableHead align="center">{renderSortHeader("Email Status", "emailStatus", "center")}</TableHead>
                    {/* Invoice Status - CENTER */}
                    <TableHead align="center">{renderSortHeader("Invoice Status", "paymentStatus", "center")}</TableHead>
                    {/* Issue Date - LEFT */}
                    <TableHead align="left">{renderSortHeader(t("invoice.issueDate"), "issueDate")}</TableHead>
                    {/* Due Date - LEFT */}
                    <TableHead align="left">{renderSortHeader(t("invoice.dueDate"), "dueDate")}</TableHead>
                    {/* Actions - CENTER */}
                    <TableHead align="center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      {/* Checkbox - CENTER */}
                      <TableCell align="center">
                        <Checkbox
                          checked={selectedInvoiceIds.has(invoice.id)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                          disabled={invoice.status === "paid" || invoice.status === "cancelled"}
                        />
                      </TableCell>
                      {/* Invoice Number - LEFT */}
                      <TableCell align="left" className="font-mono text-sm">
                        {displayInvoiceNumber(invoice.invoiceNumber, getApprovalStatus(invoice))}
                      </TableCell>
                      {/* Student / Client - LEFT */}
                      <TableCell align="left">
                        <div>
                          <div className="font-medium">{invoice.studentName}</div>
                          {category !== "external" && (
                            <div className="text-sm text-muted-foreground">{invoice.studentId}</div>
                          )}
                        </div>
                      </TableCell>
                      {/* Year Group - CENTER (hidden for external) */}
                      {category !== "external" && (
                        <TableCell align="center">
                          <Badge variant="secondary">{invoice.studentGrade}</Badge>
                        </TableCell>
                      )}
                      {/* Academic Year - LEFT (hidden for external) */}
                      {category !== "external" && (
                        <TableCell align="left" className="text-sm text-muted-foreground whitespace-nowrap">
                          {invoice.academicYear || "-"}
                        </TableCell>
                      )}
                      {/* Term - LEFT (hidden for external) */}
                      {category !== "external" && (
                        <TableCell align="left" className="text-sm text-muted-foreground whitespace-nowrap">
                          {(() => {
                            const raw = invoice.term || ""
                            const match = raw.match(/Term\s*\d+/i)
                            return match ? match[0] : (raw || "-")
                          })()}
                        </TableCell>
                      )}
                      {/* Amount - RIGHT */}
                      <TableCell align="right">
                        <div className="font-medium">
                          ฿{getDisplayAmount(invoice).toLocaleString()}
                        </div>
                        {invoice.discountAmount > 0 && (
                          <div className="text-xs text-red-500">
                            -฿{invoice.discountAmount.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      {/* Approval Status - CENTER */}
                      <TableCell align="center">{getInvoiceStatusBadge(getApprovalStatus(invoice))}</TableCell>
                      {/* Email Status - CENTER */}
                      <TableCell
                        align="center"
                        className={getEmailStatus(invoice) === "sent" ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
                        onClick={getEmailStatus(invoice) === "sent" ? () => handleViewEmailDetails(invoice) : undefined}
                      >
                        {getStatusBadge(getEmailStatus(invoice))}
                      </TableCell>
                      {/* Invoice Status - CENTER */}
                      <TableCell align="center">
                        {invoice.status === "cancelled" ? (
                          <Badge className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>
                        ) : (
                          getPaymentStatusBadge(getPaymentStatus(invoice))
                        )}
                      </TableCell>
                      {/* Issue Date - LEFT */}
                      <TableCell align="left">{getApprovalStatus(invoice) === "approved" && invoice.issueDate ? format(invoice.issueDate, "dd MMM yyyy") : "-"}</TableCell>
                      {/* Due Date - LEFT */}
                      <TableCell align="left">{format(invoice.dueDate, "dd MMM yyyy")}</TableCell>
                      {/* Actions - CENTER */}
                      <TableCell align="center">
                        <div className="flex gap-1 justify-center">
                          {/* Always visible: View */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openInvoiceDetail(invoice)}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {/* Always visible: Edit */}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!userCanEdit || !canEditInvoice(invoice.status, getApprovalStatus(invoice))}
                            className={!userCanEdit || !canEditInvoice(invoice.status, getApprovalStatus(invoice)) ? "opacity-30 cursor-not-allowed" : ""}
                            onClick={() => {
                              if (!userCanEdit || !canEditInvoice(invoice.status, getApprovalStatus(invoice))) return
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
                          {/* Always visible: Mark Paid */}
                          {getApprovalStatus(invoice) === "approved" && getPaymentStatus(invoice) !== "paid" && invoice.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => openMarkPaidDialog(invoice)}
                              disabled={!userCanEdit}
                              title="Mark Paid"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                          {/* More menu: Download, Send Email, Email History */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => downloadInvoice(invoice.id)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              {getApprovalStatus(invoice) === "approved" && invoice.status !== "cancelled" && (
                                <DropdownMenuItem
                                  disabled={!userCanEdit}
                                  onClick={() => openSendEmailConfirm(invoice.id)}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send Email
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openEmailHistory(invoice)}>
                                <History className="mr-2 h-4 w-4" />
                                Email History ({getInvoiceEmailLogs(invoice.id).length})
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <PaginationBar
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={filteredInvoices.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* External Invoice Tab */}
        <TabsContent value="external" className="space-y-4">
          {/* Filters for External */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t("invoice.searchPlaceholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9" />
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showFilters && "rotate-180")} />
                </Button>
              </div>
              {showFilters && (<>
              {/* Filters: Approval Status | Email Status | Invoice Status | Date From | Date To */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Approval Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Approval Status</label>
                  <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                    <SelectTrigger className="h-9">
                      <Filter className="w-4 h-4 mr-2" />
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

                {/* Email Status */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Email Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <Filter className="w-4 h-4 mr-2" />
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
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder={t("invoice.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("invoice.allStatus")}</SelectItem>
                      <SelectItem value="unpaid">
                        <Badge style={{ backgroundColor: "#f3f4f6", color: "#1f2937", border: "none" }}>Unpaid</Badge>
                      </SelectItem>
                      <SelectItem value="partial">
                        <Badge style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "none" }}>Partial</Badge>
                      </SelectItem>
                      <SelectItem value="paid">
                        <Badge style={{ backgroundColor: "#dcfce7", color: "#166534", border: "none" }}>Paid</Badge>
                      </SelectItem>
                      <SelectItem value="overdue">
                        <Badge style={{ backgroundColor: "#fee2e2", color: "#991b1b", border: "none" }}>Overdue</Badge>
                      </SelectItem>
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
              <div className="flex justify-end">
                <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
              </div>
              </>)}
            </CardContent>
          </Card>

          {/* Bulk Action Bar (External) */}
          {selectedInvoiceIds.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-800">
                {selectedInvoiceIds.size} item{selectedInvoiceIds.size > 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                {(() => {
                  const selectedInvoices = invoices.filter(inv => selectedInvoiceIds.has(inv.id))
                  const allApprovedAndSent = selectedInvoices.length > 0 && selectedInvoices.every(inv => inv.status === 'sent')
                  const allDraft = selectedInvoices.length > 0 && selectedInvoices.every(inv => getApprovalStatus(inv) === 'wait' && inv.status !== 'sent')
                  
                  return (
                    <>
                      {allApprovedAndSent && (
                        <Button
                          size="sm"
                          onClick={handleBulkMarkPaid}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md px-4"
                          style={{ backgroundColor: '#16a34a', color: '#ffffff', opacity: 1, border: 'none' }}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                      {allDraft && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!userCanEdit}
                          onClick={() => deleteConfirmDialog.confirm(() => handleBulkDelete())}
                          style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete Selected
                        </Button>
                      )}
                    </>
                  )
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInvoiceIds(new Set())}
                  className="text-blue-800 hover:bg-blue-100"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* External Invoice Table */}
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              {filteredInvoices.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                  title={t("invoice.noExternalInvoices")}
                  description={t("invoice.createExternalDesc")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Checkbox - CENTER */}
                      <TableHead align="center" className="w-12">
                        <Checkbox
                          checked={paginatedInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").length > 0 && paginatedInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").every(invoice => selectedInvoiceIds.has(invoice.id))}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedInvoiceIds)
                            const payableOrDraft = paginatedInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled")
                            if (checked) {
                              payableOrDraft.forEach(invoice => newSelected.add(invoice.id))
                            } else {
                              payableOrDraft.forEach(invoice => newSelected.delete(invoice.id))
                            }
                            setSelectedInvoiceIds(newSelected)
                          }}
                          disabled={paginatedInvoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").length === 0}
                        />
                      </TableHead>
                      {/* Invoice No - LEFT */}
                      <TableHead align="left" className="font-semibold">{renderSortHeader("Invoice No.", "invoiceNumber")}</TableHead>
                      {/* Client Name - LEFT */}
                      <TableHead align="left" className="font-semibold">{renderSortHeader("Client Name", "studentName")}</TableHead>
                      {/* Description - LEFT */}
                      <TableHead align="left" className="font-semibold">{renderSortHeader("Description", "eventName")}</TableHead>
                      {/* Amount - RIGHT */}
                      <TableHead align="right" className="font-semibold">{renderSortHeader("Amount", "finalAmount", "right")}</TableHead>
                      {/* Approval - CENTER */}
                      <TableHead align="center" className="font-semibold">{renderSortHeader("Approval", "invoiceStatus", "center")}</TableHead>
                      {/* Email - CENTER */}
                      <TableHead align="center" className="font-semibold">{renderSortHeader("Email", "emailStatus", "center")}</TableHead>
                      {/* Payment - CENTER */}
                      <TableHead align="center" className="font-semibold">{renderSortHeader("Payment", "paymentStatus", "center")}</TableHead>
                      {/* Issue Date - LEFT */}
                      <TableHead align="left" className="font-semibold">{renderSortHeader("Issue Date", "issueDate")}</TableHead>
                      {/* Due Date - LEFT */}
                      <TableHead align="left" className="font-semibold">{renderSortHeader("Due Date", "dueDate")}</TableHead>
                      {/* Actions - CENTER */}
                      <TableHead align="center" className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        {/* Checkbox - CENTER */}
                        <TableCell align="center">
                          <Checkbox
                            checked={selectedInvoiceIds.has(invoice.id)}
                            onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                            disabled={invoice.status === "paid" || invoice.status === "cancelled"}
                          />
                        </TableCell>
                        {/* Invoice No - LEFT */}
                        <TableCell align="left" className="font-mono text-sm">
                          {displayInvoiceNumber(invoice.invoiceNumber)}
                        </TableCell>
                        {/* Client Name - LEFT */}
                        <TableCell align="left">
                          <div>
                            <div className="font-medium">{invoice.recipientName || invoice.studentName}</div>
                            <div className="text-sm text-muted-foreground">{invoice.parentEmail}</div>
                          </div>
                        </TableCell>
                        {/* Description - LEFT */}
                        <TableCell align="left">
                          {invoice.eventName || invoice.items?.[0]?.description || "-"}
                        </TableCell>
                        {/* Amount - RIGHT */}
                        <TableCell align="right" className="font-medium">{getDisplayAmount(invoice).toLocaleString()}</TableCell>
                        {/* Approval - CENTER */}
                        <TableCell align="center">{getInvoiceStatusBadge(getApprovalStatus(invoice))}</TableCell>
                        {/* Email - CENTER */}
                        <TableCell
                          align="center"
                          className={getEmailStatus(invoice) === "sent" ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
                          onClick={getEmailStatus(invoice) === "sent" ? () => handleViewEmailDetails(invoice) : undefined}
                        >
                          {getStatusBadge(getEmailStatus(invoice))}
                        </TableCell>
                        {/* Payment - CENTER */}
                        <TableCell align="center">
                          {invoice.status === "cancelled" ? (
                            <Badge className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>
                          ) : (
                            getPaymentStatusBadge(getPaymentStatus(invoice))
                          )}
                        </TableCell>
                        {/* Issue Date - LEFT */}
                        <TableCell align="left">{getApprovalStatus(invoice) === "approved" && invoice.issueDate ? format(invoice.issueDate, "dd MMM yyyy") : "-"}</TableCell>
                        {/* Due Date - LEFT */}
                        <TableCell align="left">{format(invoice.dueDate, "dd MMM yyyy")}</TableCell>
                        {/* Actions - CENTER */}
                        <TableCell align="center">
                          <div className="flex items-center gap-1 justify-center">
                            {/* Always visible: View */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setIsExternalPreviewOpen(true)
                              }}
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {/* Always visible: Edit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canEditInvoice(invoice.status, getApprovalStatus(invoice))}
                              className={!canEditInvoice(invoice.status, getApprovalStatus(invoice)) ? "opacity-30 cursor-not-allowed" : ""}
                              onClick={() => {
                                if (!canEditInvoice(invoice.status, getApprovalStatus(invoice))) return
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
                            {/* Always visible: Mark Paid */}
                            {getApprovalStatus(invoice) === "approved" && getPaymentStatus(invoice) !== "paid" && invoice.status !== "cancelled" && (
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
                            {/* More menu: Download, Email History */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => downloadInvoice(invoice.id)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEmailHistory(invoice)}>
                                  <History className="mr-2 h-4 w-4" />
                                  Email History ({getInvoiceEmailLogs(invoice.id).length})
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination for External */}
              <PaginationBar
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={filteredInvoices.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
              />
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
                    src={schoolSettings.logoUrl || SchoolLogo}
                    alt={schoolSettings.schoolName}
                    style={{ height: '120px', margin: '0 auto 12px auto', display: 'block' }}
                  />
                  <h2 className="text-sm font-semibold tracking-wide text-gray-800">{schoolSettings.schoolName.toUpperCase()}</h2>
                  <p className="text-xs text-gray-500 mt-1">{schoolSettings.address}</p>
                  <p className="text-xs text-gray-500">{schoolSettings.phone}, {schoolSettings.email}, {schoolSettings.website}</p>
                </div>

                {/* Invoice Title */}
                <div className="text-center py-4">
                  <h1 className="text-7xl font-bold tracking-wider">INVOICE</h1>
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
                          <span className="text-sm font-medium text-gray-800">{getApprovalStatus(selectedInvoice) === "approved" && selectedInvoice.issueDate ? format(selectedInvoice.issueDate, "dd MMM yyyy") : "Pending Approval"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Due Date</span>
                          <span className="text-sm font-medium text-red-600">{selectedInvoice.dueDate ? format(selectedInvoice.dueDate, "dd MMM yyyy") : "-"}</span>
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
                              : (() => {
                                if (selectedInvoice.academicYear) return selectedInvoice.academicYear
                                if (selectedInvoice.issueDate) return getAcademicYear(selectedInvoice.issueDate)
                                // Extract year from term field e.g. "2025-2026 - Term 2 ..."
                                const termYearMatch = (selectedInvoice.term || "").match(/(\d{4}[-\/]\d{4})/)
                                if (termYearMatch) return termYearMatch[1]
                                if (selectedInvoice.dueDate) return getAcademicYear(selectedInvoice.dueDate)
                                return "-"
                              })()}
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
                      const isNonDiscountableInvoice = selectedInvoice.category === "eca" ||
                        selectedInvoice.category === "trip" ||
                        selectedInvoice.category === "exam" ||
                        selectedInvoice.category === "bus" ||
                        selectedInvoice.category === "external"

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

                      // 3. Student group discounts - use stored invoice.discounts (set at creation time)
                      // Never recalculate from current group state for existing invoices
                      if (!isNonDiscountableInvoice && selectedInvoice.invoiceType !== "external" && selectedInvoice.studentId !== "EXTERNAL") {
                        ; (selectedInvoice.discounts || [])
                          .filter(d => !/sibling|staff child|^scholarship$|early bird/i.test(d.name))
                          .forEach(d => {
                            discountLines.push({ name: d.name, amount: d.amount, percent: d.percentage })
                          })
                      }

                      // 4. Staff Child (50%)
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
                      const lateFeeAmount = 0
                      const lateFeePercent = 0

                      // Calculate total discounts
                      let totalDiscounts = discountLines.reduce((sum, d) => sum + d.amount, 0)

                      // Cap total discounts at subtotal to prevent negative amounts
                      if (totalDiscounts > subtotal) {
                        totalDiscounts = subtotal
                      }

                      // Final total (ID Charges removed)
                      const finalTotal = subtotal - totalDiscounts + registrationFeesTotal + lateFeeAmount

                      // Find specific registration fees
                      const applicationFee = savedRegistrationFees.find((f: any) => f.name.includes('Application Fee'))
                      const registrationFee = savedRegistrationFees.find((f: any) => f.name.includes('Registration Fee') && !f.name.includes('Application'))
                      const securityDeposit = savedRegistrationFees.find((f: any) => f.name.includes('Security Deposit'))

                      return (
                        <div className="border-t">
                          {/* 1. Other Discounts */}
                          {discountLines.map((discount, idx) => (
                            <div key={idx} className="flex justify-between items-center px-4 py-2 border-t">
                              <span className="text-sm text-gray-600">
                                {discount.name} {discount.percent ? `(${discount.percent}%)` : ''}
                              </span>
                              <span className="text-sm font-medium text-red-500">
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

                          {/* 4. Security Deposit - Orange */}
                          {securityDeposit && (
                            <div className="flex justify-between items-center px-4 py-2 border-t">
                              <span className="text-sm text-orange-600">{securityDeposit.name}</span>
                              <span className="text-sm font-medium text-orange-600">+{formatCurrency(securityDeposit.amount)}</span>
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
                    const canCancelInvoice = user?.role !== "approver" && user?.role !== "Approver" && user?.role !== "Approvalver"
                    const shouldShowCancelButton = canCancelInvoice && selectedInvoice.status !== "cancelled"

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
                          setCancelTargetData(modalData)
                          setCancelReasonInput("")
                          setIsCancelDialogOpen(true)
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
        <DialogContent className="max-w-4xl w-[95vw] md:w-[90vw] max-h-[90vh] overflow-y-auto p-3 md:p-6">
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
            {/* Step 1: Select Year Group */}
            <div className="space-y-3">
              <h3 className="font-medium">1. Select Year Group</h3>
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
                      disabled={!userCanEdit}
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
                          className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${index !== 0 ? 'border-t' : ''
                            } ${isSelected ? 'bg-primary/5' : ''}`}
                          onClick={() => isSelected ? handleItemRemove(item.id) : handleItemSelect(item)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{item.name}</span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${item.category === "Tuition" ? "border-blue-300 text-blue-700" :
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
                            <p className="font-medium">฿{item.amount.toLocaleString()}</p>
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

                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {/* Item - LEFT */}
                            <TableHead align="left">Item</TableHead>
                            {/* Amount - RIGHT */}
                            <TableHead align="right">Amount</TableHead>
                            {/* Actions - CENTER */}
                            <TableHead align="center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell align="left">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">{item.description}</p>
                                </div>
                              </TableCell>
                              <TableCell align="right" className="font-medium">
                                ฿{item.amount.toLocaleString()}
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleItemRemove(item.id)}
                                  disabled={!userCanEdit}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      <h4 className="font-medium text-center text-sm">Excel Upload</h4>
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
                    {/* Download Template Button */}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          downloadAsXlsx(
                            ['Student ID', 'Student Name', 'Year Group', 'Room'],
                            [
                              ['S001', 'John Doe', 'Year 1', 'Room A'],
                              ['S002', 'Jane Smith', 'Year 1', 'Room A'],
                              ['S003', 'Bob Johnson', 'Year 2', 'Room B'],
                            ],
                            'student_list_template'
                          )
                        }}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Template
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">Upload file with student information</p>
                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleCsvUpload}
                        className="max-w-xs mx-auto"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Expected format: Student ID, Student Name, Year Group, Room
                      </p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
            <Button onClick={handleAddItem} className="flex-1" disabled={!userCanEdit}>
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
        <DialogContent className="max-w-3xl w-[95vw] md:w-[90vw] max-h-[80vh] p-3 md:p-6">
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
                      className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${index !== 0 ? 'border-t' : ''
                        } ${isSelected ? 'bg-primary/5' : ''}`}
                      onClick={() => isSelected ? handleItemRemove(item.id) : handleItemSelect(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{item.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${item.category === "Tuition" ? "border-blue-300 text-blue-700" :
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
                        <p className="font-medium text-sm">฿{item.amount.toLocaleString()}</p>
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
        <DialogContent className="max-w-4xl w-[90vw] flex flex-col max-h-[90vh] p-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Import Invoices from Excel
              </DialogTitle>
              <DialogDescription>
                Upload an Excel file (.xlsx, .xls) to import multiple invoices at once
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {!importFile ? (
              <div className="space-y-4">
                {/* Excel Template */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Excel Template</p>
                    <p className="text-sm text-muted-foreground">Download the template with correct column headers</p>
                  </div>
                  <Button variant="outline" onClick={() => {
                    toast.success("Template downloaded")
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                {/* Upload File */}
                <div className="space-y-2">
                  <Label htmlFor="excel-upload">Upload File <span className="text-destructive">*</span></Label>
                  <Input
                    id="excel-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImportFile(file)
                        setImportPreview([
                          { studentId: "ST001", studentName: "John Smith", grade: "Year 10", amount: 450000 },
                          { studentId: "ST002", studentName: "Emma Johnson", grade: "Year 8", amount: 420000 },
                          { studentId: "ST003", studentName: "Michael Brown", grade: "Year 12", amount: 480000 },
                        ])
                      }
                    }}
                    className="cursor-pointer"
                  />
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
                    <div className="border rounded-lg overflow-x-auto">
                      <Table className="min-w-[500px]">
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead align="left" className="w-28">Student ID</TableHead>
                            <TableHead align="left">Student Name</TableHead>
                            <TableHead align="left" className="w-28">Year Group</TableHead>
                            <TableHead align="right" className="w-32">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.map((row, index) => (
                            <TableRow key={index}>
                              <TableCell align="left" className="font-mono whitespace-nowrap">{row.studentId}</TableCell>
                              <TableCell align="left" className="max-w-xs"><span className="block truncate" title={row.studentName}>{row.studentName}</span></TableCell>
                              <TableCell align="left" className="whitespace-nowrap">{row.grade}</TableCell>
                              <TableCell align="right" className="whitespace-nowrap">฿{row.amount.toLocaleString()}</TableCell>
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
        <DialogContent className="p-6 bg-white dark:bg-gray-950" style={{ width: "50vw", maxWidth: "600px" }}>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Select a payment method. Optionally upload payment proof (JPG/PNG).
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const _rawTotalCN = [...selectedCNIdsForPaid].reduce((sum, id) => {
              const cn = availableCNsForPaid.find(c => c.id === id)
              return sum + (cn ? (cn.remainingBalance ?? cn.amount) : 0)
            }, 0)
            const _invoiceAmt = markPaidInvoices.length > 1 
              ? markPaidInvoices.reduce((sum, inv) => sum + (inv.finalAmount || 0), 0)
              : (markPaidInvoice?.finalAmount ?? 0)
            const _totalCN = Math.min(_rawTotalCN, _invoiceAmt)
            const _netAfterCN = Math.max(0, _invoiceAmt - _totalCN)
            const _netPayable = _netAfterCN  // used for payment proof visibility
            const _fullyByCN = selectedCNIdsForPaid.size > 0 && _netAfterCN === 0
            const _onlineMethods = ["Thai QR", "Credit Card"]
            const _isOnline = _onlineMethods.includes(paymentMethod)
            const _enteredAmount = _isOnline ? 0 : (parseFloat(paymentAmountInput) || 0)
            const _isPartialPay = !_fullyByCN && !_isOnline && _enteredAmount > 0 && _enteredAmount < _netAfterCN
            const _edcAmt = paymentMethod === "EDC" ? (parseFloat(edcAmount) || 0) : 0
            const _edcCoversInvoice = paymentMethod === "EDC" && _edcAmt >= _invoiceAmt
            const _ccFeePct = paymentMethod === "EDC" ? (parseFloat(ccFeePercent) || 0) : 0
            // Fee calculated from net payable after CN (non-circular)
            const _ccFee = parseFloat((_netAfterCN * _ccFeePct / 100).toFixed(2))
            const _totalToPay = _netAfterCN + _ccFee
            const _overpay = paymentMethod === "EDC" ? Math.max(0, _edcAmt - _totalToPay) : 0
            // Final balance due after CN + EDC + entered amount
            const _balanceDue = paymentMethod === "EDC"
              ? Math.max(0, _totalToPay - _edcAmt)
              : _enteredAmount > 0 ? Math.max(0, _netAfterCN - _enteredAmount) : _netAfterCN

            return (
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2 theme-scrollbar">
            {/* Apply Credit Notes */}
            {availableCNsForPaid.length > 0 && (
              <div className={`border rounded-lg overflow-hidden ${_edcCoversInvoice ? "border-gray-200 opacity-60" : "border-green-200"}`}>
                <div className={`px-4 py-2.5 border-b ${_edcCoversInvoice ? "bg-gray-50 border-gray-200" : "bg-green-50 border-green-200"}`}>
                  <p className={`text-sm font-medium ${_edcCoversInvoice ? "text-gray-500" : "text-green-800"}`}>
                    Apply Credit Notes <span className="font-normal">(optional)</span>
                    {_edcCoversInvoice && <span className="ml-2 text-xs text-gray-400">— Not required, EDC amount covers the full invoice</span>}
                  </p>
                </div>
                <div 
                  className="divide-y divide-green-100 overflow-y-auto theme-scrollbar"
                  style={{ maxHeight: '230px' }}
                >
                  {availableCNsForPaid.map(cn => (
                    <label
                      key={cn.id}
                      className={`flex items-center justify-between gap-3 px-4 py-2 transition-colors ${_edcCoversInvoice ? "cursor-not-allowed" : "cursor-pointer hover:bg-green-50"}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={selectedCNIdsForPaid.has(cn.id)}
                          disabled={_edcCoversInvoice || (_fullyByCN && !selectedCNIdsForPaid.has(cn.id))}
                          onCheckedChange={() => {
                            if (_edcCoversInvoice) return
                            if (_fullyByCN && !selectedCNIdsForPaid.has(cn.id)) return
                            setSelectedCNIdsForPaid(prev => {
                              const next = new Set(prev)
                              next.has(cn.id) ? next.delete(cn.id) : next.add(cn.id)
                              return next
                            })
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium font-mono text-gray-800">{cn.creditNoteNumber}</p>
                          <p className="text-xs text-muted-foreground truncate">{cn.reason}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-green-700 shrink-0">
                        ฿{(cn.remainingBalance ?? cn.amount).toLocaleString()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Fully covered banner */}
            {_fullyByCN && (
              <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-sm text-green-800 font-medium">Fully covered by Credit Note — no additional payment required.</p>
              </div>
            )}

            {/* Payment Method — hidden when fully covered by CN */}
            {!_fullyByCN && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SOURCES.map(source => (
                      <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Bank Account + GL (offline) */}
            {!_fullyByCN && paymentMethod && !_onlineMethods.includes(paymentMethod) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bank Account / GL</label>
                <Select
                  onValueChange={(accountId) => {
                    const account = bankAccounts.find(a => a.id === accountId)
                    if (account) {
                      setEdcBank(account.bankName)
                      setEdcAccountNumber(account.accountNumber)
                      setSelectedGlAccount(account.glAccount || account.accountNumber || "")
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts
                      .filter(acc => acc.isActive && !["Thai QR", "Credit Card"].includes(acc.paymentSource))
                      .map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.bankName} - {maskAccountNumber(acc.accountNumber)} (GL: {acc.glAccount || "-"})
                        </SelectItem>
                      ))
                    }
                    {bankAccounts.filter(acc => acc.isActive && !["Thai QR", "Credit Card"].includes(acc.paymentSource)).length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground italic">
                        No bank accounts configured. Go to Bank Settings to add.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* EDC Amount & CC Fee inputs (inline, above summary) */}
            {!_fullyByCN && paymentMethod === "EDC" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">EDC Amount (฿) <span className="text-red-500">*</span></label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={edcAmount}
                    onChange={e => setEdcAmount(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Transaction Fee (%) <span className="text-red-500">*</span></label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 2"
                    value={ccFeePercent}
                    onChange={e => setCcFeePercent(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            )}

            {/* Unified Payment Summary */}
            {(selectedCNIdsForPaid.size > 0 || (paymentMethod && paymentMethod !== "EDC") || (paymentMethod === "EDC" && _edcAmt > 0)) && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{markPaidInvoices.length > 1 ? `Total Amount (${markPaidInvoices.length} Invoices)` : "Invoice Amount"}</span>
                  <span>฿{_invoiceAmt.toLocaleString()}</span>
                </div>
                {selectedCNIdsForPaid.size > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Credit Note Applied</span>
                    <span>−฿{_totalCN.toLocaleString()}</span>
                  </div>
                )}
                {paymentMethod && !["EDC", "Thai QR", "Credit Card"].includes(paymentMethod) && _enteredAmount > 0 && (
                  <div className="flex justify-between text-blue-700">
                    <span>Payment Amount</span>
                    <span>−฿{_enteredAmount.toLocaleString()}</span>
                  </div>
                )}
                {paymentMethod === "EDC" && _ccFeePct > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Transaction Fee ({_ccFeePct}%)</span>
                    <span>+฿{_ccFee.toLocaleString()}</span>
                  </div>
                )}
                {paymentMethod === "EDC" && (
                  <div className="flex justify-between text-muted-foreground pt-1 border-t border-gray-200">
                    <span>Total to Pay</span>
                    <span>฿{_totalToPay.toLocaleString()}</span>
                  </div>
                )}
                {paymentMethod === "EDC" && _edcAmt > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>EDC Amount (actual)</span>
                      <span>฿{_edcAmt.toLocaleString()}</span>
                    </div>
                    {_overpay > 0 && (
                      <div className="flex justify-between text-amber-700 font-medium">
                        <span>Overpayment → Credit Note</span>
                        <span>฿{_overpay.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
                  {(paymentMethod === "EDC" && _edcAmt > 0 && _balanceDue === 0) || (_enteredAmount > 0 && _balanceDue === 0) ? (
                    <>
                      <span className="text-green-700">Paid in Full</span>
                      <span className="text-green-700">฿0</span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-900">Balance Due</span>
                      <span className="text-gray-900">฿{_balanceDue.toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Payment Amount */}
            {!_fullyByCN && paymentMethod && !["EDC", "Thai QR", "Credit Card"].includes(paymentMethod) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Amount (฿)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Full amount: ฿${_netAfterCN.toLocaleString()}`}
                  value={paymentAmountInput}
                  onChange={e => setPaymentAmountInput(e.target.value)}
                  className="h-9"
                />
                {_isPartialPay && (
                  <p className="text-xs text-amber-600">Partial payment — remaining ฿{(_netAfterCN - _enteredAmount).toLocaleString()} will be outstanding.</p>
                )}
              </div>
            )}

            {/* Payment Proof — hide when fully covered by credit notes */}
            {_netPayable > 0 && <div className="space-y-2">
              <label className="text-sm font-medium">Payment Proof (JPG/PNG) <span className="text-muted-foreground font-normal">- optional</span></label>
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
            </div>}
          </div>
            )
          })()}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMarkPaidOpen(false)
                setMarkPaidInvoice(null)
                setPaymentMethod("")
                setPaymentFiles([])
                setAvailableCNsForPaid([])
                setSelectedCNIdsForPaid(new Set())
                setEdcAmount("")
                setCcFeePercent("")
                setPaymentAmountInput("")
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
        <DialogContent className="max-w-5xl w-[95vw] md:w-[90vw] max-h-[92vh] overflow-hidden p-0 flex flex-col">
          {selectedInvoice && (
            <>
              {/* Header Section */}
              <div className="flex-shrink-0 bg-white border-b px-8 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Edit Invoice</h2>
                    <p className="text-sm text-gray-500 mt-1">{displayInvoiceNumber(selectedInvoice.invoiceNumber, getApprovalStatus(selectedInvoice))}</p>
                  </div>
                  <Badge variant={selectedInvoice.status === 'draft' ? 'secondary' : 'default'} className="text-sm px-4 py-1.5">
                    {selectedInvoice.status === 'draft' ? 'Draft' : 'Pending Approval'}
                  </Badge>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-gray-50">
                {/* 2-Column Layout: Student/Parent Info & Invoice Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500 mb-1">Invoice Date</span>
                      <span className="text-sm font-medium text-gray-900">{getApprovalStatus(selectedInvoice) === "approved" && selectedInvoice.issueDate ? format(selectedInvoice.issueDate, "dd MMM yyyy") : "-"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500 mb-1">Due Date</span>
                      <Input
                        type="date"
                        value={editingDueDate ? format(editingDueDate, "yyyy-MM-dd") : (selectedInvoice.dueDate ? format(selectedInvoice.dueDate, "yyyy-MM-dd") : "")}
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

                  // Get student group discounts - use stored invoice.discounts (set at creation time)
                  // Never recalculate from current group state for existing invoices
                  ; (selectedInvoice.discounts || [])
                    .filter(d => !/sibling|staff child|^scholarship$|early bird/i.test(d.name))
                    .forEach(d => {
                      discounts.push({
                        name: d.name,
                        value: d.percentage ? `${d.percentage}%` : `฿${d.amount.toLocaleString()}`,
                        color: "bg-purple-100 text-purple-800"
                      })
                    })

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
                      <span className="text-2xl font-bold text-gray-900">{formatCurrency(selectedInvoice.finalAmount)}</span>
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
                  disabled={!userCanEdit}
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
                    disabled={!userCanEdit}
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
                <span className="font-medium text-right">{displayInvoiceNumber(selectedInvoiceForApproval.invoiceNumber, getApprovalStatus(selectedInvoiceForApproval))}</span>
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
                <span className="font-semibold">฿{selectedInvoiceForApproval.finalAmount.toLocaleString()}</span>
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

      {/* Bulk Change Due Date Dialog */}
      <Dialog open={isBulkChangeDueDateOpen} onOpenChange={setIsBulkChangeDueDateOpen}>
        <DialogContent style={{ maxWidth: "420px" }} className="p-6">
          <DialogHeader className="mb-3">
            <DialogTitle>Change Due Date for {selectedInvoiceIds.size} Invoice{selectedInvoiceIds.size > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Select a new due date for all selected invoices. This action cannot be undone. Only invoices that are not paid or cancelled will be updated.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !bulkNewDueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bulkNewDueDate ? format(bulkNewDueDate, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={bulkNewDueDate}
                    onSelect={setBulkNewDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {
              setIsBulkChangeDueDateOpen(false)
              setBulkNewDueDate(undefined)
            }}>
              Cancel
            </Button>
            <Button onClick={handleBulkChangeDueDate} disabled={!bulkNewDueDate}>
              Update Due Date
            </Button>
          </DialogFooter>
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
                <span className="font-medium">{displayInvoiceNumber(selectedInvoice.invoiceNumber, getApprovalStatus(selectedInvoice))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Student</span>
                <span className="font-medium">{selectedInvoice.studentName}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-semibold">฿{selectedInvoice.finalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsConfirmSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Invoice Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent style={{ maxWidth: "560px" }} className="bg-white p-8">
          <DialogHeader className="mb-4">
            <DialogTitle>Cancel Invoice</DialogTitle>
            <DialogDescription>Please specify the reason for cancellation</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              placeholder="Enter reason..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && cancelReasonInput.trim()) {
                  handleCancelInvoice(cancelTargetData, cancelReasonInput.trim())
                  closeInvoiceModal()
                  setIsCancelDialogOpen(false)
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReasonInput.trim()}
              onClick={() => {
                if (cancelReasonInput.trim()) {
                  handleCancelInvoice(cancelTargetData, cancelReasonInput.trim())
                  closeInvoiceModal()
                  setIsCancelDialogOpen(false)
                }
              }}
            >
              Confirm Cancel
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
              <h1 className="font-black text-center my-6" style={{ fontSize: '72px' }}>INVOICE</h1>

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
                        <td className="py-1">{getApprovalStatus(selectedInvoice) === "approved" && selectedInvoice.issueDate ? format(selectedInvoice.issueDate, 'd MMMM yyyy') : 'Pending Approval'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Due date</td>
                        <td className="py-1">{selectedInvoice.dueDate ? format(selectedInvoice.dueDate, 'd MMMM yyyy') : '-'}</td>
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
                    <th className="py-2 px-4 text-center font-bold" style={{ width: '100px' }}>Amount<br />(THB)</th>
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
              <div className="mb-6" style={{ fontSize: '11px', lineHeight: '1.5' }}>
                <p className="font-bold mb-2">Payment methods</p>
                <div className="space-y-2">
                  <div className="flex">
                    <span className="mr-2">-</span>
                    <div>
                      <span className="font-bold">Cheque:</span> Cheques must be made payable to {schoolSettings.schoolName} and marked A/C Payee Only. Please deliver cheques to the Finance & Accounting Department.
                    </div>
                  </div>

                  <div className="flex">
                    <span className="mr-2">-</span>
                    <div className="flex-1">
                      <span className="font-bold">Bank transfer:</span> Further bank details are provided below. Kindly email your child's name, ID number, and invoice number to {schoolSettings.email} with proof of payment attached upon completion of the transfer process. Please ensure that your payment covers all bank charges.
                    </div>
                  </div>

                  <div className="mt-2 flex justify-center">
                    <table>
                      <tbody>
                        <tr>
                          <td className="py-0.5 align-top text-left" style={{ width: '200px', paddingRight: '40px' }}>Account name</td>
                          <td className="py-0.5 text-left">{schoolSettings.bankAccountName}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 align-top text-left" style={{ width: '200px', paddingRight: '40px' }}>Account number</td>
                          <td className="py-0.5 text-left">{schoolSettings.bankAccountNumber}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 align-top text-left" style={{ width: '200px', paddingRight: '40px' }}>Bank name</td>
                          <td className="py-0.5 text-left">{schoolSettings.bankName}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 align-top text-left" style={{ width: '200px', paddingRight: '40px' }}>Branch</td>
                          <td className="py-0.5 text-left">{schoolSettings.bankBranch}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 align-top text-left" style={{ width: '200px', paddingRight: '40px' }}>Swift code</td>
                          <td className="py-0.5 text-left">{schoolSettings.swiftCode}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 align-top text-left" style={{ width: '200px', paddingRight: '40px' }}>Bank address</td>
                          <td className="py-0.5 text-left">{schoolSettings.address}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex mt-2">
                    <span className="mr-2">-</span>
                    <div className="flex-1">
                      <span className="font-bold">Bill Payment via Mobile Banking, Internet Banking, ATM or Bank Counter:</span> Please use the QR code provided below to scan for payment. Kindly note that bank charges will apply to payments made via ATM or at the bank counter.
                    </div>
                  </div>

                  <div className="mt-2" style={{ marginLeft: '178px' }}>
                    <table>
                      <tbody>
                        <tr>
                          <td className="py-0.5 align-top text-left" style={{ width: '200px', paddingRight: '40px' }}>Biller ID no.</td>
                          <td className="py-0.5 text-left">099-4-00259063-3</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 align-top text-left" style={{ width: '200px', paddingRight: '40px' }}>Reference no. (Ref 1)</td>
                          <td className="py-0.5 text-left">700002</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 align-top text-left" style={{ width: '200px', paddingRight: '40px' }}>Reference no. (Ref 2)</td>
                          <td className="py-0.5 text-left">
                            {(selectedInvoice.status === 'sent' || getApprovalStatus(selectedInvoice) === 'approved')
                              ? (displayInvoiceNumber(selectedInvoice.invoiceNumber) || "-")
                              : "-"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between mt-8 px-8">
                <div className="text-center">
                  <p className="mb-4" style={{ fontSize: '10px' }}>{selectedInvoice?.createdBy || user?.name || ""}</p>
                  <div className="border-t border-black w-40 mx-auto"></div>
                  <p className="mt-1" style={{ fontSize: '10px' }}>Prepared by</p>
                </div>
                <div className="text-center">
                  <p className="mb-4" style={{ fontSize: '10px' }}>{selectedInvoice?.approvedBy || ""}</p>
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
              Email Status Details
            </DialogTitle>
          </DialogHeader>

          {selectedInvoiceForEmail && (() => {
            // Get display date for email sent - ONLY use emailSentAt (actual send time)
            const emailStatus = getEmailStatus(selectedInvoiceForEmail)
            const displayEmailDate = selectedInvoiceForEmail.emailSentAt


            return (
              <div className="px-8 pt-6 pb-6">
                {/* Main Information - Flat Style */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-6 pb-4 border-b">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Invoice Number</p>
                    <p className="text-base font-bold text-foreground">{displayInvoiceNumber(selectedInvoiceForEmail.invoiceNumber, getApprovalStatus(selectedInvoiceForEmail))}</p>
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

      {/* Email History Dialog */}
      <Dialog open={isEmailHistoryOpen} onOpenChange={setIsEmailHistoryOpen}>
        <DialogContent className="p-6" style={{ width: "50vw", maxWidth: "600px" }}>
          <DialogHeader>
            <DialogTitle>Email History</DialogTitle>
            <DialogDescription>
              {selectedInvoiceForEmailHistory && (
                <>Email sending history for invoice {selectedInvoiceForEmailHistory.invoiceNumber}</>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoiceForEmailHistory && (
            <div className="py-4">
              {getInvoiceEmailLogs(selectedInvoiceForEmailHistory.id).length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No emails have been sent for this invoice yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {getInvoiceEmailLogs(selectedInvoiceForEmailHistory.id)
                    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                    .map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-xs">
                              {log.status === "sent" ? "Sent" : "Failed"}
                            </Badge>
                            <span className="text-sm font-medium">{log.recipientEmail}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Recipient: {log.recipientName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Sent by: {log.sentBy}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {format(new Date(log.sentAt), "dd MMM yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.sentAt), "HH:mm:ss")}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEmailHistoryOpen(false)
                setSelectedInvoiceForEmailHistory(null)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmDialog.isOpen}
        onOpenChange={deleteConfirmDialog.setIsOpen}
        onConfirm={deleteConfirmDialog.handleConfirm}
        titleKey="Delete Invoice"
        descriptionKey={`Are you sure you want to delete invoice ${selectedInvoice?.invoiceNumber}? This action cannot be undone.`}
        confirmTextKey="common.delete"
        variant="destructive"
      />


      {/* Import Interface File — Upload Dialog */}
      <Dialog open={isImportInterfaceUploadOpen} onOpenChange={setIsImportInterfaceUploadOpen}>
        <DialogContent className="p-6 bg-white" style={{ maxWidth: "480px" }}>
          <DialogHeader>
            <DialogTitle>Import Interface File</DialogTitle>
            <DialogDescription>
              Upload an Excel file in the interface format to create invoices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Template download */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium">Excel Template</p>
                <p className="text-xs text-muted-foreground">Download the template with correct column headers</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadInterfaceTemplate} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Template
              </Button>
            </div>
            {/* File upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Upload Excel File</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                onChange={(e) => {
                  setIsImportInterfaceUploadOpen(false)
                  handleImportInterfaceFile(e)
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportInterfaceUploadOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Interface File Dialog */}
      {/* Duplicate import confirmation dialog */}
      <AlertDialog open={showImportDuplicateConfirm} onOpenChange={setShowImportDuplicateConfirm}>
        <AlertDialogContent style={{ maxWidth: "420px" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>พบ Invoice ซ้ำ</AlertDialogTitle>
            <AlertDialogDescription>
              มี Document No. บางรายการที่มีอยู่ในระบบแล้ว ต้องการสร้าง Invoice ซ้ำหรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowImportDuplicateConfirm(false); performImportInterface() }}>
              สร้างต่อ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isImportInterfaceOpen} onOpenChange={setIsImportInterfaceOpen}>
        <DialogContent className="p-6 bg-white" style={{ width: "95vw", maxWidth: "1400px" }}>
          <DialogHeader>
            <DialogTitle>Import Interface File</DialogTitle>
            <DialogDescription>
              Preview invoices to be imported. Rows are grouped by DocumentNo into invoices.
            </DialogDescription>
          </DialogHeader>

          {importInterfaceError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {importInterfaceError}
            </div>
          ) : importInterfaceRows.length > 0 ? (
            (() => {
              // Load catalog for preview validation (FinanceCode || catalog lookup by Description)
              const previewKeyMap: Record<string, string> = {
                afterschool: "afterschoolItems", eca: "ecaItems", event: "eventItems",
                summer: "summerItems", external: "externalItems", trip: "tripItems",
                exam: "examItems", bus: "busItems", tuition: "invoiceItems"
              }
              let previewCatalog: any[] = []
              try { previewCatalog = JSON.parse(localStorage.getItem(previewKeyMap[category || "tuition"] || "invoiceItems") || "[]") } catch { }
              const resolvePreviewItemCode = (row: Record<string, string>) => {
                if (row["FinanceCode"]) return row["FinanceCode"]
                const desc = (row["Description"] || "").trim().toLowerCase()
                return desc ? previewCatalog.find((it: any) =>
                  (it.name || "").toLowerCase().trim() === desc ||
                  (it.description || "").toLowerCase().trim() === desc
                )?.itemCode || "" : ""
              }
              return (
                <div className="space-y-3">
                  {(() => {
                    const validDocNos = new Set(importInterfaceRows.filter(r => {
                      const s = students.find(st => st.studentId === r["PupilID"] || st.id === r["PupilID"])
                      return !!s && !!resolvePreviewItemCode(r)
                    }).map(r => r["DocumentNo"]))
                    const totalDocNos = new Set(importInterfaceRows.map(r => r["DocumentNo"]))
                    const skippedCount = totalDocNos.size - validDocNos.size
                    const duplicateDocNos = [...new Set(importInterfaceRows.map(r => r["DocumentNo"]))].filter(docNo =>
                      docNo && invoices.some(inv => inv.invoiceNumber === docNo)
                    )
                    return (
                      <>
                        <p className="text-sm text-muted-foreground">
                          พบข้อมูล <strong>{importInterfaceRows.length}</strong> แถว จะสร้าง <strong>{validDocNos.size}</strong> invoice
                          {skippedCount > 0 && (
                            <span className="text-red-600 ml-2">(ข้ามไป {skippedCount} รายการ — ข้อมูลไม่ครบ)</span>
                          )}
                        </p>
                        {duplicateDocNos.length > 0 && (
                          <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                            <span className="mt-0.5 text-base">⚠️</span>
                            <div>
                              <p className="font-medium">พบ Invoice ซ้ำ {duplicateDocNos.length} รายการ</p>
                              <p className="text-xs mt-0.5 text-yellow-700">Document No. เหล่านี้มีอยู่ในระบบแล้ว: <span className="font-mono">{duplicateDocNos.join(", ")}</span></p>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                  <div className="border rounded-lg overflow-auto max-h-96">
                    <Table style={{ minWidth: "1050px" }}>
                      <TableHeader>
                        <TableRow>
                          <TableHead align="left" className="min-w-[110px]">Student ID</TableHead>
                          <TableHead align="left" className="min-w-[150px]">Student Name</TableHead>
                          <TableHead align="left" className="min-w-[110px]">Item Code</TableHead>
                          <TableHead align="left" className="min-w-[80px]">Year Group</TableHead>
                          <TableHead align="left" className="min-w-[100px]">School Term</TableHead>
                          <TableHead align="left" className="min-w-[90px]">Invoice Date</TableHead>
                          <TableHead align="left" className="min-w-[90px]">Due Date</TableHead>
                          <TableHead align="left" className="min-w-[200px]">Description</TableHead>
                          <TableHead align="right" className="min-w-[100px]">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importInterfaceRows.map((row, idx) => {
                          const pupilId = row["PupilID"] || ""
                          const student = students.find(s => s.studentId === pupilId || s.id === pupilId)
                          const itemCode = resolvePreviewItemCode(row)
                          const rowValid = !!student && !!itemCode
                          const csvAmt = parseFloat(String(row["Amount"] ?? "").replace(/,/g, "")) || 0
                          const desc = row["Description"] || ""
                          const isTuition = /tuition/i.test(desc)
                          const tuitionPrice = isTuition
                            ? getTuitionPriceFromYearData(desc, row["YearGroup"] || "", row["SchoolTerm"] || "", row["SchoolYear"] || "")
                            : null
                          const displayAmt = tuitionPrice ?? csvAmt
                          return (
                            <TableRow key={idx} className={!rowValid ? "bg-red-50" : ""}>
                              <TableCell align="left">{row["PupilID"]}</TableCell>
                              <TableCell align="left" className={!student ? "text-red-600 font-medium" : ""}>
                                {student ? `${student.firstName} ${student.lastName}` : "ไม่พบนักเรียน"}
                              </TableCell>
                              <TableCell align="left" className={!itemCode ? "text-red-600 font-medium" : ""}>
                                {itemCode || "ไม่มี Item Code"}
                              </TableCell>
                              <TableCell align="left">{row["YearGroup"]}</TableCell>
                              <TableCell align="left" className="text-xs">{row["SchoolTerm"]}</TableCell>
                              <TableCell align="left">{row["InvoiceDate"]}</TableCell>
                              <TableCell align="left">{row["DueDate"]}</TableCell>
                              <TableCell align="left">{row["Description"]}</TableCell>
                              <TableCell align="right">{displayAmt.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
            })()
          ) : (
            <p className="text-sm text-muted-foreground">ไม่พบข้อมูล</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsImportInterfaceOpen(false); setImportInterfaceRows([]) }}>
              Cancel
            </Button>
            {!importInterfaceError && importInterfaceRows.length > 0 && (() => {
              const btnKeyMap: Record<string, string> = {
                afterschool: "afterschoolItems", eca: "ecaItems", event: "eventItems",
                summer: "summerItems", external: "externalItems", trip: "tripItems",
                exam: "examItems", bus: "busItems", tuition: "invoiceItems"
              }
              let btnCatalog: any[] = []
              try { btnCatalog = JSON.parse(localStorage.getItem(btnKeyMap[category || "tuition"] || "invoiceItems") || "[]") } catch { }
              const validCount = new Set(importInterfaceRows.filter(r => {
                const s = students.find(st => st.studentId === r["PupilID"] || st.id === r["PupilID"])
                const ic = r["FinanceCode"] || btnCatalog.find((it: any) => {
                  const desc = (r["Description"] || "").trim().toLowerCase()
                  return desc && ((it.name || "").toLowerCase().trim() === desc || (it.description || "").toLowerCase().trim() === desc)
                })?.itemCode
                return !!s && !!ic
              }).map(r => r["DocumentNo"])).size
              const hasDuplicates = [...new Set(importInterfaceRows.map(r => r["DocumentNo"]))].some(docNo =>
                docNo && invoices.some(inv => inv.invoiceNumber === docNo)
              )
              return (
                <Button
                  onClick={() => hasDuplicates ? setShowImportDuplicateConfirm(true) : performImportInterface()}
                  disabled={validCount === 0}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import {validCount} Invoice{validCount !== 1 ? "s" : ""}
                </Button>
              )
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Email Template Dialog */}
      <EditTemplateDialog
        open={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        template={templateToEdit}
        templateType="invoice"
        onSave={(form) => {
          const allTpl = migrateTemplates()
          const now = new Date().toISOString()
          const createdBy = user?.username || user?.name || "Staff"
          let updated: EmailTemplate[]
          if (templateToEdit) {
            updated = allTpl.map(t =>
              t.id === templateToEdit.id ? { ...t, ...form, updatedAt: now } : t
            )
          } else {
            const isFirst = allTpl.filter(t => t.type === "invoice").length === 0
            updated = [...allTpl, {
              id: `tpl-${Date.now()}`,
              ...form,
              type: "invoice" as const,
              language: "en" as const,
              isDefault: isFirst,
              status: "active" as const,
              createdAt: now,
              updatedAt: now,
              createdBy,
              version: 1,
            }]
          }
          saveTemplates(updated)
          setIsTemplateModalOpen(false)
          toast.success(templateToEdit ? "Template updated" : "Template created")
        }}
      />
    </div>
  )
}
