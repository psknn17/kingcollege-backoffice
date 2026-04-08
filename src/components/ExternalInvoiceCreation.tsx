import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar as CalendarComponent } from "./ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { Search, Plus, Trash2, Calendar, Eye, Save, ArrowLeft, FileText, Package, CheckCircle, Pencil, Download, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useStudents } from "@/contexts/StudentContext"
import { SCHOOL_INFO, BANK_DETAILS, BILL_PAYMENT, numberToWords, formatCurrency } from "@/lib/invoiceUtils"
import { downloadInvoicePDF } from "@/lib/invoicePDF"
import SchoolLogo from "@/assets/Logo.png"
import { logActivity } from "@/lib/activityLog"
import { useSchoolSettings } from "@/hooks/useSchoolSettings"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { ColumnPresets } from "@/utils/tableAlignment"

interface ExternalItem {
  id: string
  itemCode: string
  name: string
  description: string
  amount: number
  category: string
  nominalCode?: string
  isActive: boolean
}

interface InvoiceLineItem {
  id: string
  itemId?: string
  description: string
  details?: string
  amount: number
}

interface ExternalInvoiceCreationProps {
  onNavigateBack?: () => void
  editInvoice?: any
}

// Default external items
const defaultExternalItems: ExternalItem[] = [
  {
    id: "ext-item-001",
    itemCode: "EXT-001",
    name: "Conference Room Rental",
    description: "Full day conference room rental with AV equipment",
    amount: 15000,
    category: "Rental",
    isActive: true
  },
  {
    id: "ext-item-002",
    itemCode: "EXT-002",
    name: "Sports Facility Rental",
    description: "Hourly sports facility rental",
    amount: 2500,
    category: "Rental",
    isActive: true
  },
  {
    id: "ext-item-003",
    itemCode: "EXT-003",
    name: "Event Catering Service",
    description: "Catering service per person",
    amount: 500,
    category: "Catering",
    isActive: true
  },
  {
    id: "ext-item-004",
    itemCode: "EXT-004",
    name: "Equipment Rental",
    description: "AV and technical equipment rental",
    amount: 5000,
    category: "Equipment",
    isActive: true
  },
  {
    id: "ext-item-005",
    itemCode: "EXT-005",
    name: "Professional Services",
    description: "Consulting and professional services",
    amount: 10000,
    category: "Services",
    isActive: true
  }
]

// Load external items from localStorage
const loadExternalItems = (): ExternalItem[] => {
  try {
    const stored = localStorage.getItem("externalItems")
    if (stored) {
      const items = JSON.parse(stored)
      // Return stored items if they exist and are valid
      if (items && items.length > 0) {
        return items
      }
    }
    // Return default items if localStorage is empty
    return defaultExternalItems
  } catch (error) {
    console.error("Failed to load external items:", error)
    return defaultExternalItems
  }
}


export function ExternalInvoiceCreation({ onNavigateBack, editInvoice }: ExternalInvoiceCreationProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const schoolSettings = useSchoolSettings()
  const isEditMode = !!editInvoice

  // Confirmation dialog hook
  const confirmDialog = useConfirmDialog()

  const { students } = useStudents()

  // Client information
  const [clientName, setClientName] = useState("")
  const [contactName, setContactName] = useState("")
  const [address, setAddress] = useState("")

  // Student search dropdown
  const [studentSearch, setStudentSearch] = useState("")
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const studentSearchRef = useRef<HTMLDivElement>(null)

  const filteredStudentOptions = studentSearch.length >= 1
    ? students.filter(s =>
        s.status === "active" &&
        `${s.firstName} ${s.lastName} ${s.nickname} ${s.studentId}`
          .toLowerCase().includes(studentSearch.toLowerCase())
      ).slice(0, 8)
    : []

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (studentSearchRef.current && !studentSearchRef.current.contains(e.target as Node)) {
        setShowStudentDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Invoice details (invoice number will be assigned on approval)
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

  // Line items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [availableItems, setAvailableItems] = useState<ExternalItem[]>([])

  // UI states
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InvoiceLineItem | null>(null)
  const [editItemDescription, setEditItemDescription] = useState("")
  const [editItemDetails, setEditItemDetails] = useState("")
  const [editItemAmount, setEditItemAmount] = useState<number>(0)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [isAddItemsDialogOpen, setIsAddItemsDialogOpen] = useState(false)
  const [itemSearchQuery, setItemSearchQuery] = useState("")

  // Load available items
  useEffect(() => {
    const items = loadExternalItems()
    setAvailableItems(items)
  }, [])

  // Load edit data
  useEffect(() => {
    if (editInvoice) {
      setClientName(editInvoice.clientName || "")
      setContactName(editInvoice.contactName || "")
      setAddress(editInvoice.address || "")
      setInvoiceDate(new Date(editInvoice.invoiceDate))
      setDueDate(editInvoice.dueDate ? new Date(editInvoice.dueDate) : undefined)
      if (editInvoice.items) {
        setLineItems(editInvoice.items.map((item: any, index: number) => ({
          id: `item-${index}`,
          itemId: item.itemId,
          description: item.description || item.name,
          details: item.details || "",
          amount: item.amount
        })))
      }
    }
  }, [editInvoice])

  // Filter items
  const filteredItems = availableItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch && item.isActive
  })

  // Add item to invoice
  const addItem = (item: ExternalItem) => {
    const newLineItem: InvoiceLineItem = {
      id: `line-${Date.now()}`,
      itemId: item.id,
      description: item.name,
      details: "",
      amount: item.amount
    }
    setLineItems([...lineItems, newLineItem])
    toast.success(`Added: ${item.name}`)
  }

  // Add custom item
  const addCustomItem = () => {
    const newLineItem: InvoiceLineItem = {
      id: `line-${Date.now()}`,
      description: "",
      details: "",
      amount: 0
    }
    setLineItems([...lineItems, newLineItem])
  }

  // Update line item
  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  // Remove line item
  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  // Edit line item
  const handleEditItem = (item: InvoiceLineItem) => {
    setEditingItem(item)
    setEditItemDescription(item.description)
    setEditItemDetails(item.details || "")
    setEditItemAmount(item.amount)
    setIsEditItemDialogOpen(true)
  }

  const handleSaveEditItem = () => {
    if (!editingItem) return

    setLineItems(lineItems.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          // Only update description for custom items (no itemId)
          // For master items, description contains the item name and should not be changed
          description: editingItem.itemId ? item.description : editItemDescription,
          details: editItemDetails,
          amount: editItemAmount
        }
      }
      return item
    }))

    setIsEditItemDialogOpen(false)
    setEditingItem(null)
  }

  // Calculate subtotal (ID charges removed)
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const total = subtotal

  // Validate form
  const isValid = clientName && lineItems.length > 0 && lineItems.every(item => item.description && item.amount > 0)

  // Save invoice
  const performSave = (status: "draft" | "pending") => {
    // Validate required fields
    if (!clientName) {
      toast.error("Please enter client name")
      return
    }

    if (lineItems.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    if (!isValid && status !== "draft") {
      toast.error("Please fill in all required fields")
      return
    }

    const invoice = {
      id: editInvoice?.id || `ext-inv-${Date.now()}`,
      invoiceNumber: editInvoice?.invoiceNumber || null, // Will be assigned on approval
      category: "external",
      invoiceType: "external",
      studentId: "EXTERNAL",
      studentName: clientName,
      recipientName: clientName,
      recipientAddress: address,
      parentName: contactName,
      status,
      approvalStatus: editInvoice?.approvalStatus || "wait",
      clientName,
      contactName,
      address,
      issueDate: invoiceDate && invoiceDate instanceof Date ? format(invoiceDate, 'yyyy-MM-dd') : null,
      dueDate: dueDate && dueDate instanceof Date ? format(dueDate, 'yyyy-MM-dd') : null,
      term: "External",
      items: lineItems.map(item => ({
        itemId: item.itemId,
        name: item.description,
        description: item.details,
        amount: item.amount,
        discountPercent: 0,
        discountedAmount: item.amount,
        notes: item.details || ""
      })),
      subtotal,
      totalDiscount: 0,
      netAmount: total,
      discountAmount: 0,
      finalAmount: total,
      total,
      notes: "",
      createdBy: user?.name || "Admin",
      createdAt: editInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Save to localStorage
    try {
      const stored = localStorage.getItem("createdInvoices")
      const invoices = stored ? JSON.parse(stored) : []

      if (isEditMode) {
        const index = invoices.findIndex((inv: any) => inv.id === editInvoice.id)
        if (index !== -1) {
          invoices[index] = invoice
        } else {
          invoices.push(invoice)
        }
      } else {
        invoices.push(invoice)
      }

      localStorage.setItem("createdInvoices", JSON.stringify(invoices))

      // Dispatch event to notify InvoiceManagement to refresh
      window.dispatchEvent(new CustomEvent('invoicesUpdated'))

      toast.success(isEditMode ? "Invoice updated successfully" : "Invoice created successfully")
      logActivity({
        action: isEditMode
          ? `Updated external invoice ${invoice.invoiceNumber || invoice.id}`
          : `Created external invoice ${invoice.invoiceNumber || invoice.id}`,
        module: "External Invoices",
        detail: `Client: ${clientName || "-"}, Amount: ${total.toLocaleString()}`
      })

      // Close preview dialog
      setIsPreviewDialogOpen(false)

      if (onNavigateBack) {
        onNavigateBack()
      }
    } catch (error) {
      console.error("Failed to save invoice:", error)
      toast.error(`Failed to save invoice: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSave = (status: "draft" | "pending") => {
    confirmDialog.confirm(() => {
      performSave(status)
    })
  }

  const handleDownloadPDF = async () => {
    if (lineItems.length === 0) {
      toast.error("Please add at least one item to the invoice")
      return
    }

    try {
      setIsDownloadingPDF(true)

      const currentYear = new Date().getFullYear().toString()
      const invoice = {
        id: editInvoice?.id || `${currentYear}DRAFT-${Date.now()}`,
        invoiceNumber: editInvoice?.invoiceNumber || `${currentYear}DRAFT-${Date.now()}`,
        studentName: clientName,
        studentId: "EXTERNAL",
        studentGrade: "-",
        parentName: contactName,
        parentEmail: editInvoice?.parentEmail || "",
        totalAmount: total,
        discountAmount: 0,
        finalAmount: total,
        status: "draft" as const,
        issueDate: invoiceDate,
        dueDate: dueDate || new Date(),
        items: lineItems.map(item => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
          discountPercent: 0,
          discountedAmount: item.amount,
          notes: item.details || ""
        })),
        invoiceType: "external" as const,
        recipientName: clientName,
        recipientAddress: address
      }

      await downloadInvoicePDF(invoice)
      toast.success("Invoice PDF downloaded successfully")
    } catch (error) {
      console.error("Failed to download invoice PDF:", error)
      toast.error("Failed to download invoice PDF")
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  // Render invoice preview (matching Student invoice template format)
  const renderPreview = () => {
    const previewInvoiceNumber = isEditMode && editInvoice?.invoiceNumber && (editInvoice?.status === 'sent' || editInvoice?.status === 'approved')
      ? editInvoice.invoiceNumber
      : isEditMode ? "Pending Approval" : "-"
    const minRows = 5
    const emptyRowCount = Math.max(0, minRows - lineItems.length)

    return (
    <div className="bg-white text-black mx-auto" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', width: '794px', padding: '16px 48px 24px 48px', boxSizing: 'border-box' }}>
      {/* School Header */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <img src={schoolSettings.logoUrl || SchoolLogo} alt="School Logo" style={{ height: '70px', margin: '0 auto 4px', display: 'block' }} />
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', margin: '2px 0 0 0' }}>KING'S COLLEGE INTERNATIONAL SCHOOL</p>
        <p style={{ fontSize: '10px', letterSpacing: '0.05em', margin: '1px 0 0 0' }}>BANGKOK</p>
      </div>

      {/* Invoice Title */}
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <h1 style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '36px', fontWeight: 700, letterSpacing: '0.08em', margin: 0 }}>INVOICE</h1>
      </div>

      {/* Client & Invoice Info */}
      <table style={{ width: '100%', border: '1px solid #000', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '11px' }}>
        <tbody>
          <tr>
            <td style={{ padding: '10px 16px', width: '19%', fontWeight: 600 }}>Client no.</td>
            <td style={{ padding: '10px 8px', width: '31%' }}>000000</td>
            <td style={{ padding: '10px 16px', width: '19%', fontWeight: 600 }}>Invoice no.</td>
            <td style={{ padding: '10px 8px', width: '31%' }}>{previewInvoiceNumber}</td>
          </tr>
          <tr>
            <td style={{ padding: '10px 16px', fontWeight: 600 }}>Client name</td>
            <td style={{ padding: '10px 8px' }}>{clientName || '-'}</td>
            <td style={{ padding: '10px 16px', fontWeight: 600 }}>Invoice date</td>
            <td style={{ padding: '10px 8px' }}>{format(invoiceDate, 'dd MMMM yyyy')}</td>
          </tr>
          <tr>
            <td style={{ padding: '10px 16px', fontWeight: 600 }}>Contact name</td>
            <td style={{ padding: '10px 8px' }}>{contactName || '-'}</td>
            <td style={{ padding: '10px 16px', fontWeight: 600 }}>Due date</td>
            <td style={{ padding: '10px 8px' }}>{dueDate ? format(dueDate, 'dd MMMM yyyy') : '-'}</td>
          </tr>
          <tr>
            <td style={{ padding: '10px 16px', fontWeight: 600, verticalAlign: 'top' }}>Address</td>
            <td colSpan={3} style={{ padding: '10px 8px', verticalAlign: 'top', whiteSpace: 'pre-line' }}>{address || '-'}</td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <table style={{ width: '100%', border: '1px solid #000', borderCollapse: 'collapse', marginBottom: '4px', fontSize: '11px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, width: '40px', borderRight: '1px solid #000' }}>No.</th>
            <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid #000' }}>Description</th>
            <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 600, width: '120px' }}>Amount<br />(THB)</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => (
            <tr key={item.id}>
              <td style={{ padding: '10px 10px', textAlign: 'center', verticalAlign: 'top', borderRight: '1px solid #000' }}>{index + 1}</td>
              <td style={{ padding: '10px 14px', verticalAlign: 'top', borderRight: '1px solid #000' }}>
                <div>{item.description}</div>
                {item.details && (
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{item.details}</div>
                )}
              </td>
              <td style={{ padding: '10px 14px', textAlign: 'right', verticalAlign: 'top' }}>
                {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
          {Array.from({ length: emptyRowCount }).map((_, idx) => (
            <tr key={`empty-${idx}`}>
              <td style={{ padding: '10px', borderRight: '1px solid #000' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td></td>
            </tr>
          ))}
          {/* Total row */}
          <tr style={{ borderTop: '1px solid #000' }}>
            <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 700, borderRight: '1px solid #000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700 }}>{numberToWords(total)}</span>
                <span>TOTAL</span>
              </div>
            </td>
            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>
              {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Late payment note */}
      <div style={{ fontSize: '9px', lineHeight: 1.4, marginBottom: '12px', color: '#444' }}>
        <p style={{ margin: 0 }}>Late payment charges of 1.5% per month or part thereof will be applied to payments made after the invoice due date.</p>
      </div>

      {/* Payment Methods */}
      <div style={{ fontSize: '10px', lineHeight: 1.6 }}>
        <p style={{ fontWeight: 700, margin: '0 0 8px 0' }}>Payment methods</p>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex' }}>
            <span style={{ marginRight: '6px' }}>-</span>
            <div>
              <span style={{ fontWeight: 600 }}>Cheque:</span> Cheques must be made payable to King's College International School Bangkok and marked A/C Payee Only. Please deliver cheques to the Finance &amp; Accounting Department.
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex' }}>
            <span style={{ marginRight: '6px' }}>-</span>
            <div>
              <span style={{ fontWeight: 600 }}>Bank Transfer:</span> Further bank details are provided below. Kindly email your name and invoice number to {SCHOOL_INFO.email} with proof of payment attached upon completion of the transfer process. Please ensure that your payment covers all bank charges.
              <table style={{ marginTop: '6px', marginLeft: '24px', fontSize: '10px' }}>
                <tbody>
                  <tr><td style={{ padding: '2px 24px 2px 0' }}>Account name</td><td style={{ padding: '2px 0' }}>{BANK_DETAILS.accountName}</td></tr>
                  <tr><td style={{ padding: '2px 24px 2px 0' }}>Account number</td><td style={{ padding: '2px 0' }}>{BANK_DETAILS.accountNumber}</td></tr>
                  <tr><td style={{ padding: '2px 24px 2px 0' }}>Bank name</td><td style={{ padding: '2px 0' }}>{BANK_DETAILS.bankName}</td></tr>
                  <tr><td style={{ padding: '2px 24px 2px 0' }}>Branch</td><td style={{ padding: '2px 0' }}>{BANK_DETAILS.branch}</td></tr>
                  <tr><td style={{ padding: '2px 24px 2px 0' }}>Swift code</td><td style={{ padding: '2px 0' }}>{BANK_DETAILS.swiftCode}</td></tr>
                  <tr><td style={{ padding: '2px 24px 2px 0' }}>Bank address</td><td style={{ padding: '2px 0' }}>{BANK_DETAILS.bankAddress}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex' }}>
            <span style={{ marginRight: '6px' }}>-</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>Bill Payment via Mobile Banking, Internet Banking, ATM or Bank Counter:</span> Please use the QR code provided below to scan for payment. Kindly note that bank charges will apply to payments made via ATM or at the bank counter.
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '6px' }}>
                <table style={{ marginLeft: '24px', fontSize: '10px' }}>
                  <tbody>
                    <tr><td style={{ padding: '2px 24px 2px 0' }}>Biller ID no.</td><td style={{ padding: '2px 0' }}>{BILL_PAYMENT.billerId}</td></tr>
                    <tr><td style={{ padding: '2px 24px 2px 0' }}>Reference no. (Ref 1)</td><td style={{ padding: '2px 0' }}>700002</td></tr>
                    <tr><td style={{ padding: '2px 24px 2px 0' }}>Reference no. (Ref 2)</td><td style={{ padding: '2px 0' }}>{previewInvoiceNumber}</td></tr>
                  </tbody>
                </table>
                <div style={{ width: '64px', height: '64px', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', flexShrink: 0 }}>
                  <span style={{ fontSize: '8px', color: '#6b7280' }}>QR</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex' }}>
            <span style={{ marginRight: '6px' }}>-</span>
            <div>
              <span style={{ fontWeight: 600 }}>Credit card:</span> The online payment link will be provided on the parent portal. Visa &amp; Mastercard issued by local banks in Thailand are accepted. Kindly note that a 1.3% bank fee will be applied to individual online payment transaction.
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex' }}>
            <span style={{ marginRight: '6px' }}>-</span>
            <div>
              <span style={{ fontWeight: 600 }}>On-site credit card payment:</span> Credit cards issued by both local and overseas banks (VISA, Mastercard, JCB, UnionPay, and Alipay) are accepted. Please note that a bank fee may be applied, subject to your bank. The applicable rate can be viewed at the Cashier.
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', padding: '0 40px', fontSize: '11px' }}>
        <div style={{ textAlign: 'center', width: '200px' }}>
          <p style={{ marginBottom: '24px' }}>{user?.name || ""}</p>
          <div style={{ borderTop: '1px solid black', margin: '0 auto 4px' }}></div>
          <p style={{ marginTop: '4px' }}>Prepared by</p>
        </div>
        <div style={{ textAlign: 'center', width: '200px' }}>
          <p style={{ marginBottom: '24px' }}>{""}</p>
          <div style={{ borderTop: '1px solid black', margin: '0 auto 4px' }}></div>
          <p style={{ marginTop: '2px' }}>Authorised officer</p>
          <p style={{ marginTop: '1px', fontSize: '10px' }}>Head of Finance and Accounting</p>
        </div>
      </div>

      {/* School info footer */}
      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '8px', color: '#666', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
        <p style={{ margin: 0 }}>{SCHOOL_INFO.name}, {SCHOOL_INFO.address}</p>
        <p style={{ margin: '2px 0 0 0' }}>{SCHOOL_INFO.phone}, {SCHOOL_INFO.email}, {SCHOOL_INFO.website}</p>
      </div>
    </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-xl font-semibold">
        {isEditMode ? "Edit External Invoice" : "Create External Invoice"}
      </h1>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            External Invoice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-16">
            {/* Step 1: Client Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">1</span>
                <h3 className="font-semibold">Client Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 ml-9">
                <div className="space-y-1.5" ref={studentSearchRef}>
                  <Label className="text-sm font-medium">
                    Client name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      value={clientName}
                      onChange={(e) => {
                        setClientName(e.target.value)
                        setStudentSearch(e.target.value)
                        setShowStudentDropdown(true)
                      }}
                      onFocus={() => {
                        setStudentSearch(clientName)
                        setShowStudentDropdown(true)
                      }}
                      placeholder="Search or type name..."
                      className="h-9 pr-8"
                    />
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    {showStudentDropdown && filteredStudentOptions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredStudentOptions.slice(0, 8).map(student => {
                          const primaryParent = student.parents?.find(p => p.isPrimary) || student.parents?.[0]
                          return (
                            <div
                              key={student.id}
                              className="px-3 py-2 hover:bg-muted cursor-pointer"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setClientName(`${student.firstName} ${student.lastName}`)
                                setContactName(primaryParent?.name || contactName)
                                setStudentSearch("")
                                setShowStudentDropdown(false)
                              }}
                            >
                              <div className="text-sm font-medium">
                                {student.firstName} {student.lastName}
                                {student.nickname && <span className="text-muted-foreground ml-1">({student.nickname})</span>}
                              </div>
                              <div className="text-xs text-muted-foreground">{student.studentId} · {student.gradeLevel}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Contact name</Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Mr./Mrs. Contact Person"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full address"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Invoice date</Label>
                  <Button
                    variant="outline"
                    className="w-full h-9 justify-start font-normal cursor-not-allowed opacity-70"
                    disabled
                  >
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    {format(invoiceDate, 'dd/MM/yyyy')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Select Items */}
            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">2</span>
                <h3 className="font-semibold">Select Items</h3>
              </div>
              <div className="ml-9 space-y-3">
                {/* Available Items */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available Items ({filteredItems.length})</span>
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

                {filteredItems.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground border rounded-lg border-dashed">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No items found</p>
                    <p className="text-xs">Add items from External Invoice &gt; Items & Templates</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      {filteredItems.slice(0, 5).map(item => {
                        const isAdded = lineItems.some(li => li.itemId === item.id)
                        return (
                          <Card
                            key={item.id}
                            className={`cursor-pointer transition-all ${isAdded ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                            onClick={() => !isAdded && addItem(item)}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{item.name}</h4>
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-orange-300 text-orange-700"
                                    >
                                      External
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{item.description || "External invoice item"}</p>
                                  <div className="flex items-center gap-4">
                                    <p className="font-medium text-lg">{item.amount.toLocaleString()}</p>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  {isAdded ? (
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
                    {filteredItems.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        Showing 5 of {filteredItems.length} items. Click "+ Add More Items" to see all.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Add Custom Line Item button - shown when no items selected */}
            {lineItems.length === 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomItem}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Line Item
                </Button>
              </div>
            )}

            {/* Step 3: Selected Items */}
            {lineItems.length > 0 && (
              <div className="space-y-3 mt-8">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="font-medium">Selected Items ({lineItems.length})</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {formatCurrency(total)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCustomItem}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Line Item
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLineItems([])}
                    >
                      Clear All Items
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {/* Item Name - text */}
                        <TableHead align="left">Item</TableHead>
                        {/* Amount - currency */}
                        <TableHead align="right">Amount</TableHead>
                        {/* Actions - buttons */}
                        <TableHead align="center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => {
                        // Get item name from master if it exists
                        const masterItem = item.itemId ? availableItems.find(ai => ai.id === item.itemId) : null
                        const itemName = masterItem ? masterItem.name : item.description
                        const itemDescription = item.details || (masterItem ? item.description : "")

                        return (
                          <TableRow key={item.id}>
                            {/* Item Name - text */}
                            <TableCell align="left">
                              <div>
                                <p className="font-medium">{itemName}</p>
                                {itemDescription && (
                                  <p className="text-sm text-muted-foreground">{itemDescription}</p>
                                )}
                              </div>
                            </TableCell>
                            {/* Amount - currency */}
                            <TableCell align="right" className="font-medium">
                              {item.amount.toLocaleString()}
                            </TableCell>
                            {/* Actions - buttons */}
                            <TableCell align="center">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLineItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Step 4: Due Date */}
            {lineItems.length > 0 && (
              <div className="space-y-3 mt-8">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">4</span>
                  <h3 className="font-semibold">Payment Due Date</h3>
                </div>
                <div className="ml-9">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Due date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[200px] h-9 justify-start font-normal">
                          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                          {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dueDate}
                          onSelect={(date) => date && setDueDate(date)}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <Separator className="my-4" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewDialogOpen(true)} disabled={lineItems.length === 0} className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Preview
              </Button>
              <Button size="sm" onClick={() => handleSave("draft")} className="flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {isEditMode ? "Save" : "Draft"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0" style={{ width: "850px", maxWidth: "95vw" }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>Preview of the external invoice</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col">
            {/* Content */}
            <div className="flex-1 p-6">
              {renderPreview()}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 px-8 py-4 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setIsPreviewDialogOpen(false)}
              >
                Close
              </Button>
              <Button
                onClick={handleDownloadPDF}
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Edit the description and amount for this item
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-4">
              {/* Item Name (Read-only for master items) */}
              {editingItem.itemId && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Item Name</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{availableItems.find(i => i.id === editingItem.itemId)?.name || editingItem.description}</p>
                    <Badge
                      variant="outline"
                      className="mt-1 text-xs border-orange-300 text-orange-700"
                    >
                      External
                    </Badge>
                  </div>
                </div>
              )}

              {/* Description - Only editable for custom items (no itemId) */}
              {!editingItem.itemId && (
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Item Name</Label>
                  <Textarea
                    id="edit-description"
                    value={editItemDescription}
                    onChange={(e) => setEditItemDescription(e.target.value)}
                    placeholder="Enter item name"
                    rows={2}
                  />
                </div>
              )}

              {/* Additional Details */}
              <div className="space-y-2">
                <Label htmlFor="edit-details">
                  {editingItem.itemId ? "Description (Optional)" : "Additional Details (Optional)"}
                </Label>
                <Textarea
                  id="edit-details"
                  value={editItemDetails}
                  onChange={(e) => setEditItemDetails(e.target.value)}
                  placeholder="Additional details"
                  rows={2}
                />
              </div>

              {/* Amount (Editable) */}
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount (THB)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={editItemAmount}
                  onChange={(e) => setEditItemAmount(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditItemDialogOpen(false)
                setEditingItem(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditItem}
              disabled={
                // For custom items (no itemId), description is required
                // For master items (with itemId), only amount is required
                (editingItem && !editingItem.itemId && !editItemDescription) ||
                editItemAmount <= 0
              }
            >
              Save Changes
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
            <div className="max-h-[50vh] overflow-y-auto space-y-2 border rounded-lg p-4">
              {filteredItems
                .filter(item =>
                  item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                  (item.description && item.description.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                )
                .map((item) => {
                  const isAdded = lineItems.some(li => li.itemId === item.id)
                  return (
                    <Card
                      key={item.id}
                      className={`cursor-pointer transition-all ${isAdded ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                      onClick={() => !isAdded && addItem(item)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                                External
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{item.description || "External invoice item"}</p>
                            <p className="font-medium">{item.amount.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center">
                            {isAdded ? (
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
              {filteredItems.filter(item =>
                item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(itemSearchQuery.toLowerCase()))
              ).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No items found</p>
                  </div>
                )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddItemsDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.setIsOpen}
        onConfirm={confirmDialog.handleConfirm}
        titleKey="confirmDialog.createTitle"
        descriptionKey="confirmDialog.createDescription"
        confirmTextKey="common.create"
      />
    </div>
  )
}
