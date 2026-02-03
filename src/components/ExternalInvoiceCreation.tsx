import { useState, useEffect } from "react"
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
import { useLanguage } from "@/contexts/LanguageContext"
import { SCHOOL_INFO, BANK_DETAILS, numberToWords, formatCurrency } from "@/lib/invoiceUtils"
import { downloadInvoicePDF } from "@/lib/invoicePDF"
import SchoolLogo from "@/assets/Logo.png"
import { logActivity } from "@/lib/activityLog"

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

// Load external items from localStorage
const loadExternalItems = (): ExternalItem[] => {
  try {
    const stored = localStorage.getItem("externalItems")
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load external items:", error)
  }
  return []
}


export function ExternalInvoiceCreation({ onNavigateBack, editInvoice }: ExternalInvoiceCreationProps) {
  const { t } = useLanguage()
  const isEditMode = !!editInvoice

  // Client information
  const [clientName, setClientName] = useState("")
  const [contactName, setContactName] = useState("")
  const [address, setAddress] = useState("")

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
          description: editItemDescription,
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
  const handleSave = (status: "draft" | "pending") => {
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
      parentName: contactName,
      status,
      approvalStatus: editInvoice?.approvalStatus || "wait",
      clientName,
      contactName,
      address,
      issueDate: editInvoice?.issueDate || null, // Will be set on approval
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      term: "External",
      items: lineItems.map(item => ({
        itemId: item.itemId,
        name: item.description,
        description: item.details,
        amount: item.amount
      })),
      subtotal,
      total,
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
      toast.error("Failed to save invoice")
      console.error(error)
    }
  }

  const handleDownloadPDF = async () => {
    if (lineItems.length === 0) {
      toast.error("Please add at least one item to the invoice")
      return
    }

    try {
      setIsDownloadingPDF(true)

      // Convert local state to Invoice object format
      const invoice = {
        id: editInvoice?.id || `DRAFT-${Date.now()}`,
        invoiceNumber: editInvoice?.invoiceNumber || `DRAFT-${Date.now()}`,
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

  // Render invoice preview (matching the sample format)
  const renderPreview = () => (
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
          {/* Left side - Client Info (ชิดซ้าย) */}
          <table>
            <tbody>
              <tr>
                <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Client no.</td>
                <td className="py-1">000000</td>
              </tr>
              <tr>
                <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Client name</td>
                <td className="py-1">{clientName}</td>
              </tr>
              <tr>
                <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Contact name</td>
                <td className="py-1">{contactName || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 font-bold align-top" style={{ paddingRight: '24px' }}>Address</td>
                <td className="py-1 whitespace-pre-line">{address || '-'}</td>
              </tr>
            </tbody>
          </table>
          {/* Right side - Invoice Info (ชิดขวา) */}
          <table>
            <tbody>
              <tr>
                <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Invoice no.</td>
                <td className="py-1">
                  {isEditMode && editInvoice?.invoiceNumber && (editInvoice?.status === 'sent' || editInvoice?.status === 'approved')
                    ? editInvoice.invoiceNumber
                    : isEditMode ? "Pending Approval" : "-"}
                </td>
              </tr>
              <tr>
                <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Invoice date</td>
                <td className="py-1">{format(invoiceDate, 'd MMMM yyyy')}</td>
              </tr>
              <tr>
                <td className="py-1 font-bold" style={{ paddingRight: '24px' }}>Due date</td>
                <td className="py-1">{dueDate ? format(dueDate, 'd MMMM yyyy') : '-'}</td>
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
          {lineItems.map((item) => (
            <tr key={item.id}>
              <td className="py-3 px-4 align-top border-r border-black">
                <div>{item.description}</div>
                {item.details && (
                  <div className="text-gray-600">{item.details}</div>
                )}
              </td>
              <td className="py-3 px-4 text-right align-top">
                {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
          {/* Total row */}
          <tr className="border-t border-black">
            <td className="py-3 px-4 border-r border-black">
              <div className="flex justify-between items-center">
                <span>{numberToWords(total)}</span>
                <span className="font-bold">Total</span>
              </div>
            </td>
            <td className="py-3 px-4 text-right font-bold">
              {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      {isEditMode && editInvoice?.invoiceNumber && (editInvoice?.status === 'sent' || editInvoice?.status === 'approved')
                        ? editInvoice.invoiceNumber
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
  )

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
        <h1 className="text-xl font-semibold">
          {isEditMode ? "Edit External Invoice" : "Create External Invoice"}
        </h1>
      </div>

      <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              External Invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-10">
              {/* Step 1: Client Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                    1
                  </div>
                  <h3 className="font-semibold">Client Information</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-9">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Client name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Company or individual name"
                      className="h-9"
                    />
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-9 justify-start font-normal">
                          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                          {format(invoiceDate, 'dd/MM/yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={invoiceDate}
                          onSelect={(date) => date && setInvoiceDate(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Step 2: Select Items */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                    2
                  </div>
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

                  <Button variant="outline" onClick={addCustomItem} className="border-dashed border-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Line Item
                  </Button>
                </div>
              </div>

              {/* Step 3: Selected Items */}
              {lineItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="font-medium">Selected Items ({lineItems.length})</label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total: {formatCurrency(total)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLineItems([])}
                    >
                      Clear All Items
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
                        {lineItems.map((item) => {
                          // Get item name from master if it exists
                          const masterItem = item.itemId ? availableItems.find(ai => ai.id === item.itemId) : null
                          const itemName = masterItem ? masterItem.name : item.description
                          const itemDescription = item.details || (masterItem ? item.description : "")

                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{itemName}</p>
                                  {itemDescription && (
                                    <p className="text-sm text-muted-foreground">{itemDescription}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="border-orange-300 text-orange-700"
                                >
                                  External
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {item.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>
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

                  {total > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {numberToWords(total)}
                    </p>
                  )}
                </div>
              )}

              {/* Step 4: Due Date */}
              {lineItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                      4
                    </div>
                    <h3 className="font-semibold">Payment Due Date</h3>
                  </div>
                  <div className="ml-9">
                    <div className="max-w-[220px] space-y-1.5">
                      <Label className="text-sm font-medium">Due date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-9 justify-start font-normal">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dueDate}
                            onSelect={(date) => date && setDueDate(date)}
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
        <DialogContent className="max-w-[850px] w-[95vw] max-h-[90vh] overflow-y-auto p-0">
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

              {/* Description (Editable) */}
              <div className="space-y-2">
                <Label htmlFor="edit-description">
                  {editingItem.itemId ? "Description (Optional)" : "Item Name"}
                </Label>
                <Textarea
                  id="edit-description"
                  value={editItemDescription}
                  onChange={(e) => setEditItemDescription(e.target.value)}
                  placeholder={editingItem.itemId ? "Additional description" : "Enter item name"}
                  rows={2}
                />
              </div>

              {/* Additional Details */}
              <div className="space-y-2">
                <Label htmlFor="edit-details">Additional Details (Optional)</Label>
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
              disabled={!editItemDescription || editItemAmount <= 0}
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
    </div>
  )
}
