import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Separator } from "./ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar as CalendarComponent } from "./ui/calendar"
import { Badge } from "./ui/badge"
import {
  FileText,
  Plus,
  Trash2,
  Calendar,
  Eye,
  Printer,
  Download,
  User,
  Building,
  CreditCard,
  PenLine,
  Search,
  Filter,
  MoreHorizontal,
  Mail
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { useSchoolSettings } from "@/hooks/useSchoolSettings"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import SchoolLogo from "@/assets/Logo.png"
import { ColumnPresets } from "@/utils/tableAlignment"
import { BANKS, PAYMENT_SOURCES } from "@/constants/paymentConstants"

// ========================
// TYPE DEFINITIONS
// ========================

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

interface AppliedCreditNote {
  id: string
  creditNoteNumber: string
  studentName: string
  reason: string
  appliedAmount: number
}

interface InvoiceRow {
  id: string
  invoiceNo: string
  invoiceDate: Date | undefined
  invoiceAmount: number
  receivedAmount: number
  outstandingAmount: number
}

interface ReceiptFormData {
  // Client Type
  clientType: "internal" | "external"
  // Client Information
  clientNo: string
  clientName: string
  contactName: string
  address: string
  // Receipt Information
  receiptNo: string
  receiptDate: Date | undefined
  yearGroup: string
  schoolYear: string
  // Invoice Details
  invoices: InvoiceRow[]
  // Payment Information
  paymentMethod: string
  bankName: string
  bankBranch: string
  chequeNo: string
  chequeDate: Date | undefined
  // Authorization
  collectorName: string
  authorizedSignature: string
}

interface ReceiptRecord {
  id: string
  receiptNo: string
  receiptDate: Date
  clientType: "internal" | "external"
  clientNo: string
  clientName: string
  contactName: string
  yearGroup: string
  schoolYear: string
  totalAmount: number
  creditNoteTotal?: number
  netPayableAmount?: number
  appliedCreditNotes?: AppliedCreditNote[]
  paymentMethod: string
  status: "generated" | "sent" | "downloaded"
  createdAt: Date
  invoices: InvoiceRow[]
}

interface ReceiptManagementFlowProps {
  menuType: "afterschool" | "event" | "summer" | "tuition" | "eca"
  title?: string
  description?: string
  autoOpenForm?: boolean
  hideMainContent?: boolean // Hide header, filters, and list - show only dialog
  onFormClose?: () => void // Callback when form dialog closes
}

// ========================
// CONSTANTS
// ========================

// Payment methods - converted to function to use translations
// Payment methods - moved to shared constants
const getPaymentMethods = (_t: any) => PAYMENT_SOURCES

const YEAR_GROUPS = [
  "Pre-Nursery", "Nursery", "Reception",
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
  "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"
]

const SCHOOL_YEARS = ["2024-2025", "2025-2026", "2026-2027"]

// ========================
// HELPER FUNCTIONS
// ========================

const generateReceiptNo = (_menuType: string): string => {
  // Determine academic year start year from current date
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  const acYearStart = month >= 8 ? year : year - 1 // Aug+ = new academic year

  // Global running number per academic year
  const runningKey = `receipt_running_no_${acYearStart}`
  const current = parseInt(localStorage.getItem(runningKey) || "0", 10)
  const next = current + 1
  localStorage.setItem(runningKey, next.toString())

  return `R${acYearStart}-${String(next).padStart(5, "0")}`
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const getStorageKey = (menuType: string): string => {
  return `receiptRecords_${menuType}`
}

// ========================
// MAIN COMPONENT
// ========================

export function ReceiptManagementFlow({
  menuType,
  title = "Receipt Management",
  description = "Create and manage receipts",
  autoOpenForm = false,
  hideMainContent = false,
  onFormClose
}: ReceiptManagementFlowProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const schoolSettings = useSchoolSettings()
  const printRef = useRef<HTMLDivElement>(null)
  const deleteConfirmDialog = useConfirmDialog()

  // Get payment methods with translations
  const PAYMENT_METHODS = getPaymentMethods(t)

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(autoOpenForm)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [formData, setFormData] = useState<ReceiptFormData>({
    clientType: "internal",
    clientNo: "",
    clientName: "",
    contactName: "",
    address: "",
    receiptNo: generateReceiptNo(menuType),
    receiptDate: new Date(),
    yearGroup: "",
    schoolYear: SCHOOL_YEARS[0],
    invoices: [{
      id: crypto.randomUUID(),
      invoiceNo: "",
      invoiceDate: undefined,
      invoiceAmount: 0,
      receivedAmount: 0,
      outstandingAmount: 0
    }],
    paymentMethod: "",
    bankName: "",
    bankBranch: "",
    chequeNo: "",
    chequeDate: undefined,
    collectorName: "",
    authorizedSignature: ""
  })

  // Receipt records state
  const [receipts, setReceipts] = useState<ReceiptRecord[]>(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(menuType))
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [bankAccounts] = usePersistedState<any[]>("bankAccounts", [])

  // Credit Note state
  const [availableCreditNotes, setAvailableCreditNotes] = useState<CreditNoteRecord[]>([])
  const [selectedCNIds, setSelectedCNIds] = useState<Set<string>>(new Set())

  // Load available credit notes when clientNo changes
  useEffect(() => {
    const clientNo = formData.clientNo.trim()
    if (!clientNo) {
      setAvailableCreditNotes([])
      setSelectedCNIds(new Set())
      return
    }
    try {
      const stored = localStorage.getItem("creditNotesRecords")
      if (stored) {
        const all: CreditNoteRecord[] = JSON.parse(stored)
        const available = all.filter(cn =>
          (cn.status === "issued" || cn.status === "partial") &&
          ((cn.familyCode || cn.studentId || "").toLowerCase() === clientNo.toLowerCase())
        )
        setAvailableCreditNotes(available)
      }
    } catch { /* ignore */ }
  }, [formData.clientNo])

  const toggleCN = (id: string) => {
    setSelectedCNIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalAppliedCN = availableCreditNotes
    .filter(cn => selectedCNIds.has(cn.id))
    .reduce((sum, cn) => sum + (cn.remainingBalance ?? cn.amount), 0)

  // Search and filter state
  const [searchTerm, setSearchTerm] = usePersistedState(`eca-receipts:search`, "")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // View receipt state
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRecord | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)

  // Auto-open form if autoOpenForm is true
  useEffect(() => {
    if (autoOpenForm) {
      handleOpenForm()
    }
  }, [autoOpenForm])

  // ========================
  // FORM HANDLERS
  // ========================

  const resetForm = () => {
    setFormData({
      clientType: "internal",
      clientNo: "",
      clientName: "",
      contactName: "",
      address: "",
      receiptNo: generateReceiptNo(menuType),
      receiptDate: new Date(),
      yearGroup: "",
      schoolYear: SCHOOL_YEARS[0],
      invoices: [{
        id: crypto.randomUUID(),
        invoiceNo: "",
        invoiceDate: undefined,
        invoiceAmount: 0,
        receivedAmount: 0,
        outstandingAmount: 0
      }],
      paymentMethod: "",
      bankName: "",
      bankBranch: "",
      chequeNo: "",
      chequeDate: undefined,
      collectorName: "",
      authorizedSignature: ""
    })
  }

  const handleOpenForm = () => {
    console.log("Opening receipt form...")
    resetForm()
    setIsFormOpen(true)
    console.log("Form state set to open:", true)
  }

  const updateFormField = <K extends keyof ReceiptFormData>(
    field: K,
    value: ReceiptFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Invoice row handlers
  const addInvoiceRow = () => {
    setFormData(prev => ({
      ...prev,
      invoices: [...prev.invoices, {
        id: crypto.randomUUID(),
        invoiceNo: "",
        invoiceDate: undefined,
        invoiceAmount: 0,
        receivedAmount: 0,
        outstandingAmount: 0
      }]
    }))
  }

  const performRemoveInvoiceRow = (id: string) => {
    if (formData.invoices.length <= 1) {
      toast.error("At least one invoice row is required")
      return
    }
    setFormData(prev => ({
      ...prev,
      invoices: prev.invoices.filter(inv => inv.id !== id)
    }))
  }

  const removeInvoiceRow = (id: string) => {
    if (formData.invoices.length <= 1) {
      toast.error("At least one invoice row is required")
      return
    }
    deleteConfirmDialog.confirm(() => performRemoveInvoiceRow(id))
  }

  const updateInvoiceRow = (id: string, field: keyof InvoiceRow, value: any) => {
    setFormData(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv => {
        if (inv.id !== id) return inv

        const updated = { ...inv, [field]: value }

        // When invoiceAmount changes, auto-fill receivedAmount to same value
        if (field === "invoiceAmount") {
          updated.receivedAmount = value
          updated.outstandingAmount = 0
        }

        // When receivedAmount changes manually, recalculate outstanding
        if (field === "receivedAmount") {
          updated.outstandingAmount = updated.invoiceAmount - updated.receivedAmount
        }

        return updated
      })
    }))
  }

  // Calculate totals
  const getTotalInvoiceAmount = () => {
    return formData.invoices.reduce((sum, inv) => sum + (inv.invoiceAmount || 0), 0)
  }

  const getTotalReceivedAmount = () => {
    return formData.invoices.reduce((sum, inv) => sum + (inv.receivedAmount || 0), 0)
  }

  const getTotalOutstandingAmount = () => {
    return formData.invoices.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0)
  }

  // ========================
  // VALIDATION
  // ========================

  const validateForm = (): boolean => {
    // Client Information
    if (!formData.clientNo.trim()) {
      toast.error("Client No. is required")
      return false
    }
    if (!formData.clientName.trim()) {
      toast.error("Client Name is required")
      return false
    }

    // Receipt Information
    if (!formData.receiptNo.trim()) {
      toast.error("Receipt No. is required")
      return false
    }
    if (!formData.receiptDate) {
      toast.error("Receipt Date is required")
      return false
    }

    // Invoice Details
    const hasValidInvoice = formData.invoices.some(inv =>
      inv.invoiceNo.trim() && inv.receivedAmount > 0
    )
    if (!hasValidInvoice) {
      toast.error("At least one invoice with received amount is required")
      return false
    }

    // Payment Information
    if (!formData.paymentMethod) {
      toast.error("Payment Method is required")
      return false
    }

    if (formData.paymentMethod === "Cashier's cheque") {
      if (!formData.chequeNo.trim()) {
        toast.error("Cheque No. is required for cheque payment")
        return false
      }
      if (!formData.chequeDate) {
        toast.error("Cheque Date is required for cheque payment")
        return false
      }
    }

    if (["Bank Transfer", "Cashier's cheque", "Partial", "EDC"].includes(formData.paymentMethod)) {
      if (!formData.bankName) {
        toast.error("Bank Name is required")
        return false
      }
    }

    // Authorization
    if (!formData.collectorName.trim()) {
      toast.error("Collector Name is required")
      return false
    }

    return true
  }

  // ========================
  // PREVIEW & GENERATE
  // ========================

  const handlePreview = () => {
    if (!validateForm()) return
    setIsPreviewOpen(true)
  }

  const handleGenerateReceipt = () => {
    if (!validateForm()) return

    const appliedCNs: AppliedCreditNote[] = availableCreditNotes
      .filter(cn => selectedCNIds.has(cn.id))
      .map(cn => ({
        id: cn.id,
        creditNoteNumber: cn.creditNoteNumber,
        studentName: cn.studentName,
        reason: cn.reason,
        appliedAmount: cn.remainingBalance ?? cn.amount
      }))

    const newReceipt: ReceiptRecord = {
      id: crypto.randomUUID(),
      receiptNo: formData.receiptNo,
      receiptDate: formData.receiptDate!,
      clientType: formData.clientType,
      clientNo: formData.clientNo,
      clientName: formData.clientName,
      contactName: formData.contactName,
      yearGroup: formData.clientType === "internal" ? formData.yearGroup : "",
      schoolYear: formData.schoolYear,
      totalAmount: getTotalReceivedAmount(),
      creditNoteTotal: totalAppliedCN,
      netPayableAmount: Math.max(0, getTotalReceivedAmount() - totalAppliedCN),
      appliedCreditNotes: appliedCNs.length > 0 ? appliedCNs : undefined,
      paymentMethod: formData.paymentMethod,
      status: "generated",
      createdAt: new Date(),
      invoices: formData.invoices.filter(inv => inv.invoiceNo.trim())
    }

    const updatedReceipts = [newReceipt, ...receipts]
    setReceipts(updatedReceipts)
    localStorage.setItem(getStorageKey(menuType), JSON.stringify(updatedReceipts))

    // Update applied credit notes in storage
    if (selectedCNIds.size > 0) {
      try {
        const stored = localStorage.getItem("creditNotesRecords")
        if (stored) {
          const all = JSON.parse(stored)
          const updatedCNs = all.map((cn: any) => {
            if (!selectedCNIds.has(cn.id)) return cn
            const balance = cn.remainingBalance ?? cn.amount
            const newBalance = Math.max(0, balance)
            return {
              ...cn,
              remainingBalance: 0,
              status: "used",
              appliedToReceipt: formData.receiptNo
            }
          })
          localStorage.setItem("creditNotesRecords", JSON.stringify(updatedCNs))
        }
      } catch { /* ignore */ }
    }

    toast.success(t("receiptStatus.generatedSuccess"))
    setIsFormOpen(false)
    setIsPreviewOpen(false)
    setSelectedCNIds(new Set())
    setAvailableCreditNotes([])
    resetForm()
    onFormClose?.()
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Receipt - ${formData.receiptNo}</title>
            <style>
              @page { size: A4 portrait; margin: 0; }
              * { box-sizing: border-box; }
              body {
                font-family: 'Times New Roman', Times, serif;
                font-size: 11px;
                line-height: 1.2;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 0;
              }
              table { width: 100%; border-collapse: collapse; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  // ========================
  // RECEIPT LIST HANDLERS
  // ========================

  const handleViewReceipt = (receipt: ReceiptRecord) => {
    setSelectedReceipt(receipt)
    setIsViewOpen(true)
  }

  const handleResendReceipt = (receipt: ReceiptRecord) => {
    const updatedReceipts = receipts.map(r =>
      r.id === receipt.id ? { ...r, status: "sent" as const } : r
    )
    setReceipts(updatedReceipts)
    localStorage.setItem(getStorageKey(menuType), JSON.stringify(updatedReceipts))
    toast.success(t("receiptStatus.sentSuccess").replace("{receiptNo}", receipt.receiptNo))
  }

  const handleDownloadReceipt = (receipt: ReceiptRecord) => {
    const updatedReceipts = receipts.map(r =>
      r.id === receipt.id ? { ...r, status: "downloaded" as const } : r
    )
    setReceipts(updatedReceipts)
    localStorage.setItem(getStorageKey(menuType), JSON.stringify(updatedReceipts))
    toast.success(t("receiptStatus.downloadedSuccess").replace("{receiptNo}", receipt.receiptNo))
  }

  // Filter receipts
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch =
      receipt.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.clientNo.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === "all" || receipt.status === filterStatus

    return matchesSearch && matchesFilter
  })

  // ========================
  // RENDER RECEIPT PREVIEW
  // ========================

  // Convert number to words (English)
  const numberToWords = (num: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
      'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

    if (num === 0) return 'ZERO'
    if (num < 0) return 'MINUS ' + numberToWords(Math.abs(num))

    const intPart = Math.floor(num)
    let words = ''

    if (intPart >= 1000000) {
      words += numberToWords(Math.floor(intPart / 1000000)) + ' MILLION '
      return words + numberToWords(intPart % 1000000)
    }
    if (intPart >= 1000) {
      words += numberToWords(Math.floor(intPart / 1000)) + ' THOUSAND '
      const remainder = intPart % 1000
      if (remainder > 0) words += numberToWords(remainder)
      return words.trim()
    }
    if (intPart >= 100) {
      words += ones[Math.floor(intPart / 100)] + ' HUNDRED '
      const remainder = intPart % 100
      if (remainder > 0) words += numberToWords(remainder)
      return words.trim()
    }
    if (intPart >= 20) {
      words += tens[Math.floor(intPart / 10)]
      if (intPart % 10 > 0) words += ' ' + ones[intPart % 10]
      return words.trim()
    }
    return ones[intPart]
  }

  // Receipt Preview - responsive for screen, fixed A4 for print
  const renderReceiptPreview = (data: ReceiptFormData, forPrint: boolean = false) => {
    // Style for print: fixed A4 dimensions
    // Style for preview: responsive full width
    const containerStyle = forPrint ? {
      width: '794px',
      height: '1123px',
      backgroundColor: '#fff',
      fontFamily: "'Times New Roman', Times, serif",
      fontSize: '12px',
      lineHeight: '1.5',
      color: '#000',
      padding: '40px 60px',
      boxSizing: 'border-box' as const,
      position: 'relative' as const,
      overflow: 'hidden' as const
    } : {
      width: '100%',
      backgroundColor: '#fff',
      fontFamily: "'Times New Roman', Times, serif",
      fontSize: '13px',
      lineHeight: '1.6',
      color: '#000',
      padding: '30px 40px',
      boxSizing: 'border-box' as const
    }

    const headerFontSize = forPrint ? '13px' : '15px'
    const titleFontSize = forPrint ? '22px' : '26px'
    const bodyFontSize = forPrint ? '11px' : '13px'
    const smallFontSize = forPrint ? '10px' : '12px'
    const signatureHeight = forPrint ? '60px' : '80px'

    return (
      <div ref={forPrint ? printRef : undefined} style={containerStyle}>
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: forPrint ? '25px' : '35px' }}>
          <img
            src={schoolSettings.logoUrl || SchoolLogo}
            alt="School Logo"
            style={{ height: forPrint ? '60px' : '80px', display: 'block', margin: '0 auto 12px auto' }}
          />
          <div style={{ fontSize: headerFontSize, fontWeight: 'bold', letterSpacing: '3px', marginBottom: '4px' }}>
            {schoolSettings.schoolName.toUpperCase()}
          </div>
          <div style={{ fontSize: bodyFontSize, letterSpacing: '2px', marginBottom: '10px' }}>
            BANGKOK
          </div>
          <div style={{ fontSize: smallFontSize, color: '#333', marginBottom: '4px' }}>
            {schoolSettings.address}
          </div>
          <div style={{ fontSize: smallFontSize, color: '#333', marginBottom: forPrint ? '18px' : '25px' }}>
            {schoolSettings.phone}, {schoolSettings.email}
          </div>
          <div style={{ fontSize: titleFontSize, fontWeight: 'bold', letterSpacing: '3px' }}>
            RECEIPT
          </div>
        </div>

        {/* CLIENT & RECEIPT INFO */}
        <div style={{ border: '1px solid #000', padding: forPrint ? '15px 20px' : '20px 25px', marginBottom: forPrint ? '20px' : '30px', fontSize: bodyFontSize }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', verticalAlign: 'top' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '100px', paddingBottom: '8px' }}>Client no.</td>
                        <td style={{ paddingBottom: '8px' }}>{data.clientNo}</td>
                      </tr>
                      <tr>
                        <td style={{ width: '100px', paddingBottom: '8px' }}>Client name</td>
                        <td style={{ paddingBottom: '8px' }}>{data.clientName}</td>
                      </tr>
                      <tr>
                        <td style={{ width: '100px', paddingBottom: '8px' }}>Contact name</td>
                        <td style={{ paddingBottom: '8px' }}>{data.contactName || "-"}</td>
                      </tr>
                      <tr>
                        <td style={{ width: '100px', paddingBottom: '8px' }}>Address</td>
                        <td style={{ paddingBottom: '8px' }}>{data.address || "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ paddingBottom: '8px' }}>Receipt no.</td>
                        <td style={{ paddingBottom: '8px', textAlign: 'right' }}>{data.receiptNo}</td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: '8px' }}>Receipt date</td>
                        <td style={{ paddingBottom: '8px', textAlign: 'right' }}>{data.receiptDate ? format(data.receiptDate, "d MMMM yyyy") : "-"}</td>
                      </tr>
                      {data.clientType === "internal" && (
                        <tr>
                          <td style={{ paddingBottom: '8px' }}>Year group</td>
                          <td style={{ paddingBottom: '8px', textAlign: 'right' }}>{data.yearGroup || "-"}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ paddingBottom: '8px' }}>School year</td>
                        <td style={{ paddingBottom: '8px', textAlign: 'right' }}>{data.schoolYear}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* INVOICE TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: bodyFontSize, marginBottom: forPrint ? '25px' : '35px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'center', fontWeight: 'normal', width: forPrint ? '35px' : '50px' }}>No.</th>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'left', fontWeight: 'normal' }}>Invoice no.</th>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'center', fontWeight: 'normal' }}>Invoice date</th>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'center', fontWeight: 'normal' }}>Invoice amount<br />(THB)</th>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'center', fontWeight: 'normal' }}>Received amount<br />(THB)</th>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'center', fontWeight: 'normal' }}>Outstanding amount<br />(THB)</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.filter(inv => inv.invoiceNo.trim()).map((invoice, index) => (
              <tr key={invoice.id}>
                <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'center' }}>{index + 1}</td>
                <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px' }}>{invoice.invoiceNo}</td>
                <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'center' }}>{invoice.invoiceDate ? format(invoice.invoiceDate, "d MMMM yyyy") : "-"}</td>
                <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'right' }}>{formatCurrency(invoice.invoiceAmount)}</td>
                <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'right' }}>{formatCurrency(invoice.receivedAmount)}</td>
                <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'right' }}>{invoice.outstandingAmount > 0 ? formatCurrency(invoice.outstandingAmount) : "-"}</td>
              </tr>
            ))}
            {/* Amount in words row */}
            {(() => {
              const totalReceived = data.invoices.reduce((sum, inv) => sum + (inv.receivedAmount || 0), 0)
              const totalOutstanding = data.invoices.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0)
              return (
                <tr>
                  <td colSpan={3} style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'left' }}>
                    {numberToWords(totalReceived)} BAHT ONLY
                  </td>
                  <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'center', fontWeight: 'bold' }}>TOTAL</td>
                  <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(totalReceived)}</td>
                  <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'right' }}>{totalOutstanding > 0 ? formatCurrency(totalOutstanding) : "-"}</td>
                </tr>
              )
            })()}
          </tbody>
        </table>

        {/* CREDIT NOTES APPLIED */}
        {(() => {
          const cnList: AppliedCreditNote[] = (data as any).appliedCreditNotes ||
            (selectedCNIds.size > 0
              ? availableCreditNotes
                  .filter(cn => selectedCNIds.has(cn.id))
                  .map(cn => ({ id: cn.id, creditNoteNumber: cn.creditNoteNumber, studentName: cn.studentName, reason: cn.reason, appliedAmount: cn.remainingBalance ?? cn.amount }))
              : [])
          const cnTotal = cnList.reduce((s, cn) => s + cn.appliedAmount, 0)
          if (cnList.length === 0) return null
          const totalReceived = data.invoices.reduce((sum, inv) => sum + (inv.receivedAmount || 0), 0)
          return (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: bodyFontSize, marginBottom: forPrint ? '8px' : '12px' }}>
              <thead>
                <tr>
                  <th colSpan={3} style={{ border: '1px solid #000', padding: forPrint ? '6px 10px' : '8px 14px', textAlign: 'left', fontWeight: 'normal', backgroundColor: '#f0fdf4' }}>
                    Credit Note Applied
                  </th>
                  <th style={{ border: '1px solid #000', padding: forPrint ? '6px 10px' : '8px 14px', textAlign: 'center', fontWeight: 'normal', backgroundColor: '#f0fdf4' }}>Credit Note No.</th>
                  <th style={{ border: '1px solid #000', padding: forPrint ? '6px 10px' : '8px 14px', textAlign: 'right', fontWeight: 'normal', backgroundColor: '#f0fdf4' }}>Amount (THB)</th>
                </tr>
              </thead>
              <tbody>
                {cnList.map((cn, i) => (
                  <tr key={cn.id}>
                    <td colSpan={3} style={{ border: '1px solid #000', padding: forPrint ? '6px 10px' : '8px 14px' }}>{cn.reason} — {cn.studentName}</td>
                    <td style={{ border: '1px solid #000', padding: forPrint ? '6px 10px' : '8px 14px', textAlign: 'center', fontFamily: 'monospace' }}>{cn.creditNoteNumber}</td>
                    <td style={{ border: '1px solid #000', padding: forPrint ? '6px 10px' : '8px 14px', textAlign: 'right', color: '#16a34a' }}>-{formatCurrency(cn.appliedAmount)}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f0fdf4' }}>
                  <td colSpan={3} style={{ border: '1px solid #000', padding: forPrint ? '6px 10px' : '8px 14px', fontWeight: 'bold' }}>Net Payable Amount</td>
                  <td style={{ border: '1px solid #000', padding: forPrint ? '6px 10px' : '8px 14px' }}></td>
                  <td style={{ border: '1px solid #000', padding: forPrint ? '6px 10px' : '8px 14px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(Math.max(0, totalReceived - cnTotal))}</td>
                </tr>
              </tbody>
            </table>
          )
        })()}

        {/* PAYMENT INFORMATION */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: bodyFontSize, marginBottom: forPrint ? '30px' : '45px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'center', fontWeight: 'normal' }}>{t("paymentMethod.label")}</th>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'center', fontWeight: 'normal' }}>Bank name</th>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'center', fontWeight: 'normal' }}>Bank branch</th>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'center', fontWeight: 'normal' }}>Cheque no.</th>
              <th style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '12px 14px', textAlign: 'center', fontWeight: 'normal' }}>Cheque date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'center' }}>
                {PAYMENT_METHODS.find(p => p.value === data.paymentMethod)?.label || "-"}
              </td>
              <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'center' }}>
                {data.bankName || "-"}
              </td>
              <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'center' }}>
                {data.bankBranch || "-"}
              </td>
              <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'center' }}>
                {data.chequeNo || "-"}
              </td>
              <td style={{ border: '1px solid #000', padding: forPrint ? '8px 10px' : '10px 14px', textAlign: 'center' }}>
                {data.chequeDate ? format(data.chequeDate, "dd/MM/yyyy") : "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* SIGNATURES */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: forPrint ? '30px' : '40px', padding: forPrint ? '0 40px' : '0 60px' }}>
          <div style={{ width: '40%', textAlign: 'center' }}>
            <div style={{ height: signatureHeight, fontSize: bodyFontSize, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              {data.collectorName || ""}
            </div>
            <div style={{ borderTop: '1px solid #000', marginBottom: '8px', marginTop: '8px' }}></div>
            <div style={{ fontSize: bodyFontSize }}>Collector</div>
          </div>
          <div style={{ width: '40%', textAlign: 'center' }}>
            <div style={{ height: signatureHeight, fontSize: bodyFontSize, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              {data.authorizedSignature || ""}
            </div>
            <div style={{ borderTop: '1px solid #000', marginBottom: '8px', marginTop: '8px' }}></div>
            <div style={{ fontSize: bodyFontSize }}>Authorised signature</div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ fontSize: smallFontSize, textAlign: 'center', color: '#333', marginTop: forPrint ? '20px' : '25px' }}>
          In case of payment made by cheque, this receipt will not be valid until the cheque has been honoured by the bank.
        </div>
      </div>
    )
  }

  // Hidden print container
  const renderPrintContainer = () => (
    <div className="hidden">
      <div ref={printRef}>
        {renderReceiptPreview(formData, true)}
      </div>
    </div>
  )

  // ========================
  // MAIN RENDER
  // ========================

  return (
    <div className="space-y-6">
      {!hideMainContent && (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-muted-foreground">{description}</p>
            </div>
            <Button onClick={handleOpenForm} className="flex items-center gap-2" disabled={!userCanEdit}>
              <Plus className="w-4 h-4" />
              Create Receipt
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by receipt no., client name, or client no."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("receiptStatus.allStatus")}</SelectItem>
                    <SelectItem value="generated">{t("receiptStatus.generated")}</SelectItem>
                    <SelectItem value="sent">{t("receiptStatus.sent")}</SelectItem>
                    <SelectItem value="downloaded">{t("receiptStatus.downloaded")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Receipt List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Receipts ({filteredReceipts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredReceipts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No receipts found</p>
                  <p className="text-sm mt-1">Create a new receipt to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Receipt Number - text/ID */}
                      <TableHead align="left">{t("table.receiptNo")}</TableHead>
                      {/* Date - date */}
                      <TableHead align="left">{t("table.date")}</TableHead>
                      {/* Client Name - text */}
                      <TableHead align="left">{t("table.client")}</TableHead>
                      {/* Year Group - badge */}
                      <TableHead align="center">{t("table.yearGroup")}</TableHead>
                      {/* Amount - currency */}
                      <TableHead align="right">{t("table.amount")}</TableHead>
                      {/* Payment Method - badge */}
                      <TableHead align="center">{t("table.payment")}</TableHead>
                      {/* Status - badge */}
                      <TableHead align="center">{t("table.status")}</TableHead>
                      {/* Actions - buttons */}
                      <TableHead align="center">{t("table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        {/* Receipt Number - text/ID */}
                        <TableCell align="left" className="font-medium">{receipt.receiptNo}</TableCell>
                        {/* Date - date */}
                        <TableCell align="left">{format(new Date(receipt.receiptDate), "dd/MM/yyyy")}</TableCell>
                        {/* Client Name - text */}
                        <TableCell align="left">
                          <div>
                            <p className="font-medium">{receipt.clientName}</p>
                            <p className="text-sm text-muted-foreground">{receipt.clientNo}</p>
                          </div>
                        </TableCell>
                        {/* Year Group - badge */}
                        <TableCell align="center">{receipt.yearGroup || "-"}</TableCell>
                        {/* Amount - currency */}
                        <TableCell align="right" className="font-medium">
                          {formatCurrency(receipt.totalAmount)} THB
                        </TableCell>
                        {/* Payment Method - badge */}
                        <TableCell align="center">
                          <Badge variant="outline">
                            {PAYMENT_METHODS.find(p => p.value === receipt.paymentMethod)?.label}
                          </Badge>
                        </TableCell>
                        {/* Status - badge */}
                        <TableCell align="center">
                          <Badge
                            variant={
                              receipt.status === "generated" ? "secondary" :
                                receipt.status === "sent" ? "default" : "outline"
                            }
                          >
                            {t(`receiptStatus.${receipt.status}`)}
                          </Badge>
                        </TableCell>
                        {/* Actions - buttons */}
                        <TableCell align="center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReceipt(receipt)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendReceipt(receipt)}
                              disabled={!userCanEdit}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadReceipt(receipt)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Data Entry Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open)
        if (!open) onFormClose?.()
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Create New Receipt</DialogTitle>
            <DialogDescription>
              Fill in the receipt details below. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b px-8 pt-6 pb-5">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">Create New Receipt </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Fill in the receipt details below. Fields marked with <span className="text-red-500 font-medium">*</span> are required.
                </p>
              </div>
            </div>
          </div>

          <div className="px-10 py-8 space-y-8">
            {/* Section 1: Client Information */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-start gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">Client Information</h3>
                  <p className="text-xs text-gray-500 mt-1">Enter client details and contact information</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">
                      Client No. <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.clientNo}
                      onChange={(e) => updateFormField("clientNo", e.target.value)}
                      placeholder="e.g., STU-2024-001"
                      className="h-9 px-3 focus:ring-2 focus:ring-primary"
                      disabled={!userCanEdit}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">
                      Client Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.clientName}
                      onChange={(e) => updateFormField("clientName", e.target.value)}
                      placeholder="Enter full name"
                      className="h-9 px-3 focus:ring-2 focus:ring-primary"
                      disabled={!userCanEdit}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">
                      Contact Name <span className="text-xs text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      value={formData.contactName}
                      onChange={(e) => updateFormField("contactName", e.target.value)}
                      placeholder="Contact person name"
                      className="h-9 px-3 focus:ring-2 focus:ring-primary"
                      disabled={!userCanEdit}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">
                      Address <span className="text-xs text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => updateFormField("address", e.target.value)}
                      placeholder="Enter address"
                      className="h-9 px-3 focus:ring-2 focus:ring-primary"
                      disabled={!userCanEdit}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Receipt Information */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-start gap-3 mb-6">
                <div className="p-2 bg-green-50 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">Receipt Information</h3>
                  <p className="text-xs text-gray-500 mt-1">Receipt number, date, and academic details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">
                      Receipt No. <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.receiptNo}
                      onChange={(e) => updateFormField("receiptNo", e.target.value)}
                      placeholder="e.g., RCP-2024-001"
                      className="h-9 px-3 font-mono focus:ring-2 focus:ring-primary"
                      disabled={!userCanEdit}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">
                      Receipt Date <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-9 justify-start font-normal focus:ring-2 focus:ring-primary" disabled={!userCanEdit}>
                          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                          {formData.receiptDate ? format(formData.receiptDate, "dd/MM/yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={formData.receiptDate}
                          onSelect={(date) => updateFormField("receiptDate", date)}
                          disabled={!userCanEdit}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {formData.clientType === "internal" && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Year Group <span className="text-xs text-gray-500">(Optional)</span>
                      </Label>
                      <Select
                        value={formData.yearGroup}
                        onValueChange={(v) => updateFormField("yearGroup", v)}
                        disabled={!userCanEdit}
                      >
                        <SelectTrigger className="h-9 px-3 focus:ring-2 focus:ring-primary">
                          <SelectValue placeholder="Select year group" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEAR_GROUPS.map(yg => (
                            <SelectItem key={yg} value={yg}>{yg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">School Year</Label>
                    <Select
                      value={formData.schoolYear}
                      onValueChange={(v) => updateFormField("schoolYear", v)}
                      disabled={!userCanEdit}
                    >
                      <SelectTrigger className="h-9 px-3 focus:ring-2 focus:ring-primary">
                        <SelectValue placeholder="Select school year" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHOOL_YEARS.map(sy => (
                          <SelectItem key={sy} value={sy}>{sy}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Invoice Details */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">Invoice Details</h3>
                    <p className="text-xs text-gray-500 mt-1">List all invoices related to this receipt</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={addInvoiceRow} className="flex items-center gap-1.5" disabled={!userCanEdit}>
                  <Plus className="w-4 h-4" />
                  Add Row
                </Button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100 border-b">
                      {/* Invoice No - text/ID */}
                      <TableHead align="left" className="w-[180px] font-semibold text-xs text-gray-900 h-10">
                        Invoice No. <span className="text-red-500">*</span>
                      </TableHead>
                      {/* Invoice Date - date */}
                      <TableHead align="left" className="w-[130px] font-semibold text-xs text-gray-900 h-10">
                        Invoice Date
                      </TableHead>
                      {/* Invoice Amount - currency */}
                      <TableHead align="right" className="w-[140px] font-semibold text-xs text-gray-900 h-10">
                        Invoice Amount
                      </TableHead>
                      {/* Received Amount - currency */}
                      <TableHead align="right" className="w-[140px] font-semibold text-xs text-gray-900 h-10">
                        Received <span className="text-red-500">*</span>
                      </TableHead>
                      {/* Outstanding - currency */}
                      <TableHead align="right" className="w-[130px] font-semibold text-xs text-gray-900 h-10">
                        Outstanding
                      </TableHead>
                      {/* Actions - button */}
                      <TableHead align="center" className="w-[50px] h-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.invoices.map((invoice, index) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-100/50 even:bg-gray-50/50 transition-colors">
                        {/* Invoice No - text/ID */}
                        <TableCell align="left" className="py-2.5">
                          <Input
                            placeholder="2025XXXXXXX"
                            value={invoice.invoiceNo}
                            onChange={(e) => updateInvoiceRow(invoice.id, "invoiceNo", e.target.value)}
                            className="h-9 font-mono text-sm border-gray-300 focus:ring-2 focus:ring-primary"
                            disabled={!userCanEdit}
                          />
                        </TableCell>
                        {/* Invoice Date - date */}
                        <TableCell align="left" className="py-2.5">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full h-9 text-xs justify-start border-gray-300 focus:ring-2 focus:ring-primary" disabled={!userCanEdit}>
                                <Calendar className="w-3 h-3 mr-1" />
                                {invoice.invoiceDate ? format(invoice.invoiceDate, "dd/MM/yy") : "Select"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={invoice.invoiceDate}
                                onSelect={(date) => updateInvoiceRow(invoice.id, "invoiceDate", date)}
                                disabled={!userCanEdit}
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        {/* Invoice Amount - currency */}
                        <TableCell align="right" className="py-2.5">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={invoice.invoiceAmount || ""}
                            onChange={(e) => updateInvoiceRow(invoice.id, "invoiceAmount", parseFloat(e.target.value) || 0)}
                            className="h-9 text-right font-mono text-sm border-gray-300 focus:ring-2 focus:ring-primary"
                            disabled={!userCanEdit}
                          />
                        </TableCell>
                        {/* Received Amount - currency */}
                        <TableCell align="right" className="py-2.5">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={invoice.receivedAmount || ""}
                            onChange={(e) => updateInvoiceRow(invoice.id, "receivedAmount", parseFloat(e.target.value) || 0)}
                            className="h-9 text-right font-mono text-sm border-gray-300 focus:ring-2 focus:ring-primary"
                            disabled={!userCanEdit}
                          />
                        </TableCell>
                        {/* Outstanding - currency */}
                        <TableCell align="right" className="py-2.5">
                          <div className="h-9 flex items-center justify-end font-mono text-sm text-gray-600 px-3 py-2 bg-gray-100 rounded-md border border-gray-200">
                            {invoice.outstandingAmount > 0 ? formatCurrency(invoice.outstandingAmount) : "0.00"}
                          </div>
                        </TableCell>
                        {/* Actions - button */}
                        <TableCell align="center" className="py-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInvoiceRow(invoice.id)}
                            disabled={!userCanEdit || formData.invoices.length <= 1}
                            className="h-8 w-8 p-0 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                      <TableCell colSpan={2} className="py-3 text-right text-sm text-gray-900">
                        Total:
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-sm text-gray-900">
                        {formatCurrency(getTotalInvoiceAmount())}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-sm text-green-700">
                        {formatCurrency(getTotalReceivedAmount())}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-sm text-red-600">
                        {formatCurrency(getTotalOutstandingAmount())}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Section 3.5: Apply Credit Note */}
            {availableCreditNotes.length > 0 && (
              <div className="border border-emerald-200 rounded-lg p-6 bg-emerald-50">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">Apply Credit Note</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Found {availableCreditNotes.length} available credit note(s) for family code <span className="font-mono font-semibold">{formData.clientNo}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {availableCreditNotes.map(cn => {
                    const balance = cn.remainingBalance ?? cn.amount
                    const isSelected = selectedCNIds.has(cn.id)
                    return (
                      <div
                        key={cn.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? "bg-emerald-100 border-emerald-400" : "bg-white border-gray-200 hover:border-emerald-300"
                        }`}
                        onClick={() => toggleCN(cn.id)}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCN(cn.id)}
                            className="w-4 h-4 accent-emerald-600"
                            onClick={e => e.stopPropagation()}
                          />
                          <div>
                            <p className="font-mono text-sm font-semibold text-gray-900">{cn.creditNoteNumber}</p>
                            <p className="text-xs text-gray-500">{cn.reason} • {cn.studentName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-700">-{formatCurrency(balance)}</p>
                          {cn.status === "partial" && (
                            <p className="text-xs text-amber-600">Remaining balance</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {selectedCNIds.size > 0 && (
                  <div className="mt-4 pt-4 border-t border-emerald-200 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Invoice Total:</span>
                      <span className="font-mono">{formatCurrency(getTotalReceivedAmount())}</span>
                    </div>
                    <div className="flex justify-between text-sm text-emerald-700 font-medium">
                      <span>Credit Note Applied:</span>
                      <span className="font-mono">-{formatCurrency(totalAppliedCN)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t border-emerald-300 pt-2 mt-2">
                      <span>Net Payable:</span>
                      <span className="font-mono text-blue-700">{formatCurrency(Math.max(0, getTotalReceivedAmount() - totalAppliedCN))}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Payment Information */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-start gap-3 mb-6">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">Payment Information</h3>
                  <p className="text-xs text-gray-500 mt-1">Payment method and banking details</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Payment Method - Full Width */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">
                    {t("paymentMethod.label")} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(v) => updateFormField("paymentMethod", v)}
                    disabled={!userCanEdit}
                  >
                    <SelectTrigger className="h-9 px-3 focus:ring-2 focus:ring-primary">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(pm => (
                        <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bank Account Selection - Show for methods that have accounts configured */}
                {PAYMENT_SOURCES.some(s => s.value === formData.paymentMethod) && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-medium text-gray-900">Select Bank Account</Label>
                    <Select
                      onValueChange={(accountId) => {
                        const account = bankAccounts.find(a => a.id === accountId);
                        if (account) {
                          updateFormField("bankName", account.bankName);
                          // ReceiptForm has bankName and bankBranch, potentially we should add accountNumber too if needed by user
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 px-3 focus:ring-2 focus:ring-primary">
                        <SelectValue placeholder="Choose an account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts
                          .filter(acc => acc.paymentSource === formData.paymentMethod && acc.isActive)
                          .map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.bankName} - {acc.accountNumber}
                            </SelectItem>
                          ))
                        }
                        {bankAccounts.filter(acc => acc.paymentSource === formData.paymentMethod && acc.isActive).length === 0 && (
                          <div className="p-2 text-xs text-muted-foreground italic">
                            No bank accounts configured for this method.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Conditional Bank Fields */}
                {["Bank Transfer", "Cashier's cheque", "Partial", "EDC"].includes(formData.paymentMethod) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Bank Name <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.bankName}
                        onValueChange={(v) => updateFormField("bankName", v)}
                        disabled={!userCanEdit}
                      >
                        <SelectTrigger className="h-9 px-3 focus:ring-2 focus:ring-primary">
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {BANKS.map(bank => (
                            <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Bank Branch <span className="text-xs text-gray-500">(Optional)</span>
                      </Label>
                      <Input
                        value={formData.bankBranch}
                        onChange={(e) => updateFormField("bankBranch", e.target.value)}
                        placeholder="e.g., Sukhumvit Branch"
                        className="h-9 px-3 focus:ring-2 focus:ring-primary"
                        disabled={!userCanEdit}
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Cheque Fields */}
                {formData.paymentMethod === "Cashier's cheque" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Cheque No. <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.chequeNo}
                        onChange={(e) => updateFormField("chequeNo", e.target.value)}
                        placeholder="e.g., 123456"
                        className="h-9 px-3 font-mono focus:ring-2 focus:ring-primary"
                        disabled={!userCanEdit}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Cheque Date <span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-9 justify-start font-normal focus:ring-2 focus:ring-primary" disabled={!userCanEdit}>
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            {formData.chequeDate ? format(formData.chequeDate, "dd/MM/yyyy") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={formData.chequeDate}
                            onSelect={(date) => updateFormField("chequeDate", date)}
                            disabled={!userCanEdit}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Authorization */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-start gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <PenLine className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">Authorization</h3>
                  <p className="text-xs text-gray-500 mt-1">Collector and authorized signature details</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">
                    Collector Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.collectorName}
                    onChange={(e) => updateFormField("collectorName", e.target.value)}
                    placeholder="Enter collector's name"
                    className="h-9 px-3 focus:ring-2 focus:ring-primary"
                    disabled={!userCanEdit}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">
                    Authorised Signature Name/Title <span className="text-xs text-gray-500">(Optional)</span>
                  </Label>
                  <Input
                    value={formData.authorizedSignature}
                    onChange={(e) => updateFormField("authorizedSignature", e.target.value)}
                    placeholder="e.g., Finance Director"
                    className="h-9 px-3 focus:ring-2 focus:ring-primary"
                    disabled={!userCanEdit}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions - Sticky Footer */}
          <div className="sticky bottom-0 bg-white border-t px-7 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                <span className="text-red-500 font-medium">*</span> Required fields
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsFormOpen(false)
                    onFormClose?.()
                  }}
                  className="hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  className="gap-2 hover:bg-gray-50"
                  disabled={!userCanEdit}
                >
                  <Eye className="w-4 h-4" />
                  Preview Receipt
                </Button>
                <Button
                  onClick={handleGenerateReceipt}
                  className="gap-2 bg-primary hover:bg-primary/90"
                  disabled={!userCanEdit}
                >
                  <FileText className="w-4 h-4" />
                  Generate Receipt
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog - Full width, responsive */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b bg-white flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Receipt Preview
            </DialogTitle>
            <DialogDescription>
              This is how the receipt will appear when printed (A4 size).
            </DialogDescription>
          </DialogHeader>

          {/* Content area - full width, scrollable */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 140px)' }}>
            {renderReceiptPreview(formData)}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white flex-shrink-0">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Back to Edit
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleGenerateReceipt} disabled={!userCanEdit}>
              <FileText className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Receipt Dialog - Full width, responsive */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b bg-white flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Receipt Details - {selectedReceipt?.receiptNo}
            </DialogTitle>
          </DialogHeader>

          {/* Content area - full width, scrollable */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 130px)' }}>
            {selectedReceipt && renderReceiptPreview({
              clientType: selectedReceipt.clientType || "internal",
              clientNo: selectedReceipt.clientNo,
              clientName: selectedReceipt.clientName,
              contactName: selectedReceipt.contactName,
              address: "",
              receiptNo: selectedReceipt.receiptNo,
              receiptDate: new Date(selectedReceipt.receiptDate),
              yearGroup: selectedReceipt.yearGroup,
              schoolYear: selectedReceipt.schoolYear,
              invoices: selectedReceipt.invoices,
              paymentMethod: selectedReceipt.paymentMethod,
              bankName: "",
              bankBranch: "",
              chequeNo: "",
              chequeDate: undefined,
              collectorName: "",
              authorizedSignature: ""
            })}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white flex-shrink-0">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={() => selectedReceipt && handleResendReceipt(selectedReceipt)} disabled={!userCanEdit}>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
            <Button onClick={() => selectedReceipt && handleDownloadReceipt(selectedReceipt)}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden print container */}
      {renderPrintContainer()}

      {/* Delete Invoice Row Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmDialog.isOpen}
        onOpenChange={deleteConfirmDialog.setIsOpen}
        onConfirm={deleteConfirmDialog.handleConfirm}
        titleKey="Remove Invoice Row"
        descriptionKey="Are you sure you want to remove this invoice row? This action cannot be undone."
        confirmTextKey="common.delete"
        variant="destructive"
      />
    </div>
  )
}
