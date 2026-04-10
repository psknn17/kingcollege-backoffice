import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar as CalendarComponent } from "./ui/calendar"
import { cn } from "./ui/utils"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"
import { useSchoolSettings } from "@/hooks/useSchoolSettings"
import { ColumnPresets } from "@/utils/tableAlignment"
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Printer,
  Eye,
  Edit,
  Save,
  Plus,
  Trash2
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { logActivity } from "@/lib/activityLog"
import { SCHOOL_INFO, BANK_DETAILS, numberToWords, formatCurrency as formatCurrencyUtil } from "@/lib/invoiceUtils"
import SchoolLogo from "@/assets/Logo.png"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"

interface ViewModalProps {
  isOpen: boolean
  onClose: () => void
  type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template"
  data: any
  onEdit?: (data: any) => void
  onSave?: (data: any) => void
  onDownload?: (data: any) => void
  onPrint?: (data: any) => void
  onCancel?: (data: any, reason: string) => void
  defaultPreview?: boolean
  previewOnly?: boolean
}

// Helper function to check if invoice can be edited (not yet approved)
const canEditInvoice = (status: string): boolean => {
  const nonEditableStatuses = ["approved", "sent", "paid", "overdue", "cancelled"]
  return !nonEditableStatuses.includes(status?.toLowerCase() || "")
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString()
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    'paid': { variant: 'default' as const, color: 'bg-green-100 text-green-700 border-green-300' },
    'pending': { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    'overdue': { variant: 'destructive' as const, color: 'bg-red-100 text-red-700 border-red-300' },
    'cancelled': { variant: 'destructive' as const, color: 'bg-red-100 text-red-700 border-red-300' },
    'active': { variant: 'default' as const, color: 'bg-green-100 text-green-700 border-green-300' },
    'inactive': { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700 border-gray-300' },
    'draft': { variant: 'outline' as const, color: 'bg-blue-100 text-blue-700 border-blue-300' }
  }

  const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.pending

  return (
    <Badge variant={config.variant} className={config.color}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export function ViewModal({
  isOpen,
  onClose,
  type,
  data,
  onEdit,
  onSave,
  onDownload,
  onPrint,
  onCancel,
  defaultPreview = false,
  previewOnly = false
}: ViewModalProps) {
  const { t } = useLanguage()
  const schoolSettings = useSchoolSettings()
  const deleteConfirmDialog = useConfirmDialog()
  const [activeTab, setActiveTab] = useState("details")

  // Track if user manually switched to preview mode
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  // Cancel invoice state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  // Editable fields state
  const [editedData, setEditedData] = useState<any>(null)

  // Reset preview mode and update data when modal opens
  useEffect(() => {
    if (isOpen && data) {
      setEditedData({
        ...data,
        items: data.items ? [...data.items] : []
      })
      setIsPreviewMode(previewOnly || defaultPreview)
    }
  }, [isOpen, data, type, defaultPreview, previewOnly])

  if (!data) return null

  // Handle item changes
  const handleItemChange = (index: number, field: string, value: any) => {
    if (!editedData) return
    const newItems = [...editedData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setEditedData({ ...editedData, items: newItems })
  }

  // Add new item
  const handleAddItem = () => {
    if (!editedData) return
    const newItem = {
      id: `item-${Date.now()}`,
      name: "",
      description: "",
      amount: 0,
      discountedAmount: 0
    }
    setEditedData({ ...editedData, items: [...editedData.items, newItem] })
  }

  // Remove item
  const performRemoveItem = (index: number) => {
    if (!editedData) return
    const newItems = editedData.items.filter((_: any, i: number) => i !== index)
    setEditedData({ ...editedData, items: newItems })
  }

  const handleRemoveItem = (index: number) => {
    deleteConfirmDialog.confirm(() => performRemoveItem(index))
  }

  // Handle field change
  const handleFieldChange = (field: string, value: any) => {
    if (!editedData) return
    setEditedData({ ...editedData, [field]: value })
  }

  // Save changes
  const handleSaveChanges = () => {
    if (onSave && editedData) {
      onSave(editedData)
      setIsPreviewMode(false)
      toast.success("Invoice saved successfully")
      logActivity({ action: "Save Changes", module: "Invoice Details", detail: `Saved changes to invoice #${editedData?.invoiceNumber || editedData?.id || data?.invoiceNumber || data?.id || "unknown"}` })
      onClose()
    }
  }

  // Cancel invoice
  const handleCancelInvoice = () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason")
      return
    }
    if (onCancel && data) {
      onCancel(data, cancelReason.trim())
      setIsCancelDialogOpen(false)
      setCancelReason("")
      onClose()
    }
  }

  // Calculate total
  const calculateTotal = () => {
    if (!editedData?.items) return 0
    return editedData.items.reduce((sum: number, item: any) => sum + (Number(item.discountedAmount) || Number(item.amount) || 0), 0)
  }

  const renderInvoiceView = () => {
    const itemsSubtotal = data.items?.reduce((sum: number, item: any) => sum + (item.discountedAmount || item.amount || 0), 0) || 0
    const discounts: Array<{ name: string; amount: number; percentage?: number }> = data.discounts || []
    const totalDiscountAmount = discounts.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    const total = totalDiscountAmount > 0
      ? (data.total || data.amount || itemsSubtotal - totalDiscountAmount)
      : (data.total || data.amount || itemsSubtotal)
    const issueDate = data.approvalStatus === "approved" && data.issueDate ? new Date(data.issueDate) : null
    const dueDate = data.dueDate ? new Date(data.dueDate) : null

    return (
      <div className="bg-white mx-auto" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '794px', fontSize: '12px' }}>
        {/* School Header */}
        <div className="text-center py-4 border-b border-gray-300 mb-3">
          <img
            src={schoolSettings.logoUrl || SchoolLogo}
            alt={schoolSettings.schoolName}
            style={{ height: '60px', margin: '0 auto 8px auto', display: 'block' }}
          />
          <p className="text-xs text-gray-600">
            {schoolSettings.address}
          </p>
          <p className="text-xs text-gray-600">
            {schoolSettings.phone}, {schoolSettings.email}, {schoolSettings.website}
          </p>
          <h1 className="text-7xl font-bold mt-3 tracking-wide">INVOICE</h1>
        </div>

        {/* Student & Invoice Info - Two Column Layout */}
        <div className="px-4 py-3">
          <div className="border border-black p-4" style={{ fontSize: '11px' }}>
            <div className="flex justify-between">
              {/* Left Column - Student Info */}
              <div style={{ width: '45%' }}>
                <div className="flex py-1">
                  <span style={{ width: '110px' }}>Student name</span>
                  <span>{data.studentName || "N/A"}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '110px' }}>Student ID</span>
                  <span>{data.studentId || "N/A"}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '110px' }}>Year group</span>
                  <span>{data.grade || data.studentGrade || "N/A"}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '110px' }}>Parent name</span>
                  <span>{data.parentName || "N/A"}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '110px' }}>Email</span>
                  <span>{data.parentEmail || "N/A"}</span>
                </div>
              </div>
              {/* Right Column - Invoice Info */}
              <div style={{ width: '45%' }}>
                <div className="flex py-1">
                  <span style={{ width: '90px' }}>Invoice no.</span>
                  <span className="flex-1 text-right">{data.invoiceNumber || data.id}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '90px' }}>Invoice date</span>
                  <span className="flex-1 text-right">{issueDate ? issueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Pending Approval'}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '90px' }}>Due date</span>
                  <span className="flex-1 text-right">{dueDate ? dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                </div>
                {data.term && (
                  <div className="flex py-1">
                    <span style={{ width: '90px' }}>Term</span>
                    <span className="flex-1 text-right">{data.term}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Information */}
        {(() => {
          console.log('[ViewModal] Cancellation Check:', {
            status: data.status,
            cancelReason: data.cancelReason,
            cancelledBy: data.cancelledBy,
            cancelledAt: data.cancelledAt,
            shouldShow: data.status === "cancelled"
          })
          return null
        })()}
        {data.status === "cancelled" && (
          <div className="px-4 my-6">
            <div className="bg-red-50 border-2 border-red-300 rounded p-3">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-800 text-sm mb-1">INVOICE CANCELLED</p>
                  <p className="text-sm text-red-700">
                    <span className="font-semibold">Reason:</span> {data.cancelReason || "No reason recorded"}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {data.cancelledBy && <>Cancelled by {data.cancelledBy}</>}
                    {data.cancelledAt ? (
                      <>
                        {data.cancelledBy && <> on </>}
                        {new Date(data.cancelledAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })} at {new Date(data.cancelledAt).toLocaleTimeString('en-GB', {
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
          </div>
        )}

        {/* Invoice Items Table */}
        <div className="px-4 py-2">
          <table className="w-full border border-black" style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr className="border-b border-black bg-gray-50">
                {/* Number column: align="left" */}
                <th className="py-1.5 px-2 text-left font-semibold" style={{ width: '40px' }}>No.</th>
                {/* Description column: align="left" */}
                <th className="py-1.5 px-2 text-left font-semibold">Description</th>
                {/* Amount (currency) column: align="right" */}
                <th className="py-1.5 px-2 text-right font-semibold" style={{ width: '100px' }}>Amount (THB)</th>
              </tr>
            </thead>
            <tbody>
              {data.items && data.items.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-1.5 px-2 align-top">{index + 1}</td>
                  <td className="py-1.5 px-2" style={{ wordBreak: 'break-word' }}>
                    <div>{item.name || item.description}</div>
                  </td>
                  <td className="py-1.5 px-2 text-right align-top">{formatCurrencyUtil(item.discountedAmount || item.amount || 0)}</td>
                </tr>
              ))}

              {/* Discount Section */}
              {discounts.length > 0 && discounts.map((discount: any, idx: number) => (
                <tr key={`discount-${idx}`} className="border-b border-gray-200 text-red-500">
                  <td className="py-1.5 px-2 align-top">{(data.items?.length || 0) + idx + 1}</td>
                  <td className="py-1.5 px-2" style={{ wordBreak: 'break-word' }}>
                    {discount.name}{discount.percentage ? ` (${discount.percentage}%)` : ''}
                  </td>
                  <td className="py-1.5 px-2 text-right align-top">-{formatCurrencyUtil(discount.amount || 0)}</td>
                </tr>
              ))}

              {/* Total Summary Row */}
              <tr className="border-t border-black bg-gray-100">
                <td colSpan={2} className="py-2 px-2">
                  <div className="flex justify-between items-center">
                    <span style={{ fontSize: '10px' }}>{numberToWords(total)}</span>
                    <span className="font-bold ml-4">TOTAL</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-right font-bold">{formatCurrencyUtil(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>


        {/* Payment Methods */}
        <div className="px-4 py-2" style={{ fontSize: '11px', lineHeight: '1.5' }}>
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

            {/* Only show Bill Payment for non-external invoices or per system logic */}
            {!data.isExternal && (
              <>
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
                        <td className="py-0.5 text-left">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Signature Section */}
        <div className="px-4 py-4">
          <div className="flex justify-between px-6">
            <div className="text-center">
              <p className="italic mb-6" style={{ fontSize: '10px' }}>{data?.createdBy || ""}</p>
              <div className="w-40 border-t border-black mb-1"></div>
              <p style={{ fontSize: '10px' }}>Prepared by</p>
            </div>
            <div className="text-center">
              <p className="italic mb-6" style={{ fontSize: '10px' }}>{data?.approvedBy || ""}</p>
              <div className="w-40 border-t border-black mb-1"></div>
              <p style={{ fontSize: '10px' }}>Authorised officer</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStudentView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">{data.name}</h3>
          <p className="text-muted-foreground">{t("viewModal.studentId")}: {data.id}</p>
        </div>
        <div className="text-right">
          {getStatusBadge(data.status || "active")}
          <Badge variant="outline" className="ml-2">{data.grade}</Badge>
        </div>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("viewModal.personalInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.fullName")}</label>
              <p className="font-medium">{data.name}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.studentId")}</label>
              <p className="font-medium">{data.id}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.yearGroup")}</label>
              <p className="font-medium">{data.grade}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.dateOfBirth")}</label>
              <p className="font-medium">{data.dateOfBirth || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t("viewModal.contactInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.parentName")}</label>
              <p className="font-medium">{data.parentName}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.parentEmail")}</label>
              <p className="font-medium">{data.email || data.parentEmail}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.phoneNumber")}</label>
              <p className="font-medium">{data.phone || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.address")}</label>
              <p className="font-medium">{data.address || "N/A"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Courses */}
      {data.courses && data.courses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              {t("viewModal.enrolledCourses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.courses.map((course: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{course.name}</p>
                    <p className="text-sm text-muted-foreground">{course.description}</p>
                  </div>
                  <Badge variant="outline">{course.status || t("common.active")}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderItemView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{data.name}</h3>
            {getStatusBadge(data.isActive ? "active" : "inactive")}
          </div>
          {data.description && (
            <p className="text-sm text-muted-foreground mt-1">{data.description}</p>
          )}
        </div>
        <p className="text-2xl font-bold text-primary">{formatCurrency(data.amount)}</p>
      </div>

      {/* Item Details - Compact Table */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Item Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item ID</span>
            <span className="font-mono text-gray-900">{data.id || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item Code</span>
            <span className="font-mono text-gray-900">{data.itemCode || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <Badge variant="outline" className="text-xs">{data.category || '-'}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nominal Code</span>
            <span className="font-mono text-gray-900">{data.nominalCode || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Document Type</span>
            <span className="text-gray-900">{data.documentType === 'SI' ? 'Sales Invoice (SI)' : data.documentType === 'CI' ? 'Credit Invoice (CI)' : data.documentType || 'SI'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice Type</span>
            <span className="text-gray-900 capitalize">{data.invoiceType || 'Student'}</span>
          </div>
          {data.appointmentDate && (
            <div className="flex justify-between col-span-2">
              <span className="text-muted-foreground">Appointment Date</span>
              <span className="text-gray-900">{formatDate(data.appointmentDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Applicable Grades */}
      {data.applicableGrades && data.applicableGrades.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Applicable Grades</h4>
          {data.applicableGrades.length === 16 ? (
            <Badge variant="secondary" className="text-xs">All Grades (Pre-Nursery - Year 13)</Badge>
          ) : (
            <div className="flex flex-wrap gap-1">
              {data.applicableGrades.map((grade: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">{grade}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderTemplateView = () => (
    <div className="px-4">
      {/* Document Header */}
      <div className="text-center py-3 border-b border-gray-200 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">{t("viewModal.invoiceTemplate")}</h2>
      </div>

      {/* Template Info */}
      <div className="px-4 space-y-2 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{t("viewModal.templateName")}</p>
            <p className="text-lg font-semibold text-gray-900">{data.name}</p>
          </div>
          {getStatusBadge(data.isActive ? "active" : "inactive")}
        </div>

        {data.description && (
          <p className="text-sm text-gray-600">{data.description}</p>
        )}
      </div>

      {/* Items Section */}
      {data.itemsList && data.itemsList.length > 0 && (
        <div className="px-4">
          <div className="border-t border-gray-200 pt-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">{t("viewModal.items")}</h3>
          </div>

          <div className="space-y-1 mb-4">
            {data.itemsList.map((item: any, index: number) => (
              <div key={index} className="flex items-baseline justify-between py-1.5">
                <div className="flex items-baseline gap-3 flex-1 min-w-0">
                  <span className="text-gray-400 text-sm w-6 flex-shrink-0">{index + 1}.</span>
                  <span className="text-gray-900 text-sm">{item.name}</span>
                  <span className="flex-1 border-b border-dotted border-gray-200 mx-2 mb-1"></span>
                </div>
                <span className="font-medium text-gray-900 text-sm whitespace-nowrap pl-4">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t-2 border-gray-300 pt-3 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">{t("viewModal.total")}</span>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(data.totalAmount || 0)}</span>
            </div>
          </div>
          <div className="border-t-4 border-double border-gray-300 mt-2"></div>
        </div>
      )}
    </div>
  )

  const renderReceiptView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">Receipt #{data.receiptNumber || data.id}</h3>
          <p className="text-muted-foreground">{t("viewModal.paymentReceipt")}</p>
        </div>
        <div className="text-right">
          {getStatusBadge(data.status || "paid")}
          <p className="text-2xl font-bold mt-2">{formatCurrency(data.amount || data.total || 0)}</p>
        </div>
      </div>

      {/* Payment Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t("viewModal.paymentDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.paymentDate")}</label>
              <p className="font-medium">{formatDate(data.paymentDate || data.createdAt || new Date().toISOString())}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.paymentMethod")}</label>
              <p className="font-medium">{data.paymentMethod || t("paymentMethod.bankTransfer")}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.referenceNumber")}</label>
              <p className="font-medium">{data.referenceNumber || data.transactionId || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.amountPaid")}</label>
              <p className="font-medium text-lg">{formatCurrency(data.amount || data.total || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("viewModal.studentInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.studentName")}</label>
              <p className="font-medium">{data.studentName || data.student?.name || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.studentId")}</label>
              <p className="font-medium">{data.studentId || data.student?.id || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.yearGroup")}</label>
              <p className="font-medium">{data.grade || data.student?.grade || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.academicTerm")}</label>
              <p className="font-medium">{data.academicTerm || "Term 1 2024"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (type) {
      case "invoice":
        return renderInvoiceView()
      case "student":
        return renderStudentView()
      case "item":
        return renderItemView()
      case "receipt":
        return renderReceiptView()
      case "payment":
        return renderReceiptView() // Same as receipt
      case "course":
        return renderItemView() // Similar structure
      case "template":
        return renderTemplateView()
      default:
        return <div>{t("viewModal.contentNotAvailable")}</div>
    }
  }

  const getModalTitle = () => {
    switch (type) {
      case "invoice":
        return t("viewModal.invoiceDetails")
      case "student":
        return t("viewModal.studentProfile")
      case "item":
        return t("viewModal.itemDetails")
      case "receipt":
        return t("viewModal.receiptDetails")
      case "payment":
        return t("viewModal.paymentDetails")
      case "course":
        return t("viewModal.courseDetails")
      case "template":
        return t("viewModal.templateDetails")
      default:
        return t("viewModal.details")
    }
  }

  const handleAction = (action: string) => {
    switch (action) {
      case "edit":
        onEdit?.(data)
        toast.success(t("viewModal.openingEditMode"))
        break
      case "download":
        onDownload?.(data)
        toast.success(t("viewModal.downloading"))
        logActivity({ action: "Download Document", module: "Invoice Details", detail: `Downloaded document for invoice #${data?.invoiceNumber || data?.id || "unknown"}` })
        break
      case "print":
        onPrint?.(data)
        toast.success(t("viewModal.preparingPrint"))
        logActivity({ action: "Print Document", module: "Invoice Details", detail: `Printed document for invoice #${data?.invoiceNumber || data?.id || "unknown"}` })
        break
      default:
        break
    }
  }

  // Special layout for invoice type
  if (type === "invoice") {
    const invoiceCanBeEdited = canEditInvoice(data?.status)
    const showPreview = previewOnly || isPreviewMode

    // Render editable invoice view
    const renderEditableInvoiceView = () => {
      if (!editedData) return null

      return (
        <div className="space-y-4 p-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3">
            <h2 className="text-lg font-semibold">Edit Invoice - {editedData.invoiceNumber || editedData.id}</h2>
            <Badge variant="outline">{editedData.status}</Badge>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-gray-600">Student Information</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Student Name</Label>
                  <Input
                    value={editedData.studentName || ""}
                    onChange={(e) => handleFieldChange("studentName", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Student ID</Label>
                  <Input
                    value={editedData.studentId || ""}
                    onChange={(e) => handleFieldChange("studentId", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Year Group</Label>
                  <Input
                    value={editedData.grade || editedData.studentGrade || ""}
                    onChange={(e) => handleFieldChange("grade", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-gray-600">Invoice Details</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal h-8 text-sm", !editedData.dueDate && "text-muted-foreground")}
                      >
                        <Calendar className="mr-2 h-3.5 w-3.5" />
                        {editedData.dueDate ? format(new Date(editedData.dueDate), "dd/MM/yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editedData.dueDate ? new Date(editedData.dueDate) : undefined}
                        onSelect={(date) => {
                          if (date) handleFieldChange("dueDate", format(date, "yyyy-MM-dd"))
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">Parent Email</Label>
                  <Input
                    value={editedData.parentEmail || ""}
                    onChange={(e) => handleFieldChange("parentEmail", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-gray-600">Invoice Items</h3>
              <Button size="sm" variant="outline" onClick={handleAddItem} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-xs">Description</th>
                    <th className="px-3 py-2 text-right font-medium text-xs w-32">Amount</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {editedData.items?.map((item: any, index: number) => (
                    <tr key={item.id || index} className="border-t">
                      <td className="px-3 py-2">
                        <Input
                          value={item.name || item.description || ""}
                          onChange={(e) => handleItemChange(index, "name", e.target.value)}
                          className="h-7 text-sm"
                          placeholder="Item description"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={item.discountedAmount || item.amount || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            handleItemChange(index, "amount", val)
                            handleItemChange(index, "discountedAmount", val)
                          }}
                          className="h-7 text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(index)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td className="px-3 py-2 font-medium text-sm">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-sm">{calculateTotal().toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) {
            setIsPreviewMode(false)
            onClose()
          }
        }}>
          <DialogContent className="max-w-[850px] w-[95vw] max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{!isPreviewMode ? "Edit Invoice" : "Invoice Preview"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col">
              <div className="flex-1 p-6">
                {showPreview ? renderInvoiceView() : renderEditableInvoiceView()}
              </div>
              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                {invoiceCanBeEdited && !previewOnly && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPreviewMode(!isPreviewMode)}
                      className="flex items-center gap-1.5"
                    >
                      {!isPreviewMode ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </>
                      ) : (
                        <>
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                      className="flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </Button>
                  </>
                )}
                {/* Cancel Invoice button - for non-cancelled invoices */}
                {type === "invoice" && data?.status !== "cancelled" && onCancel && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsCancelDialogOpen(true)}
                    className="flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel Invoice
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onClose}>
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Invoice Dialog */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-red-600">Cancel Invoice</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this invoice? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Cancellation Reason *</Label>
                <textarea
                  id="cancel-reason"
                  className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Please provide a reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setIsCancelDialogOpen(false)
                setCancelReason("")
              }}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelInvoice}
                disabled={!cancelReason.trim()}
              >
                Confirm Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Item Confirmation Dialog */}
        <ConfirmDialog
          open={deleteConfirmDialog.isOpen}
          onOpenChange={deleteConfirmDialog.setIsOpen}
          onConfirm={deleteConfirmDialog.handleConfirm}
          titleKey="Delete Item"
          descriptionKey="Are you sure you want to remove this item from the invoice? This action cannot be undone."
          confirmTextKey="common.delete"
          variant="destructive"
        />
      </>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>{getModalTitle()}</DialogTitle>
              <DialogDescription>
                {t("viewModal.viewDetailedInfo")}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("download")}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t("common.download")}
                </Button>
              )}
              {onPrint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("print")}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {t("common.print")}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {renderContent()}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
