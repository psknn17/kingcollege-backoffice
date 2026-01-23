import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar as CalendarComponent } from "./ui/calendar"
import { Separator } from "./ui/separator"
import { Badge } from "./ui/badge"
import { Search, Plus, CheckCircle, Trash2, Eye, Mail, Package, Save, Building, Calendar, FileText, ArrowLeft, Pencil } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { SCHOOL_INFO, BANK_DETAILS, numberToWords, formatCurrency } from "@/lib/invoiceUtils"
import { useLanguage } from "@/contexts/LanguageContext"
import SchoolLogo from "@/assets/Logo.png"

interface PreCreatedItem {
  id: string
  name: string
  description: string
  amount: number
  category: string
  isActive: boolean
  applicableGrades: string[]
}

// localStorage keys
const ITEMS_STORAGE_KEY = "invoiceItems"
const CREATED_INVOICES_STORAGE_KEY = "externalInvoices"

// Interface for saved invoice
interface SavedInvoice {
  id: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  studentRoom: string
  parentName: string
  parentEmail: string
  items: PreCreatedItem[]
  subtotal: number
  discounts: { name: string, amount: number, percentage?: number }[]
  totalDiscount: number
  netAmount: number
  dueDate: string
  issueDate: string
  status: "draft" | "pending_approval" | "approved" | "rejected" | "sent" | "paid" | "partial" | "unpaid" | "overdue" | "cancelled"
  term: string
  paymentType: "termly"
  createdAt: string
  invoiceType?: "student" | "external"
  recipientName?: string
  recipientAddress?: string
  eventName?: string
  notes?: string
}

// Load created invoices from localStorage
const loadCreatedInvoices = (): SavedInvoice[] => {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load created invoices:", error)
  }
  return []
}

// Save invoice to localStorage
const saveInvoiceToStorage = (invoice: SavedInvoice) => {
  try {
    const existing = loadCreatedInvoices()
    const existingIndex = existing.findIndex(inv => inv.invoiceNumber === invoice.invoiceNumber)
    if (existingIndex >= 0) {
      existing[existingIndex] = invoice
    } else {
      existing.push(invoice)
    }
    localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(existing))
    window.dispatchEvent(new CustomEvent('invoicesUpdated'))
  } catch (error) {
    console.error("Failed to save invoice:", error)
  }
}

// Load items from localStorage
const loadItemsFromStorage = (): PreCreatedItem[] => {
  try {
    const stored = localStorage.getItem(ITEMS_STORAGE_KEY)
    if (stored) {
      const items = JSON.parse(stored)
      return items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        amount: item.amount,
        category: item.category,
        isActive: item.isActive,
        applicableGrades: item.applicableGrades
      }))
    }
  } catch (error) {
    console.error("Failed to load items from localStorage:", error)
  }
  return []
}

interface ExternalInvoiceCreationProps {
  onNavigateBack?: () => void
}

export function ExternalInvoiceCreation({ onNavigateBack }: ExternalInvoiceCreationProps) {
  const { t } = useLanguage()

  // Load items from localStorage
  const [availableItems] = useState<PreCreatedItem[]>(() => loadItemsFromStorage())

  // External invoice state
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [eventName, setEventName] = useState("")
  const [selectedItems, setSelectedItems] = useState<PreCreatedItem[]>([])
  const [paymentDeadline, setPaymentDeadline] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState("")

  // Dialog states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [addItemSearchTerm, setAddItemSearchTerm] = useState("")
  const [addItemCategory, setAddItemCategory] = useState("all")

  // Edit item state
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PreCreatedItem | null>(null)
  const [editItemDescription, setEditItemDescription] = useState("")
  const [editItemAmount, setEditItemAmount] = useState<number>(0)

  // Get unique categories from items
  const categories = useMemo(() => {
    const cats = new Set(availableItems.map(item => item.category))
    return Array.from(cats)
  }, [availableItems])

  // Filter items for add dialog
  const filteredAddItems = useMemo(() => {
    return availableItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(addItemSearchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(addItemSearchTerm.toLowerCase())
      const matchesCategory = addItemCategory === "all" || item.category === addItemCategory
      const notAlreadySelected = !selectedItems.some(si => si.id === item.id)
      return matchesSearch && matchesCategory && item.isActive && notAlreadySelected
    })
  }, [availableItems, addItemSearchTerm, addItemCategory, selectedItems])

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear()
    const existingInvoices = loadCreatedInvoices()
    const count = existingInvoices.filter(inv => inv.invoiceNumber.includes(`EXT-${year}`)).length + 1
    return `EXT-${year}-${count.toString().padStart(6, '0')}`
  }

  // Get total amount
  const getTotalAmount = () => {
    return selectedItems.reduce((sum, item) => sum + item.amount, 0)
  }

  // Reset form
  const resetForm = () => {
    setRecipientName("")
    setRecipientEmail("")
    setRecipientAddress("")
    setEventName("")
    setSelectedItems([])
    setPaymentDeadline(undefined)
    setNotes("")
  }

  // Add item to selection
  const handleAddItem = (item: PreCreatedItem) => {
    setSelectedItems([...selectedItems, item])
    setIsAddItemDialogOpen(false)
  }

  // Remove item from selection
  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index))
  }

  // Edit item
  const handleEditItem = (item: PreCreatedItem) => {
    setEditingItem(item)
    setEditItemDescription(item.description)
    setEditItemAmount(item.amount)
    setIsEditItemDialogOpen(true)
  }

  // Save edited item
  const handleSaveEditItem = () => {
    if (!editingItem) return
    setSelectedItems(prev => prev.map(item =>
      item.id === editingItem.id
        ? { ...item, description: editItemDescription, amount: editItemAmount }
        : item
    ))
    setIsEditItemDialogOpen(false)
    setEditingItem(null)
    toast.success("Item updated")
  }

  // Save as Draft
  const handleSaveAsDraft = () => {
    if (!recipientName || !recipientEmail) {
      toast.error("Please fill in recipient name and email")
      return
    }

    const subtotal = getTotalAmount()
    // Use temporary draft number - real invoice number will be generated on approval
    const draftNumber = `DRAFT-EXT-${Date.now()}`
    const invoice: SavedInvoice = {
      id: Date.now().toString(),
      invoiceNumber: draftNumber,
      studentName: recipientName,
      studentId: "EXTERNAL",
      studentGrade: "-",
      studentRoom: "-",
      parentName: recipientName,
      parentEmail: recipientEmail,
      items: selectedItems,
      subtotal,
      discounts: [],
      totalDiscount: 0,
      netAmount: subtotal,
      dueDate: paymentDeadline ? paymentDeadline.toISOString().split('T')[0] : "",
      issueDate: new Date().toISOString().split('T')[0],
      status: "draft",
      term: eventName || "External",
      paymentType: "termly",
      createdAt: new Date().toISOString(),
      invoiceType: "external",
      recipientName: recipientName,
      recipientAddress: recipientAddress,
      eventName: eventName,
      notes: notes
    }

    saveInvoiceToStorage(invoice)
    toast.success("External invoice saved as draft")
    resetForm()
    if (onNavigateBack) onNavigateBack()
  }

  // Create Invoice
  const handleCreateInvoice = () => {
    if (!recipientName || !recipientEmail || selectedItems.length === 0) {
      toast.error("Please fill in recipient details and add at least one item")
      return
    }

    const subtotal = getTotalAmount()
    // Use temporary draft number - real invoice number will be generated on approval
    const draftNumber = `DRAFT-EXT-${Date.now()}`
    const invoice: SavedInvoice = {
      id: Date.now().toString(),
      invoiceNumber: draftNumber,
      studentName: recipientName,
      studentId: "EXTERNAL",
      studentGrade: "-",
      studentRoom: "-",
      parentName: recipientName,
      parentEmail: recipientEmail,
      items: selectedItems,
      subtotal,
      discounts: [],
      totalDiscount: 0,
      netAmount: subtotal,
      dueDate: paymentDeadline ? paymentDeadline.toISOString().split('T')[0] : "",
      issueDate: new Date().toISOString().split('T')[0],
      status: "pending_approval",
      term: eventName || "External",
      paymentType: "termly",
      createdAt: new Date().toISOString(),
      invoiceType: "external",
      recipientName: recipientName,
      recipientAddress: recipientAddress,
      eventName: eventName,
      notes: notes
    }

    saveInvoiceToStorage(invoice)
    toast.success("External invoice created successfully")
    resetForm()
    if (onNavigateBack) onNavigateBack()
  }

  // Create and Send Email
  const handleCreateAndSendEmail = () => {
    if (!recipientName || !recipientEmail || selectedItems.length === 0) {
      toast.error("Please fill in recipient details and add at least one item")
      return
    }

    const subtotal = getTotalAmount()
    const invoice: SavedInvoice = {
      id: Date.now().toString(),
      invoiceNumber: generateInvoiceNumber(),
      studentName: recipientName,
      studentId: "EXTERNAL",
      studentGrade: "-",
      studentRoom: "-",
      parentName: recipientName,
      parentEmail: recipientEmail,
      items: selectedItems,
      subtotal,
      discounts: [],
      totalDiscount: 0,
      netAmount: subtotal,
      dueDate: paymentDeadline ? paymentDeadline.toISOString().split('T')[0] : "",
      issueDate: new Date().toISOString().split('T')[0],
      status: "sent",
      term: eventName || "External",
      paymentType: "termly",
      createdAt: new Date().toISOString(),
      invoiceType: "external",
      recipientName: recipientName,
      recipientAddress: recipientAddress,
      eventName: eventName,
      notes: notes
    }

    saveInvoiceToStorage(invoice)
    toast.success("External invoice created and email sent")
    resetForm()
    if (onNavigateBack) onNavigateBack()
  }

  return (
    <div className="space-y-6">
      {/* Header with Back button */}
      <div className="flex items-center gap-4">
        {onNavigateBack && (
          <Button variant="ghost" onClick={onNavigateBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        <h1 className="text-xl font-semibold">Create External Invoice</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            External Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Recipient Information */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Building className="w-4 h-4" />
                1. Recipient Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipient Name / Organization *</Label>
                  <Input
                    placeholder="Enter recipient name or organization"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address (Optional)</Label>
                <Textarea
                  placeholder="Enter address"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Event Selection */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                2. Event (Optional)
              </h3>
              <Input
                placeholder="Enter event name (e.g., Summer Camp 2025, Sports Day)"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>

            {/* Item Selection */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                3. Select Items
              </h3>

              <Button
                variant="outline"
                onClick={() => setIsAddItemDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>

              {selectedItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2.5 border-b">
                    <h4 className="font-medium text-sm">Selected Items ({selectedItems.length})</h4>
                    <p className="text-xs text-muted-foreground">Total: ฿{getTotalAmount().toLocaleString()}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Item</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Category</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Amount</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((item, index) => (
                          <tr key={`${item.id}-${index}`} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <p className="font-medium text-sm">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.category ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    item.category.toLowerCase() === 'tuition'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : item.category.toLowerCase() === 'activities'
                                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                                      : item.category.toLowerCase() === 'uniform'
                                      ? 'bg-green-100 text-green-800 border-green-200'
                                      : 'bg-gray-100 text-gray-800 border-gray-200'
                                  }
                                >
                                  {item.category}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-medium">฿{item.amount.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Pencil className="w-4 h-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Deadline */}
            <div className="space-y-3">
              <h3 className="font-medium">4. Set Payment Deadline</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="max-w-xs justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {paymentDeadline ? format(paymentDeadline, "dd/MM/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={paymentDeadline}
                    onSelect={setPaymentDeadline}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {paymentDeadline && (
                <p className="text-sm text-green-600">
                  Payment deadline set for {format(paymentDeadline, "dd/MM/yyyy")}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                5. Notes (Optional)
              </h3>
              <Textarea
                placeholder="Additional notes for this invoice"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                className="flex items-center justify-center gap-2"
                disabled={!recipientName || selectedItems.length === 0}
              >
                <Eye className="w-4 h-4" />
                Preview Invoice
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveAsDraft}
                className="flex items-center justify-center gap-2"
                disabled={!recipientName || !recipientEmail}
              >
                <Save className="w-4 h-4" />
                Save Draft
              </Button>
              <Button
                onClick={handleCreateInvoice}
                className="flex items-center justify-center gap-2"
                disabled={!recipientName || !recipientEmail || selectedItems.length === 0}
              >
                <CheckCircle className="w-4 h-4" />
                Create Invoice
              </Button>
              <Button
                variant="outline"
                onClick={handleCreateAndSendEmail}
                className="flex items-center justify-center gap-2"
                disabled={!recipientName || !recipientEmail || selectedItems.length === 0}
              >
                <Mail className="w-4 h-4" />
                Create & Send Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[850px] w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>External Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col">
            <div className="p-6 pb-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              {(() => {
                const issueDate = new Date()
                const invoiceNumber = generateInvoiceNumber()
                const finalTotal = getTotalAmount()

                return (
                  <div className="bg-white mx-auto" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '794px', fontSize: '12px' }}>
                    {/* School Header */}
                    <div className="text-center py-4 border-b border-gray-300 mb-3">
                      <img
                        src={SchoolLogo}
                        alt="King's College International School Bangkok"
                        style={{ height: '60px', margin: '0 auto 8px auto', display: 'block' }}
                      />
                      <p className="text-xs text-gray-600">
                        {SCHOOL_INFO.address}
                      </p>
                      <p className="text-xs text-gray-600">
                        {SCHOOL_INFO.phone}, {SCHOOL_INFO.email}, {SCHOOL_INFO.website}
                      </p>
                      <h1 className="text-xl font-semibold mt-3 tracking-wide">INVOICE</h1>
                    </div>

                    {/* Recipient & Invoice Info */}
                    <div className="px-4 py-3">
                      <div className="border border-black p-4" style={{ fontSize: '11px' }}>
                        <div className="flex justify-between">
                          <div style={{ width: '45%' }}>
                            <div className="flex py-1">
                              <span style={{ width: '110px' }}>Recipient</span>
                              <span>{recipientName || '-'}</span>
                            </div>
                            <div className="flex py-1">
                              <span style={{ width: '110px' }}>Email</span>
                              <span>{recipientEmail || '-'}</span>
                            </div>
                            <div className="flex py-1">
                              <span style={{ width: '110px' }}>Address</span>
                              <span>{recipientAddress || '-'}</span>
                            </div>
                            {eventName && (
                              <div className="flex py-1">
                                <span style={{ width: '110px' }}>Event</span>
                                <span>{eventName}</span>
                              </div>
                            )}
                          </div>
                          <div style={{ width: '45%' }}>
                            <div className="flex py-1">
                              <span style={{ width: '90px' }}>Invoice no.</span>
                              <span className="flex-1 text-right">{invoiceNumber}</span>
                            </div>
                            <div className="flex py-1">
                              <span style={{ width: '90px' }}>Invoice date</span>
                              <span className="flex-1 text-right">{issueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                            <div className="flex py-1">
                              <span style={{ width: '90px' }}>Due date</span>
                              <span className="flex-1 text-right">{paymentDeadline ? paymentDeadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Items Table */}
                    <div className="px-4 py-2">
                      <table className="w-full border border-black" style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                          <tr className="border-b border-black bg-gray-50">
                            <th className="py-1.5 px-2 text-left font-semibold" style={{ width: '40px' }}>No.</th>
                            <th className="py-1.5 px-2 text-left font-semibold">Description</th>
                            <th className="py-1.5 px-2 text-right font-semibold" style={{ width: '100px' }}>Amount (THB)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItems.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-200">
                              <td className="py-1.5 px-2 align-top">{index + 1}</td>
                              <td className="py-1.5 px-2" style={{ wordBreak: 'break-word' }}>
                                <div>{item.name}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-right align-top">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-black bg-gray-100">
                            <td colSpan={2} className="py-2 px-2">
                              <div className="flex justify-between items-center">
                                <span style={{ fontSize: '10px' }}>{numberToWords(finalTotal)}</span>
                                <span className="font-bold ml-4">TOTAL</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-bold">{formatCurrency(finalTotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Notes Section */}
                    <div className="px-4 py-2">
                      <p className="text-gray-400 text-xs">
                        Late payment charges of 1.5% per month or part thereof will be applied to payments made after the invoice due date.
                      </p>
                      {notes && (
                        <p className="text-gray-600 mt-2">
                          <strong>Notes:</strong> {notes}
                        </p>
                      )}
                    </div>

                    {/* Payment Methods */}
                    <div className="px-4 py-2" style={{ fontSize: '11px' }}>
                      <h3 className="font-bold mb-3">Payment methods</h3>
                      <div className="space-y-3">
                        <div>
                          <span>- </span>
                          <span className="font-medium">Cheque:</span>
                          <span> Cheques must be made payable to King's College International School Bangkok and marked A/C Payee Only.</span>
                        </div>
                        <div>
                          <span>- </span>
                          <span className="font-medium">Bank Transfer:</span>
                          <span> Please email proof of payment to finance@kingsbangkok.ac.th</span>
                          <table className="mt-3 ml-8">
                            <tbody>
                              <tr>
                                <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Account name</td>
                                <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.accountName}</td>
                              </tr>
                              <tr>
                                <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Account number</td>
                                <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.accountNumber}</td>
                              </tr>
                              <tr>
                                <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Bank name</td>
                                <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.bankName}</td>
                              </tr>
                              <tr>
                                <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Branch</td>
                                <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.branch}</td>
                              </tr>
                              <tr>
                                <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Swift code</td>
                                <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.swiftCode}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Signature Section */}
                    <div className="px-4 py-4">
                      <div className="flex justify-between px-6">
                        <div className="text-center">
                          <p className="italic mb-6" style={{ fontSize: '10px' }}>Thananchaya Chalorkpunrattara</p>
                          <div className="w-40 border-t border-black mb-1"></div>
                          <p style={{ fontSize: '10px' }}>Prepared by</p>
                        </div>
                        <div className="text-center">
                          <p className="italic mb-6" style={{ fontSize: '10px' }}>Porntip Jarusintrangkul</p>
                          <div className="w-40 border-t border-black mb-1"></div>
                          <p style={{ fontSize: '10px' }}>Authorised officer</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 px-8 py-4 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(false)}
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsPreviewOpen(false)
                  handleSaveAsDraft()
                }}
                disabled={!recipientName || !recipientEmail}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={() => {
                  setIsPreviewOpen(false)
                  handleCreateInvoice()
                }}
                disabled={!recipientName || !recipientEmail || selectedItems.length === 0}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsPreviewOpen(false)
                  handleCreateAndSendEmail()
                }}
                disabled={!recipientName || !recipientEmail || selectedItems.length === 0}
              >
                <Mail className="w-4 h-4 mr-2" />
                Create & Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-md flex flex-col p-6" style={{ maxHeight: '65vh' }}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add Item from List</DialogTitle>
            <DialogDescription>
              Select items to add to this invoice
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 flex-shrink-0 pb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={addItemSearchTerm}
                onChange={(e) => setAddItemSearchTerm(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={addItemCategory} onValueChange={setAddItemCategory}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
            {filteredAddItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No items found</p>
            ) : (
              filteredAddItems.map(item => (
                <div
                  key={item.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleAddItem(item)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{item.category}</Badge>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold">฿{item.amount.toLocaleString()}</p>
                      <Button size="sm" variant="ghost" className="mt-1 h-7">
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Modify the description and amount for this item
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input value={editingItem.name} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editItemDescription}
                  onChange={(e) => setEditItemDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (THB)</Label>
                <Input
                  type="number"
                  value={editItemAmount}
                  onChange={(e) => setEditItemAmount(Number(e.target.value))}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditItem}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
