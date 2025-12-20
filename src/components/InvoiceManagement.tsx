import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { useDiscountOptions } from "@/contexts/DiscountOptionsContext"
import { useStudents } from "@/contexts/StudentContext"
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
import { Search, Filter, Eye, Plus, Download, Mail, CalendarIcon, DollarSign, FileText, AlertCircle, CheckCircle, Clock, RefreshCw, Trash2, Edit, X, Upload, Users, User, FileSpreadsheet, RotateCcw, ArrowUpDown } from "lucide-react"
import { ViewModal } from "./ViewModal"
import { format } from "date-fns"
import { toast } from "sonner@2.0.3"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { SCHOOL_INFO, BANK_DETAILS, BILL_PAYMENT, INVOICE_NOTES, numberToWords, formatCurrency, getAcademicYear } from "@/lib/invoiceUtils"

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
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  issueDate: Date
  dueDate: Date
  paidDate?: Date
  issuedBy: string
  items: InvoiceItem[]
  notes: string
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
      return savedInvoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        studentName: inv.studentName,
        studentId: inv.studentId,
        studentGrade: inv.studentGrade,
        parentName: inv.parentName || "Parent",
        parentEmail: inv.parentEmail || "",
        totalAmount: inv.subtotal ?? 0,
        discountAmount: inv.totalDiscount ?? 0,
        finalAmount: inv.netAmount ?? inv.subtotal ?? 0,
        status: (inv.status === "pending" ? "draft" : inv.status) as "draft" | "sent" | "paid" | "overdue" | "cancelled",
        issueDate: new Date(inv.issueDate),
        dueDate: new Date(inv.dueDate),
        issuedBy: "System",
        items: (inv.items || []).map((item: any, idx: number) => ({
          id: String(idx + 1),
          description: item.name || item.description,
          amount: item.amount,
          discountPercent: 0,
          discountedAmount: item.amount
        })),
        notes: ""
      }))
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
  // Discount Options context for late payment calculations
  const { getLatePaymentSettings, getRegistrationFees, getSiblingDiscountPercentage } = useDiscountOptions()
  const { academicYears = [] } = useAcademicYears()
  const { students, getSiblingDiscount } = useStudents()

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

  const applyFilters = () => {
    let filtered = invoices

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

    if (gradeFilter !== "all") {
      filtered = filtered.filter(inv => inv.studentGrade === gradeFilter)
    }

    if (dateFrom) {
      filtered = filtered.filter(inv => inv.issueDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(inv => inv.issueDate <= dateTo)
    }

    setFilteredInvoices(filtered)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" />Draft</Badge>
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800"><Mail className="w-3 h-3 mr-1" />Sent</Badge>
      case "paid":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800"><X className="w-3 h-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const summaryStats = {
    total: invoices.length,
    draft: invoices.filter(inv => inv.status === "draft").length,
    sent: invoices.filter(inv => inv.status === "sent").length,
    paid: invoices.filter(inv => inv.status === "paid").length,
    overdue: invoices.filter(inv => inv.status === "overdue").length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.finalAmount, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Invoice Management</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage student invoices with templates and discounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => { reloadInvoices(); toast.success("Invoice list refreshed") }}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="w-4 h-4" />
            Import Excel
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button onClick={() => onNavigateToSubPage('invoice-creation')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{summaryStats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.paid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.overdue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
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
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">
                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>
                  </SelectItem>
                  <SelectItem value="sent">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent</Badge>
                  </SelectItem>
                  <SelectItem value="paid">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Cancelled</Badge>
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
        <p className="text-sm text-muted-foreground">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </p>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
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
                        onClick={() => openEditModal(invoice)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {invoice.status === "draft" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openViewModal(invoice)}
                          title="Edit Draft"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {selectedInvoice && (
            <div className="bg-white">
              {/* School Header */}
              <div className="text-center py-4 px-6 border-b text-xs text-gray-600">
                <p>{SCHOOL_INFO.address}</p>
                <p>{SCHOOL_INFO.phone}, {SCHOOL_INFO.email}, {SCHOOL_INFO.website}</p>
              </div>

              {/* Invoice Title */}
              <div className="text-center py-6">
                <h1 className="text-3xl font-bold tracking-wide">INVOICE</h1>
                <div className="mt-2">{getStatusBadge(selectedInvoice.status)}</div>
              </div>

              {/* Student & Invoice Info */}
              <div className="px-6 pb-6">
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2">
                    {/* Left - Student Info */}
                    <div className="p-4 space-y-2 border-r">
                      <div className="grid grid-cols-[120px_1fr] gap-1">
                        <span className="text-sm text-gray-600">Student ID no.</span>
                        <span className="text-sm font-medium">{selectedInvoice.studentId}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-1">
                        <span className="text-sm text-gray-600">Student name</span>
                        <span className="text-sm font-medium">{selectedInvoice.studentName}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-1">
                        <span className="text-sm text-gray-600">Year group</span>
                        <span className="text-sm font-medium">{selectedInvoice.studentGrade}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-1">
                        <span className="text-sm text-gray-600">Contact name</span>
                        <span className="text-sm font-medium">{selectedInvoice.parentName}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-1">
                        <span className="text-sm text-gray-600">Address</span>
                        <span className="text-sm font-medium">-</span>
                      </div>
                    </div>
                    {/* Right - Invoice Info */}
                    <div className="p-4 space-y-2">
                      <div className="grid grid-cols-[120px_1fr] gap-1">
                        <span className="text-sm text-gray-600">Invoice no.</span>
                        <span className="text-sm font-medium">{selectedInvoice.invoiceNumber.replace('INV-', '')}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-1">
                        <span className="text-sm text-gray-600">Invoice date</span>
                        <span className="text-sm font-medium">{format(selectedInvoice.issueDate, "dd MMMM yyyy")}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-1">
                        <span className="text-sm text-gray-600">Due date</span>
                        <span className="text-sm font-medium">{format(selectedInvoice.dueDate, "dd MMMM yyyy")}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-1">
                        <span className="text-sm text-gray-600">School year</span>
                        <span className="text-sm font-medium">{getAcademicYear(selectedInvoice.issueDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discounts Section */}
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

                  if (discounts.length === 0) return null

                  return (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
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
              <div className="px-6 pb-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12 text-center">No.</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right w-36">Amount (THB)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-center align-top">{index + 1}</TableCell>
                          <TableCell className="align-top" style={{ wordBreak: 'break-word' }}>
                            {item.description}
                            {item.discountPercent > 0 && (
                              <span className="text-gray-500 text-sm ml-2">(-{item.discountPercent}%)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap align-top">
                            {formatCurrency(item.discountedAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Empty rows for spacing */}
                      {selectedInvoice.items.length < 5 && (
                        <TableRow>
                          <TableCell colSpan={3} className="h-8"></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {/* Amount in Words + Total */}
                  <div className="border-t p-3">
                    <div className="text-xs text-gray-600 mb-2">{numberToWords(selectedInvoice.finalAmount)}</div>
                    <div className="flex justify-between items-center font-bold">
                      <span>TOTAL</span>
                      <span>{formatCurrency(selectedInvoice.finalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="px-6 pb-4 text-xs text-gray-600 space-y-1">
                <p>{INVOICE_NOTES.latePayment}</p>
                <p>{INVOICE_NOTES.refundCondition}</p>
              </div>

              {/* Payment Methods */}
              <div className="px-6 pb-6">
                <h3 className="font-semibold mb-3">Payment methods</h3>
                <div className="space-y-4 text-sm">
                  {/* Cheque */}
                  <p className="text-gray-700">
                    <span className="font-medium">- Cheque:</span> {INVOICE_NOTES.chequeInstruction.replace('Cheque: ', '')}
                  </p>

                  {/* Bank Transfer */}
                  <div>
                    <p className="text-gray-700 mb-2">
                      <span className="font-medium">- Bank Transfer:</span> {INVOICE_NOTES.bankTransferInstruction.replace('Bank Transfer: ', '')}
                    </p>
                    <div className="ml-6 grid grid-cols-[140px_1fr] gap-y-1 text-sm">
                      <span className="text-gray-600">Account name</span>
                      <span>{BANK_DETAILS.accountName}</span>
                      <span className="text-gray-600">Account number</span>
                      <span>{BANK_DETAILS.accountNumber}</span>
                      <span className="text-gray-600">Bank name</span>
                      <span>{BANK_DETAILS.bankName}</span>
                      <span className="text-gray-600">Branch</span>
                      <span>{BANK_DETAILS.branch}</span>
                      <span className="text-gray-600">Swift code</span>
                      <span>{BANK_DETAILS.swiftCode}</span>
                      <span className="text-gray-600">Bank address</span>
                      <span>{BANK_DETAILS.bankAddress}</span>
                    </div>
                  </div>

                  {/* Bill Payment */}
                  <div>
                    <p className="text-gray-700 mb-2">
                      <span className="font-medium">- Bill Payment via Mobile Banking, Internet Banking, ATM or Bank Counter:</span> {INVOICE_NOTES.billPaymentInstruction.replace('Bill Payment via Mobile Banking, Internet Banking, ATM or Bank Counter: ', '')}
                    </p>
                    <div className="ml-6 flex items-start gap-8">
                      <div className="grid grid-cols-[140px_1fr] gap-y-1 text-sm">
                        <span className="text-gray-600">Biller ID no.</span>
                        <span>{BILL_PAYMENT.billerId}</span>
                        <span className="text-gray-600">Reference no. (Ref 1)</span>
                        <span>{selectedInvoice.studentId.replace('KC', '')}</span>
                        <span className="text-gray-600">Reference no. (Ref 2)</span>
                        <span>{selectedInvoice.invoiceNumber.replace('INV-', '')}</span>
                      </div>
                      <div className="w-20 h-20 bg-white p-1">
                        <div className="grid grid-cols-7 gap-px w-full h-full">
                          {/* QR Code pattern - 7x7 grid with position markers */}
                          {[
                            1,1,1,1,1,1,1,
                            1,0,0,0,0,0,1,
                            1,0,1,1,1,0,1,
                            1,0,1,1,1,0,1,
                            1,0,1,1,1,0,1,
                            1,0,0,0,0,0,1,
                            1,1,1,1,1,1,1,
                          ].map((cell, i) => (
                            <div key={i} className={`${cell ? 'bg-black' : 'bg-white'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Credit Card */}
                  <p className="text-gray-700">
                    <span className="font-medium">- Credit card:</span> {INVOICE_NOTES.creditCardNote.replace('Credit card: ', '')}
                  </p>
                </div>
              </div>

              {/* Signature Section */}
              <div className="px-6 pb-6 pt-4">
                <div className="flex justify-between px-8">
                  <div className="text-center">
                    <div className="w-40 border-b border-gray-400 mb-1"></div>
                    <p className="text-xs text-gray-600">Prepared by</p>
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-b border-gray-400 mb-1"></div>
                    <p className="text-xs text-gray-600">Authorised officer</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 p-6 border-t bg-gray-50">
                <Button
                  className="flex-1"
                  onClick={() => {
                    downloadInvoice(selectedInvoice.id)
                    closeInvoiceModal()
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>

                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    sendInvoice(selectedInvoice.id)
                    closeInvoiceModal()
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invoice
                </Button>

                <Button variant="ghost" onClick={closeInvoiceModal}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Invoice Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent>
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
                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₿) *</label>
              <Input
                type="number"
                placeholder="0"
                value={newItem.amount}
                onChange={(e) => setNewItem({...newItem, amount: e.target.value})}
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
                onChange={(e) => setNewItem({...newItem, discountPercent: e.target.value})}
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
        <DialogContent className="max-w-2xl">
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
                            <TableHead>Grade</TableHead>
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
        <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
          {selectedInvoice && (
            <div className="bg-white">
              {/* Invoice Title */}
              <div className="text-center py-4 border-b">
                <h1 className="text-2xl font-bold tracking-wide">INVOICE</h1>
                <Badge variant="outline" className="mt-2">
                  <Eye className="w-3 h-3 mr-1" />
                  View Only
                </Badge>
              </div>

              {/* Student & Invoice Info */}
              <div className="px-4 py-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 text-xs">
                    {/* Left - Student Info */}
                    <div className="p-3 space-y-1 border-r">
                      <div className="grid grid-cols-[90px_1fr] gap-1">
                        <span className="text-gray-600">Student ID</span>
                        <span className="font-medium">{selectedInvoice.studentId}</span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] gap-1">
                        <span className="text-gray-600">Student name</span>
                        <span className="font-medium">{selectedInvoice.studentName}</span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] gap-1">
                        <span className="text-gray-600">Year group</span>
                        <span className="font-medium">{selectedInvoice.studentGrade}</span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] gap-1">
                        <span className="text-gray-600">Contact name</span>
                        <span className="font-medium">{selectedInvoice.parentName}</span>
                      </div>
                    </div>
                    {/* Right - Invoice Info */}
                    <div className="p-3 space-y-1">
                      <div className="grid grid-cols-[90px_1fr] gap-1">
                        <span className="text-gray-600">Invoice no.</span>
                        <span className="font-medium">{selectedInvoice.invoiceNumber.replace('INV-', '')}</span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] gap-1">
                        <span className="text-gray-600">Invoice date</span>
                        <span className="font-medium">{format(selectedInvoice.issueDate, "dd MMM yyyy")}</span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] gap-1">
                        <span className="text-gray-600">Due date</span>
                        <span className="font-medium">{format(selectedInvoice.dueDate, "dd MMM yyyy")}</span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] gap-1">
                        <span className="text-gray-600">School year</span>
                        <span className="font-medium">{getAcademicYear(selectedInvoice.issueDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discounts Section */}
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

                  if (discounts.length === 0) return null

                  return (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-medium text-green-800 mb-2">Discounts Applied:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {discounts.map((discount, idx) => (
                          <Badge key={idx} className={`text-xs ${discount.color}`}>
                            {discount.name} {discount.value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Invoice Items Table */}
              <div className="px-4 pb-4">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="py-2 px-2 text-left font-semibold w-8">No.</th>
                        <th className="py-2 px-2 text-left font-semibold">Description</th>
                        <th className="py-2 px-2 text-right font-semibold w-24">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2 px-2 align-top">{index + 1}</td>
                          <td className="py-2 px-2 align-top" style={{ wordBreak: 'break-word' }}>
                            {item.description}
                            {item.discountPercent > 0 && (
                              <span className="text-gray-500 ml-1">(-{item.discountPercent}%)</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right font-medium whitespace-nowrap align-top">
                            {formatCurrency(item.discountedAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Amount in Words + Total */}
                  <div className="border-t p-3">
                    <div className="text-xs text-gray-600 mb-1">{numberToWords(selectedInvoice.finalAmount)}</div>
                    <div className="flex justify-between items-center font-bold text-sm">
                      <span>TOTAL</span>
                      <span>{formatCurrency(selectedInvoice.finalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes (View Only) */}
              {selectedInvoice.notes && (
                <div className="px-4 pb-4">
                  <label className="text-xs font-medium block mb-1">Notes</label>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Payment Methods Preview */}
              <div className="px-4 pb-4 text-xs text-gray-500">
                <p className="font-medium text-gray-700 mb-1">Payment methods:</p>
                <p>Credit Card, PromptPay, Bank Counter, WeChat Pay, Alipay, Cash</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={deleteInvoice}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeEditModal}>
                    Close
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
    </div>
  )
}